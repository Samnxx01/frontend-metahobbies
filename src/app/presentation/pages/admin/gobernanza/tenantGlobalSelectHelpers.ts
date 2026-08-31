import { apiFetch } from '@/app/services/api';
import { resolveEntityPublicId, type EntityRef } from '@/app/utils/entityPublicId';

export type GenericSelectOption = {
  id: string;
  label: string;
  rol?: string;
  meta?: Record<string, string | number | undefined>;
};

/** Resuelve fila de select API (objeto con iud/id o UUID/ObjectId suelto tras publicId middleware). */
function resolveSelectRowId(row: unknown): string {
  if (row == null) return '';
  if (typeof row === 'string' || typeof row === 'number') {
    return String(row).trim();
  }
  return resolveEntityPublicId(row as EntityRef);
}

const mapRows = (rows: unknown[] | undefined, fallbackKey: string): GenericSelectOption[] =>
  (Array.isArray(rows) ? rows : [])
    .map((row: unknown) => {
      const id = resolveSelectRowId(row);
      if (!id) return null;
      if (typeof row !== 'object' || row == null) {
        return { id, label: id };
      }
      const r = row as Record<string, unknown>;
      const label =
        String(
          r?.label ||
            (r?.etiquetas && r?.dominio ? `${r.etiquetas} - ${r.dominio}` : '') ||
            r?.[fallbackKey] ||
            id,
        ).trim() || id;
      return { id, label };
    })
    .filter(Boolean) as GenericSelectOption[];

/** Unión sin duplicados: catálogo global + dominios del scope JWT. */
export function resolveDominiosOptionsFromSelectsApi(data: Record<string, unknown>): GenericSelectOption[] {
  const byId = new Map<string, GenericSelectOption>();
  mapRows(Array.isArray(data.dominios) ? (data.dominios as unknown[]) : [], 'dominio').forEach((o) => {
    byId.set(o.id, o);
  });
  mapRows(Array.isArray(data.dominiosScope) ? (data.dominiosScope as unknown[]) : [], 'dominio').forEach((o) => {
    byId.set(o.id, o);
  });
  return Array.from(byId.values());
}

/** GET /api/seguridad/listar/dominios — catálogo activo de dominios API. */
export async function fetchDominiosActivosFromApi(): Promise<GenericSelectOption[]> {
  try {
    const res = (await apiFetch('/api/seguridad/listar/dominios?estadoDominio=true', {
      method: 'GET',
    })) as { data?: unknown[] };
    const rows = Array.isArray(res?.data) ? res.data : [];
    return mapRows(rows, 'dominio');
  } catch {
    return [];
  }
}

/** Combina selects API + listar dominios (garantiza opciones válidas en actualizar tenant global). */
export async function buildTenantGlobalSelectsEnriched(
  data: Record<string, unknown>,
): Promise<Record<string, GenericSelectOption[]>> {
  const base = buildTenantGlobalSelectsFromApi(data);
  const fromSelects = resolveDominiosOptionsFromSelectsApi(data);
  const restringidoPorCorporativoJwt = data.dominiosRestringidosPorCorporativoJwt === true;
  const fromList = restringidoPorCorporativoJwt ? [] : await fetchDominiosActivosFromApi();
  const byId = new Map<string, GenericSelectOption>();
  [...fromSelects, ...fromList, ...(base.apisDominios ?? [])].forEach((o) => {
    byId.set(o.id, o);
  });
  const apisDominios = Array.from(byId.values());
  return { ...base, apisDominios, apis: apisDominios };
}

