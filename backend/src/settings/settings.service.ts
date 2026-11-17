import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SystemSetting } from '../entities/system-setting.entity';
import { SETTINGS, SettingDef, SettingKey } from './settings.registry';
import { hasPermission } from '../common/auth/permissions';
import { PlatformRole } from '../common/auth/platform-roles';

const CACHE_MS = 30_000;

export interface SettingView {
  key: SettingKey;
  value: unknown;
  default: unknown;
  type: SettingDef['type'];
  description: string;
  permission: string;
  editable: boolean;
  updatedAt: Date | null;
  updatedBy: string | null;
}

/** Typed access to system_settings with code defaults. Values are cached for 30 s per instance. */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private cache: { at: number; rows: Map<string, SystemSetting> } | null = null;

  constructor(@InjectRepository(SystemSetting) private readonly repo: Repository<SystemSetting>) {}

  async get<T = unknown>(key: SettingKey): Promise<T> {
    const rows = await this.rows();
    const row = rows.get(key);
    const def = SETTINGS[key] as SettingDef;
    if (!row) return def.default as T;
    try {
      return parseValue(def, row.settingValue) as T;
    } catch {
      this.logger.warn(`Stored value for ${key} is invalid; using the default`);
      return def.default as T;
    }
  }

  async getMany<K extends SettingKey>(keys: K[]): Promise<Record<K, any>> {
    const entries = await Promise.all(keys.map(async (k) => [k, await this.get(k)] as const));
    return Object.fromEntries(entries) as Record<K, any>;
  }

  async publicConfig(): Promise<Record<string, unknown>> {
    const keys = (Object.keys(SETTINGS) as SettingKey[]).filter((k) => (SETTINGS[k] as SettingDef).public);
    return this.getMany(keys);
  }

  async list(roles: PlatformRole[]): Promise<SettingView[]> {
    const rows = await this.rows();
    return Promise.all(
      (Object.keys(SETTINGS) as SettingKey[]).map(async (key) => {
        const def = SETTINGS[key] as SettingDef;
        const row = rows.get(key);
        return {
          key,
          value: await this.get(key),
          default: def.default,
          type: def.type,
          description: def.description,
          permission: def.permission,
          editable: hasPermission(roles, def.permission),
          updatedAt: row?.updatedAt ?? null,
          updatedBy: row?.updatedByAuthUserId ?? null,
        };
      }),
    );
  }

  /** Validates every entry, checks the caller may change each key, then writes them together. */
  async update(
    values: Record<string, unknown>,
    actor: { authUserId: string; roles: PlatformRole[] },
  ): Promise<{ before: Record<string, unknown>; after: Record<string, unknown> }> {
    const keys = Object.keys(values);
    if (!keys.length) throw new BadRequestException('No settings given');

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    const prepared: { key: SettingKey; def: SettingDef; serialised: string }[] = [];

    for (const key of keys) {
      const def = (SETTINGS as Record<string, SettingDef>)[key];
      if (!def) throw new BadRequestException({ code: 'UNKNOWN_SETTING', message: `Unknown setting: ${key}` });
      if (!hasPermission(actor.roles, def.permission)) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: `Missing permission ${def.permission} for ${key}` });
      }
      const value = validateValue(key, def, values[key]);
      before[key] = await this.get(key as SettingKey);
      after[key] = value;
      prepared.push({ key: key as SettingKey, def, serialised: def.type === 'string' ? String(value) : JSON.stringify(value) });
    }

    const existing = await this.repo.find({ where: { settingKey: In(prepared.map((p) => p.key)) } });
    const byKey = new Map(existing.map((e) => [e.settingKey, e]));
    await this.repo.save(
      prepared.map((p) =>
        Object.assign(byKey.get(p.key) ?? this.repo.create({ settingKey: p.key }), {
          settingValue: p.serialised,
          settingType: p.def.type,
          description: p.def.description,
          updatedByAuthUserId: actor.authUserId,
        }),
      ),
    );
    this.cache = null;
    return { before, after };
  }

  private async rows(): Promise<Map<string, SystemSetting>> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.rows;
    try {
      const all = await this.repo.find();
      this.cache = { at: Date.now(), rows: new Map(all.map((r) => [r.settingKey, r])) };
    } catch (error) {
      this.logger.error('Could not load settings; using defaults', error instanceof Error ? error.stack : error);
      return this.cache?.rows ?? new Map();
    }
    return this.cache.rows;
  }
}

function parseValue(def: SettingDef, raw: string): unknown {
  switch (def.type) {
    case 'number': {
      const n = Number(raw);
      if (!Number.isFinite(n)) throw new Error('not a number');
      return n;
    }
    case 'boolean':
      if (raw !== 'true' && raw !== 'false') throw new Error('not a boolean');
      return raw === 'true';
    case 'json':
      return JSON.parse(raw);
    default:
      return raw;
  }
}

export function validateValue(key: string, def: SettingDef, value: unknown): unknown {
  const fail = (why: string) => new BadRequestException({ code: 'INVALID_SETTING', message: `${key}: ${why}` });
  switch (def.type) {
    case 'number': {
      const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
      if (typeof n !== 'number' || !Number.isFinite(n)) throw fail('must be a number');
      if (def.min !== undefined && n < def.min) throw fail(`must be at least ${def.min}`);
      if (def.max !== undefined && n > def.max) throw fail(`must be at most ${def.max}`);
      return n;
    }
    case 'boolean':
      if (typeof value !== 'boolean') throw fail('must be true or false');
      return value;
    case 'string':
      if (typeof value !== 'string' || value.length > 2000) throw fail('must be text up to 2000 characters');
      if (/^pricing\.night\.(start|end)$/.test(key) && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw fail('must be HH:mm');
      return value;
    case 'json':
      if (Array.isArray(def.default) && !Array.isArray(value)) throw fail('must be a list');
      if (Array.isArray(value) && value.length > 100) throw fail('too many items');
      return value;
  }
}
