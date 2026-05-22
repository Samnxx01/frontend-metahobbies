import React from 'react';
import type { EndpointSpec } from './parametrosGobernanzaTypes';
import type { GobernanzaEndpointCapabilities } from './gobernanzaEndpointCapabilities';
import { GobernanzaModuloInlinePanel } from './GobernanzaModuloInlinePanel';
import { GobernanzaModuloMenuTabs } from './GobernanzaModuloMenuTabs';
import { GobernanzaModuloConfigView } from './GobernanzaModuloConfigView';
import type { ParametrosGobernanzaModuloMenuState } from './useParametrosGobernanzaModuloMenu';

export type GobernanzaModuloDinamicoVariant = 'config' | 'operational';

export type GobernanzaModuloDinamicoProps = {
  /**
   * `config`: rejilla tipo ConfigInventario (tarjetas Abrir / Autorizar / Actualizar / Eliminar).
   * `operational`: pestañas + formulario dentro de ParametrosGobernanza.
   */
  variant?: GobernanzaModuloDinamicoVariant;
  /** Requerido cuando variant es `operational`. */
  menuState?: ParametrosGobernanzaModuloMenuState | null;
  renderForm?: (endpoint: EndpointSpec) => React.ReactNode;
  getCapabilities?: (endpoint: EndpointSpec) => GobernanzaEndpointCapabilities;
  className?: string;
};

function GobernanzaModuloOperational({
  menuState,
  renderForm,
  getCapabilities,
  className,
}: Required<Pick<GobernanzaModuloDinamicoProps, 'menuState' | 'renderForm' | 'getCapabilities'>> & {
  className?: string;
}): React.ReactElement {
  const {
    config,
    menuLoading,
    endpoints,
    activeActionId,
    activeEndpoint,
    setActiveActionId,
    actionShortLabels,
    menuDisponibleById,
  } = menuState;

  if (!menuLoading && !endpoints.length) {
    return (
      <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-6 text-center text-sm text-amber-900">
        No hay acciones disponibles para «{config.label}» con tu sesión actual.
      </p>
    );
  }

  return (
    <div className={className ?? 'space-y-4'} data-gobernanza-modulo={config.slug}>
      <GobernanzaModuloMenuTabs
        endpoints={endpoints}
        activeActionId={activeActionId}
        onActionChange={setActiveActionId}
        getCapabilities={getCapabilities}
        actionShortLabels={actionShortLabels}
        menuDisponibleById={menuDisponibleById}
        loading={menuLoading}
      />

      {activeEndpoint ? (
        <GobernanzaModuloInlinePanel
          endpoint={activeEndpoint}
          capabilities={getCapabilities(activeEndpoint)}
          variant="operational"
        >
          {renderForm(activeEndpoint)}
        </GobernanzaModuloInlinePanel>
      ) : menuLoading ? (
        <p className="text-sm text-muted-foreground">Cargando formulario…</p>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Selecciona una pestaña para continuar.
        </p>
      )}
    </div>
  );
}

/**
 * Gobernanza dinámica: vista configuración (ConfigInventario) u operativa (ParametrosGobernanza).
 */
export function GobernanzaModuloDinamico({
  variant = 'config',
  menuState,
  renderForm,
  getCapabilities,
  className,
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
      className={className}
    />
  );
}

/** Página de configuración (rejilla). Para operar un módulo use ParametrosGobernanza vía GobernanzaModuloPorRuta. */
export default function GobernanzaModuloDinamicoPage(): React.ReactElement {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <GobernanzaModuloDinamico variant="config" />
    </div>
  );
}
