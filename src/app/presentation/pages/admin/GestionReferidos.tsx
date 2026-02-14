// import React, { useState, useEffect } from 'react';
// import { apiFetch } from '@/app/services/api';
// import { toast } from 'react-toastify';

// // Shadcn UI components
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
// import { Separator } from '@/components/ui/separator';
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// import { Button } from '@/components/ui/button';
// import { ScrollArea } from '@/components/ui/scroll-area';

// // Lucide icons
// import { Loader2, DollarSign, Users, TrendingUp, Calendar, CheckCircle, Clock, Network, Mail, Hash, ChevronRight, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

// // --- INTERFACES (Sin cambios) ---
// interface Voucher {
//     _id: string;
//     referidoId: string;
//     montoGanado: number;
//     ciclo: number;
//     fecha: string;
//     status: 'pendiente' | 'pagado';
//     motivo: string;
// }

// interface UsuarioReferido {
//     usuarioId: string;
//     correo: string;
//     saldoInicial: number;
//     saldoActual: number;
//     totalPagado: number;
//     totalPendiente: number;
//     vouchers: Voucher[];
// }

// interface ReferidosResponse {
//     ok: boolean;
//     esAdmin: boolean;
//     usuarios: UsuarioReferido[];
// }

// interface UserDetail {
//     _id: string;
//     correo: string;
//     nombre?: string;
//     apellido?: string;
// }

// interface VoucherDetail extends Voucher {
//     usuarioPropietario?: UserDetail;
//     usuarioReferido?: UserDetail;
// }

// function GestionReferidos(): React.ReactElement {
//     // --- LÓGICA (Sin cambios) ---
//     const [loading, setLoading] = useState<boolean>(true);
//     const [data, setData] = useState<ReferidosResponse | null>(null);
//     const [error, setError] = useState<string | null>(null);
//     const [selectedVoucher, setSelectedVoucher] = useState<VoucherDetail | null>(null);
//     const [modalOpen, setModalOpen] = useState<boolean>(false);
//     const [loadingVoucherDetail, setLoadingVoucherDetail] = useState<boolean>(false);
//     const [usersCache, setUsersCache] = useState<Map<string, UserDetail>>(new Map());

//     useEffect(() => {
//         fetchReferidos();
//     }, []);

//     const fetchReferidos = async (): Promise<void> => {
//         try {
//             setLoading(true);
//             setError(null);
//             const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
//             const response = await apiFetch(`${API_BASE_URL}/referido/listarSaldoRefere`, {
//                 method: 'GET'
//             });
//             setData(response);
//         } catch (err) {
//             const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos de referidos';
//             setError(errorMessage);
//             toast.error(errorMessage);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const formatCurrency = (amount: number): string => {
//         return new Intl.NumberFormat('es-CO', {
//             style: 'currency',
//             currency: 'COP',
//             minimumFractionDigits: 0,
//             maximumFractionDigits: 0
//         }).format(amount);
//     };

//     const formatDate = (dateString: string): string => {
//         return new Date(dateString).toLocaleDateString('es-CO', {
//             year: 'numeric',
//             month: 'short',
//             day: 'numeric',
//         });
//     };

//     const fetchUserDetails = async (userId: string): Promise<UserDetail | null> => {
//         if (usersCache.has(userId)) return usersCache.get(userId)!;
//         try {
//             const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
//             const response = await apiFetch(`${API_BASE_URL}/registro/listarRegistro`, { method: 'GET' });
//             if (response?.usuarios) {
//                 const newCache = new Map(usersCache);
//                 response.usuarios.forEach((user: any) => {
//                     newCache.set(user._id, {
//                         _id: user._id,
//                         correo: user.correo,
//                         nombre: user.nombre,
//                         apellido: user.apellido
//                     });
//                 });
//                 setUsersCache(newCache);
//                 return newCache.get(userId) || null;
//             }
//             return null;
//         } catch (error) {
//             console.error(error);
//             return null;
//         }
//     };

