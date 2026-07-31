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
import { Edit, HelpCircle, Loader2, Network, Palette, RefreshCw, Route, Users } from 'lucide-react';
import { socketListeners, socketCleanup } from '@/app/socket/socketEvents';
import { aplicarPaletaEnApp } from '@/app/utils/ColorUtils';
import type { ColoresPaleta } from '@/app/utils/ColorUtils';
import {
    obtenerColoresPublico,
    guardarColoresApp,
    fusionarColoresApp,
} from '@/app/services/coloresAppService';
import type { ColoresApp } from '@/app/services/coloresAppService';
import { adminEntityId, adminEntityIdForPath, matchesAdminEntityRef, sameAdminEntityId } from '@/app/utils/adminEntityId';

type PaletaColores = ColoresApp;

// ─── Descripción explícita de cada color en el frontend ─────────────────────
const COLOR_META: Array<{
    key: keyof PaletaColores;
    label: string;
    cssVar: string;
    afecta: string;
    elementos: string[];
    noAfecta: string;
}> = [
    {
        key: 'COLOR_PRIMARY',
        label: 'Color principal',
        cssVar: '--primary',
        afecta: 'Define el tono dominante de toda la marca.',
        elementos: [
            'Íconos activos del menú lateral',
            'Texto de títulos y enlaces de marca',
            'Anillo de foco al hacer clic en inputs',
            'Color de encabezado del navbar',
            'Texto sobre botones (contraste)',
        ],
        noAfecta: 'No cambia el fondo general, las tarjetas ni el color base de los botones.',
    },
    {
        key: 'COLOR_ACCENT',
        label: 'Color de acento',
        cssVar: '--accent',
        afecta: 'Complementa al principal en elementos interactivos secundarios.',
        elementos: [
            'Fondo de badges y etiquetas de estado',
            'Hover de ítems del menú lateral',
            'Fondo de chips y selects al pasar el cursor',
            'Foreground del color principal (contraste)',
        ],
        noAfecta: 'No reemplaza el texto general ni el color de los botones principales.',
    },
    {
        key: 'COLOR_LIGHT',
        label: 'Color claro (muted)',
        cssVar: '--muted',
        afecta: 'Controla todos los elementos sutiles y de soporte.',
        elementos: [
            'Bordes de tarjetas, inputs y separadores',
            'Fondo de secciones atenuadas (muted)',
            'Color de placeholders y texto secundario',
            'Fondo de filas de tabla al hacer hover',
        ],
        noAfecta: 'No cambia el fondo principal, las tarjetas ni los textos de contenido.',
    },
    {
        key: 'COLOR_BG',
        label: 'Fondo general',
        cssVar: '--background',
        afecta: 'El fondo base de TODA la aplicación, público y admin.',
        elementos: [
            'Fondo de las vistas públicas (home, productos, landing)',
            'Fondo del panel admin',
            'Fondo del layout principal que envuelve todo',
        ],
        noAfecta: 'No cambia el interior de tarjetas, modales, botones ni el color del texto.',
    },
    {
        key: 'COLOR_CHAMPAGNE',
        label: 'Color champagne (tarjetas)',
        cssVar: '--card',
        afecta: 'Superficie de todos los contenedores flotantes.',
        elementos: [
            'Fondo de las Cards y paneles',
            'Fondo de modales y Dialogs',
            'Fondo de Popovers y Dropdowns',
            'Header y footer de emails de la plataforma',
        ],
        noAfecta: 'No cambia el fondo general de la pagina ni el color de los botones.',
    },
    {
        key: 'COLOR_SUNSET',
        label: 'Color sunset (botones)',
        cssVar: '--button',
        afecta: 'Color estándar de TODOS los botones de acción de la aplicación.',
        elementos: [
            'Botones primarios ("Ingresar", "Guardar", "Configurar")',
            'Botones de formularios, modales y confirmaciones (SweetAlert)',
            'CTAs del home, footer y landing',
            'Bordes internos de bloques y separadores cálidos',
            'Fondo de badges de estado "secondary"',
        ],
        noAfecta: 'No cambia enlaces secundarios, fondos de pagina, tarjetas ni texto general.',
    },
    {
        key: 'COLOR_TEXT',
        label: 'Color de texto',
        cssVar: '--foreground',
        afecta: 'Color de todas las letras de la aplicación, público y admin.',
        elementos: [
            'Texto del body y párrafos en toda la app',
            'Texto dentro de tarjetas, modales y popovers',
            'Texto de títulos h1–h6 en vistas públicas y admin',
            'Labels de formularios e inputs',
            'Texto en componentes shadcn/ui (Dialog, Sheet, etc.)',
        ],
        noAfecta: 'No cambia fondos, bordes ni textos de botones que tengan contraste propio.',
    },
];

