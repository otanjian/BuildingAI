import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class UpdateFeishuChannelDto {
    @IsUUID("4")
    @IsOptional()
    connectionId?: string;

    @IsUUID("4")
    @IsOptional()
    agentId?: string;

    @IsString()
    @MaxLength(200)
    @IsOptional()
    name?: string;

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    appId?: string;

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    appSecret?: string;

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    agentAccessToken?: string;

    @IsBoolean()
    @IsOptional()
    enabled?: boolean;

    @IsBoolean()
    @IsOptional()
    onlyMentioned?: boolean;
}

export class CreateFeishuConnectionDto extends UpdateFeishuChannelDto {
    @IsUUID("4")
    declare agentId: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    declare name: string;
}

export class UpdateFeishuConnectionDto extends UpdateFeishuChannelDto {
    @IsString()
    @MaxLength(200)
    @IsOptional()
    declare name?: string;
}
