import carritoService from '@/app/services/carritoService';
import { clearCheckoutDeclinadoActivo } from '@/app/utils/checkoutSessionCache';

/**
 * Backend: reabre carrito ACTIVO cuando el pago quedó DECLINED.
 * La limpieza de caché declined la hace el llamador (`checkoutPedidoSalida`).
 */
export async function abandonarCheckoutSiPagoDeclinado(
  carritoId: string | null | undefined,
): Promise<void> {
  const id = String(carritoId || '').trim();
  if (!id || id === '0') return;

  try {
    const resultado = await carritoService.abandonarCheckoutPagoDeclinado(id);
    if (resultado.ok) return;
  } catch {
    /* fallback reabrir */
  }

  try {
    await carritoService.reabrirTrasPagoFallido(id);
  } catch {
    /* carrito ya activo u otro estado */
  } finally {
    clearCheckoutDeclinadoActivo();
  }
}
