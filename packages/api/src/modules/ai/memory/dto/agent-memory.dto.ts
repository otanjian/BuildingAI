import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

import { USER_MEMORY_CONTENT_MAX_LENGTH } from "./user-memory.dto";

export class CreateAgentMemoryDto {
    @IsUUID()
    agentId: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(USER_MEMORY_CONTENT_MAX_LENGTH)
    content: string;
}

export class UpdateAgentMemoryDto {
    @IsOptional()
    @IsUUID()
    agentId?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(USER_MEMORY_CONTENT_MAX_LENGTH)
    content?: string;
}

export type AgentMemoryAgentOption = { id: string; name: string };

export type AgentMemoryItem = {
    id: string;
    agentId: string;
    agentName: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
};
