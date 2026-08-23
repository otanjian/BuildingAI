jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});

import { PersonalTodoService } from "./services/personal-todo.service";

const NOW = new Date("2026-08-22T08:00:00.000Z");

function expectedVersionWindow(start: Date = NOW) {
    return expect.objectContaining({
        type: "and",
        value: [
            expect.objectContaining({ type: "moreThanOrEqual", value: start }),
            expect.objectContaining({
                type: "lessThan",
                value: new Date(start.getTime() + 1),
            }),
        ],
    });
}

function todo(overrides: Record<string, unknown> = {}) {
    return {
        id: "todo-1",
        title: "Prepare launch",
        description: null,
        creatorId: "creator-1",
        assigneeId: "assignee-1",
        plannedCompletionDate: "2026-08-31",
        progress: 30,
        status: "in_progress",
        completedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
        deletedAt: null,
        creator: { id: "creator-1", username: "creator", realName: "Creator" },
        assignee: { id: "assignee-1", username: "assignee", nickname: "Owner" },
        ...overrides,
    };
}

function queryBuilder(
    result: { one?: unknown; many?: unknown[]; total?: number; count?: number } = {},
) {
    return {
        select: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(result.one ?? null),
        getMany: jest.fn().mockResolvedValue(result.many ?? []),
        getManyAndCount: jest.fn().mockResolvedValue([result.many ?? [], result.total ?? 0]),
        getCount: jest.fn().mockResolvedValue(result.count ?? 0),
    };
}

