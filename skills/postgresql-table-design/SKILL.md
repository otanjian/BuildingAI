---
name: postgresql-table-design
description: Design and review PostgreSQL schemas, tables, constraints, indexes, migrations, and query-oriented data models. Use for PostgreSQL DDL, TypeORM entities, schema reviews, or database performance decisions.
---

# PostgreSQL Table Design

Use this short checklist for routine schema work; load a reference only when the request needs that topic.

## Default decisions

- Normalize to 3NF first; denormalize only for a measured read bottleneck.
- Give reference tables a primary key, usually `BIGINT GENERATED ALWAYS AS IDENTITY`; use UUID for opaque, federated, or distributed IDs.
- Use `NOT NULL` and meaningful defaults where the domain requires them.
- Prefer `TIMESTAMPTZ`, `DATE`, `INTERVAL`, `NUMERIC` for money, `TEXT`, `BIGINT`, and `DOUBLE PRECISION`.
- Prefer `JSONB` for optional/semi-structured attributes; keep core relations in columns and tables.
- Define foreign-key actions explicitly and add indexes on referencing columns.
- Add indexes for real filters, joins, sorts, and uniqueness—not speculatively.
- Use `TEXT + CHECK` or a lookup table for values that evolve; use enums only for small, stable sets.

## Review order

1. Identify entities, ownership, cardinality, lifecycle, and query paths.
2. Choose keys, nullability, types, defaults, and constraints.
3. Add only indexes justified by access paths; check composite-column order.
4. Decide whether RLS, JSONB, partitioning, or extensions are actually required.
5. Plan safe, reversible migration steps and verify with the project's real PostgreSQL version.

## Topic references

- Types and PostgreSQL gotchas: [references/data-types.md](references/data-types.md)
- Indexes and query access paths: [references/indexing.md](references/indexing.md)
- JSONB design and indexing: [references/jsonb.md](references/jsonb.md)
- Partitioning, write-heavy tables, and schema evolution: [references/advanced-performance.md](references/advanced-performance.md)
- RLS and extensions: [references/security-extensions.md](references/security-extensions.md)

## Hard prohibitions

Avoid `timestamp` without time zone, `char(n)`, `varchar(n)`, `money`, `timetz`, precision-qualified `timestamptz`, and `serial`; use the alternatives above unless compatibility with an existing schema requires otherwise.
