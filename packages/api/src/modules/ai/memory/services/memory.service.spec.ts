jest.mock("callsites", () => ({ __esModule: true, default: () => [] }));

import { MemoryService } from "./memory.service";

describe("MemoryService user memory ownership", () => {
    const makeRepo = () => {
        const rows: any[] = [];
        const repo: any = {
            rows,
            create: (value: any) => ({
                id: crypto.randomUUID(),
                createdAt: new Date(),
                updatedAt: new Date(),
                ...value,
            }),
            save: async (value: any) => {
                rows.push(value);
                return value;
            },
            find: async ({ where }: any) =>
                rows.filter((r) => Object.entries(where).every(([k, v]) => r[k] === v)),
            findOne: async ({ where }: any) =>
                rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null,
            createQueryBuilder: () => {
                const state: any = { sets: {}, predicates: [] };
                const qb: any = {
                    where: (_sql: string, params?: any) => {
                        if (params) state.predicates.push(params);
                        return qb;
                    },
                    andWhere: (_sql: string, params?: any) => {
                        if (params) state.predicates.push(params);
                        return qb;
                    },
                    set: (sets: any) => {
                        state.sets = sets;
                        return qb;
                    },
                    update: () => qb,
                    execute: async () => {
                        rows.forEach((row) => {
                            const matches = state.predicates.every((params: any) =>
                                Object.entries(params).every(([k, v]) => row[k] === v),
                            );
                            if (matches) Object.assign(row, state.sets);
                        });
                        return { affected: rows.length };
                    },
                    getOne: async () => {
                        const params = state.predicates.reduce(
                            (acc: any, value: any) => ({ ...acc, ...(value ?? {}) }),
                            {},
                        );
                        return (
                            rows.find(
                                (row) =>
                                    row.userId === params.userId &&
                                    row.isActive === true &&
                                    row.content.trim().toLowerCase() === params.normalized,
                            ) ?? null
                        );
                    },
                };
                return qb;
            },
        };
        return repo;
    };

    it("creates, updates, and clears only the authenticated user's memories", async () => {
        const repo = makeRepo();
        const service = new MemoryService(repo, {} as any);
        const own = await service.createUserMemory({
            userId: "u1",
            content: " Uses TypeScript ",
            category: "preference",
        });
        await service.createUserMemory({
            userId: "u2",
            content: "Uses TypeScript",
            category: "preference",
        });
        expect((await service.getUserMemories("u1")).map((m) => m.content)).toEqual([
            "Uses TypeScript",
        ]);
        await service.updateUserMemory(own.id, "u2", { content: "changed" });
        expect((await service.findUserMemoryById(own.id, "u1"))?.content).toBe("Uses TypeScript");
        await service.updateUserMemory(own.id, "u1", { content: "updated" });
        expect((await service.findUserMemoryById(own.id, "u1"))?.content).toBe("updated");
        await service.deactivateAllUserMemories("u1");
        expect(await service.getUserMemories("u1")).toHaveLength(0);
        expect(await service.getUserMemories("u2")).toHaveLength(1);
    });

    it("rejects empty content, deactivates one record, and deduplicates submissions", async () => {
        const repo = makeRepo();
        const service = new MemoryService(repo, {} as any);
        await expect(
            service.createUserMemory({ userId: "u1", content: "   ", category: "preference" }),
        ).rejects.toThrow();
        const first = await service.createUserMemory({
            userId: "u1",
            content: "same",
            category: "preference",
        });
        const duplicate = await service.createUserMemory({
            userId: "u1",
            content: " same ",
            category: "preference",
        });
        expect(duplicate.id).toBe(first.id);
        await service.deactivateUserMemory(first.id, "u2");
        expect(await service.findUserMemoryById(first.id, "u1")).not.toBeNull();
        await service.deactivateUserMemory(first.id, "u1");
        expect(await service.findUserMemoryById(first.id, "u1")).toBeNull();
    });

    it("only exposes owned, public, or assigned agents", async () => {
        const agents = [
            {
                id: "owned",
                name: "Owned",
                createBy: "u1",
                publishedToSquare: false,
                squarePublishStatus: "none",
                squareVisibility: "assigned",
            },
            {
                id: "public",
                name: "Public",
                createBy: "u2",
                publishedToSquare: true,
                squarePublishStatus: "approved",
                squareVisibility: "all",
            },
            {
                id: "assigned",
                name: "Assigned",
                createBy: "u2",
                publishedToSquare: true,
                squarePublishStatus: "approved",
                squareVisibility: "assigned",
            },
            {
                id: "private",
                name: "Private",
                createBy: "u2",
                publishedToSquare: false,
                squarePublishStatus: "none",
                squareVisibility: "assigned",
            },
        ];
        const agentRepo: any = { find: async () => agents };
        const assignmentRepo: any = { find: async () => [{ agentId: "assigned", userId: "u1" }] };
        const service = new MemoryService({} as any, {} as any, agentRepo, assignmentRepo);
        await expect(service.listAccessibleAgents({ id: "u1", isRoot: 0 } as any)).resolves.toEqual(
            expect.arrayContaining([
                { id: "assigned", name: "Assigned" },
                { id: "owned", name: "Owned" },
                { id: "public", name: "Public" },
            ]),
        );
        await expect(
            service.listAccessibleAgents({ id: "root", isRoot: 1 } as any),
        ).resolves.toHaveLength(4);
    });
});
