import type { ReactNode } from 'react';

import type { GobernanzaModuloConfig } from './gobernanzaModuloConfig';

import type { EndpointSpec } from './parametrosGobernanzaTypes';

import { esComponenteTenantSubformulario } from './tenant-forms/gobernanzaTenantFormRegistry';

import { esComponenteReglasSubformulario } from './reglas-forms/gobernanzaReglasFormRegistry';



/** Componentes de página que hospedan el menú inline parametrizado. */

export const GOBERNANZA_FORMULARIO_COMPONENTS = [

  'ParametrosGobernanza',

  'GobernanzaModuloPorRuta',

  'TenantGlobal',

  'TenantSuperAdmin',

  'GobernanzaTenantFormByEndpoint',

  'GobernanzaPermisosFormByEndpoint',

  'GobernanzaReglasFormByEndpoint',

  'PoliticaBypassPanel',

] as const;



export type GobernanzaFormularioComponentName = (typeof GOBERNANZA_FORMULARIO_COMPONENTS)[number];



export type GobernanzaFormularioWrapperKind = 'direct' | 'tenant-by-endpoint' | 'permisos-by-endpoint' | 'reglas-by-endpoint';



const WRAPPER_BY_COMPONENT: Record<string, GobernanzaFormularioWrapperKind> = {

  ParametrosGobernanza: 'direct',

  GobernanzaModuloPorRuta: 'direct',

  TenantGlobal: 'tenant-by-endpoint',

  TenantSuperAdmin: 'tenant-by-endpoint',

  GobernanzaTenantFormByEndpoint: 'tenant-by-endpoint',

  GobernanzaPermisosFormByEndpoint: 'permisos-by-endpoint',

  GobernanzaReglasFormByEndpoint: 'reglas-by-endpoint',

  PoliticaBypassPanel: 'direct',

};



const WRAPPER_FALLBACK_BY_SLUG: Record<string, GobernanzaFormularioWrapperKind> = {

  tenant: 'tenant-by-endpoint',

  permisos: 'permisos-by-endpoint',

  reglas: 'reglas-by-endpoint',

};



export type GobernanzaModuloInlineValidacion = {

  ok: boolean;

  bloquearRender: boolean;

  mensajes: string[];

  formularioComponent: string | null;

  wrapperKind: GobernanzaFormularioWrapperKind;

  accionEnMenu: boolean;

};



export type ValidarGobernanzaModuloInlineOptions = {

  config: GobernanzaModuloConfig;

  activeEndpoint: EndpointSpec | null;

  menuEndpointIds: readonly string[];

  menuDesdeApi: boolean;

  menuLoading: boolean;

  paginaComponent?: string;

  /** Pestaña activa desde gobernanzaModuloConfigs (hub TenantSuperAdmin, etc.). */
  accionMenu?: {
    id?: string;
    formularioComponent?: string | null;
    menuPath?: string | null;
    rutaId?: string | null;
    configSlug?: string | null;
    validacion?: { ok: boolean; mensajes: string[] };
  } | null;

  operacionesHub?: boolean;

};



function normalizarMensajesValidacion(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((m) => String(m ?? '').trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    return t ? [t] : [];
  }
  return [];
}



function normalizeComponentName(raw: string | null | undefined): string {

  return String(raw || '').trim();

}



/** Subformularios Perm*Form montados bajo ParametrosGobernanza (rutaseguridads). */

export function esComponentePermisoSubformulario(component: string | null | undefined): boolean {

  const name = normalizeComponentName(component);

  if (!name) return false;

  return /^Perm[A-Za-z0-9]+Form$/.test(name);

}



export function esComponenteFormularioConocido(component: string | null | undefined): boolean {

  const name = normalizeComponentName(component);

  if (!name) return false;

  if (GOBERNANZA_FORMULARIO_COMPONENTS.includes(name as GobernanzaFormularioComponentName)) {

    return true;

  }

  return esComponentePermisoSubformulario(name) || esComponenteTenantSubformulario(name) || esComponenteReglasSubformulario(name);

}



