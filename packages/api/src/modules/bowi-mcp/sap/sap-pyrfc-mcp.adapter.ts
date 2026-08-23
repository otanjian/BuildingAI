import { Inject, Injectable, OnModuleDestroy, Optional } from "@nestjs/common";

import { BowiToolExecutionError } from "../services/bowi-mcp-registry.service";
import type { BowiPrincipal } from "../types/bowi-mcp.types";
import {
    SapConnectionProfileService,
    type SapPyrfcProfile,
} from "./sap-connection-profile.service";
import { StreamableMcpClient } from "./streamable-mcp-client";

interface PyrfcLease {
    connectionId: string;
    lastUsed: number;
}

interface PyrfcAdapterOptions {
    rfcAllowlist?: string[];
    now?: () => number;
    idleTtlMs?: number;
}

export const SAP_PYRFC_ADAPTER_OPTIONS = Symbol("SAP_PYRFC_ADAPTER_OPTIONS");

@Injectable()
export class SapPyrfcMcpAdapter implements OnModuleDestroy {
    private readonly leases = new Map<string, PyrfcLease>();
    private readonly tails = new Map<string, Promise<void>>();
    private readonly allowlist: Set<string>;
    private readonly now: () => number;
    private readonly idleTtlMs: number;
    private readonly sweeper: ReturnType<typeof setInterval>;

    constructor(
        private readonly profiles: SapConnectionProfileService,
        private readonly mcp: StreamableMcpClient,
        @Optional() @Inject(SAP_PYRFC_ADAPTER_OPTIONS) options: PyrfcAdapterOptions = {},
    ) {
        this.allowlist = new Set(
            (options.rfcAllowlist ?? this.configuredAllowlist()).map((name) => name.toUpperCase()),
        );
        this.now = options.now ?? Date.now;
        this.idleTtlMs = options.idleTtlMs ?? this.configuredTtl();
        this.sweeper = setInterval(() => void this.sweepIdle(), Math.min(this.idleTtlMs, 60_000));
        this.sweeper.unref?.();
    }

    async health(principal: BowiPrincipal): Promise<unknown> {
        return this.withLease(principal, "healthcheck", {}, true);
    }

    async readTable(principal: BowiPrincipal, args: Record<string, unknown>): Promise<unknown> {
        return this.withLease(principal, "read_table", args, true);
    }

    async getFunctionDescription(
        principal: BowiPrincipal,
        args: Record<string, unknown>,
    ): Promise<unknown> {
        this.assertRfcAllowed(principal, String(args.function_name || ""));
        return this.withLease(principal, "get_rfc_function_description", args, true);
    }

    async callRfc(principal: BowiPrincipal, args: Record<string, unknown>): Promise<unknown> {
        const functionName = this.assertRfcAllowed(principal, String(args.function_name || ""));
        return this.withLease(principal, "call_rfc", { ...args, function_name: functionName }, false);
    }

    async onModuleDestroy(): Promise<void> {
        clearInterval(this.sweeper);
        const entries = [...this.leases.entries()];
        this.leases.clear();
        await Promise.all(entries.map(([, lease]) => this.disconnect(lease.connectionId)));
    }

    private async withLease(
        principal: BowiPrincipal,
        tool: string,
        args: Record<string, unknown>,
        retryExpired: boolean,
    ): Promise<unknown> {
        const { key } = await this.profileKey(principal);
        return this.serial(key, async () => {
            let lease = await this.lease(principal, key);
            let result = await this.mcp.call(this.url(), tool, {
                ...args,
                connection_id: lease.connectionId,
            });
            if (retryExpired && this.recoverableResult(result)) {
                this.leases.delete(key);
                await this.disconnect(lease.connectionId);
                lease = await this.lease(principal, key);
                result = await this.mcp.call(this.url(), tool, {
                    ...args,
                    connection_id: lease.connectionId,
                });
            }
            this.assertResult(result);
            lease.lastUsed = this.now();
            return result;
        });
    }

    private async profileKey(principal: BowiPrincipal) {
        const profile = await this.profiles.resolvePyrfc(principal);
        return {
            profile,
            key: this.profiles.fingerprint(principal.subjectUserId!, profile),
        };
    }

