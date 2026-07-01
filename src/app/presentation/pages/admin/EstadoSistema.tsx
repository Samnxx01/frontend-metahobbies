import React, { useCallback, useEffect, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    Building2,
    CheckCircle2,
    Database,
    Loader2,
    RefreshCw,
    Wallet,
    XCircle,
    Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getHealthStatus, pingDianSoap, type DianPingData, type HealthResponse } from '@/app/services/healthService';

const AUTO_REFRESH_MS = 30_000;
const CACHE_KEY = 'health_status_cache';

interface HealthCache { data: HealthResponse; savedAt: string; }

function saveHealthCache(data: HealthResponse): void {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, savedAt: new Date().toISOString() })); } catch { /* quota — ignorar */ }
}
function loadHealthCache(): HealthCache | null {
    try { const raw = localStorage.getItem(CACHE_KEY); return raw ? (JSON.parse(raw) as HealthCache) : null; } catch { return null; }
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'ok' | 'error' | 'degraded' }) {
    const isOk = status === 'ok';
    return (
        <Badge
            className={
                isOk
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'bg-red-100 text-red-700 border-red-200'
            }
        >
            {isOk ? (
                <CheckCircle2 className="w-3 h-3 mr-1" />
            ) : (
                <XCircle className="w-3 h-3 mr-1" />
            )}
            {isOk ? 'Operativo' : status === 'degraded' ? 'Degradado' : 'Error'}
        </Badge>
    );
}

function ServiceRow({
    icon,
    label,
    status,
    detail,
}: {
    icon: React.ReactNode;
    label: string;
    status: 'ok' | 'error' | 'degraded';
    detail?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{icon}</span>
                <div>
                    <p className="text-sm font-medium">{label}</p>
                    {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
                </div>
            </div>
            <StatusBadge status={status} />
        </div>
    );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function EstadoSistema(): React.ReactElement {
    const [data, setData] = useState<HealthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [pinging, setPinging] = useState(false);
    const [pingResult, setPingResult] = useState<DianPingData | null>(null);
    const [cachedAt, setCachedAt] = useState<string | null>(null);

    const fetchStatus = useCallback(async (manual = false) => {
        if (manual) setRefreshing(true);
        else if (!data) setLoading(true);

        setError(null);
        try {
            const result = await getHealthStatus();
            setData(result);
            setLastUpdated(new Date());
            setCachedAt(null);
            saveHealthCache(result);
        } catch {
            const cached = loadHealthCache();
            if (cached) {
                setData(cached.data);
                setCachedAt(cached.savedAt);
                setError('backend-down');
            } else {
                setError('No se pudo conectar al servidor. Verifica tu conexión.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [data]);

    const handleDianPing = useCallback(async () => {
        setPinging(true);
        setPingResult(null);
        try {
            const res = await pingDianSoap();
            setPingResult(res.data);
        } catch {
            setPingResult({ ok: false, latencyMs: 0, error: 'No se pudo conectar al backend.' });
        } finally {
            setPinging(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(() => fetchStatus(), AUTO_REFRESH_MS);
        return () => clearInterval(interval);
    }, []);

    const globalStatus = data?.status ?? 'error';

    const isBackendDown = error === 'backend-down';
    const isHardError = error && !isBackendDown;

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
            {/* Encabezado */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Estado del Sistema</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Monitoreo en tiempo real de conexiones e integraciones
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchStatus(true)}
                    disabled={refreshing || loading}
                >
                    {refreshing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Actualizar
                </Button>
            </div>

            {/* Banner: backend caído pero hay caché */}
            {isBackendDown && cachedAt && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                        <p className="font-medium text-amber-800">Backend no disponible</p>
                        <p className="text-amber-700 mt-0.5">
                            Mostrando último estado conocido registrado el{' '}
                            {new Date(cachedAt).toLocaleString('es-CO', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                            })}
                        </p>
                    </div>
                </div>
            )}

            {/* Estado global */}
            <Card
                className={
                    loading
                        ? 'border-muted'
                        : globalStatus === 'ok'
                          ? 'border-green-200 bg-green-50/40'
                          : 'border-red-200 bg-red-50/40'
                }
            >
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Activity className="w-4 h-4" />
                        Estado General
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Verificando...
                        </div>
                    ) : isHardError ? (
                        <p className="text-sm text-red-600">{error}</p>
                    ) : (
                        <div className="flex items-center justify-between">
                            <StatusBadge status={globalStatus} />
                            {lastUpdated && (
                                <span className="text-xs text-muted-foreground">
                                    Última verificación:{' '}
                                    {lastUpdated.toLocaleTimeString('es-CO', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                    })}
                                </span>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Base de datos */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Database className="w-4 h-4" />
                        Base de Datos
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-3">
                            <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
                        </div>
                    ) : (
                        <ServiceRow
                            icon={<Database className="w-4 h-4" />}
                            label="MongoDB"
                            status={data?.base_de_datos.mongodb.status ?? 'error'}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Integraciones externas */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Wallet className="w-4 h-4" />
                        Integraciones Externas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-3">
                            <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
                        </div>
                    ) : (
                        <>
                            <ServiceRow
                                icon={<Wallet className="w-4 h-4" />}
                                label="Wompi"
                                status={data?.servicios_externos.wompi.status ?? 'error'}
                                detail="Pasarela de pagos"
                            />
                            <Separator />
                            <div className="flex flex-col gap-2 py-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-muted-foreground">
                                            <Building2 className="w-4 h-4" />
                                        </span>
                                        <div>
                                            <p className="text-sm font-medium">DIAN</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Facturación electrónica SOAP · Habilitación
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={data?.servicios_externos.dian.status ?? 'error'} />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleDianPing}
                                            disabled={pinging}
                                            className="h-7 text-xs px-2"
                                        >
                                            {pinging ? (
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            ) : (
                                                <Zap className="w-3 h-3 mr-1" />
                                            )}
                                            Probar SOAP
                                        </Button>
                                    </div>
                                </div>
                                {pingResult && (
                                    <div className={`rounded-md p-3 text-xs font-mono ${pingResult.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                                        <p className="font-semibold mb-1">
                                            {pingResult.ok ? '✓ DIAN respondió correctamente' : '✗ Error en ping DIAN'}
                                            {pingResult.latencyMs > 0 && (
                                                <span className="ml-2 font-normal opacity-70">{pingResult.latencyMs} ms</span>
                                            )}
                                        </p>
                                        {pingResult.error && <p>{pingResult.error}</p>}
                                        {pingResult.respuestaDian && (
                                            <pre className="mt-1 whitespace-pre-wrap break-all opacity-80">
                                                {JSON.stringify(pingResult.respuestaDian, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-center">
                Actualización automática cada {AUTO_REFRESH_MS / 1000} segundos
            </p>
        </div>
    );
}
