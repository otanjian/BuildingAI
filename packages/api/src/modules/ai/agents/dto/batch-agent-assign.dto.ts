import { IsArray, IsUUID } from "class-validator";

/**
 * 批量分配/移除智能体用户 DTO
 */
export class BatchAgentAssignDto {
    @IsArray()
    @IsUUID("4", { each: true })
    userIds: string[];
}
