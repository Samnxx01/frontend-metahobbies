import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Save, Users } from 'lucide-react';
import { MARCO_AFILIADO_CODIGO } from '../constants/catalog-filters';
import { MarcoPermisosAyudaModal } from './MarcoPermisosAyudaModal';
import { MarcoRolSelector } from './MarcoRolSelector';
import type { MarcoPermisosAfiliado, RolMarcoParametrizable } from '../types/marco.types';

type Props = {
  saving: boolean;
  syncing: boolean;
  marcoLoading?: boolean;
  hasMarco: boolean;
  marcoActivo: MarcoPermisosAfiliado | null;
  roles: RolMarcoParametrizable[];
  rolSeleccionadoId: string | null;
  rolSeleccionado: RolMarcoParametrizable | null;
  onRolChange: (rolId: string) => void;
  vistasCount: number;
  accionesCount: number;
  onRecargar: () => void;
  onSincronizar: () => void;
  onGuardar: () => void;
};

export function MarcoPermisosPageHeader({
  saving,
  syncing,
  marcoLoading = false,
  hasMarco,
  marcoActivo,
  roles,
  rolSeleccionadoId,
  rolSeleccionado,
  onRolChange,
  vistasCount,
  accionesCount,
  onRecargar,
  onSincronizar,
  onGuardar,
}: Props): React.ReactElement {
  const codigoMarco = rolSeleccionado?.codigo ?? marcoActivo?.codigo ?? MARCO_AFILIADO_CODIGO;
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Techo permisos afiliado</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Parametrización del marco{' '}
            <code className="rounded bg-muted px-1">{codigoMarco}</code>. Los usuarios con el rol
            seleccionado solo pueden usar rutas y métodos HTTP incluidos aquí.
          </p>
        </div>
        <MarcoRolSelector
          roles={roles}
          rolSeleccionadoId={rolSeleccionadoId}
          onRolChange={onRolChange}
          disabled={saving || syncing || marcoLoading}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <MarcoPermisosAyudaModal
          marcoActivo={marcoActivo}
          vistasCount={vistasCount}
          accionesCount={accionesCount}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRecargar}
          disabled={saving || syncing}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Recargar
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onSincronizar}
          disabled={syncing || saving || !hasMarco}
        >
          {syncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Users className="mr-2 h-4 w-4" />
          )}
          Sincronizar mi sesión
        </Button>
        <Button type="button" size="sm" onClick={onGuardar} disabled={saving || syncing}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar techo
        </Button>
      </div>
    </div>
  );
}
