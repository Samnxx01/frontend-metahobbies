import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Building2,
  Filter,
  Link2,
  Loader2,
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
import { useGobernanzaModulosCatalogo, type GobernanzaModuloGridItem } from './useGobernanzaModulosCatalogo';
import {
  GOBERNANZA_INVENTARIO_CARD,
  GOBERNANZA_INVENTARIO_CARD_FOOTER,
  GOBERNANZA_INVENTARIO_CARD_ICON,
  GOBERNANZA_INVENTARIO_PATH_BAR,
  GOBERNANZA_INVENTARIO_BTN_HEADER,
  GOBERNANZA_INVENTARIO_BTN_CARD,
} from './gobernanzaInventarioLayout';
import {
  upsertGobernanzaModulo,
  desactivarGobernanzaModulo,
  sembrarGobernanzaModulosCatalogo,
  sincronizarGobernanzaApiConsumo,
  fetchGobernanzaModuloFiltrosOpciones,
  fetchGobernanzaModuloConfigs,
} from './gobernanzaModuloService';
import {
  buildGobernanzaModuloAutorizacionPayload,
} from './gobernanzaModuloSeedPayload';
import { accionesCatalogDesdeConfig } from './gobernanzaModuloParametrizarOpciones';
import { GobernanzaModuloParametrizarButton } from './GobernanzaModuloParametrizarButton';
import { getGobernanzaModuloCatalogoLocal, normalizeGobernanzaModuloSlug } from './gobernanzaModulosCatalog';
import { METHOD_STYLE } from './parametrosGobernanzaSectionUi';
import type {
  GobernanzaFiltroTenantGlobalOpcion,
  GobernanzaFiltroTenantSuperAdminOpcion,
  GobernanzaFiltroUsuarioOpcion,
  GobernanzaModuloConfigApi,
  GobernanzaModuloFiltrosVistaApi,
} from './gobernanzaModuloApiTypes';
import {
  contarAlcancesParametrizados,
  tieneAlcancesParametrizados,
} from './gobernanzaModuloAlcance';
import { isOpaqueDocumentId, normalizePublicIdForApi } from '@/app/utils/entityPublicId';

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

function puedeAutorizarModuloConfig(item: GobernanzaModuloGridItem): boolean {
  return Boolean(item.registradoEnBd && item.rutaId);
}

