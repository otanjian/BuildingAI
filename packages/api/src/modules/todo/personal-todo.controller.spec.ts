jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});
jest.mock("uuid", () => ({ validate: () => true }));
jest.mock("@buildingai/decorators", () => ({ Playground: () => () => undefined }));
jest.mock(
    "@common/decorators/controller.decorator",
    () => ({ WebController: () => (target: unknown) => target }),
    { virtual: true },
);

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import type { UserPlayground } from "@buildingai/db";

import { PersonalTodoWebController } from "./controllers/web/personal-todo.controller";
import {
    CreatePersonalTodoDto,
    QueryPersonalTodoDto,
    UpdatePersonalTodoDto,
} from "./dto";

const user = { id: "8cf23dc1-83eb-4895-a43c-d1e0f333714b" } as UserPlayground;
const todoId = "9664742d-bf41-41a5-a6be-8e576cba9a5b";
const version = "2026-08-22T08:00:00.000Z";

function harness() {
    const service = {
        complete: jest.fn().mockResolvedValue({ id: todoId, status: "completed" }),
        countAssignedInProgress: jest.fn().mockResolvedValue({ count: 2 }),
        create: jest.fn().mockResolvedValue({ id: todoId }),
        get: jest.fn().mockResolvedValue({ id: todoId }),
        list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
        remove: jest.fn().mockResolvedValue({ id: todoId }),
        reopen: jest.fn().mockResolvedValue({ id: todoId, status: "in_progress" }),
        searchAssignees: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({ id: todoId }),
        updateProgress: jest.fn().mockResolvedValue({ id: todoId, progress: 45 }),
    };
    return { controller: new PersonalTodoWebController(service as never), service };
}

describe("PersonalTodo DTO contracts", () => {
    it("accepts supported create fields and rejects forged creator input", async () => {
        const dto = plainToInstance(CreatePersonalTodoDto, {
            title: "Ship release",
            creatorId: "87947b48-52c4-487f-a4a1-09cb90a273d6",
            assigneeId: "bd7d8557-b366-4811-8497-7396471f9e99",
            plannedCompletionDate: "2026-08-31",
        });
        const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
        expect(errors.some((item) => item.property === "creatorId")).toBe(true);
    });

    it("rejects whitespace-only create and edit titles", async () => {
        const create = plainToInstance(CreatePersonalTodoDto, { title: "   " });
        const update = plainToInstance(UpdatePersonalTodoDto, {
            title: "\t",
            expectedUpdatedAt: version,
        });
        expect((await validate(create)).some((item) => item.property === "title")).toBe(true);
        expect((await validate(update)).some((item) => item.property === "title")).toBe(true);
    });

    it("validates tabs, progress bounds, UUID filters, and date-only values", async () => {
        const dto = plainToInstance(QueryPersonalTodoDto, {
            tab: "later",
            creatorId: "not-a-uuid",
            plannedDateFrom: "2026-08-01T10:00:00Z",
            progressMin: -1,
            progressMax: 101,
        });
        const errors = await validate(dto);
        expect(errors.map((item) => item.property)).toEqual(
            expect.arrayContaining([
                "tab",
                "creatorId",
                "plannedDateFrom",
                "progressMin",
                "progressMax",
            ]),
        );
    });

    it("requires an optimistic-concurrency version for edits", async () => {
        const missingVersion = plainToInstance(UpdatePersonalTodoDto, { title: "Changed" });
        const errors = await validate(missingVersion);
        expect(errors.some((item) => item.property === "expectedUpdatedAt")).toBe(true);
    });

    it("rejects calendar-impossible date-only values", async () => {
        const create = plainToInstance(CreatePersonalTodoDto, {
            title: "Invalid date",
            plannedCompletionDate: "2026-02-31",
        });
        const query = plainToInstance(QueryPersonalTodoDto, {
            plannedDateFrom: "2026-13-01",
        });
        await expect(validate(create)).resolves.not.toEqual([]);
        await expect(validate(query)).resolves.not.toEqual([]);
    });
});

describe("PersonalTodoWebController", () => {
    it("passes the authenticated user to list, detail, count, and directory operations", async () => {
        const h = harness();
        const query = { tab: "all", page: 1, pageSize: 15 } as QueryPersonalTodoDto;

        await h.controller.list(query, user);
        await h.controller.detail(todoId, user);
        await h.controller.count(user);
        await h.controller.assignees({ keyword: "ann", limit: 10 }, user);

        expect(h.service.list).toHaveBeenCalledWith(user.id, query);
        expect(h.service.get).toHaveBeenCalledWith(user.id, todoId);
        expect(h.service.countAssignedInProgress).toHaveBeenCalledWith(user.id);
        expect(h.service.searchAssignees).toHaveBeenCalledWith(user.id, "ann", 10);
    });

    it("delegates create, edit, lifecycle, and delete without accepting a caller-supplied user", async () => {
        const h = harness();
        const create = { title: "New todo" } as CreatePersonalTodoDto;
        const update = { title: "Changed", expectedUpdatedAt: version } as UpdatePersonalTodoDto;

        await h.controller.create(create, user);
        await h.controller.update(todoId, update, user);
        await h.controller.progress(todoId, { progress: 45, expectedUpdatedAt: version }, user);
        await h.controller.complete(todoId, { expectedUpdatedAt: version }, user);
        await h.controller.reopen(todoId, { expectedUpdatedAt: version }, user);
        await h.controller.remove(todoId, { expectedUpdatedAt: version }, user);

        expect(h.service.create).toHaveBeenCalledWith(user.id, create);
        expect(h.service.update).toHaveBeenCalledWith(user.id, todoId, update);
        expect(h.service.updateProgress).toHaveBeenCalledWith(user.id, todoId, 45, version);
        expect(h.service.complete).toHaveBeenCalledWith(user.id, todoId, version);
        expect(h.service.reopen).toHaveBeenCalledWith(user.id, todoId, version);
        expect(h.service.remove).toHaveBeenCalledWith(user.id, todoId, version);
    });
});
