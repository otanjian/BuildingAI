import { Transform } from "class-transformer";
import {
    IsDateString,
    IsISO8601,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    MaxLength,
    MinLength,
} from "class-validator";

const DATE_ONLY_OR_EMPTY_PATTERN = /^(\d{4}-\d{2}-\d{2})?$/;

export class UpdatePersonalTodoDto {
    @IsOptional()
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MinLength(1)
    @MaxLength(200)
    title?: string;

    @IsOptional()
    @IsString()
    description?: string | null;

    @IsOptional()
    @IsUUID()
    assigneeId?: string;

    @IsOptional()
    @Matches(DATE_ONLY_OR_EMPTY_PATTERN)
    @IsDateString({ strict: true })
    plannedCompletionDate?: string | null;

    @IsISO8601()
    expectedUpdatedAt: string;
}
