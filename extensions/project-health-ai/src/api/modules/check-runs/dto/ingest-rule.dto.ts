import { IsOptional, IsString, MinLength } from "class-validator";

export class IngestRuleDto {
    @IsString()
    @MinLength(1)
    assistantText: string;

    @IsOptional()
    @IsString()
    conversationId?: string;
}
