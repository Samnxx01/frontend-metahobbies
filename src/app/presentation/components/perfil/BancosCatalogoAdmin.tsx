import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Database, RefreshCcw } from 'lucide-react';

import { apiFetch } from '@/app/services/api';
import type { ColombiaBankCatalogItem } from '@/types/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const TIPO_ENTIDAD_LABELS: Record<string, string> = {
    '1': 'Banco',
    '4': 'Compañía de financiamiento',
};

const tipoEntidadLabel = (tipoEntidad: string): string => TIPO_ENTIDAD_LABELS[tipoEntidad] || `Tipo ${tipoEntidad}`;

interface BancosCatalogoAdminProps {
    token?: string;
}

export default function BancosCatalogoAdmin({ token }: BancosCatalogoAdminProps): React.ReactElement {
    const [bancos, setBancos] = useState<ColombiaBankCatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const loadBancos = async () => {
        try {
            setLoading(true);
            const res = await apiFetch(`${API_BASE_URL}/perfil/seguridad/listar/bancos-colombia`, {
                method: 'GET',
            });

            if (res?.ok) {
                setBancos(Array.isArray(res.bancos) ? res.bancos : []);
                return;
            }

            toast.error(res?.msg || 'No se pudo cargar el catálogo de bancos');
        } catch (error) {
            console.error('Error cargando catalogo de bancos:', error);
            toast.error('Error cargando el catálogo de bancos');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            const res = await apiFetch(`${API_BASE_URL}/perfil/seguridad/sincronizacion/bancos-colombia`, {
                method: 'POST',
            });

            if (!res?.ok) {
                toast.error(res?.msg || 'No se pudo sincronizar el catálogo');
                return;
            }

            toast.success(res?.msg || 'Catálogo de bancos sincronizado');
            setBancos(Array.isArray(res.bancos) ? res.bancos : []);
        } catch (error) {
            console.error('Error sincronizando catalogo de bancos:', error);
            toast.error('Error sincronizando el catálogo de bancos');
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        loadBancos();
    }, [token]);

    return (
        <Card className="shadow-sm border-border bg-card">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <CardTitle className="text-lg md:text-xl font-semibold flex items-center gap-2 text-foreground">
                        <Database className="h-5 w-5 text-primary" />
                        Catálogo de bancos de Colombia
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Fuente oficial: entidades vigiladas publicadas por la Superintendencia Financiera de Colombia en Datos Abiertos.
                    </p>
                </div>
                <Button onClick={handleSync} disabled={syncing}>
                    <RefreshCcw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Sincronizando...' : 'Actualizar fuente oficial'}
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p className="text-sm text-muted-foreground">Cargando catálogo...</p>
                ) : bancos.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
                        No hay bancos oficiales sincronizados todavía. Pulsa &quot;Actualizar fuente oficial&quot;.
                    </div>
                ) : (
                    <div className="rounded-xl border border-border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Banco</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Código SFC</TableHead>
                                    <TableHead>NIT</TableHead>
                                    <TableHead>Ciudad</TableHead>
                                    <TableHead>Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bancos.map((banco) => (
                                    <TableRow key={banco.iud}>
                                        <TableCell className="font-medium">{banco.nombre}</TableCell>
                                        <TableCell>{tipoEntidadLabel(banco.tipoEntidad)}</TableCell>
                                        <TableCell>{banco.codigoEntidad}</TableCell>
                                        <TableCell>{banco.nit || '-'}</TableCell>
                                        <TableCell>{banco.ciudad || '-'}</TableCell>
                                        <TableCell>{banco.estado ? 'Activo' : 'Inactivo'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
