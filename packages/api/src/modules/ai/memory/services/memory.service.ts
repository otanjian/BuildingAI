import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { type UserPlayground } from "@buildingai/db";
import { Agent, AgentAssignment, AgentMemory, UserMemory } from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger, Optional } from "@nestjs/common";
import { HttpErrorFactory } from "@buildingai/errors";

import type {
    AgentMemoryAgentOption,
    AgentMemoryItem,
    CreateAgentMemoryDto,
    UpdateAgentMemoryDto,
} from "../dto/agent-memory.dto";
import { USER_MEMORY_CONTENT_MAX_LENGTH, type UserMemoryCategory } from "../dto/user-memory.dto";

@Injectable()
export class MemoryService extends BaseService<UserMemory> {
    protected readonly logger = new Logger(MemoryService.name);

    constructor(
        @InjectRepository(UserMemory)
        private readonly userMemoryRepository: Repository<UserMemory>,
        @InjectRepository(AgentMemory)
        private readonly agentMemoryRepository: Repository<AgentMemory>,
        @Optional()
        @InjectRepository(Agent)
        private readonly agentRepository?: Repository<Agent>,
        @Optional()
        @InjectRepository(AgentAssignment)
        private readonly agentAssignmentRepository?: Repository<AgentAssignment>,
    ) {
        super(userMemoryRepository);
    }

    async getUserMemories(userId: string, limit = 20): Promise<UserMemory[]> {
        return this.userMemoryRepository.find({
            where: { userId, isActive: true },
            order: { createdAt: "DESC" },
            take: limit,
        });
    }

    async createUserMemory(params: {
        userId: string;
        content: string;
        category: string;
        source?: string;
        sourceAgentId?: string;
    }): Promise<UserMemory> {
        const content = params.content.trim();
        if (!content || content.length > USER_MEMORY_CONTENT_MAX_LENGTH) {
            throw HttpErrorFactory.badRequest("记忆内容不能为空且长度不能超过1000个字符");
        }
        const isDuplicate = await this.isDuplicateUserMemory(params.userId, content);
        if (isDuplicate) {
            this.logger.debug(`Skipping duplicate user memory: "${content.slice(0, 60)}..."`);
            return isDuplicate;
        }

        const memory = this.userMemoryRepository.create({
            userId: params.userId,
            content,
            category: params.category,
            source: params.source,
            sourceAgentId: params.sourceAgentId,
            isActive: true,
        });
        return this.userMemoryRepository.save(memory);
    }

    async getAgentMemories(userId: string, agentId: string, limit = 20): Promise<AgentMemory[]> {
        return this.agentMemoryRepository.find({
            where: { userId, agentId, isActive: true },
            order: { createdAt: "DESC" },
            take: limit,
        });
    }

    async createAgentMemory(params: {
        userId: string;
        agentId: string;
        content: string;
        category: string;
        source?: string;
    }): Promise<AgentMemory> {
        const content = params.content.trim();
        if (!content || content.length > USER_MEMORY_CONTENT_MAX_LENGTH) {
            throw HttpErrorFactory.badRequest("记忆内容不能为空且长度不能超过1000个字符");
        }
        const isDuplicate = await this.isDuplicateAgentMemory(
            params.userId,
            params.agentId,
            content,
        );
        if (isDuplicate) {
            this.logger.debug(`Skipping duplicate agent memory: "${content.slice(0, 60)}..."`);
            return isDuplicate;
        }

        const memory = this.agentMemoryRepository.create({
            userId: params.userId,
            agentId: params.agentId,
            content,
            category: params.category,
            source: params.source,
            isActive: true,
        });
        return this.agentMemoryRepository.save(memory);
    }

    async findUserMemoryById(id: string, userId: string): Promise<UserMemory | null> {
        return this.userMemoryRepository.findOne({
            where: { id, userId, isActive: true },
        });
    }

    async deactivateUserMemory(id: string, userId: string): Promise<void> {
        await this.userMemoryRepository
            .createQueryBuilder()
            .update()
            .set({ isActive: false })
            .where("id = :id", { id })
            .andWhere("userId = :userId", { userId })
            .andWhere("isActive = true")
            .execute();
    }

