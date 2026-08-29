import {
    MCP_CONNECT_ERROR_MAX_LENGTH,
    normalizeMcpConnectionError,
} from "./mcp-connection-error";

describe("normalizeMcpConnectionError", () => {
    it("preserves short diagnostics", () => {
        expect(normalizeMcpConnectionError("MCP unavailable")).toBe("MCP unavailable");
    });

    it("bounds persisted diagnostics to the database column length", () => {
        const message = "x".repeat(MCP_CONNECT_ERROR_MAX_LENGTH + 100);
        const normalized = normalizeMcpConnectionError(message);

        expect(normalized).toHaveLength(MCP_CONNECT_ERROR_MAX_LENGTH);
        expect(normalized.endsWith("...")).toBe(true);
        expect(normalized).not.toBe(message);
    });
});