//     const handleVoucherClick = async (voucher: Voucher, usuarioPropietarioId: string, usuarioPropietarioEmail: string): Promise<void> => {
//         setLoadingVoucherDetail(true);
//         setModalOpen(true);
//         try {
//             const [propietario, referido] = await Promise.all([
//                 fetchUserDetails(usuarioPropietarioId),
//                 fetchUserDetails(voucher.referidoId)
//             ]);
//             const voucherDetail: VoucherDetail = {
//                 ...voucher,
//                 usuarioPropietario: propietario || { _id: usuarioPropietarioId, correo: usuarioPropietarioEmail },
//                 usuarioReferido: referido || { _id: voucher.referidoId, correo: 'No disponible' }
//             };
//             setSelectedVoucher(voucherDetail);
//         } catch (error) {
//             console.error(error);
//             toast.error('Error al cargar detalle');
//         } finally {
//             setLoadingVoucherDetail(false);
//         }
//     };

//     // --- UI: ESTADOS DE CARGA Y ERROR ---
//     if (loading) {
//         return (
//             <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
//                 <Loader2 className="w-10 h-10 animate-spin text-primary" />
//                 <p className="text-muted-foreground animate-pulse">Cargando comisiones...</p>
//             </div>
//         );
//     }

//     if (error) {
//         return (
//             <div className="p-8 flex justify-center">
//                 <div className="bg-destructive/5 border border-destructive/20 text-destructive px-6 py-4 rounded-xl max-w-md text-center">
//                     <p className="font-semibold mb-1">Hubo un problema</p>
//                     <p className="text-sm opacity-90">{error}</p>
//                     <Button variant="outline" className="mt-4 border-destructive/30 hover:bg-destructive/10" onClick={fetchReferidos}>Reintentar</Button>
//                 </div>
//             </div>
//         );
//     }

//     const totalUsuarios = data?.usuarios.length || 0;
//     const totalComisionesGlobales = data?.usuarios.reduce((acc, user) => acc + user.saldoActual, 0) || 0;
//     const totalPagadoGlobal = data?.usuarios.reduce((acc, user) => acc + user.totalPagado, 0) || 0;
//     const totalPendienteGlobal = data?.usuarios.reduce((acc, user) => acc + user.totalPendiente, 0) || 0;

//     // --- RENDERIZADO PRINCIPAL ---
//     return (
//         <div className="p-4 md:p-8 bg-background min-h-screen">
//             <div className="max-w-7xl mx-auto space-y-10">

//                 {/* 1. Header Minimalista */}
//                 <div>
//                     <h1 className="text-3xl font-light tracking-tight text-foreground flex items-center gap-3">
//                         <span className="p-2 bg-primary/10 rounded-lg"><Network className="h-6 w-6 text-primary" /></span>
//                         Gestión de Referidos
//                     </h1>
//                     <p className="text-muted-foreground mt-2 ml-1">Administra comisiones, saldos y pagos de la red.</p>
//                 </div>

//                 {/* 2. KPIs Limpios (Sin degradados pesados) */}
//                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
//                     <KpiCard
//                         title="Total Usuarios"
//                         value={totalUsuarios.toString()}
//                         icon={<Users className="h-5 w-5 text-blue-600" />}
//                         bgIcon="bg-blue-50 dark:bg-blue-900/20"
//                     />
//                     <KpiCard
//                         title="Comisiones Totales"
//                         value={formatCurrency(totalComisionesGlobales)}
//                         icon={<TrendingUp className="h-5 w-5 text-green-600" />}
//                         bgIcon="bg-green-50 dark:bg-green-900/20"
//                     />
//                     <KpiCard
//                         title="Pendiente Pago"
//                         value={formatCurrency(totalPendienteGlobal)}
//                         icon={<Clock className="h-5 w-5 text-amber-600" />}
//                         bgIcon="bg-amber-50 dark:bg-amber-900/20"
//                     />
//                     <KpiCard
//                         title="Total Pagado"
//                         value={formatCurrency(totalPagadoGlobal)}
//                         icon={<CheckCircle className="h-5 w-5 text-purple-600" />}
//                         bgIcon="bg-purple-50 dark:bg-purple-900/20"
//                     />
//                 </div>

