import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Link2, Loader2, Orbit, ShoppingBag, Sparkles } from 'lucide-react';
import GeneradorEnlaceVentasModals from './components/GeneradorEnlaceVentasModals';
import {
    generarEnlaceConAttribution,
    buildShortAttributionUrl,
    type ReferralAttributionResult,
} from '@/app/services/referralAttributionService';

type GeneradorEnlaceVentasProps = {
    originId?: string | null;
    originName?: string | null;
    compact?: boolean;
};

type LinkDestination = 'home' | 'productos' | 'referidos';

async function copyValue(value: string, label: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(value);
        toast.success(`${label} copiado correctamente.`);
    } catch {
        toast.error(`No fue posible copiar ${label.toLowerCase()}.`);
    }
}

export default function GeneradorEnlaceVentas({
    originId = null,
    originName = null,
    compact = false,
}: GeneradorEnlaceVentasProps): React.ReactElement {
    const [emailCliente, setEmailCliente] = useState('');
    const [guestSessionId, setGuestSessionId] = useState('');
    const [destination, setDestination] = useState<LinkDestination>(originId ? 'productos' : 'home');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ReferralAttributionResult | null>(null);

    const originType = originId ? 'producto' : 'membresia';

    useEffect(() => {
        setDestination(originId ? 'productos' : 'home');
    }, [originId]);

    const generatedLink = useMemo(() => {
        if (!result?.codigoReferido) return '';
        return buildShortAttributionUrl(result.codigoReferido, destination);
    }, [destination, result]);

    const handleGenerate = async (): Promise<void> => {
        setLoading(true);
        try {
            const response = await generarEnlaceConAttribution({
                emailCliente: emailCliente.trim() || undefined,
                guestSessionId: guestSessionId.trim() || undefined,
                originType,
                originId: originId || undefined,
                redirectTo: destination,
                attributionSource: 'generador_enlace_ventas',
            });

            setResult(response);
            toast.success(response.msg || 'Enlace de venta con attribution generado correctamente.');
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'No fue posible generar el enlace de venta con attribution.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const content = (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-primary" />
                        <CardTitle>Generador de enlace de ventas</CardTitle>
                    </div>
                    <CardDescription className="mt-1.5">
                        Crea un enlace independiente con attribution session para Pipeline B.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-muted p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="gap-1">
                                <ShoppingBag className="h-3.5 w-3.5" />
                                {originType}
                            </Badge>
                            <Badge variant={originId ? 'default' : 'outline'}>
                                {originName || (originId ? 'Producto seleccionado' : 'Sin producto seleccionado')}
                            </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Si seleccionas un producto en DashboardVenta, este generador enviara `originType=producto` y su `originId`.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Email del cliente</Label>
                            <Input
                                value={emailCliente}
                                onChange={(e) => setEmailCliente(e.target.value)}
                                placeholder="cliente@correo.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Guest session manual</Label>
                            <Input
                                value={guestSessionId}
                                onChange={(e) => setGuestSessionId(e.target.value)}
                                placeholder="Opcional. Si lo dejas vacio se genera automatico."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Destino del enlace</Label>
                            <Select
                                value={destination}
                                onValueChange={(value) => setDestination(value as LinkDestination)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona destino" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="home">Home publico</SelectItem>
                                    <SelectItem value="productos">Productos / Pipeline B</SelectItem>
                                    {!originId && <SelectItem value="referidos">Membresia / referidos</SelectItem>}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Alert className="border-info/20 bg-info/10 text-info-foreground">
                        <Sparkles className="h-4 w-4" />
                        <AlertTitle>Navigate parametrizado</AlertTitle>
                        <AlertDescription>
                            En venta/producto no se crea relacion al generar el link: la relacion sponsor-hijo nace cuando Wompi confirma PAYMENT_APPROVED.
                        </AlertDescription>
                    </Alert>

                    <div className="flex justify-end">
                        <Button className="gap-2" onClick={() => void handleGenerate()} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                            Generar enlace de ventas
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Orbit className="h-5 w-5 text-primary" />
                        <CardTitle>Resultado de attribution</CardTitle>
                    </div>
                    <CardDescription>
                        Usa estos datos para compartir el enlace, probar checkout y rastrear la sesion capturada.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Enlace generado</Label>
                        <div className="flex gap-2">
                            <Input
                                value={generatedLink || 'Aun no has generado ningun enlace.'}
                                readOnly
                                className="font-mono text-xs"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                disabled={!generatedLink}
                                onClick={() => void copyValue(generatedLink, 'Enlace')}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Enlace corto con código de atribución (`?at=MABS-…`). Al abrirlo el sistema carga guestSessionId, ref y origen automáticamente.
                        </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <ResultBox label="Attribution ID" value={result?.attributionId || 'Sin generar'} />
                        <ResultBox label="Guest Session ID" value={result?.guestSessionId || 'Sin generar'} />
                        <ResultBox label="Codigo" value={result?.codigoReferido || 'Sin generar'} />
                        <ResultBox
                            label="Relacion"
                            value={result?.relacionId || (originId ? 'Se creara al aprobar el pago' : 'Sin generar')}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    if (compact) {
        return (
            <div className="space-y-4">
                <div className="flex justify-end">
                    <GeneradorEnlaceVentasModals />
                </div>
                {content}
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-8 bg-gradient-to-b from-slate-50 via-background to-slate-100 p-4 md:p-6 lg:p-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-info/20 bg-info/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-info-foreground">
                        <Orbit className="h-3.5 w-3.5" />
                        Attribution
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">generadorenlaceVentas</h1>
                    <p className="max-w-3xl text-sm text-muted-foreground">
                        Generador independiente para enlaces de venta con attribution session y trazabilidad del sponsor.
                    </p>
                </div>
                <GeneradorEnlaceVentasModals />
            </div>
            {content}
        </div>
    );
}

function ResultBox({ label, value }: { label: string; value: string }): React.ReactElement {
    return (
        <div className="rounded-2xl border border-slate-200 bg-muted p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
            <p className="mt-2 break-all text-sm font-medium text-foreground">{value}</p>
        </div>
    );
}
