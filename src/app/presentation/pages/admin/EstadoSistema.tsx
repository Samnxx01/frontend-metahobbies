import React, { useCallback, useEffect, useState } from 'react';
import {
    Activity,
    Building2,
    CheckCircle2,
    Database,
    Loader2,
    RefreshCw,
    Wallet,
    XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getHealthStatus, type HealthResponse } from '@/app/services/healthService';

const AUTO_REFRESH_MS = 30_000;

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

    const fetchStatus = useCallback(async (manual = false) => {
        if (manual) setRefreshing(true);
        else if (!data) setLoading(true);

        setError(null);
        try {
            const result = await getHealthStatus();
            setData(result);
            setLastUpdated(new Date());
        } catch {
            setError('No se pudo conectar al servidor. Verifica tu conexión.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [data]);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(() => fetchStatus(), AUTO_REFRESH_MS);
        return () => clearInterval(interval);
    }, []);

    const globalStatus = data?.status ?? 'error';

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
                    ) : error ? (
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
                            <ServiceRow
                                icon={<Building2 className="w-4 h-4" />}
                                label="DIAN"
                                status={data?.servicios_externos.dian.status ?? 'error'}
                                detail="Facturación electrónica SOAP"
                            />
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
