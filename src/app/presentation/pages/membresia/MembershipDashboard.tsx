import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useReferralLink } from '@/app/hooks/useReferralLink';
import { apiFetch } from '@/app/services/api';
import { normalizePublicIdForApi } from '@/app/utils/entityPublicId';
import { useAuth } from '@/app/providers/AuthProvider';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Lucide icons
import {
    Copy, Share2, DollarSign, Users, TrendingUp, Loader2,
    Calendar, Hash, FileText, CheckCircle2, XCircle, Clock, X, AlertTriangle, Mail,
} from 'lucide-react';
import KPIUsuarioMembresia from '../admin/ParametrizacionMembresia/comisiones/KPIUsuarioMembresia';

interface Voucher {
    _id: string;
    referidoId: string;
    montoGanado: number;
    ciclo: number;
    fecha: string;
    status: 'pendiente' | 'pagado';
    motivo: string;
    estado?: boolean;
    commissionLevel?: unknown;
}

interface UsuarioReferido {
    usuarioId: string;
    correo: string;
    saldoInicial: number;
    saldoActual: number;
    totalGenerado?: number;
    totalPagado: number;
    totalPendiente: number;
    vouchers: Voucher[];
    referidos?: ReferidoRelacion[];
}

interface ReferidoRelacion {
    relacionId: string;
    usuarioId: string | null;
    correo: string;
    nombre?: string | null;
    telefono?: string | null;
    verificado: boolean;
    fechaRelacion: string;
    nivel?: number | null;
    nivelNombre?: string | null;
    porcentaje?: number | null;
    vouchers?: Voucher[];
    membresiaVigencia?: {
        estadoMembresia: boolean;
        fechaActivacion: string | null;
        fechaVencimiento: string | null;
        duracionVigenciaHoras: number | null;
        tipoPagoCodigo: string | null;
        vencida: boolean;
    } | null;
}

interface ReferidosResponse {
    ok: boolean;
    esAdmin: boolean;
    usuarios: UsuarioReferido[];
}

const isVoucher = (voucher: Voucher | null | undefined): voucher is Voucher => Boolean(voucher);
const isReferidoRelacion = (referido: ReferidoRelacion | null | undefined): referido is ReferidoRelacion =>
    Boolean(referido);

const sanitizeReferidosResponse = (response: ReferidosResponse): ReferidosResponse => ({
    ...response,
    usuarios: (response?.usuarios ?? [])
        .filter(Boolean)
        .map((usuario) => ({
            ...usuario,
            vouchers: (usuario.vouchers ?? []).filter(isVoucher),
            referidos: (usuario.referidos ?? [])
                .filter(isReferidoRelacion)
                .map((referido) => ({
                    ...referido,
                    vouchers: (referido.vouchers ?? []).filter(isVoucher),
                })),
        })),
});

type EstadoTx = 'aprobada' | 'pendiente' | 'rechazada';

interface BannerConfig {
    icon: React.ReactNode;
    titulo: string;
    descripcion: string;
    bg: string;
    border: string;
    iconColor: string;
    titleColor: string;
}

const BANNER_CONFIG: Record<EstadoTx, BannerConfig> = {
    aprobada: {
        icon: <CheckCircle2 className="w-6 h-6 shrink-0" />,
        titulo: '¡Membresía activada exitosamente!',
        descripcion: 'Tu pago fue procesado. Ya tienes acceso a todos los beneficios MABS. Revisa tu correo para los detalles.',
        bg: 'bg-secondary/20',
        border: 'border-secondary/40',
        iconColor: 'text-secondary-foreground',
        titleColor: 'text-secondary-foreground',
    },
    pendiente: {
        icon: <Clock className="w-6 h-6 shrink-0" />,
        titulo: 'Pago en verificación',
        descripcion: 'Tu transacción está siendo procesada. Te notificaremos por correo cuando tu membresía esté activa.',
        bg: 'bg-accent/15',
        border: 'border-accent/30',
        iconColor: 'text-accent-foreground',
        titleColor: 'text-accent-foreground',
    },
    rechazada: {
        icon: <XCircle className="w-6 h-6 shrink-0" />,
        titulo: 'Pago no procesado',
        descripcion: 'No pudimos completar tu transacción. Verifica tu método de pago e inténtalo de nuevo.',
        bg: 'bg-destructive/10',
        border: 'border-destructive/25',
        iconColor: 'text-destructive',
        titleColor: 'text-destructive',
    },
};

