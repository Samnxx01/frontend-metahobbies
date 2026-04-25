import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Link2, Loader2, Orbit, Sparkles } from 'lucide-react';
import {
    generarEnlaceConAttribution,
    type ReferralAttributionResult,
} from '@/app/services/referralAttributionService';

function copyToClipboard(value: string, label: string): void {
    navigator.clipboard.writeText(value)
        .then(() => toast.success(`${label} copiado correctamente.`))
        .catch(() => toast.error(`No fue posible copiar ${label.toLowerCase()}.`));
}

export default function GeneradorEnlaceAttribution(): React.ReactElement {
    const [emailCliente, setEmailCliente] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ReferralAttributionResult | null>(null);

    const handleGenerate = async (): Promise<void> => {
        try {
            setLoading(true);
            const data = await generarEnlaceConAttribution({
                emailCliente: emailCliente.trim() || undefined,
                originType: 'membresia',
            });

            setResult(data);
            toast.success(data.msg || 'Enlace con attribution generado correctamente.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No fue posible generar el enlace con attribution.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const enlaceCompleto = result
        ? `${window.location.origin}/membresia/pago/${result.jwtReferido}?guestSessionId=${encodeURIComponent(result.guestSessionId)}`
        : '';

    return (
        <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">Generador de Enlace con Attribution</h1>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                        Genera enlaces de referido listos para Pipeline B, con sesion de atribucion activa y trazabilidad del sponsor.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Sparkles className="h-5 w-5 text-primary" /> Configuracion del enlace
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="emailCliente">Email del cliente objetivo</Label>
                                <Input
                                    id="emailCliente"
                                    value={emailCliente}
                                    onChange={(e) => setEmailCliente(e.target.value)}
                                    placeholder="cliente@correo.com"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Es opcional. Si lo envias, la attribution session tambien podra resolverse por email.
                                </p>
                            </div>

                            <Button onClick={handleGenerate} disabled={loading} className="gap-2">
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Generando...
                                    </>
                                ) : (
                                    <>
                                        <Link2 className="h-4 w-4" />
                                        Generar enlace con attribution
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Orbit className="h-5 w-5 text-primary" /> Estado de la sesion
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-xl bg-muted/30 p-4">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Attribution ID</p>
                                <p className="mt-1 break-all text-sm font-medium text-foreground">
                                    {result?.attributionId || 'Aun no generado'}
                                </p>
                            </div>
                            <div className="rounded-xl bg-muted/30 p-4">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Guest Session ID</p>
                                <p className="mt-1 break-all text-sm font-medium text-foreground">
                                    {result?.guestSessionId || 'Aun no generado'}
                                </p>
                            </div>
                            <div className="rounded-xl bg-muted/30 p-4">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Codigo de referido</p>
                                <p className="mt-1 break-all text-sm font-medium text-foreground">
                                    {result?.codigoReferido || 'Aun no generado'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Resultado</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="enlaceCompleto">Enlace final</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="enlaceCompleto"
                                    readOnly
                                    value={enlaceCompleto || 'Genera el enlace para visualizarlo aqui.'}
                                    className="font-mono text-xs"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    disabled={!enlaceCompleto}
                                    onClick={() => copyToClipboard(enlaceCompleto, 'Enlace')}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-xl border border-border/60 bg-card p-4">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Relacion ID</p>
                                <p className="mt-1 break-all text-sm font-medium text-foreground">
                                    {result?.relacionId || 'Sin relacion creada aun'}
                                </p>
                            </div>
                            <div className="rounded-xl border border-border/60 bg-card p-4">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Origen</p>
                                <p className="mt-1 text-sm font-medium text-foreground">
                                    {result?.originType || 'membresia'}
                                </p>
                            </div>
                            <div className="rounded-xl border border-border/60 bg-card p-4">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Nivel base</p>
                                <p className="mt-1 text-sm font-medium text-foreground">
                                    {result?.nivelGeneracion ?? 0}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
