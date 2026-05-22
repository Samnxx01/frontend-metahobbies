import type { OrdenCompraItemLinea } from '@/app/services/inventarioService';

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Descuento en COP redondeado a entero; no supera la base bruta. */
export function descuentoMontoFijo(base: number, descuentoCop: number): number {
  const d = Math.max(0, Math.round(Number(descuentoCop) || 0));
  const b = Math.max(0, base);
  return round2(Math.min(d, b));
}

type ItemDesc = Pick<OrdenCompraItemLinea, 'descuentoPorcentaje' | 'descuento'>;

/**
 * Monto de descuento en COP: prioriza `descuento`; si no hay, conserva
 * compatibilidad con ordenes antiguas que usaban `descuentoPorcentaje`.
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

/** Total linea = (cantidad x precio) + impuesto sobre bruto - descuento sobre total. */
export function totalLineaOrdenCompra(item: ItemTot): number {
  const q = Number(item.cantidadOrdenada) || 0;
  const p = Number(item.costoUnitario) || 0;
  const base = round2(q * p);
  const d = descuentoMontoLinea(base, item);
  const taxPct = Number(item.impuestoPorcentaje || 0);
  const taxAbs = Number(item.impuestos || 0);
  const impuesto = taxPct > 0 ? round2(base * (taxPct / 100)) : taxAbs;
  const totalCalculado = Math.max(0, round2(base + impuesto - d));
  if (base > 0 || d > 0 || impuesto > 0) return totalCalculado;

  const s = Number(item.subtotal);
  return !Number.isNaN(s) && s > 0 ? round2(s) : 0;
}
