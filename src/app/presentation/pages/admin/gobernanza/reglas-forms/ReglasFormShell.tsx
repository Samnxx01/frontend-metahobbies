import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { GobernanzaReglasFormProps } from './types';

type ReglasFormShellProps = GobernanzaReglasFormProps & {
  eyebrow: string;
  hint: string;
};

export function ReglasFormShell({
  embeddedApiForm,
  capabilities,
  eyebrow,
  hint,
}: ReglasFormShellProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-md">
            {eyebrow}
          </Badge>
          {capabilities?.diosSoloLectura ? (
            <Badge variant="outline" className="rounded-md border-warning/20 bg-warning/10 text-warning">
              Solo lectura
            </Badge>
          ) : null}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      </div>
      {embeddedApiForm}
    </div>
  );
}
