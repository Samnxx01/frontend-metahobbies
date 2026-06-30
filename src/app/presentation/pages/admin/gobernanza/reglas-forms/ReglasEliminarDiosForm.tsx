import React, { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createGobernanzaReglasFormRoute } from './gobernanzaReglasFormRoute';
import { ENDPOINT_ID_BY_REGLAS_COMPONENT } from './gobernanzaReglasFormRegistry';
import type { GobernanzaReglasFormProps } from './types';
import { ReglaDetailPanel } from './ReglaDetailPanel';
import { ReglasDesactivadasDiosModal } from './ReglasDesactivadasDiosModal';
import {
  desactivarReglaDiosPorId,
  eliminarReglaDiosPorId,
  listarReglasDiosPorTenant,
  listarSaAlcanceDios,
  type ReglaDios,
  type SaAlcanceDiosItem,
} from '@/app/services/reglasGobernanzaDiosService';

const ENDPOINT_ID = ENDPOINT_ID_BY_REGLAS_COMPONENT.ReglasEliminarDiosForm;
const ReglasEliminarDiosFormRoute = createGobernanzaReglasFormRoute(ENDPOINT_ID);

type Fase = 'idle' | 'loading' | 'error';
type AccionRegla = 'desactivar' | 'eliminar';

export function ReglasEliminarDiosForm(props: GobernanzaReglasFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return <ReglasEliminarDiosFormRoute />;
  return <ReglasEliminarDiosFormContent />;
}

function ConfirmPanel({
  rid,
  confirmar,
  faseAccion,
  errorAccion,
  onConfirmar,
  onCancelar,
}: {
  rid: string;
  confirmar: { id: string; accion: AccionRegla };
  faseAccion: Fase;
  errorAccion: string | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}): React.ReactElement {
  const esEliminar = confirmar.accion === 'eliminar';
  return (
    <div className={`mt-2 rounded-md border p-3 space-y-2 ${
      esEliminar ? 'border-destructive/40 bg-destructive/5' : 'border-amber-400/40 bg-amber-50'
    }`}>
      <p className={`text-sm font-medium ${esEliminar ? 'text-destructive' : 'text-amber-700'}`}>
        {esEliminar
          ? '¿Confirmas eliminar permanentemente esta regla?'
          : '¿Confirmas desactivar esta regla?'}
      </p>
      <p className="font-mono text-xs text-muted-foreground break-all">{rid}</p>
      <div className="flex gap-2">
        <Button
          variant={esEliminar ? 'destructive' : 'outline'}
          size="sm"
          onClick={onConfirmar}
          disabled={faseAccion === 'loading'}
          className={!esEliminar ? 'border-amber-400 text-amber-700' : ''}
        >
          {faseAccion === 'loading'
            ? `${esEliminar ? 'Eliminando' : 'Desactivando'}…`
            : 'Confirmar'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancelar}
          disabled={faseAccion === 'loading'}
        >
          Cancelar
        </Button>
      </div>
      {errorAccion && <p className="text-xs text-destructive">{errorAccion}</p>}
    </div>
  );
}

