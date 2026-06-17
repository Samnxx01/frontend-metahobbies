import type { ReactNode } from 'react';

import type { GobernanzaModuloConfig } from './gobernanzaModuloConfig';

import type { EndpointSpec } from './parametrosGobernanzaTypes';



/** Componentes de página que hospedan el menú inline parametrizado. */

export const GOBERNANZA_FORMULARIO_COMPONENTS = [

  'ParametrosGobernanza',

  'GobernanzaModuloPorRuta',

  'GobernanzaPermisosFormByEndpoint',

  'GobernanzaReglasFormByEndpoint',

] as const;



export type GobernanzaFormularioComponentName = (typeof GOBERNANZA_FORMULARIO_COMPONENTS)[number];



export type GobernanzaFormularioWrapperKind = 'direct' | 'permisos-by-endpoint' | 'reglas-by-endpoint';



const WRAPPER_BY_COMPONENT: Record<string, GobernanzaFormularioWrapperKind> = {

  ParametrosGobernanza: 'direct',

  GobernanzaModuloPorRuta: 'direct',

  GobernanzaPermisosFormByEndpoint: 'permisos-by-endpoint',

  GobernanzaReglasFormByEndpoint: 'reglas-by-endpoint',

};



const WRAPPER_FALLBACK_BY_SLUG: Record<string, GobernanzaFormularioWrapperKind> = {

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

};



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

  return esComponentePermisoSubformulario(name);

}



export function resolverWrapperKind(config: GobernanzaModuloConfig): GobernanzaFormularioWrapperKind {

  const component = normalizeComponentName(config.formularioComponent);

  if (component && WRAPPER_BY_COMPONENT[component]) {

    return WRAPPER_BY_COMPONENT[component];

  }

  if (esComponentePermisoSubformulario(component)) {

    return 'permisos-by-endpoint';

  }

  return WRAPPER_FALLBACK_BY_SLUG[config.slug] ?? 'direct';

}



function paginaCompatibleConFormulario(pagina: string, formulario: string): boolean {

  if (!pagina || !formulario || pagina === formulario) return true;

  if (pagina === 'ParametrosGobernanza' && esComponentePermisoSubformulario(formulario)) {

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

  const formularioComponent = normalizeComponentName(opts.config.formularioComponent) || null;

  const wrapperKind = resolverWrapperKind(opts.config);

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

  /** Menú desde gobernanzaModuloConfigs: render directo sin bloquear por validaciones locales. */
  if (opts.menuDesdeApi && opts.activeEndpoint) {
    const component = normalizeComponentName(opts.config.formularioComponent) || formularioComponent;
    return {
      ok: true,
      bloquearRender: false,
      mensajes: [],
      formularioComponent: component,
      wrapperKind: resolverWrapperKind({ ...opts.config, formularioComponent: component }),
      accionEnMenu: true,
    };
  }



  const menuIds = new Set(opts.menuEndpointIds.map(String));

  const accionEnMenu = Boolean(

    opts.activeEndpoint && (menuIds.size === 0 || menuIds.has(opts.activeEndpoint.id))

  );



  if (opts.menuDesdeApi && menuIds.size === 0 && !opts.activeEndpoint) {
    mensajes.push(
      'No hay formularios publicados en gobernanzaModuloConfigs para esta sección. Publica desde «Parametrizar menú».'
    );
  }



  if (opts.activeEndpoint && menuIds.size > 0 && !accionEnMenu) {

    mensajes.push(

      `La acción «${opts.activeEndpoint.id}» no está en el menú parametrizado del módulo «${opts.config.slug}».`

    );

  }



  if (

    opts.menuDesdeApi

    && formularioComponent

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

  renderReglasForm?: (props: { endpoint: EndpointSpec; embeddedApiForm: ReactNode }) => ReactNode;

};



export function envolverFormularioInline(opts: EnvolverFormularioInlineOptions): ReactNode {

  if (opts.validacion.bloquearRender) {
    return opts.embeddedApiForm;
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


