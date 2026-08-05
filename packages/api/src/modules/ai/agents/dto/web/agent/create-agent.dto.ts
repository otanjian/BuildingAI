import type { ModelConfig, SensitiveWordConfig } from "@buildingai/types/ai/agent-config.interface";
import { IsArray, IsIn, IsObject, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateAgentDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    avatar?: string;

    @IsOptional()
    @IsIn(["direct", "coze", "dify", "opencode"])
    createMode?: "direct" | "coze" | "dify" | "opencode";

    @IsOptional()
    @IsObject()
    modelConfig?: ModelConfig;

    @IsOptional()
    @IsObject()
    sensitiveWordConfig?: SensitiveWordConfig;

    @IsOptional()
    @IsObject()
    thirdPartyIntegration?: Record<string, unknown>;

    @IsOptional()
    @IsArray()
    @IsUUID("4", { each: true })
    tagIds?: string[];
}
