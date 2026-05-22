export interface MarcoPermisosAfiliado {
  _id?: string;
  iud?: string;
  codigo?: string;
  scopeKey?: string;
  seq?: number;
  rolCorporativoId?: string;
  acciones?: string[];
  vistas?: string[];
  estado?: boolean;
  notas?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MarcoActivoResponse {
  marco: MarcoPermisosAfiliado | null;
  creado?: boolean;
  msg?: string;
}

export interface GuardarMarcoPayload {
  acciones: string[];
  vistas: string[];
  notas?: string | null;
}

export interface GuardarMarcoResponse {
  msg?: string;
  marco?: MarcoPermisosAfiliado;
}

export interface SincronizarMarcoResponse {
  msg?: string;
  resultado?: {
    procesados?: number;
    errores?: number;
    omitidos?: number;
    marcoSeq?: number;
    pendientes?: number;
    aviso?: string;
  };
}

export interface ContextoClienteResponse {
  contextoCliente?: {
    corporativoAsociado?: {
      tenantCorporativoId?: string | null;
      perfilCorporativoId?: string | null;
      fuente?: string | null;
      razonSocial?: string | null;
    };
    marcoSeq?: number | null;
    permisosSincronizados?: boolean;
  };
  counter?: Record<string, unknown> | null;
  marcoActivo?: { _id?: string; seq?: number; codigo?: string } | null;
  afiliadoScope?: Record<string, unknown> | null;
}

export type MarcoCatalogTab = 'vistas' | 'acciones';
