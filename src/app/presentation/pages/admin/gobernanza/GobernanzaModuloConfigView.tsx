import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Building2,
  Filter,
  Link2,
  Loader2,
  Pencil,
  RefreshCw,
  Settings2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGobernanzaModulosCatalogo, type GobernanzaModuloGridItem } from './useGobernanzaModulosCatalogo';
import {
  GOBERNANZA_INVENTARIO_CARD,
  GOBERNANZA_INVENTARIO_CARD_FOOTER,
  GOBERNANZA_INVENTARIO_CARD_ICON,
  GOBERNANZA_INVENTARIO_PATH_BAR,
  GOBERNANZA_INVENTARIO_BTN_HEADER,
  GOBERNANZA_INVENTARIO_BTN_CARD,
} from './gobernanzaInventarioLayout';
import { useGobernanzaModuloRutasOpciones } from './useGobernanzaModuloRutasOpciones';
import {
  upsertGobernanzaModulo,
  desactivarGobernanzaModulo,
  sembrarGobernanzaModulosCatalogo,
  sincronizarGobernanzaApiConsumo,
  fetchGobernanzaModuloFiltrosOpciones,
  fetchGobernanzaModuloFormularioDetalle,
  fetchGobernanzaModuloMenu,
} from './gobernanzaModuloService';
import {
  accionesCatalogoModuloPorSlug,
  accionesUpsertDesdeEndpointIds,
  buildAccionesSeleccionDesdeModuloConfig,
  buildGobernanzaModuloUpsertPayload,
  filtrarAccionesFormularioSeleccionadas,
} from './gobernanzaModuloSeedPayload';
import { GobernanzaModuloAccionesSelector } from './GobernanzaModuloAccionesSelector';
import { GobernanzaModuloParametrizarButton } from './GobernanzaModuloParametrizarButton';
import { getGobernanzaModuloCatalogoLocal, normalizeGobernanzaModuloSlug } from './gobernanzaModulosCatalog';
import type {
  GobernanzaFiltroTenantGlobalOpcion,
  GobernanzaFiltroTenantSuperAdminOpcion,
  GobernanzaFiltroUsuarioOpcion,
  GobernanzaFormularioDetalleApi,
  GobernanzaModuloFiltrosVistaApi,
} from './gobernanzaModuloApiTypes';

export type GobernanzaModuloConfigViewProps = {
  className?: string;
};

function resolveParametrizarSlug(item: Pick<GobernanzaModuloGridItem, 'slug' | 'section'>): string {
  const normalized = normalizeGobernanzaModuloSlug(item.slug);
  const local = getGobernanzaModuloCatalogoLocal(normalized);
  return local?.slug ?? item.section ?? normalized;
}

function resolveParametrizarMenuPath(item: Pick<GobernanzaModuloGridItem, 'menuPath' | 'path'>): string | null {
  return item.menuPath?.trim() || item.path?.trim() || null;
}

/** Solo módulos persistidos en gobernanzaModuloConfigs pueden desactivarse. */
function puedeEliminarModuloConfig(item: GobernanzaModuloGridItem): boolean {
  return Boolean(item.moduloId || item.registradoEnBd);
}

function tituloEliminarModulo(item: GobernanzaModuloGridItem): string {
  if (puedeEliminarModuloConfig(item)) {
    return 'Desactivar registro en gobernanzaModuloConfigs';
  }
  return 'Módulo solo en catálogo local. Publica con Parametrizar menú o Importar catálogo.';
}

function toCheckedMap(ids: string[]): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  for (const id of ids) if (id) m[id] = true;
  return m;
}

function idsFromChecked(map: Record<string, boolean>): string[] {
  return Object.entries(map)
    .filter(([, v]) => v)
    .map(([k]) => k);
}

