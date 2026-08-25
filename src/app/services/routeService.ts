import {
    apiFetch,
    apiFetchPublic,
    clearHybridSpaPath,
    resolveSeguridadRutasFetchOptions,
} from './api';
import { invalidateSplashLogoCache } from './splashLogoService';
import { normalizeRoutePath, toRelativeRoutePath } from './routePathNormalizer';
import { fetchResolvedMenuTags } from './menuTagsRequest';

const PRIVATE_HOME_ROUTE_CACHE_KEY = 'mabs_private_home_route';

export const readCachedPrivateHomeRoute = (): string | null => {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(PRIVATE_HOME_ROUTE_CACHE_KEY);
    if (!raw) return null;
    const normalized = normalizeRoutePath(raw);
    return normalized && normalized !== '/admin' ? normalized : null;
};

const writeCachedPrivateHomeRoute = (path: string | null | undefined): void => {
    if (typeof window === 'undefined') return;
    const normalized = path ? normalizeRoutePath(path) : '';
    if (!normalized || normalized === '/admin') return;
    window.localStorage.setItem(PRIVATE_HOME_ROUTE_CACHE_KEY, normalized);
};

interface RouteResponse {
    success: boolean;
    message: string;
    total: number;
    data: Array<{
        _id: string;
        iud?: string;
        name: string;
        path: string;
        component: string;
        layout: string;
        icon: string | null;
        tipoNodo?: string | null;
        tipoNodoId?: {
            _id?: string;
            codigo?: string;
            nombre?: string;
            descripcion?: string;
            order?: number;
        } | null;
        padreId?: string | { _id?: string; iud?: string } | null;
        allowedRoles: Array<{ iud: string }>;
        estadoRuta: boolean;
        mostrarEnSidebar?: boolean;
        mostrarEnNavbarPublico?: boolean;
        mostrarEnMenuUsuario?: boolean;
        tiquetaNavb?: string | null;
        menuUsuarioLabel?: string | null;
        menuUsuarioOrder?: number;
        renderTag?: string | null;
        formulariosConfig?: {
            habilitado?: boolean;
            modoAsignacion?: 'TENANT' | 'USUARIO' | 'NINGUNO';
            soloDios?: boolean;
        } | null;
        accessType: { _id: string; accessType: string; layout?: string } | Array<{ _id: string; accessType: string; layout?: string }> | string[];
        accessTypeCodes?: string[];
        order: number;
    }>;
}

interface RouteTreeResponse {
    success: boolean;
    message: string;
    total?: number;
    actorTipo?: string;
    sourceCollection?: string | null;
    data: Array<{
        _id?: string;
        iud?: string;
        name: string;
        path: string;
        component: string;
        layout: string;
        icon?: string | null;
        estadoRuta?: boolean;
        order?: number;
        tipoNodo?: string | null;
        children?: any[];
    }>;
}

interface HerenciaVista {
    _id?: string;
    iud?: string;
    path?: string;
    layout?: string;
    estadoRuta?: boolean;
}

interface HerenciaListadoContexto {
    tenantSuperTenantsPermitidos?: string[];
    tenantSuperTenantJwt?: string | null;
    tenantSuperTenantUsuario?: string | null;
    tenantSuperTenant?: string | null;
}

interface HerenciaUsuarioResponse {
    ok?: boolean;
    contexto?: HerenciaListadoContexto;
    herencias?: Array<{
        vistas?: HerenciaVista[];
        tenantSuperTenant?: unknown;
    }>;
}

export interface AdminRouteConfig {
    path: string;
    component: string;
    children?: AdminRouteConfig[];
}

interface AuthorizedRoutes {
    publicRoutes?: Array<{ path: string; component: string }>;
    adminRoutes?: AdminRouteConfig[];
    authRoutes?: Array<{ path: string; component: string }>;
    /** Híbridas de tienda: siempre PublicLayout (navbar horizontal). */
    hybridStorefrontRoutes?: Array<{ path: string; component: string }>;
    /** Híbridas de panel: AdminLayout con sesión, PublicLayout sin sesión. */
    hybridAdminShellRoutes?: Array<{ path: string; component: string }>;
}

const normalizeLayout = (layout: string): string =>
    (layout || "").replace(/\//g, "").trim().toLowerCase();

const isAdminLayout = (layout: string): boolean => {
    const nl = normalizeLayout(layout);
    return nl === "adminlayout" || nl === "privatelayout";
};

const flattenAdminRoutes = (routes: AdminRouteConfig[] = []): AdminRouteConfig[] => {
    const flat: AdminRouteConfig[] = [];
    const walk = (items: AdminRouteConfig[] = []): void => {
        items.forEach((item) => {
            flat.push({ path: item.path, component: item.component });
            if (Array.isArray(item.children) && item.children.length > 0) {
                walk(item.children);
            }
        });
    };
    walk(routes);
    return flat;
};

const toAdminAppPath = (path: string): string => {
    const normalized = normalizeRoutePath(path);
    if (normalized === '/') return '/admin';
    return normalized.startsWith('/admin/')
        ? normalized
        : `/admin/${toRelativeRoutePath(normalized)}`;
};

const findFirstAuthorizedAdminPath = (nodes: Array<{ path: string; component?: string; children?: any[] }> = []): string | null => {
    for (const node of nodes) {
        const children = Array.isArray(node.children) ? node.children : [];
        const childPath = findFirstAuthorizedAdminPath(children);
        if (childPath) return childPath;

        const nodePath = String(node.path || '').trim();
        if (nodePath) {
            return toAdminAppPath(nodePath);
        }
    }
    return null;
};

const getHerenciaAdminPermitida = async (): Promise<{
    idsPermitidos: Set<string>;
    pathsPermitidos: Set<string>;
}> => {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            return { idsPermitidos: new Set(), pathsPermitidos: new Set() };
        }

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
        const result = await apiFetch(`${API_BASE_URL}/config/permisos/listar/usu/tenant/libres?soloMios=true&includeOrphans=true`, {
            method: "GET",
            useAuth: true
        }) as HerenciaUsuarioResponse | null;

        const idsPermitidos = new Set<string>();
        const pathsPermitidos = new Set<string>();

        const herencias = Array.isArray(result?.herencias) ? result.herencias : [];

        herencias.filter(Boolean).forEach((h) => {
            const vistas = Array.isArray(h?.vistas) ? h.vistas : [];
            vistas.forEach((vista) => {
                if (!vista) return;

                if (typeof vista === 'string' || typeof vista === 'number') {
                    const vistaId = String(vista).trim();
                    if (vistaId) idsPermitidos.add(vistaId);
                    return;
                }

                if (vista.estadoRuta === false) return;

                const layoutRaw = String(
                    vista.layout?._id ? vista.layout : vista.layout || ''
                ).trim();
                if (layoutRaw && !isAdminLayout(layoutRaw)) return;

                const vistaId = String(vista.iud || vista._id || vista.id || "").trim();
                if (vistaId) idsPermitidos.add(vistaId);
                const vistaIdAlt = String(vista._id || "").trim();
                if (vistaIdAlt && vistaIdAlt !== vistaId) idsPermitidos.add(vistaIdAlt);

                const vistaPath = String(vista.path || "").trim();
                if (vistaPath) {
                    const norm = normalizeRoutePath(vistaPath);
                    pathsPermitidos.add(norm);
                    const rel = vistaPath.replace(/^\/admin\/?/i, '').trim();
                    if (rel) {
                        pathsPermitidos.add(normalizeRoutePath(`/${rel}`));
                        pathsPermitidos.add(normalizeRoutePath(`/admin/${rel}`));
                        // Propagar rutas padre para que los nodos contenedor sean navegables
                        // cuando algún hijo está en la herencia.
                        const segments = rel.split('/').filter(Boolean);
                        for (let i = 1; i < segments.length; i++) {
                            const parentRel = segments.slice(0, i).join('/');
                            pathsPermitidos.add(normalizeRoutePath(`/${parentRel}`));
                            pathsPermitidos.add(normalizeRoutePath(`/admin/${parentRel}`));
                        }
                    }
                }
            });
        });

        return { idsPermitidos, pathsPermitidos };
    } catch (error) {
        console.error("Error al resolver herencias de vistas admin:", error);
        return { idsPermitidos: new Set(), pathsPermitidos: new Set() };
    }
};

