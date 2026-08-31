import { createHash } from "node:crypto";

export interface AgentVersionProvenance {
    createdBy: string;
    releaseNote?: string;
    source?: string;
    createdAt: string;
}

export interface AgentVersionSnapshotResult {
    snapshot: Record<string, unknown>;
    configHash: string;
    provenance: AgentVersionProvenance;
}

const SENSITIVE_KEY = /(?:api[_-]?key|access[_-]?token|auth(?:orization)?|cookie|credential|password|secret|token|private[_-]?key|client[_-]?secret)/i;

function canonicalize(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .filter(([, entry]) => entry !== undefined)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, entry]) => [key, canonicalize(entry)]),
        );
    }
    return value;
}

/** Stable JSON representation used as the version's tamper-evident input. */
export function normalizeAgentVersionSnapshot(value: unknown): string {
    return JSON.stringify(canonicalize(value));
}

export function hashAgentVersionSnapshot(value: unknown): string {
    return createHash("sha256").update(normalizeAgentVersionSnapshot(value)).digest("hex");
}

/** Remove secret values but retain references to managed credentials. */
export function redactAgentVersionSnapshot(value: unknown, key?: string): unknown {
    if (key && SENSITIVE_KEY.test(key) && !/credential[_-]?ref/i.test(key)) return "[REDACTED]";
    if (Array.isArray(value)) return value.map((entry) => redactAgentVersionSnapshot(entry));
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([childKey, entry]) => [
                childKey,
                redactAgentVersionSnapshot(entry, childKey),
            ]),
        );
    }
    return value;
}

export function createAgentVersionSnapshot(
    config: Record<string, unknown>,
    provenance: Omit<AgentVersionProvenance, "createdAt"> & { createdAt?: string },
): AgentVersionSnapshotResult {
    const snapshot = redactAgentVersionSnapshot(config) as Record<string, unknown>;
    return {
        snapshot,
        configHash: hashAgentVersionSnapshot(snapshot),
        provenance: {
            ...provenance,
            createdAt: provenance.createdAt ?? new Date().toISOString(),
        },
    };
}

export type AgentVersionDiff = {
    path: string;
    before?: unknown;
    after?: unknown;
    type: "added" | "removed" | "changed";
};

export function buildAgentVersionDiff(before: unknown, after: unknown): AgentVersionDiff[] {
    const result: AgentVersionDiff[] = [];
    const walk = (left: unknown, right: unknown, path: string) => {
        if (Object.is(left, right)) return;
        if (Array.isArray(left) && Array.isArray(right)) {
            const length = Math.max(left.length, right.length);
            for (let index = 0; index < length; index += 1) walk(left[index], right[index], `${path}[${index}]`);
            return;
        }
        if (left && right && typeof left === "object" && typeof right === "object" && !Array.isArray(left) && !Array.isArray(right)) {
            const keys = new Set([...Object.keys(left as object), ...Object.keys(right as object)]);
            [...keys].sort().forEach((key) => walk((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key], path ? `${path}.${key}` : key));
            return;
        }
        result.push({ path, before: left, after: right, type: left === undefined ? "added" : right === undefined ? "removed" : "changed" });
    };
    walk(before, after, "");
    return result;
}
