import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from '../entities/system-setting.entity';
import { SettingsService } from './settings.service';
import { PublicConfigController } from './public-config.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting])],
  providers: [SettingsService],
  controllers: [PublicConfigController],
  exports: [SettingsService],
})
export class SettingsModule {}
