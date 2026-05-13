import React from 'react';
import { Badge } from '@/components/ui/badge';
import { EmbeddedApiFormSection } from './EmbeddedApiFormSection';
import { CardDesignControls } from './CardDesignControls';
import { CardDesignPreview } from './CardDesignPreview';
import { DesignFormFooterNote } from './DesignFormFooterNote';
import type { GobernanzaEndpointDesignFormProps } from './types';

/**
 * Formulario de diseño dedicado: DELETE eliminar tenant global (definitivo).
 */
export function TenantEliminarGlobalDesignForm({
  endpoint,
  value,
  onChange,
  readOnly = false,
  embeddedApiForm,
}: GobernanzaEndpointDesignFormProps): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border-2 border-dashed border-destructive/40 bg-destructive/[0.06] p-4">
        <p className="text-xs font-semibold text-destructive">Eliminación definitiva</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Refuerza el contraste del método DELETE y del bloque de ruta para lectura rápida en auditoría visual.
        </p>
      </div>

      <CardDesignPreview
        endpoint={endpoint}
        badges={
          <Badge variant="outline" className="rounded-md border-destructive/40 bg-destructive/10 text-destructive">
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
