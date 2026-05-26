import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";

import { RcaSession } from "../../../db/entities/rca-session.entity";
import { AnomaliesService } from "../../anomalies/services/anomalies.service";

@Injectable()
export class RcaService {
    constructor(
        @InjectRepository(RcaSession) private readonly sessionsRepo: Repository<RcaSession>,
        private readonly anomaliesService: AnomaliesService,
    ) {}

    async createSession(anomalyId: string) {
        await this.anomaliesService.getByAnomalyId(anomalyId);
        const session = await this.sessionsRepo.save(
            this.sessionsRepo.create({ anomalyId, conversationId: null }),
        );
        return { sessionId: session.id, anomalyId, conversationId: null };
    }
}
