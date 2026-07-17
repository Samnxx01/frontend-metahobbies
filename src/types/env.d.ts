/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WOMPI_PUBLIC_KEY: string
  readonly VITE_WOMPI_INTEGRITY_SECRET: string
  readonly VITE_API_URL: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_SOCKET_URL: string
  readonly VITE_NEW_RELIC_ENABLED?: string
  readonly VITE_NEW_RELIC_BROWSER_LICENSE_KEY?: string
  readonly VITE_NEW_RELIC_BROWSER_APPLICATION_ID?: string
  readonly VITE_NEW_RELIC_ACCOUNT_ID?: string
  readonly VITE_NEW_RELIC_TRUST_KEY?: string
  readonly VITE_NEW_RELIC_AGENT_ID?: string
  readonly VITE_NEW_RELIC_BEACON?: string
  readonly VITE_NEW_RELIC_ERROR_BEACON?: string
  readonly VITE_NEW_RELIC_DISTRIBUTED_TRACING_ORIGINS?: string
  readonly VITE_NEW_RELIC_SESSION_TRACE_ENABLED?: string
  readonly VITE_NEW_RELIC_SESSION_REPLAY_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