function harness(options: { scopedTodo?: unknown; list?: unknown[]; count?: number } = {}) {
    const builders: ReturnType<typeof queryBuilder>[] = [];
    const repository = {
        createQueryBuilder: jest.fn(() => {
            const builder = queryBuilder({
                one: options.scopedTodo,
                many: options.list,
                total: options.list?.length,
                count: options.count,
            });
            builders.push(builder);
            return builder;
        }),
        create: jest.fn((value) => value),
        save: jest.fn(async (value) => ({ id: "todo-created", updatedAt: NOW, ...value })),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const userRepository = {
        findOne: jest.fn().mockResolvedValue({
            id: "assignee-2",
            username: "new-owner",
            nickname: "New Owner",
            realName: null,
            avatar: null,
            status: 1,
        }),
        createQueryBuilder: jest.fn(),
    };
    const departmentUserRepository = { find: jest.fn().mockResolvedValue([]) };
    const departmentRepository = { find: jest.fn().mockResolvedValue([]) };
    const service = new PersonalTodoService(
        repository as never,
        userRepository as never,
        departmentUserRepository as never,
        departmentRepository as never,
    );

    return {
        builders,
        departmentRepository,
        departmentUserRepository,
        repository,
        service,
        userRepository,
    };
}

describe("PersonalTodoService visibility and filters", () => {
    it("always scopes list queries to non-deleted todos created by or assigned to the caller", async () => {
        const h = harness({ list: [todo()] });

        const result = await h.service.list("root-user", {
            page: 2,
            pageSize: 10,
            tab: "completed",
            keyword: " Launch ",
            creatorId: "creator-1",
            assigneeId: "assignee-1",
            plannedDateFrom: "2026-08-01",
            plannedDateTo: "2026-08-31",
            progressMin: 20,
            progressMax: 80,
        });

        const builder = h.builders[0];
        expect(builder.where).toHaveBeenCalledWith(
            "(todo.creatorId = :currentUserId OR todo.assigneeId = :currentUserId)",
            { currentUserId: "root-user" },
        );
        expect(builder.andWhere).toHaveBeenCalledWith("todo.deletedAt IS NULL");
        expect(builder.andWhere).toHaveBeenCalledWith("todo.status = :status", {
            status: "completed",
        });
        expect(builder.andWhere).toHaveBeenCalledWith(
            "(LOWER(todo.title) LIKE :keyword OR LOWER(COALESCE(todo.description, '')) LIKE :keyword)",
            { keyword: "%launch%" },
        );
        expect(builder.andWhere).toHaveBeenCalledWith(
            "todo.plannedCompletionDate >= :plannedDateFrom",
            { plannedDateFrom: "2026-08-01" },
        );
        expect(builder.andWhere).toHaveBeenCalledWith(
            "todo.plannedCompletionDate <= :plannedDateTo",
            { plannedDateTo: "2026-08-31" },
        );
        expect(builder.andWhere).toHaveBeenCalledWith("todo.progress >= :progressMin", {
            progressMin: 20,
        });
        expect(builder.andWhere).toHaveBeenCalledWith("todo.progress <= :progressMax", {
            progressMax: 80,
        });
        expect(builder.skip).toHaveBeenCalledWith(10);
        expect(result.total).toBe(1);
    });

    it("uses the same scope for detail and returns not-found to unrelated users", async () => {
        const h = harness();

        await expect(h.service.get("outsider", "todo-1")).rejects.toMatchObject({
            httpStatus: 404,
        });
        expect(h.builders[0].where).toHaveBeenCalledWith("todo.id = :todoId", {
            todoId: "todo-1",
        });
        expect(h.builders[0].andWhere).toHaveBeenCalledWith(
            "(todo.creatorId = :currentUserId OR todo.assigneeId = :currentUserId)",
            { currentUserId: "outsider" },
        );
        expect(h.builders[0].andWhere).toHaveBeenCalledWith("todo.deletedAt IS NULL");
    });

    it("counts only active in-progress todos currently assigned to the caller", async () => {
        const h = harness({ count: 7 });

        await expect(h.service.countAssignedInProgress("user-1")).resolves.toEqual({ count: 7 });
        expect(h.builders[0].where).toHaveBeenCalledWith("todo.assigneeId = :currentUserId", {
            currentUserId: "user-1",
        });
        expect(h.builders[0].andWhere).toHaveBeenCalledWith("todo.status = :status", {
            status: "in_progress",
        });
        expect(h.builders[0].andWhere).toHaveBeenCalledWith("todo.deletedAt IS NULL");
    });

    it.each([
        ["in_progress", true],
        ["completed", true],
        ["all", false],
    ] as const)("combines the %s tab with mandatory visibility", async (tab, expectsStatus) => {
        const h = harness();
        await h.service.list("user-1", { tab });

        expect(h.builders[0].where).toHaveBeenCalledWith(
            "(todo.creatorId = :currentUserId OR todo.assigneeId = :currentUserId)",
            { currentUserId: "user-1" },
        );
        const statusCalls = h.builders[0].andWhere.mock.calls.filter(
            ([condition]) => condition === "todo.status = :status",
        );
        expect(statusCalls.length > 0).toBe(expectsStatus);
    });

    it("rejects inverted ranges before issuing a database request", async () => {
        const h = harness();
        await expect(
            h.service.list("user-1", {
                plannedDateFrom: "2026-09-01",
                plannedDateTo: "2026-08-01",
            }),
        ).rejects.toMatchObject({ httpStatus: 400 });
        await expect(
            h.service.list("user-1", { progressMin: 80, progressMax: 20 }),
        ).rejects.toMatchObject({ httpStatus: 400 });
        expect(h.repository.createQueryBuilder).not.toHaveBeenCalled();
    });
});

describe("PersonalTodoService authorization and lifecycle", () => {
    it("matches optimistic versions across the browser's millisecond timestamp precision", async () => {
        const h = harness({ scopedTodo: todo() });

        await h.service.updateProgress("assignee-1", "todo-1", 80, NOW.toISOString());

        const [criteria] = h.repository.update.mock.calls[0];
        const versionWindow = criteria.updatedAt as {
            type?: string;
            value?: Array<{ type: string; value: Date }>;
        };
        expect(versionWindow.type).toBe("and");
        expect(versionWindow.value?.[0]?.type).toBe("moreThanOrEqual");
        expect(versionWindow.value?.[0]?.value).toEqual(NOW);
        expect(versionWindow.value?.[1]?.type).toBe("lessThan");
        expect(versionWindow.value?.[1]?.value).toEqual(new Date(NOW.getTime() + 1));
    });

    it("allows only the creator to edit task definition or reassign", async () => {
        const assigned = harness({ scopedTodo: todo() });
        await expect(
            assigned.service.update("assignee-1", "todo-1", {
                title: "Changed",
                expectedUpdatedAt: NOW.toISOString(),
            }),
        ).rejects.toMatchObject({ httpStatus: 403 });
        expect(assigned.repository.update).not.toHaveBeenCalled();

        const creator = harness({ scopedTodo: todo() });
        await creator.service.update("creator-1", "todo-1", {
            assigneeId: "assignee-2",
            expectedUpdatedAt: NOW.toISOString(),
        });
        expect(creator.userRepository.findOne).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "assignee-2", status: 1 } }),
        );
        expect(creator.repository.update).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "todo-1",
                creatorId: "creator-1",
                updatedAt: expectedVersionWindow(),
            }),
            expect.objectContaining({ assigneeId: "assignee-2" }),
        );
    });

    it("allows only the creator to soft-delete", async () => {
        const assigned = harness({ scopedTodo: todo() });
        await expect(
            assigned.service.remove("assignee-1", "todo-1", NOW.toISOString()),
        ).rejects.toMatchObject({ httpStatus: 403 });

        const creator = harness({ scopedTodo: todo() });
        await creator.service.remove("creator-1", "todo-1", NOW.toISOString());
        expect(creator.repository.softDelete).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "todo-1",
                creatorId: "creator-1",
                updatedAt: expectedVersionWindow(),
            }),
        );
    });

    it("lets the current assignee complete and reopen atomically", async () => {
        const completed = harness({ scopedTodo: todo() });
        await completed.service.complete("assignee-1", "todo-1", NOW.toISOString());
        expect(completed.repository.update).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "todo-1",
                assigneeId: "assignee-1",
                updatedAt: expectedVersionWindow(),
            }),
            expect.objectContaining({
                progress: 100,
                status: "completed",
                completedAt: expect.any(Date),
            }),
        );

        const reopened = harness({
            scopedTodo: todo({ progress: 100, status: "completed", completedAt: NOW }),
        });
        await reopened.service.reopen("assignee-1", "todo-1", NOW.toISOString());
        expect(reopened.repository.update).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "todo-1",
                assigneeId: "assignee-1",
                updatedAt: expectedVersionWindow(),
            }),
            { progress: 99, status: "in_progress", completedAt: null },
        );
    });

    it("normalizes progress and rejects out-of-range or stale updates", async () => {
        const completed = harness({ scopedTodo: todo() });
        await completed.service.updateProgress("assignee-1", "todo-1", 100, NOW.toISOString());
        expect(completed.repository.update).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "todo-1",
                assigneeId: "assignee-1",
                updatedAt: expectedVersionWindow(),
            }),
            expect.objectContaining({ progress: 100, status: "completed" }),
        );

        const invalid = harness({ scopedTodo: todo() });
        await expect(
            invalid.service.updateProgress("assignee-1", "todo-1", 101, NOW.toISOString()),
        ).rejects.toMatchObject({ httpStatus: 400 });

        const stale = harness({ scopedTodo: todo() });
        stale.repository.update.mockResolvedValueOnce({ affected: 0 });
        await expect(
            stale.service.updateProgress("assignee-1", "todo-1", 50, NOW.toISOString()),
        ).rejects.toMatchObject({ httpStatus: 409 });
    });

    it("rejects disabled, deleted, or unknown assignment targets", async () => {
        const h = harness({ scopedTodo: todo() });
        h.userRepository.findOne.mockResolvedValueOnce(null);

        await expect(
            h.service.update("creator-1", "todo-1", {
                assigneeId: "disabled-user",
                expectedUpdatedAt: NOW.toISOString(),
            }),
        ).rejects.toMatchObject({ httpStatus: 400 });
        expect(h.repository.update).not.toHaveBeenCalled();
    });
});

