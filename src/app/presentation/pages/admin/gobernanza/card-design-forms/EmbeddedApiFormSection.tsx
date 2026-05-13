import React from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type EmbeddedApiFormSectionProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Contenedor visual para el formulario API incrustado desde ParametrosGobernanza (`renderForm`).
 */
export function EmbeddedApiFormSection({ children, className }: EmbeddedApiFormSectionProps): React.ReactElement {
  return (
    <div className={cn('rounded-lg border border-border bg-muted/20', className)}>
      <div className="border-b border-border bg-muted/40 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Formulario API (misma lógica que Configurar)</p>
      </div>
      <div className="max-h-[min(52vh,560px)] overflow-auto p-3 md:p-4">{children}</div>
    </div>
  );
}