type DashboardUser = {
    _id?: string;
    iud?: string;
    id?: string;
    nombre?: string;
    name?: string;
    correo?: string;
    email?: string;
    rol?: string;
    role?: string;
    rolInfo?: {
        nombre?: string | null;
    } | null;
    perfil?: {
        tipo?: string | null;
        nombre?: string | null;
        apellido?: string | null;
        nombreCompleto?: string | null;
        cargo?: string | null;
        cc?: string | null;
    } | null;
    estado?: boolean;
};

type DashboardTextConfig = {
    titulo: string;
    descripcion: string;
};

const DASHBOARD_TEXT_CONFIG_KEY = 'dashboard-admin-text-config';

const DEFAULT_DASHBOARD_TEXT_CONFIG: DashboardTextConfig = {
    titulo: 'Dashboard Admin',
    descripcion: 'Centraliza la gestion de usuarios y la parametrizacion multinivel del tenant activo.',
};

const normalizeTenantGlobalInfo = (tg: TenantGlobalInfo): TenantGlobalInfo => ({
    ...tg,
    iud: adminEntityId(tg),
});

const findTenantGlobalById = (
    lista: TenantGlobalInfo[],
    id: string | null | undefined,
): TenantGlobalInfo | undefined => {
    if (!id) return undefined;
    return lista.find((tg) => matchesAdminEntityRef(tg, id));
};

const loadDashboardTextConfig = (): DashboardTextConfig => {
    if (typeof window === 'undefined') return DEFAULT_DASHBOARD_TEXT_CONFIG;
    try {
        const raw = window.localStorage.getItem(DASHBOARD_TEXT_CONFIG_KEY);
        if (!raw) return DEFAULT_DASHBOARD_TEXT_CONFIG;
        const parsed = JSON.parse(raw) as Partial<DashboardTextConfig>;
        return {
            titulo: String(parsed?.titulo || DEFAULT_DASHBOARD_TEXT_CONFIG.titulo).trim(),
            descripcion: String(parsed?.descripcion || DEFAULT_DASHBOARD_TEXT_CONFIG.descripcion).trim(),
        };
    } catch {
        return DEFAULT_DASHBOARD_TEXT_CONFIG;
    }
};

