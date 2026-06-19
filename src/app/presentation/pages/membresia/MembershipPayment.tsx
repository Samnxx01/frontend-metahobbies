import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useMembership } from '../../../providers/MembershipProvider';
import { apiFetch } from '@/app/services/api';
import { resolvePublicAttributionContext, getAttributionLinkCodeFromSearch, capturePublicAttributionFromSearch } from '@/app/services/publicAttributionParams';
import { isReferidoTokenComplete, resolveReferidoToken } from '@/app/utils/referidoTokenUtils';
import {
  type MembresiaPlanUi,
  normalizeMembresiaPlanFromApi,
  normalizeMembershipPriceFromApi,
  pickPlanesCheckout,
  resolveMembershipGuestSessionId,
  type MembresiaPlanApi,
} from '@/app/utils/membershipPlanUtils';
import MembershipStepContent from '@/components/membership/MembershipStepContent';
import { useMembershipPaymentForm } from '@/app/hooks/useMembershipPaymentForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
    Loader2, ArrowRight, ArrowLeft, CreditCard, Sparkles,
    CheckCircle2, Clock, XCircle, Receipt, ArrowRightCircle, RefreshCw,
} from 'lucide-react';

type EstadoTx = 'aprobada' | 'pendiente' | 'rechazada';

export interface ResultadoPago {
    estado: EstadoTx;
    referencia?: string;
    monto?: number;
    moneda?: string;
    email?: string;
    /** ID de transacción en Wompi */
    transactionId?: string;
    referenciaPago?: string;
    ventaReferencia?: string;
    facturaId?: string;
    metodoPago?: string;
    /** Carrito de la secuencia de pago (no el carrito activo del navegador). */
    carritoId?: string;
}

const normalizeMembershipPriceFromApiLegacy = normalizeMembershipPriceFromApi;

interface ModalResultadoProps {
    resultado: ResultadoPago;
    onIrAMabs: () => void;
    onRefresh?: () => Promise<void>;
    isRefreshing?: boolean;
}

const MODAL_CONFIG: Record<EstadoTx, {
    icon: React.ReactNode;
    titulo: string;
    descripcion: string;
    iconBg: string;
    iconColor: string;
    titleColor: string;
}> = {
    aprobada: {
        icon: <CheckCircle2 className="w-10 h-10" />,
        titulo: '¡Pago exitoso!',
        descripcion: 'Tu membresía MABS ha sido activada. Revisa tu correo para los detalles de acceso.',
        iconBg: 'bg-secondary/25',
        iconColor: 'text-secondary-foreground',
        titleColor: 'text-secondary-foreground',
    },
    pendiente: {
        icon: <Clock className="w-10 h-10" />,
        titulo: 'Pago en verificación',
        descripcion: 'Tu transacción está siendo procesada. Te notificaremos por correo cuando tu membresía esté activa.',
        iconBg: 'bg-accent/25',
        iconColor: 'text-accent-foreground',
        titleColor: 'text-accent-foreground',
    },
    rechazada: {
        icon: <XCircle className="w-10 h-10" />,
        titulo: 'Pago no procesado',
        descripcion: 'No pudimos completar tu transacción. Verifica tu método de pago e inténtalo de nuevo.',
        iconBg: 'bg-destructive/15',
        iconColor: 'text-destructive',
        titleColor: 'text-destructive',
    },
};

