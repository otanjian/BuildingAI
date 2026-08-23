import { BOWI_CAPABILITIES, type BowiCapability } from "../types/bowi-mcp.types";

const SAP_CAPABILITIES = new Set<BowiCapability>(
    BOWI_CAPABILITIES.filter((capability) => capability.startsWith("sap.")),
);

export function isBowiCapability(value: unknown): value is BowiCapability {
    return typeof value === "string" && (BOWI_CAPABILITIES as readonly string[]).includes(value);
}

export function configuredSapCapabilities(
    configured = process.env.BOWI_MCP_OPENCODE_CAPABILITIES,
    nodeEnv = process.env.NODE_ENV,
): BowiCapability[] {
    const source = configured?.trim()
        ? configured.split(",")
        : nodeEnv === "production"
          ? []
          : ["sap.read", "sap.rfc"];
    const seen = new Set<BowiCapability>();
    const result: BowiCapability[] = [];
    for (const raw of source) {
        const capability = raw.trim();
        if (!isBowiCapability(capability) || !SAP_CAPABILITIES.has(capability) || seen.has(capability)) {
            continue;
        }
        seen.add(capability);
        result.push(capability);
    }
    return result;
}

export function hasBowiCapability(
    capabilities: ReadonlySet<BowiCapability>,
    required: BowiCapability,
): boolean {
    if (capabilities.has(required)) return true;
    return required === "sap.rfc" && capabilities.has("sap.rfc.admin");
}
