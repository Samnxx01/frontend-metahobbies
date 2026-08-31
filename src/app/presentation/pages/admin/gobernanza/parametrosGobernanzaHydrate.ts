import { apiFetch } from '@/app/services/api';
import { fetchAllSecurityRoutes } from '@/app/services/routeService';
import { getJerarquiaUsuarios } from '@/app/services/tenantUsuariosService';

export type HydrateBundle =
  | 'selects'
  | 'selectsLite'
  | 'vistas'
  | 'acciones'
  | 'herencias'
  | 'reglas'
  | 'tenantsDestino'
  | 'contextos'
  | 'tenantCorp'
  | 'jerarquiaRutas'
  | 'jerarquiaUsuarios';

const SELECTS_LITE_ENDPOINT_IDS = new Set([
  'perm-admin-tenant-global',
  'perm-admin-tenant-global-listar',
  'perm-admin-tenant-global-actualizar-sa',
  'perm-admin-tenant-global-actualizar-tg',
  'perm-admin-tenant-global-desactivar',
  'perm-admin-tenant-global-eliminar',
  'tenant-global-crear',
  'tenant-global-actualizar',
]);

const SELECTS_FULL_ENDPOINT_IDS = new Set([
  'tenant-global-crear',
  'tenant-global-actualizar',
  'tenant-superadmin-crear',
  'tenant-superadmin-actualizar',
]);

export type ResolveHydrateBundlesInput = {
  mode: string;
  activeSection: string;
  endpointId?: string | null;
  isRulesMode: boolean;
  operacionesHub?: boolean;
};

export function resolveHydrateBundles(input: ResolveHydrateBundlesInput): Set<HydrateBundle> {
  const endpointId = String(input.endpointId || '').trim();
  const section = String(input.activeSection || '').trim().toLowerCase();

  if (input.isRulesMode || section === 'reglas') {
    return new Set<HydrateBundle>([
      'reglas',
      'selectsLite',
      'vistas',
      'jerarquiaUsuarios',
      'contextos',
      'tenantsDestino',
    ]);
  }

  if (input.mode === 'superAdmin' && section === 'permisos') {
    const bundles = new Set<HydrateBundle>([
      'vistas',
      'herencias',
      'tenantsDestino',
      'contextos',
      'jerarquiaUsuarios',
    ]);
    if (endpointId && SELECTS_LITE_ENDPOINT_IDS.has(endpointId)) {
      bundles.add('selectsLite');
    }
    if (endpointId && SELECTS_FULL_ENDPOINT_IDS.has(endpointId)) {
      bundles.delete('selectsLite');
      bundles.add('selects');
    }
    if (endpointId && /corp|corporativo/i.test(endpointId)) {
      bundles.add('tenantCorp');
    }
    return bundles;
  }

  if (input.mode === 'superAdmin' && section === 'tenant') {
    const bundles = new Set<HydrateBundle>(['selectsLite', 'tenantsDestino', 'jerarquiaUsuarios']);
    if (endpointId && SELECTS_FULL_ENDPOINT_IDS.has(endpointId)) {
      bundles.delete('selectsLite');
      bundles.add('selects');
    }
    return bundles;
  }

  return new Set<HydrateBundle>([
    'selects',
    'vistas',
    'acciones',
    'herencias',
    'reglas',
    'tenantsDestino',
    'contextos',
    'tenantCorp',
    'jerarquiaRutas',
    'jerarquiaUsuarios',
  ]);
}

export const ALL_HYDRATE_BUNDLES = new Set<HydrateBundle>([
  'selects',
  'selectsLite',
  'vistas',
  'acciones',
  'herencias',
  'reglas',
  'tenantsDestino',
  'contextos',
  'tenantCorp',
  'jerarquiaRutas',
  'jerarquiaUsuarios',
]);

const SELECTS_CACHE_TTL_MS = 60_000;
const _selectsCache = new Map<string, { at: number; promise: Promise<unknown> }>();

export function invalidarSelectsGobernanzaCache(): void {
  _selectsCache.clear();
}

export function endpointNeedsSelectsLite(endpointId: string | null | undefined): boolean {
  return SELECTS_LITE_ENDPOINT_IDS.has(String(endpointId || '').trim());
}

export function endpointNeedsSelectsFull(endpointId: string | null | undefined): boolean {
  return SELECTS_FULL_ENDPOINT_IDS.has(String(endpointId || '').trim());
}

export async function fetchTenantGlobalSelectsCached(options?: {
  lite?: boolean;
  force?: boolean;
}): Promise<unknown> {
  const lite = options?.lite === true;
  const force = options?.force === true;
  const key = lite ? 'lite' : 'full';
  const now = Date.now();
  if (!force) {
    const cached = _selectsCache.get(key);
    if (cached && now - cached.at < SELECTS_CACHE_TTL_MS) {
      return cached.promise;
    }
  }
  const url = lite
    ? '/api/config/global/creacion/usu/tenant/global/selects?lite=1'
    : '/api/config/global/creacion/usu/tenant/global/selects';
  const promise = apiFetch(url, { method: 'GET' }).catch((err) => {
    if (_selectsCache.get(key)?.promise === promise) {
      _selectsCache.delete(key);
    }
    throw err;
  });
  _selectsCache.set(key, { at: now, promise });
  return promise;
}

