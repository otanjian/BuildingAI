import {
    AUTOMATION_SCHEDULE_KINDS,
    type AutomationSchedule,
    type CronSchedule,
    type EverySchedule,
} from "./automation.types";

export const MIN_AUTOMATION_INTERVAL_SECONDS = 60;
export const MAX_AUTOMATION_LOOKAHEAD_DAYS = 366;

export interface ScheduleValidationOptions {
    now?: Date;
    minimumIntervalSeconds?: number;
}

export function validateTimezone(timezone: string): void {
    if (!timezone?.trim()) throw new Error("Timezone is required");
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    } catch {
        throw new Error(`Invalid IANA timezone: ${timezone}`);
    }
}

export function parseSchedule(
    input: unknown,
    options: ScheduleValidationOptions = {},
): AutomationSchedule {
    if (!input || typeof input !== "object") throw new Error("Schedule is required");
    const value = input as Record<string, unknown>;
    const kind = value.kind;
    if (!AUTOMATION_SCHEDULE_KINDS.includes(kind as never)) {
        throw new Error("Schedule kind must be at, every, or cron");
    }
    if (kind === "at") {
        const at = String(value.at ?? "");
        const timestamp = Date.parse(at);
        if (!at || Number.isNaN(timestamp)) throw new Error("A valid at timestamp is required");
        if (timestamp <= (options.now ?? new Date()).getTime()) {
            throw new Error("at timestamp must be in the future");
        }
        return { kind: "at", at: new Date(timestamp).toISOString() };
    }
    if (kind === "every") {
        const intervalSeconds = Number(value.intervalSeconds);
        const minimum = options.minimumIntervalSeconds ?? MIN_AUTOMATION_INTERVAL_SECONDS;
        if (!Number.isInteger(intervalSeconds) || intervalSeconds < minimum) {
            throw new Error(`every interval must be at least ${minimum} seconds`);
        }
        const anchorAt = String(value.anchorAt ?? "");
        const anchorTimestamp = Date.parse(anchorAt);
        if (!anchorAt || Number.isNaN(anchorTimestamp)) {
            throw new Error("A valid every anchorAt timestamp is required");
        }
        const timezone = value.timezone ? String(value.timezone) : undefined;
        if (timezone) validateTimezone(timezone);
        return {
            kind: "every",
            intervalSeconds,
            anchorAt: new Date(anchorTimestamp).toISOString(),
            ...(timezone ? { timezone } : {}),
        } satisfies EverySchedule;
    }
    const expression = String(value.expression ?? "").trim();
    validateCronExpression(expression);
    const timezone = String(value.timezone ?? "");
    validateTimezone(timezone);
    return { kind: "cron", expression, timezone } satisfies CronSchedule;
}

export function nextOccurrence(schedule: AutomationSchedule, after: Date): Date | null {
    if (schedule.kind === "at") {
        const at = new Date(schedule.at);
        return at.getTime() > after.getTime() ? at : null;
    }
    if (schedule.kind === "every") {
        const anchor = new Date(schedule.anchorAt).getTime();
        const afterTime = after.getTime();
        const interval = schedule.intervalSeconds * 1000;
        if (anchor > afterTime) return new Date(anchor);
        const index = Math.max(0, Math.floor((afterTime - anchor) / interval) + 1);
        return new Date(anchor + index * interval);
    }
    const start = new Date(Math.floor(after.getTime() / 60_000) * 60_000 + 60_000);
    const end = new Date(after.getTime() + MAX_AUTOMATION_LOOKAHEAD_DAYS * 86_400_000);
    for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + 60_000)) {
        const parts = getTimeParts(cursor, schedule.timezone);
        if (matchesCron(schedule.expression, parts)) return cursor;
    }
    return null;
}

export function occurrenceKey(schedule: AutomationSchedule, occurrence: Date): string {
    if (schedule.kind === "at") return `at:${new Date(schedule.at).toISOString()}`;
    return `${schedule.kind}:${occurrence.toISOString()}`;
}

function getTimeParts(date: Date, timezone: string): {
    minute: number;
    hour: number;
    day: number;
    month: number;
    weekday: number;
} {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour12: false,
        minute: "2-digit",
        hour: "2-digit",
        day: "2-digit",
        month: "2-digit",
        weekday: "short",
    });
    const values = Object.fromEntries(
        formatter.formatToParts(date).map((part) => [part.type, part.value]),
    );
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return {
        minute: Number(values.minute),
        hour: Number(values.hour) % 24,
        day: Number(values.day),
        month: Number(values.month),
        weekday: weekdays.indexOf(values.weekday),
    };
}

function validateCronExpression(expression: string): void {
    const fields = expression.split(/\s+/);
    if (fields.length !== 5) throw new Error("Cron expression must contain 5 fields");
    const ranges = [
        [0, 59],
        [0, 23],
        [1, 31],
        [1, 12],
        [0, 6],
    ] as const;
    fields.forEach((field, index) => {
        if (!field || !field.split(",").every((part) => validCronPart(part, ranges[index][0], ranges[index][1]))) {
            throw new Error(`Invalid cron field ${index + 1}`);
        }
    });
}

function validCronPart(part: string, min: number, max: number): boolean {
    const [base, stepText] = part.split("/");
    if (part.split("/").length > 2) return false;
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step < 1) return false;
    if (base === "*") return true;
    const [fromText, toText] = base.split("-");
    const from = Number(fromText);
    const to = toText === undefined ? from : Number(toText);
    return Number.isInteger(from) && Number.isInteger(to) && from >= min && to <= max && from <= to;
}

function matchesCron(
    expression: string,
    parts: { minute: number; hour: number; day: number; month: number; weekday: number },
): boolean {
    const fields = expression.split(/\s+/);
    const values = [parts.minute, parts.hour, parts.day, parts.month, parts.weekday];
    return fields.every((field, index) =>
        field.split(",").some((part) => matchesCronPart(part, values[index])),
    );
}

function matchesCronPart(part: string, value: number): boolean {
    const [base, stepText] = part.split("/");
    const step = stepText ? Number(stepText) : 1;
    if (base === "*") return value % step === 0;
    if (base.includes("-")) {
        const [from, to] = base.split("-").map(Number);
        return value >= from && value <= to && (value - from) % step === 0;
    }
    return value === Number(base);
}
