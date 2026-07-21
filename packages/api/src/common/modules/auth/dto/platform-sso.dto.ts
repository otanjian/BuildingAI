import { IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * Trusted platform SSO — mint BuildingAI JWT for an existing username.
 */
export class PlatformSsoDto {
    @IsNotEmpty({ message: "用户名不能为空" })
    @IsString()
    username: string;

    @IsNotEmpty({ message: "secret 不能为空" })
    @IsString()
    secret: string;

    @IsOptional()
    terminal?: number;
}
