import type { AutomationCommand, AutomationSchedule } from "../domain/automation.types";
import { parseSchedule } from "../domain/schedule-calculator";

export type AutomationIntentStatus = "ready" | "clarification";
export type AutomationIntentMissing = "time" | "prompt" | "recurrence";

export interface AutomationIntent {
    status: AutomationIntentStatus;
    command: AutomationCommand;
    missing: AutomationIntentMissing[];
}

/**
 * A deliberately bounded natural-language parser. It handles the common Chinese scheduling
 * phrases without allowing arbitrary text to become a task. More capable model extraction can
 * implement the same DTO later; validation and confirmation remain in the application service.
 */
export class AutomationIntentParser {
    static isCandidate(text: string): boolean {
        return /(?:定时|定期|每天|每日|每周|每月|工作日|提醒我|到点|cron|schedule)/iu.test(text);
    }

    static isReservedInteraction(text: string): boolean {
        const input = text.trim();
        if (/(?:定时任务|创建定时|生成定时|新建定时|设(?:置|个)?定时|cron|schedule)/iu.test(input)) {
            return true;
        }
        return (
            /(?:每天|每日|每周|每月|工作日|提醒我|到点)/u.test(input) &&
            /(?:发送|推送|提醒|通知)/u.test(input)
        );
    }

    static isConfirmation(text: string): boolean {
        return /^(?:确认(?:创建|提交)?|确定(?:创建|提交)?|是的?|好的?|好|创建)$/iu.test(
            text.trim(),
        );
    }

    static isCancellation(text: string): boolean {
        return /^(?:取消|不要了?|算了|否|不创建)$/iu.test(text.trim());
    }

    parse(text: string, idempotencyKey = "pending"): AutomationIntent | undefined {
        const input = text.trim().replace(/[。！!]+$/u, "");
        if (!AutomationIntentParser.isCandidate(input)) return undefined;

        const time = this.parseTime(input);
        const recurrence = this.parseRecurrence(input);
        const prompt = this.parsePrompt(input);
        const missing: AutomationIntentMissing[] = [];
        if (!time) missing.push("time");
        if (!recurrence) missing.push("recurrence");
        if (!prompt) missing.push("prompt");

        const schedule =
            time && recurrence
                ? this.buildCronSchedule(time.hour, time.minute, recurrence)
                : undefined;
        const command: AutomationCommand = {
            operation: "create",
            idempotencyKey,
            name: prompt ? this.deriveName(prompt) : "定时任务",
            prompt: prompt || "",
            ...(schedule ? { schedule } : {}),
        };
        return { status: missing.length ? "clarification" : "ready", command, missing };
    }

    private parseTime(input: string): { hour: number; minute: number } | undefined {
        // Do not treat a monthly day (`每月 15 号`) as an hour. A time must use a colon or
        // an explicit Chinese hour marker; this keeps incomplete requests in clarification.
        const match = input.match(
            /(?:(上午|下午|晚上|早上|中午)\s*)?(\d{1,2})\s*(?:(?::|：)\s*(\d{1,2})|(?:点|时)\s*(\d{1,2})?\s*分?)/u,
        );
        if (!match) return undefined;
        let hour = Number(match[2]);
        const minute = Number(match[3] ?? match[4] ?? 0);
        if (hour > 23 || minute > 59) return undefined;
        if ((match[1] === "下午" || match[1] === "晚上") && hour < 12) hour += 12;
        if (match[1] === "中午" && hour < 11) hour += 12;
        return { hour, minute };
    }

    private parseRecurrence(input: string): { dayOfMonth?: number; weekdays?: string } | undefined {
        if (/(?:每天|每日)/u.test(input)) return {};
        if (/工作日/u.test(input)) return { weekdays: "1-5" };
        const week = input.match(/每周\s*([一二三四五六日天])/u);
        if (week) {
            const weekday = { 日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 }[week[1]];
            return { weekdays: String(weekday) };
        }
        const month = input.match(/每月\s*(\d{1,2})\s*(?:号|日)/u);
        if (month) {
            const dayOfMonth = Number(month[1]);
            if (dayOfMonth >= 1 && dayOfMonth <= 31) return { dayOfMonth };
        }
        return undefined;
    }

    private parsePrompt(input: string): string | undefined {
        const marker = input.match(/(?:给我|帮我|请)?(?:发送|推送|提醒我|通知我)\s*/u);
        let prompt = marker ? input.slice((marker.index || 0) + marker[0].length) : "";
        if (!prompt) return undefined;
        prompt = prompt
            .replace(
                /^(?:每天|每日|工作日|每周\s*[一二三四五六日天]|每月\s*\d{1,2}\s*(?:号|日))\s*/u,
                "",
            )
            .replace(/^(?:给我|帮我|请)?(?:发送|推送)\s*/u, "")
            .trim()
            .replace(/[，,。；;]+$/u, "");
        return prompt || undefined;
    }

    private deriveName(prompt: string): string {
        const name = prompt.replace(/^当前(?:的)?公司(?:的)?/u, "").trim();
        return (name || prompt).slice(0, 40);
    }

    private buildCronSchedule(
        hour: number,
        minute: number,
        recurrence: { dayOfMonth?: number; weekdays?: string },
    ): AutomationSchedule {
        const timezone = process.env.AUTOMATION_DEFAULT_TIMEZONE?.trim() || "Asia/Shanghai";
        const expression = `${minute} ${hour} ${recurrence.dayOfMonth ?? "*"} * ${recurrence.weekdays ?? "*"}`;
        return parseSchedule({ kind: "cron", expression, timezone });
    }
}
