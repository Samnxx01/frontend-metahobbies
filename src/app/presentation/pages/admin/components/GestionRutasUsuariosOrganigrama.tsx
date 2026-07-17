import React, { useMemo, useState } from 'react';
import { Building2, ChevronDown, ChevronRight, Edit, Globe, Loader2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { JerarquiaResponse, TenantUsuario } from '@/app/services/tenantUsuariosService';
import {
  buildGestionRutasOrganigramaTree,
  filtrarOrganigramaPorTexto,
  type GestionRutasOrganigramaNodo,
  type GestionRutasOrganigramaTipo,
} from '@/app/presentation/utils/gestionRutasOrganigramaTree';

const TIPO_STYLES: Record<GestionRutasOrganigramaTipo, string> = {
  GRUPO: 'border-destructive/80 bg-destructive/50 dark:bg-destructive/20',
  SA_LIBRE: 'border-warning/80 bg-warning/40 dark:bg-warning/15',
  TG: 'border-info/80 bg-info/40 dark:bg-info/15',
  CORP: 'border-info/80 bg-info/40 dark:bg-info/15',
  USUARIO: 'border-border bg-card',
};

const TIPO_LABEL: Record<GestionRutasOrganigramaTipo, string> = {
  GRUPO: 'Grupo',
  SA_LIBRE: 'SA',
  TG: 'TG',
  CORP: 'Corp',
  USUARIO: 'Usuario',
};

function TipoIcon({ tipo }: { tipo: GestionRutasOrganigramaTipo }): React.ReactElement {
  if (tipo === 'TG') return <Globe className="h-4 w-4 shrink-0 text-info" />;
  if (tipo === 'CORP' || tipo === 'SA_LIBRE') return <Building2 className="h-4 w-4 shrink-0 text-warning" />;
  if (tipo === 'USUARIO') return <User className="h-4 w-4 shrink-0 text-muted-foreground" />;
  return <ChevronRight className="h-4 w-4 shrink-0 text-destructive" />;
}

function NodoFila({
  nodo,
  nivel,
  onEditUsuario,
}: {
  nodo: GestionRutasOrganigramaNodo;
  nivel: number;
  onEditUsuario?: (u: TenantUsuario) => void;
}): React.ReactElement {
  const [abierto, setAbierto] = useState(nivel < 2);
  const tieneHijos = nodo.children.length > 0;
  const esUsuario = nodo.tipo === 'USUARIO' && nodo.usuario;

  return (
    <div className={nivel > 0 ? 'ml-4 border-l border-dashed border-border pl-3' : ''}>
      <div className={`mb-2 flex items-start gap-2 rounded-lg border px-3 py-2 ${TIPO_STYLES[nodo.tipo]}`}>
        {tieneHijos ? (
          <button
            type="button"
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => setAbierto((v) => !v)}
            aria-label={abierto ? 'Contraer' : 'Expandir'}
          >
            {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <TipoIcon tipo={nodo.tipo} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{nodo.titulo}</span>
            <Badge variant="outline" className="text-[10px]">
              {TIPO_LABEL[nodo.tipo]}
            </Badge>
            {nodo.codigo ? (
              <Badge variant="secondary" className="font-mono text-[10px]">
                {nodo.codigo}
              </Badge>
            ) : null}
            {nodo.codigoPadre ? (
              <span className="font-mono text-[10px] text-muted-foreground">← {nodo.codigoPadre}</span>
            ) : null}
            {esUsuario && nodo.usuario?.rol ? (
              <Badge className="text-[10px]">{nodo.usuario.rol}</Badge>
            ) : null}
          </div>
          {nodo.detalle ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{nodo.detalle}</p>
          ) : null}
        </div>
        {esUsuario && onEditUsuario && nodo.usuario ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onEditUsuario(nodo.usuario!)}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
      {tieneHijos && abierto ? (
        <div className="space-y-0">
          {nodo.children.map((h) => (
            <NodoFila key={h.id} nodo={h} nivel={nivel + 1} onEditUsuario={onEditUsuario} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type GestionRutasUsuariosOrganigramaProps = {
  jerarquia: JerarquiaResponse | null;
  loading?: boolean;
  busqueda?: string;
  onEditUsuario?: (u: TenantUsuario) => void;
};

export function GestionRutasUsuariosOrganigrama({
  jerarquia,
  loading = false,
  busqueda = '',
  onEditUsuario,
}: GestionRutasUsuariosOrganigramaProps): React.ReactElement {
  const arbol = useMemo(() => buildGestionRutasOrganigramaTree(jerarquia), [jerarquia]);
  const filtrado = useMemo(() => filtrarOrganigramaPorTexto(arbol, busqueda), [arbol, busqueda]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-destructive" />
      </div>
    );
  }

  if (!jerarquia) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        Pulsa actualizar para cargar el organigrama de tu sesión.
      </p>
    );
  }

  if (!filtrado.length) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        {busqueda.trim()
          ? 'Sin coincidencias en el organigrama para esa búsqueda.'
          : 'No hay ramas visibles en tu alcance jerárquico.'}
      </p>
    );
  }

  return (
    <div className="space-y-1 pr-1">
      {filtrado.map((n) => (
        <NodoFila key={n.id} nodo={n} nivel={0} onEditUsuario={onEditUsuario} />
      ))}
    </div>
  );
}
