import React, { useCallback, useEffect, useState } from 'react';
import { abrirAlerta, cerrarAlerta } from '@/app/utils/alertasTransaccion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  actualizarTipoPublicidad,
  crearTipoPublicidad,
  eliminarTipoPublicidad,
  listarTiposPublicidad,
  type TipoPublicidad,
  type PublicidadRender,
  type PublicidadPosicion,
} from '@/app/services/contenidoDestacadoService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TiposPublicidadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se dispara al guardar para que el panel refresque su selector. */
  onCatalogoActualizado?: () => void;
}

type TipoForm = {
  codigo: string;
  nombre: string;
  descripcion: string;
  orden: string;
  estado: boolean;
  // Visualización: define cómo se dibuja el contenido de este tipo.
  render: PublicidadRender;
  flotante: boolean;
  posicion: PublicidadPosicion;
  ancho: string;
  cerrable: boolean;
};

const emptyForm: TipoForm = {
  codigo: '',
  nombre: '',
  descripcion: '',
  orden: '0',
  estado: true,
  render: 'SECCION',
  flotante: false,
  posicion: 'INFERIOR_DERECHA',
  ancho: '22rem',
  cerrable: true,
};

const RENDER_LABELS: Record<PublicidadRender, string> = {
  SECCION: 'Seccion completa (ancho de la pagina)',
  TARJETA: 'Tarjeta (widget)',
  MODAL: 'Modal emergente',
  CARRUSEL: 'Diapositiva del banner principal',
  BANNER: 'Banner de invitacion (imagen + llamado a la accion)',
};

const POSICION_LABELS: Record<PublicidadPosicion, string> = {
  SUPERIOR_IZQUIERDA: 'Arriba a la izquierda',
  SUPERIOR_CENTRO: 'Arriba al centro',
  SUPERIOR_DERECHA: 'Arriba a la derecha',
  CENTRO_IZQUIERDA: 'Centro a la izquierda',
  CENTRO: 'Centro de la pantalla',
  CENTRO_DERECHA: 'Centro a la derecha',
  INFERIOR_IZQUIERDA: 'Abajo a la izquierda',
  INFERIOR_CENTRO: 'Abajo al centro',
  INFERIOR_DERECHA: 'Abajo a la derecha',
};

const getTipoId = (tipo: TipoPublicidad): string => tipo.iud || tipo._id || '';

