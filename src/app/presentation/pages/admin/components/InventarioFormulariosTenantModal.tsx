import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import inventarioService from '@/app/services/inventarioService';
import type {
  InventarioConfigTarjeta,
  InventarioJerarquiaSaCounterIndice,
  InventarioTenantGlobalOpcion,
  InventarioTenantSuperAdminOpcion,
} from '@/app/services/inventarioService';
import type { UsuarioOption } from '@/app/services/routesService';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  normalizePathKey,
  resolveModuleCatalogToPathRow as resolveModuleRouteRow,
} from '../inventario/inventarioFormularioPathMatch';
import { isOpaqueDocumentId, normalizePublicIdForApi } from '@/app/utils/entityPublicId';

/** Payload logico enviado al endpoint de inventario (un solo PUT agregado en backend por ruta). */
export type InventarioFormulariosTenantSavePayload = {
  modoAsignacion: 'USUARIO';
  habilitado: boolean;
  soloDios: boolean;
  tenantIds: string[];
  usuarioIds: string[];
  rutas: Array<{ rutaId: string; path: string; name: string; tipoNodo: string }>;
};

type FormRow = {
  id: string;
  name: string;
  path: string;
  tipoNodo: string;
  formulariosConfig?: {
    habilitado?: boolean;
    modoAsignacion?: string;
    tenantIds?: string[];
    usuarioIds?: string[];
    soloDios?: boolean;
  };
};

export type InventarioConfigModule = {
  tab?: string;
  title: string;
  description?: string;
  path: string;
};

/** Contexto de tarjeta ConfigInventario al abrir «Autorizar» en una fila concreta. */
export type InventarioAutorizacionFocusTarjeta = {
  catalogPath: string;
  menuPath?: string;
  tab?: string;
  tarjetaId?: string;
  rutaId?: string | null;
  tenantSuperAdminId?: string | null;
};

type InventarioFormulariosTenantModalProps = {
  modules?: InventarioConfigModule[];
  /** Tras un PUT exitoso (al menos una ruta actualizada); p. ej. refrescar paths en ConfigInventario. */
  onFormulariosAutorizacionApplied?: () => void;
  /** Modal: modulo de inventario + formularios (parametrizacion menu). */
  openParametrizacion?: boolean;
  onOpenParametrizacionChange?: (open: boolean) => void;
  /** Modal: tenant SA, tenant global y usuarios autorizados. */
  openAutorizacion?: boolean;
  onOpenAutorizacionChange?: (open: boolean) => void;
  /** @deprecated Usar openAutorizacion */
  open?: boolean;
  /** @deprecated Usar onOpenAutorizacionChange */
  onOpenChange?: (open: boolean) => void;
  /** Al abrir, preselecciona este modulo del catalogo (path). */
  focusModulePath?: string | null;
  /** Datos de la tarjeta parametrizada (ruta, SA, modulo) para precargar el modal. */
  focusTarjeta?: InventarioAutorizacionFocusTarjeta | null;
  /** Alcance tenantSuperAdmin heredado del formulario padre (p. ej. ConfigInventario / JWT). */
  alcanceTenantSuperAdminId?: string | null;
  /** Si false, no muestra los botones disparadores (solo control externo). */
  showTrigger?: boolean;
};

/** Quita marcas diacriticas para que "inventario" coincida con "inventário" y similares. */
function stripDiacritics(s: string): string {
  try {
    return s.normalize('NFD').replace(/\p{M}/gu, '');
  } catch {
    return s;
  }
}

/** IDs válidos para API: ObjectId legacy o UUID público (iud). */
function esIdApiValido(id: string | null | undefined): boolean {
  return isOpaqueDocumentId(normalizePublicIdForApi(id));
}

function normalizarIdApi(id: string | null | undefined): string {
  const norm = normalizePublicIdForApi(id);
  return esIdApiValido(norm) ? norm : '';
}

/** Filtro por palabras: todas las tokens deben aparecer en name+path+tipoNodo+id (insensible a acentos). */
function rowMatchesNeedle(row: FormRow, needle: string): boolean {
  const raw = needle.trim();
  if (!raw) return true;
  const hay = stripDiacritics(`${row.name} ${row.path} ${row.tipoNodo} ${row.id}`.toLowerCase());
  const tokens = stripDiacritics(raw.toLowerCase())
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (!tokens.length) return true;
  return tokens.every((t) => hay.includes(t));
}

function matchesUsuarioNombreCorreo(u: UsuarioOption, needle: string): boolean {
  const n = needle.trim().toLowerCase();
  if (!n) return true;
  const hay = `${u.nombre} ${u.correo}`.toLowerCase();
  return hay.includes(n);
}

function matchesTenantSuperAdminRow(t: InventarioTenantSuperAdminOpcion, needle: string): boolean {
  const n = needle.trim().toLowerCase();
  if (!n) return true;
  const cod = t.codigoJerarquia != null ? String(t.codigoJerarquia) : '';
  return `${t.label} ${t.iud} ${cod}`.toLowerCase().includes(n);
}

function matchesTenantGlobalRow(t: InventarioTenantGlobalOpcion, needle: string): boolean {
  const n = needle.trim().toLowerCase();
  if (!n) return true;
  const cod = t.codigoJerarquia != null ? String(t.codigoJerarquia) : '';
  return `${t.label} ${t.iud} ${cod}`.toLowerCase().includes(n);
}

function mergeTenantGlobalesListas(
  listas: InventarioTenantGlobalOpcion[][],
): InventarioTenantGlobalOpcion[] {
  const map = new Map<string, InventarioTenantGlobalOpcion>();
  for (const lista of listas) {
    for (const t of lista) {
      if (!map.has(t.iud)) map.set(t.iud, t);
    }
  }
  return [...map.values()];
}

function mergeUsuariosListas(listas: UsuarioOption[][]): UsuarioOption[] {
  const map = new Map<string, UsuarioOption>();
  for (const lista of listas) {
    for (const u of lista) {
      if (!map.has(u.iud)) map.set(u.iud, u);
    }
  }
  return [...map.values()];
}

