import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Building2,
  Filter,
  Link2,
  Loader2,
  Pencil,
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
import { useGobernanzaModuloRutasOpciones } from './useGobernanzaModuloRutasOpciones';
import {
  upsertGobernanzaModulo,
  desactivarGobernanzaModulo,
  sembrarGobernanzaModulosCatalogo,
  fetchGobernanzaModuloFiltrosOpciones,
} from './gobernanzaModuloService';
import { buildGobernanzaModuloUpsertPayload } from './gobernanzaModuloSeedPayload';
import type {
  GobernanzaFiltroTenantGlobalOpcion,
  GobernanzaFiltroTenantSuperAdminOpcion,
  GobernanzaFiltroUsuarioOpcion,
  GobernanzaModuloFiltrosVistaApi,
} from './gobernanzaModuloApiTypes';

export type GobernanzaModuloConfigViewProps = {
  className?: string;
};

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
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [sembrando, setSembrando] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSlug, setDialogSlug] = useState('tenant');
  const [dialogLabel, setDialogLabel] = useState('');
  const [dialogDescription, setDialogDescription] = useState('');
  const [dialogRutaId, setDialogRutaId] = useState<string>('');

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
    const body = buildGobernanzaModuloUpsertPayload(
      dialogSlug,
      {
        rutaId: dialogRutaId,
        rutaPath: pathDinamico,
      },
      {
        label: nombre,
        description: dialogDescription.trim(),
        menuPath: pathDinamico,
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

  const eliminarModulo = async (item: GobernanzaModuloGridItem) => {
    if (!item.moduloId) {
      toast.warning('Este módulo solo existe en catálogo local.');
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
              Parametriza módulos en gobernanzaModuloConfigs: nombre, descripción, path de menú y
              filtros por tenant/usuario.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {esDios && !modulosDesdeApi ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={loading || sembrando}
                onClick={() => void sembrarCatalogo()}
              >
                {sembrando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Importar catálogo
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
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
            <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void refresh()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Actualizar catálogo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Cargando módulos…</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {grid.map((item) => {
                const Icon = item.icon ?? Building2;
                const busy = busySlug === item.slug;
                const filtrosCount =
                  (item.filtrosVista?.tenantSuperAdminIds?.length ?? 0) +
                  (item.filtrosVista?.tenantGlobalIds?.length ?? 0) +
                  (item.filtrosVista?.usuarioIds?.length ?? 0);
                return (
                  <div
                    key={item.slug}
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
                        disabled={!item.disponible}
                        onClick={() => navigate(item.path)}
                      >
                        Abrir
                      </Button>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                    <p className="mt-3 break-all rounded-md border border-destructive/20 bg-destructive/5 px-2 py-1 font-mono text-[11px] text-destructive/90">
                      {item.menuPath || item.path}
                    </p>
                    {filtrosCount > 0 ? (
                      <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Filter className="h-3 w-3" />
                        {filtrosCount} filtro(s) parametrizados
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
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
                            className="h-8 gap-1.5 text-xs"
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
                            className="h-8 gap-1.5 text-xs"
                            disabled={busy || !item.moduloId}
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
              })}
            </div>
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
                <Label htmlFor="gobernanza-ruta-select">Ruta (rutasSeguridad)</Label>
                <Select
                  value={dialogRutaId || undefined}
                  disabled={rutasLoading || rutasOpciones.length === 0}
                  onValueChange={setDialogRutaId}
                >
                  <SelectTrigger id="gobernanza-ruta-select" className="font-mono text-xs">
                    {rutasLoading ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando rutas…
                      </span>
                    ) : (
                      <SelectValue placeholder="Selecciona una ruta" />
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
                      const label =
                        r.name && r.name !== r.path ? `${r.name} — ${r.path}` : r.path;
                      return (
                        <SelectItem key={r.id} value={r.id} className="font-mono text-xs">
                          {label}
                          {extra}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {rutaSeleccionada?.component ? (
                  <p className="text-xs text-muted-foreground">
                    Componente: {rutaSeleccionada.component}
                  </p>
                ) : null}
                {rutasError ? <p className="text-xs text-destructive">{rutasError}</p> : null}
                {ayudaRutas ? <p className="text-xs text-amber-800">{ayudaRutas}</p> : null}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Path dinámico (menú)</Label>
                <p
                  className="break-all rounded-md border border-primary/20 bg-primary/5 px-3 py-2 font-mono text-xs text-foreground"
                  aria-live="polite"
                >
                  {pathDinamico || 'Selecciona una ruta'}
                </p>
              </div>
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
                Boolean(busySlug) || !dialogRutaId || rutasLoading || !dialogLabel.trim()
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
