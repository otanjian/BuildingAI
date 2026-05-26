import { createHttpClient, createStandardApiParser } from "@buildingai/http";
import { useAuthStore } from "@buildingai/stores";

const isDev = import.meta.env.DEV;
const base = isDev ? window.location.origin : import.meta.env.VITE_PRODUCTION_APP_BASE_URL;

export const platformHttpClient = createHttpClient({
    baseURL: base,
    pathPrefix: import.meta.env.VITE_APP_WEB_API_PREFIX || "/api",
    parseResponse: createStandardApiParser(),
    hooks: {
        getAccessToken: async () => useAuthStore.getState().auth.token || "",
    },
});