    async updateUserMemory(
        id: string,
        userId: string,
        params: { content?: string; category?: UserMemoryCategory },
    ): Promise<UserMemory | null> {
        const content = params.content?.trim();
        if (
            content !== undefined &&
            (!content || content.length > USER_MEMORY_CONTENT_MAX_LENGTH)
        ) {
            throw HttpErrorFactory.badRequest("记忆内容不能为空且长度不能超过1000个字符");
        }
        const existing = await this.findUserMemoryById(id, userId);
        if (!existing) return null;
        const nextContent = content ?? existing.content;
        const duplicate = await this.isDuplicateUserMemory(userId, nextContent);
        if (duplicate && duplicate.id !== id) return duplicate;
        await this.userMemoryRepository
            .createQueryBuilder()
            .update()
            .set({ content: nextContent, category: params.category ?? existing.category })
            .where("id = :id", { id })
            .andWhere("userId = :userId", { userId })
            .andWhere("isActive = true")
            .execute();
        return this.findUserMemoryById(id, userId);
    }

    async deactivateAllUserMemories(userId: string): Promise<void> {
        await this.userMemoryRepository
            .createQueryBuilder()
            .update()
            .set({ isActive: false })
            .where("userId = :userId", { userId })
            .andWhere("isActive = true")
            .execute();
    }

    async listAccessibleAgents(user: UserPlayground): Promise<AgentMemoryAgentOption[]> {
        if (!this.agentRepository) return [];
        const agents = await this.agentRepository.find({ order: { name: "ASC" } });
        if (user.isRoot) {
            return agents.map(({ id, name }) => ({ id, name }));
        }

        const assignments = this.agentAssignmentRepository
            ? await this.agentAssignmentRepository.find({ where: { userId: user.id } })
            : [];
        const assignedIds = new Set(assignments.map((assignment) => assignment.agentId));
        return agents
            .filter((agent) => {
                if (agent.tenantId && agent.tenantId !== user.tenantId) return false;
                if (agent.createBy === user.id) return true;
                return (
                    agent.publishedToSquare &&
                    agent.squarePublishStatus === "approved" &&
                    (agent.squareVisibility === "all" || assignedIds.has(agent.id))
                );
            })
            .map(({ id, name }) => ({ id, name }));
    }

    async listAgentMemoriesForUser(user: UserPlayground, limit = 100): Promise<AgentMemoryItem[]> {
        const accessibleAgents = await this.listAccessibleAgents(user);
        if (accessibleAgents.length === 0) return [];
        const agentMap = new Map(accessibleAgents.map((agent) => [agent.id, agent.name]));
        const memories = await this.agentMemoryRepository.find({
            where: {
                userId: user.id,
                isActive: true,
                agentId: In(accessibleAgents.map((agent) => agent.id)),
            },
            order: { updatedAt: "DESC" },
            take: limit,
        });
        return memories.map((memory) => ({
            id: memory.id,
            agentId: memory.agentId,
            agentName: agentMap.get(memory.agentId) ?? "",
            content: memory.content,
            createdAt: memory.createdAt,
            updatedAt: memory.updatedAt,
        }));
    }

    async createAgentMemoryForUser(
        user: UserPlayground,
        params: CreateAgentMemoryDto,
    ): Promise<AgentMemoryItem> {
        await this.assertAgentAccessible(user, params.agentId);
        const memory = await this.createAgentMemory({
            userId: user.id,
            agentId: params.agentId,
            content: params.content,
            category: "manual",
            source: "manual",
        });
        return this.toAgentMemoryItem(memory, user);
    }

    async findAgentMemoryById(id: string, userId: string): Promise<AgentMemory | null> {
        return this.agentMemoryRepository.findOne({ where: { id, userId, isActive: true } });
    }

    async updateAgentMemoryForUser(
        id: string,
        user: UserPlayground,
        params: UpdateAgentMemoryDto,
    ): Promise<AgentMemoryItem | null> {
        const existing = await this.findAgentMemoryById(id, user.id);
        if (!existing) return null;
        const content = params.content?.trim();
        if (
            content !== undefined &&
            (!content || content.length > USER_MEMORY_CONTENT_MAX_LENGTH)
        ) {
            throw HttpErrorFactory.badRequest("记忆内容不能为空且长度不能超过1000个字符");
        }
        const agentId = params.agentId ?? existing.agentId;
        await this.assertAgentAccessible(user, agentId);
        const nextContent = content ?? existing.content;
        const duplicate = await this.isDuplicateAgentMemory(user.id, agentId, nextContent);
        if (duplicate && duplicate.id !== id) return this.toAgentMemoryItem(duplicate, user);
        existing.agentId = agentId;
        existing.content = nextContent;
        const saved = await this.agentMemoryRepository.save(existing);
        return this.toAgentMemoryItem(saved, user);
    }

