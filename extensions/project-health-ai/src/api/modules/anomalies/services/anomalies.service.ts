import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { resolveTimestampForStatus } from "../../../shared/anomaly-status";
import { CheckResult } from "../../../db/entities/check-result.entity";
import { UpdateAnomalyStatusDto } from "../dto/update-anomaly-status.dto";

@Injectable()
export class AnomaliesService {
    constructor(
        @InjectRepository(CheckResult)
        private readonly resultsRepo: Repository<CheckResult>,
    ) {}

    list(filters: { risk?: string; status?: string }): Promise<CheckResult[]> {
        const qb = this.resultsRepo.createQueryBuilder("r").orderBy("r.check_time", "DESC");
        if (filters.risk) {
            qb.andWhere("r.risk_level = :risk", { risk: filters.risk });
        }
        if (filters.status) {
            qb.andWhere("r.status = :status", { status: filters.status });
        }
        return qb.getMany();
    }

    async getByAnomalyId(anomalyId: string): Promise<CheckResult> {
        const row = await this.resultsRepo.findOne({ where: { anomalyId } });
        if (!row) {
            throw HttpErrorFactory.notFound(`Anomaly ${anomalyId} not found`);
        }
        return row;
    }

    recent(limit: number): Promise<CheckResult[]> {
        return this.resultsRepo.find({
            order: { checkTime: "DESC" },
            take: limit,
        });
    }

    allForMetrics(): Promise<CheckResult[]> {
        return this.resultsRepo.find();
    }

    async updateStatus(anomalyId: string, dto: UpdateAnomalyStatusDto): Promise<CheckResult> {
        const row = await this.getByAnomalyId(anomalyId);
        const previousStatus = row.status;
        row.status = dto.status;
        row.resolvedAt = resolveTimestampForStatus(dto.status, previousStatus, row.resolvedAt);
        return this.resultsRepo.save(row);
    }
}
