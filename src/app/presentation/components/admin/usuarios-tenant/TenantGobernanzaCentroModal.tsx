import React, { useEffect, useState } from 'react';
import { Building2, Globe, ListTree, Loader2, Pencil, Route, Shield, Trash2, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GOVERNED_ACTION_CATALOG, GovernedButton, GovernedButtonCatalogEditor, TENANT_GOVERNANCE_ACTION_IDS } from '@/app/presentation/actions';
import { useGobernanzaModuloParametrizar } from '@/app/presentation/pages/admin/gobernanza/useGobernanzaModuloParametrizar';
import { desactivarGobernanzaModulo, fetchGobernanzaModuloFiltrosOpciones, guardarGobernanzaBotonesCatalogo } from '@/app/presentation/pages/admin/gobernanza/gobernanzaModuloService';
import type { GobernanzaFiltroTenantGlobalOpcion, GobernanzaFiltroTenantSuperAdminOpcion, GobernanzaFiltroUsuarioOpcion, GobernanzaModuloFiltrosVistaApi } from '@/app/presentation/pages/admin/gobernanza/gobernanzaModuloApiTypes';
import { swalFire } from '@/lib/sweetalert';

type TenantScope = 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO' | null;

type Props = {
  open: boolean;
  embedded?: boolean;
  onClose: () => void;
  scope: TenantScope;
  resumen: {
    superAdmins: number;
    tenantGlobales: number;
    usuariosCorporativos: number;
  };
  onAbrirUsuariosJerarquia: () => void;
  onAbrirUsuariosCorporativos: () => void;
  onAbrirRolesGlobales: () => void;
  onAbrirRolesTg: () => void;
  onAbrirRolesCorporativos: () => void;
};

const actionClass = 'h-auto min-h-10 w-full justify-start whitespace-normal text-left';

