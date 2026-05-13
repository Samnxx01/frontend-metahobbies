import React from 'react';
import { Badge } from '@/components/ui/badge';
import { EmbeddedApiFormSection } from './EmbeddedApiFormSection';
import { CardDesignControls } from './CardDesignControls';
import { CardDesignPreview } from './CardDesignPreview';
import { DesignFormFooterNote } from './DesignFormFooterNote';
import type { GobernanzaEndpointDesignFormProps } from './types';

/**
 * Formulario de diseño dedicado: DELETE desactivar tenant global.
 */
export function TenantDesactivarGlobalDesignForm({
  endpoint,
  value,
  onChange,
  readOnly = false,
  embeddedApiForm,
}: GobernanzaEndpointDesignFormProps): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed border-red-300/50 bg-red-50/30 p-4 dark:bg-red-950/15">
        <p className="text-xs font-semibold text-foreground">Acción destructiva suave</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Puedes usar acento rosa o borde mínimo para diferenciar visualmente de «Eliminar» definitivo.
        </p>
      </div>

      <CardDesignPreview
        endpoint={endpoint}
        badges={
          <Badge variant="outline" className="rounded-md border-red-200 bg-red-50 text-red-900">
            tenantSuperAdmin (DIOS)
          </Badge>
        }
      />
      <CardDesignControls endpointId={endpoint.id} value={value} onChange={onChange} readOnly={readOnly} />
      {embeddedApiForm ? <EmbeddedApiFormSection>{embeddedApiForm}</EmbeddedApiFormSection> : null}
      <DesignFormFooterNote />
    </div>
  );
}
