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
import { cn } from '@/lib/utils';
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
  type PoliticaRuntimeComportamiento,
  type PoliticaRuntimeDecision,
  type PoliticaRuntimeOpciones,
} from '@/app/services/politicasRuntimeService';
type PoliticasRuntimePanelProps = {
  className?: string;
};

const NUEVA_POLITICA_VALUE = '__new__';
const REFERENCIA_SELECT_ALL = '__SELECT_ALL_REF__';
const REFERENCIA_SELECT_CLEAR = '__CLEAR_REF__';
const APIS_DOMINIO_SELECT_ALL = '__SELECT_ALL_APIS__';
const APIS_DOMINIO_SELECT_CLEAR = '__CLEAR_APIS__';
const ROL_SELECT_ALL = '__SELECT_ALL_ROL__';
const ROL_SELECT_CLEAR = '__CLEAR_ROL__';
const CATALOGO_POLITICAS = 'POLITICAS_RUNTIME';
const CATALOGO_TIPOS = 'TIPOS';
const CATALOGO_EFECTOS = 'EFECTOS';
const CATALOGO_DOMINIOS = 'DOMINIOS';
const CATALOGO_APIS_DOMINIOS = 'APIS_DOMINIOS';
const politicaId = (politica: PoliticaRuntime | null | undefined) => String(politica?.iud || politica?._id || '').trim();

const labelApisDominio = (item: PoliticaRuntimeApisDominio): string => {
  const base = item.etiquetas || item.dominio || item.id;
  const bypass = item.bypassDominios?.length ? ` · ${item.bypassDominios.join(', ')}` : '';
  return `${base}${bypass}`;
};

const parseListaCsv = (value: string): string[] => (
  value.split(/[,;\s]+/).map((v) => v.trim().toUpperCase()).filter(Boolean)
);

const scopeApisDominiosIds = (politica: PoliticaRuntime | null | undefined): string[] => {
  const scope = (politica?.scope ?? {}) as { apisDominiosIds?: string[]; apisDominios?: string };
  const desdeLista = Array.isArray(scope.apisDominiosIds)
    ? scope.apisDominiosIds.map((id) => String(id).trim()).filter(Boolean)
    : [];
  if (desdeLista.length) return desdeLista;
  const uno = String(scope.apisDominios ?? '').trim();
  return uno ? [uno] : [];
};

const referenciaDePolitica = (politica: PoliticaRuntime | null | undefined): string[] => {
  const cond = politica?.condiciones;
  const lista = cond?.referencia?.length
    ? cond.referencia
    : (cond?.bypassDominios?.length ? cond.bypassDominios : [politica?.dominio].filter(Boolean));
  return (lista as string[]).map((v) => String(v).trim().toUpperCase()).filter(Boolean);
};

const COMPORTAMIENTOS: PoliticaRuntimeComportamiento[] = ['PERMITE', 'BLOQUEA', 'BYPASS', 'NEUTRO', 'REQUIERE_TECHO'];
const TIPO_ACCION = 'ACCION';
const TIPO_BYPASS = 'BYPASS';

const esPoliticaBypassLike = (tipoValor: string, codigoValor: string): boolean => {
  const tipoNorm = tipoValor.trim().toUpperCase();
  const codigoNorm = codigoValor.trim().toUpperCase();
  return tipoNorm === TIPO_BYPASS || tipoNorm.includes('BYPASS') || codigoNorm.startsWith('BYPASS_');
};

