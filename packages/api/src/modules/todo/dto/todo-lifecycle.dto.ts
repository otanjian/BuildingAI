import { Transform } from "class-transformer";
import { IsISO8601, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class TodoVersionDto {
    @IsISO8601()
    expectedUpdatedAt: string;
}

export class UpdateTodoProgressDto extends TodoVersionDto {
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(0)
    @Max(100)
    progress: number;
}

export class SearchTodoAssigneesDto {
    @IsOptional()
    @IsString()
    keyword?: string;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number = 20;
}
