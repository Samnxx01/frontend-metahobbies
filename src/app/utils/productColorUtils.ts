import type { ProductColor } from '@/types/common';

export type ColorPermitidoInput = { nombre?: string; valor?: string };

export function mapColoresPermitidos(
  colores: ColorPermitidoInput[] = [],
  cantidadColoresRender?: number,
): ProductColor[] {
  const cantidad = Math.max(0, Math.min(50, Number(cantidadColoresRender) || colores.length || 0));
  const slice = cantidad > 0 ? colores.slice(0, cantidad) : colores;

  return slice
    .map((color, index) => {
      const valor = String(color?.valor || '').trim();
      if (!valor) return null;
      return {
        pantone: valor,
        name: String(color?.nombre || `Color ${index + 1}`).trim(),
        hex: valor,
      };
    })
    .filter((color): color is ProductColor => color != null);
}

/** Un solo color → se asigna por defecto. Varios → el usuario debe elegir. */
export function resolverColorUnicoParaCarrito(colores: ProductColor[]): ProductColor | null {
  if (colores.length === 1) return colores[0];
  return null;
}

export const MENSAJE_PRODUCTO_REQUIERE_COLOR =
  'Este producto tiene varios colores. Abre la ficha y elige el tono antes de agregarlo.';

export function esErrorProductoRequiereColor(message: string): boolean {
  const m = String(message || '').toLowerCase();
  return m.includes('varios colores') || m.includes('selecciona un color') || m.includes('selecciona uno');
}
