import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import {
    Organization,
    Project,
    ResourceGrant,
    type ResourceGrantAction,
    Tenant,
    TenantAuditEvent,
    TenantMembership,
    TenantRole,
    User,
} from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { isEnabled } from "@buildingai/utils";
import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";

import {
    CreateTenantDto,
    InviteTenantMemberDto,
    QueryTenantListDto,
    UpdateTenantMembershipDto,
} from "../dto/tenant.dto";
import { isMembershipActive } from "./tenant-context";
import { TenantContextService } from "./tenant-context.service";

const ROLE_PERMISSIONS: Record<string, string[]> = {
    owner: ["*"],
    admin: [
        "tenant:read",
        "tenant:manage",
        "resource:read",
        "resource:create",
        "resource:update",
        "resource:delete",
        "resource:execute",
        "resource:export",
    ],
    editor: [
        "tenant:read",
        "resource:read",
        "resource:create",
        "resource:update",
        "resource:execute",
    ],
    member: ["tenant:read", "resource:read", "resource:execute"],
    viewer: ["tenant:read", "resource:read"],
};

@Injectable()
export class TenantService {
    constructor(
        @InjectRepository(Tenant) private readonly tenantRepository: Repository<Tenant>,
        @InjectRepository(Organization)
        private readonly organizationRepository: Repository<Organization>,
        @InjectRepository(Project) private readonly projectRepository: Repository<Project>,
        @InjectRepository(TenantRole) private readonly roleRepository: Repository<TenantRole>,
        @InjectRepository(TenantMembership)
        private readonly membershipRepository: Repository<TenantMembership>,
        @InjectRepository(ResourceGrant)
        private readonly grantRepository: Repository<ResourceGrant>,
        @InjectRepository(TenantAuditEvent)
        private readonly auditRepository: Repository<TenantAuditEvent>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly tenantContextService: TenantContextService,
    ) {}

    async listForUser(userId: string, isRoot: boolean): Promise<Tenant[]> {
        return this.tenantContextService.listForUser(userId, isEnabled(isRoot));
    }

    /**
     * Return the lifecycle list consumed by the platform tenant administration
     * page. The context list above intentionally remains an array because it
     * is also used by tenant switchers and request guards.
     */
    async listLifecycle(userId: string, isRoot: boolean, query: QueryTenantListDto = {}) {
        const page = Math.max(query.page ?? 1, 1);
        const pageSize = Math.min(Math.max(query.pageSize ?? 15, 1), 100);
        const root = isRoot === true || isEnabled(isRoot);
        const source = root
            ? await this.tenantRepository.find({ order: { createdAt: "DESC" } })
            : await this.listForUser(userId, false);
        const keyword = query.keyword?.trim().toLocaleLowerCase();
        const filtered = source.filter((tenant) => {
            if (!query.status && tenant.status === "archived") return false;
            if (query.status && tenant.status !== query.status) return false;
            if (!keyword) return true;
            return (
                tenant.code.toLocaleLowerCase().includes(keyword) ||
                tenant.name.toLocaleLowerCase().includes(keyword)
            );
        });
        const total = filtered.length;
        const selected = filtered.slice((page - 1) * pageSize, page * pageSize);
        const items = await Promise.all(
            selected.map(async (tenant) => {
                const memberCount =
                    typeof (this.membershipRepository as any).count === "function"
                        ? await (this.membershipRepository as any).count({
                              where: { tenantId: tenant.id, status: "active" },
                          })
                        : (
                              await this.membershipRepository.find({
                                  where: { tenantId: tenant.id, status: "active" },
                              })
                          ).length;
                return {
                    ...tenant,
                    isAdministrator:
                        root ||
                        (tenant as Tenant & { adminUserId?: string | null }).adminUserId ===
                            userId ||
                        tenant.ownerId === userId,
                    memberCount,
                    openingDate: tenant.createdAt ?? null,
                };
            }),
        );
        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }

