import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import inventarioService, { type InventarioTipoProveedor } from '@/app/services/inventarioService';
import { apiFetch } from '@/app/services/api';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type GeoCiudad = { ciudadId: string; nombre_ciudad: string };
type GeoDepartamento = {
  departamentoId: string;
  nombre_departamento?: string;
  nombre_Departamento?: string;
  nombre_Dapartamento?: string;
  ciudades?: GeoCiudad[];
};
type GeoPais = { Id: string; nombre_pais: string };

export type InventarioProveedorDraft = {
  nombre: string;
  nit: string;
  correo: string;
  telefono: string;
  direccion: string;
  tipoProveedorId: string;
  paisId: string;
  departamentoId: string;
  ciudadId: string;
};

const draftInicial: InventarioProveedorDraft = {
  nombre: '',
  nit: '',
  correo: '',
  telefono: '',
  direccion: '',
  tipoProveedorId: '',
  paisId: '1',
  departamentoId: '',
  ciudadId: '',
};

type TipoProveedorDraft = {
  codigo: string;
  nombre: string;
  descripcion: string;
};

const tipoProveedorInicial: TipoProveedorDraft = {
  codigo: '',
  nombre: '',
  descripcion: '',
};

type InventarioProveedorModalProps = {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: InventarioProveedorDraft) => Promise<void>;
  showTrigger?: boolean;
  triggerClassName?: string;
};

const getTipoProveedorId = (tipo: InventarioTipoProveedor): string =>
  String(tipo._id || tipo.iud || '');

const getDepartamentoNombre = (dep: GeoDepartamento): string =>
  dep.nombre_departamento || dep.nombre_Dapartamento || dep.nombre_Departamento || `Departamento ${dep.departamentoId}`;