function ReglasEliminarDiosFormContent(): React.ReactElement {
  const [faseSa, setFaseSa] = useState<Fase>('idle');
  const [tenants, setTenants] = useState<SaAlcanceDiosItem[]>([]);
  const [errorSa, setErrorSa] = useState<string | null>(null);

  const [tenantSelId, setTenantSelId] = useState('');

  const [faseReglas, setFaseReglas] = useState<Fase>('idle');
  const [reglas, setReglas] = useState<ReglaDios[]>([]);
  const [errorReglas, setErrorReglas] = useState<string | null>(null);

  const [confirmar, setConfirmar] = useState<{ id: string; accion: AccionRegla } | null>(null);
  const [faseAccion, setFaseAccion] = useState<Fase>('idle');
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [resultados, setResultados] = useState<{ id: string; accion: AccionRegla }[]>([]);

  useEffect(() => {
    setFaseSa('loading');
    setErrorSa(null);
    listarSaAlcanceDios()
      .then((res) => { setTenants(res.tenants ?? []); setFaseSa('idle'); })
      .catch((err) => {
        const msg = String(err?.message ?? 'Error cargando tenants SA');
        setErrorSa(msg);
        setFaseSa('error');
        toast.error(msg);
      });
  }, []);

  const cargarReglas = useCallback((saId: string) => {
    if (!saId) return;
    setFaseReglas('loading');
    setErrorReglas(null);
    setReglas([]);
    setConfirmar(null);
    setResultados([]);
    setErrorAccion(null);
    listarReglasDiosPorTenant(saId)
      .then((res) => { setReglas(res.reglas ?? []); setFaseReglas('idle'); })
      .catch((err) => {
        const msg = String(err?.message ?? 'Error cargando reglas');
        setErrorReglas(msg);
        setFaseReglas('error');
        toast.error(msg);
      });
  }, []);

  const handleTenantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setTenantSelId(id);
    if (id) cargarReglas(id);
    else { setReglas([]); setFaseReglas('idle'); }
  };

  const handleConfirmar = async () => {
    if (!tenantSelId || !confirmar) return;
    const { id: reglaId, accion } = confirmar;
    const label = accion === 'desactivar' ? 'Desactivando' : 'Eliminando';
    const toastId = toast.loading(`${label} regla…`);
    setFaseAccion('loading');
    setErrorAccion(null);
    try {
      if (accion === 'desactivar') {
        await desactivarReglaDiosPorId(tenantSelId, reglaId);
        setReglas((prev) =>
          prev.map((r) => (r.iud === reglaId || r._id === reglaId ? { ...r, estado: false } : r))
        );
        toast.success(`Regla ${reglaId.slice(0, 8)}… desactivada`, { id: toastId });
      } else {
        await eliminarReglaDiosPorId(tenantSelId, reglaId);
        setReglas((prev) => prev.filter((r) => r.iud !== reglaId && r._id !== reglaId));
        toast.success(`Regla ${reglaId.slice(0, 8)}… eliminada permanentemente`, { id: toastId });
      }
      setResultados((prev) => [...prev, { id: reglaId, accion }]);
      setConfirmar(null);
      setFaseAccion('idle');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err ?? 'Error en la operación');
      setErrorAccion(msg);
      setFaseAccion('error');
      toast.error(msg, { id: toastId });
    }
  };

  const tenantsManipulables = tenants.filter((t) => t.puedeManipularDios);
  const tenantsBloqueados = tenants.filter((t) => !t.puedeManipularDios);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
        <Badge variant="outline" className="rounded-md">Eliminar regla DIOS</Badge>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Eliminación de regla de plataforma. Solo tenants SA raíz (sin codigoPadre) pueden ser
          manipulados por rol DIOS.
        </p>
      </div>

      {/* Acceso rápido a reglas desactivadas */}
      <div className="flex justify-end">
        <ReglasDesactivadasDiosModal />
      </div>

      {/* Selector tenant SA */}
      <div className="space-y-1">
        <label className="block text-sm font-medium">
          Tenant SuperAdmin <span className="text-destructive">*</span>
        </label>
        {faseSa === 'loading' ? (
          <p className="text-xs text-muted-foreground">Cargando tenants del scope JWT…</p>
        ) : faseSa === 'error' ? (
          <p className="text-xs text-destructive">{errorSa}</p>
        ) : (
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={tenantSelId}
            onChange={handleTenantChange}
          >
            <option value="">— Selecciona un tenant SA —</option>
            {tenantsManipulables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.codigoJerarquia ? `[${t.codigoJerarquia}] ` : ''}{t.id}
              </option>
            ))}
            {tenantsBloqueados.length > 0 && (
              <optgroup label="Sin acceso DIOS (tienen codigoPadre)">
                {tenantsBloqueados.map((t) => (
                  <option key={t.id} value="" disabled>
                    {t.codigoJerarquia ? `[${t.codigoJerarquia}] ` : ''}{t.id} — bloqueado
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        )}
      </div>

      {/* Reglas del tenant */}
      {tenantSelId && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Reglas existentes</p>
          {faseReglas === 'loading' ? (
            <p className="text-xs text-muted-foreground">Cargando reglas…</p>
          ) : faseReglas === 'error' ? (
            <p className="text-xs text-destructive">{errorReglas}</p>
          ) : reglas.length === 0 ? (
            <p className="text-xs text-muted-foreground">Este tenant no tiene reglas DIOS activas.</p>
          ) : (
            <div className="space-y-3">
              {reglas.map((regla) => {
                const rid = regla.iud || regla._id;
                const estaConfirmando = confirmar?.id === rid;
                const esDesactivada = regla.estado === false;

                const actionButtons = esDesactivada ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => { setConfirmar({ id: rid, accion: 'eliminar' }); setErrorAccion(null); }}
                    disabled={faseAccion === 'loading'}
                  >
                    Eliminar
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setConfirmar({ id: rid, accion: 'desactivar' }); setErrorAccion(null); }}
                      disabled={faseAccion === 'loading'}
                      className="border-amber-400 text-amber-700 hover:bg-amber-50"
                    >
                      Desactivar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => { setConfirmar({ id: rid, accion: 'eliminar' }); setErrorAccion(null); }}
                      disabled={faseAccion === 'loading'}
                    >
                      Eliminar
                    </Button>
                  </>
                );

                return (
                  <div key={rid}>
                    <ReglaDetailPanel regla={regla} actions={actionButtons} />

                    {estaConfirmando && confirmar && (
                      <ConfirmPanel
                        rid={rid}
                        confirmar={confirmar}
                        faseAccion={faseAccion}
                        errorAccion={errorAccion}
                        onConfirmar={handleConfirmar}
                        onCancelar={() => { setConfirmar(null); setErrorAccion(null); }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Resultados exitosos */}
      {resultados.length > 0 && (
        <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 space-y-1">
          {resultados.map((r, i) => (
            <p key={i} className="text-sm text-green-800">
              Regla <span className="font-mono">{r.id.slice(0, 8)}…</span>{' '}
              {r.accion === 'eliminar' ? 'eliminada.' : 'desactivada.'}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
