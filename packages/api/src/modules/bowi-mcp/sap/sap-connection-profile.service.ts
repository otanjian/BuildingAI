import { UserDictService } from "@buildingai/dict";
import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";

import { BowiToolExecutionError } from "../services/bowi-mcp-registry.service";
import type { BowiPrincipal } from "../types/bowi-mcp.types";

export interface SapPyrfcProfile {
    ashost?: string;
    sysnr: string;
    client: string;
    user: string;
    password: string;
    language: string;
    saprouter?: string;
    mshost?: string;
    msserv?: string;
    group?: string;
    r3name?: string;
    url?: string;
    backend: "auto" | "pyrfc" | "adt";
}

const aliases = {
    ashost: ["sapashost", "ashost", "saphost", "sap主机"],
    sysnr: ["sapsysnr", "sysnr", "sap系统编号"],
    client: ["sapclient", "client", "sap客户端"],
    user: ["sapuser", "user", "username", "sap用户名", "sap用户"],
    password: ["sappassword", "password", "passwd", "pwd", "sap密码", "密码"],
    language: ["saplanguage", "language", "lang", "sap语言"],
    saprouter: ["sapsaprouter", "saprouter"],
    mshost: ["sapmshost", "mshost"],
    msserv: ["sapmsserv", "msserv"],
    group: ["sapgroup", "group"],
    r3name: ["sapr3name", "r3name"],
    url: ["sapurl", "url", "adturl"],
    backend: ["sapbackend"],
} as const;

const connectionAliases = new Set([
    "sapconnection",
    "sapconnectionstring",
    "sapconn",
    "sap链接参数",
    "sap连接参数",
]);

export class SapProfileError extends BowiToolExecutionError {
    constructor(
        readonly code: "SAP_PROFILE_REQUIRED" | "SAP_PROFILE_FORBIDDEN",
        message: string,
    ) {
        super(code, message);
    }
}

@Injectable()
export class SapConnectionProfileService {
    constructor(private readonly userDictService: UserDictService) {}

    async resolvePyrfc(principal: BowiPrincipal): Promise<SapPyrfcProfile> {
        const subject = principal.subjectUserId;
        if (!subject) {
            throw new SapProfileError("SAP_PROFILE_FORBIDDEN", "SAP requires a verified personal subject");
        }
        const personal = await this.userDictService.getGroupValues(subject, "personalParams");
        const values = this.flatten(personal);
        const composite = this.compositeValues(personal);
        const serviceEnabled = process.env.BOWI_SAP_SERVICE_PROFILE_ENABLED === "true";
        const value = (key: keyof typeof aliases, envKey?: string) =>
            this.pick(values, aliases[key]) ||
            composite.get(key) ||
            (serviceEnabled && envKey ? process.env[envKey]?.trim() : undefined);
        const backendValue = value("backend", "SAP_BACKEND")?.toLowerCase();
        const backend = backendValue === "pyrfc" || backendValue === "adt" ? backendValue : "auto";
        const profile: SapPyrfcProfile = {
            ashost: value("ashost", "SAP_ASHOST"),
            sysnr: value("sysnr", "SAP_SYSNR") || "00",
            client: value("client", "SAP_CLIENT") || "100",
            user: value("user", "SAP_USER") || "",
            password: value("password", "SAP_PASSWORD") || "",
            language: value("language", "SAP_LANGUAGE") || "EN",
            saprouter: value("saprouter", "SAP_SAPROUTER"),
            mshost: value("mshost", "SAP_MSHOST"),
            msserv: value("msserv", "SAP_MSSERV"),
            group: value("group", "SAP_GROUP"),
            r3name: value("r3name", "SAP_R3NAME"),
            url: value("url", "SAP_URL"),
            backend,
        };
        if ((!profile.ashost && !profile.mshost && !profile.url) || !profile.user || !profile.password) {
            throw new SapProfileError("SAP_PROFILE_REQUIRED", "A complete SAP connection profile is required");
        }
        return profile;
    }