export function TenantGobernanzaCentroModal({
  open,
  embedded = false,
  onClose,
  scope,
  resumen,
  onAbrirUsuariosJerarquia,
  onAbrirUsuariosCorporativos,
  onAbrirRolesGlobales,
  onAbrirRolesTg,
  onAbrirRolesCorporativos,
}: Props): React.ReactElement {
  const [tab, setTab] = useState('usuarios');
  const [showCatalogs, setShowCatalogs] = useState(false);
  const [deletingCatalogSlug, setDeletingCatalogSlug] = useState('');
  const [selectedButtonIds, setSelectedButtonIds] = useState<Set<string>>(new Set());
  const [savingButtonCatalog, setSavingButtonCatalog] = useState(false);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [tenantSuperAdmins, setTenantSuperAdmins] = useState<GobernanzaFiltroTenantSuperAdminOpcion[]>([]);
  const [tenantGlobales, setTenantGlobales] = useState<GobernanzaFiltroTenantGlobalOpcion[]>([]);
  const [usuarios, setUsuarios] = useState<GobernanzaFiltroUsuarioOpcion[]>([]);
  const [buttonScope, setButtonScope] = useState<GobernanzaModuloFiltrosVistaApi>({ tenantSuperAdminIds: [], tenantGlobalIds: [], usuarioIds: [] });
  const parametrizar = useGobernanzaModuloParametrizar({
    moduloSlug: 'tenant-governance',
    open: open && tab === 'rutas',
    menuPathInicial: '/admin/gobernanza/multi-tenant/botones-alcance',
  });

  useEffect(() => {
    const stored = parametrizar.configSeleccionada?.botonesCatalogo;
    if (!Array.isArray(stored)) return;
    setSelectedButtonIds(new Set(stored
      .filter((item) => item.estado !== false)
      .map((item) => item.buttonId)
      .filter(Boolean)));
    const filtros = parametrizar.configSeleccionada?.filtrosVista;
    if (filtros) setButtonScope({
      tenantSuperAdminIds: [...filtros.tenantSuperAdminIds],
      tenantGlobalIds: [...filtros.tenantGlobalIds],
      usuarioIds: [...filtros.usuarioIds],
    });
  }, [parametrizar.configSeleccionada]);

  useEffect(() => {
    if (!open || tab !== 'rutas') return;
    let active = true;
    setScopeLoading(true);
    void fetchGobernanzaModuloFiltrosOpciones()
      .then((data) => { if (active) setTenantSuperAdmins(data?.tenantSuperAdmins ?? []); })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los tenants'))
      .finally(() => { if (active) setScopeLoading(false); });
    return () => { active = false; };
  }, [open, tab]);

  useEffect(() => {
    if (!open || tab !== 'rutas' || buttonScope.tenantSuperAdminIds.length === 0) {
      setTenantGlobales([]);
      setUsuarios([]);
      return;
    }
    let active = true;
    setScopeLoading(true);
    void Promise.all(buttonScope.tenantSuperAdminIds.map((id) => fetchGobernanzaModuloFiltrosOpciones(id)))
      .then((responses) => {
        if (!active) return;
        const unique = <T extends { iud: string }>(rows: T[]): T[] => [...new Map(rows.map((row) => [row.iud, row])).values()];
        setTenantGlobales(unique(responses.flatMap((data) => data?.tenantGlobales ?? [])));
        setUsuarios(unique(responses.flatMap((data) => data?.usuarios ?? [])));
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'No se pudo cargar la rama del tenant'))
      .finally(() => { if (active) setScopeLoading(false); });
    return () => { active = false; };
  }, [open, tab, buttonScope.tenantSuperAdminIds.join(',')]);

  const toggleScopeId = (key: keyof GobernanzaModuloFiltrosVistaApi, id: string, checked: boolean): void => {
    setButtonScope((current) => {
      const nextIds = checked ? [...new Set([...current[key], id])] : current[key].filter((value) => value !== id);
      const next = { ...current, [key]: nextIds };
      if (key === 'tenantSuperAdminIds' && nextIds.length === 0) {
        next.tenantGlobalIds = [];
        next.usuarioIds = [];
      }
      return next;
    });
  };

  const eliminarCatalogo = async (slug: string, nombre: string): Promise<void> => {
    const result = await swalFire({
      title: '¿Eliminar parametrización?',
      text: `Se desactivará el catálogo "${nombre || slug}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setDeletingCatalogSlug(slug);
    try {
      await desactivarGobernanzaModulo(slug);
      toast.success('Catálogo desactivado correctamente');
      parametrizar.refrescarAcciones();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el catálogo');
    } finally {
      setDeletingCatalogSlug('');
    }
  };

  const guardarCatalogoBotones = async (): Promise<void> => {
    const rutaId = String(parametrizar.rutaId || '').trim();
    if (!rutaId) {
      toast.error('Selecciona una ruta formulario o subformulario.');
      return;
    }
    const alcance = buttonScope;
    const alcanceTotal = alcance.tenantSuperAdminIds.length + alcance.tenantGlobalIds.length + alcance.usuarioIds.length;
    if (alcanceTotal === 0) {
      toast.error('Parametriza al menos un Tenant SuperAdmin, Tenant Global o usuario antes de guardar los botones.');
      return;
    }
    const botonesCatalogo = GOVERNED_ACTION_CATALOG
      .filter((item) => selectedButtonIds.has(item.id))
      .map((item) => ({
        buttonId: item.id,
        label: item.label,
        moduleId: item.moduleId,
        moduleLabel: item.moduleLabel,
        groupId: item.groupId,
        groupLabel: item.groupLabel,
        routePath: item.routePath,
        operation: item.operation,
        tenantSuperAdminIds: alcance.tenantSuperAdminIds,
        tenantGlobalIds: alcance.tenantGlobalIds,
        usuarioIds: alcance.usuarioIds,
        estado: true,
      }));
    const identifiers = botonesCatalogo.map((item) => item.buttonId);
    if (identifiers.some((id) => !id)) {
      toast.error('Todos los botones seleccionados deben tener identificador.');
      return;
    }
    if (new Set(identifiers).size !== identifiers.length) {
      toast.error('Los identificadores de botones no pueden estar duplicados.');
      return;
    }
    setSavingButtonCatalog(true);
    try {
      await guardarGobernanzaBotonesCatalogo({
        rutaId,
        botonesCatalogo,
      });
      window.dispatchEvent(new Event('governance-buttons-updated'));
      toast.success('Catálogo de botones guardado correctamente');
      parametrizar.refrescarAcciones();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el catálogo de botones');
    } finally {
      setSavingButtonCatalog(false);
    }
  };

  const content = (
    <>
        <header className="shrink-0 border-b border-border px-4 pb-4 pt-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
              <Shield className="h-5 w-5 text-primary" />
              Centro de gobernanza Tenant
              <Badge variant="outline">{scope ?? 'SIN ALCANCE'}</Badge>
            </h1>
            <GovernedButton
              actionId={TENANT_GOVERNANCE_ACTION_IDS.OPEN_BUTTON_CATALOG}
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setTab('rutas')}
            >
              <Route className="h-4 w-4" />
              Parametrizar botones
            </GovernedButton>
          </div>
          <p className="text-left text-xs font-normal text-muted-foreground">
            Consulta y administra usuarios, roles, módulos y rutas usando el alcance autorizado por la sesión.
            Este centro no modifica el JWT ni permite salir de la rama Tenant vigente.
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Card><CardContent className="flex items-center gap-3 p-4"><Shield className="h-5 w-5" /><div><p className="text-2xl font-semibold">{resumen.superAdmins}</p><p className="text-xs text-muted-foreground">SuperAdmin relacionados</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-3 p-4"><Globe className="h-5 w-5" /><div><p className="text-2xl font-semibold">{resumen.tenantGlobales}</p><p className="text-xs text-muted-foreground">Tenant globales</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-3 p-4"><Users className="h-5 w-5" /><div><p className="text-2xl font-semibold">{resumen.usuariosCorporativos}</p><p className="text-xs text-muted-foreground">Usuarios corporativos</p></div></CardContent></Card>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid h-auto w-full grid-cols-1 sm:grid-cols-2">
              <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
              <TabsTrigger value="rutas">Módulos y rutas</TabsTrigger>
            </TabsList>

            <TabsContent value="usuarios" className="mt-4 grid gap-3 sm:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Jerarquía Tenant</CardTitle><CardDescription>Usuarios relacionados, separados por SA, TG y TC.</CardDescription></CardHeader>
                <CardContent><GovernedButton actionId={TENANT_GOVERNANCE_ACTION_IDS.VIEW_TENANT_USERS} className={actionClass} variant="outline" onClick={onAbrirUsuariosJerarquia}><Users className="mr-2 h-4 w-4 shrink-0" />Consultar usuarios SA, TG y TC</GovernedButton></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Relaciones corporativas</CardTitle><CardDescription>Usuarios corporativos, afiliados, herencia y sincronización.</CardDescription></CardHeader>
                <CardContent><GovernedButton actionId={TENANT_GOVERNANCE_ACTION_IDS.VIEW_CORPORATE_USERS} className={actionClass} variant="outline" onClick={onAbrirUsuariosCorporativos}><Building2 className="mr-2 h-4 w-4 shrink-0" />Consultar usuarios por relación corporativa</GovernedButton></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Roles globales</CardTitle><CardDescription>Creación y administración de roles globales existentes.</CardDescription></CardHeader>
                <CardContent><GovernedButton actionId={TENANT_GOVERNANCE_ACTION_IDS.MANAGE_GLOBAL_ROLES} className={actionClass} variant="outline" onClick={onAbrirRolesGlobales}><Globe className="mr-2 h-4 w-4 shrink-0" />Administrar roles globales</GovernedButton></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Roles TG</CardTitle><CardDescription>Catálogo jerárquico asignable a Tenant Global.</CardDescription></CardHeader>
                <CardContent><GovernedButton actionId={TENANT_GOVERNANCE_ACTION_IDS.MANAGE_GLOBAL_ROLES} className={actionClass} variant="outline" onClick={onAbrirRolesTg}><Globe className="mr-2 h-4 w-4 shrink-0" />Administrar roles TG</GovernedButton></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Roles corporativos</CardTitle><CardDescription>Catálogo de roles disponibles para usuarios corporativos.</CardDescription></CardHeader>
                <CardContent><GovernedButton actionId={TENANT_GOVERNANCE_ACTION_IDS.MANAGE_CORPORATE_ROLES} className={actionClass} variant="outline" onClick={onAbrirRolesCorporativos}><Building2 className="mr-2 h-4 w-4 shrink-0" />Administrar roles corporativos</GovernedButton></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rutas" className="mt-4 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <GovernedButton
                  actionId={TENANT_GOVERNANCE_ACTION_IDS.VIEW_TENANT_USERS}
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={onAbrirUsuariosJerarquia}
                >
                  <Users className="h-4 w-4" />
                  Tenants y usuarios asociados
                </GovernedButton>
                <GovernedButton
                  actionId={TENANT_GOVERNANCE_ACTION_IDS.OPEN_BUTTON_CATALOG}
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setShowCatalogs((current) => !current)}
                >
                  <ListTree className="h-4 w-4" />
                  {showCatalogs ? 'Ocultar catálogos' : 'Administrar catálogos'}
                </GovernedButton>
              </div>

              {showCatalogs ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Catálogos parametrizados</CardTitle>
                    <CardDescription>Consulta, modifica o elimina las configuraciones publicadas.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {parametrizar.moduloConfigs.length === 0 ? (
                      <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">No hay catálogos parametrizados para esta sección.</p>
                    ) : parametrizar.moduloConfigs.map((config) => {
                      const slug = String(config.slug || '').trim();
                      const nombre = String(config.nombre || config.label || slug || 'Sin nombre');
                      return (
                        <div key={slug || nombre} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{nombre}</p>
                            <p className="truncate text-xs text-muted-foreground">{config.menuPath || config.rutaPath || slug}</p>
                          </div>
                          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                            <GovernedButton
                              actionId={TENANT_GOVERNANCE_ACTION_IDS.MANAGE_ROUTE_SCOPES}
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!slug}
                              onClick={() => {
                                parametrizar.seleccionarConfig(slug);
                                setShowCatalogs(false);
                              }}
                            >
                              <Pencil className="h-4 w-4" />Modificar
                            </GovernedButton>
                            <GovernedButton
                              actionId={TENANT_GOVERNANCE_ACTION_IDS.MANAGE_ROUTE_SCOPES}
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={!slug || deletingCatalogSlug === slug}
                              onClick={() => void eliminarCatalogo(slug, nombre)}
                            >
                              {deletingCatalogSlug === slug ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              Eliminar
                            </GovernedButton>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader><CardTitle className="text-base">Gobernanza por módulo o ruta</CardTitle><CardDescription>Define el techo vigente de vistas/rutas y acciones HTTP. La configuración conserva la herencia y sincronización actuales.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <section className="space-y-3 rounded-xl border p-4">
                    <div><h3 className="text-sm font-semibold">Alcance de los botones seleccionados</h3><p className="text-xs text-muted-foreground">Selecciona el Tenant SuperAdmin para cargar su rama y parametrizar quién puede usar los botones.</p></div>
                    {scopeLoading ? <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Cargando alcance…</p> : null}
                    <div className="grid gap-3 lg:grid-cols-3">
                      <div className="space-y-2"><p className="text-xs font-medium">Tenant SuperAdmin</p><div className="max-h-44 space-y-2 overflow-y-auto rounded-md border p-2">
                        {tenantSuperAdmins.map((item) => <label key={item.iud} className="flex cursor-pointer items-start gap-2 text-xs"><Checkbox checked={buttonScope.tenantSuperAdminIds.includes(item.iud)} onCheckedChange={(value) => toggleScopeId('tenantSuperAdminIds', item.iud, value === true)} /><span>{item.label}</span></label>)}
                        {!scopeLoading && tenantSuperAdmins.length === 0 ? <p className="text-xs text-muted-foreground">No hay Tenant SuperAdmin disponibles.</p> : null}
                      </div></div>
                      <div className="space-y-2"><p className="text-xs font-medium">Tenant Global</p><div className="max-h-44 space-y-2 overflow-y-auto rounded-md border p-2">
                        {tenantGlobales.map((item) => <label key={item.iud} className="flex cursor-pointer items-start gap-2 text-xs"><Checkbox checked={buttonScope.tenantGlobalIds.includes(item.iud)} onCheckedChange={(value) => toggleScopeId('tenantGlobalIds', item.iud, value === true)} /><span>{item.label}</span></label>)}
                        {buttonScope.tenantSuperAdminIds.length === 0 ? <p className="text-xs text-muted-foreground">Selecciona un Tenant SuperAdmin.</p> : null}
                      </div></div>
                      <div className="space-y-2"><p className="text-xs font-medium">Usuarios asociados</p><div className="max-h-44 space-y-2 overflow-y-auto rounded-md border p-2">
                        {usuarios.map((item) => <label key={item.iud} className="flex cursor-pointer items-start gap-2 text-xs"><Checkbox checked={buttonScope.usuarioIds.includes(item.iud)} onCheckedChange={(value) => toggleScopeId('usuarioIds', item.iud, value === true)} /><span>{item.nombre}<span className="block text-[10px] text-muted-foreground">{item.correo}</span></span></label>)}
                        {buttonScope.tenantSuperAdminIds.length === 0 ? <p className="text-xs text-muted-foreground">Selecciona un Tenant SuperAdmin.</p> : null}
                      </div></div>
                    </div>
                  </section>
                  <GovernedButtonCatalogEditor
                    selectedIds={selectedButtonIds}
                    onSelectedIdsChange={setSelectedButtonIds}
                  />
                  <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    Alcance aplicado: {buttonScope.tenantSuperAdminIds.length} Tenant SuperAdmin,{' '}
                    {buttonScope.tenantGlobalIds.length} Tenant Global y {buttonScope.usuarioIds.length} usuarios.
                  </p>
                  {parametrizar.guardarBloqueadoPor ? (
                    <p className="text-xs text-warning">{parametrizar.guardarBloqueadoPor}</p>
                  ) : null}
                  <GovernedButton
                    actionId={TENANT_GOVERNANCE_ACTION_IDS.MANAGE_ROUTE_SCOPES}
                    className="w-full sm:w-auto"
                    disabled={selectedButtonIds.size === 0 || savingButtonCatalog || !parametrizar.rutaId}
                    onClick={() => void guardarCatalogoBotones()}
                  >
                    {savingButtonCatalog ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" />}
                    Guardar catálogo de botones ({selectedButtonIds.size})
                  </GovernedButton>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex shrink-0 justify-center border-t border-border p-4 sm:justify-end">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose}>Cerrar</Button>
        </div>
    </>
  );

  if (embedded && !open) return <></>;

  if (embedded) {
    return (
      <section className="mx-auto flex min-h-[calc(100dvh-7rem)] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {content}
      </section>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[92dvh] w-[min(96vw,58rem)] flex-col overflow-hidden p-0">
        {content}
      </DialogContent>
    </Dialog>
  );
}

export default TenantGobernanzaCentroModal;
