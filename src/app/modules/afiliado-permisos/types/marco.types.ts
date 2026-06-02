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
  createdAt?: string;
  updatedAt?: string;
}

export interface MarcoActivoResponse {
  marco: MarcoPermisosAfiliado | null;
  creado?: boolean;
  rolCorporativoId?: string | null;
  msg?: string;
}

export interface RolMarcoParametrizable {
  _id: string;
  rol: string;
  codigo: string;
  scopeKey: string;
  tenantCorporativo?: string | null;
}

export interface RolesMarcoResponse {
  roles: RolMarcoParametrizable[];
  total?: number;
  msg?: string;
}

export interface GuardarMarcoPayload {
  acciones: string[];
  vistas: string[];
  rolCorporativoId?: string;
}

export interface GuardarMarcoResponse {
  msg?: string;
  marco?: MarcoPermisosAfiliado;
  actualizado?: boolean;
  resultado?: SincronizarMarcoResponse['resultado'] & {
    motivosOmitidos?: Record<string, number>;
    herenciaClienteMuestras?: Array<{
      usuarioId: string;
      herenciaCliente: HerenciaClienteRelacion;
    }>;
    coleccionesAfectadas?: string[];
  };
  flujoHerenciaCliente?: {
    pasos: string[];
    relacion: string;
  };
  herenciaCliente?: HerenciaClienteRelacion | null;
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

/** Relación herencia (MARCO_AFILIADO) + tenantJerarquiaCountersCliente */
export interface HerenciaClienteRelacion {
  usuarioId: string | null;
  herencia: {
    id: string;
    fuente: string;
    marcoSeq: number | null;
    marcoPermisosAfiliadoId: string | null;
    vistasCount: number;
    accionesCount: number;
    estado: boolean;
  } | null;
  counter: {
    id: string;
    herenciaId: string | null;
    seqMarco: number | null;
    marcoPermisosAfiliadoId: string | null;
    rolCorporativoId: string | null;
    corporativoAsociado: {
      tenantCorporativoId?: string | null;
      perfilCorporativoId?: string | null;
      fuente?: string | null;
    } | null;
    fechaSincronizacion?: string | null;
    estado: boolean;
  } | null;
  marcoActivo: { id: string; codigo: string; seq: number | null } | null;
  enlazado: boolean;
  permisosSincronizados: boolean;
  relacion?: {
    descripcion: string;
    pasos: string[];
  };
}
