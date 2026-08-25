import { apiFetch, apiFetchPublic } from './api';

export type TipoPersonaAdmin = {
  iud?: string;
  _id?: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  codigoDian?: string | null;
  estado: boolean;
  creadoEl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TipoPersonaAdminDraft = {
  codigo: string;
  nombre: string;
  descripcion?: string;
  codigoDian?: string;
  estado?: boolean;
};

export type ListarTiposPersonaAdminParams = {
  q?: string;
  estado?: string;
  limit?: number;
};

export type ListarTiposPersonaAdminResultado = {
  data: TipoPersonaAdmin[];
  total: number;
};

const tipoPersonaService = {
  /** Público: usado por el formulario de terceros (puede correr en checkout sin sesión). */
  async listarActivos(): Promise<TipoPersonaAdmin[]> {
    const response = await apiFetchPublic('/api/catalogos/tipos-persona/activos', { method: 'GET' });
    return (response?.data as TipoPersonaAdmin[]) || [];
  },

  async listarAdmin({ q, estado, limit }: ListarTiposPersonaAdminParams): Promise<ListarTiposPersonaAdminResultado> {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (estado) params.set('estado', estado);
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    const response = await apiFetch(`/api/catalogos/tipos-persona/admin${qs ? `?${qs}` : ''}`, { method: 'GET' });
    return {
      data: (response?.data as TipoPersonaAdmin[]) || [],
      total: Number(response?.total || 0),
    };
  },

  async crear(draft: TipoPersonaAdminDraft): Promise<TipoPersonaAdmin> {
    const response = await apiFetch('/api/catalogos/tipos-persona/admin', { method: 'POST', body: draft });
    return response?.data as TipoPersonaAdmin;
  },

  async actualizar(id: string, draft: Partial<TipoPersonaAdminDraft>): Promise<TipoPersonaAdmin> {
    const response = await apiFetch(`/api/catalogos/tipos-persona/admin/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: draft,
    });
    return response?.data as TipoPersonaAdmin;
  },

  async cambiarEstado(id: string, nuevoEstado: boolean): Promise<TipoPersonaAdmin> {
    const response = await apiFetch(`/api/catalogos/tipos-persona/admin/${encodeURIComponent(id)}/estado`, {
      method: 'PATCH',
      body: { estado: nuevoEstado },
    });
    return response?.data as TipoPersonaAdmin;
  },
};

export default tipoPersonaService;
