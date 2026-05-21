import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Boxes, ClipboardCheck, Info, Link2, Loader2, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import type { InventarioComprasConfig, InventarioConfig, MetodoValuacion } from '@/app/services/inventarioService';
import inventarioService from '@/app/services/inventarioService';
import { useAuth } from '@/app/providers/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  inventarioModulosParaGridConfig,
  inventarioTabsDesdeCatalogo,
  inventarioTenantSuperAdminIdDesdeUsuario,
  inventarioUsuarioTieneAnclaScope,
  type InventarioModuloCatalogo,
  type InventarioTabValue,
} from '../inventario/inventarioModulosCatalog';
import { resolveMenuPathForCatalogModule } from '../inventario/inventarioFormularioPathMatch';
import { FLUJO_COMPRAS_PASOS } from '../inventario/inventarioComprasMensajes';
import { useInventarioTarjetasDinamicas } from '../inventario/useInventarioTarjetasDinamicas';
import { useMetodosValuacionOpciones } from '../inventario/useMetodosValuacionOpciones';
import InventarioFormulariosTenantModal from './InventarioFormulariosTenantModal';

type ConfigInventarioProps = {
  config: InventarioConfig | null;
  periodo: string;
  saving: boolean;
  setPeriodo: React.Dispatch<React.SetStateAction<string>>;
  actualizarMetodo: (metodoValuacion: MetodoValuacion, anioFiscal?: number) => Promise<void>;
  actualizarConfigCompras?: (compras: InventarioComprasConfig) => Promise<void>;
  cerrarPeriodo: () => Promise<void>;
  /** Si no se pasa (p. ej. uso fuera de `Inventario.tsx`), las tarjetas no cambian de pestaña. */
  onNavigateTab?: (tab: InventarioTabValue) => void;
  /**
   * Opcional: limita qué tarjetas se muestran (p. ej. según permisos o tenant).
   * Por defecto se muestran todas las que tengan `cardDescription` en el catálogo.
   */
  filtroModulos?: (m: InventarioModuloCatalogo) => boolean;
};

type ConfigInventarioGridItem = {
  tab: InventarioTabValue;
  title: string;
  description: string;
  path: string;
  pathSegment: string;
  icon: typeof Boxes;
  /** Path del catalogo para enfocar el modal de autorizacion. */
  catalogPath: string;
  /** Id en GET `/config/tarjetas` (solo tarjetas dinamicas). */
  tarjetaId?: string;
  orden?: number;
};

type EditarTarjetaFormState = {
  tarjetaId: string;
  titulo: string;
  descripcion: string;
  path: string;
  tab: InventarioTabValue;
  moduloPath: string;
  orden: string;
};

