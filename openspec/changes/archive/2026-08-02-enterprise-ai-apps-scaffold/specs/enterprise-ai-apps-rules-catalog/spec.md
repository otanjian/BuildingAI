## ADDED Requirements

### Requirement: Minimum thirty rules per application

Each enterprise extension SHALL ship a rules catalog seed file containing at least thirty distinct check rules with unique `rule_id` values following `{rulePrefix}_###` pattern (three-digit zero-padded numbering).

#### Scenario: Catalog validation passes

- **WHEN** running `node scripts/enterprise-ai-apps/validate-catalogs.mjs`
- **THEN** every application's catalog array length is greater than or equal to 30
- **AND** no duplicate `rule_id` exists within an application catalog

### Requirement: Domain-specific rule content

Rules SHALL use `business_domain` and `data_item` values from that application's registry `businessDomains` and ERP scope. `rule_description` MUST be natural-language checks meaningful to that domain (not generic EHCS financial voucher rules copied verbatim).

#### Scenario: Inventory rules differ from EHCS

- **WHEN** comparing `inv-opt-ai` catalog entries to `ehcs-ai` catalog entries
- **THEN** at least twenty descriptions reference inventory-specific concepts (e.g. safety stock, reorder point, EOQ, obsolete stock)
- **AND** fewer than five descriptions are identical to EHCS rule text

### Requirement: Rules catalog seeder behavior

Each extension SHALL implement `CheckRulesCatalogSeeder` equivalent to EHCS: upsert when catalog is incomplete or content hash expired; default `enabled` is false for all seeded rules unless documented demo subset.

#### Scenario: Seed rules CLI

- **WHEN** an operator runs `pnpm --filter {appId} seed:rules` after `build:api`
- **THEN** the database `{prefix}-check_rules` table contains at least thirty rows
- **AND** re-running the command is idempotent (no duplicate `rule_id`)

### Requirement: Rule field schema

Each catalog entry SHALL include `rule_id`, `business_domain`, `data_item`, `rule_description`, `deduct_score` (1–100), `severity` (`高`/`中`/`低`), `auto_fix` (boolean), and `enabled` (boolean), matching PRD and DB entity definitions.

#### Scenario: Enabled rules for demo

- **WHEN** demo mode is documented for an application
- **THEN** at most five catalog entries may ship with `enabled: true` for out-of-box full-check demonstration
- **AND** the remaining seeded rules remain `enabled: false`
