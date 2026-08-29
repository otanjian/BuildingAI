/** Maximum size accepted by ai_mcp_server.connect_error (varchar(255)). */
export const MCP_CONNECT_ERROR_MAX_LENGTH = 255;

/** Keep complete diagnostics outside the database while bounding persisted text. */
export function normalizeMcpConnectionError(
    message: string,
    maxLength = MCP_CONNECT_ERROR_MAX_LENGTH,
): string {
    if (message.length <= maxLength) return message;
    if (maxLength <= 3) return message.slice(0, maxLength);
    return `${message.slice(0, maxLength - 3)}...`;
}