/** Referencia de para qué sirve cada política BYPASS en el sistema. */
const BYPASS_FUNCIONALIDADES: { alcance: string; titulo: string; descripcion: string }[] = [
  {
    alcance: 'HERENCIA_RUTAS',
    titulo: 'Herencia de rutas (SuperAdmin)',
    descripcion: 'SuperAdmin sin corporativo materializado puede ignorar la herencia de vistas/acciones. DIOS siempre bypass.',
  },
  {
    alcance: 'HYBRID_RUTAS',
    titulo: 'Rutas HYBRID',
    descripcion: 'SuperAdmin sin tenant global/corporativo en JWT no exige herencia tenant al consumir APIs HYBRID del SPA.',
  },
  {
    alcance: 'UI_GESTION_RUTAS',
    titulo: 'UI gestión de rutas',
    descripcion: 'Toolbar y acciones del formulario en la pantalla de gestión de rutas (ignora acciones parametrizadas del formulario).',
  },
  {
    alcance: 'DOMINIOS_APIS',
    titulo: 'Gestión de dominios APIs',
    descripcion: 'Autoriza a SuperAdmin sin corporativo crear dominios APIs dentro de su jerarquía.',
  },
  {
    alcance: 'REFERIDOS',
    titulo: 'Referidos y membresía',
    descripcion:
      'BYPASS: exime membresía y validaciones legacy. Políticas con referencia REFERIDOS y efecto PERMITE/BLOQUEA (catálogo) controlan la API de generar enlaces por rol.',
  },
  {
    alcance: 'COMISIONES_PADRE',
    titulo: 'Comisiones (rol padre)',
    descripcion: 'En triggers de comisiones: el padre con rol bypass activa contador pendiente sin cadena jerárquica completa.',
  },
];

