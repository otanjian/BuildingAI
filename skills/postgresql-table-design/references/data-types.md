# PostgreSQL Types and Gotchas

- Identifiers are lower-cased when unquoted; use `snake_case` and avoid quoted mixed-case names.
- `UNIQUE` permits multiple NULLs. Use `NULLS NOT DISTINCT` on PostgreSQL 15+ when one NULL should count as a duplicate.
- CHECK expressions pass NULL; combine CHECK with NOT NULL when a value is mandatory.
- Identity sequences can have gaps after rollback, crash, or concurrency; do not repair them.
- Use arrays only for ordered, element-queried lists; use junction tables for relationships.
- Use range types (`daterange`, `numrange`, `tstzrange`) for intervals and GiST for overlap queries.
- Use `INET`/`CIDR` for network values, `TSVECTOR` + GIN for full text, and `vector` when pgvector is installed.
- Use `LOWER(column)` expression indexes for simple case-insensitive lookup; consider `citext` only when its semantics are needed.
- JSONB is the default document type; JSON is appropriate only when original key order must be preserved.
