import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MarcoPermisosAfiliado } from '../types/marco.types';

type Props = {
  marcoActivo: MarcoPermisosAfiliado | null;
  vistasCount: number;
  accionesCount: number;
};

export function MarcoPermisosStatsCards({
  marcoActivo,
  vistasCount,
  accionesCount,
}: Props): React.ReactElement {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Versión activa</CardTitle>
        </CardHeader>
        <CardContent>
          {marcoActivo ? (
            <p className="text-2xl font-bold">seq {marcoActivo.seq}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Sin marco — guarde el primero abajo</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Vistas en techo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{vistasCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Acciones en techo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{accionesCount}</p>
        </CardContent>
      </Card>
    </div>
  );
}
