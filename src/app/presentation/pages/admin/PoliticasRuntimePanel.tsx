import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Loader2, Pencil, Play, Plus, RefreshCw, Save, ShieldCheck, Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { isOpaqueDocumentId, normalizePublicIdForApi } from '@/app/utils/entityPublicId';
import {
  actualizarPoliticaRuntime,
  actualizarPoliticaRuntimePorId,
  eliminarPoliticaRuntime,
  eliminarPoliticaRuntimeCatalogoItem,
  fetchPoliticasRuntimeCatalogo,
  fetchPoliticasRuntimeOpciones,
  guardarPoliticaRuntimeCatalogoItem,
  simularPoliticaRuntime,
  type GuardarCatalogoItemPayload,
  type PoliticaRuntime,
  type PoliticaRuntimeApisDominio,
  type PoliticaRuntimeCatalogoCategoria,
  type PoliticaRuntimeCatalogoItem,
  type PoliticaRuntimeComportamientoCatalogoItem,
  type PoliticaRuntimeDecision,
  type PoliticaRuntimeOpciones,
  type PoliticaRuntimeBypassAlcanceOpcion,
} from '@/app/services/politicasRuntimeService';
import {
  actualizarPoliticaBypassPipeline,
  eliminarPoliticaBypassMotorEvento,
  eliminarPoliticaBypassPipeline,
  fetchCatalogoPipeline,
  guardarPoliticaBypassPipeline,
  guardarPoliticaBypassMotorEvento,
  type PoliticaBypassPipelineItem,
  type PoliticaBypassPipeline,
} from '@/app/services/politicaBypassService';
import {
  fetchCatalogoMotorEventosSg,
  guardarCatalogoMotorEventoSg,
  actualizarCatalogoMotorEventoSg,
  eliminarCatalogoMotorEventoSg,
  type CatalogoMotorEventoSgItem,
  type GuardarMotorEventoSgPayload,
} from '@/app/services/catalogoSegmentadoService';
type PoliticasRuntimePanelProps = {
  className?: string;
};

const NUEVA_POLITICA_VALUE = '__new__';
const CATALOGO_POLITICAS = 'POLITICAS_RUNTIME';
const CATALOGO_TIPOS = 'TIPOS';
const CATALOGO_EFECTOS = 'EFECTOS';
const CATALOGO_DOMINIOS = 'DOMINIOS';
const CATALOGO_APIS_DOMINIOS = 'APIS_DOMINIOS';
const politicaId = (politica: PoliticaRuntime | null | undefined) => String(politica?.iud || politica?._id || '').trim();

const parseListaCsv = (value: string): string[] => (
  value.split(/[,;\s]+/).map((v) => v.trim().toUpperCase()).filter(Boolean)
);

const normalizarIdApiOpcional = (id: unknown): string | undefined => {
  const norm = normalizePublicIdForApi(id);
  return isOpaqueDocumentId(norm) ? norm : undefined;
};

const normalizarIdsApi = (ids: string[]): string[] => (
  [...new Set(ids.map((id) => normalizePublicIdForApi(id)).filter((id) => isOpaqueDocumentId(id)))]
);

const resolverIdCatalogo = (
  items: Array<{ id?: string; valor: string }>,
  valor: string,
): string | undefined => {
  const normValor = valor.trim().toUpperCase();
  const item = items.find((i) => i.valor === normValor);
  return normalizarIdApiOpcional(item?.id);
};

const sanitizarMetadata = (meta: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined || value === null) continue;
    out[key] = value;
  }
  return out;
};

const scopeApisDominiosIds = (politica: PoliticaRuntime | null | undefined): string[] => {
  const scope = (politica?.scope ?? {}) as { apisDominiosIds?: string[]; apisDominios?: string };
  const desdeLista = Array.isArray(scope.apisDominiosIds)
    ? scope.apisDominiosIds.map((id) => String(id).trim()).filter(Boolean)
    : [];
  if (desdeLista.length) return normalizarIdsApi(desdeLista);
  const uno = String(scope.apisDominios ?? '').trim();
  return uno ? normalizarIdsApi([uno]) : [];
};

const referenciaDePolitica = (politica: PoliticaRuntime | null | undefined): string[] => {
  const cond = politica?.condiciones;
  const lista = cond?.referencia?.length
    ? cond.referencia
    : (cond?.bypassDominios?.length ? cond.bypassDominios : [politica?.dominio].filter(Boolean));
  return (lista as string[]).map((v) => String(v).trim().toUpperCase()).filter(Boolean);
};

const scopeEntityId = (scope: Record<string, unknown> | null | undefined, key: string): string => {
  const raw = scope?.[key];
  if (raw == null || raw === '') return '';
  return normalizarIdApiOpcional(
    typeof raw === 'object' && raw !== null && '_id' in raw
      ? (raw as { _id?: unknown })._id
      : raw,
  ) || '';
};

const idsFromMetadata = (meta: Record<string, unknown>, key: string): string[] => {
  const raw = meta[key];
  if (!Array.isArray(raw)) return [];
  return normalizarIdsApi(raw.map((id) => String(id)));
};

const idsFromChecked = (map: Record<string, boolean>): string[] => (
  Object.entries(map).filter(([, checked]) => checked).map(([id]) => id)
);

const checkedFromIds = (ids: string[]): Record<string, boolean> => (
  ids.reduce<Record<string, boolean>>((acc, id) => {
    acc[id] = true;
    return acc;
  }, {})
);

const resolverScopeTipo = (
  usuarioIds: string[],
  tenantCorporativoIds: string[],
  tenantGlobalIds: string[],
): string => {
  if (usuarioIds.length) return 'USUARIO';
  if (tenantCorporativoIds.length) return 'TENANT_CORPORATIVO';
  if (tenantGlobalIds.length) return 'TENANT_GLOBAL';
  return 'TENANT_SUPER_ADMIN';
};

const TIPO_ACCION = 'ACCION';
const TIPO_BYPASS = 'BYPASS';

type MotorEventoDraft = {
  nombre: string;
  etiqueta: string;
  pipeline: PoliticaBypassPipeline;
  esNuevo: boolean;
};

type PipelineDraft = {
  nombre: string;
  label: string;
  referencia: string;
  descripcion: string;
  esNuevo: boolean;
};

const esPoliticaBypassLike = (tipoValor: string, codigoValor: string): boolean => {
  const tipoNorm = tipoValor.trim().toUpperCase();
  const codigoNorm = codigoValor.trim().toUpperCase();
  return tipoNorm === TIPO_BYPASS || tipoNorm.includes('BYPASS') || codigoNorm.startsWith('BYPASS_');
};

/** Misma heurística que el backend para COMPORTAMIENTO legacy sin motorSemantica persistida. */
const inferirMotorSemanticaComportamiento = (nombre: string, etiqueta = ''): string | null => {
  const blob = `${nombre || ''} ${etiqueta || ''}`.trim().toUpperCase();
  if (!blob) return null;
  if (blob.includes('BYPASS')) return 'BYPASS';
  if (blob.includes('REQUIERE_TECHO') || (blob.includes('TECHO') && !blob.includes('BYPASS'))) return 'REQUIERE_TECHO';
  if (blob.includes('BLOQUEA') || blob.includes('DENY') || blob.includes('DENIEGA')) return 'BLOQUEA';
  if (blob.includes('PERMITE') || blob.includes('ALLOW')) return 'PERMITE';
  if (blob.includes('NEUTRO')) return 'NEUTRO';
  return null;
};

const resolverMotorSemanticaComportamientoUi = (
  item: PoliticaRuntimeComportamientoCatalogoItem,
): string | null => {
  const directa = String(item.motorSemantica || '').trim().toUpperCase();
  if (directa) return directa;
  return inferirMotorSemanticaComportamiento(item.nombre || item.valor, item.etiqueta || item.label);
};

type CatalogoItemDraft = {
  categoria: PoliticaRuntimeCatalogoCategoria;
  valor: string;
  label: string;
  descripcion: string;
  comportamiento?: string;
  motorSemantica?: string;
  orden?: number;
  activo?: boolean;
  esNuevo: boolean;
};

const draftVacio = (categoria: PoliticaRuntimeCatalogoCategoria): CatalogoItemDraft => ({
  categoria,
  valor: '',
  label: '',
  descripcion: '',
  esNuevo: true,
});

