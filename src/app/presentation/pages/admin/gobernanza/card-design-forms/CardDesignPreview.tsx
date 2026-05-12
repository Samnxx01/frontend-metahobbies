import React from 'react';
import type { EndpointSpec } from '../parametrosGobernanzaTypes';

export type CardDesignPreviewProps = {
  endpoint: EndpointSpec;
  /** Etiquetas opcionales junto al método (ej. Descendencia, tenantGlobal). */
  badges?: React.ReactNode;
};

export function CardDesignPreview({ endpoint, badges }: CardDesignPreviewProps): React.ReactElement {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vista previa</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[10px] font-semibold">
          {endpoint.method}
        </span>
        {badges}
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground">{endpoint.title}</p>
      <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{endpoint.description}</p>
      <code className="mt-3 block rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
        {endpoint.path}
      </code>
    </div>
  );
}
