# PostgreSQL Security and Extensions

- Enable RLS explicitly and write policies that constrain tenant/user ownership; test both authorized and unauthorized roles.
- Common extensions: `pgcrypto` for crypto/UUID helpers, `pg_trgm` for fuzzy search, `citext` for case-insensitive text, `postgis` for GIS, `pgvector` for embeddings, and `timescaledb` for time series.
- Confirm extension availability and version in the target environment before using it in migrations.