type CatalogoItemDraft = {
  categoria: PoliticaRuntimeCatalogoCategoria;
  valor: string;
  label: string;
  descripcion: string;
  comportamiento?: PoliticaRuntimeComportamiento;
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
  efectos: PoliticaRuntimeCatalogoItem[]
): number => {
  const lista = categoria === 'TIPO' ? tipos : efectos;
  const max = lista.reduce((acc, item) => {
    const n = Number(item.orden);
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return max + 1;
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
  const [rolNombre, setRolNombre] = useState('');
  const [roles, setRoles] = useState('');
  const [referencia, setReferencia] = useState('');
  const [motorEvento, setMotorEvento] = useState('');
  const [apisDominiosIds, setApisDominiosIds] = useState<string[]>([]);
  const [accionIds, setAccionIds] = useState<string[]>([]);
  const [recursoRutaId, setRecursoRutaId] = useState('');
  const [recursoFormulario, setRecursoFormulario] = useState('');
  const [filtroRuta, setFiltroRuta] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');
  const [referenciaSelectKey, setReferenciaSelectKey] = useState(0);
  const [apisDominioSelectKey, setApisDominioSelectKey] = useState(0);
  const [rolSelectKey, setRolSelectKey] = useState(0);
  const [decision, setDecision] = useState<PoliticaRuntimeDecision | null>(null);
  const [catalogosOpen, setCatalogosOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [creandoNueva, setCreandoNueva] = useState(false);
  const [catalogoActivo, setCatalogoActivo] = useState(CATALOGO_POLITICAS);
  const [politicaEditId, setPoliticaEditId] = useState('');
  const [itemDraft, setItemDraft] = useState<CatalogoItemDraft | null>(null);
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

  const rolesOptions = useMemo(
    () => (opcionesRuntime?.roles ?? [])
      .filter(Boolean)
      .sort(),
    [opcionesRuntime?.roles]
  );

  const apisDominiosCatalogo = useMemo(
    () => opcionesRuntime?.apisDominios ?? [],
    [opcionesRuntime?.apisDominios]
  );

  const apisDominiosSeleccionados = useMemo(
    () => apisDominiosIds.map((id) => apisDominiosCatalogo.find((d) => d.id === id)).filter(Boolean) as PoliticaRuntimeApisDominio[],
    [apisDominiosIds, apisDominiosCatalogo]
  );

  const apisDominiosDisponibles = useMemo(
    () => apisDominiosCatalogo.filter((d) => !apisDominiosIds.includes(d.id)),
    [apisDominiosCatalogo, apisDominiosIds]
  );

  /** Referencias disponibles: unión de bypassDominios de los apisDominios elegidos + catálogo política. */
  const referenciaOptions = useMemo(() => {
    const desdeApis = apisDominiosSeleccionados.flatMap((d) => d.bypassDominios ?? []);
    const desdeCatalogo = opcionesRuntime?.dominiosPolitica ?? [];
    return [...new Set([...desdeApis, ...desdeCatalogo].map((v) => String(v).trim().toUpperCase()).filter(Boolean))].sort();
  }, [apisDominiosSeleccionados, opcionesRuntime?.dominiosPolitica]);

  const referenciaSeleccionadas = useMemo(
    () => parseListaCsv(referencia),
    [referencia]
  );

  const referenciaDisponibles = useMemo(
    () => referenciaOptions.filter((option) => !referenciaSeleccionadas.includes(option)),
    [referenciaOptions, referenciaSeleccionadas]
  );

  const rolesSeleccionados = useMemo(
    () => roles.split(/[,;\s]+/).map((r) => r.trim().toUpperCase()).filter(Boolean),
    [roles]
  );

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
    const normalizado = id.trim();
    if (!normalizado || apisDominiosIds.includes(normalizado)) return;
    setApisDominiosIds((prev) => [...prev, normalizado]);
  };

  const seleccionarTodosApisDominios = () => {
    if (!apisDominiosCatalogo.length) return;
    setApisDominiosIds(apisDominiosCatalogo.map((d) => d.id));
  };

  const limpiarApisDominios = () => {
    setApisDominiosIds([]);
  };

  const onApisDominioSelectChange = (value: string) => {
    if (value === APIS_DOMINIO_SELECT_ALL) {
      seleccionarTodosApisDominios();
    } else if (value === APIS_DOMINIO_SELECT_CLEAR) {
      limpiarApisDominios();
    } else {
      agregarApisDominio(value);
    }
    setApisDominioSelectKey((k) => k + 1);
  };

  const todosApisDominiosSeleccionados = apisDominiosCatalogo.length > 0
    && apisDominiosCatalogo.every((d) => apisDominiosIds.includes(d.id));

  const quitarApisDominio = (id: string) => {
    setApisDominiosIds((prev) => prev.filter((item) => item !== id));
  };

  const seleccionarTodasReferencias = () => {
    if (!referenciaOptions.length) return;
    setReferencia(referenciaOptions.join(', '));
  };

  const limpiarReferencias = () => {
    setReferencia('');
  };

  const onReferenciaSelectChange = (value: string) => {
    if (value === REFERENCIA_SELECT_ALL) {
      seleccionarTodasReferencias();
    } else if (value === REFERENCIA_SELECT_CLEAR) {
      limpiarReferencias();
    } else {
      agregarReferencia(value);
    }
    setReferenciaSelectKey((k) => k + 1);
  };

  const todasReferenciasSeleccionadas = referenciaOptions.length > 0
    && referenciaOptions.every((r) => referenciaSeleccionadas.includes(r));

  const quitarReferencia = (value: string) => {
    setReferencia(referenciaSeleccionadas.filter((item) => item !== value).join(', '));
  };

  const abrirCatalogoApisDominios = () => {
    setCatalogoActivo(CATALOGO_APIS_DOMINIOS);
    setCatalogosOpen(true);
  };

  const abrirCatalogoReferencia = () => {
    setCatalogoActivo(CATALOGO_DOMINIOS);
    setCatalogosOpen(true);
  };

  const aplicarApisDominioDesdeCatalogo = (id: string) => {
    agregarApisDominio(id);
    setCatalogosOpen(false);
  };

  const rolesDisponibles = useMemo(
    () => rolesOptions.filter((option) => !rolesSeleccionados.includes(option)),
    [rolesOptions, rolesSeleccionados]
  );

  const agregarRol = (value: string) => {
    const normalizado = value.trim().toUpperCase();
    if (!normalizado || rolesSeleccionados.includes(normalizado)) return;
    setRoles([...rolesSeleccionados, normalizado].join(', '));
  };

  const quitarRol = (value: string) => {
    setRoles(rolesSeleccionados.filter((rol) => rol !== value).join(', '));
  };

  const seleccionarTodosRoles = () => {
    if (!rolesOptions.length) return;
    setRoles(rolesOptions.join(', '));
  };

  const limpiarRoles = () => {
    setRoles('');
  };

  const onRolSelectChange = (value: string) => {
    if (value === ROL_SELECT_ALL) {
      seleccionarTodosRoles();
    } else if (value === ROL_SELECT_CLEAR) {
      limpiarRoles();
    } else {
      agregarRol(value);
    }
    setRolSelectKey((k) => k + 1);
  };

  const todosRolesSeleccionados = rolesOptions.length > 0
    && rolesOptions.every((r) => rolesSeleccionados.includes(r));

  useEffect(() => {
    if (creandoNueva || !politicaSeleccionada || codigo === NUEVA_POLITICA_VALUE) return;
    setPoliticaEditId(politicaId(politicaSeleccionada));
    setCodigo(politicaSeleccionada.codigo || codigo);
    setTipo(politicaSeleccionada.tipo || tipo);
    setEfecto(politicaSeleccionada.efecto || efecto);
    setRoles((politicaSeleccionada.condiciones?.roles ?? []).join(', '));
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
    setRolNombre('');
    setRoles('');
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
    setAccionIds(Array.from(new Set(ids)));
    setRecursoRutaId(meta.rutaId ? String(meta.rutaId) : '');
    setRecursoFormulario(meta.formularioComponent ? String(meta.formularioComponent) : '');
  };

  const editarPolitica = (politica: PoliticaRuntime) => {
    setCreandoNueva(false);
    setPoliticaEditId(politicaId(politica));
    setCodigo(politica.codigo || '');
    setTipo(politica.tipo || '');
    setEfecto(politica.efecto || '');
    setRolNombre((politica.condiciones?.roles ?? [])[0] || '');
    setRoles((politica.condiciones?.roles ?? []).join(', '));
    setReferencia(referenciaDePolitica(politica).join(', '));
    setApisDominiosIds(scopeApisDominiosIds(politica));
    cargarMetadataAccion(politica);
    cargarMetadataBypass(politica);
    setDecision(null);
    setCatalogosOpen(false);
    setFormOpen(true);
  };

  const toggleAccion = (id: string) => {
    setAccionIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
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
      const referenciaSim = referenciaLista[0] || '';
      const usarReferencia = referenciaSim && !esPoliticaBypassLike(tipo, codigo);
      const result = await simularPoliticaRuntime(
        usarReferencia
          ? { referencia: referenciaSim, tipo: tipo || undefined, rolNombre }
          : { codigo, tipo, rolNombre },
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
      const referenciaLista = parseListaCsv(referencia);
      if (!referenciaLista.length) throw new Error('Selecciona al menos una referencia');
      if (!apisDominiosIds.length) throw new Error('Selecciona al menos un dominio (apisdominios)');
      const condiciones: PoliticaRuntime['condiciones'] = {
        roles: parseListaCsv(roles),
        referencia: referenciaLista,
        bypassDominios: referenciaLista,
      };
      if (tipo === TIPO_ACCION) {
        condiciones.metadata = {
          accionIds,
          rutaId: recursoRutaId.trim() || undefined,
          formularioComponent: recursoFormulario.trim() || undefined,
        };
      }
      if (esPoliticaBypassLike(tipo, codigoNormalizado)) {
        const alcanceDesdeCodigo = codigoNormalizado.startsWith('BYPASS_')
          ? codigoNormalizado.slice('BYPASS_'.length)
          : codigoNormalizado;
        const metaPrev = (politicaSeleccionada?.condiciones?.metadata ?? {}) as Record<string, unknown>;
        const motor = (motorEvento.trim() || String(metaPrev.motorEvento || '')).toUpperCase() || alcanceDesdeCodigo;
        condiciones.metadata = {
          ...metaPrev,
          alcance: motor,
          motorEvento: motor,
        };
      }
      const payload = {
        codigo: codigoNormalizado,
        tipo,
        efecto,
        dominio: referenciaLista[0],
        condiciones,
        scope: {
          tipo: 'TENANT_SUPER_ADMIN',
          apisDominiosIds: apisDominiosIds,
          apisDominios: apisDominiosIds[0] || undefined,
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
      orden: siguienteOrdenCatalogo(categoria, catalogoTiposBD, catalogoEfectosBD),
      activo: true,
    });
  };

  const editarTipoDesdeFormulario = () => {
    if (!tipo) {
      toast.error('Selecciona un tipo para editar');
      return;
    }
    const item = catalogoTiposBD.find((i) => i.valor === tipo);
    if (!item) {
      toast.error('Ese tipo no está en el catálogo. Créalo con el botón +');
      return;
    }
    editarItem('TIPO', item);
  };

  const editarEfectoDesdeFormulario = () => {
    if (!efecto) {
      toast.error('Selecciona un efecto para editar');
      return;
    }
    const item = catalogoEfectosBD.find((i) => i.valor === efecto);
    if (!item) {
      toast.error('Ese efecto no está en el catálogo. Créalo con el botón +');
      return;
    }
    editarItem('EFECTO', item);
  };

  const tipoEnCatalogo = useMemo(
    () => Boolean(tipo && catalogoTiposBD.some((i) => i.valor === tipo)),
    [tipo, catalogoTiposBD]
  );

  const efectoEnCatalogo = useMemo(
    () => Boolean(efecto && catalogoEfectosBD.some((i) => i.valor === efecto)),
    [efecto, catalogoEfectosBD]
  );

  const editarItem = (categoria: PoliticaRuntimeCatalogoCategoria, item: PoliticaRuntimeCatalogoItem) => {
    setItemDraft({
      categoria,
      valor: item.valor,
      label: item.label || '',
      descripcion: item.descripcion || '',
      ...(item.comportamiento ? { comportamiento: item.comportamiento as PoliticaRuntimeComportamiento } : {}),
      ...(item.orden != null ? { orden: item.orden } : {}),
      ...(item.activo != null ? { activo: item.activo } : {}),
      esNuevo: false,
    });
  };

  const guardarItem = async () => {
    if (!itemDraft) return;
    const valorNormalizado = itemDraft.valor.trim().toUpperCase();
    if (!valorNormalizado) {
      toast.error('El valor es obligatorio');
      return;
    }
    setGuardandoItem(true);
    try {
      const payload: GuardarCatalogoItemPayload = {
        categoria: itemDraft.categoria,
        valor: valorNormalizado,
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

  const renderItemForm = (): React.ReactElement | null => {
    if (!itemDraft) return null;
    const esEfecto = itemDraft.categoria === 'EFECTO';
    return (
      <div className="space-y-3 rounded-md border border-primary/40 bg-muted/30 p-3">
        <p className="text-xs font-medium">
          {itemDraft.esNuevo ? 'Nuevo' : 'Editar'} {esEfecto ? 'efecto' : 'tipo'} en catálogo
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
              placeholder={esEfecto ? 'EJ: ALLOW_SOLO_LECTURA' : 'EJ: ACCION'}
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
                onValueChange={(v) => setItemDraft({ ...itemDraft, comportamiento: v as PoliticaRuntimeComportamiento })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Comportamiento" />
                </SelectTrigger>
                <SelectContent>
                  {COMPORTAMIENTOS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <div className="space-y-1">
            <Label className="text-xs">
              Orden
              {itemDraft.esNuevo ? (
                <span className="ml-1 font-normal text-muted-foreground">
                  (secuencia {itemDraft.categoria === 'TIPO' ? 'tipos' : 'efectos'})
                </span>
              ) : null}
            </Label>
            <Input
              type="number"
              min={1}
              value={itemDraft.orden == null ? '' : String(itemDraft.orden)}
              placeholder={
                itemDraft.esNuevo
                  ? String(siguienteOrdenCatalogo(itemDraft.categoria, catalogoTiposBD, catalogoEfectosBD))
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
        </div>
        {esEfecto ? (
          <p className="text-[11px] text-muted-foreground">
            «Comportamiento» define qué hace el motor: BLOQUEA niega; PERMITE/BYPASS/NEUTRO dejan pasar; REQUIERE_TECHO exige techo.
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
            Parametriza políticas por dominio del tenant y scope tenantSA del JWT.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setCatalogosOpen(true)}>
            <BookOpen className="mr-2 h-4 w-4" />
            Catálogos
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
                  <Button type="button" size="sm" variant="outline" onClick={() => iniciarNuevoItem('TIPO')}>
                    <Plus className="mr-1 h-3 w-3" />
                    Nuevo tipo
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {catalogoTiposBD.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin registros en BD. Usa «Nuevo tipo».</p>
                  ) : null}
                  {catalogoTiposBD.map((item) => (
                    <div key={item.valor} className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline">{item.valor}</Badge>
                          {!item.activo ? <Badge variant="secondary">inactivo</Badge> : null}
                          {item.protegido ? <Badge variant="secondary">sistema</Badge> : null}
                        </div>
                        {item.label || item.descripcion ? (
                          <p className="mt-1 text-muted-foreground">{item.label}{item.descripcion ? ` · ${item.descripcion}` : ''}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button type="button" size="sm" variant="outline" onClick={() => editarItem('TIPO', item)}>
                          <Pencil className="mr-1 h-3 w-3" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={item.protegido || guardandoItem}
                          title={item.protegido ? 'Valor del sistema: no se puede eliminar' : 'Eliminar'}
                          onClick={() => void eliminarItem('TIPO', item.valor)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {itemDraft?.categoria === 'TIPO' ? renderItemForm() : null}
                </CardContent>
              </Card>
            ) : null}

            {catalogoActivo === CATALOGO_EFECTOS ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Registros de efectos</CardTitle>
                  <Button type="button" size="sm" variant="outline" onClick={() => iniciarNuevoItem('EFECTO')}>
                    <Plus className="mr-1 h-3 w-3" />
                    Nuevo efecto
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {catalogoEfectosBD.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin registros en BD. Usa «Nuevo efecto».</p>
                  ) : null}
                  {catalogoEfectosBD.map((item) => (
                    <div key={item.valor} className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline">{item.valor}</Badge>
                          <Badge variant="secondary">{item.comportamiento || 'PERMITE'}</Badge>
                          {!item.activo ? <Badge variant="secondary">inactivo</Badge> : null}
                          {item.protegido ? <Badge variant="secondary">sistema</Badge> : null}
                        </div>
                        {item.label || item.descripcion ? (
                          <p className="mt-1 text-muted-foreground">{item.label}{item.descripcion ? ` · ${item.descripcion}` : ''}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button type="button" size="sm" variant="outline" onClick={() => editarItem('EFECTO', item)}>
                          <Pencil className="mr-1 h-3 w-3" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={item.protegido || guardandoItem}
                          title={item.protegido ? 'Valor del sistema: no se puede eliminar' : 'Eliminar'}
                          onClick={() => void eliminarItem('EFECTO', item.valor)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {itemDraft?.categoria === 'EFECTO' ? renderItemForm() : null}
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
          if (!open) {
            setCreandoNueva(false);
            setItemDraft(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{creandoNueva || !politicaEditId ? 'Nueva política runtime' : 'Editar política runtime'}</DialogTitle>
            <DialogDescription>
              Guarda políticas acotadas al tenantSA del JWT y evalúa sin modificar datos.
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
            <div className="flex items-center justify-between gap-2">
              <Label>Tipo</Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                  title="Crear tipo en catálogo"
                  onClick={() => iniciarNuevoItem('TIPO')}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                  title="Editar tipo seleccionado"
                  disabled={!tipoEnCatalogo}
                  onClick={editarTipoDesdeFormulario}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
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
            <div className="flex items-center justify-between gap-2">
              <Label>Efecto</Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                  title="Crear efecto en catálogo"
                  onClick={() => iniciarNuevoItem('EFECTO')}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                  title="Editar efecto seleccionado"
                  disabled={!efectoEnCatalogo}
                  onClick={editarEfectoDesdeFormulario}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
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
          {itemDraft && formOpen ? (
            <div className="md:col-span-3">{renderItemForm()}</div>
          ) : null}
          <div className="space-y-2">
            <Label>Rol para simular</Label>
            <Select value={rolNombre} onValueChange={setRolNombre}>
              <SelectTrigger>
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                {rolesOptions.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Roles permitidos</Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={!rolesOptions.length || todosRolesSeleccionados}
                  onClick={seleccionarTodosRoles}
                >
                  Todos
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={!rolesSeleccionados.length}
                  onClick={limpiarRoles}
                >
                  Ninguno
                </Button>
              </div>
            </div>
            <Select
              key={`rol-picker-${rolSelectKey}`}
              onValueChange={onRolSelectChange}
              disabled={!rolesOptions.length}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !rolesOptions.length
                      ? 'Sin roles en catálogo'
                      : todosRolesSeleccionados
                        ? 'Todos los roles seleccionados'
                        : rolesSeleccionados.length
                          ? `${rolesSeleccionados.length} rol(es) — agregar otro`
                          : 'Uno, varios o todos los roles'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {!todosRolesSeleccionados ? (
                  <SelectItem value={ROL_SELECT_ALL}>
                    Seleccionar todos ({rolesOptions.length})
                  </SelectItem>
                ) : null}
                {rolesSeleccionados.length > 0 ? (
                  <SelectItem value={ROL_SELECT_CLEAR}>Limpiar selección</SelectItem>
                ) : null}
                {rolesDisponibles.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rolesSeleccionados.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {rolesSeleccionados.map((rol) => (
                  <Badge key={rol} variant="secondary" className="gap-1 pr-1">
                    <span className="max-w-[220px] truncate">{rol}</span>
                    <button
                      type="button"
                      className="rounded-full p-0.5 hover:bg-muted"
                      aria-label={`Quitar ${rol}`}
                      onClick={() => quitarRol(rol)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">Selecciona uno o varios roles.</p>
            )}
          </div>
          <div className="space-y-2 md:col-span-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Dominios (colección apisdominios)</Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                  title="Ver catálogo apisdominios"
                  onClick={abrirCatalogoApisDominios}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={!apisDominiosCatalogo.length || todosApisDominiosSeleccionados}
                  onClick={seleccionarTodosApisDominios}
                >
                  Todos
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={!apisDominiosIds.length}
                  onClick={limpiarApisDominios}
                >
                  Ninguno
                </Button>
              </div>
            </div>
            <Select
              key={`apis-dominio-picker-${apisDominioSelectKey}`}
              onValueChange={onApisDominioSelectChange}
              disabled={!apisDominiosCatalogo.length}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !apisDominiosCatalogo.length
                      ? 'Sin registros apisdominios en GET /opciones'
                      : todosApisDominiosSeleccionados
                        ? 'Todos los dominios seleccionados'
                        : apisDominiosIds.length
                          ? `${apisDominiosIds.length} dominio(s) — agregar otro`
                          : 'Uno o varios registros de apisdominios'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {!todosApisDominiosSeleccionados ? (
                  <SelectItem value={APIS_DOMINIO_SELECT_ALL}>
                    Seleccionar todos ({apisDominiosCatalogo.length})
                  </SelectItem>
                ) : null}
                {apisDominiosIds.length > 0 ? (
                  <SelectItem value={APIS_DOMINIO_SELECT_CLEAR}>Limpiar selección</SelectItem>
                ) : null}
                {apisDominiosDisponibles.map((dominio) => (
                  <SelectItem key={dominio.id} value={dominio.id}>
                    {labelApisDominio(dominio)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {apisDominiosSeleccionados.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {apisDominiosSeleccionados.map((dominio) => (
                  <Badge key={dominio.id} variant="secondary" className="gap-1 pr-1">
                    <span className="max-w-[280px] truncate">{labelApisDominio(dominio)}</span>
                    <button
                      type="button"
                      className="rounded-full p-0.5 hover:bg-muted"
                      aria-label="Quitar dominio apisdominios"
                      onClick={() => quitarApisDominio(dominio.id)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Elige uno o varios registros de la colección <code>apisdominios</code> (scope de la política).
              </p>
            )}
          </div>
          <div className="space-y-2 md:col-span-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Referencia (condiciones.referencia)</Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                  title="Catálogo de referencias"
                  onClick={abrirCatalogoReferencia}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={!referenciaOptions.length || todasReferenciasSeleccionadas}
                  onClick={seleccionarTodasReferencias}
                >
                  Todos
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={!referenciaSeleccionadas.length}
                  onClick={limpiarReferencias}
                >
                  Ninguno
                </Button>
              </div>
            </div>
            <Select
              key={`referencia-picker-${referenciaSelectKey}`}
              onValueChange={onReferenciaSelectChange}
              disabled={!referenciaOptions.length}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !referenciaOptions.length
                      ? 'Selecciona dominios apisdominios para cargar referencias'
                      : todasReferenciasSeleccionadas
                        ? 'Todas las referencias seleccionadas'
                        : referenciaSeleccionadas.length
                          ? `${referenciaSeleccionadas.length} referencia(s) — agregar otra`
                          : 'Una, varias o todas las referencias'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {!todasReferenciasSeleccionadas ? (
                  <SelectItem value={REFERENCIA_SELECT_ALL}>
                    Seleccionar todas ({referenciaOptions.length})
                  </SelectItem>
                ) : null}
                {referenciaSeleccionadas.length > 0 ? (
                  <SelectItem value={REFERENCIA_SELECT_CLEAR}>Limpiar selección</SelectItem>
                ) : null}
                {referenciaDisponibles.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {referenciaSeleccionadas.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {referenciaSeleccionadas.map((item) => (
                  <Badge key={item} variant="secondary" className="gap-1 pr-1">
                    <span className="max-w-[220px] truncate">{item}</span>
                    <button
                      type="button"
                      className="rounded-full p-0.5 hover:bg-muted"
                      aria-label={`Quitar referencia ${item}`}
                      onClick={() => quitarReferencia(item)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Vacío = ninguna. Las opciones salen de los <code>bypassDominios</code> de los apisdominios elegidos.
              </p>
            )}
          </div>
          {esPoliticaBypassLike(tipo, codigo) ? (
            <div className="space-y-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 md:col-span-3">
              <p className="text-xs font-medium text-foreground">Bypass dinámico (motor global.js y JWT)</p>
              <div className="space-y-1">
                <Label className="text-xs">Motor evento (metadata.motorEvento)</Label>
                <Input
                  value={motorEvento}
                  placeholder="Ej: COMISIONES_PADRE, REFERIDOS, HERENCIA_RUTAS"
                  onChange={(e) => setMotorEvento(e.target.value.toUpperCase())}
                />
                <p className="text-[11px] text-muted-foreground">
                  El motor <code>global.js</code> y el JWT consultan políticas activas por este evento,
                  <code>metadata.alcance</code>, <code>bypassDominios</code> o código. Sin tocar código al crear nuevas políticas.
                </p>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {BYPASS_FUNCIONALIDADES.map((item) => (
                  <li key={item.alcance} className="rounded border border-border/60 bg-background/60 p-2 text-[11px]">
                    <span className="font-mono font-medium">{item.alcance}</span>
                    <span className="text-muted-foreground"> — {item.titulo}</span>
                    <p className="mt-1 text-muted-foreground">{item.descripcion}</p>
                  </li>
                ))}
              </ul>
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
