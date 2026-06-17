import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { toast } from 'react-toastify';

import { Loader2, Tag } from 'lucide-react';

import { useTiposReglaVenta } from '@/app/hooks/useTiposReglaVenta';

import reglasVentasService, {

  type ReglaVenta,

  type ReglaVentaPayload,

  etiquetaTipoReglaVenta,

  resumenValorReglaVentaCatalogo,

} from '@/app/services/reglasVentasService';

import { Button } from '@/components/ui/button';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';

import { Switch } from '@/components/ui/switch';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Textarea } from '@/components/ui/textarea';

import { Pencil, Trash2 } from 'lucide-react';

import TipoReglaVentaModal from './TipoReglaVentaModal';



interface ReglasVentasModalProps {

  open: boolean;

  onOpenChange: (open: boolean) => void;

  onChanged?: () => void;

}



export default function ReglasVentasModal({

  open,

  onOpenChange,

  onChanged,

}: ReglasVentasModalProps): React.ReactElement {

  const [reglas, setReglas] = useState<ReglaVenta[]>([]);

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [editingCodigo, setEditingCodigo] = useState<string | null>(null);

  const [form, setForm] = useState<ReglaVentaPayload | null>(null);

  const [tiposRefreshKey, setTiposRefreshKey] = useState(0);

  const [tipoModalOpen, setTipoModalOpen] = useState(false);



  const { tipos, loading: loadingTipos, labelPorCodigo, comportamientoPorCodigo } = useTiposReglaVenta({

    admin: true,

    refreshKey: tiposRefreshKey,

    enabled: open,

  });



  const tiposActivos = useMemo(

    () => tipos.filter((t) => t.estado !== false),

    [tipos],

  );



  const tiposEnSelect = useMemo(() => {

    const activos = tiposActivos;

    const tipoActual = form?.tipo;

    if (!tipoActual || activos.some((t) => t.codigo === tipoActual)) return activos;

    const legacy = tipos.find((t) => t.codigo === tipoActual);

    return legacy ? [legacy, ...activos] : activos;

  }, [tipos, tiposActivos, form?.tipo]);



  const emptyForm = useMemo((): ReglaVentaPayload => ({

    codigo: '',

    nombre: '',

    descripcion: '',

    tipo: tiposActivos[0]?.codigo ?? '',

    valor: 0,

    aplicaEnCarrito: true,

    orden: 0,

    estado: true,

  }), [tiposActivos]);



  const loadReglas = useCallback(async (): Promise<void> => {

    setLoading(true);

    try {

      const data = await reglasVentasService.listarAdmin();

      setReglas(data);

    } catch (error) {

      toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las reglas de venta.');

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    if (open) void loadReglas();

  }, [open, loadReglas]);



  useEffect(() => {

    if (!open || form || editingCodigo) return;

    setForm(emptyForm);

  }, [open, form, editingCodigo, emptyForm]);



  useEffect(() => {

    if (!open || loadingTipos || !form || editingCodigo) return;

    const permitidos = new Set(tiposActivos.map((t) => t.codigo));

    if (!permitidos.size) return;

    if (form.tipo && permitidos.has(form.tipo)) return;

    setForm((prev) => (prev ? { ...prev, tipo: tiposActivos[0].codigo } : prev));

  }, [open, loadingTipos, form, editingCodigo, tiposActivos]);



  const resetForm = (): void => {

    setEditingCodigo(null);

    setForm(emptyForm);

  };



  const startEdit = (regla: ReglaVenta): void => {

    setEditingCodigo(regla.codigo);

    setForm({

      codigo: regla.codigo,

      nombre: regla.nombre,

      descripcion: regla.descripcion || '',

      tipo: regla.tipo,

      valor: 0,

      aplicaEnCarrito: regla.aplicaEnCarrito !== false,

      orden: Number(regla.orden || 0),

      estado: regla.estado !== false,

    });

  };



  const handleSave = async (): Promise<void> => {

    if (!form) return;

    setSaving(true);

    try {

      if (editingCodigo) {

        await reglasVentasService.actualizar(editingCodigo, form);

        toast.success('Regla de venta actualizada');

      } else {

        await reglasVentasService.crear(form);

        toast.success('Regla de venta creada');

      }

      resetForm();

      await loadReglas();

      onChanged?.();

    } catch (error) {

      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo guardar la regla.');

    } finally {

      setSaving(false);

    }

  };



  const handleDelete = async (regla: ReglaVenta): Promise<void> => {

    if (regla.esSistema) {

      toast.info('Las reglas de sistema no se pueden eliminar.');

      return;

    }

    try {

      await reglasVentasService.eliminar(regla.codigo);

      toast.success('Regla eliminada');

      if (editingCodigo === regla.codigo) resetForm();

      await loadReglas();

      onChanged?.();

    } catch (error) {

      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo eliminar la regla.');

    }

  };



  return (

    <>

      <Dialog open={open} onOpenChange={onOpenChange}>

        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">

          <DialogHeader>

            <div className="flex items-start justify-between gap-3 pr-8">

              <DialogTitle>Reglas de venta (carrito)</DialogTitle>

              <Button

                type="button"

                variant="outline"

                size="sm"

                className="shrink-0"

                onClick={() => setTipoModalOpen(true)}

              >

                <Tag className="mr-2 h-4 w-4" />

                Parametrizar tipos

              </Button>

            </div>

          </DialogHeader>



          <p className="text-sm text-muted-foreground">

            Defina aqui solo el concepto de cada regla (codigo, nombre y tipo). El porcentaje, cantidad

            maxima u otro valor se asigna al editar cada producto; si el producto tiene la regla activa,

            el carrito exige ese valor parametrizado.

          </p>



          {form ? (

            <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">

              <div className="space-y-3">

                <Label htmlFor="rv-codigo">Codigo</Label>

                <Input

                  id="rv-codigo"

                  value={form.codigo || ''}

                  disabled={Boolean(editingCodigo)}

                  onChange={(e) => setForm((prev) => prev ? ({ ...prev, codigo: e.target.value.toUpperCase() }) : prev)}

                  placeholder="MAX_CANTIDAD_CARRITO"

                />

                <Label htmlFor="rv-nombre">Nombre</Label>

                <Input

                  id="rv-nombre"

                  value={form.nombre}

                  onChange={(e) => setForm((prev) => prev ? ({ ...prev, nombre: e.target.value }) : prev)}

                />

                <div className="space-y-2">

                  <div className="flex items-center justify-between gap-2">

                    <Label htmlFor="rv-tipo">Tipo</Label>

                    {loadingTipos ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}

                  </div>

                  <select

                    id="rv-tipo"

                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"

                    value={form.tipo}

                    disabled={loadingTipos || !tiposEnSelect.length}

                    onChange={(e) => setForm((prev) => prev ? ({ ...prev, tipo: e.target.value }) : prev)}

                  >

                    {tiposEnSelect.map((tipo) => (

                      <option key={tipo.codigo} value={tipo.codigo} disabled={tipo.estado === false}>

                        {tipo.nombre} ({tipo.codigo}){tipo.estado === false ? ' — inactivo' : ''}

                      </option>

                    ))}

                  </select>

                </div>

              </div>

              <div className="space-y-3">

                <Label htmlFor="rv-descripcion">Descripcion</Label>

                <Textarea

                  id="rv-descripcion"

                  value={form.descripcion || ''}

                  onChange={(e) => setForm((prev) => prev ? ({ ...prev, descripcion: e.target.value }) : prev)}

                  rows={4}

                />

                <div className="flex items-center justify-between rounded-md border px-3 py-2">

                  <Label htmlFor="rv-carrito">Aplica en carrito</Label>

                  <Switch

                    id="rv-carrito"

                    checked={form.aplicaEnCarrito !== false}

                    onCheckedChange={(checked) => setForm((prev) => prev ? ({ ...prev, aplicaEnCarrito: checked }) : prev)}

                  />

                </div>

                <div className="flex items-center justify-between rounded-md border px-3 py-2">

                  <Label htmlFor="rv-estado">Activa</Label>

                  <Switch

                    id="rv-estado"

                    checked={form.estado !== false}

                    onCheckedChange={(checked) => setForm((prev) => prev ? ({ ...prev, estado: checked }) : prev)}

                  />

                </div>

              </div>

            </div>

          ) : null}



          <DialogFooter className="gap-2 sm:justify-start">

            <Button

              onClick={() => { void handleSave(); }}

              disabled={

                saving

                || !form?.nombre.trim()

                || loadingTipos

                || !form?.tipo

                || !tiposActivos.some((t) => t.codigo === form.tipo)

              }

            >

              {editingCodigo ? 'Actualizar regla' : 'Crear regla'}

            </Button>

            {editingCodigo && (

              <Button variant="outline" onClick={resetForm}>Cancelar edicion</Button>

            )}

          </DialogFooter>



          <Table>

            <TableHeader>

              <TableRow>

                <TableHead>Codigo</TableHead>

                <TableHead>Nombre</TableHead>

                <TableHead>Tipo</TableHead>

                <TableHead>Valor en producto</TableHead>

                <TableHead>Carrito</TableHead>

                <TableHead className="text-right">Accion</TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {loading ? (

                <TableRow><TableCell colSpan={6}>Cargando...</TableCell></TableRow>

              ) : reglas.map((regla) => (

                <TableRow key={regla.codigo}>

                  <TableCell className="font-mono text-xs">{regla.codigo}</TableCell>

                  <TableCell>{regla.nombre}</TableCell>

                  <TableCell>{labelPorCodigo(regla.tipo) || etiquetaTipoReglaVenta(regla.tipo, tipos)}</TableCell>

                  <TableCell className="text-muted-foreground">{resumenValorReglaVentaCatalogo(regla, tipos)}</TableCell>

                  <TableCell>{regla.aplicaEnCarrito ? 'Si' : 'No'}</TableCell>

                  <TableCell className="text-right">

                    <Button variant="ghost" size="icon" onClick={() => startEdit(regla)}>

                      <Pencil className="h-4 w-4" />

                    </Button>

                    {!regla.esSistema && (

                      <Button variant="ghost" size="icon" onClick={() => { void handleDelete(regla); }}>

                        <Trash2 className="h-4 w-4 text-destructive" />

                      </Button>

                    )}

                  </TableCell>

                </TableRow>

              ))}

            </TableBody>

          </Table>

        </DialogContent>

      </Dialog>



      <TipoReglaVentaModal

        open={tipoModalOpen}

        onOpenChange={setTipoModalOpen}

        saving={saving}

        onTiposActualizados={() => setTiposRefreshKey((k) => k + 1)}

      />

    </>

  );

}

