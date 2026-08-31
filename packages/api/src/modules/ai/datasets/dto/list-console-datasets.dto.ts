import { SquarePublishStatus } from "@buildingai/db/entities";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

const STATUS_VALUES = [
    "all",
    SquarePublishStatus.NONE,
    SquarePublishStatus.PENDING,
    SquarePublishStatus.APPROVED,
    SquarePublishStatus.REJECTED,
    "published",
    "unpublished",
] as const;

export class ListConsoleDatasetsDto extends PaginationDto {
    /** Internal verified scope propagated by TenantContextGuard; never accepted from request body. */
    @IsOptional()
    @IsUUID("4")
    tenantId?: string;
    @IsOptional()
    @IsString()
    @MaxLength(100)
    name?: string;

    @IsOptional()
    @IsIn(STATUS_VALUES)
    status?: (typeof STATUS_VALUES)[number];

    @IsOptional()
    @IsUUID("4")
    tagId?: string;
}
