## 1. Configuration Preparation

- [x] 1.1 Confirm the existing Doris MCP server is enabled and connectable, and record its server ID for the agent binding.
- [x] 1.2 Prepare the OpenCode agent configuration values: name, description, role prompt, workspace, artifact template, model, opening statement, and starter questions.

## 2. Apply Runtime Configuration

- [x] 2.1 Create or update the enterprise business monitoring OpenCode agent record without changing application source, SQL, or Doris schema files.
- [x] 2.2 Bind only the read-only Doris MCP server to the agent and keep SAP write, todo mutation, and business transaction tools unbound.

## 3. Verification and Handoff

- [x] 3.1 Verify the persisted agent fields, OpenCode workspace, artifact isolation, and MCP binding through the local configuration store.
- [x] 3.2 Run a read-only Doris MCP smoke check and validate the OpenSpec change with `openspec validate "add-doris-business-monitor-opencode-agent"`.
