/** Catálogo de componentes React para formularios de reglas (gobernanzaModuloTipos). */
export const GOBERNANZA_REGLAS_FORM_COMPONENTS = [
  'ReglasListarTenantForm',
  'ReglasCrearGlobalForm',
  'ReglasActualizarGlobalForm',
  'ReglasDesactivarGlobalForm',
  'ReglasEliminarGlobalForm',
  'ReglasCrearDiosForm',
  'ReglasActualizarDiosForm',
  'ReglasListarDiosForm',
  'ReglasEliminarDiosForm',
  'GobernanzaReglasFormByEndpoint',
  'GobernanzaFormularioPorRuta',
  'ReglasTenant',
] as const;

export type GobernanzaReglasFormComponentName =
  (typeof GOBERNANZA_REGLAS_FORM_COMPONENTS)[number];

/** Fallback endpointId cuando el tipo en BD no trae endpointId parametrizado. */
export const ENDPOINT_ID_BY_REGLAS_COMPONENT: Record<string, string> = {
  ReglasListarTenantForm: 'tenant-listar-reglas',
  ReglasCrearGlobalForm: 'tenant-crear-global-reglas',
  ReglasActualizarGlobalForm: 'tenant-actualizar-global-reglas',
  ReglasDesactivarGlobalForm: 'tenant-desactivar-global-reglas',
  ReglasEliminarGlobalForm: 'tenant-eliminar-global-reglas',
  ReglasCrearDiosForm: 'tenant-crear-dios-reglas',
  ReglasActualizarDiosForm: 'tenant-actualizar-dios-reglas',
  ReglasListarDiosForm: 'tenant-listar-dios-reglas',
  ReglasEliminarDiosForm: 'tenant-eliminar-dios-reglas',
  GobernanzaReglasFormByEndpoint: 'tenant-listar-reglas',
  ReglasTenant: 'tenant-listar-reglas',
  GobernanzaFormularioPorRuta: 'tenant-listar-reglas',
};

export function endpointIdDesdeComponenteReglas(formularioComponent?: string | null): string {
  const key = String(formularioComponent || '').trim();
  return key ? ENDPOINT_ID_BY_REGLAS_COMPONENT[key] || '' : '';
}

export function esComponenteReglasSubformulario(component: string | null | undefined): boolean {
  const name = String(component || '').trim();
  if (!name) return false;
  return /^Reglas[A-Za-z0-9]+Form$/.test(name);
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