export interface RouteCatalogItem {
    iud: string;
    path: string;
    layout: string;
    component: string;
    name: string;
    icon?: string | null;
    tipoNodo?: string | null;
    tipoNodoId?: {
        _id?: string;
        codigo?: string;
        nombre?: string;
        descripcion?: string;
        order?: number;
    } | null;
    accessType?: Array<{ _id: string; accessType: string; layout?: string }>;
    mostrarEnNavbarPublico?: boolean;
    mostrarEnSidebar?: boolean;
    mostrarEnMenuUsuario?: boolean;
    tiquetaNavb?: string | null;
    menuUsuarioLabel?: string | null;
    menuUsuarioOrder?: number;
    formulariosConfig?: {
        habilitado: boolean;
        modoAsignacion: 'TENANT' | 'USUARIO' | 'NINGUNO';
        soloDios?: boolean;
    };
}

export interface MenuUsuarioItem {
    key: string | null;
    label: string;
    path: string;
    icon: string | null;
    order: number;
}

export interface UserShortcutRoutes {
    admin: string;
    perfil: string;
    membresia: string;
}

export interface PublicNavItem {
    path: string;
    label: string;
    order: number;
}

export interface FooterNavItem {
    path: string;
    label: string;
    order: number;
}

export interface AdminNavItem {
    path: string;
    label: string;
    component: string;
    order: number;
}

export interface AdminNavTreeItem extends AdminNavItem {
    id: string;
    tipoNodo: string;
    children: AdminNavTreeItem[];
}

export type AdminActorTipo = 'SUPERADMIN' | 'GLOBAL' | 'CORPORATIVO' | 'CLIENTE' | 'UNKNOWN';

export interface AdminSidebarTreeContext {
    actorTipo: AdminActorTipo;
    sourceCollection: string | null;
    tree: AdminNavTreeItem[];
}

const isFormularioNode = (node: { tipoNodo?: string | null; children?: any[] }): boolean =>
    String(node?.tipoNodo || '').trim().toUpperCase() === 'FORMULARIO';

const filterRootsByActorTipo = (roots: AdminNavTreeItem[], actorTipo: AdminActorTipo): AdminNavTreeItem[] => {
    // SUPERADMIN y CLIENTE: devolver todos los nodos sin filtrar por tipoNodo.
    // Para CLIENTE el backend puede devolver nodos FORMULARIO planos (sin hijos);
    // filtrarlos aquí vacía el árbol antes de que la herencia pueda actuar.
    if (actorTipo === 'SUPERADMIN' || actorTipo === 'CLIENTE') return roots;
    return roots.filter((node) => !isFormularioNode(node) || (Array.isArray(node.children) && node.children.length > 0));
};

const buildAllowedRouteLookup = (routes: RouteResponse['data'] | null | undefined): { ids: Set<string>; paths: Set<string> } => {
    const ids = new Set<string>();
    const paths = new Set<string>();

    if (!Array.isArray(routes)) {
        return { ids, paths };
    }

    routes.forEach((route) => {
        const routeId = String(route._id || route.iud || '').trim();
        if (routeId) ids.add(routeId);
        const routePath = normalizeRoutePath(String(route.path || '').trim());
        if (routePath) paths.add(routePath);
    });

    return { ids, paths };
};

const filterTreeByAllowedRoutes = (
    nodes: AdminNavTreeItem[],
    allowedIds: Set<string>,
    allowedPaths: Set<string>
): AdminNavTreeItem[] => {
    return nodes.reduce<AdminNavTreeItem[]>((filtered, node) => {
        const children = filterTreeByAllowedRoutes(node.children || [], allowedIds, allowedPaths);
        const nodeId = String(node.id || '').trim();
        const nodePath = normalizeRoutePath(node.path);
        const allowed = (nodeId && allowedIds.has(nodeId)) || (nodePath && allowedPaths.has(nodePath));

        if (!allowed && children.length === 0) {
            return filtered;
        }

        filtered.push({ ...node, children });
        return filtered;
    }, []);
};

/** No vaciar sidebar si la API no devolvió herencia o si ids/paths no alinean con el árbol. */
const filterTreeByHerenciaConRescate = (
    nodes: AdminNavTreeItem[],
    herencia: { idsPermitidos: Set<string>; pathsPermitidos: Set<string> },
    logLabel: string
): AdminNavTreeItem[] => {
    const hasHerencia = herencia.idsPermitidos.size > 0 || herencia.pathsPermitidos.size > 0;
    if (!hasHerencia) return nodes;
    const filtered = filterTreeByAllowedRoutes(nodes, herencia.idsPermitidos, herencia.pathsPermitidos);
    if (filtered.length === 0 && nodes.length > 0) {
        console.warn(
            `[MABS][${logLabel}] Filtro por herencia dejó 0 nodos; usando árbol previo (revisar herencia en API)`
        );
        return nodes;
    }
    return filtered;
};

type AdminRouteRow = RouteResponse['data'][number];

const filterAdminRoutesByHerenciaConRescate = (
    adminSource: AdminRouteRow[],
    herencia: { idsPermitidos: Set<string>; pathsPermitidos: Set<string> },
    aplicarHerencia: boolean,
    logLabel: string
): AdminRouteRow[] => {
    if (!aplicarHerencia) return adminSource;
    const hasHerencia = herencia.idsPermitidos.size > 0 || herencia.pathsPermitidos.size > 0;
    if (!hasHerencia) return adminSource;
    const filtered = adminSource.filter((r) => {
        const routeId = String(r._id || r.iud || '');
        const rel = toRelativeRoutePath(String(r.path || '').replace(/^\/admin\/?/i, ''));
        const pathCandidates = [
            normalizeRoutePath(String(r.path || '')),
            normalizeRoutePath(`/${rel}`),
            normalizeRoutePath(`/admin/${rel}`),
        ];
        if (herencia.idsPermitidos.has(routeId)) return true;
        return pathCandidates.some((p) => herencia.pathsPermitidos.has(p));
    });
    if (filtered.length === 0 && adminSource.length > 0) {
        console.warn(`[MABS][${logLabel}] Filtro por herencia dejó 0 rutas; usando catálogo admin completo`);
        return adminSource;
    }
    return filtered;
};

const resolveSidebarSourceCollection = (actorTipo: AdminActorTipo): string | null => {
    if (actorTipo === 'SUPERADMIN') return 'rutasSeguridad';
    if (actorTipo === 'GLOBAL') return 'herenciaGlobal';
    if (actorTipo === 'CORPORATIVO') return 'herenciaCorporativa';
    if (actorTipo === 'CLIENTE') return 'herenciaCliente';
    return null;
};

const resolveEffectiveAdminActorTipo = (actorTipo?: string | null): AdminActorTipo => {
    const validActorTipos: string[] = ['SUPERADMIN', 'GLOBAL', 'CORPORATIVO', 'CLIENTE'];
    const actorNormalizado = String(actorTipo || '').trim().toUpperCase();
    if (actorNormalizado && actorNormalizado !== 'UNKNOWN' && validActorTipos.includes(actorNormalizado)) {
        return actorNormalizado as AdminActorTipo;
    }
    return resolveAdminActorTipoFromToken();
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
    try {
        const parts = String(token || '').split('.');
        if (parts.length < 2) return null;
        const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        const decoded = globalThis.atob(padded);
        return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
        return null;
    }
};

/**
 * El token guardado suele ser JWT cifrado (`iv:hex`) por el backend; no es legible con decodeJwtPayload.
 * El login persiste el mismo contexto en `localStorage.user` — úsalo como respaldo para actorTipo / scope.
 */
