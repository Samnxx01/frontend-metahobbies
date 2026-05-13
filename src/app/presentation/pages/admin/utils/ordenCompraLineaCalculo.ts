import type { OrdenCompraItemLinea } from '@/app/services/inventarioService';

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Descuento en COP (redondeado a entero); no supera la base bruta (cantidad × precio). */
export function descuentoMontoFijo(base: number, descuentoCop: number): number {
  const d = Math.max(0, Math.round(Number(descuentoCop) || 0));
  const b = Math.max(0, base);
  return round2(Math.min(d, b));
}

type ItemDesc = Pick<OrdenCompraItemLinea, 'descuentoPorcentaje' | 'descuento'>;

/**
 * Monto de descuento en COP: prioriza `descuento`; si no hay, compatibilidad con órdenes
 * antiguas (`descuentoPorcentaje` > 100 como COP en ese campo, o 1–100 como %).
 */
export function descuentoMontoLinea(base: number, item: ItemDesc): number {
  const b = Math.max(0, base);
  const descStored = Number(item.descuento ?? 0);
  if (descStored > 0) return descuentoMontoFijo(b, descStored);

  const raw = Number(item.descuentoPorcentaje ?? 0);
  if (raw > 100) return descuentoMontoFijo(b, raw);
  if (raw > 0) return round2((b * raw) / 100);
  return 0;
}

type ItemTot = Pick<
  OrdenCompraItemLinea,
  'subtotal' | 'cantidadOrdenada' | 'costoUnitario' | 'descuentoPorcentaje' | 'descuento' | 'impuestoPorcentaje' | 'impuestos'
>;

/** Total línea = (cant × precio) − desc. COP − impuesto % (o monto fijo) sobre la base neta. */
export function totalLineaOrdenCompra(item: ItemTot): number {
  const s = Number(item.subtotal);
  if (!Number.isNaN(s) && s > 0) return round2(s);

  const q = Number(item.cantidadOrdenada) || 0;
  const p = Number(item.costoUnitario) || 0;
  const base = round2(q * p);
  const d = descuentoMontoLinea(base, item);
  const baseNeta = Math.max(0, round2(base - d));
  const taxPct = Number(item.impuestoPorcentaje || 0);
  const taxAbs = Number(item.impuestos || 0);
  const impuesto = taxPct > 0 ? round2(baseNeta * (taxPct / 100)) : taxAbs;
  return Math.max(0, round2(baseNeta - impuesto));
}