type HydrateFetchers = Partial<Record<HydrateBundle, () => Promise<unknown>>>;

export function buildHydrateFetchers(bundles: Set<HydrateBundle>): HydrateFetchers {
  const fetchers: HydrateFetchers = {};
  if (bundles.has('selects')) {
    fetchers.selects = () => fetchTenantGlobalSelectsCached({ lite: false });
  } else if (bundles.has('selectsLite')) {
    fetchers.selectsLite = () => fetchTenantGlobalSelectsCached({ lite: true });
  }
  if (bundles.has('vistas')) {
    fetchers.vistas = () => apiFetch('/api/config/tenant/tipo/listar/vistas/contexto/roles', { method: 'GET' });
  }
  if (bundles.has('acciones')) {
    fetchers.acciones = () => apiFetch('/api/config/parametrizacion/widget/branding/acciones', { method: 'GET' });
  }
  if (bundles.has('herencias')) {
    fetchers.herencias = () => apiFetch('/api/config/permisos/listar/usu/tenant/libres', { method: 'GET' });
  }
  if (bundles.has('reglas')) {
    fetchers.reglas = () => fetchReglasTenantCached();
  }
  if (bundles.has('tenantsDestino')) {
    fetchers.tenantsDestino = () =>
      apiFetch('/api/config/tenant/tipo/listar/globales/contexto/roles', { method: 'GET' });
  }
  if (bundles.has('contextos')) {
    fetchers.contextos = () => apiFetch('/api/config/tenant/tipo/api/contexto', { method: 'GET' });
  }
  if (bundles.has('tenantCorp')) {
    fetchers.tenantCorp = () =>
      apiFetch('/api/config/permisos/creacion/admin/tenant/corporativos', { method: 'GET' });
  }
  if (bundles.has('jerarquiaRutas')) {
    fetchers.jerarquiaRutas = () => fetchAllSecurityRoutes(true);
  }
  if (bundles.has('jerarquiaUsuarios')) {
    fetchers.jerarquiaUsuarios = () => getJerarquiaUsuarios();
  }
  return fetchers;
}

export type HydrateBundleResults = Partial<Record<HydrateBundle, PromiseSettledResult<unknown>>>;

export async function fetchHydrateBundles(bundles: Set<HydrateBundle>): Promise<HydrateBundleResults> {
  const fetchers = buildHydrateFetchers(bundles);
  const entries = Object.entries(fetchers) as [HydrateBundle, () => Promise<unknown>][];
  const settled = await Promise.allSettled(entries.map(([, fn]) => fn()));
  const out: HydrateBundleResults = {};
  entries.forEach(([key], index) => {
    out[key] = settled[index];
  });
  return out;
}

export function mergeHydrateBundleResults(
  target: HydrateBundleResults,
  source: HydrateBundleResults
): HydrateBundleResults {
  return { ...target, ...source };
}

// ─── Cache de promesas para /listar/reglas (TTL 30 s, clave por params) ──────

const REGLAS_CACHE_TTL_MS = 30_000;
const _reglasCache = new Map<string, { at: number; promise: Promise<unknown> }>();

export type FetchReglasParams = {
  tenantSuperTenant?: string;
  tenantGlobal?: string;
  tenantCorporativo?: string;
  soloActivos?: boolean;
};

export async function fetchReglasTenantCached(params: FetchReglasParams = {}): Promise<unknown> {
  const q = new URLSearchParams();
  if (params.tenantSuperTenant) q.set('tenantSuperTenant', params.tenantSuperTenant);
  if (params.tenantGlobal) q.set('tenantGlobal', params.tenantGlobal);
  if (params.tenantCorporativo) q.set('tenantCorporativo', params.tenantCorporativo);
  if (params.soloActivos) q.set('soloActivos', 'true');
  const key = q.toString() || 'base';
  const now = Date.now();
  const cached = _reglasCache.get(key);
  if (cached && now - cached.at < REGLAS_CACHE_TTL_MS) return cached.promise;
  const qs = q.toString();
  const promise = apiFetch(
    `/api/config/tenant/listar/reglas${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  ).catch((err) => {
    if (_reglasCache.get(key)?.promise === promise) _reglasCache.delete(key);
    throw err;
  });
  _reglasCache.set(key, { at: now, promise });
  return promise;
}

/** Fuerza recarga en el próximo llamado (usar tras crear/actualizar/eliminar reglas). */
export function invalidarReglasCache(): void {
  _reglasCache.clear();
}
