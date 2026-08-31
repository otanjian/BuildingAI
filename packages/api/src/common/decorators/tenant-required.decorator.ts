import { SetMetadata } from "@nestjs/common";

export const TENANT_REQUIRED_KEY = "decorator:tenant-required";

/** Mark a route as requiring a verified active tenant context. */
export const TenantRequired = () => SetMetadata(TENANT_REQUIRED_KEY, true);
