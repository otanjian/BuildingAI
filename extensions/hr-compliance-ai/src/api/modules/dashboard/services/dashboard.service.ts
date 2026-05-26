import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";

import { CheckResult } from "../../../db/entities/check-result.entity";
import { CheckRule } from "../../../db/entities/check-rule.entity";
import { CheckRunItem } from "../../../db/entities/check-run-item.entity";
import { CheckRun } from "../../../db/entities/check-run.entity";
import { RcaSession } from "../../../db/entities/rca-session.entity";
import { AnomaliesService } from "../../anomalies/services/anomalies.service";
import { RulesService } from "../../rules/services/rules.service";
import {
    buildAnomalyTrendSeries,
    buildDomainDistribution,
    buildRecentBatches,
    buildRepairTrend,
    buildRiskDistribution,
    buildStatusDistribution,
    buildSummaryMetrics,
    buildTopRules,
} from "../shared/dashboard-metrics";

@Injectable()
export class DashboardService {
    constructor(
        private readonly rulesService: RulesService,
        private readonly anomaliesService: AnomaliesService,
        @InjectRepository(CheckRun) private readonly runsRepo: Repository<CheckRun>,
        @InjectRepository(CheckRunItem) private readonly itemsRepo: Repository<CheckRunItem>,
        @InjectRepository(RcaSession) private readonly rcaRepo: Repository<RcaSession>,
    ) {}

    async overview() {
        const [rules, results, runs, items, rcaSessions, recentAnomalies] = await Promise.all([
            this.rulesService.list(),
            this.anomaliesService.allForMetrics(),
            this.runsRepo.find({ order: { id: "DESC" } }),
            this.itemsRepo.find(),
            this.rcaRepo.find(),
            this.anomaliesService.recent(8),
        ]);

        return {
            summary: buildSummaryMetrics(rules, results, runs, rcaSessions),
            anomalyTrend: buildAnomalyTrendSeries(results, 14),
            riskDistribution: buildRiskDistribution(results),
            domainDistribution: buildDomainDistribution(rules, results),
            topRules: buildTopRules(results, 5),
            statusDistribution: buildStatusDistribution(results),
            repairTrend: buildRepairTrend(results, 7),
            recentBatches: buildRecentBatches(runs, items, 5),
            recentAnomalies,
        };
    }

    async summary() {
        const [rules, results, runs, rcaSessions] = await Promise.all([
            this.rulesService.list(),
            this.anomaliesService.allForMetrics(),
            this.runsRepo.find(),
            this.rcaRepo.find(),
        ]);
        return buildSummaryMetrics(rules, results, runs, rcaSessions);
    }

    async trend(days = 7) {
        const results = await this.anomaliesService.allForMetrics();
        return buildAnomalyTrendSeries(results, days).map((p) => ({
            date: p.date,
            count: p.newCount,
        }));
    }

    recentAnomalies(limit: number) {
        return this.anomaliesService.recent(limit);
    }
}