    /** Create an active tenant and its single administrator atomically. */
    async createTenant(actorId: string, isRoot: boolean, dto: CreateTenantDto) {
        if (!isEnabled(isRoot))
            throw HttpErrorFactory.forbidden("Only platform administrators can create tenants");
        const name = dto.name?.trim();
        const code = dto.code?.trim();
        if (!name || !code) throw HttpErrorFactory.badRequest("Tenant name and code are required");
        const duplicate = await this.tenantRepository.findOne({ where: { code } });
        if (duplicate) throw HttpErrorFactory.badRequest("Tenant code already exists");
        if (dto.adminUserId && dto.username)
            throw HttpErrorFactory.badRequest(
                "Choose an existing administrator or create a new one",
            );
        if (!dto.adminUserId && (!dto.username || !dto.password)) {
            throw HttpErrorFactory.badRequest(
                "An existing administrator or username and password are required",
            );
        }

        const manager: any = this.userRepository.manager ?? {};
        const run = async (transactionManager: any) => {
            const tenantRepository =
                transactionManager.getRepository?.(Tenant) ?? this.tenantRepository;
            const userRepository = transactionManager.getRepository?.(User) ?? this.userRepository;
            const membershipRepository =
                transactionManager.getRepository?.(TenantMembership) ?? this.membershipRepository;
            const auditRepository =
                transactionManager.getRepository?.(TenantAuditEvent) ?? this.auditRepository;
            let administrator: User | null = null;
            if (dto.adminUserId) {
                administrator = await userRepository.findOne({ where: { id: dto.adminUserId } });
                if (!administrator) throw HttpErrorFactory.notFound("Administrator user not found");
                if (administrator.status !== undefined && administrator.status !== 1) {
                    throw HttpErrorFactory.badRequest("Administrator user is disabled");
                }
            } else {
                const existingUsername = await userRepository.findOne({
                    where: { username: dto.username },
                });
                if (existingUsername) throw HttpErrorFactory.badRequest("Username already exists");
                administrator = await userRepository.save(
                    userRepository.create({
                        username: dto.username,
                        email: dto.email ?? null,
                        password: await bcrypt.hash(dto.password!, 10),
                        nickname: dto.nickname ?? dto.username,
                        realName: dto.realName ?? null,
                        phone: dto.phone ?? null,
                        phoneAreaCode: null,
                        avatar: dto.avatar ?? null,
                        status: 1,
                        manageStatus: 1,
                        isRoot: 0,
                        source: 0,
                        role: null,
                        userNo: null,
                    }),
                );
            }
            const tenant = await tenantRepository.save(
                tenantRepository.create({
                    name,
                    code,
                    status: "active",
                    ownerId: administrator.id,
                    adminUserId: administrator.id,
                    defaultRegion: "default",
                    planCode: null,
                    policyVersion: 1,
                    suspendedAt: null,
                    suspendedBy: null,
                    suspensionReason: null,
                }),
            );
            const membership = await membershipRepository.save(
                membershipRepository.create({
                    tenantId: tenant.id,
                    userId: administrator.id,
                    invitationEmail: administrator.email ?? null,
                    roleCode: "admin",
                    status: "active",
                    invitedAt: new Date(),
                    acceptedAt: new Date(),
                    expiresAt: null,
                    createdBy: actorId,
                    updatedBy: actorId,
                    organizationId: null,
                    projectId: null,
                    attributes: {},
                }),
            );
            await auditRepository.save(
                auditRepository.create({
                    tenantId: tenant.id,
                    actorId,
                    action: "tenant.create",
                    outcome: "changed",
                    resourceType: "tenant",
                    resourceId: tenant.id,
                    metadata: {
                        code,
                        administratorId: administrator.id,
                        membershipId: membership.id,
                    },
                }),
            );
            return tenant;
        };
        try {
            return typeof manager.transaction === "function"
                ? await manager.transaction(run)
                : await run(manager);
        } catch (error) {
            // Preserve actionable domain errors; normalize database uniqueness
            // errors so callers receive the same duplicate-code/username UX.
            if (error && typeof error === "object" && "httpStatus" in error) throw error;
            const message = String((error as any)?.message ?? "");
            if (/duplicate|unique/i.test(message))
                throw HttpErrorFactory.badRequest(
                    "Tenant code or administrator username already exists",
                );
            throw error;
        }
    }