function BannerTransaccion() {
    const [params, setParams] = useSearchParams();
    const [visible, setVisible] = useState(false);

    const rawEstado = params.get('estado');
    const estado: EstadoTx | null =
        rawEstado === 'aprobada' || rawEstado === 'pendiente' || rawEstado === 'rechazada'
            ? rawEstado : null;

    const referencia = params.get('referencia') ?? params.get('ref') ?? '';
    const monto = params.get('monto') ?? '';
    const moneda = params.get('moneda') ?? '';

    useEffect(() => {
        if (estado) {
            const t = setTimeout(() => setVisible(true), 60);
            return () => clearTimeout(t);
        }
    }, [estado]);

    const cerrar = () => {
        setVisible(false);
        setTimeout(() => {
            params.delete('estado');
            params.delete('referencia');
            params.delete('ref');
            params.delete('monto');
            params.delete('moneda');
            setParams(params, { replace: true });
        }, 300);
    };

    if (!estado) return null;

    const cfg = BANNER_CONFIG[estado];

    return (
        <div
            className={`
                rounded-xl border px-5 py-4 transition-all duration-300
                ${cfg.bg} ${cfg.border}
                ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
            `}
        >
            <div className="flex items-start gap-4">
                {/* Ícono */}
                <span className={cfg.iconColor}>{cfg.icon}</span>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${cfg.titleColor}`}>{cfg.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{cfg.descripcion}</p>

                    {/* Detalles de la transacción */}
                    {(referencia || monto) && (
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                            {referencia && (
                                <span className="text-xs text-muted-foreground">
                                    Ref.{' '}
                                    <span className="font-mono font-medium text-foreground">{referencia}</span>
                                </span>
                            )}
                            {monto && (
                                <span className="text-xs text-muted-foreground">
                                    Monto{' '}
                                    <span className="font-medium text-foreground">
                                        {moneda ? `${moneda} ` : ''}
                                        {Number(monto).toLocaleString('es-CO')}
                                    </span>
                                </span>
                            )}
                        </div>
                    )}

                    {/* CTA si fue rechazada */}
                    {estado === 'rechazada' && (
                        <p className="mt-2 text-xs text-muted-foreground">
                            ¿Necesitas ayuda?{' '}
                            <a href="mailto:soporte@mabs.com" className="text-primary hover:underline font-medium">
                                Contacta soporte
                            </a>
                        </p>
                    )}
                </div>

                {/* Cerrar */}
                <button
                    onClick={cerrar}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
                    title="Cerrar"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
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
    const totalPendiente =
        Number(usuario.totalPendiente ?? usuario.saldoActual ?? desdeVouchers.totalPendiente) || 0;
    const totalPagado = Number(usuario.totalPagado ?? desdeVouchers.totalPagado) || 0;
    const totalGenerado =
        Number(usuario.totalGenerado ?? desdeVouchers.totalGenerado) || totalPendiente + totalPagado;
    return {
        saldoActual: totalPendiente,
        totalGenerado,
        totalPagado,
        totalPendiente,
    };
};

export default function MembershipDashboard(): React.ReactElement {
    const { user, isAuthenticated } = useAuth();
    const { referralData, loading, refetch } = useReferralLink();
    const [referidosData, setReferidosData] = useState<ReferidosResponse | null>(null);
    const [loadingReferidos, setLoadingReferidos] = useState<boolean>(true);
    const [enviandoRenovacionId, setEnviandoRenovacionId] = useState<string | null>(null);
    const tenantScope = user?.auth?.tenantScope;
    const tieneTenant = Boolean(
        isAuthenticated && (
            tenantScope?.tenantSuperAdminId ||
            tenantScope?.tenantGlobalId ||
            tenantScope?.tenantCorporativoId ||
            user?.tenantSuperAdminId ||
            user?.tenantGlobalId ||
            user?.tenantCorporativoId ||
            user?.perfil?.tenantSuperAdminId ||
            user?.perfil?.tenantGlobalId ||
            user?.perfil?.tenantCorporativoId
        )
    );

    useEffect(() => {
        fetchReferidos();
    }, []);

    useEffect(() => {
        if (!localStorage.getItem('token')) return;
        void refetch().catch(() => {
            /* El usuario verá el error al pulsar Generar Enlace si aún no tiene membresía activa. */
        });
    }, [refetch]);

    const fetchReferidos = async (): Promise<void> => {
        try {
            setLoadingReferidos(true);
            const response = await apiFetch('/api/referido/listarMiMembresia', { method: 'GET' });
            setReferidosData(sanitizeReferidosResponse(response));
        } catch (err) {
            console.error('Error al cargar datos de referidos:', err);
            toast.error('Error al cargar datos de referidos');
        } finally {
            setLoadingReferidos(false);
        }
    };

    const handleEnviarRenovacion = async (referido: ReferidoRelacion): Promise<void> => {
        if (!referido.relacionId || enviandoRenovacionId) return;
        try {
            setEnviandoRenovacionId(referido.relacionId);
            const response = await apiFetch(
                `/api/referido/membresias/${encodeURIComponent(referido.relacionId)}/enviar-renovacion`,
                { method: 'POST' },
            );
            toast.success(response?.msg || 'Correo de renovación enviado.');
            await fetchReferidos();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No fue posible enviar el correo de renovación.';
            toast.error(message);
        } finally {
            setEnviandoRenovacionId(null);
        }
    };

    const formatCurrency = (amount: number): string =>
        new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 0,
        }).format(amount);

    const formatDate = (dateString: string): string =>
        new Date(dateString).toLocaleDateString('es-CO', {
            year: 'numeric', month: 'short', day: 'numeric',
        });

    const misDatos = referidosData?.usuarios?.[0];
    const totales = misDatos ? resolverTotalesUsuario(misDatos) : null;
    const totalReferrals = misDatos?.referidos?.length || 0;
    const totalEarnings = totales?.saldoActual ?? 0;
    const totalPagado = totales?.totalPagado ?? 0;
    const totalPendiente = totales?.totalPendiente ?? 0;
    const visibleVouchers = (misDatos?.vouchers ?? []).filter(isVoucher);
    const visibleReferidos = (misDatos?.referidos ?? []).filter(isReferidoRelacion);
    const totalMontoVouchers = totales?.totalGenerado ?? visibleVouchers.reduce(
        (sum, v) => sum + voucherMonto(v),
        0,
    );

    /** Orden por nivel de generación (jerarquía), luego por fecha de relación */
    const referidosOrdenJerarquia = useMemo(() => {
        const list = [...visibleReferidos];
        list.sort((a, b) => {
            const na = a.nivel ?? 999;
            const nb = b.nivel ?? 999;
            if (na !== nb) return na - nb;
            return new Date(a.fechaRelacion).getTime() - new Date(b.fechaRelacion).getTime();
        });
        return list;
    }, [visibleReferidos]);

    const alertasVigencia = useMemo(() => {
        const ahora = Date.now();
        const limite = ahora + 7 * 24 * 60 * 60 * 1000;
        const conVencimiento = visibleReferidos.filter(ref => ref.membresiaVigencia?.fechaVencimiento);
        return {
            vencidos: conVencimiento.filter(ref => new Date(ref.membresiaVigencia!.fechaVencimiento!).getTime() <= ahora),
            porVencer: conVencimiento.filter(ref => {
                const fecha = new Date(ref.membresiaVigencia!.fechaVencimiento!).getTime();
                return fecha > ahora && fecha <= limite;
            }).sort((a, b) => new Date(a.membresiaVigencia!.fechaVencimiento!).getTime() - new Date(b.membresiaVigencia!.fechaVencimiento!).getTime()),
        };
    }, [visibleReferidos]);

    const idsReferidosConUsuario = useMemo(
        () =>
            new Set(
                visibleReferidos
                    .map((r) => normalizePublicIdForApi(r.usuarioId))
                    .filter(Boolean),
            ),
        [visibleReferidos],
    );

    const vouchersSinReferidoEnLista = useMemo(
        () =>
            visibleVouchers.filter(
                (v) => !idsReferidosConUsuario.has(normalizePublicIdForApi(v.referidoId)),
            ),
        [visibleVouchers, idsReferidosConUsuario],
    );

    const sumarVouchers = (lista: Voucher[]): number =>
        lista.reduce((s, v) => s + voucherMonto(v), 0);

    const vouchersDeReferido = (ref: ReferidoRelacion): Voucher[] => {
        if (ref.vouchers?.length) return ref.vouchers.filter(isVoucher);
        const uid = normalizePublicIdForApi(ref.usuarioId);
        if (!uid) return [];
        return visibleVouchers.filter(
            (v) => normalizePublicIdForApi(v.referidoId) === uid,
        );
    };

    const handleCopy = (text: string, type: string): void => {
        navigator.clipboard.writeText(text).catch(() => {
            const tmp = document.createElement('textarea');
            tmp.value = text;
            document.body.appendChild(tmp);
            tmp.select();
            document.execCommand('copy');
            document.body.removeChild(tmp);
        });
        toast.success(`${type} copiado al portapapeles`);
    };

    const handleCopyLink = (): void => {
        if (referralData?.enlaceCompleto) handleCopy(referralData.enlaceCompleto, 'Enlace');
    };

    const handleCopyCode = (): void => {
        if (referralData?.codigoReferido) handleCopy(referralData.codigoReferido, 'Código');
    };

    const handleShare = (): void => {
        if (navigator.share && referralData?.enlaceCompleto) {
            navigator.share({
                title: 'Únete a Mabs',
                text: '¡Únete a Mabs con mi código de referido!',
                url: referralData.enlaceCompleto,
            });
        } else {
            toast.info('La función de compartir nativa no está disponible en este navegador.');
        }
    };

    const truncateLink = (link: string, maxLength = 40): string => {
        if (link.length <= maxLength) return link;
        return `${link.substring(0, maxLength / 2)}...${link.substring(link.length - maxLength / 2)}`;
    };

    const handleGenerateLink = async (): Promise<void> => {
        try {
            await refetch();
            toast.success('Enlace de referido generado correctamente con sesion de atribucion activa.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No fue posible generar el enlace de referido.';
            toast.error(message);
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="mb-2">
                    <h1 className="text-3xl font-bold text-foreground">Mi Programa de Membresía</h1>
                    <p className="text-muted-foreground mt-2">Gestiona tus referidos y ganancias</p>
                </div>

                {/* Banner de estado de transacción */}
                {/* Se muestra automáticamente cuando la pasarela redirige  */}
                {/* a esta ruta con ?estado=aprobada|pendiente|rechazada    */}
                <BannerTransaccion />

                {/* Herramientas + Resumen */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Herramientas de referido */}
                    <Card className="shadow-sm border-0 bg-card">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg font-semibold">
                                Herramientas de Referido
                            </CardTitle>
                            <Button
                                onClick={handleGenerateLink}
                                variant="outline" size="sm"
                                disabled={loading}
                                className="gap-2"
                            >
                                {loading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
                                ) : (
                                    <><Share2 className="w-4 h-4" /> Generar Enlace</>
                                )}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Enlace */}
                            <div className="space-y-2">
                                <Label htmlFor="referral-link" className="text-sm font-medium">
                                    Enlace de Referido
                                </Label>
                                <div className="relative flex items-center">
                                    <Input
                                        id="referral-link"
                                        value={referralData?.enlaceCompleto
                                            ? truncateLink(referralData.enlaceCompleto, 50)
                                            : 'Haz clic en "Generar Enlace"'
                                        }
                                        readOnly
                                        className="pr-20 font-mono text-sm bg-muted/30 border-muted"
                                        title={referralData?.enlaceCompleto}
                                    />
                                    <div className="absolute right-1 flex space-x-1">
                                        <Button
                                            onClick={handleCopyLink}
                                            variant="ghost" size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            title="Copiar enlace"
                                            disabled={!referralData}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            onClick={handleShare}
                                            variant="ghost" size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            title="Compartir"
                                            disabled={!referralData}
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Código */}
                            <div className="space-y-2">
                                <Label htmlFor="referral-code" className="text-sm font-medium">
                                    Código de Descuento
                                </Label>
                                <div className="relative flex items-center">
                                    <Input
                                        id="referral-code"
                                        value={referralData?.codigoReferido || 'Haz clic en "Generar Enlace"'}
                                        readOnly
                                        className="pr-12 font-mono text-sm font-semibold bg-muted/30 border-muted"
                                    />
                                    <Button
                                        onClick={handleCopyCode}
                                        variant="ghost" size="icon"
                                        className="absolute right-1 h-8 w-8 text-muted-foreground hover:text-foreground"
                                        title="Copiar código"
                                        disabled={!referralData}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Resumen de referidos */}
                    <Card className="shadow-sm border-0 bg-card">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" /> Resumen
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingReferidos ? (
                                <div className="flex justify-center items-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-3 border-b border-border/40">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <Users className="w-4 h-4" /> Referidos en red
                                        </div>
                                        <span className="text-lg font-semibold text-foreground">{totalReferrals}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-border/40">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <FileText className="w-4 h-4" /> Total de vouchers
                                        </div>
                                        <span className="text-lg font-semibold text-foreground">{visibleVouchers.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-border/40">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <DollarSign className="w-4 h-4" /> Saldo Actual
                                        </div>
                                        <span className="text-lg font-bold text-primary">{formatCurrency(totalEarnings)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-border/40">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <TrendingUp className="w-4 h-4" /> Total Pagado
                                        </div>
                                        <span className="text-lg font-semibold text-primary">{formatCurrency(totalPagado)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3">
                                        <span className="text-sm font-medium text-muted-foreground">Pendiente de Pago</span>
                                        <span className="text-lg font-bold text-accent-foreground">{formatCurrency(totalPendiente)}</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {tieneTenant && <Card className="shadow-sm border-0 bg-card overflow-hidden">
                    <CardHeader className="border-b border-border/40 bg-muted/10 pb-4">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                            Vigencia de membresías de referidos
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">Vencidas y próximas a vencer durante los siguientes 7 días.</p>
                        <div className="flex flex-wrap gap-3 pt-2">
                            <Badge variant="destructive">Vencidos: {alertasVigencia.vencidos.length}</Badge>
                            <Badge variant="outline">Por vencer: {alertasVigencia.porVencer.length}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-5">
                        {loadingReferidos ? (
                            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                        ) : alertasVigencia.vencidos.length === 0 && alertasVigencia.porVencer.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-7 text-center text-sm text-muted-foreground">
                                No hay membresías vencidas ni próximas a vencer.
                            </div>
                        ) : (
                            <div className="grid gap-4 lg:grid-cols-2">
                                {([
                                    { titulo: 'Vencidos', items: alertasVigencia.vencidos, clase: 'border-destructive/30 bg-destructive/5' },
                                    { titulo: 'Por vencer', items: alertasVigencia.porVencer, clase: 'border-amber-500/30 bg-amber-500/5' },
                                ] as const).map(grupo => (
                                    <div key={grupo.titulo} className={`rounded-xl border p-4 ${grupo.clase}`}>
                                        <p className="mb-3 text-sm font-semibold">{grupo.titulo} ({grupo.items.length})</p>
                                        {grupo.items.length === 0 ? <p className="text-sm text-muted-foreground">Sin registros.</p> : (
                                            <div className="space-y-2">
                                                {grupo.items.map(referido => (
                                                    <div key={`${grupo.titulo}-${referido.relacionId}`} className="rounded-lg border border-border/50 bg-background/70 p-3">
                                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                                            <div><p className="text-sm font-medium">{referido.nombre || referido.correo}</p><p className="text-xs text-muted-foreground">{referido.correo}</p></div>
                                                            <Badge variant="outline">{referido.membresiaVigencia?.tipoPagoCodigo || 'MEMBRESÍA'}</Badge>
                                                        </div>
                                                        <p className="mt-2 text-xs">Vencimiento: <span className="font-semibold">{formatDate(referido.membresiaVigencia!.fechaVencimiento!)}</span></p>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="mt-3 gap-2"
                                                            disabled={Boolean(enviandoRenovacionId)}
                                                            onClick={() => void handleEnviarRenovacion(referido)}
                                                        >
                                                            {enviandoRenovacionId === referido.relacionId ? (
                                                                <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                                                            ) : (
                                                                <><Mail className="h-4 w-4" /> Enviar renovación</>
                                                            )}
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>}

                {/* Vouchers de comisiones: un bloque; al desplegar cada referido → jerarquía + vouchers de ese referido */}
                <Card className="shadow-sm border-0 bg-card overflow-hidden">
                    <CardHeader className="border-b border-border/40 bg-muted/10 pb-4">
                        <CardTitle className="text-lg font-semibold flex flex-wrap items-center gap-2">
                            <FileText className="w-5 h-5 text-primary shrink-0" />
                            Vouchers de comisiones
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1 font-normal">
                            Despliega cada persona para ver su{' '}
                            <span className="font-medium text-foreground">nivel en la jerarquía</span> y las{' '}
                            <span className="font-medium text-foreground">comisiones generadas</span> por esa relación.
                        </p>
                        {misDatos && (
                            <div className="mt-4 flex flex-wrap gap-3 text-sm">
                                <span className="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
                                    <span className="text-muted-foreground">Total comisiones</span>{' '}
                                    <span className="font-bold tabular-nums text-primary">{formatCurrency(totalMontoVouchers)}</span>
                                </span>
                                <span className="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
                                    <span className="text-muted-foreground">Referidos en red</span>{' '}
                                    <span className="font-bold tabular-nums">{totalReferrals}</span>
                                </span>
                                <span className="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
                                    <span className="text-muted-foreground">Vouchers</span>{' '}
                                    <span className="font-bold tabular-nums">{visibleVouchers.length}</span>
                                </span>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="pt-6">
                        {loadingReferidos ? (
                            <div className="flex justify-center items-center py-14">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : !misDatos ? (
                            <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                                No hay datos de membresía para mostrar. Completa tu registro o genera tu enlace de referido.
                            </div>
                        ) : referidosOrdenJerarquia.length === 0 && vouchersSinReferidoEnLista.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border/60 bg-muted/15 px-4 py-10 text-center">
                                <p className="text-sm font-medium text-foreground">Aún no tienes referidos ni comisiones registradas</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Cuando alguien entre por tu enlace y se generen comisiones, podrás desplegar cada caso aquí.
                                </p>
                            </div>
                        ) : (
                            <Accordion type="multiple" className="w-full space-y-3">
                                {referidosOrdenJerarquia.map((referido) => {
                                    const vs = vouchersDeReferido(referido);
                                    const subtotal = sumarVouchers(vs);
                                    const nivelVisual = Math.min((Number(referido.nivel) || 0) * 12, 48);
                                    return (
                                        <AccordionItem
                                            key={referido.relacionId}
                                            value={referido.relacionId}
                                            className="overflow-hidden rounded-xl border border-border/50 bg-muted/15"
                                            style={{ marginLeft: nivelVisual }}
                                        >
                                            <AccordionTrigger className="px-4 py-4 hover:no-underline">
                                                <div className="flex w-full flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-4 pr-2">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                                            G{referido.nivel ?? '—'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold text-foreground">
                                                                {referido.nombre || referido.correo}
                                                            </p>
                                                            <p className="truncate text-xs text-muted-foreground">{referido.correo}</p>
                                                            <div className="mt-1 flex flex-wrap gap-1">
                                                                <Badge variant="outline" className="text-[10px] font-normal">
                                                                    {referido.nivelNombre ||
                                                                        (referido.nivel != null ? `Nivel ${referido.nivel}` : 'Sin nivel')}
                                                                </Badge>
                                                                {referido.porcentaje != null && (
                                                                    <Badge variant="secondary" className="text-[10px] font-normal">
                                                                        {referido.porcentaje}% plan
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex shrink-0 flex-wrap items-center gap-3 sm:flex-col sm:items-end">
                                                        <span className="text-xs text-muted-foreground">
                                                            {vs.length} voucher{vs.length !== 1 ? 's' : ''}
                                                        </span>
                                                        <span className="text-lg font-bold tabular-nums text-primary">{formatCurrency(subtotal)}</span>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="border-t border-border/40 bg-muted/10 px-4 pb-4 pt-3">
                                                <div className="space-y-4">
                                                    <div>
                                                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                            Jerarquía de esta relación
                                                        </p>
                                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                                            <div className="rounded-lg border border-border/50 bg-background p-3">
                                                                <p className="text-[10px] uppercase text-muted-foreground">Generación</p>
                                                                <p className="mt-0.5 text-sm font-medium">
                                                                    {referido.nivelNombre ||
                                                                        (referido.nivel != null ? `Nivel ${referido.nivel}` : 'No asignado')}
                                                                </p>
                                                            </div>
                                                            <div className="rounded-lg border border-border/50 bg-background p-3">
                                                                <p className="text-[10px] uppercase text-muted-foreground">Nivel (#)</p>
                                                                <p className="mt-0.5 text-sm font-medium tabular-nums">
                                                                    {referido.nivel != null ? referido.nivel : '—'}
                                                                </p>
                                                            </div>
                                                            <div className="rounded-lg border border-border/50 bg-background p-3">
                                                                <p className="text-[10px] uppercase text-muted-foreground">Ingreso a tu red</p>
                                                                <p className="mt-0.5 text-sm font-medium">{formatDate(referido.fechaRelacion)}</p>
                                                            </div>
                                                            <div className="rounded-lg border border-border/50 bg-background p-3">
                                                                <p className="text-[10px] uppercase text-muted-foreground">Estado referido</p>
                                                                <p className="mt-0.5 text-sm font-medium">
                                                                    {referido.verificado ? 'Verificado' : 'Pendiente'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                            Comisiones generadas por esta persona
                                                        </p>
                                                        {vs.length === 0 ? (
                                                            <p className="rounded-lg border border-dashed border-border/60 bg-background/60 px-3 py-4 text-center text-sm text-muted-foreground">
                                                                Sin vouchers asociados aún para este referido.
                                                            </p>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {vs.map((voucher, vi) => (
                                                                    <div
                                                                        key={voucher._id}
                                                                        className="flex flex-col gap-2 rounded-lg border border-border/40 bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                                                                    >
                                                                        <div className="min-w-0 space-y-1">
                                                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                                                                <span className="inline-flex items-center gap-1">
                                                                                    <Calendar className="h-3.5 w-3.5" />
                                                                                    {formatDate(voucher.fecha)}
                                                                                </span>
                                                                                <span>·</span>
                                                                                <span className="inline-flex items-center gap-1">
                                                                                    <Hash className="h-3.5 w-3.5" />
                                                                                    Ciclo {voucher.ciclo}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-sm text-foreground">{voucher.motivo}</p>
                                                                        </div>
                                                                        <span className="shrink-0 text-lg font-bold tabular-nums text-primary">
                                                                            {formatCurrency(voucher.montoGanado)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                                <p className="pt-1 text-right text-xs text-muted-foreground">
                                                                    Subtotal{' '}
                                                                    <span className="font-semibold text-foreground">{formatCurrency(subtotal)}</span>
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}

                                {vouchersSinReferidoEnLista.length > 0 && (
                                    <AccordionItem
                                        value="__vouchers_sin_ref"
                                        className="overflow-hidden rounded-xl border border-warning/30 bg-warning/[0.04]"
                                    >
                                        <AccordionTrigger className="px-4 py-4 hover:no-underline">
                                            <div className="flex w-full flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between">
                                                <span className="text-sm font-semibold">Otros vouchers (sin coincidencia en tu lista de referidos)</span>
                                                <span className="text-lg font-bold tabular-nums text-primary">
                                                    {formatCurrency(sumarVouchers(vouchersSinReferidoEnLista))}
                                                </span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="border-t border-border/40 px-4 pb-4 pt-3">
                                            <p className="mb-3 text-xs text-muted-foreground">
                                                Estos movimientos tienen un referido distinto o datos históricos; siguen sumando a tu total.
                                            </p>
                                            <div className="space-y-2">
                                                {vouchersSinReferidoEnLista.map((voucher) => (
                                                    <div
                                                        key={voucher._id}
                                                        className="flex flex-col gap-2 rounded-lg border border-border/40 bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                                                    >
                                                        <div className="min-w-0 text-xs text-muted-foreground">
                                                            {formatDate(voucher.fecha)} · Ciclo {voucher.ciclo}
                                                            <p className="mt-1 text-sm text-foreground">{voucher.motivo}</p>
                                                        </div>
                                                        <span className="font-bold tabular-nums text-primary">
                                                            {formatCurrency(voucher.montoGanado)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                )}
                            </Accordion>
                        )}
                    </CardContent>
                </Card>
                <KPIUsuarioMembresia showTable={false} />
            </div>
        </div>
    );
}
