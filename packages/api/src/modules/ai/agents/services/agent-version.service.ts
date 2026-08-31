import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import {
    Agent,
    AiAgentDependencyLock,
    AiAgentRelease,
    AiAgentReleaseApproval,
    AiAgentVersion,
    AGENT_RELEASE_ENVIRONMENTS,
    AGENT_VERSION_STATUSES,
    SquarePublishStatus,
} from "@buildingai/db/entities";
import type { AgentReleaseEnvironment } from "@buildingai/db/entities/ai-agent-release.entity";
import { In, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable, Logger, Optional } from "@nestjs/common";
import { AuditGovernanceService } from "@modules/audit/services/audit-governance.service";

import {
    buildAgentVersionDiff,
    createAgentVersionSnapshot,
    hashAgentVersionSnapshot,
    redactAgentVersionSnapshot,
} from "../utils/agent-version-snapshot";

export interface AgentVersionScope {
    tenantId?: string | null;
    projectId?: string | null;
    actorId?: string | null;
}

export interface ReleaseMutationOptions extends AgentVersionScope {
    environment?: AgentReleaseEnvironment;
    expectedRevision?: number;
    idempotencyKey?: string;
    cohortId?: string | null;
    trafficPercent?: number;
}

/**
 * Version/release state machine. Versions are immutable after submission;
 * releases are the mutable traffic pointers used for promotion and rollback.
 */
@Injectable()
export class AgentVersionService extends BaseService<AiAgentVersion> {
    protected readonly logger = new Logger(AgentVersionService.name);

    constructor(
        @InjectRepository(AiAgentVersion)
        private readonly versionRepository: Repository<AiAgentVersion>,
        @InjectRepository(AiAgentRelease)
        private readonly releaseRepository: Repository<AiAgentRelease>,
        @InjectRepository(AiAgentReleaseApproval)
        private readonly approvalRepository: Repository<AiAgentReleaseApproval>,
        @InjectRepository(AiAgentDependencyLock)
        private readonly dependencyRepository: Repository<AiAgentDependencyLock>,
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        @Optional() private readonly auditGovernance?: AuditGovernanceService,
    ) {
        super(versionRepository);
    }

    private scopeWhere(agentId: string, scope: AgentVersionScope) {
        return {
            agentId,
            ...(scope.tenantId !== undefined ? { tenantId: scope.tenantId } : {}),
            ...(scope.projectId !== undefined ? { projectId: scope.projectId } : {}),
        };
    }

    private snapshotConfig(agent: Agent): Record<string, unknown> {
        // Keep runtime-compatible configuration while excluding persistence metadata.
        const raw = agent as unknown as Record<string, unknown>;
        return {
            name: raw.name,
            description: raw.description,
            createMode: raw.createMode,
            rolePrompt: raw.rolePrompt,
            modelConfig: raw.modelConfig,
            modelRouting: raw.modelRouting,
            contextConfig: raw.contextConfig,
            voiceConfig: raw.voiceConfig,
            toolConfig: raw.toolConfig,
            memoryConfig: raw.memoryConfig,
            annotationConfig: raw.annotationConfig,
            showContext: raw.showContext,
            showReference: raw.showReference,
            enableWebSearch: raw.enableWebSearch,
            enableFileUpload: raw.enableFileUpload,
            autoQuestions: raw.autoQuestions,
            openingStatement: raw.openingStatement,
            openingQuestions: raw.openingQuestions,
            quickCommands: raw.quickCommands,
            formFields: raw.formFields,
            formFieldsInputs: raw.formFieldsInputs,
            datasetIds: raw.datasetIds,
            mcpServerIds: raw.mcpServerIds,
            thirdPartyIntegration: raw.thirdPartyIntegration,
            publishConfig: raw.publishConfig,
            maxSteps: raw.maxSteps,
        };
    }