export function buildTenantGlobalSelectsFromApi(data: Record<string, unknown>): Record<string, GenericSelectOption[]> {
  const rawRolesMabs = Array.isArray(data.rolesMabs)
    ? data.rolesMabs
    : Array.isArray(data.roles)
      ? data.roles
      : [];

  return {
    tipo_tenant: mapRows(Array.isArray(data.tiposTenant) ? (data.tiposTenant as unknown[]) : [], 'tipo_acceso_apis'),
    ownerType: mapRows(Array.isArray(data.ownerTypes) ? (data.ownerTypes as unknown[]) : [], 'tipo_comprador'),
    nvlGeneracionTenant: (Array.isArray(data.nivelesGlobales) ? data.nivelesGlobales : [])
      .map((row: unknown) => {
        const r = (typeof row === 'object' && row != null ? row : {}) as Record<string, unknown>;
        const id = resolveSelectRowId(row);
        if (!id) return null;
        const configId = id;
        const catalogId = String(r?.nvlGeneracionGlobalId || r?._id || '').trim();
        const nvl = String(r?.nvl ?? '').trim();
        const generationTenant = String(r?.generation_tenant || '').trim();
        const secuencia = Number(r?.secuencia ?? r?.orden ?? 0);
        const securityPlatform = r?.securityPlatform === true;
        return {
          id,
          label: String(
            r?.label ||
              `Secuencia ${secuencia || '-'} · NVL ${nvl || '-'} · ${generationTenant || id}${securityPlatform ? ' · Acceso libre' : ''}`,
          ),
          meta: {
            nvl,
            generationTenant,
            secuencia,
            securityPlatform: securityPlatform ? 'true' : 'false',
            nvlGeneracionGlobalId: catalogId || undefined,
            configNvlGlobalId: configId || undefined,
          },
        };
      })
      .filter(Boolean) as GenericSelectOption[],
    apisDominios: resolveDominiosOptionsFromSelectsApi(data),
    apis: resolveDominiosOptionsFromSelectsApi(data),
    accionesUsu: mapRows(
      Array.isArray(data.accionesCatalogo)
        ? (data.accionesCatalogo as unknown[])
        : Array.isArray(data.acciones)
          ? (data.acciones as unknown[])
          : [],
      'method',
    ),
    rolesMabs: rawRolesMabs
      .map((row: unknown) => {
        const id = resolveSelectRowId(row);
        if (!id) return null;
        const r = (typeof row === 'object' && row != null ? row : {}) as Record<string, unknown>;
        const rol = String(r?.rol || '').trim();
        const label = String(r?.label || rol || id);
        return { id, label, rol };
      })
      .filter(Boolean) as GenericSelectOption[],
    rolesGlobales: mapRows(
      Array.isArray(data.rolesGlobales) ? (data.rolesGlobales as unknown[]) : [],
      'nombre',
    ),
    coporativo: mapRows(
      Array.isArray(data.corporativosDisponibles) ? (data.corporativosDisponibles as unknown[]) : [],
      'razon_social',
    ),
    tenantGlobalRef: (() => {
      const jerRaw = Array.isArray(data.tenantGlobalesDesdeJerarquiaCounters)
        ? data.tenantGlobalesDesdeJerarquiaCounters
        : [];
      const jer = jerRaw
        .map((row: unknown) => {
          const id = resolveSelectRowId(row);
          if (!id) return null;
          const r = (typeof row === 'object' && row != null ? row : {}) as Record<string, unknown>;
          return { id, label: String(r?.label || id) };
        })
        .filter(Boolean) as GenericSelectOption[];

      if (jer.length > 0) return jer;

      return (Array.isArray(data.tenantGlobalesRegistrados) ? data.tenantGlobalesRegistrados : [])
        .map((row: unknown) => {
          const id = resolveSelectRowId(row);
          if (!id) return null;
          const r = (typeof row === 'object' && row != null ? row : {}) as Record<string, unknown>;
          const rol = String(r?.rol || 'TENANT').trim();
          const corp = String(r?.coporativoNombre || '').trim();
          const suffix = corp ? ` | ${corp}` : '';
          return { id, label: `${rol} | ${id}${suffix}` };
        })
        .filter(Boolean) as GenericSelectOption[];
    })(),
  };
}

/** Incluye el valor actual en el select aunque no venga en el catálogo (p. ej. tras precarga). */
export function mergeSelectOptionForValue(
  options: GenericSelectOption[],
  valueId: string,
  fallbackLabel?: string,
): GenericSelectOption[] {
  const id = String(valueId || '').trim();
  if (!id) return options;
  if (options.some((o) => o.id === id)) return options;
  return [{ id, label: fallbackLabel?.trim() || id }, ...options];
}

export type TenantGlobalFormularioDetalle = {
  id?: string;
  tipo_tenant?: string;
  ownerType?: string;
  apisDominios?: string;
  rolesMabs?: string;
  nvlGeneracionTenant?: string;
  accionesUsu?: string[];
  labels?: Partial<Record<'tipo_tenant' | 'ownerType' | 'apisDominios' | 'rolesMabs' | 'nvlGeneracionTenant', string>>;
};

export function tenantGlobalFormularioToFieldMap(detalle: TenantGlobalFormularioDetalle): Record<string, string> {
  const acciones = Array.isArray(detalle.accionesUsu) ? detalle.accionesUsu : [];
  return {
    tipo_tenant: String(detalle.tipo_tenant || '').trim(),
    apisDominios: String(detalle.apisDominios || '').trim(),
    rolesMabs: String(detalle.rolesMabs || '').trim(),
    nvlGeneracionTenant: String(detalle.nvlGeneracionTenant || '').trim(),
    accionesUsu: acciones.map((a) => String(a).trim()).filter(Boolean).join(','),
  };
}
