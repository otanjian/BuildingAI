import {
    IsArray,
    IsString,
    Validate,
    ValidatorConstraint,
    type ValidationArguments,
    type ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ name: "isStringArray", async: false })
class IsStringArray implements ValidatorConstraintInterface {
    validate(value: unknown): boolean {
        return Array.isArray(value) && value.every((item) => typeof item === "string");
    }

    defaultMessage(_args: ValidationArguments): string {
        return "answers must contain string arrays";
    }
}

export class OpencodeQuestionReplyDto {
    @IsString()
    requestId: string;

    @IsArray()
    @Validate(IsStringArray, { each: true })
    answers: string[][];
}

export class OpencodeQuestionRejectDto {
    @IsString()
    requestId: string;
}
