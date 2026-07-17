import { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { swalFire as Swal } from '@/lib/sweetalert';
import {
  Database,
  Plus,
  RefreshCw,
  Trash2,
  Play,
  Radio,
  CircleDot,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Activity,
  Pencil,
  Timer,
} from 'lucide-react';

import {
  tenantDbService,
  type TenantDbConfig,
  type TenantDbConfigEditable,
  type SyncColeccion,
  type SyncPreview,
  type TenantDisponible,
  type ContenedorParametrizacion,
} from '../../../services/tenantDbService';

import CronosSyncHijosTab from './tenant-db-cronos-sync-hijos/CronosSyncHijosTab';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { BTN_ROW_EDIT, BTN_ROW_PROBE, BTN_ROW_DELETE } from '@/app/utils/buttonStyles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const READY_STATE_LABEL: Record<number, string> = {
  0: 'Desconectada',
  1: 'Conectada',
  2: 'Conectando',
  3: 'Desconectando',
};

const READY_STATE_COLOR: Record<number, string> = {
  0: 'text-destructive',
  1: 'text-success',
  2: 'text-warning',
  3: 'text-warning',
};

const NOMBRE_CONTENEDOR_MANUAL = '__manual__';
const CONTENEDOR_RAIZ = '__root__';
const buildCorporativoMapKey = (corporativoId?: string | null) =>
  corporativoId ? `corp:${corporativoId}` : '';
const DEBUG_CONTENEDORES = true;

const getContenedorLabel = (contenedor: ContenedorParametrizacion) =>
  contenedor.displayLabel || contenedor.pathLabels?.join(' > ') || contenedor.nombre;

const getContenedorTreeLabel = (contenedor: ContenedorParametrizacion) => {
  const nivel = Math.max(1, Number(contenedor.nivel || 1));
  const prefijo = nivel > 1 ? `${'  '.repeat(nivel - 1)}↳ ` : '';
  const secuencia = contenedor.secuenciaJerarquica || String(contenedor.secuencia || '');
  return `${prefijo}${getContenedorLabel(contenedor)}${secuencia ? ` (seq: ${secuencia})` : ''}`;
};

const resolveContenedorId = (
  contenedor: TenantDbConfig['contenedorId'] | ContenedorParametrizacion | string | null | undefined
) => {
  if (!contenedor) return '';
  if (typeof contenedor === 'string') return contenedor;
  if (typeof contenedor === 'object') {
    if ('iud' in contenedor && contenedor.iud) return String(contenedor.iud);
    if ('_id' in contenedor && contenedor._id) return String(contenedor._id);
  }
  return '';
};

const getConfigJerarquiaLabel = (config: TenantDbConfig) => {
  return config.secuenciaHijoLabel || config.secuenciaHijo?.join('.') || 'sin-secuencia';
};

const resolveConfigRefId = (
  value: TenantDbConfig['parentTenantDbConfig'] | TenantDbConfig['rootTenantDbConfig'] | string | null | undefined
) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String(value.iud || value._id || '');
};

const getPreviewEntries = (doc: Record<string, unknown>) =>
  Object.entries(doc || {})
    .filter(([key]) => !['__v'].includes(key))
    .slice(0, 6);

function MigrationBadge({ status }: { status: TenantDbConfig['migrationStatus'] }) {
  const map: Record<TenantDbConfig['migrationStatus'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pendiente:   { label: 'Pendiente',   variant: 'secondary' },
    en_proceso:  { label: 'En proceso',  variant: 'outline' },
    completada:  { label: 'Completada',  variant: 'default' },
    fallida:     { label: 'Fallida',     variant: 'destructive' },
  };
  const { label, variant } = map[status] ?? map.pendiente;
  return <Badge variant={variant}>{label}</Badge>;
}

// ─── ContenedorSelect ────────────────────────────────────────────────────────

