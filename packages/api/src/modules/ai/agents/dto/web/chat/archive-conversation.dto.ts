import { Transform } from "class-transformer";
import { IsBoolean } from "class-validator";

export class ArchiveConversationDto {
    @Transform(({ value }) => value === true || value === "true")
    @IsBoolean()
    archived: boolean;
}
