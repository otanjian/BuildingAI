import type { AutomationCommand, AutomationSchedule } from "../domain/automation.types";
import { parseSchedule } from "../domain/schedule-calculator";

/** Parse intentionally small, explicit commands. Natural language is not persisted by this parser. */
export class AutomationCommandParser {
    parse(text: string, idempotencyKey: string): AutomationCommand | undefined {
        const input = text.trim();
        if (!input.startsWith("/schedule") && !input.startsWith("/tasks")) return undefined;
        const [head, ...rest] = input.split(/\s+/);
        if (head === "/tasks") {
            const operation = rest[0] as AutomationCommand["operation"] | undefined;
            if (!operation) return { operation: "list", idempotencyKey };
            if (!["pause", "resume", "run", "cancel"].includes(operation)) {
                throw new Error("Usage: /tasks [pause|resume|run|cancel] <task-id>");
            }
            const taskId = rest[1];
            if (!taskId) throw new Error("Task ID is required");
            return { operation, taskId, idempotencyKey };
        }
        const args = parseArguments(input.slice("/schedule".length));
        const name = args.name?.trim();
        const prompt = args.prompt?.trim();
        if (!name || !prompt) {
            throw new Error(
                'Usage: /schedule name="Daily report" at="2030-01-01T09:00:00+08:00" prompt="..."',
            );
        }
        let schedule: AutomationSchedule;
        if (args.at) {
            schedule = parseSchedule({ kind: "at", at: args.at });
        } else if (args.every) {
            const intervalSeconds = Number(args.every);
            schedule = parseSchedule({
                kind: "every",
                intervalSeconds,
                anchorAt: args.anchorAt || new Date().toISOString(),
                timezone: args.timezone,
            });
        } else if (args.cron) {
            schedule = parseSchedule({
                kind: "cron",
                expression: args.cron,
                timezone: args.timezone || "UTC",
            });
        } else {
            throw new Error("One of at, every, or cron is required");
        }
        return {
            operation: "create",
            idempotencyKey,
            name,
            prompt,
            schedule,
            agentId: args.agent,
        };
    }
}

function parseArguments(input: string): Record<string, string> {
    const result: Record<string, string> = {};
    const pattern = /(\w+)\s*=\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s]+)/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(input))) {
        const raw = match[2];
        result[match[1]] = raw.startsWith("\"") || raw.startsWith("'")
            ? raw.slice(1, -1).replaceAll(/\\([\\"'])/g, "$1")
            : raw;
    }
    return result;
}
