import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Globe, Loader2, RefreshCw, Search, Shield, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import { getJerarquiaUsuarios, type JerarquiaEvaluacionUsuarios } from '@/app/services/tenantUsuariosService';
import {
  buildUsuariosSaTgTcDesdeJerarquia,
  type NivelJerarquiaTenant,
  type UsuarioJerarquiaNivelRow,
} from '@/app/presentation/utils/jerarquiaUsuariosFlatten';

interface UsuariosTenantJerarquiaListadoModalProps {
  open: boolean;
  onClose: () => void;
  onEditUsuario?: (u: UsuarioJerarquiaNivelRow) => void;
}

const NIVEL_META: Record<
  NivelJerarquiaTenant,
  { label: string; short: string; icon: React.ReactNode; badgeClass: string }
> = {
  SA: {
    label: 'Super Admin (SA)',
    short: 'SA',
    icon: <Shield className="h-4 w-4" />,
    badgeClass: 'border-info/30 bg-info/10 text-info dark:text-info',
  },
  TG: {
    label: 'Tenant global (TG)',
    short: 'TG',
    icon: <Globe className="h-4 w-4" />,
    badgeClass: 'border-info/30 bg-info/10 text-info dark:text-info',
  },
  TC: {
    label: 'Tenant corporativo (TC)',
    short: 'TC',
    icon: <Building2 className="h-4 w-4" />,
    badgeClass: 'border-success/30 bg-success/10 text-success dark:text-success',
  },
};

function filtrarUsuarios(
  rows: UsuarioJerarquiaNivelRow[],
  busqueda: string,
): UsuarioJerarquiaNivelRow[] {
  const q = busqueda.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (u) =>
      u.nombre.toLowerCase().includes(q) ||
      u.correo.toLowerCase().includes(q) ||
      u.rol.toLowerCase().includes(q) ||
      u.contexto.toLowerCase().includes(q) ||
      (u.corporativoAsociado?.label ?? '').toLowerCase().includes(q),
  );
}

