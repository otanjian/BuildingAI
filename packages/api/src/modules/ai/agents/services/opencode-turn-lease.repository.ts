import {
    AgentOpencodeTurn,
    OPENCODE_TURN_ACTIVE_STATUSES,
} from "@buildingai/db/entities/ai-agent-opencode-turn.entity";
import { In, IsNull, LessThanOrEqual, type EntityManager } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { OpencodeTurnLeaseLostError } from "./opencode-turn.repository";

export { OpencodeTurnLeaseLostError } from "./opencode-turn.repository";

export type OpencodeTurnClaim = AgentOpencodeTurn & {
    leaseToken: string;
    leaseExpiresAt: Date;
};

type LeaseClock = {
    now: Date;
    leaseDurationMs: number;
};

@Injectable()
export class OpencodeTurnLeaseRepository {
    async claimAvailable(
        manager: EntityManager,
        options: LeaseClock & {
            limit: number;
            tokenFactory?: () => string;
        },
    ): Promise<OpencodeTurnClaim[]> {
        if (options.limit <= 0) return [];
        this.assertLeaseDuration(options.leaseDurationMs);
        this.assertTransaction(manager);

        const rows = await manager
            .createQueryBuilder(AgentOpencodeTurn, "turn")
            .where("turn.status IN (:...statuses)", {
                statuses: [...OPENCODE_TURN_ACTIVE_STATUSES],
            })
            .andWhere("(turn.leaseToken IS NULL OR turn.leaseExpiresAt <= :now)", {
                now: options.now,
            })
            .orderBy("turn.leaseExpiresAt", "ASC", "NULLS FIRST")
            .addOrderBy("turn.createdAt", "ASC")
            .setLock("pessimistic_write")
            .setOnLocked("skip_locked")
            .take(options.limit)
            .getMany();

        const tokenFactory = options.tokenFactory ?? randomUUID;
        const leaseExpiresAt = new Date(options.now.getTime() + options.leaseDurationMs);
        const claimed: OpencodeTurnClaim[] = [];

        for (const row of rows) {
            const leaseToken = tokenFactory();
            const originalLeaseToken = row.leaseToken;
            const originalLeaseExpiresAt = row.leaseExpiresAt;
            const result = await manager.update(
                AgentOpencodeTurn,
                {
                    id: row.id,
                    status: In([...OPENCODE_TURN_ACTIVE_STATUSES]),
                    leaseToken: originalLeaseToken ?? IsNull(),
                    leaseExpiresAt: originalLeaseExpiresAt
                        ? LessThanOrEqual(options.now)
                        : IsNull(),
                },
                { leaseToken, leaseExpiresAt },
            );
            if (result.affected !== 1) {
                throw new OpencodeTurnLeaseLostError(row.id);
            }
            claimed.push(Object.assign(row, { leaseToken, leaseExpiresAt }));
        }

        return claimed;
    }

    async renew(
        manager: EntityManager,
        options: LeaseClock & { turnId: string; leaseToken: string },
    ): Promise<Date> {
        this.assertLeaseDuration(options.leaseDurationMs);
        const leaseExpiresAt = new Date(options.now.getTime() + options.leaseDurationMs);
        const result = await manager.update(
            AgentOpencodeTurn,
            {
                id: options.turnId,
                leaseToken: options.leaseToken,
                status: In([...OPENCODE_TURN_ACTIVE_STATUSES]),
            },
            { leaseExpiresAt },
        );
        this.assertAffected(result.affected, options.turnId);
        return leaseExpiresAt;
    }

    async release(
        manager: EntityManager,
        options: { turnId: string; leaseToken: string },
    ): Promise<void> {
        const result = await manager.update(
            AgentOpencodeTurn,
            {
                id: options.turnId,
                leaseToken: options.leaseToken,
                status: In([...OPENCODE_TURN_ACTIVE_STATUSES]),
            },
            { leaseToken: null, leaseExpiresAt: null },
        );
        this.assertAffected(result.affected, options.turnId);
    }

    private assertLeaseDuration(leaseDurationMs: number): void {
        if (!Number.isFinite(leaseDurationMs) || leaseDurationMs <= 0) {
            throw new RangeError("leaseDurationMs must be a positive finite number");
        }
    }

    private assertTransaction(manager: EntityManager): void {
        if (!manager.queryRunner?.isTransactionActive) {
            throw new Error("OpenCode turn lease claim requires an active transaction");
        }
    }

    private assertAffected(affected: number | null | undefined, turnId: string): void {
        if (affected !== 1) {
            throw new OpencodeTurnLeaseLostError(turnId);
        }
    }
}
