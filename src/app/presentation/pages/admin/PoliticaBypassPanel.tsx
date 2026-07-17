import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Shield,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  actualizarPoliticaBypassRoles,
  fetchPoliticaBypassCatalogo,
  fetchPoliticaBypassFiltrosOpciones,
  fetchPoliticaBypassSesion,
  type PoliticaBypassAlcanceItem,
  type PoliticaBypassCatalogo,
  type PoliticaBypassFiltrosOpciones,
  type PoliticaBypassFiltrosQuery,
  type PoliticaBypassSesion,
} from '@/app/services/politicaBypassService';

type PoliticaBypassPanelProps = {
  className?: string;
  compact?: boolean;
};

function isPoliticaBypassAlcanceItem(
  item: PoliticaBypassAlcanceItem | null | undefined
): item is PoliticaBypassAlcanceItem {
  return Boolean(item && String(item.alcance || '').trim());
}

function filterAlcances(
  items: (PoliticaBypassAlcanceItem | null | undefined)[] | null | undefined
): PoliticaBypassAlcanceItem[] {
  return (items ?? []).filter(isPoliticaBypassAlcanceItem);
}

function AlcanceBadge({ activo }: { activo: boolean }): React.ReactElement {
  return activo ? (
    <Badge className="bg-success/90 hover:bg-success">
      <CheckCircle2 className="mr-1 h-3 w-3" />
      Bypass activo
    </Badge>
  ) : (
    <Badge variant="secondary">
      <XCircle className="mr-1 h-3 w-3" />
      Sin bypass
    </Badge>
  );
}

const ORIGEN_ROLES_LABEL: Record<string, string> = {
  GLOBAL: 'Semilla global',
  ASIGNACION_TENANT: 'Override tenant',
  ASIGNACION_USUARIO: 'Override usuario',
};

function RolesEditor({
  alcance,
  roles,
  canEdit,
  scope,
  onSaved,
}: {
  alcance: string;
  roles: string[];
  canEdit: boolean;
  scope: PoliticaBypassFiltrosQuery;
  onSaved: () => void;
}): React.ReactElement {
  const [draft, setDraft] = useState(roles.join(', '));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(roles.join(', '));
  }, [roles]);

  const guardar = async () => {
    const parsed = draft
      .split(/[,;\s]+/)
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean);
    setSaving(true);
    try {
      await actualizarPoliticaBypassRoles(alcance, parsed, scope);
      toast.success(`Roles actualizados para ${alcance}`);
      onSaved();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar roles';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {roles.length
          ? roles.map((r) => (
              <Badge key={r} variant="outline" className="font-mono text-xs">
                {r}
              </Badge>
            ))
          : <span className="text-xs text-muted-foreground">Sin roles en semilla</span>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">
        Roles con bypass (coma o espacio). Solo DIOS.
        {scope.tenantSuperAdminId || scope.tenantGlobalId || scope.usuarioId
          ? ' Guarda override para el scope filtrado.'
          : ' Guarda semilla global.'}
      </Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="DIOS, DESARROLLADOR, ADMIN"
          className="font-mono text-sm"
        />
        <Button type="button" size="sm" disabled={saving} onClick={() => void guardar()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Guardar roles
        </Button>
      </div>
    </div>
  );
}

