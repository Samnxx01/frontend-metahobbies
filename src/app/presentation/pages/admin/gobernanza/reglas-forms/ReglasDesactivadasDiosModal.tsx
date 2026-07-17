import React, { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ReglaDetailPanel } from './ReglaDetailPanel';
import {
  activarReglaDiosPorId,
  listarReglasDesactivadasDiosPorTenant,
  listarSaAlcanceDios,
  type ReglaDios,
  type SaAlcanceDiosItem,
} from '@/app/services/reglasGobernanzaDiosService';

type Fase = 'idle' | 'loading' | 'error';

interface ActivarConfirm {
  reglaId: string;
  tenantId: string;
}

function ActivarConfirmPanel({
  confirm,
  fase,
  error,
  onConfirmar,
  onCancelar,
}: {
  confirm: ActivarConfirm;
  fase: Fase;
  error: string | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}): React.ReactElement {
  return (
    <div className="mt-2 rounded-md border border-success/40 bg-success/10 p-3 space-y-2">
      <p className="text-sm font-medium text-success">¿Confirmas reactivar esta regla?</p>
      <p className="font-mono text-xs text-muted-foreground break-all">{confirm.reglaId}</p>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-success hover:bg-success text-white"
          onClick={onConfirmar}
          disabled={fase === 'loading'}
        >
          {fase === 'loading' ? 'Activando…' : 'Confirmar'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancelar}
          disabled={fase === 'loading'}
        >
          Cancelar
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ModalContent(): React.ReactElement {
  const [faseSa, setFaseSa] = useState<Fase>('idle');
  const [tenants, setTenants] = useState<SaAlcanceDiosItem[]>([]);
  const [errorSa, setErrorSa] = useState<string | null>(null);
  const [tenantSelId, setTenantSelId] = useState('');

  const [faseReglas, setFaseReglas] = useState<Fase>('idle');
  const [reglas, setReglas] = useState<ReglaDios[]>([]);
  const [errorReglas, setErrorReglas] = useState<string | null>(null);

  const [activando, setActivando] = useState<ActivarConfirm | null>(null);
  const [faseActivar, setFaseActivar] = useState<Fase>('idle');
  const [errorActivar, setErrorActivar] = useState<string | null>(null);
  const [activadas, setActivadas] = useState<string[]>([]);

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
    setActivando(null);
    setActivadas([]);
    setErrorActivar(null);
    listarReglasDesactivadasDiosPorTenant(saId)
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

  const handleActivar = async () => {
    if (!activando) return;
    const rid = activando.reglaId;
    const toastId = toast.loading('Activando regla…');
    setFaseActivar('loading');
    setErrorActivar(null);
    try {
      await activarReglaDiosPorId(activando.tenantId, rid);
      setActivadas((prev) => [...prev, rid]);
      setReglas((prev) => prev.filter((r) => (r.iud ?? r._id) !== rid));
      setActivando(null);
      setFaseActivar('idle');
      toast.success(`Regla ${rid.slice(0, 8)}… reactivada correctamente`, { id: toastId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err ?? 'Error al activar');
      setErrorActivar(msg);
      setFaseActivar('error');
      toast.error(msg, { id: toastId });
    }
  };

  const tenantsManipulables = tenants.filter((t) => t.puedeManipularDios);
  const tenantsBloqueados = tenants.filter((t) => !t.puedeManipularDios);

  return (
    <div className="space-y-4">
      {/* Selector tenant */}
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
                <optgroup label="Sin acceso DIOS (tienen codigoPadre)">
                  {tenantsBloqueados.map((t) => (
                    <option key={t.id} value="" disabled>
                      {t.codigoJerarquia ? `[${t.codigoJerarquia}] ` : ''}{t.id} — bloqueado
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

      {/* Lista de reglas desactivadas */}
      {tenantSelId && (
        <div className="space-y-3">
          {faseReglas === 'loading' ? (
            <p className="text-xs text-muted-foreground">Cargando reglas desactivadas…</p>
          ) : faseReglas === 'error' ? (
            <p className="text-xs text-destructive">{errorReglas}</p>
          ) : reglas.length === 0 ? (
            <div className="rounded-md border border-success/20 bg-success/10 px-4 py-6 text-center">
              <p className="text-sm text-success font-medium">Sin reglas desactivadas</p>
              <p className="text-xs text-success mt-1">Todas las reglas DIOS de este tenant están activas.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{reglas.length}</span> regla{reglas.length !== 1 ? 's' : ''} desactivada{reglas.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {reglas.map((regla) => {
                  const rid = regla.iud ?? regla._id;
                  const estaConfirmando = activando?.reglaId === rid;

                  const actionBtn = (
                    <Button
                      size="sm"
                      className="bg-success hover:bg-success text-white shrink-0"
                      onClick={() => {
                        setActivando({ reglaId: rid, tenantId: tenantSelId });
                        setErrorActivar(null);
                      }}
                      disabled={faseActivar === 'loading'}
                    >
                      Activar
                    </Button>
                  );

                  return (
                    <div key={rid}>
                      <ReglaDetailPanel regla={{ ...regla, estado: false }} actions={actionBtn} />
                      {estaConfirmando && activando && (
                        <ActivarConfirmPanel
                          confirm={activando}
                          fase={faseActivar}
                          error={errorActivar}
                          onConfirmar={handleActivar}
                          onCancelar={() => { setActivando(null); setErrorActivar(null); }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Feedback de activaciones */}
      {activadas.length > 0 && (
        <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 space-y-1">
          {activadas.map((aid, i) => (
            <p key={i} className="text-sm text-success">
              Regla <span className="font-mono">{aid.slice(0, 8)}…</span> reactivada.
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export interface ReglasDesactivadasDiosModalProps {
  /** Texto o elemento del trigger. Por defecto muestra un botón outline. */
  trigger?: React.ReactNode;
}

export function ReglasDesactivadasDiosModal({
  trigger,
}: ReglasDesactivadasDiosModalProps = {}): React.ReactElement {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <span className="text-warning">●</span> Ver reglas desactivadas
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Reglas DIOS desactivadas
            <Badge variant="outline" className="text-[11px] border-warning/50 text-warning bg-warning/10">
              Reactivar
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <ModalContent />
      </DialogContent>
    </Dialog>
  );
}
