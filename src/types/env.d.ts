/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WOMPI_PUBLIC_KEY: string
  readonly VITE_WOMPI_INTEGRITY_SECRET: string
  readonly VITE_API_URL: string
  readonly VITE_SOCKET_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}