//                 <Separator className="bg-border/60" />

//                 {/* 3. Lista de Usuarios (Diseño más plano) */}
//                 <div className="space-y-6">
//                     <div className="flex items-center justify-between">
//                         <h2 className="text-lg font-semibold text-foreground">Listado de Afiliados</h2>
//                         <Badge variant="secondary" className="font-normal">{data?.usuarios.length} Registros</Badge>
//                     </div>

//                     {data?.usuarios.map((usuario) => (
//                         <Card key={usuario.usuarioId} className="group border shadow-sm hover:border-primary/50 transition-all duration-300">
//                             <CardHeader className="py-4 px-6">
//                                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//                                     <div className="flex items-center gap-4">
//                                         <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-lg">
//                                             {usuario.correo.charAt(0).toUpperCase()}
//                                         </div>
//                                         <div>
//                                             <CardTitle className="text-base font-medium">{usuario.correo}</CardTitle>
//                                             <CardDescription className="text-xs font-mono mt-0.5">ID: {usuario.usuarioId}</CardDescription>
//                                         </div>
//                                     </div>

//                                     {/* Stats Grid Minimalista */}
//                                     <div className="flex flex-wrap gap-4 md:gap-8 items-center bg-muted/30 px-4 py-2 rounded-lg">
//                                         <StatItem label="Saldo Actual" value={formatCurrency(usuario.saldoActual)} highlight />
//                                         <div className="h-8 w-[1px] bg-border hidden sm:block" />
//                                         <StatItem label="Pagado" value={formatCurrency(usuario.totalPagado)} color="text-green-600" />
//                                         <div className="h-8 w-[1px] bg-border hidden sm:block" />
//                                         <StatItem label="Pendiente" value={formatCurrency(usuario.totalPendiente)} color="text-amber-600" />
//                                     </div>
//                                 </div>
//                             </CardHeader>

//                             <CardContent className="px-0 pb-0">
//                                 {usuario.vouchers.length > 0 ? (
//                                     <Accordion type="single" collapsible className="w-full border-t bg-muted/5">
//                                         <AccordionItem value="vouchers" className="border-none">
//                                             <AccordionTrigger className="px-6 py-3 text-sm text-muted-foreground hover:text-primary hover:no-underline transition-colors">
//                                                 <span className="flex items-center gap-2">
//                                                     <Wallet className="h-4 w-4" />
//                                                     Ver historial de vouchers ({usuario.vouchers.length})
//                                                 </span>
//                                             </AccordionTrigger>
//                                             <AccordionContent className="px-0 pb-0">
//                                                 <div className="divide-y divide-border/50">
//                                                     {usuario.vouchers.map((voucher) => (
//                                                         <div
//                                                             key={voucher._id}
//                                                             className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 hover:bg-muted/50 cursor-pointer transition-colors gap-3"
//                                                             onClick={() => handleVoucherClick(voucher, usuario.usuarioId, usuario.correo)}
//                                                         >
//                                                             <div className="flex items-start gap-3">
//                                                                 <div className={`mt-1 h-2 w-2 rounded-full ${voucher.status === 'pagado' ? 'bg-green-500' : 'bg-amber-500'}`} />
//                                                                 <div>
//                                                                     <div className="flex items-center gap-2 mb-1">
//                                                                         <span className="font-medium text-sm text-foreground">Generación {voucher.ciclo}</span>
//                                                                         <span className="text-xs text-muted-foreground">• {formatDate(voucher.fecha)}</span>
//                                                                     </div>
//                                                                     <p className="text-xs text-muted-foreground flex items-center gap-1">
//                                                                         <ChevronRight className="h-3 w-3" />
//                                                                         Referido: <span className="font-mono">{voucher.referidoId.substring(0, 8)}...</span>
//                                                                     </p>
//                                                                 </div>
//                                                             </div>
//                                                             <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-5 sm:pl-0">
//                                                                 <Badge variant="secondary" className="text-[10px] font-normal uppercase tracking-wider">
//                                                                     {voucher.motivo}
//                                                                 </Badge>
//                                                                 <span className="font-semibold text-primary tabular-nums">
//                                                                     {formatCurrency(voucher.montoGanado)}
//                                                                 </span>
//                                                             </div>
//                                                         </div>
//                                                     ))}
//                                                 </div>
//                                             </AccordionContent>
//                                         </AccordionItem>
//                                     </Accordion>
//                                 ) : (
//                                     <div className="py-3 px-6 text-xs text-muted-foreground italic border-t">Sin historial de vouchers</div>
//                                 )}
//                             </CardContent>
//                         </Card>
//                     ))}
//                 </div>

