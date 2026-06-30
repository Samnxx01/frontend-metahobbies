import React, { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createGobernanzaReglasFormRoute } from './gobernanzaReglasFormRoute';
import { ENDPOINT_ID_BY_REGLAS_COMPONENT } from './gobernanzaReglasFormRegistry';
import type { GobernanzaReglasFormProps } from './types';
import { ReglaDetailPanel } from './ReglaDetailPanel';
import {
  listarReglasDiosPorTenant,
  listarSaAlcanceDios,
  type ReglaDios,
  type SaAlcanceDiosItem,
} from '@/app/services/reglasGobernanzaDiosService';

const ENDPOINT_ID = ENDPOINT_ID_BY_REGLAS_COMPONENT.ReglasListarDiosForm;
const ReglasListarDiosFormRoute = createGobernanzaReglasFormRoute(ENDPOINT_ID);

type Fase = 'idle' | 'loading' | 'error';

export function ReglasListarDiosForm(props: GobernanzaReglasFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return <ReglasListarDiosFormRoute />;
  return <ReglasListarDiosFormContent />;
}

function ReglasListarDiosFormContent(): React.ReactElement {
  const [faseSa, setFaseSa] = useState<Fase>('idle');
  const [tenants, setTenants] = useState<SaAlcanceDiosItem[]>([]);
  const [errorSa, setErrorSa] = useState<string | null>(null);

  const [tenantSelId, setTenantSelId] = useState('');

  const [faseReglas, setFaseReglas] = useState<Fase>('idle');
  const [reglas, setReglas] = useState<ReglaDios[]>([]);
  const [totalReglas, setTotalReglas] = useState(0);
  const [errorReglas, setErrorReglas] = useState<string | null>(null);

  const [soloActivas, setSoloActivas] = useState(false);

  useEffect(() => {
    setFaseSa('loading');
    listarSaAlcanceDios()
      .then((res) => { setTenants(res.tenants ?? []); setFaseSa('idle'); })
      .catch((err) => {
        const msg = String(err?.message ?? 'Error cargando tenants');
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
    setTotalReglas(0);
    listarReglasDiosPorTenant(saId)
      .then((res) => {
        setReglas(res.reglas ?? []);
        setTotalReglas(res.total ?? 0);
        setFaseReglas('idle');
        toast.success(`${res.total ?? 0} regla${(res.total ?? 0) !== 1 ? 's' : ''} cargada${(res.total ?? 0) !== 1 ? 's' : ''}`);
      })
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
    setSoloActivas(false);
    if (id) cargarReglas(id);
    else { setReglas([]); setFaseReglas('idle'); }
  };

  const tenantsManipulables = tenants.filter((t) => t.puedeManipularDios);
  const tenantsBloqueados = tenants.filter((t) => !t.puedeManipularDios);

  const reglasFiltradas = soloActivas ? reglas.filter((r) => r.estado !== false) : reglas;
  const totalVistas = reglasFiltradas.reduce((acc, r) => acc + (r.recurso?.length ?? 0), 0);
  const totalAcciones = reglasFiltradas.reduce((acc, r) => acc + (r.accionesUsu?.length ?? 0), 0);
  const hayDesactivadas = reglas.some((r) => r.estado === false);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
        <Badge variant="outline" className="rounded-md">Listar reglas DIOS</Badge>
        <p className="mt-2 text-xs text-muted-foreground">
          Consulta de solo lectura. Muestra todas las reglas DIOS del tenant SA seleccionado.
        </p>
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
          <div className="flex gap-2">
            <select
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
                <optgroup label="Scope jerárquico (solo lectura)">
                  {tenantsBloqueados.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.codigoJerarquia ? `[${t.codigoJerarquia}] ` : ''}{t.id}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {tenantSelId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => cargarReglas(tenantSelId)}
                disabled={faseReglas === 'loading'}
              >
                {faseReglas === 'loading' ? '…' : '↺'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Reglas */}
      {tenantSelId && (
        <div className="space-y-3">
          {faseReglas === 'loading' ? (
            <p className="text-xs text-muted-foreground">Cargando reglas…</p>
          ) : faseReglas === 'error' ? (
            <p className="text-xs text-destructive">{errorReglas}</p>
          ) : reglas.length === 0 ? (
            <p className="text-xs text-muted-foreground">Este tenant no tiene reglas DIOS registradas.</p>
          ) : (
            <>
              {/* Stats + filtro */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                    Reglas <strong className="text-foreground">{totalReglas}</strong>
                  </span>
                  <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                    Vistas <strong className="text-foreground">{totalVistas}</strong>
                  </span>
                  <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                    Acciones <strong className="text-foreground">{totalAcciones}</strong>
                  </span>
                </div>
                {hayDesactivadas && (
                  <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={soloActivas}
                      onChange={(e) => setSoloActivas(e.target.checked)}
                      className="h-3.5 w-3.5"
                    />
                    Solo activas
                  </label>
                )}
              </div>

              {/* Lista con panel de detalle */}
              <div className="space-y-3">
                {reglasFiltradas.map((regla) => (
                  <ReglaDetailPanel key={regla.iud ?? regla._id} regla={regla} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
