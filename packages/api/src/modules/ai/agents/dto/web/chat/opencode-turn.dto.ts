import {
    IsBoolean,
    IsObject,
    IsOptional,
    IsUUID,
    Validate,
    type ValidationArguments,
    type ValidatorConstraintInterface,
    ValidatorConstraint,
} from "class-validator";

export type OpencodeTurnMessageDto = {
    role: "user";
    parts: Array<Record<string, unknown>>;
};

@ValidatorConstraint({ name: "isCurrentOpencodeUserMessage", async: false })
class IsCurrentOpencodeUserMessage implements ValidatorConstraintInterface {
    validate(value: unknown): boolean {
        if (!value || typeof value !== "object") return false;
        const message = value as Record<string, unknown>;
        if (message.role !== "user" || !Array.isArray(message.parts) || !message.parts.length) {
            return false;
        }
        if (Object.keys(message).some((key) => key !== "role" && key !== "parts")) {
            return false;
        }
        return message.parts.every((part) => {
            if (!part || typeof part !== "object") return false;
            const record = part as Record<string, unknown>;
            if (record.type === "text") {
                return (
                    Object.keys(record).every((key) => key === "type" || key === "text") &&
                    typeof record.text === "string" &&
                    record.text.trim().length > 0
                );
            }
            if (record.type === "file") {
                return (
                    Object.keys(record).every((key) =>
                        ["type", "url", "mediaType", "filename"].includes(key),
                    ) &&
                    typeof record.url === "string" &&
                    record.url.trim().length > 0 &&
                    typeof record.mediaType === "string" &&
                    record.mediaType.startsWith("image/")
                );
            }
            return false;
        });
    }

    defaultMessage(_args: ValidationArguments): string {
        return "message must be one current user command with text and/or image parts";
    }
}

export class OpencodeTurnRequestDto {
    @IsUUID("4")
    turnId: string;

    @IsUUID("4")
    conversationId: string;

    @IsObject()
    @Validate(IsCurrentOpencodeUserMessage)
    message: OpencodeTurnMessageDto;

    @IsOptional()
    @IsObject()
    formVariables?: Record<string, string>;

    @IsOptional()
    @IsObject()
    formFieldsInputs?: Record<string, unknown>;

    @IsOptional()
    @IsBoolean()
    isDebug?: boolean;
}