function AlcanceCard({
  item,
  sesion,
  canEditDios,
  scope,
  onRolesSaved,
}: {
  item: PoliticaBypassAlcanceItem;
  sesion: PoliticaBypassSesion | null;
  canEditDios: boolean;
  scope: PoliticaBypassFiltrosQuery;
  onRolesSaved: () => void;
}): React.ReactElement {
  const activo = Boolean(sesion?.bypassPolicy?.alcances?.[item.alcance]);
  const fuente = sesion?.bypassPolicy?.fuentes?.[item.alcance];
  const fuenteLabel = fuente
    ? sesion?.fuentesLabels?.[fuente] || fuente
    : null;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">{item.label}</CardTitle>
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {item.alcance}
            </p>
            {item.origenRoles ? (
              <Badge variant="outline" className="text-[10px]">
                {ORIGEN_ROLES_LABEL[item.origenRoles] || item.origenRoles}
              </Badge>
            ) : null}
          </div>
          {sesion ? <AlcanceBadge activo={activo} /> : null}
        </div>
        <CardDescription className="text-sm leading-relaxed">{item.descripcion}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {sesion && fuenteLabel ? (
          <p className="text-xs text-muted-foreground">
            Fuente efectiva en tu sesión: <span className="font-medium text-foreground">{fuenteLabel}</span>
          </p>
        ) : null}

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Roles parametrizados
          </p>
          <RolesEditor
            alcance={item.alcance}
            roles={item.rolesActivos}
            canEdit={canEditDios}
            scope={scope}
            onSaved={onRolesSaved}
          />
          {item.rolesSemilla.length && item.rolesSemilla.join(',') !== item.rolesActivos.join(',') ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Semilla original: {item.rolesSemilla.join(', ')}
            </p>
          ) : null}
        </div>

        {item.reglasDinamicas?.length ? (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reglas dinámicas (no solo rol)
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {item.reglasDinamicas.map((regla) => (
                <li key={regla}>{regla}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function PoliticaBypassPanel({ className, compact = false }: PoliticaBypassPanelProps): React.ReactElement {
  const [catalogo, setCatalogo] = useState<PoliticaBypassCatalogo | null>(null);
  const [sesion, setSesion] = useState<PoliticaBypassSesion | null>(null);
  const [filtrosOpciones, setFiltrosOpciones] = useState<PoliticaBypassFiltrosOpciones | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingFiltros, setLoadingFiltros] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dominioActivo, setDominioActivo] = useState<string>('RUTAS');
  const [filterTenantSA, setFilterTenantSA] = useState('');
  const [filterTenantGlobal, setFilterTenantGlobal] = useState('');
  const [filterUsuario, setFilterUsuario] = useState('');
  const [filterApisDominios, setFilterApisDominios] = useState('');

  const filtrosQuery = useMemo<PoliticaBypassFiltrosQuery>(() => ({
    tenantSuperAdminId: filterTenantSA || undefined,
    tenantGlobalId: filterTenantGlobal || undefined,
    usuarioId: filterUsuario || undefined,
    apisDominiosId: filterApisDominios || undefined,
  }), [filterTenantSA, filterTenantGlobal, filterUsuario, filterApisDominios]);

  const cargarFiltros = useCallback(async (query: PoliticaBypassFiltrosQuery = {}) => {
    setLoadingFiltros(true);
    try {
      const filtros = await fetchPoliticaBypassFiltrosOpciones(query);
      setFiltrosOpciones(filtros);
      return filtros;
    } catch {
      return null;
    } finally {
      setLoadingFiltros(false);
    }
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cat, ses] = await Promise.all([
        fetchPoliticaBypassCatalogo(filtrosQuery),
        fetchPoliticaBypassSesion(),
      ]);
      setCatalogo(cat);
      setSesion(ses);
      if (cat.dominios?.length && !cat.dominios.some((d) => d.dominio === dominioActivo)) {
        setDominioActivo(cat.dominios[0].dominio);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo cargar políticas de bypass';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [dominioActivo, filtrosQuery]);

  useEffect(() => {
    void cargarFiltros(filtrosQuery);
  }, [cargarFiltros, filterTenantSA, filterTenantGlobal, filterUsuario]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const canEditDios = sesion?.rol === 'DIOS';

  const alcancesCatalogo = useMemo(
    () => filterAlcances(catalogo?.alcances),
    [catalogo?.alcances]
  );

  const dominioSeleccionado = useMemo(() => {
    const grupo = catalogo?.dominios?.find((d) => d.dominio === dominioActivo) ?? null;
    if (!grupo) return null;
    return {
      ...grupo,
      alcances: filterAlcances(grupo.alcances),
    };
  }, [catalogo?.dominios, dominioActivo]);

  if (loading && !catalogo) {
    return (
      <div className={cn('flex items-center justify-center gap-2 py-12 text-muted-foreground', className)}>
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando políticas de bypass…
      </div>
    );
  }

  if (error && !catalogo) {
    return (
      <div className={cn('rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm', className)}>
        <p className="font-medium text-destructive">Error al cargar políticas</p>
        <p className="mt-1 text-muted-foreground">{error}</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void cargar()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)} data-panel="politica-bypass">
      {!compact ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Políticas de bypass jerárquico</h2>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Visibilidad por dominio de negocio. El snapshot <code className="text-xs">bypassPolicy</code> en JWT
              se recalcula cuando cambia la versión global o tu rol / counters / herencia.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void cargar()}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualizar
          </Button>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={() => void cargar()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!compact ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros por tenant y dominio</CardTitle>
            <CardDescription>
              Los dominios de bypass (RUTAS, REFERIDOS, COMISIONES) se derivan del{' '}
              <span className="font-mono text-xs">apisDominios</span> vinculado al tenant.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-xs">Tenant Super Admin</Label>
              <Select
                value={filterTenantSA || '__all__'}
                onValueChange={(v) => {
                  const id = v === '__all__' ? '' : v;
                  setFilterTenantSA(id);
                  setFilterTenantGlobal('');
                  setFilterUsuario('');
                  setFilterApisDominios('');
                }}
                disabled={loadingFiltros}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos (semilla global)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semilla global</SelectItem>
                  {(filtrosOpciones?.tenantSuperAdmins ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tenant Global</Label>
              <Select
                value={filterTenantGlobal || '__all__'}
                onValueChange={(v) => {
                  const id = v === '__all__' ? '' : v;
                  setFilterTenantGlobal(id);
                  setFilterUsuario('');
                }}
                disabled={loadingFiltros || !filterTenantSA}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin tenant global" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">—</SelectItem>
                  {(filtrosOpciones?.tenantGlobales ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Usuario</Label>
              <Select
                value={filterUsuario || '__all__'}
                onValueChange={(v) => setFilterUsuario(v === '__all__' ? '' : v)}
                disabled={loadingFiltros || (!filterTenantSA && !filterTenantGlobal)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los usuarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {(filtrosOpciones?.usuarios ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.label}{u.rol ? ` (${u.rol})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">apisDominios</Label>
              <Select
                value={filterApisDominios || '__auto__'}
                onValueChange={(v) => setFilterApisDominios(v === '__auto__' ? '' : v)}
                disabled={loadingFiltros}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto (del tenant)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">Auto (tenant)</SelectItem>
                  {(filtrosOpciones?.apisDominios ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.etiquetas || d.dominio || d.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          {catalogo?.contexto?.apisDominios || catalogo?.contexto?.bypassDominios?.length ? (
            <CardContent className="border-t pt-4 text-xs text-muted-foreground">
              {catalogo.contexto.apisDominios ? (
                <p>
                  Dominio API:{' '}
                  <span className="font-medium text-foreground">
                    {catalogo.contexto.apisDominios.etiquetas || catalogo.contexto.apisDominios.dominio}
                  </span>
                  {catalogo.contexto.apisDominios.proovedor ? (
                    <span className="ml-1">({catalogo.contexto.apisDominios.proovedor})</span>
                  ) : null}
                </p>
              ) : null}
              {catalogo.contexto.bypassDominios?.length ? (
                <p className="mt-1">
                  Bypass dominios:{' '}
                  <span className="font-mono text-foreground">
                    {catalogo.contexto.bypassDominios.join(', ')}
                  </span>
                </p>
              ) : null}
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      {sesion ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tu sesión actual</CardTitle>
            <CardDescription>
              Rol <span className="font-mono font-medium text-foreground">{sesion.rol || '—'}</span>
              · versión global{' '}
              <span className="font-mono">{sesion.versionGlobal}</span>
              · JWT policy v{' '}
              <span className="font-mono">{sesion.bypassPolicy?.version || '—'}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {sesion.jwtPolicyStale ? (
              <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-warning dark:text-warning">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-xs">
                  El token traía política desactualizada; el servidor ya recalculó desde BD en esta sesión.
                </span>
              </div>
            ) : null}

            <div className="grid gap-2 text-xs sm:grid-cols-3">
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-muted-foreground">tenantSuperAdmin</p>
                <p className="font-mono truncate">{sesion.tenantScope.tenantSuperAdminId || '—'}</p>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-muted-foreground">tenantGlobal</p>
                <p className="font-mono truncate">{sesion.tenantScope.tenantGlobalId || '—'}</p>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-muted-foreground">tenantCorporativo</p>
                <p className="font-mono truncate">{sesion.tenantScope.tenantCorporativoId || '—'}</p>
              </div>
            </div>

            {sesion.bypassPolicy?.meta?.apisDominiosId || sesion.bypassPolicy?.meta?.bypassDominios?.length ? (
              <div className="rounded-md border border-border bg-card px-3 py-2 text-xs">
                <p className="text-muted-foreground">apisDominios en JWT bypassPolicy</p>
                {sesion.bypassPolicy.meta?.apisDominiosId ? (
                  <p className="font-mono truncate">{sesion.bypassPolicy.meta.apisDominiosId}</p>
                ) : null}
                {sesion.bypassPolicy.meta?.bypassDominios?.length ? (
                  <p className="mt-1">
                    Dominios activos:{' '}
                    <span className="font-mono text-foreground">
                      {sesion.bypassPolicy.meta.bypassDominios.join(', ')}
                    </span>
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="overflow-auto rounded-lg border border-border">
              <table className="w-full min-w-[480px] text-left text-xs">
                <thead className="bg-muted/80 text-foreground">
                  <tr>
                    <th className="px-3 py-2">Alcance</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Fuente</th>
                  </tr>
                </thead>
                <tbody>
                  {alcancesCatalogo.map((a) => {
                    const activo = Boolean(sesion.bypassPolicy?.alcances?.[a.alcance]);
                    const fuente = sesion.bypassPolicy?.fuentes?.[a.alcance];
                    return (
                      <tr key={a.alcance} className="border-t border-border">
                        <td className="px-3 py-2">
                          <span className="font-medium">{a.label}</span>
                          <span className="ml-2 font-mono text-[10px] text-muted-foreground">{a.alcance}</span>
                        </td>
                        <td className="px-3 py-2">
                          <AlcanceBadge activo={activo} />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {fuente ? sesion.fuentesLabels?.[fuente] || fuente : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {catalogo?.dominios?.map((d) => (
            <Button
              key={d.dominio}
              type="button"
              size="sm"
              variant={dominioActivo === d.dominio ? 'default' : 'outline'}
              onClick={() => setDominioActivo(d.dominio)}
            >
              {d.label}
              <Badge variant="secondary" className="ml-2 font-mono text-[10px]">
                {filterAlcances(d.alcances).length}
              </Badge>
            </Button>
          ))}
        </div>

        {dominioSeleccionado ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{dominioSeleccionado.descripcion}</p>
            <div className="grid gap-4 lg:grid-cols-2">
              {dominioSeleccionado.alcances.map((item) => (
                <AlcanceCard
                  key={item.alcance}
                  item={item}
                  sesion={sesion}
                  canEditDios={canEditDios}
                  scope={filtrosQuery}
                  onRolesSaved={() => void cargar()}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {catalogo ? (
        <p className="text-center text-[10px] text-muted-foreground">
          Catálogo v{catalogo.version} · edición de roles invalida JWT y caches de listado de rutas
        </p>
      ) : null}
    </div>
  );
}

export default function PoliticaBypassPanelPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-muted/40 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <PoliticaBypassPanel />
      </div>
    </div>
  );
}