function ModalResultado({ resultado, onIrAMabs, onRefresh, isRefreshing = false }: ModalResultadoProps) {
    const cfg = MODAL_CONFIG[resultado.estado];

    const formatCurrency = (amount: number, moneda = 'COP') =>
        new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: moneda, minimumFractionDigits: 0,
        }).format(amount);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div
                className="bg-background rounded-2xl shadow-2xl border border-border/40 w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Ícono + título */}
                <div className="flex flex-col items-center pt-10 pb-6 px-8 text-center">
                    <div className={`w-20 h-20 rounded-full ${cfg.iconBg} flex items-center justify-center mb-5 ${cfg.iconColor}`}>
                        {cfg.icon}
                    </div>
                    <h2 className={`text-2xl font-bold mb-2 ${cfg.titleColor}`}>{cfg.titulo}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{cfg.descripcion}</p>
                </div>

                {/* Voucher con detalles */}
                {(resultado.referencia || resultado.monto || resultado.email) && (
                    <div className="mx-8 mb-6 rounded-xl border border-border/50 bg-muted/30 overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-muted/50">
                            <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Detalles de la transacción
                            </span>
                        </div>
                        <div className="divide-y divide-border/30">
                            {resultado.email && (
                                <div className="flex justify-between items-center px-4 py-2.5">
                                    <span className="text-xs text-muted-foreground">Correo</span>
                                    <span className="text-xs font-medium text-foreground truncate max-w-[180px]">
                                        {resultado.email}
                                    </span>
                                </div>
                            )}
                            {resultado.referencia && (
                                <div className="flex justify-between items-center px-4 py-2.5">
                                    <span className="text-xs text-muted-foreground">Referencia</span>
                                    <span className="text-xs font-mono font-medium text-foreground">
                                        {resultado.referencia}
                                    </span>
                                </div>
                            )}
                            {resultado.monto && resultado.monto > 0 && (
                                <div className="flex justify-between items-center px-4 py-2.5">
                                    <span className="text-xs text-muted-foreground">Monto</span>
                                    <span className="text-xs font-bold text-foreground">
                                        {formatCurrency(resultado.monto, resultado.moneda)}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between items-center px-4 py-2.5">
                                <span className="text-xs text-muted-foreground">Estado</span>
                                <span className={`text-xs font-semibold capitalize ${cfg.titleColor}`}>
                                    {resultado.estado}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Única salida del modal */}
                <div className="px-8 pb-8 flex flex-col gap-3">
                    {resultado.estado === 'pendiente' && onRefresh && (
                        <Button
                            variant="outline"
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className="w-full gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Verificando...' : 'Verificar estado'}
                        </Button>
                    )}
                    <Button onClick={onIrAMabs} className="w-full gap-2 font-semibold" size="lg">
                        Ir a Mabs
                        <ArrowRightCircle className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

const steps = [
    { title: 'Email', icon: '📧' },
    { title: 'Resumen', icon: '📋' },
    { title: 'Pago', icon: '💳' },
];

export default function MembershipPayment(): React.ReactElement {
    const navigate = useNavigate();
    const location = useLocation();
    const { token: tokenFromPath } = useParams<{ token?: string }>();
    const [searchParams] = useSearchParams();
    const { purchaseMembership: originalPurchaseMembership } = useMembership();

    const attributionCtx = resolvePublicAttributionContext(
        searchParams.toString() ? `?${searchParams.toString()}` : '',
    );
    const token = resolveReferidoToken(attributionCtx.ref, tokenFromPath);
    const linkCodeInUrl = getAttributionLinkCodeFromSearch(location.search);
    const [shortLinkState, setShortLinkState] = useState<'idle' | 'waiting' | 'error'>(
        linkCodeInUrl && !token ? 'waiting' : 'idle',
    );

    const flowReferidos = searchParams.get('flow') === 'referidos'
        || searchParams.get('redirectTo') === 'referidos'
        || sessionStorage.getItem('mabs_referidos_flow') === '1';

    useEffect(() => {
        if (!linkCodeInUrl) {
            setShortLinkState('idle');
            return;
        }

        const currentToken = resolveReferidoToken(
            resolvePublicAttributionContext(location.search).ref,
            tokenFromPath,
        );
        if (currentToken && isReferidoTokenComplete(currentToken)) {
            setShortLinkState('idle');
            return;
        }

        setShortLinkState('waiting');
        const timeout = window.setTimeout(() => setShortLinkState('error'), 15000);
        const poll = window.setInterval(() => {
            const stillHasCode = getAttributionLinkCodeFromSearch(window.location.search);
            const nextToken = resolveReferidoToken(
                resolvePublicAttributionContext(window.location.search).ref,
                tokenFromPath,
            );
            if (nextToken && isReferidoTokenComplete(nextToken)) {
                setShortLinkState('idle');
                window.clearInterval(poll);
                window.clearTimeout(timeout);
                return;
            }
            if (!stillHasCode) {
                window.clearInterval(poll);
                window.clearTimeout(timeout);
                if (nextToken && isReferidoTokenComplete(nextToken)) {
                    setShortLinkState('idle');
                } else {
                    setShortLinkState('error');
                }
            }
        }, 200);

        return () => {
            window.clearInterval(poll);
            window.clearTimeout(timeout);
        };
    }, [linkCodeInUrl, location.search, tokenFromPath, token]);

    useEffect(() => {
        if (token && isReferidoTokenComplete(token) && shortLinkState !== 'idle') {
            setShortLinkState('idle');
        }
    }, [token, shortLinkState]);

    const guestSessionIdFromUrl = searchParams.get('guestSessionId')?.trim() || '';
    const emailReintento = searchParams.get('email')?.trim() || '';
    const isResolvingShortLink = shortLinkState === 'waiting';

    const resolveGuestSessionId = (): string => {
        if (guestSessionIdFromUrl) return guestSessionIdFromUrl;
        const ctx = resolvePublicAttributionContext(searchParams.toString() ? `?${searchParams.toString()}` : '');
        if (ctx.guestSessionId) return ctx.guestSessionId;
        return resolveMembershipGuestSessionId();
    };

    // Lista de planes con esPrecioDefault: true y plan actualmente seleccionado
    const [planes, setPlanes] = useState<MembresiaPlanUi[]>([]);
    const [planSeleccionado, setPlanSeleccionado] = useState<MembresiaPlanUi | null>(null);
    const [loadingPrice, setLoadingPrice] = useState<boolean>(true);

    // Modal de resultado post-pago
    const [resultado, setResultado] = useState<ResultadoPago | null>(null);

    // Refresh manual del estado
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Estado para polling mejorado del pago pendiente
    const [pollingActive, setPollingActive] = useState(false);
    const [pollCount, setPollCount] = useState(0);
    const maxPolls = 60; // Máximo 60 consultas (10 minutos con intervalo progresivo)
    const basePollInterval = 5000; // 5 segundos inicial
    const maxPollInterval = 30000; // 30 segundos máximo

    // Función para calcular intervalo progresivo (backoff exponencial)
    const getPollInterval = (count: number): number => {
        const interval = basePollInterval * Math.pow(1.2, Math.floor(count / 5));
        return Math.min(interval, maxPollInterval);
    };

    // Polling mejorado para pagos pendientes
    useEffect(() => {
        if (!resultado || resultado.estado !== 'pendiente' || !pollingActive || pollCount >= maxPolls) {
            if (pollingActive) {
                setPollingActive(false);
                console.log('Polling detenido:', { pollCount, maxPolls });
                // Si se detuvo por timeout, mostrar mensaje
                if (pollCount >= maxPolls) {
                    toast.info('La verificación está tardando más de lo esperado. Te notificaremos por correo cuando se complete.');
                }
            }
            return;
        }

        const interval = getPollInterval(pollCount);
        console.log(`Próxima consulta en ${interval/1000}s (intento ${pollCount + 1}/${maxPolls})`);

        const pollTimer = setTimeout(async () => {
            try {
                console.log(`Consultando estado del pago (intento ${pollCount + 1}/${maxPolls})...`);

                // Consultar el estado actual del pago usando la referencia
                const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
                const response = await fetch(
                    `${API_BASE_URL}/membresia/seguridad/consultar/estado/${resultado.referencia}`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    console.log('Estado actual del pago:', data);

                    const nuevoEstado = wompiStatusToEstado(data.status || data.estado || 'PENDING');
                    const montoNormalizado = normalizeMembershipPriceFromApiLegacy(data.monto) ?? 0;

                    if (nuevoEstado !== 'pendiente') {
                        // Estado cambió, actualizar el modal
                        console.log('Estado cambió de pendiente a:', nuevoEstado);
                        setResultado(prev => prev ? {
                            ...prev,
                            estado: nuevoEstado,
                            monto: montoNormalizado > 0 ? montoNormalizado : prev.monto,
                            moneda: data.moneda || prev.moneda,
                            email: data.email || prev.email,
                        } : null);
                        setPollingActive(false);

                        if (nuevoEstado === 'aprobada') {
                            toast.success('¡Pago confirmado! Tu membresía ha sido activada.');
                        } else {
                            toast.error('El pago fue rechazado. Por favor, intenta nuevamente.');
                        }
                    } else {
                        // Aún pendiente, continuar polling
                        setPollCount(prev => prev + 1);
                    }
                } else {
                    console.warn('Error al consultar estado del pago:', response.status);
                    setPollCount(prev => prev + 1);
                }
            } catch (error) {
                console.error('Error en polling:', error);
                setPollCount(prev => prev + 1);
            }
        }, interval);

        return () => clearTimeout(pollTimer);
    }, [resultado, pollingActive, pollCount, maxPolls, token]);

    // Función helper para mapear status de Wompi
    const wompiStatusToEstado = (status: string): 'aprobada' | 'pendiente' | 'rechazada' => {
        const s = status?.toUpperCase();
        if (s === 'APPROVED') return 'aprobada';
        if (s === 'PENDING') return 'pendiente';
        return 'rechazada';
    };

    useEffect(() => {
        capturePublicAttributionFromSearch(location.search);
        const guestSessionId = resolveGuestSessionId();
        if (guestSessionId) {
            sessionStorage.setItem('mabs_guest_session_id', guestSessionId);
        }
        if (flowReferidos) {
            sessionStorage.setItem('mabs_referidos_flow', '1');
        }
    }, [guestSessionIdFromUrl, flowReferidos, searchParams, location.search]);

    // Precios activos: requiere token de referido (checkout) o sesión (admin)
    useEffect(() => {
        if (!token?.trim() || isResolvingShortLink) return;

        let cancelled = false;

        async function loadPlanes() {
            try {
                setLoadingPrice(true);
                const guestSessionHeader = resolveGuestSessionId();
                const headers: Record<string, string> = {
                    referidos: token,
                    Authorization: `Bearer ${token}`,
                };
                if (guestSessionHeader) {
                    headers['x-guest-session-id'] = guestSessionHeader;
                }
                const json = await apiFetch(
                    `/api/membresia/seguridad/crear/parametrizacion/membresia?ref=${encodeURIComponent(token)}`,
                    {
                        method: 'GET',
                        useAuth: false,
                        logoutOn401: false,
                        headers,
                    }
                );

                const rawList: MembresiaPlanApi[] = Array.isArray(json?.data) ? json.data : [];
                const normalizados = rawList
                    .map((row) => normalizeMembresiaPlanFromApi(row))
                    .filter((row): row is MembresiaPlanUi => Boolean(row));
                const lista = pickPlanesCheckout(normalizados);

                if (cancelled) return;
                setPlanes(lista);
                setPlanSeleccionado(lista[0] ?? null);
            } catch (err) {
                if (!cancelled) {
                    console.error('Error al cargar planes de membresía:', err);
                    setPlanes([]);
                    setPlanSeleccionado(null);
                }
            } finally {
                if (!cancelled) setLoadingPrice(false);
            }
        }
        void loadPlanes();

        return () => {
            cancelled = true;
        };
    }, [token, isResolvingShortLink, guestSessionIdFromUrl, searchParams]);

    const purchaseMembershipWrapper = async (
        userToken: string, email: string, authToken: string
    ): Promise<void> => {
        const paymentData = { email, authToken } as any;
        await originalPurchaseMembership(paymentData, userToken);
    };

    const handleRefresh = async () => {
        if (!resultado?.referencia || isRefreshing) return;
        setIsRefreshing(true);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
            const response = await fetch(
                `${API_BASE_URL}/membresia/seguridad/consultar/estado/${resultado.referencia}`,
                { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (response.ok) {
                const data = await response.json();
                const nuevoEstado = wompiStatusToEstado(data.status || data.estado || 'PENDING');
                const montoNormalizado = normalizeMembershipPriceFromApiLegacy(data.monto) ?? 0;
                if (nuevoEstado !== 'pendiente') {
                    setResultado(prev => prev ? {
                        ...prev,
                        estado: nuevoEstado,
                        monto: montoNormalizado > 0 ? montoNormalizado : prev.monto,
                        moneda: data.moneda || prev.moneda,
                        email: data.email || prev.email,
                    } : null);
                    setPollingActive(false);
                    if (nuevoEstado === 'aprobada') {
                        toast.success('¡Pago confirmado! Tu membresía ha sido activada.');
                    } else {
                        toast.error('El pago fue rechazado. Por favor, intenta nuevamente.');
                    }
                } else {
                    toast.info('El pago aún está siendo procesado.');
                }
            }
        } catch (error) {
            toast.error('No se pudo consultar el estado del pago.');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handlePagoTerminado = (res: ResultadoPago) => {
        setResultado(res);
        setPollCount(0); // Resetear contador

        // Activar polling si el pago está pendiente
        if (res.estado === 'pendiente' && res.referencia) {
            console.log('Activando polling para pago pendiente:', res.referencia);
            setPollingActive(true);
        }
    };

    const {
        activeStep, loading, formData,
        handleFormChange, handleNext, handleBack, handlePayment,
    } = useMembershipPaymentForm({
        initialFormData: {
            personalInfo: { email: emailReintento },
            paymentInfo: {
                paymentMethod: '',
                cardType: undefined,
                nequiPhone: '',
                cardNumber: '',
                cardName: '',
                expiryDate: '',
                cvv: '',
                installments: 1,
                phoneNumber: '',
                fullName: '',
                pseUserType: '',
                pseLegalIdType: '',
                pseLegalId: '',
                pseFinancialInstitution: '',
            },
        },
        steps,
        purchaseMembership: purchaseMembershipWrapper,
        navigate,
        token: token || '',
        membresiaPlanId: planSeleccionado?.id ?? null,
        resolveGuestSessionId,
        onPagoTerminado: handlePagoTerminado,
    });

    useEffect(() => {
        const email = searchParams.get('email')?.trim();
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
        if (formData.personalInfo.email !== email) {
            handleFormChange('personalInfo', 'email', email);
        }
    }, [searchParams, formData.personalInfo.email, handleFormChange]);

    const isLastStep = activeStep === steps.length - 1;

    // Helper para el select de membresías
    const handleSelectPlan = (id: string) => {
        const plan = planes.find((p) => p.id === id) ?? null;
        setPlanSeleccionado(plan);
    };

    // Sección de selección de membresía (solo visible en step 1)
    const SelectorMembresia = () => {
        if (loadingPrice) {
            return (
                <div className="flex justify-center items-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            );
        }

        if (planes.length === 0) {
            return (
                <p className="text-sm text-muted-foreground text-center py-4">
                    No hay planes de membresía disponibles en este momento.
                </p>
            );
        }

        return (
            <div className="mb-6">
                {planes.length > 1 ? (
                    // Más de un plan: mostrar select
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Selecciona tu plan</Label>
                        <Select
                            value={planSeleccionado?.id ?? ''}
                            onValueChange={handleSelectPlan}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Elige un plan..." />
                            </SelectTrigger>
                            <SelectContent>
                                {planes.map(plan => (
                                    <SelectItem key={plan.id} value={plan.id}>
                                        {plan.nombreMembresia} — {new Intl.NumberFormat('es-CO', {
                                            style: 'currency', currency: plan.moneda ?? 'COP',
                                            minimumFractionDigits: 0,
                                        }).format(plan.precioMembresia)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : (
                    // Un solo plan: solo mostrar el nombre sin select
                    <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-primary/5 border border-primary/20">
                        <span className="text-sm font-semibold text-foreground">
                            {planes[0].nombreMembresia}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {planes[0].tipoPagos}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    if (isResolvingShortLink) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Cargando enlace de atribución…</p>
            </div>
        );
    }

    if (shortLinkState === 'error' && !token?.trim()) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4 text-center">
                <p className="text-base font-medium text-foreground">
                    No pudimos validar tu enlace de referido
                </p>
                <p className="text-sm text-muted-foreground max-w-md">
                    El código puede estar vencido o no corresponde al flujo de membresía.
                    Solicita un enlace nuevo desde el panel de referidos.
                </p>
                <Button onClick={() => navigate('/public/render/home')}>
                    Ir al inicio
                </Button>
            </div>
        );
    }

    return (
        <>
            {/* Modal post-pago (sin X, sin cierre exterior) */}
            {resultado && (
                <ModalResultado
                    resultado={resultado}
                    onIrAMabs={() => navigate('/membresia/dashboard')}
                    onRefresh={handleRefresh}
                    isRefreshing={isRefreshing}
                />
            )}

            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 sm:py-12 px-4">
                <div className="max-w-3xl mx-auto">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-sm font-semibold">Membresía Premium</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                            Activa tu Membresía
                        </h1>
                        <p className="text-muted-foreground text-sm sm:text-base">
                            Solo {steps.length} pasos para desbloquear todos los beneficios
                        </p>
                    </div>

                    {/* Stepper */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between max-w-md mx-auto">
                            {steps.map((step, index) => (
                                <React.Fragment key={step.title}>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className={`
                                            w-12 h-12 rounded-full flex items-center justify-center text-xl
                                            transition-all duration-300 border-2
                                            ${index === activeStep
                                                ? 'bg-button border-button text-button-foreground scale-110 shadow-lg'
                                                : index < activeStep
                                                    ? 'bg-button/20 border-button text-button-foreground'
                                                    : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                                            }
                                        `}>
                                            {index < activeStep ? '✓' : step.icon}
                                        </div>
                                        <span className={`text-xs font-medium transition-colors ${index === activeStep ? 'text-foreground' : 'text-muted-foreground'
                                            }`}>
                                            {step.title}
                                        </span>
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div className={`
                                            flex-1 h-0.5 mx-2 transition-colors duration-300
                                            ${index < activeStep ? 'bg-button' : 'bg-muted-foreground/20'}
                                        `} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Content Card */}
                    <Card className="shadow-lg border-0 overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-b border-border/40 pb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <span className="text-2xl">{steps[activeStep].icon}</span>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                                        Paso {activeStep + 1} de {steps.length}
                                    </p>
                                    <h2 className="text-xl font-semibold text-foreground">
                                        {steps[activeStep].title}
                                    </h2>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6 sm:p-8">
                            <div className="mb-8">
                                {/* En el step 1 (Resumen) renderizar el selector de plan
                                    encima del contenido — el precio en MembershipStepContent
                                    ya reacciona al planSeleccionado?.precioMembresia */}
                                {activeStep === 1 && <SelectorMembresia />}

                                {activeStep === 1 && loadingPrice ? null : (
                                    <MembershipStepContent
                                        step={activeStep}
                                        formData={formData as any}
                                        handleFormChange={handleFormChange}
                                        MEMBERSHIP_PRICE={planSeleccionado?.precioMembresia ?? null}
                                        MEMBERSHIP_NOMBRE={planSeleccionado?.nombreMembresia}
                                        token={token || ''}
                                    />
                                )}
                            </div>

                            {/* Navegación */}
                            <div className="flex items-center justify-between gap-4 pt-6 border-t border-border/40">
                                {activeStep !== 0 ? (
                                    <Button
                                        variant="ghost"
                                        onClick={handleBack}
                                        disabled={loading}
                                        className="gap-2"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Anterior
                                    </Button>
                                ) : <div />}

                                <Button
                                    onClick={isLastStep ? handlePayment : handleNext}
                                    disabled={
                                        loading
                                        || (activeStep === 1 && loadingPrice)
                                        || (activeStep >= 1 && !token?.trim())
                                    }
                                    size="lg"
                                    className={`gap-2 min-w-[160px] font-semibold ${isLastStep ? 'bg-gradient-to-r from-primary to-primary/80 shadow-lg' : ''
                                        }`}
                                >
                                    {loading ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                                    ) : isLastStep ? (
                                        <><CreditCard className="w-4 h-4" /> Pagar Membresía</>
                                    ) : (
                                        <>Continuar <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-muted-foreground">
                            🔒 Pago 100% seguro • ⚡ Activación inmediata • 💎 Acceso de por vida
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
