import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RolMarcoParametrizable } from '../types/marco.types';

type Props = {
  roles: RolMarcoParametrizable[];
  rolSeleccionadoId: string | null;
  onRolChange: (rolId: string) => void;
  disabled?: boolean;
  className?: string;
};

export function MarcoRolSelector({
  roles,
  rolSeleccionadoId,
  onRolChange,
  disabled = false,
  className,
}: Props): React.ReactElement {
  const rolActual = roles.find((r) => r._id === rolSeleccionadoId);

  return (
    <div className={className}>
      <Label htmlFor="marco-rol-corporativo" className="text-xs text-muted-foreground">
        Rol corporativo
      </Label>
      <Select
        value={rolSeleccionadoId ?? undefined}
        onValueChange={onRolChange}
        disabled={disabled || roles.length === 0}
      >
        <SelectTrigger id="marco-rol-corporativo" className="mt-1 w-full max-w-md">
          <SelectValue placeholder="Seleccione un rol corporativo…">
            {rolActual
              ? `${rolActual.rol}${rolActual.tenantCorporativo ? ' (tenant)' : ''} — ${rolActual.codigo}`
              : 'Seleccione un rol corporativo…'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {roles.map((r) => (
            <SelectItem key={r._id} value={r._id}>
              {r.rol}
              {r.tenantCorporativo ? ' (tenant)' : ''} — {r.codigo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
