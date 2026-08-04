import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Hash, Layers, Plus, RefreshCw, RotateCcw, Save, Settings2 } from 'lucide-react';
import { toast } from 'react-toastify';
import billingSecuencialService, {
  type TipoLimiteRegistros,
  type TipoSecuenciaEmision,
} from '@/app/services/billingSecuencialService';
import facturacionSoporteDocumentoService, {
  type FacturacionSoporteDocumentoCatalogo,
} from '@/app/services/facturacionSoporteDocumentoService';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  type DocumentoSoporteTipoConfig,
  formatDocNumero,
} from '@/app/presentation/pages/admin/components/InventarioDocumentoSoporteConfigModal';
import {
  esCodigoClasificacionValido,
  etiquetaClasificacionConId,
  normalizarClasificacionEmision,
  type ClasificacionEmision,
} from '@/app/utils/tiposSecuenciaClasificacion';

export type CodigoReferenciaVenta = string;

const esTipoSecuenciaVenta = (row: DocumentoSoporteTipoConfig): boolean =>
  String(row.dominioSecuencia || '').trim().toUpperCase() === 'VENTA' && row.activo !== false;

const filtrarTiposSecuenciaVenta = (rows: DocumentoSoporteTipoConfig[]): DocumentoSoporteTipoConfig[] =>
  rows
    .filter(esTipoSecuenciaVenta)
    .sort((a, b) => {
      const labelA = String(a.nombre || a.codigo);
      const labelB = String(b.nombre || b.codigo);
      return labelA.localeCompare(labelB, 'es');
    });

const etiquetaTipo = (row: Pick<DocumentoSoporteTipoConfig, 'nombre' | 'codigo'>): string =>
  String(row.nombre || row.codigo || '').trim() || 'Sin nombre';

const etiquetaCatalogo = (row: Pick<FacturacionSoporteDocumentoCatalogo, 'nombre' | 'codigo'>): string =>
  String(row.nombre || row.codigo || '').trim() || 'Sin nombre';

const validarCodigoRespuestaApi = (
  respuesta: Pick<DocumentoSoporteTipoConfig, 'codigo'> | null | undefined,
  codigoEsperado: string,
  accion: string,
): void => {
  const codigoResp = String(respuesta?.codigo || '').trim().toUpperCase();
  if (codigoResp && codigoResp !== codigoEsperado) {
    throw new Error(`${accion} no coincidió con el tipo seleccionado (${codigoEsperado}).`);
  }
};

const normalizarTipoLimite = (value: unknown): TipoLimiteRegistros =>
  String(value || '').trim().toUpperCase() === 'SIN_LIMITE' ? 'SIN_LIMITE' : 'CON_LIMITE';

const normalizarTipoSecuencia = (
  value: unknown,
  opciones: ClasificacionEmision[] = [],
): TipoSecuenciaEmision => (
  normalizarClasificacionEmision(value, opciones) as TipoSecuenciaEmision
);

const metaDesdeConfig = (row: DocumentoSoporteTipoConfig | null): {
  titulo: string;
  descripcion: string;
  previewLabel: string;
  placeholderPrefijo: string;
} => {
  const nombre = row ? etiquetaTipo(row) : 'Secuencia';
  const prefijo = String(row?.prefijo || '').trim().toUpperCase() || 'DOC';
  const ejemplo = formatDocNumero({ prefijo, padding: row?.padding ?? 6 }, 1);
  return {
    titulo: `Secuencia ${nombre}`,
    descripcion: String(row?.descripcion || '').trim()
      || `Formato ${ejemplo}. La secuencia avanza automáticamente al emitir.`,
    previewLabel: 'Vista previa del próximo documento',
    placeholderPrefijo: prefijo,
  };
};

const newId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `wompi-seq-${Date.now()}`;

const clampSequenceDigits = (value: unknown): number =>
  Math.max(1, Math.min(12, Number(value) || 6));

const toContadorNoNegativo = (...values: unknown[]): number => {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return 0;
};

const capacidadMaximaSecuencia = (padding: number): number =>
  Math.pow(10, clampSequenceDigits(padding)) - 1;

const derivarPrefijoDesdeCodigo = (codigo: string): string => {
  const segmento = String(codigo || '').split('_').filter(Boolean)[0] || String(codigo || '');
  const prefijo = String(segmento).trim().toUpperCase().slice(0, 6);
  return prefijo || 'DOC';
};

const defaultConfig = (row?: Partial<DocumentoSoporteTipoConfig>): DocumentoSoporteTipoConfig => {
  const limite = normalizarTipoLimite(row?.tipoLimiteRegistros);
  const maxGuardado = Number(row?.maxRegistrosSecuencia);
  return {
    id: newId(),
    codigo: String(row?.codigo || '').trim().toUpperCase(),
    nombre: row?.nombre ?? '',
    descripcion: row?.descripcion ?? '',
    dominioSecuencia: 'VENTA',
    prefijo: String(row?.prefijo || derivarPrefijoDesdeCodigo(String(row?.codigo || ''))).trim().toUpperCase(),
    padding: clampSequenceDigits(row?.padding ?? 6),
    siguiente: Math.max(0, Number(row?.siguiente) ?? 0),
    tipoSecuencia: normalizarTipoSecuencia(row?.tipoSecuencia),
    tipoLimiteRegistros: limite,
    maxRegistrosSecuencia: Number.isFinite(maxGuardado) && maxGuardado >= 1
      ? Math.floor(maxGuardado)
      : 1000,
    activo: true,
  };
};

type NuevoTipoDraft = {
  codigo: string;
  codigoOriginal: string;
  nombre: string;
  descripcion: string;
  prefijo: string;
  tipoSecuencia: TipoSecuenciaEmision;
  clasificacionEmisionId: string;
};

const VALOR_NUEVO_TIPO_MODAL = '__nuevo__';

const blankNuevoTipoDraft = (): NuevoTipoDraft => ({
  codigo: '',
  codigoOriginal: '',
  nombre: '',
  descripcion: '',
  prefijo: '',
  tipoSecuencia: '',
  clasificacionEmisionId: '',
});

const blankClasificacionDraft = (): { nombre: string; etiqueta: string } => ({
  nombre: '',
  etiqueta: '',
});

const mergeTiposModalOpciones = (
  enriquecidos: DocumentoSoporteTipoConfig[],
  catalogo: FacturacionSoporteDocumentoCatalogo[],
): DocumentoSoporteTipoConfig[] => {
  const map = new Map<string, DocumentoSoporteTipoConfig>();
  for (const row of enriquecidos) {
    const codigo = String(row.codigo || '').trim().toUpperCase();
    if (codigo) map.set(codigo, row);
  }
  for (const row of catalogo) {
    const codigo = String(row.codigo || '').trim().toUpperCase();
    if (!codigo || map.has(codigo)) continue;
    map.set(codigo, defaultConfig({
      codigo,
      nombre: row.nombre ?? '',
      descripcion: row.descripcion ?? '',
      tipoSecuencia: row.tipoSecuencia ?? undefined,
      clasificacionEmisionId: row.clasificacionEmisionId ?? row.clasificacionEmisionSecuencialId ?? undefined,
    }));
  }
  return [...map.values()].sort((a, b) => etiquetaTipo(a).localeCompare(etiquetaTipo(b), 'es'));
};

const draftDesdeConfig = (
  row: DocumentoSoporteTipoConfig,
  clasificaciones: ClasificacionEmision[] = [],
): NuevoTipoDraft => {
  const tipoSecuencia = normalizarTipoSecuencia(row.tipoSecuencia, clasificaciones);
  const clasificacionPorId = clasificaciones.find(
    (op) => op.id === Number(row.clasificacionEmisionId),
  );
  const clasificacionPorNombre = clasificaciones.find((op) => op.nombre === tipoSecuencia);
  const clasificacion = clasificacionPorId || clasificacionPorNombre;
  return {
    codigo: String(row.codigo || '').trim().toUpperCase(),
    codigoOriginal: String(row.codigo || '').trim().toUpperCase(),
    nombre: String(row.nombre || '').trim(),
    descripcion: String(row.descripcion || '').trim(),
    prefijo: String(row.prefijo || '').trim().toUpperCase(),
    tipoSecuencia: clasificacion?.nombre || tipoSecuencia,
    clasificacionEmisionId: String(
      row.clasificacionEmisionId || clasificacion?.id || '',
    ).trim(),
  };
};