//                 {data?.usuarios.length === 0 && (
//                     <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl border-muted">
//                         <div className="bg-muted p-4 rounded-full mb-3">
//                             <Users className="h-8 w-8 text-muted-foreground" />
//                         </div>
//                         <h3 className="font-semibold text-lg">No hay referidos aún</h3>
//                         <p className="text-muted-foreground text-sm max-w-sm">
//                             Cuando los usuarios comiencen a generar red, aparecerán aquí sus comisiones.
//                         </p>
//                     </div>
//                 )}
//             </div>

//             {/* 4. MODAL: Detalle del Voucher REDISEÑADO */}
//             <Dialog open={modalOpen} onOpenChange={setModalOpen}>
//                 <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
//                     {loadingVoucherDetail ? (
//                         <div className="h-64 flex flex-col items-center justify-center gap-3">
//                             <Loader2 className="w-8 h-8 animate-spin text-primary" />
//                             <span className="text-xs text-muted-foreground">Cargando detalles...</span>
//                         </div>
//                     ) : selectedVoucher ? (
//                         <div className="flex flex-col">
//                             {/* Cabecera Tipo Ticket */}
//                             <div className="bg-primary px-6 py-8 text-primary-foreground relative overflow-hidden">
//                                 <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="w-32 h-32" /></div>
//                                 <div className="relative z-10 text-center space-y-2">
//                                     <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-widest">Comisión Generada</p>
//                                     <h2 className="text-4xl font-bold tracking-tight">{formatCurrency(selectedVoucher.montoGanado)}</h2>
//                                     <Badge className={`mt-2 border-0 ${selectedVoucher.status === 'pagado' ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-black/20 text-white hover:bg-black/30'}`}>
//                                         {selectedVoucher.status === 'pagado' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
//                                         {selectedVoucher.status.toUpperCase()}
//                                     </Badge>
//                                 </div>
//                             </div>

//                             {/* Cuerpo del Ticket */}
//                             <ScrollArea className="max-h-[60vh]">
//                                 <div className="p-6 space-y-6 bg-card">

//                                     {/* Grid de Metadatos */}
//                                     <div className="grid grid-cols-2 gap-4">
//                                         <DetailBox icon={<Calendar className="w-4 h-4" />} label="Fecha" value={formatDate(selectedVoucher.fecha)} />
//                                         <DetailBox icon={<Network className="w-4 h-4" />} label="Nivel" value={`Generación ${selectedVoucher.ciclo}`} />
//                                         <div className="col-span-2">
//                                             <DetailBox icon={<Hash className="w-4 h-4" />} label="ID Transacción" value={selectedVoucher._id} mono />
//                                         </div>
//                                     </div>

//                                     <Separator />

