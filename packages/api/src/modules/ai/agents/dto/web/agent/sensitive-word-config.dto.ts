import type {
    SensitiveWordConfig,
    SensitiveWordConfigUpdate,
    SensitiveWordReplacementRule,
} from "@buildingai/types/ai/agent-config.interface";
import { validateSensitiveWordRules } from "@buildingai/utils/sensitive-word-config";
import { Type } from "class-transformer";
import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    Validate,
    ValidateIf,
    ValidateNested,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    type ValidationArguments,
} from "class-validator";

@ValidatorConstraint({ name: "validSensitiveWordRules", async: false })
export class SensitiveWordRulesConstraint implements ValidatorConstraintInterface {
    validate(value: unknown): boolean {
        return validateSensitiveWordRules(value).valid;
    }

    defaultMessage(): string {
        return "Sensitive word replacement rules are invalid";
    }
}

@ValidatorConstraint({ name: "completeSensitiveWordCompatibilityConfig", async: false })
export class SensitiveWordCompatibilityConstraint implements ValidatorConstraintInterface {
    validate(_value: unknown, args?: ValidationArguments): boolean {
        const config = args?.object as SensitiveWordCompatibilityConfigDto;
        if (!config) return false;
        const canonical = config.rules !== undefined || config.revision !== undefined;
        if (canonical) {
            return (
                Array.isArray(config.rules) &&
                Number.isInteger(config.revision) &&
                (config.revision ?? 0) >= 1 &&
                Array.isArray(config.words) &&
                config.replacement === "***" &&
                validateSensitiveWordRules(config.rules).valid
            );
        }
        return Array.isArray(config.words);
    }

    defaultMessage(): string {
        return "Sensitive word config must be strict legacy data or a complete canonical echo";
    }
}

export class SensitiveWordReplacementRuleDto implements SensitiveWordReplacementRule {
    @IsString()
    @MaxLength(256)
    word: string;

    @IsString()
    @MaxLength(256)
    replacement: string;
}

export class UpdateSensitiveWordConfigDto implements SensitiveWordConfigUpdate {
    @IsBoolean()
    enabled: boolean;

    @IsBoolean()
    applyToReasoning: boolean;

    @IsInt()
    @Min(0)
    expectedRevision: number;

    @IsArray()
    @ArrayMaxSize(500)
    @ValidateNested({ each: true })
    @Type(() => SensitiveWordReplacementRuleDto)
    @Validate(SensitiveWordRulesConstraint)
    rules: SensitiveWordReplacementRuleDto[];
}

export class SensitiveWordCompatibilityConfigDto implements SensitiveWordConfig {
    @IsBoolean()
    @Validate(SensitiveWordCompatibilityConstraint)
    enabled: boolean;

    @IsOptional()
    @IsBoolean()
    applyToReasoning?: boolean;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(500)
    @IsString({ each: true })
    words?: string[];

    @IsOptional()
    @IsString()
    replacement?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    revision?: number;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(500)
    @ValidateNested({ each: true })
    @Type(() => SensitiveWordReplacementRuleDto)
    @Validate(SensitiveWordRulesConstraint)
    rules?: SensitiveWordReplacementRuleDto[];
}
