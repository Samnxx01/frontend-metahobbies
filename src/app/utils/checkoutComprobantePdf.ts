import carritoService from '@/app/services/carritoService';
import type { CheckoutConfirmacionPedido } from '@/app/types/checkoutConfirmacion';

function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Emite (una sola vez) y descarga el PDF almacenado en servidor.
 * El documento queda inmutable en BD aunque cambien carrito o facturación después.
 */
export async function descargarComprobantePedidoPdfAlmacenado(
  pedido: CheckoutConfirmacionPedido,
): Promise<void> {
  const transactionId = String(pedido.transactionId || '').trim();
  const facturaId = String(pedido.facturaId || '').trim();
  const referenciaPago = String(pedido.referenciaPago || '').trim();

  if (!transactionId) {
    throw new Error('No hay ID de transacción para generar el comprobante.');
  }
  if (!referenciaPago) {
    throw new Error('No hay referencia de pago para validar el comprobante.');
  }

  let nombreArchivo = `pedido-mabs-${transactionId}.pdf`;
  let emitError: Error | null = null;

  try {
    const emitido = await carritoService.emitirComprobantePedidoPdf({
      transactionId,
      ...(facturaId ? { facturaId } : {}),
      ventaReferencia: pedido.ventaReferencia,
      referenciaPago,
      carritoId: pedido.carritoId || undefined,
      snapshot: {
        estado: pedido.estado,
        ...(facturaId ? { facturaId } : {}),
        ventaReferencia: pedido.ventaReferencia,
        transactionId,
        referenciaPago: pedido.referenciaPago,
        monto: pedido.monto,
        moneda: pedido.moneda,
        email: pedido.email,
        metodoPago: pedido.metodoPago,
        items: pedido.items,
        subtotal: pedido.subtotal,
        total: pedido.total,
        datosFacturacion: pedido.datosFacturacion,
        fecha: pedido.fecha,
      },
    });
    nombreArchivo = emitido.nombreArchivo || nombreArchivo;
  } catch (err: unknown) {
    emitError = err instanceof Error ? err : new Error('No se pudo emitir el comprobante PDF');
  }

  try {
    const { blob, fileName } = await carritoService.descargarComprobantePedidoPdf(transactionId);
    triggerBrowserDownload(blob, fileName || nombreArchivo);
  } catch (downloadErr: unknown) {
    if (emitError) throw emitError;
    throw downloadErr instanceof Error ? downloadErr : new Error('No se pudo descargar el comprobante PDF');
  }
}

/** @deprecated Usar descargarComprobantePedidoPdfAlmacenado — alias para compatibilidad HMR/cache */
export const generarComprobantePedidoPdf = descargarComprobantePedidoPdfAlmacenado;
