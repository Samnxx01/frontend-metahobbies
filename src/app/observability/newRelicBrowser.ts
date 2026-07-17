import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent';

const env = import.meta.env;

const enabled = env.VITE_NEW_RELIC_ENABLED === 'true';
const licenseKey = env.VITE_NEW_RELIC_BROWSER_LICENSE_KEY?.trim();
const applicationID = env.VITE_NEW_RELIC_BROWSER_APPLICATION_ID?.trim();
const allowedOrigins = (env.VITE_NEW_RELIC_DISTRIBUTED_TRACING_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const newRelicBrowser = enabled && licenseKey && applicationID
  ? new BrowserAgent({
      init: {
        distributed_tracing: {
          enabled: true,
          cors_use_newrelic_header: true,
          cors_use_tracecontext_headers: true,
          allowed_origins: allowedOrigins,
        },
        browser_consent_mode: { enabled: false },
        ajax: {
          enabled: true,
          deny_list: ['bam.nr-data.net'],
        },
        performance: {
          capture_detail: false,
          capture_marks: false,
          capture_measures: true,
        },
        jserrors: { enabled: true },
        metrics: { enabled: true },
        page_view_timing: { enabled: true },
        soft_navigations: { enabled: true },
        session_trace: {
          enabled: env.VITE_NEW_RELIC_SESSION_TRACE_ENABLED === 'true',
        },
        session_replay: {
          enabled: env.VITE_NEW_RELIC_SESSION_REPLAY_ENABLED === 'true',
          block_selector: '[data-newrelic-block]',
          mask_text_selector: '*',
          sampling_rate: 10,
          error_sampling_rate: 100,
        },
        privacy: {
          cookies_enabled: true,
        },
      },
      info: {
        beacon: env.VITE_NEW_RELIC_BEACON || 'bam.nr-data.net',
        errorBeacon: env.VITE_NEW_RELIC_ERROR_BEACON || 'bam.nr-data.net',
        licenseKey,
        applicationID,
        sa: 1,
      },
      loader_config: {
        accountID: env.VITE_NEW_RELIC_ACCOUNT_ID?.trim(),
        trustKey: env.VITE_NEW_RELIC_TRUST_KEY?.trim(),
        agentID: env.VITE_NEW_RELIC_AGENT_ID?.trim() || applicationID,
        licenseKey,
        applicationID,
      },
    })
  : null;

/**
 * Registra atributos globales del entorno/despliegue en toda la telemetría del navegador
 * (PageView, PageAction, JavaScriptError, etc.). Permite filtrar en NRQL con:
 *   SELECT * FROM JavaScriptError WHERE environment = 'production'
 */
export function registrarEntornoNewRelic(): void {
  if (!newRelicBrowser) {
    if (enabled) console.warn('[New Relic Browser] Agente no disponible: no se registran atributos de entorno.');
    return;
  }

  newRelicBrowser.setCustomAttribute('environment', env.VITE_APP_ENV || env.MODE || 'unknown');
  newRelicBrowser.setCustomAttribute('configuredHost', env.VITE_APP_HOST || 'unknown');
  newRelicBrowser.setCustomAttribute('browserHostname', window.location.hostname);
  newRelicBrowser.setCustomAttribute('browserOrigin', window.location.origin);
  newRelicBrowser.setCustomAttribute('releaseSha', env.VITE_RELEASE_SHA || 'unknown');
  newRelicBrowser.setCustomAttribute('releaseBranch', env.VITE_RELEASE_BRANCH || 'unknown');
}

/**
 * Evento personalizado PageAction para peticiones que superan el umbral de lentitud.
 * Consultable en New Relic con:
 *   SELECT * FROM PageAction WHERE actionName = 'PeticionLentaFrontend'
 */
export function reportarPeticionLentaFrontend(
  atributos: Record<string, string | number | boolean>,
): void {
  if (!newRelicBrowser) return;
  newRelicBrowser.addPageAction('PeticionLentaFrontend', atributos);
}

export function reportarErrorFrontend(
  error: unknown,
  atributos: Record<string, string | number | boolean> = {},
): void {
  if (!newRelicBrowser) return;

  const normalizedError = error instanceof Error
    ? error
    : new Error(typeof error === 'string' ? error : 'Error desconocido en frontend');

  newRelicBrowser.noticeError(normalizedError, atributos);
}

if (enabled && (!licenseKey || !applicationID)) {
  console.warn(
    '[New Relic Browser] Configuración incompleta: defina '
    + 'VITE_NEW_RELIC_BROWSER_LICENSE_KEY y VITE_NEW_RELIC_BROWSER_APPLICATION_ID.',
  );
}
