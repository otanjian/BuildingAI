import { IsBoolean, IsIn, IsInt, IsString, Max, Min, MinLength } from "class-validator";

export class CreateRuleDto {
    @IsString()
    @IsIn(["财务数据", "供应链", "供应链数据", "合作伙伴"])
    businessDomain: string;

    @IsString()
    @MinLength(1)
    dataItem: string;

    @IsString()
    @MinLength(1)
    ruleDescription: string;

    @IsInt()
    @Min(1)
    @Max(100)
    deductScore: number;

    @IsString()
    @IsIn(["高", "中", "低"])
    severity: string;

    @IsBoolean()
    autoFix: boolean;

    @IsBoolean()
    enabled: boolean;
}
