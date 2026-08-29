# JSONB Design

- Keep stable, relationally queried fields in typed columns; use JSONB for optional or variable attributes.
- A default GIN index supports containment (`@>`), key existence (`?`), and path queries.
- Use `jsonb_path_ops` for smaller/faster containment-only indexes; it does not support key-existence operators.
- For equality/range filters on a scalar, use a generated typed column or matching expression B-tree index.
- Constrain required document shape with `CHECK (jsonb_typeof(config) = 'object')` and `NOT NULL` where appropriate.