function mergeTenantGlobales(
  listas: GobernanzaFiltroTenantGlobalOpcion[][]
): GobernanzaFiltroTenantGlobalOpcion[] {
  const seen = new Set<string>();
  const out: GobernanzaFiltroTenantGlobalOpcion[] = [];
  for (const lista of listas) {
    for (const t of lista) {
      if (!t.iud || seen.has(t.iud)) continue;
      seen.add(t.iud);
      out.push(t);
    }
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

function mergeUsuarios(listas: GobernanzaFiltroUsuarioOpcion[][]): GobernanzaFiltroUsuarioOpcion[] {
  const seen = new Set<string>();
  const out: GobernanzaFiltroUsuarioOpcion[] = [];
  for (const lista of listas) {
    for (const u of lista) {
      if (!u.iud || seen.has(u.iud)) continue;
      seen.add(u.iud);
      out.push(u);
    }
  }
  return out.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * Rejilla tipo ConfigInventario: módulos de gobernanza desde gobernanzaModuloConfigs + rutasSeguridad.
 */
export function GobernanzaModuloConfigView({ className }: GobernanzaModuloConfigViewProps): React.ReactElement {
  const navigate = useNavigate();
  const { user } = useAuth();
  const esDios =
    String(user?.role ?? (user as { rol?: string } | null)?.rol ?? '').toUpperCase() === 'DIOS';

  const { grid, loading, modulosDesdeApi, refresh } = useGobernanzaModulosCatalogo();
  const parametrizarSectionSlug = useMemo(
    () => (grid[0] ? resolveParametrizarSlug(grid[0]) : 'permisos'),
    [grid]
  );
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [sembrando, setSembrando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSlug, setDialogSlug] = useState('tenant');
  const [dialogLabel, setDialogLabel] = useState('');
  const [dialogDescription, setDialogDescription] = useState('');
  const [dialogRutaId, setDialogRutaId] = useState<string>('');
  const [formularioDetalle, setFormularioDetalle] = useState<GobernanzaFormularioDetalleApi | null>(null);
  const [formularioError, setFormularioError] = useState<string | null>(null);
  const [cargandoFormulario, setCargandoFormulario] = useState(false);
  const [accionesPublicadas, setAccionesPublicadas] = useState<Array<{ id: string; method: string }>>([]);
  const [cargandoAccionesModulo, setCargandoAccionesModulo] = useState(false);

  const accionesCatalogo = useMemo(
    () => accionesCatalogoModuloPorSlug(dialogSlug),
    [dialogSlug]
  );
  const [accionesSeleccionadas, setAccionesSeleccionadas] = useState<Record<string, boolean>>({});

  const [filtrosLoading, setFiltrosLoading] = useState(false);
  const [tenantSuperAdmins, setTenantSuperAdmins] = useState<GobernanzaFiltroTenantSuperAdminOpcion[]>([]);
  const [tenantGlobales, setTenantGlobales] = useState<GobernanzaFiltroTenantGlobalOpcion[]>([]);
  const [usuarios, setUsuarios] = useState<GobernanzaFiltroUsuarioOpcion[]>([]);
  const [selectedSaIds, setSelectedSaIds] = useState<Record<string, boolean>>({});
  const [selectedTgIds, setSelectedTgIds] = useState<Record<string, boolean>>({});
  const [selectedUsuarioIds, setSelectedUsuarioIds] = useState<Record<string, boolean>>({});
  const [needleUsuario, setNeedleUsuario] = useState('');

  const {
    rutas: rutasOpciones,
    sugerida,
    ayuda: ayudaRutas,
    loading: rutasLoading,
    error: rutasError,
    refresh: refreshRutas,
  } = useGobernanzaModuloRutasOpciones(dialogSlug, dialogOpen);

  const refreshRamasFiltros = useCallback(async (saIds: string[]) => {
    const valid = [...new Set(saIds.filter((id) => /^[0-9a-fA-F]{24}$/.test(id)))];
    if (!valid.length) {
      setTenantGlobales([]);
      setUsuarios([]);
      return;
    }
    setFiltrosLoading(true);
    try {
      const responses = await Promise.all(
        valid.map((id) => fetchGobernanzaModuloFiltrosOpciones(id)),
      );
      setTenantGlobales(mergeTenantGlobales(responses.map((r) => r?.tenantGlobales ?? [])));
      setUsuarios(mergeUsuarios(responses.map((r) => r?.usuarios ?? [])));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar filtros');
    } finally {
      setFiltrosLoading(false);
    }
  }, []);

  const loadFiltrosCatalogo = useCallback(async () => {
    setFiltrosLoading(true);
    try {
      const data = await fetchGobernanzaModuloFiltrosOpciones();
      setTenantSuperAdmins(data?.tenantSuperAdmins ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar tenantSuperAdmin');
    } finally {
      setFiltrosLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!dialogOpen) return;
    if (dialogRutaId && rutasOpciones.some((r) => r.id === dialogRutaId)) return;
    if (sugerida?.id) {
      setDialogRutaId(sugerida.id);
      return;
    }
    const vinculada = rutasOpciones.find((r) => r.vinculadoSlug === dialogSlug);
    if (vinculada?.id) setDialogRutaId(vinculada.id);
    else if (rutasOpciones[0]?.id) setDialogRutaId(rutasOpciones[0].id);
  }, [dialogOpen, dialogSlug, dialogRutaId, sugerida, rutasOpciones]);

  useEffect(() => {
    if (!dialogOpen || !dialogRutaId) {
      setFormularioDetalle(null);
      setFormularioError(null);
      return;
    }
    let active = true;
    setCargandoFormulario(true);
    setFormularioError(null);
    void fetchGobernanzaModuloFormularioDetalle(dialogRutaId)
      .then((detalle) => {
        if (!active) return;
        if (!detalle?.component) {
          throw new Error('El formulario no tiene componente asignado en rutasSeguridad.');
        }
        setFormularioDetalle(detalle);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setFormularioDetalle(null);
        setFormularioError(err instanceof Error ? err.message : 'No se pudo cargar el formulario');
      })
      .finally(() => {
        if (active) setCargandoFormulario(false);
      });
    return () => { active = false; };
  }, [dialogOpen, dialogRutaId]);

  useEffect(() => {
    if (!dialogOpen || !dialogSlug) return;
    let active = true;
    setCargandoAccionesModulo(true);
    void fetchGobernanzaModuloMenu(dialogSlug)
      .then((res) => {
        if (!active) return;
        const items = Array.isArray(res.acciones) ? res.acciones : [];
        setAccionesPublicadas(
          items
            .map((a) => ({
              id: String(a.id || ''),
              method: String(a.method || '').toUpperCase(),
            }))
            .filter((a) => a.id)
        );
      })
      .catch(() => {
        if (active) setAccionesPublicadas([]);
      })
      .finally(() => {
        if (active) setCargandoAccionesModulo(false);
      });
    return () => { active = false; };
  }, [dialogOpen, dialogSlug]);

  useEffect(() => {
    if (!dialogOpen || !accionesCatalogo.length) {
      setAccionesSeleccionadas({});
      return;
    }
    setAccionesSeleccionadas(
      buildAccionesSeleccionDesdeModuloConfig(accionesCatalogo, accionesPublicadas)
    );
  }, [dialogOpen, accionesCatalogo, accionesPublicadas]);

  const accionesElegidas = useMemo(
    () => filtrarAccionesFormularioSeleccionadas(accionesCatalogo, accionesSeleccionadas),
    [accionesCatalogo, accionesSeleccionadas]
  );

  const accionesPayloadPreview = useMemo(
    () => accionesUpsertDesdeEndpointIds(dialogSlug, accionesElegidas.map((a) => a.accionId)),
    [dialogSlug, accionesElegidas]
  );

  const abrirPublicar = (item: GobernanzaModuloGridItem) => {
    const fv: GobernanzaModuloFiltrosVistaApi = item.filtrosVista ?? {
      tenantSuperAdminIds: [],
      tenantGlobalIds: [],
      usuarioIds: [],
    };
    setDialogSlug(item.slug);
    setDialogLabel(item.title);
    setDialogDescription(item.description);
    setDialogRutaId(item.rutaId ?? '');
    setSelectedSaIds(toCheckedMap(fv.tenantSuperAdminIds));
    setSelectedTgIds(toCheckedMap(fv.tenantGlobalIds));
    setSelectedUsuarioIds(toCheckedMap(fv.usuarioIds));
    setDialogOpen(true);
    void loadFiltrosCatalogo().then(() => {
      if (fv.tenantSuperAdminIds.length) void refreshRamasFiltros(fv.tenantSuperAdminIds);
    });
  };

  const rutaSeleccionada = rutasOpciones.find((r) => r.id === dialogRutaId);
  const pathDinamico = rutaSeleccionada?.path ?? '';

  const saIdsMarcados = useMemo(() => idsFromChecked(selectedSaIds), [selectedSaIds]);

  useEffect(() => {
    if (!dialogOpen) return;
    if (!saIdsMarcados.length) return;
    void refreshRamasFiltros(saIdsMarcados);
  }, [dialogOpen, saIdsMarcados.join(','), refreshRamasFiltros]);

  const usuariosFiltrados = useMemo(() => {
    const n = needleUsuario.trim().toLowerCase();
    if (!n) return usuarios;
    return usuarios.filter((u) => `${u.nombre} ${u.correo}`.toLowerCase().includes(n));
  }, [usuarios, needleUsuario]);

  const toggleSa = (id: string, checked: boolean) => {
    setSelectedSaIds((prev) => {
      const next = { ...prev, [id]: checked };
      return next;
    });
  };

  const publicarModulo = async () => {
    const nombre = dialogLabel.trim();
    if (!nombre) {
      toast.error('El nombre del módulo es obligatorio.');
      return;
    }
    if (!dialogRutaId || !pathDinamico) {
      toast.error('Selecciona una ruta de rutasSeguridad.');
      return;
    }
    if (!formularioDetalle?.component) {
      toast.error(formularioError || 'El formulario debe tener componente en rutasSeguridad.');
      return;
    }
    if (!accionesElegidas.length) {
      toast.error('Selecciona al menos una acción a parametrizar.');
      return;
    }
    const accionesPayload = accionesUpsertDesdeEndpointIds(
      dialogSlug,
      accionesElegidas.map((a) => a.accionId)
    );
    if (!accionesPayload.length) {
      toast.error('Las acciones seleccionadas no tienen endpoint en el catálogo de gobernanza.');
      return;
    }
    const body = buildGobernanzaModuloUpsertPayload(
      dialogSlug,
      {
        rutaId: dialogRutaId,
        rutaPath: pathDinamico,
        formularioId: formularioDetalle.id,
        formularioNombre: formularioDetalle.name,
        formularioComponent: formularioDetalle.component,
      },
      {
        label: nombre,
        description: dialogDescription.trim(),
        menuPath: pathDinamico,
        acciones: accionesPayload,
        filtrosVista: {
          tenantSuperAdminIds: idsFromChecked(selectedSaIds),
          tenantGlobalIds: idsFromChecked(selectedTgIds),
          usuarioIds: idsFromChecked(selectedUsuarioIds),
        },
      },
    );
    if (!body) {
      toast.error('No se pudo armar el payload del módulo.');
      return;
    }
    setBusySlug(dialogSlug);
    try {
      await upsertGobernanzaModulo(body);
      toast.success(`Módulo «${nombre}» guardado en gobernanzaModuloConfigs.`);
      setDialogOpen(false);
      await refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al publicar');
    } finally {
      setBusySlug(null);
    }
  };

  const sembrarCatalogo = async () => {
    setSembrando(true);
    try {
      const data = await sembrarGobernanzaModulosCatalogo();
      const n = data?.totalSembrados ?? 0;
      const omit = data?.omitidos?.length ?? 0;
      if (n > 0) toast.success(`Catálogo sembrado: ${n} módulo(s).`);
      if (omit > 0) {
        toast.warning(`${omit} módulo(s) sin ruta en rutasSeguridad.`);
      }
      if (!n && !omit) toast.info('No hubo cambios al sembrar.');
      await refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al sembrar catálogo');
    } finally {
      setSembrando(false);
    }
  };

  const sincronizarApis = async () => {
    setSincronizando(true);
    try {
      const data = await sincronizarGobernanzaApiConsumo();
      const partes = [
        `${data.sincronizadas} API(s) vinculada(s)`,
        data.creadas > 0 ? `${data.creadas} nueva(s)` : null,
        data.actualizadas > 0 ? `${data.actualizadas} actualizada(s)` : null,
      ].filter(Boolean);
      toast.success(partes.join(' · '));
      if (data.omitidasSinPath > 0) {
        toast.warning(`${data.omitidasSinPath} acción(es) sin path API en el módulo.`);
      }
      if (data.configsSinRuta > 0) {
        toast.warning(`${data.configsSinRuta} módulo(s) sin rutaId en rutaseguridads.`);
      }
      if (data.conflictos?.length) {
        toast.warning(
          `${data.conflictos.length} conflicto(s): mismo path+method con otro formulario.`
        );
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al sincronizar APIs');
    } finally {
      setSincronizando(false);
    }
  };

  const eliminarModulo = async (item: GobernanzaModuloGridItem) => {
    if (!puedeEliminarModuloConfig(item)) {
      toast.warning('Este módulo aún no está publicado en gobernanzaModuloConfigs.');
      return;
    }
    setBusySlug(item.slug);
    try {
      await desactivarGobernanzaModulo(item.slug);
      toast.success(`Módulo «${item.slug}» desactivado.`);
      await refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setBusySlug(null);
    }
  };

  return (
    <div className={className ?? 'space-y-4'}>
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col gap-4 space-y-0 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              ConfigGobernanza
            </CardTitle>
            <CardDescription>
              Centraliza la parametrizacion del modulo de gobernanza y sus secciones operativas.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {esDios && !modulosDesdeApi ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={GOBERNANZA_INVENTARIO_BTN_HEADER}
                disabled={loading || sembrando}
                onClick={() => void sembrarCatalogo()}
              >
                {sembrando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Importar catálogo
              </Button>
            ) : null}
            <GobernanzaModuloParametrizarButton
              moduloSlug={parametrizarSectionSlug}
              onMenuRefresh={() => void refresh()}
              size="sm"
              className={GOBERNANZA_INVENTARIO_BTN_HEADER}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={GOBERNANZA_INVENTARIO_BTN_HEADER}
              disabled={loading || sincronizando}
              title="Vincula las APIs publicadas en gobernanzaModuloConfigs con apiconsumosfrontend (rutaFormulario)"
              onClick={() => void sincronizarApis()}
            >
              {sincronizando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sincronizar APIs
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={GOBERNANZA_INVENTARIO_BTN_HEADER}
              disabled={loading}
              onClick={() => {
                const first = grid[0];
                if (first) abrirPublicar(first);
                else setDialogOpen(true);
              }}
            >
              <Link2 className="h-4 w-4" />
              Autorización formularios
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={GOBERNANZA_INVENTARIO_BTN_HEADER}
              disabled={loading}
              onClick={() => void refresh()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Actualizar catálogo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <p className="col-span-full py-12 text-center text-sm text-muted-foreground">Cargando módulos…</p>
          ) : (
              grid.map((item) => {
                const Icon = item.icon ?? Building2;
                const busy = busySlug === item.slug;
                const filtrosCount =
                  (item.filtrosVista?.tenantSuperAdminIds?.length ?? 0) +
                  (item.filtrosVista?.tenantGlobalIds?.length ?? 0) +
                  (item.filtrosVista?.usuarioIds?.length ?? 0);
                return (
                  <div key={`${item.slug}-${item.menuPath ?? item.path}`} className={GOBERNANZA_INVENTARIO_CARD}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className={GOBERNANZA_INVENTARIO_CARD_ICON}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={!item.disponible}
                        onClick={() => navigate(item.path)}
                      >
                        Abrir
                      </Button>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                    <p className={GOBERNANZA_INVENTARIO_PATH_BAR}>{item.menuPath || item.path}</p>
                    {filtrosCount > 0 ? (
                      <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Filter className="h-3 w-3" />
                        {filtrosCount} filtro(s) parametrizados
                      </p>
                    ) : null}
                    <div className={GOBERNANZA_INVENTARIO_CARD_FOOTER}>
                      <GobernanzaModuloParametrizarButton
                        moduloSlug={resolveParametrizarSlug(item)}
                        menuPathInicial={resolveParametrizarMenuPath(item)}
                        onMenuRefresh={() => void refresh()}
                        size="sm"
                        className={GOBERNANZA_INVENTARIO_BTN_CARD}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={GOBERNANZA_INVENTARIO_BTN_CARD}
                        disabled={busy}
                        onClick={() => abrirPublicar(item)}
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
                            className={GOBERNANZA_INVENTARIO_BTN_CARD}
                            disabled={busy}
                            onClick={() => abrirPublicar(item)}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Pencil className="h-3.5 w-3.5" />
                            )}
                            Actualizar
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className={GOBERNANZA_INVENTARIO_BTN_CARD}
                            disabled={busy || !puedeEliminarModuloConfig(item)}
                            title={tituloEliminarModulo(item)}
                            onClick={() => void eliminarModulo(item)}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Eliminar
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (open) {
            void refreshRutas();
            void loadFiltrosCatalogo();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Publicar módulo «{dialogSlug}»</DialogTitle>
            <DialogDescription>
              Guarda nombre, descripción, path de menú y filtros de visualización en
              gobernanzaModuloConfigs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Datos del módulo</h3>
              <div className="space-y-2">
                <Label htmlFor="gobernanza-modulo-nombre">Nombre del módulo</Label>
                <Input
                  id="gobernanza-modulo-nombre"
                  value={dialogLabel}
                  onChange={(e) => setDialogLabel(e.target.value)}
                  placeholder="Ej. Gobernanza Tenant"
                  disabled={Boolean(busySlug)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gobernanza-modulo-descripcion">Descripción</Label>
                <Textarea
                  id="gobernanza-modulo-descripcion"
                  rows={2}
                  value={dialogDescription}
                  onChange={(e) => setDialogDescription(e.target.value)}
                  placeholder="Texto visible en la tarjeta"
                  disabled={Boolean(busySlug)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gobernanza-ruta-select">Formulario</Label>
                <Select
                  value={dialogRutaId || undefined}
                  disabled={rutasLoading || rutasOpciones.length === 0}
                  onValueChange={setDialogRutaId}
                >
                  <SelectTrigger id="gobernanza-ruta-select">
                    {rutasLoading ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando formularios…
                      </span>
                    ) : (
                      <SelectValue placeholder="Selecciona un formulario" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {rutasOpciones.map((r) => {
                      const extra =
                        r.vinculadoSlug && r.vinculadoSlug !== dialogSlug
                          ? ` · «${r.vinculadoSlug}»`
                          : r.sugerida
                            ? ' · sugerida'
                            : '';
                      const tipoNodo = r.tipoNodoNombre || r.tipoNodoCodigo || 'Formulario';
                      const label = `${r.name || 'Sin nombre'} · ${tipoNodo}`;
                      return (
                        <SelectItem key={r.id} value={r.id}>
                          {label}
                          {extra}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {cargandoFormulario ? (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Cargando acciones del formulario…
                  </p>
                ) : formularioError ? (
                  <p className="text-xs text-destructive">{formularioError}</p>
                ) : null}
                {rutasError ? <p className="text-xs text-destructive">{rutasError}</p> : null}
                {ayudaRutas ? <p className="text-xs text-amber-800">{ayudaRutas}</p> : null}
              </div>

              <GobernanzaModuloAccionesSelector
                acciones={accionesCatalogo}
                seleccion={accionesSeleccionadas}
                onSeleccionChange={setAccionesSeleccionadas}
                loading={cargandoAccionesModulo}
                refreshLoading={cargandoAccionesModulo}
                onRefresh={() => {
                  if (!dialogOpen || !dialogSlug) return;
                  setCargandoAccionesModulo(true);
                  void fetchGobernanzaModuloMenu(dialogSlug)
                    .then((res) => {
                      const items = Array.isArray(res.acciones) ? res.acciones : [];
                      setAccionesPublicadas(
                        items
                          .map((a) => ({
                            id: String(a.id || ''),
                            method: String(a.method || '').toUpperCase(),
                          }))
                          .filter((a) => a.id)
                      );
                    })
                    .catch(() => setAccionesPublicadas([]))
                    .finally(() => setCargandoAccionesModulo(false));
                }}
              />
            </section>

            <Separator />

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Filtros de visualización</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Elige tenantSuperAdmin, tenantGlobal y usuarios asociados para acotar quién verá este
                módulo en filtros operativos.
              </p>

              {filtrosLoading && !tenantSuperAdmins.length ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando opciones…
                </p>
              ) : null}

              {tenantSuperAdmins.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-xs">Tenant Super Admin</Label>
                  <ScrollArea className="h-28 rounded-md border border-border p-2">
                    <div className="space-y-2 pr-2">
                      {tenantSuperAdmins.map((sa) => (
                        <label
                          key={sa.iud}
                          className="flex cursor-pointer items-start gap-2 text-xs"
                        >
                          <Checkbox
                            checked={Boolean(selectedSaIds[sa.iud])}
                            onCheckedChange={(c) => toggleSa(sa.iud, c === true)}
                          />
                          <span>{sa.label}</span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : null}

              {saIdsMarcados.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Tenant Global</Label>
                    <ScrollArea className="h-28 rounded-md border border-border p-2">
                      {tenantGlobales.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sin tenant global en la rama.</p>
                      ) : (
                        <div className="space-y-2 pr-2">
                          {tenantGlobales.map((tg) => (
                            <label
                              key={tg.iud}
                              className="flex cursor-pointer items-start gap-2 text-xs"
                            >
                              <Checkbox
                                checked={Boolean(selectedTgIds[tg.iud])}
                                onCheckedChange={(c) =>
                                  setSelectedTgIds((prev) => ({
                                    ...prev,
                                    [tg.iud]: c === true,
                                  }))
                                }
                              />
                              <span>{tg.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Usuarios asociados</Label>
                    <Input
                      value={needleUsuario}
                      onChange={(e) => setNeedleUsuario(e.target.value)}
                      placeholder="Buscar por nombre o correo"
                      className="h-8 text-xs"
                    />
                    <ScrollArea className="h-36 rounded-md border border-border p-2">
                      {usuariosFiltrados.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sin usuarios en la rama.</p>
                      ) : (
                        <div className="space-y-2 pr-2">
                          {usuariosFiltrados.map((u) => (
                            <label
                              key={u.iud}
                              className="flex cursor-pointer items-start gap-2 text-xs"
                            >
                              <Checkbox
                                checked={Boolean(selectedUsuarioIds[u.iud])}
                                onCheckedChange={(c) =>
                                  setSelectedUsuarioIds((prev) => ({
                                    ...prev,
                                    [u.iud]: c === true,
                                  }))
                                }
                              />
                              <span>
                                {u.nombre}
                                {u.correo ? (
                                  <span className="block text-[10px] text-muted-foreground">
                                    {u.correo}
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </>
              ) : (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                  Marca al menos un Tenant Super Admin para cargar tenant global y usuarios.
                </p>
              )}
            </section>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={
                Boolean(busySlug)
                || !dialogRutaId
                || rutasLoading
                || !dialogLabel.trim()
                || !formularioDetalle?.component
                || accionesElegidas.length === 0
                || accionesPayloadPreview.length === 0
              }
              onClick={() => void publicarModulo()}
            >
              {busySlug ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
