export const BOWI_MCP_PROVIDER_TOKEN = Symbol("BOWI_MCP_PROVIDER_TOKEN");

export const BOWI_CAPABILITIES = [
    "todo.personal",
    "ehcs.operator",
    "sap.read",
    "sap.write",
    "sap.transport",
    "sap.debug",
    "sap.rfc",
    "sap.rfc.admin",
] as const;

export type BowiCapability = (typeof BOWI_CAPABILITIES)[number];
export type BowiAuthSource = "login" | "publish_key" | "site_access_token" | "anonymous";

export interface BowiPrincipal {
    actor: { kind: "user" | "runtime"; id: string };
    subjectUserId?: string;
    authSource: BowiAuthSource | "opencode_session";
    agentId?: string;
    conversationId?: string;
    sessionId?: string;
    callId?: string;
    capabilities: Set<BowiCapability>;
}

export interface BowiJsonSchema {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties: false;
}

export interface BowiMcpTool {
    name: string;
    description: string;
    inputSchema: BowiJsonSchema;
    annotations?: {
        title?: string;
        readOnlyHint?: boolean;
        destructiveHint?: boolean;
        idempotentHint?: boolean;
        openWorldHint?: boolean;
    };
    capability: BowiCapability;
    execute: (arguments_: Record<string, unknown>, principal: BowiPrincipal) => Promise<unknown>;
}

export interface BowiMcpProvider {
    readonly bowiMcpProvider?: true;
    namespace: string;
    tools: BowiMcpTool[];
}

export interface BowiInvocationMeta {
    buildingai?: {
        sessionId?: unknown;
        callId?: unknown;
    };
}
