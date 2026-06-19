import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Database, Loader2, Settings2 } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GobernanzaModuloParametrizarFields } from './GobernanzaModuloParametrizarFields';
import { sembrarGobernanzaModulosCatalogo } from './gobernanzaModuloService';
import { useGobernanzaModuloParametrizar } from './useGobernanzaModuloParametrizar';

export type GobernanzaModuloParametrizarButtonProps = {
  moduloSlug: string;
  /** Preselecciona la ruta del path SPA al abrir el modal. */
  menuPathInicial?: string | null;
  onMenuRefresh?: () => void | Promise<void>;
  className?: string;
  size?: 'default' | 'sm';
};

/**
 * Publica / actualiza el menú del módulo en `gobernanzaModuloConfigs` vinculado a `rutaseguridads`.
 */
export function GobernanzaModuloParametrizarButton({
  moduloSlug,
  menuPathInicial = null,
  onMenuRefresh,
  className,
  size = 'default',
}: GobernanzaModuloParametrizarButtonProps): React.ReactElement {
  const { user } = useAuth();
  const esDios =
    String(user?.role ?? (user as { rol?: string } | null)?.rol ?? '').toUpperCase() === 'DIOS';

  const [open, setOpen] = useState(false);
  const [sembrando, setSembrando] = useState(false);

  const parametrizar = useGobernanzaModuloParametrizar({
    moduloSlug,
    open,
    menuPathInicial,
    onMenuRefresh,
  });

  const tituloModal =
    parametrizar.rutaSeleccionada?.name?.trim()
    || parametrizar.label.trim()
    || parametrizar.catalogoLocal?.label
    || moduloSlug;

  const sembrar = async () => {
    setSembrando(true);
    try {
      const data = await sembrarGobernanzaModulosCatalogo();
      const n = data?.totalSembrados ?? 0;
      if (n > 0) toast.success(`Sembrados ${n} módulo(s) desde catálogo.`);
      else toast.info('No hubo módulos nuevos para sembrar.');
      await parametrizar.refrescarAcciones();
      await onMenuRefresh?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al sembrar');
    } finally {
      setSembrando(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Settings2 className="h-4 w-4" />
        Parametrizar menú
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border/80 px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-primary" />
              Parametrizar «{tituloModal}»
            </DialogTitle>
            <DialogDescription className="text-left text-sm">
              Define ruta, tipo, nombre, descripción y operaciones habilitadas.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[min(60vh,520px)] overflow-y-auto px-6 py-4">
            <GobernanzaModuloParametrizarFields state={parametrizar} moduloSlug={moduloSlug} />
          </div>

          <DialogFooter className="flex flex-col gap-2 border-t border-border/80 bg-muted/20 px-6 py-4 sm:flex-row sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {esDios ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={sembrando || parametrizar.guardando}
                  onClick={() => void sembrar()}
                >
                  {sembrando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Importar catálogo
                </Button>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-end gap-1.5 sm:flex-none">
              {parametrizar.guardarBloqueadoPor ? (
                <p className="max-w-sm text-right text-[11px] text-amber-800">{parametrizar.guardarBloqueadoPor}</p>
              ) : null}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cerrar
                </Button>
                <Button
                  type="button"
                  disabled={!parametrizar.puedeGuardar || parametrizar.guardando}
                  onClick={() => void parametrizar.guardar()}
                >
                  {parametrizar.guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {parametrizar.esEdicionConfig ? 'Actualizar y aplicar' : 'Guardar y aplicar'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
