# Advanced Performance and Evolution

- Partition only for very large tables or when pruning/retention materially benefits; prefer declarative range/list/hash partitioning.
- Partition keys must be included in unique constraints; verify ORM and foreign-key limitations before committing.
- Separate hot and cold columns, avoid updating indexed columns, and consider `fillfactor` for update-heavy tables.
- Minimize indexes for insert-heavy tables; use COPY/multi-row INSERT and UNLOGGED staging only for rebuildable data.
- Use `CREATE INDEX CONCURRENTLY` for live systems; avoid volatile defaults that rewrite large tables.
- For upserts, provide an exact unique conflict target and update only changed columns.
