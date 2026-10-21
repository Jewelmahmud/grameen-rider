# PostgreSQL Database Setup Script

This script creates the database schema for Grameen Ride application.

Run this script in your PostgreSQL database:

```sql
-- Enable PostGIS extension (required for geospatial queries)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Database schema will be created automatically by TypeORM
-- in development mode (synchronize: true)

-- For production, use migrations instead
```

## Manual Schema Creation (if needed)

If you need to create tables manually, refer to `DATABASE_SCHEMA.md` for the complete SQL schema.

## Environment Variables

Make sure your `.env` file has:
```env
DATABASE_URL=postgresql://grameenride:grameenride123@localhost:5432/grameenride
```

## TypeORM Synchronization

In development mode, TypeORM will automatically create tables based on entities.

For production:
1. Set `synchronize: false` in database configuration
2. Use migrations: `npm run migration:generate` and `npm run migration:run`

