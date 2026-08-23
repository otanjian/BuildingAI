import { Inject, Injectable } from "@nestjs/common";
import Ajv, { type ValidateFunction } from "ajv";

import {
    BOWI_MCP_PROVIDER_TOKEN,
    type BowiMcpProvider,
    type BowiMcpTool,
    type BowiPrincipal,
} from "../types/bowi-mcp.types";
import { hasBowiCapability } from "../sap/sap-capabilities";

@Injectable()
export class BowiMcpRegistry {
    private readonly tools = new Map<string, BowiMcpTool>();
    private readonly validators = new Map<string, ValidateFunction>();
    private readonly ajv = new Ajv({ allErrors: true, strict: false });
    private readonly registeredProviders = new WeakSet<object>();

    constructor(
        @Inject(BOWI_MCP_PROVIDER_TOKEN)
        providers: BowiMcpProvider[],
    ) {
        this.ajv.addFormat("uuid", /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        this.ajv.addFormat("date", {
            type: "string",
            validate: (value: string) => {
                const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
                if (!match) return false;
                const date = new Date(`${value}T00:00:00.000Z`);
                return (
                    date.getUTCFullYear() === Number(match[1]) &&
                    date.getUTCMonth() + 1 === Number(match[2]) &&
                    date.getUTCDate() === Number(match[3])
                );
            },
        });
        this.ajv.addFormat("date-time", {
            type: "string",
            validate: (value: string) => value.includes("T") && Number.isFinite(Date.parse(value)),
        });
        for (const provider of providers) this.register(provider);
    }

    register(provider: BowiMcpProvider): void {
        if (this.registeredProviders.has(provider)) return;
        for (const tool of provider.tools) {
            if (this.tools.has(tool.name)) {
                throw new Error(`Duplicate Bowi MCP tool: ${tool.name}`);
            }
            this.tools.set(tool.name, tool);
            this.validators.set(tool.name, this.ajv.compile(tool.inputSchema));
        }
        this.registeredProviders.add(provider);
    }

    list(principal?: BowiPrincipal) {
        return [...this.tools.values()]
            .filter(
                (tool) => !principal || hasBowiCapability(principal.capabilities, tool.capability),
            )
            .sort((left, right) => left.name.localeCompare(right.name))
            .map(({ execute: _execute, capability: _capability, ...definition }) => definition);
    }

    get(name: string): BowiMcpTool | undefined {
        return this.tools.get(name);
    }

    validateArguments(name: string, arguments_: unknown): Record<string, unknown> {
        const tool = this.tools.get(name);
        if (!tool) throw new Error(`Unknown Bowi MCP tool: ${name}`);
        const normalized = arguments_ ?? {};
        const validator = this.validators.get(name)!;
        if (!validator(normalized)) {
            const detail = this.ajv.errorsText(validator.errors, { separator: "; " });
            throw new BowiToolInputError(`Invalid tool arguments: ${detail}`);
        }
        return normalized as Record<string, unknown>;
    }

    async execute(name: string, arguments_: unknown, principal: BowiPrincipal): Promise<unknown> {
        const tool = this.tools.get(name);
        if (!tool) throw new Error(`Unknown Bowi MCP tool: ${name}`);
        if (!hasBowiCapability(principal.capabilities, tool.capability)) {
            throw new BowiToolAuthorizationError("The caller lacks the required Bowi capability");
        }
        return tool.execute(this.validateArguments(name, arguments_), principal);
    }
}

export class BowiToolInputError extends Error {}
export class BowiToolAuthorizationError extends Error {}
export class BowiToolExecutionError extends Error {
    constructor(
        readonly code: string,
        message: string,
    ) {
        super(message);
    }
}
