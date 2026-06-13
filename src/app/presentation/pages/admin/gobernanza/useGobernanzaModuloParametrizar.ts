import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { getGobernanzaModuloCatalogoLocal } from './gobernanzaModulosCatalog';
import {
  accionesUpsertDesdeCatalogo,
  buildAccionesSeleccionDesdeModuloConfig,
  buildAccionesSeleccionInicial,
  buildGobernanzaModuloUpsertPayload,
  filtrarAccionesFormularioSeleccionadas,
  previewAccionesMenuDesdeCatalogoDinamico,
} from './gobernanzaModuloSeedPayload';
import type {
  GobernanzaFormularioDetalleApi,
  GobernanzaModuloConfigApi,
  GobernanzaModuloTipoApi,
} from './gobernanzaModuloApiTypes';
import {
  fetchGobernanzaAccionesCatalogo,
  fetchGobernanzaModuloConfigs,
  fetchGobernanzaModuloFormularioDetalle,
  fetchGobernanzaModuloMenu,
  fetchGobernanzaModulosCatalogo,
  fetchGobernanzaModuloTipos,
  upsertGobernanzaModulo,
} from './gobernanzaModuloService';
import {
  accionesCatalogDesdeAccionesApi,
  accionesCatalogDesdeConfig,
  buildAccionesCatalogoDinamico,
  buildAccionesOpciones,
  buildAccionesPublicablesParametrizar,
  buildConfigsOpciones,
  buildDescripcionesOpciones,
  buildTiposModuloOpciones,
  buildTitulosOpciones,
  filtrarAccionesPorTipo,
  resolverConfigPorRuta,
  type GobernanzaAccionCatalogItem,
} from './gobernanzaModuloParametrizarOpciones';
import {
  normalizarGobernanzaEndpointId,
  normalizarGobernanzaMenuPath,
  normalizarGobernanzaRutaId,
  normalizarGobernanzaTipoId,
} from './gobernanzaActionIds';
import { normalizarGobernanzaRefId } from './gobernanzaEntityId';
import { useGobernanzaModuloRutasOpciones } from './useGobernanzaModuloRutasOpciones';
import {
  esSectionSlugValido,
  normalizarSectionInput,
  resolverTipoSectionFiltroInicial,
  sectionDesdeComponente,
} from './gobernanzaModuloTipoDefaults';

export type UseGobernanzaModuloParametrizarOptions = {
  moduloSlug: string;
  open: boolean;
  /** Path SPA actual: preselecciona ruta y config al abrir el modal. */
  menuPathInicial?: string | null;
  onMenuRefresh?: () => void | Promise<void>;
  onSaved?: () => void;
};

const CONFIG_NUEVO = '__nuevo__';

function publicadasDesdeConfig(cfg: GobernanzaModuloConfigApi): Array<{ id: string; method: string }> {
  const fromCatalog = (cfg.accionesCatalog ?? []).map((a) => {
    const raw = String(a.accionRef || a.accionId || a.id || '').trim();
    return {
      id: normalizarGobernanzaRefId(raw) || normalizarGobernanzaEndpointId(raw),
      method: String(a.method || '').toUpperCase(),
    };
  });
  if (fromCatalog.some((a) => a.id)) return fromCatalog.filter((a) => a.id);
  return (cfg.endpointIds ?? []).map((id) => ({
    id: normalizarGobernanzaEndpointId(id),
    method: '',
  }));
}

