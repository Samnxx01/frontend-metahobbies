/**
 * Configuración del mini-carrito (navbar).
 * Ajuste estos valores o sobreescríbalos vía localStorage:
 *   mabs_mini_cart_config = {"sidePanelThreshold":2,"maxVisibleProducts":10}
 */
export type MiniCartConfig = {
  /** Más de N productos distintos → panel lateral derecho en lugar de dropdown compacto. */
  sidePanelThreshold: number;
  /** Máximo de productos visibles en el preview (el resto enlaza a /carrito). */
  maxVisibleProducts: number;
};

const DEFAULT_MINI_CART_CONFIG: MiniCartConfig = {
  sidePanelThreshold: 2,
  maxVisibleProducts: 10,
};

const STORAGE_KEY = 'mabs_mini_cart_config';

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function resolveMiniCartConfig(): MiniCartConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MINI_CART_CONFIG };
    const parsed = JSON.parse(raw) as Partial<MiniCartConfig>;
    return {
      sidePanelThreshold: clampInt(parsed.sidePanelThreshold, 1, 20, DEFAULT_MINI_CART_CONFIG.sidePanelThreshold),
      maxVisibleProducts: clampInt(parsed.maxVisibleProducts, 1, 50, DEFAULT_MINI_CART_CONFIG.maxVisibleProducts),
    };
  } catch {
    return { ...DEFAULT_MINI_CART_CONFIG };
  }
}

export function saveMiniCartConfig(partial: Partial<MiniCartConfig>): MiniCartConfig {
  const current = resolveMiniCartConfig();
  const next: MiniCartConfig = {
    sidePanelThreshold: partial.sidePanelThreshold ?? current.sidePanelThreshold,
    maxVisibleProducts: partial.maxVisibleProducts ?? current.maxVisibleProducts,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export default DEFAULT_MINI_CART_CONFIG;