    async updateTenantStatus(
        actorId: string,
        isRoot: boolean,
        tenantId: string,
        status: "active" | "suspended",
    ) {
        if (!isEnabled(isRoot))
            throw HttpErrorFactory.forbidden(
                "Only platform administrators can update tenant status",
            );
        const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
        if (!tenant || tenant.status === "archived")
            throw HttpErrorFactory.notFound("Tenant not found");
        tenant.status = status;
        tenant.suspendedAt = status === "suspended" ? new Date() : null;
        tenant.suspendedBy = status === "suspended" ? actorId : null;
        tenant.suspensionReason = status === "suspended" ? tenant.suspensionReason : null;
        const saved = await this.tenantRepository.save(tenant);
        await this.bumpPolicy(tenantId);
        await this.audit(actorId, tenantId, `tenant.status.${status}`, "changed", tenantId, {
            status,
        });
        return saved;
    }

    async archiveTenant(actorId: string, isRoot: boolean, tenantId: string) {
        if (!isEnabled(isRoot))
            throw HttpErrorFactory.forbidden("Only platform administrators can delete tenants");
        const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
        if (!tenant) throw HttpErrorFactory.notFound("Tenant not found");
        if (tenant.code === "default")
            throw HttpErrorFactory.badRequest("The default tenant cannot be deleted");
        if (tenant.status === "archived") return tenant;
        if (await this.hasBusinessData(tenantId)) {
            throw HttpErrorFactory.badRequest("Tenant has business data and cannot be deleted");
        }
        tenant.status = "archived";
        const saved = await this.tenantRepository.save(tenant);
        await this.bumpPolicy(tenantId);
        await this.audit(actorId, tenantId, "tenant.archive", "changed", tenantId, {});
        return saved;
    }

    async removeMember(actorId: string, isRoot: boolean, tenantId: string, membershipId: string) {
        const tenant = await this.assertCanManageAndReturn(actorId, isRoot, tenantId);
        const membership = await this.membershipRepository.findOne({
            where: { id: membershipId, tenantId },
        });
        if (!membership) throw HttpErrorFactory.notFound("Membership not found");
        const administratorId =
            (tenant as Tenant & { adminUserId?: string | null }).adminUserId ?? tenant.ownerId;
        if (membership.userId && membership.userId === administratorId) {
            throw HttpErrorFactory.badRequest("The sole tenant administrator cannot be removed");
        }
        if (typeof (this.membershipRepository as any).delete !== "function") {
            throw HttpErrorFactory.badRequest("Tenant member deletion is unavailable");
        }
        await (this.membershipRepository as any).delete({ id: membershipId, tenantId });
        await this.bumpPolicy(tenantId);
        await this.audit(actorId, tenantId, "membership.remove", "changed", membershipId, {
            userId: membership.userId,
        });
        return { success: true };
    }

    private async hasBusinessData(tenantId: string): Promise<boolean> {
        const query = (this.tenantRepository.manager as any)?.query;
        if (typeof query !== "function") return false;
        const excluded = new Set([
            "tenants",
            "tenant_memberships",
            "tenant_audit_events",
            "tenant_roles",
            "tenant_organizations",
            "tenant_projects",
        ]);
        const tables = await query.call(
            this.tenantRepository.manager,
            `
            SELECT DISTINCT table_name AS "tableName"
            FROM information_schema.columns
            WHERE table_schema = current_schema() AND column_name = 'tenant_id'
        `,
        );
        for (const row of tables as Array<{ tableName: string }>) {
            if (!row.tableName || excluded.has(row.tableName)) continue;
            const result = await query.call(
                this.tenantRepository.manager,
                `SELECT 1 FROM "${row.tableName.replace(/"/g, '""')}" WHERE tenant_id = $1 LIMIT 1`,
                [tenantId],
            );
            if (result?.length) return true;
        }
        return false;
    }

