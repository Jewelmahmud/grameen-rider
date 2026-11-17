import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm-options';

/** Used only by the TypeORM CLI (npm run migration:*). The CLI never synchronizes. */
config({ path: ['.env.local', '.env'] });

export default new DataSource({
  ...buildTypeOrmOptions((key) => process.env[key]),
  synchronize: false,
  migrationsRun: false,
});
