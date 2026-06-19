import type { LucideIcon } from 'lucide-react';
import {
  BadgeDollarSign,
  Boxes,
  ClipboardList,
  FileSearch,
  PackageSearch,
  Settings2,
  SlidersHorizontal,
  Warehouse,
} from 'lucide-react';
import { isOpaqueDocumentId, normalizePublicIdForApi } from '@/app/utils/entityPublicId';

/** Valores de pestaña del módulo Inventario (única fuente de verdad). */
export type InventarioTabValue =
  | 'stock'
  | 'movimientos'
  | 'orden-compras'
  | 'ajustes'
  | 'bodegas'
  | 'conciliacion'
  | 'config'
  | 'trm';

export const INVENTARIO_ADMIN_BASE = '/admin/inventarios/administracion';

export type InventarioModuloCatalogo = {
  tab: InventarioTabValue;
  /** Etiqueta corta (menú superior). */
  label: string;
  /** Texto para tarjeta en ConfigInventario; si no existe, no se muestra en la rejilla de accesos. */
  cardDescription?: string;
  /** Segmento bajo `INVENTARIO_ADMIN_BASE` (sin slashes laterales). */
  pathSegment: string;
  icon: LucideIcon;
  /** Orden en menú y en tarjetas. */
  orden: number;
};

const pathAbs = (pathSegment: string): string =>
  pathSegment.startsWith('/') ? pathSegment : `${INVENTARIO_ADMIN_BASE}/${pathSegment}`;

/**
 * Catálogo de secciones. Para hacerlo “dinámico” desde API en el futuro:
 * - Sustituye o fusiona este arreglo con la respuesta del backend (misma forma).
 * - Resuelve `icon` en el cliente con un mapa `iconKey -> LucideIcon` si el servidor solo envía string.
 */
export const INVENTARIO_MODULOS_CATALOGO: InventarioModuloCatalogo[] = [
  {
    tab: 'stock',
    label: 'Stock',
    cardDescription: 'Consulta saldos, kardex por SKU y disponibilidad por bodega.',
    pathSegment: 'stock',
    icon: PackageSearch,
    orden: 10,
  },
  {
    tab: 'movimientos',
    label: 'Movimientos',
    cardDescription: 'Parametriza tipos de movimiento y registra entradas o salidas.',
    pathSegment: 'movimientos',
    icon: SlidersHorizontal,
    orden: 20,
  },
  {
    tab: 'orden-compras',
    label: 'Orden/compras',
    cardDescription: 'Configura proveedores, documentos de soporte y recepciones.',
    pathSegment: 'orden-compras',
    icon: ClipboardList,
    orden: 30,
  },
  {
    tab: 'ajustes',
    label: 'Ajustes',
    cardDescription: 'Administra solicitudes de ajuste y aprobaciones de inventario.',
    pathSegment: 'ajustes',
    icon: Settings2,
    orden: 40,
  },
  {
    tab: 'bodegas',
    label: 'Bodegas',
    cardDescription: 'Crea, edita o desactiva bodegas operativas.',
    pathSegment: 'bodegas',
    icon: Warehouse,
    orden: 50,
  },
  {
    tab: 'conciliacion',
    label: 'Conciliacion DIAN',
    cardDescription: 'Revisa cruces entre factura, recepcion y kardex contable.',
    pathSegment: 'conciliacion',
    icon: FileSearch,
    orden: 60,
  },
  {
    tab: 'config',
    label: 'Configuracion',
    pathSegment: 'config',
    icon: Boxes,
    orden: 70,
  },
  {
    tab: 'trm',
    label: 'Configuracion TRM',
    cardDescription: 'Parametriza moneda, conversiones y fuentes de tasa.',
    pathSegment: 'configuracion-trm',
    icon: BadgeDollarSign,
    orden: 80,
  },
];

export const inventarioModulosOrdenados = (): InventarioModuloCatalogo[] =>
  [...INVENTARIO_MODULOS_CATALOGO].sort((a, b) => a.orden - b.orden);

/** Contexto mínimo del usuario/JWT para filtrar pestañas (evita import circular con `User`). */
export type InventarioJwtScopeUserLike = {
  tenantSuperAdminId?: string | null;
  tenantGlobalId?: string | null;
  tenantCorporativoId?: string | null;
  auth?: {
    tenantScope?: {
      tenantSuperAdminId?: string | null;
      tenantGlobalId?: string | null;
      tenantCorporativoId?: string | null;
    };
  };
};

/** Hay al menos un ancla de tenant en sesión (JWT + perfil). */
export const inventarioUsuarioTieneAnclaScope = (user: InventarioJwtScopeUserLike | null | undefined): boolean => {
  const ts = user?.auth?.tenantScope || {};
  return Boolean(
    String(user?.tenantSuperAdminId || ts.tenantSuperAdminId || '').trim()
    || String(user?.tenantGlobalId || ts.tenantGlobalId || '').trim()
    || String(user?.tenantCorporativoId || ts.tenantCorporativoId || '').trim()
  );
};

/** Pestaña visible en menú (sin filtro por alcance de tenant). */
export const inventarioTabVisibleSegunJwt = (
  _tab: InventarioTabValue,
  _user: InventarioJwtScopeUserLike | null | undefined,
): boolean => true;