function ListaUsuarios({
  rows,
  loading,
  onEditUsuario,
}: {
  rows: UsuarioJerarquiaNivelRow[];
  loading: boolean;
  onEditUsuario?: (u: UsuarioJerarquiaNivelRow) => void;
}): React.ReactElement {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Cargando usuarios…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        No hay usuarios en este nivel dentro de tu alcance JWT.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      {rows.map((u) => {
        const activo = u.estado === true || u.estado === 'activo';
        const nivelMeta = NIVEL_META[u.nivel];
        return (
          <div
            key={u.iud}
            className="flex flex-wrap items-center justify-between gap-2 bg-background px-4 py-3 text-sm hover:bg-muted/20"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{u.correo || u.nombre}</p>
              {u.nombre !== '-' && u.correo ? (
                <p className="truncate text-xs text-muted-foreground">{u.nombre}</p>
              ) : null}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px]">
                  {u.rol}
                </Badge>
                <Badge variant="outline" className={`text-[10px] ${nivelMeta.badgeClass}`}>
                  {nivelMeta.short}
                </Badge>
                <Badge
                  variant={activo ? 'default' : 'outline'}
                  className="text-[10px]"
                >
                  {activo ? 'Activo' : 'Inactivo'}
                </Badge>
                {u.corporativoAsociado?.label ? (
                  <Badge variant="outline" className="gap-0.5 text-[10px]">
                    <Building2 className="h-3 w-3 shrink-0" />
                    {u.corporativoAsociado.label}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 truncate text-[11px] text-muted-foreground" title={u.contexto}>
                {u.contexto}
              </p>
            </div>
            {onEditUsuario ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 text-xs"
                onClick={() => onEditUsuario(u)}
              >
                Editar
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function UsuariosTenantJerarquiaListadoModal({
  open,
  onClose,
  onEditUsuario,
}: UsuariosTenantJerarquiaListadoModalProps): React.ReactElement {
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [tab, setTab] = useState<'todos' | NivelJerarquiaTenant>('todos');
  const [sa, setSa] = useState<UsuarioJerarquiaNivelRow[]>([]);
  const [tg, setTg] = useState<UsuarioJerarquiaNivelRow[]>([]);
  const [tc, setTc] = useState<UsuarioJerarquiaNivelRow[]>([]);
  const [mensajeAlcance, setMensajeAlcance] = useState('');
  const [scope, setScope] = useState<string | null>(null);
  const [resumenCounters, setResumenCounters] = useState<{
    sa: number;
    tg: number;
    tc: number;
    total: number;
    entidadesEnCounters?: { total: number };
  } | null>(null);
  const [jerarquiaEvaluacion, setJerarquiaEvaluacion] = useState<JerarquiaEvaluacionUsuarios | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const jerarquia = await getJerarquiaUsuarios({ useAuth: true });
      const data = buildUsuariosSaTgTcDesdeJerarquia(jerarquia);
      setSa(data.sa);
      setTg(data.tg);
      setTc(data.tc);
      setMensajeAlcance(data.meta.mensajeAlcance);
      setScope(data.meta.scope);
      setResumenCounters(data.meta.resumenCounters ?? null);
      setJerarquiaEvaluacion(data.meta.jerarquiaEvaluacion ?? null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar usuarios');
      setSa([]);
      setTg([]);
      setTc([]);
      setResumenCounters(null);
      setJerarquiaEvaluacion(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setBusqueda('');
      setTab('todos');
      return;
    }
    void cargar();
  }, [open, cargar]);

  const todos = useMemo(() => {
    const porIud = new Map<string, UsuarioJerarquiaNivelRow>();
    for (const u of [...sa, ...tg, ...tc]) {
      porIud.set(u.iud, u);
    }
    return [...porIud.values()];
  }, [sa, tg, tc]);

  const badgeSa = resumenCounters?.sa ?? sa.length;
  const badgeTg = resumenCounters?.tg ?? tg.length;
  const badgeTc = resumenCounters?.tc ?? tc.length;
  const badgeTotal = resumenCounters?.total ?? todos.length;

  const filtradosSa = useMemo(() => filtrarUsuarios(sa, busqueda), [sa, busqueda]);
  const filtradosTg = useMemo(() => filtrarUsuarios(tg, busqueda), [tg, busqueda]);
  const filtradosTc = useMemo(() => filtrarUsuarios(tc, busqueda), [tc, busqueda]);
  const filtradosTodos = useMemo(() => filtrarUsuarios(todos, busqueda), [todos, busqueda]);

  const listasPorTab: Record<'todos' | NivelJerarquiaTenant, UsuarioJerarquiaNivelRow[]> = {
    todos: filtradosTodos,
    SA: filtradosSa,
    TG: filtradosTg,
    TC: filtradosTc,
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[92vh] w-[min(96vw,52rem)] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Usuarios Tenant SA, TG y TC
          </DialogTitle>
          <p className="text-left text-xs font-normal leading-relaxed text-muted-foreground">
            {mensajeAlcance || 'Listado según el organigrama visible en tu sesión.'}
            {scope ? (
              <>
                {' '}
                Alcance: <strong>{scope}</strong>.
              </>
            ) : null}
            {resumenCounters?.entidadesEnCounters &&
            resumenCounters.entidadesEnCounters.total !== badgeTotal ? (
              <>
                {' '}
                En counters hay {resumenCounters.entidadesEnCounters.total} emisión(es) SA/TG/TC; listados{' '}
                {badgeTotal} usuario(s) (RegisUsu + roles + tenantSuperAdmin + counters, scope JWT).
              </>
            ) : jerarquiaEvaluacion ? (
              <>
                {' '}
                Evaluación: RegisUsu + roles + tenantSuperAdmin + tenantjerarquiacounters (scope JWT).
              </>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline" className={NIVEL_META.SA.badgeClass}>
              SA · {badgeSa}
            </Badge>
            <Badge variant="outline" className={NIVEL_META.TG.badgeClass}>
              TG · {badgeTg}
            </Badge>
            <Badge variant="outline" className={NIVEL_META.TC.badgeClass}>
              TC · {badgeTc}
            </Badge>
            <Badge variant="secondary">Total · {badgeTotal}</Badge>
          </div>
        </DialogHeader>

        <div className="shrink-0 border-b border-border px-6 py-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, correo, rol o contexto…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void cargar()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as typeof tab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="mx-6 mt-3 grid h-auto w-auto shrink-0 grid-cols-2 gap-1 sm:grid-cols-4">
            <TabsTrigger value="todos" className="text-xs">
              Todos ({filtradosTodos.length})
            </TabsTrigger>
            <TabsTrigger value="SA" className="gap-1 text-xs">
              {NIVEL_META.SA.icon}
              SA ({filtradosSa.length})
            </TabsTrigger>
            <TabsTrigger value="TG" className="gap-1 text-xs">
              {NIVEL_META.TG.icon}
              TG ({filtradosTg.length})
            </TabsTrigger>
            <TabsTrigger value="TC" className="gap-1 text-xs">
              {NIVEL_META.TC.icon}
              TC ({filtradosTc.length})
            </TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
            {(['todos', 'SA', 'TG', 'TC'] as const).map((key) => (
              <TabsContent key={key} value={key} className="mt-0 focus-visible:outline-none">
                <ListaUsuarios
                  rows={listasPorTab[key]}
                  loading={loading && todos.length === 0}
                  onEditUsuario={onEditUsuario}
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>

        <div className="flex shrink-0 justify-end border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UsuariosTenantJerarquiaListadoModal;