    private async lease(principal: BowiPrincipal, key: string): Promise<PyrfcLease> {
        await this.sweepIdle();
        const existing = this.leases.get(key);
        if (existing) return existing;
        const profile = await this.profiles.resolvePyrfc(principal);
        const connected = await this.mcp.call(this.url(), "sap_connect", this.connectArguments(profile));
        const connectionId = this.stringField(connected, "connection_id");
        if (!connectionId) {
            throw new BowiToolExecutionError(
                "SAP_UPSTREAM_REJECTED",
                "SAP upstream did not establish a connection",
            );
        }
        const lease = { connectionId, lastUsed: this.now() };
        this.leases.set(key, lease);
        return lease;
    }

    private connectArguments(profile: SapPyrfcProfile): Record<string, unknown> {
        return Object.fromEntries(
            Object.entries({
                user: profile.user,
                password: profile.password,
                client: profile.client,
                ashost: profile.ashost,
                sysnr: profile.sysnr,
                language: profile.language,
                saprouter: profile.saprouter,
                mshost: profile.mshost,
                msserv: profile.msserv,
                group: profile.group,
                r3name: profile.r3name,
                url: profile.url,
                backend: profile.backend,
            }).filter(([, value]) => value !== undefined && value !== ""),
        );
    }

    private async serial<T>(key: string, operation: () => Promise<T>): Promise<T> {
        const previous = this.tails.get(key) ?? Promise.resolve();
        let release!: () => void;
        const current = new Promise<void>((resolve) => {
            release = resolve;
        });
        const tail = previous.then(() => current);
        this.tails.set(key, tail);
        await previous;
        try {
            return await operation();
        } finally {
            release();
            if (this.tails.get(key) === tail) this.tails.delete(key);
        }
    }

    private async sweepIdle(): Promise<void> {
        const cutoff = this.now() - this.idleTtlMs;
        const expired = [...this.leases.entries()].filter(([, lease]) => lease.lastUsed <= cutoff);
        for (const [key, lease] of expired) {
            this.leases.delete(key);
            await this.disconnect(lease.connectionId);
        }
    }

    private async disconnect(connectionId: string): Promise<void> {
        await this.mcp.call(this.url(), "sap_disconnect", { connection_id: connectionId }).catch(() => undefined);
    }

    private recoverableResult(result: unknown): boolean {
        const error = this.stringField(result, "error");
        const status = this.stringField(result, "status");
        return Boolean(
            (error && /unknown\s+connection[_ ]id|expired/i.test(error)) ||
                (status === "connection_failed" && error),
        );
    }

    private assertRfcAllowed(principal: BowiPrincipal, rawName: string): string {
        const functionName = rawName.trim().toUpperCase();
        if (!principal.capabilities.has("sap.rfc.admin") && !this.allowlist.has(functionName)) {
            throw new BowiToolExecutionError(
                "SAP_RFC_NOT_ALLOWED",
                "The requested RFC function is not approved",
            );
        }
        return functionName;
    }

    private assertResult(result: unknown): void {
        const error = this.stringField(result, "error");
        if (error) {
            throw new BowiToolExecutionError("SAP_UPSTREAM_REJECTED", "SAP upstream rejected the tool call");
        }
    }

    private stringField(value: unknown, key: string): string | undefined {
        if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
        const field = (value as Record<string, unknown>)[key];
        return typeof field === "string" && field.trim() ? field.trim() : undefined;
    }

    private configuredAllowlist(): string[] {
        const configured = process.env.SAP_RFC_ALLOWLIST?.trim();
        return configured
            ? configured.split(",").map((item) => item.trim()).filter(Boolean)
            : ["RFC_PING", "RFC_READ_TABLE", "BAPI_COMPANYCODE_GETLIST"];
    }

    private configuredTtl(): number {
        const value = Number(process.env.BOWI_SAP_CONNECTION_IDLE_TTL_MS || 30 * 60 * 1_000);
        return Number.isFinite(value) && value >= 1_000 ? value : 30 * 60 * 1_000;
    }

    private url(): string {
        return process.env.BOWI_SAP_PYRFC_MCP_URL?.trim() || "http://127.0.0.1:8200/mcp";
    }
}