//                                     {/* Flujo de Dinero (From -> To) */}
//                                     <div className="space-y-4">
//                                         <div className="flex items-start gap-4">
//                                             <div className="mt-1 bg-green-100 p-2 rounded-full">
//                                                 <ArrowUpRight className="w-4 h-4 text-green-700" />
//                                             </div>
//                                             <div>
//                                                 <p className="text-xs text-muted-foreground font-semibold uppercase">Generado por (Referido)</p>
//                                                 <p className="text-sm font-medium mt-0.5">
//                                                     {selectedVoucher.usuarioReferido?.nombre
//                                                         ? `${selectedVoucher.usuarioReferido.nombre} ${selectedVoucher.usuarioReferido.apellido || ''}`
//                                                         : 'Usuario Referido'}
//                                                 </p>
//                                                 <p className="text-xs text-muted-foreground">{selectedVoucher.usuarioReferido?.correo}</p>
//                                             </div>
//                                         </div>

//                                         <div className="pl-5 ml-4 border-l-2 border-dashed h-4 border-muted-foreground/30" />

//                                         <div className="flex items-start gap-4">
//                                             <div className="mt-1 bg-blue-100 p-2 rounded-full">
//                                                 <ArrowDownLeft className="w-4 h-4 text-blue-700" />
//                                             </div>
//                                             <div>
//                                                 <p className="text-xs text-muted-foreground font-semibold uppercase">Recibido por (Beneficiario)</p>
//                                                 <p className="text-sm font-medium mt-0.5">
//                                                     {selectedVoucher.usuarioPropietario?.nombre
//                                                         ? `${selectedVoucher.usuarioPropietario.nombre} ${selectedVoucher.usuarioPropietario.apellido || ''}`
//                                                         : 'Usuario Beneficiario'}
//                                                 </p>
//                                                 <p className="text-xs text-muted-foreground">{selectedVoucher.usuarioPropietario?.correo}</p>
//                                             </div>
//                                         </div>
//                                     </div>

//                                     <div className="bg-muted/30 p-3 rounded-lg text-center">
//                                         <p className="text-xs text-muted-foreground">Motivo: <span className="font-medium text-foreground">{selectedVoucher.motivo}</span></p>
//                                     </div>
//                                 </div>
//                             </ScrollArea>

//                             <div className="p-4 bg-muted/20 border-t text-center">
//                                 <Button variant="outline" className="w-full" onClick={() => setModalOpen(false)}>Cerrar Recibo</Button>
//                             </div>
//                         </div>
//                     ) : null}
//                 </DialogContent>
//             </Dialog>
//         </div>
//     );
// }

// // --- SUB-COMPONENTES PARA LIMPIEZA DEL CÓDIGO ---

// const KpiCard = ({ title, value, icon, bgIcon }: { title: string; value: string; icon: React.ReactNode; bgIcon: string }) => (
//     <Card className="border shadow-sm hover:shadow-md transition-all duration-300">
//         <CardContent className="p-5 flex items-center justify-between">
//             <div>
//                 <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
//                 <h3 className="text-2xl font-semibold mt-1 text-foreground">{value}</h3>
//             </div>
//             <div className={`p-3 rounded-xl ${bgIcon}`}>
//                 {icon}
//             </div>
//         </CardContent>
//     </Card>
// );

// const StatItem = ({ label, value, highlight = false, color }: { label: string; value: string; highlight?: boolean; color?: string }) => (
//     <div className="flex flex-col">
//         <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
//         <span className={`text-sm font-bold ${highlight ? 'text-primary' : color || 'text-foreground'}`}>{value}</span>
//     </div>
// );

// const DetailBox = ({ icon, label, value, mono = false }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) => (
//     <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
//         <div className="flex items-center gap-2 mb-1 text-muted-foreground">
//             {icon}
//             <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
//         </div>
//         <p className={`text-sm font-medium text-foreground ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</p>
//     </div>
// );