const readTenantScopeAndRolFromStoredUser = (): {
    tenantScope: {
        tenantCorporativoId?: string;
        tenantGlobalId?: string;
        tenantSuperAdminId?: string;
    };
    rol: string;
} => {
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return { tenantScope: {}, rol: '' };
        const u = JSON.parse(raw) as {
            rol?: string;
            role?: string;
            tenantSuperAdminId?: string | null;
            tenantGlobalId?: string | null;
            tenantCorporativoId?: string | null;
            auth?: {
                tenantScope?: Record<string, string | null | undefined>;
                rolCorporativoScope?: { rolCorporativoId?: string | null };
                afiliadoScope?: { rolCorporativoId?: string | null; marcoId?: string | null };
            };
            rolCorporativoScope?: { rolCorporativoId?: string | null };
            afiliadoScope?: { rolCorporativoId?: string | null; marcoId?: string | null };
            contextoCliente?: unknown;
        };
        const ts = u.auth?.tenantScope;
        const rc = u.auth?.rolCorporativoScope ?? u.rolCorporativoScope;
        const af = u.auth?.afiliadoScope ?? u.afiliadoScope;
        return {
            tenantScope: {
                tenantCorporativoId:
                    String(ts?.tenantCorporativoId ?? u.tenantCorporativoId ?? '').trim() || undefined,
                tenantGlobalId: String(ts?.tenantGlobalId ?? u.tenantGlobalId ?? '').trim() || undefined,
                tenantSuperAdminId:
                    String(ts?.tenantSuperAdminId ?? u.tenantSuperAdminId ?? '').trim() || undefined,
            },
            rol: String(u.rol || u.role || '').trim().toUpperCase(),
            esAfiliadoCliente: Boolean(
                rc?.rolCorporativoId || af?.rolCorporativoId || af?.marcoId || u.contextoCliente
            ),
        };
    } catch {
        return { tenantScope: {}, rol: '', esAfiliadoCliente: false };
    }
};

const resolveAdminActorTipoFromToken = (): AdminActorTipo => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return 'UNKNOWN';

        const payload = decodeJwtPayload(token) as {
            auth?: {
                tenantScope?: Record<string, string | null | undefined>;
                rolCorporativoScope?: { rolCorporativoId?: string };
                afiliadoScope?: { rolCorporativoId?: string; marcoId?: string };
            };
            tenantScope?: Record<string, string | null | undefined>;
            rol?: { rol?: string } | string;
        } | null;
        const jwtTenantScope = payload?.auth?.tenantScope || payload?.tenantScope || {};
        const jwtRol = String(
            (typeof payload?.rol === 'object' ? payload?.rol?.rol : payload?.rol) ?? ''
        )
            .trim()
            .toUpperCase();

        const stored = readTenantScopeAndRolFromStoredUser();
        const tenantScope = {
            tenantCorporativoId:
                String(jwtTenantScope?.tenantCorporativoId ?? '').trim() ||
                String(stored.tenantScope.tenantCorporativoId ?? '').trim(),
            tenantGlobalId:
                String(jwtTenantScope?.tenantGlobalId ?? '').trim() ||
                String(stored.tenantScope.tenantGlobalId ?? '').trim(),
            tenantSuperAdminId:
                String(jwtTenantScope?.tenantSuperAdminId ?? '').trim() ||
                String(stored.tenantScope.tenantSuperAdminId ?? '').trim(),
        };
        const rol = jwtRol || stored.rol;
        const rolCompact = rol.replace(/\s+/g, '');
        const rolEsSuperAdmin =
            rolCompact.includes('SUPERADMIN') ||
            rolCompact.includes('SUPER_ADMIN') ||
            rol === 'SUPERADMIN' ||
            rol === 'SUPER_ADMIN';
        const jwtAfiliado = Boolean(
            payload?.auth?.rolCorporativoScope?.rolCorporativoId ||
                payload?.auth?.afiliadoScope?.rolCorporativoId ||
                payload?.auth?.afiliadoScope?.marcoId
        );
        const actorTipoDetectado = String(tenantScope?.tenantCorporativoId || '').trim()
            ? 'CORPORATIVO'
            : String(tenantScope?.tenantGlobalId || '').trim()
                ? 'GLOBAL'
                : String(tenantScope?.tenantSuperAdminId || '').trim()
                    ? 'SUPERADMIN'
                    : jwtAfiliado || stored.esAfiliadoCliente || rol === 'CLIENTE'
                        ? 'CLIENTE'
                        : rolEsSuperAdmin
                            ? 'SUPERADMIN'
                            : ['DIOS', 'DESAROLLADOR'].includes(rol)
                                ? 'SUPERADMIN'
                                : 'UNKNOWN';

        return actorTipoDetectado as AdminActorTipo;
    } catch {
        return 'UNKNOWN';
    }
};

const SA_JERARQUIA_CORP_CACHE_TTL_MS = 60_000;

/** Cache corto compartido con el mismo payload de `/creacion/usu/tenant/global/selects`. */
let _saPuedeBypassHerenciaCache: { at: number; value: boolean | null } | null = null;

/**
 * `true`: este SA es raíz de jerarquía (`codigoPadre = null` en su fila de tenantjerarquiacounters)
 * y puede saltarse la herencia de vistas, tenga o no corporativo propio asociado.
 * `false`: SA con padre en la jerarquía (rama) → debe respetar la herencia de vistas parametrizada.
 * `null`: no es SA o no se pudo resolver (fail-open: no se aplica el filtro).
 */
const fetchSaPuedeBypassHerencia = async (): Promise<boolean | null> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        if (resolveAdminActorTipoFromToken() !== 'SUPERADMIN') return null;

        const now = Date.now();
        if (
            _saPuedeBypassHerenciaCache &&
            now - _saPuedeBypassHerenciaCache.at < SA_JERARQUIA_CORP_CACHE_TTL_MS
        ) {
            return _saPuedeBypassHerenciaCache.value;
        }

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
        const res = (await apiFetch(`${API_BASE_URL}/config/global/creacion/usu/tenant/global/selects`, {
            method: 'GET',
            useAuth: true,
            logoutOn401: true,
        })) as { data?: { actor?: { saPuedeBypassHerencia?: boolean } } } | null;

        const raw = res?.data?.actor?.saPuedeBypassHerencia;
        const value: boolean | null = typeof raw === 'boolean' ? raw : null;
        _saPuedeBypassHerenciaCache = { at: now, value };
        return value;
    } catch {
        return null;
    }
};

/**
 * SuperAdmin con padre en su jerarquía (`saPuedeBypassHerencia === false`): siempre acotar el
 * menú admin por las vistas heredadas (`getHerenciaAdminPermitida`). Si aún no hay herencias
 * parametrizadas, el conjunto queda vacío → sin ítems (no se usa el catálogo completo).
 *
 * SuperAdmin raíz (`saPuedeBypassHerencia !== false`, incluye null sin resolver): no aplicar
 * este filtro (navegación según catálogo admin). Tener corporativo propio no le quita la raíz.
 *
 * GLOBAL/CORPORATIVO: se exige que la API devuelva al menos una herencia para activar el filtro.
 */
const debeAplicarFiltroHerenciaSuperAdmin = async (
    actorTipo: AdminActorTipo,
    tieneHerenciasEnApi: boolean
): Promise<boolean> => {
    if (actorTipo === 'SUPERADMIN') {
        const puedeBypass = await fetchSaPuedeBypassHerencia();
        return puedeBypass === false;
    }
    if (actorTipo === 'CLIENTE') return tieneHerenciasEnApi;
    if (!tieneHerenciasEnApi) return false;
    return true;
};

const SECURITY_ROUTES_CACHE_TTL_MS = 30_000;
const _securityRoutesCacheByAuth = new Map<
    boolean,
    { promise: Promise<RouteResponse | null>; at: number }
>();

const _fetchAllSecurityRoutesRaw = async (useAuth: boolean): Promise<RouteResponse | null> => {
    try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
        const hasToken = Boolean(localStorage.getItem('token'));
        // Sin JWT el backend rechaza listarRutas/admin; no usar ruta híbrida guardada como excusa.
        const useAdminEndpoint = hasToken && useAuth;
        const endpoint = useAdminEndpoint
            ? `${API_BASE_URL}/seguridad/rutas/listarRutas/admin`
            : `${API_BASE_URL}/seguridad/rutas/listarRutas/public`;

        const authOpts = resolveSeguridadRutasFetchOptions();

        const result: RouteResponse = useAdminEndpoint
            ? await apiFetch(endpoint, {
                method: "GET",
                ...authOpts,
            })
            : await apiFetchPublic(endpoint, {
                method: "GET"
            });
        return result;
    } catch (error) {
        console.error("Error al obtener rutas de seguridad:", error);
        return null;
    }
};

