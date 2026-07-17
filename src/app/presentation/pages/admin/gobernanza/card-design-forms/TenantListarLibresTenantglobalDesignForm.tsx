import React from 'react';
import { Badge } from '@/components/ui/badge';
import { EmbeddedApiFormSection } from './EmbeddedApiFormSection';
import { CardDesignControls } from './CardDesignControls';
import { CardDesignPreview } from './CardDesignPreview';
import { DesignFormFooterNote } from './DesignFormFooterNote';
import type { GobernanzaEndpointDesignFormProps } from './types';

/**
 * Formulario de diseño dedicado: GET listar tenantGlobal (misma API tenant/libres).
 */
export function TenantListarLibresTenantglobalDesignForm({
  endpoint,
  value,
  onChange,
  readOnly = false,
  embeddedApiForm,
}: GobernanzaEndpointDesignFormProps): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed border-info/60 bg-info/40 p-4 dark:bg-info/20">
        <p className="text-xs font-semibold text-foreground">Tarjeta GET ancha · referencia tenantGlobal</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ocupa más columnas en la rejilla; útil afinar sombras y contraste del bloque de ruta largo.
        </p>
      </div>

      <CardDesignPreview
        endpoint={endpoint}
        badges={
          <Badge variant="outline" className="rounded-md border-info/20 bg-info/10 text-info">
            tenantGlobal (ADMIN)
          </Badge>
        }
      />
      <CardDesignControls endpointId={endpoint.id} value={value} onChange={onChange} readOnly={readOnly} />
      {embeddedApiForm ? <EmbeddedApiFormSection>{embeddedApiForm}</EmbeddedApiFormSection> : null}
      <DesignFormFooterNote />
    </div>
  );
}
