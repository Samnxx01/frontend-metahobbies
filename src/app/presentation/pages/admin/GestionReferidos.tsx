import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/app/services/api';
import {
    formatOpaqueIdShort,
    formatUserDisplayLabel,
    isOpaqueDocumentId,
    resolveEntityPublicId,
} from '@/app/utils/entityPublicId';
import { toast } from 'react-toastify';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
// Lucide icons
import {
    Loader2, DollarSign, Users, TrendingUp, Calendar, CheckCircle,
    Clock, Network, Mail, Hash, Eye, ArrowUpRight, ArrowDownLeft, ChevronRight
} from 'lucide-react';

interface Voucher {
    _id: string;
    referidoId: string;
    referidoCorreo?: string | null;
    referidoNombre?: string | null;
    referidoApellido?: string | null;
    montoGanado: number;
    ciclo: number;
    fecha: string;
    status: 'pendiente' | 'pagado';
    motivo: string;
    commissionlevel?: string;
}

interface UsuarioReferido {
    usuarioId: string;
    correo: string;
    nombre?: string;
    saldoInicial: number;
    saldoActual: number;
    totalGenerado?: number;
    totalPagado: number;
    totalPendiente: number;
    vouchers: Voucher[];
}

interface ReferidosResponse {
    ok: boolean;
    esAdmin: boolean;
    usuarios: UsuarioReferido[];
}

const isVoucher = (voucher: Voucher | null | undefined): voucher is Voucher => Boolean(voucher);

const sanitizeReferidosResponse = (response: ReferidosResponse): ReferidosResponse => ({
    ...response,
    usuarios: (response?.usuarios ?? [])
        .filter(Boolean)
        .map((usuario) => ({
            ...usuario,
            vouchers: (usuario.vouchers ?? []).filter(isVoucher),
        })),
});

interface UserDetail {
    _id: string;
    correo: string;
    nombre?: string;
    apellido?: string;
}

interface VoucherDetail extends Voucher {
    usuarioPropietario?: UserDetail;
    usuarioReferido?: UserDetail;
}
interface ReferralChainNode {
    usuarioId: string;
    correo: string;
    nombre?: string;
    isOrigen: boolean;
    isDestino: boolean;
    isCurrent: boolean;
}

const voucherMonto = (voucher: Voucher | null | undefined): number => Number(voucher?.montoGanado) || 0;

const totalesDesdeVouchers = (vouchers: Array<Voucher | null | undefined>) => {
    const vouchersValidos = vouchers.filter(isVoucher);
    const totalGenerado = vouchersValidos.reduce((acc, v) => acc + voucherMonto(v), 0);
    const totalPendiente = vouchersValidos
        .filter((v) => v.status === 'pendiente')
        .reduce((acc, v) => acc + voucherMonto(v), 0);
    const totalPagado = vouchersValidos
        .filter((v) => v.status === 'pagado')
        .reduce((acc, v) => acc + voucherMonto(v), 0);
    const saldoInicial = vouchersValidos.length ? voucherMonto(vouchersValidos[0]) : 0;
    return { totalGenerado, totalPendiente, totalPagado, saldoInicial };
};

const resolverTotalesUsuario = (usuario: UsuarioReferido) => {
    const desdeVouchers = totalesDesdeVouchers(usuario.vouchers);
    const totalPendiente = Number(usuario.totalPendiente ?? usuario.saldoActual ?? desdeVouchers.totalPendiente) || 0;
    const totalPagado = Number(usuario.totalPagado ?? desdeVouchers.totalPagado) || 0;
    const totalGenerado = Number(usuario.totalGenerado ?? desdeVouchers.totalGenerado) || (totalPendiente + totalPagado);
    const saldoInicial = Number(usuario.saldoInicial ?? desdeVouchers.saldoInicial) || 0;
    return {
        saldoInicial,
        saldoActual: totalPendiente,
        totalGenerado,
        totalPagado,
        totalPendiente,
    };
};

