import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, Length, Matches } from "class-validator";

const roleCodes = ["owner", "admin", "editor", "member", "viewer"] as const;
const membershipStatuses = ["invited", "active", "suspended", "expired", "revoked"] as const;
const tenantStatuses = ["active", "suspended", "pending", "archived"] as const;

export class QueryTenantListDto extends PaginationDto {
    @IsOptional()
    @IsString()
    @Length(1, 120)
    keyword?: string;

    @IsOptional()
    @IsIn(tenantStatuses)
    status?: (typeof tenantStatuses)[number];
}

export class CreateTenantDto {
    @IsString()
    @Length(2, 120)
    name: string;

    @IsString()
    @Length(2, 80)
    @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, {
        message: "Tenant code may contain only letters, numbers, underscores, and hyphens",
    })
    code: string;

    /** Existing global user to make the tenant administrator. */
    @IsOptional()
    @IsUUID()
    adminUserId?: string;

    /** New administrator account fields. Used when adminUserId is omitted. */
    @IsOptional()
    @IsString()
    @Length(3, 20)
    @Matches(/^[a-zA-Z0-9_]+$/, {
        message: "Username may contain only letters, numbers, and underscores",
    })
    username?: string;

    @IsOptional()
    @IsString()
    @Length(6, 128)
    password?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    @Length(2, 120)
    nickname?: string;

    @IsOptional()
    @IsString()
    @Length(2, 120)
    realName?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    avatar?: string;
}

export class UpdateTenantStatusDto {
    @IsIn(["active", "suspended"])
    status: "active" | "suspended";
}

export class CreateTenantProjectDto {
    @IsString()
    @Length(2, 120)
    name: string;

    @IsString()
    @Length(2, 80)
    code: string;

    @IsOptional()
    @IsUUID()
    ownerId?: string;

    @IsOptional()
    @IsString()
    expiresAt?: string;
}

export class InviteTenantMemberDto {
    @IsOptional()
    @IsUUID()
    userId?: string;

    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsEmail()
    invitationEmail?: string;

    /** Email is accepted as the concise alias used by member management UI. */
    @IsOptional()
    @IsEmail()
    email?: string;

    /** When no existing account matches, a password creates the account atomically. */
    @IsOptional()
    @IsString()
    @Length(6, 128)
    password?: string;

    @IsOptional()
    @IsString()
    @Length(2, 120)
    nickname?: string;

    @IsOptional()
    @IsString()
    @Length(2, 120)
    realName?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    avatar?: string;

    @IsOptional()
    @IsIn(roleCodes)
    roleCode?: (typeof roleCodes)[number];

    @IsOptional()
    @IsUUID()
    organizationId?: string;

    @IsOptional()
    @IsUUID()
    projectId?: string;

    @IsOptional()
    @IsString()
    expiresAt?: string;
}

export class UpdateTenantMembershipDto {
    @IsOptional()
    @IsIn(roleCodes)
    roleCode?: (typeof roleCodes)[number];

    @IsOptional()
    @IsIn(membershipStatuses)
    status?: (typeof membershipStatuses)[number];

    @IsOptional()
    @IsUUID()
    organizationId?: string | null;

    @IsOptional()
    @IsUUID()
    projectId?: string | null;

    @IsOptional()
    @IsString()
    expiresAt?: string | null;
}
