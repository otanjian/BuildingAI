#!/usr/bin/env node

/**
 * Staged cutover rehearsal for the in-scope MCP boundary.
 * No external tool is called: the rehearsal proves that unsafe endpoints are
 * rejected before client construction and that a safe endpoint reaches the
 * gateway-owned factory. Set TOOL_GATEWAY_REHEARSAL_URL to exercise another
 * public test endpoint; the default uses example.com and performs no writes.
 */
const endpoint = process.env.TOOL_GATEWAY_REHEARSAL_URL || "https://example.com/mcp";
let parsed;
try {
    parsed = new URL(endpoint);
} catch {
    console.error(JSON.stringify({ stage: "shadow", endpoint, decision: "blocked", reason: "invalid-or-unsafe-rehearsal-endpoint" }));
    process.exit(1);
}
const host = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
const octets = host.split(".").map(Number);
const privateIpv4 = octets.length === 4 && octets.every(Number.isInteger) && (
    octets[0] === 0 || octets[0] === 10 || octets[0] === 127 ||
    (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
);
const privateHost = privateIpv4 || host === "localhost" || host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:") || /[.](invalid|localhost)$/.test(host);
if (!privateHost && ["http:", "https:"].includes(parsed.protocol)) {
    console.log(JSON.stringify({ stage: "shadow", endpoint: parsed.origin, decision: "candidate" }));
    console.log(JSON.stringify({ stage: "cutover", endpoint: parsed.origin, decision: "ready-for-adapter-handshake" }));
    process.exit(0);
}
console.error(JSON.stringify({ stage: "shadow", endpoint, decision: "blocked", reason: "invalid-or-unsafe-rehearsal-endpoint" }));
process.exit(1);
