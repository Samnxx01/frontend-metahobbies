import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useReferralLink } from '@/app/hooks/useReferralLink';
import { apiFetch } from '@/app/services/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Lucide icons
import {
    Copy, Share2, DollarSign, Users, TrendingUp, Loader2,
    Calendar, Hash, FileText, CheckCircle2, XCircle, Clock, X,
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
}

interface UsuarioReferido {
    usuarioId: string;
    correo: string;
    saldoInicial: number;
    saldoActual: number;
    totalPagado: number;
    totalPendiente: number;
    vouchers: Voucher[];
}

interface ReferidosResponse {
    ok: boolean;
    esAdmin: boolean;
    usuarios: UsuarioReferido[];
}

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
        bg: 'bg-emerald-50 dark:bg-emerald-950/20',
        border: 'border-emerald-200/60 dark:border-emerald-800/40',
        iconColor: 'text-emerald-500',
        titleColor: 'text-emerald-700 dark:text-emerald-400',
    },
    pendiente: {
        icon: <Clock className="w-6 h-6 shrink-0" />,
        titulo: 'Pago en verificación',
        descripcion: 'Tu transacción está siendo procesada. Te notificaremos por correo cuando tu membresía esté activa.',
        bg: 'bg-amber-50 dark:bg-amber-950/20',
        border: 'border-amber-200/60 dark:border-amber-800/40',
        iconColor: 'text-amber-500',
        titleColor: 'text-amber-700 dark:text-amber-400',
    },
    rechazada: {
        icon: <XCircle className="w-6 h-6 shrink-0" />,
        titulo: 'Pago no procesado',
        descripcion: 'No pudimos completar tu transacción. Verifica tu método de pago e inténtalo de nuevo.',
        bg: 'bg-red-50 dark:bg-red-950/20',
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

export default function MembershipDashboard(): React.ReactElement {
    const { referralData, loading, refetch } = useReferralLink();
    const [referidosData, setReferidosData] = useState<ReferidosResponse | null>(null);
    const [loadingReferidos, setLoadingReferidos] = useState<boolean>(true);

    useEffect(() => {
        fetchReferidos();
    }, []);

    const fetchReferidos = async (): Promise<void> => {
        try {
            setLoadingReferidos(true);
            const response = await apiFetch('/referido/listarMiMembresia', { method: 'GET' });
            setReferidosData(response);
        } catch (err) {
            console.error('Error al cargar datos de referidos:', err);
            toast.error('Error al cargar datos de referidos');
        } finally {
            setLoadingReferidos(false);
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
    const totalReferrals = misDatos?.vouchers?.length || 0;
    const totalEarnings = misDatos?.saldoActual || 0;
    const totalPagado = misDatos?.totalPagado || 0;
    const totalPendiente = misDatos?.totalPendiente || 0;
    const visibleVouchers = misDatos?.vouchers ?? [];

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
        await refetch();
        toast.success('Enlace de referido generado correctamente');
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
                                            <Users className="w-4 h-4" /> Total de Vouchers
                                        </div>
                                        <span className="text-lg font-semibold text-foreground">{totalReferrals}</span>
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
                                        <span className="text-lg font-semibold text-emerald-600">{formatCurrency(totalPagado)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3">
                                        <span className="text-sm font-medium text-muted-foreground">Pendiente de Pago</span>
                                        <span className="text-lg font-bold text-amber-600">{formatCurrency(totalPendiente)}</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Tabla de vouchers */}
                <Card className="shadow-sm border-0 bg-card">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold">Mis Vouchers de Comisiones</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingReferidos ? (
                            <div className="flex justify-center items-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : !misDatos || visibleVouchers.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No tienes vouchers de comisiones aún</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {visibleVouchers.map((voucher, index) => (
                                    <div
                                        key={voucher._id}
                                        className="group relative p-4 rounded-lg border border-border/40 hover:border-primary/30 hover:bg-muted/20 transition-all duration-200"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <span className="text-sm font-bold text-primary">#{index + 1}</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-sm text-muted-foreground">{formatDate(voucher.fecha)}</span>
                                                        <span className="text-muted-foreground">•</span>
                                                        <Hash className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-sm font-medium text-foreground">Ciclo {voucher.ciclo}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-sm text-muted-foreground">{voucher.motivo}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-end">
                                                <span className="text-2xl font-bold text-primary">
                                                    {formatCurrency(voucher.montoGanado)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
                <KPIUsuarioMembresia showTable={false} />
            </div>
        </div>
    );
}
