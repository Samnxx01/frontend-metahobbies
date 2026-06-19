import productosService from '@/app/services/productosService';
import { DEFAULT_PRODUCTO_CATALOGO_LIMITES } from '@/app/hooks/useProductoCatalogoConfig';

/**
 * Configuración del mini-carrito (navbar).
 * Valores dinámicos desde GET /api/productos/catalogo-config/mini-carrito
 * (parametrizables en admin → Configuración catálogo productos).
 */
export type MiniCartConfig = {
  /** Más de N productos distintos → panel lateral derecho en lugar de dropdown compacto. */
  sidePanelThreshold: number;
  /** Máximo de productos visibles en el preview (el resto enlaza a /carrito). */
  maxVisibleProducts: number;
};

const STORAGE_KEY = 'mabs_mini_cart_config_cache_v1';

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function mapLimitesToMiniCartConfig(
  source: {
    sidePanelThreshold?: unknown;
    maxVisibleProducts?: unknown;
    miniCartSidePanelThreshold?: unknown;
    miniCartMaxProductos?: unknown;
  },
  fallback: MiniCartConfig = mapLimitesToMiniCartConfigFromDefaults(),
): MiniCartConfig {
  const sideRaw = source.sidePanelThreshold ?? source.miniCartSidePanelThreshold;
  const maxRaw = source.maxVisibleProducts ?? source.miniCartMaxProductos;
  return {
    sidePanelThreshold: clampInt(sideRaw, 1, 20, fallback.sidePanelThreshold),
    maxVisibleProducts: clampInt(maxRaw, 1, 50, fallback.maxVisibleProducts),
  };
}

function mapLimitesToMiniCartConfigFromDefaults(): MiniCartConfig {
  return mapLimitesToMiniCartConfig(DEFAULT_PRODUCTO_CATALOGO_LIMITES, {
    sidePanelThreshold: 1,
    maxVisibleProducts: 1,
  });
}

export function readCachedMiniCartConfig(): MiniCartConfig | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MiniCartConfig>;
    return mapLimitesToMiniCartConfig(parsed);
  } catch {
    return null;
  }
}

export function cacheMiniCartConfig(config: MiniCartConfig): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Valor inicial síncrono: caché de sesión o defaults de catálogo (solo bootstrap offline). */
export function getBootstrapMiniCartConfig(): MiniCartConfig {
  return readCachedMiniCartConfig() ?? mapLimitesToMiniCartConfigFromDefaults();
}

/** Carga configuración desde API y actualiza caché de sesión. */
export async function fetchMiniCartConfig(): Promise<MiniCartConfig> {
  const data = await productosService.obtenerMiniCartConfigPublico();
  const config = mapLimitesToMiniCartConfig(data);
  cacheMiniCartConfig(config);
  return config;
}

/** @deprecated Usar getBootstrapMiniCartConfig / fetchMiniCartConfig */
export function resolveMiniCartConfig(): MiniCartConfig {
  return getBootstrapMiniCartConfig();
}
