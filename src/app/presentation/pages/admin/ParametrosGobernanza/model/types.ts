export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type EndpointSection = 'tenant' | 'permisos';
export type EndpointActor = 'tenantSuperAdmin' | 'tenantGlobal' | 'ambos';
export type FieldType = 'text' | 'textarea' | 'json' | 'id' | 'permisos' | 'context';

export type FieldSpec = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  header?: boolean;
  pathParam?: boolean;
};

export type EndpointSpec = {
  id: string;
  section: EndpointSection;
  actor: EndpointActor;
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  fields: FieldSpec[];
  primary?: boolean;
};

export type Vista = { id: string; label: string; path: string };
export type Accion = { id: string; label: string; method: string };
export type TenantGlobal = { id: string; label: string; corporativo: string };
export type PermisoItem = { vistaId: string; accionId: string[] };
export type ReglaOption = { id: string; label: string };
export type ContextOption = { id: string; label: string };
export type HeredaGlobalOption = { id: string; label: string };
export type CatalogSelection = { vistas: string[]; acciones: string[] };
export type TenantCorporativoOption = { id: string; label: string; tenantGlobalId: string };