    async ensureV1Snapshot(agent: Agent, scope: AgentVersionScope = {}): Promise<AiAgentVersion> {
        const config = this.snapshotConfig(agent);
        const snapshot = createAgentVersionSnapshot(config, {
            createdBy: scope.actorId ?? agent.createBy,
            source: "legacy-reconcile",
            releaseNote: "Compatibility snapshot generated from legacy Agent configuration",
        });
        let version = await this.versionRepository.findOne({
            where: { ...this.scopeWhere(agent.id, scope), versionNumber: 1 },
        });
        if (!version) {
            version = this.versionRepository.create({
                agentId: agent.id,
                tenantId: scope.tenantId ?? agent.tenantId ?? null,
                projectId: scope.projectId ?? agent.projectId ?? null,
                versionNumber: 1,
                label: "v1",
                status: "draft",
                snapshot: snapshot.snapshot,
                configHash: snapshot.configHash,
                dependencySnapshot: this.dependencySnapshot(config),
                createdBy: scope.actorId ?? agent.createBy,
                releaseNote: snapshot.provenance.releaseNote ?? null,
                baseVersionId: null,
                submittedAt: null,
                approvedAt: null,
                publishedAt: null,
            });
            return this.versionRepository.save(version);
        }
        // Existing submitted/approved/published versions are immutable. A draft may be
        // reconciled when a legacy Agent was edited before migration was enabled.
        if (version.status === "draft" && version.configHash !== snapshot.configHash) {
            version.snapshot = snapshot.snapshot;
            version.configHash = snapshot.configHash;
            version.dependencySnapshot = this.dependencySnapshot(config);
            version.updatedAt = new Date();
            return this.versionRepository.save(version);
        }
        return version;
    }

    async reconcileLegacySnapshots(scope: AgentVersionScope = {}): Promise<{ created: number; reconciled: number }> {
        const where = scope.tenantId === undefined ? undefined : { tenantId: scope.tenantId };
        const agents = await this.agentRepository.find({ where });
        let created = 0;
        let reconciled = 0;
        for (const agent of agents) {
            const before = await this.versionRepository.findOne({
                where: { ...this.scopeWhere(agent.id, scope), versionNumber: 1 },
                select: ["id", "configHash", "status"],
            });
            await this.ensureV1Snapshot(agent, scope);
            if (!before) created += 1;
            else reconciled += 1;
        }
        return { created, reconciled };
    }

    async createDraft(agentId: string, config: Record<string, unknown>, scope: AgentVersionScope = {}, releaseNote?: string) {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("Agent not found");
        const existing = await this.versionRepository.find({
            where: this.scopeWhere(agentId, scope),
            order: { versionNumber: "DESC" },
            take: 1,
        });
        const versionNumber = (existing[0]?.versionNumber ?? 0) + 1;
        const snapshot = createAgentVersionSnapshot(config, {
            createdBy: scope.actorId ?? agent.createBy,
            source: "draft",
            releaseNote,
        });
        const version = this.versionRepository.create({
            agentId,
            tenantId: scope.tenantId ?? agent.tenantId ?? null,
            projectId: scope.projectId ?? agent.projectId ?? null,
            versionNumber,
            label: `v${versionNumber}`,
            status: "draft",
            snapshot: snapshot.snapshot,
            configHash: snapshot.configHash,
            dependencySnapshot: this.dependencySnapshot(snapshot.snapshot),
            createdBy: scope.actorId ?? agent.createBy,
            releaseNote: releaseNote ?? null,
            baseVersionId: existing[0]?.id ?? null,
            submittedAt: null,
            approvedAt: null,
            publishedAt: null,
        });
        const saved = await this.versionRepository.save(version);
        await this.persistDependencyLocks(saved);
        await this.audit("agent.version.draft_created", saved, scope, {
            configHash: saved.configHash,
            dependencySnapshot: saved.dependencySnapshot,
        });
        return saved;
    }

    async createDraftFromLegacyUpdate(agent: Agent, update: Record<string, unknown>, scope: AgentVersionScope = {}) {
        return this.createDraft(agent.id, { ...this.snapshotConfig(agent), ...update }, scope, "Draft created from legacy Agent update");
    }

    async listVersions(agentId: string, scope: AgentVersionScope = {}) {
        return this.versionRepository.find({
            where: this.scopeWhere(agentId, scope),
            order: { versionNumber: "DESC" },
        });
    }

    async listReleases(agentId: string, scope: AgentVersionScope = {}) {
        return this.releaseRepository.find({
            where: { agentId, ...(scope.tenantId !== undefined ? { tenantId: scope.tenantId } : {}), ...(scope.projectId !== undefined ? { projectId: scope.projectId } : {}) },
            order: { createdAt: "DESC" },
        });
    }