    async getEffectivePermissions(userId: string, isRoot: boolean, tenantId: string) {
        const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
        if (!tenant || tenant.status !== "active")
            throw HttpErrorFactory.notFound("Tenant not found");
        if (isEnabled(isRoot))
            return {
                tenantId,
                roleCode: "owner",
                permissions: ["*"],
                policyVersion: tenant.policyVersion,
            };
        const membership = await this.getMembership(userId, tenantId);
        if (!membership) throw HttpErrorFactory.notFound("Tenant not found");
        const adminUserId =
            (tenant as Tenant & { adminUserId?: string | null }).adminUserId ?? tenant.ownerId;
        const roleCode = membership.userId === adminUserId ? "admin" : "member";
        return {
            tenantId,
            roleCode,
            permissions: this.permissionsForRole(roleCode),
            policyVersion: tenant.policyVersion,
        };
    }

    async getMembership(userId: string, tenantId: string): Promise<TenantMembership | null> {
        try {
            return await this.tenantContextService.resolve(userId, tenantId);
        } catch {
            return null;
        }
    }

    async getContextMembership(userId: string, tenantId: string): Promise<TenantMembership | null> {
        return this.getMembership(userId, tenantId);
    }

    async getTenantForAdmin(userId: string, isRoot: boolean, tenantId: string): Promise<Tenant> {
        return this.tenantContextService.assertAdmin(userId, isEnabled(isRoot), tenantId);
    }

    async listMembers(
        userId: string,
        isRoot: boolean,
        tenantId: string,
    ): Promise<TenantMembership[]> {
        const tenant = await this.getTenantForAdmin(userId, isRoot, tenantId);
        const members = await this.membershipRepository.find({
            where: { tenantId },
            relations: ["user", "organization", "project"],
            order: { createdAt: "ASC" },
        });
        const adminUserId =
            (tenant as Tenant & { adminUserId?: string | null }).adminUserId ?? tenant.ownerId;
        return members.map((member) => ({
            ...member,
            isAdministrator: member.userId === adminUserId,
        })) as TenantMembership[];
    }

    async listProjects(userId: string, isRoot: boolean, tenantId: string): Promise<Project[]> {
        await this.getTenantForAdmin(userId, isRoot, tenantId);
        return this.projectRepository.find({ where: { tenantId }, order: { name: "ASC" } });
    }

    async listRoles(userId: string, isRoot: boolean, tenantId: string): Promise<TenantRole[]> {
        await this.getTenantForAdmin(userId, isRoot, tenantId);
        return this.roleRepository.find({ where: { tenantId }, order: { code: "ASC" } });
    }

