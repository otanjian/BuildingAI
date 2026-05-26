import { IsIn, IsString } from "class-validator";

const ANOMALY_STATUSES = ["待解决", "已解决", "ai自动修复"] as const;

export class UpdateAnomalyStatusDto {
    @IsString()
    @IsIn(ANOMALY_STATUSES)
    status: (typeof ANOMALY_STATUSES)[number];
}