/** Catálogo admin/público con deduplicación de peticiones concurrentes (TTL 30s). */
export const fetchAllSecurityRoutes = async (useAuth: boolean): Promise<RouteResponse | null> => {
    const now = Date.now();
    const cached = _securityRoutesCacheByAuth.get(useAuth);
    if (cached && now - cached.at < SECURITY_ROUTES_CACHE_TTL_MS) {
        return cached.promise;
    }

    const promise = _fetchAllSecurityRoutesRaw(useAuth).then((result) => {
        if (useAuth && (!Array.isArray(result?.data) || result.data.length === 0)) {
            _securityRoutesCacheByAuth.delete(useAuth);
        }
        return result;
    }).catch((err) => {
        if (_securityRoutesCacheByAuth.get(useAuth)?.promise === promise) {
            _securityRoutesCacheByAuth.delete(useAuth);
        }
        throw err;
    });

    _securityRoutesCacheByAuth.set(useAuth, { promise, at: now });
    return promise;
};

type AdminSecurityRouteRow = RouteResponse['data'][number];

const pathCandidatesForSecurityRouteRow = (r: AdminSecurityRouteRow): string[] => {
    const rel = toRelativeRoutePath(String(r.path || '').replace(/^\/admin\/?/i, ''));
    return [
        normalizeRoutePath(String(r.path || '')),
        normalizeRoutePath(`/${rel}`),
        normalizeRoutePath(`/admin/${rel}`),
    ];
};

const securityRouteRowMatchesNormalizedPath = (r: AdminSecurityRouteRow, currentNorm: string): boolean =>
    pathCandidatesForSecurityRouteRow(r).some((p) => p === currentNorm);

const securityRouteRowAllowedByLookup = (
    r: AdminSecurityRouteRow,
    lookup: { ids: Set<string>; paths: Set<string> },
): boolean => {
    const routeId = String(r._id || r.iud || '').trim();
    if (routeId && lookup.ids.has(routeId)) return true;
    return pathCandidatesForSecurityRouteRow(r).some((p) => lookup.paths.has(p));
};

/** Alineado al sidebar admin: SA solo si counters corporativos; Global/Corporativo siempre evalúan herencia. */
const mustEnforceHerenciaForSidebarActor = async (actorTipo: AdminActorTipo): Promise<boolean> => {
    if (actorTipo === 'SUPERADMIN') {
        const puedeBypass = await fetchSaPuedeBypassHerencia();
        return puedeBypass === false;
    }
    if (actorTipo === 'GLOBAL' || actorTipo === 'CORPORATIVO' || actorTipo === 'CLIENTE') return true;
    return false;
};

/**
 * Indica si debe mostrarse aviso de “sin permiso por herencia” en la URL admin actual.
 * Cruza catálogo de rutas de seguridad con vistas heredadas, igual que el filtro del sidebar
 * (sin el rescate de catálogo completo de `getAuthorizedRoutes`).
 */
export const shouldShowAdminHerenciaSinPermisoAlert = async (pathname: string): Promise<boolean> => {
    try {
        if (typeof window === 'undefined') return false;
        const token = localStorage.getItem('token');
        if (!token) return false;

        const currentNorm = normalizeRoutePath(pathname);
        if (!currentNorm.startsWith('/admin')) return false;

        const actorTipo = resolveAdminActorTipoFromToken();
        const enforce = await mustEnforceHerenciaForSidebarActor(actorTipo);
        if (!enforce) return false;

        const [securityResult, herencia] = await Promise.all([
            fetchAllSecurityRoutes(true),
            getHerenciaAdminPermitida(),
        ]);

        if (!securityResult?.success || !Array.isArray(securityResult.data)) return false;

        const adminSource = securityResult.data.filter((r) => r.estadoRuta && isAdminLayout(r.layout));
        const matching = adminSource.filter((r) => securityRouteRowMatchesNormalizedPath(r, currentNorm));
        if (matching.length === 0) return false;

        const hasHerenciaResuelta =
            herencia.idsPermitidos.size > 0 || herencia.pathsPermitidos.size > 0;
        /**
         * Si la API no devolvió vistas heredadas, no bloquear la pantalla: `getAuthorizedRoutes`
         * ya aplica el mismo rescate de catálogo admin (evita 404 + overlay rojo por desalineación de ids).
         */
        if (!hasHerenciaResuelta) return false;

        const securityLookup = buildAllowedRouteLookup(securityResult.data);

        const anyAllowed = matching.some(
            (r) =>
                securityRouteRowAllowedByLookup(r, securityLookup) &&
                securityRouteRowAllowedByLookup(r, {
                    ids: herencia.idsPermitidos,
                    paths: herencia.pathsPermitidos,
                }),
        );

        return !anyAllowed;
    } catch {
        return false;
    }
};

export const getRouteCatalog = async (): Promise<RouteCatalogItem[]> => {
    try {
        const result = await fetchAllSecurityRoutes(true);

        if (!result?.success || !result?.data) {
            return [];
        }

        return result.data
            .filter((r) => r.estadoRuta)
            .map((r) => ({
                iud: String(r.iud || r._id || ''),
                path: normalizeRoutePath(r.path),
                layout: r.layout.replace("/", "").trim(),
                component: String(r.component || '').replace(/\.(jsx|tsx|js|ts)$/i, ""),
                name: r.name,
                icon: r.icon ?? null,
                tipoNodo: r.tipoNodo ?? null,
                tipoNodoId: r.tipoNodoId ?? null,
                accessType: Array.isArray(r.accessType) ? r.accessType : (r.accessType ? [r.accessType] : []),
                mostrarEnNavbarPublico: r.mostrarEnNavbarPublico === true,
                mostrarEnSidebar: r.mostrarEnSidebar === true,
                mostrarEnMenuUsuario: r.mostrarEnMenuUsuario === true,
                tiquetaNavb: String(r.tiquetaNavb || '').trim() || null,
                menuUsuarioLabel: String(r.menuUsuarioLabel || '').trim() || null,
                menuUsuarioOrder: Number(r.menuUsuarioOrder ?? 0),
                formulariosConfig: r.formulariosConfig
                    ? {
                        habilitado: r.formulariosConfig.habilitado === true,
                        modoAsignacion: r.formulariosConfig.modoAsignacion ?? 'NINGUNO',
                        soloDios: r.formulariosConfig.soloDios === true,
                    }
                    : undefined,
            }));
    } catch (error) {
        console.error("Error al obtener catalogo de rutas:", error);
        return [];
    }
};

const normalizeText = (value: string): string =>
    String(value || '').trim().toLowerCase();

/** Quita extensión de archivo del nombre de componente en BD. */
export const stripRouteComponentExtension = (name: string): string =>
    String(name || '').replace(/\.(jsx|tsx|js|ts)$/i, '').replace(/\.+$/, '').trim();

/**
 * Alinea nombres de componente en BD con archivos `.tsx` del frontend.
 * Rutas de perfil de afiliado suelen venir como `UsuariosGobernanza*` sin archivo físico.
 */
export const normalizeAdminRouteComponent = (component: string, path = ''): string => {
    const comp = stripRouteComponentExtension(component);
    const pathNorm = String(path || '').toLowerCase();

    // Los formularios de gobernanza publicados en gobernanzaModuloConfigs son piezas internas:
    // requieren endpoint, menuState y callbacks que una ruta dinamica no puede suministrar.
    // La ruta monta un wrapper sin props y este resuelve tabs/formulario desde la API parametrizada.
    if (/^Tenant[A-Za-z0-9]+Form$/.test(comp) || comp === 'GobernanzaTenantFormByEndpoint') {
        return 'GobernanzaTenantRoutePage';
    }
    if (/^Perm[A-Za-z0-9]+Form$/.test(comp) || comp === 'GobernanzaPermisosFormByEndpoint') {
        return 'GobernanzaPermisosRoutePage';
    }
    if (/^Reglas[A-Za-z0-9]+(?:Form|Panel)$/.test(comp) || comp === 'GobernanzaReglasFormByEndpoint') {
        return 'GobernanzaReglasRoutePage';
    }
    if (comp === 'GobernanzaFormularioPorRuta') {
        if (pathNorm.includes('permiso')) return 'GobernanzaPermisosRoutePage';
        if (pathNorm.includes('regla')) return 'GobernanzaReglasRoutePage';
        return 'GobernanzaTenantRoutePage';
    }

    if (
        pathNorm.includes('perfil-cliente') ||
        pathNorm.includes('mi-perfil') ||
        /(?:^|\/)perfil(?:\/|$)/i.test(pathNorm)
    ) {
        return 'Perfil';
    }
    if (comp === 'ConfiguracionPerfil') return 'Perfil';
    if (/^UsuariosGobernanza/i.test(comp)) {
        return pathNorm.includes('perfil') ? 'Perfil' : 'GestionUsuarios';
    }
    return comp;
};

