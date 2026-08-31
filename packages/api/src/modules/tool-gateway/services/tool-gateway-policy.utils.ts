import { isIP } from "node:net";
import { promises as dns } from "node:dns";

type DnsAnswer = { address: string; family: number };
export type DnsLookup = (hostname: string, options: { all: true }) => Promise<DnsAnswer[]>;

/** Resolve twice and fail closed if a public answer changes to a protected range. */
export async function resolveStablePublicAddresses(hostname: string, lookup: DnsLookup = dns.lookup): Promise<string[]> {
    const first = await lookup(hostname, { all: true }).catch(() => { throw new Error("DNS_RESOLUTION_FAILED"); });
    if (!first.length) throw new Error("DNS_RESOLUTION_FAILED");
    const firstAddresses = [...new Set(first.map((entry) => entry.address))];
    if (firstAddresses.some(isPrivateNetworkTarget)) throw new Error("RESOLVED_PRIVATE_TARGET");
    const second = await lookup(hostname, { all: true }).catch(() => { throw new Error("DNS_RESOLUTION_FAILED"); });
    const secondAddresses = [...new Set(second.map((entry) => entry.address))];
    if (secondAddresses.some(isPrivateNetworkTarget)) throw new Error("DNS_REBINDING_DETECTED");
    return firstAddresses;
}

export function redact(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return { value: typeof value === "string" ? "[REDACTED]" : value };
    const secret = /token|secret|password|authorization|cookie|api[-_]?key/i;
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, secret.test(key) ? "[REDACTED]" : typeof item === "object" ? redact(item) : item]));
}
export function isPrivateNetworkTarget(host: string): boolean {
    const normalized = host.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
    if (["localhost", "metadata.google.internal", "169.254.169.254", "metadata.azure.internal"].includes(normalized)) return true;
    const ip = isIP(normalized);
    if (ip === 4) {
        const octets = normalized.split(".").map(Number);
        return octets[0] === 0 || octets[0] === 10 || octets[0] === 127 ||
            (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) ||
            (octets[0] === 169 && octets[1] === 254) ||
            (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
            (octets[0] === 192 && octets[1] === 0 && octets[2] === 0) ||
            (octets[0] === 192 && octets[1] === 168) ||
            (octets[0] === 198 && octets[1] === 18) ||
            (octets[0] === 198 && octets[1] === 19);
    }
    if (ip === 6) {
        if (normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:") || normalized.startsWith("ff")) return true;
        const mapped = normalized.match(/^::ffff:(?:(\d+\.\d+\.\d+\.\d+)|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/);
        if (mapped?.[1]) return isPrivateNetworkTarget(mapped[1]);
        if (mapped?.[2] && mapped[3]) {
            const value = `${Number.parseInt(mapped[2], 16).toString(16).padStart(4, "0")}${Number.parseInt(mapped[3], 16).toString(16).padStart(4, "0")}`;
            const ipv4 = [Number.parseInt(value.slice(0, 2), 16), Number.parseInt(value.slice(2, 4), 16), Number.parseInt(value.slice(4, 6), 16), Number.parseInt(value.slice(6, 8), 16)].join(".");
            return isPrivateNetworkTarget(ipv4);
        }
        return false;
    }
    return false;
}