function mergeSaArbolListas(listas: InventarioTenantSuperAdminOpcion[][]): InventarioTenantSuperAdminOpcion[] {
  const map = new Map<string, InventarioTenantSuperAdminOpcion>();
  for (const lista of listas) {
    for (const t of lista) {
      if (!map.has(t.iud)) map.set(t.iud, t);
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      (a.secuenciaJerarquia ?? Number.MAX_SAFE_INTEGER) - (b.secuenciaJerarquia ?? Number.MAX_SAFE_INTEGER) ||
      String(a.codigoJerarquia || '').localeCompare(String(b.codigoJerarquia || '')),
  );
}

function mergeJerarquiaSaListas(listas: InventarioJerarquiaSaCounterIndice[][]): InventarioJerarquiaSaCounterIndice[] {
  const map = new Map<string, InventarioJerarquiaSaCounterIndice>();
  for (const lista of listas) {
    for (const row of lista) {
      if (!map.has(row.tenantSuperAdminId)) map.set(row.tenantSuperAdminId, row);
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      (a.secuenciaJerarquia ?? Number.MAX_SAFE_INTEGER) - (b.secuenciaJerarquia ?? Number.MAX_SAFE_INTEGER) ||
      String(a.codigoJerarquia || '').localeCompare(String(b.codigoJerarquia || '')),
  );
}

/** Todos los tenantSuperAdmin visibles en la rama (counters + arbol). */
function extraerSaIdsRamaDesdeOpciones(
  saArbolRama: InventarioTenantSuperAdminOpcion[],
  jerarquiaSaCounters: InventarioJerarquiaSaCounterIndice[],
  anclaId?: string | null,
): string[] {
  const ids = new Set<string>();
  jerarquiaSaCounters.forEach((row) => {
    const id = normalizarIdApi(row.tenantSuperAdminId);
    if (id) ids.add(id);
  });
  saArbolRama.forEach((t) => {
    const id = normalizarIdApi(t.iud);
    if (id) ids.add(id);
  });
  if (ids.size) return [...ids];
  const ancla = normalizarIdApi(anclaId ?? null);
  return ancla ? [ancla] : [];
}

function toCheckedMap(ids: string[]): Record<string, boolean> {
  return ids.reduce<Record<string, boolean>>((acc, id) => {
    const norm = normalizarIdApi(id);
    if (norm) acc[norm] = true;
    return acc;
  }, {});
}

function usuarioIdsDesdeFormulariosConfig(rows: FormRow[]): string[] {
  const set = new Set<string>();
  rows.forEach((row) => {
    const ids = Array.isArray(row.formulariosConfig?.usuarioIds) ? row.formulariosConfig?.usuarioIds : [];
    ids?.forEach((id) => {
      const norm = normalizarIdApi(id);
      if (norm) set.add(norm);
    });
  });
  return [...set];
}

function resolverRutaIdDesdeTarjetaConfig(tarjeta: InventarioConfigTarjeta, formRows: FormRow[]): string | null {
  const rid = normalizarIdApi(tarjeta.rutaId);
  if (rid) {
    if (formRows.some((row) => normalizarIdApi(row.id) === rid)) return rid;
    return rid;
  }
  const pathKey = normalizePathKey(tarjeta.path || '');
  if (!pathKey) return null;
  const byPath = formRows.find((row) => normalizePathKey(row.path) === pathKey);
  return byPath ? normalizarIdApi(byPath.id) : null;
}

function tarjetaConfigMatchesNeedle(tarjeta: InventarioConfigTarjeta, needle: string): boolean {
  const raw = needle.trim();
  if (!raw) return true;
  const hay = stripDiacritics(
    `${tarjeta.titulo} ${tarjeta.descripcion} ${tarjeta.path} ${tarjeta.moduloPath || ''} ${tarjeta.tab || ''} ${tarjeta.id} ${tarjeta.tenantSuperAdminId || ''}`.toLowerCase(),
  );
  const tokens = stripDiacritics(raw.toLowerCase())
    .split(/\s+/)
    .filter(Boolean);
  return tokens.every((token) => hay.includes(token));
}

function buildTarjetaConfigPayload(
  tarjeta: InventarioConfigTarjeta | null | undefined,
): {
  tab?: string | null;
  moduloPath?: string | null;
  tituloModulo?: string | null;
  descripcionModulo?: string | null;
  iconKey?: string | null;
} | undefined {
  if (!tarjeta) return undefined;
  return {
    tab: tarjeta.tab ?? null,
    moduloPath: tarjeta.moduloPath ?? null,
    tituloModulo: tarjeta.titulo,
    descripcionModulo: tarjeta.descripcion || null,
    iconKey: tarjeta.iconKey ?? null,
  };
}

function resolveFocusedRouteRow(
  formRows: FormRow[],
  focusTarjeta: InventarioAutorizacionFocusTarjeta | null | undefined,
  focusModulePath: string | null | undefined,
): FormRow | null {
  const rutaId = normalizarIdApi(focusTarjeta?.rutaId ?? null);
  if (rutaId) {
    const byId = formRows.find((row) => normalizarIdApi(row.id) === rutaId);
    if (byId) return byId;
  }

  const menuPath = String(focusTarjeta?.menuPath || '').trim();
  if (menuPath) {
    const { row } = resolveModuleRouteRow(menuPath, formRows);
    if (row) return row;
  }

  const catalogPath = String(focusTarjeta?.catalogPath || focusModulePath || '').trim();
  if (catalogPath) {
    const { row } = resolveModuleRouteRow(catalogPath, formRows);
    if (row) return row;
  }

  const tab = String(focusTarjeta?.tab || '').trim();
  if (tab) {
    const byTabHint = formRows.find((row) => {
      const path = normalizePathKey(row.path);
      return path.includes(`/${tab}`) || path.includes(tab.replace(/-/g, ''));
    });
    if (byTabHint) return byTabHint;
  }

  return null;
}

function resolveCatalogPathForFocus(
  focusTarjeta: InventarioAutorizacionFocusTarjeta | null | undefined,
  focusModulePath: string | null | undefined,
  modules: InventarioConfigModule[],
): string | null {
  const catalogPath = String(focusTarjeta?.catalogPath || focusModulePath || '').trim();
  if (catalogPath) {
    const key = normalizePathKey(catalogPath);
    const match = modules.find((m) => normalizePathKey(m.path) === key);
    return match?.path ?? catalogPath;
  }
  const tab = String(focusTarjeta?.tab || '').trim();
  if (tab) {
    const byTab = modules.find((m) => String(m.tab || '') === tab);
    if (byTab) return byTab.path;
  }
  return null;
}

function usuarioIdsPermitidosParaSa(
  saId: string,
  usuarioIds: string[],
  usuarios: UsuarioOption[],
): string[] {
  const saNorm = normalizarIdApi(saId);
  if (!saNorm) return [];
  const porId = new Map(usuarios.map((u) => [u.iud, u]));
  return usuarioIds.filter((uid) => {
    const u = porId.get(uid);
    if (!u) return false;
    const uSa = normalizarIdApi(u.tenantSuperAdmin);
    return Boolean(uSa && uSa === saNorm);
  });
}

function usuarioPerteneceAlgunaSaMarcada(
  usuarioId: string,
  saIds: string[],
  usuarios: UsuarioOption[],
): boolean {
  return saIds.some((saId) => usuarioIdsPermitidosParaSa(saId, [usuarioId], usuarios).length > 0);
}

export default function InventarioFormulariosTenantModal({
  modules = [],
  onFormulariosAutorizacionApplied,
  openParametrizacion: openParamControlled,
  onOpenParametrizacionChange,
  openAutorizacion: openAuthControlled,
  onOpenAutorizacionChange,
  open: openLegacy,
  onOpenChange: onOpenChangeLegacy,
  focusModulePath = null,
  focusTarjeta = null,
  alcanceTenantSuperAdminId = null,
  showTrigger = true,
}: InventarioFormulariosTenantModalProps): React.ReactElement {
  const [openParamInternal, setOpenParamInternal] = useState(false);
  const [openAuthInternal, setOpenAuthInternal] = useState(false);
  const openParametrizacion = openParamControlled ?? openParamInternal;
  const openAutorizacion = openAuthControlled ?? openLegacy ?? openAuthInternal;
  const modalAbierto = openParametrizacion || openAutorizacion;

  const setOpenParametrizacion = useCallback(
    (next: boolean) => {
      onOpenParametrizacionChange?.(next);
      if (openParamControlled === undefined) setOpenParamInternal(next);
    },
    [onOpenParametrizacionChange, openParamControlled],
  );

  const setOpenAutorizacion = useCallback(
    (next: boolean) => {
      onOpenAutorizacionChange?.(next);
      onOpenChangeLegacy?.(next);
      if (openAuthControlled === undefined && openLegacy === undefined) setOpenAuthInternal(next);
    },
    [onOpenAutorizacionChange, onOpenChangeLegacy, openAuthControlled, openLegacy],
  );
  const [needleRutas, setNeedleRutas] = useState('');
  /** Filtro solo para la lista de TenantSuperAdmin (seleccion de rama). */
  const [needleSa, setNeedleSa] = useState('');
  /** Filtro solo para tenant global ya cargados en la rama marcada. */
  const [needleTenantGlobal, setNeedleTenantGlobal] = useState('');
  const [needleUsuario, setNeedleUsuario] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<FormRow[]>([]);
  const [selectedRutas, setSelectedRutas] = useState<Record<string, boolean>>({});
  const [tenantGlobales, setTenantGlobales] = useState<InventarioTenantGlobalOpcion[]>([]);
  const [tenantSuperAdmins, setTenantSuperAdmins] = useState<InventarioTenantSuperAdminOpcion[]>([]);
  const [saArbolRama, setSaArbolRama] = useState<InventarioTenantSuperAdminOpcion[]>([]);
  const [jerarquiaSaCounters, setJerarquiaSaCounters] = useState<InventarioJerarquiaSaCounterIndice[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([]);
  const [selectedUsuarios, setSelectedUsuarios] = useState<Record<string, boolean>>({});
  const [seleccionSaId, setSeleccionSaId] = useState('');
  /** DIOS: puede marcar varios SA; al guardar se aplica la misma autorizacion a cada uno. */
  const [selectedSaIds, setSelectedSaIds] = useState<Record<string, boolean>>({});
  /** Tenant global de la rama marcados para delimitar alcance de usuarios. */
  const [selectedTenantGlobales, setSelectedTenantGlobales] = useState<Record<string, boolean>>({});
  const [tarjetasConfig, setTarjetasConfig] = useState<InventarioConfigTarjeta[]>([]);
  /** Tarjeta elegida en inventarioconfigtarjetas para alcance + ruta en autorizacion. */
  const [selectedTarjetaConfigId, setSelectedTarjetaConfigId] = useState<string | null>(null);
  const [needleTarjetasConfig, setNeedleTarjetasConfig] = useState('');
  const [esDios, setEsDios] = useState(false);
  const [meta, setMeta] = useState<{
    alcance?: string;
    origenResolucion?: string;
    totalRutasActivas?: number;
    totalFormulariosSubformularios?: number;
    totalMostrados?: number;
    ayuda?: string | null;
    inventarioFormulariosModoAlcance?: string;
    requiereParametrizacionTenantSuperAdmin?: boolean;
    tenantSuperAdminAnclaId?: string | null;
    tenantGlobalJerarquiaOk?: boolean;
    totalTenantGlobalEnRama?: number;
    filtroCorporativoCountersActivo?: boolean;
    formulariosFiltradosPorHerencia?: boolean;
    herenciaVistasVacias?: boolean;
    totalVistasHerenciaRama?: number;
    ejecutorBypassHerencia?: boolean;
    totalSaEnArbolRama?: number;
    totalSaArbolRama?: number;
    totalUsuariosRama?: number;
    jwtTenantSuperAdminCanonicoId?: string | null;
    tenantSuperAdminRolParametrizado?: { id: string; nombre: string } | null;
    rolSesionId?: string | null;
    rolSesionNombre?: string | null;
    resolucionSaOk?: boolean;
    rolParametrizadoCoincideSesion?: boolean;
    jwtSaDesincronizado?: boolean;
    diagnosticoRamaUsuarios?: {
      saIdsEnRama?: string[];
      totalTgEnRama?: number;
      totalCorpEnRama?: number;
      totalRolesEnRama?: number;
      propietariosSa?: Array<{ usuarioId: string; saId: string }>;
      documentosRegisCandidatos?: number;
      rechazadosPorFiltro?: number;
      saAnclaResuelto?: string | null;
    } | null;
  } | null>(null);
  /** Ultima ruta marcada en el listado; el panel derecho describe esta fila. */
  const [rutaContextoId, setRutaContextoId] = useState<string | null>(null);
  /** Modulo del catalogo (path unico) sobre el que se declara la parametrizacion; obligatorio si hay `modules`. */
  const [moduloParametrizarPath, setModuloParametrizarPath] = useState<string | null>(null);

  const moduleRouteMatches = useMemo(() => {
    return modules.map((module) => {
      const { row, kind } = resolveModuleRouteRow(module.path, rows, { tab: module.tab });
      return {
        ...module,
        route: row,
        matchKind: kind,
      };
    });
  }, [modules, rows]);

  const rutaContextoRow = useMemo(
    () => (rutaContextoId ? rows.find((r) => r.id === rutaContextoId) ?? null : null),
    [rutaContextoId, rows],
  );

  const tituloCatalogoParaContexto = useMemo(() => {
    if (moduloParametrizarPath) {
      const m = modules.find((x) => x.path === moduloParametrizarPath);
      if (m) return m.title;
    }
    if (!rutaContextoRow) return null;
    const exact = modules.find(
      (m) => normalizePathKey(m.path) === normalizePathKey(rutaContextoRow.path),
    );
    if (exact) return exact.title;
    for (const m of modules) {
      const { row } = resolveModuleRouteRow(m.path, rows);
      if (row?.id === rutaContextoRow.id) return m.title;
    }
    return null;
  }, [rutaContextoRow, modules, rows, moduloParametrizarPath]);

  const moduloParametrizarInfo = useMemo(
    () => (moduloParametrizarPath ? modules.find((m) => m.path === moduloParametrizarPath) ?? null : null),
    [moduloParametrizarPath, modules],
  );

  const moduloParametrizarMatch = useMemo(
    () =>
      moduloParametrizarPath
        ? moduleRouteMatches.find((m) => normalizePathKey(m.path) === normalizePathKey(moduloParametrizarPath)) ?? null
        : null,
    [moduleRouteMatches, moduloParametrizarPath],
  );

  const moduloParametrizarTieneRuta = !modules.length || Boolean(moduloParametrizarMatch?.route);

  const tarjetaSeleccionadaAutorizacion = useMemo(() => {
    if (!selectedTarjetaConfigId) return null;
    return tarjetasConfig.find((t) => t.id === selectedTarjetaConfigId) ?? null;
  }, [selectedTarjetaConfigId, tarjetasConfig]);

  const tarjetaModuloActiva = useMemo(() => {
    if (tarjetaSeleccionadaAutorizacion) return tarjetaSeleccionadaAutorizacion;
    if (focusTarjeta?.tarjetaId) {
      const byId = tarjetasConfig.find((t) => t.id === focusTarjeta.tarjetaId);
      if (byId) return byId;
    }
    if (!moduloParametrizarPath) return null;
    const key = normalizePathKey(moduloParametrizarPath);
    return (
      tarjetasConfig.find((t) => normalizePathKey(t.moduloPath || '') === key)
      ?? tarjetasConfig.find((t) => normalizePathKey(t.path || '') === key)
      ?? tarjetasConfig.find(
        (t) => moduloParametrizarInfo?.tab && t.tab === moduloParametrizarInfo.tab,
      )
      ?? null
    );
  }, [tarjetasConfig, moduloParametrizarPath, moduloParametrizarInfo, focusTarjeta?.tarjetaId, tarjetaSeleccionadaAutorizacion]);

  const refreshTarjetasConfig = useCallback(async (saQuery?: string) => {
    const saParam = saQuery && esIdApiValido(saQuery) ? normalizePublicIdForApi(saQuery) : undefined;
    try {
      const data = await inventarioService.listarTarjetasConfig(saParam);
      setTarjetasConfig(data);
    } catch {
      setTarjetasConfig([]);
    }
  }, []);

  /** Agrega tenant global + usuarios de uno o varios SA sin resetear checkboxes marcados. */
  const refreshRamasSeleccionadas = useCallback(async (saIds: string[]) => {
    const valid = [
      ...new Set(
        saIds.map((id) => normalizePublicIdForApi(id)).filter((id) => esIdApiValido(id)),
      ),
    ];
    if (!valid.length) {
      setTenantGlobales([]);
      setUsuarios([]);
      setSaArbolRama([]);
      setJerarquiaSaCounters([]);
      setMeta((prev) =>
        prev
          ? {
              ...prev,
              tenantGlobalJerarquiaOk: false,
              totalTenantGlobalEnRama: 0,
            }
          : null,
      );
      return;
    }

    setLoading(true);
    try {
      const responses = await Promise.all(
        valid.map((id) => inventarioService.obtenerFormulariosAutorizacionOpciones(id)),
      );
      const mergedTg = mergeTenantGlobalesListas(responses.map((r) => r.tenantGlobales || []));
      const mergedUsuarios = mergeUsuariosListas(responses.map((r) => r.usuarios || []));
      const mergedSaArbol = mergeSaArbolListas(responses.map((r) => r.saArbolRama || []));
      const mergedJerarquia = mergeJerarquiaSaListas(responses.map((r) => r.jerarquiaSaCounters || []));
      setTenantGlobales(mergedTg);
      setUsuarios(mergedUsuarios);
      setSaArbolRama(mergedSaArbol);
      setJerarquiaSaCounters(mergedJerarquia);
      setSelectedTenantGlobales((prev) => {
        const next: Record<string, boolean> = {};
        mergedTg.forEach((tg) => {
          const id = normalizarIdApi(tg.iud);
          if (!id) return;
          next[id] = prev[id] ?? true;
        });
        return next;
      });
      setSelectedUsuarios((prev) => {
        const mergedIds = new Set(mergedUsuarios.map((u) => u.iud));
        const next: Record<string, boolean> = {};
        Object.entries(prev).forEach(([id, checked]) => {
          if (checked && mergedIds.has(id)) next[id] = true;
        });
        const yaMarcados = Object.values(next).some(Boolean);
        if (!yaMarcados && mergedUsuarios.length === 1) {
          next[mergedUsuarios[0].iud] = true;
        }
        return next;
      });
      setSeleccionSaId(valid[valid.length - 1]);
      const lastMeta = responses[responses.length - 1]?.meta;
      setMeta((prev) => ({
        ...(prev || {}),
        ...(lastMeta || {}),
        tenantGlobalJerarquiaOk: mergedTg.length > 0,
        totalTenantGlobalEnRama: mergedTg.length,
        totalSaArbolRama: mergedSaArbol.length,
        totalSaEnArbolRama: mergedJerarquia.length,
        totalUsuariosRama: mergedUsuarios.length,
        inventarioFormulariosModoAlcance:
          valid.length > 1 ? 'dios_multi_sa' : lastMeta?.inventarioFormulariosModoAlcance ?? prev?.inventarioFormulariosModoAlcance,
      }));
      if (mergedUsuarios.length === 0) {
        const diag = lastMeta?.diagnosticoRamaUsuarios;
        const canon = lastMeta?.jwtTenantSuperAdminCanonicoId || '—';
        const rolP = lastMeta?.tenantSuperAdminRolParametrizado;
        toast.info(
          `Sin usuarios en rama. SA canónico: ${canon.slice(-8)} · rol parametrizado: ${rolP?.nombre || '—'} · candidatos Regis: ${diag?.documentosRegisCandidatos ?? 0} · rechazados: ${diag?.rechazadosPorFiltro ?? 0}`,
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cargar ramas';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const aplicarAlcanceDesdeTarjetaConfig = useCallback(
    async (tarjeta: InventarioConfigTarjeta) => {
      setSelectedTarjetaConfigId(tarjeta.id);

      const saId = normalizarIdApi(tarjeta.tenantSuperAdminId);
      if (saId) {
        const preview = await inventarioService.obtenerFormulariosAutorizacionOpciones(saId);
        const branchSaIds = extraerSaIdsRamaDesdeOpciones(
          preview.saArbolRama || [],
          preview.jerarquiaSaCounters || [],
          saId,
        );
        const saTargets = branchSaIds.length ? branchSaIds : [saId];
        setSelectedSaIds(Object.fromEntries(saTargets.map((id) => [id, true])));
        setSeleccionSaId(saId);
        await refreshRamasSeleccionadas(saTargets);
        await refreshTarjetasConfig(saId);
      }

      const rutaId = resolverRutaIdDesdeTarjetaConfig(tarjeta, rows);
      if (rutaId) {
        setSelectedRutas({ [rutaId]: true });
        setRutaContextoId(rutaId);
        const row = rows.find((r) => normalizarIdApi(r.id) === rutaId);
        if (row) {
          const usuarioIds = usuarioIdsDesdeFormulariosConfig([row]);
          if (usuarioIds.length) {
            setSelectedUsuarios((prev) => {
              const next = { ...prev };
              usuarioIds.forEach((uid) => {
                next[uid] = true;
              });
              return next;
            });
          }
        }
      }

      if (tarjeta.moduloPath) {
        const mod = modules.find(
          (m) => normalizePathKey(m.path) === normalizePathKey(tarjeta.moduloPath || ''),
        );
        if (mod) setModuloParametrizarPath(mod.path);
      } else if (tarjeta.path) {
        const mod = modules.find((m) => normalizePathKey(m.path) === normalizePathKey(tarjeta.path));
        if (mod) setModuloParametrizarPath(mod.path);
      }
    },
    [rows, modules, refreshRamasSeleccionadas, refreshTarjetasConfig],
  );

  /** Carga catalogo de formularios y lista de SA (no pisa la seleccion multiple). */
  const loadCatalogo = useCallback(async () => {
    setLoading(true);
    try {
      const saTarjeta = normalizarIdApi(
        focusTarjeta?.tenantSuperAdminId ?? alcanceTenantSuperAdminId ?? null,
      );
      const data = await inventarioService.obtenerFormulariosAutorizacionOpciones(saTarjeta || undefined);
      const formRows: FormRow[] = (data.formularios || []).map((f) => ({
        id: f.id,
        name: f.name,
        path: f.path,
        tipoNodo: f.tipoNodo,
        formulariosConfig: f.formulariosConfig,
      }));
      const focusedRow = resolveFocusedRouteRow(formRows, focusTarjeta, focusModulePath);
      const selectedByModule: Record<string, boolean> = {};
      if (focusedRow) {
        selectedByModule[focusedRow.id] = true;
      } else if (focusModulePath || focusTarjeta) {
        /* tarjeta sin ruta resuelta: no marcar otras filas */
      } else {
        const modulePathSet = new Set(modules.map((module) => normalizePathKey(module.path)));
        formRows.forEach((row) => {
          if (modulePathSet.has(normalizePathKey(row.path))) selectedByModule[row.id] = true;
        });
      }
      const selectedRows = Object.keys(selectedByModule).length
        ? formRows.filter((row) => selectedByModule[row.id])
        : [];
      const usuariosParametrizados = usuarioIdsDesdeFormulariosConfig(selectedRows);
      setRows(formRows);
      setSelectedRutas(selectedByModule);
      setRutaContextoId(focusedRow?.id ?? selectedRows[0]?.id ?? null);
      setTenantSuperAdmins(data.tenantSuperAdmins || []);
      setSaArbolRama(data.saArbolRama || []);
      setJerarquiaSaCounters(data.jerarquiaSaCounters || []);
      setSelectedUsuarios(toCheckedMap(usuariosParametrizados));
      setEsDios(Boolean(data.policy?.esDios));
      setMeta(data.meta ?? null);

      const anclaMeta = data.meta?.tenantSuperAdminAnclaId ? String(data.meta.tenantSuperAdminAnclaId) : '';
      const ancla = saTarjeta || anclaMeta;
      const branchSaIds = extraerSaIdsRamaDesdeOpciones(
        data.saArbolRama || [],
        data.jerarquiaSaCounters || [],
        ancla,
      );
      if (branchSaIds.length > 0) {
        setSelectedSaIds(Object.fromEntries(branchSaIds.map((id) => [id, true])));
        setSeleccionSaId(ancla || branchSaIds[0]);
      } else if (ancla) {
        setSeleccionSaId(ancla);
        setSelectedSaIds({ [ancla]: true });
      } else {
        setSeleccionSaId('');
        setSelectedSaIds({});
      }

      await refreshTarjetasConfig(ancla || branchSaIds[0] || undefined);

      const focusTarjetaId = normalizarIdApi(focusTarjeta?.tarjetaId);
      if (focusTarjetaId) {
        setSelectedTarjetaConfigId(focusTarjetaId);
      }

      if (branchSaIds.length > 0) {
        await refreshRamasSeleccionadas(branchSaIds);
      } else if (ancla) {
        setTenantGlobales(data.tenantGlobales || []);
        setUsuarios(data.usuarios || []);
        setSelectedTenantGlobales(
          toCheckedMap((data.tenantGlobales || []).map((t) => t.iud)),
        );
        if (usuariosParametrizados.length) {
          setSelectedUsuarios((prev) => {
            const next = { ...prev };
            usuariosParametrizados.forEach((id) => {
              next[id] = true;
            });
            return next;
          });
        }
      } else {
        setTenantGlobales(data.tenantGlobales || []);
        setUsuarios(data.usuarios || []);
        setSelectedTenantGlobales(
          toCheckedMap((data.tenantGlobales || []).map((t) => t.iud)),
        );
      }

      if (!data.policy?.esDios) {
        toast.info('Solo el rol DIOS puede persistir formulariosConfig en rutas. Podras revisar datos pero no guardar.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cargar datos';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [focusModulePath, focusTarjeta, alcanceTenantSuperAdminId, modules, refreshTarjetasConfig, refreshRamasSeleccionadas]);

  useEffect(() => {
    if (!modalAbierto) return;
    setNeedleRutas('');
    setSeleccionSaId('');
    setSelectedSaIds({});
    setSaArbolRama([]);
    setJerarquiaSaCounters([]);
    setTarjetasConfig([]);
    setNeedleSa('');
    setNeedleTenantGlobal('');
    setNeedleUsuario('');
    setNeedleTarjetasConfig('');
    setSelectedTarjetaConfigId(null);
    setSelectedTenantGlobales({});
    const catalogMatch = resolveCatalogPathForFocus(focusTarjeta, focusModulePath, modules);
    setModuloParametrizarPath(catalogMatch);
    void loadCatalogo();
  }, [modalAbierto, loadCatalogo, focusModulePath, focusTarjeta, modules]);

  const usarSaMultiSelect = esDios && tenantSuperAdmins.length > 0;

  const saIdsMarcados = useMemo(
    () => Object.entries(selectedSaIds).filter(([, v]) => v).map(([k]) => k),
    [selectedSaIds],
  );

  const filteredTarjetasConfigAuth = useMemo(() => {
    const saSet = new Set(saIdsMarcados.map((id) => normalizarIdApi(id)).filter(Boolean));
    return tarjetasConfig.filter((tarjeta) => {
      if (saSet.size) {
        const saTarjeta = normalizarIdApi(tarjeta.tenantSuperAdminId);
        if (saTarjeta && !saSet.has(saTarjeta)) return false;
      }
      return tarjetaConfigMatchesNeedle(tarjeta, needleTarjetasConfig);
    });
  }, [tarjetasConfig, saIdsMarcados, needleTarjetasConfig]);

  useEffect(() => {
    if (!openAutorizacion) return;
    const saQuery = saIdsMarcados[0] || seleccionSaId || undefined;
    void refreshTarjetasConfig(saQuery);
  }, [openAutorizacion, saIdsMarcados, seleccionSaId, refreshTarjetasConfig]);

  useEffect(() => {
    if (!openAutorizacion || !tarjetasConfig.length) return;
    const focusId = normalizarIdApi(focusTarjeta?.tarjetaId);
    if (!focusId) return;
    const tarjeta = tarjetasConfig.find((t) => normalizarIdApi(t.id) === focusId);
    if (!tarjeta) return;
    if (selectedTarjetaConfigId === tarjeta.id) return;
    void aplicarAlcanceDesdeTarjetaConfig(tarjeta);
  }, [
    openAutorizacion,
    tarjetasConfig,
    focusTarjeta?.tarjetaId,
    selectedTarjetaConfigId,
    aplicarAlcanceDesdeTarjetaConfig,
  ]);

  const resolverSaIdsParaGuardar = (): string[] => {
    const normList = (ids: string[]) =>
      [...new Set(ids.map((id) => normalizarIdApi(id)).filter(Boolean))];

    if (usarSaMultiSelect) {
      const marcados = normList(saIdsMarcados);
      if (marcados.length) return marcados;
    }

    const anclaRaw =
      meta?.tenantSuperAdminAnclaId ||
      meta?.jwtTenantSuperAdminCanonicoId ||
      seleccionSaId ||
      saIdsMarcados[0] ||
      '';
    const ancla = normalizarIdApi(anclaRaw);
    if (ancla) return [ancla];

    return normList(saIdsMarcados);
  };

  useEffect(() => {
    setRutaContextoId((ctx) => {
      if (ctx && selectedRutas[ctx]) return ctx;
      const ids = Object.entries(selectedRutas)
        .filter(([, v]) => v)
        .map(([k]) => k);
      return ids[0] ?? null;
    });
  }, [selectedRutas]);

  const filteredRutas = useMemo(
    () => {
      const base =
        modules.length > 0 && moduloParametrizarMatch?.route
          ? rows.filter((r) => r.id === moduloParametrizarMatch.route?.id)
          : rows;
      return base.filter((r) => rowMatchesNeedle(r, needleRutas));
    },
    [modules.length, moduloParametrizarMatch?.route, moduloParametrizarTieneRuta, rows, needleRutas],
  );

  const filteredTenantGlobales = useMemo(
    () => tenantGlobales.filter((t) => matchesTenantGlobalRow(t, needleTenantGlobal)),
    [tenantGlobales, needleTenantGlobal],
  );

  const filteredTenantSuperAdmins = useMemo(
    () => tenantSuperAdmins.filter((t) => matchesTenantSuperAdminRow(t, needleSa)),
    [tenantSuperAdmins, needleSa],
  );

  const toggleSa = (id: string, checked: boolean): void => {
    setSelectedSaIds((prev) => {
      const next = { ...prev, [id]: checked };
      const marcados = Object.entries(next)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (checked) setSeleccionSaId(id);
      else if (seleccionSaId === id) setSeleccionSaId(marcados[marcados.length - 1] || '');
      void refreshRamasSeleccionadas(marcados);
      void refreshTarjetasConfig(marcados[marcados.length - 1] || undefined);
      return next;
    });
  };

  const selectAllSaVisible = (checked: boolean): void => {
    const visibles = filteredTenantSuperAdmins;
    if (checked) {
      const next: Record<string, boolean> = { ...selectedSaIds };
      visibles.forEach((t) => {
        next[t.iud] = true;
      });
      const marcados = Object.entries(next)
        .filter(([, v]) => v)
        .map(([k]) => k);
      setSelectedSaIds(next);
      if (marcados.length) setSeleccionSaId(marcados[marcados.length - 1]);
      void refreshRamasSeleccionadas(marcados);
      return;
    }

    if (needleSa.trim()) {
      const next = { ...selectedSaIds };
      visibles.forEach((t) => {
        delete next[t.iud];
      });
      const marcados = Object.entries(next)
        .filter(([, v]) => v)
        .map(([k]) => k);
      setSelectedSaIds(next);
      setSeleccionSaId(marcados[marcados.length - 1] || '');
      void refreshRamasSeleccionadas(marcados);
      return;
    }

    setSelectedSaIds({});
    setSeleccionSaId('');
    void refreshRamasSeleccionadas([]);
  };

  const usuariosEnAlcanceMarcado = useMemo(() => {
    const saSet = new Set(saIdsMarcados.map((id) => normalizarIdApi(id)).filter(Boolean));
    const tgMarcados = Object.entries(selectedTenantGlobales)
      .filter(([, v]) => v)
      .map(([k]) => normalizarIdApi(k))
      .filter(Boolean);
    const tgSet = new Set(tgMarcados);
    const hayTgEnRama = tenantGlobales.length > 0;

    return usuarios.filter((u) => {
      const uSa = normalizarIdApi(u.tenantSuperAdmin);
      const uTg = normalizarIdApi(u.tenantGlobal);
      if (saSet.size && uSa && !saSet.has(uSa)) return false;
      if (hayTgEnRama && tgSet.size > 0 && uTg && !tgSet.has(uTg)) return false;
      return true;
    });
  }, [usuarios, saIdsMarcados, selectedTenantGlobales, tenantGlobales.length]);

  const filteredUsuarios = useMemo(
    () => usuariosEnAlcanceMarcado.filter((u) => matchesUsuarioNombreCorreo(u, needleUsuario)),
    [usuariosEnAlcanceMarcado, needleUsuario],
  );

  const rutaIdsMarcados = useMemo(
    () => Object.entries(selectedRutas).filter(([, v]) => v).map(([k]) => k),
    [selectedRutas],
  );

  const resolverAlcanceDesdeFormulario = useCallback((): string[] => {
    const fromFocus = normalizarIdApi(focusTarjeta?.tenantSuperAdminId ?? null);
    const fromProp = normalizarIdApi(alcanceTenantSuperAdminId ?? null);
    const fromMeta = normalizarIdApi(
      meta?.tenantSuperAdminAnclaId || meta?.jwtTenantSuperAdminCanonicoId || '',
    );
    const id = fromFocus || fromProp || fromMeta;
    return id ? [id] : [];
  }, [
    focusTarjeta?.tenantSuperAdminId,
    alcanceTenantSuperAdminId,
    meta?.tenantSuperAdminAnclaId,
    meta?.jwtTenantSuperAdminCanonicoId,
  ]);

  const alcanceParametrizacionIds = useMemo(
    () => resolverAlcanceDesdeFormulario(),
    [resolverAlcanceDesdeFormulario],
  );

  const alcanceParametrizacionLabel = useMemo(() => {
    const id = alcanceParametrizacionIds[0];
    if (!id) return null;
    const sa = tenantSuperAdmins.find((t) => normalizarIdApi(t.iud) === id);
    return sa?.label || `TenantSuperAdmin …${id.slice(-8)}`;
  }, [alcanceParametrizacionIds, tenantSuperAdmins]);

  const mostrarSelectorSa =
    tenantSuperAdmins.length > 0 &&
    (Boolean(meta?.requiereParametrizacionTenantSuperAdmin) ||
      meta?.inventarioFormulariosModoAlcance === 'jwt_sa' ||
      meta?.inventarioFormulariosModoAlcance === 'dios_param' ||
      meta?.inventarioFormulariosModoAlcance === 'dios_param_jwt' ||
      meta?.inventarioFormulariosModoAlcance === 'dios_param_propietario' ||
      meta?.inventarioFormulariosModoAlcance === 'dios_multi_sa');

  const mostrarSelectorSaEnAutorizacion =
    mostrarSelectorSa && alcanceParametrizacionIds.length === 0;

  const toggleRuta = (id: string, checked: boolean): void => {
    setSelectedRutas((prev) => ({ ...prev, [id]: checked }));
    if (checked) setRutaContextoId(id);
  };

  const toggleModuloParametrizar = (modulePath: string, checked: boolean): void => {
    if (checked) {
      const match = moduleRouteMatches.find((m) => normalizePathKey(m.path) === normalizePathKey(modulePath));
      setModuloParametrizarPath(modulePath);
      if (match?.route) {
        setSelectedRutas({ [match.route.id]: true });
        setRutaContextoId(match.route.id);
      } else {
        setSelectedRutas({});
        setRutaContextoId(null);
      }
      return;
    }
    else setModuloParametrizarPath((prev) => (prev === modulePath ? null : prev));
  };

  const toggleUsuario = (id: string, checked: boolean): void => {
    setSelectedUsuarios((prev) => ({ ...prev, [id]: checked }));
  };

  const toggleTenantGlobal = (id: string, checked: boolean): void => {
    setSelectedTenantGlobales((prev) => ({ ...prev, [id]: checked }));
  };

  const selectAllTenantGlobalVisible = (checked: boolean): void => {
    const next: Record<string, boolean> = { ...selectedTenantGlobales };
    filteredTenantGlobales.forEach((t) => {
      next[t.iud] = checked;
    });
    setSelectedTenantGlobales(next);
  };

  const selectAllSaArbolVisible = (checked: boolean): void => {
    const ids = saArbolRama.map((t) => normalizarIdApi(t.iud)).filter(Boolean);
    if (!ids.length) return;
    setSelectedSaIds((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = checked;
      });
      const marcados = Object.entries(next)
        .filter(([, v]) => v)
        .map(([k]) => k);
      void refreshRamasSeleccionadas(marcados);
      return next;
    });
  };

  const selectAllRutasVisible = (checked: boolean): void => {
    const next: Record<string, boolean> = { ...selectedRutas };
    filteredRutas.forEach((r) => {
      next[r.id] = checked;
    });
    setSelectedRutas(next);
    if (checked && filteredRutas.length) setRutaContextoId(filteredRutas[0].id);
  };

  const selectAllUsuariosVisible = (checked: boolean): void => {
    const next: Record<string, boolean> = { ...selectedUsuarios };
    filteredUsuarios.forEach((u) => {
      next[u.iud] = checked;
    });
    setSelectedUsuarios(next);
  };

  const buildPayload = (): InventarioFormulariosTenantSavePayload => {
    const rutaIds = Object.entries(selectedRutas).filter(([, v]) => v).map(([k]) => k);
    const usuarioIds = Object.entries(selectedUsuarios).filter(([, v]) => v).map(([k]) => k);
    const meta = new Map(rows.map((r) => [r.id, r]));
    const modoAsignacion: 'USUARIO' = 'USUARIO';
    return {
      modoAsignacion,
      habilitado: true,
      soloDios: false,
      tenantIds: [] as string[],
      usuarioIds,
      rutas: rutaIds.map((id) => {
        const r = meta.get(id);
        return {
          rutaId: id,
          path: r?.path || '',
          name: r?.name || '',
          tipoNodo: r?.tipoNodo || '',
        };
      }),
    };
  };

  const ejecutarGuardado = async (
    payload: InventarioFormulariosTenantSavePayload,
    opts: { cerrarAutorizacion?: boolean; cerrarParametrizacion?: boolean } = {},
  ): Promise<void> => {
    const saIdsGuardar = resolverSaIdsParaGuardar();
    if (esDios && !saIdsGuardar.length) {
      toast.warning(
        usarSaMultiSelect && saIdsMarcados.length > 0
          ? 'El TenantSuperAdmin marcado no tiene un id válido. Vuelve a marcarlo en la lista.'
          : usarSaMultiSelect
            ? 'Marca al menos un TenantSuperAdmin en la lista (o usa «Marcar todos»).'
            : 'Elige un tenantSuperAdmin valido (rama con tenants y usuarios) antes de guardar.',
      );
      return;
    }

    const saTargets = esDios ? saIdsGuardar : saIdsGuardar.slice(0, 1);
    const usuariosFueraDeRama = payload.usuarioIds.filter(
      (uid) => !usuarioPerteneceAlgunaSaMarcada(uid, saTargets, usuarios),
    );
    if (saTargets.length > 1 && usuariosFueraDeRama.length) {
      toast.error(
        'Hay usuarios marcados que no pertenecen a ninguno de los Tenant SuperAdmin seleccionados. Quita esos usuarios o marca la rama correcta.',
      );
      return;
    }

    const rutaIds = payload.rutas.map((r) => r.rutaId);
    setSaving(true);
    try {
      const moduloSeleccionado = modules.find(
        (m) => normalizePathKey(m.path) === normalizePathKey(moduloParametrizarPath || ''),
      );
      const tarjetaConfigBody =
        buildTarjetaConfigPayload(tarjetaSeleccionadaAutorizacion || tarjetaModuloActiva)
        ?? (moduloSeleccionado
          ? {
              tab: moduloSeleccionado.tab || null,
              moduloPath: moduloSeleccionado.path,
              tituloModulo: moduloSeleccionado.title,
              descripcionModulo: moduloSeleccionado.description || null,
            }
          : undefined);

      let totalActualizadas = 0;
      const todosFallos: Array<{ rutaId: string; ok: boolean; error?: string }> = [];

      if (saTargets.length > 1) {
        const { actualizadas, resultados } = await inventarioService.aplicarFormulariosAutorizacion({
          rutaIds,
          tenantIds: payload.tenantIds,
          usuarioIds: payload.usuarioIds,
          tenantSuperAdminId: saTargets[0],
          tenantSuperAdminIds: saTargets,
          tarjetaConfig: tarjetaConfigBody,
        });
        totalActualizadas = actualizadas;
        todosFallos.push(...resultados.filter((r) => !r.ok));
      } else {
        for (const idSa of saTargets) {
          const { actualizadas, resultados } = await inventarioService.aplicarFormulariosAutorizacion({
            rutaIds,
            tenantIds: payload.tenantIds,
            usuarioIds: payload.usuarioIds,
            tenantSuperAdminId: idSa,
            tarjetaConfig: tarjetaConfigBody,
          });
          totalActualizadas += actualizadas;
          todosFallos.push(...resultados.filter((r) => !r.ok));
        }
      }

      const fallos = todosFallos;
      if (totalActualizadas > 0) {
        toast.success(
          saTargets.length > 1
            ? `Actualizadas ${totalActualizadas} ruta(s) en ${saTargets.length} tenant(s) SuperAdmin.`
            : tarjetaConfigBody && !opts.cerrarAutorizacion
              ? `Parametrizacion de menu guardada (${totalActualizadas} ruta(s)).`
              : `Actualizadas ${totalActualizadas} ruta(s) via inventario.`,
        );
      }
      if (fallos.length) {
        toast.error(`${fallos.length} ruta(s) fallaron: ${fallos.map((f) => f.error || f.rutaId).join('; ')}`);
      }
      if (totalActualizadas > 0) {
        onFormulariosAutorizacionApplied?.();
        await refreshTarjetasConfig(seleccionSaId || saIdsGuardar[0]);
      }
      if (fallos.length === 0 && totalActualizadas > 0) {
        if (opts.cerrarAutorizacion) setOpenAutorizacion(false);
        if (opts.cerrarParametrizacion) setOpenParametrizacion(false);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const puedeGuardarParametrizacion = Boolean(
    esDios
    && !loading
    && !saving
    && (!modules.length || moduloParametrizarPath)
    && rutaIdsMarcados.length > 0
    && alcanceParametrizacionIds.length > 0,
  );

  const guardarParametrizacion = async (): Promise<void> => {
    if (!esDios) {
      toast.error('Se requiere rol DIOS para guardar parametrizacion de menu.');
      return;
    }
    if (modules.length > 0 && !moduloParametrizarPath) {
      toast.warning('Marca que modulo de inventario vas a parametrizar.');
      return;
    }
    const rutaIds = rutaIdsMarcados;
    if (!rutaIds.length) {
      toast.warning('Selecciona al menos un formulario o subformulario.');
      return;
    }

    const saIdsGuardar = alcanceParametrizacionIds;
    if (!saIdsGuardar.length) {
      toast.warning(
        'Sin alcance tenantSuperAdmin desde ConfigInventario. Abre el modal desde una tarjeta o con sesion que tenga ancla en el JWT.',
      );
      return;
    }

    const moduloSeleccionado = modules.find(
      (m) => normalizePathKey(m.path) === normalizePathKey(moduloParametrizarPath || ''),
    );
    const tarjetaConfig = moduloSeleccionado
      ? {
          tab: moduloSeleccionado.tab || null,
          moduloPath: moduloSeleccionado.path,
          tituloModulo: moduloSeleccionado.title,
          descripcionModulo: moduloSeleccionado.description || null,
        }
      : tarjetaSeleccionadaAutorizacion
        ? buildTarjetaConfigPayload(tarjetaSeleccionadaAutorizacion)
        : undefined;

    if (!tarjetaConfig?.moduloPath && !tarjetaConfig?.tituloModulo) {
      toast.warning('No se pudo construir la metadata del modulo para la tarjeta.');
      return;
    }

    setSaving(true);
    try {
      let totalUpserted = 0;
      for (const saId of saIdsGuardar) {
        const { upserted } = await inventarioService.guardarParametrizacionTarjeta({
          rutaIds,
          tenantSuperAdminId: saId,
          tarjetaConfig,
        });
        totalUpserted += upserted;
      }
      if (totalUpserted > 0) {
        toast.success(
          `Parametrizacion guardada en inventarioconfigtarjetas (${totalUpserted} tarjeta(s)). Ahora abre Autorizacion de formulario para asignar usuarios.`,
        );
        onFormulariosAutorizacionApplied?.();
        await refreshTarjetasConfig(saIdsGuardar[0]);
      } else {
        toast.info('Sin cambios en inventarioconfigtarjetas.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar parametrizacion';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const guardar = async (): Promise<void> => {
    if (!esDios) {
      toast.error('Se requiere rol DIOS para guardar formulariosConfig.');
      return;
    }
    const payload = buildPayload();
    if (!payload.rutas.length && tarjetaSeleccionadaAutorizacion) {
      const rutaIdTarjeta = resolverRutaIdDesdeTarjetaConfig(tarjetaSeleccionadaAutorizacion, rows);
      if (rutaIdTarjeta) {
        const row = rows.find((r) => normalizarIdApi(r.id) === rutaIdTarjeta);
        payload.rutas = [{
          rutaId: rutaIdTarjeta,
          path: row?.path || tarjetaSeleccionadaAutorizacion.path || '',
          name: row?.name || tarjetaSeleccionadaAutorizacion.titulo || '',
          tipoNodo: row?.tipoNodo || '',
        }];
      }
    }
    if (
      modules.length > 0
      && !moduloParametrizarPath
      && !selectedTarjetaConfigId
      && !tarjetaSeleccionadaAutorizacion
    ) {
      toast.warning('Marca que modulo de inventario vas a parametrizar o elige una tarjeta guardada.');
      return;
    }
    if (!payload.rutas.length) {
      toast.warning('Selecciona al menos un formulario o subformulario.');
      return;
    }
    if (!payload.usuarioIds.length) {
      toast.warning('Selecciona al menos un usuario autorizado (rol con tenantSuperAdmin en jerarquia corporativa).');
      return;
    }

    await ejecutarGuardado(payload, { cerrarAutorizacion: true });
  };

  const panelParametrizacionMenu = (
    <div className="flex min-h-0 flex-col gap-2">
      {alcanceParametrizacionLabel ? (
        <Alert className="shrink-0 border-border bg-muted/30 py-2">
          <AlertTitle className="text-xs font-medium">Alcance (desde ConfigInventario)</AlertTitle>
          <AlertDescription className="text-[11px] leading-relaxed">
            <span className="font-medium text-foreground">{alcanceParametrizacionLabel}</span>
            <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
              {alcanceParametrizacionIds[0]}
            </span>
          </AlertDescription>
        </Alert>
      ) : esDios ? (
        <Alert className="shrink-0 border-amber-500/50 bg-amber-50/80 py-2 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
          <AlertTitle className="text-xs font-medium">Sin alcance en sesion</AlertTitle>
          <AlertDescription className="text-[11px] leading-relaxed">
            Abre Parametrizacion menu desde una tarjeta de ConfigInventario o con un JWT que incluya tenantSuperAdmin.
          </AlertDescription>
        </Alert>
      ) : null}

      {modules.length > 0 ? (
        <div className="rounded-md border border-border bg-muted/30 p-2">
          <p className="mb-1 text-[11px] font-medium text-foreground">
            1. Modulo de inventario a parametrizar (obligatorio para guardar)
          </p>
          <p className="mb-2 text-[10px] text-muted-foreground">
            Marca un solo modulo: define el contexto del menu. Luego elige la(s) fila(s) reales en el listado de abajo.
          </p>
          <div className="max-h-[min(220px,40vh)] space-y-1.5 overflow-y-auto pr-1">
            {moduleRouteMatches.map((item, idx) => {
              const estadoEtiqueta =
                item.matchKind === 'exact'
                  ? 'Ruta exacta'
                  : item.matchKind === 'fuzzy'
                    ? 'Ruta sugerida'
                    : 'Sin coincidencia en listado';
              const estadoClass =
                item.matchKind === 'none'
                  ? 'text-amber-700 dark:text-amber-300'
                  : item.matchKind === 'fuzzy'
                    ? 'text-sky-700 dark:text-sky-300'
                    : 'text-emerald-700 dark:text-emerald-400';
              const mid = `modulo-param-${idx}`;
              const marcado = moduloParametrizarPath === item.path;
              return (
                <div
                  key={item.path}
                  className={`rounded border px-2 py-1.5 text-[10px] ${
                    marcado ? 'border-primary bg-primary/5 ring-1 ring-primary/25' : 'border-border/60 bg-background/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={marcado}
                      onCheckedChange={(v) => toggleModuloParametrizar(item.path, v === true)}
                      className="mt-0.5"
                      id={mid}
                    />
                    <div className="min-w-0 flex-1">
                      <label htmlFor={mid} className="cursor-pointer">
                        <span className="font-medium text-foreground">{item.title}</span>
                        <span className="mt-0.5 block break-all font-mono text-muted-foreground">{item.path}</span>
                      </label>
                      {item.route ? (
                        <span className="mt-0.5 block break-all font-mono text-[10px] text-muted-foreground">
                          Posible fila en listado: {item.route.path}
                        </span>
                      ) : (
                        <span className="mt-0.5 block text-[10px] text-amber-700 dark:text-amber-300">
                          Sin coincidencia automatica: busca y marca el formulario correcto en el listado de abajo.
                        </span>
                      )}
                    </div>
                    <span className={`shrink-0 font-medium ${estadoClass}`}>{estadoEtiqueta}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {modules.length > 0 && !moduloParametrizarPath ? (
        <Alert className="shrink-0 border-amber-500/50 bg-amber-50/80 py-2 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
          <AlertTitle className="text-xs font-medium">Falta elegir modulo</AlertTitle>
          <AlertDescription className="text-[11px] leading-relaxed">
            Marca un modulo arriba para poder guardar la parametrizacion del menu.
          </AlertDescription>
        </Alert>
      ) : null}

      {modules.length > 0 && moduloParametrizarPath && !moduloParametrizarTieneRuta ? (
        <Alert className="shrink-0 border-amber-500/50 bg-amber-50/80 py-2 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
          <AlertTitle className="text-xs font-medium">Sin coincidencia automatica de ruta</AlertTitle>
          <AlertDescription className="text-[11px] leading-relaxed">
            El path del catalogo no coincide con ninguna fila del listado. Usa el buscador de abajo, marca el
            formulario real y guarda la parametrizacion; despues asigna usuarios en Autorizacion de formulario.
          </AlertDescription>
        </Alert>
      ) : null}

      {moduloParametrizarInfo ? (
        <Alert className="shrink-0 border-border bg-muted/30 py-2">
          <AlertTitle className="text-xs font-medium">Modulo marcado para parametrizar</AlertTitle>
          <AlertDescription className="space-y-1 text-[11px] leading-relaxed">
            <span className="font-medium text-foreground">{moduloParametrizarInfo.title}</span>
            <span className="block break-all font-mono text-[10px] text-muted-foreground">{moduloParametrizarInfo.path}</span>
            {tarjetaModuloActiva ? (
              <span className="block text-[10px] text-emerald-700 dark:text-emerald-400">
                Tarjeta en menu: registrada (id {tarjetaModuloActiva.id.slice(-8)}).
              </span>
            ) : (
              <span className="block text-[10px] text-amber-800 dark:text-amber-300">
                Sin tarjeta en menu: guarda parametrizacion aqui; luego autoriza usuarios en Autorizacion de formulario.
              </span>
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-2">
        <Label htmlFor="filtro-formularios-inventario" className="text-sm font-medium">
          2. Formularios inventario (name y path)
        </Label>
        <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => selectAllRutasVisible(true)}>
          Marcar visibles
        </Button>
      </div>
      <Input
        id="filtro-formularios-inventario"
        name="filtro-formularios-inventario"
        autoComplete="off"
        value={needleRutas}
        onChange={(e) => setNeedleRutas(e.target.value)}
        placeholder="Name, path, tipo de nodo o id (varias palabras)..."
        disabled={loading}
      />
      <p className="text-[11px] text-muted-foreground">
        {needleRutas.trim()
          ? `${filteredRutas.length} visibles con filtro · ${rows.length} en catalogo`
          : `${rows.length} registro(s) en catalogo`}
        {meta?.totalRutasActivas != null ? ` · ${meta.totalRutasActivas} rutas activas totales` : ''}
        {meta?.totalFormulariosSubformularios != null
          ? ` · ${meta.totalFormulariosSubformularios} candidato(s) formulario/subformulario`
          : ''}
        {meta?.origenResolucion ? ` · Origen: ${meta.origenResolucion}` : ''}
      </p>
      <ScrollArea key={needleRutas} className="h-[min(360px,45vh)] rounded-md border border-border">
        <div className="space-y-0 p-3">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando...
            </div>
          ) : filteredRutas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {rows.length === 0 ? 'Sin formularios de inventario en catalogo.' : 'Sin coincidencias con el filtro.'}
            </p>
          ) : (
            filteredRutas.map((row) => {
              const esContexto = rutaContextoId === row.id;
              return (
                <div
                  key={row.id}
                  className={`flex flex-col gap-1 border-b border-border/60 py-2 last:border-0 ${
                    esContexto ? 'rounded-md bg-primary/5 px-1 ring-1 ring-primary/25' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={Boolean(selectedRutas[row.id])}
                      onCheckedChange={(v) => toggleRuta(row.id, v === true)}
                      className="mt-1"
                      id={`ruta-${row.id}`}
                    />
                    <label htmlFor={`ruta-${row.id}`} className="min-w-0 flex-1 cursor-pointer text-sm">
                      <span className="font-medium text-foreground">{row.name}</span>
                      <span className="ml-2 rounded bg-muted px-1.5 text-[10px] uppercase text-muted-foreground">
                        {row.tipoNodo}
                      </span>
                      <span className="mt-0.5 block break-all font-mono text-xs text-muted-foreground">{row.path}</span>
                    </label>
                  </div>
                  <div className="flex justify-end pl-7">
                    <button
                      type="button"
                      className="text-[10px] font-medium text-primary underline-offset-2 hover:underline"
                      onClick={() => {
                        setSelectedRutas({ [row.id]: true });
                        setRutaContextoId(row.id);
                      }}
                    >
                      Usar solo esta ruta en el guardado
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
      {meta?.ayuda ? (
        <Alert variant="default" className="border-amber-500/50 bg-amber-50/80 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
          <AlertTitle className="text-sm">Como asociar rutas</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed">{meta.ayuda}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );

  const panelAutorizacionFormulario = (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="shrink-0 space-y-2 rounded-md border border-border bg-muted/20 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-xs font-medium text-foreground">
            Parametrizacion guardada (inventarioconfigtarjetas)
          </Label>
          <span className="text-[10px] text-muted-foreground">
            {filteredTarjetasConfigAuth.length} tarjeta(s)
            {saIdsMarcados.length ? ` · filtradas por ${saIdsMarcados.length} SA` : ''}
          </span>
        </div>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Elige una tarjeta para aplicar alcance (tenant SuperAdmin), la ruta configurada y el contexto de menu.
          Tambien puedes parametrizar desde <span className="font-medium">Parametrizacion menu</span>.
        </p>
        <Input
          value={needleTarjetasConfig}
          onChange={(e) => setNeedleTarjetasConfig(e.target.value)}
          placeholder="Filtrar por titulo, path, modulo, tab o id..."
          disabled={loading}
          className="h-8 text-xs"
        />
        <ScrollArea className="h-[min(200px,28vh)] rounded-md border border-border bg-background">
          <div className="space-y-0 p-2">
            {loading && !tarjetasConfig.length ? (
              <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Cargando tarjetas...
              </div>
            ) : filteredTarjetasConfigAuth.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {tarjetasConfig.length === 0
                  ? 'Sin tarjetas en inventarioconfigtarjetas. Guarda primero en Parametrizacion menu.'
                  : 'Sin tarjetas con el filtro o el SA marcado.'}
              </p>
            ) : (
              filteredTarjetasConfigAuth.map((tarjeta) => {
                const activa = selectedTarjetaConfigId === tarjeta.id;
                const saLabel = tarjeta.tenantSuperAdminId
                  ? tenantSuperAdmins.find((t) => normalizarIdApi(t.iud) === normalizarIdApi(tarjeta.tenantSuperAdminId))
                      ?.label
                    || `SA …${String(tarjeta.tenantSuperAdminId).slice(-8)}`
                  : 'Global';
                const rutaId = resolverRutaIdDesdeTarjetaConfig(tarjeta, rows);
                const rutaRow = rutaId ? rows.find((r) => normalizarIdApi(r.id) === rutaId) : null;
                return (
                  <button
                    key={tarjeta.id}
                    type="button"
                    onClick={() => void aplicarAlcanceDesdeTarjetaConfig(tarjeta)}
                    className={`mb-1.5 w-full rounded-md border px-2 py-2 text-left text-[11px] transition-colors last:mb-0 ${
                      activa
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                        : 'border-border/60 bg-background hover:bg-muted/40'
                    }`}
                  >
                    <span className="block font-medium text-foreground">{tarjeta.titulo}</span>
                    {tarjeta.descripcion ? (
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">{tarjeta.descripcion}</span>
                    ) : null}
                    <span className="mt-1 block break-all font-mono text-[10px] text-muted-foreground">
                      {tarjeta.path}
                    </span>
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      Alcance: {saLabel}
                      {tarjeta.tab ? ` · tab ${tarjeta.tab}` : ''}
                      {rutaRow ? ` · ruta ${rutaRow.name}` : rutaId ? '' : ' · ruta no encontrada en catalogo'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
        {tarjetaSeleccionadaAutorizacion ? (
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
            Tarjeta activa: {tarjetaSeleccionadaAutorizacion.titulo} (id …{tarjetaSeleccionadaAutorizacion.id.slice(-8)})
          </p>
        ) : null}
      </div>

      {!rutaIdsMarcados.length ? (
        <Alert className="shrink-0 border-amber-500/50 bg-amber-50/80 py-2 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
          <AlertTitle className="text-xs font-medium">Sin formularios seleccionados</AlertTitle>
          <AlertDescription className="text-[11px] leading-relaxed">
            Elige una tarjeta guardada arriba (aplica ruta y alcance) o abre{' '}
            <span className="font-medium">Parametrizacion menu</span> si aun no existe la tarjeta.
          </AlertDescription>
        </Alert>
      ) : null}

      {moduloParametrizarInfo ? (
        <Alert className="shrink-0 border-border bg-muted/30 py-2">
          <AlertTitle className="text-xs font-medium">Contexto de menu</AlertTitle>
          <AlertDescription className="space-y-1 text-[11px] leading-relaxed">
            <span className="font-medium text-foreground">{moduloParametrizarInfo.title}</span>
            <span className="block text-[10px] text-muted-foreground">
              {rutaIdsMarcados.length} formulario(s) marcado(s) para autorizar.
            </span>
          </AlertDescription>
        </Alert>
      ) : null}

      {rutaContextoRow ? (
        <Alert className="shrink-0 border-primary/40 bg-primary/5 py-2">
          <AlertTitle className="text-xs font-medium">Ruta activa (ultima marcada)</AlertTitle>
          <AlertDescription className="space-y-1 text-[11px] leading-relaxed">
            <span className="font-medium text-foreground">{rutaContextoRow.name}</span>
            {tituloCatalogoParaContexto && !moduloParametrizarInfo ? (
              <span className="block text-[10px] text-muted-foreground">
                Modulo de menu relacionado:{' '}
                <span className="font-medium text-foreground">{tituloCatalogoParaContexto}</span>
              </span>
            ) : null}
            <span className="block break-all font-mono text-[10px] text-muted-foreground">{rutaContextoRow.path}</span>
            <span className="mt-1 block text-[10px] text-muted-foreground">
              Marca usuarios abajo y guarda para aplicar{' '}
              <code className="rounded bg-muted px-0.5">formulariosConfig</code> a las rutas marcadas.
            </span>
          </AlertDescription>
        </Alert>
      ) : null}

      {alcanceParametrizacionLabel ? (
        <Alert className="shrink-0 border-border bg-muted/30 py-2">
          <AlertTitle className="text-xs font-medium">Alcance (desde ConfigInventario)</AlertTitle>
          <AlertDescription className="text-[11px] leading-relaxed">
            <span className="font-medium text-foreground">{alcanceParametrizacionLabel}</span>
          </AlertDescription>
        </Alert>
      ) : null}

      {meta?.requiereParametrizacionTenantSuperAdmin ? (
                <Alert className="border-amber-500/50 bg-amber-50/80 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
                  <AlertTitle className="text-sm">Parametrizar tenantSuperAdmin</AlertTitle>
                  <AlertDescription className="text-xs leading-relaxed">
                    Rol DIOS sin ancla en el token. Elige un tenantSuperAdmin para cargar la rama de
                    tenant global y los usuarios asociados.
                  </AlertDescription>
                </Alert>
              ) : null}

              {mostrarSelectorSaEnAutorizacion ? (
                <div className="shrink-0 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      1. TenantSuperAdmin
                      {usarSaMultiSelect ? ` (${saIdsMarcados.length} marcado(s))` : ''}
                    </Label>
                    {usarSaMultiSelect ? (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 border-border bg-background text-[10px] text-foreground"
                          disabled={loading}
                          onClick={() => selectAllSaVisible(true)}
                        >
                          {needleSa.trim() ? 'Marcar visibles' : 'Marcar todos'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px]"
                          disabled={loading}
                          onClick={() => selectAllSaVisible(false)}
                        >
                          {needleSa.trim() ? 'Quitar visibles' : 'Ninguno'}
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <Input
                    value={needleSa}
                    onChange={(e) => setNeedleSa(e.target.value)}
                    placeholder="Filtrar SA por codigo, id o etiqueta..."
                    disabled={loading}
                    className="h-8 text-xs"
                  />

                  {usarSaMultiSelect ? (
                    <ScrollArea className="h-[min(140px,20vh)] rounded-md border border-border bg-background">
                      <div className="space-y-0 p-2">
                        {loading ? (
                          <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Cargando...
                          </div>
                        ) : filteredTenantSuperAdmins.length === 0 ? (
                          <p className="py-3 text-center text-xs text-muted-foreground">
                            {needleSa.trim()
                              ? 'Sin SA con ese filtro.'
                              : 'Sin tenant SuperAdmin en catalogo.'}
                          </p>
                        ) : (
                          filteredTenantSuperAdmins.map((t) => {
                            const esVista = seleccionSaId === t.iud;
                            return (
                              <label
                                key={t.iud}
                                className={`flex cursor-pointer items-start gap-2 border-b border-border/50 py-1.5 last:border-0 ${
                                  esVista ? 'rounded bg-primary/5 px-1' : ''
                                }`}
                              >
                                <Checkbox
                                  checked={Boolean(selectedSaIds[t.iud])}
                                  onCheckedChange={(v) => toggleSa(t.iud, v === true)}
                                  className="mt-0.5"
                                />
                                <span className="min-w-0 flex-1 text-xs">
                                  <span className="font-medium text-foreground">{t.label}</span>
                                  <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">{t.iud}</span>
                                  {esVista ? (
                                    <span className="text-[10px] text-primary">Vista previa de rama activa</span>
                                  ) : null}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  ) : (
                    <Select
                      value={seleccionSaId || undefined}
                      onValueChange={(v) => {
                        setSelectedSaIds({ [v]: true });
                        void refreshRamasSeleccionadas([v]);
                      }}
                      disabled={loading || tenantSuperAdmins.length === 0}
                    >
                      <SelectTrigger className="h-9 bg-background text-xs">
                        <SelectValue placeholder="Selecciona tenantSuperAdmin..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredTenantSuperAdmins.map((t) => (
                          <SelectItem key={t.iud} value={t.iud} className="text-xs">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <p className="text-[10px] text-muted-foreground">
                    {usarSaMultiSelect
                      ? 'Marca uno o todos los SA. La validacion y usuarios muestran la union de todas las ramas marcadas.'
                      : 'Con el SA elegido se consulta la jerarquia de tenant global y los usuarios enlazados a esa rama.'}
                  </p>
                </div>
              ) : null}

              {saIdsMarcados.length > 0 || saArbolRama.length > 0 ? (
                <div className="flex min-h-0 shrink-0 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Tenants SuperAdmin de la rama (alcance)
                      {saArbolRama.length > 0 ? ` · ${saArbolRama.length} nodo(s)` : ''}
                      {saIdsMarcados.length > 0 ? ` · ${saIdsMarcados.length} marcado(s)` : ''}
                    </Label>
                    {saArbolRama.length > 0 ? (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 border-border bg-background text-[10px] text-foreground"
                          disabled={loading}
                          onClick={() => selectAllSaArbolVisible(true)}
                        >
                          Marcar rama
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px]"
                          disabled={loading}
                          onClick={() => selectAllSaArbolVisible(false)}
                        >
                          Ninguno
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <ScrollArea className="h-[min(140px,18vh)] rounded-md border border-border bg-muted/10">
                    <div className="space-y-0 p-2">
                      {loading ? (
                        <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Cargando árbol...
                        </div>
                      ) : saArbolRama.length === 0 ? (
                        <p className="py-3 text-center text-xs text-muted-foreground">
                          Sin subárbol SA visible para el tenant marcado (revisa tenantjerarquiacounters o
                          codigoPadre en tenantsupertenants).
                        </p>
                      ) : (
                        saArbolRama.map((t) => {
                          const depth = t.profundidad ?? 0;
                          const tid = normalizarIdApi(t.iud);
                          const marcado = Boolean(tid && selectedSaIds[tid]);
                          const esAncla = tid ? alcanceParametrizacionIds.includes(tid) : false;
                          return (
                            <label
                              key={t.iud}
                              className={`flex cursor-pointer items-start gap-2 border-b border-border/40 py-1.5 text-xs last:border-0 ${
                                marcado ? 'rounded bg-primary/5 px-1' : ''
                              }`}
                              style={{ paddingLeft: `${8 + depth * 14}px` }}
                            >
                              <Checkbox
                                checked={marcado}
                                onCheckedChange={(v) => tid && toggleSa(tid, v === true)}
                                className="mt-0.5"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="font-medium text-foreground">
                                  {t.codigoJerarquia ? `SA ${t.codigoJerarquia}` : t.label}
                                </span>
                                {t.codigoPadre ? (
                                  <span className="ml-1 text-[10px] text-muted-foreground">← {t.codigoPadre}</span>
                                ) : null}
                                {esAncla ? (
                                  <span className="ml-1 text-[10px] font-medium text-primary">ancla ConfigInventario</span>
                                ) : null}
                                <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">{t.iud}</span>
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                  {jerarquiaSaCounters.length > 0 ? (
                    <p className="text-[10px] text-muted-foreground">
                      Marca los tenants de la rama a los que aplica el alcance. Índice counters: {jerarquiaSaCounters.length}{' '}
                      fila(s).
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex min-h-0 shrink-0 flex-col gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    2. Tenants global de la rama (alcance)
                  </Label>
                  {filteredTenantGlobales.length > 0 ? (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 border-border bg-background text-[10px] text-foreground"
                        disabled={loading || saIdsMarcados.length === 0}
                        onClick={() => selectAllTenantGlobalVisible(true)}
                      >
                        {needleTenantGlobal.trim() ? 'Marcar visibles' : 'Marcar todos'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px]"
                        disabled={loading || saIdsMarcados.length === 0}
                        onClick={() => selectAllTenantGlobalVisible(false)}
                      >
                        Ninguno
                      </Button>
                    </div>
                  ) : null}
                </div>
                <Input
                  value={needleTenantGlobal}
                  onChange={(e) => setNeedleTenantGlobal(e.target.value)}
                  placeholder="Filtrar tenant global por codigo, id o etiqueta..."
                  disabled={loading || saIdsMarcados.length === 0}
                  className="h-8 text-xs"
                />
                {saIdsMarcados.length > 0 ? (
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    SA marcados: <span className="font-semibold">{saIdsMarcados.length}</span>
                    {meta?.inventarioFormulariosModoAlcance ? ` · modo ${meta.inventarioFormulariosModoAlcance}` : ''}
                    {meta?.totalTenantGlobalEnRama != null
                      ? ` · ${meta.totalTenantGlobalEnRama} tenant global(es) en union`
                      : ''}
                    {filteredUsuarios.length > 0 ? ` · ${filteredUsuarios.length} usuario(s) en union` : ''}
                    {(meta?.inventarioFormulariosModoAlcance === 'jwt_sa' ||
                      meta?.inventarioFormulariosModoAlcance === 'jwt_tg') &&
                    (meta?.filtroCorporativoCountersActivo ? (
                      <span className="ml-1 text-muted-foreground">
                        · JWT / counters: hay filas con <code className="rounded bg-muted px-0.5">corporativo</code> → SA acotados a
                        counters+corporativo.
                      </span>
                    ) : (
                      <span className="ml-1 text-muted-foreground">
                        · JWT / counters: sin corporativo en el ancla del token → parametrizacion libre (SA visibles en jerarquia).
                      </span>
                    ))}
                    {meta?.inventarioFormulariosModoAlcance === 'dios_multi_sa' ? (
                      <span className="ml-1 text-muted-foreground">
                        · DIOS: union de {saIdsMarcados.length} rama(s) SA marcadas.
                      </span>
                    ) : null}
                    {meta?.inventarioFormulariosModoAlcance === 'dios_param' ? (
                      <span className="ml-1 text-muted-foreground">
                        · DIOS: SA seleccionado{' '}
                        {meta?.filtroCorporativoCountersActivo
                          ? 'con corporativo en counters (rama restringida).'
                          : 'sin corporativo en counters (parametrizacion libre en subrama).'}
                      </span>
                    ) : null}
                    {meta?.formulariosFiltradosPorHerencia ? (
                      <span className="ml-1 text-muted-foreground">
                        · Formularios acotados a {meta.totalVistasHerenciaRama ?? 0} vista(s) heredada(s) en la rama.
                      </span>
                    ) : null}
                    {meta?.herenciaVistasVacias ? (
                      <span className="ml-1 text-amber-800 dark:text-amber-300">
                        · Sin vistas en herencia para esta rama; se muestra catalogo inventario completo.
                      </span>
                    ) : null}
                    {meta?.ejecutorBypassHerencia ? (
                      <span className="ml-1 text-emerald-700 dark:text-emerald-400">
                        · Ejecutor con bypass de herencia (politicas runtime / counters).
                      </span>
                    ) : null}
                    {meta?.tenantGlobalJerarquiaOk ? (
                      <span className="mt-1 block text-emerald-700 dark:text-emerald-400">
                        Jerarquia tenant global: con filas en al menos una rama marcada.
                      </span>
                    ) : (
                      <span className="mt-1 block text-amber-800 dark:text-amber-300">
                        {saIdsMarcados.length > 1
                          ? 'Sin tenant global en ninguna de las ramas SA marcadas (revisa counters por SA).'
                          : 'Sin tenant global en la rama del SA seleccionado (revisa tenantJerarquiaCountersGlobal).'}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">Sin ancla SA todavia.</p>
                )}
                <ScrollArea className="h-[min(120px,16vh)] rounded-md border border-border">
                  <div className="space-y-0 p-2">
                    {loading ? (
                      <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        ...
                      </div>
                    ) : filteredTenantGlobales.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        {saIdsMarcados.length === 0
                          ? 'Marca al menos un TenantSuperAdmin para validar tenant global.'
                          : needleTenantGlobal.trim() && tenantGlobales.length > 0
                            ? 'Sin tenant global con ese filtro en la rama marcada.'
                          : saIdsMarcados.length > 1
                            ? `Sin tenant global en las ${saIdsMarcados.length} ramas marcadas.`
                            : 'Sin tenant global en la rama del SA seleccionado.'}
                      </p>
                    ) : (
                      filteredTenantGlobales.map((t) => {
                        const tid = normalizarIdApi(t.iud);
                        const marcado = Boolean(tid && selectedTenantGlobales[tid]);
                        return (
                          <label
                            key={t.iud}
                            className={`flex cursor-pointer items-start gap-2 border-b border-border/50 py-1.5 text-xs last:border-0 ${
                              marcado ? 'rounded bg-primary/5 px-1' : ''
                            }`}
                          >
                            <Checkbox
                              checked={marcado}
                              onCheckedChange={(v) => tid && toggleTenantGlobal(tid, v === true)}
                              className="mt-0.5"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="font-medium text-foreground">{t.label}</span>
                              <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">{t.iud}</span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>

              {meta?.inventarioFormulariosModoAlcance === 'jwt_tg' ? (
                <div className="flex min-h-0 flex-col gap-1">
                  <Label className="text-xs font-medium text-muted-foreground">TenantSuperAdmin (referencia, modo tenant global)</Label>
                  <ScrollArea className="h-[min(100px,14vh)] rounded-md border border-border">
                    <div className="space-y-0 p-2">
                      {filteredTenantSuperAdmins.length === 0 ? (
                        <p className="py-2 text-center text-[10px] text-muted-foreground">Sin datos SA en este modo.</p>
                      ) : (
                        filteredTenantSuperAdmins.map((t) => (
                          <div key={t.iud} className="border-b border-border/40 py-1 text-[10px] last:border-0">
                            {t.label}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              ) : null}

              {saIdsMarcados.length > 0 ? (
                <div className="rounded-md border border-dashed border-border/80 bg-muted/15 px-2.5 py-2 text-[10px] leading-relaxed text-muted-foreground">
                  <p className="font-medium text-foreground">Diagnóstico resolución (GET meta)</p>
                  <p className="mt-1">
                    Usuarios rama: <span className="font-semibold text-foreground">{meta?.totalUsuariosRama ?? 0}</span>
                    {' · '}
                    SA canónico:{' '}
                    <code className="rounded bg-muted px-0.5">
                      {meta?.jwtTenantSuperAdminCanonicoId?.slice(-12) || meta?.tenantSuperAdminAnclaId?.slice(-12) || '—'}
                    </code>
                    {meta?.jwtSaDesincronizado ? (
                      <span className="text-amber-700 dark:text-amber-300"> · JWT SA desincronizado (corregido en canónico)</span>
                    ) : null}
                  </p>
                  <p>
                    Rol parametrizado:{' '}
                    <span className="text-foreground">
                      {meta?.tenantSuperAdminRolParametrizado?.nombre || '—'}{' '}
                      {meta?.tenantSuperAdminRolParametrizado?.id
                        ? `(${meta.tenantSuperAdminRolParametrizado.id.slice(-8)})`
                        : ''}
                    </span>
                    {' · '}
                    Rol sesión: {meta?.rolSesionNombre || '—'}
                    {meta?.rolParametrizadoCoincideSesion ? (
                      <span className="text-emerald-700 dark:text-emerald-400"> · coincide</span>
                    ) : meta?.tenantSuperAdminRolParametrizado?.id ? (
                      <span className="text-amber-700 dark:text-amber-300"> · no coincide con sesión</span>
                    ) : null}
                  </p>
                  {meta?.diagnosticoRamaUsuarios ? (
                    <p>
                      Regis candidatos: {meta.diagnosticoRamaUsuarios.documentosRegisCandidatos ?? 0}
                      {' · '}
                      rechazados filtro: {meta.diagnosticoRamaUsuarios.rechazadosPorFiltro ?? 0}
                      {' · '}
                      SA en rama: {meta.diagnosticoRamaUsuarios.saIdsEnRama?.length ?? 0}
                      {' · '}
                      TG: {meta.diagnosticoRamaUsuarios.totalTgEnRama ?? 0}
                      {' · '}
                      roles: {meta.diagnosticoRamaUsuarios.totalRolesEnRama ?? 0}
                      {' · '}
                      dueños SA: {meta.diagnosticoRamaUsuarios.propietariosSa?.length ?? 0}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex min-h-[min(240px,32vh)] flex-1 flex-col gap-2 border-t border-border/60 pt-3">
                <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">3. Usuarios de la rama (autorizar)</Label>
                    <Input
                      value={needleUsuario}
                      onChange={(e) => setNeedleUsuario(e.target.value)}
                      placeholder="Filtrar por nombre o correo..."
                      disabled={loading || saIdsMarcados.length === 0}
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 text-[10px]"
                    disabled={loading || saIdsMarcados.length === 0}
                    onClick={() => selectAllUsuariosVisible(true)}
                  >
                    Marcar visibles
                  </Button>
                </div>
                <ScrollArea className="h-[min(220px,30vh)] rounded-md border border-border">
                  <div className="space-y-0 p-2">
                    {loading ? (
                      <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        ...
                      </div>
                    ) : filteredUsuarios.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        {saIdsMarcados.length === 0
                          ? 'Marca un TenantSuperAdmin para cargar usuarios de su rama.'
                          : needleUsuario.trim() && usuarios.length > 0
                            ? 'Sin usuarios con ese filtro en la rama marcada.'
                            : 'Sin usuarios en esta rama. Asegura usuarios con rol, tenantId o perfil asociado al tenant seleccionado.'}
                      </p>
                    ) : (
                      filteredUsuarios.map((u) => (
                        <label
                          key={u.iud}
                          className="flex cursor-pointer items-start gap-2 border-b border-border/50 py-1.5 last:border-0"
                        >
                          <Checkbox
                            checked={Boolean(selectedUsuarios[u.iud])}
                            onCheckedChange={(v) => toggleUsuario(u.iud, v === true)}
                            className="mt-0.5"
                          />
                          <span className="min-w-0 flex-1 text-xs">
                            <span className="font-medium text-foreground">{u.nombre}</span>
                            <span className="mt-0.5 block truncate text-muted-foreground">{u.correo}</span>
                            <span className="mt-0.5 block text-[10px] text-muted-foreground">
                              Rol: {u.rol || '—'} · SA: {u.tenantSuperAdmin || '—'}
                              {u.tenantGlobal ? ` · TG: ${u.tenantGlobal}` : ''}
                              {(u as { bypassHerencia?: boolean }).bypassHerencia ? (
                                <span className="ml-1 text-emerald-700 dark:text-emerald-400">· bypass herencia</span>
                              ) : null}
                            </span>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
    </div>
  );

  return (
    <>
      {showTrigger ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            onClick={() => setOpenParametrizacion(true)}
          >
            <LayoutGrid className="h-4 w-4" />
            Parametrizacion menu
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            onClick={() => setOpenAutorizacion(true)}
          >
            <ShieldCheck className="h-4 w-4" />
            Autorizacion formulario
          </Button>
        </div>
      ) : null}

      <Dialog open={openParametrizacion} onOpenChange={setOpenParametrizacion}>
        <DialogContent className="flex max-h-[92vh] w-[min(96vw,42rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Parametrizacion menu
            </DialogTitle>
            <DialogDescription>
              Paso 1: guarda modulo + formularios en{' '}
              <code className="rounded bg-muted px-1 text-xs">PUT /api/inventario/config/tarjetas/parametrizacion</code>{' '}
              (coleccion inventarioconfigtarjetas). Paso 2: asigna usuarios en Autorizacion de formulario. Catalogo desde{' '}
              <code className="rounded bg-muted px-1 text-xs">GET /api/inventario/config/formularios-autorizacion/opciones</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{panelParametrizacionMenu}</div>

          <DialogFooter className="shrink-0 flex flex-col gap-3 border-t border-border bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {moduloParametrizarInfo ? (
                <>
                  Modulo: <span className="font-medium text-foreground">{moduloParametrizarInfo.title}</span>
                  {tarjetaModuloActiva?.id ? ' · tarjeta registrada' : ' · pendiente de guardar'}
                  {alcanceParametrizacionLabel ? ` · ${alcanceParametrizacionLabel}` : ''}
                </>
              ) : (
                'Marca el modulo de inventario a parametrizar.'
              )}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setOpenParametrizacion(false);
                  setOpenAutorizacion(true);
                }}
                disabled={saving}
              >
                Ir a autorizacion
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-border bg-background text-foreground"
                onClick={() => setOpenParametrizacion(false)}
                disabled={saving}
              >
                Cerrar
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={() => void guardarParametrizacion()}
                disabled={!puedeGuardarParametrizacion}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar parametrizacion'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openAutorizacion} onOpenChange={setOpenAutorizacion}>
        <DialogContent className="flex max-h-[92vh] w-[min(96vw,48rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Autorizacion de formulario
            </DialogTitle>
            <DialogDescription>
              Selecciona una parametrizacion guardada (inventarioconfigtarjetas), la rama tenant SuperAdmin y los usuarios
              autorizados. Guardar con{' '}
              <code className="rounded bg-muted px-1 text-xs">PUT /api/inventario/config/formularios-autorizacion</code>{' '}
              (rol DIOS) incluyendo <code className="rounded bg-muted px-1 text-xs">tenantSuperAdminId</code> cuando aplica.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{panelAutorizacionFormulario}</div>

          <DialogFooter className="shrink-0 flex flex-col gap-3 border-t border-border bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {rutaIdsMarcados.length
                ? `${rutaIdsMarcados.length} formulario(s) listo(s) para autorizar`
                : tarjetaSeleccionadaAutorizacion
                  ? `Tarjeta «${tarjetaSeleccionadaAutorizacion.titulo}» sin ruta en catalogo`
                  : 'Selecciona una tarjeta guardada o formularios en Parametrizacion menu.'}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setOpenAutorizacion(false);
                  setOpenParametrizacion(true);
                }}
                disabled={saving}
              >
                Ir a parametrizacion
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-border bg-background text-foreground"
                onClick={() => setOpenAutorizacion(false)}
                disabled={saving}
              >
                Cerrar
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={() => void guardar()}
                disabled={loading || saving || !esDios}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar autorizaciones'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
