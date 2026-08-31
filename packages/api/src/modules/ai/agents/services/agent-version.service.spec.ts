import { AgentVersionService } from "./agent-version.service";

const agent = (overrides: Record<string, unknown> = {}) => ({
    id: "agent-1",
    createBy: "user-1",
    tenantId: "tenant-1",
    projectId: "project-1",
    name: "Support",
    createMode: "direct",
    modelConfig: { id: "model-1" },
    datasetIds: ["dataset-1"],
    mcpServerIds: [],
    ...overrides,
});

function harness(agentOverrides: Record<string, unknown> = {}) {
    const versions: any[] = [];
    const releases: any[] = [];
    const approvals: any[] = [];
    const dependencies: any[] = [];
    const service = new AgentVersionService(
        {
            findOne: jest.fn(async ({ where }: any) => versions.find((v) => Object.entries(where).every(([k, val]) => v[k] === val)) ?? null),
            find: jest.fn(async ({ where, order }: any = {}) => {
                const result = versions.filter((v) => !where || Object.entries(where).every(([k, val]) => v[k] === val));
                return order?.versionNumber === "DESC" ? result.sort((a, b) => b.versionNumber - a.versionNumber) : result;
            }),
            create: jest.fn((v: any) => ({ id: `version-${versions.length + 1}`, createdAt: new Date(), ...v })),
            save: jest.fn(async (v: any) => { if (!versions.includes(v)) versions.push(v); return v; }),
        } as any,
        { findOne: jest.fn(async ({ where }: any) => releases.find((r) => Object.entries(where).every(([k, val]: [string, any]) => val?._type === "in" ? val._value.includes(r[k]) : r[k] === val)) ?? null), find: jest.fn(async () => releases), create: jest.fn((v: any) => ({ id: `release-${releases.length + 1}`, ...v })), save: jest.fn(async (v: any) => { if (!releases.includes(v)) releases.push(v); return v; }) } as any,
        { findOne: jest.fn(async ({ where }: any) => approvals.find((a) => Object.entries(where).every(([k, val]) => a[k] === val)) ?? null), find: jest.fn(async () => approvals), create: jest.fn((v: any) => ({ id: `approval-${approvals.length + 1}`, ...v })), save: jest.fn(async (v: any) => { approvals.push(v); return v; }) } as any,
        { find: jest.fn(async () => dependencies), create: jest.fn((v: any) => v), save: jest.fn(async (v: any) => { dependencies.push(...(Array.isArray(v) ? v : [v])); return v; }) } as any,
        { findOne: jest.fn(async () => agent(agentOverrides)) } as any,
    );
    return { service, versions, releases };
}

describe("AgentVersionService", () => {
    it("creates and reconciles an immutable v1 snapshot", async () => {
        const { service, versions } = harness();
        const first = await service.ensureV1Snapshot(agent() as any, { tenantId: "tenant-1", actorId: "user-1" });
        expect(first.versionNumber).toBe(1);
        expect(first.configHash).toHaveLength(64);
        const published = { ...first, status: "published" };
        versions[0] = published;
        const again = await service.ensureV1Snapshot(agent({ rolePrompt: "changed" }) as any, { tenantId: "tenant-1" });
        expect(again.configHash).toBe(first.configHash);
        expect(again.status).toBe("published");
    });

    it("requires approval evidence before production release and rejects stale revisions", async () => {
        const { service, releases } = harness();
        const version = await service.createDraft("agent-1", { modelConfig: { id: "m" } }, { tenantId: "tenant-1" });
        await service.submit(version.id, { tenantId: "tenant-1" });
        let productionError: unknown;
        try {
            await service.createRelease(version.id, { tenantId: "tenant-1", environment: "production" });
        } catch (error) {
            productionError = error;
        }
        expect((productionError as { message?: string })?.message).toBe("Version has not passed approval");
        const evaluated = await service.evaluateGate(version.id, { passed: true }, { tenantId: "tenant-1" });
        expect(evaluated.passed).toBe(true);
        const approvalRelease = await service.createRelease(version.id, { tenantId: "tenant-1", environment: "staging" });
        await service.approveRelease(approvalRelease.id, "security", { tenantId: "tenant-1", actorId: "approver-1" }, { passed: true });
        const release = await service.createRelease(version.id, { tenantId: "tenant-1", environment: "production", expectedRevision: 0, trafficPercent: 25, cohortId: "cohort-a" });
        expect(release.status).toBe("pending");
        await service.approveRelease(release.id, "production", { tenantId: "tenant-1", actorId: "approver-1" }, { passed: true });
        expect(release.status).toBe("canary");
        await expect(service.pause(release.id, { tenantId: "tenant-1", expectedRevision: 1 })).rejects.toThrow("changed");
    });

    it("builds a redacted management workspace and isolates marketplace review", async () => {
        const { service } = harness();
        const workspace = await service.getReleaseWorkspace("agent-1", { tenantId: "tenant-1", projectId: "project-1" });
        expect(workspace.contentReview.label).toBe("Marketplace content review");
        expect(workspace.environmentRelease.label).toBe("Tenant environment release");
    });

    it.each([
        ["approved and published", { publishedToSquare: true, squarePublishStatus: "approved" }, true],
        ["pending review", { publishedToSquare: false, squarePublishStatus: "pending" }, false],
        ["rejected", { publishedToSquare: false, squarePublishStatus: "rejected" }, false],
        ["withdrawn after approval", { publishedToSquare: false, squarePublishStatus: "approved" }, false],
    ])("recognizes marketplace availability only when %s", async (_label, state, expected) => {
        const { service } = harness(state as Record<string, unknown>);
        await expect(
            service.hasActiveProductionRelease("agent-1", {
                tenantId: "tenant-1",
                projectId: "project-1",
            }),
        ).resolves.toBe(false);
        await expect(
            service.hasApprovedMarketplacePublish("agent-1", {
                tenantId: "tenant-1",
                projectId: "project-1",
            }),
        ).resolves.toBe(expected);
    });

    it("returns a deterministic legacy shadow comparison", async () => {
        const { service } = harness();
        const result = await service.shadowCompare("agent-1", { tenantId: "tenant-1" });
        expect(result.legacyHash).toHaveLength(64);
        expect(result.resolvedHash).toHaveLength(64);
        expect(typeof result.matched).toBe("boolean");
    });

    it("keeps a failed evaluation blocked and preserves dependency snapshots", async () => {
        const { service } = harness();
        const version = await service.createDraft("agent-1", { modelConfig: { id: "m" }, datasetIds: ["d-1"] }, { tenantId: "tenant-1" });
        await service.submit(version.id, { tenantId: "tenant-1" });
        const blocked = await service.evaluateGate(version.id, { passed: false, reason: "regression" }, { tenantId: "tenant-1" });
        expect(blocked.passed).toBe(false);
        await expect(service.createRelease(version.id, { tenantId: "tenant-1", environment: "production" })).rejects.toThrow("approval");
        expect(version.dependencySnapshot.datasetIds).toEqual(["d-1"]);
    });
});