    /** Management workspace response. Marketplace review never implies runtime release. */
    async getReleaseWorkspace(agentId: string, scope: AgentVersionScope = {}) {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("Agent not found");
        this.assertScope(agent.tenantId, agent.projectId, scope);
        const [versions, releases] = await Promise.all([
            this.listVersions(agentId, scope),
            this.listReleases(agentId, scope),
        ]);
        const versionIds = versions.map((version) => version.id);
        const releaseIds = releases.map((release) => release.id);
        const [dependencies, approvals] = await Promise.all([
            versionIds.length ? this.dependencyRepository.find({ where: { versionId: In(versionIds) } }) : [],
            releaseIds.length ? this.approvalRepository.find({ where: { releaseId: In(releaseIds) } }) : [],
        ]);
        const activeRelease = releases.find((release) => release.environment === "production" && ["active", "canary"].includes(release.status)) ?? null;
        return {
            versions: versions.map((version) => ({
                ...version,
                snapshot: redactAgentVersionSnapshot(version.snapshot),
                diff: buildAgentVersionDiff(
                    versions.find((candidate) => candidate.id === version.baseVersionId)?.snapshot ?? {},
                    version.snapshot,
                ),
                dependencies: dependencies.filter((dependency) => dependency.versionId === version.id),
            })),
            releases: releases.map((release) => ({
                ...release,
                approvals: approvals.filter((approval) => approval.releaseId === release.id),
            })),
            contentReview: {
                status: agent.squarePublishStatus,
                reviewedBy: agent.squareReviewedBy ?? null,
                reviewedAt: agent.squareReviewedAt ?? null,
                rejectReason: agent.squareRejectReason ?? null,
                label: "Marketplace content review",
            },
            environmentRelease: {
                status: activeRelease?.status ?? "not_released",
                environment: "production",
                activeVersionId: activeRelease?.versionId ?? null,
                revision: activeRelease?.revision ?? null,
                label: "Tenant environment release",
            },
        };
    }

    private dependencySnapshot(config: Record<string, unknown>): Record<string, unknown> {
        return {
            modelId: (config.modelConfig as Record<string, unknown> | undefined)?.id ?? null,
            datasetIds: Array.isArray(config.datasetIds) ? config.datasetIds : [],
            mcpServerIds: Array.isArray(config.mcpServerIds) ? config.mcpServerIds : [],
        };
    }

    private async persistDependencyLocks(version: AiAgentVersion): Promise<void> {
        const entries: Array<[string, string]> = [];
        const snapshot = version.dependencySnapshot;
        if (typeof snapshot.modelId === "string" && snapshot.modelId) entries.push(["model", snapshot.modelId]);
        for (const id of Array.isArray(snapshot.datasetIds) ? snapshot.datasetIds : []) {
            if (typeof id === "string") entries.push(["dataset", id]);
        }
        for (const id of Array.isArray(snapshot.mcpServerIds) ? snapshot.mcpServerIds : []) {
            if (typeof id === "string") entries.push(["mcp_server", id]);
        }
        if (!entries.length) return;
        const locks = entries.map(([dependencyType, dependencyId]) => this.dependencyRepository.create({
            versionId: version.id,
            tenantId: version.tenantId,
            dependencyType,
            dependencyId,
            dependencyVersion: null,
            dependencyHash: hashAgentVersionSnapshot({ dependencyType, dependencyId }),
            metadata: {},
        }));
        await this.dependencyRepository.save(locks);
    }

    async submit(versionId: string, scope: AgentVersionScope = {}): Promise<AiAgentVersion> {
        const version = await this.getVersion(versionId, scope);
        if (version.status !== "draft") throw HttpErrorFactory.conflict("Only draft versions can be submitted");
        version.status = "submitted";
        version.submittedAt = new Date();
        const saved = await this.versionRepository.save(version);
        await this.audit("agent.version.submitted", saved, scope, { configHash: saved.configHash });
        return saved;
    }

    async evaluateGate(versionId: string, evidence: Record<string, unknown>, scope: AgentVersionScope = {}) {
        const version = await this.getVersion(versionId, scope);
        if (version.status !== "submitted" && version.status !== "approved") {
            throw HttpErrorFactory.conflict("Version must be submitted before evaluation");
        }
        const passed = evidence.passed === true;
        if (!passed) {
            await this.audit("agent.version.evaluation_blocked", version, scope, { evidence });
            return { passed: false, version };
        }
        version.status = "approved";
        version.approvedAt = new Date();
        version.dependencySnapshot = { ...version.dependencySnapshot, evaluation: evidence };
        const saved = await this.versionRepository.save(version);
        await this.audit("agent.version.evaluation_passed", saved, scope, { evidence });
        return { passed: true, version: saved };
    }

