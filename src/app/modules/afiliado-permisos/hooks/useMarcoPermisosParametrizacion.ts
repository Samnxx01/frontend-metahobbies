import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  getMarcoAfiliadoActivo,
  getRolesMarcoParametrizables,
  guardarMarcoAfiliado,
  sincronizarPermisosAfiliado,
  sincronizarLoteAfiliadosAdmin,
} from '../api/marco.api';
import type {
  MarcoCatalogTab,
  MarcoPermisosAfiliado,
  RolMarcoParametrizable,
} from '../types/marco.types';
import { SUGERENCIAS_AFILIADO } from '../constants/catalog-filters';
import { toId } from '../utils/toId';
import { getAllRoutes, getAccionesCatalogo, type Route } from '@/app/services/routesService';
import type { AccionOption } from '@/app/services/routesService';

const toggleSet = (set: Set<string>, id: string, checked: boolean): Set<string> => {
  const next = new Set(set);
  if (checked) next.add(id);
  else next.delete(id);
  return next;
};

function resolverRolPorDefecto(
  roles: RolMarcoParametrizable[],
  actual: string | null
): string | null {
  if (actual && roles.some((r) => r._id === actual)) return actual;
  const clienteGlobal =
    roles.find((r) => r.rol === 'CLIENTE' && !r.tenantCorporativo)?._id ?? null;
  return clienteGlobal ?? roles[0]?._id ?? null;
}

