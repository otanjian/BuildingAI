import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateConsoleMcpApiKeyDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    label: string;
}