    async inviteMember(
        actorId: string,
        isRoot: boolean,
        tenantId: string,
        dto: InviteTenantMemberDto,
    ) {
        await this.assertCanManage(actorId, isRoot, tenantId);
        const invitationEmail = dto.invitationEmail ?? dto.email;
        if (!dto.userId && !dto.username && !invitationEmail) {
            throw HttpErrorFactory.badRequest("A username or invitation email is required");
        }
        let existingUser = dto.userId
            ? await this.userRepository.findOne({ where: { id: dto.userId } })
            : dto.username
              ? await this.userRepository.findOne({ where: { username: dto.username } })
              : invitationEmail
                ? await this.userRepository.findOne({ where: { email: invitationEmail } })
                : null;
        const roleCode = dto.roleCode ?? "member";
        const run = async (manager: any) => {
            const userRepository = manager.getRepository
                ? manager.getRepository(User)
                : this.userRepository;
            const membershipRepository = manager.getRepository
                ? manager.getRepository(TenantMembership)
                : this.membershipRepository;
            let user = existingUser;
            if (!user && dto.password && dto.username) {
                user = await userRepository.save(
                    userRepository.create({
                        username: dto.username,
                        email: invitationEmail ?? null,
                        password: await bcrypt.hash(dto.password, 10),
                        nickname: dto.nickname ?? dto.username,
                        realName: dto.realName ?? null,
                        phone: dto.phone ?? null,
                        phoneAreaCode: null,
                        avatar: dto.avatar ?? null,
                        status: 1,
                        manageStatus: 1,
                        isRoot: 0,
                        source: 0,
                        role: null,
                        userNo: null,
                    }),
                );
            }
            if (!user && !invitationEmail)
                throw HttpErrorFactory.badRequest("A username or invitation email is required");
            if (user) {
                const existing = await membershipRepository.findOne({
                    where: { tenantId, userId: user.id },
                });
                if (existing) throw HttpErrorFactory.badRequest("User is already a tenant member");
            }
            const membership = membershipRepository.create({
                tenantId,
                userId: user?.id ?? null,
                invitationEmail: invitationEmail ?? user?.email ?? null,
                roleCode,
                organizationId: dto.organizationId ?? null,
                projectId: dto.projectId ?? null,
                status: user ? "active" : "invited",
                invitedAt: new Date(),
                acceptedAt: user ? new Date() : null,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
                createdBy: actorId,
                updatedBy: actorId,
                attributes: {},
            });
            return membershipRepository.save(membership);
        };
        const saved = this.userRepository.manager?.transaction
            ? await this.userRepository.manager.transaction(run)
            : await run(this.userRepository.manager ?? {});
        await this.bumpPolicy(tenantId);
        await this.audit(actorId, tenantId, "membership.invite", "changed", saved.id, { roleCode });
        return this.membershipRepository.findOne({
            where: { id: saved.id },
            relations: ["user", "organization", "project"],
        });
    }

    async updateMember(
        actorId: string,
        isRoot: boolean,
        tenantId: string,
        membershipId: string,
        dto: UpdateTenantMembershipDto,
    ) {
        await this.assertCanManage(actorId, isRoot, tenantId);
        const membership = await this.membershipRepository.findOne({
            where: { id: membershipId, tenantId },
        });
        if (!membership) throw HttpErrorFactory.notFound("Membership not found");
        Object.assign(membership, {
            roleCode: dto.roleCode ?? membership.roleCode,
            status: dto.status ?? membership.status,
            organizationId:
                dto.organizationId === undefined ? membership.organizationId : dto.organizationId,
            projectId: dto.projectId === undefined ? membership.projectId : dto.projectId,
            expiresAt:
                dto.expiresAt === undefined
                    ? membership.expiresAt
                    : dto.expiresAt
                      ? new Date(dto.expiresAt)
                      : null,
            updatedBy: actorId,
        });
        const saved = await this.membershipRepository.save(membership);
        await this.bumpPolicy(tenantId);
        await this.audit(actorId, tenantId, "membership.update", "changed", saved.id, {
            status: saved.status,
            roleCode: saved.roleCode,
        });
        return saved;
    }

    /** Assign the tenant's single administrator directly; no approval workflow is required. */
    async assignAdministrator(
        actorId: string,
        isRoot: boolean,
        tenantId: string,
        userId: string,
    ): Promise<Tenant> {
        const tenant = await this.assertCanManageAndReturn(actorId, isRoot, tenantId);
        const membership = await this.membershipRepository.findOne({ where: { tenantId, userId } });
        if (!membership || !isMembershipActive(membership))
            throw HttpErrorFactory.notFound("User is not an active tenant member");
        const previousAdminId =
            (tenant as Tenant & { adminUserId?: string | null }).adminUserId ?? tenant.ownerId;
        (tenant as Tenant & { adminUserId?: string | null }).adminUserId = userId;
        tenant.ownerId = userId;
        await this.tenantRepository.save(tenant);
        if (previousAdminId && previousAdminId !== userId) {
            const previous = await this.membershipRepository.findOne({
                where: { tenantId, userId: previousAdminId },
            });
            if (previous) {
                previous.roleCode = "member";
                await this.membershipRepository.save(previous);
            }
        }
        membership.roleCode = "admin";
        await this.membershipRepository.save(membership);
        await this.bumpPolicy(tenantId);
        await this.audit(actorId, tenantId, "tenant.administrator.assign", "changed", userId, {
            previousAdminId,
            userId,
        });
        return tenant;
    }