type FilaResumenSecuencia = {
  codigo: string;
  nombre: string;
  prefijo: string;
  contador: number;
  proximo: number;
  emisionesBd: number;
  parametrizado: boolean;
  preview: string;
};

const filaResumenDesdeTipo = (row: DocumentoSoporteTipoConfig): FilaResumenSecuencia => {
  const codigo = String(row.codigo || '').trim().toUpperCase();
  const prefijo = String(row.prefijo || derivarPrefijoDesdeCodigo(codigo)).trim().toUpperCase();
  const padding = clampSequenceDigits(row.padding ?? 6);
  const contador = toContadorNoNegativo(row.secuencia, row.siguiente);
  // El contador refleja el último consecutivo emitido; próximo = contador + 1.
  const proximoConfig = Number(row.proximoConsecutivo);
  const proximo = Number.isFinite(proximoConfig) && proximoConfig >= 0
    ? Math.floor(proximoConfig)
    : contador + 1;
  const emisionesBd = Math.max(0, Number(row.totalRecepciones) || 0);
  return {
    codigo,
    nombre: etiquetaTipo(row),
    prefijo,
    contador,
    proximo,
    emisionesBd,
    parametrizado: Boolean(String(row.billingSecuencialId || '').trim()),
    preview: formatDocNumero({ prefijo, padding }, proximo),
  };
};

const resolverMaxRegistrosEfectivo = (
  padding: number,
  tipoLimite: TipoLimiteRegistros,
  maxRegistros?: number | null,
): number | null => {
  if (tipoLimite === 'SIN_LIMITE') return null;
  const capPadding = capacidadMaximaSecuencia(padding);
  const maxConfig = Number(maxRegistros);
  if (!Number.isFinite(maxConfig) || maxConfig < 1) return capPadding;
  return Math.min(Math.floor(maxConfig), capPadding);
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  /** Código de secuencia al abrir (opcional; si no existe se usa el primero disponible). */
  tipoInicial?: CodigoReferenciaVenta;
};

