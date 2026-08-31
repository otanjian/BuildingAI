import type { UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { ConsoleController, Permissions, TenantRequired } from "@common/decorators";
import { Body, Delete, Get, Param, Post } from "@nestjs/common";

import { CreateCredentialDto, RotateCredentialDto } from "../../dto/credential.dto";
import { CredentialService } from "../../services/credential.service";
import { CredentialMigrationService } from "../../services/credential-migration.service";

@ConsoleController("credentials", "企业凭据安全")
@TenantRequired()
export class CredentialConsoleController {
    constructor(
        private readonly credentialService: CredentialService,
        private readonly migrationService: CredentialMigrationService,
    ) {}

    @Get("migration/report")
    @Permissions({ code: "migration-report", name: "查看凭据迁移状态" })
    migrationReport(@Playground() user: UserPlayground) {
        this.credentialService.assertAdministrator(user);
        return this.migrationService.report(user.tenantId || undefined);
    }

    @Post("migration/backfill")
    @Permissions({ code: "migration-backfill", name: "执行凭据迁移" })
    migrationBackfill(@Playground() user: UserPlayground) {
        this.credentialService.assertAdministrator(user);
        if (!user.tenantId) return Promise.reject(new Error("Select an active tenant before migration"));
        return this.migrationService.migrateAll(user.tenantId, user.id);
    }

    @Get()
    @Permissions({ code: "list", name: "查看企业凭据" })
    list(@Playground() user: UserPlayground) { return this.credentialService.list(user); }

    @Post()
    @Permissions({ code: "create", name: "创建企业凭据" })
    create(@Playground() user: UserPlayground, @Body() dto: CreateCredentialDto) { return this.credentialService.create(user, dto); }

    @Post(":id/rotate")
    @Permissions({ code: "rotate", name: "轮换企业凭据" })
    rotate(@Playground() user: UserPlayground, @Param("id") id: string, @Body() dto: RotateCredentialDto) { return this.credentialService.rotate(user, id, dto); }

    @Post(":id/test")
    @Permissions({ code: "test", name: "测试企业凭据连接" })
    test(@Playground() user: UserPlayground, @Param("id") id: string) { return this.credentialService.testConnection(user, id); }

    @Delete(":id")
    @Permissions({ code: "revoke", name: "撤销企业凭据" })
    revoke(@Playground() user: UserPlayground, @Param("id") id: string) { return this.credentialService.revoke(user, id); }
}
