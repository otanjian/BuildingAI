import { Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class RetrieveDto {
    @IsString({ message: "query 必须是字符串" })
    query: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(20)
    topK?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(1)
    scoreThreshold?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    classifications?: string[];
}