export default function VentaWompiSecuenciaModal({
  open,
  onOpenChange,
  onSaved,
  tipoInicial,
}: Props): React.ReactElement {
  const [codigoSecuencia, setCodigoSecuencia] = useState<CodigoReferenciaVenta>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reseteando, setReseteando] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetTodosConfirmOpen, setResetTodosConfirmOpen] = useState(false);
  const [procesandoTodos, setProcesandoTodos] = useState(false);
  const [nuevoTipoOpen, setNuevoTipoOpen] = useState(false);
  const [creandoTipo, setCreandoTipo] = useState(false);
  const [nuevoTipoDraft, setNuevoTipoDraft] = useState<NuevoTipoDraft>(blankNuevoTipoDraft);
  const [tipoModalSeleccionado, setTipoModalSeleccionado] = useState(VALOR_NUEVO_TIPO_MODAL);
  const [catalogoDocumentos, setCatalogoDocumentos] = useState<FacturacionSoporteDocumentoCatalogo[]>([]);
  const [tiposEnriquecidos, setTiposEnriquecidos] = useState<DocumentoSoporteTipoConfig[]>([]);
  const [config, setConfig] = useState<DocumentoSoporteTipoConfig>(() => defaultConfig());
  const [clasificaciones, setClasificaciones] = useState<ClasificacionEmision[]>([]);
  const [cargandoClasificaciones, setCargandoClasificaciones] = useState(false);
  const [guardandoClasificacion, setGuardandoClasificacion] = useState(false);
  const [agregarClasificacionOpen, setAgregarClasificacionOpen] = useState(false);
  const [nuevaClasificacionDraft, setNuevaClasificacionDraft] = useState(blankClasificacionDraft);
  const opcionesClasificacion = useMemo(
    () => [...clasificaciones].sort((a, b) => a.id - b.id),
    [clasificaciones],
  );
  const tiposModalOpciones = useMemo(
    () => mergeTiposModalOpciones(tiposEnriquecidos, catalogoDocumentos),
    [tiposEnriquecidos, catalogoDocumentos],
  );
  const esNuevoTipoModal = tipoModalSeleccionado === VALOR_NUEVO_TIPO_MODAL;

  const metaTipo = useMemo(() => metaDesdeConfig(config), [config]);
  const sinTiposConfigurados = catalogoDocumentos.length === 0;
  /** Código del tipo de referencia seleccionado: única fuente para reset, recalcular y guardar. */
  const codigoSeleccionadoFormulario = String(codigoSecuencia || '').trim().toUpperCase();
  const sinTipoSeleccionado = !codigoSeleccionadoFormulario;
  const tipoLimite = normalizarTipoLimite(config.tipoLimiteRegistros);
  const conLimite = tipoLimite === 'CON_LIMITE';
  const tipoCatalogoSeleccionado = useMemo(
    () => catalogoDocumentos.find((t) => t.codigo === codigoSeleccionadoFormulario) || null,
    [catalogoDocumentos, codigoSeleccionadoFormulario],
  );
  const tipoSeleccionado = useMemo(
    () => tiposEnriquecidos.find((t) => t.codigo === codigoSeleccionadoFormulario) || null,
    [tiposEnriquecidos, codigoSeleccionadoFormulario],
  );
  const etiquetaSeleccionada = etiquetaTipo(tipoSeleccionado || tipoCatalogoSeleccionado || config);
  const codigoActivo = codigoSeleccionadoFormulario;
  const prefijoTipo = String(tipoSeleccionado?.prefijo || config.prefijo || '').trim().toUpperCase();
  const filasResumen = useMemo((): FilaResumenSecuencia[] => {
    const map = new Map<string, FilaResumenSecuencia>();
    for (const row of tiposEnriquecidos) {
      const fila = filaResumenDesdeTipo(row);
      if (fila.codigo) map.set(fila.codigo, fila);
    }
    for (const row of catalogoDocumentos) {
      const codigo = String(row.codigo || '').trim().toUpperCase();
      if (!codigo || map.has(codigo)) continue;
      map.set(codigo, filaResumenDesdeTipo(defaultConfig({
        codigo,
        nombre: row.nombre ?? '',
        descripcion: row.descripcion ?? '',
        tipoSecuencia: row.tipoSecuencia ?? undefined,
      })));
    }
    return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [tiposEnriquecidos, catalogoDocumentos]);

  const normalizarDesdeParametrizacion = (row: DocumentoSoporteTipoConfig): DocumentoSoporteTipoConfig => {
    const secuencia = Math.max(0, Number(row.secuencia) ?? Number(row.siguiente) ?? 0);
    const siguiente = Math.max(0, Number(row.siguiente) ?? secuencia);
    return {
      ...row,
      tipoSecuencia: normalizarTipoSecuencia(row.tipoSecuencia, opcionesClasificacion) as TipoSecuenciaEmision,
      tipoLimiteRegistros: normalizarTipoLimite(row.tipoLimiteRegistros),
      secuencia,
      siguiente,
    };
  };

  const refrescarCatalogoDocumentos = useCallback(async (): Promise<FacturacionSoporteDocumentoCatalogo[]> => {
    const rows = await facturacionSoporteDocumentoService.listarCatalogo();
    setCatalogoDocumentos(rows);
    return rows;
  }, []);

  const refrescarTiposEnriquecidos = useCallback(async (): Promise<DocumentoSoporteTipoConfig[]> => {
    const rows = await billingSecuencialService.listarTiposConfig();
    const ventaTipos = filtrarTiposSecuenciaVenta(rows);
    setTiposEnriquecidos(ventaTipos);
    return ventaTipos;
  }, []);

  const exportarParametrizacion = useCallback((): void => {
    const registros = filtrarTiposSecuenciaVenta(tiposEnriquecidos).map((row) => ({
      registroKind: 'TIPO_CONFIG',
      facturacionSoporteDocumentoId: row.facturacionSoporteDocumentoId || null,
      billingSecuencialId: row.billingSecuencialId || null,
      codigoConfig: String(row.codigo || '').trim().toUpperCase(),
      nombreTipo: row.nombre || null,
      descripcion: row.descripcion || null,
      dominioSecuencia: 'VENTA',
      prefijoTipo: row.prefijo || null,
      padding: Number(row.padding || 0),
      tipoSecuencia: row.tipoSecuencia || null,
      clasificacionEmisionId: row.clasificacionEmisionId || null,
      tipoLimiteRegistros: row.tipoLimiteRegistros || null,
      maxRegistrosSecuencia: row.maxRegistrosSecuencia ?? null,
      siguiente: Number(row.siguiente || 0),
      secuencia: Number(row.secuencia || 0),
      proximoConsecutivo: Number(row.proximoConsecutivo || 0),
      totalEmitidos: Number(row.totalRecepciones || 0),
      activo: row.activo !== false,
    }));
    const archivo = {
      exportadoEn: new Date().toISOString(),
      coleccion: 'billingSecuencial',
      endpointGet: '/api/billing/facturacion-soporte-documento',
      objetivo: 'Parametrización operativa de secuencias de venta; no contiene emisiones históricas.',
      filtros: {
        catalogoPadreMongo: { dominioSecuencia: 'VENTA' },
        frontend: { dominioSecuencia: 'VENTA', activo: { $ne: false } },
        billingSecuencialPorTipo: {
          registroKind: 'TIPO_CONFIG',
          codigoConfig: '<CÓDIGO DEL REGISTRO PADRE>',
        },
        excluidos: {
          registroKind: 'EMISION',
          motivo: 'Las emisiones son historial transaccional y no hacen parte del archivo de parametrización.',
        },
      },
      totalRegistros: registros.length,
      registros,
    };
    const blob = new Blob([JSON.stringify(archivo, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `parametrizacion-billing-secuencial-venta-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
    toast.success(`${registros.length} parametrización(es) exportada(s).`);
  }, [tiposEnriquecidos]);

  const loadConfig = useCallback(async (codigo?: CodigoReferenciaVenta): Promise<void> => {
    setLoading(true);
    try {
      const [catalogoResult, enriquecidosResult] = await Promise.allSettled([
        refrescarCatalogoDocumentos(),
        refrescarTiposEnriquecidos(),
      ]);

      const catalogo = catalogoResult.status === 'fulfilled' ? catalogoResult.value : [];
      const enriquecidos = enriquecidosResult.status === 'fulfilled' ? enriquecidosResult.value : [];

      if (catalogoResult.status === 'rejected') {
        console.error('Error cargando catálogo de secuencias:', catalogoResult.reason);
        toast.error('No se pudo cargar el catálogo de tipos de referencia.');
      } else if (enriquecidosResult.status === 'rejected') {
        console.error('Error cargando parametrización billing:', enriquecidosResult.reason);
        toast.warn('El catálogo cargó, pero no la parametrización en billingSecuencial. Puedes guardar para crearla.');
      }

      if (!catalogo.length) {
        setCodigoSecuencia('');
        setConfig(defaultConfig());
        return;
      }

      const codigoObjetivo = codigo && catalogo.some((r) => r.codigo === codigo)
        ? codigo
        : (tipoInicial && catalogo.some((r) => r.codigo === tipoInicial) ? tipoInicial : catalogo[0]?.codigo);
      if (!codigoObjetivo) {
        setCodigoSecuencia('');
        setConfig(defaultConfig());
        return;
      }
      const found = enriquecidos.find((r) => r.codigo === codigoObjetivo);
      const padre = catalogo.find((r) => r.codigo === codigoObjetivo);
      setCodigoSecuencia(codigoObjetivo);
      setConfig(found
        ? normalizarDesdeParametrizacion({ ...found, codigo: found.codigo || codigoObjetivo })
        : defaultConfig({
          codigo: codigoObjetivo,
          nombre: padre?.nombre || '',
          descripcion: padre?.descripcion || '',
          tipoSecuencia: padre?.tipoSecuencia || undefined,
          facturacionSoporteDocumentoId: padre?.facturacionSoporteDocumentoId,
        }));
    } catch (error) {
      console.error('Error cargando secuencia de referencia:', error);
      toast.error('No se pudo cargar la secuencia de referencias de venta.');
    } finally {
      setLoading(false);
    }
  }, [refrescarCatalogoDocumentos, refrescarTiposEnriquecidos, tipoInicial]);

  const cargarClasificaciones = useCallback(async (): Promise<void> => {
    setCargandoClasificaciones(true);
    try {
      const rows = await facturacionSoporteDocumentoService.listarClasificacionesEmision('VENTA');
      setClasificaciones(rows);
    } catch (error) {
      console.error('Error cargando clasificaciones de emisión:', error);
      toast.error('No se pudieron cargar las clasificaciones de emisión.');
      setClasificaciones([]);
    } finally {
      setCargandoClasificaciones(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadConfig(tipoInicial);
    void cargarClasificaciones();
  }, [open, tipoInicial, loadConfig, cargarClasificaciones]);

  useEffect(() => {
    if (!nuevoTipoOpen) return;
    void cargarClasificaciones();
    void refrescarTiposEnriquecidos();
    void refrescarCatalogoDocumentos();
  }, [nuevoTipoOpen, cargarClasificaciones, refrescarTiposEnriquecidos, refrescarCatalogoDocumentos]);

  useEffect(() => {
    setResetConfirmOpen(false);
  }, [codigoSeleccionadoFormulario]);

  const handleCambioTipoReferencia = (value: CodigoReferenciaVenta): void => {
    setCodigoSecuencia(value);
    void loadConfig(value);
  };

  const abrirModalTipo = (): void => {
    if (codigoSecuencia && config.codigo) {
      const codigo = String(config.codigo).trim().toUpperCase();
      setNuevoTipoDraft(draftDesdeConfig(config, opcionesClasificacion));
      setTipoModalSeleccionado(codigo);
    } else {
      setNuevoTipoDraft(blankNuevoTipoDraft());
      setTipoModalSeleccionado(VALOR_NUEVO_TIPO_MODAL);
    }
    setNuevaClasificacionDraft(blankClasificacionDraft());
    setNuevoTipoOpen(true);
  };

  const handleSeleccionTipoModal = (value: string): void => {
    setTipoModalSeleccionado(value);
    if (value === VALOR_NUEVO_TIPO_MODAL) {
      setNuevoTipoDraft(blankNuevoTipoDraft());
      return;
    }
    const tipo = tiposModalOpciones.find((row) => row.codigo === value);
    if (tipo) {
      setNuevoTipoDraft(draftDesdeConfig(tipo, opcionesClasificacion));
    }
  };

  const esEdicionMismoCodigo = useMemo(() => {
    const codigo = nuevoTipoDraft.codigo.trim().toUpperCase().replace(/\s+/g, '_');
    const original = nuevoTipoDraft.codigoOriginal.trim().toUpperCase();
    return Boolean(original) && codigo === original;
  }, [nuevoTipoDraft.codigo, nuevoTipoDraft.codigoOriginal]);

  const previewModalTipo = useMemo(
    () => formatDocNumero(
      {
        prefijo: nuevoTipoDraft.prefijo.trim().toUpperCase() || 'DOC',
        padding: 6,
      },
      1,
    ),
    [nuevoTipoDraft.prefijo],
  );

  const registrarClasificacionPersonalizada = async (): Promise<void> => {
    const nombre = nuevaClasificacionDraft.nombre.trim().toUpperCase();
    const etiqueta = nuevaClasificacionDraft.etiqueta.trim();
    if (!esCodigoClasificacionValido(nombre)) {
      toast.error('Nombre inválido. Usa A-Z, 0-9 y _ (ej. PRODUCTO_CONTADOR).');
      return;
    }
    if (!etiqueta) {
      toast.error('La etiqueta de la clasificación es obligatoria.');
      return;
    }
    setGuardandoClasificacion(true);
    try {
      const creada = await facturacionSoporteDocumentoService.crearClasificacionEmision({
        nombre,
        etiqueta,
        dominioSecuencia: 'VENTA',
      });
      setClasificaciones((prev) => {
        const sinDuplicado = prev.filter((row) => row.nombre !== creada.nombre);
        return [...sinDuplicado, creada].sort((a, b) => a.id - b.id);
      });
      setNuevoTipoDraft((p) => ({
        ...p,
        clasificacionEmisionId: String(creada.id || ''),
        tipoSecuencia: creada.nombre as TipoSecuenciaEmision,
      }));
      setConfig((p) => ({
        ...p,
        clasificacionEmisionId: creada.id || null,
        tipoSecuencia: creada.nombre as TipoSecuenciaEmision,
      }));
      setNuevaClasificacionDraft(blankClasificacionDraft());
      setAgregarClasificacionOpen(false);
      toast.success(`Clasificación #${creada.id} · ${creada.etiqueta} (${creada.nombre}) agregada.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo agregar la clasificación.');
    } finally {
      setGuardandoClasificacion(false);
    }
  };

  const guardarTipoDesdeModal = async (): Promise<void> => {
    const codigo = nuevoTipoDraft.codigo.trim().toUpperCase().replace(/\s+/g, '_');
    const codigoOriginal = nuevoTipoDraft.codigoOriginal.trim().toUpperCase();
    const nombre = nuevoTipoDraft.nombre.trim();
    const descripcion = nuevoTipoDraft.descripcion.trim();
    const prefijo = nuevoTipoDraft.prefijo.trim().toUpperCase();

    if (!codigo) {
      toast.error('El código del tipo es obligatorio.');
      return;
    }
    if (!/^[A-Z][A-Z0-9_]*$/.test(codigo)) {
      toast.error('El código solo admite letras, números y guion bajo (ej. FACTURA_POS).');
      return;
    }
    if (!nombre) {
      toast.error('El nombre del tipo es obligatorio.');
      return;
    }
    if (!prefijo) {
      toast.error('El prefijo es obligatorio.');
      return;
    }
    const clasificacionEmisionId = String(nuevoTipoDraft.clasificacionEmisionId || '').trim();
    const clasificacionSeleccionada = opcionesClasificacion.find(
      (op) => String(op.id) === clasificacionEmisionId,
    );
    const tipoSecuencia = clasificacionSeleccionada?.nombre
      || normalizarTipoSecuencia(nuevoTipoDraft.tipoSecuencia, opcionesClasificacion);
    if (!clasificacionEmisionId || !clasificacionSeleccionada) {
      toast.error('Selecciona una clasificación de emisión del catálogo.');
      return;
    }

    const editando = Boolean(codigoOriginal) && codigo === codigoOriginal;

    try {
      setCreandoTipo(true);
      const payloadTipo = {
        codigo,
        nombre,
        descripcion: descripcion || `Secuencia ${nombre}.`,
        prefijo,
        tipoSecuencia,
        clasificacionEmisionId,
        activo: true,
      };
      editando
        ? await billingSecuencialService.actualizarTipoConfig(codigoOriginal, payloadTipo)
        : await billingSecuencialService.crearTipoConfig({
          ...payloadTipo,
          dominioSecuencia: 'VENTA',
        });

      await Promise.all([refrescarCatalogoDocumentos(), refrescarTiposEnriquecidos()]);
      setCodigoSecuencia(codigo);
      await loadConfig(codigo);
      setNuevoTipoOpen(false);
      setNuevoTipoDraft(blankNuevoTipoDraft());
      setTipoModalSeleccionado(VALOR_NUEVO_TIPO_MODAL);
      setNuevaClasificacionDraft(blankClasificacionDraft());
      toast.success(
        editando
          ? `Tipo ${nombre} actualizado. Completa la parametrización y pulsa Guardar.`
          : `Tipo ${nombre} creado. Completa la parametrización y pulsa Guardar.`,
      );
      onSaved?.();
    } catch (error) {
      console.error('Error guardando tipo de referencia:', error);
      toast.error(
        error instanceof Error
          ? error.message.replace(/^\[\d+\]\s*/, '')
          : 'No se pudo guardar el tipo de referencia.',
      );
    } finally {
      setCreandoTipo(false);
    }
  };

  const capacidadPorDigitos = useMemo(
    () => capacidadMaximaSecuencia(config.padding),
    [config.padding],
  );

  const maxRegistrosEfectivo = useMemo(
    () => resolverMaxRegistrosEfectivo(config.padding, tipoLimite, config.maxRegistrosSecuencia),
    [config.padding, tipoLimite, config.maxRegistrosSecuencia],
  );

  /** Contador operativo (TIPO_CONFIG): lo que mueve reset / emitir / recalcular. */
  const contadorUltimo = toContadorNoNegativo(config.secuencia, config.siguiente);
  const contadorSiguiente = toContadorNoNegativo(config.siguiente, contadorUltimo);
  // El contador refleja el último emitido; el próximo a emitir es contador + 1.
  const proximoConfig = Number(config.proximoConsecutivo);
  const siguienteEfectivo = sinTipoSeleccionado
    ? 0
    : (Number.isFinite(proximoConfig) && proximoConfig >= 0
      ? Math.floor(proximoConfig)
      : contadorSiguiente + 1);
  /** Emisiones guardadas en BD (no cambian con reset). */
  const emisionesHistoricas = Math.max(0, Number(config.totalRecepciones) || 0);

  const preview = useMemo(
    () => (sinTipoSeleccionado
      ? '—'
      : formatDocNumero({ prefijo: prefijoTipo || 'DOC', padding: config.padding }, siguienteEfectivo)),
    [prefijoTipo, config.padding, siguienteEfectivo, sinTipoSeleccionado],
  );

  const previewTrasReset = useMemo(
    () => formatDocNumero({ prefijo: prefijoTipo || 'DOC', padding: config.padding }, 1),
    [prefijoTipo, config.padding],
  );

  const ejecutarResetSecuencia = async (): Promise<void> => {
    const codigo = codigoSeleccionadoFormulario;
    if (!codigo) {
      toast.error('Selecciona un tipo de referencia antes de resetear.');
      return;
    }

    setReseteando(true);
    try {
      const reseteado = await billingSecuencialService.resetearTipoConfig(codigo, {
        prefijo: prefijoTipo || undefined,
        padding: config.padding,
      });
      validarCodigoRespuestaApi(reseteado, codigo, 'El reset');
      setResetConfirmOpen(false);
      await loadConfig(codigo);
      toast.success(
        `${etiquetaSeleccionada} (${codigo}) reseteado. Histórico borrado · contador: 0 · próximo: ${previewTrasReset}.`,
      );
    } catch (error) {
      console.error('Error reseteando secuencia:', error);
      toast.error(
        error instanceof Error
          ? error.message.replace(/^\[\d+\]\s*/, '')
          : 'No se pudo resetear la secuencia.',
      );
    } finally {
      setReseteando(false);
    }
  };

  const ejecutarResetTodos = async (): Promise<void> => {
    setProcesandoTodos(true);
    try {
      const resultado = await billingSecuencialService.resetearTodosTiposConfig();
      setResetTodosConfirmOpen(false);
      await loadConfig(codigoSeleccionadoFormulario || tipoInicial);
      if (resultado.errores?.length) {
        toast.warn(
          `Reseteados ${resultado.reseteados}/${resultado.total}. `
          + `${resultado.errores.length} con error.`,
        );
      } else {
        toast.success(`Se resetearon ${resultado.reseteados} secuencias en billingSecuencial (histórico borrado, próximo consecutivo: 1).`);
      }
    } catch (error) {
      console.error('Error reseteando todas las secuencias:', error);
      toast.error(
        error instanceof Error
          ? error.message.replace(/^\[\d+\]\s*/, '')
          : 'No se pudieron resetear todas las secuencias.',
      );
    } finally {
      setProcesandoTodos(false);
    }
  };

  const ejecutarRecalcularTodos = async (): Promise<void> => {
    setProcesandoTodos(true);
    try {
      const resultado = await billingSecuencialService.recalcularTodosTiposConfig();
      await loadConfig(codigoSeleccionadoFormulario || tipoInicial);
      if (resultado.errores?.length) {
        toast.warn(
          `Recalculados ${resultado.recalculados}/${resultado.total}. `
          + `${resultado.errores.length} con error.`,
        );
      } else {
        toast.success(`Se recalcularon ${resultado.recalculados} secuencias en billingSecuencial.`);
      }
    } catch (error) {
      console.error('Error recalculando todas las secuencias:', error);
      toast.error(
        error instanceof Error
          ? error.message.replace(/^\[\d+\]\s*/, '')
          : 'No se pudieron recalcular todas las secuencias.',
      );
    } finally {
      setProcesandoTodos(false);
    }
  };

  const limiteAlcanzado = conLimite
    && maxRegistrosEfectivo != null
    && emisionesHistoricas >= maxRegistrosEfectivo;
  const disponibles = conLimite && maxRegistrosEfectivo != null
    ? Math.max(0, maxRegistrosEfectivo - emisionesHistoricas)
    : null;

  const save = async (): Promise<void> => {
    const codigo = codigoSeleccionadoFormulario;
    if (!codigo) {
      toast.error('Selecciona un tipo de referencia antes de guardar.');
      return;
    }
    const prefijo = String(
      tipoSeleccionado?.prefijo
      || config.prefijo
      || derivarPrefijoDesdeCodigo(codigo),
    ).trim().toUpperCase();
    const padding = clampSequenceDigits(config.padding);
    const limiteTipo = normalizarTipoLimite(config.tipoLimiteRegistros);
    const maxRegistrosSecuencia = limiteTipo === 'CON_LIMITE'
      ? resolverMaxRegistrosEfectivo(
        padding,
        limiteTipo,
        Math.max(1, Number(config.maxRegistrosSecuencia) || maxRegistrosEfectivo || 1),
      )
      : null;
    const nombre = String(config.nombre || tipoSeleccionado?.nombre || '').trim();
    const descripcion = String(config.descripcion || tipoSeleccionado?.descripcion || '').trim();

    if (!nombre) {
      toast.error('El nombre del tipo es obligatorio.');
      return;
    }
    if (!prefijo) {
      toast.error('El tipo no tiene prefijo. Edítalo con Nuevo tipo antes de guardar la parametrización.');
      return;
    }
    if (limiteTipo === 'CON_LIMITE' && maxRegistrosSecuencia! > capacidadPorDigitos) {
      toast.error(`El máximo de registros no puede superar ${capacidadPorDigitos.toLocaleString('es-CO')} (${padding} dígitos).`);
      return;
    }

    try {
      setSaving(true);
      const guardado = await billingSecuencialService.actualizarTipoConfig(codigo, {
        codigo,
        nombre,
        descripcion: descripcion || `Secuencia ${nombre}.`,
        prefijo,
        padding,
        dominioSecuencia: 'VENTA',
        tipoSecuencia: normalizarTipoSecuencia(config.tipoSecuencia || tipoSeleccionado?.tipoSecuencia, opcionesClasificacion),
        tipoLimiteRegistros: limiteTipo,
        maxRegistrosSecuencia,
        activo: true,
      });
      validarCodigoRespuestaApi(guardado, codigo, 'El guardado');
      setCodigoSecuencia(codigo);
      setConfig(normalizarDesdeParametrizacion(guardado));
      toast.success(`Parametrización de ${etiquetaTipo(guardado)} guardada en billingSecuencial (TIPO_CONFIG).`);

      await loadConfig(codigo);
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error guardando secuencia Wompi:', error);
      toast.error(
        error instanceof Error
          ? error.message.replace(/^\[\d+\]\s*/, '')
          : 'No se pudo guardar la secuencia.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Dialog
      open={nuevoTipoOpen}
      onOpenChange={(next) => {
        setNuevoTipoOpen(next);
        if (!next) {
          setNuevoTipoDraft(blankNuevoTipoDraft());
          setTipoModalSeleccionado(VALOR_NUEVO_TIPO_MODAL);
          setNuevaClasificacionDraft(blankClasificacionDraft());
        }
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[520px] flex-col overflow-hidden border-destructive/20 bg-card p-3 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:p-5">
        <DialogHeader className="shrink-0 pr-7 text-left">
          <DialogTitle className="break-words text-foreground">
            {nuevoTipoDraft.codigoOriginal ? 'Editar o duplicar tipo' : 'Nuevo tipo de referencia'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {nuevoTipoDraft.codigoOriginal
              ? 'Se cargó el tipo seleccionado. Guarda para editar o cambia el código para insertar uno nuevo.'
              : 'Define un tipo de secuencia de venta. El padre se guarda en facturacionSoporteDocumento.'}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-0.5 sm:pr-1">
          <div className="space-y-2">
            <Label htmlFor="nuevo-tipo-selector">Nombre en selector *</Label>
            <Select
              value={tipoModalSeleccionado}
              onValueChange={handleSeleccionTipoModal}
              disabled={creandoTipo}
            >
              <SelectTrigger id="nuevo-tipo-selector" className="w-full min-w-0">
                <SelectValue placeholder="Selecciona un tipo o crea uno nuevo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={VALOR_NUEVO_TIPO_MODAL}>
                  <span className="flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Crear nuevo tipo
                  </span>
                </SelectItem>
                {tiposModalOpciones.map((row) => (
                  <SelectItem key={row.codigo} value={row.codigo}>
                    {`${etiquetaTipo(row)} (${row.codigo})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              id="nuevo-tipo-nombre"
              value={nuevoTipoDraft.nombre}
              onChange={(e) => setNuevoTipoDraft((p) => ({ ...p, nombre: e.target.value }))}
              placeholder={esNuevoTipoModal ? 'Nombre visible en el selector (ej. Carrito)' : 'Nombre visible en el selector'}
              disabled={creandoTipo}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              {esNuevoTipoModal
                ? 'Escribe el nombre del nuevo tipo. Los demás campos definen código, prefijo y clasificación.'
                : 'Al elegir un tipo existente se cargan sus datos. Puedes editar el nombre y guardar.'}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nuevo-tipo-codigo">Código *</Label>
            <Input
              id="nuevo-tipo-codigo"
              value={nuevoTipoDraft.codigo}
              onChange={(e) => setNuevoTipoDraft((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))}
              placeholder="SECUENCIA_CARRITO_V1"
              className="font-mono"
              disabled={creandoTipo}
              autoComplete="off"
            />
            {nuevoTipoDraft.codigoOriginal ? (
              <p className="text-xs text-muted-foreground">
                Código actual: <span className="font-mono">{nuevoTipoDraft.codigoOriginal}</span>.
                {' '}
                {esEdicionMismoCodigo
                  ? 'Se actualizará este tipo.'
                  : 'Al cambiar el código se insertará un tipo nuevo.'}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nuevo-tipo-descripcion">Descripción</Label>
            <Input
              id="nuevo-tipo-descripcion"
              value={nuevoTipoDraft.descripcion}
              onChange={(e) => setNuevoTipoDraft((p) => ({ ...p, descripcion: e.target.value }))}
              placeholder="Carrito de compra"
              disabled={creandoTipo}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
              <Label htmlFor="nuevo-tipo-secuencia">Clasificación de emisión *</Label>
              <Button
                type="button"
                size="sm"
                className="h-auto min-h-8 w-full whitespace-normal border-destructive/30 px-2 text-destructive hover:bg-destructive/10 min-[420px]:w-auto"
                onClick={() => {
                  setAgregarClasificacionOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      setNuevaClasificacionDraft(blankClasificacionDraft());
                    }
                    return next;
                  });
                }}
                disabled={creandoTipo || guardandoClasificacion}
              >
                <Settings2 className="mr-1 h-4 w-4" />
                Parametrizar
              </Button>
            </div>
            <Select
              value={nuevoTipoDraft.clasificacionEmisionId || undefined}
              onValueChange={(value) => {
                const seleccionada = opcionesClasificacion.find(
                  (op) => String(op.id) === value,
                );
                setNuevoTipoDraft((p) => ({
                  ...p,
                  clasificacionEmisionId: value,
                  tipoSecuencia: (seleccionada?.nombre || p.tipoSecuencia) as TipoSecuenciaEmision,
                }));
              }}
              disabled={creandoTipo || cargandoClasificaciones || guardandoClasificacion || opcionesClasificacion.length === 0}
            >
              <SelectTrigger id="nuevo-tipo-secuencia" className="w-full min-w-0">
                <SelectValue placeholder={
                  cargandoClasificaciones
                    ? 'Cargando...'
                    : (opcionesClasificacion.length ? 'Selecciona clasificación' : 'Sin clasificaciones')
                }
                />
              </SelectTrigger>
              <SelectContent>
                {opcionesClasificacion.map((op) => (
                  <SelectItem
                    key={`${op.id}-${op.nombre}`}
                    value={String(op.id)}
                  >
                    {etiquetaClasificacionConId(op)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!cargandoClasificaciones && opcionesClasificacion.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No hay clasificaciones. Usa Parametrizar para crear la primera (id, nombre y etiqueta).
              </p>
            ) : null}
            {agregarClasificacionOpen ? (
              <div className="space-y-3 rounded-md border border-dashed border-destructive/20 bg-destructive/40 p-3">
                <p className="text-xs text-muted-foreground">
                  Completa nombre y etiqueta y pulsa Guardar. El id (#1, #2…) se asigna solo al guardar; no se crea ningún registro hasta entonces.
                </p>
                <div className="grid gap-2 min-[480px]:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="parametrizar-clasificacion-nombre" className="text-xs">Nombre técnico</Label>
                    <Input
                      id="parametrizar-clasificacion-nombre"
                      value={nuevaClasificacionDraft.nombre}
                      onChange={(e) => setNuevaClasificacionDraft((p) => ({
                        ...p,
                        nombre: e.target.value.toUpperCase(),
                      }))}
                      placeholder="CARRITO_CONTADOR"
                      className="font-mono bg-card"
                      disabled={creandoTipo || guardandoClasificacion}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="parametrizar-clasificacion-etiqueta" className="text-xs">Etiqueta visible</Label>
                    <Input
                      id="parametrizar-clasificacion-etiqueta"
                      value={nuevaClasificacionDraft.etiqueta}
                      onChange={(e) => setNuevaClasificacionDraft((p) => ({
                        ...p,
                        etiqueta: e.target.value,
                      }))}
                      placeholder="CARRITO"
                      className="bg-card"
                      disabled={creandoTipo || guardandoClasificacion}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => void registrarClasificacionPersonalizada()}
                  disabled={creandoTipo || guardandoClasificacion}
                >
                  {guardandoClasificacion ? 'Guardando...' : 'Guardar clasificación'}
                </Button>
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nuevo-tipo-prefijo">Prefijo *</Label>
            <Input
              id="nuevo-tipo-prefijo"
              value={nuevoTipoDraft.prefijo}
              onChange={(e) => setNuevoTipoDraft((p) => ({ ...p, prefijo: e.target.value }))}
              placeholder="SECUEN"
              className="font-mono"
              disabled={creandoTipo}
              autoComplete="off"
            />
          </div>
          <div className="min-w-0 rounded-md border border-destructive/10 bg-destructive/60 px-3 py-2">
            <p className="text-xs text-muted-foreground">Vista previa</p>
            <p className="break-all font-mono text-sm font-semibold text-destructive">{previewModalTipo}</p>
          </div>
        </div>
        <DialogFooter className="grid shrink-0 grid-cols-1 gap-2 border-t border-border pt-3 min-[420px]:grid-cols-2 sm:flex sm:justify-end">
          <Button
            type="button"
            onClick={() => setNuevoTipoOpen(false)}
            className="w-full sm:w-auto"
            disabled={creandoTipo}
          >
            Cancelar
          </Button>
          <Button type="button" className="h-auto min-h-10 w-full whitespace-normal sm:w-auto" onClick={() => void guardarTipoDesdeModal()} disabled={creandoTipo}>
            {creandoTipo
              ? 'Guardando...'
              : (esEdicionMismoCodigo ? 'Guardar cambios' : 'Insertar tipo')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col overflow-hidden border-slate-200 bg-card p-3 text-foreground shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:p-5 lg:w-[min(1050px,calc(100vw-3rem))]">
        <DialogHeader className="shrink-0 border-b border-border pb-3 pr-7 text-left sm:pb-4">
          <DialogTitle className="flex min-w-0 flex-wrap items-center gap-2 break-words text-foreground">
            <Hash className="h-5 w-5 shrink-0 text-foreground" />
            Secuencias de venta · billingSecuencial
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Administra todos los contadores TIPO_CONFIG. El consecutivo avanza al emitir;
            recalcular sincroniza con las emisiones y resetear borra el histórico del tipo
            (contador 0, próximo 1).
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-0.5 sm:pr-1">
          {filasResumen.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-muted/50">
              <div className="flex flex-col gap-3 border-b border-border bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  {filasResumen.length}
                  {' '}
                  secuencias en billingSecuencial
                </div>
                <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3 sm:flex sm:flex-wrap sm:justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-auto min-h-8 w-full whitespace-normal border-border text-foreground sm:w-auto"
                    disabled={loading || tiposEnriquecidos.length === 0}
                    onClick={exportarParametrizacion}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Exportar parametrización
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-auto min-h-8 w-full whitespace-normal border-border text-foreground sm:w-auto"
                    disabled={loading || saving || reseteando || procesandoTodos}
                    onClick={() => void ejecutarRecalcularTodos()}
                  >
                    <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${procesandoTodos ? 'animate-spin' : ''}`} />
                    Recalcular todos
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-auto min-h-8 w-full whitespace-normal border-destructive/40 text-destructive hover:bg-destructive/5 sm:w-auto"
                    disabled={loading || saving || reseteando || procesandoTodos}
                    onClick={() => setResetTodosConfirmOpen(true)}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Resetear todos
                  </Button>
                </div>
              </div>
              <div className="max-h-52 overflow-auto overscroll-contain">
                <table className="min-w-[720px] w-full text-left text-xs">
                  <thead className="sticky top-0 bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Tipo</th>
                      <th className="px-3 py-2 font-medium">Código</th>
                      <th className="px-3 py-2 font-medium text-right">Contador</th>
                      <th className="px-3 py-2 font-medium text-right">Próximo</th>
                      <th className="px-3 py-2 font-medium text-right">Emisiones BD</th>
                      <th className="px-3 py-2 font-medium">Vista previa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasResumen.map((fila) => {
                      const activa = fila.codigo === codigoSeleccionadoFormulario;
                      return (
                        <tr
                          key={fila.codigo}
                          className={`cursor-pointer border-t border-slate-200/80 transition-colors ${
                            activa ? 'bg-info/80' : 'bg-card hover:bg-muted'
                          }`}
                          onClick={() => handleCambioTipoReferencia(fila.codigo)}
                        >
                          <td className="px-3 py-2 font-medium text-foreground">{fila.nombre}</td>
                          <td className="px-3 py-2 font-mono text-muted-foreground">{fila.codigo}</td>
                          <td className="px-3 py-2 text-right font-mono">{fila.contador}</td>
                          <td className="px-3 py-2 text-right font-mono">{fila.proximo}</td>
                          <td className="px-3 py-2 text-right font-mono">{fila.emisionesBd}</td>
                          <td className="px-3 py-2 font-mono text-foreground">{fila.preview}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {codigoSeleccionadoFormulario ? (
            <div className="rounded-md border border-info/20 bg-info/60 px-3 py-2 text-xs text-info">
              <p className="font-semibold">
                Editando:
                {' '}
                {etiquetaSeleccionada}
                {' '}
                (
                <span className="font-mono">{codigoSeleccionadoFormulario}</span>
                )
              </p>
              <p className="mt-1 text-info/80">
                Guardar, reset y recalcular aplican solo a esta fila.
                Usa los botones del resumen para operar sobre todas las secuencias.
              </p>
            </div>
          ) : null}
          {sinTiposConfigurados ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
              <p>No hay registros en facturacionSoporteDocumento para secuencias de venta.</p>
              <Button
                type="button"
                size="sm"
                className="mt-3 border-slate-300 text-foreground hover:bg-muted"
                onClick={abrirModalTipo}
                disabled={loading || saving || creandoTipo}
              >
                <Plus className="mr-1 h-4 w-4" />
                Nuevo tipo de referencia
              </Button>
            </div>
          ) : null}

          {sinTipoSeleccionado && !sinTiposConfigurados ? (
            <div className="rounded-md border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-warning">
              Selecciona un <span className="font-semibold">tipo de referencia</span> en el formulario para guardar la parametrización.
            </div>
          ) : null}

          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {codigoActivo ? (
              <>
                Tipo: <span className="font-semibold text-foreground">{etiquetaTipo(tipoSeleccionado || config)}</span>
                {' · '}
                Código: <span className="font-mono text-foreground">{codigoActivo}</span>
                {prefijoTipo ? (
                  <>
                    {' · '}
                    Prefijo: <span className="font-mono text-foreground">{prefijoTipo}</span>
                  </>
                ) : null}
                {' · '}
              </>
            ) : null}
            Contador: <span className="font-mono text-foreground">{sinTipoSeleccionado ? 0 : contadorUltimo}</span>
            {' · '}
            Próximo: <span className="font-mono text-foreground">{sinTipoSeleccionado ? '—' : siguienteEfectivo}</span>
            {' · '}
            En BD: <span className="font-mono text-foreground">{emisionesHistoricas}</span>
            {' · '}
            Límite:{' '}
            <span className="font-mono text-foreground">
              {conLimite && maxRegistrosEfectivo != null
                ? maxRegistrosEfectivo.toLocaleString('es-CO')
                : 'Sin límite'}
            </span>
            {disponibles != null ? (
              <>
                {' · '}
                Disponibles: <span className="font-mono text-foreground">{disponibles.toLocaleString('es-CO')}</span>
              </>
            ) : (
              <>
                {' · '}
                Tope técnico: <span className="font-mono text-foreground">{capacidadPorDigitos.toLocaleString('es-CO')}</span>
              </>
            )}
          </div>

          <div id="parametrizacion-secuencia-form" className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <div className="flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
                <Label htmlFor="tipo-referencia-venta">Tipo de referencia *</Label>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 w-full border-border text-foreground hover:bg-muted min-[480px]:w-auto"
                  onClick={abrirModalTipo}
                  disabled={loading || saving || creandoTipo}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Nuevo tipo
                </Button>
              </div>
              <Select
                value={codigoSecuencia || undefined}
                onValueChange={(value) => handleCambioTipoReferencia(value)}
                disabled={loading || saving || creandoTipo || sinTiposConfigurados}
              >
                <SelectTrigger id="tipo-referencia-venta">
                  <SelectValue placeholder={
                    loading
                      ? 'Cargando...'
                      : (sinTiposConfigurados ? 'Sin tipos en facturacionSoporteDocumento' : 'Selecciona tipo de referencia')
                  }
                  />
                </SelectTrigger>
                <SelectContent>
                  {catalogoDocumentos.map((tipo) => (
                    <SelectItem
                      key={tipo.facturacionSoporteDocumentoId || tipo.codigo}
                      value={tipo.codigo}
                    >
                      {etiquetaCatalogo(tipo)}
                      {' '}
                      <span className="font-mono text-muted-foreground">({tipo.codigo})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="wompi-seq-nombre">Nombre del tipo</Label>
              <Input
                id="wompi-seq-nombre"
                value={String(config.nombre || '')}
                onChange={(e) => setConfig((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Factura POS"
                disabled={loading || saving || sinTiposConfigurados || sinTipoSeleccionado}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="wompi-seq-descripcion">Descripción</Label>
              <Input
                id="wompi-seq-descripcion"
                value={String(config.descripcion || '')}
                onChange={(e) => setConfig((p) => ({ ...p, descripcion: e.target.value }))}
                placeholder={metaTipo.descripcion}
                disabled={loading || saving || sinTiposConfigurados || sinTipoSeleccionado}
                autoComplete="off"
              />
            </div>

            {prefijoTipo ? (
              <div className="space-y-2 md:col-span-2">
                <Label>Prefijo del tipo</Label>
                <div className="rounded-md border border-border bg-muted/20 px-3 py-2 font-mono text-sm">
                  {prefijoTipo}
                  <p className="mt-1 text-xs font-sans text-muted-foreground">
                    Se define al crear o editar el tipo con Nuevo tipo.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="wompi-seq-padding">Dígitos de secuencia</Label>
              <Input
                id="wompi-seq-padding"
                type="number"
                min={1}
                max={12}
                value={String(config.padding ?? 6)}
                onChange={(e) => setConfig((p) => ({
                  ...p,
                  padding: clampSequenceDigits(e.target.value),
                }))}
                disabled={loading || saving || sinTiposConfigurados || sinTipoSeleccionado}
              />
              <p className="text-xs text-muted-foreground">
                Límite por dígitos: {capacidadPorDigitos.toLocaleString('es-CO')}.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wompi-seq-limite">Límite de registros</Label>
              <Select
                value={tipoLimite}
                onValueChange={(value) => setConfig((p) => ({
                  ...p,
                  tipoLimiteRegistros: normalizarTipoLimite(value),
                }))}
                disabled={loading || saving || sinTiposConfigurados || sinTipoSeleccionado}
              >
                <SelectTrigger id="wompi-seq-limite">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CON_LIMITE">Con límite de registros</SelectItem>
                  <SelectItem value="SIN_LIMITE">Sin límite de registros</SelectItem>
                </SelectContent>
              </Select>
              {!conLimite ? (
                <p className="text-xs text-muted-foreground">
                  Sin tope de cantidad: el sistema solo valida el límite técnico por dígitos
                  {' '}
                  ({capacidadPorDigitos.toLocaleString('es-CO')} con {config.padding} dígitos).
                </p>
              ) : null}
            </div>

            {conLimite ? (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="wompi-seq-max">Máximo de registros</Label>
                <Input
                  id="wompi-seq-max"
                  type="number"
                  min={1}
                  max={capacidadPorDigitos}
                  value={String(config.maxRegistrosSecuencia ?? maxRegistrosEfectivo ?? 1000)}
                  onChange={(e) => setConfig((p) => ({
                    ...p,
                    maxRegistrosSecuencia: Math.max(1, Number(e.target.value) || 1),
                  }))}
                  disabled={loading || saving || sinTiposConfigurados || sinTipoSeleccionado}
                />
              </div>
            ) : null}

          </div>

          <div className="rounded-md border border-border bg-background px-3 py-3">
            <p className="text-xs text-muted-foreground">
              {metaTipo.previewLabel}
              {' '}
              (próximo {siguienteEfectivo} · contador {contadorUltimo}
              {emisionesHistoricas !== contadorUltimo
                ? ` · ${emisionesHistoricas} emisión(es) en histórico`
                : ''}
              )
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-foreground">{preview}</p>
          </div>

          {limiteAlcanzado ? (
            <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning dark:text-warning">
              Este tipo alcanzó el máximo de {maxRegistrosEfectivo} registros configurados. Aumenta el límite o cambia a sin límite para seguir emitiendo.
            </div>
          ) : null}
        </div>

        <DialogFooter className="grid shrink-0 grid-cols-1 gap-2 border-t border-border pt-3 lg:flex lg:flex-row lg:justify-between">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
            <Button
              type="button"
              onClick={async () => {
                const codigo = codigoSeleccionadoFormulario;
                if (!codigo) {
                  toast.error('Selecciona un tipo de referencia antes de recalcular.');
                  return;
                }
                setLoading(true);
                try {
                  const recalculado = await billingSecuencialService.recalcularTipoConfig(codigo);
                  validarCodigoRespuestaApi(recalculado, codigo, 'El recálculo');
                  await loadConfig(codigo);
                  const proximoRecalc = Math.max(0, Number(recalculado.proximoConsecutivo) ?? Number(recalculado.siguiente) ?? 0);
                  toast.success(
                    `${etiquetaSeleccionada} (${codigo}) recalculado: próximo=${proximoRecalc}.`,
                  );
                } catch (error) {
                  console.error('Error recalculando secuencia:', error);
                  toast.error(
                    error instanceof Error
                      ? error.message.replace(/^\[\d+\]\s*/, '')
                      : 'No se pudo recalcular la secuencia.',
                  );
                } finally {
                  setLoading(false);
                }
              }}
              className="h-auto min-h-10 w-full whitespace-normal lg:w-auto"
              disabled={loading || saving || reseteando || procesandoTodos || sinTipoSeleccionado}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {codigoSeleccionadoFormulario
                ? `Recalcular ${etiquetaSeleccionada}`
                : 'Recalcular'}
            </Button>
            <Button
              type="button"
              className="h-auto min-h-10 w-full whitespace-normal border-destructive/50 text-destructive hover:bg-destructive/10 lg:w-auto"
              onClick={() => {
                if (!codigoSeleccionadoFormulario) {
                  toast.error('Selecciona un tipo de referencia antes de resetear.');
                  return;
                }
                setResetConfirmOpen(true);
              }}
              disabled={loading || saving || reseteando || procesandoTodos || sinTipoSeleccionado}
            >
              <RotateCcw className={`mr-2 h-4 w-4 ${reseteando ? 'animate-spin' : ''}`} />
              {reseteando
                ? 'Reseteando...'
                : (codigoSeleccionadoFormulario
                  ? `Resetear ${etiquetaSeleccionada}`
                  : 'Resetear secuencia')}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:flex">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full lg:w-auto"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="button" className="w-full lg:w-auto" onClick={() => void save()} disabled={loading || saving || reseteando || sinTiposConfigurados || sinTipoSeleccionado}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={resetTodosConfirmOpen} onOpenChange={(next) => !procesandoTodos && setResetTodosConfirmOpen(next)}>
      <AlertDialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto border-border bg-card text-foreground sm:w-full">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-foreground">
            <RotateCcw className="h-5 w-5 shrink-0 text-destructive" />
            Resetear todas las secuencias
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Se reiniciará el contador (contador → 0, próximo → 1) de
                {' '}
                <span className="font-semibold text-foreground">{filasResumen.length}</span>
                {' '}
                tipos en billingSecuencial y se
                {' '}
                <span className="font-semibold text-destructive">borrarán sus emisiones históricas</span>
                {' '}
                (inventarioDocumentoSoporteSecuencia y billingSecuencial).
              </p>
              <ul className="max-h-36 overflow-auto rounded-md border border-border bg-muted px-3 py-2 text-xs">
                {filasResumen.map((fila) => (
                  <li key={fila.codigo} className="py-0.5 font-mono text-foreground">
                    {fila.nombre}
                    {' '}
                    ·
                    {' '}
                    {fila.codigo}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel className="w-full !bg-button !text-button-foreground hover:!bg-button/90 sm:w-auto" disabled={procesandoTodos}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="h-auto min-h-10 w-full whitespace-normal break-words text-center sm:w-auto"
            disabled={procesandoTodos || filasResumen.length === 0}
            onClick={(event) => {
              event.preventDefault();
              void ejecutarResetTodos();
            }}
          >
            {procesandoTodos ? 'Reseteando...' : `Sí, resetear ${filasResumen.length} secuencias`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={resetConfirmOpen} onOpenChange={(next) => !reseteando && setResetConfirmOpen(next)}>
      <AlertDialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto border-border bg-card text-foreground sm:w-full">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex min-w-0 flex-wrap items-center gap-2 break-words text-foreground">
            <RotateCcw className="h-5 w-5 shrink-0 text-destructive" />
            Resetear
            {' '}
            {etiquetaSeleccionada}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="min-w-0 space-y-4 break-words text-sm text-muted-foreground">
              <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                <p className="font-semibold">
                  Solo esta secuencia:
                  {' '}
                  {etiquetaSeleccionada}
                  {' '}
                  (
                  <span className="font-mono">{codigoSeleccionadoFormulario}</span>
                  ).
                </p>
                <p className="mt-1">
                  Para resetear todas las filas del resumen, usa
                  {' '}
                  <span className="font-semibold">Resetear todos</span>
                  {' '}
                  en la tabla superior.
                </p>
              </div>

              <p>
                Reinicia el contador de este tipo: contador queda en 0 y el próximo
                consecutivo en 1.
                {' '}
                <span className="font-semibold text-destructive">
                  Se borran las emisiones históricas del tipo
                </span>
                {' '}
                en inventarioDocumentoSoporteSecuencia y billingSecuencial.
              </p>

              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                <p>
                  <span className="font-semibold text-foreground">Tipo a resetear:</span>
                  {' '}
                  {etiquetaTipo(tipoSeleccionado || config)}
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-foreground">Código:</span>
                  {' '}
                  <span className="font-mono">{codigoActivo || '—'}</span>
                  {' · '}
                  <span className="font-semibold text-foreground">Prefijo:</span>
                  {' '}
                  <span className="font-mono">{prefijoTipo || '—'}</span>
                </p>
              </div>

              <div className="overflow-hidden rounded-md border border-border bg-muted/20 text-xs">
                <div className="hidden grid-cols-2 border-b border-border bg-muted/40 px-3 py-2 font-semibold text-foreground sm:grid">
                  <span>Estado actual</span>
                  <span>Después del reset</span>
                </div>
                <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
                  <div className="min-w-0 space-y-2 rounded-md bg-card p-3">
                    <p className="border-b border-border pb-2 font-semibold text-foreground sm:hidden">Estado actual</p>
                    <p>
                      Contador:
                      {' '}
                      <span className="font-mono text-foreground">{contadorUltimo}</span>
                    </p>
                    <p>
                      Emisiones BD:
                      {' '}
                      <span className="font-mono text-foreground">{emisionesHistoricas}</span>
                    </p>
                    <p>
                      Próximo:
                      {' '}
                      <span className="font-mono text-foreground">{preview}</span>
                    </p>
                  </div>
                  <div className="min-w-0 space-y-2 rounded-md bg-card p-3">
                    <p className="border-b border-border pb-2 font-semibold text-foreground sm:hidden">Después del reset</p>
                    <p>
                      Contador:
                      {' '}
                      <span className="font-mono font-semibold text-foreground">0</span>
                    </p>
                    <p>
                      Emisiones BD:
                      {' '}
                      <span className="font-mono font-semibold text-foreground">0</span>
                    </p>
                    <p>
                      Próximo:
                      {' '}
                      <span className="font-mono font-semibold text-foreground">{previewTrasReset}</span>
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs">
                Si necesitas alinear el contador con las emisiones existentes, usa
                {' '}
                <span className="font-semibold text-foreground">Recalcular</span>
                {' '}
                en lugar de resetear.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel className="w-full !bg-button !text-button-foreground hover:!bg-button/90 sm:w-auto" disabled={reseteando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="h-auto min-h-10 w-full whitespace-normal break-words text-center sm:w-auto"
            disabled={reseteando || !codigoActivo}
            onClick={(event) => {
              event.preventDefault();
              void ejecutarResetSecuencia();
            }}
          >
            {reseteando
              ? 'Reseteando...'
              : `Sí, resetear ${etiquetaSeleccionada} (${codigoSeleccionadoFormulario})`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
