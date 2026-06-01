import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  getMarcoAfiliadoActivo,
  getCatalogoMarcoAfiliado,
  guardarMarcoAfiliado,
  sincronizarPermisosAfiliado,
  sincronizarLoteAfiliadosAdmin,
} from '../api/marco.api';
import type { MarcoCatalogTab, MarcoPermisosAfiliado } from '../types/marco.types';
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

export function useMarcoPermisosParametrizacion() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingLote, setSyncingLote] = useState(false);
  const [marcoActivo, setMarcoActivo] = useState<MarcoPermisosAfiliado | null>(null);
  const [rutas, setRutas] = useState<Route[]>([]);
  const [acciones, setAcciones] = useState<AccionOption[]>([]);
  const [vistasSel, setVistasSel] = useState<Set<string>>(new Set());
  const [accionesSel, setAccionesSel] = useState<Set<string>>(new Set());
  const [filtro, setFiltro] = useState('');
  const [soloSugeridas, setSoloSugeridas] = useState(false);
  const [tab, setTab] = useState<MarcoCatalogTab>('vistas');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [marcoRes, rutasRes, catalogoMarco, accRes] = await Promise.all([
        getMarcoAfiliadoActivo(),
        getAllRoutes(),
        getCatalogoMarcoAfiliado().catch(() => null),
        getAccionesCatalogo(),
      ]);

      const marco = marcoRes?.marco ?? null;
      setMarcoActivo(marco);

      if (marcoRes?.creado) {
        toast.info(
          marcoRes.msg || 'Se creó el marco inicial vacío (seq 1). Seleccione vistas y acciones.'
        );
      }

      setVistasSel(new Set((marco?.vistas ?? []).map((id) => toId(id))));
      setAccionesSel(new Set((marco?.acciones ?? []).map((id) => toId(id))));
      setRutas((rutasRes?.data ?? []).filter((r) => r.estadoRuta !== false));

      const accionesMarco = (catalogoMarco?.acciones ?? [])
        .map((a) => ({
          _id: String(a._id || a.iud || ''),
          iud: String(a.iud || a._id || ''),
          method: String(a.method || '').toUpperCase(),
          etiquetas: String(a.etiquetas || ''),
          estadoAccion: a.estadoAccion !== false,
        }))
        .filter((a) => a._id);

      const accionesMerge = new Map<string, AccionOption>();
      for (const a of [...accionesMarco, ...(accRes?.data ?? [])]) {
        if (a._id && a.estadoAccion !== false) accionesMerge.set(a._id, a);
      }
      const accionesLista = [...accionesMerge.values()];
      setAcciones(accionesLista);

      if (accionesLista.length === 0) {
        toast.warn(
          'No se cargaron acciones HTTP. Verifique la colección acciones en BD o cree acciones en Gestión de rutas.'
        );
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const filtroNorm = filtro.trim().toLowerCase();

  const rutasFiltradas = useMemo(
    () =>
      rutas.filter((r) => {
        if (soloSugeridas && !SUGERENCIAS_AFILIADO.test(`${r.path} ${r.name} ${r.component}`)) {
          return false;
        }
        if (!filtroNorm) return true;
        return `${r.path} ${r.name} ${r.component}`.toLowerCase().includes(filtroNorm);
      }),
    [rutas, filtroNorm, soloSugeridas]
  );

  const accionesFiltradas = useMemo(
    () =>
      acciones.filter((a) => {
        if (!filtroNorm) return true;
        return `${a.method} ${a.etiquetas} ${a._id} ${a.iud ?? ''}`
          .toLowerCase()
          .includes(filtroNorm);
      }),
    [acciones, filtroNorm]
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
    if (vistasSel.size === 0 || accionesSel.size === 0) {
      toast.warn('Seleccione al menos una vista y una acción para el techo del afiliado.');
      return;
    }
    setSaving(true);
    try {
      const res = await guardarMarcoAfiliado({
        vistas: Array.from(vistasSel),
        acciones: Array.from(accionesSel),
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
          'Ningún usuario tiene rolCorporativoId. Las vistas/acciones quedan en marcopermisosafiliados; herenciaCliente se llena por usuario al sincronizar.'
        );
      }
      toast.success((res?.msg || 'Marco guardado.') + syncDetail);
      await cargar();
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
    setSyncingLote(true);
    try {
      const res = await sincronizarLoteAfiliadosAdmin(100);
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
    marcoActivo,
    filtro,
    setFiltro,
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