export function useGobernanzaModuloParametrizar({
  moduloSlug,
  open,
  menuPathInicial = null,
  onMenuRefresh,
  onSaved,
}: UseGobernanzaModuloParametrizarOptions) {
  const catalogoLocal = getGobernanzaModuloCatalogoLocal(moduloSlug);
  const sectionKey = catalogoLocal?.section ?? moduloSlug;
  const menuPathInicialNorm = normalizarGobernanzaMenuPath(menuPathInicial);

  const [label, setLabel] = useState(catalogoLocal?.label ?? moduloSlug);
  const [description, setDescription] = useState(catalogoLocal?.description ?? '');
  const [rutaId, setRutaIdState] = useState('');
  const [tipoId, setTipoId] = useState('');
  const [tipoSectionFiltro, setTipoSectionFiltro] = useState('permisos');
  const [moduloTipos, setModuloTipos] = useState<GobernanzaModuloTipoApi[]>([]);
  const [tiposLoading, setTiposLoading] = useState(false);
  const [configSlug, setConfigSlug] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [moduloConfigs, setModuloConfigs] = useState<GobernanzaModuloConfigApi[]>([]);
  const [accionesPublicadas, setAccionesPublicadas] = useState<Array<{ id: string; method: string }>>([]);
  const [formularioDetalle, setFormularioDetalle] = useState<GobernanzaFormularioDetalleApi | null>(null);
  const [formularioError, setFormularioError] = useState<string | null>(null);
  const [cargandoFormulario, setCargandoFormulario] = useState(false);
  const [cargandoAccionesModulo, setCargandoAccionesModulo] = useState(false);
  const [accionesCatalogoParam, setAccionesCatalogoParam] = useState<GobernanzaAccionCatalogItem[]>([]);
  const [cargandoAccionesCatalogo, setCargandoAccionesCatalogo] = useState(false);
  const [accionesSeleccionadas, setAccionesSeleccionadas] = useState<Record<string, boolean>>({});
  const [configCargada, setConfigCargada] = useState(false);
  const [esModoNuevo, setEsModoNuevo] = useState(false);
  const [cargandoConfigSeleccionada, setCargandoConfigSeleccionada] = useState(false);

  const modalInicializadoRef = useRef(false);
  const usuarioEligioNuevoRef = useRef(false);
  const accionesSeleccionInicializadaRef = useRef(false);

  const accionesCatalogo = useMemo(
    () => buildAccionesCatalogoDinamico(moduloConfigs, accionesCatalogoParam),
    [moduloConfigs, accionesCatalogoParam]
  );

  const {
    rutas,
    sugerida,
    ayuda,
    loading: rutasLoading,
    refresh: refreshRutas,
  } = useGobernanzaModuloRutasOpciones(moduloSlug, open);

  const rutasRef = useRef(rutas);
  useEffect(() => {
    rutasRef.current = rutas;
  }, [rutas]);

  const tipoSeleccionado = useMemo(() => {
    const tid = normalizarGobernanzaTipoId(tipoId);
    return moduloTipos.find((t) => normalizarGobernanzaTipoId(t.id) === tid) ?? null;
  }, [moduloTipos, tipoId]);

  const rutaSeleccionada = useMemo(() => {
    const rid = normalizarGobernanzaRutaId(rutaId);
    return rutas.find((r) => normalizarGobernanzaRutaId(r.id) === rid || r.id === rutaId) ?? null;
  }, [rutas, rutaId]);

  const tiposOpciones = useMemo(() => buildTiposModuloOpciones(moduloTipos), [moduloTipos]);

  const setRutaId = useCallback((nextId: string) => {
    setRutaIdState(nextId);
  }, []);

  const configPorRuta = useMemo(
    () =>
      resolverConfigPorRuta(
        moduloConfigs,
        rutaId,
        rutaSeleccionada?.path || formularioDetalle?.path
      ),
    [moduloConfigs, rutaId, rutaSeleccionada?.path, formularioDetalle?.path]
  );

  const configSeleccionada = useMemo(
    () =>
      (configSlug ? moduloConfigs.find((c) => c.slug === configSlug) : null) ??
      configPorRuta ??
      null,
    [moduloConfigs, configSlug, configPorRuta]
  );

  const componenteActivo = useMemo(() => {
    const fromTipo = tipoSeleccionado?.formularioComponent?.trim();
    if (fromTipo) return fromTipo;
    const fromConfig = configSeleccionada?.formularioComponent?.trim();
    if (fromConfig) return fromConfig;
    const fromConfigTipo = configSeleccionada?.tipoFormularioComponent?.trim();
    if (fromConfigTipo) return fromConfigTipo;
    const fromDetalle = formularioDetalle?.component?.trim();
    if (fromDetalle) return fromDetalle;
    return rutaSeleccionada?.component?.trim() ?? '';
  }, [tipoSeleccionado, configSeleccionada, formularioDetalle, rutaSeleccionada]);

  const configsOpciones = useMemo(() => buildConfigsOpciones(moduloConfigs), [moduloConfigs]);

  const titulosOpciones = useMemo(() => {
    const base = buildTitulosOpciones(moduloConfigs, catalogoLocal, rutas, formularioDetalle);
    const actual = label.trim();
    if (!actual || base.some((o) => o.value === actual)) return base;
    return [{ value: actual, label: actual, hint: 'Valor actual' }, ...base];
  }, [moduloConfigs, catalogoLocal, rutas, formularioDetalle, label]);

  const descripcionesOpciones = useMemo(() => {
    const base = buildDescripcionesOpciones(moduloConfigs, catalogoLocal, label);
    const actual = description.trim();
    if (!actual || base.some((o) => o.value === actual)) return base;
    return [{ value: actual, label: actual, hint: 'Valor actual' }, ...base];
  }, [moduloConfigs, catalogoLocal, label, description]);

  const accionesCatalogoFiltrado = useMemo(
    () => filtrarAccionesPorTipo(accionesCatalogo, tipoSeleccionado, componenteActivo),
    [accionesCatalogo, tipoSeleccionado, componenteActivo]
  );

  const accionesOpciones = useMemo(
    () => buildAccionesOpciones(accionesCatalogoFiltrado),
    [accionesCatalogoFiltrado]
  );

  const accionesPublicables = useMemo(
    () =>
      buildAccionesPublicablesParametrizar(accionesCatalogoParam, moduloConfigs, configPorRuta),
    [accionesCatalogoParam, moduloConfigs, configPorRuta]
  );

  const accionesIdsSeleccionados = useMemo(
    () => Object.entries(accionesSeleccionadas).filter(([, v]) => v).map(([k]) => k),
    [accionesSeleccionadas]
  );

  const resolverRutaIdDesdePath = useCallback((menuPath: string): string => {
    const pathKey = normalizarGobernanzaMenuPath(menuPath).toLowerCase();
    if (!pathKey) return '';
    const match = rutasRef.current.find(
      (r) => normalizarGobernanzaMenuPath(r.path).toLowerCase() === pathKey
    );
    return match?.id ?? '';
  }, []);

  const resolverRutaIdDesdeConfig = useCallback((cfg: GobernanzaModuloConfigApi): string => {
    const directo = normalizarGobernanzaRutaId(cfg.rutaId || cfg.formularioId);
    if (directo) return directo;
    const menuPath = String(cfg.menuPath || cfg.frontPath || '').trim();
    if (!menuPath) return '';
    const match = rutasRef.current.find((r) => String(r.path || '').trim() === menuPath);
    return match?.id ?? '';
  }, []);

  const resolverTipoIdDesdeConfig = useCallback(
    (cfg: GobernanzaModuloConfigApi): string => {
      const directo = normalizarGobernanzaTipoId(cfg.tipoId);
      if (directo) return directo;
      const codigo = String(cfg.tipoCodigo || '').trim().toLowerCase();
      if (!codigo) return '';
      return moduloTipos.find((t) => t.codigo === codigo)?.id ?? '';
    },
    [moduloTipos]
  );

  const aplicarDesdeConfig = useCallback(
    (cfg: GobernanzaModuloConfigApi, opts?: { actualizarSlug?: boolean }) => {
      setEsModoNuevo(false);
      if (opts?.actualizarSlug !== false) setConfigSlug(cfg.slug);
      if (cfg.label?.trim() || (cfg as { nombre?: string }).nombre?.trim()) {
        setLabel(String(cfg.label || (cfg as { nombre?: string }).nombre || '').trim());
      }
      if (cfg.description?.trim()) setDescription(cfg.description.trim());

      const tid = resolverTipoIdDesdeConfig(cfg);
      if (tid) setTipoId(tid);

      const rid = resolverRutaIdDesdeConfig(cfg);
      if (rid) setRutaId(rid);

      const publicadas = publicadasDesdeConfig(cfg);
      setAccionesPublicadas(publicadas.filter((a) => a.id));

      const ids = publicadas.map((a) => a.id).filter(Boolean);
      if (ids.length) {
        setAccionesSeleccionadas(Object.fromEntries(ids.map((id) => [id, true])));
      } else {
        const catalog = accionesCatalogDesdeConfig(cfg);
        if (catalog.length) {
          setAccionesSeleccionadas(Object.fromEntries(catalog.map((a) => [a.accionId, true])));
        }
      }
    },
    [resolverRutaIdDesdeConfig, resolverTipoIdDesdeConfig, setRutaId]
  );

  const cargarFormularioDetalle = useCallback(async (selectedRutaId: string) => {
    if (!selectedRutaId) {
      setFormularioDetalle(null);
      setFormularioError(null);
      return;
    }
    setCargandoFormulario(true);
    setFormularioError(null);
    try {
      const detalle = await fetchGobernanzaModuloFormularioDetalle(selectedRutaId);
      if (!detalle?.component && !tipoSeleccionado?.formularioComponent) {
        throw new Error('El formulario no tiene componente asignado en rutaseguridads ni en el tipo.');
      }
      setFormularioDetalle(detalle ?? null);
    } catch (err: unknown) {
      setFormularioDetalle(null);
      setFormularioError(err instanceof Error ? err.message : 'No se pudo cargar el formulario');
    } finally {
      setCargandoFormulario(false);
    }
  }, [tipoSeleccionado]);

  const cargarAccionesCatalogo = useCallback(async () => {
    setCargandoAccionesCatalogo(true);
    try {
      const rows = await fetchGobernanzaAccionesCatalogo();
      setAccionesCatalogoParam(accionesCatalogDesdeAccionesApi(rows));
    } catch {
      setAccionesCatalogoParam([]);
    } finally {
      setCargandoAccionesCatalogo(false);
    }
  }, []);

  const cargarConfigExistente = useCallback(
    async (opts?: { aplicarPrincipal?: boolean }) => {
      setCargandoAccionesModulo(true);
      try {
        const [menuRes, catalogRes, configsRes] = await Promise.all([
          fetchGobernanzaModuloMenu(moduloSlug),
          fetchGobernanzaModulosCatalogo().catch(() => null),
          fetchGobernanzaModuloConfigs(moduloSlug).catch(() => ({
            ok: true,
            configs: [] as GobernanzaModuloConfigApi[],
          })),
        ]);

        const configs = Array.isArray(configsRes.configs) ? configsRes.configs : [];
        setModuloConfigs(configs);

        const debeAplicar = opts?.aplicarPrincipal !== false && !usuarioEligioNuevoRef.current;
        if (!debeAplicar) return;

        const modulo = menuRes.modulo;
        const catalogItem = catalogRes?.modulos?.find((m) => m.slug === moduloSlug);
        const cfgDesdePath = menuPathInicialNorm
          ? resolverConfigPorRuta(configs, null, menuPathInicialNorm)
          : null;

        let configPrincipal: GobernanzaModuloConfigApi | null = null;
        if (menuPathInicialNorm) {
          configPrincipal = cfgDesdePath;
        } else {
          configPrincipal =
            cfgDesdePath ??
            resolverConfigPorRuta(
              configs,
              catalogItem?.rutaId ||
                modulo?.rutaId ||
                catalogItem?.formularioId ||
                modulo?.formularioId,
              catalogItem?.menuPath || modulo?.menuPath || catalogItem?.frontPath || modulo?.frontPath
            ) ??
            configs.find((c) => c.slug === modulo?.slug) ??
            configs.find((c) => String(c.section || '').toLowerCase() === moduloSlug.toLowerCase()) ??
            configs[0] ??
            null;
        }

        if (configPrincipal) {
          aplicarDesdeConfig(configPrincipal);
        } else if (!menuPathInicialNorm) {
          setConfigSlug('');
          if (modulo?.label?.trim()) setLabel(modulo.label.trim());
          else if (catalogItem?.label?.trim()) setLabel(catalogItem.label.trim());

          if (modulo?.description?.trim()) setDescription(modulo.description.trim());
          else if (catalogItem?.description?.trim()) setDescription(catalogItem.description.trim());

          const catalogoBd = modulo?.accionesCatalog ?? [];
          setAccionesPublicadas(
            (catalogoBd.length ? catalogoBd : menuRes.acciones ?? [])
              .map((a) => ({
                id: String((a as { id?: string }).id || ''),
                method: String((a as { method?: string }).method || '').toUpperCase(),
              }))
              .filter((a) => a.id)
          );

          const rutaPersistida =
            catalogItem?.rutaId ||
            modulo?.rutaId ||
            catalogItem?.formularioId ||
            modulo?.formularioId ||
            '';
          if (rutaPersistida) setRutaId(String(rutaPersistida));
        } else {
          setConfigSlug('');
          setAccionesPublicadas([]);
          accionesSeleccionInicializadaRef.current = false;
        }
      } catch {
        setModuloConfigs([]);
        setAccionesPublicadas([]);
      } finally {
        setCargandoAccionesModulo(false);
        setConfigCargada(true);
      }
    },
    [moduloSlug, aplicarDesdeConfig, setRutaId, menuPathInicialNorm]
  );

  useEffect(() => {
    if (!open) {
      modalInicializadoRef.current = false;
      usuarioEligioNuevoRef.current = false;
      accionesSeleccionInicializadaRef.current = false;
      setConfigCargada(false);
      setEsModoNuevo(false);
      setTipoId('');
      setAccionesCatalogoParam([]);
      return;
    }
    if (modalInicializadoRef.current) return;
    modalInicializadoRef.current = true;
    void refreshRutas();
    void cargarAccionesCatalogo();
    void cargarConfigExistente({ aplicarPrincipal: true });
  }, [open, refreshRutas, cargarAccionesCatalogo, cargarConfigExistente]);

  useEffect(() => {
    if (!open || !rutaId) {
      setFormularioDetalle(null);
      if (!tipoSeleccionado?.formularioComponent) setFormularioError(null);
      return;
    }
    void cargarFormularioDetalle(rutaId);
  }, [open, rutaId, cargarFormularioDetalle, tipoSeleccionado]);

  const refrescarTipos = useCallback((sectionOverride?: string) => {
    const sec = String(sectionOverride || tipoSectionFiltro).trim();
    if (!sec) return Promise.resolve();
    setTiposLoading(true);
    return fetchGobernanzaModuloTipos(sec)
      .then((res) => setModuloTipos(Array.isArray(res.tipos) ? res.tipos : []))
      .catch(() => setModuloTipos([]))
      .finally(() => setTiposLoading(false));
  }, [tipoSectionFiltro]);

  const seleccionarTipoSectionFiltro = useCallback((section: string) => {
    const sec = normalizarSectionInput(section);
    if (!esSectionSlugValido(sec)) return;
    setTipoSectionFiltro(sec);
    setTipoId('');
  }, []);

  useEffect(() => {
    if (!open) return;
    const fromComp = sectionDesdeComponente(rutaSeleccionada?.component);
    if (fromComp) {
      setTipoSectionFiltro(fromComp);
      return;
    }
    setTipoSectionFiltro(resolverTipoSectionFiltroInicial(null, sectionKey, moduloSlug));
  }, [open, rutaSeleccionada?.component, sectionKey, moduloSlug]);

  useEffect(() => {
    if (!open) return;
    void refrescarTipos();
  }, [open, tipoSectionFiltro, refrescarTipos]);

  useEffect(() => {
    if (!open || !configCargada || tipoId || moduloTipos.length !== 1) return;
    setTipoId(moduloTipos[0].id);
  }, [open, configCargada, tipoId, moduloTipos]);

  useEffect(() => {
    if (!open || !configCargada || !rutas.length) return;

    if (menuPathInicialNorm) {
      const rid = resolverRutaIdDesdePath(menuPathInicialNorm);
      if (rid) {
        setRutaId(rid);
        return;
      }
    }

    if (rutaId) return;
    if (sugerida?.id) {
      setRutaId(sugerida.id);
      return;
    }
    const vinculada = rutas.find((r) => r.vinculadoSlug === moduloSlug);
    if (vinculada?.id) setRutaId(vinculada.id);
    else if (rutas[0]?.id) setRutaId(rutas[0].id);
  }, [
    open,
    rutaId,
    configCargada,
    menuPathInicialNorm,
    sugerida,
    rutas,
    moduloSlug,
    setRutaId,
    resolverRutaIdDesdePath,
  ]);

  useEffect(() => {
    if (!open || !rutaSeleccionada?.name?.trim()) return;
    const nombreRuta = rutaSeleccionada.name.trim();
    setLabel((prev) => {
      const p = prev.trim();
      if (!p || p === catalogoLocal?.label) return nombreRuta;
      return prev;
    });
  }, [open, rutaSeleccionada?.name, catalogoLocal?.label]);

  useEffect(() => {
    if (!open || !configCargada || !rutaId) return;
    const cfg = resolverConfigPorRuta(
      moduloConfigs,
      rutaId,
      rutaSeleccionada?.path || formularioDetalle?.path
    );
    if (!cfg) {
      setAccionesPublicadas([]);
      accionesSeleccionInicializadaRef.current = false;
      return;
    }

    setConfigSlug(cfg.slug);
    if (cfg.label?.trim() || cfg.nombre?.trim()) setLabel(String(cfg.label || cfg.nombre || '').trim());
    if (cfg.description?.trim()) setDescription(cfg.description.trim());

    const tid = resolverTipoIdDesdeConfig(cfg);
    if (tid) setTipoId(tid);

    const publicadas = publicadasDesdeConfig(cfg);
    setAccionesPublicadas(publicadas.filter((a) => a.id));
    accionesSeleccionInicializadaRef.current = false;
  }, [
    open,
    configCargada,
    rutaId,
    rutaSeleccionada?.path,
    formularioDetalle?.path,
    moduloConfigs,
    resolverTipoIdDesdeConfig,
  ]);

  useEffect(() => {
    if (!open || !configCargada || accionesSeleccionInicializadaRef.current) return;
    if (!accionesPublicables.length) return;
    accionesSeleccionInicializadaRef.current = true;

    if (accionesPublicadas.length) {
      setAccionesSeleccionadas(
        buildAccionesSeleccionInicial(
          accionesPublicables.map((a) => ({ accionId: a.accionId, method: a.method })),
          accionesPublicadas
        )
      );
      return;
    }

    const sugeridasTipo = filtrarAccionesPorTipo(
      accionesPublicables,
      tipoSeleccionado,
      componenteActivo
    );
    const seed =
      sugeridasTipo.length > 0
        ? sugeridasTipo.map((a) => ({ id: a.accionId, method: a.method }))
        : [];
    setAccionesSeleccionadas(
      buildAccionesSeleccionDesdeModuloConfig(accionesPublicables, seed)
    );
  }, [
    open,
    configCargada,
    accionesPublicables,
    accionesPublicadas,
    tipoSeleccionado,
    componenteActivo,
  ]);

  const seleccionarTipoModulo = useCallback((nextTipoId: string) => {
    const id = String(nextTipoId || '').trim();
    setTipoId(id);
    accionesSeleccionInicializadaRef.current = false;
  }, []);

  const iniciarConfigNuevo = useCallback(() => {
    usuarioEligioNuevoRef.current = true;
    setEsModoNuevo(true);
    setConfigSlug('');
    setLabel('');
    setDescription('');
    setAccionesPublicadas([]);
    setAccionesSeleccionadas({});
    accionesSeleccionInicializadaRef.current = false;
  }, []);

  const seleccionarConfig = useCallback(
    async (slug: string) => {
      if (slug === CONFIG_NUEVO || !slug) {
        iniciarConfigNuevo();
        return;
      }
      usuarioEligioNuevoRef.current = false;
      setEsModoNuevo(false);
      setCargandoConfigSeleccionada(true);
      try {
        const configsRes = await fetchGobernanzaModuloConfigs(moduloSlug);
        const configs = Array.isArray(configsRes.configs) ? configsRes.configs : [];
        setModuloConfigs(configs);
        const cfg = configs.find((c) => c.slug === slug) ?? moduloConfigs.find((c) => c.slug === slug);
        if (cfg) aplicarDesdeConfig(cfg);
      } catch {
        const cfg = moduloConfigs.find((c) => c.slug === slug);
        if (cfg) aplicarDesdeConfig(cfg);
      } finally {
        setCargandoConfigSeleccionada(false);
      }
    },
    [moduloSlug, moduloConfigs, aplicarDesdeConfig, iniciarConfigNuevo]
  );

  const seleccionarTitulo = useCallback(
    (titulo: string) => {
      setLabel(titulo);
      const cfg = moduloConfigs.find(
        (c) => String(c.label || '').trim().toLowerCase() === titulo.trim().toLowerCase()
      );
      if (cfg) {
        aplicarDesdeConfig(cfg, { actualizarSlug: true });
        return;
      }
      const cat = catalogoLocal?.label === titulo ? catalogoLocal : null;
      if (cat?.description) setDescription(cat.description);
    },
    [moduloConfigs, catalogoLocal, aplicarDesdeConfig]
  );

  const seleccionarDescripcion = useCallback(
    (desc: string) => {
      setDescription(desc);
      const cfg = moduloConfigs.find(
        (c) => String(c.description || '').trim() === desc.trim()
      );
      if (cfg) aplicarDesdeConfig(cfg, { actualizarSlug: false });
    },
    [moduloConfigs, aplicarDesdeConfig]
  );

  const handleAccionesSeleccionChange = useCallback((next: Record<string, boolean>) => {
    accionesSeleccionInicializadaRef.current = true;
    setAccionesSeleccionadas(next);
  }, []);

  const accionesElegidas = useMemo(
    () => filtrarAccionesFormularioSeleccionadas(accionesPublicables, accionesSeleccionadas),
    [accionesPublicables, accionesSeleccionadas]
  );

  const accionesPayloadPreview = useMemo(
    () =>
      accionesUpsertDesdeCatalogo(
        accionesPublicables,
        accionesElegidas.map((a) => a.accionId),
        moduloConfigs
      ),
    [accionesPublicables, accionesElegidas, moduloConfigs]
  );

  const accionesMenuPreview = useMemo(
    () =>
      previewAccionesMenuDesdeCatalogoDinamico(
        accionesPublicables,
        accionesElegidas.map((a) => a.accionId),
        moduloConfigs
      ),
    [accionesPublicables, accionesElegidas, moduloConfigs]
  );

  const vinculacion = useMemo(
    () => ({
      slug: moduloSlug,
      configSlug: configSlug || null,
      tipoId: normalizarGobernanzaTipoId(tipoId) || null,
      tipoCodigo: tipoSeleccionado?.codigo ?? configSeleccionada?.tipoCodigo ?? null,
      tipoNombre: tipoSeleccionado?.nombre ?? configSeleccionada?.tipoNombre ?? null,
      rutaId: normalizarGobernanzaRutaId(rutaId) || null,
      rutaPath: rutaSeleccionada?.path?.trim() || formularioDetalle?.path?.trim() || null,
      rutaNombre: rutaSeleccionada?.name?.trim() || formularioDetalle?.name?.trim() || null,
      componente: componenteActivo || null,
      label: label.trim(),
      description: description.trim(),
      accionesFormulario: accionesElegidas.length,
      accionesMenu: accionesPayloadPreview.length,
      accionesPublicadas: accionesPublicadas.length,
    accionesRegistradasRuta: accionesCatalogDesdeConfig(configPorRuta).length,
    }),
    [
      moduloSlug,
      configSlug,
      tipoId,
      tipoSeleccionado,
      configSeleccionada,
      rutaId,
      rutaSeleccionada,
      formularioDetalle,
      componenteActivo,
      label,
      description,
      accionesElegidas.length,
      accionesPayloadPreview.length,
      accionesPublicadas.length,
      configPorRuta,
    ]
  );

  const guardarBloqueadoPor = useMemo(() => {
    if (!vinculacion.label.trim()) return 'Ingresa el nombre del módulo.';
    if (moduloTipos.length === 0) {
      return `No hay tipos en gobernanzaModuloTipos para section «${tipoSectionFiltro}». Crea uno con el botón +.`;
    }
    if (!vinculacion.tipoId) return 'Selecciona el tipo en gobernanzaModuloTipos (arriba).';
    if (!vinculacion.rutaId || !vinculacion.rutaPath) {
      return 'Selecciona una ruta en rutaseguridads (arriba).';
    }
    if (!vinculacion.componente) {
      return 'El tipo o la ruta debe tener componente React asignado.';
    }
    if (accionesPublicables.length === 0) {
      return 'No hay acciones activas en la colección acciones. Revise Seguridad → Rutas → acciones.';
    }
    if (accionesElegidas.length === 0) return 'Marca al menos una operación habilitada.';
    if (accionesPayloadPreview.length === 0) {
      return 'Las operaciones marcadas no tienen path API. Asigna acciones en Seguridad → Rutas o registra el consumo en apiConsumoFrontend.';
    }
    return null;
  }, [vinculacion, moduloTipos.length, tipoSectionFiltro, accionesPublicables.length, accionesElegidas.length, accionesPayloadPreview.length]);

  const puedeGuardar = guardarBloqueadoPor === null;

  const guardar = async () => {
    const nombre = label.trim();
    const path = rutaSeleccionada?.path?.trim() ?? formularioDetalle?.path?.trim() ?? '';
    if (!nombre) {
      toast.error('Ingresa el nombre del módulo.');
      return;
    }
    if (!tipoId) {
      toast.error('Selecciona el tipo en gobernanzaModuloTipos.');
      return;
    }
    if (
      tipoSeleccionado
      && String(tipoSeleccionado.section || '').toLowerCase() !== String(tipoSectionFiltro).toLowerCase()
    ) {
      toast.error(`El tipo debe pertenecer a la section «${tipoSectionFiltro}».`);
      return;
    }
    if (!rutaId || !path) {
      toast.error('Selecciona una ruta de rutaseguridads.');
      return;
    }
    const component =
      tipoSeleccionado?.formularioComponent?.trim() ||
      formularioDetalle?.component?.trim() ||
      configSeleccionada?.formularioComponent?.trim() ||
      '';
    if (!component) {
      toast.error(formularioError || 'El tipo o formulario debe tener componente React asignado.');
      return;
    }
    if (!accionesElegidas.length) {
      toast.error('Selecciona al menos una operación habilitada.');
      return;
    }

    const accionesPayload = accionesUpsertDesdeCatalogo(
      accionesPublicables,
      accionesElegidas.map((a) => a.accionId),
      moduloConfigs
    );
    if (!accionesPayload.length) {
      toast.error(
        'Las operaciones seleccionadas no tienen path API. Verifica acciones en Seguridad → Rutas o apiConsumoFrontend.'
      );
      return;
    }

    const body = buildGobernanzaModuloUpsertPayload(
      moduloSlug,
      {
        rutaId: normalizarGobernanzaRutaId(rutaId),
        rutaPath: path,
        formularioComponent: component,
        tipoId: normalizarGobernanzaTipoId(tipoId),
      },
      {
        nombre,
        description: description.trim(),
        menuPath: path,
        acciones: accionesPayload,
        ...(configSlug?.trim() ? { cardSlug: configSlug.trim() } : {}),
      }
    );
    if (!body) {
      toast.error('No se pudo armar el payload.');
      return;
    }

    setGuardando(true);
    try {
      await upsertGobernanzaModulo(body);
      toast.success(
        configSlug?.trim()
          ? `Menú «${nombre}» actualizado en gobernanzaModuloConfigs.`
          : `Menú «${nombre}» guardado en gobernanzaModuloConfigs.`
      );
      await cargarConfigExistente();
      await onMenuRefresh?.();
      onSaved?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const refrescarAcciones = useCallback(() => {
    void cargarAccionesCatalogo();
    void cargarConfigExistente({ aplicarPrincipal: false });
  }, [cargarAccionesCatalogo, cargarConfigExistente]);

  return {
    catalogoLocal,
    sectionKey,
    tipoSectionFiltro,
    seleccionarTipoSectionFiltro,
    configSlug,
    configSeleccionada,
    accionesPublicadas,
    configPorRuta,
    configsOpciones,
    titulosOpciones,
    descripcionesOpciones,
    accionesOpciones,
    seleccionarConfig,
    iniciarConfigNuevo,
    seleccionarTitulo,
    seleccionarDescripcion,
    CONFIG_NUEVO,
    esModoNuevo,
    cargandoConfigSeleccionada,
    esEdicionConfig: Boolean(configSlug?.trim() && !esModoNuevo),
    label,
    setLabel,
    description,
    setDescription,
    rutaId,
    setRutaId,
    tipoId,
    seleccionarTipoModulo,
    tipoSeleccionado,
    tiposOpciones,
    tiposLoading,
    rutas,
    rutaSeleccionada,
    rutasLoading,
    ayuda,
    formularioDetalle,
    formularioError,
    cargandoFormulario,
    cargandoAccionesModulo,
    cargandoAccionesCatalogo,
    configCargada,
    moduloConfigs,
    moduloTipos,
    accionesCatalogo: accionesCatalogoFiltrado,
    accionesPublicables,
    componenteActivo,
    accionesSeleccionadas,
    setAccionesSeleccionadas: handleAccionesSeleccionChange,
    accionesIdsSeleccionados,
    accionesElegidas,
    accionesPayloadPreview,
    accionesMenuPreview,
    vinculacion,
    puedeGuardar,
    guardarBloqueadoPor,
    guardando,
    guardar,
    refrescarAcciones,
    refrescarTipos,
  };
}
