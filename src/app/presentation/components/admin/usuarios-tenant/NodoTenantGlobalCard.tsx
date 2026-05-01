import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Users, Edit, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NodoCorpCard } from './NodoCorpCard';
import type { TenantGlobalNode, TenantUsuario, CorpNode } from '@/app/services/tenantUsuariosService';

// ─── Fila de usuario ─────────────────────────────────────────────────────────

const UsuarioRow = ({ usuario, onEdit }: { usuario: TenantUsuario; onEdit?: () => void }) => (
    <div className="flex items-center justify-between py-1.5 px-3 text-sm rounded transition-colors hover:bg-muted/50">
        <div className="flex items-center gap-2 min-w-0">
            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                usuario.estado === true || usuario.estado === 'activo' ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            <span className="truncate text-muted-foreground">{usuario.correo}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {usuario.rol && <Badge variant="outline" className="text-xs">{usuario.rol}</Badge>}
            {onEdit && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/70 hover:bg-primary/10 hover:text-primary" onClick={onEdit}>
                    <Edit className="h-3.5 w-3.5" />
                </Button>
            )}
        </div>
    </div>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface NodoTenantGlobalCardProps {
    nodo: TenantGlobalNode;
    nivel?: number;
    scope: 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO';
    onAddUsuario: (nodo: CorpNode) => void;
    onEditUsuario?: (u: TenantUsuario, tg: any) => void;
    onEditUsuarioCorp?: (u: TenantUsuario, corp: CorpNode) => void;
    onEditTG?: (tg: any) => void;
}

// ─── Componente recursivo ─────────────────────────────────────────────────────

export const NodoTenantGlobalCard = ({
    nodo,
    nivel = 0,
    scope,
    onAddUsuario,
    onEditUsuario,
    onEditUsuarioCorp,
    onEditTG,
}: NodoTenantGlobalCardProps): React.ReactElement => {
    const [expanded, setExpanded] = useState(nivel < 2);

    const { tenantGlobal, usuarios, corporativos, subTenantGlobales } = nodo;

    const tieneSubGlobales = (subTenantGlobales?.length ?? 0) > 0;
    const tieneCorporativos = corporativos.length > 0;
    const tieneContenido = usuarios.length > 0 || tieneCorporativos || tieneSubGlobales;

    const indentLeft = nivel > 0 ? nivel * 20 : 0;

    return (
        <section
            className="space-y-2"
            style={{ marginLeft: indentLeft > 0 ? `${indentLeft}px` : undefined }}
        >
            {/* Cabecera del TenantGlobal */}
            {tenantGlobal && (
                <div
                    className="flex items-center gap-2 cursor-pointer select-none group rounded-lg border border-border bg-card px-3 py-2 text-card-foreground shadow-sm transition-colors hover:bg-muted/30"
                    onClick={() => setExpanded(e => !e)}
                >
                    <button
                        type="button"
                        className="text-muted-foreground flex-shrink-0"
                        onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                    >
                        {tieneContenido
                            ? (expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)
                            : <span className="w-4 inline-block" />
                        }
                    </button>

                    <Globe className="h-4 w-4 text-primary flex-shrink-0" />

                    <h2 className="text-base font-semibold">
                        {tenantGlobal.razon_social ?? tenantGlobal.titulo ?? 'Tenant Global'}
                    </h2>

                    {tenantGlobal.nit_ruc_rtn && (
                        <span className="text-xs text-muted-foreground">
                            NIT: {tenantGlobal.nit_ruc_rtn}
                        </span>
                    )}

                    {tenantGlobal.codigoJerarquia && (
                        <Badge variant="outline" className="text-xs font-mono">
                            {tenantGlobal.codigoJerarquia}
                        </Badge>
                    )}

                    {tenantGlobal.profundidad > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            Sub-nivel {tenantGlobal.profundidad}
                        </Badge>
                    )}

                    <Badge
                        variant={tenantGlobal.estado === true || tenantGlobal.estado === 'activo' ? 'default' : 'secondary'}
                        className="text-xs"
                    >
                        {tenantGlobal.estado === true || tenantGlobal.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </Badge>

                    {tieneSubGlobales && (
                        <Badge variant="outline" className="text-xs">
                            {subTenantGlobales.length} sub-global{subTenantGlobales.length !== 1 ? 'es' : ''}
                        </Badge>
                    )}

                    {scope === 'SUPER_ADMIN' && onEditTG && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 ml-1 text-foreground/70 hover:bg-primary/10 hover:text-primary"
                            onClick={e => { e.stopPropagation(); onEditTG(tenantGlobal); }}
                        >
                            <Edit className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            )}

            {/* Contenido expandido */}
            {expanded && (
                <div className="space-y-3">
                    {/* Usuarios directos del TenantGlobal */}
                    {usuarios.length > 0 && (
                        <div className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
                            <div className="px-3 py-2 bg-muted/30 text-xs font-semibold flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5" />
                                Usuarios del Tenant Global ({usuarios.length})
                            </div>
                            <div className="divide-y divide-border">
                                {usuarios.map(u => (
                                    <UsuarioRow
                                        key={u.iud}
                                        usuario={u}
                                        onEdit={scope === 'SUPER_ADMIN' && onEditUsuario
                                            ? () => onEditUsuario(u, tenantGlobal)
                                            : undefined
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sub-TenantGlobals (jerarquía recursiva) */}
                    {tieneSubGlobales && (
                        <div className="space-y-3 border-l-2 border-primary/20 pl-3">
                            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                <Globe className="h-3.5 w-3.5" />
                                Sub-Tenant Globales ({subTenantGlobales.length})
                            </p>
                            {subTenantGlobales.map((subNodo, idx) => (
                                <NodoTenantGlobalCard
                                    key={subNodo.tenantGlobal?.iud ?? idx}
                                    nodo={subNodo}
                                    nivel={nivel + 1}
                                    scope={scope}
                                    onAddUsuario={onAddUsuario}
                                    onEditUsuario={onEditUsuario}
                                    onEditUsuarioCorp={onEditUsuarioCorp}
                                    onEditTG={onEditTG}
                                />
                            ))}
                        </div>
                    )}

                    {/* Árbol de corporativos */}
                    {tieneCorporativos && (
                        <div className="space-y-2">
                            {corporativos.map(corp => (
                                <NodoCorpCard
                                    key={corp.tenantCorporativo.iud}
                                    nodo={corp}
                                    nivel={0}
                                    scope={scope}
                                    onAddUsuario={onAddUsuario}
                                    onEditUsuario={onEditUsuarioCorp}
                                />
                            ))}
                        </div>
                    )}

                    {!tieneContenido && (
                        <p className="rounded-lg border border-dashed border-border bg-card p-3 text-sm text-muted-foreground">Sin registros en este tenant.</p>
                    )}
                </div>
            )}
        </section>
    );
};
