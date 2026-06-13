import type React from 'react';

import { GobernanzaFormularioPorRuta } from '../GobernanzaFormularioPorRuta';

export type GobernanzaReglasFormProps = {
  embeddedApiForm?: React.ReactNode;
  endpoint?: { id?: string };
  formularioComponent?: string | null;
};

/** Catálogo de componentes React para formularios de reglas (gobernanzaModuloTipos). */
export const GOBERNANZA_REGLAS_FORM_COMPONENTS = [
  'GobernanzaReglasFormByEndpoint',
  'GobernanzaFormularioPorRuta',
  'ReglasTenant',
] as const;

export type GobernanzaReglasFormComponentName =
  (typeof GOBERNANZA_REGLAS_FORM_COMPONENTS)[number];

export const ENDPOINT_ID_BY_REGLAS_COMPONENT: Record<string, string> = {
  GobernanzaReglasFormByEndpoint: 'tenant-listar-reglas',
  ReglasTenant: 'tenant-listar-reglas',
  GobernanzaFormularioPorRuta: 'tenant-listar-reglas',
};

export function endpointIdDesdeComponenteReglas(formularioComponent?: string | null): string {
  const key = String(formularioComponent || '').trim();
  return key ? ENDPOINT_ID_BY_REGLAS_COMPONENT[key] || '' : '';
}

export function resolverReglasFormComponent(
  formularioComponent?: string | null
): React.ComponentType<GobernanzaReglasFormProps> | null {
  const key = String(formularioComponent || '').trim();
  if (!key || key === 'GobernanzaReglasFormByEndpoint') return null;
  if (key === 'GobernanzaFormularioPorRuta') return GobernanzaFormularioPorRuta as React.ComponentType<GobernanzaReglasFormProps>;
  return null;
}

export function endpointIdsDesdeTipoFormulariosReglas(
  formularios: Array<{ endpointId?: string | null; formularioComponent?: string | null }> = [],
  formularioComponentHint = ''
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of formularios) {
    const id =
      String(item?.endpointId || '').trim()
      || endpointIdDesdeComponenteReglas(item?.formularioComponent || formularioComponentHint);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  const fallback = endpointIdDesdeComponenteReglas(formularioComponentHint);
  if (!out.length && fallback) out.push(fallback);
  return out;
}
