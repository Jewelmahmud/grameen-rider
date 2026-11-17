import { DataSourceOptions } from 'typeorm';
import { ALL_ENTITIES } from '../entities';

type Env = (key: string) => string | undefined;

/**
 * Shared by the Nest app and the migration CLI (data-source.ts).
 * Development keeps `synchronize`; staging/production run migrations (DB_RUN_MIGRATIONS=true).
 */
export function buildTypeOrmOptions(env: Env): DataSourceOptions {
  const url = env('DATABASE_URL');
  if (!url || !/^postgres(ql)?:\/\//.test(url)) {
    throw new Error('DATABASE_URL must be a postgresql:// URL');
  }
  const isDev = env('NODE_ENV') === 'development';

  return {
    type: 'postgres',
    url,
    entities: ALL_ENTITIES,
    migrations: [__dirname + '/migrations/*.{ts,js}'],
    migrationsTableName: 'typeorm_migrations',
    migrationsRun: env('DB_RUN_MIGRATIONS') === 'true',
    synchronize: isDev && env('DB_SYNCHRONIZE') !== 'false',
    logging: isDev && env('DB_LOGGING') === 'true',
    extra: {
      max: parseInt(env('DB_POOL_SIZE') || '20', 10),
      idleTimeoutMillis: parseInt(env('DB_IDLE_TIMEOUT') || '30000', 10),
      statement_timeout: parseInt(env('DB_STATEMENT_TIMEOUT') || '30000', 10),
    },
  };
}
