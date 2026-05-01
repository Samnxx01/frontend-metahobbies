import React, { useState } from 'react';
import { RefreshCw, Shield, Building2, Globe, Plus, Loader2, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch } from '@/app/services/api';
import { toast } from 'react-toastify';
import { useTenantUsuarios } from '@/app/hooks/useTenantUsuarios';
import { NodoTenantGlobalCard } from '@/app/presentation/components/admin/usuarios-tenant/NodoTenantGlobalCard';
import { UsuarioGlobalModal } from '@/app/presentation/components/admin/usuarios-tenant/UsuarioGlobalModal';
import { UsuarioCorporativoModal } from '@/app/presentation/components/admin/usuarios-tenant/UsuarioCorporativoModal';
import { UsuarioSuperAdminModal } from '@/app/presentation/components/admin/usuarios-tenant/UsuarioSuperAdminModal';
import { TenantUserActionButtons } from '@/app/presentation/components/admin/usuarios-tenant/TenantUserActionButtons';
import { RolGlobalEditModal } from '@/app/presentation/components/admin/usuarios-tenant/RolGlobalEditModal';
import { RolCorporativoEditModal } from '@/app/presentation/components/admin/usuarios-tenant/RolCorporativoEditModal';
import { RolesGlobalesModal } from '@/app/presentation/components/admin/usuarios-tenant/RolesGlobalesModal';
import { RolesCorporativosModal } from '@/app/presentation/components/admin/usuarios-tenant/RolesCorporativosModal';
import type { CorpNode, TenantGlobalInfo, TenantUsuario } from '@/app/services/tenantUsuariosService';
import { useAuth } from '@/app/providers/AuthProvider';

