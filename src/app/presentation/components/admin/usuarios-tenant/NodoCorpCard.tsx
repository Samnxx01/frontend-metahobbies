import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Building2, Users, UserCheck, UserPlus, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BTN_GHOST_ACCENT } from '@/app/utils/buttonStyles';
import { Button } from '@/components/ui/button';
import type { CorpNode, TenantUsuario } from '@/app/services/tenantUsuariosService';

interface UsuarioRowProps {
    usuario: TenantUsuario;
    tipo: 'admin' | 'cliente';
    onEdit?: () => void;
}

const UsuarioRow = ({ usuario, tipo, onEdit }: UsuarioRowProps) => (
    <div className="flex items-center justify-between py-1.5 px-3 text-sm rounded transition-colors hover:bg-muted/50">
        <div className="flex items-center gap-2 min-w-0">
            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                usuario.estado === true || usuario.estado === 'activo' ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            <span className="truncate text-muted-foreground">{usuario.correo}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {usuario.rol && (
                <Badge variant="outline" className="text-xs">
                    {usuario.rol}
                </Badge>
            )}
            <Badge variant={tipo === 'cliente' ? 'secondary' : 'default'} className="text-xs">
                {tipo === 'cliente' ? 'Cliente' : 'Admin'}
            </Badge>
            {onEdit && (
                <Button variant="ghost" size="icon" className={`h-7 w-7 ${BTN_GHOST_ACCENT}`} onClick={onEdit}>
                    <Edit className="h-3.5 w-3.5" />
                </Button>
            )}
        </div>
    </div>
);

interface NodoCorpCardProps {
    nodo: CorpNode;
    nivel?: number;
    scope: 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO';
    onAddUsuario: (nodo: CorpNode) => void;
    onEditUsuario?: (u: TenantUsuario, corp: CorpNode) => void;
}

export const NodoCorpCard = ({
    nodo,
    nivel = 0,
    scope,
    onAddUsuario,
    onEditUsuario,
}: NodoCorpCardProps): React.ReactElement => {
    const [expanded, setExpanded] = useState(nivel < 2);
    const { tenantCorporativo, usuarios, clientes, hijos } = nodo;

    const totalUsuarios = usuarios.length + clientes.length;
    const tieneHijos = hijos.length > 0;

    return (
        <div
            className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm"
            style={{ marginLeft: nivel > 0 ? `${nivel * 16}px` : undefined }}
        >
            {/* Cabecera */}
            <div
                className="flex items-center gap-2 p-3 bg-card cursor-pointer select-none hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded(e => !e)}
            >
                <button
                    type="button"
                    className="text-muted-foreground flex-shrink-0"
                    onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                >
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                <Building2 className="h-4 w-4 text-primary flex-shrink-0" />

                <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                        {tenantCorporativo.razon_social ?? tenantCorporativo.titulo ?? `Corp. ${tenantCorporativo.iud.slice(-6)}`}
                    </p>
                    {tenantCorporativo.nvlNombre && (
                        <p className="text-xs text-muted-foreground">
                            {tenantCorporativo.nvlNombre} · Nivel {tenantCorporativo.nvlGeneracion}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs gap-1">
                        <Users className="h-3 w-3" />
                        {totalUsuarios}
                    </Badge>
                    {tieneHijos && (
                        <Badge variant="secondary" className="text-xs">
                            {hijos.length} {hijos.length === 1 ? 'hijo' : 'hijos'}
                        </Badge>
                    )}
                    <Badge
                        variant={tenantCorporativo.estado === true || tenantCorporativo.estado === 'activo' ? 'default' : 'secondary'}
                        className="text-xs"
                    >
                        {tenantCorporativo.estado === true || tenantCorporativo.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 gap-1 text-xs"
                        onClick={e => { e.stopPropagation(); onAddUsuario(nodo); }}
                    >
                        <UserPlus className="h-3.5 w-3.5" />
                        Agregar
                    </Button>
                </div>
            </div>

            {/* Cuerpo */}
            {expanded && (
                <div className="border-t border-border bg-background/60">
                    {usuarios.length > 0 && (
                        <div className="p-3">
                            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
                                <UserCheck className="h-3.5 w-3.5" />
                                Usuarios ({usuarios.length})
                            </p>
                            <div className="space-y-0.5">
                                {usuarios.map(u => (
                                    <UsuarioRow
                                        key={u.iud}
                                        usuario={u}
                                        tipo="admin"
                                        onEdit={onEditUsuario ? () => onEditUsuario(u, nodo) : undefined}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {clientes.length > 0 && (
                        <div className={`p-3 ${usuarios.length > 0 ? 'border-t border-border' : ''}`}>
                            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
                                <Users className="h-3.5 w-3.5" />
                                Clientes ({clientes.length})
                            </p>
                            <div className="space-y-0.5">
                                {clientes.map(u => (
                                    <UsuarioRow
                                        key={u.iud}
                                        usuario={u}
                                        tipo="cliente"
                                        onEdit={onEditUsuario ? () => onEditUsuario(u, nodo) : undefined}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {totalUsuarios === 0 && !tieneHijos && (
                        <p className="text-xs text-muted-foreground p-3">Sin usuarios registrados.</p>
                    )}

                    {tieneHijos && (
                        <div className={`p-3 space-y-2 ${totalUsuarios > 0 ? 'border-t border-border' : ''}`}>
                            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Sub-corporativos</p>
                            {hijos.map(hijo => (
                                <NodoCorpCard
                                    key={hijo.tenantCorporativo.iud}
                                    nodo={hijo}
                                    nivel={nivel + 1}
                                    scope={scope}
                                    onAddUsuario={onAddUsuario}
                                    onEditUsuario={onEditUsuario}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
