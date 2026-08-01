/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TASKVIEW_BASE_URL?: string;
  readonly VITE_DEVELOP_APP_BASE_URL?: string;
  readonly VITE_PRODUCTION_APP_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