    async deactivateAgentMemory(id: string, userId: string): Promise<void> {
        await this.agentMemoryRepository
            .createQueryBuilder()
            .update()
            .set({ isActive: false })
            .where("id = :id", { id })
            .andWhere("userId = :userId", { userId })
            .andWhere("isActive = true")
            .execute();
    }

    async deactivateAllAgentMemories(userId: string): Promise<void> {
        await this.agentMemoryRepository
            .createQueryBuilder()
            .update()
            .set({ isActive: false })
            .where("userId = :userId", { userId })
            .andWhere("isActive = true")
            .execute();
    }

    async trimUserMemoriesToLimit(userId: string, maxCount: number): Promise<void> {
        if (maxCount <= 0) return;
        const toKeep = await this.userMemoryRepository.find({
            where: { userId, isActive: true },
            order: { createdAt: "DESC" },
            take: maxCount,
            select: ["id"],
        });
        const keepIds = toKeep.map((m) => m.id);
        if (keepIds.length === 0) return;
        await this.userMemoryRepository
            .createQueryBuilder()
            .update()
            .set({ isActive: false })
            .where("userId = :userId", { userId })
            .andWhere("isActive = true")
            .andWhere("id NOT IN (:...keepIds)", { keepIds })
            .execute();
    }

    async trimAgentMemoriesToLimit(
        userId: string,
        agentId: string,
        maxCount: number,
    ): Promise<void> {
        if (maxCount <= 0) return;
        const toKeep = await this.agentMemoryRepository.find({
            where: { userId, agentId, isActive: true },
            order: { createdAt: "DESC" },
            take: maxCount,
            select: ["id"],
        });
        const keepIds = toKeep.map((m) => m.id);
        if (keepIds.length === 0) return;
        await this.agentMemoryRepository
            .createQueryBuilder()
            .update()
            .set({ isActive: false })
            .where("userId = :userId", { userId })
            .andWhere("agentId = :agentId", { agentId })
            .andWhere("isActive = true")
            .andWhere("id NOT IN (:...keepIds)", { keepIds })
            .execute();
    }

    private async isDuplicateUserMemory(
        userId: string,
        content: string,
    ): Promise<UserMemory | null> {
        const normalized = content.trim().toLowerCase();
        const existing = await this.userMemoryRepository
            .createQueryBuilder("m")
            .where("m.userId = :userId", { userId })
            .andWhere("m.isActive = true")
            .andWhere("LOWER(TRIM(m.content)) = :normalized", { normalized })
            .getOne();
        return existing;
    }

    private async isDuplicateAgentMemory(
        userId: string,
        agentId: string,
        content: string,
    ): Promise<AgentMemory | null> {
        const normalized = content.trim().toLowerCase();
        const existing = await this.agentMemoryRepository
            .createQueryBuilder("m")
            .where("m.userId = :userId", { userId })
            .andWhere("m.agentId = :agentId", { agentId })
            .andWhere("m.isActive = true")
            .andWhere("LOWER(TRIM(m.content)) = :normalized", { normalized })
            .getOne();
        return existing;
    }

    private async assertAgentAccessible(
        user: UserPlayground,
        agentId: string,
    ): Promise<AgentMemoryAgentOption> {
        const agent = (await this.listAccessibleAgents(user)).find((item) => item.id === agentId);
        if (!agent) throw HttpErrorFactory.forbidden("无权访问该智能体");
        return agent;
    }

    private async toAgentMemoryItem(
        memory: AgentMemory,
        user: UserPlayground,
    ): Promise<AgentMemoryItem> {
        const agent = (await this.listAccessibleAgents(user)).find(
            (item) => item.id === memory.agentId,
        );
        return {
            id: memory.id,
            agentId: memory.agentId,
            agentName: agent?.name ?? "",
            content: memory.content,
            createdAt: memory.createdAt,
            updatedAt: memory.updatedAt,
        };
    }
}
