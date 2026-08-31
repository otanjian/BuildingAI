import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export const USER_MEMORY_CATEGORIES = ["preference", "personal_info", "habit", "instruction"] as const;
export type UserMemoryCategory = (typeof USER_MEMORY_CATEGORIES)[number];
export const USER_MEMORY_CONTENT_MAX_LENGTH = 1000;

export class CreateUserMemoryDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(USER_MEMORY_CONTENT_MAX_LENGTH)
    content: string;

    @IsIn(USER_MEMORY_CATEGORIES)
    category: UserMemoryCategory;
}

export class UpdateUserMemoryDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(USER_MEMORY_CONTENT_MAX_LENGTH)
    content?: string;

    @IsOptional()
    @IsIn(USER_MEMORY_CATEGORIES)
    category?: UserMemoryCategory;
}
