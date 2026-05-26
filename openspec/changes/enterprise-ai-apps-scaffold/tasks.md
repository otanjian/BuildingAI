## 1. Tooling and registry

- [x] 1.1 Bump all `seedRuleCount` values in `docs/enterprise-ai-apps-registry.json` to at least 30
- [x] 1.2 Add `scripts/enterprise-ai-apps/scaffold-from-ehcs.mjs` (registry-driven copy from `extensions/ehcs-ai`)
- [x] 1.3 Add `scripts/enterprise-ai-apps/validate-catalogs.mjs` (fail if any app catalog has fewer than 30 rules)
- [x] 1.4 Add `scripts/enterprise-ai-apps/generate-rules-catalog.mjs` (domain templates → 30+ entries per app)
- [x] 1.5 Document scripts in `scripts/enterprise-ai-apps/README.md`

## 2. P0 pilot extensions (inv-opt-ai, mdm-quality-ai, proc-audit-ai)

- [x] 2.1 Scaffold `extensions/inv-opt-ai` from ehcs-ai; verify build `pnpm --filter inv-opt-ai build:publish`
- [x] 2.2 Scaffold `extensions/mdm-quality-ai` and `extensions/proc-audit-ai`
- [x] 2.3 Register P0 apps in `extensions/extensions.json` (`enabled: true` for pilots only)
- [x] 2.4 Run `pnpm extension:sync` and verify console extension list

## 3. Platform agent (per app — repeat pattern; complete for P0 first)

- [x] 3.1 Add `{mcp_prefix}-platform-agent.config.ts` for inv-opt-ai (role, opening, suggested questions per PRD)
- [x] 3.2 Add `InvOptPlatformAgentSeeder` + wire in `src/api/db/seeds/index.ts`
- [x] 3.3 Settings service: create/update agent binds MCP + `enableSite` (copy EHCS `SettingsService` patterns)
- [x] 3.4 Repeat 3.1–3.3 for mdm-quality-ai and proc-audit-ai
- [x] 3.5 Manual test: Settings → 创建/更新智能体 → agent visible with 6 MCP tools

## 4. Rules catalog — ≥30 rules per app (P0 first)

- [x] 4.1 Author `inv-opt-check-rules-catalog.ts` with ≥30 inventory-domain rules (SS, ROP, EOQ, obsolete, shortage, etc.)
- [x] 4.2 Add `InvOptCheckRulesCatalogSeeder` + `package.json` script `seed:rules`
- [x] 4.3 Author `mdm-quality-check-rules-catalog.ts` (≥30 MDM rules: Item, Customer, Supplier, BOM)
- [x] 4.4 Author `proc-audit-check-rules-catalog.ts` (≥30 procurement compliance rules)
- [x] 4.5 Run validate-catalogs.mjs; fix any app below 30
- [x] 4.6 Manual test: `pnpm --filter inv-opt-ai seed:rules` → 30+ rows in `inv-opt-check_rules`

## 5. Demo data seed (P0)

- [x] 5.1 Add `InvOptAiDataSeeder` with 2+ sample anomalies per PRD §九
- [x] 5.2 Repeat for mdm-quality-ai and proc-audit-ai
- [x] 5.3 Optional: mark ≤5 catalog rules `enabled: true` for demo full-check
- [x] 5.4 Manual test: dashboard recent anomalies without running agent check

## 6. Batch B1 — supply chain (otif-ai, channel-inv-ai)

- [x] 6.1 Scaffold extensions + registry entries
- [x] 6.2 Agent config + seeder per app
- [x] 6.3 Rules catalog ≥30 per app (OTIF, channel inventory domains)
- [x] 6.4 Demo anomaly seeders

## 7. Batch B2 — finance (6 apps)

- [x] 7.1 Scaffold ar-risk-ai, ap-opt-ai, asset-life-ai, tax-compliance-ai, budget-control-ai, fx-risk-ai
- [x] 7.2 Agent + rules catalog (≥30 each) + demo seed for all six
- [x] 7.3 validate-catalogs.mjs passes for B2 apps

## 8. Batch B3 — manufacturing / quality / energy (4 apps)

- [x] 8.1 Scaffold mfg-var-ai, forecast-ai, quality-rca-ai, energy-carbon-ai
- [x] 8.2 Agent + rules catalog (≥30 each) + demo seed
- [x] 8.3 Optional V1.1 entities: extension columns on check_results for inv-opt, forecast, quality-rca per DB docs

## 9. Batch B4 — HR / project / contract / SLA / ESG (5 apps)

- [x] 9.1 Scaffold hr-compliance-ai, project-health-ai, contract-ai, service-sla-ai, esg-report-ai
- [x] 9.2 Agent + rules catalog (≥30 each) + demo seed for all five

## 10. Verification and documentation

- [x] 10.1 Run validate-catalogs.mjs across all 20 apps in CI or pre-commit
- [x] 10.2 Spot-check 3 apps: full-check via agent dock (`{triggerPhrase}`) → ingest → dashboard refresh
- [x] 10.3 Update each `extensions/{appId}/README.md` (entry URL, seed:rules, agent setup)
- [x] 10.4 Sync PRD/DB seed sections to state ≥30 catalog rules where still saying 28
- [x] 10.5 Run `openspec validate enterprise-ai-apps-scaffold`
