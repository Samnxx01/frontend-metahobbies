import { apiFetch } from './api';
import type { ClasificacionEmision } from '@/app/utils/tiposSecuenciaClasificacion';

export type FacturacionSoporteDocumentoCatalogo = {
  id: string;
  facturacionSoporteDocumentoId: string;
  secuencialId?: number | null;
  codigo: string;
  nombre: string | null;
  descripcion: string | null;
  dominioSecuencia: 'VENTA' | 'INVENTARIO';
  dominioSecuenciaTipo?: 'VENTA' | 'INVENTARIO';
  tipoSecuencia: string | null;
  clasificacionEmisionId?: number | null;
  clasificacionEmisionSecuencialId?: number | null;
  activo: boolean;
};

const mapCatalogo = (row: Partial<FacturacionSoporteDocumentoCatalogo>): FacturacionSoporteDocumentoCatalogo => ({
  id: String(row.id || row.facturacionSoporteDocumentoId || '').trim(),
  facturacionSoporteDocumentoId: String(row.facturacionSoporteDocumentoId || row.id || '').trim(),
  secuencialId: Number.isFinite(Number(row.secuencialId)) ? Number(row.secuencialId) : null,
  codigo: String(row.codigo || '').trim().toUpperCase(),
  nombre: row.nombre != null ? String(row.nombre).trim() : null,
  descripcion: row.descripcion != null ? String(row.descripcion).trim() : null,
  dominioSecuencia: String(row.dominioSecuencia || 'VENTA').trim().toUpperCase() === 'INVENTARIO'
    ? 'INVENTARIO'
    : 'VENTA',
  dominioSecuenciaTipo: String(row.dominioSecuenciaTipo || row.dominioSecuencia || 'VENTA').trim().toUpperCase() === 'INVENTARIO'
    ? 'INVENTARIO'
    : 'VENTA',
  tipoSecuencia: row.tipoSecuencia != null ? String(row.tipoSecuencia).trim().toUpperCase() : null,
  clasificacionEmisionId: Number.isFinite(Number(row.clasificacionEmisionId))
    ? Math.floor(Number(row.clasificacionEmisionId))
    : null,
  clasificacionEmisionSecuencialId: Number.isFinite(Number(row.clasificacionEmisionSecuencialId))
    ? Math.floor(Number(row.clasificacionEmisionSecuencialId))
    : null,
  activo: row.activo !== false,
});

const mapClasificacion = (row: Partial<ClasificacionEmision & {
  secuencialId?: number;
  etiqueta?: string;
}>): ClasificacionEmision => {
  const id = Number(row.id ?? row.secuencialId) || 0;
  return {
    id,
    secuencialId: id,
    nombre: String(row.nombre || '').trim().toUpperCase(),
    etiqueta: String(row.etiqueta || '').trim(),
  };
};

const facturacionSoporteDocumentoService = {
  async listarCatalogo(): Promise<FacturacionSoporteDocumentoCatalogo[]> {
    const resp = await apiFetch('/api/billing/facturacion-soporte-documento/catalogo', { method: 'GET' });
    const rows = (resp?.data ?? []) as Array<Partial<FacturacionSoporteDocumentoCatalogo>>;
    return rows
      .map(mapCatalogo)
      .filter((row) => row.codigo && row.activo)
      .sort((a, b) => String(a.nombre || a.codigo).localeCompare(String(b.nombre || b.codigo), 'es'));
  },

  async listarClasificacionesEmision(
    dominioSecuencia: 'VENTA' | 'INVENTARIO' = 'VENTA',
  ): Promise<ClasificacionEmision[]> {
    const resp = await apiFetch(
      `/api/billing/facturacion-soporte-documento/clasificaciones-emision?dominioSecuencia=${dominioSecuencia}`,
      { method: 'GET' },
    );
    const rows = (resp?.data ?? []) as Array<Partial<ClasificacionEmision & { secuencialId?: number; etiqueta?: string }>>;
    return rows
      .map(mapClasificacion)
      .filter((row) => row.id > 0 && row.nombre && row.etiqueta)
      .sort((a, b) => a.id - b.id);
  },

  async crearClasificacionEmision(payload: {
    nombre: string;
    etiqueta: string;
    dominioSecuencia?: 'VENTA' | 'INVENTARIO';
  }): Promise<ClasificacionEmision> {
    const resp = await apiFetch('/api/billing/facturacion-soporte-documento/clasificaciones-emision', {
      method: 'POST',
      body: {
        nombre: String(payload.nombre || '').trim().toUpperCase(),
        etiqueta: String(payload.etiqueta || '').trim(),
        dominioSecuencia: payload.dominioSecuencia || 'VENTA',
      },
    });
    return mapClasificacion((resp?.data ?? {}) as Partial<ClasificacionEmision & { secuencialId?: number; etiqueta?: string }>);
  },
};

export default facturacionSoporteDocumentoService;
