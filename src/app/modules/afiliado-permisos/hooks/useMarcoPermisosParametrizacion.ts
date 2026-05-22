import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  getMarcoAfiliadoActivo,
  guardarMarcoAfiliado,
  sincronizarPermisosAfiliado,
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
  const [marcoActivo, setMarcoActivo] = useState<MarcoPermisosAfiliado | null>(null);
  const [rutas, setRutas] = useState<Route[]>([]);
  const [acciones, setAcciones] = useState<AccionOption[]>([]);
  const [vistasSel, setVistasSel] = useState<Set<string>>(new Set());
  const [accionesSel, setAccionesSel] = useState<Set<string>>(new Set());
  const [notas, setNotas] = useState('');
  const [filtro, setFiltro] = useState('');
  const [soloSugeridas, setSoloSugeridas] = useState(false);
  const [tab, setTab] = useState<MarcoCatalogTab>('vistas');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [marcoRes, rutasRes, accRes] = await Promise.all([
        getMarcoAfiliadoActivo(),
        getAllRoutes(),
        getAccionesCatalogo(),
      ]);

      const marco = marcoRes?.marco ?? null;
      setMarcoActivo(marco);
      setNotas(marco?.notas ?? '');

      if (marcoRes?.creado) {
        toast.info(
          marcoRes.msg || 'Se creó el marco inicial vacío (seq 1). Seleccione vistas y acciones.'
        );
      }

      setVistasSel(new Set((marco?.vistas ?? []).map((id) => toId(id))));
      setAccionesSel(new Set((marco?.acciones ?? []).map((id) => toId(id))));
      setRutas((rutasRes?.data ?? []).filter((r) => r.estadoRuta !== false));
      setAcciones((accRes?.data ?? []).filter((a) => a.estadoAccion !== false));
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
        return `${a.method} ${a.etiquetas} ${a._id}`.toLowerCase().includes(filtroNorm);
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
        notas: notas.trim() || null,
      });
      toast.success(res?.msg || 'Marco guardado. El job re-sincronizará afiliados.');
      await cargar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar marco');
    } finally {
      setSaving(false);
    }
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
    marcoActivo,
    notas,
    setNotas,
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
    seleccionarTodasVistasVisibles,
    limpiarVistasVisibles,
    seleccionarTodasAccionesVisibles,
    limpiarAccionesVisibles,
    toggleVista,
    toggleAccion,
  };
}