const toAppRoutePath = (route: RouteCatalogItem): string => {
    const normalizedPath = normalizeRoutePath(route.path);
    if (isAdminLayout(route.layout)) {
        return normalizedPath.startsWith('/admin')
            ? normalizedPath
            : `/admin/${toRelativeRoutePath(normalizedPath)}`;
    }
    return normalizedPath;
};

const findCatalogRoute = (
    catalog: RouteCatalogItem[],
    options: {
        paths?: string[];
        components?: string[];
        names?: string[];
    }
): RouteCatalogItem | undefined => {
    const expectedPaths = new Set((options.paths || []).map((value) => normalizeRoutePath(value)));
    const expectedComponents = new Set((options.components || []).map(normalizeText));
    const expectedNames = new Set((options.names || []).map(normalizeText));

    return catalog.find((route) => {
        const routePath = normalizeRoutePath(route.path);
        const routeComponent = normalizeText(route.component);
        const routeName = normalizeText(route.name);

        return expectedPaths.has(routePath)
            || expectedComponents.has(routeComponent)
            || expectedNames.has(routeName);
    });
};

export const getUserShortcutRoutes = async (): Promise<UserShortcutRoutes> => {
    try {
        const [{ tree }, catalog] = await Promise.all([
            getAdminSidebarTreeWithContext(),
            getRouteCatalog(),
        ]);
        const firstAdminPath = findFirstAuthorizedAdminPath(tree);

        const adminByMenu = catalog.find((route) => route.mostrarEnMenuUsuario && route.tiquetaNavb === 'PANEL_ADMIN');
        const perfilByMenu = catalog.find((route) => route.mostrarEnMenuUsuario && route.tiquetaNavb === 'MI_PERFIL');
        const membresiaByMenu = catalog.find((route) => route.mostrarEnMenuUsuario && route.tiquetaNavb === 'MI_MEMBRESIA');

        const adminRoute = adminByMenu || catalog.find((route) => isAdminLayout(route.layout));

        const perfilRoute = perfilByMenu || findCatalogRoute(catalog, {
            paths: ['/perfil', '/mi-perfil', '/perfil/usuario'],
            components: ['Perfil', 'ConfiguracionPerfil'],
            names: ['Perfil', 'Mi Perfil'],
        });

        const membresiaRoute = membresiaByMenu || findCatalogRoute(catalog, {
            paths: ['/membresia/dashboard', '/mi-membresia'],
            components: ['MembershipDashboard'],
            names: ['Mi Membresía', 'Mi Membresia', 'Membresía', 'Membresia'],
        });

        const resolvedAdmin = firstAdminPath || (adminRoute ? toAppRoutePath(adminRoute) : '') || readCachedPrivateHomeRoute() || '';
        writeCachedPrivateHomeRoute(resolvedAdmin);

        return {
            admin: resolvedAdmin,
            perfil: perfilRoute ? toAppRoutePath(perfilRoute) : '/perfil',
            membresia: membresiaRoute ? toAppRoutePath(membresiaRoute) : '/membresia/dashboard',
        };
    } catch (error) {
        console.error('Error al resolver shortcuts de usuario:', error);
        const cachedAdmin = readCachedPrivateHomeRoute() || '';
        return {
            admin: cachedAdmin,
            perfil: '/perfil',
            membresia: '/membresia/dashboard',
        };
    }
};

type RouteCatalogRow = RouteResponse['data'][number];

const KNOWN_ACCESS_TYPE_CODES = new Set(['PUBLIC', 'PRIVATE', 'AUTH', 'ADMIN']);

/** Resuelve PUBLIC/PRIVATE aunque publicIdMiddleware haya colapsado accessType a UUIDs. */
const resolveRouteAccessTypeCodes = (route: RouteCatalogRow): string[] => {
    if (Array.isArray(route.accessTypeCodes) && route.accessTypeCodes.length > 0) {
        return route.accessTypeCodes
            .map((code) => String(code || '').trim().toUpperCase())
            .filter(Boolean);
    }

    const raw = Array.isArray(route.accessType)
        ? route.accessType
        : route.accessType
            ? [route.accessType]
            : [];

    const fromAccessType = raw
        .map((entry) => {
            if (typeof entry === 'string') {
                const code = entry.trim().toUpperCase();
                return KNOWN_ACCESS_TYPE_CODES.has(code) ? code : '';
            }
            return String((entry as { accessType?: string })?.accessType || '').trim().toUpperCase();
        })
        .filter(Boolean);

    if (fromAccessType.length > 0) {
        return [...new Set(fromAccessType)];
    }

    const fallback: string[] = [];
    if (route.renderTag === 'publico-view' || route.mostrarEnNavbarPublico === true) {
        fallback.push('PUBLIC');
    }
    if (route.renderTag === 'private-view' || route.mostrarEnSidebar === true) {
        fallback.push('PRIVATE');
    }
    return [...new Set(fallback)];
};

const routeHasPublicAccess = (route: RouteCatalogRow): boolean =>
    resolveRouteAccessTypeCodes(route).includes('PUBLIC');

const routeHasPrivateAccess = (route: RouteCatalogRow): boolean =>
    resolveRouteAccessTypeCodes(route).some((code) =>
        code === 'PRIVATE' || code === 'AUTH' || code === 'ADMIN'
    );

const isHybridSecurityRoute = (route: RouteCatalogRow): boolean =>
    route.estadoRuta === true && routeHasPublicAccess(route) && routeHasPrivateAccess(route);

const isPublicCatalogRoute = (route: RouteCatalogRow): boolean => {
    if (!route.estadoRuta || isHybridSecurityRoute(route)) return false;
    if (!routeHasPublicAccess(route)) return false;
    if (normalizeLayout(route.layout) === 'publiclayout') return true;
    return route.mostrarEnNavbarPublico === true || route.renderTag === 'publico-view';
};

/** Híbrida expuesta en navbar/footer de tienda: conserva PublicLayout aunque haya sesión. */
const isStorefrontHybridRoute = (route: RouteCatalogRow): boolean => {
    if (!isHybridSecurityRoute(route)) return false;
    const path = normalizeRoutePath(String(route.path || '')).toLowerCase();
    if (path.startsWith('/public/')) return true;
    return route.mostrarEnNavbarPublico === true || route.renderTag === 'publico-view';
};

const mergeRouteCatalogRow = (adminRow: RouteCatalogRow, publicRow: RouteCatalogRow): RouteCatalogRow => {
    const merged: RouteCatalogRow = { ...adminRow, ...publicRow };
    merged.mostrarEnSidebar = adminRow.mostrarEnSidebar === true || publicRow.mostrarEnSidebar === true;
    merged.mostrarEnNavbarPublico =
        adminRow.mostrarEnNavbarPublico === true || publicRow.mostrarEnNavbarPublico === true;
    merged.mostrarEnMenuUsuario =
        adminRow.mostrarEnMenuUsuario === true || publicRow.mostrarEnMenuUsuario === true;

    const accessCodes = [
        ...new Set([
            ...resolveRouteAccessTypeCodes(adminRow),
            ...resolveRouteAccessTypeCodes(publicRow),
        ]),
    ];
    if (accessCodes.length > 0) {
        merged.accessTypeCodes = accessCodes;
    }

    return merged;
};

const mergeRouteCatalogRows = (
    adminRows: RouteCatalogRow[] = [],
    publicRows: RouteCatalogRow[] = [],
): RouteCatalogRow[] => {
    const byPath = new Map<string, RouteCatalogRow>();
    [...adminRows, ...publicRows].forEach((route) => {
        const key = normalizeRoutePath(String(route.path || ''));
        if (!key || key === '/') return;
        const prev = byPath.get(key);
        byPath.set(key, prev ? mergeRouteCatalogRow(prev, route) : route);
    });
    return Array.from(byPath.values());
};

const fetchMergedSecurityRouteCatalog = async (useAuth: boolean): Promise<RouteCatalogRow[]> => {
    if (!useAuth) {
        const publicResult = await fetchAllSecurityRoutes(false);
        return publicResult?.data ?? [];
    }
    const [adminResult, publicResult] = await Promise.all([
        fetchAllSecurityRoutes(true),
        fetchAllSecurityRoutes(false),
    ]);
    return mergeRouteCatalogRows(adminResult?.data, publicResult?.data);
};

