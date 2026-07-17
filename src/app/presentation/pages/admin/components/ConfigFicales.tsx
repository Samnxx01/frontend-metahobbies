import React from 'react';
import { BookOpenCheck, CalendarDays, CheckCircle2, FileText, Layers, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import inventarioService, {
  type InventarioConfig,
  type InventarioLibroFiscalCatalogoHijo,
  type InventarioLibroFiscalConfig,
  type MonedaCopOption,
} from '@/app/services/inventarioService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import InventarioLibroFiscalCatalogoTenantModal, { type CatalogoTenantModo } from './InventarioLibroFiscalCatalogoTenantModal';
import InventarioLibroFiscalFormatosModal from './InventarioLibroFiscalFormatosModal';
import { monedaCodigo, monedaId, monedaLabel } from '../inventario/monedaInventarioDraft';

type DraftLibroFiscal = InventarioLibroFiscalConfig;

type ConfigFicalesProps = {
  config?: InventarioConfig | null;
  periodo?: string;
  saving?: boolean;
  setPeriodo?: React.Dispatch<React.SetStateAction<string>>;
  cerrarPeriodo?: () => Promise<void>;
};

const FORMATOS: InventarioLibroFiscalConfig['formato'][] = ['PDF', 'EXCEL', 'XML', 'CSV'];

const newId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `libro-fiscal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const blankDraft = (
  tipoLibro = '',
  periodicidad = '',
): DraftLibroFiscal => ({
  id: newId(),
  codigo: '',
  nombre: '',
  tipoLibro,
  periodicidad,
  formato: 'PDF',
  monedaId: '',
  moneda: '',
  prefijo: 'LF',
  padding: 6,
  siguiente: 1,
  anioFiscal: new Date().getFullYear(),
  descripcion: '',
  activo: true,
});

const clampPadding = (value: unknown): number => Math.max(1, Math.min(12, Number(value) || 6));

const previewConsecutivo = (row: Pick<InventarioLibroFiscalConfig, 'prefijo' | 'padding' | 'siguiente'>): string => {
  const prefijo = String(row.prefijo || 'LF').trim().toUpperCase();
  const padding = clampPadding(row.padding);
  const siguiente = Math.max(1, Number(row.siguiente) || 1);
  return `${prefijo}-${String(siguiente).padStart(padding, '0')}`;
};

/** Periodos YYYY-MM sugeridos para cerrar (ultimos 24 meses). */
function periodosSugeridosParaCerrar(cantidadMeses = 24): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < cantidadMeses; i += 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    out.push(`${y}-${m}`);
  }
  return out;
}

export default function ConfigFicales({
  config,
  periodo,
  saving: savingProp,
  setPeriodo,
  cerrarPeriodo,
}: ConfigFicalesProps): React.ReactElement {
  const [rows, setRows] = React.useState<InventarioLibroFiscalConfig[]>([]);
  const [draft, setDraft] = React.useState<DraftLibroFiscal>(blankDraft());
  const [tiposLibroCatalog, setTiposLibroCatalog] = React.useState<InventarioLibroFiscalCatalogoHijo[]>([]);
  const [periodicidadesCatalog, setPeriodicidadesCatalog] = React.useState<InventarioLibroFiscalCatalogoHijo[]>([]);
  const [monedasCop, setMonedasCop] = React.useState<MonedaCopOption[]>([]);
  const [catalogoTenantModal, setCatalogoTenantModal] = React.useState<CatalogoTenantModo | null>(null);
  const [configLocal, setConfigLocal] = React.useState<InventarioConfig | null>(null);
  const [periodoLocal, setPeriodoLocal] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savingPeriodo, setSavingPeriodo] = React.useState(false);
  const [error, setError] = React.useState('');
  const [formatosLibro, setFormatosLibro] = React.useState<InventarioLibroFiscalConfig | null>(null);

  const tiposLibroActivos = React.useMemo(
    () => tiposLibroCatalog.filter((row) => row.activo),
    [tiposLibroCatalog],
  );
  const periodicidadesActivas = React.useMemo(
    () => periodicidadesCatalog.filter((row) => row.activo),
    [periodicidadesCatalog],
  );
  const monedasActivas = React.useMemo(
    () => monedasCop.filter((row) => row.estadoMoneda !== false && monedaId(row)),
    [monedasCop],
  );
  const monedasPorId = React.useMemo(
    () => new Map(monedasActivas.map((moneda) => [monedaId(moneda), moneda])),
    [monedasActivas],
  );
  const catalogosListos = tiposLibroActivos.length > 0 && periodicidadesActivas.length > 0 && monedasActivas.length > 0;
  const configActiva = config !== undefined ? config : configLocal;
  const periodoActivo = periodo ?? periodoLocal;
  const savingContable = Boolean(savingProp || savingPeriodo);

  const periodosOpciones = React.useMemo(() => {
    const cerrados = new Set(configActiva?.periodosCerrados ?? []);
    return periodosSugeridosParaCerrar().filter((p) => !cerrados.has(p));
  }, [configActiva?.periodosCerrados]);

  const setPeriodoActivo = React.useCallback(
    (value: string) => {
      if (setPeriodo) {
        setPeriodo(value);
      } else {
        setPeriodoLocal(value);
      }
    },
    [setPeriodo],
  );

  const cargarConfig = React.useCallback(async () => {
    if (config !== undefined) return;
    try {
      const data = await inventarioService.obtenerConfig();
      setConfigLocal(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la configuracion contable.');
    }
  }, [config]);

  const cargarCatalogos = React.useCallback(async () => {
    try {
      const [tipos, periodicidades, monedas] = await Promise.all([
        inventarioService.listarTiposLibroFiscalCatalogo(),
        inventarioService.listarPeriodicidadesLibroFiscalCatalogo(),
        inventarioService.listarMonedasCop(),
      ]);
      setTiposLibroCatalog(tipos);
      setPeriodicidadesCatalog(periodicidades);
      setMonedasCop(monedas);
    } catch (err) {
      setTiposLibroCatalog([]);
      setPeriodicidadesCatalog([]);
      setMonedasCop([]);
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar los catalogos de libros fiscales.');
    }
  }, []);

  const cargarLibros = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await inventarioService.listarLibrosFiscales();
      setRows(data);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los libros fiscales.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void cargarCatalogos();
    void cargarLibros();
  }, [cargarCatalogos, cargarLibros]);

  React.useEffect(() => {
    void cargarConfig();
  }, [cargarConfig]);

  const patchDraft = (partial: Partial<DraftLibroFiscal>): void => {
    setDraft((prev) => ({ ...prev, ...partial }));
  };

  const limpiarDraft = (): void => {
    const primeraMoneda = monedasActivas[0];
    setDraft({
      ...blankDraft(tiposLibroActivos[0]?.codigo, periodicidadesActivas[0]?.codigo),
      monedaId: primeraMoneda ? monedaId(primeraMoneda) : '',
      moneda: primeraMoneda ? monedaCodigo(primeraMoneda) : '',
    });
  };

  React.useEffect(() => {
    if (!catalogosListos) return;
    setDraft((prev) => {
      const tipoLibro = tiposLibroActivos.some((row) => row.codigo === prev.tipoLibro)
        ? prev.tipoLibro
        : tiposLibroActivos[0]?.codigo || '';
      const periodicidad = periodicidadesActivas.some((row) => row.codigo === prev.periodicidad)
        ? prev.periodicidad
        : periodicidadesActivas[0]?.codigo || '';
      const primeraMoneda = monedasActivas[0];
      const selectedMoneda = monedasPorId.has(prev.monedaId) ? prev.monedaId : primeraMoneda ? monedaId(primeraMoneda) : '';
      const selectedMonedaDoc = monedasPorId.get(selectedMoneda) || primeraMoneda;
      const selectedMonedaCodigo = selectedMonedaDoc ? monedaCodigo(selectedMonedaDoc) : '';
      if (tipoLibro === prev.tipoLibro && periodicidad === prev.periodicidad && selectedMoneda === prev.monedaId) return prev;
      return { ...prev, tipoLibro, periodicidad, monedaId: selectedMoneda, moneda: selectedMonedaCodigo };
    });
  }, [catalogosListos, tiposLibroActivos, periodicidadesActivas, monedasActivas, monedasPorId]);

  const agregarOActualizar = (): void => {
    const codigo = draft.codigo.trim().toUpperCase();
    const nombre = draft.nombre.trim();
    const prefijo = draft.prefijo.trim().toUpperCase();
    const anioFiscal = Number(draft.anioFiscal);

    if (!codigo) {
      toast.error('El codigo del libro fiscal es obligatorio.');
      return;
    }
    if (!nombre) {
      toast.error('El nombre del libro fiscal es obligatorio.');
      return;
    }
    if (!prefijo) {
      toast.error('El prefijo es obligatorio.');
      return;
    }
    if (!Number.isInteger(anioFiscal) || anioFiscal < 2000 || anioFiscal > 2100) {
      toast.error('El anio fiscal debe estar entre 2000 y 2100.');
      return;
    }
    if (!catalogosListos) {
      toast.error('Parametriza tipos de libro y periodicidades antes de agregar un libro fiscal.');
      return;
    }
    if (!tiposLibroActivos.some((row) => row.codigo === draft.tipoLibro)) {
      toast.error('Seleccione un tipo de libro parametrizado y activo.');
      return;
    }
    if (!periodicidadesActivas.some((row) => row.codigo === draft.periodicidad)) {
      toast.error('Seleccione una periodicidad parametrizada y activa.');
      return;
    }
    const monedaSeleccionada = monedasPorId.get(draft.monedaId);
    if (!monedaSeleccionada) {
      toast.error('Seleccione una moneda activa para el libro fiscal.');
      return;
    }

    const nextRow: InventarioLibroFiscalConfig = {
      ...draft,
      codigo,
      nombre,
      monedaId: monedaId(monedaSeleccionada),
      moneda: monedaCodigo(monedaSeleccionada),
      prefijo,
      padding: clampPadding(draft.padding),
      siguiente: Math.max(1, Number(draft.siguiente) || 1),
      anioFiscal,
      descripcion: String(draft.descripcion || '').trim(),
    };
    setRows((prev) => {
      const exists = prev.some((row) => row.id === nextRow.id || (row.codigo === nextRow.codigo && row.anioFiscal === nextRow.anioFiscal));
      const merged = exists
        ? prev.map((row) => (row.id === nextRow.id || (row.codigo === nextRow.codigo && row.anioFiscal === nextRow.anioFiscal) ? { ...row, ...nextRow, id: row.id } : row))
        : [...prev, nextRow];
      return merged.sort((a, b) => b.anioFiscal - a.anioFiscal || a.codigo.localeCompare(b.codigo));
    });
    limpiarDraft();
  };

  const editar = (row: InventarioLibroFiscalConfig): void => {
    setDraft({ ...row });
  };

  const eliminar = (id: string): void => {
    setRows((prev) => prev.filter((row) => row.id !== id));
    if (draft.id === id) limpiarDraft();
  };

  const toggleActivo = (id: string): void => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, activo: !row.activo } : row)));
  };

  const libroGuardadoParaCatalogos = React.useMemo(() => {
    if (draft.iud) return draft;
    return rows.find((row) => row.iud) || null;
  }, [draft, rows]);

  const abrirFormatos = (row?: InventarioLibroFiscalConfig | null): void => {
    const libro = row || libroGuardadoParaCatalogos;
    const libroId = String(libro?.iud || '').trim();
    if (!libro || !libroId) {
      toast.error('Guarda el libro fiscal antes de parametrizar formatos.');
      return;
    }
    setFormatosLibro(libro);
  };

  const guardar = async (): Promise<void> => {
    if (!catalogosListos) {
      toast.error('Parametriza tipos de libro y periodicidades antes de guardar libros fiscales.');
      return;
    }
    if (!rows.length) {
      toast.error('Agrega al menos un libro fiscal.');
      return;
    }
    if (rows.every((row) => !row.activo)) {
      toast.error('Debe existir al menos un libro fiscal activo.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = await inventarioService.guardarLibrosFiscales(rows);
      setRows(saved);
      limpiarDraft();
      toast.success('Libros fiscales guardados.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los libros fiscales.');
    } finally {
      setSaving(false);
    }
  };

  const cerrarPeriodoSeleccionado = async (): Promise<void> => {
    if (!/^\d{4}-\d{2}$/.test(periodoActivo)) {
      toast.error('Seleccione un periodo en formato YYYY-MM.');
      return;
    }

    setSavingPeriodo(true);
    try {
      if (cerrarPeriodo) {
        await cerrarPeriodo();
      } else {
        const periodosCerrados = await inventarioService.cerrarPeriodo(periodoActivo);
        setConfigLocal((prev) => prev ? { ...prev, periodosCerrados } : { metodoValuacion: 'PROMEDIO', periodosCerrados });
        setPeriodoLocal('');
        toast.success('Periodo contable cerrado.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cerrar el periodo contable.');
    } finally {
      setSavingPeriodo(false);
    }
  };

  const activos = rows.filter((row) => row.activo).length;
  const monedaNombre = (row: InventarioLibroFiscalConfig): string => {
    const monedaSeleccionada = monedasPorId.get(row.monedaId);
    return row.moneda || (monedaSeleccionada ? monedaCodigo(monedaSeleccionada) : '') || 'Sin moneda';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Configuracion contable
          </CardTitle>
          <CardDescription>Periodos contables cerrados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Periodo a cerrar</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={periodoActivo || undefined}
                disabled={savingContable || periodosOpciones.length === 0}
                onValueChange={(value) => setPeriodoActivo(value)}
              >
                <SelectTrigger className="h-9 w-[9.5rem]">
                  <SelectValue placeholder="YYYY-MM" />
                </SelectTrigger>
                <SelectContent>
                  {periodosOpciones.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={savingContable || !periodoActivo}
                title="Cerrar periodo seleccionado"
                aria-label="Cerrar periodo seleccionado"
                onClick={() => void cerrarPeriodoSeleccionado()}
              >
                {savingPeriodo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            {periodosOpciones.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay periodos pendientes por cerrar.</p>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Periodos cerrados</p>
            <div className="flex flex-wrap gap-2">
              {(configActiva?.periodosCerrados || []).length > 0 ? (
                configActiva?.periodosCerrados.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)
              ) : (
                <p className="text-sm text-muted-foreground">No hay periodos cerrados.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <BookOpenCheck className="h-5 w-5" />
            Libros fiscales
          </CardTitle>
          <CardDescription>
            Primero parametriza tipos de libro y periodicidades; luego crea y guarda cada libro fiscal.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setCatalogoTenantModal('tipos-libro')}>
            <Layers className="h-4 w-4" />
            Tipos libro
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setCatalogoTenantModal('periodicidades')}>
            <CalendarDays className="h-4 w-4" />
            Periodicidades
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => abrirFormatos()}>
            <FileText className="h-4 w-4" />
            Formatos
          </Button>
          <Badge variant="secondary" className="rounded-md">
            {activos}/{rows.length} activos
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!catalogosListos ? (
          <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning dark:text-warning">
            Parametriza al menos un tipo de libro, una periodicidad y una moneda activa antes de crear o guardar libros fiscales.
          </div>
        ) : null}

        <div className="grid gap-4 rounded-md border border-border bg-muted/30 p-4 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Codigo *</Label>
            <Input value={draft.codigo} onChange={(event) => patchDraft({ codigo: event.target.value })} placeholder="LIBRO_INVENTARIO" />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label>Nombre *</Label>
            <Input value={draft.nombre} onChange={(event) => patchDraft({ nombre: event.target.value })} placeholder="Libro fiscal de inventario" />
          </div>
          <div className="space-y-2">
            <Label>Anio fiscal *</Label>
            <Input inputMode="numeric" value={draft.anioFiscal} onChange={(event) => patchDraft({ anioFiscal: Number(event.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Tipo libro</Label>
            <Select
              value={draft.tipoLibro || undefined}
              disabled={!tiposLibroActivos.length}
              onValueChange={(value) => patchDraft({ tipoLibro: value })}
            >
              <SelectTrigger><SelectValue placeholder="Parametriza tipos de libro" /></SelectTrigger>
              <SelectContent>
                {tiposLibroActivos.map((tipo) => (
                  <SelectItem key={tipo.codigo} value={tipo.codigo}>{tipo.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Periodicidad</Label>
            <Select
              value={draft.periodicidad || undefined}
              disabled={!periodicidadesActivas.length}
              onValueChange={(value) => patchDraft({ periodicidad: value })}
            >
              <SelectTrigger><SelectValue placeholder="Parametriza periodicidades" /></SelectTrigger>
              <SelectContent>
                {periodicidadesActivas.map((periodo) => (
                  <SelectItem key={periodo.codigo} value={periodo.codigo}>{periodo.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Formato</Label>
            <Select value={draft.formato} onValueChange={(value) => patchDraft({ formato: value as InventarioLibroFiscalConfig['formato'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMATOS.map((formato) => <SelectItem key={formato} value={formato}>{formato}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Moneda</Label>
            <Select
              value={draft.monedaId || undefined}
              disabled={!monedasActivas.length}
              onValueChange={(value) => {
                const moneda = monedasPorId.get(value);
                patchDraft({ monedaId: value, moneda: moneda ? monedaCodigo(moneda) : '' });
              }}
            >
              <SelectTrigger><SelectValue placeholder="Selecciona moneda" /></SelectTrigger>
              <SelectContent>
                {monedasActivas.map((moneda) => (
                  <SelectItem key={monedaId(moneda)} value={monedaId(moneda)}>{monedaLabel(moneda)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Activo</Label>
            <div className="flex h-10 items-center justify-between rounded-md border border-border px-3">
              <span className="text-sm">{draft.activo ? 'Activo' : 'Inactivo'}</span>
              <Switch checked={draft.activo} onCheckedChange={(checked) => patchDraft({ activo: checked })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Prefijo</Label>
            <Input value={draft.prefijo} onChange={(event) => patchDraft({ prefijo: event.target.value })} placeholder="LFI" />
          </div>
          <div className="space-y-2">
            <Label>Digitos</Label>
            <Input inputMode="numeric" value={draft.padding} onChange={(event) => patchDraft({ padding: Number(event.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Siguiente</Label>
            <Input inputMode="numeric" value={draft.siguiente} onChange={(event) => patchDraft({ siguiente: Number(event.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Vista previa</Label>
            <div className="flex h-10 items-center rounded-md border border-border bg-background px-3 text-sm font-medium">
              {previewConsecutivo(draft)}
            </div>
          </div>
          <div className="space-y-2 lg:col-span-4">
            <Label>Descripcion</Label>
            <Textarea value={draft.descripcion || ''} onChange={(event) => patchDraft({ descripcion: event.target.value })} rows={2} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:col-span-4">
            <Button type="button" onClick={agregarOActualizar} disabled={!catalogosListos}>
              <Plus className="h-4 w-4" />
              Agregar / actualizar
            </Button>
            <Button type="button" variant="outline" onClick={limpiarDraft}>
              Limpiar
            </Button>
            <Button type="button" className="sm:ml-auto" onClick={() => void guardar()} disabled={saving || loading || !catalogosListos}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar libros fiscales
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Libro fiscal</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Formato</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead>Consecutivo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    Cargando libros fiscales...
                  </TableCell>
                </TableRow>
              ) : rows.length ? (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="min-w-64">
                      <div className="font-medium text-foreground">{row.nombre}</div>
                      <div className="text-xs text-muted-foreground">{row.codigo} - {row.anioFiscal}</div>
                    </TableCell>
                    <TableCell>{row.tipoLibro}</TableCell>
                    <TableCell>{row.periodicidad}</TableCell>
                    <TableCell>{row.formato}</TableCell>
                    <TableCell>{monedaNombre(row)}</TableCell>
                    <TableCell className="font-mono text-xs">{previewConsecutivo(row)}</TableCell>
                    <TableCell>
                      <button type="button" onClick={() => toggleActivo(row.id)} className="text-left">
                        <Badge variant={row.activo ? 'default' : 'secondary'} className="rounded-md">
                          {row.activo ? 'ACTIVO' : 'INACTIVO'}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => editar(row)}>
                          Editar
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => abrirFormatos(row)}>
                          Formatos
                        </Button>
                        <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => eliminar(row.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    No hay libros fiscales parametrizados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      </Card>

      <InventarioLibroFiscalCatalogoTenantModal
        open={Boolean(catalogoTenantModal)}
        modo={catalogoTenantModal || 'tipos-libro'}
        onOpenChange={(open) => {
          if (!open) setCatalogoTenantModal(null);
        }}
        onSaved={() => {
          void cargarCatalogos();
        }}
      />
      <InventarioLibroFiscalFormatosModal
        open={Boolean(formatosLibro)}
        libro={formatosLibro}
        onOpenChange={(open) => {
          if (!open) setFormatosLibro(null);
        }}
      />
    </div>
  );
}