function tituloAutorizarModulo(item: GobernanzaModuloGridItem): string {
  if (!item.registradoEnBd || !item.rutaId) {
    return item.registradoEnBd
      ? 'Actualiza el menú antes de autorizar.'
      : 'Publica el menú con «Parametrizar menú» antes de autorizar.';
  }
  if (!tieneAlcancesParametrizados(item.filtrosVista)) {
    return 'Asigna alcance de visualización (tenant SA, TG o usuarios).';
  }
  return 'Actualizar alcance de visualización sobre el módulo publicado';
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

function normalizarIdFiltro(id: string | null | undefined): string {
  const norm = normalizePublicIdForApi(id);
  return isOpaqueDocumentId(norm) ? norm : '';
}

function toCheckedMap(ids: string[]): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  for (const id of ids) {
    const norm = normalizarIdFiltro(id);
    if (norm) m[norm] = true;
  }
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
  const [dialogConfig, setDialogConfig] = useState<GobernanzaModuloConfigApi | null>(null);
  const [cargandoDialogConfig, setCargandoDialogConfig] = useState(false);
  const [dialogConfigError, setDialogConfigError] = useState<string | null>(null);

  const accionesCatalogoPublicadas = useMemo(
    () => accionesCatalogDesdeConfig(dialogConfig),
    [dialogConfig]
  );

  const [filtrosLoading, setFiltrosLoading] = useState(false);
  const [tenantSuperAdmins, setTenantSuperAdmins] = useState<GobernanzaFiltroTenantSuperAdminOpcion[]>([]);
  const [tenantGlobales, setTenantGlobales] = useState<GobernanzaFiltroTenantGlobalOpcion[]>([]);
  const [usuarios, setUsuarios] = useState<GobernanzaFiltroUsuarioOpcion[]>([]);
  const [selectedSaIds, setSelectedSaIds] = useState<Record<string, boolean>>({});
  const [selectedTgIds, setSelectedTgIds] = useState<Record<string, boolean>>({});
  const [selectedUsuarioIds, setSelectedUsuarioIds] = useState<Record<string, boolean>>({});
  const [needleUsuario, setNeedleUsuario] = useState('');

  const refreshRamasFiltros = useCallback(async (saIds: string[]) => {
    const valid = [
      ...new Set(
        saIds.map((id) => normalizarIdFiltro(id)).filter(Boolean),
      ),
    ];
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
      const mergedUsuarios = mergeUsuarios(responses.map((r) => r?.usuarios ?? []));
      setUsuarios(mergedUsuarios);
      if (mergedUsuarios.length === 0) {
        const diag = responses[responses.length - 1]?.meta?.diagnosticoRamaUsuarios;
        toast.info(
          `Sin usuarios en rama para el SA seleccionado${diag?.documentosRegisCandidatos != null ? ` · candidatos Regis: ${diag.documentosRegisCandidatos}` : ''}.`,
        );
      }
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
    const norm = normalizarIdFiltro(id);
    if (!norm) return;
    setSelectedSaIds((prev) => {
      const next = { ...prev, [norm]: checked };
      if (!checked) delete next[norm];
      return next;
    });
  };

  const abrirAutorizar = (item: GobernanzaModuloGridItem) => {
    if (!puedeAutorizarModuloConfig(item)) {
      toast.warning('Publica el menú con «Parametrizar menú» antes de autorizar.');
      return;
    }
    const fv: GobernanzaModuloFiltrosVistaApi = item.filtrosVista ?? {
      tenantSuperAdminIds: [],
      tenantGlobalIds: [],
      usuarioIds: [],
    };
    setDialogSlug(item.slug);
    setDialogConfig(null);
    setDialogConfigError(null);
    setSelectedSaIds(toCheckedMap(fv.tenantSuperAdminIds));
    setSelectedTgIds(toCheckedMap(fv.tenantGlobalIds));
    setSelectedUsuarioIds(toCheckedMap(fv.usuarioIds));
    setDialogOpen(true);
    setCargandoDialogConfig(true);
    void loadFiltrosCatalogo().then(() => {
      if (fv.tenantSuperAdminIds.length) void refreshRamasFiltros(fv.tenantSuperAdminIds);
    });
    void fetchGobernanzaModuloConfigs(item.section)
      .then(({ configs }) => {
        const cfg =
          configs.find((c) => c.slug === item.slug)
          ?? configs.find((c) => String(c.rutaId || '') === String(item.rutaId || ''))
          ?? null;
        if (!cfg?.rutaId) {
          setDialogConfigError('No se encontró el módulo en gobernanzaModuloConfigs.');
          return;
        }
        setDialogConfig(cfg);
      })
      .catch((err: unknown) => {
        setDialogConfigError(err instanceof Error ? err.message : 'Error al cargar catálogo');
      })
      .finally(() => {
        setCargandoDialogConfig(false);
      });
  };

  const guardarAutorizacion = async () => {
    if (!dialogConfig) {
      toast.error(dialogConfigError || 'El módulo no está publicado en gobernanzaModuloConfigs.');
      return;
    }
    const filtrosVista: GobernanzaModuloFiltrosVistaApi = {
      tenantSuperAdminIds: idsFromChecked(selectedSaIds),
      tenantGlobalIds: idsFromChecked(selectedTgIds),
      usuarioIds: idsFromChecked(selectedUsuarioIds),
    };
    if (!tieneAlcancesParametrizados(filtrosVista)) {
      toast.warning(
        'Parametriza al menos un alcance (tenant SA, tenant global o usuario) antes de autorizar.'
      );
      return;
    }
    const body = buildGobernanzaModuloAutorizacionPayload(dialogConfig, filtrosVista);
    if (!body) {
      toast.error('El módulo no tiene formulario ni acciones publicadas. Use «Parametrizar menú».');
      return;
    }
    const nombre = String(dialogConfig.nombre || dialogConfig.label || dialogSlug).trim();
    setBusySlug(dialogSlug);
    try {
      await upsertGobernanzaModulo(body);
      toast.success(`Alcance de «${nombre}» guardado en gobernanzaModuloConfigs.`);
      setDialogOpen(false);
      await refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar autorización');
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

  const alcancesSeleccionados = useMemo(
    () =>
      idsFromChecked(selectedSaIds).length
      + idsFromChecked(selectedTgIds).length
      + idsFromChecked(selectedUsuarioIds).length,
    [selectedSaIds, selectedTgIds, selectedUsuarioIds]
  );

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
                const first = grid.find((m) => puedeAutorizarModuloConfig(m));
                if (first) abrirAutorizar(first);
                else toast.warning('No hay módulos publicados para autorizar. Use «Parametrizar menú».');
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
                const filtrosCount = contarAlcancesParametrizados(item.filtrosVista);
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
                    ) : item.registradoEnBd ? (
                      <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
                        Sin alcances parametrizados: el menú dinámico no se renderiza hasta autorizar.
                      </p>
                    ) : null}
                    <div className={GOBERNANZA_INVENTARIO_CARD_FOOTER}>
                      <GobernanzaModuloParametrizarButton
                        moduloSlug={resolveParametrizarSlug(item)}
                        menuPathInicial={resolveParametrizarMenuPath(item)}
                        esEdicion={Boolean(item.registradoEnBd)}
                        onMenuRefresh={() => void refresh()}
                        size="sm"
                        className={GOBERNANZA_INVENTARIO_BTN_CARD}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={GOBERNANZA_INVENTARIO_BTN_CARD}
                        disabled={busy || !puedeAutorizarModuloConfig(item)}
                        title={tituloAutorizarModulo(item)}
                        onClick={() => abrirAutorizar(item)}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Autorizar
                      </Button>
                      {esDios ? (
                        <>
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
          if (open) void loadFiltrosCatalogo();
          if (!open) {
            setDialogConfig(null);
            setDialogConfigError(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Autorización de formulario «{dialogSlug}»</DialogTitle>
            <DialogDescription>
              Asigna alcance (tenantSuperAdmin, tenant global y usuarios) sobre el módulo ya
              publicado en gobernanzaModuloConfigs. El menú y las operaciones se editan con
              «Parametrizar menú».
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Módulo en catálogo</h3>
              {cargandoDialogConfig ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Cargando gobernanzaModuloConfigs…
                </p>
              ) : dialogConfigError ? (
                <p className="text-xs text-destructive">{dialogConfigError}</p>
              ) : dialogConfig ? (
                <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4 text-xs">
                  <div>
                    <p className="font-semibold text-foreground">
                      {dialogConfig.nombre || dialogConfig.label}
                    </p>
                    {dialogConfig.description ? (
                      <p className="mt-1 text-muted-foreground">{dialogConfig.description}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1 text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Path:</span>{' '}
                      {dialogConfig.menuPath || dialogConfig.rutaPath || dialogConfig.frontPath}
                    </p>
                    {dialogConfig.formularioComponent ? (
                      <p>
                        <span className="font-medium text-foreground">Componente:</span>{' '}
                        {dialogConfig.formularioComponent}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                      Operaciones habilitadas
                    </p>
                    {accionesCatalogoPublicadas.length === 0 ? (
                      <p className="text-muted-foreground">
                        Sin acciones publicadas. Parametrice el menú antes de autorizar.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {accionesCatalogoPublicadas.map((a) => {
                          const method = String(a.method || 'GET').toUpperCase();
                          const style = METHOD_STYLE[method] ?? METHOD_STYLE.GET;
                          return (
                            <li key={a.accionId} className="flex items-center gap-2">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${style}`}
                              >
                                {method}
                              </span>
                              <span className="text-foreground">{a.title || a.accionId}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}
            </section>

            <Separator />

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Filtros de visualización</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Elige tenantSuperAdmin, tenantGlobal y usuarios asociados para acotar quién verá este
                módulo. Sin al menos un alcance parametrizado, el menú dinámico no se renderiza.
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
                      {tenantSuperAdmins.map((sa) => {
                        const saId = normalizarIdFiltro(sa.iud);
                        if (!saId) return null;
                        return (
                        <label
                          key={saId}
                          className="flex cursor-pointer items-start gap-2 text-xs"
                        >
                          <Checkbox
                            checked={Boolean(selectedSaIds[saId])}
                            onCheckedChange={(c) => toggleSa(saId, c === true)}
                          />
                          <span>{sa.label}</span>
                        </label>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              ) : null}

              {saIdsMarcados.length > 0 ? (
                <>
                  {filtrosLoading ? (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Cargando tenant global y usuarios de la rama…
                    </p>
                  ) : null}
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
                || cargandoDialogConfig
                || !dialogConfig
                || Boolean(dialogConfigError)
                || accionesCatalogoPublicadas.length === 0
                || alcancesSeleccionados === 0
              }
              onClick={() => void guardarAutorizacion()}
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
