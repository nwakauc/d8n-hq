/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HQ_BRANDS?: string;
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
