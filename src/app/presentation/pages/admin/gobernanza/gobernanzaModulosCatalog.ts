import type { LucideIcon } from 'lucide-react';
import { Building2, KeyRound, Scale, Shield, ShieldOff } from 'lucide-react';
import type { EndpointSection } from './parametrosGobernanzaTypes';

export const GOBERNANZA_ADMIN_BASE = '/admin/parametros-gobernanza';

export type GobernanzaModuloCatalogo = {
  slug: string;
  section: EndpointSection;
  label: string;
  description: string;
  frontPathSegment: string;
  icon: LucideIcon;
  orden: number;
};

const pathAbs = (segment: string): string =>
  segment.startsWith('/') ? segment : `${GOBERNANZA_ADMIN_BASE}/${segment}`;

/** Fallback local si el API de catálogo no responde (misma forma que Inventario). */
export const GOBERNANZA_MODULOS_CATALOGO: GobernanzaModuloCatalogo[] = [
  {
    slug: 'tenant',
    section: 'tenant',
    label: 'Gobernanza Tenant',
    description: 'Tenants, reglas y jerarquía visible en tu red.',
    frontPathSegment: 'tenant',
    icon: Building2,
    orden: 10,
  },
  {
    slug: 'permisos',
    section: 'permisos',
    label: 'Gobernanza Permisos',
    description: 'Herencias, roles y permisos por tenant.',
    frontPathSegment: 'permisos',
    icon: KeyRound,
    orden: 20,
  },
  {
    slug: 'reglas',
    section: 'reglas',
    label: 'Gobernanza Reglas',
    description: 'Reglas de jerarquía por tenant global.',
    frontPathSegment: 'reglas',
    icon: Scale,
    orden: 25,
  },
  {
    slug: 'politica-bypass',
    section: 'permisos',
    label: 'Políticas de bypass',
    description: 'Semilla de roles y visibilidad por dominio (rutas, referidos, comisiones).',
    frontPathSegment: 'politica-bypass',
    icon: ShieldOff,
    orden: 22,
  },
  {
    slug: 'corporativo',
    section: 'corporativo',
    label: 'Gobernanza Corporativo',
    description: 'Branding, widgets y catálogo corporativo.',
    frontPathSegment: 'corporativo',
    icon: Shield,
    orden: 30,
  },
];

export const gobernanzaModulosOrdenados = (): GobernanzaModuloCatalogo[] =>
  [...GOBERNANZA_MODULOS_CATALOGO].sort((a, b) => a.orden - b.orden);

/** Alias de rutas en BD (p. ej. `tenant-global` → módulo `tenant`). */
const SLUG_ALIASES: Record<string, string> = {
  'tenant-global': 'tenant',
  'reglas-sa': 'reglas',
  'reglas-tenant': 'reglas',
};

export function normalizeGobernanzaModuloSlug(slug: string): string {
  const key = slug.trim().toLowerCase();
  return SLUG_ALIASES[key] ?? key;
}

export function getGobernanzaModuloCatalogoLocal(slug: string): GobernanzaModuloCatalogo | null {
  const key = normalizeGobernanzaModuloSlug(slug);
  return GOBERNANZA_MODULOS_CATALOGO.find((m) => m.slug === key) ?? null;
}

export function gobernanzaModulosParaGridConfig(): Array<{
  slug: string;
  title: string;
  description: string;
  path: string;
  pathSegment: string;
  icon: LucideIcon;
  section: EndpointSection;
}> {
  return gobernanzaModulosOrdenados().map((m) => ({
    slug: m.slug,
    title: m.label,
    description: m.description,
    path: pathAbs(m.frontPathSegment),
    pathSegment: m.frontPathSegment,
    icon: m.icon,
    section: m.section,
  }));
}
