import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import inventarioService from '@/app/services/inventarioService';
import type {
  InventarioTenantGlobalOpcion,
  InventarioTenantSuperAdminOpcion,
} from '@/app/services/inventarioService';
import type { UsuarioOption } from '@/app/services/routesService';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  normalizePathKey,
  resolveModuleCatalogToPathRow as resolveModuleRouteRow,
} from '../inventario/inventarioFormularioPathMatch';

/** Payload logico enviado al endpoint de inventario (un solo PUT agregado en backend por ruta). */
export type InventarioFormulariosTenantSavePayload = {
  modoAsignacion: 'USUARIO';
  habilitado: boolean;
  soloDios: boolean;
  tenantIds: string[];
  usuarioIds: string[];
  rutas: Array<{ rutaId: string; path: string; name: string; tipoNodo: string }>;
};

type FormRow = { id: string; name: string; path: string; tipoNodo: string };
type InventarioConfigModule = {
  title: string;
  path: string;
};

type InventarioFormulariosTenantModalProps = {
  modules?: InventarioConfigModule[];
  /** Tras un PUT exitoso (al menos una ruta actualizada); p. ej. refrescar paths en ConfigInventario. */
  onFormulariosAutorizacionApplied?: () => void;
};

/** Quita marcas diacriticas para que "inventario" coincida con "inventário" y similares. */
function stripDiacritics(s: string): string {
  try {
    return s.normalize('NFD').replace(/\p{M}/gu, '');
  } catch {
    return s;
  }
}

/** Filtro por palabras: todas las tokens deben aparecer en name+path+tipoNodo+id (insensible a acentos). */
function rowMatchesNeedle(row: FormRow, needle: string): boolean {
  const raw = needle.trim();
  if (!raw) return true;
  const hay = stripDiacritics(`${row.name} ${row.path} ${row.tipoNodo} ${row.id}`.toLowerCase());
  const tokens = stripDiacritics(raw.toLowerCase())
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (!tokens.length) return true;
  return tokens.every((t) => hay.includes(t));
}

function matchesUsuarioNombreCorreo(u: UsuarioOption, needle: string): boolean {
  const n = needle.trim().toLowerCase();
  if (!n) return true;
  const hay = `${u.nombre} ${u.correo}`.toLowerCase();
  return hay.includes(n);
}

function matchesTenantSuperAdminRow(t: InventarioTenantSuperAdminOpcion, needle: string): boolean {
  const n = needle.trim().toLowerCase();
  if (!n) return true;
  const cod = t.codigoJerarquia != null ? String(t.codigoJerarquia) : '';
  return `${t.label} ${t.iud} ${cod}`.toLowerCase().includes(n);
}

function matchesTenantGlobalRow(t: InventarioTenantGlobalOpcion, needle: string): boolean {
  const n = needle.trim().toLowerCase();
  if (!n) return true;
  const cod = t.codigoJerarquia != null ? String(t.codigoJerarquia) : '';
  return `${t.label} ${t.iud} ${cod}`.toLowerCase().includes(n);
}

