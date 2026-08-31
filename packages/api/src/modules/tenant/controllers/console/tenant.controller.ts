import type { UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { HttpErrorFactory } from "@buildingai/errors";
import { ConsoleController, Permissions, TenantRequired } from "@common/decorators";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import {
    CreateTenantDto,
    CreateTenantProjectDto,
    InviteTenantMemberDto,
    QueryTenantListDto,
    UpdateTenantMembershipDto,
    UpdateTenantStatusDto,
} from "../../dto/tenant.dto";
import { TenantService } from "../../services/tenant.service";

@ConsoleController("tenant", "租户管理")
export class TenantConsoleController {
    constructor(private readonly tenantService: TenantService) {}

    @Get()
    async list(@Playground() user: UserPlayground, @Query() query: QueryTenantListDto) {
        return this.tenantService.listLifecycle(user.id, Boolean(user.isRoot), query);
    }

    @Post()
    @Permissions({ code: "tenants:create", name: "创建租户" })
    async create(@Playground() user: UserPlayground, @Body() dto: CreateTenantDto) {
        return this.tenantService.createTenant(user.id, Boolean(user.isRoot), dto);
    }

    @Patch(":tenantId/status")
    @Permissions({ code: "tenants:status", name: "更新租户状态" })
    async updateStatus(
        @Playground() user: UserPlayground,
        @Param("tenantId") tenantId: string,
        @Body() dto: UpdateTenantStatusDto,
    ) {
        return this.tenantService.updateTenantStatus(
            user.id,
            Boolean(user.isRoot),
            tenantId,
            dto.status,
        );
    }

    @Delete(":tenantId")
    @Permissions({ code: "tenants:delete", name: "删除租户" })
    async archive(@Playground() user: UserPlayground, @Param("tenantId") tenantId: string) {
        return this.tenantService.archiveTenant(user.id, Boolean(user.isRoot), tenantId);
    }

    /** Resolve the caller's requested tenant and return the verified context. */
    @Get("context/:tenantId")
    @TenantRequired()
    async context(@Playground() user: UserPlayground, @Param("tenantId") tenantId: string) {
        const membership = await this.tenantService.getContextMembership(user.id, tenantId);
        if (!membership && !user.isRoot) throw HttpErrorFactory.notFound("Resource not found");
        const tenant =
            (membership as any)?.tenant ??
            (await this.tenantService.getTenantForAdmin(user.id, Boolean(user.isRoot), tenantId));
        const adminUserId = (tenant as any).adminUserId ?? tenant.ownerId;
        return {
            tenantId,
            membershipId: membership?.id ?? null,
            roleCode: membership?.userId === adminUserId || user.isRoot ? "admin" : "member",
            isAdministrator: user.isRoot || membership?.userId === adminUserId,
            policyVersion: tenant.policyVersion,
        };
    }

    @Get(":tenantId/members")
    @TenantRequired()
    @Permissions({ code: "members:list", name: "查看租户成员" })
    async members(@Playground() user: UserPlayground, @Param("tenantId") tenantId: string) {
        return this.tenantService.listMembers(user.id, Boolean(user.isRoot), tenantId);
    }

    @Patch(":tenantId/administrator")
    @TenantRequired()
    @Permissions({ code: "administrator:update", name: "指定租户管理员" })
    async assignAdministrator(
        @Playground() user: UserPlayground,
        @Param("tenantId") tenantId: string,
        @Body("userId") userId: string,
    ) {
        return this.tenantService.assignAdministrator(
            user.id,
            Boolean(user.isRoot),
            tenantId,
            userId,
        );
    }

    @Get(":tenantId/projects")
    @TenantRequired()
    @Permissions({ code: "projects:list", name: "查看租户项目" })
    async projects(@Playground() user: UserPlayground, @Param("tenantId") tenantId: string) {
        return this.tenantService.listProjects(user.id, Boolean(user.isRoot), tenantId);
    }

    @Get(":tenantId/roles")
    @TenantRequired()
    @Permissions({ code: "roles:list", name: "查看租户角色" })
    async roles(@Playground() user: UserPlayground, @Param("tenantId") tenantId: string) {
        return this.tenantService.listRoles(user.id, Boolean(user.isRoot), tenantId);
    }

    @Get(":tenantId/effective-permissions")
    @TenantRequired()
    @Permissions({ code: "permissions:read", name: "查看生效权限" })
    async effectivePermissions(
        @Playground() user: UserPlayground,
        @Param("tenantId") tenantId: string,
    ) {
        return this.tenantService.getEffectivePermissions(user.id, Boolean(user.isRoot), tenantId);
    }

    @Post(":tenantId/members")
    @TenantRequired()
    @Permissions({ code: "members:create", name: "邀请租户成员" })
    async invite(
        @Playground() user: UserPlayground,
        @Param("tenantId") tenantId: string,
        @Body() dto: InviteTenantMemberDto,
    ) {
        return this.tenantService.inviteMember(user.id, Boolean(user.isRoot), tenantId, dto);
    }

    @Patch(":tenantId/members/:membershipId")
    @TenantRequired()
    @Permissions({ code: "members:update", name: "变更租户成员" })
    async update(
        @Playground() user: UserPlayground,
        @Param("tenantId") tenantId: string,
        @Param("membershipId") membershipId: string,
        @Body() dto: UpdateTenantMembershipDto,
    ) {
        return this.tenantService.updateMember(
            user.id,
            Boolean(user.isRoot),
            tenantId,
            membershipId,
            dto,
        );
    }

    @Delete(":tenantId/members/:membershipId")
    @TenantRequired()
    @Permissions({ code: "members:delete", name: "移除租户成员" })
    async removeMember(
        @Playground() user: UserPlayground,
        @Param("tenantId") tenantId: string,
        @Param("membershipId") membershipId: string,
    ) {
        return this.tenantService.removeMember(
            user.id,
            Boolean(user.isRoot),
            tenantId,
            membershipId,
        );
    }

    @Post(":tenantId/projects")
    @TenantRequired()
    @Permissions({ code: "projects:create", name: "创建租户项目" })
    async createProject(
        @Playground() user: UserPlayground,
        @Param("tenantId") tenantId: string,
        @Body() dto: CreateTenantProjectDto,
    ) {
        return this.tenantService.createProject(
            user.id,
            Boolean(user.isRoot),
            tenantId,
            dto.name,
            dto.code,
            dto.ownerId,
            dto.expiresAt,
        );
    }

    @Post(":tenantId/grants")
    @TenantRequired()
    @Permissions({ code: "grants:create", name: "授予项目资源权限" })
    async createGrant(
        @Playground() user: UserPlayground,
        @Param("tenantId") tenantId: string,
        @Body()
        body: {
            projectId: string;
            resourceType: string;
            resourceId: string;
            subjectId: string;
            actions: string[];
        },
    ) {
        return this.tenantService.createGrant(
            user.id,
            Boolean(user.isRoot),
            tenantId,
            body.projectId,
            body.resourceType,
            body.resourceId,
            body.subjectId,
            body.actions,
        );
    }
}