export default function ConfigInventario({
  config,
  saving,
  actualizarMetodo,
  actualizarConfigCompras,
  onNavigateTab,
  filtroModulos,
}: ConfigInventarioProps): React.ReactElement {
  const { user } = useAuth();
  const puedeEditarMetodoValuacion = inventarioUsuarioTieneAnclaScope(user);
  const {
    opciones: metodosValuacionOpciones,
    metodoActivo: metodoValuacionActivo,
    setMetodoActivo: setMetodoValuacionActivo,
    loading: cargandoMetodosValuacion,
    error: errorMetodosValuacion,
  } = useMetodosValuacionOpciones(config?.metodoValuacion);
  const tenantSuperAdminId = inventarioTenantSuperAdminIdDesdeUsuario(user);
  const esDios = String(user?.role ?? (user as { rol?: string } | null)?.rol ?? '').toUpperCase() === 'DIOS';
  const [recepcionAutomaticaLocal, setRecepcionAutomaticaLocal] = useState(false);
  const [ayudaComprasOpen, setAyudaComprasOpen] = useState(false);
  const [modalAutorizacionOpen, setModalAutorizacionOpen] = useState(false);
  const [modalFocusCatalogPath, setModalFocusCatalogPath] = useState<string | null>(null);
  const [tarjetaBusyId, setTarjetaBusyId] = useState<string | null>(null);
  const [editarTarjetaOpen, setEditarTarjetaOpen] = useState(false);
  const [editarTarjetaSaving, setEditarTarjetaSaving] = useState(false);
  const [editarTarjetaForm, setEditarTarjetaForm] = useState<EditarTarjetaFormState | null>(null);
  const [paramMetodoOpen, setParamMetodoOpen] = useState(false);
  const [paramMetodoDraft, setParamMetodoDraft] = useState<MetodoValuacion>('PROMEDIO');
  const [paramMetodoAnioDraft, setParamMetodoAnioDraft] = useState(String(new Date().getFullYear()));
  const [paramMetodoSaving, setParamMetodoSaving] = useState(false);
  const recepcionAutomatica = recepcionAutomaticaLocal;
  const tabsCatalogo = useMemo(() => inventarioTabsDesdeCatalogo(), []);

  const abrirModalAutorizacion = useCallback((catalogPath?: string | null) => {
    setModalFocusCatalogPath(catalogPath ?? null);
    setModalAutorizacionOpen(true);
  }, []);

  const modulosGrid = useMemo(
    () => inventarioModulosParaGridConfig(filtroModulos ?? (() => true)),
    [filtroModulos],
  );

  const [pathsDesdeSeguridad, setPathsDesdeSeguridad] = useState<Partial<Record<InventarioTabValue, string>>>({});
  const { tarjetas: tarjetasDinamicas, refreshTarjetas } = useInventarioTarjetasDinamicas(user);

  const refreshPathsDesdeSeguridad = useCallback(async () => {
    try {
      const data = await inventarioService.obtenerFormulariosAutorizacionOpciones(undefined);
      const forms = data.formularios ?? [];
      const next: Partial<Record<InventarioTabValue, string>> = {};
      for (const m of modulosGrid) {
        const resolved = resolveMenuPathForCatalogModule(m.path, m.pathSegment, forms);
        if (resolved) next[m.tab] = resolved;
      }
      setPathsDesdeSeguridad(next);
      await refreshTarjetas();
    } catch {
      setPathsDesdeSeguridad({});
    }
  }, [modulosGrid, refreshTarjetas]);

  useEffect(() => {
    void refreshPathsDesdeSeguridad();
  }, [refreshPathsDesdeSeguridad]);

  useEffect(() => {
    setRecepcionAutomaticaLocal(config?.compras?.recepcionAutomatica === true);
  }, [config?.compras?.recepcionAutomatica]);

  const guardarConfigCompras = async (compras: InventarioComprasConfig): Promise<void> => {
    const previous = recepcionAutomaticaLocal;
    setRecepcionAutomaticaLocal(compras.recepcionAutomatica);
    try {
      if (actualizarConfigCompras) {
        await actualizarConfigCompras(compras);
      } else {
        await inventarioService.actualizarConfigCompras(compras);
      }
      toast.success(
        compras.recepcionAutomatica
          ? FLUJO_COMPRAS_PASOS.configAutomatico
          : FLUJO_COMPRAS_PASOS.configManual,
        { autoClose: 8000 },
      );
    } catch (error) {
      setRecepcionAutomaticaLocal(previous);
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la configuracion de compras.');
    }
  };

  const tarjetasGrid = useMemo((): ConfigInventarioGridItem[] => {
    if (!tarjetasDinamicas.length) {
      return modulosGrid.map((m) => ({
        ...m,
        catalogPath: m.path,
      }));
    }
    return tarjetasDinamicas
      .filter((tarjeta) => tarjeta.path && tarjeta.titulo)
      .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0) || a.titulo.localeCompare(b.titulo))
      .map((tarjeta) => {
        const tab = (tarjeta.tab || 'config') as InventarioTabValue;
        const base = modulosGrid.find((m) => m.tab === tab)
          || modulosGrid.find((m) => m.path === tarjeta.moduloPath)
          || modulosGrid[0];
        const catalogPath = tarjeta.moduloPath || base?.path || tarjeta.path;
        return {
          tab,
          title: tarjeta.titulo,
          description: tarjeta.descripcion,
          path: tarjeta.path,
          pathSegment: base?.pathSegment || '',
          icon: base?.icon || Boxes,
          catalogPath,
          tarjetaId: tarjeta.id,
          orden: tarjeta.orden,
        };
      });
  }, [modulosGrid, tarjetasDinamicas]);

  const abrirModalEditarTarjeta = useCallback((item: ConfigInventarioGridItem) => {
    if (!item.tarjetaId) {
      toast.info('Guarda autorizaciones en el modal para registrar esta tarjeta en el menu.');
      return;
    }
    setEditarTarjetaForm({
      tarjetaId: item.tarjetaId,
      titulo: item.title,
      descripcion: item.description,
      path: item.path,
      tab: item.tab,
      moduloPath: item.catalogPath,
      orden: String(item.orden ?? 0),
    });
    setEditarTarjetaOpen(true);
  }, []);

  const guardarEditarTarjeta = useCallback(async () => {
    if (!editarTarjetaForm) return;
    const titulo = editarTarjetaForm.titulo.trim();
    const path = editarTarjetaForm.path.trim();
    const moduloPath = editarTarjetaForm.moduloPath.trim();
    if (!titulo) {
      toast.error('El nombre de la tarjeta es obligatorio.');
      return;
    }
    if (!path) {
      toast.error('El path del menu es obligatorio.');
      return;
    }
    const orden = Number(editarTarjetaForm.orden);
    if (!Number.isFinite(orden)) {
      toast.error('El orden debe ser un numero valido.');
      return;
    }
    setEditarTarjetaSaving(true);
    setTarjetaBusyId(editarTarjetaForm.tarjetaId);
    try {
      await inventarioService.actualizarTarjetaConfig(
        editarTarjetaForm.tarjetaId,
        {
          titulo,
          descripcion: editarTarjetaForm.descripcion.trim(),
          path,
          tab: editarTarjetaForm.tab,
          moduloPath: moduloPath || null,
          orden,
        },
        tenantSuperAdminId,
      );
      toast.success('Tarjeta actualizada.');
      setEditarTarjetaOpen(false);
      setEditarTarjetaForm(null);
      await refreshPathsDesdeSeguridad();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la tarjeta.');
    } finally {
      setEditarTarjetaSaving(false);
      setTarjetaBusyId(null);
    }
  }, [editarTarjetaForm, refreshPathsDesdeSeguridad, tenantSuperAdminId]);

  const eliminarTarjeta = useCallback(
    async (item: ConfigInventarioGridItem) => {
      if (!item.tarjetaId) {
        toast.info('Esta tarjeta aun no esta registrada en el menu dinamico.');
        return;
      }
      if (!window.confirm(`¿Eliminar la tarjeta "${item.title}" del menu de inventario?`)) return;
      setTarjetaBusyId(item.tarjetaId);
      try {
        await inventarioService.eliminarTarjetaConfig(item.tarjetaId, tenantSuperAdminId);
        toast.success('Tarjeta eliminada.');
        await refreshPathsDesdeSeguridad();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la tarjeta.');
      } finally {
        setTarjetaBusyId(null);
      }
    },
    [refreshPathsDesdeSeguridad, tenantSuperAdminId],
  );

  const metodoValuacionSeleccionado = config?.metodoValuacion ?? metodoValuacionActivo;

  const abrirParametrizarMetodo = useCallback(() => {
    setParamMetodoDraft(metodoValuacionSeleccionado);
    setParamMetodoAnioDraft(String(config?.metodoBloqueadoDesdeAnioFiscal ?? new Date().getFullYear()));
    setParamMetodoOpen(true);
  }, [config?.metodoBloqueadoDesdeAnioFiscal, metodoValuacionSeleccionado]);

  const onMetodoValuacionChange = useCallback(
    async (value: MetodoValuacion, anioFiscal?: number) => {
      const anterior = metodoValuacionSeleccionado;
      setMetodoValuacionActivo(value);
      try {
        if (actualizarMetodo) {
          await actualizarMetodo(value, anioFiscal);
        } else {
          await inventarioService.guardarMetodoValuacion(value, { anioFiscal });
          const label = metodosValuacionOpciones.find((o) => o.codigo === value)?.label ?? value;
          toast.success(`Metodo de valuacion: ${label}`);
        }
      } catch (error) {
        setMetodoValuacionActivo(anterior);
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar el metodo de valuacion.');
      }
    },
    [
      actualizarMetodo,
      metodoValuacionSeleccionado,
      metodosValuacionOpciones,
      setMetodoValuacionActivo,
    ],
  );

  const abrirParametrizarMetodoConSeleccion = useCallback(
    (value: MetodoValuacion) => {
      setParamMetodoDraft(value);
      setParamMetodoAnioDraft(String(config?.metodoBloqueadoDesdeAnioFiscal ?? new Date().getFullYear()));
      setParamMetodoOpen(true);
    },
    [config?.metodoBloqueadoDesdeAnioFiscal],
  );

  const guardarParametrizacionMetodo = useCallback(async () => {
    const anioFiscal = Number(paramMetodoAnioDraft);
    if (!Number.isInteger(anioFiscal) || anioFiscal < 2000 || anioFiscal > 2100) {
      toast.error('El anio fiscal debe estar entre 2000 y 2100.');
      return;
    }
    setParamMetodoSaving(true);
    try {
      await onMetodoValuacionChange(paramMetodoDraft, anioFiscal);
      setParamMetodoOpen(false);
    } finally {
      setParamMetodoSaving(false);
    }
  }, [onMetodoValuacionChange, paramMetodoAnioDraft, paramMetodoDraft]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5" />
              ConfigInventario
            </CardTitle>
            <CardDescription>
              Centraliza la parametrizacion del modulo de inventario y sus secciones operativas.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end xl:w-auto xl:shrink-0">
            <div className="space-y-2">
              <Label>Metodo de valuacion</Label>
              <div className="flex items-center gap-2">
                  <Select
                    value={metodoValuacionSeleccionado}
                    disabled={!puedeEditarMetodoValuacion || saving || cargandoMetodosValuacion}
                    onValueChange={(value) => abrirParametrizarMetodoConSeleccion(value as MetodoValuacion)}
                  >
                  <SelectTrigger className="h-9 w-[11.5rem]">
                    {cargandoMetodosValuacion ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        ...
                      </span>
                    ) : (
                      <SelectValue />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {metodosValuacionOpciones.map((opcion) => (
                      <SelectItem key={opcion.codigo} value={opcion.codigo}>
                        {opcion.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  disabled={!puedeEditarMetodoValuacion || saving || cargandoMetodosValuacion}
                  title="Parametrizar metodo de valuacion"
                  aria-label="Parametrizar metodo de valuacion"
                  onClick={abrirParametrizarMetodo}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {errorMetodosValuacion ? (
                <p className="text-xs text-destructive">{errorMetodosValuacion}</p>
              ) : null}
              {!puedeEditarMetodoValuacion ? (
                <p className="text-xs text-muted-foreground max-w-[14rem]">
                  Requiere ancla de tenant en el JWT.
                </p>
              ) : null}
            </div>
            <div className="sm:ml-auto sm:self-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-2"
                onClick={() => abrirModalAutorizacion(null)}
              >
                <Link2 className="h-4 w-4" />
                Autorizacion formularios
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tarjetasGrid.map((item) => {
            const Icon = item.icon;
            const displayPath = tarjetasDinamicas.length ? item.path : pathsDesdeSeguridad[item.tab] ?? item.path;
            const busy = tarjetaBusyId === item.tarjetaId;
            return (
              <div
                key={`${item.tab}-${item.path}-${item.tarjetaId ?? 'static'}`}
                className="flex flex-col rounded-lg border border-border bg-card p-4 text-left shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background">
                    <Icon className="h-4 w-4" />
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      if (typeof onNavigateTab === 'function') onNavigateTab(item.tab);
                    }}
                  >
                    Abrir
                  </Button>
                </div>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                <p className="mt-3 break-all rounded-md bg-muted/60 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                  {displayPath}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    disabled={busy}
                    onClick={() => abrirModalAutorizacion(item.catalogPath)}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Autorizar
                  </Button>
                  {esDios ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        disabled={busy || !item.tarjetaId}
                        title={
                          item.tarjetaId
                            ? 'Actualizar metadata de la tarjeta'
                            : 'Registra la tarjeta desde Autorizar y guardar'
                        }
                        onClick={() => abrirModalEditarTarjeta(item)}
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                        Actualizar
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        disabled={busy || !item.tarjetaId}
                        title={item.tarjetaId ? 'Quitar del menu dinamico' : 'Sin tarjeta registrada'}
                        onClick={() => void eliminarTarjeta(item)}
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Eliminar
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <InventarioFormulariosTenantModal
        modules={modulosGrid.map(({ tab, title, description, path }) => ({ tab, title, description, path }))}
        onFormulariosAutorizacionApplied={() => void refreshPathsDesdeSeguridad()}
        open={modalAutorizacionOpen}
        onOpenChange={(next) => {
          setModalAutorizacionOpen(next);
          if (!next) setModalFocusCatalogPath(null);
        }}
        focusModulePath={modalFocusCatalogPath}
        showTrigger={false}
      />

      <Dialog
        open={editarTarjetaOpen}
        onOpenChange={(next) => {
          if (!editarTarjetaSaving) {
            setEditarTarjetaOpen(next);
            if (!next) setEditarTarjetaForm(null);
          }
        }}
      >
        <DialogContent className="max-w-lg border-border bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Actualizar tarjeta
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Edita el nombre y los datos visibles en ConfigInventario. Se guarda con{' '}
              <code className="rounded bg-muted px-1 text-xs">PUT /api/inventario/config/tarjetas/:id</code>
            </DialogDescription>
          </DialogHeader>
          {editarTarjetaForm ? (
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="tarjeta-titulo">Nombre (titulo)</Label>
                <Input
                  id="tarjeta-titulo"
                  value={editarTarjetaForm.titulo}
                  disabled={editarTarjetaSaving}
                  onChange={(e) =>
                    setEditarTarjetaForm((prev) => (prev ? { ...prev, titulo: e.target.value } : prev))
                  }
                  placeholder="Ej. Configuracion - TRM"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tarjeta-descripcion">Descripcion</Label>
                <Textarea
                  id="tarjeta-descripcion"
                  rows={3}
                  value={editarTarjetaForm.descripcion}
                  disabled={editarTarjetaSaving}
                  onChange={(e) =>
                    setEditarTarjetaForm((prev) => (prev ? { ...prev, descripcion: e.target.value } : prev))
                  }
                  placeholder="Texto bajo el titulo en la tarjeta"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tarjeta-path">Path del menu (dinamico)</Label>
                <Input
                  id="tarjeta-path"
                  value={editarTarjetaForm.path}
                  disabled={editarTarjetaSaving}
                  onChange={(e) =>
                    setEditarTarjetaForm((prev) => (prev ? { ...prev, path: e.target.value } : prev))
                  }
                  placeholder="/admin/inventarios/..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Ruta que se muestra en la tarjeta y usa el menu de inventario.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tarjeta-modulo">Modulo catalogo (moduloPath)</Label>
                <Input
                  id="tarjeta-modulo"
                  value={editarTarjetaForm.moduloPath}
                  disabled={editarTarjetaSaving}
                  onChange={(e) =>
                    setEditarTarjetaForm((prev) => (prev ? { ...prev, moduloPath: e.target.value } : prev))
                  }
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enlace con el modulo del catalogo para autorizaciones.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Pestana (tab)</Label>
                  <Select
                    value={editarTarjetaForm.tab}
                    disabled={editarTarjetaSaving}
                    onValueChange={(value) =>
                      setEditarTarjetaForm((prev) =>
                        prev ? { ...prev, tab: value as InventarioTabValue } : prev,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tabsCatalogo.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tarjeta-orden">Orden en rejilla</Label>
                  <Input
                    id="tarjeta-orden"
                    type="number"
                    min={0}
                    step={1}
                    value={editarTarjetaForm.orden}
                    disabled={editarTarjetaSaving}
                    onChange={(e) =>
                      setEditarTarjetaForm((prev) => (prev ? { ...prev, orden: e.target.value } : prev))
                    }
                  />
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={editarTarjetaSaving}
              onClick={() => {
                setEditarTarjetaOpen(false);
                setEditarTarjetaForm(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={editarTarjetaSaving || !editarTarjetaForm}
              onClick={() => void guardarEditarTarjeta()}
            >
              {editarTarjetaSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Configuracion de compras
            </CardTitle>
            <CardDescription>
              Define si las ordenes de compra reciben inventario al guardar o si quedan pendientes para comprobante manual.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            title="Ayuda sobre recepcion automatica"
            aria-label="Ayuda sobre recepcion automatica"
            onClick={() => setAyudaComprasOpen(true)}
          >
            <Info className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label>Recepcion automatica al guardar OC</Label>
              <p className="text-sm text-muted-foreground">
                {recepcionAutomatica
                  ? 'Guardar orden crea la OC, genera el comprobante y registra la entrada completa.'
                  : 'Guardar orden deja la OC abierta; la entrada se registra despues desde Comprobante entrada.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Manual</span>
              <Switch
                checked={recepcionAutomatica}
                disabled={saving}
                onCheckedChange={(checked) => void guardarConfigCompras({ recepcionAutomatica: checked })}
                aria-label="Configurar recepcion automatica de compras"
              />
              <span className="text-xs font-medium text-foreground">Automatico</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={ayudaComprasOpen} onOpenChange={setAyudaComprasOpen}>
        <DialogContent className="max-w-lg border-border bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Recepcion automatica de compras
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Esta configuracion define cuanto trabajo hace el sistema al guardar una orden de compra.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-6">
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="font-medium text-foreground">Automatico</p>
              <p className="text-muted-foreground">
                Optimiza compras recibidas de inmediato: crea la OC, genera el comprobante de entrada, registra la recepcion total y actualiza inventario en un solo flujo.
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="font-medium text-foreground">Manual</p>
              <p className="text-muted-foreground">
                Conserva la OC abierta cuando la mercancia se recibe despues o por partes. La entrada se registra luego desde Comprobante entrada.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paramMetodoOpen} onOpenChange={(open) => !paramMetodoSaving && setParamMetodoOpen(open)}>
        <DialogContent className="max-w-md border-border bg-background text-foreground">
          <DialogHeader>
            <DialogTitle>Parametrizar metodo de valuacion</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Opciones desde el servidor (GET). Al guardar se aplica con PUT.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <div className="space-y-2">
                <Label>Metodo</Label>
                <Select
                  value={paramMetodoDraft}
                  disabled={paramMetodoSaving || cargandoMetodosValuacion}
                  onValueChange={(value) => setParamMetodoDraft(value as MetodoValuacion)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {metodosValuacionOpciones.map((opcion) => (
                      <SelectItem key={opcion.codigo} value={opcion.codigo}>
                        {opcion.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inventario-metodo-anio-fiscal">Anio fiscal</Label>
                <Input
                  id="inventario-metodo-anio-fiscal"
                  type="number"
                  min={2000}
                  max={2100}
                  step={1}
                  value={paramMetodoAnioDraft}
                  disabled={paramMetodoSaving}
                  onChange={(event) => setParamMetodoAnioDraft(event.target.value)}
                />
              </div>
            </div>
            {metodosValuacionOpciones.find((o) => o.codigo === paramMetodoDraft)?.descripcion ? (
              <p className="text-sm text-muted-foreground">
                {metodosValuacionOpciones.find((o) => o.codigo === paramMetodoDraft)?.descripcion}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              El anio fiscal se guarda en la configuracion y se usa para bloquear cambios cuando ya existan movimientos.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={paramMetodoSaving}
              onClick={() => setParamMetodoOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={paramMetodoSaving || !puedeEditarMetodoValuacion}
              onClick={() => void guardarParametrizacionMetodo()}
            >
              {paramMetodoSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
