import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { EndpointSpec } from './parametrosGobernanzaTypes';
import type { GobernanzaEndpointCapabilities } from './gobernanzaEndpointCapabilities';
import { GobernanzaModuloAccionesGrid } from './GobernanzaModuloAccionesGrid';
import { GobernanzaModuloInlinePanel } from './GobernanzaModuloInlinePanel';
import { GobernanzaModuloMenuTabs } from './GobernanzaModuloMenuTabs';
import { GobernanzaModuloConfigView } from './GobernanzaModuloConfigView';
import { GobernanzaModuloParametrizarButton } from './GobernanzaModuloParametrizarButton';
import { validarGobernanzaModuloInline } from './gobernanzaModuloFormularioGuard';
import { buildGobernanzaMenuTabsFromEndpoints } from './gobernanzaModuloMenuUi';
import type { ParametrosGobernanzaModuloMenuState } from './useParametrosGobernanzaModuloMenu';
import { logGobernanzaOperativo, warnGobernanzaOperativo } from './gobernanzaModuloDebug';

export type GobernanzaModuloDinamicoVariant = 'config' | 'operational';

/** `tabs` = Inventario operativo; `grid` = ConfigInventario; `inventario` = config grid dentro de Card. */
export type GobernanzaModuloMenuLayout = 'tabs' | 'grid' | 'inventario';

export type GobernanzaModuloDinamicoProps = {
  variant?: GobernanzaModuloDinamicoVariant;
  menuLayout?: GobernanzaModuloMenuLayout;
  menuState?: ParametrosGobernanzaModuloMenuState | null;
  renderForm?: (endpoint: EndpointSpec) => React.ReactNode;
  getCapabilities?: (endpoint: EndpointSpec) => GobernanzaEndpointCapabilities;
  paginaComponent?: string;
  className?: string;
  /** Un formulario en la ruta actual: sin pestañas, solo el panel del formulario. */
  hideTabsWhenSingleForm?: boolean;
  menuOnly?: boolean;
  /** Oculta título/subtítulo encima de las pestañas (hub PermisosGlobal). */
  hideSubmenuHeader?: boolean;
};

