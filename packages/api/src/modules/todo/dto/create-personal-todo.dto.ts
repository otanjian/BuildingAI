import { Transform } from "class-transformer";
import {
    IsDateString,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    MaxLength,
    MinLength,
} from "class-validator";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreatePersonalTodoDto {
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MinLength(1)
    @MaxLength(200)
    title: string;

    @IsOptional()
    @IsString()
    description?: string | null;

    @IsOptional()
    @IsUUID()
    assigneeId?: string;

    @IsOptional()
    @Matches(DATE_ONLY_PATTERN, { message: "Planned completion date must use YYYY-MM-DD" })
    @IsDateString({ strict: true })
    plannedCompletionDate?: string | null;
}