// export default GestionReferidos;

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
import { Loader2, DollarSign, Users, TrendingUp, Calendar, CheckCircle, Clock, Network, Mail, Hash, Eye, X, ChevronDown } from 'lucide-react';

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

            {/* Modal Minimalista de Detalle */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-xl">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <DollarSign className="h-5 w-5 text-primary" />
                            </div>
                            Detalle del Voucher
                        </DialogTitle>
                    </DialogHeader>

                    {loadingVoucherDetail ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : selectedVoucher ? (
                        <div className="space-y-6 pt-4">
                            {/* Monto Destacado */}
                            <Card className="border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
                                <CardContent className="p-6 text-center">
                                    <p className="text-sm text-muted-foreground mb-2">Monto de Comisión</p>
                                    <h2 className="text-3xl md:text-4xl font-bold text-primary mb-3">
                                        {formatCurrency(selectedVoucher.montoGanado)}
                                    </h2>
                                    <Badge
                                        variant="secondary"
                                        className={`text-sm px-4 py-1 ${selectedVoucher.status === 'pagado'
                                                ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400'
                                                : 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400'
                                            }`}
                                    >
                                        {selectedVoucher.status === 'pagado' ? (
                                            <CheckCircle className="h-4 w-4 mr-2 inline" />
                                        ) : (
                                            <Clock className="h-4 w-4 mr-2 inline" />
                                        )}
                                        {selectedVoucher.status.toUpperCase()}
                                    </Badge>
                                </CardContent>
                            </Card>

                            {/* Información del Voucher - Grid Minimalista */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-lg bg-muted/30 space-y-1">
                                    <p className="text-xs text-muted-foreground font-medium">Fecha</p>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        <p className="text-sm font-medium">{formatDate(selectedVoucher.fecha)}</p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-lg bg-muted/30 space-y-1">
                                    <p className="text-xs text-muted-foreground font-medium">Nivel</p>
                                    <div className="flex items-center gap-2">
                                        <Network className="h-4 w-4 text-primary" />
                                        <p className="text-sm font-medium">Generación {selectedVoucher.ciclo}</p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-lg bg-muted/30 space-y-1 col-span-2">
                                    <p className="text-xs text-muted-foreground font-medium">Motivo</p>
                                    <Badge variant="secondary" className="text-sm">
                                        {selectedVoucher.motivo}
                                    </Badge>
                                </div>

                                <div className="p-4 rounded-lg bg-muted/30 space-y-1 col-span-2">
                                    <p className="text-xs text-muted-foreground font-medium">ID del Voucher</p>
                                    <p className="text-xs font-mono text-foreground break-all">{selectedVoucher._id}</p>
                                </div>
                            </div>

                            <Separator />

                            {/* Usuario Propietario - Minimalista */}
                            <div className="space-y-3">
                                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                    Recibe la Comisión
                                </p>
                                <Card className="border-0 bg-muted/30">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <Users className="h-6 w-6 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {selectedVoucher.usuarioPropietario?.nombre && (
                                                    <p className="font-semibold text-base truncate">
                                                        {selectedVoucher.usuarioPropietario.nombre}{' '}
                                                        {selectedVoucher.usuarioPropietario.apellido}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                                                    <Mail className="h-3 w-3 flex-shrink-0" />
                                                    <span className="truncate">{selectedVoucher.usuarioPropietario?.correo}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                                                    {selectedVoucher.usuarioPropietario?._id}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Separator />

                            {/* Usuario Referido - Minimalista */}
                            <div className="space-y-3">
                                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                    Usuario Referido
                                </p>
                                <Card className="border-0 bg-green-50 dark:bg-green-950/30">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                                                <Network className="h-6 w-6 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {selectedVoucher.usuarioReferido?.nombre && (
                                                    <p className="font-semibold text-base truncate">
                                                        {selectedVoucher.usuarioReferido.nombre}{' '}
                                                        {selectedVoucher.usuarioReferido.apellido}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                                                    <Mail className="h-3 w-3 flex-shrink-0" />
                                                    <span className="truncate">{selectedVoucher.usuarioReferido?.correo}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                                                    {selectedVoucher.usuarioReferido?._id}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Botón de cierre */}
                            <div className="flex justify-end pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setModalOpen(false)}
                                    className="w-full sm:w-auto"
                                >
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