export function useMarcoPermisosParametrizacion() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingLote, setSyncingLote] = useState(false);
  const [roles, setRoles] = useState<RolMarcoParametrizable[]>([]);
  const [rolSeleccionadoId, setRolSeleccionadoId] = useState<string | null>(null);
  const [marcoActivo, setMarcoActivo] = useState<MarcoPermisosAfiliado | null>(null);
  const [rutas, setRutas] = useState<Route[]>([]);
  const [acciones, setAcciones] = useState<AccionOption[]>([]);
  const [vistasSel, setVistasSel] = useState<Set<string>>(new Set());
  const [accionesSel, setAccionesSel] = useState<Set<string>>(new Set());
  const [filtroVistas, setFiltroVistas] = useState('');
  const [filtroAcciones, setFiltroAcciones] = useState('');
  const [soloSugeridas, setSoloSugeridas] = useState(false);
  const [tab, setTab] = useState<MarcoCatalogTab>('vistas');
  const rolSeleccionadoIdRef = useRef<string | null>(null);

  const rolSeleccionado = useMemo(
    () => roles.find((r) => r._id === rolSeleccionadoId) ?? null,
    [roles, rolSeleccionadoId]
  );

  const aplicarMarcoEnEstado = useCallback(
    (
      marco: MarcoPermisosAfiliado | null,
      marcoRes?: { creado?: boolean; msg?: string },
      { avisarSinMarco = false } = {}
    ) => {
      setMarcoActivo(marco);
      setVistasSel(new Set((marco?.vistas ?? []).map((id) => toId(id))));
      setAccionesSel(new Set((marco?.acciones ?? []).map((id) => toId(id))));

      if (marcoRes?.creado) {
        toast.info(
          marcoRes.msg || 'Se creó el marco inicial vacío (seq 1). Seleccione vistas y acciones.'
        );
      } else if (!marco && avisarSinMarco) {
        toast.info(
          'No hay techo para este rol. Seleccione vistas y acciones y guarde para crearlo.'
        );
      }
    },
    []
  );

  const cargarMarcoParaRol = useCallback(
    async (rolId: string, bootstrap = false, avisarSinMarco = false) => {
      const marcoRes = await getMarcoAfiliadoActivo(rolId, bootstrap);
      aplicarMarcoEnEstado(marcoRes?.marco ?? null, marcoRes ?? undefined, { avisarSinMarco });
      return marcoRes;
    },
    [aplicarMarcoEnEstado]
  );

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, rutasRes, accRes] = await Promise.all([
        getRolesMarcoParametrizables(),
        getAllRoutes(),
        getAccionesCatalogo().catch(() => ({ success: false, data: [], total: 0 })),
      ]);

      const rolesLista = rolesRes?.roles ?? [];
      setRoles(rolesLista);

      if (rolesLista.length === 0) {
        toast.warn('No hay roles corporativos activos para parametrizar.');
        setRolSeleccionadoId(null);
        setMarcoActivo(null);
        setVistasSel(new Set());
        setAccionesSel(new Set());
      } else {
        const rolId = resolverRolPorDefecto(rolesLista, rolSeleccionadoIdRef.current);
        setRolSeleccionadoId(rolId);
        rolSeleccionadoIdRef.current = rolId;
        if (rolId) {
          await cargarMarcoParaRol(rolId, false);
        }
      }

      setRutas((rutasRes?.data ?? []).filter((r) => r.estadoRuta !== false));

      const accionesLista = (accRes?.data ?? []).filter(
        (a) => a._id && a.estadoAccion !== false
      );
      setAcciones(accionesLista);

      if (accionesLista.length === 0) {
        toast.warn(
          accRes?.message ||
            'No se cargaron acciones HTTP. Verifique la colección acciones en BD o Gestión de rutas.'
        );
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [cargarMarcoParaRol]);

  const seleccionarRol = useCallback(
    async (rolId: string) => {
      if (!rolId || rolId === rolSeleccionadoIdRef.current) return;
      setRolSeleccionadoId(rolId);
      rolSeleccionadoIdRef.current = rolId;
      setLoading(true);
      try {
        await cargarMarcoParaRol(rolId, false, true);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Error al cargar marco del rol');
      } finally {
        setLoading(false);
      }
    },
    [cargarMarcoParaRol]
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const filtroVistasNorm = filtroVistas.trim().toLowerCase();
  const filtroAccionesNorm = filtroAcciones.trim().toLowerCase();

  const rutasFiltradas = useMemo(
    () =>
      rutas.filter((r) => {
        if (soloSugeridas && !SUGERENCIAS_AFILIADO.test(`${r.path} ${r.name} ${r.component}`)) {
          return false;
        }
        if (!filtroVistasNorm) return true;
        return `${r.path} ${r.name} ${r.component}`.toLowerCase().includes(filtroVistasNorm);
      }),
    [rutas, filtroVistasNorm, soloSugeridas]
  );

  const accionesFiltradas = useMemo(
    () =>
      acciones.filter((a) => {
        if (!filtroAccionesNorm) return true;
        return `${a.method} ${a.etiquetas} ${a._id} ${a.iud ?? ''}`
          .toLowerCase()
          .includes(filtroAccionesNorm);
      }),
    [acciones, filtroAccionesNorm]
  );

  const seleccionarTodasVistasVisibles = () => {
    setVistasSel((prev) => {
      const next = new Set(prev);
      rutasFiltradas.forEach((r) => next.add(toId(r.iud || r._id)));
      return next;
    });
  };

  const limpiarVistasVisibles = () => {
    setVistasSel((prev) => {
      const next = new Set(prev);
      rutasFiltradas.forEach((r) => next.delete(toId(r.iud || r._id)));
      return next;
    });
  };

  const seleccionarTodasAccionesVisibles = () => {
    setAccionesSel((prev) => {
      const next = new Set(prev);
      accionesFiltradas.forEach((a) => next.add(toId(a._id || a.iud)));
      return next;
    });
  };

  const limpiarAccionesVisibles = () => {
    setAccionesSel((prev) => {
      const next = new Set(prev);
      accionesFiltradas.forEach((a) => next.delete(toId(a._id || a.iud)));
      return next;
    });
  };

  const guardar = async () => {
    if (!rolSeleccionadoId) {
      toast.warn('Seleccione un rol corporativo antes de guardar.');
      return;
    }
    if (vistasSel.size === 0 || accionesSel.size === 0) {
      toast.warn('Seleccione al menos una vista y una acción para el techo del afiliado.');
      return;
    }
    setSaving(true);
    try {
      const res = await guardarMarcoAfiliado({
        vistas: Array.from(vistasSel),
        acciones: Array.from(accionesSel),
        rolCorporativoId: rolSeleccionadoId,
      });
      const r = res?.resultado;
      const syncDetail =
        r != null
          ? ` herenciaCliente: ${r.procesados ?? 0} usuario(s), ${r.omitidos ?? 0} omitido(s).`
          : '';
      const diag = (res as { diagnostico?: { aviso?: string | null; totalUsuariosConRolCorporativo?: number } })
        ?.diagnostico;
      if (diag?.aviso) {
        toast.warn(diag.aviso);
      } else if (r?.omitidos && r.omitidos > 0 && r.motivosOmitidos) {
        const motivos = Object.entries(r.motivosOmitidos)
          .map(([k, n]) => `${k}: ${n}`)
          .join(', ');
        toast.info(`Omitidos (${motivos}). Verifique rolCorporativoId en regisusus.`);
      }
      if (diag?.totalUsuariosConRolCorporativo === 0) {
        toast.warn(
          'Ningún usuario tiene este rol corporativo. El techo queda guardado; herenciaCliente se llena al sincronizar usuarios.'
        );
      }
      toast.success((res?.msg || 'Marco guardado.') + syncDetail);
      await cargarMarcoParaRol(rolSeleccionadoId, false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar marco');
    } finally {
      setSaving(false);
    }
  };

  const aplicarSugeridas = () => {
    setVistasSel((prev) => {
      const next = new Set(prev);
      rutas
        .filter((r) => SUGERENCIAS_AFILIADO.test(`${r.path} ${r.name} ${r.component}`))
        .forEach((r) => next.add(toId(r.iud || r._id)));
      return next;
    });
    setAccionesSel((prev) => {
      const next = new Set(prev);
      acciones
        .filter((a) =>
          SUGERENCIAS_AFILIADO.test(`${a.method} ${a.etiquetas}`) ||
          ['GET', 'POST'].includes(String(a.method || '').toUpperCase())
        )
        .forEach((a) => next.add(toId(a._id || a.iud)));
      return next;
    });
    setSoloSugeridas(true);
    toast.info('Seleccionadas rutas sugeridas y acciones del catálogo. Revise y guarde el techo.');
  };

  const sincronizar = async () => {
    setSyncing(true);
    try {
      const res = await sincronizarPermisosAfiliado();
      const r = res?.resultado;
      toast.success(
        res?.msg ||
          `Sincronización: ${r?.procesados ?? 0} procesados, ${r?.errores ?? 0} errores`
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const sincronizarLote = async () => {
    if (!rolSeleccionadoId) {
      toast.warn('Seleccione un rol corporativo antes de sincronizar.');
      return;
    }
    setSyncingLote(true);
    try {
      const res = await sincronizarLoteAfiliadosAdmin(100, rolSeleccionadoId);
      const r = res?.resultado;
      toast.success(
        res?.msg ||
          `Lote: ${r?.procesados ?? 0} sincronizados, ${r?.omitidos ?? 0} omitidos, ${r?.errores ?? 0} errores`
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al sincronizar lote');
    } finally {
      setSyncingLote(false);
    }
  };

  const toggleVista = (id: string, checked: boolean) => {
    setVistasSel((prev) => toggleSet(prev, id, checked));
  };

  const toggleAccion = (id: string, checked: boolean) => {
    setAccionesSel((prev) => toggleSet(prev, id, checked));
  };

  return {
    loading,
    saving,
    syncing,
    syncingLote,
    roles,
    rolSeleccionadoId,
    rolSeleccionado,
    seleccionarRol,
    marcoActivo,
    filtroVistas,
    setFiltroVistas,
    filtroAcciones,
    setFiltroAcciones,
    accionesTotal: acciones.length,
    soloSugeridas,
    setSoloSugeridas,
    tab,
    setTab,
    vistasSel,
    accionesSel,
    rutasFiltradas,
    accionesFiltradas,
    cargar,
    guardar,
    sincronizar,
    sincronizarLote,
    aplicarSugeridas,
    seleccionarTodasVistasVisibles,
    limpiarVistasVisibles,
    seleccionarTodasAccionesVisibles,
    limpiarAccionesVisibles,
    toggleVista,
    toggleAccion,
  };
}
