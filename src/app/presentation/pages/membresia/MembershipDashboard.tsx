import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useReferralLink } from '@/app/hooks/useReferralLink';
import { apiFetch } from '@/app/services/api';

// Shadcn UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';

// Lucide icons
import { Copy, Share2, DollarSign, Users, TrendingUp, Loader2, Calendar, Hash, FileText } from 'lucide-react';

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
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
            const response = await apiFetch(`${API_BASE_URL}/referido/listarMiMembresia`, {
                method: 'GET'
            });
            setReferidosData(response);
        } catch (err) {
            console.error('Error al cargar datos de referidos:', err);
            toast.error('Error al cargar datos de referidos');
        } finally {
            setLoadingReferidos(false);
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
            day: 'numeric'
        });
    };

    // Calcular estadísticas desde los datos reales
    // El endpoint devuelve la información del usuario actual (no es admin, así que solo hay un usuario)
    const misDatos = referidosData?.usuarios?.[0];
    const totalReferrals = misDatos?.vouchers?.length || 0;
    const totalEarnings = misDatos?.saldoActual || 0;
    const totalPagado = misDatos?.totalPagado || 0;
    const totalPendiente = misDatos?.totalPendiente || 0;
    // Mostrar en la tabla sólo los vouchers que NO estén en estado 'pendiente'
    const visibleVouchers = misDatos?.vouchers?.filter(v => true) || [];

    const handleCopy = (text: string, type: string): void => {
        const tempInput = document.createElement('textarea');
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        toast.success(`${type} copiado al portapapeles`);
    };

    const handleCopyLink = (): void => {
        if (referralData?.enlaceCompleto) {
            handleCopy(referralData.enlaceCompleto, 'Enlace');
        }
    };

    const handleCopyCode = (): void => {
        if (referralData?.codigoReferido) {
            handleCopy(referralData.codigoReferido, 'Código');
        }
    };

    const handleShare = (): void => {
        if (navigator.share && referralData?.enlaceCompleto) {
            navigator.share({
                title: 'Únete a Mabs',
                text: '¡Únete a Mabs con mi código de referido!',
                url: referralData.enlaceCompleto
            });
        } else {
            toast.info('La función de compartir nativa no está disponible en este navegador.');
        }
    };

    // Funciรณn para truncar el enlace visualmente
    const truncateLink = (link: string, maxLength: number = 40): string => {
        if (link.length <= maxLength) return link;
        const start = link.substring(0, maxLength / 2);
        const end = link.substring(link.length - maxLength / 2);
        return `${start}...${end}`;
    };

    const handleGenerateLink = async (): Promise<void> => {
        await refetch();
        toast.success('Enlace de referido generado correctamente');
    };

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header Section - Dashboard style */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">
                        Mi Programa de Membresía
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Gestiona tus referidos y ganancias
                    </p>
                </div>

                {/* --- SECCIÓN PRINCIPAL DE HERRAMIENTAS Y ESTADÍSTICAS --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Columna Izquierda (Enlaces y Códigos) - Sin bordes */}
                    <Card className="shadow-sm border-0 bg-card">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg font-semibold">
                                Herramientas de Referido
                            </CardTitle>
                            <Button
                                onClick={handleGenerateLink}
                                variant="outline"
                                size="sm"
                                disabled={loading}
                                className="gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Generando...
                                    </>
                                ) : (
                                    <>
                                        <Share2 className="w-4 h-4" />
                                        Generar Enlace
                                    </>
                                )}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Enlace de Referido */}
                            <div className="space-y-2">
                                <Label htmlFor="referral-link" className="text-sm font-medium">
                                    Enlace de Referido
                                </Label>
                                <div className="relative flex items-center">
                                    <Input
                                        id="referral-link"
                                        value={referralData?.enlaceCompleto ? truncateLink(referralData.enlaceCompleto, 50) : 'Haz clic en "Generar Enlace"'}
                                        readOnly
                                        className="pr-20 font-mono text-sm bg-muted/30 border-muted"
                                        title={referralData?.enlaceCompleto}
                                    />
                                    <div className="absolute right-1 flex space-x-1">
                                        <Button
                                            onClick={handleCopyLink}
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            title="Copiar Enlace"
                                            disabled={!referralData}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            onClick={handleShare}
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            title="Compartir"
                                            disabled={!referralData}
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Código de Descuento */}
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
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 h-8 w-8 text-muted-foreground hover:text-foreground"
                                        title="Copiar Código"
                                        disabled={!referralData}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Columna Derecha (Resumen de Referidos) - Sin bordes */}
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
                                            <Users className="w-4 h-4" />
                                            Total de Vouchers
                                        </div>
                                        <span className="text-lg font-semibold text-foreground">
                                            {totalReferrals}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center py-3 border-b border-border/40">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <DollarSign className="w-4 h-4" />
                                            Saldo Actual
                                        </div>
                                        <span className="text-lg font-bold text-primary">
                                            {formatCurrency(totalEarnings)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center py-3 border-b border-border/40">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <TrendingUp className="w-4 h-4" />
                                            Total Pagado
                                        </div>
                                        <span className="text-lg font-semibold text-green-600">
                                            {formatCurrency(totalPagado)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center py-3">
                                        <span className="text-sm font-medium text-muted-foreground">
                                            Pendiente de Pago
                                        </span>
                                        <span className="text-lg font-bold text-orange-600">
                                            {formatCurrency(totalPendiente)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* --- TABLA DE VOUCHERS DETALLADA --- */}
                <Card className="shadow-sm border-0 bg-card">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold">
                            Mis Vouchers de Comisiones
                        </CardTitle>
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
                                            {/* Lado izquierdo: Info principal */}
                                            <div className="flex items-start gap-4">
                                                {/* Número de voucher */}
                                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <span className="text-sm font-bold text-primary">
                                                        #{index + 1}
                                                    </span>
                                                </div>

                                                {/* Detalles */}
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-sm text-muted-foreground">
                                                            {formatDate(voucher.fecha)}
                                                        </span>
                                                        <span className="text-muted-foreground">•</span>
                                                        <Hash className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-sm font-medium text-foreground">
                                                            Ciclo {voucher.ciclo}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-sm text-muted-foreground">
                                                            {voucher.motivo}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Lado derecho: Monto */}
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
            </div>
        </div>
    );
}
