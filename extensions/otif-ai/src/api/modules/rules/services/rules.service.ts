import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { CheckRule } from "../../../db/entities/check-rule.entity";
import { CreateRuleDto } from "../dto/create-rule.dto";
import { UpdateRuleDto } from "../dto/update-rule.dto";

@Injectable()
export class RulesService {
    constructor(
        @InjectRepository(CheckRule)
        private readonly rulesRepo: Repository<CheckRule>,
    ) {}

    list(): Promise<CheckRule[]> {
        return this.rulesRepo.find({ order: { ruleId: "ASC" } });
    }

    async getByRuleId(ruleId: string): Promise<CheckRule> {
        const rule = await this.rulesRepo.findOne({ where: { ruleId } });
        if (!rule) {
            throw HttpErrorFactory.notFound(`Rule ${ruleId} not found`);
        }
        return rule;
    }

    async create(dto: CreateRuleDto): Promise<CheckRule> {
        const ruleId = await this.nextRuleId();
        const entity = this.rulesRepo.create({ ...dto, ruleId });
        return this.rulesRepo.save(entity);
    }

    async update(ruleId: string, dto: UpdateRuleDto): Promise<CheckRule> {
        const rule = await this.getByRuleId(ruleId);
        Object.assign(rule, dto);
        return this.rulesRepo.save(rule);
    }

    async toggle(ruleId: string): Promise<CheckRule> {
        const rule = await this.getByRuleId(ruleId);
        rule.enabled = !rule.enabled;
        return this.rulesRepo.save(rule);
    }

    listEnabled(): Promise<CheckRule[]> {
        return this.rulesRepo.find({ where: { enabled: true }, order: { ruleId: "ASC" } });
    }

    private async nextRuleId(): Promise<string> {
        const rules = await this.rulesRepo.find({ select: ["ruleId"] });
        let max = 0;
        for (const r of rules) {
            const m = /^OTIF_(\d+)$/.exec(r.ruleId);
            if (m) {
                max = Math.max(max, Number(m[1]));
            }
        }
        return `OTIF_${String(max + 1).padStart(3, "0")}`;
    }
}
