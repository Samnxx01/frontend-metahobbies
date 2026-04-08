import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
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
} from 'lucide-react';

import {
  tenantDbService,
  type TenantDbConfig,
  type TenantDbConfigEditable,
  type SyncColeccion,
  type TenantDisponible,
  type ContenedorParametrizacion,
} from '../../../services/tenantDbService';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const READY_STATE_LABEL: Record<number, string> = {
  0: 'Desconectada',
  1: 'Conectada',
  2: 'Conectando',
  3: 'Desconectando',
};

const READY_STATE_COLOR: Record<number, string> = {
  0: 'text-red-500',
  1: 'text-green-500',
  2: 'text-yellow-500',
  3: 'text-orange-500',
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
        {contenedores.map(c => (
          <option key={c.iud} value={c.iud}>
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
}

const FORM_VACIO: FormConexion = { configId: '', corporativoId: '', contenedorId: '', parentTenantDbConfigId: '', poolName: '', mongoUri: '', dbName: '', urlBase: '' };
type DialogoConexionModo = 'crear' | 'editar';

// ─── Componente principal ─────────────────────────────────────────────────────

export default function TenantDbManager() {
  // ── Estado general ──
  const [configs, setConfigs] = useState<TenantDbConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  // ── Dialog sync ──
  const [dlgSync, setDlgSync] = useState(false);
  const [syncForm, setSyncForm] = useState({ coleccion: '', autoSync: true, modo: 'full' as 'full' | 'incremental' });
  const [syncSaving, setSyncSaving] = useState(false);

  // ── Sync manual ──
  const [syncManualLoading, setSyncManualLoading] = useState<string | null>(null); // "tenantId:coleccion"

  // ── Pool ──
  const [pool, setPool] = useState<{ pool: Record<string, { readyState: number; nombre: string }>; watchersActivos: string[] } | null>(null);
  const [poolLoading, setPoolLoading] = useState(false);

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

  const contenedoresActualesTenant = tenantParaParametrizar
    ? (
      contenedoresVisibles.length > 0
        ? contenedoresVisibles
        : (
          contenedoresPorTenant.get(tenantParaParametrizar.iud)
          ?? contenedoresPorTenant.get(buildCorporativoMapKey(tenantParaParametrizar.corporativo?.iud))
          ?? []
        )
    )
    : [];

  const nombresExistentesTenant = Array.from(
    new Set(
      contenedoresActualesTenant
        .map((c) => String(c.nombre || '').trim())
        .filter(Boolean)
    )
  );

  useEffect(() => {
    if (!dlgParametrizacion || !tenantParaParametrizar) return;

    void (async () => {
      const visibles = await cargarContenedoresVisibles({ silent: true });
      if (Array.isArray(visibles) && visibles.length > 0) {
        return;
      }

      await cargarContenedoresTenant(tenantParaParametrizar.iud, tenantParaParametrizar.corporativo?.iud);
    })();

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
    cargarContenedoresTenant,
    cargarContenedoresVisibles,
    contenedoresActualesTenant,
  ]);

  const handleCrearContenedor = async () => {
    if (!tenantParaParametrizar || !formContenedor.nombre.trim() || !formContenedor.apisDominios.trim()) {
      toast.warning('Completa el nombre y ambos dominios (APIs y Frontend)');
      return;
    }

    setParametrizacionLoading(true);
    try {
      await tenantDbService.crearContenedor(tenantParaParametrizar.iud, {
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
    setForm(f => ({ ...f, corporativoId, contenedorId: '', parentTenantDbConfigId: '', urlBase: '', poolName: '', dbName: '' }));
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

  useEffect(() => {
    if (!form.contenedorId) {
      if (form.parentTenantDbConfigId) {
        setForm((prev) => ({ ...prev, parentTenantDbConfigId: '' }));
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
      setForm((prev) => ({ ...prev, parentTenantDbConfigId: '' }));
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
    if (!window.confirm('¿Desactivar esta conexión? Se cerrará el pool del corporativo.')) return;
    try {
      await tenantDbService.desactivar(configId);
      toast.success('Conexión desactivada');
      void cargarConfigs();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error desactivando');
    }
  };

  // ─── Sync ─────────────────────────────────────────────────────────────────

  const resolverConfigId = (config: TenantDbConfig): string => config.iud;

  const notificarEstadoSync = async (config: TenantDbConfig) => {
    try {
      const estado = await tenantDbService.estadoPool();
      const poolActual = config.poolName ? estado.pool?.[config.poolName] : undefined;
      const autoSyncActivos = config.coleccionesSync?.filter((item) => item.estado && item.autoSync).length ?? 0;
      const watchersDetectados = (estado.watchersActivos ?? []).filter((watcher) =>
        [config.poolName, config.dbName].filter(Boolean).some((valor) =>
          String(watcher).toLowerCase().includes(String(valor).toLowerCase())
        )
      ).length;

      toast.info(
        `Pool ${config.poolName || config.dbName}: ${READY_STATE_LABEL[poolActual?.readyState ?? 0]}. Auto-sync activos: ${autoSyncActivos}. Watchers detectados: ${watchersDetectados}.`
      );
    } catch {
      toast.info(
        `Sincronización disponible para ${config.poolName || config.dbName}. Revisa colecciones y watchers al abrir el modal.`
      );
    }
  };

  const abrirDlgSync = (config: TenantDbConfig) => {
    setTenantSeleccionado(config);
    setSyncForm({ coleccion: '', autoSync: true, modo: 'full' });
    setDlgSync(true);
  };

  const handleGuardarSync = async () => {
    if (!tenantSeleccionado || !syncForm.coleccion) {
      toast.warning('Nombre de colección obligatorio');
      return;
    }
    setSyncSaving(true);
    const id = resolverConfigId(tenantSeleccionado);
    try {
      const res = await tenantDbService.configurarSync(id, {
        coleccion: syncForm.coleccion,
        autoSync: syncForm.autoSync,
        modo: syncForm.modo,
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
      const res = await tenantDbService.ejecutarSync(id, {
        coleccion: col.coleccion,
        modo: col.modo,
      });
      toast.success(`Sync completado: ${res.data?.copiados ?? 0} documentos copiados`);
      void cargarConfigs();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error ejecutando sync');
    } finally {
      setSyncManualLoading(null);
    }
  };

  const handleRemoverSync = async (config: TenantDbConfig, coleccion: string) => {
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

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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
                      return (
                        <TableRow key={cfg.iud}>
                          <TableCell className="font-medium text-sm max-w-[160px] truncate" title={cfg.poolName}>
                            {cfg.poolName || <span className="opacity-40 font-mono text-xs">{id.slice(0, 12)}…</span>}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="space-y-0.5">
                              <p className="font-medium">{cfg.secuenciaHijoLabel || 'â€”'}</p>
                              <p className="text-muted-foreground">Nvl {cfg.nivelJerarquico ?? 1}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{cfg.dbName}</TableCell>
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
                              <span className="flex items-center gap-1 text-green-600 text-sm">
                                <CheckCircle2 className="w-4 h-4" /> Activa
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-500 text-sm">
                                <XCircle className="w-4 h-4" /> Inactiva
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              title="Editar conexión"
                              onClick={() => void abrirDlgEditarConexion(cfg)}
                              disabled={!esSuperAdmin}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              title="Configurar sync de colecciones"
                              onClick={() => void notificarEstadoSync(cfg)}
                            >
                              <Radio className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              title="Desactivar conexión"
                              onClick={() => handleDesactivar(id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
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
            configs.map(cfg => {
              const id = resolverConfigId(cfg);
              const expanded = expandedRows.has(cfg.iud);
              const colsActivas = cfg.coleccionesSync?.filter(c => c.estado) ?? [];

              return (
                <Card key={cfg.iud}>
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
                        <Badge variant="outline">{colsActivas.length} colecciones</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={e => { e.stopPropagation(); abrirDlgSync(cfg); }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Agregar colección
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
                          No hay colecciones configuradas para este tenant.
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
                            {colsActivas.map(col => {
                              const syncKey = `${id}:${col.coleccion}`;
                              const isSyncing = syncManualLoading === syncKey;
                              return (
                                <TableRow key={col.coleccion}>
                                  <TableCell className="font-mono text-sm">{col.coleccion}</TableCell>
                                  <TableCell>
                                    {col.autoSync ? (
                                      <span className="flex items-center gap-1 text-green-600 text-xs">
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
                                      onClick={() => handleSyncManual(cfg, col)}
                                      title="Ejecutar sync manual ahora"
                                    >
                                      {isSyncing
                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                        : <Play className="w-3 h-3" />
                                      }
                                      <span className="ml-1">Sincronizar</span>
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

        {/* ── TAB: POOL / WATCHERS ── */}
        <TabsContent value="pool" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={cargarPool} disabled={poolLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${poolLoading ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
          </div>

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
                      {Object.entries(pool.pool).map(([tenantId, conn]) => (
                        <li key={tenantId} className="flex items-center justify-between">
                          <div>
                            <p className="font-mono text-xs">{tenantId.slice(0, 20)}…</p>
                            <p className="text-xs text-muted-foreground">{conn.nombre}</p>
                          </div>
                          <span className={`text-xs font-medium ${READY_STATE_COLOR[conn.readyState] ?? 'text-muted-foreground'}`}>
                            {READY_STATE_LABEL[conn.readyState] ?? 'Desconocido'}
                          </span>
                        </li>
                      ))}
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
                      {pool.watchersActivos.map(w => {
                        const [tid, col] = w.split(':');
                        return (
                          <li key={w} className="flex items-center gap-2 text-sm">
                            <CircleDot className="w-3 h-3 text-green-500 shrink-0" />
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
                  {tenantsDisponibles.map(t => (
                    <option key={t.corporativo?.iud ?? t.iud} value={t.corporativo?.iud ?? ''}>
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
                  {configsPadreDelContenedor.map((cfg) => (
                    <option key={cfg.iud} value={cfg.iud}>
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
        <DialogContent className="max-w-sm">
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
                    {contenedoresActualesTenant.map((contenedor) => (
                      <option key={contenedor.iud} value={contenedor.iud}>
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
                    {apisDominios.map((dominio) => (
                      <option key={dominio.iud} value={dominio.iud}>
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
                    {contenedoresActualesTenant.map(c => (
                      <div
                        key={c.iud}
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

