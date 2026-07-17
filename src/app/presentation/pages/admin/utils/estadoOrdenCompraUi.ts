import type { EstadoOrdenCompraConfig } from '@/app/services/inventarioService';

export const labelEstadoOrdenCompra = (
  codigo: string,
  estados: EstadoOrdenCompraConfig[] = [],
): string => {
  const norm = String(codigo || '').trim().toUpperCase();
  return estados.find((e) => e.codigo === norm)?.nombre || codigo || '—';
};

export const puedeConfirmarOrdenCompra = (
  codigo: string,
  estados: EstadoOrdenCompraConfig[] = [],
): boolean => {
  const norm = String(codigo || '').trim().toUpperCase();
  const cfg = estados.find((e) => e.codigo === norm);
  if (cfg) return Boolean(cfg.permiteConfirmarOrden && cfg.activo);
  return norm === 'VERIFICACION' || norm === 'ABIERTA';
};

/** Edición/eliminación de OC: solo VERIFICACION (SuperAdmin exento en UI/backend). */
export const puedeEditarOrdenCompra = (
  codigo: string,
  estados: EstadoOrdenCompraConfig[] = [],
  { esTenantSuperAdmin = false } = {},
): boolean => {
  if (esTenantSuperAdmin) return true;
  const norm = String(codigo || '').trim().toUpperCase();
  if (norm !== 'VERIFICACION') return false;
  const cfg = estados.find((e) => e.codigo === norm);
  if (cfg) return Boolean(cfg.permiteEditarOrden && cfg.activo);
  return true;
};

export const puedeEliminarOrdenCompra = (
  codigo: string,
  estados: EstadoOrdenCompraConfig[] = [],
): boolean => {
  const norm = String(codigo || '').trim().toUpperCase();
  if (norm !== 'VERIFICACION') return false;
  const cfg = estados.find((e) => e.codigo === norm);
  if (cfg) return Boolean(cfg.permiteEditarOrden && cfg.activo);
  return true;
};

export const codigosEstadoPermitenComprobanteEntrada = (
  estados: EstadoOrdenCompraConfig[] = [],
): Set<string> => {
  const fromConfig = estados.filter((e) => e.activo && e.permiteComprobanteEntrada).map((e) => e.codigo);
  if (fromConfig.length) return new Set(fromConfig);
  return new Set(['CONFIRMADO', 'RECIBIDA_PARCIAL', 'ABIERTA']);
};

export const estadoOrdenBadgeClass = (codigo: string): string => {
  switch (String(codigo || '').toUpperCase()) {
    case 'VERIFICACION':
      return 'border-warning/50 bg-warning/10 text-warning';
    case 'CONFIRMADO':
      return 'border-success/50 bg-success/10 text-success';
    case 'RECIBIDA_TOTAL':
      return 'border-primary/40 bg-primary/10 text-primary';
    case 'RECIBIDA_PARCIAL':
      return 'border-info/40 bg-info/10 text-info';
    default:
      return '';
  }
};
