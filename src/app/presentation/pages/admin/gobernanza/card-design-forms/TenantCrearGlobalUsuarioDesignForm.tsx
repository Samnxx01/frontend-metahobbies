import React from 'react';
import { Badge } from '@/components/ui/badge';
import { EmbeddedApiFormSection } from './EmbeddedApiFormSection';
import { CardDesignControls } from './CardDesignControls';
import { CardDesignPreview } from './CardDesignPreview';
import { DesignFormFooterNote } from './DesignFormFooterNote';
import type { GobernanzaEndpointDesignFormProps } from './types';

/**
 * Formulario de diseño dedicado: POST crear tenant global desde tenantGlobal (Descendencia).
 */
export function TenantCrearGlobalUsuarioDesignForm({
  endpoint,
  value,
  onChange,
  readOnly = false,
  embeddedApiForm,
}: GobernanzaEndpointDesignFormProps): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed border-info/60 bg-info/40 p-4 dark:bg-info/20">
        <p className="text-xs font-semibold text-foreground">Tarjeta principal · flujo tenantGlobal</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Encabezado ancho completo, etiqueta «Descendencia» y bloque de ruta del POST{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">/tenant/global</code>.
        </p>
      </div>

      <CardDesignPreview
        endpoint={endpoint}
        badges={<Badge className="rounded-md border-info/20 bg-info/10 text-info">Descendencia</Badge>}
      />
      <CardDesignControls endpointId={endpoint.id} value={value} onChange={onChange} readOnly={readOnly} />
      {embeddedApiForm ? <EmbeddedApiFormSection>{embeddedApiForm}</EmbeddedApiFormSection> : null}
      <DesignFormFooterNote />
    </div>
  );
}
