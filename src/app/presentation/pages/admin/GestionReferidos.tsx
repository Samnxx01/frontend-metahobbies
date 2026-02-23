import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/app/services/api';
import { toast } from 'react-toastify';
// Shadcn UI components
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
// Lucide icons
import {
    Loader2, DollarSign, Users, TrendingUp, Calendar, CheckCircle,
    Clock, Network, Mail, Hash, Eye, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';

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

// Componente auxiliar para el diseño del ticket
const DetailBox = ({ icon, label, value, mono = false }: { icon: React.ReactNode, label: string, value: string | number, mono?: boolean }) => (
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

function GestionReferidos(): React.ReactElement {
    const [loading, setLoading] = useState<boolean>(true);
    const [data, setData] = useState<ReferidosResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedVoucher, setSelectedVoucher] = useState<VoucherDetail | null>(null);
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [loadingVoucherDetail, setLoadingVoucherDetail] = useState<boolean>(false);
    const [usersCache, setUsersCache] = useState<Map<string, UserDetail>>(new Map());

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
            setData(response);
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

    const fetchUserDetails = async (userId: string): Promise<UserDetail | null> => {
        if (usersCache.has(userId)) {
            return usersCache.get(userId)!;
        }

        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
            const response = await apiFetch(`${API_BASE_URL}/registro/listarRegistro`, {
                method: 'GET'
            });
            if (response?.usuarios) {
                const newCache = new Map(usersCache);
                response.usuarios.forEach((user: any) => {
                    newCache.set(user._id, {
                        _id: user._id,
                        correo: user.correo,
                        nombre: user.nombre,
                        apellido: user.apellido
                    });
                });
                setUsersCache(newCache);
                return newCache.get(userId) || null;
            }
            return null;
        } catch (error) {
            console.error('Error al obtener detalles del usuario:', error);
            return null;
        }
    };

    const handleVoucherClick = async (voucher: Voucher, usuarioPropietarioId: string, usuarioPropietarioEmail: string): Promise<void> => {
        setLoadingVoucherDetail(true);
        setModalOpen(true);

        try {
            const [propietario, referido] = await Promise.all([
                fetchUserDetails(usuarioPropietarioId),
                fetchUserDetails(voucher.referidoId)
            ]);

            const voucherDetail: VoucherDetail = {
                ...voucher,
                usuarioPropietario: propietario || { _id: usuarioPropietarioId, correo: usuarioPropietarioEmail },
                usuarioReferido: referido || { _id: voucher.referidoId, correo: 'No disponible' }
            };

            setSelectedVoucher(voucherDetail);
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
    const totalComisionesGlobales = data?.usuarios.reduce((acc, user) => acc + user.saldoActual, 0) || 0;
    const totalPagadoGlobal = data?.usuarios.reduce((acc, user) => acc + user.totalPagado, 0) || 0;
    const totalPendienteGlobal = data?.usuarios.reduce((acc, user) => acc + user.totalPendiente, 0) || 0;

    return (
        <div className="p-4 md:p-6 lg:p-8 bg-background min-h-screen">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header Minimalista */}
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

                {/* KPIs Minimalistas */}
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
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
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
                                    <Clock className="h-5 w-5 text-amber-600" />
                                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
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

                {/* Lista de Usuarios Minimalista */}
                <div className="space-y-3">
                    {data?.usuarios.map((usuario) => (
                        <Card key={usuario.usuarioId} className="border-0 shadow-sm hover:shadow-md transition-all">
                            <CardContent className="p-4 md:p-6">
                                {/* Header del Usuario */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <Mail className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-foreground truncate">{usuario.correo}</p>
                                            <p className="text-xs text-muted-foreground font-mono truncate">
                                                {usuario.usuarioId}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="ml-2 flex-shrink-0">
                                        {usuario.vouchers.length} vouchers
                                    </Badge>
                                </div>

                                {/* Stats Grid Minimalista */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                    <div className="p-3 rounded-lg bg-muted/30">
                                        <p className="text-xs text-muted-foreground mb-1">Saldo Inicial</p>
                                        <p className="text-sm font-semibold">{formatCurrency(usuario.saldoInicial)}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                                        <p className="text-xs text-muted-foreground mb-1">Saldo Actual</p>
                                        <p className="text-sm font-bold text-primary">{formatCurrency(usuario.saldoActual)}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                                        <p className="text-xs text-muted-foreground mb-1">Pagado</p>
                                        <p className="text-sm font-semibold text-green-600">{formatCurrency(usuario.totalPagado)}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                                        <p className="text-xs text-muted-foreground mb-1">Pendiente</p>
                                        <p className="text-sm font-semibold text-amber-600">{formatCurrency(usuario.totalPendiente)}</p>
                                    </div>
                                </div>

                                {/* Acordeón Minimalista */}
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
                                                    {usuario.vouchers.map((voucher) => (
                                                        <div
                                                            key={voucher._id}
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
                                                                                    ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400'
                                                                                    : 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400'
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
                                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                                        <div className="flex items-center gap-1">
                                                                            <Calendar className="h-3 w-3" />
                                                                            {formatDate(voucher.fecha)}
                                                                        </div>
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
                    ))}
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

            {/* Modal - Nuevo Diseño tipo Ticket/Voucher */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
                    {loadingVoucherDetail ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">Cargando detalles...</span>
                        </div>
                    ) : selectedVoucher ? (
                        <div className="flex flex-col">
                            {/* Cabecera Tipo Ticket */}
                            <div className="bg-primary px-6 py-8 text-primary-foreground relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="w-32 h-32" /></div>
                                <div className="relative z-10 text-center space-y-2">
                                    <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-widest">Comisión Generada</p>
                                    <h2 className="text-4xl font-bold tracking-tight">{formatCurrency(selectedVoucher.montoGanado)}</h2>
                                    <Badge className={`mt-2 border-0 ${selectedVoucher.status === 'pagado' ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-black/20 text-white hover:bg-black/30'}`}>
                                        {selectedVoucher.status === 'pagado' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                                        {selectedVoucher.status.toUpperCase()}
                                    </Badge>
                                </div>
                            </div>

                            {/* Cuerpo del Ticket */}
                            <ScrollArea className="max-h-[60vh]">
                                <div className="p-6 space-y-6 bg-card">

                                    {/* Grid de Metadatos */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <DetailBox icon={<Calendar className="w-4 h-4" />} label="Fecha" value={formatDate(selectedVoucher.fecha)} />
                                        <DetailBox icon={<Network className="w-4 h-4" />} label="Nivel" value={`Generación ${selectedVoucher.ciclo}`} />
                                        <div className="col-span-2">
                                            <DetailBox icon={<Hash className="w-4 h-4" />} label="ID Transacción" value={selectedVoucher._id} mono />
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Flujo de Dinero (From -> To) */}
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 bg-green-100 p-2 rounded-full">
                                                <ArrowUpRight className="w-4 h-4 text-green-700" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-semibold uppercase">Generado por (Referido)</p>
                                                <p className="text-sm font-medium mt-0.5">
                                                    {selectedVoucher.usuarioReferido?.nombre
                                                        ? `${selectedVoucher.usuarioReferido.nombre} ${selectedVoucher.usuarioReferido.apellido || ''}`
                                                        : 'Usuario Referido'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{selectedVoucher.usuarioReferido?.correo}</p>
                                            </div>
                                        </div>

                                        <div className="pl-5 ml-4 border-l-2 border-dashed h-4 border-muted-foreground/30" />

                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 bg-blue-100 p-2 rounded-full">
                                                <ArrowDownLeft className="w-4 h-4 text-blue-700" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-semibold uppercase">Recibido por (Beneficiario)</p>
                                                <p className="text-sm font-medium mt-0.5">
                                                    {selectedVoucher.usuarioPropietario?.nombre
                                                        ? `${selectedVoucher.usuarioPropietario.nombre} ${selectedVoucher.usuarioPropietario.apellido || ''}`
                                                        : 'Usuario Beneficiario'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{selectedVoucher.usuarioPropietario?.correo}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-muted/30 p-3 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground">Motivo: <span className="font-medium text-foreground">{selectedVoucher.motivo}</span></p>
                                    </div>
                                </div>
                            </ScrollArea>

                            <div className="p-4 bg-muted/20 border-t text-center">
                                <Button variant="outline" className="w-full" onClick={() => setModalOpen(false)}>Cerrar Recibo</Button>
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>

        </div>
    );
}

export default GestionReferidos;