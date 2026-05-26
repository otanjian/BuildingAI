import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";

import { AppSettings } from "../../../db/entities/app-settings.entity";

@Injectable()
export class SettingsService {
    constructor(
        @InjectRepository(AppSettings)
        private readonly settingsRepo: Repository<AppSettings>,
    ) {}

    async getOrCreate(): Promise<AppSettings> {
        const rows = await this.settingsRepo.find({ take: 1 });
        if (rows[0]) {
            return rows[0];
        }
        return this.settingsRepo.save(this.settingsRepo.create({ agentId: null }));
    }

    async update(payload: { agentId?: string | null }): Promise<AppSettings> {
        const settings = await this.getOrCreate();
        if (payload.agentId !== undefined) {
            settings.agentId = payload.agentId;
        }
        return this.settingsRepo.save(settings);
    }
}
