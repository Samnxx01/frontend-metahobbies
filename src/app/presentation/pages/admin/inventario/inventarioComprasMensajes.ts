/**
 * Mensajes orientados al usuario para el flujo OC → comprobante → inventario.
 */

export const FLUJO_COMPRAS_PASOS = {
  crearOcManual:
    'Paso 1/3 — Orden creada en VERIFICACION. Abra Detalles y use «Confirmar orden» para el comprobante contable.',
  crearOcAutomatico:
    'Orden creada en VERIFICACION. Confírmela en Detalles antes del comprobante de entrada.',
  confirmarOc:
    'Paso 2/3 — Orden confirmada (CONFIRMADO). Comprobante contable generado. Siguiente: Comprobante entrada.',
  comprobanteOk: (numeroOrden: string, estado: string, conKardex = true) =>
    conKardex
      ? `Paso 3/3 — Comprobante registrado para ${numeroOrden}. Estado de la OC: ${estado}. El inventario ya refleja la entrada.`
      : `Paso 3/3 — Comprobante ${numeroOrden} aprobado (${estado}). Registre la entrada en kardex desde Movimientos (recepción manual).`,
  configManual:
    'Recepción manual: OC en VERIFICACION → Confirmar orden → Comprobante entrada.',
  configAutomatico:
    'Recepción automática desactivada al crear: confirme la orden y luego registre comprobante de entrada.',
} as const;

/** Traduce errores del API a texto accionable. */
export function mensajeErrorComprasInventario(error: unknown, contexto?: string): string {
  const raw =
    error instanceof Error
      ? error.message.replace(/^\[\d+\]\s*/, '').trim()
      : typeof error === 'string'
        ? error.trim()
        : '';

  if (!raw) {
    return contexto || 'No se pudo completar la operación de compras. Intente de nuevo.';
  }

  if (/paso bloqueado/i.test(raw)) {
    return raw;
  }

  if (/debe confirmar la orden antes del comprobante/i.test(raw)) {
    return 'Confirme la orden en Detalles (genera comprobante contable) antes de registrar el comprobante de entrada.';
  }

  if (/solo se puede confirmar una orden en VERIFICACION/i.test(raw)) {
    return 'Solo se puede confirmar una orden en estado VERIFICACION.';
  }

  if (/excede el pendiente|ya fue recibido por completo en la orden/i.test(raw)) {
    const sku = raw.match(/para\s+(\S+)\s+excede/i)?.[1] ?? 'ese producto';
    const pend = raw.match(/pendiente\s+\(([^)]+)\)/i)?.[1] ?? '0';
    return (
      `No se puede registrar el comprobante: en «${sku}» no hay unidades pendientes (pendiente: ${pend}). ` +
      'Esa línea ya fue recibida en un comprobante anterior. ' +
      'Use una OC CONFIRMADA con cantidades pendientes o cree una orden nueva.'
    );
  }

  if (/ya fue recibida por completo|no hay cantidades pendientes/i.test(raw)) {
    return (
      'No se puede registrar el comprobante: esta orden ya no tiene mercancía pendiente. ' +
      'Revise el estado de la OC o cree una orden nueva.'
    );
  }

  if (/tenant requerido/i.test(raw)) {
    return (
      'No se pudo registrar la entrada en inventario: falta el contexto de tenant en su sesión. ' +
      'Vuelva a iniciar sesión con ancla de tenant (corporativo, global o super admin) e intente de nuevo.'
    );
  }

  if (/orden esta cerrada/i.test(raw)) {
    return 'No se puede recepcionar: la orden de compra está CERRADA.';
  }

  if (/solo se puede editar una orden en estado/i.test(raw)) {
    return 'No se puede editar: solo las órdenes en VERIFICACION admiten cambios (salvo permiso de super admin).';
  }

  return contexto ? `${contexto} ${raw}` : raw;
}

export function mensajeExitoCrearOrden(
  numeroOrden: string,
  estado: string,
  _recepcionAutomatica: boolean,
): string {
  if (estado === 'VERIFICACION' || estado === 'ABIERTA') {
    return `Orden ${numeroOrden} creada en VERIFICACION. ${FLUJO_COMPRAS_PASOS.crearOcManual}`;
  }
  return `Orden ${numeroOrden} registrada (${estado}). ${FLUJO_COMPRAS_PASOS.crearOcAutomatico}`;
}
