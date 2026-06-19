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

function resolveRolSelectValue(
  rolSeleccionadoId: string | null,
  roles: RolMarcoParametrizable[]
): string | undefined {
  if (!rolSeleccionadoId) return undefined;
  return roles.find((r) => r._id === rolSeleccionadoId)?._id ?? undefined;
}

export function MarcoRolSelector({
  roles,
  rolSeleccionadoId,
  onRolChange,
  disabled = false,
  className,
}: Props): React.ReactElement {
  const selectValue = resolveRolSelectValue(rolSeleccionadoId, roles);

  return (
    <div className={className}>
      <Label htmlFor="marco-rol-corporativo" className="text-xs text-muted-foreground">
        Rol corporativo
      </Label>
      <Select
        value={selectValue}
        onValueChange={onRolChange}
        disabled={disabled || roles.length === 0}
      >
        <SelectTrigger id="marco-rol-corporativo" className="mt-1 w-full max-w-md">
          <SelectValue placeholder="Seleccione un rol corporativo…" />
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
