import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AgentChatRecord } from "@buildingai/db/entities";
import type { Repository } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";

import type { BowiInvocationMeta, BowiPrincipal } from "../types/bowi-mcp.types";
import { configuredSapCapabilities } from "../sap/sap-capabilities";
import { verifyBowiInvocationAssertion } from "../utils/bowi-invocation-assertion";
import { consumeOpencodeServiceToken } from "../../ai/agents/utils/opencode-credential-injection";

type HeaderValue = string | string[] | undefined;

@Injectable()
export class BowiMcpPrincipalService {
    constructor(
        @InjectRepository(AgentChatRecord)
        private readonly recordRepository: Repository<AgentChatRecord>,
    ) {}

    async resolve(input: {
        headers: Record<string, HeaderValue>;
        meta?: BowiInvocationMeta;
        requireSubject: boolean;
    }): Promise<BowiPrincipal> {
        const assertion = this.header(input.headers, "x-buildingai-bowi-invocation");
        if (assertion) {
            const claims = verifyBowiInvocationAssertion(assertion);
            const isPersonal = claims.authSource === "login";
            const subjectScoped = (capability: string) =>
                capability === "todo.personal" ||
                capability === "automation.personal" ||
                capability.startsWith("sap.");
            return {
                actor: isPersonal
                    ? { kind: "user", id: claims.userId }
                    : { kind: "runtime", id: claims.agentId },
                ...(isPersonal ? { subjectUserId: claims.userId } : {}),
                authSource: claims.authSource,
                agentId: claims.agentId,
                ...(claims.tenantId ? { tenantId: claims.tenantId } : {}),
                conversationId: claims.conversationId,
                capabilities: new Set([
                    ...(isPersonal ? (["todo.personal"] as const) : []),
                    ...(isPersonal ? (["automation.personal"] as const) : []),
                    ...claims.capabilities.filter(
                        (capability) => !subjectScoped(capability) || isPersonal,
                    ),
                ]),
                ...(claims.automationScope && isPersonal
                    ? { automationScope: claims.automationScope }
                    : {}),
            };
        }

        const serviceToken = this.header(input.headers, "x-buildingai-opencode-token");
        const suppliedKey = this.header(input.headers, "x-buildingai-opencode-key");
        let authenticated = false;
        if (serviceToken) {
            try { consumeOpencodeServiceToken(serviceToken); authenticated = true; } catch { authenticated = false; }
        }
        if (!authenticated && process.env.NODE_ENV === "production") {
            throw new Error("Bowi MCP requires a valid short-lived OpenCode service token; internal service identity is not configured");
        }
        if (!authenticated && (!suppliedKey || !this.matchesInternalKey(suppliedKey))) {
            throw new Error("Invalid Bowi MCP client credential");
        }

        const buildingai = input.meta?.buildingai;
        const sessionId = this.nonEmpty(buildingai?.sessionId);
        const canonicalSessionId = sessionId?.split("::", 1)[0];
        const callId = this.nonEmpty(buildingai?.callId);
        if (!sessionId) {
            if (input.requireSubject) throw new Error("Bowi MCP requires a verified personal subject");
            return {
                actor: { kind: "runtime", id: "managed-opencode" },
                authSource: "opencode_session",
                capabilities: new Set(["todo.personal", ...configuredSapCapabilities()]),
            };
        }

        const records = await this.recordRepository.find({
            where: { opencodeSessionId: canonicalSessionId, isDeleted: false },
            take: 2,
        });
        const record = records.length === 1 ? records[0] : undefined;
        if (
            !record?.userId ||
            record.anonymousIdentifier ||
            record.metadata?.bowiAuthSource !== "login"
        ) {
            throw new Error("Bowi MCP requires a verified personal subject");
        }
        return {
            actor: { kind: "runtime", id: "managed-opencode" },
            subjectUserId: record.userId,
            authSource: "opencode_session",
            agentId: record.agentId,
            ...(record.tenantId ? { tenantId: record.tenantId } : {}),
            conversationId: record.id,
            sessionId,
            ...(callId ? { callId } : {}),
            capabilities: new Set([
                "todo.personal",
                "automation.personal",
                ...configuredSapCapabilities(),
            ]),
        };
    }

    private header(headers: Record<string, HeaderValue>, name: string): string | undefined {
        const value = headers[name] ?? headers[name.toLowerCase()];
        return this.nonEmpty(Array.isArray(value) ? value[0] : value);
    }

    private nonEmpty(value: unknown): string | undefined {
        return typeof value === "string" && value.trim() ? value.trim() : undefined;
    }

    private matchesInternalKey(supplied: string): boolean {
        const configured = process.env.BUILDINGAI_OPENCODE_INTERNAL_KEY?.trim();
        const expected = configured ||
            (process.env.NODE_ENV === "production" ? "" : "buildingai-local-opencode");
        if (process.env.NODE_ENV === "production" && expected === "buildingai-local-opencode") {
            throw new Error("Bowi MCP managed OpenCode credential is not configured");
        }
        if (!expected) throw new Error("Bowi MCP managed OpenCode credential is not configured");
        const left = Buffer.from(supplied);
        const right = Buffer.from(expected);
        return left.length === right.length && timingSafeEqual(left, right);
    }
}