const DetailBox = ({ icon, label, value, mono = false }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    mono?: boolean;
}) => (
    <div className="p-3 bg-muted/30 rounded-lg space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <span className="text-xs font-medium uppercase">{label}</span>
        </div>
        <p className={`text-sm font-semibold text-foreground ${mono ? 'font-mono' : ''} truncate`}>
            {value}
        </p>
    </div>
);

const ReferralChain = ({ chain }: { chain: ReferralChainNode[] }) => {
    if (chain.length === 0) return null;

    return (
        <div className="relative">
            {/* Línea vertical continua de fondo */}
            <div className="absolute left-[17px] top-5 bottom-5 w-px bg-border/50 z-0" />

            <div className="space-y-1.5 relative z-10">
                {chain.map((node, index) => {
                    const label = node.isOrigen
                        ? 'Referidor'
                        : node.isDestino
                            ? 'Beneficiario'
                            : `Nivel ${index}`;

                    return (
                        <div key={`${node.usuarioId}-${index}`} className="flex items-center gap-3">
                            {/* Burbuja numerada con ring para "levantar" del fondo */}
                            <div
                                className={`
                                    w-[34px] h-[34px] rounded-full flex items-center justify-center
                                    text-xs font-bold flex-shrink-0 ring-2 ring-card
                                    ${node.isDestino
                                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                                        : node.isOrigen
                                            ? 'bg-success text-button-foreground shadow-sm shadow-success/30'
                                            : 'bg-muted-foreground/15 text-muted-foreground'
                                    }
                                `}
                            >
                                {index + 1}
                            </div>

                            {/* Tarjeta del nodo */}
                            <div
                                className={`
                                    flex-1 flex items-center justify-between px-3 py-2 rounded-lg border min-w-0
                                    ${node.isDestino
                                        ? 'bg-primary/5 border-primary/20'
                                        : node.isOrigen
                                            ? 'bg-success/10 dark:bg-success/20 border-success/20 dark:border-success'
                                            : 'bg-background border-border/50'
                                    }
                                `}
                            >
                                <div className="min-w-0 flex-1 mr-2">
                                    <p className="text-sm font-medium text-foreground truncate leading-snug">
                                        {formatUserDisplayLabel({
                                            nombre: node.nombre,
                                            correo: isOpaqueDocumentId(node.correo) ? null : node.correo,
                                            fallback: 'Usuario no identificado',
                                        })}
                                    </p>
                                    {node.nombre && node.correo && !isOpaqueDocumentId(node.correo) ? (
                                        <p className="text-[11px] text-muted-foreground truncate">{node.correo}</p>
                                    ) : null}
                                </div>

                                <span
                                    className={`
                                        flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border
                                        ${node.isDestino
                                            ? 'bg-primary/10 text-primary border-primary/25'
                                            : node.isOrigen
                                                ? 'bg-success/10 dark:bg-success/30 text-success-foreground dark:text-success-foreground border-success/30 dark:border-success'
                                                : 'bg-muted/60 text-muted-foreground border-border/60'
                                        }
                                    `}
                                >
                                    {label}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const cacheUserDetail = (
    cache: Map<string, UserDetail>,
    user: { _id?: string; iud?: string; id?: string; correo?: string; nombre?: string; apellido?: string }
): void => {
    const detail: UserDetail = {
        _id: resolveEntityPublicId(user),
        correo: user.correo,
        nombre: user.nombre,
        apellido: user.apellido,
    };
    const keys = new Set(
        [user.iud, user._id, user.id, detail._id].map((v) => String(v || '').trim()).filter(Boolean)
    );
    keys.forEach((key) => cache.set(key, detail));
};

const resolveNodeCorreo = (
    usuarioId: string,
    usuario: UsuarioReferido | undefined,
    hints: {
        referidoId: string;
        referidoCorreo?: string | null;
        referidoNombre?: string | null;
        propietarioId: string;
        propietarioCorreo?: string;
        propietarioNombre?: string | null;
    }
): string => {
    if (usuario?.correo) return usuario.correo;
    if (usuarioId === hints.referidoId && hints.referidoCorreo) return hints.referidoCorreo;
    if (usuarioId === hints.propietarioId && hints.propietarioCorreo) return hints.propietarioCorreo;
    if (isOpaqueDocumentId(usuarioId)) return 'Correo no disponible';
    return usuarioId;
};

const resolveNodeNombre = (
    usuarioId: string,
    usuario: UsuarioReferido | undefined,
    hints: {
        referidoId: string;
        referidoNombre?: string | null;
        propietarioId: string;
        propietarioNombre?: string | null;
    }
): string | undefined => {
    if (usuario?.nombre) return usuario.nombre;
    if (usuarioId === hints.referidoId && hints.referidoNombre) return hints.referidoNombre;
    if (usuarioId === hints.propietarioId && hints.propietarioNombre) return hints.propietarioNombre;
    return undefined;
};

const buildReferralChain = (
    voucherReferidoId: string,
    propietarioId: string,
    allUsuarios: UsuarioReferido[],
    hints: {
        referidoCorreo?: string | null;
        referidoNombre?: string | null;
        propietarioCorreo?: string;
        propietarioNombre?: string | null;
    } = {}
): ReferralChainNode[] => {
    const userMap = new Map<string, UsuarioReferido>();
    allUsuarios.forEach((u) => userMap.set(u.usuarioId, u));

    const correoHints = {
        referidoId: voucherReferidoId,
        referidoCorreo: hints.referidoCorreo,
        referidoNombre: hints.referidoNombre,
        propietarioId,
        propietarioCorreo: hints.propietarioCorreo,
        propietarioNombre: hints.propietarioNombre,
    };

    const findUpstream = (targetId: string): string | null => {
        for (const u of allUsuarios) {
            for (const v of (u.vouchers ?? []).filter(isVoucher)) {
                if (v.referidoId === targetId) return u.usuarioId;
            }
        }
        return null;
    };

    const upstreamChain: string[] = [];
    let current: string | null = voucherReferidoId;
    const visited = new Set<string>();

    while (current && !visited.has(current)) {
        visited.add(current);
        upstreamChain.unshift(current);
        current = findUpstream(current);
        if (upstreamChain.length > 20) break;
    }

    const chainIds = Array.from(new Set([...upstreamChain, propietarioId]));

    return chainIds.map((id, index) => {
        const u = userMap.get(id);
        const correo = resolveNodeCorreo(id, u, correoHints);
        const nombre = resolveNodeNombre(id, u, correoHints);
        return {
            usuarioId: id,
            correo,
            nombre,
            isOrigen: index === 0,
            isDestino: index === chainIds.length - 1,
            isCurrent: id === voucherReferidoId,
        };
    });
};

function GestionReferidos(): React.ReactElement {
    const [loading, setLoading] = useState<boolean>(true);
    const [data, setData] = useState<ReferidosResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedVoucher, setSelectedVoucher] = useState<VoucherDetail | null>(null);
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [loadingVoucherDetail, setLoadingVoucherDetail] = useState<boolean>(false);
    const [usersCache, setUsersCache] = useState<Map<string, UserDetail>>(new Map());
    const [referralChain, setReferralChain] = useState<ReferralChainNode[]>([]);

    useEffect(() => {
        fetchReferidos();
    }, []);

    const fetchReferidos = async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
            const response = await apiFetch(`${API_BASE_URL}/referido/listarSaldoRefere`, {
                method: 'GET'
            });
            setData(sanitizeReferidosResponse(response));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos de referidos';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const fetchUserDetails = async (userId: string): Promise<{ user: UserDetail | null; fullCache: Map<string, UserDetail> }> => {
        if (usersCache.has(userId)) {
            return { user: usersCache.get(userId)!, fullCache: usersCache };
        }
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
            const response = await apiFetch(`${API_BASE_URL}/registro/listarRegistro`, {
                method: 'GET'
            });
            if (response?.usuarios) {
                const newCache = new Map(usersCache);
                response.usuarios.forEach((user: UserDetail & { iud?: string; id?: string }) => {
                    cacheUserDetail(newCache, user);
                });
                setUsersCache(newCache);
                return { user: newCache.get(userId) || null, fullCache: newCache };
            }
            return { user: null, fullCache: usersCache };
        } catch (error) {
            console.error('Error al obtener detalles del usuario:', error);
            return { user: null, fullCache: usersCache };
        }
    };

    const handleVoucherClick = async (voucher: Voucher, usuarioPropietarioId: string, usuarioPropietarioEmail: string): Promise<void> => {
        setLoadingVoucherDetail(true);
        setModalOpen(true);
        setReferralChain([]);

        try {
            const [propietarioResult, referidoResult] = await Promise.all([
                fetchUserDetails(usuarioPropietarioId),
                fetchUserDetails(voucher.referidoId)
            ]);

            const propietario = propietarioResult.user;
            const referido = referidoResult.user;

            const latestCache = propietarioResult.fullCache.size >= referidoResult.fullCache.size
                ? propietarioResult.fullCache
                : referidoResult.fullCache;

            const voucherDetail: VoucherDetail = {
                ...voucher,
                usuarioPropietario: propietario || {
                    _id: usuarioPropietarioId,
                    correo: isOpaqueDocumentId(usuarioPropietarioEmail) ? 'No disponible' : usuarioPropietarioEmail,
                },
                usuarioReferido: referido || {
                    _id: voucher.referidoId,
                    correo: voucher.referidoCorreo || 'No disponible',
                    nombre: voucher.referidoNombre || undefined,
                    apellido: voucher.referidoApellido || undefined,
                },
            };

            setSelectedVoucher(voucherDetail);

            if (data?.usuarios) {
                const chain = buildReferralChain(
                    voucher.referidoId,
                    usuarioPropietarioId,
                    data.usuarios,
                    {
                        referidoCorreo: voucher.referidoCorreo,
                        referidoNombre: voucher.referidoNombre,
                        propietarioCorreo: usuarioPropietarioEmail,
                        propietarioNombre: propietario?.nombre,
                    }
                );

                // Enriquecer nodos del propietario y referido con datos ya fetcheados
                const preEnrichedChain = chain.map((node) => {
                    if (node.usuarioId === usuarioPropietarioId) {
                        return {
                            ...node,
                            correo: propietario?.correo || usuarioPropietarioEmail || node.correo,
                            nombre: propietario?.nombre || node.nombre,
                        };
                    }
                    if (node.usuarioId === voucher.referidoId) {
                        return {
                            ...node,
                            correo: referido?.correo || voucher.referidoCorreo || node.correo,
                            nombre: referido?.nombre || node.nombre,
                        };
                    }
                    return node;
                });

                // Para nodos intermedios aún sin correo, buscar en cache
                const unresolvedIds = preEnrichedChain
                    .filter((node) => isOpaqueDocumentId(node.correo) || node.correo === 'Correo no disponible')
                    .map((node) => node.usuarioId);

                if (unresolvedIds.length > 0) {
                    const { fullCache } = await fetchUserDetails(unresolvedIds[0]);

                    const enrichedChain = preEnrichedChain.map((node) => {
                        if (!isOpaqueDocumentId(node.correo) && node.correo !== 'Correo no disponible') {
                            return node;
                        }
                        const detail = fullCache.get(node.usuarioId) || latestCache.get(node.usuarioId);
                        if (!detail?.correo) return node;
                        return {
                            ...node,
                            correo: detail.correo,
                            nombre: detail.nombre,
                        };
                    });
                    setReferralChain(enrichedChain);
                } else {
                    setReferralChain(preEnrichedChain);
                }
            }
        } catch (error) {
            console.error('Error al cargar detalle del voucher:', error);
            toast.error('Error al cargar los detalles del voucher');
        } finally {
            setLoadingVoucherDetail(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 md:p-6 lg:p-8">
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardContent className="p-6">
                        <p className="font-semibold text-destructive mb-1">Error al cargar datos</p>
                        <p className="text-sm text-muted-foreground">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const totalUsuarios = data?.usuarios.length || 0;
    const totalesGlobales = (data?.usuarios ?? []).reduce(
        (acc, usuario) => {
            const t = resolverTotalesUsuario(usuario);
            return {
                generado: acc.generado + t.totalGenerado,
                pagado: acc.pagado + t.totalPagado,
                pendiente: acc.pendiente + t.totalPendiente,
            };
        },
        { generado: 0, pagado: 0, pendiente: 0 }
    );
    const totalComisionesGlobales = totalesGlobales.generado;
    const totalPagadoGlobal = totalesGlobales.pagado;
    const totalPendienteGlobal = totalesGlobales.pendiente;

    return (
        <div className="p-4 md:p-6 lg:p-8 bg-background min-h-screen">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Network className="h-5 w-5 text-primary" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                            Gestión de Referidos
                        </h1>
                    </div>
                    <p className="text-muted-foreground text-sm md:text-base">
                        Administra comisiones y referidos de tu red
                    </p>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4 md:p-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Users className="h-5 w-5 text-primary" />
                                    <Badge variant="secondary" className="text-xs">Total</Badge>
                                </div>
                                <div>
                                    <p className="text-2xl md:text-3xl font-bold text-foreground">{totalUsuarios}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Usuarios activos</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4 md:p-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <TrendingUp className="h-5 w-5 text-success" />
                                    <Badge variant="secondary" className="text-xs bg-success/10 text-success-foreground border-success/20">
                                        Comisiones
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-xl md:text-2xl font-bold text-foreground">
                                        {formatCurrency(totalComisionesGlobales)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">Total generado</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4 md:p-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Clock className="h-5 w-5 text-warning" />
                                    <Badge variant="secondary" className="text-xs bg-warning/10 text-warning-foreground border-warning/20">
                                        Pendiente
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-xl md:text-2xl font-bold text-foreground">
                                        {formatCurrency(totalPendienteGlobal)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">Por pagar</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4 md:p-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <CheckCircle className="h-5 w-5 text-primary" />
                                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                                        Pagado
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-xl md:text-2xl font-bold text-foreground">
                                        {formatCurrency(totalPagadoGlobal)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">Completado</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Lista de Usuarios */}
                <div className="space-y-3">
                    {data?.usuarios.map((usuario, usuarioIndex) => {
                        const totales = resolverTotalesUsuario(usuario);
                        const usuarioKey = String(usuario.usuarioId || usuario.correo || `usuario-${usuarioIndex}`);
                        return (
                        <Card key={`${usuarioKey}-${usuarioIndex}`} className="border-0 shadow-sm hover:shadow-md transition-all">
                            <CardContent className="p-4 md:p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <Mail className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-foreground truncate">
                                                {formatUserDisplayLabel({
                                                    nombre: usuario.nombre,
                                                    correo: usuario.correo,
                                                })}
                                            </p>
                                            {usuario.nombre ? (
                                                <p className="text-xs text-muted-foreground truncate">{usuario.correo}</p>
                                            ) : null}
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="ml-2 flex-shrink-0">
                                        {usuario.vouchers.length} vouchers
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                    <div className="p-3 rounded-lg bg-muted/30">
                                        <p className="text-xs text-muted-foreground mb-1">Saldo Inicial</p>
                                        <p className="text-sm font-semibold">{formatCurrency(totales.saldoInicial)}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                                        <p className="text-xs text-muted-foreground mb-1">Saldo Actual</p>
                                        <p className="text-sm font-bold text-primary">{formatCurrency(totales.saldoActual)}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-success/10 dark:bg-success/30 border border-success/20 dark:border-success">
                                        <p className="text-xs text-muted-foreground mb-1">Pagado</p>
                                        <p className="text-sm font-semibold text-success-foreground">{formatCurrency(totales.totalPagado)}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-warning/10 dark:bg-warning/30 border border-warning/20 dark:border-warning">
                                        <p className="text-xs text-muted-foreground mb-1">Pendiente</p>
                                        <p className="text-sm font-semibold text-warning-foreground">{formatCurrency(totales.totalPendiente)}</p>
                                    </div>
                                </div>

                                {usuario.vouchers.length > 0 && (
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="vouchers" className="border-0">
                                            <AccordionTrigger className="py-3 hover:no-underline hover:bg-muted/30 px-3 rounded-lg transition-colors">
                                                <div className="flex items-center gap-2 text-sm font-medium">
                                                    <DollarSign className="h-4 w-4 text-primary" />
                                                    Vouchers de comisiones
                                                    <Badge variant="secondary" className="ml-2">
                                                        {usuario.vouchers.length}
                                                    </Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-3">
                                                <div className="space-y-2">
                                                    {usuario.vouchers.map((voucher, voucherIndex) => (
                                                        <div
                                                            key={`${usuarioKey}-${String(voucher._id || voucher.referidoId || 'voucher')}-${voucherIndex}`}
                                                            onClick={() => handleVoucherClick(voucher, usuario.usuarioId, usuario.correo)}
                                                            className="group p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer"
                                                        >
                                                            <div className="flex items-center justify-between gap-4">
                                                                <div className="flex-1 min-w-0 space-y-2">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <Badge
                                                                            variant="secondary"
                                                                            className={
                                                                                voucher.status === 'pagado'
                                                                                    ? 'bg-success/10 text-success-foreground border-success/30 dark:bg-success dark:text-success-foreground'
                                                                                    : 'bg-warning/10 text-warning-foreground border-warning/30 dark:bg-warning dark:text-warning-foreground'
                                                                            }
                                                                        >
                                                                            {voucher.status === 'pagado' ? (
                                                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                                            ) : (
                                                                                <Clock className="h-3 w-3 mr-1" />
                                                                            )}
                                                                            {voucher.status}
                                                                        </Badge>
                                                                        <Badge variant="outline" className="text-xs">
                                                                            Nivel {voucher.ciclo}
                                                                        </Badge>
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {voucher.motivo}
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                                                        <div className="flex items-center gap-1">
                                                                            <Calendar className="h-3 w-3" />
                                                                            {formatDate(voucher.fecha)}
                                                                        </div>
                                                                        {voucher.referidoCorreo && !isOpaqueDocumentId(voucher.referidoCorreo) && (
                                                                            <div className="flex items-center gap-1">
                                                                                <Mail className="h-3 w-3" />
                                                                                <span className="truncate max-w-[160px]">
                                                                                    {formatUserDisplayLabel({
                                                                                        nombre: voucher.referidoNombre,
                                                                                        correo: voucher.referidoCorreo,
                                                                                    })}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-lg md:text-xl font-bold text-primary whitespace-nowrap">
                                                                        {formatCurrency(voucher.montoGanado)}
                                                                    </p>
                                                                    <Eye className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                )}
                            </CardContent>
                        </Card>
                        );
                    })}
                </div>

                {/* Estado Vacío */}
                {data?.usuarios.length === 0 && (
                    <Card className="border-dashed border-2">
                        <CardContent className="p-12 text-center">
                            <div className="max-w-sm mx-auto space-y-4">
                                <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                                    <Users className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-1">No hay usuarios con referidos</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Los usuarios con comisiones aparecerán aquí
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Modal - Detalle Voucher con Red de Referidos */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
                    <DialogTitle className="sr-only">
                        {selectedVoucher
                            ? `Comisión generada: ${formatCurrency(selectedVoucher.montoGanado)}`
                            : 'Detalle de comisión por referido'}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Recibo con monto, estado, beneficiario, referido y cadena de la red de referidos.
                    </DialogDescription>
                    {loadingVoucherDetail ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">Cargando detalles...</span>
                        </div>
                    ) : selectedVoucher ? (
                        <div className="flex flex-col">
                            {/* Cabecera tipo ticket */}
                            <div className="bg-primary px-6 py-8 text-primary-foreground relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <DollarSign className="w-32 h-32" />
                                </div>
                                <div className="relative z-10 text-center space-y-2">
                                    <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-widest">
                                        Comisión Generada
                                    </p>
                                    <h2 className="text-4xl font-bold tracking-tight">
                                        {formatCurrency(selectedVoucher.montoGanado)}
                                    </h2>
                                    <Badge
                                        className={`mt-2 border-0 ${selectedVoucher.status === 'pagado'
                                            ? 'bg-card/20 text-button-foreground hover:bg-card/30'
                                            : 'bg-button/20 text-button-foreground hover:bg-button/30'
                                            }`}
                                    >
                                        {selectedVoucher.status === 'pagado'
                                            ? <CheckCircle className="w-3 h-3 mr-1" />
                                            : <Clock className="w-3 h-3 mr-1" />
                                        }
                                        {selectedVoucher.status.toUpperCase()}
                                    </Badge>
                                </div>
                            </div>

                            {/* Cuerpo del ticket */}
                            <ScrollArea className="max-h-[60vh]">
                                <div className="p-6 space-y-6 bg-card">

                                    {/* Metadatos */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <DetailBox
                                            icon={<Calendar className="w-4 h-4" />}
                                            label="Fecha"
                                            value={formatDate(selectedVoucher.fecha)}
                                        />
                                        <DetailBox
                                            icon={<Network className="w-4 h-4" />}
                                            label="Nivel"
                                            value={`Generación ${selectedVoucher.ciclo}`}
                                        />
                                        <div className="col-span-2">
                                            <DetailBox
                                                icon={<Hash className="w-4 h-4" />}
                                                label="ID Transacción"
                                                value={formatOpaqueIdShort(selectedVoucher._id)}
                                                mono
                                            />
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Flujo puntual generado */}
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 bg-success/10 p-2 rounded-full">
                                                <ArrowUpRight className="w-4 h-4 text-success" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-semibold uppercase">
                                                    Generado por (Referido)
                                                </p>
                                                <p className="text-sm font-medium mt-0.5">
                                                    {formatUserDisplayLabel({
                                                        nombre: selectedVoucher.usuarioReferido?.nombre,
                                                        apellido: selectedVoucher.usuarioReferido?.apellido,
                                                        correo: selectedVoucher.usuarioReferido?.correo,
                                                        fallback: 'Usuario Referido',
                                                    })}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {isOpaqueDocumentId(selectedVoucher.usuarioReferido?.correo || '')
                                                        ? 'Correo no disponible'
                                                        : selectedVoucher.usuarioReferido?.correo}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pl-5 ml-4 border-l-2 border-dashed h-4 border-muted-foreground/30" />

                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 bg-info/10 p-2 rounded-full">
                                                <ArrowDownLeft className="w-4 h-4 text-info" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-semibold uppercase">
                                                    Recibido por (Beneficiario)
                                                </p>
                                                <p className="text-sm font-medium mt-0.5">
                                                    {formatUserDisplayLabel({
                                                        nombre: selectedVoucher.usuarioPropietario?.nombre,
                                                        apellido: selectedVoucher.usuarioPropietario?.apellido,
                                                        correo: selectedVoucher.usuarioPropietario?.correo,
                                                        fallback: 'Usuario Beneficiario',
                                                    })}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {isOpaqueDocumentId(selectedVoucher.usuarioPropietario?.correo || '')
                                                        ? 'Correo no disponible'
                                                        : selectedVoucher.usuarioPropietario?.correo}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-muted/30 p-3 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground">
                                            Motivo:{' '}
                                            <span className="font-medium text-foreground">
                                                {selectedVoucher.motivo}
                                            </span>
                                        </p>
                                    </div>

                                    {/* ── Red completa de referidos ── */}
                                    {referralChain.length > 0 && (
                                        <>
                                            <Separator />
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                        <Network className="w-3.5 h-3.5 text-primary" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-semibold text-foreground leading-none">
                                                            Red de referidos
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                                            Cadena completa de esta comisión
                                                        </p>
                                                    </div>
                                                    <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 border border-border/50 px-2 py-0.5 rounded-full">
                                                        {referralChain.length} {referralChain.length === 1 ? 'nodo' : 'nodos'}
                                                    </span>
                                                </div>
                                                <div className="rounded-xl border border-border/50 bg-muted/10 p-3">
                                                    <ReferralChain chain={referralChain} />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                </div>
                            </ScrollArea>

                            <div className="p-4 bg-muted/20 border-t text-center">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => setModalOpen(false)}
                                >
                                    Cerrar Recibo
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default GestionReferidos;
