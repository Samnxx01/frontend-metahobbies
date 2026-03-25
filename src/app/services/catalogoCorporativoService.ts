import { apiFetch } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CatalogoCorporativo {
    iud: string;
    tipo_comprador: string;
    sigla: string;
    esDefault: boolean;
    estado: boolean;
    tenantGlobalId: string | null;
    createdAt: string;
}

export interface CrearCatalogoPayload {
    tipo_comprador: string;
    sigla: string;
}

export interface CrearCatalogoResponse {
    ok: boolean;
    catalogo: CatalogoCorporativo;
    defaultsGenerados?: CatalogoCorporativo[];
    msg?: string;
}

export interface ListarCatalogosResponse {
    ok: boolean;
    total: number;
    data: CatalogoCorporativo[];
}

// ─── Service functions ────────────────────────────────────────────────────────

const BASE = '/api/config/permisos/corporativo';

export const catalogoCorporativoService = {

    inicializarDefaults: async (): Promise<{ ok: boolean; sembrados: CatalogoCorporativo[]; msg: string }> => {
        return apiFetch(`${BASE}/inicializar/catalogo`, { method: 'POST' });
    },

    listar: async (): Promise<ListarCatalogosResponse> => {
        return apiFetch(`${BASE}/listar/catalogo/tenant/corporativo`, { method: 'GET' });
    },

    crear: async (payload: CrearCatalogoPayload): Promise<CrearCatalogoResponse> => {
        return apiFetch(`${BASE}/guardar/catologo/tenant/corporativo`, {
            method: 'POST',
            body: payload,
        });
    },

    actualizar: async (id: string, payload: Partial<CrearCatalogoPayload>): Promise<{ ok: boolean; data: CatalogoCorporativo }> => {
        return apiFetch(`${BASE}/modificar/catalogo/tenant/corporativo/${id}`, {
            method: 'PUT',
            body: payload,
        });
    },

    desactivar: async (id: string): Promise<{ ok: boolean; msg: string }> => {
        return apiFetch(`${BASE}/desactivar/catalogo/tenant/corporativo/${id}`, {
            method: 'DELETE',
        });
    },
};