const siguienteOrdenCatalogo = (
  categoria: PoliticaRuntimeCatalogoCategoria,
  tipos: PoliticaRuntimeCatalogoItem[],
  efectos: PoliticaRuntimeCatalogoItem[],
  referencias: PoliticaRuntimeCatalogoItem[] = [],
  comportamientos: PoliticaRuntimeComportamientoCatalogoItem[] = [],
): number => {
  const lista = categoria === 'TIPO'
    ? tipos
    : categoria === 'EFECTO'
      ? efectos
      : categoria === 'REFERENCIA'
        ? referencias
        : comportamientos;
  const max = lista.reduce((acc, item) => {
    if (!('orden' in item)) return acc;
    const n = Number(item.orden);
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return max > 0 ? max + 1 : lista.length + 1;
};

const tabDeCategoria = (
  categoria: PoliticaRuntimeCatalogoCategoria,
): 'TIPOS' | 'EFECTOS' | 'REFERENCIA' | 'COMPORTAMIENTO' | 'SEMANTICA_MOTOR' => {
  if (categoria === 'TIPO') return 'TIPOS';
  if (categoria === 'EFECTO') return 'EFECTOS';
  if (categoria === 'REFERENCIA') return 'REFERENCIA';
  if (categoria === 'SEMANTICA_MOTOR') return 'SEMANTICA_MOTOR';
  return 'COMPORTAMIENTO';
};

const labelCategoriaCatalogo = (categoria: PoliticaRuntimeCatalogoCategoria): string => {
  if (categoria === 'TIPO') return 'tipo';
  if (categoria === 'EFECTO') return 'efecto';
  if (categoria === 'REFERENCIA') return 'referencia / dominio';
  if (categoria === 'SEMANTICA_MOTOR') return 'semántica del motor';
  return 'comportamiento';
};

export function PoliticasRuntimePanel({ className }: PoliticasRuntimePanelProps): React.ReactElement {
  const [politicas, setPoliticas] = useState<PoliticaRuntime[]>([]);
  const [opcionesRuntime, setOpcionesRuntime] = useState<PoliticaRuntimeOpciones | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulando, setSimulando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [tipo, setTipo] = useState('');
  const [efecto, setEfecto] = useState('');
  const [dominio, setDominio] = useState('');
  const [scopeSaIds, setScopeSaIds] = useState<string[]>([]);
  const [scopeTgIds, setScopeTgIds] = useState<string[]>([]);
  const [scopeTcIds, setScopeTcIds] = useState<string[]>([]);
  const [scopeUsuarioIds, setScopeUsuarioIds] = useState<string[]>([]);
  const [scopeParamOpen, setScopeParamOpen] = useState(false);
  const [scopeDraftSa, setScopeDraftSa] = useState<Record<string, boolean>>({});
  const [scopeDraftTg, setScopeDraftTg] = useState<Record<string, boolean>>({});
  const [scopeDraftTc, setScopeDraftTc] = useState<Record<string, boolean>>({});
  const [scopeDraftUsuarios, setScopeDraftUsuarios] = useState<Record<string, boolean>>({});
  const [catalogoTipoEfectoOpen, setCatalogoTipoEfectoOpen] = useState(false);
  const [catalogoTipoEfectoTab, setCatalogoTipoEfectoTab] = useState<
    'TIPOS' | 'EFECTOS' | 'REFERENCIA' | 'COMPORTAMIENTO' | 'MOTOR_EVENTO' | 'PIPELINES' | 'SEMANTICA_MOTOR'
  >('TIPOS');
  const [catalogoMotorEventosSg, setCatalogoMotorEventosSg] = useState<CatalogoMotorEventoSgItem[]>([]);
  const [catalogoPipelineItems, setCatalogoPipelineItems] = useState<PoliticaBypassPipelineItem[]>([]);
  const [motorEventoSgDraft, setMotorEventoSgDraft] = useState<(GuardarMotorEventoSgPayload & { esNuevo: boolean }) | null>(null);
  const [referencia, setReferencia] = useState('');
  const [motorEvento, setMotorEvento] = useState('');
  const [apisDominiosIds, setApisDominiosIds] = useState<string[]>([]);
  const [accionIds, setAccionIds] = useState<string[]>([]);
  const [recursoRutaId, setRecursoRutaId] = useState('');
  const [recursoFormulario, setRecursoFormulario] = useState('');
  const [filtroRuta, setFiltroRuta] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');
  const [decision, setDecision] = useState<PoliticaRuntimeDecision | null>(null);
  const [catalogosOpen, setCatalogosOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [creandoNueva, setCreandoNueva] = useState(false);
  const [catalogoActivo, setCatalogoActivo] = useState(CATALOGO_POLITICAS);
  const [politicaEditId, setPoliticaEditId] = useState('');
  const [itemDraft, setItemDraft] = useState<CatalogoItemDraft | null>(null);
  const [motorEventoDraft, setMotorEventoDraft] = useState<MotorEventoDraft | null>(null);
  const [pipelineDraft, setPipelineDraft] = useState<PipelineDraft | null>(null);
  const [guardandoItem, setGuardandoItem] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [catalogo, opciones] = await Promise.all([
        fetchPoliticasRuntimeCatalogo(),
        fetchPoliticasRuntimeOpciones(),
      ]);
      setPoliticas(catalogo);
      setOpcionesRuntime(opciones);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cargar políticas runtime');
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarMotorEventosSg = useCallback(async () => {
    try {
      const items = await fetchCatalogoMotorEventosSg();
      setCatalogoMotorEventosSg(items);
    } catch {
      // silencioso: la colección puede estar vacía en entornos nuevos
    }
  }, []);

  const cargarCatalogoPipeline = useCallback(async () => {
    try {
      const items = await fetchCatalogoPipeline();
      setCatalogoPipelineItems(items);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cargar el catálogo de pipelines');
    }
  }, []);

  /** Recarga solo catálogos/opciones (tipos, efectos, rutas…) sin tocar la lista de políticas ni el formulario. */
  const recargarOpcionesCatalogo = useCallback(async () => {
    try {
      const opciones = await fetchPoliticasRuntimeOpciones();
      setOpcionesRuntime(opciones);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo actualizar el catálogo');
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const politicasAgrupadas = useMemo(() => {
    const map = new Map<string, PoliticaRuntime[]>();
    politicas.forEach((p) => {
      const key = `${p.dominio || 'GENERAL'} · ${p.tipo || 'POLITICA'}`;
      map.set(key, [...(map.get(key) ?? []), p]);
    });
    return [...map.entries()];
  }, [politicas]);

  const politicaSeleccionada = useMemo(
    () => politicas.find((p) => politicaId(p) === politicaEditId) ?? politicas.find((p) => p.codigo === codigo) ?? null,
    [politicas, codigo, politicaEditId]
  );

  const codigosOptions = useMemo(
    () => [...new Set(politicas.map((p) => p.codigo).filter(Boolean))].sort(),
    [politicas]
  );

  const catalogoTiposBD = useMemo(
    () => opcionesRuntime?.catalogoTipos ?? [],
    [opcionesRuntime?.catalogoTipos]
  );

  const catalogoEfectosBD = useMemo(
    () => opcionesRuntime?.catalogoEfectos ?? [],
    [opcionesRuntime?.catalogoEfectos]
  );

  const catalogoReferenciasBD = useMemo(
    () => opcionesRuntime?.catalogoReferencias ?? [],
    [opcionesRuntime?.catalogoReferencias],
  );

  const catalogoComportamientosBD = useMemo(
    () => opcionesRuntime?.catalogoComportamientos ?? [],
    [opcionesRuntime?.catalogoComportamientos],
  );

  const catalogoSemanticasBD = useMemo(
    () => opcionesRuntime?.catalogoSemanticaMotor ?? [],
    [opcionesRuntime?.catalogoSemanticaMotor],
  );

  const motorSemanticasOpciones = useMemo(
    () => opcionesRuntime?.motorSemanticas ?? [],
    [opcionesRuntime?.motorSemanticas],
  );

  const tenantsScope = useMemo(
    () => opcionesRuntime?.tenantsScope ?? { tenantSuperAdmins: [], tenantGlobales: [], tenantCorporativos: [] },
    [opcionesRuntime?.tenantsScope],
  );

  const tenantGlobalesFiltradosDraft = useMemo(() => {
    const saSelected = idsFromChecked(scopeDraftSa);
    const all = tenantsScope.tenantGlobales;
    if (!saSelected.length) return all;
    return all.filter(
      (t) => !t.tenantSuperAdminId || saSelected.includes(t.tenantSuperAdminId),
    );
  }, [tenantsScope.tenantGlobales, scopeDraftSa]);

  const tenantCorporativosFiltradosDraft = useMemo(() => {
    const tgSelected = idsFromChecked(scopeDraftTg);
    const all = tenantsScope.tenantCorporativos;
    if (!tgSelected.length) return all;
    return all.filter(
      (t) => !t.tenantGlobalId || tgSelected.includes(t.tenantGlobalId),
    );
  }, [tenantsScope.tenantCorporativos, scopeDraftTg]);

  const usuariosOpciones = useMemo(
    () => opcionesRuntime?.usuarios ?? [],
    [opcionesRuntime?.usuarios],
  );

  const usuariosFiltradosScopeDraft = useMemo(() => {
    const saSet = new Set(idsFromChecked(scopeDraftSa));
    const tgSet = new Set(idsFromChecked(scopeDraftTg));
    const tcSet = new Set(idsFromChecked(scopeDraftTc));
    const tgIdsRamaSa = new Set(
      tenantsScope.tenantGlobales
        .filter((t) => !saSet.size || (t.tenantSuperAdminId && saSet.has(String(t.tenantSuperAdminId))))
        .map((t) => String(t.id)),
    );
    const tcIdsRamaSa = new Set(
      tenantsScope.tenantCorporativos
        .filter((t) => !saSet.size || (t.tenantGlobalId && tgIdsRamaSa.has(String(t.tenantGlobalId))))
        .map((t) => String(t.id)),
    );
    const tcIdsRamaTg = new Set(
      tenantsScope.tenantCorporativos
        .filter((t) => !tgSet.size || (t.tenantGlobalId && tgSet.has(String(t.tenantGlobalId))))
        .map((t) => String(t.id)),
    );

    return usuariosOpciones.filter((u) => {
      const uSa = u.tenantSuperAdminId ? String(u.tenantSuperAdminId) : '';
      const uTg = u.tenantGlobalId ? String(u.tenantGlobalId) : '';
      const uTc = u.tenantCorporativoId ? String(u.tenantCorporativoId) : '';

      if (tcSet.size) {
        return Boolean(uTc && tcSet.has(uTc));
      }
      if (tgSet.size) {
        if (uTg && tgSet.has(uTg)) return true;
        if (uTc && tcIdsRamaTg.has(uTc)) return true;
        return false;
      }
      if (saSet.size) {
        if (uSa && saSet.has(uSa)) return true;
        if (uTg && tgIdsRamaSa.has(uTg)) return true;
        if (uTc && tcIdsRamaSa.has(uTc)) return true;
        return false;
      }
      return true;
    });
  }, [usuariosOpciones, scopeDraftSa, scopeDraftTg, scopeDraftTc, tenantsScope.tenantGlobales, tenantsScope.tenantCorporativos]);

  const scopeResumenSa = useMemo(
    () => scopeSaIds.map((id) => tenantsScope.tenantSuperAdmins.find((t) => t.id === id)?.label || id),
    [scopeSaIds, tenantsScope.tenantSuperAdmins],
  );

  const scopeResumenTg = useMemo(
    () => scopeTgIds.map((id) => tenantsScope.tenantGlobales.find((t) => t.id === id)?.label || id),
    [scopeTgIds, tenantsScope.tenantGlobales],
  );

  const scopeResumenTc = useMemo(
    () => scopeTcIds.map((id) => tenantsScope.tenantCorporativos.find((t) => t.id === id)?.label || id),
    [scopeTcIds, tenantsScope.tenantCorporativos],
  );

  const scopeResumenUsuarios = useMemo(
    () => scopeUsuarioIds.map((id) => usuariosOpciones.find((u) => u.id === id)?.label || id),
    [scopeUsuarioIds, usuariosOpciones],
  );

  const apisDominiosCatalogo = useMemo(
    () => opcionesRuntime?.apisDominios ?? [],
    [opcionesRuntime?.apisDominios]
  );

  const apisDominiosSeleccionados = useMemo(
    () => apisDominiosIds.map((id) => apisDominiosCatalogo.find((d) => d.id === id)).filter(Boolean) as PoliticaRuntimeApisDominio[],
    [apisDominiosIds, apisDominiosCatalogo]
  );

  const bypassDominiosSeleccionados = useMemo(() => {
    const unicos = new Set<string>();
    for (const item of apisDominiosSeleccionados) {
      for (const dominioBypass of item.bypassDominios ?? []) {
        unicos.add(dominioBypass);
      }
    }
    return Array.from(unicos);
  }, [apisDominiosSeleccionados]);

  const referenciaSeleccionadas = useMemo(
    () => parseListaCsv(referencia),
    [referencia]
  );

  /** Referencias disponibles: catálogo + bypass de apisdominios + entradas manuales ya guardadas. */
  const referenciaOptions = useMemo(() => {
    const desdeApis = apisDominiosSeleccionados.flatMap((d) => d.bypassDominios ?? []);
    const desdeCatalogo = opcionesRuntime?.dominiosPolitica ?? [];
    return [...new Set([
      ...desdeApis,
      ...desdeCatalogo,
      ...referenciaSeleccionadas,
    ].map((v) => String(v).trim().toUpperCase()).filter(Boolean))].sort();
  }, [apisDominiosSeleccionados, opcionesRuntime?.dominiosPolitica, referenciaSeleccionadas]);

  const bypassAlcancesOpciones = useMemo(
    () => opcionesRuntime?.bypassAlcances ?? [],
    [opcionesRuntime?.bypassAlcances],
  );

  const pipelineOpciones = useMemo(() => (
    (opcionesRuntime?.bypassPipelines ?? [])
      .map((pipeline) => ({
        nombre: String(pipeline.nombre || '').trim().toUpperCase(),
        label: String(pipeline.label || pipeline.nombre || '').trim(),
        referencia: String(pipeline.referencia || '').trim().toUpperCase(),
        descripcion: String(pipeline.descripcion || '').trim(),
        orden: Number(pipeline.orden ?? 0),
      }))
      .filter((pipeline) => pipeline.nombre)
      .sort((a, b) => a.orden - b.orden || a.label.localeCompare(b.label))
  ), [opcionesRuntime?.bypassPipelines]);

  const normalizarPipelineMotorEvento = useCallback((value?: string | null): PoliticaBypassPipeline => {
    const key = String(value || '').trim().toUpperCase();
    if (key && pipelineOpciones.some((pipeline) => pipeline.nombre === key)) return key;
    return pipelineOpciones[0]?.nombre || key;
  }, [pipelineOpciones]);

  const etiquetaPipeline = useCallback((value?: string | null): string => {
    const key = normalizarPipelineMotorEvento(value);
    return pipelineOpciones.find((pipeline) => pipeline.nombre === key)?.label || key;
  }, [normalizarPipelineMotorEvento, pipelineOpciones]);

  const motorEventosPorPipeline = useMemo(() => {
    const grupos = new Map<PoliticaBypassPipeline, PoliticaRuntimeBypassAlcanceOpcion[]>(
      pipelineOpciones.map((pipeline) => [pipeline.nombre, []])
    );
    for (const item of bypassAlcancesOpciones) {
      const pipeline = normalizarPipelineMotorEvento(item.pipeline);
      if (!grupos.has(pipeline)) grupos.set(pipeline, []);
      grupos.get(pipeline)!.push(item);
    }
    return grupos;
  }, [bypassAlcancesOpciones, normalizarPipelineMotorEvento, pipelineOpciones]);

  const motorEventoPlaceholder = useMemo(() => {
    const ejemplos = bypassAlcancesOpciones.slice(0, 2).map((item) => item.etiqueta || item.nombre);
    return ejemplos.length ? `Ej: ${ejemplos.join(', ')}` : 'Selecciona motor evento por etiqueta';
  }, [bypassAlcancesOpciones]);

  const etiquetaMotorEvento = useCallback((nombre: string): string => {
    const key = nombre.trim().toUpperCase();
    const item = bypassAlcancesOpciones.find((i) => (i.nombre || i.alcance) === key);
    return item?.etiqueta || item?.label || key;
  }, [bypassAlcancesOpciones]);

  const sugerirReferenciaDesdeMotorEvento = useCallback((nombreMotor: string): void => {
    const key = nombreMotor.trim().toUpperCase();
    const motor = bypassAlcancesOpciones.find((i) => (i.nombre || i.alcance) === key);
    if (!motor?.dominio) return;
    const candidato = catalogoReferenciasBD.find(
      (r) => r.valor === motor.dominio
        || r.valor.startsWith(`${motor.dominio}_`)
        || r.valor.includes(motor.dominio),
    );
    if (candidato) {
      setDominio(candidato.valor);
      setReferencia(candidato.valor);
    }
  }, [bypassAlcancesOpciones, catalogoReferenciasBD]);

  const seleccionarMotorEvento = useCallback((nombre: string): void => {
    const key = nombre.trim().toUpperCase();
    setMotorEvento(key);
    sugerirReferenciaDesdeMotorEvento(key);
  }, [sugerirReferenciaDesdeMotorEvento]);

  const aplicarApisDominioPorDefecto = useCallback((): void => {
    const ctxId = normalizarIdApiOpcional(opcionesRuntime?.contexto?.apisDominiosId);
    if (ctxId) {
      setApisDominiosIds((prev) => (prev.length ? prev : [ctxId]));
      return;
    }
    if (apisDominiosCatalogo.length === 1) {
      const unico = normalizarIdApiOpcional(apisDominiosCatalogo[0].id);
      if (unico) {
        setApisDominiosIds((prev) => (prev.length ? prev : [unico]));
      }
    }
  }, [opcionesRuntime?.contexto?.apisDominiosId, apisDominiosCatalogo]);

  const aplicarScopeDesdePolitica = (politica: PoliticaRuntime | null | undefined): void => {
    const scope = (politica?.scope ?? {}) as Record<string, unknown>;
    const meta = (politica?.condiciones?.metadata ?? {}) as Record<string, unknown>;
    const sa = idsFromMetadata(meta, 'tenantSuperAdminIds');
    const tg = idsFromMetadata(meta, 'tenantGlobalIds');
    const tc = idsFromMetadata(meta, 'tenantCorporativoIds');
    const usuarios = idsFromMetadata(meta, 'usuarioIds');
    const usuarioScope = scopeEntityId(scope, 'usuarioId');
    setScopeSaIds(sa.length ? sa : [scopeEntityId(scope, 'tenantSuperAdmin')].filter(Boolean));
    setScopeTgIds(tg.length ? tg : [scopeEntityId(scope, 'tenantGlobal')].filter(Boolean));
    setScopeTcIds(tc.length ? tc : [scopeEntityId(scope, 'tenantCorporativo')].filter(Boolean));
    setScopeUsuarioIds(
      usuarios.length ? usuarios : (usuarioScope ? [usuarioScope] : []),
    );
  };

  const aplicarScopeJwtPorDefecto = (): void => {
    const ctx = opcionesRuntime?.contexto;
    const sa = String(ctx?.tenantSuperAdminId || '').trim();
    const tg = String(ctx?.tenantGlobalId || '').trim();
    const tc = String(ctx?.tenantCorporativoId || '').trim();
    setScopeSaIds((prev) => (prev.length ? prev : (sa ? [sa] : [])));
    setScopeTgIds((prev) => (prev.length ? prev : (tg ? [tg] : [])));
    setScopeTcIds((prev) => (prev.length ? prev : (tc ? [tc] : [])));
    aplicarApisDominioPorDefecto();
  };

  const abrirScopeParam = (): void => {
    setScopeDraftSa(checkedFromIds(scopeSaIds));
    setScopeDraftTg(checkedFromIds(scopeTgIds));
    setScopeDraftTc(checkedFromIds(scopeTcIds));
    setScopeDraftUsuarios(checkedFromIds(scopeUsuarioIds));
    setScopeParamOpen(true);
  };

  const toggleScopeDraft = (
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    id: string,
    checked: boolean,
  ): void => {
    setter((prev) => ({ ...prev, [id]: checked }));
  };

  const marcarTodosScopeDraft = (
    ids: string[],
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  ): void => {
    setter(checkedFromIds(ids));
  };

  const limpiarScopeDraft = (
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  ): void => {
    setter({});
  };

  const aplicarScopeParam = (): void => {
    const nextSa = idsFromChecked(scopeDraftSa);
    const nextTg = idsFromChecked(scopeDraftTg);
    const nextTc = idsFromChecked(scopeDraftTc);
    const usuariosValidos = new Set(usuariosFiltradosScopeDraft.map((u) => u.id));
    const nextUsuarios = idsFromChecked(scopeDraftUsuarios).filter((id) => usuariosValidos.has(id));
    setScopeSaIds(nextSa);
    setScopeTgIds(nextTg);
    setScopeTcIds(nextTc);
    setScopeUsuarioIds(nextUsuarios);
    setScopeParamOpen(false);
  };

  const abrirCatalogoTipoEfecto = (
    tab: 'TIPOS' | 'EFECTOS' | 'REFERENCIA' | 'COMPORTAMIENTO' | 'MOTOR_EVENTO' = 'TIPOS',
  ): void => {
    setMotorEventoDraft(null);
    setCatalogoTipoEfectoTab(tab);
    setCatalogoTipoEfectoOpen(true);
  };

  const rutasCatalogo = useMemo(
    () => opcionesRuntime?.rutas ?? [],
    [opcionesRuntime?.rutas]
  );

  const accionesCatalogo = useMemo(
    () => opcionesRuntime?.acciones ?? [],
    [opcionesRuntime?.acciones]
  );

  const rutaSeleccionada = useMemo(
    () => rutasCatalogo.find((r) => r.id === recursoRutaId) ?? null,
    [rutasCatalogo, recursoRutaId]
  );

  const rutasFiltradas = useMemo(() => {
    const q = filtroRuta.trim().toLowerCase();
    if (!q) return rutasCatalogo;
    return rutasCatalogo.filter((r) =>
      r.label.toLowerCase().includes(q)
      || r.path.toLowerCase().includes(q)
      || r.name.toLowerCase().includes(q)
      || (r.component || '').toLowerCase().includes(q)
    );
  }, [rutasCatalogo, filtroRuta]);

  const accionesVisibles = useMemo(() => {
    const idsRuta = rutaSeleccionada?.accionIds ?? [];
    const base = idsRuta.length
      ? accionesCatalogo.filter((a) => idsRuta.includes(a.id))
      : accionesCatalogo;
    const q = filtroAccion.trim().toLowerCase();
    if (!q) return base;
    return base.filter((a) =>
      a.label.toLowerCase().includes(q)
      || a.method.toLowerCase().includes(q)
      || a.etiquetas.toLowerCase().includes(q)
    );
  }, [accionesCatalogo, rutaSeleccionada, filtroAccion]);

  const agregarReferencia = (value: string) => {
    const normalizado = value.trim().toUpperCase();
    if (!normalizado || referenciaSeleccionadas.includes(normalizado)) return;
    setReferencia([...referenciaSeleccionadas, normalizado].join(', '));
  };

  const agregarApisDominio = (id: string) => {
    const normalizado = normalizarIdApiOpcional(id);
    if (!normalizado || apisDominiosIds.includes(normalizado)) return;
    setApisDominiosIds((prev) => [...prev, normalizado]);
  };

  const onReferenciaChange = (value: string): void => {
    const normalizado = value.trim().toUpperCase();
    setDominio(normalizado);
    setReferencia(normalizado);
  };

  const toggleApisDominio = (id: string, checked: boolean): void => {
    const normalizado = normalizarIdApiOpcional(id);
    if (!normalizado) return;
    setApisDominiosIds((prev) => (
      checked
        ? (prev.includes(normalizado) ? prev : [...prev, normalizado])
        : prev.filter((item) => item !== normalizado)
    ));
  };

  const marcarTodosApisDominios = (): void => {
    setApisDominiosIds(apisDominiosCatalogo.map((item) => item.id));
  };

  const limpiarApisDominios = (): void => {
    setApisDominiosIds([]);
  };

  const aplicarApisDominioDesdeCatalogo = (id: string) => {
    agregarApisDominio(id);
    setCatalogosOpen(false);
  };

  useEffect(() => {
    if (!formOpen || !creandoNueva) return;
    aplicarScopeJwtPorDefecto();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formOpen, creandoNueva, opcionesRuntime?.contexto?.tenantSuperAdminId]);

  useEffect(() => {
    if (creandoNueva || !politicaSeleccionada || codigo === NUEVA_POLITICA_VALUE) return;
    setPoliticaEditId(politicaId(politicaSeleccionada));
    setCodigo(politicaSeleccionada.codigo || codigo);
    setTipo(politicaSeleccionada.tipo || tipo);
    setEfecto(politicaSeleccionada.efecto || efecto);
    const refsSel = referenciaDePolitica(politicaSeleccionada);
    setDominio(politicaSeleccionada.dominio || refsSel[0] || dominio);
    aplicarScopeDesdePolitica(politicaSeleccionada);
    setReferencia(referenciaDePolitica(politicaSeleccionada).join(', '));
    setApisDominiosIds(scopeApisDominiosIds(politicaSeleccionada));
    cargarMetadataAccion(politicaSeleccionada);
    cargarMetadataBypass(politicaSeleccionada);
  // Solo sincroniza cuando cambia la política seleccionada.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [politicaSeleccionada?._id, politicaSeleccionada?.codigo, creandoNueva]);

  const iniciarNuevaPolitica = () => {
    setCreandoNueva(true);
    setPoliticaEditId('');
    setCodigo('');
    setTipo('');
    setEfecto('');
    setDominio('');
    setScopeSaIds([]);
    setScopeTgIds([]);
    setScopeTcIds([]);
    setScopeUsuarioIds([]);
    setReferencia('');
    setApisDominiosIds([]);
    setAccionIds([]);
    setRecursoRutaId('');
    setRecursoFormulario('');
    setFiltroRuta('');
    setFiltroAccion('');
    setMotorEvento('');
    setDecision(null);
  };

  const cargarMetadataBypass = (politica: PoliticaRuntime) => {
    const meta = (politica.condiciones?.metadata ?? {}) as { motorEvento?: string; alcance?: string };
    const motor = String(meta.motorEvento || meta.alcance || '').trim().toUpperCase();
    setMotorEvento(motor);
  };

  const cargarMetadataAccion = (politica: PoliticaRuntime) => {
    const meta = (politica.condiciones?.metadata ?? {}) as {
      accionIds?: string[];
      accionId?: string;
      rutaId?: string;
      formularioComponent?: string;
    };
    const ids = [
      ...(Array.isArray(meta.accionIds) ? meta.accionIds : []),
      ...(meta.accionId ? [meta.accionId] : []),
    ].map((id) => String(id).trim()).filter(Boolean);
    setAccionIds(normalizarIdsApi(Array.from(new Set(ids))));
    setRecursoRutaId(normalizarIdApiOpcional(meta.rutaId) || '');
    setRecursoFormulario(meta.formularioComponent ? String(meta.formularioComponent) : '');
  };

  const editarPolitica = (politica: PoliticaRuntime) => {
    setCreandoNueva(false);
    setPoliticaEditId(politicaId(politica));
    setCodigo(politica.codigo || '');
    setTipo(politica.tipo || '');
    setEfecto(politica.efecto || '');
    const refs = referenciaDePolitica(politica);
    setDominio(politica.dominio || refs[0] || '');
    aplicarScopeDesdePolitica(politica);
    setReferencia(referenciaDePolitica(politica).join(', '));
    setApisDominiosIds(scopeApisDominiosIds(politica));
    cargarMetadataAccion(politica);
    cargarMetadataBypass(politica);
    setDecision(null);
    setCatalogosOpen(false);
    setFormOpen(true);
  };

  const toggleAccion = (id: string) => {
    const normalizado = normalizarIdApiOpcional(id);
    if (!normalizado) return;
    setAccionIds((prev) => (prev.includes(normalizado) ? prev.filter((a) => a !== normalizado) : [...prev, normalizado]));
  };

  const seleccionarRuta = (rutaId: string) => {
    if (!rutaId || rutaId === '__none__') {
      setRecursoRutaId('');
      setRecursoFormulario('');
      return;
    }
    const ruta = rutasCatalogo.find((r) => r.id === rutaId);
    setRecursoRutaId(rutaId);
    setRecursoFormulario(ruta?.component || '');
  };

  const aplicarReferenciaDesdeCatalogo = (value: string) => {
    if (!codigo.trim()) setCodigo(`POLITICA_${value}`);
    agregarReferencia(value);
    setCatalogosOpen(false);
  };

  const simular = async () => {
    setSimulando(true);
    try {
      const referenciaLista = parseListaCsv(referencia);
      const dominioNorm = dominio.trim().toUpperCase() || referenciaLista[0] || '';
      const referenciaSim = dominioNorm || referenciaLista[0] || '';
      const usarReferencia = referenciaSim && !esPoliticaBypassLike(tipo, codigo);
      const simSa = scopeSaIds[0] || undefined;
      const simTg = scopeTgIds[0] || undefined;
      const simTc = scopeTcIds[0] || undefined;
      const simUsuario = scopeUsuarioIds[0] || undefined;
      const result = await simularPoliticaRuntime(
        usarReferencia
          ? {
              referencia: referenciaSim,
              dominio: dominioNorm || undefined,
              tipo: tipo || undefined,
              tenantSuperAdminId: simSa,
              tenantGlobalId: simTg,
              tenantCorporativoId: simTc,
              usuarioId: simUsuario,
            }
          : {
              codigo,
              tipo,
              dominio: dominioNorm || undefined,
              tenantSuperAdminId: simSa,
              tenantGlobalId: simTg,
              tenantCorporativoId: simTc,
              usuarioId: simUsuario,
            },
      );
      setDecision(result);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo simular la política');
    } finally {
      setSimulando(false);
    }
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const codigoNormalizado = codigo.trim().toUpperCase();
      if (!codigoNormalizado) throw new Error('Código requerido para crear o editar la política');
      if (!tipo) throw new Error('Selecciona un tipo de política');
      if (!efecto) throw new Error('Selecciona un efecto');
      const dominioNorm = dominio.trim().toUpperCase();
      if (!dominioNorm) throw new Error('Selecciona una referencia del catálogo');
      const referenciaLista = [dominioNorm, ...parseListaCsv(referencia).filter((r) => r !== dominioNorm)];
      if (!apisDominiosIds.length) throw new Error('Selecciona al menos un dominio (apisdominios)');
      if (!scopeSaIds.length) {
        throw new Error('Parametriza al menos un tenant SuperAdmin en el alcance');
      }
      const scopeSaNorm = normalizarIdsApi(scopeSaIds);
      const scopeTgNorm = normalizarIdsApi(scopeTgIds);
      const scopeTcNorm = normalizarIdsApi(scopeTcIds);
      const scopeUsuariosNorm = normalizarIdsApi(scopeUsuarioIds);
      const apisDominiosNorm = normalizarIdsApi(apisDominiosIds);
      if (!scopeSaNorm.length) {
        throw new Error('Los IDs de tenant SA no son válidos. Recarga opciones y parametriza el alcance de nuevo.');
      }
      if (!apisDominiosNorm.length) {
        throw new Error('Los IDs de apisdominios no son válidos. Recarga opciones y selecciona de nuevo.');
      }
      const accionIdsNorm = normalizarIdsApi(accionIds);
      const rutaIdNorm = normalizarIdApiOpcional(recursoRutaId);
      const efectoItem = catalogoEfectosBD.find((i) => i.valor === efecto);
      const motorNorm = esPoliticaBypassLike(tipo, codigoNormalizado)
        ? (motorEvento.trim() || String((politicaSeleccionada?.condiciones?.metadata as { motorEvento?: string })?.motorEvento || '')).toUpperCase()
        : '';
      const motorItemSeleccionado = motorNorm
        ? bypassAlcancesOpciones.find((i) => (i.nombre || i.alcance) === motorNorm)
        : undefined;
      if (esPoliticaBypassLike(tipo, codigoNormalizado) && motorNorm && !motorItemSeleccionado) {
        throw new Error('El motor evento seleccionado no existe en el catalogo parametrizado');
      }
      const pipelineMotorSeleccionado = motorItemSeleccionado?.pipeline
        ? normalizarPipelineMotorEvento(motorItemSeleccionado.pipeline)
        : '';
      const selectsDinamicosIds = {
        tipoCatalogoId: resolverIdCatalogo(catalogoTiposBD, tipo),
        efectoCatalogoId: resolverIdCatalogo(catalogoEfectosBD, efecto),
        referenciaCatalogoId: resolverIdCatalogo(catalogoReferenciasBD, dominioNorm),
        motorEventoId: motorNorm
          ? normalizarIdApiOpcional(
            motorItemSeleccionado?.id,
          )
          : undefined,
        comportamientoCatalogoId: efectoItem?.comportamiento
          ? resolverIdCatalogo(
            catalogoComportamientosBD.map((c) => ({ id: c.id, valor: c.valor })),
            efectoItem.comportamiento,
          )
          : undefined,
        apisDominiosIds: apisDominiosNorm,
      };
      const saScope = scopeSaNorm[0];
      const tgScope = scopeTgNorm[0] || '';
      const tcScope = scopeTcNorm[0] || '';
      const usuarioScope = scopeUsuariosNorm[0] || '';
      const metaPrev = (politicaSeleccionada?.condiciones?.metadata ?? {}) as Record<string, unknown>;
      const alcanceMeta = {
        tenantSuperAdminIds: scopeSaNorm,
        tenantGlobalIds: scopeTgNorm,
        tenantCorporativoIds: scopeTcNorm,
        usuarioIds: scopeUsuariosNorm,
        ...selectsDinamicosIds,
      };
      const condiciones: PoliticaRuntime['condiciones'] = {
        referencia: referenciaLista,
        bypassDominios: referenciaLista,
        roles: [],
      };
      if (tipo === TIPO_ACCION) {
        condiciones.metadata = sanitizarMetadata({
          ...metaPrev,
          ...alcanceMeta,
          accionIds: accionIdsNorm,
          rutaId: rutaIdNorm,
          formularioComponent: recursoFormulario.trim() || undefined,
        });
      } else if (esPoliticaBypassLike(tipo, codigoNormalizado)) {
        const alcanceDesdeCodigo = codigoNormalizado.startsWith('BYPASS_')
          ? codigoNormalizado.slice('BYPASS_'.length)
          : codigoNormalizado;
        const motor = motorNorm || alcanceDesdeCodigo;
        condiciones.metadata = sanitizarMetadata({
          ...metaPrev,
          ...alcanceMeta,
          alcance: motor,
          motorEvento: motor,
          pipeline: pipelineMotorSeleccionado || undefined,
          pipelineLabel: pipelineMotorSeleccionado ? etiquetaPipeline(pipelineMotorSeleccionado) : undefined,
        });
      } else {
        condiciones.metadata = sanitizarMetadata({ ...metaPrev, ...alcanceMeta });
      }
      const payload = {
        codigo: codigoNormalizado,
        tipo,
        efecto,
        dominio: dominioNorm,
        condiciones,
        scope: {
          tipo: resolverScopeTipo(scopeUsuariosNorm, scopeTcNorm, scopeTgNorm),
          tenantSuperAdmin: saScope,
          tenantGlobal: tgScope || undefined,
          tenantCorporativo: tcScope || undefined,
          usuarioId: usuarioScope || undefined,
          apisDominiosIds: apisDominiosNorm,
          apisDominios: apisDominiosNorm[0] || undefined,
        },
      };
      const esCreacion = creandoNueva || !politicaEditId;
      if (esCreacion && politicas.some((p) => String(p.codigo || '').toUpperCase() === codigoNormalizado)) {
        throw new Error('Ya existe una política con ese código. Usa Editar o elige otro código.');
      }
      if (esCreacion) {
        await actualizarPoliticaRuntime(codigoNormalizado, payload);
      } else {
        await actualizarPoliticaRuntimePorId(politicaEditId, payload);
      }
      toast.success(esCreacion ? 'Política runtime creada' : 'Política runtime actualizada');
      setCreandoNueva(false);
      setFormOpen(false);
      await cargar();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar la política');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (politica: PoliticaRuntime) => {
    const id = politicaId(politica);
    if (!id) return;
    setGuardando(true);
    try {
      await eliminarPoliticaRuntime(id);
      toast.success('Política runtime eliminada');
      if (politicaEditId === id) iniciarNuevaPolitica();
      await cargar();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar la política');
    } finally {
      setGuardando(false);
    }
  };

  const iniciarNuevoItem = (categoria: PoliticaRuntimeCatalogoCategoria, valorInicial = '') => {
    setItemDraft({
      ...draftVacio(categoria),
      valor: valorInicial.trim().toUpperCase(),
      ...(categoria !== 'COMPORTAMIENTO' && categoria !== 'SEMANTICA_MOTOR' ? {
        orden: siguienteOrdenCatalogo(
          categoria,
          catalogoTiposBD,
          catalogoEfectosBD,
          catalogoReferenciasBD,
          catalogoComportamientosBD,
        ),
      } : {}),
      activo: true,
    });
    setCatalogoTipoEfectoTab(tabDeCategoria(categoria));
    setCatalogoTipoEfectoOpen(true);
  };

  const editarItem = (
    categoria: PoliticaRuntimeCatalogoCategoria,
    item: PoliticaRuntimeCatalogoItem | PoliticaRuntimeComportamientoCatalogoItem,
  ) => {
    const compItem = categoria === 'COMPORTAMIENTO'
      ? (item as PoliticaRuntimeComportamientoCatalogoItem)
      : null;
    const motorResuelto = compItem ? resolverMotorSemanticaComportamientoUi(compItem) : null;
    setItemDraft({
      categoria,
      valor: 'nombre' in item ? item.nombre : item.valor,
      label: 'etiqueta' in item ? item.etiqueta : (item.label || ''),
      descripcion: 'descripcion' in item ? (item.descripcion || '') : '',
      ...('comportamiento' in item && item.comportamiento ? { comportamiento: item.comportamiento } : {}),
      ...(motorResuelto ? { motorSemantica: motorResuelto } : {}),
      ...('orden' in item && item.orden != null ? { orden: item.orden } : {}),
      ...(item.activo != null ? { activo: item.activo } : {}),
      esNuevo: false,
    });
    setCatalogoTipoEfectoTab(tabDeCategoria(categoria));
    setCatalogoTipoEfectoOpen(true);
  };

  const metaCatalogoTab = (): {
    categoria: PoliticaRuntimeCatalogoCategoria;
    items: PoliticaRuntimeCatalogoItem[] | PoliticaRuntimeComportamientoCatalogoItem[];
    label: string;
  } | null => {
    if (catalogoTipoEfectoTab === 'TIPOS') {
      return { categoria: 'TIPO', items: catalogoTiposBD, label: 'tipo' };
    }
    if (catalogoTipoEfectoTab === 'EFECTOS') {
      return { categoria: 'EFECTO', items: catalogoEfectosBD, label: 'efecto' };
    }
    if (catalogoTipoEfectoTab === 'REFERENCIA') {
      return { categoria: 'REFERENCIA', items: catalogoReferenciasBD, label: 'referencia' };
    }
    if (catalogoTipoEfectoTab === 'COMPORTAMIENTO') {
      return { categoria: 'COMPORTAMIENTO', items: catalogoComportamientosBD, label: 'comportamiento' };
    }
    if (catalogoTipoEfectoTab === 'SEMANTICA_MOTOR') {
      return { categoria: 'SEMANTICA_MOTOR', items: catalogoSemanticasBD, label: 'semántica' };
    }
    return null;
  };

  const renderCatalogoLista = (): React.ReactElement | null => {
    const meta = metaCatalogoTab();
    if (!meta) return null;
    const { categoria, items, label } = meta;
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground">
          Colección{' '}
          <code className="rounded bg-muted px-1 text-xs">
            {categoria === 'TIPO' ? 'catalogotipos'
              : categoria === 'EFECTO' ? 'catalogoefectos'
                : categoria === 'REFERENCIA' ? 'catalogoreferencias'
                  : categoria === 'COMPORTAMIENTO' ? 'catalogocomportamientos'
                    : 'politicasruntimecatalogo'}
          </code>
          {categoria === 'REFERENCIA' ? ' → se usa como dominio de la política. Puede enlazarse a un Motor Evento.' : ''}
          {categoria === 'COMPORTAMIENTO' ? ' → nombre, etiqueta y semántica del motor (EFECTO enlaza aquí).' : ''}
          {categoria === 'SEMANTICA_MOTOR' ? ' → vocabulario dinámico que el motor evalúa. Alimenta el selector de semántica en Comportamiento.' : ''}
          {categoria !== 'REFERENCIA' && categoria !== 'COMPORTAMIENTO' && categoria !== 'SEMANTICA_MOTOR' ? '.' : ''}
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => iniciarNuevoItem(categoria)}
          >
            <Plus className="mr-1 h-3 w-3" />
            {categoria === 'SEMANTICA_MOTOR' ? 'Nueva semantica' : `Nuevo ${label}`}
          </Button>
        </div>
        <ScrollArea className="h-64 rounded border p-2">
          <div className="space-y-2">
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {categoria === 'SEMANTICA_MOTOR'
                  ? 'Sin registros. Crea una semantica personalizada.'
                  : `Sin registros. Crea el primero con «Nuevo ${label}».`}
              </p>
            ) : null}
            {items.map((item) => {
              const itemKey = 'nombre' in item ? item.nombre : item.valor;
              const compItem = categoria === 'COMPORTAMIENTO'
                ? (item as PoliticaRuntimeComportamientoCatalogoItem)
                : null;
              const catalogItem = categoria !== 'COMPORTAMIENTO'
                ? (item as PoliticaRuntimeCatalogoItem)
                : null;
              return (
              <div key={itemKey} className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {compItem ? (
                      <>
                        <Badge variant="outline">{compItem.nombre}</Badge>
                        <span className="text-muted-foreground">{compItem.etiqueta}</span>
                        {(() => {
                          const motor = resolverMotorSemanticaComportamientoUi(compItem);
                          if (!motor) {
                            return <Badge variant="destructive">sin motor</Badge>;
                          }
                          const inferido = !String(compItem.motorSemantica || '').trim();
                          return (
                            <Badge variant={inferido ? 'outline' : 'secondary'} title={inferido ? 'Inferido desde nombre/etiqueta' : undefined}>
                              {motor}{inferido ? ' · auto' : ''}
                            </Badge>
                          );
                        })()}
                      </>
                    ) : (
                      <>
                        <Badge variant="outline">{catalogItem?.valor}</Badge>
                        {categoria === 'EFECTO' ? (
                          <Badge variant="secondary">{catalogItem?.comportamiento || '—'}</Badge>
                        ) : null}
                        {catalogItem && !catalogItem.activo ? <Badge variant="secondary">inactivo</Badge> : null}
                        {catalogItem?.protegido ? <Badge variant="secondary">sistema</Badge> : null}
                      </>
                    )}
                  </div>
                  {catalogItem && (catalogItem.label || catalogItem.descripcion) ? (
                    <p className="mt-1 text-muted-foreground">
                      {catalogItem.label}{catalogItem.descripcion ? ` · ${catalogItem.descripcion}` : ''}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => editarItem(categoria, item)}>
                    <Pencil className="mr-1 h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={(catalogItem?.protegido ?? compItem?.protegido) || guardandoItem}
                    onClick={() => void eliminarItem(categoria, itemKey)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const guardarItem = async () => {
    if (!itemDraft) return;
    const nombreNormalizado = itemDraft.valor.trim().toUpperCase();
    if (!nombreNormalizado) {
      toast.error(itemDraft.categoria === 'COMPORTAMIENTO' ? 'El nombre es obligatorio' : 'El valor es obligatorio');
      return;
    }
    setGuardandoItem(true);
    try {
      if (itemDraft.categoria === 'COMPORTAMIENTO') {
        const etiqueta = itemDraft.label.trim();
        if (!etiqueta) {
          toast.error('La etiqueta es obligatoria');
          return;
        }
        const motorInferido =
          itemDraft.motorSemantica?.trim().toUpperCase()
          || inferirMotorSemanticaComportamiento(nombreNormalizado, etiqueta)
          || '';
        await guardarPoliticaRuntimeCatalogoItem({
          categoria: 'COMPORTAMIENTO',
          nombre: nombreNormalizado,
          etiqueta,
          ...(motorInferido ? { motorSemantica: motorInferido } : {}),
        });
        toast.success(itemDraft.esNuevo ? 'Comportamiento guardado' : 'Comportamiento actualizado');
        setItemDraft(null);
        await recargarOpcionesCatalogo();
        return;
      }

      const payload: GuardarCatalogoItemPayload = {
        categoria: itemDraft.categoria,
        valor: nombreNormalizado,
      };
      if (itemDraft.label.trim()) payload.label = itemDraft.label.trim();
      if (itemDraft.descripcion.trim()) payload.descripcion = itemDraft.descripcion.trim();
      if (itemDraft.esNuevo) {
        if (itemDraft.orden != null && !Number.isNaN(itemDraft.orden) && itemDraft.orden > 0) {
          payload.orden = itemDraft.orden;
        }
      } else if (itemDraft.orden != null && !Number.isNaN(itemDraft.orden)) {
        payload.orden = itemDraft.orden;
      }
      if (itemDraft.activo != null) payload.activo = itemDraft.activo;
      if (itemDraft.categoria === 'EFECTO') {
        if (!itemDraft.comportamiento) {
          toast.error('Selecciona el comportamiento del efecto');
          return;
        }
        payload.comportamiento = itemDraft.comportamiento;
      }
      await guardarPoliticaRuntimeCatalogoItem(payload);
      toast.success(itemDraft.esNuevo ? 'Ítem de catálogo guardado' : 'Ítem de catálogo actualizado');
      setItemDraft(null);
      await recargarOpcionesCatalogo();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el registro');
    } finally {
      setGuardandoItem(false);
    }
  };

  const eliminarItem = async (categoria: PoliticaRuntimeCatalogoCategoria, valor: string) => {
    setGuardandoItem(true);
    try {
      await eliminarPoliticaRuntimeCatalogoItem(categoria, valor);
      toast.success('Registro eliminado');
      await recargarOpcionesCatalogo();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar el registro');
    } finally {
      setGuardandoItem(false);
    }
  };

  const iniciarNuevoMotorEvento = () => {
    setMotorEventoDraft({
      nombre: '',
      etiqueta: '',
      pipeline: pipelineOpciones[0]?.nombre || '',
      esNuevo: true,
    });
    setItemDraft(null);
    setCatalogoTipoEfectoTab('MOTOR_EVENTO');
    setCatalogoTipoEfectoOpen(true);
  };

  const editarMotorEvento = (item: PoliticaRuntimeBypassAlcanceOpcion) => {
    setMotorEventoDraft({
      nombre: item.nombre || item.alcance,
      etiqueta: item.etiqueta || item.label,
      pipeline: normalizarPipelineMotorEvento(item.pipeline),
      esNuevo: false,
    });
    setItemDraft(null);
    setCatalogoTipoEfectoTab('MOTOR_EVENTO');
    setCatalogoTipoEfectoOpen(true);
  };

  const iniciarNuevoPipeline = () => {
    setPipelineDraft({ nombre: '', label: '', referencia: '', descripcion: '', esNuevo: true });
  };

  const iniciarEditarPipeline = (item: PoliticaBypassPipelineItem) => {
    setPipelineDraft({
      nombre: item.nombre,
      label: item.label,
      referencia: item.referencia || '',
      descripcion: item.descripcion || '',
      esNuevo: false,
    });
  };

  const eliminarPipelineItem = async (nombre: string) => {
    setGuardandoItem(true);
    try {
      await eliminarPoliticaBypassPipeline(nombre);
      toast.success('Pipeline eliminado');
      await Promise.all([recargarOpcionesCatalogo(), cargarCatalogoPipeline()]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar el pipeline');
    } finally {
      setGuardandoItem(false);
    }
  };

  const seleccionarReferenciaPipeline = (referenciaValor: string) => {
    if (!pipelineDraft) return;
    const valor = referenciaValor.trim().toUpperCase();
    const item = catalogoReferenciasBD.find((ref) => ref.valor === valor);
    setPipelineDraft({
      ...pipelineDraft,
      referencia: valor,
      label: item?.label || valor,
      descripcion: pipelineDraft.descripcion || item?.descripcion || '',
    });
  };

  const guardarPipelineItem = async () => {
    if (!pipelineDraft) return;
    const nombre = pipelineDraft.nombre.trim().toUpperCase();
    const label = pipelineDraft.label.trim();
    if (!nombre) { toast.error('El nombre del pipeline es obligatorio'); return; }
    if (!label) { toast.error('La etiqueta del pipeline es obligatoria'); return; }
    setGuardandoItem(true);
    try {
      const payload = {
        nombre,
        label,
        referencia: pipelineDraft.referencia.trim().toUpperCase() || undefined,
        descripcion: pipelineDraft.descripcion.trim() || undefined,
      };
      const pipeline = pipelineDraft.esNuevo
        ? await guardarPoliticaBypassPipeline(payload)
        : await actualizarPoliticaBypassPipeline(nombre, payload);
      toast.success(pipelineDraft.esNuevo ? 'Pipeline creado' : 'Pipeline actualizado');
      setPipelineDraft(null);
      if (pipelineDraft.esNuevo) {
        setMotorEventoDraft((draft) => draft ? { ...draft, pipeline: pipeline.nombre } : draft);
      }
      await Promise.all([recargarOpcionesCatalogo(), cargarCatalogoPipeline()]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el pipeline');
    } finally {
      setGuardandoItem(false);
    }
  };

  const guardarMotorEventoItem = async () => {
    if (!motorEventoDraft) return;
    const nombre = motorEventoDraft.nombre.trim().toUpperCase();
    const etiqueta = motorEventoDraft.etiqueta.trim();
    if (!nombre) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!etiqueta) {
      toast.error('La etiqueta es obligatoria');
      return;
    }
    setGuardandoItem(true);
    try {
      await guardarPoliticaBypassMotorEvento({
        nombre,
        etiqueta,
        pipeline: motorEventoDraft.pipeline,
      });
      toast.success(motorEventoDraft.esNuevo ? 'Motor evento guardado' : 'Motor evento actualizado');
      setMotorEventoDraft(null);
      await recargarOpcionesCatalogo();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el motor evento');
    } finally {
      setGuardandoItem(false);
    }
  };

  const eliminarMotorEventoItem = async (nombre: string) => {
    setGuardandoItem(true);
    try {
      await eliminarPoliticaBypassMotorEvento(nombre);
      toast.success('Motor evento eliminado');
      await recargarOpcionesCatalogo();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar el motor evento');
    } finally {
      setGuardandoItem(false);
    }
  };

  // ─── CRUD Motor Eventos Sg (colección catalogomotoreventos) ────────────────
  const iniciarNuevoMotorEventoSg = () => {
    setMotorEventoSgDraft({ codigo: '', label: '', descripcion: '', pipeline: '', semantica: 'NEUTRO', activo: true, esNuevo: true });
    setCatalogoTipoEfectoTab('PIPELINES');
    setCatalogoTipoEfectoOpen(true);
  };

  const editarMotorEventoSg = (item: CatalogoMotorEventoSgItem) => {
    setMotorEventoSgDraft({
      codigo: item.codigo,
      label: item.label,
      descripcion: item.descripcion,
      pipeline: item.pipeline ?? '',
      semantica: item.semantica ?? 'NEUTRO',
      activo: item.activo,
      esNuevo: false,
    });
  };

  const guardarMotorEventoSgItem = async () => {
    if (!motorEventoSgDraft) return;
    const codigo = motorEventoSgDraft.codigo.trim().toUpperCase();
    if (!codigo) { toast.error('El código es obligatorio'); return; }
    setGuardandoItem(true);
    try {
      if (motorEventoSgDraft.esNuevo) {
        await guardarCatalogoMotorEventoSg({ ...motorEventoSgDraft, codigo });
      } else {
        const { esNuevo: _, codigo: _c, ...rest } = motorEventoSgDraft;
        await actualizarCatalogoMotorEventoSg(codigo, rest);
      }
      toast.success(motorEventoSgDraft.esNuevo ? 'Motor evento guardado' : 'Motor evento actualizado');
      setMotorEventoSgDraft(null);
      await cargarMotorEventosSg();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el motor evento');
    } finally {
      setGuardandoItem(false);
    }
  };

  const eliminarMotorEventoSgItem = async (codigo: string) => {
    setGuardandoItem(true);
    try {
      await eliminarCatalogoMotorEventoSg(codigo);
      toast.success('Motor evento eliminado');
      await cargarMotorEventosSg();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar el motor evento');
    } finally {
      setGuardandoItem(false);
    }
  };

  const SEMANTICAS = ['PERMITE', 'BLOQUEA', 'BYPASS', 'NEUTRO', 'REQUIERE_TECHO'] as const;

  const renderPipelinesLista = (): React.ReactElement => {
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground">
          Coleccion <code className="rounded bg-muted px-1 text-xs">catologoPipeline</code> - opciones visibles para el selector de pipeline en motor evento.
        </p>
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="outline" onClick={iniciarNuevoPipeline}>
            <Plus className="mr-1 h-3 w-3" />
            Nuevo pipeline
          </Button>
        </div>
        <ScrollArea className="h-64 rounded border p-2">
          <div className="space-y-2">
            {catalogoPipelineItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin registros. Crea el primero con Nuevo pipeline.</p>
            ) : null}
            {catalogoPipelineItems.map((item) => (
              <div key={item.nombre} className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{item.nombre}</Badge>
                    <span className="text-muted-foreground">{item.label}</span>
                    {item.referencia ? <Badge variant="secondary">{item.referencia}</Badge> : null}
                    {item.activo === false ? <Badge variant="secondary">inactivo</Badge> : null}
                    {Number.isFinite(Number(item.orden)) ? <Badge variant="secondary">orden {item.orden}</Badge> : null}
                  </div>
                  {item.descripcion ? (
                    <p className="mt-1 text-muted-foreground">{item.descripcion}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => iniciarEditarPipeline(item)}>
                    <Pencil className="mr-1 h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={guardandoItem}
                    onClick={() => void eliminarPipelineItem(item.nombre)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );

    const grupos = Array.from(
      catalogoMotorEventosSg.reduce((map, item) => {
        const key = item.pipeline || 'SIN_PIPELINE';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
        return map;
      }, new Map<string, CatalogoMotorEventoSgItem[]>()),
    );
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground">
          Colección <code className="rounded bg-muted px-1 text-xs">catalogomotoreventos</code> · pipelines y motores de evento creados.
        </p>
        {motorEventoSgDraft ? (
          <div className="space-y-3 rounded-md border border-primary/40 bg-muted/30 p-3">
            <p className="text-xs font-medium">{motorEventoSgDraft.esNuevo ? 'Nuevo' : 'Editar'} motor evento</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Código *</Label>
                <Input
                  value={motorEventoSgDraft.codigo}
                  disabled={!motorEventoSgDraft.esNuevo}
                  placeholder="EJ: REFERIDOS"
                  onChange={(e) => setMotorEventoSgDraft({ ...motorEventoSgDraft, codigo: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Etiqueta</Label>
                <Input
                  value={motorEventoSgDraft.label ?? ''}
                  placeholder="Referidos y membresía"
                  onChange={(e) => setMotorEventoSgDraft({ ...motorEventoSgDraft, label: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pipeline</Label>
                <Input
                  value={motorEventoSgDraft.pipeline ?? ''}
                  placeholder="EJ: PIPELINE_A"
                  onChange={(e) => setMotorEventoSgDraft({ ...motorEventoSgDraft, pipeline: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Semántica</Label>
                <Select
                  value={motorEventoSgDraft.semantica ?? 'NEUTRO'}
                  onValueChange={(v) => setMotorEventoSgDraft({ ...motorEventoSgDraft, semantica: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEMANTICAS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Descripción</Label>
                <Input
                  value={motorEventoSgDraft.descripcion ?? ''}
                  placeholder="Para qué sirve este motor"
                  onChange={(e) => setMotorEventoSgDraft({ ...motorEventoSgDraft, descripcion: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={guardandoItem} onClick={() => void guardarMotorEventoSgItem()}>
                {guardandoItem ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setMotorEventoSgDraft(null)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="outline" onClick={iniciarNuevoMotorEventoSg}>
              <Plus className="mr-1 h-3 w-3" />
              Nuevo motor evento
            </Button>
          </div>
        )}
        <ScrollArea className="h-64 rounded border p-2">
          <div className="space-y-4">
            {grupos.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin registros. Crea el primero con «Nuevo motor evento».</p>
            ) : null}
            {grupos.map(([pipeline, items]) => (
              <div key={pipeline} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">{pipeline}</p>
                {items.map((item) => (
                  <div key={item.codigo} className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline">{item.codigo}</Badge>
                        {item.semantica ? <Badge variant="secondary">{item.semantica}</Badge> : null}
                        {!item.activo ? <Badge variant="secondary">inactivo</Badge> : null}
                        {item.protegido ? <Badge variant="secondary">sistema</Badge> : null}
                      </div>
                      {item.label || item.descripcion ? (
                        <p className="mt-1 text-muted-foreground">{item.label}{item.descripcion ? ` · ${item.descripcion}` : ''}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" size="sm" variant="outline" onClick={() => editarMotorEventoSg(item)}>
                        <Pencil className="mr-1 h-3 w-3" />Editar
                      </Button>
                      <Button
                        type="button" size="sm" variant="destructive"
                        disabled={item.protegido || guardandoItem}
                        onClick={() => void eliminarMotorEventoSgItem(item.codigo)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const renderMotorEventoLista = (): React.ReactElement => (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        Colección <code className="rounded bg-muted px-1 text-xs">politicabypassalcances</code> · identifica
        funcionalidades por pipeline configurado.
      </p>
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="outline" onClick={iniciarNuevoMotorEvento}>
          <Plus className="mr-1 h-3 w-3" />
          Nuevo motor evento
        </Button>
      </div>
      <ScrollArea className="h-64 rounded border p-2">
        <div className="space-y-4">
          {pipelineOpciones.map((pipeline) => (
            <div key={pipeline.nombre} className="space-y-2">
              <p className="text-xs font-medium">{pipeline.label}</p>
              {(motorEventosPorPipeline.get(pipeline.nombre) ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin registros en este pipeline.</p>
              ) : (
                (motorEventosPorPipeline.get(pipeline.nombre) ?? []).map((item) => (
                  <div
                    key={item.nombre || item.alcance}
                    className="flex items-center justify-between gap-2 rounded border p-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline">{item.nombre || item.alcance}</Badge>
                        <span className="text-muted-foreground">{item.etiqueta || item.label}</span>
                      </div>
                      {item.descripcion ? (
                        <p className="mt-1 text-muted-foreground">{item.descripcion}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" size="sm" variant="outline" onClick={() => editarMotorEvento(item)}>
                        <Pencil className="mr-1 h-3 w-3" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={guardandoItem}
                        onClick={() => void eliminarMotorEventoItem(item.nombre || item.alcance)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  const renderMotorEventoForm = (): React.ReactElement | null => {
    if (!motorEventoDraft) return null;
    return (
      <div className="space-y-3 rounded-md border border-primary/40 bg-muted/30 p-3">
        <p className="text-xs font-medium">
          {motorEventoDraft.esNuevo ? 'Nuevo' : 'Editar'} motor evento
        </p>
        <p className="text-[11px] text-muted-foreground">
          Nombre = código que guarda la política en <code>metadata.motorEvento</code>.
          Etiqueta = texto visible al parametrizar bypass.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Nombre</Label>
            <Input
              value={motorEventoDraft.nombre}
              disabled={!motorEventoDraft.esNuevo}
              placeholder="EJ: REFERIDOS"
              onChange={(e) => setMotorEventoDraft({ ...motorEventoDraft, nombre: e.target.value.toUpperCase() })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Etiqueta</Label>
            <Input
              value={motorEventoDraft.etiqueta}
              placeholder="Referidos y membresía"
              onChange={(e) => setMotorEventoDraft({ ...motorEventoDraft, etiqueta: e.target.value })}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Pipeline</Label>
              <Button type="button" size="sm" variant="outline" onClick={iniciarNuevoPipeline}>
                <Plus className="mr-1 h-3 w-3" />
                Nuevo pipeline
              </Button>
            </div>
            <Select
              value={motorEventoDraft.pipeline}
              onValueChange={(v) => setMotorEventoDraft({
                ...motorEventoDraft,
                pipeline: normalizarPipelineMotorEvento(v),
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pipelineOpciones.map((pipeline) => (
                  <SelectItem key={pipeline.nombre} value={pipeline.nombre}>{pipeline.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={guardandoItem} onClick={() => void guardarMotorEventoItem()}>
            {guardandoItem ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setMotorEventoDraft(null)}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  };

  const renderPipelineDialog = (): React.ReactElement => (
    <Dialog open={Boolean(pipelineDraft)} onOpenChange={(open) => { if (!open) setPipelineDraft(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pipelineDraft?.esNuevo ? 'Nuevo pipeline' : 'Editar pipeline'}</DialogTitle>
          <DialogDescription>
            {pipelineDraft?.esNuevo
              ? 'Crea la opción visible en el selector de pipeline para motor evento.'
              : 'Edita los datos del pipeline seleccionado.'}
          </DialogDescription>
        </DialogHeader>
        {pipelineDraft ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nombre</Label>
              <Input
                value={pipelineDraft.nombre}
                disabled={!pipelineDraft.esNuevo}
                placeholder="EJ: PIPELINE_JERARQUIA"
                onChange={(e) => setPipelineDraft({ ...pipelineDraft, nombre: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Referencia</Label>
              <Select
                value={pipelineDraft.referencia || undefined}
                onValueChange={seleccionarReferenciaPipeline}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una referencia" />
                </SelectTrigger>
                <SelectContent>
                  {catalogoReferenciasBD.filter((item) => item.activo !== false).length === 0 ? (
                    <SelectItem value="__sin_referencias_pipeline__" disabled>
                      Sin referencias creadas
                    </SelectItem>
                  ) : null}
                  {catalogoReferenciasBD.filter((item) => item.activo !== false).map((item) => (
                    <SelectItem key={item.valor} value={item.valor}>
                      {item.label || item.valor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Etiqueta del select</Label>
              <Input
                value={pipelineDraft.label}
                placeholder="Se completa desde la referencia"
                onChange={(e) => setPipelineDraft({ ...pipelineDraft, label: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descripción</Label>
              <Input
                value={pipelineDraft.descripcion}
                placeholder="Uso del pipeline"
                onChange={(e) => setPipelineDraft({ ...pipelineDraft, descripcion: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={guardandoItem} onClick={() => void guardarPipelineItem()}>
                {guardandoItem ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setPipelineDraft(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );

  const renderItemForm = (): React.ReactElement | null => {
    if (!itemDraft) return null;

    if (itemDraft.categoria === 'SEMANTICA_MOTOR') {
      return (
        <div className="space-y-3 rounded-md border border-primary/40 bg-muted/30 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium">
                {itemDraft.esNuevo ? 'Nueva' : 'Editar'} semantica del motor
              </p>
              <p className="text-[11px] text-muted-foreground">
                Define el vocabulario que el motor usa para evaluar reglas, efectos y comportamientos.
              </p>
            </div>
            <label className="flex items-center gap-2 rounded-md border border-primary/30 px-2 py-1 text-xs">
              <Checkbox
                checked={itemDraft.activo !== false}
                onCheckedChange={(checked) => setItemDraft({ ...itemDraft, activo: checked === true })}
              />
              Activa
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Codigo semantica *</Label>
              <Input
                value={itemDraft.valor}
                disabled={!itemDraft.esNuevo}
                placeholder="EJ: BYPASS"
                onChange={(e) => setItemDraft({ ...itemDraft, valor: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Etiqueta</Label>
              <Input
                value={itemDraft.label}
                placeholder="Nombre visible"
                onChange={(e) => setItemDraft({ ...itemDraft, label: e.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Descripcion</Label>
              <Input
                value={itemDraft.descripcion}
                placeholder="Ej: Permite saltar una validacion bajo condiciones controladas"
                onChange={(e) => setItemDraft({ ...itemDraft, descripcion: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground">
                Luego podras asociarla desde Comportamiento para que el motor la interprete de forma dinamica.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={guardandoItem} onClick={() => void guardarItem()}>
              {guardandoItem ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setItemDraft(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      );
    }

    if (itemDraft.categoria === 'COMPORTAMIENTO') {
      return (
        <div className="space-y-3 rounded-md border border-primary/40 bg-muted/30 p-3">
          <p className="text-xs font-medium">
            {itemDraft.esNuevo ? 'Nuevo' : 'Editar'} comportamiento en catálogo
          </p>
          <p className="text-[11px] text-muted-foreground">
            Nombre y etiqueta visibles. La semántica del motor define cómo se evalúa en reglas y motores (dinámico desde catálogo).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Nombre</Label>
              <Input
                value={itemDraft.valor}
                disabled={!itemDraft.esNuevo}
                placeholder="EJ: BYPASS_REFERIDOS_VENTAS"
                onChange={(e) => setItemDraft({ ...itemDraft, valor: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Etiqueta</Label>
              <Input
                value={itemDraft.label}
                placeholder="Nombre visible"
                onChange={(e) => setItemDraft({ ...itemDraft, label: e.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Semántica del motor *</Label>
              <Select
                value={itemDraft.motorSemantica || ''}
                onValueChange={(v) => setItemDraft({ ...itemDraft, motorSemantica: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="PERMITE · BLOQUEA · BYPASS · …" />
                </SelectTrigger>
                <SelectContent>
                  {motorSemanticasOpciones.map((sem) => (
                    <SelectItem key={sem} value={sem}>
                      {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Si el nombre contiene BYPASS, ALLOW, DENY, etc., la semántica se infiere al guardar. Puedes forzarla con el selector.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={guardandoItem} onClick={() => void guardarItem()}>
              {guardandoItem ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setItemDraft(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      );
    }

    const esEfecto = itemDraft.categoria === 'EFECTO';
    const esReferencia = itemDraft.categoria === 'REFERENCIA';
    const esSemanticaMotor = itemDraft.categoria === 'SEMANTICA_MOTOR';
    const tituloCategoria = labelCategoriaCatalogo(itemDraft.categoria);
    const placeholderValor = esEfecto
      ? 'EJ: ALLOW_SOLO_LECTURA'
      : esReferencia
        ? 'EJ: VENTAS'
        : esSemanticaMotor
          ? 'EJ: REQUIERE_SUSCRIPCION'
          : 'EJ: ACCION';
    const comportamientosActivos = catalogoComportamientosBD.filter((c) => c.activo !== false);
    return (
      <div className="space-y-3 rounded-md border border-primary/40 bg-muted/30 p-3">
        <p className="text-xs font-medium">
          {itemDraft.esNuevo ? 'Nuevo' : 'Editar'} {tituloCategoria} en catálogo
        </p>
        <p className="text-[11px] text-muted-foreground">
          Solo guarda este ítem de catálogo con los campos que completes abajo. No crea políticas runtime;
          para eso usa «Crear en scope JWT» en el formulario principal.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Valor (código)</Label>
            <Input
              value={itemDraft.valor}
              disabled={!itemDraft.esNuevo}
              placeholder={placeholderValor}
              onChange={(e) => setItemDraft({ ...itemDraft, valor: e.target.value.toUpperCase() })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Etiqueta</Label>
            <Input
              value={itemDraft.label}
              placeholder="Nombre visible"
              onChange={(e) => setItemDraft({ ...itemDraft, label: e.target.value })}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Descripción</Label>
            <Input
              value={itemDraft.descripcion}
              placeholder="Para qué sirve"
              onChange={(e) => setItemDraft({ ...itemDraft, descripcion: e.target.value })}
            />
          </div>
          {esEfecto ? (
            <div className="space-y-1">
              <Label className="text-xs">Comportamiento</Label>
              <Select
                value={itemDraft.comportamiento || ''}
                onValueChange={(v) => setItemDraft({ ...itemDraft, comportamiento: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona comportamiento" />
                </SelectTrigger>
                <SelectContent>
                  {comportamientosActivos.map((c) => (
                    <SelectItem key={c.nombre} value={c.nombre}>
                      {c.etiqueta || c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {comportamientosActivos.length === 0 ? (
                <p className="text-[11px] text-destructive">
                  No hay comportamientos en catálogo. Créalos en la pestaña «Comportamiento» primero.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-1">
            <Label className="text-xs">Estado</Label>
            <Select
              value={itemDraft.activo == null ? '' : itemDraft.activo ? 'true' : 'false'}
              onValueChange={(v) => setItemDraft({ ...itemDraft, activo: v === 'true' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Activo</SelectItem>
                <SelectItem value="false">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {itemDraft.categoria !== 'SEMANTICA_MOTOR' ? (
            <div className="space-y-1">
              <Label className="text-xs">
                Orden
                {itemDraft.esNuevo ? (
                  <span className="ml-1 font-normal text-muted-foreground">
                    (secuencia {
                      itemDraft.categoria === 'TIPO'
                        ? 'tipos'
                        : itemDraft.categoria === 'EFECTO'
                          ? 'efectos'
                          : 'referencias'
                    })
                  </span>
                ) : null}
              </Label>
              <Input
                type="number"
                min={1}
                value={itemDraft.orden == null ? '' : String(itemDraft.orden)}
                placeholder={
                  itemDraft.esNuevo
                    ? String(siguienteOrdenCatalogo(
                      itemDraft.categoria,
                      catalogoTiposBD,
                      catalogoEfectosBD,
                      catalogoReferenciasBD,
                      catalogoComportamientosBD,
                    ))
                    : 'Opcional'
                }
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  setItemDraft({
                    ...itemDraft,
                    orden: raw === '' ? undefined : Number(raw),
                  });
                }}
              />
            </div>
          ) : null}
        </div>
        {esEfecto ? (
          <p className="text-[11px] text-muted-foreground">
            «Comportamiento» se carga dinámicamente desde el catálogo (nombre + etiqueta).
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={guardandoItem} onClick={() => void guardarItem()}>
            {guardandoItem ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setItemDraft(null)}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('space-y-6', className)} data-panel="politicas-runtime">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Motor de políticas runtime</h2>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Parametriza políticas por dominio y scope tenant (SA / TG / TC) del JWT.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setCatalogosOpen(true)}>
            <BookOpen className="mr-2 h-4 w-4" />
            Catálogos
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => abrirCatalogoTipoEfecto('TIPOS')}>
            <Pencil className="mr-2 h-4 w-4" />
            Tipos y efectos
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              iniciarNuevaPolitica();
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void cargar()}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualizar
          </Button>
        </div>
      </div>

      <Dialog open={catalogosOpen} onOpenChange={setCatalogosOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Catálogos dinámicos de políticas</DialogTitle>
            <DialogDescription>
              Selecciona un catálogo para ver sus registros. En políticas runtime puedes cargar un registro para editarlo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Catálogo</Label>
              <Select value={catalogoActivo} onValueChange={setCatalogoActivo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona catálogo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CATALOGO_POLITICAS}>Políticas runtime</SelectItem>
                  <SelectItem value={CATALOGO_TIPOS}>Tipos</SelectItem>
                  <SelectItem value={CATALOGO_EFECTOS}>Efectos</SelectItem>
                  <SelectItem value={CATALOGO_DOMINIOS}>Dominios política</SelectItem>
                  <SelectItem value={CATALOGO_APIS_DOMINIOS}>apisDominios</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {catalogoActivo === CATALOGO_POLITICAS ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Registros de políticas runtime</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {politicas.map((p) => (
                    <div key={`${p.codigo}-${politicaId(p) || 'global'}`} className="rounded border p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-mono font-medium">{p.codigo}</p>
                          <p className="text-muted-foreground">{p.dominio} · {p.tipo} · {p.efecto}</p>
                          <p className="mt-1">Roles: {(p.condiciones?.roles ?? []).join(', ') || '—'}</p>
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={() => editarPolitica(p)}>
                          <Pencil className="mr-1 h-3 w-3" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {catalogoActivo === CATALOGO_TIPOS ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Registros de tipos</CardTitle>
                  <Button type="button" size="sm" variant="outline" onClick={() => abrirCatalogoTipoEfecto('TIPOS')}>
                    <BookOpen className="mr-1 h-3 w-3" />
                    Administrar tipos
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {catalogoTiposBD.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin registros en BD. Abre el administrador de tipos.</p>
                  ) : null}
                  {catalogoTiposBD.slice(0, 8).map((item) => (
                    <div key={item.valor} className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
                      <Badge variant="outline">{item.valor}</Badge>
                      <span className="truncate text-muted-foreground">{item.label || item.descripcion || '—'}</span>
                    </div>
                  ))}
                  {catalogoTiposBD.length > 8 ? (
                    <p className="text-[11px] text-muted-foreground">+{catalogoTiposBD.length - 8} más en el administrador.</p>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {catalogoActivo === CATALOGO_EFECTOS ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Registros de efectos</CardTitle>
                  <Button type="button" size="sm" variant="outline" onClick={() => abrirCatalogoTipoEfecto('EFECTOS')}>
                    <BookOpen className="mr-1 h-3 w-3" />
                    Administrar efectos
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {catalogoEfectosBD.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin registros en BD. Abre el administrador de efectos.</p>
                  ) : null}
                  {catalogoEfectosBD.slice(0, 8).map((item) => (
                    <div key={item.valor} className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
                      <Badge variant="outline">{item.valor}</Badge>
                      <span className="truncate text-muted-foreground">{item.label || item.comportamiento || '—'}</span>
                    </div>
                  ))}
                  {catalogoEfectosBD.length > 8 ? (
                    <p className="text-[11px] text-muted-foreground">+{catalogoEfectosBD.length - 8} más en el administrador.</p>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {catalogoActivo === CATALOGO_DOMINIOS ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Registros de dominios política</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {referenciaOptions.map((item) => (
                    <div key={item} className="flex items-center justify-between rounded border p-2 text-xs">
                      <Badge variant="secondary">{item}</Badge>
                      <Button type="button" size="sm" variant="outline" onClick={() => aplicarReferenciaDesdeCatalogo(item)}>
                        <Plus className="mr-1 h-3 w-3" />
                        Usar
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {catalogoActivo === CATALOGO_APIS_DOMINIOS ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Registros de apisDominios</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 md:grid-cols-2">
                  {(opcionesRuntime?.apisDominios ?? []).map((dominio) => (
                    <div key={dominio.id} className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-medium">{dominio.etiquetas || dominio.dominio || dominio.id}</p>
                        <p className="text-muted-foreground">{dominio.dominio}</p>
                        <p className="mt-1">Referencia: {dominio.bypassDominios?.join(', ') || '—'}</p>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => aplicarApisDominioDesdeCatalogo(dominio.id)}>
                        <Plus className="mr-1 h-3 w-3" />
                        Usar
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setCreandoNueva(false);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{creandoNueva || !politicaEditId ? 'Nueva política runtime' : 'Editar política runtime'}</DialogTitle>
            <DialogDescription>
              Guarda políticas acotadas al scope tenant (SA / TG / TC) del JWT y evalúa sin modificar datos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Código</Label>
            <Select
              value={creandoNueva ? NUEVA_POLITICA_VALUE : (codigo || NUEVA_POLITICA_VALUE)}
              onValueChange={(value) => {
                if (value === NUEVA_POLITICA_VALUE) {
                  iniciarNuevaPolitica();
                  return;
                }
                const existente = politicas.find((p) => p.codigo === value);
                if (existente) {
                  editarPolitica(existente);
                  return;
                }
                setCreandoNueva(true);
                setPoliticaEditId('');
                setCodigo(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona política" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NUEVA_POLITICA_VALUE}>Nueva política</SelectItem>
                {codigosOptions.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="mt-2"
              value={codigo}
              placeholder="Código, ej: BYPASS_COMISIONES_PADRE o MI_POLITICA_ACCION"
              onChange={(event) => setCodigo(event.target.value.toUpperCase())}
            />
            {creandoNueva ? (
              <p className="text-[11px] text-muted-foreground">
                Escribe un código único. Para BYPASS del sistema usa el patrón <code>BYPASS_&#123;ALCANCE&#125;</code> (ej. <code>BYPASS_COMISIONES_PADRE</code>).
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de política" />
              </SelectTrigger>
              <SelectContent>
                {catalogoTiposBD.filter((i) => i.activo !== false).map((item) => (
                  <SelectItem key={item.valor} value={item.valor}>
                    {item.label ? `${item.label} (${item.valor})` : item.valor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Efecto</Label>
            <Select value={efecto} onValueChange={setEfecto}>
              <SelectTrigger>
                <SelectValue placeholder="Efecto" />
              </SelectTrigger>
              <SelectContent>
                {catalogoEfectosBD.filter((i) => i.activo !== false).map((item) => (
                  <SelectItem key={item.valor} value={item.valor}>
                    {item.label ? `${item.label} (${item.valor})` : item.valor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Referencia</Label>
            <Select value={dominio || undefined} onValueChange={onReferenciaChange}>
              <SelectTrigger>
                <SelectValue placeholder="Referencia (catálogo)" />
              </SelectTrigger>
              <SelectContent className="z-[200] max-h-72">
                {catalogoReferenciasBD.filter((i) => i.activo !== false).length === 0 ? (
                  <SelectItem value="__sin_referencias__" disabled>
                    Sin referencias — créalas en Tipos y efectos → Referencia
                  </SelectItem>
                ) : null}
                {catalogoReferenciasBD.filter((i) => i.activo !== false).map((item) => (
                  <SelectItem key={item.valor} value={item.valor}>
                    {item.label ? `${item.label} (${item.valor})` : item.valor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Dominio de negocio. Se envía en <code className="rounded bg-muted px-1 text-xs">dominio</code> y{' '}
              <code className="rounded bg-muted px-1 text-xs">condiciones.referencia</code>.
              Catálogo: Tipos y efectos → Referencia.
            </p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Dominio (apisdominios)</Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px]"
                  onClick={marcarTodosApisDominios}
                  disabled={!apisDominiosCatalogo.length}
                >
                  Todos
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px]"
                  onClick={limpiarApisDominios}
                  disabled={!apisDominiosIds.length}
                >
                  Ninguno
                </Button>
              </div>
            </div>
            <ScrollArea className="h-32 rounded-md border p-2">
              <div className="space-y-2">
                {apisDominiosCatalogo.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    Sin apisdominios — configura en Catálogos
                  </p>
                ) : null}
                {apisDominiosCatalogo.map((item) => (
                  <label key={item.id} className="flex cursor-pointer items-start gap-2 text-xs">
                    <Checkbox
                      checked={apisDominiosIds.includes(item.id)}
                      onCheckedChange={(checked) => toggleApisDominio(item.id, checked === true)}
                    />
                    <span>
                      {item.etiquetas ? `${item.etiquetas} · ` : ''}{item.dominio || item.id}
                    </span>
                  </label>
                ))}
              </div>
            </ScrollArea>
            {apisDominiosIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {apisDominiosSeleccionados.map((item) => (
                  <Badge key={item.id} variant="secondary" className="gap-1 pr-1">
                    <span>{item.etiquetas || item.dominio || item.id}</span>
                    <button
                      type="button"
                      className="rounded-full p-0.5 hover:bg-muted"
                      aria-label="Quitar dominio"
                      onClick={() => toggleApisDominio(item.id, false)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-destructive">
                Obligatorio para guardar. Vincula la política al dominio API del tenant (JWT).
              </p>
            )}
            {bypassDominiosSeleccionados.length > 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Bypass dominios: {bypassDominiosSeleccionados.join(', ')}
              </p>
            ) : null}
          </div>
          <div className="space-y-2 md:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Alcance tenant (scope)</Label>
              <Button type="button" size="sm" variant="outline" onClick={abrirScopeParam}>
                Parametrizar alcance
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Selecciona tenants SA / TG / TC y, opcionalmente, usuarios concretos. Los arrays se guardan en{' '}
              <code className="rounded bg-muted px-1 text-xs">condiciones.metadata</code> y el primer ID canónico en{' '}
              <code className="rounded bg-muted px-1 text-xs">scope</code>.
            </p>
            <div className="rounded-md border bg-muted/20 p-3 text-xs space-y-2">
              <p>
                <span className="font-medium">SA ({scopeSaIds.length}):</span>{' '}
                {scopeResumenSa.length ? scopeResumenSa.join(' · ') : '—'}
              </p>
              <p>
                <span className="font-medium">TG ({scopeTgIds.length}):</span>{' '}
                {scopeResumenTg.length ? scopeResumenTg.join(' · ') : '—'}
              </p>
              <p>
                <span className="font-medium">TC ({scopeTcIds.length}):</span>{' '}
                {scopeResumenTc.length ? scopeResumenTc.join(' · ') : '—'}
              </p>
              <p>
                <span className="font-medium">Usuarios ({scopeUsuarioIds.length}):</span>{' '}
                {scopeResumenUsuarios.length ? scopeResumenUsuarios.join(' · ') : 'Todos en tenants marcados'}
              </p>
            </div>
          </div>
          {esPoliticaBypassLike(tipo, codigo) ? (
            <div className="space-y-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 md:col-span-3">
              <p className="text-xs font-medium text-foreground">Bypass dinamico por motor evento y JWT</p>
              <div className="space-y-1">
                <Label className="text-xs">Motor evento (por etiqueta)</Label>
                <Select
                  value={motorEvento || undefined}
                  onValueChange={seleccionarMotorEvento}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={motorEventoPlaceholder}>
                      {motorEvento ? etiquetaMotorEvento(motorEvento) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="z-[200] max-h-72">
                    {bypassAlcancesOpciones.map((item) => {
                      const nombre = item.nombre || item.alcance;
                      const pipeline = normalizarPipelineMotorEvento(item.pipeline);
                      const etiqueta = item.etiqueta || item.label || nombre;
                      return (
                        <SelectItem key={nombre} value={nombre}>
                          [{etiquetaPipeline(pipeline)}] {etiqueta}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Elige un evento de la lista (ej. «Referidos y membresía»), no el título del pipeline.
                  También puedes pulsar una tarjeta de abajo. Se guarda el nombre en <code>metadata.motorEvento</code>.
                </p>
                {motorEvento ? (
                  <p className="text-[11px] text-foreground">
                    Seleccionado: <span className="font-mono">{motorEvento}</span>
                    {' · '}
                    {etiquetaMotorEvento(motorEvento)}
                  </p>
                ) : null}
              </div>
              {bypassAlcancesOpciones.length ? (
                <div className="space-y-3">
                  {pipelineOpciones.map((pipeline) => (
                    <div key={pipeline.nombre} className="space-y-2">
                      <p className="text-[11px] font-medium">{pipeline.label}</p>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {(motorEventosPorPipeline.get(pipeline.nombre) ?? []).map((item) => {
                          const nombre = item.nombre || item.alcance;
                          const activo = motorEvento === nombre;
                          return (
                          <li
                            key={nombre}
                            role="button"
                            tabIndex={0}
                            className={cn(
                              'rounded border border-border/60 bg-background/60 p-2 text-[11px] cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5',
                              activo && 'border-primary bg-primary/10 ring-1 ring-primary/30',
                            )}
                            onClick={() => seleccionarMotorEvento(nombre)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                seleccionarMotorEvento(nombre);
                              }
                            }}
                          >
                            <span className="font-mono font-medium">{nombre}</span>
                            <span className="text-muted-foreground"> — {item.etiqueta || item.label}</span>
                            {activo ? (
                              <span className="ml-1 text-primary">· seleccionado</span>
                            ) : null}
                            {item.descripcion ? (
                              <p className="mt-1 text-muted-foreground">{item.descripcion}</p>
                            ) : null}
                          </li>
                        );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Catálogo de motor eventos no disponible. Créalos en «Tipos y efectos» → Motor evento.
                </p>
              )}
            </div>
          ) : null}
          {tipo === TIPO_ACCION ? (
            <div className="space-y-3 rounded-md border border-primary/30 bg-muted/20 p-3 md:col-span-3">
              <div className="space-y-2">
                <Label>Ruta / formulario (opcional)</Label>
                <Input
                  value={filtroRuta}
                  placeholder="Buscar por nombre, path o componente…"
                  onChange={(e) => setFiltroRuta(e.target.value)}
                />
                <Select
                  value={recursoRutaId || '__none__'}
                  onValueChange={seleccionarRuta}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las rutas del dominio" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="__none__">Sin ruta (aplica a todo el dominio)</SelectItem>
                    {rutasFiltradas.map((ruta) => (
                      <SelectItem key={ruta.id} value={ruta.id}>
                        {ruta.label}
                        {ruta.component ? ` · ${ruta.component}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {rutasCatalogo.length} ruta(s) activas en catálogo.
                  {rutaSeleccionada?.accionIds?.length
                    ? ` Esta ruta tiene ${rutaSeleccionada.accionIds.length} acción(es) parametrizada(s).`
                    : ''}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Componente (desde la ruta)</Label>
                <Input
                  value={recursoFormulario}
                  readOnly={Boolean(rutaSeleccionada?.component)}
                  placeholder={rutaSeleccionada ? 'Sin component en la ruta' : 'Se completa al elegir una ruta'}
                  className={rutaSeleccionada?.component ? 'bg-muted/50' : undefined}
                  onChange={(e) => setRecursoFormulario(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Se toma de <code>rutaSeguridad.component</code> al seleccionar la ruta. Solo editable si la ruta no tiene componente.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Acciones HTTP (colección acciones)</Label>
                <Input
                  value={filtroAccion}
                  placeholder="Buscar acción por etiqueta o método HTTP…"
                  onChange={(e) => setFiltroAccion(e.target.value)}
                />
                <div className="flex flex-wrap gap-1.5">
                  {accionesVisibles.map((accion) => {
                    const activa = accionIds.includes(accion.id);
                    return (
                      <Button
                        key={accion.id}
                        type="button"
                        size="sm"
                        variant={activa ? 'default' : 'outline'}
                        onClick={() => toggleAccion(accion.id)}
                      >
                        {accion.label || accion.method || accion.id}
                      </Button>
                    );
                  })}
                  {accionesVisibles.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground">
                      {accionesCatalogo.length === 0
                        ? 'No hay acciones activas en el catálogo. Créalas en parametrización de permisos.'
                        : rutaSeleccionada
                          ? 'Esta ruta no tiene acciones parametrizadas o no coinciden con el filtro.'
                          : 'Sin coincidencias con el filtro.'}
                    </span>
                  ) : null}
                </div>
                {accionIds.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {accionIds.map((id) => {
                      const accion = accionesCatalogo.find((a) => a.id === id);
                      return (
                        <Badge key={id} variant="secondary" className="gap-1 pr-1">
                          <span>{accion?.label || id}</span>
                          <button
                            type="button"
                            className="rounded-full p-0.5 hover:bg-muted"
                            aria-label="Quitar acción"
                            onClick={() => toggleAccion(id)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                ) : null}
                <p className="text-[11px] text-muted-foreground">
                  Vacío = aplica a todas las acciones visibles. Con ruta seleccionada se listan primero las acciones de esa ruta.
                  El efecto (ALLOW/DENY) define si concede o bloquea.
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Sin ruta ni acciones, la regla aplica a todo el dominio. Con ruta/acciones se acota el alcance.
              </p>
            </div>
          ) : null}
          <div className="flex gap-2 md:col-span-2 md:items-end">
            <Button type="button" disabled={guardando} onClick={() => void guardar()}>
              {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {creandoNueva || !politicaEditId ? 'Crear en scope JWT' : 'Actualizar política'}
            </Button>
            <Button type="button" variant="outline" disabled={simulando} onClick={() => void simular()}>
              {simulando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Simular
            </Button>
          </div>
          </div>
          {decision ? (
            <div className="mt-3 border-t pt-3 text-sm">
              <p>
                Resultado:{' '}
                <Badge
                  variant={
                    decision.decision === 'DENY'
                      ? 'secondary'
                      : decision.permitido
                        ? 'default'
                        : 'outline'
                  }
                >
                  {decision.decision === 'DENY'
                    ? 'Denegado'
                    : decision.decision === 'ALLOW' || decision.permitido
                      ? 'Permitido'
                      : decision.decision === 'SIN_POLITICA'
                        ? 'Sin política (fallback legacy)'
                        : 'No aplica'}
                </Badge>
                {decision.efecto ? <span className="ml-2 font-mono text-xs">{decision.efecto}</span> : null}
              </p>
              {decision.mensaje ? (
                <p className="mt-1 text-xs text-muted-foreground">{decision.mensaje}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                Política: <span className="font-mono">{decision.politica?.codigo || '—'}</span>
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={scopeParamOpen} onOpenChange={setScopeParamOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Parametrizar alcance</DialogTitle>
            <DialogDescription>
              Marca uno o varios tenants SA, TG y TC. Luego elige usuarios dentro de ese alcance (opcional).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Tenant SuperAdmin (SA)</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => marcarTodosScopeDraft(
                      tenantsScope.tenantSuperAdmins.map((t) => t.id),
                      setScopeDraftSa,
                    )}
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => limpiarScopeDraft(setScopeDraftSa)}
                  >
                    Ninguno
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-44 rounded border p-2">
                <div className="space-y-2">
                  {tenantsScope.tenantSuperAdmins.map((t) => (
                    <label key={t.id} className="flex cursor-pointer items-start gap-2 text-xs">
                      <Checkbox
                        checked={Boolean(scopeDraftSa[t.id])}
                        onCheckedChange={(checked) => toggleScopeDraft(setScopeDraftSa, t.id, checked === true)}
                      />
                      <span>{t.label}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Tenant global (TG)</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => marcarTodosScopeDraft(
                      tenantGlobalesFiltradosDraft.map((t) => t.id),
                      setScopeDraftTg,
                    )}
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => limpiarScopeDraft(setScopeDraftTg)}
                  >
                    Ninguno
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-44 rounded border p-2">
                <div className="space-y-2">
                  {tenantGlobalesFiltradosDraft.map((t) => (
                    <label key={t.id} className="flex cursor-pointer items-start gap-2 text-xs">
                      <Checkbox
                        checked={Boolean(scopeDraftTg[t.id])}
                        onCheckedChange={(checked) => toggleScopeDraft(setScopeDraftTg, t.id, checked === true)}
                      />
                      <span>{t.label}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Tenant corporativo (TC)</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => marcarTodosScopeDraft(
                      tenantCorporativosFiltradosDraft.map((t) => t.id),
                      setScopeDraftTc,
                    )}
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => limpiarScopeDraft(setScopeDraftTc)}
                  >
                    Ninguno
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-44 rounded border p-2">
                <div className="space-y-2">
                  {tenantCorporativosFiltradosDraft.map((t) => (
                    <label key={t.id} className="flex cursor-pointer items-start gap-2 text-xs">
                      <Checkbox
                        checked={Boolean(scopeDraftTc[t.id])}
                        onCheckedChange={(checked) => toggleScopeDraft(setScopeDraftTc, t.id, checked === true)}
                      />
                      <span className="line-clamp-2">{t.label}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Usuarios en alcance</Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px]"
                  disabled={!usuariosFiltradosScopeDraft.length}
                  onClick={() => marcarTodosScopeDraft(
                    usuariosFiltradosScopeDraft.map((u) => u.id),
                    setScopeDraftUsuarios,
                  )}
                >
                  Todos
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => limpiarScopeDraft(setScopeDraftUsuarios)}
                >
                  Ninguno
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Si no marcas usuarios, la política aplica a todos los del alcance tenant seleccionado.
            </p>
            <ScrollArea className="h-48 rounded border p-2">
              <div className="space-y-2">
                {usuariosFiltradosScopeDraft.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin usuarios para el alcance marcado.</p>
                ) : null}
                {usuariosFiltradosScopeDraft.map((u) => (
                  <label key={u.id} className="flex cursor-pointer items-start gap-2 text-xs">
                    <Checkbox
                      checked={Boolean(scopeDraftUsuarios[u.id])}
                      onCheckedChange={(checked) => toggleScopeDraft(setScopeDraftUsuarios, u.id, checked === true)}
                    />
                    <span>
                      {u.label}
                      {u.rol ? <span className="text-muted-foreground"> · {u.rol}</span> : null}
                    </span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setScopeParamOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={aplicarScopeParam}>
              <Save className="mr-2 h-4 w-4" />
              Aplicar alcance
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={catalogoTipoEfectoOpen}
        onOpenChange={(open) => {
          setCatalogoTipoEfectoOpen(open);
          if (!open) {
            setItemDraft(null);
            setMotorEventoDraft(null);
            setMotorEventoSgDraft(null);
            setPipelineDraft(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Catálogo tipos y efectos</DialogTitle>
            <DialogDescription>
              Administra tipos, efectos, comportamientos, motor eventos y referencias para las políticas runtime.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={catalogoTipoEfectoTab === 'TIPOS' ? 'default' : 'outline'}
              onClick={() => { setCatalogoTipoEfectoTab('TIPOS'); setItemDraft(null); setMotorEventoDraft(null); setMotorEventoSgDraft(null); }}
            >
              Tipos
            </Button>
            <Button
              type="button"
              size="sm"
              variant={catalogoTipoEfectoTab === 'EFECTOS' ? 'default' : 'outline'}
              onClick={() => { setCatalogoTipoEfectoTab('EFECTOS'); setItemDraft(null); setMotorEventoDraft(null); setMotorEventoSgDraft(null); }}
            >
              Efectos
            </Button>
            <Button
              type="button"
              size="sm"
              variant={catalogoTipoEfectoTab === 'COMPORTAMIENTO' ? 'default' : 'outline'}
              onClick={() => { setCatalogoTipoEfectoTab('COMPORTAMIENTO'); setItemDraft(null); setMotorEventoDraft(null); setMotorEventoSgDraft(null); }}
            >
              Comportamiento
            </Button>
            <Button
              type="button"
              size="sm"
              variant={catalogoTipoEfectoTab === 'MOTOR_EVENTO' ? 'default' : 'outline'}
              onClick={() => { setCatalogoTipoEfectoTab('MOTOR_EVENTO'); setItemDraft(null); setMotorEventoDraft(null); setMotorEventoSgDraft(null); }}
            >
              Motor evento
            </Button>
            <Button
              type="button"
              size="sm"
              variant={catalogoTipoEfectoTab === 'REFERENCIA' ? 'default' : 'outline'}
              onClick={() => { setCatalogoTipoEfectoTab('REFERENCIA'); setItemDraft(null); setMotorEventoDraft(null); setMotorEventoSgDraft(null); }}
            >
              Referencia
            </Button>
            <Button
              type="button"
              size="sm"
              variant={catalogoTipoEfectoTab === 'PIPELINES' ? 'default' : 'outline'}
              onClick={() => { setCatalogoTipoEfectoTab('PIPELINES'); setItemDraft(null); setMotorEventoDraft(null); setMotorEventoSgDraft(null); void cargarCatalogoPipeline(); }}
            >
              Pipelines
            </Button>
            <Button
              type="button"
              size="sm"
              variant={catalogoTipoEfectoTab === 'SEMANTICA_MOTOR' ? 'default' : 'outline'}
              onClick={() => { setCatalogoTipoEfectoTab('SEMANTICA_MOTOR'); setItemDraft(null); setMotorEventoDraft(null); setMotorEventoSgDraft(null); }}
            >
              Semánticas
            </Button>
          </div>
          {catalogoTipoEfectoTab === 'PIPELINES'
            ? renderPipelinesLista()
            : catalogoTipoEfectoTab === 'MOTOR_EVENTO'
              ? (motorEventoDraft ? renderMotorEventoForm() : renderMotorEventoLista())
              : (catalogoTipoEfectoTab === 'TIPOS' || catalogoTipoEfectoTab === 'EFECTOS' || catalogoTipoEfectoTab === 'REFERENCIA' || catalogoTipoEfectoTab === 'COMPORTAMIENTO' || catalogoTipoEfectoTab === 'SEMANTICA_MOTOR')
                ? (itemDraft ? renderItemForm() : renderCatalogoLista())
                : null}
          {renderPipelineDialog()}
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {politicasAgrupadas.map(([grupo, items]) => (
          <Card key={grupo}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{grupo}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((p) => (
                <div key={`${p.codigo}-${politicaId(p) || 'global'}`} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-medium">{p.codigo}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{p.efecto}</Badge>
                      <Button type="button" size="sm" variant="outline" onClick={() => editarPolitica(p)}>
                        <Pencil className="mr-1 h-3 w-3" />
                        Editar
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => void eliminar(p)}>
                        <Trash2 className="mr-1 h-3 w-3" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Roles: {(p.condiciones?.roles ?? []).join(', ') || '—'} · prioridad {p.prioridad ?? 0}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function PoliticasRuntimePanelPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-muted/40 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <PoliticasRuntimePanel />
      </div>
    </div>
  );
}