/**
 * Pestañas visibles en el menú superior (orden del catálogo).
 * Excluye `config`: la parametrización amplia de inventario no se muestra en la barra de pestañas.
 */
export const inventarioTabsDesdeCatalogo = (): Array<{ value: InventarioTabValue; label: string }> =>
  inventarioModulosOrdenados()
    .filter((m) => m.tab !== 'config')
    .map(({ tab, label }) => ({ value: tab, label }));

/** Pestañas del menú superior desde catálogo (sin filtro por tenant). */
export const inventarioTabsParaMenuConJwt = (
  user: InventarioJwtScopeUserLike | null | undefined,
): Array<{ value: InventarioTabValue; label: string }> =>
  inventarioTabsDesdeCatalogo().filter((t) => inventarioTabVisibleSegunJwt(t.value, user));

/** `tenantSuperAdminId` del JWT para GET de tarjetas dinámicas (`/config/tarjetas`). */
export const inventarioTenantSuperAdminIdDesdeUsuario = (
  user: InventarioJwtScopeUserLike | null | undefined,
): string | undefined => {
  const ts = user?.auth?.tenantScope || {};
  const sa = normalizePublicIdForApi(user?.tenantSuperAdminId || ts.tenantSuperAdminId);
  return isOpaqueDocumentId(sa) ? sa : undefined;
};

const TAB_VALUES = new Set<InventarioTabValue>([
  'stock', 'movimientos', 'orden-compras', 'ajustes', 'bodegas', 'conciliacion', 'config', 'trm',
]);

const tabValueDesdeTarjeta = (tab: string | null | undefined): InventarioTabValue | null => {
  const t = String(tab || '').trim() as InventarioTabValue;
  return TAB_VALUES.has(t) ? t : null;
};

const tarjetaTieneRutaParametrizada = (tarjeta: {
  rutaId?: string | null;
  path?: string | null;
  moduloPath?: string | null;
}): boolean => {
  const rutaId = normalizePublicIdForApi(tarjeta.rutaId);
  const path = String(tarjeta.path || tarjeta.moduloPath || '').trim();
  return isOpaqueDocumentId(rutaId) && Boolean(path);
};

/** Si la tarjeta no trae `tab`, infiere desde moduloPath, path o título del catálogo. */
const inferirTabDesdeTarjeta = (tarjeta: {
  tab?: string | null;
  titulo?: string | null;
  path?: string | null;
  moduloPath?: string | null;
}): InventarioTabValue | null => {
  const direct = tabValueDesdeTarjeta(tarjeta.tab);
  if (direct && direct !== 'config') return direct;

  const moduloPath = String(tarjeta.moduloPath || '').trim().toLowerCase();
  const path = String(tarjeta.path || '').trim().toLowerCase();
  const titulo = String(tarjeta.titulo || '').trim().toLowerCase();

  for (const m of inventarioModulosOrdenados()) {
    if (m.tab === 'config') continue;
    const catalogPath = pathAbs(m.pathSegment).toLowerCase();
    if (
      moduloPath === catalogPath
      || moduloPath.endsWith(`/${m.pathSegment}`)
      || path.includes(`/${m.pathSegment}`)
      || titulo === m.label.toLowerCase()
    ) {
      return m.tab;
    }
  }

  return direct;
};

/**
 * Pestañas del menú superior desde GET `/api/inventario/config/tarjetas`
 * (misma fuente que ConfigInventario). Sin duplicar `tab`.
 */
export const inventarioTabsDesdeTarjetasDinamicas = (
  tarjetas: Array<{ tab?: string | null; titulo: string; orden?: number; rutaId?: string | null; path?: string | null; moduloPath?: string | null }>,
  user: InventarioJwtScopeUserLike | null | undefined,
): Array<{ value: InventarioTabValue; label: string }> => {
  const sorted = [...tarjetas]
    .filter((t) => String(t.titulo || '').trim() && tarjetaTieneRutaParametrizada(t))
    .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0) || a.titulo.localeCompare(b.titulo));

  const seen = new Set<InventarioTabValue>();
  const tabs: Array<{ value: InventarioTabValue; label: string }> = [];
  for (const tarjeta of sorted) {
    const value = inferirTabDesdeTarjeta(tarjeta);
    if (!value || value === 'config') continue;
    if (!inventarioTabVisibleSegunJwt(value, user) || seen.has(value)) continue;
    seen.add(value);
    tabs.push({ value, label: String(tarjeta.titulo).trim() });
  }
  return tabs;
};

/**
 * Tarjetas de acceso rápido en ConfigInventario.
 * @param filtro Opcional: p. ej. permisos por ruta o flags del tenant (`(m) => puedeVerRuta(m)`).
 */
export const inventarioModulosParaGridConfig = (
  filtro: (m: InventarioModuloCatalogo) => boolean = () => true
): Array<{
  tab: InventarioTabValue;
  title: string;
  description: string;
  path: string;
  pathSegment: string;
  icon: LucideIcon;
}> =>
  inventarioModulosOrdenados()
    .filter((m) => m.cardDescription && filtro(m))
    .map((m) => ({
      tab: m.tab,
      title: m.label,
      description: m.cardDescription as string,
      path: pathAbs(m.pathSegment),
      pathSegment: m.pathSegment,
      icon: m.icon,
    }));