    requireAdtServiceProfile(principal: BowiPrincipal): { mode: "service" } {
        if (!principal.subjectUserId) {
            throw new SapProfileError("SAP_PROFILE_FORBIDDEN", "SAP requires a verified personal subject");
        }
        if (process.env.BOWI_SAP_ADT_SERVICE_PROFILE_ENABLED !== "true") {
            throw new SapProfileError("SAP_PROFILE_REQUIRED", "ADT service profile is disabled");
        }
        return { mode: "service" };
    }

    publicInfo(profile: SapPyrfcProfile): Record<string, unknown> {
        const { password: _password, ...safe } = profile;
        return safe;
    }

    fingerprint(subjectUserId: string, profile: SapPyrfcProfile): string {
        return createHash("sha256")
            .update(subjectUserId)
            .update("\0")
            .update(JSON.stringify(profile))
            .digest("hex");
    }

    private flatten(value: unknown, prefix = "", output = new Map<string, string>()): Map<string, string> {
        if (typeof value === "string" || typeof value === "number") {
            if (prefix) output.set(this.normalize(prefix), String(value).trim());
            return output;
        }
        if (!value || typeof value !== "object") return output;
        for (const [key, nested] of Object.entries(value)) {
            this.flatten(nested, key, output);
        }
        return output;
    }

    private pick(values: Map<string, string>, keys: readonly string[]): string | undefined {
        for (const key of keys) {
            const value = values.get(this.normalize(key));
            if (value) return value;
        }
        return undefined;
    }

    private normalize(value: string): string {
        return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, "");
    }

    private compositeValues(value: unknown): Map<string, string> {
        if (!value || typeof value !== "object" || Array.isArray(value)) return new Map();
        for (const [key, item] of Object.entries(value)) {
            if (connectionAliases.has(this.normalize(key)) && typeof item === "string") {
                return this.parseConnectionString(item);
            }
        }
        return new Map();
    }

    private parseConnectionString(raw: string): Map<string, string> {
        const result = new Map<string, string>();
        const parts = raw.trim().split(/[&;]/);
        const first = parts[0]?.trim() || "";
        const firstKey = first.includes("=") ? first.slice(0, first.indexOf("=")).toLowerCase() : "";
        const route = firstKey === "conn" ? first.slice(first.indexOf("=") + 1).trim() : first;
        const hops = [...route.matchAll(/\/H\/([^/]+)(?:\/S\/(\d+))?/gi)].map((match) => ({
            host: match[1],
            port: match[2],
        }));
        if (hops.length) {
            const target = hops.at(-1)!;
            result.set("ashost", target.host);
            if (target.port) result.set("sysnr", target.port.slice(-2));
            if (hops.length > 1) {
                result.set(
                    "saprouter",
                    hops
                        .slice(0, -1)
                        .map((hop) => `/H/${hop.host}${hop.port ? `/S/${hop.port}` : ""}`)
                        .join(""),
                );
            }
        }

        const fields = firstKey === "conn" || route.startsWith("/H/") ? parts.slice(1) : parts;
        const fieldAliases: Record<string, string> = {
            ashost: "ashost",
            host: "ashost",
            sysnr: "sysnr",
            client: "client",
            clnt: "client",
            user: "user",
            username: "user",
            password: "password",
            passwd: "password",
            pwd: "password",
            language: "language",
            lang: "language",
            saprouter: "saprouter",
            mshost: "mshost",
            msserv: "msserv",
            group: "group",
            r3name: "r3name",
        };
        for (const field of fields) {
            const separator = field.indexOf("=");
            if (separator < 1) continue;
            const key = fieldAliases[field.slice(0, separator).trim().toLowerCase()];
            const fieldValue = field.slice(separator + 1).split(/[，,]/, 1)[0].trim();
            if (key && fieldValue) result.set(key, key === "language" ? fieldValue.toUpperCase() : fieldValue);
        }
        if (!result.has("password")) {
            const password = raw.match(
                /(?:password|passwd|pwd|sap[_-]?password|密码)\s*(?:=|:|是|为)\s*([^\s,&;，；]+)/iu,
            )?.[1];
            if (password) result.set("password", password);
        }
        return result;
    }
}