/** CRUD del catálogo de tipos de publicidad (colección tipoPublicidad). */
export default function TiposPublicidadDialog({
  open,
  onOpenChange,
  onCatalogoActualizado,
}: TiposPublicidadDialogProps): React.ReactElement {
  const [tipos, setTipos] = useState<TipoPublicidad[]>([]);
  const [form, setForm] = useState<TipoForm>(emptyForm);
  const [editandoId, setEditandoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [eliminandoId, setEliminandoId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setTipos(await listarTiposPublicidad());
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar el catalogo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void cargar();
  }, [open, cargar]);

  const cancelarEdicion = (): void => {
    setEditandoId('');
    setForm(emptyForm);
  };

  const editar = (tipo: TipoPublicidad): void => {
    setEditandoId(getTipoId(tipo));
    setError('');
    setSuccess('');
    setForm({
      codigo: tipo.codigo || '',
      nombre: tipo.nombre || '',
      descripcion: tipo.descripcion || '',
      orden: String(tipo.orden ?? 0),
      estado: tipo.estado !== false,
      render: tipo.visual?.render || 'SECCION',
      flotante: tipo.visual?.flotante === true,
      posicion: tipo.visual?.posicion || 'INFERIOR_DERECHA',
      ancho: tipo.visual?.ancho || '22rem',
      cerrable: tipo.visual?.cerrable !== false,
    });
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    const alerta = abrirAlerta(editandoId ? 'Guardando cambios del tipo…' : 'Creando tipo…');

    try {
      const payload = {
        codigo: form.codigo.trim().toUpperCase().replace(/\s+/g, '_'),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        orden: Number(form.orden || 0),
        estado: form.estado,
        visual: {
          render: form.render,
          flotante: form.flotante,
          posicion: form.posicion,
          ancho: form.ancho.trim() || '22rem',
          cerrable: form.cerrable,
        },
      };

      if (!payload.nombre) throw new Error('Escribe el nombre del tipo.');
      if (!editandoId && !payload.codigo) throw new Error('Escribe el codigo del tipo.');

      if (editandoId) {
        await actualizarTipoPublicidad(editandoId, payload);
        setSuccess('Tipo actualizado.');
        cerrarAlerta(alerta, 'success', 'Tipo actualizado.');
      } else {
        await crearTipoPublicidad(payload);
        setSuccess('Tipo creado.');
        cerrarAlerta(alerta, 'success', 'Tipo creado.');
      }

      cancelarEdicion();
      await cargar();
      onCatalogoActualizado?.();
    } catch (err: any) {
      const mensaje = err?.message || 'No se pudo guardar el tipo';
      setError(mensaje);
      cerrarAlerta(alerta, 'error', mensaje);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminar = async (tipo: TipoPublicidad): Promise<void> => {
    const id = getTipoId(tipo);
    if (!id) return;
    if (typeof window !== 'undefined' && !window.confirm(`¿Eliminar el tipo "${tipo.nombre}"?`)) return;

    setEliminandoId(id);
    setError('');
    setSuccess('');
    const alerta = abrirAlerta('Eliminando tipo…');

    try {
      await eliminarTipoPublicidad(id);
      if (editandoId === id) cancelarEdicion();
      setSuccess('Tipo eliminado.');
      cerrarAlerta(alerta, 'success', 'Tipo eliminado.');
      await cargar();
      onCatalogoActualizado?.();
    } catch (err: any) {
      const mensaje = err?.message || 'No se pudo eliminar el tipo';
      setError(mensaje);
      cerrarAlerta(alerta, 'error', mensaje);
    } finally {
      setEliminandoId('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95%] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Tipos de publicidad</DialogTitle>
          <DialogDescription>
            Catalogo parametrizable: define como se presenta cada contenido. El codigo es lo que
            usa la pagina para elegir el render (SECCION, WIDGET, MODAL, CARRUSEL).
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {success ? (
          <div className="flex items-start gap-2 rounded-md border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-md border border-border">
            {loading ? (
              <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando tipos...
              </div>
            ) : !tipos.length ? (
              <div className="flex min-h-40 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                Aun no hay tipos parametrizados.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {tipos.map((tipo) => {
                  const id = getTipoId(tipo);
                  return (
                    <article key={id} className="space-y-2 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-foreground">{tipo.nombre}</h3>
                          <p className="text-xs text-muted-foreground">Codigo: {tipo.codigo}</p>
                        </div>
                        <Badge variant={tipo.estado === false ? 'outline' : 'default'} className="rounded-md">
                          {tipo.estado === false ? 'Inactivo' : 'Activo'}
                        </Badge>
                      </div>

                      {tipo.descripcion ? (
                        <p className="text-sm text-muted-foreground">{tipo.descripcion}</p>
                      ) : null}

                      <div className="flex flex-wrap gap-1 text-xs">
                        <Badge variant="secondary" className="rounded-md font-normal">
                          {RENDER_LABELS[tipo.visual?.render || 'SECCION']}
                        </Badge>
                        {tipo.visual?.render === 'TARJETA' ? (
                          <Badge variant="outline" className="rounded-md font-normal">
                            {tipo.visual?.flotante
                              ? `Flotante · ${POSICION_LABELS[tipo.visual?.posicion || 'INFERIOR_DERECHA']}`
                              : 'Plasmada en la pagina'}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          id={`btn-editar-tipo-${id}`}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => editar(tipo)}
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          id={`btn-eliminar-tipo-${id}`}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void handleEliminar(tipo)}
                          disabled={eliminandoId === id}
                        >
                          {eliminandoId === id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Eliminar
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-md border border-border p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              {editandoId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editandoId ? 'Editar tipo' : 'Nuevo tipo'}
            </h3>

            <div className="space-y-2">
              <Label htmlFor="tipo-codigo">Codigo *</Label>
              <Input
                id="tipo-codigo"
                value={form.codigo}
                onChange={(event) => setForm((prev) => ({ ...prev, codigo: event.target.value }))}
                placeholder="Ej. BANNER_LATERAL"
                disabled={Boolean(editandoId)}
                required={!editandoId}
              />
              <p className="text-xs text-muted-foreground">
                {editandoId
                  ? 'El codigo no se modifica: es la referencia que usan los registros existentes.'
                  : 'Sin espacios; se guarda en mayusculas.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo-nombre">Nombre *</Label>
              <Input
                id="tipo-nombre"
                value={form.nombre}
                onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
                placeholder="Ej. Banner lateral"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo-descripcion">Descripcion</Label>
              <Textarea
                id="tipo-descripcion"
                value={form.descripcion}
                onChange={(event) => setForm((prev) => ({ ...prev, descripcion: event.target.value }))}
                placeholder="Como se muestra este tipo en la pagina"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo-orden">Orden</Label>
              <Input
                id="tipo-orden"
                type="number"
                value={form.orden}
                onChange={(event) => setForm((prev) => ({ ...prev, orden: event.target.value }))}
              />
            </div>

            {/* Visualizacion: define como se dibuja este tipo en la interfaz */}
            <div className="space-y-3 rounded-md border border-border p-3">
              <Label className="text-sm">Visualizacion</Label>

              <div className="space-y-2">
                <Label htmlFor="tipo-render" className="text-xs text-muted-foreground">Se dibuja como</Label>
                <Select
                  value={form.render}
                  onValueChange={(value) => setForm((prev) => ({
                    ...prev,
                    render: value as PublicidadRender,
                    // Una seccion o un carrusel nunca flotan.
                    flotante: value === 'TARJETA' || value === 'MODAL' ? prev.flotante : false,
                  }))}
                >
                  <SelectTrigger id="tipo-render"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(RENDER_LABELS) as PublicidadRender[]).map((render) => (
                      <SelectItem key={render} value={render}>{RENDER_LABELS[render]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.render === 'TARJETA' ? (
                <>
                  <div className="flex items-center justify-between rounded-md border border-border p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="tipo-flotante" className="text-sm">Flotante</Label>
                      <p className="text-xs text-muted-foreground">
                        {form.flotante
                          ? 'Se ancla sobre la pagina en una esquina.'
                          : 'Se plasma dentro del contenido de la pagina.'}
                      </p>
                    </div>
                    <Switch
                      id="tipo-flotante"
                      checked={form.flotante}
                      onCheckedChange={(checked) => setForm((prev) => ({ ...prev, flotante: checked }))}
                    />
                  </div>

                  {form.flotante ? (
                    <div className="space-y-2">
                      <Label htmlFor="tipo-posicion" className="text-xs text-muted-foreground">Posicion</Label>
                      <Select
                        value={form.posicion}
                        onValueChange={(value) => setForm((prev) => ({ ...prev, posicion: value as PublicidadPosicion }))}
                      >
                        <SelectTrigger id="tipo-posicion"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(POSICION_LABELS) as PublicidadPosicion[]).map((posicion) => (
                            <SelectItem key={posicion} value={posicion}>{POSICION_LABELS[posicion]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  <div className="space-y-1">
                    <Label htmlFor="tipo-ancho" className="text-xs text-muted-foreground">Ancho maximo</Label>
                    <Input
                      id="tipo-ancho"
                      value={form.ancho}
                      onChange={(event) => setForm((prev) => ({ ...prev, ancho: event.target.value }))}
                      placeholder="22rem, 380px, 100%"
                    />
                    <p className="text-xs text-muted-foreground">
                      Solo acota en pantallas grandes: en movil y tablet la tarjeta se adapta sola.
                    </p>
                  </div>
                </>
              ) : null}

              {form.render === 'TARJETA' || form.render === 'MODAL' ? (
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <Label htmlFor="tipo-cerrable" className="text-sm">El visitante puede cerrarlo</Label>
                  <Switch
                    id="tipo-cerrable"
                    checked={form.cerrable}
                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, cerrable: checked }))}
                  />
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <Label htmlFor="tipo-estado" className="text-sm">Activo</Label>
              <Switch
                id="tipo-estado"
                checked={form.estado}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, estado: checked }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button id="btn-guardar-tipo" type="submit" disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : editandoId ? (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar cambios
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Agregar tipo
                  </>
                )}
              </Button>

              {editandoId ? (
                <Button
                  id="btn-cancelar-edicion-tipo"
                  type="button"
                  variant="ghost"
                  onClick={cancelarEdicion}
                  className="w-full"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