export function resolverWrapperKind(config: GobernanzaModuloConfig): GobernanzaFormularioWrapperKind {

  const component = normalizeComponentName(config.formularioComponent);

  if (component && WRAPPER_BY_COMPONENT[component]) {

    return WRAPPER_BY_COMPONENT[component];

  }

  if (esComponentePermisoSubformulario(component)) {

    return 'permisos-by-endpoint';

  }

  if (esComponenteTenantSubformulario(component)) {

    return 'tenant-by-endpoint';

  }

  if (esComponenteReglasSubformulario(component)) {

    return 'reglas-by-endpoint';

  }

  return WRAPPER_FALLBACK_BY_SLUG[config.slug] ?? 'direct';

}



function paginaCompatibleConFormulario(pagina: string, formulario: string): boolean {

  if (!pagina || !formulario || pagina === formulario) return true;

  if (pagina === 'ParametrosGobernanza' && esComponentePermisoSubformulario(formulario)) {

    return true;

  }

  if (pagina === 'ParametrosGobernanza' && formulario === 'GobernanzaTenantFormByEndpoint') {

    return true;

  }

  if (
    (pagina === 'ParametrosGobernanza' || pagina === 'TenantGlobal' || pagina === 'TenantSuperAdmin')
    && esComponenteTenantSubformulario(formulario)
  ) {

    return true;

  }

  if (pagina === 'ParametrosGobernanza' && esComponenteReglasSubformulario(formulario)) {

    return true;

  }

  if (['ParametrosGobernanza', 'GobernanzaModuloPorRuta'].includes(formulario)) {

    return pagina === formulario || pagina === 'ParametrosGobernanza';

  }

  return false;

}



