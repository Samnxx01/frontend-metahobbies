import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  crearConfiguracionNomina,
  listarConfiguracionNomina,
  type BaseSeguridadSocialTipo,
  type ConfiguracionNomina,
  type CrearConfiguracionNominaPayload,
} from '@/app/services/nominaService';

const EMPTY_CONFIG: CrearConfiguracionNominaPayload = {
  horasLaboralesMensuales: 220,
  porcentajeHoraExtraDiurna: 1.25,
  porcentajeHoraExtraNocturna: 1.75,
  porcentajeHoraExtraDomFestDiurna: 2.0,
  porcentajeHoraExtraDomFestNocturna: 2.5,
  porcentajeRecargoNocturno: 0.35,
  porcentajeRecargoDomFestDiurno: 0.75,
  porcentajeRecargoDomFestNocturno: 1.1,
  porcentajeSalud: 0.04,
  porcentajePension: 0.04,
  porcentajeFondoSolidaridad: 0,
  baseSeguridadSocialTipo: 'TOTAL_DEVENGADO',
  reglaRedondeo: 'HALF_UP',
  decimalesRedondeo: 2,
  vigenciaDesde: new Date().toISOString().slice(0, 10),
  vigenciaHasta: null,
  estado: true,
};

type Props = {
  onConfigChange?: (config: ConfiguracionNomina | null) => void;
};

export function ConfiguracionNominaPanel({ onConfigChange }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lista, setLista] = useState<ConfiguracionNomina[]>([]);
  const [form, setForm] = useState<CrearConfiguracionNominaPayload>(EMPTY_CONFIG);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await listarConfiguracionNomina();
      setLista(data);
      const activa = data.find((c) => c.estado !== false) ?? data[0] ?? null;
      onConfigChange?.(activa);
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  const setNum = (field: keyof CrearConfiguracionNominaPayload, value: string) => {
    const n = value === '' ? 0 : Number(value);
    setForm((prev) => ({ ...prev, [field]: n }));
  };

  const guardar = async () => {
    setSaving(true);
    try {
      await crearConfiguracionNomina(form);
      toast.success('Configuración de nómina creada');
      await cargar();
      setForm(EMPTY_CONFIG);
    } catch (e: any) {
      toast.error(e?.message || 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando configuración...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Configuración de nómina</h3>
          <p className="text-sm text-muted-foreground">
            Parámetros vigentes por tenant. Los porcentajes de hora extra son multiplicadores (ej. 1.25 = 125%).
            Los recargos y seguridad social son tasas decimales (ej. 0.35 = 35%).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void cargar()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {lista.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuraciones registradas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lista.map((c) => (
              <div key={c.iud || c._id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <div>
                  <span className="font-medium">{c.horasLaboralesMensuales} h/mes</span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span>Vigencia: {String(c.vigenciaDesde).slice(0, 10)}</span>
                  {c.vigenciaHasta && <span> — {String(c.vigenciaHasta).slice(0, 10)}</span>}
                </div>
                <span className={c.estado !== false ? 'text-emerald-600' : 'text-muted-foreground'}>
                  {c.estado !== false ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva configuración
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Horas laborales mensuales</Label>
            <Input type="number" min={1} value={form.horasLaboralesMensuales} onChange={(e) => setNum('horasLaboralesMensuales', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Vigencia desde</Label>
            <Input type="date" value={form.vigenciaDesde?.slice(0, 10)} onChange={(e) => setForm((p) => ({ ...p, vigenciaDesde: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Vigencia hasta (opcional)</Label>
            <Input type="date" value={form.vigenciaHasta?.slice(0, 10) || ''} onChange={(e) => setForm((p) => ({ ...p, vigenciaHasta: e.target.value || null }))} />
          </div>

          <div className="space-y-2">
            <Label>Hora extra diurna (mult.)</Label>
            <Input type="number" step="0.01" min={0} value={form.porcentajeHoraExtraDiurna} onChange={(e) => setNum('porcentajeHoraExtraDiurna', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Hora extra nocturna (mult.)</Label>
            <Input type="number" step="0.01" min={0} value={form.porcentajeHoraExtraNocturna} onChange={(e) => setNum('porcentajeHoraExtraNocturna', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>H.E. dom/fest diurna (mult.)</Label>
            <Input type="number" step="0.01" min={0} value={form.porcentajeHoraExtraDomFestDiurna} onChange={(e) => setNum('porcentajeHoraExtraDomFestDiurna', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>H.E. dom/fest nocturna (mult.)</Label>
            <Input type="number" step="0.01" min={0} value={form.porcentajeHoraExtraDomFestNocturna} onChange={(e) => setNum('porcentajeHoraExtraDomFestNocturna', e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Recargo nocturno</Label>
            <Input type="number" step="0.01" min={0} value={form.porcentajeRecargoNocturno} onChange={(e) => setNum('porcentajeRecargoNocturno', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Recargo dom/fest diurno</Label>
            <Input type="number" step="0.01" min={0} value={form.porcentajeRecargoDomFestDiurno} onChange={(e) => setNum('porcentajeRecargoDomFestDiurno', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Recargo dom/fest nocturno</Label>
            <Input type="number" step="0.01" min={0} value={form.porcentajeRecargoDomFestNocturno} onChange={(e) => setNum('porcentajeRecargoDomFestNocturno', e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Salud</Label>
            <Input type="number" step="0.001" min={0} value={form.porcentajeSalud} onChange={(e) => setNum('porcentajeSalud', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Pensión</Label>
            <Input type="number" step="0.001" min={0} value={form.porcentajePension} onChange={(e) => setNum('porcentajePension', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Fondo solidaridad</Label>
            <Input type="number" step="0.001" min={0} value={form.porcentajeFondoSolidaridad ?? 0} onChange={(e) => setNum('porcentajeFondoSolidaridad', e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Base seguridad social</Label>
            <Select
              value={form.baseSeguridadSocialTipo}
              onValueChange={(v) => setForm((p) => ({ ...p, baseSeguridadSocialTipo: v as BaseSeguridadSocialTipo }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SUELDO_BASE">Solo sueldo base</SelectItem>
                <SelectItem value="SUELDO_BASE_HORAS_EXTRAS">Sueldo + horas extras</SelectItem>
                <SelectItem value="SUELDO_BASE_RECARGOS">Sueldo + recargos</SelectItem>
                <SelectItem value="TOTAL_DEVENGADO">Total devengado</SelectItem>
                <SelectItem value="PERSONALIZADA">Personalizada (en cálculo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Regla redondeo</Label>
            <Select value={form.reglaRedondeo} onValueChange={(v) => setForm((p) => ({ ...p, reglaRedondeo: v as typeof form.reglaRedondeo }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="HALF_UP">Half up</SelectItem>
                <SelectItem value="HALF_DOWN">Half down</SelectItem>
                <SelectItem value="NONE">Sin redondeo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Decimales</Label>
            <Input type="number" min={0} max={6} value={form.decimalesRedondeo ?? 2} onChange={(e) => setNum('decimalesRedondeo', e.target.value)} />
          </div>
        </CardContent>
        <div className="px-6 pb-6">
          <Button onClick={() => void guardar()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Guardar configuración
          </Button>
        </div>
      </Card>
    </div>
  );
}