    /** Return only tenants for which the actor is the configured administrator. */
    async listAdministrableTenants(userId: string, isRoot: boolean): Promise<Tenant[]> {
        const tenants = await this.tenantContextService.listForUser(userId, isRoot);
        if (isRoot) return tenants;
        return tenants.filter((tenant) => {
            const adminId =
                (tenant as Tenant & { adminUserId?: string | null }).adminUserId ?? tenant.ownerId;
            return adminId === userId;
        });
    }

    private async assertCanManageAndReturn(
        actorId: string,
        isRoot: boolean,
        tenantId: string,
    ): Promise<Tenant> {
        return this.getTenantForAdmin(actorId, isRoot, tenantId);
    }

    async createProject(
        actorId: string,
        isRoot: boolean,
        tenantId: string,
        name: string,
        code: string,
        ownerId?: string,
        expiresAt?: string,
    ) {
        await this.assertCanManage(actorId, isRoot, tenantId);
        const existing = await this.projectRepository.findOne({ where: { tenantId, code } });
        if (existing) throw HttpErrorFactory.badRequest("Project code already exists");
        const project = await this.projectRepository.save(
            this.projectRepository.create({
                tenantId,
                name,
                code,
                ownerId: ownerId ?? actorId,
                status: "active",
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            }),
        );
        await this.audit(actorId, tenantId, "project.create", "changed", project.id, { code });
        return project;
    }

    async createGrant(
        actorId: string,
        isRoot: boolean,
        tenantId: string,
        projectId: string,
        resourceType: string,
        resourceId: string,
        subjectId: string,
        actions: string[],
    ) {
        await this.assertCanManage(actorId, isRoot, tenantId);
        const project = await this.projectRepository.findOne({
            where: { id: projectId, tenantId },
        });
        if (!project) throw HttpErrorFactory.notFound("Project not found");
        const grant = await this.grantRepository.save(
            this.grantRepository.create({
                tenantId,
                projectId,
                resourceType,
                resourceId,
                subjectType: "user",
                subjectId,
                actions: actions as ResourceGrantAction[],
                conditions: {},
                policyVersion: 1,
                createdBy: actorId,
                roleCode: null,
                expiresAt: null,
                revokedBy: null,
                revokedAt: null,
            }),
        );
        await this.bumpPolicy(tenantId);
        await this.audit(actorId, tenantId, "resource.grant", "changed", grant.id, {
            projectId,
            resourceType,
            resourceId,
            actions,
        });
        return grant;
    }

    permissionsForRole(roleCode: string): string[] {
        return ROLE_PERMISSIONS[roleCode] ?? [];
    }

    private async assertCanManage(
        actorId: string,
        isRoot: boolean,
        tenantId: string,
    ): Promise<void> {
        await this.getTenantForAdmin(actorId, isRoot, tenantId);
    }

    private async bumpPolicy(tenantId: string): Promise<void> {
        await this.tenantRepository.increment({ id: tenantId }, "policyVersion", 1);
    }

    private async audit(
        actorId: string,
        tenantId: string,
        action: string,
        outcome: "allowed" | "denied" | "changed",
        resourceId: string | null,
        metadata: Record<string, unknown>,
    ): Promise<void> {
        await this.auditRepository.save(
            this.auditRepository.create({
                tenantId,
                actorId,
                action,
                outcome,
                resourceType: "tenant",
                resourceId,
                metadata,
            }),
        );
    }
}
