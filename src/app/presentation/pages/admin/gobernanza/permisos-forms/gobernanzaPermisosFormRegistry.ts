import type React from 'react';

import { GobernanzaFormularioPorRuta } from '../GobernanzaFormularioPorRuta';

import { PermAdminActualizarHerenciaSaForm } from './PermAdminActualizarHerenciaSaForm';
import { PermAdminCrearHerenciaForm } from './PermAdminCrearHerenciaForm';
import { PermAdminDesactivarHerenciaForm } from './PermAdminDesactivarHerenciaForm';
import { PermAdminEliminarHerenciaForm } from './PermAdminEliminarHerenciaForm';
import { PermListarHerenciasForm } from './PermListarHerenciasForm';
import type { GobernanzaPermisosFormProps } from './types';

/** Catálogo de componentes React para formularios de permisos (gobernanzaModuloTipos). */
export const GOBERNANZA_PERMISOS_FORM_COMPONENTS = [
  'PermListarHerenciasForm',
  'PermAdminCrearHerenciaForm',
  'PermAdminActualizarHerenciaSaForm',
  'PermAdminDesactivarHerenciaForm',
  'PermAdminEliminarHerenciaForm',
  'GobernanzaPermisosFormByEndpoint',
  'GobernanzaFormularioPorRuta',
] as const;

export type GobernanzaPermisosFormComponentName =
  (typeof GOBERNANZA_PERMISOS_FORM_COMPONENTS)[number];

export const GOBERNANZA_PERMISOS_FORM_REGISTRY: Record<
  string,
  React.ComponentType<GobernanzaPermisosFormProps>
> = {
  PermListarHerenciasForm,
  PermAdminCrearHerenciaForm,
  PermAdminActualizarHerenciaSaForm,
  PermAdminDesactivarHerenciaForm,
  PermAdminEliminarHerenciaForm,
  GobernanzaFormularioPorRuta,
};

/** Fallback endpointId cuando el tipo en BD no trae endpointId parametrizado. */
export const ENDPOINT_ID_BY_PERMISOS_COMPONENT: Record<string, string> = {
  PermListarHerenciasForm: 'perm-listar-herencias',
  PermAdminCrearHerenciaForm: 'perm-admin-tenant-global',
  PermAdminActualizarHerenciaSaForm: 'perm-admin-tenant-global-actualizar-sa',
  PermAdminDesactivarHerenciaForm: 'perm-admin-tenant-global-desactivar',
  PermAdminEliminarHerenciaForm: 'perm-admin-tenant-global-eliminar',
};

export function endpointIdDesdeComponente(formularioComponent?: string | null): string {
  const key = String(formularioComponent || '').trim();
  return key ? ENDPOINT_ID_BY_PERMISOS_COMPONENT[key] || '' : '';
}

export function resolverPermisosFormComponent(
  formularioComponent?: string | null
): React.ComponentType<GobernanzaPermisosFormProps> | null {
  const key = String(formularioComponent || '').trim();
  if (!key || key === 'GobernanzaPermisosFormByEndpoint') return null;
  return GOBERNANZA_PERMISOS_FORM_REGISTRY[key] ?? null;
}

export function endpointIdsDesdeTipoFormularios(
  formularios: Array<{ endpointId?: string | null; formularioComponent?: string | null }> = [],
  formularioComponentHint = ''
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of formularios) {
    const id =
      String(item?.endpointId || '').trim()
      || endpointIdDesdeComponente(item?.formularioComponent || formularioComponentHint);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  const fallback = endpointIdDesdeComponente(formularioComponentHint);
  if (!out.length && fallback) out.push(fallback);
  return out;
}
