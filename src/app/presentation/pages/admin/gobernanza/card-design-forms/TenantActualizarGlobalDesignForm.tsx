import React from 'react';
import { Badge } from '@/components/ui/badge';
import { EmbeddedApiFormSection } from './EmbeddedApiFormSection';
import { CardDesignControls } from './CardDesignControls';
import { CardDesignPreview } from './CardDesignPreview';
import { DesignFormFooterNote } from './DesignFormFooterNote';
import type { GobernanzaEndpointDesignFormProps } from './types';

/**
 * Formulario de diseño dedicado: PUT actualizar tenant global (scope tenantSuperAdmin).
 */
export function TenantActualizarGlobalDesignForm({
  endpoint,
  value,
  onChange,
  readOnly = false,
  embeddedApiForm,
}: GobernanzaEndpointDesignFormProps): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed border-amber-300/60 bg-amber-50/40 p-4 dark:bg-amber-950/20">
        <p className="text-xs font-semibold text-foreground">Operación PUT · edición por id</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ajusta cómo se percibe la tarjeta de actualización frente a DELETE (misma fila visual).
        </p>
      </div>

      <CardDesignPreview
        endpoint={endpoint}
        badges={
          <Badge variant="outline" className="rounded-md border-amber-200 bg-amber-50 text-amber-950">
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
