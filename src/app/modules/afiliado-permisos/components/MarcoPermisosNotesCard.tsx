import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  notas: string;
  onNotasChange: (value: string) => void;
};

export function MarcoPermisosNotesCard({ notas, onNotasChange }: Props): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notas internas</CardTitle>
        <CardDescription>Opcional — queda en el documento del marco</CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          value={notas}
          onChange={(e) => onNotasChange(e.target.value)}
          placeholder="Ej: módulo referidos v1 — marzo 2026"
          rows={2}
        />
      </CardContent>
    </Card>
  );
}