function ContenedorSelect({
  corporativoId,
  contenedorId,
  tenantsDisponibles,
  contenedoresPorTenant,
  contenedoresVisibles = [],
  usarVistaGlobal = false,
  disabled = false,
  onSelect,
}: {
  corporativoId: string;
  contenedorId: string;
  tenantsDisponibles: TenantDisponible[];
  contenedoresPorTenant: Map<string, ContenedorParametrizacion[]>;
  contenedoresVisibles?: ContenedorParametrizacion[];
  usarVistaGlobal?: boolean;
  disabled?: boolean;
  onSelect: (c: ContenedorParametrizacion) => void;
}) {
  const tenantId = resolveTenantDisponibleByCorporativoId(tenantsDisponibles, corporativoId)?.iud ?? '';
  const corporativoKey = buildCorporativoMapKey(corporativoId);
  const contenedores = usarVistaGlobal && contenedoresVisibles.length > 0
    ? contenedoresVisibles
    : (
      contenedoresPorTenant.get(tenantId)
      ?? (corporativoKey ? contenedoresPorTenant.get(corporativoKey) : undefined)
      ?? []
    );

  return (
    <div className="space-y-2">
      <Label htmlFor="contenedor-select">Contenedor (nombre descriptivo)</Label>
      <select
        id="contenedor-select"
        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-full"
        value={contenedorId}
        disabled={disabled}
        onChange={e => {
          const c = contenedores.find(x => x.iud === e.target.value);
          if (c) onSelect(c);
        }}
      >
        <option value="">Selecciona un contenedor u opción manual...</option>
        {contenedores.map((c, idx) => (
          <option key={c.iud || `contenedor-${idx}`} value={c.iud}>
            {getContenedorTreeLabel(c)}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">
        Alias visual para identificar este tenant. Crea nuevos en el botón + arriba.
      </p>
    </div>
  );
}

function resolveTenantDisponibleByCorporativoId(
  tenantsDisponibles: TenantDisponible[],
  corporativoId: string
) {
  return tenantsDisponibles.find((tenant) => tenant.corporativo?.iud === corporativoId) ?? null;
}

// ─── Formulario de conexión ───────────────────────────────────────────────────

interface FormConexion {
  configId?: string;
  corporativoId: string;
  contenedorId: string;
  parentTenantDbConfigId?: string;
  poolName: string;
  mongoUri: string;
  dbName: string;
  urlBase: string;
  backupReplicaDbName?: string;
}

const FORM_VACIO: FormConexion = {
  configId: '',
  corporativoId: '',
  contenedorId: '',
  parentTenantDbConfigId: '',
  poolName: '',
  mongoUri: '',
  dbName: '',
  urlBase: '',
  backupReplicaDbName: '',
};
type DialogoConexionModo = 'crear' | 'editar';

// ─── Componente principal ─────────────────────────────────────────────────────

export default function TenantDbManager() {
  // ── Estado general ──
  const [configs, setConfigs] = useState<TenantDbConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectivityLoadingId, setConnectivityLoadingId] = useState<string | null>(null);

  // ── Dialog conexión ──
  const [dlgConexion, setDlgConexion] = useState(false);
  const [form, setForm] = useState<FormConexion>(FORM_VACIO);
  const [showUri, setShowUri] = useState(false);
  const [dialogoConexionModo, setDialogoConexionModo] = useState<DialogoConexionModo>('crear');
  const [configEditando, setConfigEditando] = useState<TenantDbConfig | null>(null);

  // ── Bases de datos del cluster ──
  const [dbOptions, setDbOptions] = useState<string[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbModoNueva, setDbModoNueva] = useState(false);

  // ── Tenant seleccionado para sync ──
  const [tenantSeleccionado, setTenantSeleccionado] = useState<TenantDbConfig | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  // Filtro por nombre de colección en la tabla de sync (una entrada por config, key = cfg.iud)
  const [syncFiltroPorConfig, setSyncFiltroPorConfig] = useState<Record<string, string>>({});

  // ── Dialog sync ──
  const [dlgSync, setDlgSync] = useState(false);
  const [syncForm, setSyncForm] = useState({
    sourceConfigId: '',
    coleccion: '',
    colecciones: [] as string[],
    autoSync: true,
    modo: 'full' as 'full' | 'incremental',
    filtroTexto: '',
  });
  const [syncSaving, setSyncSaving] = useState(false);
  const [syncCollections, setSyncCollections] = useState<string[]>([]);
  const [syncCollectionsLoading, setSyncCollectionsLoading] = useState(false);

  // ── Sync manual ──
  const [syncManualLoading, setSyncManualLoading] = useState<string | null>(null); // "tenantId:coleccion"
  const [dlgSyncDatos, setDlgSyncDatos] = useState(false);
  const [syncDataTarget, setSyncDataTarget] = useState<{ config: TenantDbConfig; col: SyncColeccion } | null>(null);
  const [syncDataForm, setSyncDataForm] = useState({
    modo: 'incremental' as 'full' | 'incremental',
    filtroTexto: '',
    selectedIds: [] as string[],
  });
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null);
  const [syncPreviewLoading, setSyncPreviewLoading] = useState(false);
  const [dlgSyncManual, setDlgSyncManual] = useState(false);
  const [dlgEstadoSync, setDlgEstadoSync] = useState(false);
  const [estadoSyncConfig, setEstadoSyncConfig] = useState<TenantDbConfig | null>(null);
  const [dlgRemoverSync, setDlgRemoverSync] = useState(false);
  const [removerSyncTarget, setRemoverSyncTarget] = useState<{ config: TenantDbConfig; coleccion: string } | null>(null);
  const [removerSyncDropCollection, setRemoverSyncDropCollection] = useState(true);
  const [removerSyncLoading, setRemoverSyncLoading] = useState(false);

  // ── Pool ──
  const [pool, setPool] = useState<{ pool: Record<string, { readyState: number; nombre: string }>; watchersActivos: string[] } | null>(null);
  const [poolLoading, setPoolLoading] = useState(false);

  // KPIs de la migración: agregados sobre todas las conexiones/colecciones, no solo el pool en memoria.
  const metricasMigracion = useMemo(() => {
    const coleccionesTodas = configs.flatMap(cfg => cfg.coleccionesSync ?? []);
    const coleccionesActivas = coleccionesTodas.filter(c => c.estado);
    const enVivo = coleccionesActivas.filter(c => c.autoSync).length;
    const ultimoSyncMs = coleccionesActivas.reduce((max, c) => {
      if (!c.ultimoSyncAt) return max;
      const t = new Date(c.ultimoSyncAt).getTime();
      return Number.isFinite(t) && t > max ? t : max;
    }, 0);

    return {
      totalConexiones: configs.length,
      conexionesActivas: configs.filter(c => c.estado).length,
      coleccionesSincronizadas: coleccionesActivas.length,
      enVivo,
      manual: coleccionesActivas.length - enVivo,
      migracionesFallidas: configs.filter(c => c.migrationStatus === 'fallida').length,
      migracionesPendientes: configs.filter(c => c.migrationStatus === 'pendiente' || c.migrationStatus === 'en_proceso').length,
      watchersActivos: pool?.watchersActivos.length ?? 0,
      ultimoSyncAt: ultimoSyncMs ? new Date(ultimoSyncMs) : null,
    };
  }, [configs, pool]);

  // ── Scope: solo tenantSuperAdmin puede operar este módulo ──
  const [esSuperAdmin, setEsSuperAdmin] = useState(false);

  // ── Parametrización de contenedores ──
  const [tenantsDisponibles, setTenantsDisponibles] = useState<TenantDisponible[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [contenedoresPorTenant, setContenedoresPorTenant] = useState<Map<string, ContenedorParametrizacion[]>>(new Map());
  const [contenedoresVisibles, setContenedoresVisibles] = useState<ContenedorParametrizacion[]>([]);
  const [apisDominios, setApisDominios] = useState<{ iud: string; etiquetas: string; dominio: string }[]>([]);

  // ── Dialog parametrización ──
  const [dlgParametrizacion, setDlgParametrizacion] = useState(false);
  const [tenantParaParametrizar, setTenantParaParametrizar] = useState<TenantDisponible | null>(null);
  const [formContenedor, setFormContenedor] = useState({
    parentContenedorId: '',
    nombre: '',
    apisDominios: '',
    dominioFrontend: '',
    descripcion: '',
  });
  const [nombreContenedorSeleccionado, setNombreContenedorSeleccionado] = useState<string>(NOMBRE_CONTENEDOR_MANUAL);
  const [parametrizacionLoading, setParametrizacionLoading] = useState(false);

  // ─── Carga ────────────────────────────────────────────────────────────────

  const cargarConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tenantDbService.listarActivos();
      setConfigs(res?.data ?? []);
    } catch (err: any) {
      toast.error(err?.message ?? 'Error cargando configuraciones');
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarPool = useCallback(async () => {
    setPoolLoading(true);
    try {
      const res = await tenantDbService.estadoPool();
      setPool({ pool: res.pool ?? {}, watchersActivos: res.watchersActivos ?? [] });
    } catch (err: any) {
      toast.error(err?.message ?? 'Error cargando pool');
    } finally {
      setPoolLoading(false);
    }
  }, []);

  const cargarTenantsDisponibles = useCallback(async () => {
    setTenantsLoading(true);
    try {
      const res = await tenantDbService.listarTenantDisponibles();
      setTenantsDisponibles(res?.data ?? []);
    } catch (err: any) {
      toast.error(err?.message ?? 'Error cargando tenants disponibles');
    } finally {
      setTenantsLoading(false);
    }
  }, []);

  const cargarApisDominios = useCallback(async () => {
    try {
      const res = await tenantDbService.listarApisDominios();
      setApisDominios(Array.isArray(res?.data) ? res.data : []);
    } catch (err: any) {
      toast.error(err?.message ?? 'Error cargando dominios');
    }
  }, []);

  const cargarContenedoresTenant = useCallback(async (tenantGlobalId: string, corporativoId?: string) => {
    const debugPrefix = '[TenantDbManager][contenedores]';
    if (DEBUG_CONTENEDORES) {
      console.log(`${debugPrefix} inicio`, { tenantGlobalId, corporativoId });
    }

    try {
      if (corporativoId) {
        const porCorporativo = await tenantDbService.obtenerCorporativoConContenedores(corporativoId);
        const contenedoresCorporativo = Array.isArray(porCorporativo?.data?.contenedores)
          ? porCorporativo.data.contenedores
          : [];
        const tenantResuelto = String(porCorporativo?.data?.tenantGlobal?.iud || tenantGlobalId);

        if (DEBUG_CONTENEDORES) {
          console.log(`${debugPrefix} preview corporativo`, {
            corporativoId,
            tenantResuelto,
            total: contenedoresCorporativo.length,
            contenedores: contenedoresCorporativo,
          });
        }

        if (contenedoresCorporativo.length > 0) {
          setContenedoresPorTenant((prev) => {
            const next = new Map(prev);
            next.set(tenantGlobalId, contenedoresCorporativo);
            next.set(tenantResuelto, contenedoresCorporativo);
            if (corporativoId) {
              next.set(buildCorporativoMapKey(corporativoId), contenedoresCorporativo);
            }
            return next;
          });
          if (DEBUG_CONTENEDORES) {
            toast.info(`Debug contenedores: preview corporativo devolvio ${contenedoresCorporativo.length}`);
          }
          return;
        }
      }

      // Sin tenantGlobal (empresa aun no vinculada) no hay id valido para previsualizar/listar por tenant.
      if (tenantGlobalId) {
        const preview = await tenantDbService.obtenerTenantConContenedores(tenantGlobalId);
        const contenedoresPreview = Array.isArray(preview?.data?.contenedores)
          ? preview.data.contenedores
          : [];

        if (DEBUG_CONTENEDORES) {
          console.log(`${debugPrefix} preview tenant`, {
            tenantGlobalId,
            total: contenedoresPreview.length,
            contenedores: contenedoresPreview,
          });
        }

        if (contenedoresPreview.length > 0) {
          setContenedoresPorTenant((prev) => new Map(prev).set(tenantGlobalId, contenedoresPreview));
          if (DEBUG_CONTENEDORES) {
            toast.info(`Debug contenedores: preview tenant devolvio ${contenedoresPreview.length}`);
          }
          return;
        }

        const listado = await tenantDbService.listarContenedores(tenantGlobalId, true);
        const contenedoresListado = Array.isArray(listado?.data) ? listado.data : [];
        if (DEBUG_CONTENEDORES) {
          console.log(`${debugPrefix} listado tenant`, {
            tenantGlobalId,
            total: contenedoresListado.length,
            contenedores: contenedoresListado,
          });
        }
        if (contenedoresListado.length > 0) {
          setContenedoresPorTenant((prev) => {
            const next = new Map(prev);
            next.set(tenantGlobalId, contenedoresListado);
            if (corporativoId) {
              next.set(buildCorporativoMapKey(corporativoId), contenedoresListado);
            }
            return next;
          });
          if (DEBUG_CONTENEDORES) {
            toast.info(`Debug contenedores: listado tenant devolvio ${contenedoresListado.length}`);
          }
          return;
        }
      }

      if (corporativoId) {
        const porCorporativo = await tenantDbService.obtenerCorporativoConContenedores(corporativoId);
        const contenedoresCorporativo = Array.isArray(porCorporativo?.data?.contenedores)
          ? porCorporativo.data.contenedores
          : [];
        if (DEBUG_CONTENEDORES) {
          console.log(`${debugPrefix} fallback corporativo`, {
            corporativoId,
            total: contenedoresCorporativo.length,
            contenedores: contenedoresCorporativo,
          });
        }
        setContenedoresPorTenant((prev) => {
          const next = new Map(prev);
          next.set(tenantGlobalId, contenedoresCorporativo);
          next.set(buildCorporativoMapKey(corporativoId), contenedoresCorporativo);
          return next;
        });
        if (DEBUG_CONTENEDORES) {
          toast.info(`Debug contenedores: fallback corporativo devolvio ${contenedoresCorporativo.length}`);
        }
        return;
      }

      setContenedoresPorTenant((prev) => {
        const next = new Map(prev);
        next.set(tenantGlobalId, []);
        if (corporativoId) {
          next.set(buildCorporativoMapKey(corporativoId), []);
        }
        return next;
      });
      if (DEBUG_CONTENEDORES) {
        console.warn(`${debugPrefix} sin resultados`, { tenantGlobalId, corporativoId });
        toast.warning('Debug contenedores: todos los endpoints devolvieron 0 registros');
      }
    } catch (err: any) {
      if (DEBUG_CONTENEDORES) {
        console.error(`${debugPrefix} error`, {
          tenantGlobalId,
          corporativoId,
          message: err?.message,
          error: err,
        });
      }
      toast.error(err?.message ?? 'Error cargando contenedores');
    }
  }, []);

  const cargarContenedoresVisibles = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      const res = await tenantDbService.listarContenedoresVisibles();
      const data = Array.isArray(res?.data) ? res.data : [];
      setContenedoresVisibles(data);

      if (DEBUG_CONTENEDORES) {
        console.log('[TenantDbManager][contenedores] visibles superadmin', {
          total: data.length,
          contenedores: data,
        });
      }

      return data;
    } catch (err: any) {
      if (!silent) {
        toast.error(err?.message ?? 'Error cargando contenedores visibles');
      }
      return [];
    }
  }, []);

  useEffect(() => {
    void cargarConfigs();
    void cargarTenantsDisponibles();
    void cargarApisDominios();
  }, [cargarConfigs, cargarTenantsDisponibles, cargarApisDominios]);

  // Verifica scope tenantSuperAdmin desde el objeto user en localStorage
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const u = JSON.parse(userStr) as any;
      const superAdminId =
        u?.tenantSuperAdminId ||
        u?.auth?.tenantScope?.tenantSuperAdminId ||
        '';
      setEsSuperAdmin(!!String(superAdminId).trim());
    } catch { /* parse error */ }
  }, []);

  useEffect(() => {
    if (!esSuperAdmin) {
      setContenedoresVisibles([]);
      return;
    }
    void cargarContenedoresVisibles();
  }, [esSuperAdmin, cargarContenedoresVisibles]);

  // ─── Conexión ─────────────────────────────────────────────────────────────

  const handleGuardar = async () => {
    if (!form.corporativoId || !form.contenedorId || !form.poolName.trim() || !form.mongoUri || !form.dbName) {
      toast.warning('Completa empresa, contenedor y todos los campos obligatorios');
      return;
    }
    setSaving(true);
    try {
      const res = await tenantDbService.guardarConexion({
        configId: form.configId || undefined,
        corporativoId: form.corporativoId,
        contenedorId: form.contenedorId,
        parentTenantDbConfigId: form.parentTenantDbConfigId || null,
        poolName:      form.poolName.trim(),
        mongoUri:      form.mongoUri,
        dbName:        form.dbName,
        urlBase:       form.urlBase || null,
        backupReplicaDbName: form.parentTenantDbConfigId ? (form.backupReplicaDbName?.trim() || null) : null,
      });
      toast.success(res.msg ?? 'Conexión guardada');
      setDlgConexion(false);
      setForm(FORM_VACIO);
      void cargarConfigs();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error guardando conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarConexion = async () => {
    if (dialogoConexionModo !== 'editar') {
      await handleGuardar();
      return;
    }

    await handleGuardar();
    return;

    const tenantGlobalId = String(configEditando?.tenantGlobal || '').trim();
    if (!tenantGlobalId) {
      toast.warning('No se pudo resolver el tenant de esta conexión');
      return;
    }

    setSaving(true);
    try {
      const res = await tenantDbService.actualizarUrlBase(tenantGlobalId, form.urlBase || null);
      toast.success(res.msg ?? 'URL parametrizada actualizada');
      setDlgConexion(false);
      setForm(FORM_VACIO);
      setDialogoConexionModo('crear');
      setConfigEditando(null);
      setDialogoConexionModo('crear');
      setConfigEditando(null);
      void cargarConfigs();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error actualizando la URL parametrizada');
    } finally {
      setSaving(false);
    }
  };

  const abrirDlgNuevaConexion = () => {
    setDialogoConexionModo('crear');
    setConfigEditando(null);
    setForm(FORM_VACIO);
    setDbOptions([]);
    setDbModoNueva(false);
    setDlgConexion(true);
  };

  const abrirDlgEditarUrl = (config: TenantDbConfig) => {
    const corporativoId = typeof config.corporativo === 'string'
      ? config.corporativo
      : config.corporativo?.iud ?? '';

    setDialogoConexionModo('editar');
    setConfigEditando(config);
    setShowUri(false);
    setDbOptions([]);
    setDbModoNueva(false);
    setForm({
      configId: config.iud,
      corporativoId,
      contenedorId: resolveContenedorId(config.contenedorId),
      parentTenantDbConfigId: '',
      poolName: config.poolName || '',
      mongoUri: '',
      dbName: config.dbName || '',
      urlBase: config.urlBase || '',
      backupReplicaDbName: config.backupReplicaDbName?.trim() || '',
    });
    setDlgConexion(true);
  };

  const abrirDlgEditarConexion = async (config: TenantDbConfig) => {
    const configId = String(config.iud || '').trim();
    if (!configId) {
      toast.warning('No se pudo resolver la configuración a editar');
      return;
    }

    if (!esSuperAdmin) {
      toast.warning('Solo tenantSuperAdmin puede editar conexiones');
      return;
    }

    setSaving(true);
    try {
      const res = await tenantDbService.obtenerConfigEditable(configId);
      const editable: TenantDbConfigEditable = res.data;
      const corporativoId = typeof editable.corporativo === 'string'
        ? editable.corporativo
        : editable.corporativo?.iud ?? '';

      setDialogoConexionModo('editar');
      setConfigEditando(editable);
      setShowUri(false);
      setDbOptions([]);
      setDbModoNueva(false);
      setForm({
        configId: editable.iud,
        corporativoId,
        contenedorId: resolveContenedorId(editable.contenedorId),
        parentTenantDbConfigId:
          typeof editable.parentTenantDbConfig === 'string'
            ? editable.parentTenantDbConfig
            : editable.parentTenantDbConfig?.iud || editable.parentTenantDbConfig?._id || '',
        poolName: editable.poolName || '',
        mongoUri: editable.mongoUri || '',
        dbName: editable.dbName || '',
        urlBase: editable.urlBase || '',
        backupReplicaDbName: editable.backupReplicaDbName?.trim() || '',
      });
      setDlgConexion(true);
      toast.info(`Conexión temporal cargada para edición: ${editable.poolName || editable.dbName}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo cargar la conexión editable');
    } finally {
      setSaving(false);
    }
  };

  const handleAbrirParametrizacion = (tenant: TenantDisponible) => {
    if (DEBUG_CONTENEDORES) {
      console.log('[TenantDbManager][contenedores] abrir modal parametrizacion', {
        tenantDisponible: tenant,
        corporativoId: tenant.corporativo?.iud,
        tenantGlobalId: tenant.iud,
      });
      toast.info(`Debug modal: abriendo con tenant ${tenant.iud.slice(0, 8)} y corporativo ${tenant.corporativo?.iud?.slice(0, 8) || 'N/A'}`);
    }
    setTenantParaParametrizar(tenant);
    setFormContenedor({ parentContenedorId: '', nombre: '', apisDominios: '', dominioFrontend: '', descripcion: '' });
    setNombreContenedorSeleccionado(NOMBRE_CONTENEDOR_MANUAL);
    setDlgParametrizacion(true);
  };

  // useMemo: evita que estos arrays cambien de referencia en cada render — si no,
  // el useEffect de abajo (que los lista como dependencia) se dispara en bucle infinito
  // cada vez que cargarContenedoresVisibles/cargarContenedoresTenant actualizan el estado.
  const contenedoresActualesTenant = useMemo(() => (
    tenantParaParametrizar
      ? (
        contenedoresVisibles.length > 0
          ? contenedoresVisibles
          : (
            contenedoresPorTenant.get(tenantParaParametrizar.iud)
            ?? contenedoresPorTenant.get(buildCorporativoMapKey(tenantParaParametrizar.corporativo?.iud))
            ?? []
          )
      )
      : []
  ), [tenantParaParametrizar, contenedoresVisibles, contenedoresPorTenant]);

  const nombresExistentesTenant = useMemo(() => Array.from(
    new Set(
      contenedoresActualesTenant
        .map((c) => String(c.nombre || '').trim())
        .filter(Boolean)
    )
  ), [contenedoresActualesTenant]);

  // Dispara el fetch SOLO cuando se abre el modal o cambia el tenant seleccionado.
  // No depende de los datos que el propio fetch produce (contenedoresVisibles/contenedoresPorTenant
  // cambian de referencia en cada respuesta, aunque el contenido sea el mismo) — si esos datos
  // estuvieran en las dependencias, cada respuesta dispararía el efecto de nuevo (bucle infinito).
  useEffect(() => {
    if (!dlgParametrizacion || !tenantParaParametrizar) return;

    void (async () => {
      const visibles = await cargarContenedoresVisibles({ silent: true });
      if (Array.isArray(visibles) && visibles.length > 0) {
        return;
      }

      await cargarContenedoresTenant(tenantParaParametrizar.iud, tenantParaParametrizar.corporativo?.iud);
    })();
  }, [dlgParametrizacion, tenantParaParametrizar, cargarContenedoresVisibles, cargarContenedoresTenant]);

  // Reacciona a los datos ya cargados (autoseleccionar nombre de contenedor) sin volver a pedirlos.
  useEffect(() => {
    if (!dlgParametrizacion || !tenantParaParametrizar) return;

    if (DEBUG_CONTENEDORES) {
      console.log('[TenantDbManager][contenedores] estado modal', {
        tenantGlobalId: tenantParaParametrizar.iud,
        corporativoId: tenantParaParametrizar.corporativo?.iud,
        totalActual: contenedoresActualesTenant.length,
        contenedoresActualesTenant,
      });
    }

    if (nombresExistentesTenant.length === 1 && !formContenedor.nombre.trim()) {
      const unicoNombre = nombresExistentesTenant[0];
      setNombreContenedorSeleccionado(unicoNombre);
      setFormContenedor((prev) => ({ ...prev, nombre: unicoNombre }));
      return;
    }

    if (nombresExistentesTenant.length > 1 && !nombresExistentesTenant.includes(nombreContenedorSeleccionado)) {
      setNombreContenedorSeleccionado('');
    }
  }, [
    dlgParametrizacion,
    tenantParaParametrizar,
    nombresExistentesTenant,
    nombreContenedorSeleccionado,
    formContenedor.nombre,
    contenedoresActualesTenant,
  ]);

  const handleCrearContenedor = async () => {
    if (!tenantParaParametrizar || !formContenedor.nombre.trim() || !formContenedor.apisDominios.trim()) {
      toast.warning('Completa el nombre y ambos dominios (APIs y Frontend)');
      return;
    }

    setParametrizacionLoading(true);
    try {
      await tenantDbService.crearContenedor(tenantParaParametrizar.corporativo?.iud || '', {
        nombre: formContenedor.nombre,
        apisDominios: formContenedor.apisDominios,
        parentContenedorId: formContenedor.parentContenedorId || undefined,
        dominioFrontend: formContenedor.dominioFrontend || undefined,
        descripcion: formContenedor.descripcion || undefined,
      });

      toast.success('Contenedor creado exitosamente');
      setFormContenedor({ parentContenedorId: '', nombre: '', apisDominios: '', dominioFrontend: '', descripcion: '' });
      setNombreContenedorSeleccionado(NOMBRE_CONTENEDOR_MANUAL);
      const visibles = await cargarContenedoresVisibles({ silent: true });
      if (!Array.isArray(visibles) || visibles.length === 0) {
        void cargarContenedoresTenant(tenantParaParametrizar.iud, tenantParaParametrizar.corporativo?.iud);
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Error creando contenedor');
    } finally {
      setParametrizacionLoading(false);
    }
  };

  const handleSeleccionarEmpresa = (corporativoId: string) => {
    setForm(f => ({ ...f, corporativoId, contenedorId: '', parentTenantDbConfigId: '', urlBase: '', poolName: '', dbName: '', backupReplicaDbName: '' }));
    setDbOptions([]);
    setDbModoNueva(false);
    if (!corporativoId) return;
    if (esSuperAdmin) {
      void cargarContenedoresVisibles({ silent: true });
    }
    const tenantGlobalId = resolveTenantDisponibleByCorporativoId(tenantsDisponibles, corporativoId)?.iud ?? '';
    // Siempre recargar al cambiar empresa — limpia caché anterior
    if (tenantGlobalId) {
      setContenedoresPorTenant(prev => {
        const next = new Map(prev);
        next.delete(tenantGlobalId);
        return next;
      });
      void cargarContenedoresTenant(tenantGlobalId, corporativoId);
    }

    // Pre-cargar poolName y dbName si ya tiene config guardada
    const configExistente = configs.find(c => {
      const cid = typeof c.corporativo === 'string' ? c.corporativo : c.corporativo?.iud;
      return cid === corporativoId;
    });
    if (configExistente) {
      setForm(f => ({
        ...f,
        poolName: configExistente.poolName ?? '',
        dbName: configExistente.dbName ?? '',
      }));
    }
  };

  const handleSeleccionarContenedor = (contenedor: ContenedorParametrizacion) => {
    setForm(f => ({
      ...f,
      contenedorId: contenedor.iud,
      urlBase: contenedor.dominioFrontend || contenedor.apisDominios?.dominio || f.urlBase,
    }));
  };

  const configsJerarquicasEmpresa = configs.filter((cfg) => {
    const cid = typeof cfg.corporativo === 'string' ? cfg.corporativo : cfg.corporativo?.iud;
    return cid === form.corporativoId && cfg.iud !== form.configId;
  });

  const configsPadreDelContenedor = configsJerarquicasEmpresa.filter((cfg) => {
    const contenedorCfgId = resolveContenedorId(cfg.contenedorId);
    return !!form.contenedorId && contenedorCfgId === form.contenedorId;
  });

  const debeOcultarSelectorPadre =
    !!form.contenedorId && configsPadreDelContenedor.length === 1;

  const contenedorSeleccionadoActual =
    contenedoresVisibles.find((item) => item.iud === form.contenedorId)
    || Array.from(contenedoresPorTenant.values()).flat().find((item) => item.iud === form.contenedorId)
    || null;

  const syncAutoSourceCandidates = tenantSeleccionado
    ? (() => {
        const currentId = resolverConfigId(tenantSeleccionado);
        const ids = new Set<string>();
        const parentId = resolveConfigRefId(tenantSeleccionado.parentTenantDbConfig);
        const rootId = resolveConfigRefId(tenantSeleccionado.rootTenantDbConfig);
        if (parentId && parentId !== currentId) ids.add(parentId);
        if (rootId && rootId !== currentId) ids.add(rootId);

        return Array.from(ids)
          .map((id) => configs.find((cfg) => resolverConfigId(cfg) === id))
          .filter((cfg): cfg is TenantDbConfig => Boolean(cfg));
      })()
    : [];

  const syncSourceCandidates = tenantSeleccionado
    ? configs.filter((cfg) => resolverConfigId(cfg) !== resolverConfigId(tenantSeleccionado) && cfg.estado)
    : [];

  // Colecciones que YA están guardadas en el sync de este tenant (para diferenciar "lo existente" de "lo nuevo").
  const coleccionesYaSincronizadas = new Set(
    (tenantSeleccionado?.coleccionesSync ?? [])
      .filter((c) => c.estado)
      .map((c) => c.coleccion)
  );
  const coleccionesNuevasDetectadas = syncCollections.filter((c) => !coleccionesYaSincronizadas.has(c));

  useEffect(() => {
    if (!form.contenedorId) {
      if (form.parentTenantDbConfigId) {
        setForm((prev) => ({ ...prev, parentTenantDbConfigId: '', backupReplicaDbName: '' }));
      }
      return;
    }

    if (configsPadreDelContenedor.length === 1) {
      const unicoPadre = configsPadreDelContenedor[0].iud;
      if (form.parentTenantDbConfigId !== unicoPadre) {
        setForm((prev) => ({ ...prev, parentTenantDbConfigId: unicoPadre }));
      }
      return;
    }

    const padreSigueSiendoValido = configsPadreDelContenedor.some((cfg) => cfg.iud === form.parentTenantDbConfigId);
    if (form.parentTenantDbConfigId && !padreSigueSiendoValido) {
      setForm((prev) => ({ ...prev, parentTenantDbConfigId: '', backupReplicaDbName: '' }));
    }
  }, [form.contenedorId, form.parentTenantDbConfigId, configsPadreDelContenedor]);

  useEffect(() => {
    if (!form.corporativoId || tenantsDisponibles.length === 0) return;

    const tenantSeleccionado = resolveTenantDisponibleByCorporativoId(tenantsDisponibles, form.corporativoId);
    if (!tenantSeleccionado?.iud) return;

    void cargarContenedoresTenant(tenantSeleccionado.iud, tenantSeleccionado.corporativo?.iud);
  }, [form.corporativoId, tenantsDisponibles, cargarContenedoresTenant]);

  useEffect(() => {
    if (!form.corporativoId) return;

    const tenantSeleccionado = resolveTenantDisponibleByCorporativoId(tenantsDisponibles, form.corporativoId);
    if (!tenantSeleccionado?.iud) return;

    const contenedores = contenedoresPorTenant.get(tenantSeleccionado.iud) ?? [];

    if (contenedores.length === 1 && form.contenedorId !== contenedores[0].iud) {
      handleSeleccionarContenedor(contenedores[0]);
      return;
    }

    if (contenedores.length > 1 && form.contenedorId) {
      const existeSeleccionado = contenedores.some((contenedor) => contenedor.iud === form.contenedorId);
      if (!existeSeleccionado) {
        setForm((prev) => ({ ...prev, contenedorId: '', urlBase: '' }));
      }
    }
  }, [form.corporativoId, form.contenedorId, tenantsDisponibles, contenedoresPorTenant]);

  const handleDesactivar = async (configId: string) => {
    const confirmacion = await Swal({
      title: '¿Desactivar esta conexión?',
      text: 'Se cerrará el pool del corporativo. Podrás reactivarla creando la conexión de nuevo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacion.isConfirmed) return;
    try {
      await tenantDbService.desactivar(configId);
      toast.success('Conexión desactivada');
      void cargarConfigs();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error desactivando');
    }
  };

  // ─── Sync ─────────────────────────────────────────────────────────────────

  const handleProbarConectividad = async (config: TenantDbConfig) => {
    const configId = resolverConfigId(config);
    setConnectivityLoadingId(configId);
    try {
      const res = await tenantDbService.migrarSchemas(configId);
      toast.success(res?.msg ?? 'Conectividad validada correctamente');
      await Promise.all([cargarConfigs(), cargarPool()]);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo validar la conectividad de la BD');
    } finally {
      setConnectivityLoadingId(null);
    }
  };

  function resolverConfigId(config: TenantDbConfig): string {
    return config.iud;
  }

  const abrirEstadoSync = async (config: TenantDbConfig) => {
    setEstadoSyncConfig(config);
    setDlgEstadoSync(true);
    await cargarPool();
  };

  const abrirDlgSync = (config: TenantDbConfig) => {
    const currentId = resolverConfigId(config);
    const sourceCandidates = configs.filter((cfg) => resolverConfigId(cfg) !== currentId && cfg.estado);
    const sourceCandidateIds = new Set(sourceCandidates.map((cfg) => resolverConfigId(cfg)));
    const sourcePreferido =
      resolveConfigRefId(config.parentTenantDbConfig)
      || resolveConfigRefId(config.rootTenantDbConfig)
      || '';
    const sourceInicial = sourceCandidateIds.has(sourcePreferido) ? sourcePreferido : '';
    setTenantSeleccionado(config);
    setSyncCollections([]);
    setSyncPreview(null);
    setSyncForm({
      sourceConfigId: String(sourceInicial || ''),
      coleccion: '',
      colecciones: [],
      autoSync: true,
      modo: 'full',
      filtroTexto: '',
    });
    setDlgSync(true);
  };

  const parseSyncFiltro = (rawInput: string) => {
    const raw = String(rawInput || '').trim();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error('El filtro JSON no es valido');
    }
  };

  const cargarColeccionesSync = useCallback(async (targetConfigId: string, sourceConfigId: string) => {
    if (!targetConfigId || !sourceConfigId) {
      setSyncCollections([]);
      return;
    }
    setSyncCollectionsLoading(true);
    try {
      const res = await tenantDbService.listarColeccionesSyncDisponibles(targetConfigId, sourceConfigId);
      setSyncCollections(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setSyncCollections([]);
      toast.error(err?.message ?? 'No se pudieron cargar las colecciones del padre');
    } finally {
      setSyncCollectionsLoading(false);
    }
  }, []);

  const handlePreviewSync = async () => {
    if (!tenantSeleccionado || !syncForm.sourceConfigId || !syncForm.coleccion) {
      toast.warning('Selecciona conexión padre y colección');
      return;
    }

    setSyncPreviewLoading(true);
    try {
      const filtro = parseSyncFiltro(syncForm.filtroTexto);
      const res = await tenantDbService.previewSync(resolverConfigId(tenantSeleccionado), {
        sourceConfigId: syncForm.sourceConfigId,
        coleccion: syncForm.coleccion,
        modo: syncForm.modo,
        filtro,
      });
      setSyncPreview(res.data);
      toast.success('Preview generado');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo generar el preview');
    } finally {
      setSyncPreviewLoading(false);
    }
  };

  const handleGuardarSync = async () => {
    if (!tenantSeleccionado || !syncForm.sourceConfigId || !syncForm.coleccion) {
      toast.warning('Nombre de colección obligatorio');
      return;
    }
    setSyncSaving(true);
    const id = resolverConfigId(tenantSeleccionado);
    try {
      const filtro = parseSyncFiltro(syncForm.filtroTexto);
      const res = await tenantDbService.configurarSync(id, {
        sourceConfigId: syncForm.sourceConfigId,
        coleccion: syncForm.coleccion,
        autoSync: syncForm.autoSync,
        modo: syncForm.modo,
        filtro,
      });
      toast.success(res.msg ?? 'Sync configurado');
      setDlgSync(false);
      void cargarConfigs();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error configurando sync');
    } finally {
      setSyncSaving(false);
    }
  };

  const handleSyncManual = async (config: TenantDbConfig, col: SyncColeccion) => {
    const id = resolverConfigId(config);
    const key = `${id}:${col.coleccion}`;
    setSyncManualLoading(key);
    try {
      const sourceConfigId = typeof col.sourceConfigId === 'string'
        ? col.sourceConfigId
        : col.sourceConfigId?.iud || col.sourceConfigId?._id || '';
      const res = await tenantDbService.ejecutarSync(id, {
        sourceConfigId,
        coleccion: col.coleccion,
        modo: col.modo,
        filtro: col.filtro,
      });
      toast.success(`Sync completado: ${res.data?.copiados ?? 0} documentos copiados`);
      void cargarConfigs();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error ejecutando sync');
    } finally {
      setSyncManualLoading(null);
    }
  };

  const handleRemoverSyncLegacy = async (config: TenantDbConfig, coleccion: string) => {
    if (!window.confirm(`¿Remover "${coleccion}" del sync?`)) return;
    const id = resolverConfigId(config);
    try {
      await tenantDbService.removerSync(id, coleccion);
      toast.success('Colección removida del sync');
      void cargarConfigs();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error removiendo sync');
    }
  };

  const handleRemoverSync = (config: TenantDbConfig, coleccion: string) => {
    setRemoverSyncTarget({ config, coleccion });
    setRemoverSyncDropCollection(true);
    setDlgRemoverSync(true);
  };

  const confirmarRemoverSync = async () => {
    if (!removerSyncTarget) return;
    const id = resolverConfigId(removerSyncTarget.config);
    setRemoverSyncLoading(true);
    try {
      await tenantDbService.removerSync(id, removerSyncTarget.coleccion, {
        dropCollection: removerSyncDropCollection,
      });
      toast.success(
        removerSyncDropCollection
          ? 'Sync removida en master; datos borrados en la BD hija (coleccion eliminada o vaciada)'
          : 'Solo se quito la sync en master; los datos siguen en la BD hija'
      );
      setDlgRemoverSync(false);
      setRemoverSyncTarget(null);
      void cargarConfigs();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error removiendo sync');
    } finally {
      setRemoverSyncLoading(false);
    }
  };

  const resolveSourceConfigIdFromCol = (col: SyncColeccion): string => {
    if (typeof col.sourceConfigId === 'string') return col.sourceConfigId;
    return col.sourceConfigId?.iud || col.sourceConfigId?._id || '';
  };

  const handleGuardarSyncConfig = async () => {
    if (!tenantSeleccionado || !syncForm.sourceConfigId) {
      toast.warning('Selecciona la conexion padre');
      return;
    }

    const targetConfigId = resolverConfigId(tenantSeleccionado);
    let coleccionesObjetivo = [...syncForm.colecciones];
    let omitidasPorExistentes = 0;

    setSyncSaving(true);
    try {
      if (syncForm.modo === 'full') {
        let disponibles = syncCollections;
        if (!disponibles.length) {
          const res = await tenantDbService.listarColeccionesSyncDisponibles(targetConfigId, syncForm.sourceConfigId);
          disponibles = Array.isArray(res.data) ? res.data : [];
          setSyncCollections(disponibles);
        }
        // Full = "traer lo nuevo del padre": valida contra lo ya guardado y NO reprocesa
        // lo existente (evita reiniciar watchers y resetear el preview de 200+ colecciones).
        const yaSincronizadas = new Set(
          (tenantSeleccionado.coleccionesSync ?? []).filter((c) => c.estado).map((c) => c.coleccion)
        );
        coleccionesObjetivo = disponibles.filter((c) => !yaSincronizadas.has(c));
        omitidasPorExistentes = disponibles.length - coleccionesObjetivo.length;
      }

      coleccionesObjetivo = Array.from(new Set(coleccionesObjetivo.filter(Boolean)));
      if (!coleccionesObjetivo.length) {
        toast.warning(
          syncForm.modo === 'full'
            ? (omitidasPorExistentes > 0
              ? `No hay colecciones nuevas en la BD padre; ya tienes las ${omitidasPorExistentes} sincronizadas.`
              : 'No se encontraron colecciones en la BD padre')
            : 'Selecciona una o varias colecciones'
        );
        return;
      }

      for (const coleccion of coleccionesObjetivo) {
        await tenantDbService.configurarSync(targetConfigId, {
          sourceConfigId: syncForm.sourceConfigId,
          coleccion,
          autoSync: syncForm.autoSync,
          modo: syncForm.modo,
          filtro: null,
        });
      }

      toast.success(
        syncForm.modo === 'full'
          ? `Se agregaron ${coleccionesObjetivo.length} colecciones nuevas del padre${omitidasPorExistentes > 0 ? ` (${omitidasPorExistentes} ya estaban sincronizadas)` : ''}`
          : `Se guardaron ${coleccionesObjetivo.length} sincronizaciones selectivas`
      );
      setDlgSync(false);
      setSyncCollections([]);
      setSyncPreview(null);
      void cargarConfigs();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error configurando sincronizacion');
    } finally {
      setSyncSaving(false);
    }
  };

  const handleAbrirSyncDatos = (config: TenantDbConfig, col: SyncColeccion) => {
    setSyncDataTarget({ config, col });
    setSyncDataForm({
      modo: (col.modo || 'incremental') as 'full' | 'incremental',
      filtroTexto: col.filtro ? JSON.stringify(col.filtro, null, 2) : '',
      selectedIds: [],
    });
    setSyncPreview(null);
    setDlgSyncDatos(true);
  };

  const handlePreviewSyncDatos = async (modoOverride?: 'full' | 'incremental') => {
    if (!syncDataTarget) {
      toast.warning('Selecciona una sincronizacion');
      return;
    }

    const targetConfigId = resolverConfigId(syncDataTarget.config);
    const sourceConfigId = resolveSourceConfigIdFromCol(syncDataTarget.col);
    if (!sourceConfigId) {
      toast.warning('No se pudo resolver la conexion padre');
      return;
    }

    const modoActual = modoOverride ?? syncDataForm.modo;
    setSyncPreviewLoading(true);
    try {
      const filtro = parseSyncFiltro(syncDataForm.filtroTexto);
      const res = await tenantDbService.previewSync(targetConfigId, {
        sourceConfigId,
        coleccion: syncDataTarget.col.coleccion,
        modo: modoActual,
        filtro,
        selectedIds: modoActual === 'incremental' ? syncDataForm.selectedIds : null,
      });
      setSyncPreview(res.data);
      toast.success('Preview generado');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo generar el preview');
    } finally {
      setSyncPreviewLoading(false);
    }
  };

  const handleEjecutarSyncDatos = async () => {
    if (!syncDataTarget) {
      toast.warning('Selecciona una sincronizacion');
      return;
    }

    const targetConfigId = resolverConfigId(syncDataTarget.config);
    const sourceConfigId = resolveSourceConfigIdFromCol(syncDataTarget.col);
    if (!sourceConfigId) {
      toast.warning('No se pudo resolver la conexion padre');
      return;
    }

    const key = `${targetConfigId}:${syncDataTarget.col.coleccion}`;
    setSyncManualLoading(key);
    try {
      const filtro = parseSyncFiltro(syncDataForm.filtroTexto);
      const res = await tenantDbService.ejecutarSync(targetConfigId, {
        sourceConfigId,
        coleccion: syncDataTarget.col.coleccion,
        modo: syncDataForm.modo,
        filtro,
        selectedIds: syncDataForm.modo === 'incremental' ? syncDataForm.selectedIds : null,
      });
      toast.success(`Sync completado: ${res.data?.copiados ?? 0} documentos copiados`);
      setDlgSyncDatos(false);
      setSyncPreview(null);
      void cargarConfigs();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error ejecutando sincronizacion');
    } finally {
      setSyncManualLoading(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (!dlgSync || !tenantSeleccionado) return;
    void cargarColeccionesSync(resolverConfigId(tenantSeleccionado), syncForm.sourceConfigId);
  }, [dlgSync, tenantSeleccionado, syncForm.sourceConfigId, cargarColeccionesSync]);

  useEffect(() => {
    if (!dlgSync || !tenantSeleccionado) return;
    if (syncForm.sourceConfigId) return;
    if (syncAutoSourceCandidates.length !== 1) return;

    const unicoOrigen = resolverConfigId(syncAutoSourceCandidates[0]);
    setSyncForm((prev) => ({ ...prev, sourceConfigId: unicoOrigen }));
  }, [dlgSync, tenantSeleccionado, syncForm.sourceConfigId, syncAutoSourceCandidates]);

  useEffect(() => {
    if (!dlgSync || !tenantSeleccionado) return;
    if (!syncForm.sourceConfigId) return;

    const sourceValido = syncSourceCandidates.some(
      (cfg) => resolverConfigId(cfg) === syncForm.sourceConfigId
    );

    if (!sourceValido) {
      setSyncForm((prev) => ({ ...prev, sourceConfigId: '', coleccion: '', colecciones: [] }));
      setSyncCollections([]);
      setSyncPreview(null);
    }
  }, [dlgSync, tenantSeleccionado, syncForm.sourceConfigId, syncSourceCandidates]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Conexiones de BD por Tenant</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona las cadenas de conexión MongoDB y la sincronización de colecciones desde master
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargarConfigs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button
            size="sm"
            onClick={abrirDlgNuevaConexion}
            disabled={!esSuperAdmin}
            title={!esSuperAdmin ? 'Solo tenantSuperAdmin puede registrar conexiones' : undefined}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva conexión
          </Button>
        </div>
      </div>

      <Tabs defaultValue="conexiones">
        <TabsList>
          <TabsTrigger value="conexiones">
            <Database className="w-4 h-4 mr-2" />
            Conexiones
          </TabsTrigger>
          <TabsTrigger value="sync">
            <Radio className="w-4 h-4 mr-2" />
            Sincronización
          </TabsTrigger>
          <TabsTrigger value="cronos-sync-hijos">
            <Timer className="w-4 h-4 mr-2" />
            Cronos / jerarquía
          </TabsTrigger>
          <TabsTrigger value="pool" onClick={cargarPool}>
            <Activity className="w-4 h-4 mr-2" />
            Pool / Watchers
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: CONEXIONES ── */}
        <TabsContent value="conexiones" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuraciones registradas</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : configs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Database className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No hay conexiones configuradas.</p>
                  <Button variant="link" className="mt-1" onClick={abrirDlgNuevaConexion}>
                    Agregar la primera conexión
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pool</TableHead>
                      <TableHead>Jerarquía</TableHead>
                      <TableHead>Base de datos</TableHead>
                      <TableHead>URL parametrizada</TableHead>
                      <TableHead>Migración</TableHead>
                      <TableHead>Colecciones sync</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configs.map(cfg => {
                      const id = resolverConfigId(cfg);
                      const isCheckingConnectivity = connectivityLoadingId === id;
                      return (
                        <TableRow key={cfg.iud || cfg.dbName || resolverConfigId(cfg)}>
                          <TableCell className="font-medium text-sm max-w-[160px] truncate" title={cfg.poolName}>
                            {cfg.poolName || <span className="opacity-40 font-mono text-xs">{id.slice(0, 12)}…</span>}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="space-y-0.5">
                              <p className="font-medium">{cfg.secuenciaHijoLabel || 'â€”'}</p>
                              <p className="text-muted-foreground">Nvl {cfg.nivelJerarquico ?? 1}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div>{cfg.dbName}</div>
                            {cfg.backupReplicaDbName ? (
                              <p className="text-[11px] font-mono text-muted-foreground mt-0.5" title="Réplica en cluster padre">
                                backup: {cfg.backupReplicaDbName}
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate" title={cfg.urlBase ?? '—'}>
                            {cfg.urlBase
                              ? <a href={cfg.urlBase} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">{cfg.urlBase}</a>
                              : <span className="opacity-40">—</span>
                            }
                          </TableCell>
                          <TableCell>
                            <MigrationBadge status={cfg.migrationStatus} />
                            {cfg.migrationError && (
                              <p className="text-xs text-destructive mt-1 max-w-[180px] truncate" title={cfg.migrationError}>
                                {cfg.migrationError}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {cfg.coleccionesSync?.filter(c => c.estado).length ?? 0} activas
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {cfg.estado ? (
                              <span className="flex items-center gap-1 text-success text-sm">
                                <CheckCircle2 className="w-4 h-4" /> Activa
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-destructive text-sm">
                                <XCircle className="w-4 h-4" /> Inactiva
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              id={`tenant-db-editar-${id}`}
                              variant="outline"
                              size="icon"
                              className={BTN_ROW_EDIT}
                              title="Editar conexión"
                              onClick={() => void abrirDlgEditarConexion(cfg)}
                              disabled={!esSuperAdmin}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              id={`tenant-db-probar-${id}`}
                              variant="outline"
                              size="icon"
                              className={BTN_ROW_PROBE}
                              title="Probar conectividad de la BD"
                              onClick={() => void handleProbarConectividad(cfg)}
                              disabled={isCheckingConnectivity}
                            >
                              {isCheckingConnectivity
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Radio className="w-4 h-4" />
                              }
                            </Button>
                            <Button
                              id={`tenant-db-eliminar-${id}`}
                              variant="outline"
                              size="icon"
                              className={BTN_ROW_DELETE}
                              title="Desactivar conexión"
                              onClick={() => handleDesactivar(id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: SINCRONIZACIÓN ── */}
        <TabsContent value="sync" className="mt-4 space-y-4">
          {configs.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Radio className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Primero registra al menos una conexión de BD.</p>
              </CardContent>
            </Card>
          ) : (
            configs.map((cfg, cfgIdx) => {
              const id = resolverConfigId(cfg);
              const expanded = expandedRows.has(cfg.iud);
              const colsActivas = cfg.coleccionesSync?.filter(c => c.estado) ?? [];
              const isCheckingConnectivity = connectivityLoadingId === id;
              const syncFiltroTexto = syncFiltroPorConfig[cfg.iud] ?? '';
              const colsFiltradas = syncFiltroTexto.trim()
                ? colsActivas.filter(c => c.coleccion.toLowerCase().includes(syncFiltroTexto.trim().toLowerCase()))
                : colsActivas;

              return (
                <Card key={cfg.iud || cfg.dbName || `cfg-${cfgIdx}`}>
                  <CardHeader
                    className="cursor-pointer select-none"
                    onClick={() => toggleExpand(cfg.iud)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-semibold text-sm">{cfg.poolName || cfg.dbName}</p>
                          <p className="text-xs text-muted-foreground">{cfg.dbName}</p>
                        </div>
                        <Badge variant="outline">{colsActivas.length} sync guardadas</Badge>
                      </div>
                      <div className="hidden flex-1 px-4 lg:block">
                        {colsActivas.length > 0 ? (
                          <div className="space-y-1" onClick={e => e.stopPropagation()}>
                            <p className="text-xs font-medium text-muted-foreground">Filtrar por nombre de colección</p>
                            <Input
                              value={syncFiltroTexto}
                              onChange={e => setSyncFiltroPorConfig(prev => ({ ...prev, [cfg.iud]: e.target.value }))}
                              placeholder="Ej: acciones, inventario..."
                              className="h-8 text-xs max-w-xs"
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Sin sincronizaciones de datos guardadas.</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={e => { e.stopPropagation(); abrirDlgSync(cfg); }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Explorar padre / agregar sync
                        </Button>
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </CardHeader>

                  {expanded && (
                    <CardContent className="pt-0">
                      <Separator className="mb-4" />
                      {colsActivas.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            No hay sincronizaciones guardadas para esta conexión. Usa el botón de arriba para traer las colecciones reales del padre.
                          </p>
                      ) : colsFiltradas.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            Ninguna colección coincide con &quot;{syncFiltroTexto}&quot;.
                          </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Colección</TableHead>
                              <TableHead>Auto-Sync</TableHead>
                              <TableHead>Modo</TableHead>
                              <TableHead>Último sync</TableHead>
                              <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {colsFiltradas.map(col => {
                              const syncKey = `${id}:${col.coleccion}`;
                              const isSyncing = syncManualLoading === syncKey;
                              return (
                                <TableRow key={col.coleccion}>
                                  <TableCell className="font-mono text-sm">{col.coleccion}</TableCell>
                                  <TableCell>
                                    {col.autoSync ? (
                                      <span className="flex items-center gap-1 text-success text-xs">
                                        <CircleDot className="w-3 h-3" /> En vivo
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                                        <Clock className="w-3 h-3" /> Manual
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="text-xs">{col.modo}</Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {col.ultimoSyncAt
                                      ? new Date(col.ultimoSyncAt).toLocaleString('es-CO')
                                      : '—'
                                    }
                                  </TableCell>
                                  <TableCell className="text-right space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={isSyncing}
                                      onClick={() => handleAbrirSyncDatos(cfg, col)}
                                      title="Abrir sincronizacion de datos"
                                    >
                                      {isSyncing
                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                        : <Play className="w-3 h-3" />
                                      }
                                      <span className="ml-1">Sincronizar datos</span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoverSync(cfg, col.coleccion)}
                                      title="Remover del sync"
                                    >
                                      <Trash2 className="w-3 h-3 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ── TAB: CRONOS SYNC HIJOS ── */}
        <TabsContent value="cronos-sync-hijos" className="mt-4">
          <CronosSyncHijosTab esSuperAdmin={esSuperAdmin} />
        </TabsContent>

        {/* ── TAB: POOL / WATCHERS ── */}
        <TabsContent value="pool" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={cargarPool} disabled={poolLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${poolLoading ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
          </div>

          {/* KPIs de la migración */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Conexiones activas</p>
                <p className="text-xl font-semibold">{metricasMigracion.conexionesActivas}<span className="text-sm text-muted-foreground">/{metricasMigracion.totalConexiones}</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Colecciones sincronizadas</p>
                <p className="text-xl font-semibold">{metricasMigracion.coleccionesSincronizadas}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><CircleDot className="w-3 h-3 text-success" /> En vivo</p>
                <p className="text-xl font-semibold">{metricasMigracion.enVivo}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Manual</p>
                <p className="text-xl font-semibold">{metricasMigracion.manual}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Radio className="w-3 h-3" /> Watchers activos</p>
                <p className="text-xl font-semibold">{metricasMigracion.watchersActivos}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {metricasMigracion.migracionesFallidas > 0
                    ? <XCircle className="w-3 h-3 text-destructive" />
                    : <CheckCircle2 className="w-3 h-3 text-success" />}
                  Migraciones fallidas
                </p>
                <p className={`text-xl font-semibold ${metricasMigracion.migracionesFallidas > 0 ? 'text-destructive' : ''}`}>
                  {metricasMigracion.migracionesFallidas}
                </p>
              </CardContent>
            </Card>
          </div>
          {metricasMigracion.ultimoSyncAt && (
            <p className="text-xs text-muted-foreground">
              Última sincronización registrada: {metricasMigracion.ultimoSyncAt.toLocaleString('es-CO')}
            </p>
          )}

          {poolLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !pool ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Haz clic en la pestaña para cargar el estado del pool.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pool de conexiones */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Conexiones activas en pool
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(pool.pool).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin conexiones en pool.</p>
                  ) : (
                    <ul className="space-y-3">
                      {Object.entries(pool.pool).map(([tenantId, conn]) => {
                        const cfgDeEstaConexion = configs.find(c => resolverConfigId(c) === tenantId);
                        return (
                          <li key={tenantId} className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-mono text-xs">{tenantId.slice(0, 20)}…</p>
                              <p className="text-xs text-muted-foreground">{conn.nombre}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-medium ${READY_STATE_COLOR[conn.readyState] ?? 'text-muted-foreground'}`}>
                                {READY_STATE_LABEL[conn.readyState] ?? 'Desconocido'}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!cfgDeEstaConexion}
                                title={cfgDeEstaConexion ? 'Abrir modal de sincronización' : 'No se encontró la conexión asociada'}
                                onClick={() => cfgDeEstaConexion && abrirDlgSync(cfgDeEstaConexion)}
                              >
                                <Radio className="w-3 h-3 mr-1" />
                                Sincronizar
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Watchers activos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Radio className="w-4 h-4" />
                    Change Streams activos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pool.watchersActivos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin watchers activos.</p>
                  ) : (
                    <ul className="space-y-2">
                      {/* Clave real del backend: `${configId}:${sourceId}:${coleccion}` (3 partes) */}
                      {pool.watchersActivos.map(w => {
                        const [tid, , ...colParts] = w.split(':');
                        const col = colParts.join(':');
                        return (
                          <li key={w} className="flex items-center gap-2 text-sm">
                            <CircleDot className="w-3 h-3 text-success shrink-0" />
                            <span className="font-mono text-xs">{tid?.slice(0, 10)}…</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">{col}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── DIALOG: Nueva conexión ── */}
      <Dialog open={dlgConexion} onOpenChange={(open) => {
        setDlgConexion(open);
        if (!open) {
          setDialogoConexionModo('crear');
          setConfigEditando(null);
          setForm(FORM_VACIO);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Registrar conexión de BD
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">

            {/* Empresa — lista perfilesCorporativos (todos los estados) */}
            <div className="space-y-2">
              <Label htmlFor="tenant-select">Empresa <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <select
                  id="tenant-select"
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex-1"
                  value={form.corporativoId}
                  onChange={e => handleSeleccionarEmpresa(e.target.value)}
                  disabled={tenantsLoading}
                >
                  <option value="">Selecciona una empresa...</option>
                  {tenantsDisponibles.map((t, idx) => (
                    <option key={t.corporativo?.iud ?? t.iud ?? `tenant-${idx}`} value={t.corporativo?.iud ?? ''}>
                      {t.corporativo?.razon_social ?? `Empresa ${t.iud.slice(0, 8)}...`}
                      {!t.estado ? ' (inactivo)' : ''}
                    </option>
                  ))}
                </select>
                {form.corporativoId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const t = tenantsDisponibles.find(x => x.corporativo?.iud === form.corporativoId);
                      if (t) handleAbrirParametrizacion(t);
                    }}
                    title="Parametrizar contenedores"
                    disabled={false}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Selecciona la empresa propietaria de esta conexión de BD.
              </p>
            </div>

            {dialogoConexionModo === 'editar' && (
              <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Se cargó una conexión temporal para edición protegida. Esta acción requiere scope tenantSuperAdmin.
              </div>
            )}

            {/* Seleccionar Contenedor Parametrizado */}
            {form.corporativoId && (
              <ContenedorSelect
                corporativoId={form.corporativoId}
                contenedorId={form.contenedorId}
                tenantsDisponibles={tenantsDisponibles}
                contenedoresPorTenant={contenedoresPorTenant}
                contenedoresVisibles={contenedoresVisibles}
                usarVistaGlobal={esSuperAdmin}
                disabled={false}
                onSelect={handleSeleccionarContenedor}
              />
            )}

            {form.corporativoId && !debeOcultarSelectorPadre && (
              <div className="space-y-2">
                <Label htmlFor="parent-config-select">Conexión padre</Label>
                <select
                  id="parent-config-select"
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-full"
                  value={form.parentTenantDbConfigId || ''}
                  onChange={e => setForm(f => ({ ...f, parentTenantDbConfigId: e.target.value }))}
                >
                  {configsPadreDelContenedor.length === 0 && (
                    <option value="">Crear como nodo raíz ({contenedorSeleccionadoActual?.secuencia ?? 'auto'})</option>
                  )}
                  {configsPadreDelContenedor.map((cfg, idx) => (
                    <option key={cfg.iud || cfg.dbName || `cfg-padre-${idx}`} value={cfg.iud}>
                      {getConfigJerarquiaLabel(cfg)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {configsPadreDelContenedor.length === 0
                    ? 'Si no existe un padre, esta conexión se guardará como nodo raíz.'
                    : 'Si eliges una conexión padre, la nueva secuencia se guardará como subnodo en tenantdbconfigs.'}
                </p>
              </div>
            )}

            {form.corporativoId && form.parentTenantDbConfigId && (
              <div className="space-y-2 rounded-md border border-dashed px-3 py-2">
                <Label htmlFor="backupReplicaDbName">BD backup / réplica (cluster del padre)</Label>
                <Input
                  id="backupReplicaDbName"
                  placeholder="ej: backup-hijo-empresa-x"
                  value={form.backupReplicaDbName ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, backupReplicaDbName: e.target.value }))}
                  className="font-mono text-sm"
                  disabled={false}
                />
                <p className="text-xs text-muted-foreground">
                  Misma URI Mongo que la conexión <strong>padre</strong>, pero <strong>otro nombre de base</strong>. Ahí el cron y la API copian los datos del hijo sin modificar la BD operativa del padre.
                </p>
              </div>
            )}

            {/* Nombre del pool */}
            <div className="space-y-1">
              <Label htmlFor="poolName">Nombre del pool <span className="text-destructive">*</span></Label>
              <Input
                id="poolName"
                placeholder="Ej: ACME-Producción, Hotel-Master, Pixel-Dev"
                value={form.poolName}
                  onChange={e => setForm(f => ({ ...f, poolName: e.target.value }))}
                  disabled={false}
              />
              <p className="text-xs text-muted-foreground">
                Identificador descriptivo para esta conexión en el pool.
              </p>
            </div>

            {/* Cadena de conexión */}
            <div className="space-y-1">
              <Label htmlFor="mongoUri">
                Cadena de conexión (MongoDB URI) <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="mongoUri"
                    type={showUri ? 'text' : 'password'}
                    placeholder="mongodb+srv://usuario:contraseña@cluster.mongodb.net/"
                    value={form.mongoUri}
                    onChange={e => {
                      setForm(f => ({ ...f, mongoUri: e.target.value }));
                      setDbOptions([]);
                      setDbModoNueva(false);
                    }}
                    className="pr-10"
                    disabled={false}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowUri(v => !v)}
                    disabled={false}
                  >
                    {showUri ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!form.mongoUri.trim() || dbLoading}
                  onClick={async () => {
                    setDbLoading(true);
                    try {
                      const res = await tenantDbService.listarBasesDatos(
                        form.mongoUri.trim(),
                        form.corporativoId || undefined
                      );
                      const dbs = res.databases ?? [];
                      setDbOptions(dbs);
                      setDbModoNueva(false);
                      setForm(f => ({
                        ...f,
                        dbName: '',
                        poolName: f.poolName || res.poolName || '',
                      }));
                      if (res.fuentePool) {
                        toast.success('Usando conexión del pool activo');
                      }
                    } catch (err: any) {
                      toast.error(err?.message ?? 'No se pudo conectar al cluster. Verifica la URI.');
                    } finally {
                      setDbLoading(false);
                    }
                  }}
                  title="Consultar bases de datos del cluster"
                >
                  {dbLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Nombre de la BD */}
            <div className="space-y-1">
              <Label htmlFor="dbName">Nombre de la base de datos <span className="text-destructive">*</span></Label>
              {dbOptions.length > 0 && !dbModoNueva ? (
                <div className="flex gap-2">
                  <select
                    id="dbName"
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex-1"
                    value={form.dbName}
                    onChange={e => setForm(f => ({ ...f, dbName: e.target.value }))}
                    disabled={false}
                  >
                    <option value="">Selecciona una base de datos...</option>
                    {dbOptions.map(db => (
                      <option key={db} value={db}>{db}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setDbModoNueva(true); setForm(f => ({ ...f, dbName: '' })); }}
                    disabled={false}
                    title="Crear nueva base de datos"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id="dbName"
                    placeholder="empresa-acme-produccion"
                    value={form.dbName}
                    onChange={e => setForm(f => ({ ...f, dbName: e.target.value }))}
                    className="flex-1"
                    disabled={false}
                  />
                  {dbOptions.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => { setDbModoNueva(false); setForm(f => ({ ...f, dbName: '' })); }}
                      disabled={false}
                      title="Volver a seleccionar"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
              {dbOptions.length === 0 && !dbLoading && (
                <p className="text-xs text-muted-foreground">
                  Haz clic en <RefreshCw className="inline w-3 h-3" /> para consultar las BDs del cluster.
                </p>
              )}
            </div>

            {/* URL parametrizada (auto-llenada) */}
            <div className="space-y-1">
              <Label htmlFor="urlBase">URL parametrizada del tenant</Label>
              <Input
                id="urlBase"
                placeholder="https://acme.tuapp.com"
                value={form.urlBase}
                onChange={e => setForm(f => ({ ...f, urlBase: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Auto-llenada desde el contenedor parametrizado. Se usa para enrutamiento y configuración de dominio.
              </p>
            </div>

            <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">¿Qué ocurre al guardar?</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Se abre la conexión al MongoDB del tenant.</li>
                <li>La cadena de conexión no se expone en respuestas futuras.</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgConexion(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarConexion} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : dialogoConexionModo === 'editar' ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {dialogoConexionModo === 'editar' ? 'Actualizar conexión' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Configurar sync de colección ── */}
      <Dialog open={dlgSync} onOpenChange={setDlgSync}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio className="w-5 h-5" />
              Configurar sincronización
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2 lg:grid-cols-2">
            <div className="rounded-md bg-muted px-3 py-2 text-xs lg:col-span-2">
              <p className="font-mono truncate">{tenantSeleccionado?.poolName || tenantSeleccionado?.dbName}</p>
              <p className="mt-1 text-muted-foreground">Destino cliente: {tenantSeleccionado?.dbName}</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="source-config">Conexión padre <span className="text-destructive">*</span></Label>
              {syncAutoSourceCandidates.length === 1 ? (
                <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                  <p className="font-medium">
                    {syncAutoSourceCandidates[0].poolName || syncAutoSourceCandidates[0].dbName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Padre detectado automáticamente: {getConfigJerarquiaLabel(syncAutoSourceCandidates[0])}
                  </p>
                </div>
              ) : (
                <select
                  id="source-config"
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-full"
                  value={syncForm.sourceConfigId}
                    onChange={e => {
                      const sourceConfigId = e.target.value;
                      setSyncForm(f => ({ ...f, sourceConfigId, coleccion: '', colecciones: [] }));
                      setSyncPreview(null);
                    }}
                >
                  <option value="">Selecciona la BD padre...</option>
                  {syncSourceCandidates.map((cfg, idx) => (
                    <option key={cfg.iud || cfg.dbName || `sync-src-${idx}`} value={cfg.iud}>
                      {cfg.poolName || cfg.dbName} | {getConfigJerarquiaLabel(cfg)} | {cfg.dbName}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-muted-foreground">
                Esta conexión será el origen maestro desde donde se migran y sincronizan los datos.
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="coleccion-sync">Colecciones del padre <span className="text-destructive">*</span></Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!tenantSeleccionado || !syncForm.sourceConfigId || syncCollectionsLoading}
                  onClick={() => {
                    if (!tenantSeleccionado || !syncForm.sourceConfigId) return;
                    void cargarColeccionesSync(resolverConfigId(tenantSeleccionado), syncForm.sourceConfigId);
                  }}
                >
                  {syncCollectionsLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                  Traer colecciones
                </Button>
              </div>
              {syncForm.modo === 'full' ? (
                <div className="rounded-md border bg-muted px-3 py-3 text-sm space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">Full valida lo existente contra el padre y solo agrega lo nuevo.</p>
                  </div>
                  {syncCollectionsLoading ? (
                    <p className="text-xs text-muted-foreground">Consultando colecciones de la BD padre...</p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{coleccionesYaSincronizadas.size} ya sincronizadas</Badge>
                      <Badge variant={coleccionesNuevasDetectadas.length > 0 ? 'default' : 'outline'}>
                        {coleccionesNuevasDetectadas.length} nuevas detectadas
                      </Badge>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {syncCollectionsLoading
                      ? 'Cargando colecciones del padre...'
                      : coleccionesNuevasDetectadas.length > 0
                        ? `Se agregarán ${coleccionesNuevasDetectadas.length} colecciones nuevas; las ${coleccionesYaSincronizadas.size} existentes no se tocan.`
                        : syncCollections.length > 0
                          ? 'No hay colecciones nuevas en el padre: ya tienes todas sincronizadas.'
                          : 'Aun no se ha detectado ninguna coleccion para sincronizar.'}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border p-3 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Selecciona una o varias colecciones especificas para esta sincronizacion.
                  </p>
                  <div className="max-h-48 overflow-auto">
                    {syncCollections.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {syncCollections.map((coleccion) => {
                          const checked = syncForm.colecciones.includes(coleccion);
                          return (
                            <label
                              key={coleccion}
                              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                                checked
                                  ? 'border-primary bg-primary/10 text-foreground'
                                  : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={checked}
                                onChange={(e) => {
                                  const marcado = e.target.checked;
                                  setSyncForm((prev) => ({
                                    ...prev,
                                    colecciones: marcado
                                      ? Array.from(new Set([...prev.colecciones, coleccion]))
                                      : prev.colecciones.filter((item) => item !== coleccion),
                                    coleccion: marcado ? coleccion : prev.coleccion === coleccion ? '' : prev.coleccion,
                                  }));
                                }}
                              />
                              <span>{coleccion}</span>
                              {coleccionesYaSincronizadas.has(coleccion) && (
                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  ya sincronizada
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {syncCollectionsLoading ? 'Cargando colecciones del padre...' : 'No hay colecciones disponibles'}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Se listan directamente desde la BD padre para que puedas guardar una o varias y sincronizar sus datos despues.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Modo de sincronización</Label>
              <div className="flex gap-3">
                {(['full', 'incremental'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setSyncForm(f => ({ ...f, modo: m }));
                      setSyncPreview(null);
                    }}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors
                      ${syncForm.modo === m
                        ? 'border-primary bg-primary/10 font-semibold'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50'}`}
                  >
                    {m === 'full' ? 'Full (todas las colecciones)' : 'Selectiva (una o varias)'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Full guarda todas las colecciones detectadas del padre. Selectiva te deja elegir exactamente cuales quieres trabajar.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Auto-Sync (Change Stream)</Label>
                <p className="text-xs text-muted-foreground">
                  Replica cambios del master en tiempo real
                </p>
              </div>
              <Switch
                checked={syncForm.autoSync}
                onCheckedChange={v => setSyncForm(f => ({ ...f, autoSync: v }))}
              />
            </div>
            <div className="rounded-md border p-3 text-xs text-muted-foreground lg:col-span-2">
              El filtro, el preview y la ejecucion manual de datos se manejan en el modal "Sincronizar datos" de cada coleccion guardada.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgSync(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarSyncConfig} disabled={syncSaving}>
              {syncSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Guardar sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dlgSyncDatos} onOpenChange={setDlgSyncDatos}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 px-6 pt-6">
              <Play className="w-5 h-5" />
              Sincronizacion de datos
            </DialogTitle>
          </DialogHeader>

          {syncDataTarget && (
            <div className="flex max-h-[calc(90vh-80px)] flex-col">
              <div className="overflow-y-auto px-6 py-2">
            <div className="grid gap-4 lg:grid-cols-2 pb-4">
              <div className="rounded-md bg-muted px-3 py-2 text-sm space-y-1 lg:col-span-2">
                <p className="font-medium">
                  {syncDataTarget.col.coleccion}
                </p>
                <p className="text-xs text-muted-foreground">
                  Origen: {configs.find((cfg) => resolverConfigId(cfg) === resolveSourceConfigIdFromCol(syncDataTarget.col))?.poolName || 'BD padre'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Destino: {syncDataTarget.config.poolName || syncDataTarget.config.dbName}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Modo de sincronizacion de datos</Label>
                <div className="flex gap-3">
                  {(['full', 'incremental'] as const).map((modo) => (
                    <button
                      key={modo}
                      type="button"
                      onClick={() => {
                        setSyncDataForm((prev) => ({ ...prev, modo, selectedIds: modo === 'full' ? [] : prev.selectedIds }));
                        if (modo === 'incremental') void handlePreviewSyncDatos('incremental');
                      }}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors
                        ${syncDataForm.modo === modo
                          ? 'border-primary bg-primary/10 font-semibold'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/50'}`}
                    >
                      {modo === 'full' ? 'Full (todos los registros del padre)' : 'Incremental (seleccionar registros)'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {syncDataForm.modo === 'full'
                    ? 'Full sincroniza todos los registros existentes del padre para esta coleccion.'
                    : 'Incremental te permite revisar los registros del padre y escoger exactamente cuales quieres sincronizar.'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Filtro manual</Label>
                <div className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      El JSON solo aparece si lo solicitas manualmente.
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={() => setDlgSyncManual(true)}>
                      <Pencil className="w-3 h-3 mr-1" />
                      Configurar JSON manual
                    </Button>
                  </div>
                  {syncDataForm.filtroTexto.trim() ? (
                    <pre className="max-h-24 overflow-auto rounded-md bg-muted p-2 text-[11px] leading-relaxed">
                      {syncDataForm.filtroTexto}
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Sin filtro manual. Se usaran todos los registros del padre segun el modo seleccionado.
                    </p>
                  )}
                </div>
              </div>

                <div className="rounded-md border p-3 space-y-3 lg:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Preview de datos</p>
                      <p className="text-xs text-muted-foreground">
                        Consulta cuantos registros existen en el padre, en el cliente y cuantos quedan pendientes.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePreviewSyncDatos}
                    disabled={syncPreviewLoading}
                  >
                    {syncPreviewLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Eye className="w-4 h-4 mr-1" />}
                    Ver datos
                  </Button>
                </div>

                {syncPreview && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Origen: {syncPreview.totalOrigen}</Badge>
                      <Badge variant="outline">Destino: {syncPreview.totalDestino}</Badge>
                      <Badge variant="secondary">Pendientes: {syncPreview.pendientes}</Badge>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">Registros en padre</p>
                        <p className="mt-1 text-2xl font-semibold">{syncPreview.totalOrigen}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">Registros en destino</p>
                        <p className="mt-1 text-2xl font-semibold">{syncPreview.totalDestino}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">Pendientes</p>
                        <p className="mt-1 text-2xl font-semibold">{syncPreview.pendientes}</p>
                      </div>
                    </div>

                    <div className={`grid gap-3 ${syncDataForm.modo === 'full' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
                      <div className="space-y-2">
                        <p className="text-xs font-medium">
                          {syncDataForm.modo === 'full' ? 'Muestra origen' : 'Registros del padre disponibles'}
                        </p>
                        <div className="grid gap-2">
                          {syncPreview.muestraOrigen.slice(0, syncDataForm.modo === 'full' ? 6 : 8).map((doc, index) => {
                            const rawId = String(doc?._id || doc?.iud || '');
                            const checked = syncDataForm.selectedIds.includes(rawId);
                            const interactive = syncDataForm.modo === 'incremental';
                            const Tag = interactive ? 'button' : 'div';
                            return (
                              <Tag
                                key={rawId || `origen-${index}`}
                                type={interactive ? 'button' : undefined}
                                onClick={interactive ? () => {
                                  if (!rawId) return;
                                  setSyncDataForm((prev) => ({
                                    ...prev,
                                    selectedIds: checked
                                      ? prev.selectedIds.filter((id) => id !== rawId)
                                      : Array.from(new Set([...prev.selectedIds, rawId])),
                                  }));
                                } : undefined}
                                className={`rounded-md border p-3 text-left text-xs ${interactive ? 'transition-colors' : ''} ${
                                  interactive && checked
                                    ? 'border-primary bg-primary/10'
                                    : 'bg-muted/40 hover:border-primary/50'
                                }`}
                              >
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <p className="break-all font-mono text-[11px] text-muted-foreground">
                                    {rawId || `registro-${index + 1}`}
                                  </p>
                                  {interactive ? (
                                    <Badge variant={checked ? 'default' : 'outline'}>
                                      {checked ? 'Seleccionado' : 'Disponible'}
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="space-y-1">
                                  {getPreviewEntries(doc as Record<string, unknown>).map(([key, value]) => (
                                    <div key={key} className="flex items-start justify-between gap-3">
                                      <span className="font-medium">{key}</span>
                                      <span className="break-all text-right text-muted-foreground">
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </Tag>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium">Registros actuales en destino</p>
                        <div className="grid gap-2">
                          {syncPreview.muestraDestino.slice(0, syncDataForm.modo === 'full' ? 6 : 8).map((doc, index) => (
                            <div key={`${String(doc?._id || index)}:destino`} className="rounded-md border bg-muted/40 p-3 text-xs">
                              <p className="mb-2 break-all font-mono text-[11px] text-muted-foreground">
                                {String((doc as Record<string, unknown>)?._id || `destino-${index + 1}`)}
                              </p>
                              <div className="space-y-1">
                                {getPreviewEntries(doc as Record<string, unknown>).map(([key, value]) => (
                                  <div key={key} className="flex items-start justify-between gap-3">
                                    <span className="font-medium">{key}</span>
                                    <span className="break-all text-right text-muted-foreground">
                                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {syncDataForm.modo === 'full' ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium">Pendientes de sincronizar</p>
                          <div className="grid gap-2">
                            {syncPreview.muestraPendientes.slice(0, 6).map((doc, index) => (
                              <div key={`${String((doc as Record<string, unknown>)?._id || index)}:pendiente`} className="rounded-md border bg-warning/10 p-3 text-xs">
                                <p className="mb-2 break-all font-mono text-[11px] text-muted-foreground">
                                  {String((doc as Record<string, unknown>)?._id || `pendiente-${index + 1}`)}
                                </p>
                                <div className="space-y-1">
                                  {getPreviewEntries(doc as Record<string, unknown>).map(([key, value]) => (
                                    <div key={key} className="flex items-start justify-between gap-3">
                                      <span className="font-medium">{key}</span>
                                      <span className="break-all text-right text-muted-foreground">
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {syncDataForm.modo === 'incremental' && syncPreview.muestraOrigen.length > 0 ? (
                      <div className="rounded-md border p-3 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">Seleccion de registros del padre</p>
                            <p className="text-xs text-muted-foreground">
                              En incremental puedes escoger registros especificos del padre para sincronizar.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSyncDataForm((prev) => ({
                                ...prev,
                                selectedIds: syncPreview.muestraOrigen
                                  .map((doc) => String(doc?._id || doc?.iud || '').trim())
                                  .filter(Boolean),
                              }))}
                            >
                              Seleccionar todos
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSyncDataForm((prev) => ({ ...prev, selectedIds: [] }))}
                            >
                              Limpiar
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">Registros listados: {syncPreview.muestraOrigen.length}</Badge>
                          <Badge variant="secondary">Seleccionados: {syncDataForm.selectedIds.length}</Badge>
                        </div>
                        <div className="max-h-56 overflow-auto rounded-md border bg-muted/20 p-3">
                          <div className="flex flex-wrap gap-2">
                            {syncPreview.muestraOrigen.map((doc, docIdx) => {
                              const rawId = String(doc?._id || doc?.iud || '');
                              const checked = syncDataForm.selectedIds.includes(rawId);
                              const codigo = String((doc as Record<string, unknown>)?.codigo || '');
                              const secuencia = (doc as Record<string, unknown>)?.secuencia;
                              const secuenciaLabel = secuencia !== undefined && secuencia !== null && secuencia !== ''
                                ? `Seq: ${String(secuencia)}`
                                : rawId.slice(-12);
                              return (
                                <button
                                  key={rawId || `orig-${docIdx}`}
                                  type="button"
                                  onClick={() => {
                                    if (!rawId) return;
                                    setSyncDataForm((prev) => ({
                                      ...prev,
                                      selectedIds: checked
                                        ? prev.selectedIds.filter((id) => id !== rawId)
                                        : Array.from(new Set([...prev.selectedIds, rawId])),
                                    }));
                                  }}
                                  className={`inline-flex cursor-pointer flex-col items-start rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                                    checked
                                      ? 'border-primary bg-primary/10 text-foreground'
                                      : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                                  }`}
                                >
                                  {codigo && <span className="max-w-[160px] truncate font-medium text-foreground/80">{codigo}</span>}
                                  <span className="font-mono text-[10px] opacity-70">{secuenciaLabel}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Si no marcas ninguno, incremental tomara todos los pendientes del padre segun el filtro.
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              </div>
              </div>
              <DialogFooter className="border-t bg-background px-6 py-4">
                <Button variant="outline" onClick={() => setDlgSyncDatos(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleEjecutarSyncDatos} disabled={syncPreviewLoading || !syncDataTarget}>
                  {syncManualLoading && syncDataTarget ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  Sincronizar ahora
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dlgEstadoSync} onOpenChange={setDlgEstadoSync}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio className="w-5 h-5" />
              Estado de sincronizacion
            </DialogTitle>
          </DialogHeader>

          {estadoSyncConfig && (
            <div className="grid gap-4 py-2 lg:grid-cols-2">
              <div className="rounded-md bg-muted px-3 py-3 text-sm space-y-1 lg:col-span-2">
                <p className="font-medium">{estadoSyncConfig.poolName || estadoSyncConfig.dbName}</p>
                <p className="text-xs text-muted-foreground">Base de datos: {estadoSyncConfig.dbName}</p>
                <p className="text-xs text-muted-foreground">
                  Jerarquia: {getConfigJerarquiaLabel(estadoSyncConfig)} | Nivel {estadoSyncConfig.nivelJerarquico || 1}
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Conexion actual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {(() => {
                    const configId = resolverConfigId(estadoSyncConfig);
                    const poolActual = pool?.pool?.[configId];
                    const watchersDetectados = (pool?.watchersActivos ?? []).filter((watcher) =>
                      String(watcher).startsWith(`${configId}:`)
                    );
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Estado pool</span>
                          <span className={`text-xs font-medium ${READY_STATE_COLOR[poolActual?.readyState ?? 0] ?? 'text-muted-foreground'}`}>
                            {READY_STATE_LABEL[poolActual?.readyState ?? 0]}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Nombre conexion</span>
                          <span className="font-mono text-xs">{poolActual?.nombre || 'Sin abrir en pool'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Watchers activos</span>
                          <Badge variant="outline">{watchersDetectados.length}</Badge>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Resumen de sincronizacion
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sync activas</span>
                    <Badge variant="secondary">
                      {estadoSyncConfig.coleccionesSync?.filter((item) => item.estado).length ?? 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Auto-sync activas</span>
                    <Badge variant="outline">
                      {estadoSyncConfig.coleccionesSync?.filter((item) => item.estado && item.autoSync).length ?? 0}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Colecciones sincronizadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(estadoSyncConfig.coleccionesSync?.filter((item) => item.estado).length ?? 0) === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Esta conexion aun no tiene colecciones sincronizadas.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Coleccion</TableHead>
                            <TableHead>Origen</TableHead>
                            <TableHead>Modo</TableHead>
                            <TableHead>Ultimo preview</TableHead>
                            <TableHead>Ultimo sync</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(estadoSyncConfig.coleccionesSync || []).filter((item) => item.estado).map((col) => {
                            const sourceId = resolveSourceConfigIdFromCol(col);
                            const origen = configs.find((cfg) => resolverConfigId(cfg) === sourceId);
                            return (
                              <TableRow key={`${estadoSyncConfig.iud}:${col.coleccion}`}>
                                <TableCell className="font-mono text-sm">{col.coleccion}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {origen?.poolName || origen?.dbName || 'BD padre'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-xs">{col.modo}</Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  <div>Origen: {col.previewTotalOrigen ?? 0}</div>
                                  <div>Destino: {col.previewTotalDestino ?? 0}</div>
                                  <div>Pendientes: {col.previewPendientes ?? 0}</div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {col.ultimoSyncAt ? new Date(col.ultimoSyncAt).toLocaleString('es-CO') : '—'}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      handleAbrirSyncDatos(estadoSyncConfig, col);
                                      setDlgEstadoSync(false);
                                    }}
                                  >
                                    <Play className="w-3 h-3 mr-1" />
                                    Sincronizar datos
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgEstadoSync(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dlgSyncManual} onOpenChange={setDlgSyncManual}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Filtro manual JSON</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="sync-data-filtro-manual">JSON de insercion / filtro</Label>
              <textarea
                id="sync-data-filtro-manual"
                className="flex min-h-[220px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder='Ej: { "estado": true }'
                value={syncDataForm.filtroTexto}
                onChange={(e) => setSyncDataForm((prev) => ({ ...prev, filtroTexto: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Usa este modal solo cuando necesites definir manualmente el JSON para filtrar o acotar la sincronizacion.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgSyncManual(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dlgRemoverSync}
        onOpenChange={(open) => {
          setDlgRemoverSync(open);
          if (!open) {
            setRemoverSyncTarget(null);
            setRemoverSyncLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Confirmar eliminación de sincronización
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md bg-muted px-4 py-3 text-sm">
              <p className="font-medium">{removerSyncTarget?.coleccion || 'Colección'}</p>
              <p className="text-xs text-muted-foreground">
                La base del padre no se modifica. Solo se actualiza la parametrización en master y, si eliges la opción de abajo, los datos en la BD hija.
              </p>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-md border px-4 py-3">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Borrar en la BD hija los datos sincronizados de esta colección</Label>
                <p className="text-xs text-muted-foreground">
                  Activado por defecto: elimina la colección en el hijo (o vacía sus documentos si el usuario de BD no tiene permiso de drop). Si lo desactivas, solo se quita la sync guardada y los documentos copiados siguen en la BD hija.
                </p>
              </div>
              <Switch
                checked={removerSyncDropCollection}
                onCheckedChange={setRemoverSyncDropCollection}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDlgRemoverSync(false);
                setRemoverSyncTarget(null);
              }}
              disabled={removerSyncLoading}
            >
              Cancelar
            </Button>
            <Button onClick={confirmarRemoverSync} disabled={removerSyncLoading}>
              {removerSyncLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={false && dlgSync} onOpenChange={setDlgSync}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio className="w-5 h-5" />
              Configurar sincronización
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md bg-muted px-3 py-2 text-xs">
              <p className="font-mono truncate">{tenantSeleccionado?.dbName}</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="coleccion">Nombre de la colección <span className="text-destructive">*</span></Label>
              <Input
                id="coleccion"
                placeholder="Ej: Producto, emailPaleta, tipoAccesoTenant"
                value={syncForm.coleccion}
                onChange={e => setSyncForm(f => ({ ...f, coleccion: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Nombre exacto del modelo Mongoose registrado en el backend.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Modo de sincronización</Label>
              <div className="flex gap-3">
                {(['full', 'incremental'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSyncForm(f => ({ ...f, modo: m }))}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors
                      ${syncForm.modo === m
                        ? 'border-primary bg-primary/10 font-semibold'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50'}`}
                  >
                    {m === 'full' ? 'Full (reemplaza todo)' : 'Incremental (upsert)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Auto-Sync (Change Stream)</Label>
                <p className="text-xs text-muted-foreground">
                  Replica cambios del master en tiempo real
                </p>
              </div>
              <Switch
                checked={syncForm.autoSync}
                onCheckedChange={v => setSyncForm(f => ({ ...f, autoSync: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgSync(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarSync} disabled={syncSaving}>
              {syncSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Guardar sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Parametrización de contenedores ── */}
      <Dialog open={dlgParametrizacion} onOpenChange={v => { setDlgParametrizacion(v); if (!v) setTenantParaParametrizar(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Parametrizar contenedores
            </DialogTitle>
          </DialogHeader>

          {tenantParaParametrizar && (
            <div className="space-y-4 py-2">
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                <p className="font-medium">
                  {typeof tenantParaParametrizar.corporativo === 'object' && tenantParaParametrizar.corporativo?.razon_social
                    ? tenantParaParametrizar.corporativo.razon_social
                    : `Tenant ${tenantParaParametrizar.iud?.slice(0, 8)}...`}
                </p>
              </div>

              {/* Formulario + lista */}
              <div className="space-y-3 border-b pb-4">
                <h3 className="font-medium text-sm">Crear nuevo contenedor</h3>

                <div className="space-y-1">
                  <Label htmlFor="cont-parent">Jerarquía del contenedor</Label>
                  <select
                    id="cont-parent"
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-full"
                    value={formContenedor.parentContenedorId || CONTENEDOR_RAIZ}
                    onChange={e => setFormContenedor(f => ({
                      ...f,
                      parentContenedorId: e.target.value === CONTENEDOR_RAIZ ? '' : e.target.value,
                    }))}
                  >
                    <option value={CONTENEDOR_RAIZ}>Crear como contenedor raíz</option>
                    {contenedoresActualesTenant.map((contenedor, idx) => (
                      <option key={contenedor.iud || `cont-${idx}`} value={contenedor.iud}>
                        Crear debajo de: {getContenedorTreeLabel(contenedor)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Si eliges un padre, la secuencia se calculará entre sus subnodos hermanos.
                  </p>
                </div>

                {nombresExistentesTenant.length > 0 && (
                  <div className="space-y-1">
                    <Label htmlFor="cont-nombre-template">Usar nombre existente</Label>
                    <select
                      id="cont-nombre-template"
                      className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-full"
                      value={nombreContenedorSeleccionado}
                      onChange={e => {
                        const valor = e.target.value;
                        setNombreContenedorSeleccionado(valor);

                        if (valor === NOMBRE_CONTENEDOR_MANUAL) {
                          setFormContenedor(prev => ({ ...prev, nombre: '' }));
                          return;
                        }

                        if (valor) {
                          setFormContenedor(prev => ({ ...prev, nombre: valor }));
                        }
                      }}
                    >
                      {nombresExistentesTenant.length > 1 && (
                        <option value="">Selecciona un nombre existente</option>
                      )}
                      {nombresExistentesTenant.map(nombre => (
                        <option key={nombre} value={nombre}>
                          {nombre}
                        </option>
                      ))}
                      <option value={NOMBRE_CONTENEDOR_MANUAL}>Escribir un nombre nuevo</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Si ya existe un nombre lo puedes reutilizar. Si no te sirve, elige la opción manual.
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="cont-nombre">Nombre del contenedor *</Label>
                  <Input
                    id="cont-nombre"
                    placeholder="Ej: Ambiente de Producción"
                    value={formContenedor.nombre}
                    onChange={e => {
                      const valor = e.target.value;
                      setFormContenedor(f => ({ ...f, nombre: valor }));

                      if (!valor.trim()) {
                        setNombreContenedorSeleccionado(
                          nombresExistentesTenant.length === 1 ? nombresExistentesTenant[0] : NOMBRE_CONTENEDOR_MANUAL
                        );
                        return;
                      }

                      const coincide = nombresExistentesTenant.find(nombre => nombre === valor.trim());
                      setNombreContenedorSeleccionado(coincide ?? NOMBRE_CONTENEDOR_MANUAL);
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cont-api-dominio">Dominio frontend</Label>
                  <select
                    id="cont-api-dominio"
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-full"
                    value={formContenedor.apisDominios}
                    onChange={e => setFormContenedor(f => ({ ...f, apisDominios: e.target.value }))}
                  >
                    <option value="">Selecciona un dominio registrado</option>
                    {apisDominios.map((dominio, idx) => (
                      <option key={dominio.iud || dominio.dominio || `dominio-${idx}`} value={dominio.iud}>
                        {dominio.etiquetas} - {dominio.dominio}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">URL principal del backend para este contenedor.</p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cont-dominio-frontend">Dominio backend</Label>
                  <Input
                    id="cont-dominio-frontend"
                    placeholder="Ej: https://mabs.example.com"
                    value={formContenedor.dominioFrontend}
                    onChange={e => setFormContenedor(f => ({ ...f, dominioFrontend: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">URL del frontend para este contenedor (opcional).</p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cont-desc">Descripción (opcional)</Label>
                  <Input
                    id="cont-desc"
                    placeholder="Notas internas sobre este contenedor"
                    value={formContenedor.descripcion}
                    onChange={e => setFormContenedor(f => ({ ...f, descripcion: e.target.value }))}
                  />
                </div>

                <Button
                  onClick={handleCrearContenedor}
                  disabled={parametrizacionLoading || !formContenedor.nombre.trim()}
                  className="w-full"
                >
                  {parametrizacionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Crear contenedor
                </Button>
              </div>

              {/* Lista de contenedores existentes */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Contenedores existentes</h3>
                {contenedoresActualesTenant.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No hay contenedores parametrizados aún. Crea uno arriba.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {contenedoresActualesTenant.map((c, idx) => (
                      <div
                        key={c.iud || `cont-tree-${idx}`}
                        className="flex items-start justify-between p-2 border rounded-md"
                        style={{ marginLeft: `${Math.max(0, (Number(c.nivel || 1) - 1) * 20)}px` }}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{getContenedorLabel(c)}</p>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {c.apisDominios?.dominio && <p>Dominio: {c.apisDominios.dominio}</p>}
                            <p>Nivel: {c.nivel ?? 1} | Secuencia: #{c.secuenciaJerarquica || c.secuencia}</p>
                          </div>
                        </div>
                        <Badge variant={c.estado ? 'default' : 'secondary'}>
                          {c.estado ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgParametrizacion(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

