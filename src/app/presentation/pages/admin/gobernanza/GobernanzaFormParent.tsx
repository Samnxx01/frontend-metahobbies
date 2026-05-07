import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type GobernanzaFormParentProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

/**
 * Contenedor base para formularios hijos del panel de gobernanza.
 * Usar composición: el padre (`ParametrosGobernanza`) sigue renderizando `renderForm`;
 * los nuevos flujos pueden montarse aquí como children parametrizados por ruta.
 */
export function GobernanzaFormParent({
  title,
  description,
  children,
  footer,
  className,
}: GobernanzaFormParentProps): React.ReactElement {
  return (
    <Card className={className ?? 'border-slate-200 shadow-sm'}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base text-slate-950">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        {footer}
      </CardContent>
    </Card>
  );
}
