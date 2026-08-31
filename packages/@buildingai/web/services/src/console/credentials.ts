import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type CredentialMetadata = {
    id: string;
    name: string;
    provider: string;
    purpose: string;
    projectId: string | null;
    environment: string;
    status: "active" | "revoked" | "expired";
    version: number;
    keyVersion: string;
    fingerprint: string;
    maskedValue: string;
    expiresAt: string | null;
    lastUsedAt: string | null;
    createdAt: string;
};

export type CreateCredentialDto = {
    name: string;
    provider: string;
    purpose: string;
    secret: string;
    projectId?: string;
    environment?: string;
    scopes?: Array<{ resource: string; actions: string[] }>;
    expiresAt?: string;
};

export type RotateCredentialDto = { secret: string; expiresAt?: string };

const listCredentials = () => consoleHttpClient.get<CredentialMetadata[]>("credentials");
const createCredential = (data: CreateCredentialDto) => consoleHttpClient.post<CredentialMetadata>("credentials", data);
const rotateCredential = (id: string, data: RotateCredentialDto) => consoleHttpClient.post<CredentialMetadata>(`credentials/${id}/rotate`, data);
const testCredential = (id: string) => consoleHttpClient.post<{ ok: boolean; status: string; credentialId: string; testedAt: string }>(`credentials/${id}/test`);
const revokeCredential = (id: string) => consoleHttpClient.delete<CredentialMetadata>(`credentials/${id}`);

export const useCredentialsQuery = (options?: QueryOptionsUtil<CredentialMetadata[]>) => useQuery({ queryKey: ["credentials"], queryFn: listCredentials, ...options });
export const useCreateCredentialMutation = (options?: MutationOptionsUtil<CredentialMetadata, CreateCredentialDto>) => useMutation({ mutationFn: createCredential, ...options });
export const useRotateCredentialMutation = (options?: MutationOptionsUtil<CredentialMetadata, { id: string; data: RotateCredentialDto }>) => useMutation({ mutationFn: ({ id, data }) => rotateCredential(id, data), ...options });
export const useTestCredentialMutation = (options?: MutationOptionsUtil<{ ok: boolean; status: string; credentialId: string; testedAt: string }, string>) => useMutation({ mutationFn: testCredential, ...options });
export const useRevokeCredentialMutation = (options?: MutationOptionsUtil<CredentialMetadata, string>) => useMutation({ mutationFn: revokeCredential, ...options });
