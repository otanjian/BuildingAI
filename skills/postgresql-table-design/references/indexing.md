# PostgreSQL Indexing

- B-tree covers equality, ranges, and ordering. Put equality/filter columns before range/order columns in composites.
- PostgreSQL does not automatically index foreign keys; add the index on the referencing side.
- Use partial indexes for stable hot subsets, expression indexes when the query uses the same expression, and INCLUDE columns for covering reads.
- Use GIN for JSONB/array containment and full-text search; GiST for ranges, geometry, and exclusion constraints; BRIN for very large naturally ordered data.
- Every index adds write and storage cost. Validate with `EXPLAIN (ANALYZE, BUFFERS)` against representative data.
