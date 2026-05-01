import { apiFetchPublic } from '@/app/services/api';
import { fusionarColoresApp } from '@/app/services/coloresAppService';
import { aplicarPaletaEnApp, restaurarPaletaLocal, type ColoresPaleta } from '@/app/utils/ColorUtils';

/**
 * Antes de montar React: restaura cache local y confirma con el endpoint público.
 * Así no se pinta la UI con variables del index.css que puedan divergir del servidor.
 */
export async function sincronizarPaletaAntesDeMontarReact(timeoutMs = 15000): Promise<void> {
  const teniaCache = restaurarPaletaLocal();

  const ac = new AbortController();
  const to = window.setTimeout(() => ac.abort(), timeoutMs);

  try {
    const res = await apiFetchPublic('/api/colores-app/publica', { signal: ac.signal });
    if (res?.colores && typeof res.colores === 'object') {
      aplicarPaletaEnApp(fusionarColoresApp(res.colores) as ColoresPaleta);
    } else if (!teniaCache) {
      aplicarPaletaEnApp(fusionarColoresApp() as ColoresPaleta);
    }
  } catch {
    if (!teniaCache) {
      aplicarPaletaEnApp(fusionarColoresApp() as ColoresPaleta);
    }
  } finally {
    window.clearTimeout(to);
  }
}
