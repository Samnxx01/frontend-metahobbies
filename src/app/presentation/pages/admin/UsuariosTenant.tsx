import React, { useState } from 'react';
import { RefreshCw, UserPlus, Shield, Building2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenantUsuarios } from '@/app/hooks/useTenantUsuarios';
import { NodoCorpCard } from '@/app/presentation/components/admin/usuarios-tenant/NodoCorpCard';
import { UsuarioGlobalModal } from '@/app/presentation/components/admin/usuarios-tenant/UsuarioGlobalModal';
import { UsuarioCorporativoModal } from '@/app/presentation/components/admin/usuarios-tenant/UsuarioCorporativoModal';
import type { CorpNode, TenantGlobalInfo } from '@/app/services/tenantUsuariosService';

export default function UsuariosTenant(): React.ReactElement {
    const {
        jerarquia,
        loadingJerarquia,
        errorJerarquia,
        refetch,
        isCreatingGlobal,
        errorCrearGlobal,
        crearUsuarioGlobal,
        isCreatingCorp,
        errorCrearCorp,
        crearUsuarioCorporativo,
    } = useTenantUsuarios();

    // Modal global
    const [modalGlobal, setModalGlobal] = useState(false);

    // Modal corporativo — guarda el nodo seleccionado
    const [nodoCorp, setNodoCorp] = useState<CorpNode | null>(null);

    const scope = jerarquia?.scope ?? 'TENANT_GLOBAL';

    // Lista de TenantGlobales para el selector del SUPER_ADMIN
    const tenantsGlobalesInfo: TenantGlobalInfo[] = (jerarquia?.tenantsGlobales ?? [])
        .map(tg => tg.tenantGlobal)
        .filter((tg): tg is TenantGlobalInfo => tg !== null);

    // ─── Loading ──────────────────────────────────────────────────────────────
    if (loadingJerarquia) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Cargando jerarquía de usuarios...
            </div>
        );
    }

    if (errorJerarquia) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <p className="text-destructive text-sm">{errorJerarquia.message}</p>
                <Button variant="outline" size="sm" onClick={refetch}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reintentar
                </Button>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Encabezado */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Usuarios Tenant</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Jerarquía de usuarios por tenant
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                        <Shield className="h-3.5 w-3.5" />
                        {scope}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={refetch}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Actualizar
                    </Button>
                    {/* Agregar usuario global solo para SA y TG */}
                    {(scope === 'SUPER_ADMIN' || scope === 'TENANT_GLOBAL') && (
                        <Button size="sm" onClick={() => setModalGlobal(true)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Usuario Global
                        </Button>
                    )}
                </div>
            </div>

            {/* SuperAdmins — solo visible para SUPER_ADMIN */}
            {scope === 'SUPER_ADMIN' && (jerarquia?.superAdmins.length ?? 0) > 0 && (
                <section className="space-y-2">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        Super Administradores
                        <Badge variant="outline">{jerarquia!.superAdmins.length}</Badge>
                    </h2>
                    <div className="border rounded-lg divide-y">
                        {jerarquia!.superAdmins.map(sa => (
                            <div key={sa.iud} className="flex items-center justify-between px-4 py-2.5 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${
                                        sa.estado === true || sa.estado === 'activo' ? 'bg-green-500' : 'bg-gray-400'
                                    }`} />
                                    <span className="text-muted-foreground">{sa.correo}</span>
                                </div>
                                <Badge variant="default" className="text-xs">{sa.rol ?? 'SUPER_ADMIN'}</Badge>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Árbol de Tenant Globales */}
            {(jerarquia?.tenantsGlobales ?? []).map((tgNode, idx) => (
                <section key={tgNode.tenantGlobal?.iud ?? idx} className="space-y-3">
                    {/* Cabecera del TenantGlobal */}
                    {tgNode.tenantGlobal && (
                        <div className="flex items-center gap-3 flex-wrap">
                            <h2 className="text-base font-semibold flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                {tgNode.tenantGlobal.razon_social ?? tgNode.tenantGlobal.titulo ?? 'Tenant Global'}
                            </h2>
                            {tgNode.tenantGlobal.nit_ruc_rtn && (
                                <span className="text-xs text-muted-foreground">
                                    NIT: {tgNode.tenantGlobal.nit_ruc_rtn}
                                </span>
                            )}
                            <Badge
                                variant={tgNode.tenantGlobal.estado === true || tgNode.tenantGlobal.estado === 'activo' ? 'default' : 'secondary'}
                                className="text-xs"
                            >
                                {tgNode.tenantGlobal.estado === true || tgNode.tenantGlobal.estado === 'activo' ? 'Activo' : 'Inactivo'}
                            </Badge>
                        </div>
                    )}

                    {/* Usuarios del TenantGlobal */}
                    {tgNode.usuarios.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                            <div className="px-3 py-2 bg-muted/30 text-xs font-semibold flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5" />
                                Usuarios del Tenant Global ({tgNode.usuarios.length})
                            </div>
                            <div className="divide-y">
                                {tgNode.usuarios.map(u => (
                                    <div key={u.iud} className="flex items-center justify-between px-4 py-2.5 text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-2 w-2 rounded-full ${
                                                u.estado === true || u.estado === 'activo' ? 'bg-green-500' : 'bg-gray-400'
                                            }`} />
                                            <span className="text-muted-foreground">{u.correo}</span>
                                        </div>
                                        {u.rol && <Badge variant="outline" className="text-xs">{u.rol}</Badge>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Árbol de corporativos */}
                    {tgNode.corporativos.length > 0 && (
                        <div className="space-y-2">
                            {tgNode.corporativos.map(corp => (
                                <NodoCorpCard
                                    key={corp.tenantCorporativo.iud}
                                    nodo={corp}
                                    nivel={0}
                                    scope={scope as 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO'}
                                    onAddUsuario={nodo => setNodoCorp(nodo)}
                                />
                            ))}
                        </div>
                    )}

                    {tgNode.usuarios.length === 0 && tgNode.corporativos.length === 0 && (
                        <p className="text-sm text-muted-foreground">Sin registros en este tenant.</p>
                    )}
                </section>
            ))}

            {/* Modales */}
            <UsuarioGlobalModal
                open={modalGlobal}
                onClose={() => setModalGlobal(false)}
                onSubmit={crearUsuarioGlobal}
                isSubmitting={isCreatingGlobal}
                submitError={errorCrearGlobal}
                tenantsGlobales={tenantsGlobalesInfo}
                scope={scope as 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO'}
            />

            <UsuarioCorporativoModal
                open={nodoCorp !== null}
                onClose={() => setNodoCorp(null)}
                onSubmit={crearUsuarioCorporativo}
                isSubmitting={isCreatingCorp}
                submitError={errorCrearCorp}
                tenantCorporativo={nodoCorp?.tenantCorporativo ?? null}
                scope={scope as 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO'}
            />
        </div>
    );
}
