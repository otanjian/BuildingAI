#!/usr/bin/env node
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(new URL("../../packages/api/package.json", import.meta.url));
const clientModule = await import(pathToFileURL(require.resolve("@modelcontextprotocol/sdk/client/index.js")));
const transportModule = await import(
  pathToFileURL(require.resolve("@modelcontextprotocol/sdk/client/streamableHttp.js"))
);
const { Client } = clientModule;
const { StreamableHTTPClientTransport } = transportModule;

const url = process.argv[2] || "http://127.0.0.1:8100/mcp";
const timeout = Number(process.env.MCP_SMOKE_TIMEOUT_MS || 15_000);
const requiredTools = [
  "healthcheck",
  "searchObject",
  "getObjectSource",
  "lock",
  "setObjectSource",
  "unLock",
  "activateObjects",
  "transportInfo",
  "createTransport",
];

async function open(name) {
  const client = new Client({ name: `sap-adt-smoke-${name}`, version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(url));
  await client.connect(transport, { timeout });
  const tools = await client.listTools(undefined, { timeout, maxTotalTimeout: timeout });
  const names = new Set(tools.tools.map((tool) => tool.name));
  const missing = requiredTools.filter((tool) => !names.has(tool));
  if (missing.length) {
    throw new Error(`${name}: required Bowi adapter tools are missing: ${missing.join(", ")}`);
  }
  return { client, transport, count: tools.tools.length };
}

const sessions = [];
try {
  const [first, second] = await Promise.all([open("one"), open("two")]);
  sessions.push(first, second);
  if (!first.transport.sessionId || !second.transport.sessionId) {
    throw new Error("Gateway did not assign MCP session IDs");
  }
  if (first.transport.sessionId === second.transport.sessionId) {
    throw new Error("Two clients received the same MCP session ID");
  }
  const results = await Promise.all([
    first.client.callTool({ name: "healthcheck", arguments: {} }, undefined, { timeout }),
    second.client.callTool({ name: "healthcheck", arguments: {} }, undefined, { timeout }),
  ]);
  if (results.some((result) => result.isError)) throw new Error("A healthcheck tool call failed");
  process.stdout.write(
    `${JSON.stringify({ ok: true, sessions: 2, toolCounts: [first.count, second.count] })}\n`,
  );
} finally {
  await Promise.all(sessions.map(({ client }) => client.close().catch(() => undefined)));
}
