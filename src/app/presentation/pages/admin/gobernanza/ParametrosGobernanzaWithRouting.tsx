import React, { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ParametrosGobernanza, { type ParametrosGobernanzaProps } from '../ParametrosGobernanza';

export type ParametrosGobernanzaWithRoutingProps = ParametrosGobernanzaProps & {
  /** Nombre del query param para el id del endpoint (default: `endpoint`). */
  endpointQueryParam?: string;
};

/**
 * Envuelve `ParametrosGobernanza` y sincroniza el modal activo con la URL:
 * `?endpoint=<EndpointSpec.id>` abre ese formulario al cargar; al cerrar el modal se elimina el param.
 *
 * Ejemplo de ruta configurada en tu catálogo: `/admin/reglas?endpoint=tenant-listar-reglas`
 */
export function ParametrosGobernanzaWithRouting({
  endpointQueryParam = 'endpoint',
  initialEndpointId: initialEndpointIdProp,
  ...rest
}: ParametrosGobernanzaWithRoutingProps): React.ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialEndpointId = useMemo(() => {
    const q = searchParams.get(endpointQueryParam)?.trim();
    if (q) return q;
    const p = initialEndpointIdProp != null ? String(initialEndpointIdProp).trim() : '';
    return p || undefined;
  }, [searchParams, endpointQueryParam, initialEndpointIdProp]);

  const clearEndpointQuery = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(endpointQueryParam);
        return next;
      },
      { replace: true },
    );
  }, [endpointQueryParam, setSearchParams]);

  return (
    <ParametrosGobernanza
      {...rest}
      initialEndpointId={initialEndpointId ?? null}
      syncRouteWithEndpoint
      onRouteEndpointClear={clearEndpointQuery}
    />
  );
}
