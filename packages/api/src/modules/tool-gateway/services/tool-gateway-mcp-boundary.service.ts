import { createClientsFromServerConfigs, type McpClient, type McpServerConfig } from "@buildingai/ai-sdk";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";
import { isPrivateNetworkTarget, resolveStablePublicAddresses } from "./tool-gateway-policy.utils";

/** Central MCP construction boundary; validates egress before handshake bytes are sent. */
@Injectable()
export class ToolGatewayMcpBoundary {
    async createClients(configs: McpServerConfig[]): Promise<McpClient[]> {
        for (const config of configs) await this.assertEndpoint(config.url);
        return createClientsFromServerConfigs(configs, { name: "buildingai-tool-gateway", version: "1.0.0" });
    }
    async assertEndpoint(rawUrl: string): Promise<void> {
        let endpoint: URL;
        try { endpoint = new URL(rawUrl); } catch { throw HttpErrorFactory.badRequest("MCP endpoint URL is invalid"); }
        if (!["https:", "http:"].includes(endpoint.protocol)) throw HttpErrorFactory.forbidden("MCP protocol is not allowed by egress policy");
        if (isPrivateNetworkTarget(endpoint.hostname)) throw HttpErrorFactory.forbidden("MCP endpoint targets a private or metadata network");
        try {
            await resolveStablePublicAddresses(endpoint.hostname);
        } catch (error) {
            const reason = error instanceof Error ? error.message : "DNS_RESOLUTION_FAILED";
            if (reason === "RESOLVED_PRIVATE_TARGET") throw HttpErrorFactory.forbidden("MCP endpoint resolves to a private or metadata network");
            if (reason === "DNS_REBINDING_DETECTED") throw HttpErrorFactory.forbidden("MCP endpoint DNS rebinding detected");
            throw HttpErrorFactory.forbidden("MCP endpoint DNS resolution failed");
        }
    }
}