export default function UsuariosTenant(): React.ReactElement {
    const { token } = useAuth();
    const {
        jerarquia,
        loadingJerarquia,
        errorJerarquia,
        refetch,
        isCreatingGlobal,
        errorCrearGlobal,
        crearUsuarioGlobal,
        isCreatingCorp,
        errorCrearCorp,
        crearUsuarioCorporativo,
        isCreatingSuperAdmin,
        errorCrearSuperAdmin,
        crearUsuarioSuperAdmin,
        isSincronizandoCanReferir,
        errorSincronizarCanReferir,
        sincronizarCanReferirUsuarios,
        isSincronizandoGlobalCanReferir,
        errorSincronizarGlobalCanReferir,
        sincronizarGlobalCanReferirUsuarios,
    } = useTenantUsuarios();

    // Modal global
    const [modalGlobal, setModalGlobal] = useState(false);

    // Modal SuperAdmin
    const [modalSuperAdmin, setModalSuperAdmin] = useState(false);

    // Modal corporativo — guarda el nodo seleccionado
    const [nodoCorp, setNodoCorp] = useState<CorpNode | null>(null);

    // Modales de gestión de roles
    const [modalRolesGlobales, setModalRolesGlobales] = useState(false);
    const [modalRolesCorporativos, setModalRolesCorporativos] = useState(false);

    const scope = jerarquia?.scope ?? null;

    // Lista de TenantGlobales para el selector del SUPER_ADMIN
    const tenantsGlobalesInfo: TenantGlobalInfo[] = (jerarquia?.tenantsGlobales ?? [])
        .map(tg => tg.tenantGlobal)
        .filter((tg): tg is TenantGlobalInfo => tg !== null);

    // Funciones de sincronización
    const sincronizarGlobal = async (canReferir: boolean) => {
        const tenantGlobalId = jerarquia?.tenantsGlobales[0]?.tenantGlobal?.iud;
        if (!tenantGlobalId) throw new Error('No se pudo determinar el tenant global');
        return sincronizarCanReferirUsuarios({ tenantGlobalId, canReferir });
    };

    const sincronizarCorporativo = async (canReferir: boolean) => {
        if (!nodoCorp?.tenantCorporativo.iud) throw new Error('No se pudo determinar el tenant corporativo');
        return sincronizarCanReferirUsuarios({ tenantCorporativoId: nodoCorp.tenantCorporativo.iud, canReferir });
    };

    // ─── Editar Usuario Global (SA o TG) ─────────────────────────────────────
    const [editUserModal, setEditUserModal] = useState(false);
    const [editUserTarget, setEditUserTarget] = useState<any | null>(null);
    const [editUserSaving, setEditUserSaving] = useState(false);
    const [editUserTG, setEditUserTG] = useState<any | null>(null);

    const openEditUser = (u: any, tg?: any) => {
        setEditUserTarget(u);
        setEditUserTG(tg ?? null);
        setEditUserModal(true);
    };

    const handleGuardarGlobal = async (id: string, body: Record<string, string>) => {
        setEditUserSaving(true);
        try {
            await apiFetch(`/api/seguridad/pruebas/actualizar/registro/${id}`, { method: 'PUT', body });
            toast.success('Guardado correctamente');
            setEditUserModal(false);
            refetch();
        } catch (err: any) {
            toast.error(String(err?.message || 'Error al guardar'));
            throw new Error(String(err?.message || 'Error al guardar'));
        } finally {
            setEditUserSaving(false);
        }
    };

    // ─── Editar Usuario Corporativo ───────────────────────────────────────────
    const [editCorpModal, setEditCorpModal] = useState(false);
    const [editCorpTarget, setEditCorpTarget] = useState<any | null>(null);
    const [editCorpNodo, setEditCorpNodo] = useState<CorpNode | null>(null);
    const [editCorpSaving, setEditCorpSaving] = useState(false);
    const [editCorpError, setEditCorpError] = useState<Error | null>(null);

    const openEditCorp = (u: any, corp: CorpNode) => {
        setEditCorpTarget(u);
        setEditCorpNodo(corp);
        setEditCorpError(null);
        setEditCorpModal(true);
    };

    const handleGuardarCorp = async (id: string, body: Record<string, string>) => {
        setEditCorpSaving(true);
        setEditCorpError(null);
        try {
            await apiFetch(`/api/seguridad/pruebas/actualizar/registro/${id}`, { method: 'PUT', body });
            toast.success('Guardado correctamente');
            setEditCorpModal(false);
            refetch();
        } catch (err: any) {
            const e = new Error(String(err?.message || 'Error al guardar'));
            setEditCorpError(e);
            throw e;
        } finally {
            setEditCorpSaving(false);
        }
    };

    // ─── Editar TenantGlobal (registro) ──────────────────────────────────────
    const [editTGModal, setEditTGModal] = useState(false);
    const [editTGTarget, setEditTGTarget] = useState<any | null>(null);
    const [editTGForm, setEditTGForm] = useState({ tipo_tenant: '', ownerType: '', rolesMabs: '', nvlGeneracionTenant: '', apisDominios: '' });
    const [editTGSaving, setEditTGSaving] = useState(false);
    const [tgSelects, setTgSelects] = useState<{ rolesMabs: any[]; tiposTenant: any[]; nivelesGlobales: any[]; dominios: any[] }>({ rolesMabs: [], tiposTenant: [], nivelesGlobales: [], dominios: [] });
    const [tgSelectsLoading, setTgSelectsLoading] = useState(false);

    const openEditTG = async (tg: any) => {
        setEditTGTarget(tg);
        setEditTGForm({
            tipo_tenant: String(tg?.tipo_tenant?.iud || tg?.tipo_tenant?._id || tg?.tipo_tenant || ''),
            ownerType: String(tg?.ownerType?.iud || tg?.ownerType?._id || tg?.ownerType || ''),
            rolesMabs: String(tg?.rolesMabs?.iud || tg?.rolesMabs?._id || tg?.rolesMabs || ''),
            nvlGeneracionTenant: String(tg?.nvlGeneracionTenant?.iud || tg?.nvlGeneracionTenant?._id || tg?.nvlGeneracionTenant || ''),
            apisDominios: String(tg?.apisDominios?.iud || tg?.apisDominios?._id || tg?.apisDominios || ''),
        });
        setEditTGModal(true);
        setTgSelectsLoading(true);
        try {
            const res: any = await apiFetch('/api/config/global/creacion/usu/tenant/global/selects', { method: 'GET' });
            const data = res?.data ?? res ?? {};
            setTgSelects({
                rolesMabs: Array.isArray(data.rolesMabs) ? data.rolesMabs : [],
                tiposTenant: Array.isArray(data.tiposTenant) ? data.tiposTenant : [],
                nivelesGlobales: Array.isArray(data.nivelesGlobales) ? data.nivelesGlobales : [],
                dominios: Array.isArray(data.dominios) ? data.dominios : [],
            });
        } catch {
            toast.error('Error cargando opciones');
        } finally {
            setTgSelectsLoading(false);
        }
    };

    const handleGuardarTG = async () => {
        const id = String(editTGTarget?.iud || editTGTarget?._id || '');
        if (!id) { toast.error('Sin ID de tenant global'); return; }
        if (!editTGForm.tipo_tenant.trim()) { toast.error('Tipo Tenant es obligatorio'); return; }

        if (!editTGForm.rolesMabs.trim()) { toast.error('Rol Mabs es obligatorio'); return; }
        if (!editTGForm.nvlGeneracionTenant.trim()) { toast.error('Nivel Generación Tenant es obligatorio'); return; }
        if (!editTGForm.apisDominios.trim()) { toast.error('APIs Dominios es obligatorio'); return; }
        const body: Record<string, string> = {
            tipo_tenant: editTGForm.tipo_tenant.trim(),
            ...(editTGForm.ownerType.trim() && { ownerType: editTGForm.ownerType.trim() }),
            rolesMabs: editTGForm.rolesMabs.trim(),
            nvlGeneracionTenant: editTGForm.nvlGeneracionTenant.trim(),
            apisDominios: editTGForm.apisDominios.trim(),
        };
        setEditTGSaving(true);
        try {
            await apiFetch(`/api/config/global/actualizar/tenant/global/${id}`, { method: 'PUT', body });
            toast.success('Tenant global actualizado');
            setEditTGModal(false);
            refetch();
        } catch (err: any) {
            toast.error(String(err?.message || 'Error al actualizar tenant global'));
        } finally {
            setEditTGSaving(false);
        }
    };

    // ─── Dominios ─────────────────────────────────────────────────────────────
    const [modalDominios, setModalDominios] = useState(false);
    const [dominioForm, setDominioForm] = useState({ etiquetas: '', proovedor: '', dominio: '' });
    const [creandoDominio, setCreandoDominio] = useState(false);
    const [dominiosList, setDominiosList] = useState<any[]>([]);
    const [cargandoDominios, setCargandoDominios] = useState(false);
    const [mostrarDesactivados, setMostrarDesactivados] = useState(false);

    const listarDominios = async (incluirDesactivados = false) => {
        setCargandoDominios(true);
        try {
            const query = incluirDesactivados ? '' : '?estadoDominio=true';
            const res: any = await apiFetch(`/api/seguridad/listar/dominios${query}`, { method: 'GET' });
            setDominiosList(Array.isArray(res?.data) ? res.data : []);
        } catch (err: any) {
            if (err?.status === 404 || String(err?.message || '').includes('No se encontraron')) {
                setDominiosList([]);
            } else {
                toast.error(String(err?.message || 'Error al listar dominios'));
            }
        } finally {
            setCargandoDominios(false);
        }
    };

    const [sincronizandoId, setSincronizandoId] = useState<string | null>(null);
    const [eliminandoId, setEliminandoId] = useState<string | null>(null);

    const handleEliminarDominio = async (d: any) => {
        const id = String(d?.iud || d?._id || '');
        const esSA = scope === 'SUPER_ADMIN';
        const accion = esSA ? 'eliminar' : 'desactivar';
        if (!window.confirm(`¿${esSA ? 'Eliminar' : 'Desactivar'} dominio "${d?.etiquetas}"?`)) return;
        setEliminandoId(id);
        try {
            await apiFetch(`/api/seguridad/dominio/${id}`, { method: 'DELETE' });
            toast.success(`Dominio ${accion === 'eliminar' ? 'eliminado' : 'desactivado'} correctamente`);
            await listarDominios(mostrarDesactivados);
        } catch (err: any) {
            toast.error(String(err?.message || err?.msg || `Error al ${accion} dominio`));
        } finally {
            setEliminandoId(null);
        }
    };

    const handleSincronizarDominio = async (id: string) => {
        setSincronizandoId(id);
        try {
            await apiFetch(`/api/seguridad/dominio/${id}`, { method: 'PUT' });
            toast.success('Dominio sincronizado con la URL de producción');
            await listarDominios();
        } catch (err: any) {
            toast.error(String(err?.message || err?.msg || 'Error al sincronizar dominio'));
        } finally {
            setSincronizandoId(null);
        }
    };

    const handleCrearDominio = async () => {
        const etiquetas = dominioForm.etiquetas.trim();
        const proovedor = dominioForm.proovedor.trim();
        const dominio = dominioForm.dominio.trim();
        if (!etiquetas) { toast.error('La etiqueta es obligatoria'); return; }
        if (!proovedor) { toast.error('El proveedor es obligatorio'); return; }
        if (!dominio) { toast.error('El dominio es obligatorio'); return; }
        setCreandoDominio(true);
        try {
            await apiFetch('/api/seguridad/dominio', { method: 'POST', body: { etiquetas, proovedor, dominio } });
            toast.success('Dominio creado correctamente');
            setDominioForm({ etiquetas: '', proovedor: '', dominio: '' });
            await listarDominios();
        } catch (err: any) {
            toast.error(String(err?.message || err?.msg || 'Error al crear dominio'));
        } finally {
            setCreandoDominio(false);
        }
    };

    // ─── Loading ──────────────────────────────────────────────────────────────
    if (loadingJerarquia) {
        return (
            <div className="flex items-center justify-center h-64 rounded-lg border border-border bg-card text-muted-foreground text-sm shadow-sm">
                Cargando jerarquía de usuarios...
            </div>
        );
    }

    if (errorJerarquia) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3 rounded-lg border border-border bg-card shadow-sm">
                <p className="text-destructive text-sm">{errorJerarquia.message}</p>
                <Button variant="outline" size="sm" onClick={refetch}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reintentar
                </Button>
            </div>
        );
    }

    if (!scope) {
        const publicChecks = jerarquia?.publicChecks;
        const todosConfigurados = publicChecks?.diosRolExists && publicChecks?.diosUserExists;

        return (
            <div className="min-h-full p-4 md:p-6 lg:p-8 bg-background text-foreground">
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-bold">Configuración inicial</h1>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            {todosConfigurados
                                ? 'El sistema ya tiene un administrador configurado. Inicia sesión para continuar.'
                                : 'Para comenzar, crea el rol DIOS y luego el primer administrador del sistema.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4 justify-center">
                        {/* Rol Global */}
                        <div className="flex flex-col items-center gap-1.5">
                            {publicChecks?.diosRolExists ? (
                                <Button size="sm" variant="outline" disabled className="opacity-60">
                                    <Globe className="h-4 w-4 mr-2" />
                                    Rol Global
                                </Button>
                            ) : (
                                <Button size="sm" variant="outline" onClick={() => setModalRolesGlobales(true)}>
                                    <Globe className="h-4 w-4 mr-2" />
                                    Rol Global
                                </Button>
                            )}
                            {publicChecks?.diosRolExists && (
                                <span className="text-xs text-muted-foreground">Rol DIOS ya existe</span>
                            )}
                        </div>

                        {/* Usuario SuperAdmin */}
                        <div className="flex flex-col items-center gap-1.5">
                            <Button
                                size="sm"
                                onClick={() => setModalSuperAdmin(true)}
                                disabled={!publicChecks?.diosRolExists}
                            >
                                <Shield className="h-4 w-4 mr-2" />
                                Usuario SuperAdmin
                            </Button>
                            {publicChecks?.diosUserExists && (
                                <span className="text-xs text-muted-foreground">Registro público por tenant activo</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modales bootstrap */}
                <RolesGlobalesModal
                    open={modalRolesGlobales}
                    onClose={() => { setModalRolesGlobales(false); refetch(); }}
                    scope="SUPER_ADMIN"
                />
                <UsuarioSuperAdminModal
                    open={modalSuperAdmin}
                    onClose={() => setModalSuperAdmin(false)}
                    onSubmit={crearUsuarioSuperAdmin}
                    isSubmitting={isCreatingSuperAdmin}
                    submitError={errorCrearSuperAdmin}
                    scope={'SUPER_ADMIN'}
                    onSincronizarGlobalCanReferir={token ? sincronizarGlobalCanReferirUsuarios : undefined}
                    isSincronizandoGlobal={isSincronizandoGlobalCanReferir}
                    sincronizarGlobalError={errorSincronizarGlobalCanReferir}
                />
            </div>
        );
    }

    return (
        <div className="min-h-full p-4 md:p-6 lg:p-8 space-y-6 bg-background text-foreground">
            {/* Encabezado */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Usuarios Tenant</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Jerarquía de usuarios por tenant
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {scope && (
                        <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/5 text-primary">
                            <Shield className="h-3.5 w-3.5" />
                            {scope}
                        </Badge>
                    )}
                    {scope && (
                        <Button variant="outline" size="sm" onClick={refetch}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Actualizar
                        </Button>
                    )}
                    <TenantUserActionButtons
                        scope={scope}
                        onCreateSuperAdmin={() => setModalSuperAdmin(true)}
                        onCreateGlobal={() => setModalGlobal(true)}
                    />
                    {scope === 'SUPER_ADMIN' && (
                        <Button size="sm" variant="outline" onClick={() => { setModalDominios(true); setMostrarDesactivados(false); listarDominios(false); }}>
                            <Globe className="h-4 w-4 mr-2" />
                            Dominios
                        </Button>
                    )}
                    {scope && (
                        <Button size="sm" variant="outline" onClick={() => setModalRolesGlobales(true)}>
                            <Globe className="h-4 w-4 mr-2" />
                            Rol Global
                        </Button>
                    )}
                    {scope && (
                        <Button size="sm" variant="outline" onClick={() => setModalRolesCorporativos(true)}>
                            <Building2 className="h-4 w-4 mr-2" />
                            Rol Corporativo
                        </Button>
                    )}
                </div>
            </div>

            {/* SuperAdmins — solo visible para SUPER_ADMIN */}
            {scope === 'SUPER_ADMIN' && (jerarquia?.superAdmins.length ?? 0) > 0 && (
                <section className="space-y-2">
                    <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <Shield className="h-4 w-4 text-primary" />
                        Super Administradores
                        <Badge variant="outline">{jerarquia!.superAdmins.length}</Badge>
                    </h2>
                    <div className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm divide-y divide-border">
                        {jerarquia!.superAdmins.map(sa => (
                            <div key={sa.iud} className="flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-muted/40">
                                <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${
                                        sa.estado === true || sa.estado === 'activo' ? 'bg-green-500' : 'bg-gray-400'
                                    }`} />
                                    <span className="text-muted-foreground">{sa.correo}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="default" className="text-xs">{sa.rol ?? 'SUPER_ADMIN'}</Badge>
                                    {scope === 'SUPER_ADMIN' && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/70 hover:bg-primary/10 hover:text-primary" onClick={() => void openEditUser(sa)}>
                                            <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Árbol de Tenant Globales — renderizado recursivo */}
            {(jerarquia?.tenantsGlobales ?? []).map((tgNode, idx) => (
                <NodoTenantGlobalCard
                    key={tgNode.tenantGlobal?.iud ?? idx}
                    nodo={tgNode}
                    nivel={0}
                    scope={scope as 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO'}
                    onAddUsuario={nodo => setNodoCorp(nodo)}
                    onEditUsuario={(u: TenantUsuario, tg: any) => void openEditUser(u, tg)}
                    onEditUsuarioCorp={(u: TenantUsuario, corp: CorpNode) => void openEditCorp(u, corp)}
                    onEditTG={(tg: any) => void openEditTG(tg)}
                />
            ))}

            {/* Modales */}
            <UsuarioSuperAdminModal
                open={modalSuperAdmin}
                onClose={() => setModalSuperAdmin(false)}
                onSubmit={crearUsuarioSuperAdmin}
                isSubmitting={isCreatingSuperAdmin}
                submitError={errorCrearSuperAdmin}
                scope={scope as 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO'}
                onSincronizarGlobalCanReferir={token ? sincronizarGlobalCanReferirUsuarios : undefined}
                isSincronizandoGlobal={isSincronizandoGlobalCanReferir}
                sincronizarGlobalError={errorSincronizarGlobalCanReferir}
            />

            <UsuarioGlobalModal
                open={modalGlobal}
                onClose={() => setModalGlobal(false)}
                onSubmit={crearUsuarioGlobal}
                isSubmitting={isCreatingGlobal}
                submitError={errorCrearGlobal}
                tenantsGlobales={tenantsGlobalesInfo}
                scope={scope as 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO'}
                onSincronizarCanReferir={scope === 'TENANT_GLOBAL' ? sincronizarGlobal : undefined}
                isSincronizando={isSincronizandoCanReferir}
                sincronizarError={errorSincronizarCanReferir}
            />

            {/* Modal Dominios */}
            <Dialog open={modalDominios} onOpenChange={setModalDominios}>
                <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-lg bg-card text-card-foreground">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-primary" /> Dominios registrados
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5">
                        {/* Formulario */}
                        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                            <p className="text-sm font-semibold">Registrar nuevo dominio</p>
                            <div className="space-y-1">
                                <Label htmlFor="dom-etiquetas">Etiqueta</Label>
                                <Input
                                    id="dom-etiquetas"
                                    placeholder="Ej: Producción principal"
                                    value={dominioForm.etiquetas}
                                    onChange={(e) => setDominioForm((f) => ({ ...f, etiquetas: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="dom-proovedor">Proveedor</Label>
                                <Input
                                    id="dom-proovedor"
                                    placeholder="Ej: Vercel, AWS, DigitalOcean"
                                    value={dominioForm.proovedor}
                                    onChange={(e) => setDominioForm((f) => ({ ...f, proovedor: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="dom-url">URL del dominio</Label>
                                <Input
                                    id="dom-url"
                                    placeholder="Ej: https://midominio.com"
                                    value={dominioForm.dominio}
                                    onChange={(e) => setDominioForm((f) => ({ ...f, dominio: e.target.value }))}
                                />
                            </div>
                            <Button onClick={handleCrearDominio} disabled={creandoDominio} className="w-full">
                                {creandoDominio
                                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...</>
                                    : <><Plus className="mr-2 h-4 w-4" /> Crear dominio</>}
                            </Button>
                        </div>
                        {/* Lista */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold">Dominios existentes</p>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant={mostrarDesactivados ? 'secondary' : 'ghost'}
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => {
                                            const next = !mostrarDesactivados;
                                            setMostrarDesactivados(next);
                                            listarDominios(next);
                                        }}
                                    >
                                        {mostrarDesactivados ? 'Ver activos' : 'Ver inactivos'}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => listarDominios(mostrarDesactivados)} disabled={cargandoDominios}>
                                        {cargandoDominios ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                    </Button>
                                </div>
                            </div>
                            {cargandoDominios ? (
                                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                            ) : dominiosList.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-3 text-center">
                                    {mostrarDesactivados ? 'Sin dominios inactivos.' : 'Sin dominios activos.'}
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-60 overflow-auto pr-1">
                                    {dominiosList.map((d: any, i: number) => {
                                        const id = String(d?.iud || d?._id || i);
                                        const activo = d?.estadoDominio !== false;
                                        return (
                                            <div key={id} className="rounded-lg border border-border bg-background/70 p-3 space-y-1 shadow-sm">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-medium">{String(d?.etiquetas || '-')}</p>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <Badge variant={activo ? 'outline' : 'destructive'} className="text-xs">
                                                            {activo ? 'Activo' : 'Inactivo'}
                                                        </Badge>
                                                        {activo && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 px-2 text-xs"
                                                            disabled={sincronizandoId === id}
                                                            onClick={() => handleSincronizarDominio(id)}
                                                        >
                                                            {sincronizandoId === id
                                                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                                                : <RefreshCw className="h-3 w-3" />}
                                                        </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                                                            disabled={eliminandoId === id || !activo}
                                                            onClick={() => handleEliminarDominio(d)}
                                                        >
                                                            {eliminandoId === id
                                                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                                                : <Trash2 className="h-3 w-3" />}
                                                        </Button>
                                                    </div>
                                                </div>
                                                <p className="text-xs font-mono text-muted-foreground break-all">{String(d?.dominio || '-')}</p>
                                                <p className="text-xs text-muted-foreground">Proveedor: {String(d?.proovedor || '-')}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <UsuarioCorporativoModal
                open={nodoCorp !== null}
                onClose={() => setNodoCorp(null)}
                onSubmit={crearUsuarioCorporativo}
                isSubmitting={isCreatingCorp}
                submitError={errorCrearCorp}
                tenantCorporativo={nodoCorp?.tenantCorporativo ?? null}
                scope={scope as 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO'}
                onSincronizarCanReferir={nodoCorp ? sincronizarCorporativo : undefined}
                isSincronizando={isSincronizandoCanReferir}
                sincronizarError={errorSincronizarCanReferir}
            />

            {/* ── Modales de gestión de catálogo de roles ──────────────────── */}
            <RolesGlobalesModal
                open={modalRolesGlobales}
                onClose={() => setModalRolesGlobales(false)}
                scope={scope as 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO'}
            />
            <RolesCorporativosModal
                open={modalRolesCorporativos}
                onClose={() => setModalRolesCorporativos(false)}
            />

            {/* ── Modal Editar Rol Global ───────────────────────────────────── */}
            <RolGlobalEditModal
                open={editUserModal}
                onClose={() => setEditUserModal(false)}
                usuario={editUserTarget}
                tenantGlobalActual={editUserTG}
                tenantsGlobales={scope === 'SUPER_ADMIN' ? tenantsGlobalesInfo : []}
                scope={scope as 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO'}
                onSave={handleGuardarGlobal}
                isUpdating={editUserSaving}
            />

            {/* ── Modal Editar Rol Corporativo ──────────────────────────────── */}
            <RolCorporativoEditModal
                open={editCorpModal}
                onClose={() => setEditCorpModal(false)}
                usuario={editCorpTarget}
                tenantCorporativo={editCorpNodo?.tenantCorporativo ?? null}
                onSave={handleGuardarCorp}
                isUpdating={editCorpSaving}
                updateError={editCorpError}
            />

            {/* ── Modal Editar TenantGlobal ────────────────────────────────── */}
            <Dialog open={editTGModal} onOpenChange={(v) => { if (!v) setEditTGModal(false); }}>
                <DialogContent className="sm:max-w-md bg-card text-card-foreground">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            Editar Tenant Global
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-xs text-muted-foreground">
                            Tenant: <span className="font-medium text-foreground">{String(editTGTarget?.razon_social ?? editTGTarget?.titulo ?? editTGTarget?.iud ?? '')}</span>
                        </p>
                        {tgSelectsLoading ? (
                            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                        ) : (
                            <>
                                {/* Tipo Tenant */}
                                <div className="space-y-1">
                                    <Label>Tipo Tenant *</Label>
                                    <Select value={editTGForm.tipo_tenant} onValueChange={(v) => setEditTGForm(p => ({ ...p, tipo_tenant: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar tipo tenant" /></SelectTrigger>
                                        <SelectContent>
                                            {tgSelects.tiposTenant.map((t: any) => {
                                                const id = String(t?.iud || t?.id || t?._id || '');
                                                return <SelectItem key={id} value={id}>{String(t?.label || t?.tipo_acceso_apis || t?.sigla || id)}</SelectItem>;
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {/* Rol Mabs */}
                                <div className="space-y-1">
                                    <Label>Rol Mabs *</Label>
                                    <Select value={editTGForm.rolesMabs} onValueChange={(v) => setEditTGForm(p => ({ ...p, rolesMabs: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                                        <SelectContent>
                                            {tgSelects.rolesMabs.map((r: any) => {
                                                const id = String(r?.iud || r?.id || r?._id || '');
                                                return <SelectItem key={id} value={id}>{String(r?.label || r?.rol || id)}</SelectItem>;
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {/* Nivel Generación Tenant */}
                                <div className="space-y-1">
                                    <Label>Nivel Generación Tenant *</Label>
                                    <Select value={editTGForm.nvlGeneracionTenant} onValueChange={(v) => setEditTGForm(p => ({ ...p, nvlGeneracionTenant: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar nivel" /></SelectTrigger>
                                        <SelectContent>
                                            {tgSelects.nivelesGlobales.map((n: any) => {
                                                const id = String(n?.iud || n?.id || n?._id || '');
                                                return <SelectItem key={id} value={id}>{String(n?.label || n?.generation_tenant || id)}</SelectItem>;
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {/* APIs Dominios */}
                                <div className="space-y-1">
                                    <Label>APIs Dominios *</Label>
                                    <Select value={editTGForm.apisDominios} onValueChange={(v) => setEditTGForm(p => ({ ...p, apisDominios: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar dominio" /></SelectTrigger>
                                        <SelectContent>
                                            {tgSelects.dominios.map((d: any) => {
                                                const id = String(d?.iud || d?.id || d?._id || '');
                                                return <SelectItem key={id} value={id}>{String(d?.label || d?.dominio || id)}</SelectItem>;
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {/* Owner Type — texto libre (no tiene catálogo conocido) */}
                                <div className="space-y-1">
                                    <Label>Owner Type</Label>
                                    <Input
                                        value={editTGForm.ownerType}
                                        onChange={(e) => setEditTGForm(p => ({ ...p, ownerType: e.target.value }))}
                                        placeholder="ObjectId del owner type"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setEditTGModal(false)} disabled={editTGSaving}>Cancelar</Button>
                        <Button onClick={handleGuardarTG} disabled={editTGSaving}>
                            {editTGSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : 'Guardar'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
