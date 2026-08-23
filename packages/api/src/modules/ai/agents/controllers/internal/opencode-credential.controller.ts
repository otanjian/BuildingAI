import { Body, Headers, Post } from "@nestjs/common";
import { WebController } from "@common/decorators/controller.decorator";
import { HttpErrorFactory } from "@buildingai/errors";

import { OpencodeCredentialService } from "../../services/opencode-credential.service";
import { DEFAULT_OPENCODE_INTERNAL_KEY } from "../../utils/opencode-credential-injection";

type CredentialRequestBody = {
    sessionId?: unknown;
    toolName?: unknown;
    arguments?: unknown;
};

@WebController({ path: "internal-opencode", skipAuth: true })
export class OpencodeCredentialInternalController {
    constructor(private readonly credentialService: OpencodeCredentialService) {}

    @Post("credentials")
    async resolveCredentials(
        @Headers("x-buildingai-opencode-key") internalKey: string | undefined,
        @Body() body: CredentialRequestBody,
    ) {
        if (!internalKey || internalKey !== DEFAULT_OPENCODE_INTERNAL_KEY) {
            throw HttpErrorFactory.unauthorized("Invalid OpenCode internal key");
        }
        const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
        const toolName = typeof body.toolName === "string" ? body.toolName.trim() : "";
        const args = body.arguments;
        if (!sessionId || !toolName || !args || typeof args !== "object" || Array.isArray(args)) {
            throw HttpErrorFactory.badRequest("Invalid OpenCode credential request");
        }

        return this.credentialService.resolve({
            sessionId,
            toolName,
            arguments: args as Record<string, unknown>,
        });
    }
}
