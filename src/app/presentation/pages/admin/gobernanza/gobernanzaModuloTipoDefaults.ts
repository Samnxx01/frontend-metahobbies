import { GOBERNANZA_MODULOS_CATALOGO } from './gobernanzaModulosCatalog';
import { GOBERNANZA_TIPO_SECTION_TENANT_SUPER_ADMIN, GOBERNANZA_TIPO_SECTION_TENANT_GLOBAL, GOBERNANZA_TIPO_SECTION_EMPRESAS } from './gobernanzaTipoSectionConstants';
import { GOBERNANZA_PERMISOS_FORM_COMPONENTS } from './permisos-forms/gobernanzaPermisosFormRegistry';
import { GOBERNANZA_REGLAS_FORM_COMPONENTS } from './reglas-forms/gobernanzaReglasFormRegistry';
import type { EndpointSection } from './parametrosGobernanzaTypes';

export const GOBERNANZA_MODULO_SECTION_NUEVA = '__nueva__';

const SECTION_SLUG_REGEX = /^[a-z][a-z0-9-]{1,39}$/;

/** Sections conocidas del catálogo local (fallback si la BD está vacía). */
export const GOBERNANZA_SECTIONS_CATALOGO_FALLBACK = GOBERNANZA_MODULOS_CATALOGO.map(
  (m) => m.section
);

/** Alias de section en rutas/BD → section canónica en gobernanzaModuloTipos. */
export const GOBERNANZA_TIPO_SECTION_ALIASES: Record<string, string> = {
  'reglas-sa': 'reglas',
  'reglas-tenant': 'reglas',
  'regla-tenant-sa': 'reglas',
  'tenantglobal': 'tenant-global',
};

/** Normaliza section de tipos (reglas-sa en URL → reglas en catálogo/semilla). */
export function canonicalGobernanzaTipoSection(section?: string | null): string {
  const raw = normalizarSectionInput(String(section || ''));
  if (!raw) return '';
  return GOBERNANZA_TIPO_SECTION_ALIASES[raw] || raw;
}

/** Hub / contenedor → section en gobernanzaModuloTipos (no confundir con section de gobernanzaModuloConfigs). */
export const HUB_COMPONENT_SECTION: Record<string, EndpointSection | 'gobernanza'> = {
  PermisosGlobal: 'permisos',
  ReglasTenant: 'reglas',
  ParametrosGobernanza: GOBERNANZA_TIPO_SECTION_TENANT_SUPER_ADMIN,
  TenantSuperAdmin: GOBERNANZA_TIPO_SECTION_TENANT_SUPER_ADMIN,
  TenantGlobal: GOBERNANZA_TIPO_SECTION_TENANT_GLOBAL,
  ParametrizacionCorporativa: GOBERNANZA_TIPO_SECTION_EMPRESAS,
};

/** Código sugerido al crear tipo desde un hub conocido. */
export const HUB_COMPONENT_TIPO_CODIGO: Record<string, string> = {
  ReglasTenant: 'reglas-tenant-sa',
  PermisosGlobal: 'permisos-global-sa',
  TenantGlobal: 'tenant-global',
};

/** Componente React sugerido para el tipo según hub. */
export const HUB_COMPONENT_FORMULARIO: Record<string, string> = {
  ReglasTenant: 'GobernanzaReglasFormByEndpoint',
  PermisosGlobal: 'GobernanzaPermisosFormByEndpoint',
  TenantGlobal: 'GobernanzaTenantFormByEndpoint',
};

export function sectionDesdeComponente(component?: string | null): EndpointSection | 'gobernanza' | '' {
  const key = String(component || '').trim();
  if (HUB_COMPONENT_SECTION[key]) return HUB_COMPONENT_SECTION[key];
  if ((GOBERNANZA_REGLAS_FORM_COMPONENTS as readonly string[]).includes(key)) return 'reglas';
  return '';
}

export function defaultsTipoDesdeComponente(component?: string | null): {
  section: EndpointSection | '';
  codigo: string;
  formularioComponent: string;
} {
  const key = String(component || '').trim();
  return {
    section: sectionDesdeComponente(key),
    codigo: HUB_COMPONENT_TIPO_CODIGO[key] || '',
    formularioComponent: HUB_COMPONENT_FORMULARIO[key] || '',
  };
}

export function componentesPorSection(section: string): readonly string[] {
  const s = String(section || '').trim().toLowerCase();
  if (s === 'permisos') return GOBERNANZA_PERMISOS_FORM_COMPONENTS;
  if (s === 'reglas') return GOBERNANZA_REGLAS_FORM_COMPONENTS;
  return [];
}

export function normalizarSectionInput(raw: string): string {
  return String(raw || '').trim().toLowerCase();
}

export function esSectionSlugValido(section: string): boolean {
  return SECTION_SLUG_REGEX.test(normalizarSectionInput(section));
}

/** Une sections de BD con sugerida/fallback sin duplicados. */
export function mergeSectionsOpciones(
  desdeBd: string[] = [],
  sugerida?: string | null,
  fallback: string[] = GOBERNANZA_SECTIONS_CATALOGO_FALLBACK
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: string) => {
    const s = canonicalGobernanzaTipoSection(raw);
    if (!s || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };
  for (const s of desdeBd) push(s);
  if (sugerida) push(sugerida);
  for (const s of fallback) push(s);
  return out.sort((a, b) => a.localeCompare(b));
}

export function resolverSectionParaUpsert(
  modo: 'catalog' | 'custom',
  catalogValue: string,
  customValue: string,
  fallback = 'permisos'
): string {
  if (modo === 'custom') return normalizarSectionInput(customValue) || normalizarSectionInput(fallback);
  return normalizarSectionInput(catalogValue) || normalizarSectionInput(fallback);
}

/** Section inicial del filtro de tipos (prioriza componente de ruta/hub). */
export function resolverTipoSectionFiltroInicial(
  component?: string | null,
  catalogSection?: string | null,
  moduloSlug?: string | null,
  sectionsBd: string[] = []
): string {
  const fromComponent = sectionDesdeComponente(component);
  if (fromComponent) return fromComponent;

  const cat = canonicalGobernanzaTipoSection(catalogSection);
  if (cat === 'tenant') return GOBERNANZA_TIPO_SECTION_TENANT_SUPER_ADMIN;
  if (esSectionSlugValido(cat)) return cat;

  const slug = canonicalGobernanzaTipoSection(moduloSlug);
  if (esSectionSlugValido(slug)) return slug;

  if (sectionsBd.includes('permisos')) return 'permisos';
  return sectionsBd[0] || 'permisos';
}
