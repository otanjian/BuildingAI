import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateWecomAibotConnectionDto {
    @IsUUID("4")
    agentId: string;

    @IsUUID("4")
    @IsOptional()
    credentialRef?: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    botId: string;

    @IsString()
    @IsNotEmpty()
    botSecret: string;

    @IsString()
    @IsNotEmpty()
    agentAccessToken: string;
}

export class UpdateWecomAibotConnectionDto {
    @IsUUID("4")
    @IsOptional()
    agentId?: string;

    @IsUUID("4")
    @IsOptional()
    credentialRef?: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    @IsOptional()
    name?: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    @IsOptional()
    botId?: string;

    @IsString()
    @IsOptional()
    botSecret?: string;

    @IsString()
    @IsOptional()
    agentAccessToken?: string;
}

export class TestWecomAibotConnectionDto extends UpdateWecomAibotConnectionDto {
    @IsUUID("4")
    @IsOptional()
    connectionId?: string;
}

export class ToggleWecomAibotConnectionDto {
    @IsBoolean()
    enabled: boolean;
}