export function validarGobernanzaModuloInline(

  opts: ValidarGobernanzaModuloInlineOptions

): GobernanzaModuloInlineValidacion {

  const formularioComponent =
    normalizeComponentName(opts.accionMenu?.formularioComponent)
    || normalizeComponentName(opts.config.formularioComponent)
    || null;

  const wrapperKind = resolverWrapperKind({
    ...opts.config,
    formularioComponent,
  });

  const mensajes: string[] = [];



  if (opts.menuLoading) {

    return {

      ok: true,

      bloquearRender: true,

      mensajes: [],

      formularioComponent,

      wrapperKind,

      accionEnMenu: false,

    };

  }



  const menuIds = new Set(opts.menuEndpointIds.map(String));

  const accionEnMenu = Boolean(
    opts.activeEndpoint && (
      menuIds.size === 0
      || menuIds.has(opts.activeEndpoint.id)
      || (opts.accionMenu?.id && menuIds.has(String(opts.accionMenu.id)))
      || (opts.accionMenu?.configSlug && menuIds.has(String(opts.accionMenu.configSlug)))
    )
  );

  if (opts.accionMenu?.validacion && !opts.accionMenu.validacion.ok) {
    const validacionMensajes = normalizarMensajesValidacion(opts.accionMenu.validacion.mensajes);
    for (const msg of validacionMensajes) {
      if (msg && !mensajes.includes(msg)) mensajes.push(msg);
    }
    if (!validacionMensajes.length) {
      mensajes.push('La opción del menú no superó la validación de gobernanzaModuloConfigs.');
    }
  }

  if (opts.menuDesdeApi && opts.operacionesHub) {
    if (!opts.accionMenu?.rutaId) {
      mensajes.push('La opción del menú no tiene rutaId vinculada en gobernanzaModuloConfigs.');
    }
    if (!normalizeComponentName(opts.accionMenu?.menuPath ?? opts.config.menuPath)) {
      mensajes.push('La opción del menú no tiene menuPath parametrizado.');
    }
    if (!formularioComponent) {
      mensajes.push('La opción del menú no tiene formularioComponent parametrizado.');
    } else if (!esComponenteFormularioConocido(formularioComponent)) {
      mensajes.push(
        `Componente «${formularioComponent}» no registrado en el front. Usa: ${GOBERNANZA_FORMULARIO_COMPONENTS.join(', ')} o un subformulario Perm*Form / Tenant*Form / Reglas*Form.`
      );
    }
  }



  if (opts.menuDesdeApi && menuIds.size === 0 && !opts.activeEndpoint) {
    mensajes.push(
      'No hay formularios publicados en gobernanzaModuloConfigs para esta sección. Publica desde «Parametrizar menú».'
    );
  }



  if (opts.activeEndpoint && menuIds.size > 0 && !accionEnMenu && !opts.operacionesHub) {

    mensajes.push(

      `La acción «${opts.activeEndpoint.id}» no está en el menú parametrizado del módulo «${opts.config.slug}».`

    );

  }



  if (

    opts.menuDesdeApi

    && formularioComponent

    && !opts.operacionesHub

    && !esComponenteFormularioConocido(formularioComponent)

  ) {

    mensajes.push(

      `Componente «${formularioComponent}» no registrado en el front. Usa: ${GOBERNANZA_FORMULARIO_COMPONENTS.join(', ')} o un subformulario Perm*Form.`

    );

  }



  const pagina = normalizeComponentName(opts.paginaComponent);

  if (formularioComponent && pagina && !paginaCompatibleConFormulario(pagina, formularioComponent)) {

    mensajes.push(

      `El formulario parametrizado es «${formularioComponent}» pero la página activa es «${pagina}».`

    );

  }



  const bloquearRender =

    mensajes.some((m) => m.includes('no está en el menú')) ||

    mensajes.some((m) => m.includes('no registrado')) ||

    mensajes.some((m) => m.includes('página activa')) ||

    mensajes.some((m) => m.includes('rutaId')) ||

    mensajes.some((m) => m.includes('menuPath')) ||

    mensajes.some((m) => m.includes('formularioComponent')) ||

    mensajes.some((m) => m.includes('no coincide')) ||

    mensajes.some((m) => m.includes('no encontrada')) ||

    mensajes.some((m) => m.includes('sin config')) ||

    (opts.menuDesdeApi && menuIds.size === 0 && !opts.activeEndpoint);



  return {

    ok: mensajes.length === 0,

    bloquearRender,

    mensajes,

    formularioComponent,

    wrapperKind,

    accionEnMenu,

  };

}



export type EnvolverFormularioInlineOptions = {

  validacion: GobernanzaModuloInlineValidacion;

  endpoint: EndpointSpec;

  embeddedApiForm: ReactNode;

  renderPermisosForm: (props: { endpoint: EndpointSpec; embeddedApiForm: ReactNode }) => ReactNode;

  renderTenantForm?: (props: { endpoint: EndpointSpec; embeddedApiForm: ReactNode }) => ReactNode;

  renderReglasForm?: (props: { endpoint: EndpointSpec; embeddedApiForm: ReactNode }) => ReactNode;

};



export function envolverFormularioInline(opts: EnvolverFormularioInlineOptions): ReactNode {

  if (opts.validacion.bloquearRender) {
    return opts.embeddedApiForm;
  }

  if (opts.validacion.wrapperKind === 'tenant-by-endpoint' && opts.renderTenantForm) {

    return opts.renderTenantForm({

      endpoint: opts.endpoint,

      embeddedApiForm: opts.embeddedApiForm,

    });

  }

  if (opts.validacion.wrapperKind === 'permisos-by-endpoint') {

    return opts.renderPermisosForm({

      endpoint: opts.endpoint,

      embeddedApiForm: opts.embeddedApiForm,

    });

  }

  if (opts.validacion.wrapperKind === 'reglas-by-endpoint' && opts.renderReglasForm) {

    return opts.renderReglasForm({

      endpoint: opts.endpoint,

      embeddedApiForm: opts.embeddedApiForm,

    });

  }

  return opts.embeddedApiForm;

}


