import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Calculator, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  calcularNomina,
  obtenerConfiguracionActiva,
  simularNomina,
  type CalculoNominaPayload,
  type ConceptoNomina,
  type ResultadoCalculoNomina,
} from '@/app/services/nominaService';
import { CalculoNominaResultado } from './CalculoNominaResultado';

type ConceptoHoras = ConceptoNomina & { campoEntrada: string };

export function CalculoNominaForm() {
  const [loading, setLoading] = useState(false);
  const [loadingConceptos, setLoadingConceptos] = useState(true);
  const [resultado, setResultado] = useState<ResultadoCalculoNomina | null>(null);
  const [conceptosHoras, setConceptosHoras] = useState<ConceptoHoras[]>([]);
  const [activos, setActivos] = useState<Record<string, boolean>>({});
  const [horas, setHoras] = useState<Record<string, string>>({});

  const [sueldoBase, setSueldoBase] = useState('2000000');
  const [periodo, setPeriodo] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [horasOrdinarias, setHorasOrdinarias] = useState('');
  const [otrosIngresos, setOtrosIngresos] = useState('');
  const [otrosDescuentos, setOtrosDescuentos] = useState('');
  const [baseSSManual, setBaseSSManual] = useState('');
  const [empleadoId, setEmpleadoId] = useState('');

  const conceptosPorGrupo = useMemo(() => ({
    extra: conceptosHoras.filter((c) => c.categoria === 'HORA_EXTRA'),
    recargo: conceptosHoras.filter((c) => c.categoria === 'RECARGO'),
  }), [conceptosHoras]);

  const cargarConceptos = async (fechaRef?: string) => {
    setLoadingConceptos(true);
    try {
      const ref = fechaRef || periodo ? `${periodo}-01` : undefined;
      const config = await obtenerConfiguracionActiva(ref);
      const lista = (config?.conceptos ?? [])
        .filter((c): c is ConceptoHoras =>
          c.activo !== false
          && Boolean(c.campoEntrada)
          && (c.categoria === 'HORA_EXTRA' || c.categoria === 'RECARGO'))
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

      setConceptosHoras(lista);
      setActivos({});
      setHoras({});
    } catch (e: any) {
      setConceptosHoras([]);
      toast.error(e?.message || 'No hay configuración activa para cargar conceptos');
    } finally {
      setLoadingConceptos(false);
    }
  };

  useEffect(() => {
    void cargarConceptos();
  }, []);

  useEffect(() => {
    if (periodo) void cargarConceptos(`${periodo}-01`);
  }, [periodo]);

  const armarPayload = (soloSimular: boolean): CalculoNominaPayload => {
    const payload: CalculoNominaPayload = {
      sueldoBaseMensual: Number(sueldoBase),
      periodoLiquidacion: periodo,
      soloSimular,
      conceptosHoras: {},
    };

    if (empleadoId.trim()) payload.empleadoGlobalId = empleadoId.trim();
    if (horasOrdinarias) payload.horasOrdinariasTrabajadas = Number(horasOrdinarias);
    if (otrosIngresos) payload.otrosIngresos = Number(otrosIngresos);
    if (otrosDescuentos) payload.otrosDescuentos = Number(otrosDescuentos);
    if (baseSSManual) payload.baseSeguridadSocialManual = Number(baseSSManual);

    for (const concepto of conceptosHoras) {
      if (!activos[concepto.codigo]) continue;
      const val = horas[concepto.codigo];
      if (val && Number(val) > 0) {
        payload.conceptosHoras![concepto.campoEntrada] = Number(val);
        payload.conceptosHoras![concepto.codigo] = Number(val);
      }
    }

    if (Object.keys(payload.conceptosHoras!).length === 0) {
      delete payload.conceptosHoras;
    }

    return payload;
  };

  const ejecutar = async (soloSimular: boolean) => {
    const sueldo = Number(sueldoBase);
    if (!Number.isFinite(sueldo) || sueldo <= 0) {
      toast.error('El sueldo base debe ser mayor a cero');
      return;
    }
    if (!periodo.trim()) {
      toast.error('Indique el periodo de liquidación');
      return;
    }

    setLoading(true);
    try {
      const payload = armarPayload(soloSimular);
      const data = soloSimular ? await simularNomina(payload) : await calcularNomina(payload);
      setResultado(data);
      toast.success(soloSimular ? 'Simulación completada' : 'Cálculo guardado');
    } catch (e: any) {
      toast.error(e?.message || 'Error en el cálculo');
      setResultado(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleConcepto = (codigo: string, checked: boolean) => {
    setActivos((p) => ({ ...p, [codigo]: checked }));
    if (!checked) setHoras((p) => ({ ...p, [codigo]: '' }));
  };

  const renderConceptos = (lista: ConceptoHoras[]) => (
    <div className="grid gap-3 md:grid-cols-2">
      {lista.map((c) => (
        <div key={c.codigo} className="flex items-center gap-3 rounded-md border p-3">
          <Checkbox
            id={c.codigo}
            checked={Boolean(activos[c.codigo])}
            onCheckedChange={(v) => toggleConcepto(c.codigo, Boolean(v))}
          />
          <div className="flex-1 space-y-1">
            <Label htmlFor={c.codigo} className="cursor-pointer">{c.nombre}</Label>
            {activos[c.codigo] && (
              <Input
                type="number"
                min={0}
                step="0.5"
                placeholder="Cantidad de horas"
                value={horas[c.codigo] || ''}
                onChange={(e) => setHoras((p) => ({ ...p, [c.codigo]: e.target.value }))}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Liquidación de nómina
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Sueldo base mensual *</Label>
              <Input type="number" min={1} value={sueldoBase} onChange={(e) => setSueldoBase(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Periodo (YYYY-MM) *</Label>
              <Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="2026-06" />
            </div>
            <div className="space-y-2">
              <Label>ID empleado (opcional)</Label>
              <Input value={empleadoId} onChange={(e) => setEmpleadoId(e.target.value)} placeholder="Para historial" />
            </div>
            <div className="space-y-2">
              <Label>Horas ordinarias trabajadas</Label>
              <Input type="number" min={0} value={horasOrdinarias} onChange={(e) => setHorasOrdinarias(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Otros ingresos</Label>
              <Input type="number" min={0} value={otrosIngresos} onChange={(e) => setOtrosIngresos(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Otros descuentos</Label>
              <Input type="number" min={0} value={otrosDescuentos} onChange={(e) => setOtrosDescuentos(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Base SS manual (si config = personalizada)</Label>
              <Input type="number" min={0} value={baseSSManual} onChange={(e) => setBaseSSManual(e.target.value)} />
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-medium">Conceptos a calcular</h4>
            <p className="mb-4 text-xs text-muted-foreground">
              Los conceptos se cargan desde la configuración activa del tenant. Solo se calculan los que active con horas mayores a cero.
            </p>
            {loadingConceptos ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando conceptos...
              </div>
            ) : conceptosHoras.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay conceptos configurados para este periodo.</p>
            ) : (
              <div className="space-y-4">
                {conceptosPorGrupo.extra.length > 0 && (
                  <div>
                    <h5 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Horas extras</h5>
                    {renderConceptos(conceptosPorGrupo.extra)}
                  </div>
                )}
                {conceptosPorGrupo.recargo.length > 0 && (
                  <div>
                    <h5 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Recargos</h5>
                    {renderConceptos(conceptosPorGrupo.recargo)}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={loading || loadingConceptos} onClick={() => void ejecutar(true)}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Simular
            </Button>
            <Button disabled={loading || loadingConceptos} onClick={() => void ejecutar(false)}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
              Calcular y guardar
            </Button>
          </div>
        </CardContent>
      </Card>

      <CalculoNominaResultado resultado={resultado} />
    </div>
  );
}
