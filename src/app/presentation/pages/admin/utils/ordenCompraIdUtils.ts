import type { InventarioOrdenCompra } from '@/app/services/inventarioService';

type OrdenConId = Pick<InventarioOrdenCompra, '_id'> & { iud?: string; id?: string };

/** La API enmascara `_id` como `iud` (publicId middleware). */
export const getOrdenCompraId = (orden?: OrdenConId | null): string =>
  String(orden?._id || orden?.iud || orden?.id || '').trim();

type RecepcionConId = { _id?: string; iud?: string; id?: string };

export const getRecepcionCompraId = (recepcion?: RecepcionConId | null): string =>
  String(recepcion?._id || recepcion?.iud || recepcion?.id || '').trim();

const parseFechaOrden = (value?: string | Date | null | { $date?: string }): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && '$date' in value) {
    const d = new Date(String(value.$date));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatOrdenCompraFecha = (value?: string | Date | null | { $date?: string }): string => {
  const d = parseFechaOrden(value);
  return d ? d.toLocaleString('es-CO') : '—';
};

export type AuditoriaOrdenCompraUi = {
  timestamp?: string | Date | null | { $date?: string };
  usuario?: { correo?: string; nombre?: string } | null;
};

export const textoUsuarioAuditoria = (aud?: AuditoriaOrdenCompraUi | null): string => {
  const nombre = String(aud?.usuario?.nombre || '').trim();
  const correo = String(aud?.usuario?.correo || '').trim();
  return nombre || correo || '—';
};

export const formatAuditoriaOrdenCompra = (aud?: AuditoriaOrdenCompraUi | null): string => {
  if (!aud) return '—';
  const usuario = textoUsuarioAuditoria(aud);
  const fecha = formatOrdenCompraFecha(aud.timestamp);
  if (usuario === '—' && fecha === '—') return '—';
  if (usuario === '—') return fecha;
  if (fecha === '—') return usuario;
  return `${usuario} · ${fecha}`;
};

export const formatActualizadaOrdenCompra = (
  orden: {
    auditoriaUltimaEdicion?: AuditoriaOrdenCompraUi | null;
    comprobanteContable?: {
      confirmadoEn?: string;
      usuario?: { correo?: string; nombre?: string };
    } | null;
    updatedAt?: string;
  } | null,
): string => {
  if (!orden) return '—';
  if (orden.auditoriaUltimaEdicion?.timestamp || orden.auditoriaUltimaEdicion?.usuario) {
    return formatAuditoriaOrdenCompra(orden.auditoriaUltimaEdicion);
  }
  if (orden.comprobanteContable?.confirmadoEn || orden.comprobanteContable?.usuario) {
    return formatAuditoriaOrdenCompra({
      timestamp: orden.comprobanteContable.confirmadoEn,
      usuario: orden.comprobanteContable.usuario,
    });
  }
  if (orden.updatedAt) {
    const fecha = formatOrdenCompraFecha(orden.updatedAt);
    return fecha === '—' ? 'Sin modificaciones' : fecha;
  }
  return 'Sin modificaciones';
};

export const formatCreadaOrdenCompra = (
  orden: {
    auditoria?: AuditoriaOrdenCompraUi | null;
    createdAt?: string;
    fechaOrden?: string;
    documentoLegalCompra?: { fecha?: string };
  } | null,
): string => {
  if (!orden) return '—';
  if (orden.auditoria?.timestamp || orden.auditoria?.usuario) {
    return formatAuditoriaOrdenCompra(orden.auditoria);
  }
  const fecha = formatOrdenCompraFecha(
    orden.createdAt || orden.fechaOrden || orden.documentoLegalCompra?.fecha,
  );
  return fecha;
};
