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

/** Pestañas del menú superior (todas las del catálogo con orden). */
export const inventarioTabsDesdeCatalogo = (): Array<{ value: InventarioTabValue; label: string }> =>
  inventarioModulosOrdenados().map(({ tab, label }) => ({ value: tab, label }));

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
