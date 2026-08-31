import { IsArray, IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateCredentialDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    name: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    provider: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    purpose: string;

    @IsString()
    @IsNotEmpty()
    secret: string;

    @IsOptional()
    @IsString()
    projectId?: string;

    @IsOptional()
    @IsString()
    environment?: string;

    @IsOptional()
    @IsArray()
    scopes?: Array<{ resource: string; actions: string[] }>;

    @IsOptional()
    @IsISO8601()
    expiresAt?: string;
}

export class RotateCredentialDto {
    @IsString()
    @IsNotEmpty()
    secret: string;

    @IsOptional()
    @IsISO8601()
    expiresAt?: string;
}
