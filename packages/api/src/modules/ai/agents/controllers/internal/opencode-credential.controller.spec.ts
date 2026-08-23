jest.mock("@buildingai/errors", () => ({
    HttpErrorFactory: {
        unauthorized: (message: string) => new Error(message),
        badRequest: (message: string) => new Error(message),
    },
}));
jest.mock(
    "@common/decorators/controller.decorator",
    () => ({ WebController: () => (target: unknown) => target }),
    { virtual: true },
);
jest.mock("../../services/opencode-credential.service", () => ({
    OpencodeCredentialService: class OpencodeCredentialService {},
}));

import { OpencodeCredentialInternalController } from "./opencode-credential.controller";
import { DEFAULT_OPENCODE_INTERNAL_KEY } from "../../utils/opencode-credential-injection";

describe("OpencodeCredentialInternalController", () => {
    const body = {
        sessionId: "ses_1",
        toolName: "sap_connect",
        arguments: { password: "[masked]" },
    };

    it("rejects requests without the internal key", async () => {
        const controller = new OpencodeCredentialInternalController({ resolve: jest.fn() } as any);
        await expect(controller.resolveCredentials("wrong", body)).rejects.toThrow(
            "Invalid OpenCode internal key",
        );
    });

    it("delegates an authenticated request without exposing anything else", async () => {
        const resolve = jest.fn(async () => ({ overrides: { password: "Rock123" } }));
        const controller = new OpencodeCredentialInternalController({ resolve } as any);
        await expect(controller.resolveCredentials(DEFAULT_OPENCODE_INTERNAL_KEY, body)).resolves.toEqual({
            overrides: { password: "Rock123" },
        });
        expect(resolve).toHaveBeenCalledWith(body);
    });
});