export default function InventarioFormulariosTenantModal({
  modules = [],
  onFormulariosAutorizacionApplied,
}: InventarioFormulariosTenantModalProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [needleRutas, setNeedleRutas] = useState('');
  const [needleRama, setNeedleRama] = useState('');
  const [needleUsuario, setNeedleUsuario] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<FormRow[]>([]);
  const [selectedRutas, setSelectedRutas] = useState<Record<string, boolean>>({});
  const [tenantGlobales, setTenantGlobales] = useState<InventarioTenantGlobalOpcion[]>([]);
  const [tenantSuperAdmins, setTenantSuperAdmins] = useState<InventarioTenantSuperAdminOpcion[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([]);
  const [selectedUsuarios, setSelectedUsuarios] = useState<Record<string, boolean>>({});
  const [seleccionSaId, setSeleccionSaId] = useState('');
  const [esDios, setEsDios] = useState(false);
  const [meta, setMeta] = useState<{
    alcance?: string;
    origenResolucion?: string;
    totalRutasActivas?: number;
    totalFormulariosSubformularios?: number;
    totalMostrados?: number;
    ayuda?: string | null;
    inventarioFormulariosModoAlcance?: string;
    requiereParametrizacionTenantSuperAdmin?: boolean;
    tenantSuperAdminAnclaId?: string | null;
    tenantGlobalJerarquiaOk?: boolean;
    totalTenantGlobalEnRama?: number;
    filtroCorporativoCountersActivo?: boolean;
  } | null>(null);
  /** Ultima ruta marcada en el listado; el panel derecho describe esta fila. */
  const [rutaContextoId, setRutaContextoId] = useState<string | null>(null);
  /** Modulo del catalogo (path unico) sobre el que se declara la parametrizacion; obligatorio si hay `modules`. */
  const [moduloParametrizarPath, setModuloParametrizarPath] = useState<string | null>(null);

  const moduleRouteMatches = useMemo(() => {
    return modules.map((module) => {
      const { row, kind } = resolveModuleRouteRow(module.path, rows);
      return {
        ...module,
        route: row,
        matchKind: kind,
      };
    });
  }, [modules, rows]);

  const rutaContextoRow = useMemo(
    () => (rutaContextoId ? rows.find((r) => r.id === rutaContextoId) ?? null : null),
    [rutaContextoId, rows],
  );

  const tituloCatalogoParaContexto = useMemo(() => {
    if (moduloParametrizarPath) {
      const m = modules.find((x) => x.path === moduloParametrizarPath);
      if (m) return m.title;
    }
    if (!rutaContextoRow) return null;
    const exact = modules.find(
      (m) => normalizePathKey(m.path) === normalizePathKey(rutaContextoRow.path),
    );
    if (exact) return exact.title;
    for (const m of modules) {
      const { row } = resolveModuleRouteRow(m.path, rows);
      if (row?.id === rutaContextoRow.id) return m.title;
    }
    return null;
  }, [rutaContextoRow, modules, rows, moduloParametrizarPath]);

  const moduloParametrizarInfo = useMemo(
    () => (moduloParametrizarPath ? modules.find((m) => m.path === moduloParametrizarPath) ?? null : null),
    [moduloParametrizarPath, modules],
  );

  const loadData = useCallback(async (saQuery?: string) => {
    setLoading(true);
    try {
      const saParam = saQuery && /^[0-9a-fA-F]{24}$/.test(saQuery) ? saQuery : undefined;
      const data = await inventarioService.obtenerFormulariosAutorizacionOpciones(saParam);
      const formRows: FormRow[] = (data.formularios || []).map((f) => ({
        id: f.id,
        name: f.name,
        path: f.path,
        tipoNodo: f.tipoNodo,
      }));
      const modulePathSet = new Set(modules.map((module) => normalizePathKey(module.path)));
      const selectedByModule: Record<string, boolean> = {};
      if (modulePathSet.size) {
        formRows.forEach((row) => {
          if (modulePathSet.has(normalizePathKey(row.path))) selectedByModule[row.id] = true;
        });
      }
      setRows(formRows);
      setSelectedRutas(selectedByModule);
      setTenantGlobales(data.tenantGlobales || []);
      setTenantSuperAdmins(data.tenantSuperAdmins || []);
      setUsuarios(data.usuarios || []);
      setSelectedUsuarios({});
      setEsDios(Boolean(data.policy?.esDios));
      setMeta(data.meta ?? null);
      const ancla = data.meta?.tenantSuperAdminAnclaId ? String(data.meta.tenantSuperAdminAnclaId) : '';
      if (saParam) setSeleccionSaId(saParam);
      else if (ancla) setSeleccionSaId(ancla);
      else setSeleccionSaId('');
      if (!data.policy?.esDios) {
        toast.info('Solo el rol DIOS puede persistir formulariosConfig en rutas. Podras revisar datos pero no guardar.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cargar datos';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [modules]);

  useEffect(() => {
    if (!open) return;
    setRutaContextoId(null);
    setModuloParametrizarPath(null);
    setNeedleRutas('');
    setSeleccionSaId('');
    setNeedleRama('');
    setNeedleUsuario('');
    void loadData(undefined);
  }, [open, loadData]);

  useEffect(() => {
    setRutaContextoId((ctx) => {
      if (ctx && selectedRutas[ctx]) return ctx;
      const ids = Object.entries(selectedRutas)
        .filter(([, v]) => v)
        .map(([k]) => k);
      return ids[0] ?? null;
    });
  }, [selectedRutas]);

  const filteredRutas = useMemo(
    () => rows.filter((r) => rowMatchesNeedle(r, needleRutas)),
    [rows, needleRutas],
  );

  const filteredTenantGlobales = useMemo(
    () => tenantGlobales.filter((t) => matchesTenantGlobalRow(t, needleRama)),
    [tenantGlobales, needleRama],
  );

  const filteredTenantSuperAdmins = useMemo(
    () => tenantSuperAdmins.filter((t) => matchesTenantSuperAdminRow(t, needleRama)),
    [tenantSuperAdmins, needleRama],
  );

  const filteredUsuarios = useMemo(
    () => usuarios.filter((u) => matchesUsuarioNombreCorreo(u, needleUsuario)),
    [usuarios, needleUsuario],
  );

  const mostrarSelectorSa =
    tenantSuperAdmins.length > 0 &&
    (Boolean(meta?.requiereParametrizacionTenantSuperAdmin) ||
      meta?.inventarioFormulariosModoAlcance === 'jwt_sa' ||
      meta?.inventarioFormulariosModoAlcance === 'dios_param');

  const toggleRuta = (id: string, checked: boolean): void => {
    setSelectedRutas((prev) => ({ ...prev, [id]: checked }));
    if (checked) setRutaContextoId(id);
  };

  const toggleModuloParametrizar = (modulePath: string, checked: boolean): void => {
    if (checked) setModuloParametrizarPath(modulePath);
    else setModuloParametrizarPath((prev) => (prev === modulePath ? null : prev));
  };

  const toggleUsuario = (id: string, checked: boolean): void => {
    setSelectedUsuarios((prev) => ({ ...prev, [id]: checked }));
  };

  const selectAllRutasVisible = (checked: boolean): void => {
    const next: Record<string, boolean> = { ...selectedRutas };
    filteredRutas.forEach((r) => {
      next[r.id] = checked;
    });
    setSelectedRutas(next);
    if (checked && filteredRutas.length) setRutaContextoId(filteredRutas[0].id);
  };

  const selectAllUsuariosVisible = (checked: boolean): void => {
    const next: Record<string, boolean> = { ...selectedUsuarios };
    filteredUsuarios.forEach((u) => {
      next[u.iud] = checked;
    });
    setSelectedUsuarios(next);
  };

  const buildPayload = (): InventarioFormulariosTenantSavePayload => {
    const rutaIds = Object.entries(selectedRutas).filter(([, v]) => v).map(([k]) => k);
    const usuarioIds = Object.entries(selectedUsuarios).filter(([, v]) => v).map(([k]) => k);
    const meta = new Map(rows.map((r) => [r.id, r]));
    const modoAsignacion: 'USUARIO' = 'USUARIO';
    return {
      modoAsignacion,
      habilitado: true,
      soloDios: false,
      tenantIds: [] as string[],
      usuarioIds,
      rutas: rutaIds.map((id) => {
        const r = meta.get(id);
        return {
          rutaId: id,
          path: r?.path || '',
          name: r?.name || '',
          tipoNodo: r?.tipoNodo || '',
        };
      }),
    };
  };

  const guardar = async (): Promise<void> => {
    if (!esDios) {
      toast.error('Se requiere rol DIOS para guardar formulariosConfig.');
      return;
    }
    const payload = buildPayload();
    if (modules.length > 0 && !moduloParametrizarPath) {
      toast.warning('Marca que modulo de inventario vas a parametrizar (referencia arriba a la izquierda).');
      return;
    }
    if (!payload.rutas.length) {
      toast.warning('Selecciona al menos un formulario o subformulario.');
      return;
    }
    if (!payload.usuarioIds.length) {
      toast.warning('Selecciona al menos un usuario autorizado (rol con tenantSuperAdmin en jerarquia corporativa).');
      return;
    }

    const tenantSuperAdminIdGuardar =
      (typeof meta?.tenantSuperAdminAnclaId === 'string' && meta.tenantSuperAdminAnclaId
        ? meta.tenantSuperAdminAnclaId
        : seleccionSaId.trim()) || '';
    if (esDios && (!tenantSuperAdminIdGuardar || !/^[0-9a-fA-F]{24}$/.test(tenantSuperAdminIdGuardar))) {
      toast.warning('Elige un tenantSuperAdmin valido (rama con tenants y usuarios) antes de guardar.');
      return;
    }

    const rutaIds = payload.rutas.map((r) => r.rutaId);
    setSaving(true);
    try {
      const idSa =
        tenantSuperAdminIdGuardar && /^[0-9a-fA-F]{24}$/.test(tenantSuperAdminIdGuardar)
          ? tenantSuperAdminIdGuardar
          : undefined;
      const { actualizadas, resultados } = await inventarioService.aplicarFormulariosAutorizacion({
        rutaIds,
        tenantIds: payload.tenantIds,
        usuarioIds: payload.usuarioIds,
        ...(idSa ? { tenantSuperAdminId: idSa } : {}),
      });
      const fallos = resultados.filter((r) => !r.ok);
      if (actualizadas > 0) toast.success(`Actualizadas ${actualizadas} ruta(s) via inventario.`);
      if (fallos.length) {
        toast.error(`${fallos.length} ruta(s) fallaron: ${fallos.map((f) => f.error || f.rutaId).join('; ')}`);
      }
      if (actualizadas > 0) onFormulariosAutorizacionApplied?.();
      if (fallos.length === 0 && actualizadas > 0) setOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => setOpen(true)}>
        <Link2 className="h-4 w-4" />
        Autorizacion formularios
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>Formularios, subformularios y autorizados</DialogTitle>
            <DialogDescription>
              Datos desde{' '}
              <code className="rounded bg-muted px-1 text-xs">GET /api/inventario/config/formularios-autorizacion/opciones</code>{' '}
              (<code className="rounded bg-muted px-1 text-xs">?tenantSuperAdminId=</code> opcional para elegir rama SA). Guardar
              con{' '}
              <code className="rounded bg-muted px-1 text-xs">PUT /api/inventario/config/formularios-autorizacion</code> (rol DIOS)
              incluyendo <code className="rounded bg-muted px-1 text-xs">tenantSuperAdminId</code> en el cuerpo cuando aplica.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[calc(92vh-9rem)] gap-4 px-6 py-4 md:grid-cols-2">
            <div className="flex min-h-0 flex-col gap-2">
              {modules.length > 0 ? (
                <div className="rounded-md border border-border bg-muted/30 p-2">
                  <p className="mb-1 text-[11px] font-medium text-foreground">
                    1. Modulo de inventario a parametrizar (obligatorio para guardar)
                  </p>
                  <p className="mb-2 text-[10px] text-muted-foreground">
                    Marca un solo modulo: define el contexto del menu. Luego elige la(s) fila(s) reales en el listado de abajo y
                    los usuarios a la derecha.
                  </p>
                  <div className="max-h-[min(220px,40vh)] space-y-1.5 overflow-y-auto pr-1">
                    {moduleRouteMatches.map((item, idx) => {
                      const estadoEtiqueta =
                        item.matchKind === 'exact'
                          ? 'Ruta exacta'
                          : item.matchKind === 'fuzzy'
                            ? 'Ruta sugerida'
                            : 'Sin coincidencia en listado';
                      const estadoClass =
                        item.matchKind === 'none'
                          ? 'text-amber-700 dark:text-amber-300'
                          : item.matchKind === 'fuzzy'
                            ? 'text-sky-700 dark:text-sky-300'
                            : 'text-emerald-700 dark:text-emerald-400';
                      const mid = `modulo-param-${idx}`;
                      const marcado = moduloParametrizarPath === item.path;
                      return (
                        <div
                          key={item.path}
                          className={`rounded border px-2 py-1.5 text-[10px] ${
                            marcado ? 'border-primary bg-primary/5 ring-1 ring-primary/25' : 'border-border/60 bg-background/50'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox
                              checked={marcado}
                              onCheckedChange={(v) => toggleModuloParametrizar(item.path, v === true)}
                              className="mt-0.5"
                              id={mid}
                            />
                            <div className="min-w-0 flex-1">
                              <label htmlFor={mid} className="cursor-pointer">
                                <span className="font-medium text-foreground">{item.title}</span>
                                <span className="mt-0.5 block break-all font-mono text-muted-foreground">{item.path}</span>
                              </label>
                              {item.route ? (
                                <span className="mt-0.5 block break-all font-mono text-[10px] text-muted-foreground">
                                  Posible fila en listado: {item.route.path}
                                </span>
                              ) : null}
                            </div>
                            <span className={`shrink-0 font-medium ${estadoClass}`}>{estadoEtiqueta}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-end justify-between gap-2">
                <Label htmlFor="filtro-formularios-inventario" className="text-sm font-medium">
                  2. Formularios inventario (name y path)
                </Label>
                <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => selectAllRutasVisible(true)}>
                  Marcar visibles
                </Button>
              </div>
              <Input
                id="filtro-formularios-inventario"
                name="filtro-formularios-inventario"
                autoComplete="off"
                value={needleRutas}
                onChange={(e) => setNeedleRutas(e.target.value)}
                placeholder="Name, path, tipo de nodo o id (varias palabras)..."
                disabled={loading}
              />
              <p className="text-[11px] text-muted-foreground">
                El panel derecho muestra la <span className="font-medium">ultima</span> ruta que marques aqui, junto con el modulo
                elegido arriba.
              </p>
              <p className="text-[11px] text-muted-foreground">
                {needleRutas.trim()
                  ? `${filteredRutas.length} visibles con filtro · ${rows.length} en catalogo`
                  : `${rows.length} registro(s) en catalogo`}
                {meta?.totalRutasActivas != null ? ` · ${meta.totalRutasActivas} rutas activas totales` : ''}
                {meta?.totalFormulariosSubformularios != null
                  ? ` · ${meta.totalFormulariosSubformularios} candidato(s) formulario/subformulario`
                  : ''}
                {meta?.origenResolucion ? ` · Origen: ${meta.origenResolucion}` : ''}
                {meta?.alcance === 'todos_formularios'
                  ? '. Alcance: todos los candidatos (heuristica inventario sin filas).'
                  : meta?.alcance === 'inventario'
                    ? '. Alcance: heuristica inventario.'
                    : meta?.alcance === 'sin_datos'
                      ? '. Sin candidatos en BD.'
                      : ''}
              </p>
              <ScrollArea key={needleRutas} className="h-[min(380px,48vh)] rounded-md border border-border">
                <div className="space-y-0 p-3">
                  {loading ? (
                    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando...
                    </div>
                  ) : filteredRutas.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      {rows.length === 0 ? 'Sin formularios de inventario en catalogo.' : 'Sin coincidencias con el filtro.'}
                    </p>
                  ) : (
                    filteredRutas.map((row) => {
                      const esContexto = rutaContextoId === row.id;
                      return (
                        <div
                          key={row.id}
                          className={`flex flex-col gap-1 border-b border-border/60 py-2 last:border-0 ${
                            esContexto ? 'rounded-md bg-primary/5 px-1 ring-1 ring-primary/25' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox
                              checked={Boolean(selectedRutas[row.id])}
                              onCheckedChange={(v) => toggleRuta(row.id, v === true)}
                              className="mt-1"
                              id={`ruta-${row.id}`}
                            />
                            <label htmlFor={`ruta-${row.id}`} className="min-w-0 flex-1 cursor-pointer text-sm">
                              <span className="font-medium text-foreground">{row.name}</span>
                              <span className="ml-2 rounded bg-muted px-1.5 text-[10px] uppercase text-muted-foreground">
                                {row.tipoNodo}
                              </span>
                              <span className="mt-0.5 block break-all font-mono text-xs text-muted-foreground">{row.path}</span>
                            </label>
                          </div>
                          <div className="flex justify-end pl-7">
                            <button
                              type="button"
                              className="text-[10px] font-medium text-primary underline-offset-2 hover:underline"
                              onClick={() => {
                                setSelectedRutas({ [row.id]: true });
                                setRutaContextoId(row.id);
                              }}
                            >
                              Usar solo esta ruta en el guardado
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              {meta?.ayuda ? (
                <Alert variant="default" className="border-amber-500/50 bg-amber-50/80 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
                  <AlertTitle className="text-sm">Como asociar rutas</AlertTitle>
                  <AlertDescription className="text-xs leading-relaxed">{meta.ayuda}</AlertDescription>
                </Alert>
              ) : null}
            </div>

            <div className="flex min-h-0 flex-col gap-3">
              {modules.length > 0 && !moduloParametrizarPath ? (
                <Alert className="border-amber-500/50 bg-amber-50/80 py-2 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
                  <AlertTitle className="text-xs font-medium">Falta elegir modulo</AlertTitle>
                  <AlertDescription className="text-[11px] leading-relaxed">
                    Marca un modulo en el recuadro &quot;1. Modulo de inventario a parametrizar&quot; (arriba a la izquierda) para
                    poder guardar.
                  </AlertDescription>
                </Alert>
              ) : null}

              {moduloParametrizarInfo ? (
                <Alert className="border-border bg-muted/30 py-2">
                  <AlertTitle className="text-xs font-medium">Modulo marcado para parametrizar</AlertTitle>
                  <AlertDescription className="space-y-1 text-[11px] leading-relaxed">
                    <span className="font-medium text-foreground">{moduloParametrizarInfo.title}</span>
                    <span className="block break-all font-mono text-[10px] text-muted-foreground">{moduloParametrizarInfo.path}</span>
                  </AlertDescription>
                </Alert>
              ) : null}

              {rutaContextoRow ? (
                <Alert className="border-primary/40 bg-primary/5 py-2">
                  <AlertTitle className="text-xs font-medium">Ruta activa en el listado (ultima marcada)</AlertTitle>
                  <AlertDescription className="space-y-1 text-[11px] leading-relaxed">
                    <span className="font-medium text-foreground">{rutaContextoRow.name}</span>
                    {tituloCatalogoParaContexto && !moduloParametrizarInfo ? (
                      <span className="block text-[10px] text-muted-foreground">
                        Modulo de menu relacionado:{' '}
                        <span className="font-medium text-foreground">{tituloCatalogoParaContexto}</span>
                      </span>
                    ) : null}
                    <span className="block break-all font-mono text-[10px] text-muted-foreground">{rutaContextoRow.path}</span>
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      Marca usuarios abajo y Guardar para aplicar{' '}
                      <code className="rounded bg-muted px-0.5">formulariosConfig</code> a esta ruta y a las demas que tengas
                      marcadas en el listado.
                    </span>
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="rounded-md border border-dashed border-border bg-muted/20 px-2 py-1.5 text-[10px] text-muted-foreground">
                  Marca al menos un formulario en el listado de la izquierda: aqui veras el path de la ultima fila marcada.
                </p>
              )}

              <div className="space-y-1">
                <Label className="text-sm font-medium">Filtrar rama (tenant global / codigo SA)</Label>
                <Input
                  value={needleRama}
                  onChange={(e) => setNeedleRama(e.target.value)}
                  placeholder="Codigo TG, id, etiqueta..."
                  disabled={loading}
                />
              </div>

              {meta?.requiereParametrizacionTenantSuperAdmin ? (
                <Alert className="border-amber-500/50 bg-amber-50/80 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
                  <AlertTitle className="text-sm">Parametrizar tenantSuperAdmin</AlertTitle>
                  <AlertDescription className="text-xs leading-relaxed">
                    Rol DIOS sin ancla en el token. Elige un tenantSuperAdmin para cargar la rama de
                    tenant global y los usuarios asociados.
                  </AlertDescription>
                </Alert>
              ) : null}

              {mostrarSelectorSa ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">1. TenantSuperAdmin</Label>
                  <Select
                    value={seleccionSaId || undefined}
                    onValueChange={(v) => {
                      setSeleccionSaId(v);
                      void loadData(v);
                    }}
                    disabled={loading || tenantSuperAdmins.length === 0}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecciona tenantSuperAdmin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tenantSuperAdmins.map((t) => (
                        <SelectItem key={t.iud} value={t.iud} className="text-xs">
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    Con el SA elegido se consulta la jerarquia de tenant global y los usuarios enlazados a esa rama.
                  </p>
                </div>
              ) : null}

              <div className="flex min-h-0 flex-col gap-1">
                <Label className="text-xs font-medium text-muted-foreground">2. Rama tenant global (validacion)</Label>
                {meta?.tenantSuperAdminAnclaId ? (
                  <p className="text-[10px] text-muted-foreground">
                    SA ancla: <span className="font-mono">{meta.tenantSuperAdminAnclaId}</span>
                    {meta?.inventarioFormulariosModoAlcance ? ` · modo ${meta.inventarioFormulariosModoAlcance}` : ''}
                    {meta?.totalTenantGlobalEnRama != null
                      ? ` · ${meta.totalTenantGlobalEnRama} tenant(s) en rama`
                      : ''}
                    {(meta?.inventarioFormulariosModoAlcance === 'jwt_sa' ||
                      meta?.inventarioFormulariosModoAlcance === 'jwt_tg') &&
                    (meta?.filtroCorporativoCountersActivo ? (
                      <span className="ml-1 text-muted-foreground">
                        · JWT / counters: hay filas con <code className="rounded bg-muted px-0.5">corporativo</code> → SA acotados a
                        counters+corporativo.
                      </span>
                    ) : (
                      <span className="ml-1 text-muted-foreground">
                        · JWT / counters: sin corporativo en el ancla del token → parametrizacion libre (SA visibles en jerarquia).
                      </span>
                    ))}
                    {meta?.inventarioFormulariosModoAlcance === 'dios_param' ? (
                      <span className="ml-1 text-muted-foreground">
                        · DIOS: SA seleccionado{' '}
                        {meta?.filtroCorporativoCountersActivo
                          ? 'con corporativo en counters (rama restringida).'
                          : 'sin corporativo en counters (parametrizacion libre en subrama).'}
                      </span>
                    ) : null}
                    {meta?.tenantGlobalJerarquiaOk ? (
                      <span className="mt-1 block text-emerald-700 dark:text-emerald-400">Jerarquia tenant global: con filas.</span>
                    ) : (
                      <span className="mt-1 block text-amber-800 dark:text-amber-300">
                        Sin tenant global listado bajo este SA (revisa tenantJerarquiaCountersGlobal y su counter padre).
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">Sin ancla SA todavia.</p>
                )}
                <ScrollArea className="h-[min(160px,22vh)] rounded-md border border-border">
                  <div className="space-y-0 p-2">
                    {loading ? (
                      <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        ...
                      </div>
                    ) : filteredTenantGlobales.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        {meta?.requiereParametrizacionTenantSuperAdmin && !seleccionSaId
                          ? 'Selecciona un tenantSuperAdmin para listar tenant global.'
                          : 'Sin tenant global en la rama del SA seleccionado.'}
                      </p>
                    ) : (
                      filteredTenantGlobales.map((t) => (
                        <div key={t.iud} className="border-b border-border/50 py-1.5 text-xs last:border-0">
                          <span className="font-medium text-foreground">{t.label}</span>
                          <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">{t.iud}</span>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              {meta?.inventarioFormulariosModoAlcance === 'jwt_tg' ? (
                <div className="flex min-h-0 flex-col gap-1">
                  <Label className="text-xs font-medium text-muted-foreground">TenantSuperAdmin (referencia, modo tenant global)</Label>
                  <ScrollArea className="h-[min(100px,14vh)] rounded-md border border-border">
                    <div className="space-y-0 p-2">
                      {filteredTenantSuperAdmins.length === 0 ? (
                        <p className="py-2 text-center text-[10px] text-muted-foreground">Sin datos SA en este modo.</p>
                      ) : (
                        filteredTenantSuperAdmins.map((t) => (
                          <div key={t.iud} className="border-b border-border/40 py-1 text-[10px] last:border-0">
                            {t.label}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              ) : null}

              <div className="flex min-h-0 flex-col gap-2">
                <div className="flex min-h-0 flex-col gap-1">
                  <Label className="text-xs font-medium text-muted-foreground">3. Usuarios de la rama (autorizar)</Label>
                  <Input
                    value={needleUsuario}
                    onChange={(e) => setNeedleUsuario(e.target.value)}
                    placeholder="Filtrar por nombre o correo..."
                    disabled={loading}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex items-center justify-end">
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => selectAllUsuariosVisible(true)}>
                    Marcar visibles
                  </Button>
                </div>
                <ScrollArea className="h-[min(200px,28vh)] rounded-md border border-border">
                  <div className="space-y-0 p-2">
                    {loading ? (
                      <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        ...
                      </div>
                    ) : filteredUsuarios.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        Sin usuarios en esta rama. Asegura usuarios con rol, tenantId o perfil asociado al tenant seleccionado.
                      </p>
                    ) : (
                      filteredUsuarios.map((u) => (
                        <label
                          key={u.iud}
                          className="flex cursor-pointer items-start gap-2 border-b border-border/50 py-1.5 last:border-0"
                        >
                          <Checkbox
                            checked={Boolean(selectedUsuarios[u.iud])}
                            onCheckedChange={(v) => toggleUsuario(u.iud, v === true)}
                            className="mt-0.5"
                          />
                          <span className="min-w-0 flex-1 text-xs">
                            <span className="font-medium text-foreground">{u.nombre}</span>
                            <span className="mt-0.5 block truncate text-muted-foreground">{u.correo}</span>
                            <span className="mt-0.5 block text-[10px] text-muted-foreground">
                              Rol: {u.rol || '—'} · SA: {u.tenantSuperAdmin || '—'}
                              {u.tenantGlobal ? ` · TG: ${u.tenantGlobal}` : ''}
                            </span>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">Persistencia centralizada en modulo inventario (no llama rutas /seguridad desde el cliente).</p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
                Cerrar
              </Button>
              <Button type="button" onClick={() => void guardar()} disabled={loading || saving || !esDios}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