export default function Dashboard(): React.ReactElement {
    const { user } = useAuth();

    // ── Usuarios ──────────────────────────────────────────────────────────────
    const [usuarios, setUsuarios] = useState<DashboardUser[]>([]);
    const [usuariosLoading, setUsuariosLoading] = useState(false);
    const [usuarioSearch, setUsuarioSearch] = useState('');
    const [editingUser, setEditingUser] = useState<DashboardUser | null>(null);
    const [userEditSaving, setUserEditSaving] = useState(false);
    const [userEditForm, setUserEditForm] = useState({ correo: '', password: '', rol: '' });

    // ── Tenants ───────────────────────────────────────────────────────────────
    const [tenantsGlobales, setTenantsGlobales] = useState<TenantGlobalInfo[]>([]);
    const [loadingTenants, setLoadingTenants] = useState(false);
    const [selectedTenantGlobalId, setSelectedTenantGlobalId] = useState<string | null>(null);
    const [modoReferir, setModoReferir] = useState<'TODOS' | 'SELECCION' | 'INHABILITADO'>('TODOS');
    const [loadingParametrizacion, setLoadingParametrizacion] = useState(false);
    const [savingModoReferir, setSavingModoReferir] = useState(false);

    // ── Paleta de colores ─────────────────────────────────────────────────────
    const [paletaModalOpen, setPaletaModalOpen] = useState(false);
    const [ayudaPaletaOpen, setAyudaPaletaOpen] = useState(false);
    const [paletaColores, setPaletaColores] = useState<PaletaColores>(() => fusionarColoresApp());
    const [paletaLoading, setPaletaLoading] = useState(false);
    const [paletaSaving, setPaletaSaving] = useState(false);
    const [textoDashboard, setTextoDashboard] = useState<DashboardTextConfig>(() => loadDashboardTextConfig());
    const [textoDashboardDraft, setTextoDashboardDraft] = useState<DashboardTextConfig>(() => loadDashboardTextConfig());
    const [textoDashboardOpen, setTextoDashboardOpen] = useState(false);

    // ── Roles y scope ─────────────────────────────────────────────────────────
    const tenantScope = user?.auth?.tenantScope || {};
    const actorScope = {
        tenantSuperAdminId: adminEntityId(user?.tenantSuperAdminId || tenantScope?.tenantSuperAdminId) || null,
        tenantGlobalId: adminEntityId(user?.tenantGlobalId || tenantScope?.tenantGlobalId) || null,
    };
    const userRol = String(user?.rol || '').toUpperCase();
    const esRolGlobal = ['DIOS', 'DESAROLLADOR'].includes(userRol);
    const esSuperAdmin = (!!(actorScope.tenantSuperAdminId && !actorScope.tenantGlobalId)) || esRolGlobal;
    const mostrarSeccionMultinivel = !!(actorScope.tenantSuperAdminId || actorScope.tenantGlobalId) || esRolGlobal;
    const resolvedActorTenantGlobalId = useMemo(() => {
        if (!actorScope.tenantGlobalId) return null;
        const match = findTenantGlobalById(tenantsGlobales, actorScope.tenantGlobalId);
        return match ? adminEntityId(match) : actorScope.tenantGlobalId;
    }, [actorScope.tenantGlobalId, tenantsGlobales]);
    const activeTenantGlobalId = resolvedActorTenantGlobalId ?? selectedTenantGlobalId;
    const activeTenant = findTenantGlobalById(tenantsGlobales, activeTenantGlobalId);
    const activeTenantLabel = resolvedActorTenantGlobalId
        ? (activeTenant?.razon_social ?? activeTenant?.titulo ?? 'Mi TenantGlobal')
        : (activeTenant?.razon_social ?? activeTenant?.titulo ?? null);

    const getUsuarioNombre = (u: DashboardUser): string => {
        const perfil = u?.perfil;
        return perfil?.nombreCompleto
            || [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ')
            || String(u?.nombre || u?.name || '-');
    };

    const getUsuarioRol = (u: DashboardUser): string => {
        return String(u?.rolInfo?.nombre || u?.rol || u?.role || '-');
    };

    const getUsuarioPerfil = (u: DashboardUser): string => {
        const perfil = u?.perfil;
        if (!perfil) return 'Sin perfil';
        const labels: Record<string, string> = {
            SUPER_ADMIN: 'SuperAdmin',
            TENANT_GLOBAL: 'TenantGlobal',
            TENANT_CORPORATIVO: 'Corporativo',
            CLIENTE: 'Cliente',
        };
        const tipo = String(perfil.tipo || '').toUpperCase();
        return [labels[tipo] || 'Perfil', perfil.cargo || perfil.cc].filter(Boolean).join(' | ');
    };

    // ── Efectos: socket de paleta ─────────────────────────────────────────────
    useEffect(() => {
        const handler = (data: { colores?: Partial<ColoresPaleta> }): void => {
            if (!data?.colores) return;
            const nuevos = fusionarColoresApp(data.colores as Partial<ColoresApp>);
            setPaletaColores(nuevos);
            aplicarPaletaEnApp(nuevos as ColoresPaleta);
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        socketListeners.onPaletaColoresActualizada(handler as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return () => { socketCleanup.offPaletaColoresActualizada(handler as any); };
    }, []);

    useEffect(() => {
        void (async () => {
            try {
                const res = await obtenerColoresPublico();
                setPaletaColores(fusionarColoresApp(res?.colores));
            } catch {
                /* defaults */
            }
        })();
    }, []);

    // ── Efectos: usuarios ─────────────────────────────────────────────────────
    useEffect(() => { void loadUsuarios(); }, []);

    // ── Efectos: tenants ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!mostrarSeccionMultinivel) return;
        setLoadingTenants(true);
        getJerarquiaUsuarios()
            .then((res) => {
                const nodos: TenantGlobalNode[] = res?.tenantsGlobales ?? [];
                const lista: TenantGlobalInfo[] = nodos
                    .map((tg) => tg.tenantGlobal)
                    .filter((tg): tg is TenantGlobalInfo => tg !== null)
                    .map(normalizeTenantGlobalInfo);
                setTenantsGlobales(lista);
            })
            .catch(() => undefined)
            .finally(() => setLoadingTenants(false));
    }, [mostrarSeccionMultinivel]);

    useEffect(() => {
        if (!activeTenantGlobalId) { setModoReferir('TODOS'); return; }
        setLoadingParametrizacion(true);
        apiFetch(`/api/governance/parametrizacion/global/${adminEntityIdForPath(activeTenantGlobalId)}`, { method: 'GET' })
            .then((res) => setModoReferir(res?.parametrizacion?.modoReferir ?? 'TODOS'))
            .catch(() => setModoReferir('TODOS'))
            .finally(() => setLoadingParametrizacion(false));
    }, [activeTenantGlobalId]);

    // ── Usuarios: handlers ────────────────────────────────────────────────────
    const loadUsuarios = async (): Promise<void> => {
        setUsuariosLoading(true);
        try {
            const res = await apiFetch('/api/registro/listarRegistro', { method: 'GET' });
            const list = (res as any)?.data ?? (res as any)?.usuarios ?? (Array.isArray(res) ? res : []);
            const normalizados = (Array.isArray(list) ? list : []).map((u: DashboardUser) => {
                const id = adminEntityId(u);
                return id ? { ...u, iud: id } : u;
            });
            setUsuarios(normalizados);
        } catch { toast.error('Error cargando usuarios'); }
        finally { setUsuariosLoading(false); }
    };

    const filteredUsuarios = useMemo(() => {
        const q = usuarioSearch.trim().toLowerCase();
        if (!q) return usuarios;
        return usuarios.filter((u) => (
            String(u?.nombre || u?.name || '').toLowerCase().includes(q)
            || String(u?.correo || u?.email || '').toLowerCase().includes(q)
            || getUsuarioRol(u).toLowerCase().includes(q)
            || getUsuarioPerfil(u).toLowerCase().includes(q)
        ));
    }, [usuarioSearch, usuarios]);

    const openEditUser = (u: DashboardUser): void => {
        setEditingUser(u);
        setUserEditForm({ correo: String(u?.correo || u?.email || ''), password: '', rol: String(u?.rol || '') });
    };
    const closeEditUser = (): void => { setEditingUser(null); setUserEditForm({ correo: '', password: '', rol: '' }); };

    const handleSaveUser = async (): Promise<void> => {
        if (!editingUser) return;
        const id = adminEntityId(editingUser);
        if (!id) { toast.error('Sin ID de usuario'); return; }
        const body: Record<string, string> = {};
        if (userEditForm.correo) body.correo = userEditForm.correo;
        if (userEditForm.password) body.password = userEditForm.password;
        if (userEditForm.rol) body.rol = userEditForm.rol;
        setUserEditSaving(true);
        try {
            await apiFetch(`/api/seguridad/pruebas/actualizar/registro/${adminEntityIdForPath(id)}`, { method: 'PUT', body: JSON.stringify(body) });
            setUsuarios((prev) => prev.map((u) => (
                sameAdminEntityId(u, id) ? { ...u, ...body, iud: adminEntityId(u) || id } : u
            )));
            toast.success('Usuario actualizado');
            closeEditUser();
        } catch (error: any) { toast.error(String(error?.message || 'Error al actualizar')); }
        finally { setUserEditSaving(false); }
    };

    // ── Modo referir ──────────────────────────────────────────────────────────
    const saveModoReferir = async (modo: 'TODOS' | 'SELECCION' | 'INHABILITADO'): Promise<void> => {
        if (!activeTenantGlobalId) return;
        setSavingModoReferir(true);
        try {
            const res = await apiFetch(`/api/governance/parametrizacion/global/${adminEntityIdForPath(activeTenantGlobalId)}`, {
                method: 'PUT',
                body: { canCreateCorporativos: true, modoReferir: modo },
            });
            setModoReferir(res?.parametrizacion?.modoReferir ?? modo);
            toast.success('Configuracion de referidos actualizada.');
        } catch (error: any) { toast.error(error?.message || 'No se pudo guardar el modo de referidos.'); }
        finally { setSavingModoReferir(false); }
    };

    // ── Paleta: abrir modal y cargar datos ────────────────────────────────────
    const abrirModalPaleta = async (): Promise<void> => {
        setPaletaModalOpen(true);
        setPaletaLoading(true);
        try {
            const res = await obtenerColoresPublico();
            setPaletaColores(fusionarColoresApp(res?.colores));
        } catch { toast.error('No se pudo cargar los colores actuales.'); }
        finally { setPaletaLoading(false); }
    };

    const cerrarModalPaleta = (): void => { setPaletaModalOpen(false); };

    // Previsualiza en vivo sin guardar
    const handleColorChange = (key: keyof PaletaColores, value: string): void => {
        const nuevos = { ...paletaColores, [key]: value };
        setPaletaColores(nuevos);
        aplicarPaletaEnApp(nuevos as ColoresPaleta);
    };

    // ── Paleta: guardar ───────────────────────────────────────────────────────
    const guardarYActivarPaleta = async (): Promise<void> => {
        setPaletaSaving(true);
        try {
            await guardarColoresApp(paletaColores);
            aplicarPaletaEnApp(fusionarColoresApp(paletaColores) as ColoresPaleta);
            toast.success('Colores guardados y aplicados en toda la app.');
            cerrarModalPaleta();
        } catch (error: any) { toast.error(error?.message || 'No se pudo guardar los colores.'); }
        finally { setPaletaSaving(false); }
    };

    const abrirTextoDashboard = (): void => {
        setTextoDashboardDraft(textoDashboard);
        setTextoDashboardOpen(true);
    };

    const guardarTextoDashboard = (): void => {
        const next = {
            titulo: textoDashboardDraft.titulo.trim() || DEFAULT_DASHBOARD_TEXT_CONFIG.titulo,
            descripcion: textoDashboardDraft.descripcion.trim() || DEFAULT_DASHBOARD_TEXT_CONFIG.descripcion,
        };
        setTextoDashboard(next);
        window.localStorage.setItem(DASHBOARD_TEXT_CONFIG_KEY, JSON.stringify(next));
        setTextoDashboardOpen(false);
        toast.success('Texto del dashboard actualizado.');
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="p-4 md:p-6 lg:p-8 flex-1 space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">{textoDashboard.titulo}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {textoDashboard.descripcion}
                    </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={abrirTextoDashboard}>
                    <Edit className="h-4 w-4" />
                    Parametrizar texto
                </Button>
            </div>

            {/* ── Paleta de colores ─────────────────────────────────────────── */}
            <Card className="shadow-lg border-border">
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-2">
                            <Palette className="h-5 w-5 text-primary" />
                            <CardTitle>Paleta de colores de la aplicacion</CardTitle>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="secondary" size="sm" className="border border-primary/20" onClick={() => setAyudaPaletaOpen(true)} title="Consultar donde se aplica cada color">
                                <HelpCircle className="h-4 w-4 mr-1.5" />
                                Guia de uso de colores
                            </Button>
                            <Button size="sm" onClick={() => void abrirModalPaleta()}>
                                <Palette className="h-4 w-4 mr-2" />
                                Configurar colores
                            </Button>
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Define los 6 colores que controlan toda la apariencia visual — vistas publicas y admin.
                        Los cambios se propagan en tiempo real a todos los usuarios conectados via Socket.
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {COLOR_META.map(({ key, label, cssVar }) => (
                            <div key={key} className="flex flex-col items-center gap-1.5">
                                <div
                                    className="w-10 h-10 rounded-full border-2 border-border"
                                    style={{ backgroundColor: `hsl(var(${cssVar}))` }}
                                />
                                <p className="text-xs font-medium text-center leading-tight">{label}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ── Usuarios ──────────────────────────────────────────────────── */}
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
                                    const uid = adminEntityId(u) || `usuario-${i}`;
                                    return (
                                        <TableRow key={uid}>
                                            <TableCell>
                                                <div className="space-y-0.5">
                                                    <p className="font-medium">{getUsuarioNombre(u)}</p>
                                                    <p className="text-xs text-muted-foreground">{getUsuarioPerfil(u)}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500">{String(u?.correo || u?.email || '-')}</TableCell>
                                            <TableCell><Badge variant="outline">{getUsuarioRol(u)}</Badge></TableCell>
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

            {/* ── Parametrizacion multinivel ────────────────────────────────── */}
            {mostrarSeccionMultinivel && (
                <Card className="shadow-lg border-border">
                    <CardHeader className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Network className="h-5 w-5 text-primary" />
                            <CardTitle>Parametrizacion multinivel</CardTitle>
                            {activeTenantLabel
                                ? <Badge variant="secondary">{activeTenantLabel}</Badge>
                                : <Badge variant="outline">Sin tenant seleccionado</Badge>
                            }
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Configura las generaciones y porcentajes de comision del sistema de referidos multinivel para el TenantGlobal activo.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {esSuperAdmin && (
                            <div className="flex items-center gap-3">
                                <div className="w-full max-w-sm">
                                    <Select value={selectedTenantGlobalId ?? ''} onValueChange={setSelectedTenantGlobalId} disabled={loadingTenants}>
                                        <SelectTrigger>
                                            {loadingTenants
                                                ? <span className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Cargando tenants...</span>
                                                : <SelectValue placeholder="Selecciona un TenantGlobal" />
                                            }
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tenantsGlobales.map((tg) => {
                                                const tenantId = adminEntityId(tg);
                                                return (
                                                    <SelectItem key={tenantId} value={tenantId}>
                                                        {tg.razon_social ?? tg.titulo ?? tenantId}
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {selectedTenantGlobalId && (
                                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setSelectedTenantGlobalId(null)}>
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
                                                <p className="text-xs text-muted-foreground">Define quien puede generar enlaces de referido en este TenantGlobal.</p>
                                            </div>
                                            {(loadingParametrizacion || savingModoReferir) && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />}
                                        </div>
                                        <div className="flex gap-2">
                                            {(['TODOS', 'SELECCION', 'INHABILITADO'] as const).map((modo) => (
                                                <Button key={modo} size="sm" variant={modoReferir === modo ? 'default' : 'outline'}
                                                    disabled={loadingParametrizacion || savingModoReferir}
                                                    onClick={() => void saveModoReferir(modo)} className="flex-1 text-xs">
                                                    {modo === 'TODOS' && 'Todos'}{modo === 'SELECCION' && 'Seleccion'}{modo === 'INHABILITADO' && 'Inhabilitado'}
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

            {/* ── Redirects ─────────────────────────────────────────────────── */}
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
                                            <p className="text-xs text-muted-foreground">Permanece cerrado por defecto y solo se despliega al abrirlo manualmente.</p>
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

            {/* ═══════════════════════════════════════════════════════════════
                MODAL: Editar usuario
            ════════════════════════════════════════════════════════════════ */}
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
                            <Input value={userEditForm.correo} onChange={(e) => setUserEditForm((p) => ({ ...p, correo: e.target.value }))} placeholder="nuevo@correo.com" />
                        </div>
                        <div>
                            <Label>Rol</Label>
                            <Input value={userEditForm.rol} onChange={(e) => setUserEditForm((p) => ({ ...p, rol: e.target.value }))} placeholder="ADMIN_ROLE / USER_ROLE..." />
                        </div>
                        <div className="md:col-span-2">
                            <Label>Nueva contraseña</Label>
                            <Input type="password" value={userEditForm.password} onChange={(e) => setUserEditForm((p) => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
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

            {/* ═══════════════════════════════════════════════════════════════
                MODAL: Paleta de colores
            ════════════════════════════════════════════════════════════════ */}
            <Dialog open={textoDashboardOpen} onOpenChange={setTextoDashboardOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Texto del dashboard</DialogTitle>
                        <DialogDescription>
                            Parametriza el titulo y la descripcion principal que se muestran en Dashboard Admin.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Titulo</Label>
                            <Input
                                value={textoDashboardDraft.titulo}
                                onChange={(event) => setTextoDashboardDraft((prev) => ({ ...prev, titulo: event.target.value }))}
                                placeholder={DEFAULT_DASHBOARD_TEXT_CONFIG.titulo}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Descripcion</Label>
                            <Input
                                value={textoDashboardDraft.descripcion}
                                onChange={(event) => setTextoDashboardDraft((prev) => ({ ...prev, descripcion: event.target.value }))}
                                placeholder={DEFAULT_DASHBOARD_TEXT_CONFIG.descripcion}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setTextoDashboardOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="button" onClick={guardarTextoDashboard}>
                            Guardar texto
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={paletaModalOpen} onOpenChange={(open) => { if (!open) cerrarModalPaleta(); }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Palette className="h-5 w-5 text-primary" />
                            Paleta de colores de la aplicacion
                        </DialogTitle>
                        <DialogDescription>
                            Cada color controla variables CSS especificas que afectan toda la interfaz.
                            El preview es en vivo — la pagina se actualiza mientras eliges.
                            Al guardar, los colores se propagan a todos los usuarios via Socket.
                        </DialogDescription>
                    </DialogHeader>

                    {paletaLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="space-y-5 py-2">
                            {/* Separador */}
                            <div className="border-t border-border" />

                            {/* Color pickers con descripcion */}
                            <div className="space-y-4">
                                {COLOR_META.map(({ key, label, afecta }) => (
                                    <div key={key} className="flex items-start gap-4 p-3 rounded-lg border border-border bg-card">
                                        {/* Swatch + picker */}
                                        <div className="flex flex-col items-center gap-2 shrink-0">
                                            <div
                                                className="w-12 h-12 rounded-lg border-2 border-border shadow-sm"
                                                style={{ backgroundColor: paletaColores[key] }}
                                            />
                                            <input
                                                type="color"
                                                value={paletaColores[key]}
                                                onChange={(e) => handleColorChange(key, e.target.value)}
                                                className="w-10 h-7 cursor-pointer rounded border border-border"
                                                title={`Seleccionar ${label}`}
                                            />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 space-y-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-semibold">{label}</p>
                                                <Badge variant="outline" className="text-xs font-mono">{key}</Badge>
                                                <code className="text-xs text-muted-foreground font-mono">{paletaColores[key]}</code>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{afecta}</p>
                                            <Input
                                                value={paletaColores[key]}
                                                onChange={(e) => handleColorChange(key, e.target.value)}
                                                className="h-7 text-xs font-mono mt-1"
                                                placeholder="#000000"
                                                maxLength={7}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </div>
                    )}

                    <DialogFooter className="flex gap-2 pt-2 border-t border-border">
                        <Button variant="outline" onClick={cerrarModalPaleta} disabled={paletaSaving}>
                            Cancelar
                        </Button>
                        <Button onClick={() => void guardarYActivarPaleta()} disabled={paletaSaving || paletaLoading}>
                            {paletaSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Palette className="mr-2 h-4 w-4" />}
                            Guardar y aplicar paleta
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══════════════════════════════════════════════════════════════
                MODAL: Ayuda de colores
            ════════════════════════════════════════════════════════════════ */}
            <Dialog open={ayudaPaletaOpen} onOpenChange={setAyudaPaletaOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-primary" />
                            Guia de colores — ¿que cambia cada uno?
                        </DialogTitle>
                        <DialogDescription>
                            Cada color de la paleta controla variables CSS especificas (<code className="font-mono text-xs">--primary</code>, <code className="font-mono text-xs">--accent</code>, etc.)
                            que Tailwind aplica en toda la interfaz. Los swatches muestran el color activo en este momento.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        {/* Mini preview visual de la app */}
                        <div className="rounded-lg border border-border overflow-hidden text-xs">
                            <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: `hsl(var(--card))` }}>
                                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: `hsl(var(--primary))` }} />
                                <span className="font-semibold" style={{ color: `hsl(var(--primary))` }}>Navbar / Logo</span>
                                <div className="ml-auto flex gap-1.5">
                                    <div className="px-2 py-0.5 rounded text-[10px] flex items-center" style={{ backgroundColor: `hsl(var(--button))`, color: `hsl(var(--button-foreground))` }}>Boton</div>
                                    <div className="px-2 py-0.5 rounded text-[10px]" style={{ backgroundColor: `hsl(var(--accent))`, color: `hsl(var(--primary))` }}>Badge</div>
                                </div>
                            </div>
                            <div className="flex gap-2 p-3" style={{ backgroundColor: `hsl(var(--background))` }}>
                                <div className="w-28 rounded p-2 space-y-1 shrink-0" style={{ backgroundColor: `hsl(var(--card))`, border: `1px solid hsl(var(--muted))` }}>
                                    <div className="h-2 rounded w-3/4" style={{ backgroundColor: `hsl(var(--primary))` }} />
                                    <div className="h-1.5 rounded w-full" style={{ backgroundColor: `hsl(var(--muted))` }} />
                                    <div className="h-1.5 rounded w-5/6" style={{ backgroundColor: `hsl(var(--muted))` }} />
                                    <div className="h-1.5 rounded w-2/3" style={{ backgroundColor: `hsl(var(--accent))` }} />
                                </div>
                                <div className="flex-1 rounded p-2" style={{ backgroundColor: `hsl(var(--card))`, border: `1px solid hsl(var(--muted))` }}>
                                    <div className="h-1.5 rounded w-1/3 mb-2" style={{ backgroundColor: `hsl(var(--primary))` }} />
                                    <div className="h-5 rounded mb-1.5 w-full" style={{ backgroundColor: `hsl(var(--muted))`, border: `1px solid hsl(var(--muted))` }} />
                                    <div className="flex gap-1 mt-2">
                                        <div className="h-4 px-2 rounded text-[9px] flex items-center" style={{ backgroundColor: `hsl(var(--button))`, color: `hsl(var(--button-foreground))` }}>Guardar</div>
                                        <div className="h-4 px-2 rounded text-[9px] flex items-center border" style={{ borderColor: `hsl(var(--primary) / 0.2)`, color: `hsl(var(--primary))` }}>Cancelar</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                            Preview generado con los colores activos en este momento
                        </p>

                        <div className="border-t border-border" />

                        {/* Tabla explicativa */}
                        {COLOR_META.map(({ key, label, cssVar, afecta, elementos, noAfecta }) => (
                            <div key={key} className="flex gap-3 p-3 rounded-lg border border-border">
                                {/* Swatch con color real actual */}
                                <div className="shrink-0 flex flex-col items-center gap-1">
                                    <div
                                        className="w-10 h-10 rounded-lg border border-border shadow-sm"
                                        style={{ backgroundColor: `hsl(var(${cssVar}))` }}
                                    />
                                    <code className="text-[9px] text-muted-foreground font-mono">{cssVar}</code>
                                </div>

                                {/* Descripcion */}
                                <div className="flex-1 space-y-1.5 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold">{label}</p>
                                        <Badge variant="outline" className="text-[10px] font-mono">{key}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{afecta}</p>
                                    <ul className="space-y-0.5">
                                        {elementos.map((el) => (
                                            <li key={el} className="text-xs flex items-start gap-1.5">
                                                <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: `hsl(var(${cssVar}))` }} />
                                                {el}
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="rounded-md bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
                                        <span className="font-semibold text-foreground">No modifica:</span>{' '}
                                        {noAfecta.replace(/^No /, '')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter className="border-t border-border pt-3">
                        <Button variant="outline" onClick={() => setAyudaPaletaOpen(false)}>Cerrar</Button>
                        <Button onClick={() => { setAyudaPaletaOpen(false); void abrirModalPaleta(); }}>
                            <Palette className="h-4 w-4 mr-2" />
                            Ir a configurar colores
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