export const getAuthorizedRoutes = async (): Promise<AuthorizedRoutes> => {
    try {
        const token = localStorage.getItem("token");
        const hasToken = Boolean(token);
        const actorTipo = resolveAdminActorTipoFromToken();

        const catalogRows = await fetchMergedSecurityRouteCatalog(hasToken);
        if (!catalogRows.length) {
            return { publicRoutes: [], adminRoutes: [], authRoutes: [], hybridStorefrontRoutes: [], hybridAdminShellRoutes: [] };
        }

        const normalizeComponent = (name: string, path = '') =>
            normalizeAdminRouteComponent(name, path);

        const mapRowToRouteConfig = (r: RouteCatalogRow) => ({
            path: toRelativeRoutePath(r.path),
            component: normalizeComponent(r.component, r.path),
        });

        const hybridStorefrontRoutes = catalogRows
            .filter(isStorefrontHybridRoute)
            .map(mapRowToRouteConfig);

        const hybridAdminShellRoutes = catalogRows
            .filter((route) => isHybridSecurityRoute(route) && !isStorefrontHybridRoute(route))
            .map(mapRowToRouteConfig);

        const hybridPaths = new Set([
            ...hybridStorefrontRoutes.map((r) => r.path),
            ...hybridAdminShellRoutes.map((r) => r.path),
        ]);

        // PUBLIC: layout público clásico + rutas del navbar con renderTag publico-view
        const publicRoutes = catalogRows
            .filter(isPublicCatalogRoute)
            .map(mapRowToRouteConfig);

        // AUTH
        const authRoutes = catalogRows
            .filter(r => r.estadoRuta && normalizeLayout(r.layout) === "authlayout" && !hybridPaths.has(toRelativeRoutePath(r.path)))
            .map(mapRowToRouteConfig);

        // ADMIN: priorizar el arbol autorizado backend para evitar desalineacion
        // entre sidebar y rutas registradas en React Router.
        let adminRoutes: AdminRouteConfig[] = [];
        if (hasToken) {
            const adminResult = await fetchAllSecurityRoutes(true);
            const adminResultData = adminResult?.data;
            const adminCatalogRows = (adminResultData && adminResultData.length > 0) ? adminResultData : catalogRows;
            const [{ tree }, herencia] = await Promise.all([
                getAdminSidebarTreeWithContext(),
                getHerenciaAdminPermitida(),
            ]);

            const mapNode = (node: AdminNavTreeItem): AdminRouteConfig => ({
                path: toRelativeRoutePath(node.path.replace(/^\/admin\/?/i, '')),
                component: normalizeComponent(node.component, node.path),
                ...(node.children?.length ? { children: node.children.map(mapNode) } : {}),
            });

            if (tree.length > 0) {
                adminRoutes = tree.map(mapNode);
            }

            const adminSource = adminCatalogRows.filter((r) => r.estadoRuta && isAdminLayout(r.layout));
            const hasHerenciaAdmin = herencia.idsPermitidos.size > 0 || herencia.pathsPermitidos.size > 0;
            const aplicarHerencia = await debeAplicarFiltroHerenciaSuperAdmin(actorTipo, hasHerenciaAdmin);
            const filtrarPorHerencia = aplicarHerencia && hasHerenciaAdmin;
            let adminFiltrado = filtrarPorHerencia
                ? adminSource.filter((r) => {
                    const routeId = String(r._id || r.iud || "");
                    if (herencia.idsPermitidos.has(routeId)) return true;
                    const rel = toRelativeRoutePath(String(r.path || '').replace(/^\/admin\/?/i, ''));
                    const pathCandidates = [
                      normalizeRoutePath(r.path),
                      normalizeRoutePath(`/${rel}`),
                      normalizeRoutePath(`/admin/${rel}`),
                    ];
                    return pathCandidates.some((p) => herencia.pathsPermitidos.has(p));
                })
                : actorTipo === 'SUPERADMIN'
                  ? adminSource
                  : [];

            /**
             * Si jerarquía obliga filtro pero IDs/rutas no alinean con listado de herencias (p. ej. path con/sin /admin),
             * quedaría 0 rutas → React Router no registra /admin y cualquier URL muestra 404 real.
             * Rescate: catálogo admin completo (mismo criterio que si no hubiera herencia en API).
             */
            if (filtrarPorHerencia && adminFiltrado.length === 0 && adminSource.length > 0) {
                console.warn(
                    '[MABS][getAuthorizedRoutes] Filtro por herencia dejó 0 rutas; usando catálogo admin completo como respaldo',
                    { actorTipo, hasHerenciaAdmin, herenciaIds: herencia.idsPermitidos.size, herenciaPaths: herencia.pathsPermitidos.size }
                );
                adminFiltrado = adminSource;
            }

            if (tree.length === 0) {
                adminRoutes = adminFiltrado.map((r) => ({
                    path: toRelativeRoutePath(String(r.path || '').replace(/^\/admin\/?/i, '')),
                    component: normalizeComponent(r.component, r.path),
                }));
            } else {
                const existingPaths = new Set(
                    flattenAdminRoutes(adminRoutes).map((route) => normalizeRoutePath(`/admin/${route.path.replace(/^\//, '')}`))
                );

                const rutasFaltantes = adminFiltrado
                    .map((r) => ({
                        path: toRelativeRoutePath(String(r.path || '').replace(/^\/admin\/?/i, '')),
                        component: normalizeComponent(r.component, r.path),
                    }))
                    .filter((r) => {
                        const normalized = normalizeRoutePath(`/admin/${String(r.path || '').replace(/^\//, '')}`);
                        return r.path && !existingPaths.has(normalized);
                    });

                if (rutasFaltantes.length) {
                    adminRoutes = [...adminRoutes, ...rutasFaltantes];
                }
            }

        }

        return { publicRoutes, authRoutes, adminRoutes, hybridStorefrontRoutes, hybridAdminShellRoutes };

    } catch (error) {
        console.error("Error al obtener rutas autorizadas:", error);
        return { publicRoutes: [], adminRoutes: [], authRoutes: [], hybridStorefrontRoutes: [], hybridAdminShellRoutes: [] };
    }
};