export default function InventarioProveedorModal({
  open,
  saving,
  onOpenChange,
  onSubmit,
  showTrigger = false,
  triggerClassName = '',
}: InventarioProveedorModalProps): React.ReactElement {
  const [draft, setDraft] = useState<InventarioProveedorDraft>(draftInicial);
  const [tiposProveedor, setTiposProveedor] = useState<InventarioTipoProveedor[]>([]);
  const [paises, setPaises] = useState<GeoPais[]>([]);
  const [departamentos, setDepartamentos] = useState<GeoDepartamento[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState<boolean>(false);
  const [tipoModalOpen, setTipoModalOpen] = useState<boolean>(false);
  const [tipoDraft, setTipoDraft] = useState<TipoProveedorDraft>(tipoProveedorInicial);
  const [savingTipo, setSavingTipo] = useState<boolean>(false);
  const [editingTipoId, setEditingTipoId] = useState<string | null>(null);
  const [tipoDeleteTarget, setTipoDeleteTarget] = useState<InventarioTipoProveedor | null>(null);
  const [tipoDeleteBusy, setTipoDeleteBusy] = useState<boolean>(false);

  const refreshTiposProveedor = useCallback(async (): Promise<void> => {
    try {
      const tipos = await inventarioService.listarTiposProveedor();
      setTiposProveedor(tipos);
    } catch (error) {
      console.error('Error cargando tipos de proveedor:', error);
      toast.error('No se pudo actualizar el catálogo de tipos.');
    }
  }, []);

  const ciudades = useMemo(() => {
    const dep = departamentos.find((item) => String(item.departamentoId) === String(draft.departamentoId));
    return dep?.ciudades || [];
  }, [departamentos, draft.departamentoId]);

  const cargarCatalogos = async (): Promise<void> => {
    try {
      setLoadingCatalogos(true);
      const [tipos, geo] = await Promise.all([
        inventarioService.listarTiposProveedor(),
        apiFetch('/api/perfil/seguridad/listar/paises/departamentos/ciudades?paisId=1', { method: 'GET' }),
      ]);
      setTiposProveedor(tipos);
      setPaises(geo?.pais ? [geo.pais] : []);
      setDepartamentos((geo?.departamentos || []) as GeoDepartamento[]);
    } catch (error) {
      console.error('Error cargando catalogos de proveedor:', error);
    } finally {
      setLoadingCatalogos(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setDraft(draftInicial);
    void cargarCatalogos();
  }, [open]);

  useEffect(() => {
    if (!tipoModalOpen) {
      setEditingTipoId(null);
      setTipoDraft(tipoProveedorInicial);
      setTipoDeleteTarget(null);
      return;
    }
    void refreshTiposProveedor();
  }, [tipoModalOpen, refreshTiposProveedor]);

  const update = (field: keyof InventarioProveedorDraft, value: string): void => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (): Promise<void> => {
    await onSubmit(draft);
  };

  const iniciarEdicionTipo = (tipo: InventarioTipoProveedor): void => {
    setEditingTipoId(getTipoProveedorId(tipo));
    setTipoDraft({
      codigo: tipo.codigo,
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || '',
    });
  };

  const cancelarEdicionTipo = (): void => {
    setEditingTipoId(null);
    setTipoDraft(tipoProveedorInicial);
  };

  const guardarTipoProveedor = async (): Promise<void> => {
    const nombre = tipoDraft.nombre.trim();
    if (!nombre) {
      toast.error('El nombre del tipo es obligatorio.');
      return;
    }
    if (editingTipoId) {
      const codigo = tipoDraft.codigo.trim();
      if (!codigo) {
        toast.error('El código es obligatorio al editar un tipo.');
        return;
      }
    }

    try {
      setSavingTipo(true);
      if (editingTipoId) {
        const updated = await inventarioService.actualizarTipoProveedor(editingTipoId, {
          codigo: tipoDraft.codigo.trim(),
          nombre,
          descripcion: tipoDraft.descripcion.trim(),
        });
        setTiposProveedor((prev) =>
          [...prev.filter((t) => getTipoProveedorId(t) !== editingTipoId), updated].sort((a, b) =>
            a.nombre.localeCompare(b.nombre, 'es')
          )
        );
        if (draft.tipoProveedorId === editingTipoId) {
          setDraft((prev) => ({ ...prev, tipoProveedorId: getTipoProveedorId(updated) }));
        }
        cancelarEdicionTipo();
        toast.success('Tipo de proveedor actualizado.');
      } else {
        const created = await inventarioService.crearTipoProveedor({
          codigo: tipoDraft.codigo.trim() || undefined,
          nombre,
          descripcion: tipoDraft.descripcion.trim(),
        });
        setTiposProveedor((prev) => [...prev, created].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
        setDraft((prev) => ({ ...prev, tipoProveedorId: getTipoProveedorId(created) }));
        setTipoDraft(tipoProveedorInicial);
        toast.success('Tipo de proveedor creado.');
      }
    } catch (error) {
      console.error('Error guardando tipo de proveedor:', error);
      toast.error(
        error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo guardar el tipo de proveedor.'
      );
    } finally {
      setSavingTipo(false);
    }
  };

  const confirmarEliminarTipo = async (): Promise<void> => {
    if (!tipoDeleteTarget) return;
    const id = getTipoProveedorId(tipoDeleteTarget);
    try {
      setTipoDeleteBusy(true);
      await inventarioService.eliminarTipoProveedor(id);
      setTiposProveedor((prev) => prev.filter((t) => getTipoProveedorId(t) !== id));
      if (draft.tipoProveedorId === id) {
        setDraft((prev) => ({ ...prev, tipoProveedorId: '' }));
      }
      if (editingTipoId === id) cancelarEdicionTipo();
      setTipoDeleteTarget(null);
      toast.success('Tipo de proveedor eliminado.');
    } catch (error) {
      console.error('Error eliminando tipo:', error);
      toast.error(
        error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo eliminar el tipo de proveedor.'
      );
    } finally {
      setTipoDeleteBusy(false);
    }
  };

  return (
    <>
      {showTrigger ? (
        <Button
          type="button"
          className={triggerClassName}
          onClick={() => onOpenChange(true)}
          disabled={saving}
        >
          <Building2 className="mr-2 h-4 w-4" />
          Nuevo proveedor
        </Button>
      ) : null}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg border-border bg-background text-foreground sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Nuevo proveedor
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Registra el proveedor para usar sus datos al crear ordenes de compra.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nombre o razon social *</Label>
              <Input
                value={draft.nombre}
                onChange={(e) => update('nombre', e.target.value)}
                placeholder="Ej. Distribuidora Central SAS"
                className="border-input bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>NIT *</Label>
              <Input
                value={draft.nit}
                onChange={(e) => update('nit', e.target.value)}
                placeholder="900123456-7"
                className="border-input bg-background"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Tipo de proveedor</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-primary"
                  onClick={() => setTipoModalOpen(true)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Parametrizar
                </Button>
              </div>
              <Select
                value={draft.tipoProveedorId}
                onValueChange={(value) => update('tipoProveedorId', value)}
                disabled={loadingCatalogos}
              >
                <SelectTrigger className="border-input bg-background">
                  <SelectValue placeholder={loadingCatalogos ? 'Cargando tipos...' : 'Selecciona tipo'} />
                </SelectTrigger>
                <SelectContent className="border-border bg-popover text-popover-foreground">
                  {tiposProveedor.map((tipo) => (
                    <SelectItem key={getTipoProveedorId(tipo)} value={getTipoProveedorId(tipo)}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pais</Label>
              <Select
                value={draft.paisId}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, paisId: value, departamentoId: '', ciudadId: '' }))}
                disabled={loadingCatalogos}
              >
                <SelectTrigger className="border-input bg-background">
                  <SelectValue placeholder="Selecciona pais" />
                </SelectTrigger>
                <SelectContent className="border-border bg-popover text-popover-foreground">
                  {paises.map((pais) => (
                    <SelectItem key={pais.Id} value={String(pais.Id)}>
                      {pais.nombre_pais}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select
                value={draft.departamentoId}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, departamentoId: value, ciudadId: '' }))}
                disabled={loadingCatalogos || !draft.paisId}
              >
                <SelectTrigger className="border-input bg-background">
                  <SelectValue placeholder="Selecciona departamento" />
                </SelectTrigger>
                <SelectContent className="max-h-72 border-border bg-popover text-popover-foreground">
                  {departamentos.map((dep) => (
                    <SelectItem key={dep.departamentoId} value={String(dep.departamentoId)}>
                      {getDepartamentoNombre(dep)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ciudad</Label>
              <Select
                value={draft.ciudadId}
                onValueChange={(value) => update('ciudadId', value)}
                disabled={loadingCatalogos || !draft.departamentoId}
              >
                <SelectTrigger className="border-input bg-background">
                  <SelectValue placeholder={draft.departamentoId ? 'Selecciona ciudad' : 'Primero el departamento'} />
                </SelectTrigger>
                <SelectContent className="max-h-72 border-border bg-popover text-popover-foreground">
                  {ciudades.map((ciudad) => (
                    <SelectItem key={ciudad.ciudadId} value={String(ciudad.ciudadId)}>
                      {ciudad.nombre_ciudad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Correo</Label>
              <Input
                type="email"
                value={draft.correo}
                onChange={(e) => update('correo', e.target.value)}
                placeholder="contacto@empresa.com"
                className="border-input bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>Telefono</Label>
              <Input
                value={draft.telefono}
                onChange={(e) => update('telefono', e.target.value)}
                placeholder="+57 ..."
                className="border-input bg-background"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Direccion</Label>
              <Textarea
                value={draft.direccion}
                onChange={(e) => update('direccion', e.target.value)}
                placeholder="Direccion fiscal u oficina principal"
                rows={2}
                className="resize-none border-input bg-background"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleSubmit()} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Guardar proveedor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tipoModalOpen} onOpenChange={setTipoModalOpen}>
        <DialogContent className="max-w-xl border-border bg-background text-foreground sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Tipo de proveedor</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Administra el catálogo usado en el formulario de proveedores: crea, edita o elimina tipos que no tengan proveedores asociados.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-44 space-y-2 overflow-y-auto rounded-md border border-border bg-muted/20 p-2">
            {tiposProveedor.length === 0 ? (
              <p className="px-1 py-2 text-sm text-muted-foreground">No hay tipos registrados. Usa el formulario inferior para crear el primero.</p>
            ) : (
              tiposProveedor.map((tipo) => (
                <div
                  key={getTipoProveedorId(tipo)}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/80 bg-card px-2 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{tipo.nombre}</p>
                    <p className="text-xs text-muted-foreground">{tipo.codigo}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Editar"
                      onClick={() => iniciarEdicionTipo(tipo)}
                      disabled={savingTipo || tipoDeleteBusy}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Eliminar"
                      onClick={() => setTipoDeleteTarget(tipo)}
                      disabled={savingTipo || tipoDeleteBusy}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-4 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">{editingTipoId ? 'Editar tipo' : 'Nuevo tipo'}</p>
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={tipoDraft.nombre}
                onChange={(e) => setTipoDraft((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej. Materia prima"
                className="border-input bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>{editingTipoId ? 'Código *' : 'Código'}</Label>
              <Input
                value={tipoDraft.codigo}
                onChange={(e) => setTipoDraft((prev) => ({ ...prev, codigo: e.target.value }))}
                placeholder="Ej. MATERIA_PRIMA (vacío = se genera al guardar)"
                className="border-input bg-background"
                disabled={savingTipo}
              />
              {!editingTipoId ? (
                <p className="text-xs text-muted-foreground">Si lo dejas vacío, se generará a partir del nombre.</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={tipoDraft.descripcion}
                onChange={(e) => setTipoDraft((prev) => ({ ...prev, descripcion: e.target.value }))}
                rows={2}
                className="resize-none border-input bg-background"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {editingTipoId ? (
              <Button type="button" variant="outline" onClick={cancelarEdicionTipo} disabled={savingTipo || tipoDeleteBusy}>
                Cancelar edición
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => setTipoModalOpen(false)} disabled={savingTipo}>
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={() => void guardarTipoProveedor()}
              disabled={savingTipo || !tipoDraft.nombre.trim() || tipoDeleteBusy}
            >
              <Save className="mr-2 h-4 w-4" />
              {editingTipoId ? 'Guardar cambios' : 'Guardar tipo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!tipoDeleteTarget}
        onOpenChange={(next) => {
          if (!next && !tipoDeleteBusy) setTipoDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="border-border bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tipo de proveedor</AlertDialogTitle>
            <AlertDialogDescription>
              {tipoDeleteTarget ? (
                <>
                  Se eliminará el tipo <span className="font-semibold text-foreground">{tipoDeleteTarget.nombre}</span> ({tipoDeleteTarget.codigo}
                  ). Solo es posible si ningún proveedor lo está usando.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel disabled={tipoDeleteBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmarEliminarTipo();
              }}
              disabled={tipoDeleteBusy}
            >
              {tipoDeleteBusy ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
