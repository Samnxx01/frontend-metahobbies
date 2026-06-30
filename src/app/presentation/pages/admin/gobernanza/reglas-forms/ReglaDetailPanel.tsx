import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import type { ReglaDios, RecursoVista, AccionUsu, ContextoDefi } from '@/app/services/reglasGobernanzaDiosService';

type Tab = 'vistas' | 'acciones' | 'contexto';

const METHOD_STYLES: Record<string, string> = {
  GET:    'bg-emerald-100 text-emerald-800 border-emerald-300',
  POST:   'bg-blue-100 text-blue-800 border-blue-300',
  PUT:    'bg-orange-100 text-orange-800 border-orange-300',
  PATCH:  'bg-amber-100 text-amber-800 border-amber-300',
  DELETE: 'bg-red-100 text-red-800 border-red-300',
};

function methodStyle(method?: string) {
  return METHOD_STYLES[String(method ?? '').toUpperCase()] ?? 'bg-muted text-foreground/70 border-border';
}

function VistaTable({ vistas }: { vistas: RecursoVista[] }) {
  const [buscar, setBuscar] = useState('');

  const filtradas = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    if (!q) return vistas;
    return vistas.filter(
      (v) =>
        (v.path ?? '').toLowerCase().includes(q) ||
        (v.name ?? '').toLowerCase().includes(q) ||
        (v.component ?? '').toLowerCase().includes(q),
    );
  }, [vistas, buscar]);

  return (
    <div className="space-y-2">
      {/* Buscador */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filtrar por path o nombre…"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {filtradas.length} / {vistas.length}
        </span>
        {buscar && (
          <button
            type="button"
            onClick={() => setBuscar('')}
            className="text-[11px] text-primary underline shrink-0"
          >
            limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="max-h-64 overflow-y-auto rounded-md border border-border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm">
            <tr>
              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground w-8">#</th>
              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Path / Ruta</th>
              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground hidden sm:table-cell">Nombre</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtradas.map((v, i) => (
                <tr
                  key={v._id ?? v.iud ?? i}
                  className="border-t border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="px-3 py-1.5 font-mono text-foreground/80 break-all">
                    {v.path ?? v._id ?? v.iud ?? '—'}
                  </td>
                  <td className="px-3 py-1.5 text-foreground/60 hidden sm:table-cell">
                    {v.name ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AccionesPanel({ acciones }: { acciones: AccionUsu[] }) {
  if (!acciones.length) return <p className="text-xs text-muted-foreground">Sin acciones registradas.</p>;
  return (
    <div className="flex flex-wrap gap-2 py-1">
      {acciones.map((a, i) => (
        <span
          key={a._id ?? a.iud ?? i}
          className={`rounded border px-3 py-1.5 font-mono text-xs font-semibold tracking-wide ${methodStyle(a.method)}`}
        >
          {a.method ?? '?'}
        </span>
      ))}
    </div>
  );
}

function ContextoPanel({ contextos }: { contextos: ContextoDefi[] }) {
  if (!contextos.length) return <p className="text-xs text-muted-foreground">Sin contexto definido.</p>;
  return (
    <div className="flex flex-wrap gap-2 py-1">
      {contextos.map((c, i) => (
        <Badge key={c._id ?? c.iud ?? i} variant="outline" className="text-xs px-3 py-1">
          {c.contexto ?? '—'}
        </Badge>
      ))}
    </div>
  );
}

export interface ReglaDetailPanelProps {
  regla: ReglaDios;
  /** Slot opcional: botones de acción (Desactivar / Eliminar) */
  actions?: React.ReactNode;
}

export function ReglaDetailPanel({ regla, actions }: ReglaDetailPanelProps): React.ReactElement {
  const [tab, setTab] = useState<Tab>('vistas');

  const vistas = Array.isArray(regla.recurso) ? regla.recurso : [];
  const acciones = Array.isArray(regla.accionesUsu) ? regla.accionesUsu : [];
  const contextos = Array.isArray(regla.contextoDefi) ? regla.contextoDefi : [];
  const activa = regla.estado !== false;
  const rid = String(regla.iud || regla._id || '');

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'vistas',   label: 'Vistas',   count: vistas.length   },
    { id: 'acciones', label: 'Acciones', count: acciones.length },
    { id: 'contexto', label: 'Contexto', count: contextos.length },
  ];

  return (
    <div className={`rounded-lg border ${activa ? 'border-border' : 'border-amber-300'} bg-background shadow-sm overflow-hidden`}>
      {/* Header de la regla */}
      <div className={`flex flex-wrap items-start justify-between gap-3 px-4 py-3 ${activa ? 'bg-muted/30' : 'bg-amber-50/60'}`}>
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-foreground/80">
              [DIOS] Regla
            </span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-foreground/70 break-all">
              {rid}
            </code>
            {!activa && (
              <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 bg-amber-50">
                desactivada
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {regla.securityPlatform && (
              <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-800 bg-blue-50">
                securityPlatform
              </Badge>
            )}
            {regla.dominioTenatGlobales && (
              <Badge variant="outline" className="text-[10px]">
                {regla.dominioTenatGlobales}
              </Badge>
            )}
            {/* Resumen rápido de métodos HTTP en el header */}
            {acciones.map((a, i) => (
              <span
                key={i}
                className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${methodStyle(a.method)}`}
              >
                {a.method ?? '?'}
              </span>
            ))}
          </div>
          {regla.createdAt && (
            <p className="text-[10px] text-muted-foreground">
              Creada: {new Date(String(regla.createdAt)).toLocaleString('es-CO')}
            </p>
          )}
        </div>

        {/* Acciones externas (slot) */}
        {actions && <div className="flex gap-1.5 shrink-0">{actions}</div>}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-background">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                tab === t.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido del tab */}
      <div className="p-4">
        {tab === 'vistas'   && <VistaTable vistas={vistas} />}
        {tab === 'acciones' && <AccionesPanel acciones={acciones} />}
        {tab === 'contexto' && <ContextoPanel contextos={contextos} />}
      </div>
    </div>
  );
}
