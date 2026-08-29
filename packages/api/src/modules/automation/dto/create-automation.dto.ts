import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class AutomationScheduleDto {
    @IsIn(["at", "every", "cron"])
    kind: "at" | "every" | "cron";

    @IsOptional() @IsString() at?: string;
    @IsOptional() @IsInt() @Min(60) intervalSeconds?: number;
    @IsOptional() @IsString() anchorAt?: string;
    @IsOptional() @IsString() expression?: string;
    @IsOptional() @IsString() timezone?: string;
}

export class AutomationTargetDto {
    @IsString() @IsNotEmpty() channel: string;
    @IsString() @IsNotEmpty() accountId: string;
    @IsOptional() @IsString() tenantId?: string;
    @IsIn(["chat", "user"]) targetType: "chat" | "user";
    @IsString() @IsNotEmpty() targetId: string;
    @IsOptional() @IsBoolean() mentionAll?: boolean;
}

export class CreateAutomationDto {
    @IsString() @IsNotEmpty() name: string;
    @IsUUID() agentId: string;
    @IsString() @IsNotEmpty() prompt: string;
    @ValidateNested() @Type(() => AutomationScheduleDto) schedule: AutomationScheduleDto;
    @ValidateNested() @Type(() => AutomationTargetDto) target: AutomationTargetDto;
    @IsOptional() @IsBoolean() deleteAfterRun?: boolean;
    @IsOptional() @IsIn(["fire_once", "skip", "catch_up"]) missedRunPolicy?: "fire_once" | "skip" | "catch_up";
    @IsOptional() @IsIn(["skip", "queue_one", "allow"]) overlapPolicy?: "skip" | "queue_one" | "allow";
    @IsOptional() @IsInt() @Min(1) @Max(86400) timeoutSeconds?: number;
}
