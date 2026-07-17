import React from 'react';
import { Badge } from '@/components/ui/badge';
import { EmbeddedApiFormSection } from './EmbeddedApiFormSection';
import { CardDesignControls } from './CardDesignControls';
import { CardDesignPreview } from './CardDesignPreview';
import { DesignFormFooterNote } from './DesignFormFooterNote';
import type { GobernanzaEndpointDesignFormProps } from './types';
import { resolveTenantSuperAdminInsertHint } from '../tenant-forms/tenantSuperAdminInsertHints';

export function TenantSuperAdminInsertDesignForm({
  endpoint,
  value,
  onChange,
  readOnly = false,
  embeddedApiForm,
}: GobernanzaEndpointDesignFormProps): React.ReactElement {
  const meta = resolveTenantSuperAdminInsertHint(endpoint.id);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed border-info/60 bg-info/40 p-4 dark:bg-info/20">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-md border-info/50">
            {meta.eyebrow}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{meta.hint}</p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">{endpoint.path}</p>
      </div>

      <CardDesignPreview endpoint={endpoint} value={value} />
      <CardDesignControls endpoint={endpoint} value={value} onChange={onChange} readOnly={readOnly} />
      <EmbeddedApiFormSection embeddedApiForm={embeddedApiForm} />
      <DesignFormFooterNote endpoint={endpoint} />
    </div>
  );
}
