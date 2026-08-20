import { InjectDataSource } from "@buildingai/db/@nestjs/typeorm";
import { DataSource } from "@buildingai/db/typeorm";
import { Injectable, Optional } from "@nestjs/common";

import { OpencodeTurnTelemetryService } from "./opencode-turn-telemetry.service";

export type OpencodeTurnInvariantAudit = {
    terminalAssistantViolations: number;
    billedCompletedWithoutAssistant: number;
    duplicateDeductions: number;
    healthy: boolean;
};

@Injectable()
export class OpencodeTurnInvariantService {
    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        @Optional() private readonly telemetry?: OpencodeTurnTelemetryService,
    ) {}

    async audit(): Promise<OpencodeTurnInvariantAudit> {
        const [terminalRows, billedRows, duplicateRows] = await Promise.all([
            this.dataSource.query(`
                SELECT COUNT(*)::text AS count
                FROM (
                    SELECT turn.id
                    FROM ai_agent_opencode_turn turn
                    LEFT JOIN ai_agent_chat_message message
                      ON message.id = turn.assistant_message_id
                     AND message.conversation_id = turn.conversation_id
                     AND message.parent_id = turn.input_message_id
                     AND message.message ->> 'role' = 'assistant'
                    WHERE turn.status IN ('completed', 'cancelled', 'failed')
                    GROUP BY turn.id
                    HAVING COUNT(message.id) <> 1
                ) violation
            `),
            this.dataSource.query(`
                SELECT COUNT(*)::text AS count
                FROM ai_agent_opencode_turn turn
                JOIN account_log log
                  ON log.association_no = 'opencode-turn:' || turn.id::text
                 AND log.action = 0
                LEFT JOIN ai_agent_chat_message message
                  ON message.id = turn.assistant_message_id
                WHERE turn.status = 'completed'
                  AND message.id IS NULL
            `),
            this.dataSource.query(`
                SELECT COUNT(*)::text AS count
                FROM (
                    SELECT association_no
                    FROM account_log
                    WHERE association_no LIKE 'opencode-turn:%'
                      AND action = 0
                    GROUP BY association_no
                    HAVING COUNT(*) > 1
                ) duplicate
            `),
        ]);
        const result = {
            terminalAssistantViolations: this.count(terminalRows),
            billedCompletedWithoutAssistant: this.count(billedRows),
            duplicateDeductions: this.count(duplicateRows),
        };
        const healthy = Object.values(result).every((value) => value === 0);
        this.telemetry?.gauge(
            "billing_invariant_violation",
            Object.values(result).reduce((sum, value) => sum + value, 0),
            { ...result, healthy },
        );
        return { ...result, healthy };
    }

    private count(rows: Array<{ count?: string | number }>): number {
        return Number(rows[0]?.count ?? 0);
    }
}