/** Navbar público: Home → Quiénes somos → Productos → Modelo negocios → Contacto → resto. */
const accentFoldNavbar = (s: string): string =>
    String(s ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

const navbarFlatSlug = (s: string): string => accentFoldNavbar(s).replace(/[^a-z0-9]/gi, '');

type SecurityRouteRow = RouteResponse['data'][number];

const canonicalGuestPublicNavbarRank = (
    rawPath: string,
    routeName: string,
    navTag: string | null | undefined,
    componentRaw: string | null | undefined,
): number => {
    const pathNorm = accentFoldNavbar(normalizeRoutePath(rawPath));
    const pathSlug = navbarFlatSlug(pathNorm);

    const compSlug = navbarFlatSlug(String(componentRaw ?? '').replace(/\.(tsx|jsx|ts|js)$/i, ''));
    const lblSlug = navbarFlatSlug(`${routeName ?? ''}${navTag ?? ''}`);

    const homeHit =
        pathNorm === '/' ||
        pathNorm.endsWith('/home') ||
        pathNorm.includes('/render/home') ||
        /^(home|inicio)$/i.test(compSlug) ||
        pathSlug.endsWith('home') ||
        pathSlug.includes('renderhome');
    if (homeHit) return 0;

    const aboutHit =
        /sobre.?nosotros|quienes.?somos|about.?us|\b(sobre\s+nosotros|quiene?s\s+somos)\b/i.test(
            pathNorm.replace(/\//g, ' '),
        ) ||
        /sobre.?nosotros|quienes.?somos|aboutus|\b(sobre\s+nosotros|quiene?s\s+somos)\b/i.test(
            `${routeName ?? ''} ${navTag ?? ''}`,
        ) ||
        (/sobre.*nosotros|quien.*somos|sobrenostros|quienessomos|aboutus/).test(compSlug)
        || (/nosotros|quienessomos|sobrenostros|about/).test(pathSlug || lblSlug);
    if (aboutHit) return 1;

    const modeloSlugHit =
        (compSlug.includes('modelo') && compSlug.includes('negoci'))
        || (/modelonegoci|modelodenegoci|modeloneg/).test(compSlug + pathSlug)
        || (/modelo.*negoci|negoci.*modelo/).test(compSlug || pathSlug || lblSlug);
    if (modeloSlugHit) return 3;

    const productHit =
        (compSlug.includes('productos') && !/(modeloadmin|admproduct)/i.test(compSlug))
        || compSlug.includes('catalogo')
        || pathSlug.includes('productos')
        || lblSlug.includes('productos');
    if (productHit) return 2;

    const contactHit =
        /\b(contacto|contáctanos|contactanos)\b/i.test(`${routeName ?? ''} ${navTag ?? ''}`)
        || /contact(o|anos|enos)?|^contact$/i.test(pathNorm.replace(/\//g, ''))
        || compSlug.includes('contacto')
        || pathSlug.includes('contacto')
        || (/contact/.test(pathSlug) && !/contract/.test(pathSlug));

    if (contactHit) return 4;

    return 100;
};

const compareGuestPublicNavbar = (a: SecurityRouteRow, b: SecurityRouteRow): number => {
    const ia = canonicalGuestPublicNavbarRank(a.path, a.name, a.tiquetaNavb, a.component);
    const ib = canonicalGuestPublicNavbarRank(b.path, b.name, b.tiquetaNavb, b.component);
    if (ia !== ib) return ia - ib;

    const oa = a.order ?? 0;
    const ob = b.order ?? 0;
    if (oa !== ob) return oa - ob;

    return accentFoldNavbar(normalizeRoutePath(a.path)).localeCompare(
        accentFoldNavbar(normalizeRoutePath(b.path)),
    );
};

/** Usuario afiliado / rol corporativo con sesión (no debe ver navbar de invitado). */
export const esUsuarioRolCorporativoAutenticado = (): boolean => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    const stored = readTenantScopeAndRolFromStoredUser();
    if (stored.esAfiliadoCliente) return true;
    if (String(stored.tenantScope.tenantCorporativoId || '').trim()) return true;

    try {
        const payload = decodeJwtPayload(token) as {
            auth?: {
                rolCorporativoScope?: { rolCorporativoId?: string | null };
                afiliadoScope?: { rolCorporativoId?: string | null; marcoId?: string | null };
                tenantScope?: { tenantCorporativoId?: string | null };
            };
        } | null;
        const auth = payload?.auth;
        if (String(auth?.rolCorporativoScope?.rolCorporativoId || '').trim()) return true;
        if (String(auth?.afiliadoScope?.rolCorporativoId || auth?.afiliadoScope?.marcoId || '').trim()) {
            return true;
        }
        if (String(auth?.tenantScope?.tenantCorporativoId || '').trim()) return true;
    } catch {
        /* ignore */
    }

    return false;
};

/**
 * Rutas del navbar horizontal (público y privado usan la misma lógica de catálogo público).
 */
export const getNavbarNavigationRoutes = async (_isAuthenticated: boolean = false): Promise<PublicNavItem[]> =>
    getPublicNavigationRoutes();

const isRouteVisibleInPublicNavbar = (route: RouteCatalogRow): boolean => {
    if (!route.estadoRuta) return false;

    const accessTypes = resolveRouteAccessTypeCodes(route);
    if (accessTypes.length === 0) return false;

    const hasPublic = accessTypes.includes('PUBLIC');
    const hasPrivate =
        accessTypes.includes('PRIVATE') ||
        accessTypes.includes('AUTH') ||
        accessTypes.includes('ADMIN');
    const isHybrid = hasPublic && hasPrivate;

    if (!hasPublic || route.mostrarEnNavbarPublico !== true) return false;
    if (route.mostrarEnSidebar === true && !isHybrid) return false;
    return true;
};

export const getPublicNavigationRoutes = async (): Promise<PublicNavItem[]> => {
    try {
        const catalogRows = await fetchMergedSecurityRouteCatalog(false);

        if (!catalogRows.length) {
            return [];
        }

        return catalogRows
            .filter(isRouteVisibleInPublicNavbar)
            .sort(compareGuestPublicNavbar)
            .map((route) => ({
                path: normalizeRoutePath(route.path),
                label: route.name,
                order: route.order ?? 0,
            }));
    } catch (error) {
        console.error("Error al obtener rutas de navegacion publica:", error);
        return [];
    }
};

export const getFooterPublicRoutes = async (): Promise<FooterNavItem[]> => {
    try {
        const items = await getPublicNavigationRoutes();
        return items
            .filter((item) => normalizeRoutePath(item.path) !== '/')
            .map((item) => ({
                path: item.path,
                label: item.label,
                order: item.order ?? 0,
            }));
    } catch (error) {
        console.error("Error al obtener rutas para footer:", error);
        return [];
    }
};

export const getAdminSidebarRoutes = async (): Promise<AdminNavItem[]> => {
    try {
        const token = localStorage.getItem("token");
        if (!token) return [];
        const actorTipo = resolveAdminActorTipoFromToken();

        const [result, herencia] = await Promise.all([
            fetchAllSecurityRoutes(true),
            getHerenciaAdminPermitida()
        ]);

        if (!result?.success || !Array.isArray(result?.data)) return [];

        const adminSource = result.data.filter((r) => r.estadoRuta && isAdminLayout(r.layout));
        const hasHerenciaAdmin = herencia.idsPermitidos.size > 0 || herencia.pathsPermitidos.size > 0;
        const aplicarHerencia = await debeAplicarFiltroHerenciaSuperAdmin(actorTipo, hasHerenciaAdmin);
        const isSuperadmin = actorTipo === 'SUPERADMIN';
        const filtrarPorHerencia = aplicarHerencia && hasHerenciaAdmin;
        const resultado = filtrarPorHerencia
            ? filterAdminRoutesByHerenciaConRescate(adminSource, herencia, true, 'getAdminSidebarRoutes')
            : isSuperadmin
                ? adminSource
                : [];

        return resultado
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((r) => ({
                path: normalizeRoutePath(r.path),
                label: r.name,
                component: normalizeAdminRouteComponent(r.component, r.path),
                order: r.order ?? 0
            }));
    } catch (error) {
        console.error("Error al obtener menu Admin por herencia:", error);
        return [];
    }
};

const mapTreeNodes = (nodes: RouteTreeResponse['data']): AdminNavTreeItem[] => {
    const mapper = (node: any): AdminNavTreeItem => ({
        id: String(node?._id || node?.iud || ''),
        path: normalizeRoutePath(node?.path || ''),
        label: String(node?.name || ''),
        component: normalizeAdminRouteComponent(String(node?.component || ''), normalizeRoutePath(node?.path || '')),
        order: Number(node?.order ?? 0),
        tipoNodo: String(node?.tipoNodoId?.codigo || node?.tipoNodo || '').toUpperCase(),
        children: Array.isArray(node?.children) ? node.children.map(mapper) : []
    });

    return Array.isArray(nodes)
        ? nodes.map(mapper).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        : [];
};

export const getAdminSidebarTree = async (): Promise<AdminNavTreeItem[]> => {
    const context = await getAdminSidebarTreeWithContext();
    return context.tree;
};

export const getAdminSidebarFallbackTree = async (actorTipo: AdminActorTipo): Promise<AdminNavTreeItem[]> => {
    try {
        const token = localStorage.getItem("token");
        if (!token) return [];
        const effectiveActorTipo = resolveEffectiveAdminActorTipo(actorTipo);

        const [result, herencia] = await Promise.all([
            fetchAllSecurityRoutes(true),
            getHerenciaAdminPermitida()
        ]);

        if (!result?.success || !Array.isArray(result?.data)) return [];

        const adminSource = result.data.filter((r) =>
            r.estadoRuta &&
            isAdminLayout(r.layout) &&
            r.mostrarEnSidebar !== false
        );

        const hasHerenciaAdmin = herencia.idsPermitidos.size > 0 || herencia.pathsPermitidos.size > 0;
        const aplicarHerencia = await debeAplicarFiltroHerenciaSuperAdmin(effectiveActorTipo, hasHerenciaAdmin);
        const isSuperAdminEff = effectiveActorTipo === 'SUPERADMIN';
        const filtrarPorHerencia = aplicarHerencia && hasHerenciaAdmin;
        const visibles = filtrarPorHerencia
            ? filterAdminRoutesByHerenciaConRescate(adminSource, herencia, true, 'getAdminSidebarFallbackTree')
            : isSuperAdminEff
                ? adminSource
                : [];

        if (!visibles.length) return [];

        const nodesById = new Map<string, AdminNavTreeItem>();
        visibles.forEach((route) => {
            const id = String(route._id || route.iud || '').trim();
            if (!id) return;
            nodesById.set(id, {
                id,
                path: normalizeRoutePath(route.path),
                label: String(route.name || '').trim(),
                component: String(route.component || '').replace(/\.(jsx|tsx|js|ts)$/i, ''),
                order: Number(route.order ?? 0),
                tipoNodo: String(route.tipoNodo || 'FORMULARIO').toUpperCase(),
                children: []
            });
        });

        const roots: AdminNavTreeItem[] = [];
        visibles.forEach((route) => {
            const id = String(route._id || route.iud || '').trim();
            const currentNode = nodesById.get(id);
            if (!currentNode) return;

            const parentRaw = route.padreId;
            const parentId = typeof parentRaw === 'string'
                ? String(parentRaw).trim()
                : String(parentRaw?._id || parentRaw?.iud || '').trim();

            if (parentId && nodesById.has(parentId)) {
                nodesById.get(parentId)?.children.push(currentNode);
            } else if (parentId && effectiveActorTipo === 'SUPERADMIN') {
                roots.push(currentNode);
            } else if (!parentId) {
                roots.push(currentNode);
            }
        });

        const sortTree = (items: AdminNavTreeItem[]): void => {
            items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            items.forEach((item) => sortTree(item.children || []));
        };
        sortTree(roots);

        return filterRootsByActorTipo(roots, effectiveActorTipo);
    } catch (error) {
        console.error("Error al construir arbol fallback admin dinamico:", error);
        return [];
    }
};

// ─── Caché singleton del árbol del sidebar ───────────────────────────────────
// Todas las llamadas concurrentes comparten el mismo Promise en vuelo.
// TTL de 30s: suficiente para deduplicar la carga inicial, corto para no
// bloquear cambios hechos desde el panel de gestión de rutas.
// Los errores NO se cachean: si el fetch falla, la próxima llamada reintenta.
const SIDEBAR_CACHE_TTL_MS = 30_000;
let _sidebarCache: { promise: Promise<AdminSidebarTreeContext>; at: number } | null = null;

export const invalidateSidebarCache = (): void => {
    _sidebarCache = null;
    _securityRoutesCacheByAuth.clear();
};

// Limpia todos los caches de sesión al hacer logout.
// Llama esto antes de navegar a la ruta de logout para evitar que
// rutas stale del usuario anterior aparezcan en la siguiente sesión.
export const clearSessionCaches = (): void => {
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem(PRIVATE_HOME_ROUTE_CACHE_KEY);
    }
    clearHybridSpaPath();
    _sidebarCache = null;
    _securityRoutesCacheByAuth.clear();
    _saPuedeBypassHerenciaCache = null;
    invalidateSplashLogoCache();
};

const _fetchSidebarTreeWithContext = async (): Promise<AdminSidebarTreeContext> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return { actorTipo: 'UNKNOWN', sourceCollection: null, tree: [] };
        const actorTipoJwt = resolveAdminActorTipoFromToken();

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
        const [treeResult, securityRoutesResult] = await Promise.all([
            apiFetch(`${API_BASE_URL}/seguridad/rutas/listarRutas/arbol/admin`, {
                method: 'GET',
                useAuth: true,
                logoutOn401: true
            }),
            fetchAllSecurityRoutes(true)
        ]);

        if (treeResult?.success && Array.isArray(treeResult?.data)) {
            const actorTipoBackend = String(treeResult?.actorTipo || '').trim().toUpperCase() as AdminActorTipo;
            const actorTipo = actorTipoJwt === 'UNKNOWN' ? resolveEffectiveAdminActorTipo(actorTipoBackend) : actorTipoJwt;
            const sourceCollection = resolveSidebarSourceCollection(actorTipo);
            const securityLookup = buildAllowedRouteLookup(securityRoutesResult?.data);
            const rawMapped = mapTreeNodes(treeResult.data);
            let filteredTree = filterRootsByActorTipo(rawMapped, actorTipo);

            const flattenNodes = (nodes: AdminNavTreeItem[]): AdminNavTreeItem[] =>
                nodes.flatMap((n) => [n, ...flattenNodes(n.children || [])]);

            if (actorTipo === 'SUPERADMIN') {
                filteredTree = filterTreeByAllowedRoutes(filteredTree, securityLookup.ids, securityLookup.paths);
                const puedeBypassSa = await fetchSaPuedeBypassHerencia();
                if (puedeBypassSa === false) {
                    const herenciaSa = await getHerenciaAdminPermitida();
                    filteredTree = filterTreeByHerenciaConRescate(
                        filteredTree,
                        herenciaSa,
                        'getAdminSidebarTree'
                    );
                }
            }

            if (actorTipo === 'GLOBAL' || actorTipo === 'CORPORATIVO' || actorTipo === 'CLIENTE') {
                const herencia = await getHerenciaAdminPermitida();
                filteredTree = filterTreeByHerenciaConRescate(filteredTree, herencia, 'getAdminSidebarTree');
                filteredTree = filterTreeByAllowedRoutes(filteredTree, securityLookup.ids, securityLookup.paths);
            }

            return { actorTipo, sourceCollection, tree: filteredTree };
        }
        const actorTipo = actorTipoJwt;
        return { actorTipo, sourceCollection: resolveSidebarSourceCollection(actorTipo), tree: [] };
    } catch (error) {
        console.error('Error al obtener arbol admin por contexto:', error);
        const actorTipo = resolveAdminActorTipoFromToken();
        return { actorTipo, sourceCollection: resolveSidebarSourceCollection(actorTipo), tree: [] };
    }
};

