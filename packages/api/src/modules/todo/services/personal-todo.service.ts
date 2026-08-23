import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Department, DepartmentUserIndex, PersonalTodo, User } from "@buildingai/db/entities";
import { And, In, IsNull, LessThan, MoreThanOrEqual, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import type { CreatePersonalTodoDto, QueryPersonalTodoDto, UpdatePersonalTodoDto } from "../dto";

export interface TodoUserSummary {
    id: string;
    displayName: string;
    avatar: string | null;
}

export interface TodoAssigneeSummary extends TodoUserSummary {
    departments: Array<{ id: string; name: string }>;
}

export interface PersonalTodoResponse {
    id: string;
    title: string;
    description: string | null;
    creatorId: string;
    assigneeId: string;
    plannedCompletionDate: string | null;
    progress: number;
    status: "in_progress" | "completed";
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    creator: TodoUserSummary;
    assignee: TodoUserSummary;
}

@Injectable()
export class PersonalTodoService {
    constructor(
        @InjectRepository(PersonalTodo)
        private readonly todoRepository: Repository<PersonalTodo>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(DepartmentUserIndex)
        private readonly departmentUserRepository: Repository<DepartmentUserIndex>,
        @InjectRepository(Department)
        private readonly departmentRepository: Repository<Department>,
    ) {}

    async list(currentUserId: string, query: QueryPersonalTodoDto) {
        this.assertValidRanges(query);
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 15;
        const builder = this.todoRepository
            .createQueryBuilder("todo")
            .leftJoinAndSelect("todo.creator", "creator")
            .leftJoinAndSelect("todo.assignee", "assignee")
            .where("(todo.creatorId = :currentUserId OR todo.assigneeId = :currentUserId)", {
                currentUserId,
            })
            .andWhere("todo.deletedAt IS NULL");

        const tab = query.tab ?? "in_progress";
        if (tab !== "all") {
            builder.andWhere("todo.status = :status", { status: tab });
        }
        if (query.keyword?.trim()) {
            builder.andWhere(
                "(LOWER(todo.title) LIKE :keyword OR LOWER(COALESCE(todo.description, '')) LIKE :keyword)",
                { keyword: `%${query.keyword.trim().toLowerCase()}%` },
            );
        }
        if (query.creatorId) {
            builder.andWhere("todo.creatorId = :creatorId", { creatorId: query.creatorId });
        }
        if (query.assigneeId) {
            builder.andWhere("todo.assigneeId = :assigneeId", {
                assigneeId: query.assigneeId,
            });
        }
        if (query.plannedDateFrom) {
            builder.andWhere("todo.plannedCompletionDate >= :plannedDateFrom", {
                plannedDateFrom: query.plannedDateFrom,
            });
        }
        if (query.plannedDateTo) {
            builder.andWhere("todo.plannedCompletionDate <= :plannedDateTo", {
                plannedDateTo: query.plannedDateTo,
            });
        }
        if (query.progressMin !== undefined) {
            builder.andWhere("todo.progress >= :progressMin", {
                progressMin: query.progressMin,
            });
        }
        if (query.progressMax !== undefined) {
            builder.andWhere("todo.progress <= :progressMax", {
                progressMax: query.progressMax,
            });
        }

        const [items, total] = await builder
            .orderBy("todo.plannedCompletionDate", "ASC", "NULLS LAST")
            .addOrderBy("todo.updatedAt", "DESC")
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();

        return {
            items: items.map((item) => this.toResponse(item)),
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }

    async get(currentUserId: string, todoId: string): Promise<PersonalTodoResponse> {
        return this.toResponse(await this.findScoped(currentUserId, todoId));
    }

    async countAssignedInProgress(currentUserId: string) {
        const count = await this.todoRepository
            .createQueryBuilder("todo")
            .where("todo.assigneeId = :currentUserId", { currentUserId })
            .andWhere("todo.status = :status", { status: "in_progress" })
            .andWhere("todo.deletedAt IS NULL")
            .getCount();
        return { count };
    }

    async create(currentUserId: string, dto: CreatePersonalTodoDto) {
        const assigneeId = dto.assigneeId ?? currentUserId;
        await this.requireActiveAssignee(assigneeId);
        const entity = this.todoRepository.create({
            title: dto.title.trim(),
            description: dto.description?.trim() || null,
            creatorId: currentUserId,
            assigneeId,
            plannedCompletionDate: dto.plannedCompletionDate ?? null,
            progress: 0,
            status: "in_progress",
            completedAt: null,
        });
        const saved = await this.todoRepository.save(entity);
        return this.get(currentUserId, saved.id);
    }

    async update(currentUserId: string, todoId: string, dto: UpdatePersonalTodoDto) {
        const todo = await this.findScoped(currentUserId, todoId);
        this.requireCreator(todo, currentUserId);
        if (dto.assigneeId !== undefined) {
            await this.requireActiveAssignee(dto.assigneeId);
        }

        const changes: Partial<PersonalTodo> = {};
        if (dto.title !== undefined) changes.title = dto.title.trim();
        if (dto.description !== undefined) changes.description = dto.description?.trim() || null;
        if (dto.assigneeId !== undefined) changes.assigneeId = dto.assigneeId;
        if (dto.plannedCompletionDate !== undefined) {
            changes.plannedCompletionDate = dto.plannedCompletionDate;
        }
        await this.optimisticUpdate(todo, currentUserId, dto.expectedUpdatedAt, changes, true);
        return this.get(currentUserId, todoId);
    }

    async updateProgress(
        currentUserId: string,
        todoId: string,
        progress: number,
        expectedUpdatedAt: string,
    ) {
        const todo = await this.findScoped(currentUserId, todoId);
        this.requireLifecycleActor(todo, currentUserId);
        this.assertProgress(progress);
        await this.optimisticUpdate(
            todo,
            currentUserId,
            expectedUpdatedAt,
            progress === 100
                ? { progress: 100, status: "completed", completedAt: new Date() }
                : { progress, status: "in_progress", completedAt: null },
        );
        return this.get(currentUserId, todoId);
    }

    async complete(currentUserId: string, todoId: string, expectedUpdatedAt: string) {
        const todo = await this.findScoped(currentUserId, todoId);
        this.requireLifecycleActor(todo, currentUserId);
        await this.optimisticUpdate(todo, currentUserId, expectedUpdatedAt, {
            progress: 100,
            status: "completed",
            completedAt: new Date(),
        });
        return this.get(currentUserId, todoId);
    }

    async reopen(currentUserId: string, todoId: string, expectedUpdatedAt: string) {
        const todo = await this.findScoped(currentUserId, todoId);
        this.requireLifecycleActor(todo, currentUserId);
        await this.optimisticUpdate(todo, currentUserId, expectedUpdatedAt, {
            progress: todo.progress >= 100 ? 99 : todo.progress,
            status: "in_progress",
            completedAt: null,
        });
        return this.get(currentUserId, todoId);
    }

    async remove(currentUserId: string, todoId: string, expectedUpdatedAt: string) {
        const todo = await this.findScoped(currentUserId, todoId);
        this.requireCreator(todo, currentUserId);
        const result = await this.todoRepository.softDelete({
            id: todoId,
            creatorId: currentUserId,
            updatedAt: this.createVersionWindow(expectedUpdatedAt),
            deletedAt: IsNull(),
        });
        if (result.affected !== 1) this.throwConflict();
        return { id: todoId };
    }

    async searchAssignees(
        currentUserId: string,
        keyword?: string,
        requestedLimit: number = 20,
    ): Promise<TodoAssigneeSummary[]> {
        const limit = Math.min(Math.max(requestedLimit, 1), 50);
        const builder = this.userRepository
            .createQueryBuilder("user")
            .select(["user.id", "user.realName", "user.nickname", "user.username", "user.avatar"])
            .where("user.status = :activeStatus", { activeStatus: 1 })
            .andWhere("user.deletedAt IS NULL");
        if (keyword?.trim()) {
            builder.andWhere(
                "LOWER(COALESCE(user.realName, '') || ' ' || COALESCE(user.nickname, '') || ' ' || user.username) LIKE :keyword",
                { keyword: `%${keyword.trim().toLowerCase()}%` },
            );
        }
        const users = await builder.orderBy("user.realName", "ASC").take(limit).getMany();
        const currentUser = await this.userRepository.findOne({
            where: { id: currentUserId, status: 1 },
        });
        if (currentUser && !users.some((item) => item.id === currentUser.id)) {
            users.unshift(currentUser);
            users.splice(limit);
        }

        const userIds = users.map((item) => item.id);
        const memberships = userIds.length
            ? await this.departmentUserRepository.find({ where: { userId: In(userIds) } })
            : [];
        const departmentIds = [...new Set(memberships.map((item) => item.departmentId))];
        const departments = departmentIds.length
            ? await this.departmentRepository.find({ where: { id: In(departmentIds) } })
            : [];
        const departmentById = new Map(departments.map((item) => [item.id, item]));

        return users.map((user) => ({
            ...this.toUserSummary(user),
            departments: memberships
                .filter((item) => item.userId === user.id)
                .map((item) => departmentById.get(item.departmentId))
                .filter((item): item is Department => Boolean(item))
                .map((item) => ({ id: item.id, name: item.name })),
        }));
    }

    private async findScoped(currentUserId: string, todoId: string): Promise<PersonalTodo> {
        const todo = await this.todoRepository
            .createQueryBuilder("todo")
            .leftJoinAndSelect("todo.creator", "creator")
            .leftJoinAndSelect("todo.assignee", "assignee")
            .where("todo.id = :todoId", { todoId })
            .andWhere("(todo.creatorId = :currentUserId OR todo.assigneeId = :currentUserId)", {
                currentUserId,
            })
            .andWhere("todo.deletedAt IS NULL")
            .getOne();
        if (!todo) throw HttpErrorFactory.notFound("Todo not found");
        return todo;
    }

    private async requireActiveAssignee(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id: userId, status: 1 } });
        if (!user) throw HttpErrorFactory.badRequest("Assignee is unavailable");
        return user;
    }

    private requireCreator(todo: PersonalTodo, currentUserId: string): void {
        if (todo.creatorId !== currentUserId) {
            throw HttpErrorFactory.forbidden("Only the creator can change the task definition");
        }
    }

    private requireLifecycleActor(todo: PersonalTodo, currentUserId: string): void {
        if (todo.creatorId !== currentUserId && todo.assigneeId !== currentUserId) {
            throw HttpErrorFactory.notFound("Todo not found");
        }
    }

    private async optimisticUpdate(
        todo: PersonalTodo,
        currentUserId: string,
        expectedUpdatedAt: string,
        changes: Partial<PersonalTodo>,
        creatorOnly: boolean = false,
    ): Promise<void> {
        const actorScope =
            creatorOnly || todo.creatorId === currentUserId
                ? { creatorId: currentUserId }
                : { assigneeId: currentUserId };
        const result = await this.todoRepository.update(
            {
                id: todo.id,
                updatedAt: this.createVersionWindow(expectedUpdatedAt),
                deletedAt: IsNull(),
                ...actorScope,
            },
            changes,
        );
        if (result.affected !== 1) this.throwConflict();
    }

    private createVersionWindow(value: string) {
        const start = new Date(value);
        if (Number.isNaN(start.getTime())) {
            throw HttpErrorFactory.badRequest("Invalid expected update time");
        }
        return And(MoreThanOrEqual(start), LessThan(new Date(start.getTime() + 1)));
    }

    private throwConflict(): never {
        throw HttpErrorFactory.conflict("Todo changed since it was loaded", {
            reason: "stale_update",
        });
    }

    private assertProgress(progress: number): void {
        if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
            throw HttpErrorFactory.badRequest("Progress must be an integer from 0 to 100");
        }
    }

    private assertValidRanges(query: QueryPersonalTodoDto): void {
        if (
            query.plannedDateFrom &&
            query.plannedDateTo &&
            query.plannedDateFrom > query.plannedDateTo
        ) {
            throw HttpErrorFactory.badRequest("Planned date range is invalid");
        }
        if (
            query.progressMin !== undefined &&
            query.progressMax !== undefined &&
            query.progressMin > query.progressMax
        ) {
            throw HttpErrorFactory.badRequest("Progress range is invalid");
        }
    }

    private toResponse(todo: PersonalTodo): PersonalTodoResponse {
        return {
            id: todo.id,
            title: todo.title,
            description: todo.description,
            creatorId: todo.creatorId,
            assigneeId: todo.assigneeId,
            plannedCompletionDate: todo.plannedCompletionDate,
            progress: todo.progress,
            status: todo.status,
            completedAt: todo.completedAt,
            createdAt: todo.createdAt,
            updatedAt: todo.updatedAt,
            creator: this.toUserSummary(todo.creator),
            assignee: this.toUserSummary(todo.assignee),
        };
    }

    private toUserSummary(user: User): TodoUserSummary {
        return {
            id: user.id,
            displayName: user.realName || user.nickname || user.username,
            avatar: user.avatar || null,
        };
    }
}
