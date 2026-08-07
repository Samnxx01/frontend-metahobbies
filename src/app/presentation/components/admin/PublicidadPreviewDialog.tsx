import React, { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import {
  getPublicidadImageUrl,
  obtenerPublicidadModalActiva,
  type PublicidadModal,
} from '@/app/services/contenidoDestacadoService';
import { sanitizeRichText, richTextToPlain } from '@/app/utils/sanitizeRichText';
import AboutUsView, { mapPublicidadToAboutUs } from '@/app/presentation/components/about/AboutUsView';

export interface PublicidadPreviewTarget {
  /** Etiqueta del registro a resolver contra el endpoint público. */
  etiqueta?: string;
  /** Ruta de la sección a previsualizar, tal como la resolvería la página. */
  seccionPath?: string;
}

interface PublicidadPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: PublicidadPreviewTarget | null;
}

/** Réplica del modal publicitario para registros sin sección asociada. */
const ModalPreview = ({ publicidad }: { publicidad: PublicidadModal }): React.ReactElement => {
  const imagen = getPublicidadImageUrl(publicidad);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div
          className="h-[200px] w-full bg-muted bg-contain bg-center bg-no-repeat md:h-[340px]"
          style={{ backgroundImage: imagen ? `url(${imagen})` : undefined }}
        />

        <div className="flex flex-col justify-center p-6">
          <h2
            className="mb-3 text-3xl font-bold text-primary"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(publicidad.tittle) }}
          />

          {publicidad.subtittle ? (
            <p className="mb-3 text-lg font-semibold">{publicidad.subtittle}</p>
          ) : null}

          <div
            className="mb-4 text-lg text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(publicidad.body) }}
          />

          {publicidad.price ? (
            <p className="mb-6 text-2xl font-semibold text-primary">{publicidad.price}</p>
          ) : null}

          {publicidad.buttonText ? (
            <Button className="w-full rounded-lg py-6 text-lg font-semibold" type="button">
              {richTextToPlain(publicidad.buttonText)}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

/**
 * Vista previa del contenido tal como lo resuelve el endpoint público.
 * Consulta por etiqueta, así que también sirve para confirmar que el registro
 * realmente resolverá en la página (alcance, estado y ruta correctos).
 */
export default function PublicidadPreviewDialog({
  open,
  onOpenChange,
  target,
}: PublicidadPreviewDialogProps): React.ReactElement {
  const [publicidad, setPublicidad] = useState<PublicidadModal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const etiqueta = target?.etiqueta || '';
  const seccionPath = target?.seccionPath || '';

  const cargar = useCallback(async () => {
    if (!etiqueta && !seccionPath) return;
    setLoading(true);
    setError('');

    try {
      // Se consulta como visitante anónimo: es lo que verá el público en la página.
      const resultado = await obtenerPublicidadModalActiva(
        etiqueta
          ? { etiqueta, comoVisitante: true }
          : { path: seccionPath, seccionPath, comoVisitante: true }
      );
      setPublicidad(resultado);
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar la vista previa');
      setPublicidad(null);
    } finally {
      setLoading(false);
    }
  }, [etiqueta, seccionPath]);

  useEffect(() => {
    if (open) void cargar();
  }, [open, cargar]);

  const esSeccion = Boolean(publicidad?.seccionPath);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95%] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Vista previa
            {etiqueta ? (
              <Badge variant="secondary" className="rounded-md">{etiqueta}</Badge>
            ) : null}
            {seccionPath ? (
              <Badge variant="secondary" className="rounded-md">Ruta: {seccionPath}</Badge>
            ) : null}
            {publicidad ? (
              <Badge variant="outline" className="rounded-md">
                {esSeccion ? `Sección: ${publicidad.seccionPath}` : 'Modal de inicio'}
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            Así resuelve el contenido el endpoint público, con los estilos y colores de la paleta activa.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button
            id="btn-refrescar-vista-previa"
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void cargar()}
            disabled={loading}
          >
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Actualizar
          </Button>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando vista previa...
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : !publicidad ? (
          <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            El endpoint público no devolvió contenido para {etiqueta ? `la etiqueta "${etiqueta}"` : `la ruta ${seccionPath}`}.
            Revisa que el registro esté activo y que la ruta asociada coincida con la ruta donde se muestra la sección.
          </div>
        ) : esSeccion ? (
          <div className="overflow-hidden rounded-lg border border-border">
            <AboutUsView contenido={mapPublicidadToAboutUs(publicidad)} />
          </div>
        ) : (
          <ModalPreview publicidad={publicidad} />
        )}
      </DialogContent>
    </Dialog>
  );
}
