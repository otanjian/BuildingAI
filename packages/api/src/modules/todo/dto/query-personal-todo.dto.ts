import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { Transform } from "class-transformer";
import {
    IsDateString,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    Max,
    Min,
} from "class-validator";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class QueryPersonalTodoDto extends PaginationDto {
    @IsOptional()
    @IsIn(["in_progress", "completed", "all"])
    tab?: "in_progress" | "completed" | "all" = "in_progress";

    @IsOptional()
    @IsString()
    keyword?: string;

    @IsOptional()
    @IsUUID()
    creatorId?: string;

    @IsOptional()
    @IsUUID()
    assigneeId?: string;

    @IsOptional()
    @Matches(DATE_ONLY_PATTERN)
    @IsDateString({ strict: true })
    plannedDateFrom?: string;

    @IsOptional()
    @Matches(DATE_ONLY_PATTERN)
    @IsDateString({ strict: true })
    plannedDateTo?: string;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(0)
    @Max(100)
    progressMin?: number;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(0)
    @Max(100)
    progressMax?: number;
}
