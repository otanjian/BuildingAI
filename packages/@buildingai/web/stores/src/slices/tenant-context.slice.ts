import type { StateCreator } from "zustand";

import { createStore } from "../create-store";
import type { StorageAdapter } from "../utils/storage";

export const ACTIVE_TENANT_STORAGE_KEY = "buildingai.active-tenant-id";

export type TenantContextState = {
    activeTenantId?: string;
    defaultTenantId?: string;
};

export type TenantContextActions = {
    setActiveTenantId: (tenantId?: string) => void;
    setDefaultTenantId: (tenantId?: string) => void;
    clearTenantContext: () => void;
};

export type TenantContextSlice = {
    tenantContext: TenantContextState;
    tenantContextActions: TenantContextActions;
};

function writeActiveTenantId(tenantId?: string) {
    if (typeof window === "undefined") return;
    if (tenantId) window.localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, tenantId);
    else window.localStorage.removeItem(ACTIVE_TENANT_STORAGE_KEY);
}

function migrateActiveTenant(storage: StorageAdapter): Partial<TenantContextSlice> | undefined {
    const tenantId = storage.getItem(ACTIVE_TENANT_STORAGE_KEY) ?? undefined;
    return tenantId ? { tenantContext: { activeTenantId: tenantId } } : undefined;
}

export const createTenantContextSlice: StateCreator<
    TenantContextSlice,
    [],
    [],
    TenantContextSlice
> = (set) => ({
    tenantContext: {
        activeTenantId: undefined,
        defaultTenantId: undefined,
    },
    tenantContextActions: {
        setActiveTenantId: (tenantId) => {
            writeActiveTenantId(tenantId);
            set((state) => ({
                tenantContext: { ...state.tenantContext, activeTenantId: tenantId },
            }));
        },
        setDefaultTenantId: (tenantId) =>
            set((state) => ({
                tenantContext: { ...state.tenantContext, defaultTenantId: tenantId },
            })),
        clearTenantContext: () => {
            writeActiveTenantId();
            set(() => ({ tenantContext: {} }));
        },
    },
});

export const useTenantContextStore = createStore<TenantContextSlice>(createTenantContextSlice, {
    persist: {
        name: "tenant-context",
        partialize: (state) => ({ tenantContext: state.tenantContext }),
        migrate: migrateActiveTenant,
    },
});
