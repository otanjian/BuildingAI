import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";
import type { EnterpriseDataPolicy, EnterpriseMfaPolicy } from "@buildingai/db/entities";

export interface FederationAssertion {
    issuer: string;
    audience: string;
    nonce: string;
    signatureValid: boolean;
    tenantId?: string;
}

export interface FederationBinding {
    issuer: string;
    audience: string;
    nonce: string;
    tenantId?: string;
}

@Injectable()
export class EnterpriseIamPolicyService {
    validateFederation(assertion: FederationAssertion, binding: FederationBinding): void {
        if (
            !assertion.signatureValid ||
            assertion.issuer !== binding.issuer ||
            assertion.audience !== binding.audience ||
            assertion.nonce !== binding.nonce
        ) {
            throw HttpErrorFactory.forbidden("Identity provider assertion validation failed");
        }
        if (binding.tenantId && assertion.tenantId && binding.tenantId !== assertion.tenantId) {
            throw HttpErrorFactory.forbidden("Identity provider tenant mapping failed");
        }
    }

    requiresStepUp(policy: EnterpriseMfaPolicy, action: string, proofAt: Date | null): boolean {
        if (!policy.required && !policy.sensitiveActions?.includes(action)) return false;
        if (!policy.sensitiveActions?.includes(action) && !policy.required) return false;
        if (!proofAt) return true;
        return Date.now() - proofAt.getTime() > (policy.stepUpMinutes || 15) * 60_000;
    }

    evaluateProviderRoute(
        policy: EnterpriseDataPolicy,
        route: { region: string; vendorTraining: boolean },
    ) {
        // Routing must fail closed when an adapter cannot provide a verified region.
        if (!policy || !route?.region?.trim()) {
            return { allowed: false, reason: "policy_unavailable" as const };
        }
        if (
            policy.allowedRegions?.length &&
            !policy.allowedRegions.includes(route.region) &&
            !policy.allowCrossRegion
        ) {
            return { allowed: false, reason: "region_not_allowed" as const };
        }
        if (route.vendorTraining && !policy.allowVendorTraining) {
            return { allowed: false, reason: "vendor_training_not_allowed" as const };
        }
        return { allowed: true as const };
    }

    maskRestricted(value: string, classification: string): string {
        return classification === "restricted" ? "[REDACTED]" : value;
    }
}
