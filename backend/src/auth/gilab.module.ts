import { Global, Module } from '@nestjs/common';
import { GilabClient } from './gilab.client';

@Global()
@Module({
  providers: [GilabClient],
  exports: [GilabClient],
})
export class GilabModule {}
