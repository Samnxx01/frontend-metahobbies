import { apiFetch, apiFetchPublic } from './api';
import type { DatosFacturacionInvitado } from '@/app/presentation/components/carrito/DatosFacturacionInvitadoModal';

export type TerceroFacturacion = DatosFacturacionInvitado & { iud?: string };

export type BuscarTerceroResultado = {
  data: TerceroFacturacion | null;
  tienePerfilCliente: boolean;
  edicionIdentidadBloqueada: boolean;
};

export type TerceroAdmin = {
  iud?: string;
  _id?: string;
  tipoPersona: 'NATURAL' | 'JURIDICA';
  tipoDocumento: string;
  numeroDocumento: string;
  nombreCompleto: string;
  razonSocial: string;
  dv: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  ciudadId: string;
  departamentoId: string;
  pais: string;
  estado: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TerceroAdminDraft = Omit<TerceroAdmin, 'iud' | '_id' | 'estado' | 'createdAt' | 'updatedAt'>;

export type ListarTercerosAdminParams = {
  q?: string;
  estado?: string;
  tipoPersona?: string;
  limit?: number;
};

export type ListarTercerosAdminResultado = {
  data: TerceroAdmin[];
  total: number;
};

const terceroService = {
  async buscarPorDocumento(numeroDocumento: string): Promise<BuscarTerceroResultado> {
    const params = new URLSearchParams({ numeroDocumento });
    const response = await apiFetchPublic(`/api/terceros/buscar?${params.toString()}`, { method: 'GET' });
    return {
      data: response?.encontrado ? (response.data as TerceroFacturacion) : null,
      tienePerfilCliente: Boolean(response?.tienePerfilCliente),
      edicionIdentidadBloqueada: Boolean(response?.edicionIdentidadBloqueada),
    };
  },

  async listarAdmin({ q, estado, tipoPersona, limit }: ListarTercerosAdminParams): Promise<ListarTercerosAdminResultado> {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (estado) params.set('estado', estado);
    if (tipoPersona) params.set('tipoPersona', tipoPersona);
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    const response = await apiFetch(`/api/terceros/admin${qs ? `?${qs}` : ''}`, { method: 'GET' });
    return {
      data: (response?.data as TerceroAdmin[]) || [],
      total: Number(response?.total || 0),
    };
  },

  async crearAdmin(draft: TerceroAdminDraft): Promise<TerceroAdmin> {
    const response = await apiFetch('/api/terceros/admin', { method: 'POST', body: draft });
    return response?.data as TerceroAdmin;
  },

  async actualizarAdmin(id: string, draft: TerceroAdminDraft): Promise<TerceroAdmin> {
    const response = await apiFetch(`/api/terceros/admin/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: draft,
    });
    return response?.data as TerceroAdmin;
  },

  async cambiarEstadoAdmin(id: string, nuevoEstado: boolean): Promise<TerceroAdmin> {
    const response = await apiFetch(`/api/terceros/admin/${encodeURIComponent(id)}/estado`, {
      method: 'PATCH',
      body: { estado: nuevoEstado },
    });
    return response?.data as TerceroAdmin;
  },
};

export default terceroService;
