import { IsOptional, IsString, IsUUID } from "class-validator";

export class UpdateSettingsDto {
    @IsOptional()
    @IsString()
    @IsUUID("4")
    agentId?: string | null;
}