function GobernanzaModuloOperational({
  menuState,
  renderForm,
  getCapabilities,
  paginaComponent = 'ParametrosGobernanza',
  menuLayout = 'tabs',
  className,
  hideTabsWhenSingleForm = false,
  menuOnly = false,
  hideSubmenuHeader = false,
}: Required<Pick<GobernanzaModuloDinamicoProps, 'menuState' | 'renderForm' | 'getCapabilities'>> & {
  paginaComponent?: string;
  menuLayout?: GobernanzaModuloMenuLayout;
  className?: string;
  hideTabsWhenSingleForm?: boolean;
  menuOnly?: boolean;
  hideSubmenuHeader?: boolean;
}): React.ReactElement {
  const {
    config,
    menuLoading,
    menuError,
    menuDesdeApi,
    menuAcciones,
    menuConfigCount,
    endpoints,
    accionesGrid,
    activeActionId,
    activeEndpoint,
    activeAccionMenu,
    setActiveActionId,
    actionShortLabels,
    menuDisponibleById,
    refreshMenu,
  } = menuState;

  const moduloSlug = String(config.slug || '').trim();
  const showParametrizarMenu = config.section !== 'permisos' && config.section !== 'reglas';
  const menuPathInicial =
    activeAccionMenu?.menuPath ?? config.menuPath ?? null;

  const parametrizarAction = showParametrizarMenu && moduloSlug ? (
    <GobernanzaModuloParametrizarButton
      moduloSlug={moduloSlug}
      menuPathInicial={menuPathInicial}
      onMenuRefresh={refreshMenu}
      size="sm"
      className="w-full shrink-0 justify-center sm:w-auto"
    />
  ) : null;

  const parametrizarToolbar = parametrizarAction ? (
    <div className="flex flex-wrap items-center justify-end gap-2">{parametrizarAction}</div>
  ) : null;

  const scopeDisponibleById = useMemo(
    () => Object.fromEntries(endpoints.map((ep) => [ep.id, getCapabilities(ep).scopeDisponible])),
    [endpoints, getCapabilities]
  );

  const menuTabs = useMemo(
    () =>
      buildGobernanzaMenuTabsFromEndpoints(endpoints, {
        shortLabels: actionShortLabels,
        disponibleById: menuDisponibleById,
        scopeDisponibleById,
        configLabel: String(config.label || '').trim() || undefined,
      }),
    [endpoints, actionShortLabels, menuDisponibleById, scopeDisponibleById, config.label]
  );

  const parametrizarConTabs = parametrizarAction ? (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1 overflow-x-auto">
        <GobernanzaModuloMenuTabs
          tabs={menuTabs}
          activeActionId={activeActionId}
          onActionChange={setActiveActionId}
          loading={menuLoading}
        />
      </div>
      <div className="flex shrink-0 justify-end">{parametrizarAction}</div>
    </div>
  ) : (
    <GobernanzaModuloMenuTabs
      tabs={menuTabs}
      activeActionId={activeActionId}
      onActionChange={setActiveActionId}
      loading={menuLoading}
    />
  );

  const accionesGridConScope = useMemo(
    () =>
      accionesGrid.map((item) => {
        const scopeOk = scopeDisponibleById[item.id] ?? true;
        return { ...item, disponible: item.disponible && scopeOk };
      }),
    [accionesGrid, scopeDisponibleById]
  );

  const validacion = useMemo(
    () =>
      validarGobernanzaModuloInline({
        config: {
          ...config,
          formularioComponent: activeAccionMenu?.formularioComponent ?? config.formularioComponent,
          menuPath: activeAccionMenu?.menuPath ?? config.menuPath,
        },
        activeEndpoint,
        menuEndpointIds: endpoints.map((e) => e.id),
        menuDesdeApi,
        menuLoading,
        paginaComponent,
      }),
    [config, activeAccionMenu, activeEndpoint, endpoints, menuDesdeApi, menuLoading, paginaComponent]
  );

  if (!menuLoading && !endpoints.length && !(menuAcciones?.length)) {
    const sinPublicarEnBd =
      !menuError
      && menuDesdeApi
      && (menuAcciones?.length === 0 || menuAcciones === null);
    const apiSinConfigs = menuDesdeApi && menuConfigCount === 0;
    warnGobernanzaOperativo('UI: Sin acciones parametrizadas (diagnóstico)', {
      menuLoading,
      menuError,
      menuDesdeApi,
      menuConfigCount,
      menuAccionesCount: menuAcciones?.length ?? null,
      menuAccionesNull: menuAcciones === null,
      endpointsCount: endpoints.length,
      endpointIds: endpoints.map((e) => e.id),
      configSlug: config.slug,
      configSection: config.section,
      sinPublicarEnBd,
      apiSinConfigs,
    });
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Sin acciones parametrizadas</AlertTitle>
        <AlertDescription className="space-y-2">
          <span className="block">
            {menuError
              ? `No se pudo cargar el menú: ${menuError}`
              : apiSinConfigs
                ? `GET operativo respondió 0 configs para section «${config.section}». Verifica section=permisos, estado=true y acciones[] en gobernanzaModuloConfigs.`
                : sinPublicarEnBd
                  ? `No hay formularios publicados en gobernanzaModuloConfigs para «${config.label}».`
                  : `No hay acciones disponibles para «${config.label}».`}
          </span>
          {!menuError ? (
            showParametrizarMenu ? (
              <span className="block space-y-2 text-xs">
                <span className="block">
                  1. Pulsa «Parametrizar menú», elige una ruta de rutasSeguridad con componente asignado,
                  selecciona acciones y guarda.
                </span>
                <span className="block">
                  2. Pulsa «Actualizar» para recargar el menú desde la base de datos.
                </span>
                {parametrizarToolbar}
              </span>
            ) : (
              <span className="block text-xs">
                Publica formularios desde ConfigGobernanza y pulsa «Actualizar» para recargar el menú.
              </span>
            )
          ) : null}
          {refreshMenu ? (
            <button
              type="button"
              className="font-medium underline underline-offset-2"
              onClick={() => void refreshMenu()}
            >
              Reintentar
            </button>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  const showGrid = menuLayout === 'grid';
  const showTabs = menuLayout === 'tabs' || menuLayout === 'inventario';
  const soloFormularioEnRuta =
    hideTabsWhenSingleForm && !menuLoading && endpoints.length <= 1 && Boolean(activeEndpoint);

  const renderPanelFormulario = (endpoint: EndpointSpec, validacionTab: typeof validacion) => {
    if (!endpoint || validacionTab.bloquearRender) {
      return (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Corrige la parametrización del menú para continuar.
        </p>
      );
    }
    return (
      <GobernanzaModuloInlinePanel
        endpoint={endpoint}
        capabilities={getCapabilities(endpoint)}
        variant="operational"
        copyDesdeConfig={menuDesdeApi}
      >
        {renderForm(endpoint)}
      </GobernanzaModuloInlinePanel>
    );
  };

  const panelFormulario =
    activeEndpoint && !validacion.bloquearRender ? (
      renderPanelFormulario(activeEndpoint, validacion)
    ) : menuLoading ? (
      <p className="text-sm text-muted-foreground">Cargando formulario…</p>
    ) : validacion.bloquearRender ? (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Corrige la parametrización del menú para continuar.
      </p>
    ) : (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Selecciona una pestaña para continuar.
      </p>
    );

  if (soloFormularioEnRuta) {
    return (
      <div className={className ?? 'space-y-4'} data-gobernanza-modulo={config.slug}>
        {parametrizarToolbar}
        {!validacion.ok && validacion.mensajes.length > 0 ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Validación del módulo</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {validacion.mensajes.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}
        {panelFormulario}
      </div>
    );
  }

  return (
    <div className={className ?? 'space-y-4'} data-gobernanza-modulo={config.slug}>
      {!menuLoading && menuTabs.length === 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sin pestañas parametrizadas</AlertTitle>
          <AlertDescription className="space-y-2">
            <span className="block">
              Autoriza o parametriza formularios de gobernanza para construir este menú dinámicamente.
            </span>
            {parametrizarToolbar}
          </AlertDescription>
        </Alert>
      ) : null}

      {showGrid ? (
        <>
          <Card>
            <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle>{config.submenuTitle || config.label}</CardTitle>
                <CardDescription>{config.submenuHint || config.description}</CardDescription>
              </div>
              {parametrizarToolbar}
            </CardHeader>
            <CardContent>
              <GobernanzaModuloAccionesGrid
                items={accionesGridConScope}
                activeActionId={activeActionId}
                onAbrir={setActiveActionId}
                loading={menuLoading}
              />
            </CardContent>
          </Card>
          {!menuOnly && activeActionId ? (
            <div className="space-y-4" data-gobernanza-modulo-formulario={activeActionId}>
              {!validacion.ok && validacion.mensajes.length > 0 ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Validación del módulo</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {validacion.mensajes.map((msg) => (
                        <li key={msg}>{msg}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}
              {panelFormulario}
            </div>
          ) : null}
        </>
      ) : null}

      {showTabs && menuTabs.length > 0 ? (
        <Tabs
          value={activeActionId || undefined}
          onValueChange={setActiveActionId}
          className="space-y-4"
        >
          {config.submenuTitle && !menuOnly && !hideSubmenuHeader ? (
            <p className="text-sm font-semibold text-foreground">{config.submenuTitle}</p>
          ) : null}
          {config.submenuHint && !menuOnly && !hideSubmenuHeader ? (
            <p className="text-xs text-muted-foreground">{config.submenuHint}</p>
          ) : null}
          {parametrizarConTabs}

          {!menuOnly && !validacion.ok && validacion.mensajes.length > 0 ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Validación del módulo</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {validacion.mensajes.map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          {!menuOnly && endpoints.map((endpoint) => {
            const accionTab = menuAcciones?.find((a) => a.id === endpoint.id) ?? null;
            const endpointParaFormulario =
              activeActionId === endpoint.id && activeEndpoint ? activeEndpoint : endpoint;
            const validacionTab = validarGobernanzaModuloInline({
              config: {
                ...config,
                formularioComponent: accionTab?.formularioComponent ?? config.formularioComponent,
                menuPath: accionTab?.menuPath ?? config.menuPath,
              },
              activeEndpoint: endpointParaFormulario,
              menuEndpointIds: endpoints.map((e) => e.id),
              menuDesdeApi,
              menuLoading,
              paginaComponent,
            });
            return (
              <TabsContent key={endpoint.id} value={endpoint.id} className="mt-0 space-y-4">
                {activeActionId === endpoint.id
                  ? renderPanelFormulario(endpointParaFormulario, validacionTab)
                  : null}
              </TabsContent>
            );
          })}
        </Tabs>
      ) : null}
    </div>
  );
}

export function GobernanzaModuloDinamico({
  variant = 'config',
  menuLayout = 'tabs',
  menuState,
  renderForm,
  getCapabilities,
  paginaComponent,
  className,
  hideTabsWhenSingleForm = false,
  menuOnly = false,
  hideSubmenuHeader = false,
}: GobernanzaModuloDinamicoProps): React.ReactElement {
  if (variant === 'config') {
    return <GobernanzaModuloConfigView className={className} />;
  }

  if (!menuState || !renderForm || !getCapabilities) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        Flujo operativo: requiere menuState, renderForm y getCapabilities desde ParametrosGobernanza.
      </p>
    );
  }

  return (
    <GobernanzaModuloOperational
      menuState={menuState}
      renderForm={renderForm}
      getCapabilities={getCapabilities}
      paginaComponent={paginaComponent}
      menuLayout={menuLayout}
      className={className}
      hideTabsWhenSingleForm={hideTabsWhenSingleForm}
      menuOnly={menuOnly}
      hideSubmenuHeader={hideSubmenuHeader}
    />
  );
}

export default function GobernanzaModuloDinamicoPage(): React.ReactElement {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <GobernanzaModuloDinamico variant="config" />
    </div>
  );
}