describe("PersonalTodoService assignee directory", () => {
    it("searches active non-deleted users, always includes self, caps results, and returns minimal fields with departments", async () => {
        const h = harness();
        const directoryBuilder = queryBuilder();
        directoryBuilder.getMany = jest.fn().mockResolvedValue([
            {
                id: "user-2",
                username: "ann",
                realName: "Ann Lee",
                nickname: null,
                avatar: "/ann.png",
                email: "hidden@example.com",
                password: "hidden",
            },
        ]);
        h.userRepository.createQueryBuilder.mockReturnValue(directoryBuilder);
        h.userRepository.findOne.mockResolvedValueOnce({
            id: "user-1",
            username: "me",
            realName: null,
            nickname: "Myself",
            avatar: null,
        });
        h.departmentUserRepository.find.mockResolvedValueOnce([
            { userId: "user-2", departmentId: "department-1" },
        ]);
        h.departmentRepository.find.mockResolvedValueOnce([
            { id: "department-1", name: "Product" },
        ]);

        const result = await h.service.searchAssignees("user-1", "ann", 200);

        expect(directoryBuilder.where).toHaveBeenCalledWith("user.status = :activeStatus", {
            activeStatus: 1,
        });
        expect(directoryBuilder.select).toHaveBeenCalledWith([
            "user.id",
            "user.realName",
            "user.nickname",
            "user.username",
            "user.avatar",
        ]);
        expect(directoryBuilder.andWhere).toHaveBeenCalledWith("user.deletedAt IS NULL");
        expect(directoryBuilder.take).toHaveBeenCalledWith(50);
        expect(result).toEqual([
            {
                id: "user-1",
                displayName: "Myself",
                avatar: null,
                departments: [],
            },
            {
                id: "user-2",
                displayName: "Ann Lee",
                avatar: "/ann.png",
                departments: [{ id: "department-1", name: "Product" }],
            },
        ]);
        expect(result[1]).not.toHaveProperty("email");
        expect(result[1]).not.toHaveProperty("password");
    });
});