export const getAdminSidebarTreeWithContext = async (): Promise<AdminSidebarTreeContext> => {
    const now = Date.now();
    if (_sidebarCache && now - _sidebarCache.at < SIDEBAR_CACHE_TTL_MS) {
        return _sidebarCache.promise;
    }
    const promise = _fetchSidebarTreeWithContext().catch((err) => {
        _sidebarCache = null; // no cachear errores
        throw err;
    });
    _sidebarCache = { promise, at: now };
    return promise;
};

export const getPrivateHomeRoute = async (): Promise<string> => {
    try {
        const shortcuts = await getUserShortcutRoutes();
        if (shortcuts.admin?.trim()) {
            writeCachedPrivateHomeRoute(shortcuts.admin);
            return shortcuts.admin;
        }
        const cached = readCachedPrivateHomeRoute();
        return cached || "";
    } catch (_error) {
        const cached = readCachedPrivateHomeRoute();
        return cached || "";
    }
};

/**
 * Retorna la ruta home del panel admin si el catálogo del usuario incluye
 * al menos una ruta con layout admin; de lo contrario retorna null.
 * No depende de roles hardcodeados: la decisión la toma el backend según el JWT.
 */
export const getAdminHomeRoute = async (): Promise<string | null> => {
    try {
        const { tree } = await getAdminSidebarTreeWithContext();
        const treeHome = findFirstAuthorizedAdminPath(tree);
        if (treeHome) {
            writeCachedPrivateHomeRoute(treeHome);
            return treeHome;
        }

        const catalog = await getRouteCatalog();
        if (!catalog.length) return null;

        const adminEntry =
            catalog.find((r) => r.mostrarEnMenuUsuario && r.tiquetaNavb === 'PANEL_ADMIN') ||
            catalog.find((r) => isAdminLayout(r.layout));

        const resolved = adminEntry ? toAppRoutePath(adminEntry) : null;
        writeCachedPrivateHomeRoute(resolved);
        return resolved;
    } catch {
        return null;
    }
};

/**
 * Retorna los ítems del menú de usuario desde el endpoint de menu-tags,
 * que aplica la lógica de alcance (SuperAdmin, TenantGlobal, TenantCorporativo, General).
 */
export const getMenuUsuarioRoutes = async (): Promise<MenuUsuarioItem[]> => {
    try {
        const result = await fetchResolvedMenuTags('USER_DROPDOWN');

        if (!result?.success || !Array.isArray(result?.data)) return [];

        const items = result.data
            .filter((t: any) => t?.estado !== false)
            .map((t: any) => ({
                key: String(t.codigo || t.iud || ''),
                label: String(t.label || t.nombreTag || ''),
                path: String(t.routePath || t.ruta?.path || '/'),
                icon: t.iconKey ?? null,
                order: Number(t.order ?? 0),
            }));
        return items;
    } catch {
        return [];
    }
};
