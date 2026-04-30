import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface CronosSyncHijosFooterActionsProps {
  actualizadoEl: string | null;
  saving: boolean;
  disabled: boolean;
  onGuardar: () => void;
}

export function CronosSyncHijosFooterActions({
  actualizadoEl,
  saving,
  disabled,
  onGuardar,
}: CronosSyncHijosFooterActionsProps) {
  const textoActualizado =
    actualizadoEl &&
    (() => {
      try {
        return new Date(actualizadoEl).toLocaleString('es-CO');
      } catch {
        return actualizadoEl;
      }
    })();

  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        {textoActualizado
          ? `Último guardado en master: ${textoActualizado}`
          : 'Aún no hay fecha de guardado registrada.'}
      </p>
      <Button type="button" onClick={onGuardar} disabled={disabled || saving}>
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Guardando…
          </>
        ) : (
          'Guardar configuración'
        )}
      </Button>
    </div>
  );
}