    async createRelease(versionId: string, options: ReleaseMutationOptions = {}): Promise<AiAgentRelease> {
        const version = await this.getVersion(versionId, options);
        // A version may be promoted through multiple environments. Once its
        // immutable snapshot has passed evaluation, a staging release marks it
        // published; that must not prevent the separately gated production
        // promotion from using the same snapshot.
        if (version.status !== "approved" && version.status !== "published") {
            throw HttpErrorFactory.conflict("Version has not passed approval");
        }
        if (options.environment === "production") {
            const existingApproval = await this.approvalRepository.findOne({ where: { versionId: version.id, status: "approved" } });
            if (!existingApproval) throw HttpErrorFactory.conflict("Production release requires an approved release gate");
        }
        const environment = options.environment ?? "development";
        if (!AGENT_RELEASE_ENVIRONMENTS.includes(environment)) throw HttpErrorFactory.badRequest("Invalid release environment");
        const existing = options.idempotencyKey
            ? await this.releaseRepository.findOne({ where: { tenantId: options.tenantId ?? version.tenantId, idempotencyKey: options.idempotencyKey } })
            : null;
        if (existing) return existing;
        const active = await this.releaseRepository.findOne({
            where: { agentId: version.agentId, tenantId: options.tenantId ?? version.tenantId, projectId: options.projectId ?? version.projectId, environment, status: In(["active", "canary", "paused"]) },
            order: { revision: "DESC" },
        });
        const revision = active ? active.revision + 1 : 0;
        if (options.expectedRevision !== undefined && active && active.revision !== options.expectedRevision) {
            throw HttpErrorFactory.conflict("Release changed; refresh before publishing");
        }
        const release = this.releaseRepository.create({
            agentId: version.agentId,
            versionId: version.id,
            tenantId: options.tenantId ?? version.tenantId,
            projectId: options.projectId ?? version.projectId,
            environment,
            status: environment === "production" ? "pending" : options.trafficPercent && options.trafficPercent < 100 ? "canary" : "active",
            revision,
            cohortId: options.cohortId ?? null,
            trafficPercent: options.trafficPercent ?? 100,
            rollbackTargetVersionId: active?.versionId ?? null,
            publishedBy: options.actorId ?? null,
            releaseNote: version.releaseNote,
            evaluationEvidence: (version.dependencySnapshot.evaluation as Record<string, unknown>) ?? {},
            idempotencyKey: options.idempotencyKey ?? null,
        });
        version.status = "published";
        version.publishedAt = new Date();
        await this.versionRepository.save(version);
        if (active) {
            active.status = "paused";
            await this.releaseRepository.save(active);
        }
        const saved = await this.releaseRepository.save(release);
        await this.audit("agent.release.published", version, options, {
            releaseId: saved.id,
            environment: saved.environment,
            cohortId: saved.cohortId,
            trafficPercent: saved.trafficPercent,
            revision: saved.revision,
            configHash: version.configHash,
            evaluationEvidence: saved.evaluationEvidence,
        });
        return saved;
    }

    async approveRelease(releaseId: string, gateName: string, scope: AgentVersionScope = {}, evidence: Record<string, unknown> = {}) {
        const release = await this.releaseRepository.findOne({ where: { id: releaseId } });
        if (!release) throw HttpErrorFactory.notFound("Release not found");
        this.assertScope(release.tenantId, release.projectId, scope);
        const approval = this.approvalRepository.create({
            releaseId,
            versionId: release.versionId,
            tenantId: release.tenantId,
            gateName,
            status: "approved",
            decidedBy: scope.actorId ?? null,
            decidedAt: new Date(),
            evidence,
            reason: null,
        });
        const saved = await this.approvalRepository.save(approval);
        if (release.environment === "production" && release.status === "pending") {
            release.status = release.trafficPercent < 100 ? "canary" : "active";
            await this.releaseRepository.save(release);
        }
        const version = await this.getVersion(release.versionId, scope);
        await this.audit("agent.release.approved", version, scope, {
            releaseId,
            gateName,
            approverId: scope.actorId ?? null,
            evidence,
        });
        return saved;
    }

    async rollback(releaseId: string, options: ReleaseMutationOptions = {}) {
        const release = await this.releaseRepository.findOne({ where: { id: releaseId } });
        if (!release) throw HttpErrorFactory.notFound("Release not found");
        this.assertScope(release.tenantId, release.projectId, options);
        if (options.idempotencyKey) {
            const duplicate = await this.releaseRepository.findOne({ where: { tenantId: release.tenantId, idempotencyKey: options.idempotencyKey } });
            if (duplicate) return duplicate;
        }
        if (options.expectedRevision !== undefined && release.revision !== options.expectedRevision) {
            throw HttpErrorFactory.conflict("Release changed; refresh before rolling back");
        }
        if (!release.rollbackTargetVersionId) throw HttpErrorFactory.conflict("No rollback target recorded");
        release.status = "rolled_back";
        release.revision += 1;
        release.idempotencyKey = options.idempotencyKey ?? release.idempotencyKey;
        const saved = await this.releaseRepository.save(release);
        const target = await this.getVersion(release.rollbackTargetVersionId, options);
        target.status = "published";
        target.publishedAt = target.publishedAt ?? new Date();
        await this.versionRepository.save(target);
        await this.audit("agent.release.rolled_back", target, options, {
            releaseId: release.id,
            rollbackTargetVersionId: target.id,
            revision: saved.revision,
            cohortId: release.cohortId,
        });
        return saved;
    }

