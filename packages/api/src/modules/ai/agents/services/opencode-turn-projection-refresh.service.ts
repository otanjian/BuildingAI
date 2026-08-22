import { InjectDataSource } from "@buildingai/db/@nestjs/typeorm";
import { AgentOpencodeTurn } from "@buildingai/db/entities";
import { DataSource } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";

import { OpencodeApiService } from "../integrations/opencode-api.service";
import { OpencodeTurnProjectorService } from "./opencode-turn-projector.service";

@Injectable()
export class OpencodeTurnProjectionRefreshService {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly opencodeApiService: OpencodeApiService,
        private readonly projector: OpencodeTurnProjectorService,
    ) {}

    notify(turnId: string): void {
        this.projector.schedule(turnId, () => this.refresh(turnId));
    }

    private async refresh(turnId: string): Promise<void> {
        const turn = await this.dataSource.manager.findOne(AgentOpencodeTurn, {
            where: { id: turnId },
            relations: { conversation: { agent: true } },
        });
        if (
            !turn ||
            !turn.leaseToken ||
            !turn.conversation.opencodeSessionId ||
            (turn.status !== "accepted" &&
                turn.status !== "running" &&
                turn.status !== "committing")
        ) {
            return;
        }

        const messages = await this.opencodeApiService.listRecentSessionMessages({
            config: turn.conversation.agent?.thirdPartyIntegration,
            sessionId: turn.conversation.opencodeSessionId,
            limit: 50,
            timeoutMs: 5_000,
        });
        await this.projector.project({
            turnId: turn.id,
            leaseToken: turn.leaseToken,
            status: turn.status,
            remoteUserMessageId: turn.opencodeUserMessageId,
            messages,
            sensitiveWordConfig: turn.conversation.agent?.sensitiveWordConfig,
        });
    }
}
