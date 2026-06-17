import { apiFetch } from './api';

export type BaseSeguridadSocialTipo =
  | 'SUELDO_BASE'
  | 'SUELDO_BASE_HORAS_EXTRAS'
  | 'SUELDO_BASE_RECARGOS'
  | 'TOTAL_DEVENGADO'
  | 'PERSONALIZADA';

export type ReglaRedondeo = 'HALF_UP' | 'HALF_DOWN' | 'NONE';

export type CategoriaConcepto = 'HORA_EXTRA' | 'RECARGO' | 'SEGURIDAD_SOCIAL';
export type TipoCalculoConcepto = 'MULTIPLICADOR_HORA' | 'TASA_RECARGO' | 'TASA_BASE';

export type ConceptoNomina = {
  codigo: string;
  nombre: string;
  categoria: CategoriaConcepto;
  campoEntrada?: string | null;
  porcentaje: number;
  tipoCalculo: TipoCalculoConcepto;
  activo?: boolean;
  orden?: number;
};

export type ConfiguracionNomina = {
  iud?: string;
  _id?: string;
  horasLaboralesMensuales: number;
  porcentajeHoraExtraDiurna: number;
  porcentajeHoraExtraNocturna: number;
  porcentajeHoraExtraDomFestDiurna: number;
  porcentajeHoraExtraDomFestNocturna: number;
  porcentajeRecargoNocturno: number;
  porcentajeRecargoDomFestDiurno: number;
  porcentajeRecargoDomFestNocturno: number;
  porcentajeSalud: number;
  porcentajePension: number;
  porcentajeFondoSolidaridad?: number;
  baseSeguridadSocialTipo: BaseSeguridadSocialTipo;
  reglaRedondeo: ReglaRedondeo;
  decimalesRedondeo?: number;
  vigenciaDesde: string;
  vigenciaHasta?: string | null;
  estado?: boolean;
  conceptos?: ConceptoNomina[];
};

export type DetalleHoraExtra = {
  codigo?: string;
  nombre?: string;
  tipo: string;
  cantidadHoras: number;
  porcentajeAplicado: number;
  valorHoraOrdinaria: number;
  valorUnitario: number;
  valorTotal: number;
  formula: string;
};

export type DetalleRecargo = DetalleHoraExtra;

export type DetalleDescuento = {
  codigo?: string;
  nombre?: string;
  tipo: string;
  porcentajeAplicado: number | null;
  baseAplicada: number;
  valor: number;
  formula: string;
};

export type ResultadoCalculoNomina = {
  iud?: string;
  guardado?: boolean;
  periodoLiquidacion?: string;
  sueldoBaseMensual: number;
  horasLaboralesMensuales: number;
  horasOrdinariasTrabajadas?: number | null;
  valorHoraOrdinaria: number;
  detalleHorasExtras: DetalleHoraExtra[];
  totalHorasExtras: number;
  detalleRecargos: DetalleRecargo[];
  totalRecargos: number;
  otrosIngresos: number;
  totalDevengado: number;
  baseSeguridadSocial: number;
  detalleSeguridadSocial: DetalleDescuento[];
  totalSeguridadSocial: number;
  otrosDescuentos: number;
  totalDescuentos: number;
  netoPagar: number;
  configuracionUtilizada: Record<string, unknown>;
  formulasAplicadas: string[];
};

export type CalculoNominaPayload = {
  sueldoBaseMensual: number;
  periodoLiquidacion: string;
  empleadoGlobalId?: string;
  horasOrdinariasTrabajadas?: number;
  horasExtraDiurnas?: number;
  horasExtraNocturnas?: number;
  horasExtraDomFestDiurnas?: number;
  horasExtraDomFestNocturnas?: number;
  horasRecargoNocturno?: number;
  horasRecargoDomFestDiurno?: number;
  horasRecargoDomFestNocturno?: number;
  conceptosHoras?: Record<string, number>;
  otrosIngresos?: number;
  otrosDescuentos?: number;
  baseSeguridadSocialManual?: number;
  configuracionId?: string;
  horasLaboralesMensuales?: number;
  porcentajes?: Partial<Record<string, number>>;
  soloSimular?: boolean;
};

export type CrearConfiguracionNominaPayload = Omit<
  ConfiguracionNomina,
  'iud' | '_id'
> & {
  conceptos?: ConceptoNomina[];
};

export async function obtenerPlantillaConceptos(): Promise<Omit<ConceptoNomina, 'porcentaje'>[]> {
  const res = await apiFetch('/api/nomina/conceptos/plantilla', { method: 'GET' });
  return Array.isArray(res?.data) ? res.data : [];
}

export async function listarConfiguracionNomina(): Promise<ConfiguracionNomina[]> {
  const res = await apiFetch('/api/nomina/configuracion', { method: 'GET' });
  return Array.isArray(res?.data) ? res.data : [];
}

export async function obtenerConfiguracionActiva(fecha?: string): Promise<ConfiguracionNomina | null> {
  const query = fecha ? `?fecha=${encodeURIComponent(fecha)}` : '';
  const res = await apiFetch(`/api/nomina/configuracion/activa${query}`, { method: 'GET' });
  return res?.data ?? null;
}

export async function crearConfiguracionNomina(
  payload: CrearConfiguracionNominaPayload,
): Promise<ConfiguracionNomina> {
  const res = await apiFetch('/api/nomina/configuracion', { method: 'POST', body: payload });
  return res?.data;
}

export async function actualizarConfiguracionNomina(
  id: string,
  payload: Partial<CrearConfiguracionNominaPayload>,
): Promise<ConfiguracionNomina> {
  const res = await apiFetch(`/api/nomina/configuracion/${id}`, { method: 'PUT', body: payload });
  return res?.data;
}

export async function calcularNomina(payload: CalculoNominaPayload): Promise<ResultadoCalculoNomina> {
  const res = await apiFetch('/api/nomina/calcular', { method: 'POST', body: payload });
  return res?.data;
}

export async function simularNomina(payload: CalculoNominaPayload): Promise<ResultadoCalculoNomina> {
  const res = await apiFetch('/api/nomina/simular', { method: 'POST', body: payload });
  return res?.data;
}

export async function listarCalculosNomina(params?: {
  empleadoGlobalId?: string;
  periodoLiquidacion?: string;
}): Promise<ResultadoCalculoNomina[]> {
  const search = new URLSearchParams();
  if (params?.empleadoGlobalId) search.set('empleadoGlobalId', params.empleadoGlobalId);
  if (params?.periodoLiquidacion) search.set('periodoLiquidacion', params.periodoLiquidacion);
  const query = search.toString();
  const res = await apiFetch(`/api/nomina/calculos${query ? `?${query}` : ''}`, { method: 'GET' });
  return Array.isArray(res?.data) ? res.data : [];
}

export async function obtenerCalculoNomina(id: string): Promise<ResultadoCalculoNomina> {
  const res = await apiFetch(`/api/nomina/calculos/${id}`, { method: 'GET' });
  return res?.data;
}
