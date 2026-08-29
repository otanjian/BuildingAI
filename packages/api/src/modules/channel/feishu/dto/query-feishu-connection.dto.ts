import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

const CONNECTION_STATES = ["stopped", "connecting", "connected", "error"] as const;

export class QueryFeishuConnectionDto extends PaginationDto {
    @IsOptional()
    @IsUUID("4")
    agentId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    keyword?: string;

    @IsOptional()
    @Transform(({ value }) => value === true || value === "true")
    @IsBoolean()
    enabled?: boolean;

    @IsOptional()
    @IsIn(CONNECTION_STATES)
    connectionState?: (typeof CONNECTION_STATES)[number];
}
