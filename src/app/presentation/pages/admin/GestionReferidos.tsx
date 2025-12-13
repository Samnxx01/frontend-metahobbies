import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/app/services/api';
import { toast } from 'react-toastify';

// Shadcn UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Lucide icons
import { Loader2, DollarSign, Users, TrendingUp, Calendar, CheckCircle, Clock, Network, Mail, Hash, Eye, X } from 'lucide-react';

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
        // Verificar si ya está en caché
        if (usersCache.has(userId)) {
            return usersCache.get(userId)!;
        }

        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
            const response = await apiFetch(`${API_BASE_URL}/registro/listarRegistro`, {
                method: 'GET'
            });

            if (response?.usuarios) {
                // Crear un mapa con todos los usuarios
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

                // Retornar el usuario buscado
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
            // Obtener detalles del usuario propietario y del referido
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
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                    <p className="font-semibold">Error al cargar datos</p>
                    <p className="text-sm">{error}</p>
                </div>
            </div>
        );
    }

    const totalUsuarios = data?.usuarios.length || 0;
    const totalComisionesGlobales = data?.usuarios.reduce((acc, user) => acc + user.saldoActual, 0) || 0;
    const totalPagadoGlobal = data?.usuarios.reduce((acc, user) => acc + user.totalPagado, 0) || 0;
    const totalPendienteGlobal = data?.usuarios.reduce((acc, user) => acc + user.totalPendiente, 0) || 0;

    return (
        <div className="p-4 md:p-6 lg:p-8 bg-background">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <Network className="h-8 w-8 text-primary" />
                        Gestión de Referidos y Comisiones
                    </h1>
                 
                </div>

                {/* KPIs Globales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="shadow-sm border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Usuarios</p>
                                    <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">{totalUsuarios}</h3>
                                </div>
                                <Users className="h-10 w-10 text-blue-600 dark:text-blue-400 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Comisiones</p>
                                    <h3 className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                                        {formatCurrency(totalComisionesGlobales)}
                                    </h3>
                                </div>
                                <TrendingUp className="h-10 w-10 text-green-600 dark:text-green-400 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-0 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Pendiente Pago</p>
                                    <h3 className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">
                                        {formatCurrency(totalPendienteGlobal)}
                                    </h3>
                                </div>
                                <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Pagado</p>
                                    <h3 className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                                        {formatCurrency(totalPagadoGlobal)}
                                    </h3>
                                </div>
                                <CheckCircle className="h-10 w-10 text-purple-600 dark:text-purple-400 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Lista de Usuarios con Referidos */}
                <div className="space-y-4">
                    {data?.usuarios.map((usuario) => (
                        <Card key={usuario.usuarioId} className="shadow-md border hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Users className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{usuario.correo}</CardTitle>
                                            <p className="text-sm text-muted-foreground">
                                                ID: {usuario.usuarioId.substring(0, 12)}...
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-sm font-semibold px-3 py-1 w-fit">
                                        {usuario.vouchers.length} Vouchers
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* Información de Saldos */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Saldo Inicial</p>
                                        <p className="text-sm font-semibold text-foreground">
                                            {formatCurrency(usuario.saldoInicial)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Saldo Actual</p>
                                        <p className="text-sm font-bold text-primary">
                                            {formatCurrency(usuario.saldoActual)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Total Pagado</p>
                                        <p className="text-sm font-semibold text-green-600">
                                            {formatCurrency(usuario.totalPagado)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Pendiente</p>
                                        <p className="text-sm font-semibold text-amber-600">
                                            {formatCurrency(usuario.totalPendiente)}
                                        </p>
                                    </div>
                                </div>

                                <Separator />

                                {/* Acordeón de Vouchers */}
                                {usuario.vouchers.length > 0 ? (
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="vouchers" className="border-none">
                                            <AccordionTrigger className="text-sm font-semibold hover:no-underline py-2">
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="h-4 w-4 text-primary" />
                                                    Ver Vouchers de Comisiones ({usuario.vouchers.length})
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-3 pt-2">
                                                    {usuario.vouchers.map((voucher) => (
                                                        <div
                                                            key={voucher._id}
                                                            className="p-4 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                                                            onClick={() => handleVoucherClick(voucher, usuario.usuarioId, usuario.correo)}
                                                        >
                                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                                <div className="space-y-2 flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge
                                                                            variant={voucher.status === 'pagado' ? 'default' : 'outline'}
                                                                            className={
                                                                                voucher.status === 'pagado'
                                                                                    ? 'bg-green-100 text-green-700 border-green-300'
                                                                                    : 'bg-amber-100 text-amber-700 border-amber-300'
                                                                            }
                                                                        >
                                                                            {voucher.status === 'pagado' ? (
                                                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                                            ) : (
                                                                                <Clock className="h-3 w-3 mr-1" />
                                                                            )}
                                                                            {voucher.status.toUpperCase()}
                                                                        </Badge>
                                                                        <Badge variant="secondary" className="text-xs">
                                                                            Ciclo {voucher.ciclo}
                                                                        </Badge>
                                                                        <Badge variant="secondary" className="text-xs">
                                                                            {voucher.motivo}
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                                        <Calendar className="h-3 w-3" />
                                                                        {formatDate(voucher.fecha)}
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Referido: {voucher.referidoId.substring(0, 12)}...
                                                                    </p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-2xl font-bold text-primary">
                                                                        {formatCurrency(voucher.montoGanado)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No hay vouchers disponibles
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {data?.usuarios.length === 0 && (
                    <Card className="shadow-sm">
                        <CardContent className="p-12 text-center">
                            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold mb-2">No hay usuarios con referidos</h3>
                            <p className="text-sm text-muted-foreground">
                                Los usuarios con comisiones aparecerán aquí
                            </p>
                        </CardContent>
                    </Card>
                )}

            </div>

            {/* Modal de Detalle del Voucher */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <DollarSign className="h-6 w-6 text-primary" />
                            Detalle del Voucher
                        </DialogTitle>
                    </DialogHeader>

                    {loadingVoucherDetail ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : selectedVoucher ? (
                        <div className="space-y-6">
                            {/* Estado del Voucher */}
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                                <span className="text-sm font-medium text-muted-foreground">Estado</span>
                                <Badge
                                    variant={selectedVoucher.status === 'pagado' ? 'default' : 'outline'}
                                    className={`text-base px-4 py-1 ${
                                        selectedVoucher.status === 'pagado'
                                            ? 'bg-green-100 text-green-700 border-green-300'
                                            : 'bg-amber-100 text-amber-700 border-amber-300'
                                    }`}
                                >
                                    {selectedVoucher.status === 'pagado' ? (
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                    ) : (
                                        <Clock className="h-4 w-4 mr-2" />
                                    )}
                                    {selectedVoucher.status.toUpperCase()}
                                </Badge>
                            </div>

                            {/* Monto */}
                            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                                <CardContent className="p-6 text-center">
                                    <p className="text-sm text-muted-foreground mb-2">Monto de la Comisión</p>
                                    <h2 className="text-4xl font-bold text-primary">
                                        {formatCurrency(selectedVoucher.montoGanado)}
                                    </h2>
                                </CardContent>
                            </Card>

                            {/* Información del Voucher */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">ID del Voucher</p>
                                    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                                        <Hash className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-sm font-mono">{selectedVoucher._id}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Fecha</p>
                                    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-sm">{formatDate(selectedVoucher.fecha)}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Ciclo/Nivel</p>
                                    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                                        <Network className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-sm font-semibold">Generación {selectedVoucher.ciclo}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Motivo</p>
                                    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                                        <Badge variant="secondary" className="text-sm">
                                            {selectedVoucher.motivo}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Usuario Propietario */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Usuario que Recibe la Comisión
                                </h3>
                                <Card>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Users className="h-6 w-6 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                {selectedVoucher.usuarioPropietario?.nombre && (
                                                    <p className="font-semibold text-lg">
                                                        {selectedVoucher.usuarioPropietario.nombre}{' '}
                                                        {selectedVoucher.usuarioPropietario.apellido}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Mail className="h-3 w-3" />
                                                    {selectedVoucher.usuarioPropietario?.correo}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-muted-foreground font-mono bg-muted/30 p-2 rounded">
                                            ID: {selectedVoucher.usuarioPropietario?._id}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Separator />

                            {/* Usuario Referido */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                                    <Network className="h-4 w-4" />
                                    Usuario Referido que Generó la Comisión
                                </h3>
                                <Card className="border-primary/20">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                                <Users className="h-6 w-6 text-green-600" />
                                            </div>
                                            <div className="flex-1">
                                                {selectedVoucher.usuarioReferido?.nombre && (
                                                    <p className="font-semibold text-lg">
                                                        {selectedVoucher.usuarioReferido.nombre}{' '}
                                                        {selectedVoucher.usuarioReferido.apellido}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Mail className="h-3 w-3" />
                                                    {selectedVoucher.usuarioReferido?.correo}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-muted-foreground font-mono bg-muted/30 p-2 rounded">
                                            ID: {selectedVoucher.usuarioReferido?._id}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Botón para cerrar */}
                            <div className="flex justify-end pt-4">
                                <Button variant="outline" onClick={() => setModalOpen(false)}>
                                    Cerrar
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
