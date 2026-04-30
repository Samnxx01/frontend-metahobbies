import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';

import {
  tenantDbService,
  type CronSyncHijosSettings,
} from '@/app/services/tenantDbService';

import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { CronosSyncHijosHeader } from './CronosSyncHijosHeader';
import { CronosSyncHijosToggleSection } from './CronosSyncHijosToggleSection';
import { CronosSyncHijosScheduleSection } from './CronosSyncHijosScheduleSection';
import { CronosSyncHijosOptionsSection } from './CronosSyncHijosOptionsSection';
import { CronosSyncHijosFooterActions } from './CronosSyncHijosFooterActions';
import { CronosSyncHijosHelpSection } from './CronosSyncHijosHelpSection';

import { CronosSyncJerarquiaIntro } from './CronosSyncJerarquiaIntro';
import { CronosSyncJerarquiaToggleSection } from './CronosSyncJerarquiaToggleSection';
import { CronosSyncJerarquiaScheduleSection } from './CronosSyncJerarquiaScheduleSection';
import { CronosSyncJerarquiaModoSection } from './CronosSyncJerarquiaModoSection';
import { CronosSyncJerarquiaAlcanceSection } from './CronosSyncJerarquiaAlcanceSection';

const DEFAULT_FORM: CronSyncHijosSettings = {
  habilitado: false,
  cronExpresion: '0 3 * * *',
  incluirColeccionesAutoSync: false,
  habilitadoSubidaJerarquia: false,
  cronExpresionSubidaJerarquia: '0 4 * * *',
  modoSubidaJerarquia: 'incremental',
  soloColeccionesSyncGuardadas: true,
  actualizadoEl: null,
};

function mapApiToForm(d: CronSyncHijosSettings): CronSyncHijosSettings {
  return {
    habilitado: d.habilitado,
    cronExpresion: d.cronExpresion,
    incluirColeccionesAutoSync: d.incluirColeccionesAutoSync,
    habilitadoSubidaJerarquia: d.habilitadoSubidaJerarquia ?? false,
    cronExpresionSubidaJerarquia: d.cronExpresionSubidaJerarquia ?? '0 4 * * *',
    modoSubidaJerarquia: d.modoSubidaJerarquia === 'full' ? 'full' : 'incremental',
    soloColeccionesSyncGuardadas: d.soloColeccionesSyncGuardadas !== false,
    actualizadoEl: d.actualizadoEl ?? null,
  };
}

export interface CronosSyncHijosTabProps {
  esSuperAdmin: boolean;
}

export default function CronosSyncHijosTab({ esSuperAdmin }: CronosSyncHijosTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CronSyncHijosSettings>(DEFAULT_FORM);

  const cargar = useCallback(async () => {
    if (!esSuperAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await tenantDbService.obtenerCronSyncHijosSettings();
      setForm(mapApiToForm(res.data));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo cargar la configuración';
      toast.error(msg);
      setForm(DEFAULT_FORM);
    } finally {
      setLoading(false);
    }
  }, [esSuperAdmin]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = async () => {
    if (!esSuperAdmin) return;
    setSaving(true);
    try {
      const res = await tenantDbService.guardarCronSyncHijosSettings({
        habilitado: form.habilitado,
        cronExpresion: form.cronExpresion.trim(),
        incluirColeccionesAutoSync: form.incluirColeccionesAutoSync,
        habilitadoSubidaJerarquia: form.habilitadoSubidaJerarquia,
        cronExpresionSubidaJerarquia: form.cronExpresionSubidaJerarquia.trim(),
        modoSubidaJerarquia: form.modoSubidaJerarquia,
        soloColeccionesSyncGuardadas: form.soloColeccionesSyncGuardadas,
      });
      toast.success(res.msg ?? 'Configuración guardada');
      setForm(mapApiToForm(res.data));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const editDisabled = !esSuperAdmin || loading || saving;

  if (!esSuperAdmin) {
    return (
      <Card className="mt-4">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Solo usuarios con alcance tenantSuperAdmin pueden ver y editar la configuración Cronos sync hijos.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      <CronosSyncHijosHeader />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <CronosSyncHijosToggleSection
            habilitado={form.habilitado}
            disabled={editDisabled}
            onHabilitadoChange={(habilitado) => setForm((f) => ({ ...f, habilitado }))}
          />

          <CronosSyncHijosScheduleSection
            cronExpresion={form.cronExpresion}
            disabled={editDisabled}
            onCronExpresionChange={(cronExpresion) => setForm((f) => ({ ...f, cronExpresion }))}
          />

          <CronosSyncHijosOptionsSection
            incluirColeccionesAutoSync={form.incluirColeccionesAutoSync}
            disabled={editDisabled}
            onIncluirAutoSyncChange={(incluirColeccionesAutoSync) =>
              setForm((f) => ({ ...f, incluirColeccionesAutoSync }))
            }
          />

          <Separator className="my-2" />

          <CronosSyncJerarquiaIntro />

          <CronosSyncJerarquiaToggleSection
            habilitadoSubidaJerarquia={form.habilitadoSubidaJerarquia}
            disabled={editDisabled}
            onChange={(habilitadoSubidaJerarquia) => setForm((f) => ({ ...f, habilitadoSubidaJerarquia }))}
          />

          <CronosSyncJerarquiaScheduleSection
            cronExpresionSubidaJerarquia={form.cronExpresionSubidaJerarquia}
            disabled={editDisabled}
            onChange={(cronExpresionSubidaJerarquia) =>
              setForm((f) => ({ ...f, cronExpresionSubidaJerarquia }))
            }
          />

          <CronosSyncJerarquiaModoSection
            modoSubidaJerarquia={form.modoSubidaJerarquia}
            disabled={editDisabled}
            onChange={(modoSubidaJerarquia) => setForm((f) => ({ ...f, modoSubidaJerarquia }))}
          />

          <CronosSyncJerarquiaAlcanceSection
            soloColeccionesSyncGuardadas={form.soloColeccionesSyncGuardadas}
            disabled={editDisabled}
            onChange={(soloColeccionesSyncGuardadas) =>
              setForm((f) => ({ ...f, soloColeccionesSyncGuardadas }))
            }
          />

          <CronosSyncHijosFooterActions
            actualizadoEl={form.actualizadoEl}
            saving={saving}
            disabled={editDisabled}
            onGuardar={guardar}
          />

          <CronosSyncHijosHelpSection />
        </>
      )}
    </div>
  );
}
