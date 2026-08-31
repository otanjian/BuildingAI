import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min } from "class-validator";

export class RegisterToolDto {
    @IsString() name: string;
    @IsOptional() @IsString() description?: string;
    @IsOptional() @IsString() version?: string;
    @IsOptional() @IsString() environment?: string;
    @IsOptional() @IsArray() @IsString({ each: true }) capabilities?: string[];
    @IsOptional() @IsObject() inputSchema?: Record<string, unknown>;
    @IsOptional() @IsObject() outputSchema?: Record<string, unknown>;
    @IsOptional() @IsIn(["READ", "WRITE", "SENSITIVE", "DESTRUCTIVE"]) risk?: "READ" | "WRITE" | "SENSITIVE" | "DESTRUCTIVE";
    @IsOptional() @IsString() credentialRef?: string;
    @IsOptional() @IsInt() @Min(100) @Max(120000) timeoutMs?: number;
    @IsOptional() @IsInt() @Min(1024) @Max(10485760) responseSizeLimit?: number;
    @IsOptional() @IsObject() networkPolicy?: Record<string, unknown>;
    @IsOptional() @IsBoolean() idempotencyRequired?: boolean;
    @IsOptional() @IsIn(["none", "preauthorization", "approval", "double_approval"]) approvalMode?: "none" | "preauthorization" | "approval" | "double_approval";
    @IsOptional() @IsInt() @Min(1) @Max(100) maxConcurrency?: number;
    @IsOptional() @IsInt() @Min(0) @Max(5) maxRetries?: number;
    @IsOptional() @IsInt() @Min(0) @Max(1000000) budgetLimit?: number;
    @IsOptional() @IsInt() @Min(0) @Max(1000000) rateLimitPerMinute?: number;
    @IsOptional() @IsString() projectId?: string;
    @IsOptional() @IsString() agentVersionId?: string;
}

export class ExecuteToolDto {
    @IsString() tool: string;
    @IsObject() input: Record<string, unknown>;
    @IsOptional() @IsString() idempotencyKey?: string;
    @IsOptional() @IsString() approvalId?: string;
    @IsOptional() @IsString() projectId?: string;
    @IsOptional() @IsString() agentVersionId?: string;
    @IsOptional() @IsString() environment?: string;
    @IsOptional() @IsArray() @IsString({ each: true }) requiredCapabilities?: string[];
}

export class ListToolQueryDto {
    @IsOptional() @IsString() environment?: string;
    @IsOptional() @IsString() agentVersionId?: string;
    @IsOptional() @IsString() capability?: string;
}

export class ApprovalDecisionDto {
    @IsIn(["approved", "rejected"]) status: "approved" | "rejected";
    @IsOptional() @IsString() reason?: string;
}