    async pause(releaseId: string, options: ReleaseMutationOptions = {}) {
        const release = await this.releaseRepository.findOne({ where: { id: releaseId } });
        if (!release) throw HttpErrorFactory.notFound("Release not found");
        this.assertScope(release.tenantId, release.projectId, options);
        if (options.expectedRevision !== undefined && release.revision !== options.expectedRevision) {
            throw HttpErrorFactory.conflict("Release changed; refresh before pausing");
        }
        release.status = "paused";
        release.revision += 1;
        return this.releaseRepository.save(release);
    }

    async archive(versionId: string, scope: AgentVersionScope = {}) {
        const version = await this.getVersion(versionId, scope);
        if (version.status === "published") throw HttpErrorFactory.conflict("Published versions cannot be archived");
        version.status = "archived";
        return this.versionRepository.save(version);
    }

    async getVersion(versionId: string, scope: AgentVersionScope = {}) {
        const version = await this.versionRepository.findOne({ where: { id: versionId } });
        if (!version) throw HttpErrorFactory.notFound("Agent version not found");
        this.assertScope(version.tenantId, version.projectId, scope);
        return version;
    }

    async resolve(agentId: string, scope: AgentVersionScope & { environment?: AgentReleaseEnvironment } = {}) {
        const environment = scope.environment ?? "production";
        const release = await this.releaseRepository.findOne({
            where: { agentId, tenantId: scope.tenantId, projectId: scope.projectId, environment, status: In(["active", "canary"]) },
            order: { revision: "DESC" },
        });
        if (release) return this.getVersion(release.versionId, scope);
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("Agent not found");
        return this.ensureV1Snapshot(agent, scope);
    }

    async hasActiveProductionRelease(agentId: string, scope: AgentVersionScope = {}) {
        return Boolean(await this.releaseRepository.findOne({ where: { agentId, tenantId: scope.tenantId, projectId: scope.projectId, environment: "production", status: In(["active", "canary"]) } }));
    }

    async hasApprovedMarketplacePublish(agentId: string, scope: AgentVersionScope = {}) {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) return false;
        this.assertScope(agent.tenantId, agent.projectId, scope);
        return agent.publishedToSquare === true && agent.squarePublishStatus === SquarePublishStatus.APPROVED;
    }

    /** Compare legacy configuration with version resolution without changing traffic. */
    async shadowCompare(agentId: string, scope: AgentVersionScope = {}) {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("Agent not found");
        this.assertScope(agent.tenantId, agent.projectId, scope);
        const legacySnapshot = createAgentVersionSnapshot(this.snapshotConfig(agent), {
            createdBy: scope.actorId ?? agent.createBy,
            source: "legacy-shadow",
        });
        const resolved = await this.resolve(agentId, { ...scope, environment: "production" });
        const diff = buildAgentVersionDiff(legacySnapshot.snapshot, resolved.snapshot);
        return {
            agentId,
            agentType: agent.createMode,
            legacyHash: legacySnapshot.configHash,
            resolvedVersionId: resolved.id,
            resolvedHash: resolved.configHash,
            matched: diff.length === 0,
            diff,
        };
    }

    private async audit(action: string, version: AiAgentVersion, scope: AgentVersionScope, payload: Record<string, unknown>) {
        if (!this.auditGovernance || !version.tenantId) return;
        await this.auditGovernance.recordAudit({
            tenantId: version.tenantId,
            projectId: version.projectId,
            actorId: scope.actorId ?? null,
            agentId: version.agentId,
            agentVersionId: version.id,
            action,
            outcome: action.endsWith("blocked") ? "denied" : "changed",
            resourceType: "agent_version",
            resourceId: version.id,
            metadata: { configHash: version.configHash },
            payload,
        });
    }

    private assertScope(tenantId: string | null, projectId: string | null, scope: AgentVersionScope) {
        if (scope.tenantId !== undefined && tenantId !== scope.tenantId) throw HttpErrorFactory.forbidden("Tenant scope mismatch");
        if (scope.projectId !== undefined && projectId && projectId !== scope.projectId) throw HttpErrorFactory.forbidden("Project scope mismatch");
    }
}
