import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/app/services/api';
import { useAuth } from '@/app/providers/AuthProvider';
import { getJerarquiaUsuarios, TenantGlobalInfo, TenantGlobalNode } from '@/app/services/tenantUsuariosService';
import ParametrizacionGenyProcent from './ParametrizacionGenyProcent/ParametrizacionGenyProcent';
import ParametrizacionRedirects from './ParametrizacionRedirects';
import { Edit, Loader2, Network, RefreshCw, Route, Users } from 'lucide-react';

type DashboardUser = {
    _id?: string;
    iud?: string;
    id?: string;
    nombre?: string;
    name?: string;
    correo?: string;
    email?: string;
    rol?: string;
    estado?: boolean;
};

export default function Dashboard(): React.ReactElement {
    const { user } = useAuth();
    const [usuarios, setUsuarios] = useState<DashboardUser[]>([]);
    const [usuariosLoading, setUsuariosLoading] = useState(false);
    const [usuarioSearch, setUsuarioSearch] = useState('');
    const [editingUser, setEditingUser] = useState<DashboardUser | null>(null);
    const [userEditSaving, setUserEditSaving] = useState(false);
    const [userEditForm, setUserEditForm] = useState({ correo: '', password: '', rol: '' });

    const [tenantsGlobales, setTenantsGlobales] = useState<TenantGlobalInfo[]>([]);
    const [loadingTenants, setLoadingTenants] = useState(false);
    const [selectedTenantGlobalId, setSelectedTenantGlobalId] = useState<string | null>(null);
    const [modoReferir, setModoReferir] = useState<'TODOS' | 'SELECCION' | 'INHABILITADO'>('TODOS');
    const [loadingParametrizacion, setLoadingParametrizacion] = useState(false);
    const [savingModoReferir, setSavingModoReferir] = useState(false);

    const tenantScope = user?.auth?.tenantScope || {};
    const actorScope = {
        tenantSuperAdminId: String(user?.tenantSuperAdminId || tenantScope?.tenantSuperAdminId || '').trim() || null,
        tenantGlobalId: String(user?.tenantGlobalId || tenantScope?.tenantGlobalId || '').trim() || null,
    };
    const userRol = String(user?.rol || '').toUpperCase();
    const esRolGlobal = ['DIOS', 'DESAROLLADOR'].includes(userRol);
    const esSuperAdmin = (!!(actorScope.tenantSuperAdminId && !actorScope.tenantGlobalId)) || esRolGlobal;
    const mostrarSeccionMultinivel = !!(actorScope.tenantSuperAdminId || actorScope.tenantGlobalId) || esRolGlobal;
    const activeTenantGlobalId = actorScope.tenantGlobalId ?? selectedTenantGlobalId;
    const activeTenantLabel = actorScope.tenantGlobalId
        ? (tenantsGlobales.find((t) => t.iud === actorScope.tenantGlobalId)?.razon_social
            ?? tenantsGlobales.find((t) => t.iud === actorScope.tenantGlobalId)?.titulo
            ?? 'Mi TenantGlobal')
        : (tenantsGlobales.find((t) => t.iud === selectedTenantGlobalId)?.razon_social
            ?? tenantsGlobales.find((t) => t.iud === selectedTenantGlobalId)?.titulo
            ?? null);

    const loadUsuarios = async (): Promise<void> => {
        setUsuariosLoading(true);
        try {
            const res = await apiFetch('/api/registro/listarRegistro', { method: 'GET' });
            const list = (res as any)?.data ?? (res as any)?.usuarios ?? (Array.isArray(res) ? res : []);
            setUsuarios(Array.isArray(list) ? list : []);
        } catch {
            toast.error('Error cargando usuarios');
        } finally {
            setUsuariosLoading(false);
        }
    };

    useEffect(() => {
        void loadUsuarios();
    }, []);

    useEffect(() => {
        if (!mostrarSeccionMultinivel) return;
        setLoadingTenants(true);
        getJerarquiaUsuarios()
            .then((res) => {
                const nodos: TenantGlobalNode[] = res?.tenantsGlobales ?? [];
                const lista: TenantGlobalInfo[] = nodos
                    .map((tg) => tg.tenantGlobal)
                    .filter((tg): tg is TenantGlobalInfo => tg !== null);
                setTenantsGlobales(lista);
            })
            .catch(() => undefined)
            .finally(() => setLoadingTenants(false));
    }, [mostrarSeccionMultinivel]);

    useEffect(() => {
        if (!activeTenantGlobalId) {
            setModoReferir('TODOS');
            return;
        }
        setLoadingParametrizacion(true);
        apiFetch(`/api/governance/parametrizacion/global/${activeTenantGlobalId}`, { method: 'GET' })
            .then((res) => setModoReferir(res?.parametrizacion?.modoReferir ?? 'TODOS'))
            .catch(() => setModoReferir('TODOS'))
            .finally(() => setLoadingParametrizacion(false));
    }, [activeTenantGlobalId]);

    const filteredUsuarios = useMemo(() => {
        const q = usuarioSearch.trim().toLowerCase();
        if (!q) return usuarios;
        return usuarios.filter((u) => (
            String(u?.nombre || u?.name || '').toLowerCase().includes(q)
            || String(u?.correo || u?.email || '').toLowerCase().includes(q)
            || String(u?.rol || '').toLowerCase().includes(q)
        ));
    }, [usuarioSearch, usuarios]);

    const openEditUser = (u: DashboardUser): void => {
        setEditingUser(u);
        setUserEditForm({
            correo: String(u?.correo || u?.email || ''),
            password: '',
            rol: String(u?.rol || ''),
        });
    };

    const closeEditUser = (): void => {
        setEditingUser(null);
        setUserEditForm({ correo: '', password: '', rol: '' });
    };

    const handleSaveUser = async (): Promise<void> => {
        if (!editingUser) return;
        const id = String(editingUser?._id || editingUser?.iud || editingUser?.id || '');
        if (!id) {
            toast.error('Sin ID de usuario');
            return;
        }

        const body: Record<string, string> = {};
        if (userEditForm.correo) body.correo = userEditForm.correo;
        if (userEditForm.password) body.password = userEditForm.password;
        if (userEditForm.rol) body.rol = userEditForm.rol;

        setUserEditSaving(true);
        try {
            await apiFetch(`/api/seguridad/pruebas/actualizar/registro/${id}`, {
                method: 'PUT',
                body: JSON.stringify(body),
            });
            setUsuarios((prev) => prev.map((u) => {
                const uid = String(u?._id || u?.iud || u?.id || '');
                return uid === id ? { ...u, ...body } : u;
            }));
            toast.success('Usuario actualizado');
            closeEditUser();
        } catch (error: any) {
            toast.error(String(error?.message || 'Error al actualizar'));
        } finally {
            setUserEditSaving(false);
        }
    };

    const saveModoReferir = async (modo: 'TODOS' | 'SELECCION' | 'INHABILITADO'): Promise<void> => {
        if (!activeTenantGlobalId) return;
        setSavingModoReferir(true);
        try {
            const res = await apiFetch(`/api/governance/parametrizacion/global/${activeTenantGlobalId}`, {
                method: 'PUT',
                body: { canCreateCorporativos: true, modoReferir: modo },
            });
            setModoReferir(res?.parametrizacion?.modoReferir ?? modo);
            toast.success('Configuracion de referidos actualizada.');
        } catch (error: any) {
            toast.error(error?.message || 'No se pudo guardar el modo de referidos.');
        } finally {
            setSavingModoReferir(false);
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 flex-1 space-y-8">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard Admin</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Centraliza la gestion de usuarios y la parametrizacion multinivel del tenant activo.
                </p>
            </div>

            <Card className="shadow-lg border-border">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        <CardTitle>Gestion de Usuarios</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">Busca y edita cualquier usuario del sistema.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Buscar por nombre, correo o rol..."
                            value={usuarioSearch}
                            onChange={(e) => setUsuarioSearch(e.target.value)}
                            className="flex-1"
                        />
                        <Button variant="outline" size="icon" onClick={() => void loadUsuarios()} disabled={usuariosLoading}>
                            {usuariosLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        </Button>
                    </div>

                    <div className="overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Correo</TableHead>
                                    <TableHead>Rol</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Editar</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsuarios.map((u, i) => {
                                    const uid = String(u?._id || u?.iud || u?.id || i);
                                    return (
                                        <TableRow key={uid}>
                                            <TableCell className="font-medium">{String(u?.nombre || u?.name || '-')}</TableCell>
                                            <TableCell className="text-xs text-slate-500">{String(u?.correo || u?.email || '-')}</TableCell>
                                            <TableCell><Badge variant="outline">{String(u?.rol || '-')}</Badge></TableCell>
                                            <TableCell>
                                                <Badge variant={u?.estado !== false ? 'outline' : 'secondary'}>
                                                    {u?.estado !== false ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => openEditUser(u)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {!usuariosLoading && filteredUsuarios.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-6 text-center text-slate-400">
                                            Sin usuarios cargados
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {mostrarSeccionMultinivel && (
                <Card className="shadow-lg border-border">
                    <CardHeader className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Network className="h-5 w-5 text-primary" />
                            <CardTitle>Parametrizacion multinivel</CardTitle>
                            {activeTenantLabel ? (
                                <Badge variant="secondary">{activeTenantLabel}</Badge>
                            ) : (
                                <Badge variant="outline">Sin tenant seleccionado</Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Configura las generaciones y porcentajes de comision del sistema de referidos multinivel para el TenantGlobal activo.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {esSuperAdmin && (
                            <div className="flex items-center gap-3">
                                <div className="w-full max-w-sm">
                                    <Select
                                        value={selectedTenantGlobalId ?? ''}
                                        onValueChange={setSelectedTenantGlobalId}
                                        disabled={loadingTenants}
                                    >
                                        <SelectTrigger>
                                            {loadingTenants ? (
                                                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Loader2 className="h-3 w-3 animate-spin" /> Cargando tenants...
                                                </span>
                                            ) : (
                                                <SelectValue placeholder="Selecciona un TenantGlobal" />
                                            )}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tenantsGlobales.map((tg) => (
                                                <SelectItem key={tg.iud} value={tg.iud}>
                                                    {tg.razon_social ?? tg.titulo ?? tg.iud}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {selectedTenantGlobalId && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-muted-foreground"
                                        onClick={() => setSelectedTenantGlobalId(null)}
                                    >
                                        Limpiar
                                    </Button>
                                )}
                            </div>
                        )}

                        {activeTenantGlobalId ? (
                            <div className="space-y-4">
                                <Card>
                                    <CardContent className="pt-5 pb-4 space-y-3">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-medium">Modo de referidos</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Define quien puede generar enlaces de referido en este TenantGlobal.
                                                </p>
                                            </div>
                                            {(loadingParametrizacion || savingModoReferir) && (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {(['TODOS', 'SELECCION', 'INHABILITADO'] as const).map((modo) => (
                                                <Button
                                                    key={modo}
                                                    size="sm"
                                                    variant={modoReferir === modo ? 'default' : 'outline'}
                                                    disabled={loadingParametrizacion || savingModoReferir}
                                                    onClick={() => void saveModoReferir(modo)}
                                                    className="flex-1 text-xs"
                                                >
                                                    {modo === 'TODOS' && 'Todos'}
                                                    {modo === 'SELECCION' && 'Seleccion'}
                                                    {modo === 'INHABILITADO' && 'Inhabilitado'}
                                                </Button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {modoReferir === 'TODOS' && 'Todos los usuarios del tenant pueden generar referidos.'}
                                            {modoReferir === 'SELECCION' && 'Solo los usuarios con permiso individual pueden referir.'}
                                            {modoReferir === 'INHABILITADO' && 'Ningun usuario puede generar referidos en este tenant.'}
                                        </p>
                                    </CardContent>
                                </Card>

                                <ParametrizacionGenyProcent scope={esSuperAdmin ? 'SUPER_ADMIN' : 'TENANT_GLOBAL'} />
                            </div>
                        ) : esSuperAdmin && (
                            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground text-center">
                                Selecciona un TenantGlobal para gestionar sus niveles de generacion y porcentajes.
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {esSuperAdmin && (
                <Card className="shadow-lg border-border">
                    <CardContent className="pt-4">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="redirects-dashboard-admin" className="border-0">
                                <AccordionTrigger className="rounded-lg px-1 py-2 text-left hover:no-underline">
                                    <div className="flex items-center gap-2">
                                        <Route className="h-5 w-5 text-primary" />
                                        <div>
                                            <p className="text-sm font-semibold">Redirects del modulo</p>
                                            <p className="text-xs text-muted-foreground">
                                                Permanece cerrado por defecto y solo se despliega al abrirlo manualmente.
                                            </p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-4">
                                    <ParametrizacionRedirects compact />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>
            )}

            <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) closeEditUser(); }}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Gestion de Usuarios</DialogTitle>
                        <DialogDescription>
                            Editando: <span className="font-semibold text-slate-800">{String(editingUser?.nombre || editingUser?.correo || editingUser?.email || '')}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                            <Label>Correo</Label>
                            <Input
                                value={userEditForm.correo}
                                onChange={(e) => setUserEditForm((p) => ({ ...p, correo: e.target.value }))}
                                placeholder="nuevo@correo.com"
                            />
                        </div>
                        <div>
                            <Label>Rol</Label>
                            <Input
                                value={userEditForm.rol}
                                onChange={(e) => setUserEditForm((p) => ({ ...p, rol: e.target.value }))}
                                placeholder="ADMIN_ROLE / USER_ROLE..."
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Label>Nueva contraseña</Label>
                            <Input
                                type="password"
                                value={userEditForm.password}
                                onChange={(e) => setUserEditForm((p) => ({ ...p, password: e.target.value }))}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2 pt-2">
                        <Button variant="outline" onClick={closeEditUser}>Cancelar</Button>
                        <Button onClick={() => void handleSaveUser()} disabled={userEditSaving}>
                            {userEditSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Guardar cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
