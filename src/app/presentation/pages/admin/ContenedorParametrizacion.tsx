import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { swalFire as Swal } from '@/lib/sweetalert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
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
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronRight,
  Database,
  DatabaseZap,
  Eye,
  EyeOff,
  FolderOpen,
  Globe,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  SearchCode,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  type Contenedor,
  type CrearContenedorPayload,
  type Dominio,
  type GuardarConexionPayload,
  type MigrationStatus,
  type TenantDbConfig,
  type TenantDisponible,
  contenedorService,
  dbConfigService,
  listarDominios,
} from '@/app/services/contenedorParametrizacionService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toSlug = (v: string) =>
  v.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const resolveId = (v: { iud?: string; _id?: string } | string | null | undefined): string => {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v.iud || v._id || '';
};

const MIGRATION_BADGE: Record<MigrationStatus, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-warning/10 text-warning' },
  en_proceso: { label: 'En proceso', cls: 'bg-info/10 text-info' },
  completada: { label: 'Migrada', cls: 'bg-success/10 text-success' },
  fallida: { label: 'Fallida', cls: 'bg-destructive/10 text-destructive' },
};

// ─── Form contenedor ──────────────────────────────────────────────────────────

interface ContenedorForm {
  nombre: string;
  slug: string;
  parentContenedorId: string;
  apisDominiosId: string;
  dominioFrontend: string;
  descripcion: string;
}

const CONTENEDOR_EMPTY: ContenedorForm = {
  nombre: '',
  slug: '',
  parentContenedorId: '',
  apisDominiosId: '',
  dominioFrontend: '',
  descripcion: '',
};

// ─── Form conexión BD ─────────────────────────────────────────────────────────

interface DbForm {
  poolName: string;
  mongoUri: string;
  dbName: string;
  urlBase: string;
  parentTenantDbConfigId: string;
  backupReplicaDbName: string;
}

const DB_EMPTY: DbForm = {
  poolName: '',
  mongoUri: '',
  dbName: '',
  urlBase: '',
  parentTenantDbConfigId: '',
  backupReplicaDbName: '',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ContenedorParametrizacion(): React.ReactElement {
  // Datos maestros
  const [tenants, setTenants] = useState<TenantDisponible[]>([]);
  // Sin filtrar por tenantGlobal (a diferencia de `tenants`): incluye toda empresa aunque
  // todavía no tenga tenantGlobal vinculado, para la tabla "Perfiles corporativos".
  const [todosCorporativos, setTodosCorporativos] = useState<TenantDisponible[]>([]);
  const [contenedoresVisibles, setContenedoresVisibles] = useState<Contenedor[]>([]);
  const [cargandoVisibles, setCargandoVisibles] = useState(false);
  const [dominios, setDominios] = useState<Dominio[]>([]);
  const [contenedores, setContenedores] = useState<Contenedor[]>([]);
  const [dbConfigs, setDbConfigs] = useState<TenantDbConfig[]>([]);

  // Selección de tenant
  const [tenantId, setTenantId] = useState('');

  // Flags de carga
  const [cargandoInicial, setCargandoInicial] = useState(false);
  const [cargandoContenedores, setCargandoContenedores] = useState(false);
  const [guardandoContenedor, setGuardandoContenedor] = useState(false);
  const [guardandoDb, setGuardandoDb] = useState(false);
  const [descubriendo, setDescubriendo] = useState(false);
  const [migrando, setMigrando] = useState<string | null>(null); // configId en migración

  // Dialog parametrizar conexión (flujo rápido: tenant → contenedor → form BD)
  const [dialogParametrizar, setDialogParametrizar] = useState(false);
  const [pTodasConfigs, setPTodasConfigs] = useState<TenantDbConfig[]>([]);
  const [pTenantId, setPTenantId] = useState('');
  const [pContenedores, setPContenedores] = useState<Contenedor[]>([]);
  const [pContenedor, setPContenedor] = useState<Contenedor | null>(null);
  const [pConfigDb, setPConfigDb] = useState<TenantDbConfig | null>(null);
  const [pFormDb, setPFormDb] = useState<DbForm>(DB_EMPTY);
  const [pMostrarUri, setPMostrarUri] = useState(false);
  const [pBases, setPBases] = useState<string[]>([]);
  const [pCargando, setPCargando] = useState(false);
  const [pDescubriendo, setPDescubriendo] = useState(false);
  const [pGuardando, setPGuardando] = useState(false);

  // Creación inline de contenedor (dentro del modal parametrizar)
  const [pNombreNuevo, setPNombreNuevo] = useState('');
  const [pSlugNuevo, setPSlugNuevo] = useState('');
  const [pSlugManualNuevo, setPSlugManualNuevo] = useState(false);
  const [pDominioNuevo, setPDominioNuevo] = useState('');
  const [pCreandoNuevo, setPCreandoNuevo] = useState(false);

  // Dialog contenedor
  const [dialogContenedor, setDialogContenedor] = useState(false);
  const [editandoContenedor, setEditandoContenedor] = useState<Contenedor | null>(null);
  const [formContenedor, setFormContenedor] = useState<ContenedorForm>(CONTENEDOR_EMPTY);
  const [slugManual, setSlugManual] = useState(false);

  // Dialog conexión BD
  const [dialogDb, setDialogDb] = useState(false);
  const [contenedorDb, setContenedorDb] = useState<Contenedor | null>(null);
  const [configDb, setConfigDb] = useState<TenantDbConfig | null>(null);
  const [formDb, setFormDb] = useState<DbForm>(DB_EMPTY);
  const [mostrarUri, setMostrarUri] = useState(false);
  const [basesDescubiertas, setBasesDescubiertas] = useState<string[]>([]);

  // ── Carga inicial: tenants + dominios + contenedores visibles (para la tabla por perfil) ──
  useEffect(() => {
    setCargandoInicial(true);
    setCargandoVisibles(true);
    Promise.all([
      contenedorService.listarTenantsDisponibles(),
      listarDominios(),
      contenedorService.listarVisibles(),
    ])
      .then(([t, d, v]) => {
        if (t.ok) {
          const data = t.data ?? [];
          setTodosCorporativos(data);
          // Esta pantalla opera por tenantGlobal (contenedores/config BD se listan por
          // tenantGlobalId): una empresa que aún no tiene tenantGlobal vinculado llega con
          // iud:'' desde el backend (ese endpoint es compartido con otra pantalla que sí la
          // admite, usando corporativo.iud). Para el selector de arriba no sirve — y si hay
          // más de una, duplica la key '' en el <SelectItem>. La filtramos.
          setTenants(data.filter((tenant) => tenant.iud));
        }
        if (d.success) setDominios(d.data ?? []);
        if (v.ok) setContenedoresVisibles(v.data ?? []);
      })
      .catch(() => toast.error('Error cargando datos iniciales'))
      .finally(() => {
        setCargandoInicial(false);
        setCargandoVisibles(false);
      });
  }, []);

  // ── Contenedores agrupados por perfil corporativo, para la tabla "Perfiles corporativos" ──
  const contenedoresPorCorporativo = useMemo(() => {
    const map = new Map<string, Contenedor[]>();
    for (const c of contenedoresVisibles) {
      const cid = c.corporativo?.iud || c.corporativo?._id || '';
      if (!cid) continue;
      const lista = map.get(cid) ?? [];
      lista.push(c);
      map.set(cid, lista);
    }
    return map;
  }, [contenedoresVisibles]);

  const perfilesConContenedores = useMemo(() => {
    const vistos = new Set<string>();
    return todosCorporativos
      .filter((t) => {
        const cid = t.corporativo?.iud;
        if (!cid || vistos.has(cid)) return false;
        vistos.add(cid);
        return true;
      })
      .map((t) => {
        const cid = t.corporativo!.iud;
        return {
          corporativoId: cid,
          razonSocial: t.corporativo?.razon_social || t.corporativo?.titulo || 'Sin nombre',
          nit: t.corporativo?.nit_ruc_rtn || '',
          tenantGlobalId: t.iud || '',
          contenedoresDelPerfil: contenedoresPorCorporativo.get(cid) ?? [],
        };
      })
      .sort((a, b) =>
        b.contenedoresDelPerfil.length - a.contenedoresDelPerfil.length
        || a.razonSocial.localeCompare(b.razonSocial)
      );
  }, [todosCorporativos, contenedoresPorCorporativo]);

  // ── Cargar contenedores + configs de BD para el tenant seleccionado ──
  const cargarTenant = useCallback((id: string) => {
    if (!id) return;
    setCargandoContenedores(true);
    setContenedores([]);
    setDbConfigs([]);
    Promise.all([
      contenedorService.listarPorTenant(id),
      dbConfigService.listarActivos(),
    ])
      .then(([c, d]) => {
        if (c.ok) setContenedores(c.data ?? []);
        if (d.ok) {
          // Filtrar solo las configs que pertenecen a este tenant
          const filtradas = (d.data ?? []).filter(
            (cfg) => resolveId(cfg.tenantGlobal) === id
          );
          setDbConfigs(filtradas);
        }
      })
      .catch(() => toast.error('Error al cargar datos del tenant'))
      .finally(() => setCargandoContenedores(false));
  }, []);

  const handleTenantChange = (val: string) => {
    setTenantId(val);
    cargarTenant(val);
  };

  // ── Mapa contenedor → config BD ──
  const configPorContenedor = useMemo(() => {
    const map = new Map<string, TenantDbConfig>();
    for (const cfg of dbConfigs) {
      const cid = resolveId(cfg.contenedorId);
      if (cid) map.set(cid, cfg);
    }
    return map;
  }, [dbConfigs]);

  // ── Form contenedor ──
  const handleContenedorField = (campo: keyof ContenedorForm, val: string) => {
    setFormContenedor((prev) => {
      const next = { ...prev, [campo]: val };
      if (campo === 'nombre' && !slugManual) next.slug = toSlug(val);
      return next;
    });
  };

  const abrirCrearContenedor = () => {
    setEditandoContenedor(null);
    setFormContenedor(CONTENEDOR_EMPTY);
    setSlugManual(false);
    setDialogContenedor(true);
  };

  const abrirEditarContenedor = (c: Contenedor) => {
    setEditandoContenedor(c);
    setFormContenedor({
      nombre: c.nombre,
      slug: c.slug ?? '',
      parentContenedorId: c.parentContenedorId ?? '',
      apisDominiosId: resolveId(c.apisDominios),
      dominioFrontend: c.dominioFrontend ?? '',
      descripcion: c.descripcion ?? '',
    });
    setSlugManual(true);
    setDialogContenedor(true);
  };

  const guardarContenedor = async () => {
    if (!formContenedor.nombre.trim()) { toast.warning('El nombre es obligatorio'); return; }
    if (!formContenedor.apisDominiosId) { toast.warning('Selecciona un dominio'); return; }

    setGuardandoContenedor(true);
    try {
      if (editandoContenedor) {
        const res = await contenedorService.actualizar(editandoContenedor.iud, {
          nombre: formContenedor.nombre.trim(),
          slug: formContenedor.slug.trim() || null,
          apisDominios: formContenedor.apisDominiosId,
          dominioFrontend: formContenedor.dominioFrontend.trim() || null,
          descripcion: formContenedor.descripcion.trim(),
        });
        if (res.ok) { toast.success('Contenedor actualizado'); setDialogContenedor(false); cargarTenant(tenantId); }
      } else {
        const payload: CrearContenedorPayload = {
          nombre: formContenedor.nombre.trim(),
          slug: formContenedor.slug.trim() || null,
          parentContenedorId: formContenedor.parentContenedorId || null,
          apisDominios: formContenedor.apisDominiosId,
          dominioFrontend: formContenedor.dominioFrontend.trim() || null,
          descripcion: formContenedor.descripcion.trim(),
        };
        const res = await contenedorService.crear(tenantId, payload);
        if (res.ok) { toast.success('Contenedor creado'); setDialogContenedor(false); cargarTenant(tenantId); }
      }
    } catch { toast.error('Error al guardar contenedor'); }
    finally { setGuardandoContenedor(false); }
  };

  const handleToggleEstado = async (c: Contenedor) => {
    const r = await Swal({
      title: `¿${c.estado ? 'Desactivar' : 'Activar'}?`,
      text: `"${c.nombre}"`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;
    try {
      c.estado
        ? await contenedorService.desactivar(c.iud)
        : await contenedorService.activar(c.iud);
      toast.success(c.estado ? 'Desactivado' : 'Activado');
      cargarTenant(tenantId);
    } catch { toast.error('Error al cambiar estado'); }
  };

  // ── Dialog conexión BD ──
  const abrirConfigDb = async (c: Contenedor) => {
    setContenedorDb(c);
    setFormDb(DB_EMPTY);
    setConfigDb(null);
    setBasesDescubiertas([]);
    setMostrarUri(false);

    const existente = configPorContenedor.get(c.iud);
    if (existente) {
      // Cargar versión editable (incluye mongoUri)
      try {
        const res = await dbConfigService.obtenerEditable(existente.iud);
        if (res.ok) {
          const cfg = res.data;
          setConfigDb(cfg);
          setFormDb({
            poolName: cfg.poolName ?? '',
            mongoUri: cfg.mongoUri ?? '',
            dbName: cfg.dbName ?? '',
            urlBase: cfg.urlBase ?? '',
            parentTenantDbConfigId: resolveId(cfg.parentTenantDbConfig as string) ?? '',
            backupReplicaDbName: cfg.backupReplicaDbName ?? '',
          });
        }
      } catch { toast.error('Error al cargar configuración de BD'); }
    } else {
      // Prellenar poolName sugerido
      setFormDb((prev) => ({
        ...prev,
        poolName: `${c.slug || c.nombre.toLowerCase().replace(/\s+/g, '-')}-pool`,
      }));
    }

    setDialogDb(true);
  };

  const descubrirBases = async () => {
    if (!formDb.mongoUri.trim()) { toast.warning('Ingresa el mongoUri primero'); return; }
    setDescubriendo(true);
    setBasesDescubiertas([]);
    try {
      const res = await dbConfigService.descubrirBases(formDb.mongoUri.trim(), tenantId);
      if (res.ok && Array.isArray(res.bases)) {
        setBasesDescubiertas(res.bases);
        toast.success(`${res.bases.length} base(s) encontradas`);
      }
    } catch { toast.error('No se pudo conectar al cluster'); }
    finally { setDescubriendo(false); }
  };

  const guardarConexionDb = async () => {
    if (!formDb.poolName.trim()) { toast.warning('poolName es obligatorio'); return; }
    if (!formDb.mongoUri.trim()) { toast.warning('mongoUri es obligatorio'); return; }
    if (!formDb.dbName.trim()) { toast.warning('dbName es obligatorio'); return; }
    if (!contenedorDb) return;

    setGuardandoDb(true);
    try {
      const payload: GuardarConexionPayload = {
        tenantGlobalId: tenantId,
        contenedorId: contenedorDb.iud,
        poolName: formDb.poolName.trim(),
        mongoUri: formDb.mongoUri.trim(),
        dbName: formDb.dbName.trim(),
        urlBase: formDb.urlBase.trim() || null,
        parentTenantDbConfigId: formDb.parentTenantDbConfigId || null,
        backupReplicaDbName: formDb.backupReplicaDbName.trim() || null,
        configId: configDb?.iud || null,
      };
      const res = await dbConfigService.guardarConexion(payload);
      if (res.ok) {
        toast.success(configDb ? 'Conexión actualizada' : 'Conexión guardada');
        setDialogDb(false);
        cargarTenant(tenantId);
      }
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || 'Error al guardar conexión';
      toast.error(msg);
    } finally { setGuardandoDb(false); }
  };

  const handleMigrar = async (cfg: TenantDbConfig) => {
    const r = await Swal({
      title: '¿Migrar schemas?',
      text: 'Esto registra todos los schemas de Mongoose en la BD del tenant.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Migrar',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;

    setMigrando(cfg.iud);
    try {
      const res = await dbConfigService.migrarSchemas(cfg.iud);
      if (res.ok) {
        toast.success('Migración completada');
        cargarTenant(tenantId);
      }
    } catch { toast.error('Error en migración'); }
    finally { setMigrando(null); }
  };

  // ── Modal parametrizar conexión ──
  const abrirParametrizar = async () => {
    setPTenantId('');
    setPContenedores([]);
    setPContenedor(null);
    setPConfigDb(null);
    setPFormDb(DB_EMPTY);
    setPBases([]);
    setPMostrarUri(false);
    setPCargando(true);
    setDialogParametrizar(true);
    try {
      const res = await dbConfigService.listarActivos();
      if (res.ok) setPTodasConfigs(res.data ?? []);
    } catch { toast.error('Error cargando configuraciones BD'); }
    finally { setPCargando(false); }
  };

  const handlePTenantChange = async (id: string) => {
    setPTenantId(id);
    setPContenedor(null);
    setPConfigDb(null);
    setPFormDb(DB_EMPTY);
    setPBases([]);
    setPCargando(true);
    try {
      const res = await contenedorService.listarPorTenant(id);
      if (res.ok) setPContenedores(res.data ?? []);
    } catch { toast.error('Error cargando contenedores'); }
    finally { setPCargando(false); }
  };

  const handlePContenedorChange = async (id: string) => {
    const cont = pContenedores.find((c) => c.iud === id);
    if (!cont) return;
    setPContenedor(cont);
    setPConfigDb(null);
    setPFormDb(DB_EMPTY);
    setPBases([]);

    const existente = pConfigPorContenedor.get(id);
    if (existente) {
      try {
        const res = await dbConfigService.obtenerEditable(existente.iud);
        if (res.ok) {
          const cfg = res.data;
          setPConfigDb(cfg);
          setPFormDb({
            poolName: cfg.poolName ?? '',
            mongoUri: cfg.mongoUri ?? '',
            dbName: cfg.dbName ?? '',
            urlBase: cfg.urlBase ?? '',
            parentTenantDbConfigId: resolveId(cfg.parentTenantDbConfig as string) ?? '',
            backupReplicaDbName: cfg.backupReplicaDbName ?? '',
          });
        }
      } catch { toast.error('Error cargando configuración existente'); }
    } else {
      setPFormDb((prev) => ({
        ...prev,
        poolName: `${cont.slug || cont.nombre.toLowerCase().replace(/\s+/g, '-')}-pool`,
      }));
    }
  };

  const pDescubrirBases = async () => {
    if (!pFormDb.mongoUri.trim()) { toast.warning('Ingresa el mongoUri primero'); return; }
    setPDescubriendo(true);
    setPBases([]);
    try {
      const res = await dbConfigService.descubrirBases(pFormDb.mongoUri.trim(), pTenantId);
      if (res.ok && Array.isArray(res.bases)) {
        setPBases(res.bases);
        toast.success(`${res.bases.length} base(s) encontradas`);
      }
    } catch { toast.error('No se pudo conectar al cluster'); }
    finally { setPDescubriendo(false); }
  };

  const pGuardarConexion = async () => {
    if (!pFormDb.poolName.trim()) { toast.warning('poolName es obligatorio'); return; }
    if (!pFormDb.mongoUri.trim()) { toast.warning('mongoUri es obligatorio'); return; }
    if (!pFormDb.dbName.trim()) { toast.warning('dbName es obligatorio'); return; }
    if (!pContenedor || !pTenantId) return;

    setPGuardando(true);
    try {
      const payload: GuardarConexionPayload = {
        tenantGlobalId: pTenantId,
        contenedorId: pContenedor.iud,
        poolName: pFormDb.poolName.trim(),
        mongoUri: pFormDb.mongoUri.trim(),
        dbName: pFormDb.dbName.trim(),
        urlBase: pFormDb.urlBase.trim() || null,
        parentTenantDbConfigId: pFormDb.parentTenantDbConfigId || null,
        backupReplicaDbName: pFormDb.backupReplicaDbName.trim() || null,
        configId: pConfigDb?.iud || null,
      };
      const res = await dbConfigService.guardarConexion(payload);
      if (res.ok) {
        toast.success(pConfigDb ? 'Conexión actualizada' : 'Conexión guardada');
        setDialogParametrizar(false);
        if (tenantId === pTenantId) cargarTenant(tenantId);
      }
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message || 'Error al guardar conexión');
    } finally { setPGuardando(false); }
  };

  const pCrearContenedor = async () => {
    if (!pNombreNuevo.trim()) { toast.warning('El nombre del contenedor es obligatorio'); return; }
    if (!pDominioNuevo) { toast.warning('Selecciona un dominio API'); return; }
    setPCreandoNuevo(true);
    try {
      const res = await contenedorService.crear(pTenantId, {
        nombre: pNombreNuevo.trim(),
        slug: pSlugNuevo.trim() || null,
        apisDominios: pDominioNuevo,
      });
      if (res.ok) {
        toast.success('Contenedor creado');
        // Recargar lista y auto-seleccionar el nuevo
        const resConts = await contenedorService.listarPorTenant(pTenantId);
        if (resConts.ok) {
          setPContenedores(resConts.data ?? []);
          await handlePContenedorChange(res.data.iud);
        }
        // Limpiar mini-form
        setPNombreNuevo('');
        setPSlugNuevo('');
        setPSlugManualNuevo(false);
        setPDominioNuevo('');
        // Refrescar tabla principal si coincide el tenant
        if (tenantId === pTenantId) cargarTenant(tenantId);
      }
    } catch { toast.error('Error al crear contenedor'); }
    finally { setPCreandoNuevo(false); }
  };

  // ── Derivados ──
  const tenantLabel = useMemo(() => {
    const t = tenants.find((t) => t.iud === tenantId);
    return t?.corporativo?.razon_social || t?.corporativo?.titulo || t?.iud || '';
  }, [tenants, tenantId]);

  const opcionesParent = useMemo(
    () => contenedores.filter((c) => c.estado && c.iud !== editandoContenedor?.iud),
    [contenedores, editandoContenedor]
  );

  const otrasConfigs = useMemo(
    () => dbConfigs.filter((c) => c.iud !== configDb?.iud),
    [dbConfigs, configDb]
  );

  // Set de tenantIds que ya tienen al menos una DB config (parametrizados)
  const pTenantsParametrizados = useMemo(() => {
    const s = new Set<string>();
    for (const c of pTodasConfigs) {
      const tid = resolveId(c.tenantGlobal as string);
      if (tid) s.add(tid);
    }
    return s;
  }, [pTodasConfigs]);

  // Mapa contenedorId → config (sobre el set global cargado en el modal)
  const pConfigPorContenedor = useMemo(() => {
    const map = new Map<string, TenantDbConfig>();
    for (const cfg of pTodasConfigs) {
      const cid = resolveId(cfg.contenedorId);
      if (cid) map.set(cid, cfg);
    }
    return map;
  }, [pTodasConfigs]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Contenedores por Tenant</h1>
            <p className="text-sm text-muted-foreground">
              Parametriza contenedores y sus conexiones de base de datos por tenant global
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={abrirParametrizar}>
            <Database className="w-4 h-4 mr-1 text-success" />
            Parametrizar BD
          </Button>
          {tenantId && (
            <>
              <Button variant="outline" size="sm" onClick={() => cargarTenant(tenantId)} disabled={cargandoContenedores}>
                <RefreshCw className={`w-4 h-4 mr-1 ${cargandoContenedores ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button size="sm" onClick={abrirCrearContenedor} className="bg-primary hover:bg-primary text-button-foreground">
                <Plus className="w-4 h-4 mr-1" />
                Nuevo contenedor
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Selector de tenant */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tenant</CardTitle>
        </CardHeader>
        <CardContent>
          {cargandoInicial ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Cargando tenants…</span>
            </div>
          ) : (
            <div className="flex items-end gap-4 flex-wrap">
              <div className="flex-1 min-w-[260px]">
                <Label className="mb-1.5 block text-sm">Selecciona un tenant global</Label>
                <Select value={tenantId} onValueChange={handleTenantChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tenant…" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.iud} value={t.iud}>
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${t.estado ? 'bg-success' : 'bg-muted-foreground'}`} />
                          {t.corporativo?.razon_social || t.corporativo?.titulo || t.iud}
                          {t.corporativo?.nit_ruc_rtn && (
                            <span className="text-xs text-muted-foreground">— {t.corporativo.nit_ruc_rtn}</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {tenantId && (
                <Badge variant="outline" className="text-primary border-primary/20 bg-primary/10">
                  {tenantLabel}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Perfiles corporativos → sus contenedores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Perfiles corporativos
            {perfilesConContenedores.length > 0 && (
              <Badge className="ml-1 bg-primary/10 text-primary border-0">{perfilesConContenedores.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {cargandoVisibles ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Cargando…
            </div>
          ) : perfilesConContenedores.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Layers className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">Sin perfiles corporativos registrados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Perfil corporativo</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Contenedores</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perfilesConContenedores.map((p) => (
                    <TableRow key={p.corporativoId}>
                      <TableCell>
                        <p className="font-medium text-foreground">{p.razonSocial}</p>
                        {p.nit && <p className="text-xs text-muted-foreground">{p.nit}</p>}
                      </TableCell>
                      <TableCell>
                        {p.tenantGlobalId ? (
                          <Badge variant="outline" className="text-success border-success/20 bg-success/10">
                            Vinculado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-warning border-warning/20 bg-warning/10">
                            Sin tenant
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.contenedoresDelPerfil.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Sin contenedores</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {p.contenedoresDelPerfil.map((c) => (
                              <Badge
                                key={c.iud}
                                variant="outline"
                                className={`text-xs ${c.estado ? '' : 'opacity-50'}`}
                                title={c.displayLabel || c.nombre}
                              >
                                {c.nombre}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.tenantGlobalId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTenantChange(p.tenantGlobalId)}
                          >
                            Ver
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de contenedores */}
      {tenantId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-primary" />
              Contenedores
              {contenedores.length > 0 && (
                <Badge className="ml-1 bg-primary/10 text-primary border-0">{contenedores.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {cargandoContenedores ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Cargando…
              </div>
            ) : contenedores.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <Layers className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">Sin contenedores. Crea el primero.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[34%]">Nombre / Ruta</TableHead>
                    <TableHead>Dominio API</TableHead>
                    <TableHead>Conexión BD</TableHead>
                    <TableHead className="text-center">Nivel</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contenedores.map((c) => {
                    const cfg = configPorContenedor.get(c.iud);
                    const migBadge = cfg ? MIGRATION_BADGE[cfg.migrationStatus] : null;

                    return (
                      <TableRow key={c.iud} className={!c.estado ? 'opacity-50' : ''}>

                        {/* Nombre con indentación */}
                        <TableCell>
                          <div className="flex items-center gap-1" style={{ paddingLeft: `${(c.nivel - 1) * 18}px` }}>
                            {c.nivel > 1 && <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                            <div>
                              <p className="font-medium text-foreground">{c.nombre}</p>
                              {c.slug && <p className="text-xs text-muted-foreground">/{c.slug}</p>}
                            </div>
                          </div>
                        </TableCell>

                        {/* Dominio */}
                        <TableCell>
                          {c.apisDominios ? (
                            <div className="flex items-center gap-1 text-sm text-foreground">
                              <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span className="truncate max-w-[140px]">{c.apisDominios.dominio}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Conexión BD */}
                        <TableCell>
                          {cfg ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm text-foreground">
                                <Database className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                <span className="font-mono text-xs truncate max-w-[120px]">{cfg.dbName}</span>
                              </div>
                              {migBadge && (
                                <span className={`inline-flex text-xs px-1.5 py-0.5 rounded font-medium ${migBadge.cls}`}>
                                  {migBadge.label}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-warning font-medium">Sin conexión</span>
                          )}
                        </TableCell>

                        {/* Nivel */}
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            N{c.nivel} · {c.secuenciaJerarquica}
                          </Badge>
                        </TableCell>

                        {/* Estado */}
                        <TableCell className="text-center">
                          <Badge className={c.estado
                            ? 'bg-success/10 text-success border-0'
                            : 'bg-destructive/10 text-destructive border-0'}>
                            {c.estado ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>

                        {/* Acciones */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Migrar schemas (solo si ya tiene config y la migración no está completa) */}
                            {cfg && cfg.migrationStatus !== 'completada' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Migrar schemas"
                                onClick={() => handleMigrar(cfg)}
                                disabled={migrando === cfg.iud}
                              >
                                {migrando === cfg.iud
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <ShieldCheck className="w-3.5 h-3.5 text-info" />}
                              </Button>
                            )}

                            {/* Config BD */}
                            <Button
                              size="icon"
                              variant="ghost"
                              title={cfg ? 'Editar conexión BD' : 'Configurar conexión BD'}
                              onClick={() => abrirConfigDb(c)}
                            >
                              <DatabaseZap className={`w-3.5 h-3.5 ${cfg ? 'text-success' : 'text-warning'}`} />
                            </Button>

                            {/* Editar contenedor */}
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Editar contenedor"
                              onClick={() => abrirEditarContenedor(c)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>

                            {/* Toggle estado */}
                            <Button
                              size="icon"
                              variant="ghost"
                              title={c.estado ? 'Desactivar' : 'Activar'}
                              onClick={() => handleToggleEstado(c)}
                            >
                              {c.estado
                                ? <ToggleRight className="w-4 h-4 text-success" />
                                : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Dialog: Crear / Editar contenedor ── */}
      <Dialog open={dialogContenedor} onOpenChange={setDialogContenedor}>
        <DialogContent className="w-[calc(100%-2rem)] max-h-[90dvh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editandoContenedor ? 'Editar contenedor' : 'Nuevo contenedor'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ej. Producción Principal"
                value={formContenedor.nombre}
                onChange={(e) => handleContenedorField('nombre', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                placeholder="produccion-principal"
                value={formContenedor.slug}
                onChange={(e) => { setSlugManual(true); handleContenedorField('slug', e.target.value); }}
              />
              <p className="text-xs text-muted-foreground">Auto-generado desde el nombre. Editable.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Dominio API <span className="text-destructive">*</span></Label>
              <Select value={formContenedor.apisDominiosId} onValueChange={(v) => handleContenedorField('apisDominiosId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un dominio…" />
                </SelectTrigger>
                <SelectContent>
                  {dominios.filter((d) => d.estadoDominio).map((d) => {
                    const id = d.iud || d._id || '';
                    return (
                      <SelectItem key={id} value={id}>
                        {d.dominio}
                        {d.etiquetas && <span className="text-xs text-muted-foreground ml-2">— {d.etiquetas}</span>}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {!editandoContenedor && (
              <div className="space-y-1.5">
                <Label>Contenedor padre (opcional)</Label>
                <Select
                  value={formContenedor.parentContenedorId || '__ninguno__'}
                  onValueChange={(v) => handleContenedorField('parentContenedorId', v === '__ninguno__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Raíz (sin padre)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ninguno__">— Raíz (sin padre)</SelectItem>
                    {opcionesParent.map((c) => (
                      <SelectItem key={c.iud} value={c.iud}>
                        {'  '.repeat(c.nivel - 1)}{c.nivel > 1 ? '└ ' : ''}{c.displayLabel || c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>URL Frontend</Label>
              <Input
                type="url"
                placeholder="https://app.example.com"
                value={formContenedor.dominioFrontend}
                onChange={(e) => handleContenedorField('dominioFrontend', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea
                rows={3}
                placeholder="Propósito del contenedor…"
                value={formContenedor.descripcion}
                onChange={(e) => handleContenedorField('descripcion', e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogContenedor(false)} disabled={guardandoContenedor}>
              Cancelar
            </Button>
            <Button onClick={guardarContenedor} disabled={guardandoContenedor} className="bg-primary hover:bg-primary text-button-foreground">
              {guardandoContenedor
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando…</>
                : editandoContenedor ? 'Guardar cambios' : 'Crear contenedor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Conexión BD ── */}
      <Dialog open={dialogDb} onOpenChange={setDialogDb}>
        <DialogContent className="w-[calc(100%-2rem)] max-h-[90dvh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-success" />
              Conexión BD — {contenedorDb?.nombre}
            </DialogTitle>
          </DialogHeader>

          {/* Resumen de estado si ya existe config */}
          {configDb && (
            <div className="flex items-center justify-between bg-muted border rounded-lg px-4 py-2 text-sm">
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">{configDb.dbName}</p>
                <p className="text-xs text-muted-foreground">Pool: {configDb.poolName}</p>
              </div>
              <div className="flex items-center gap-2">
                {migBadgeFor(configDb.migrationStatus)}
                {configDb.migrationStatus !== 'completada' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMigrar(configDb)}
                    disabled={migrando === configDb.iud}
                  >
                    {migrando === configDb.iud
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <><ShieldCheck className="w-3.5 h-3.5 mr-1" />Migrar</>}
                  </Button>
                )}
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-4 py-1">
            {/* Pool name */}
            <div className="space-y-1.5">
              <Label>Pool name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="ej. tenant-prod-pool"
                value={formDb.poolName}
                onChange={(e) => setFormDb((p) => ({ ...p, poolName: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Identificador único del pool de conexiones para este contenedor.</p>
            </div>

            {/* mongoUri */}
            <div className="space-y-1.5">
              <Label>MongoDB URI <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={mostrarUri ? 'text' : 'password'}
                    placeholder="mongodb+srv://user:pass@cluster.mongodb.net"
                    value={formDb.mongoUri}
                    onChange={(e) => setFormDb((p) => ({ ...p, mongoUri: e.target.value }))}
                    className="pr-9 font-mono text-sm"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                    onClick={() => setMostrarUri((v) => !v)}
                  >
                    {mostrarUri ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={descubrirBases}
                  disabled={descubriendo || !formDb.mongoUri.trim()}
                  title="Descubrir BDs disponibles en el cluster"
                >
                  {descubriendo
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <SearchCode className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* DB Name */}
            <div className="space-y-1.5">
              <Label>Nombre de BD <span className="text-destructive">*</span></Label>
              {basesDescubiertas.length > 0 ? (
                <Select
                  value={formDb.dbName}
                  onValueChange={(v) => setFormDb((p) => ({ ...p, dbName: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una base de datos…" />
                  </SelectTrigger>
                  <SelectContent>
                    {basesDescubiertas.map((b) => (
                      <SelectItem key={b} value={b}>
                        <span className="font-mono text-sm">{b}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="mi-tenant-db"
                  value={formDb.dbName}
                  onChange={(e) => setFormDb((p) => ({ ...p, dbName: e.target.value }))}
                  className="font-mono"
                />
              )}
              <p className="text-xs text-muted-foreground">
                {basesDescubiertas.length > 0
                  ? 'Selecciona de las BDs descubiertas en el cluster.'
                  : 'O usa el botón de descubrimiento para ver las BDs disponibles en el cluster.'}
              </p>
            </div>

            {/* URL Base */}
            <div className="space-y-1.5">
              <Label>URL base (opcional)</Label>
              <Input
                type="url"
                placeholder="https://api.tenant.com"
                value={formDb.urlBase}
                onChange={(e) => setFormDb((p) => ({ ...p, urlBase: e.target.value }))}
              />
            </div>

            {/* Config padre */}
            {otrasConfigs.length > 0 && (
              <div className="space-y-1.5">
                <Label>Config BD padre (opcional)</Label>
                <Select
                  value={formDb.parentTenantDbConfigId || '__ninguno__'}
                  onValueChange={(v) => setFormDb((p) => ({ ...p, parentTenantDbConfigId: v === '__ninguno__' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin padre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ninguno__">— Sin padre</SelectItem>
                    {otrasConfigs.map((c) => (
                      <SelectItem key={c.iud} value={c.iud}>
                        <span className="font-mono text-xs">{c.dbName}</span>
                        <span className="text-xs text-muted-foreground ml-1">({c.poolName})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Backup replica DB name (solo si hay padre seleccionado) */}
            {formDb.parentTenantDbConfigId && formDb.parentTenantDbConfigId !== '__ninguno__' && (
              <div className="space-y-1.5">
                <Label>BD de réplica/backup en cluster padre (opcional)</Label>
                <Input
                  placeholder="backup-tenant-db"
                  value={formDb.backupReplicaDbName}
                  onChange={(e) => setFormDb((p) => ({ ...p, backupReplicaDbName: e.target.value }))}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Nombre de la BD en el cluster del <strong>padre</strong> donde se replica esta BD como backup.
                  No puede coincidir con la BD operativa del padre.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogDb(false)} disabled={guardandoDb}>
              Cancelar
            </Button>
            <Button
              onClick={guardarConexionDb}
              disabled={guardandoDb}
              className="bg-success hover:bg-success text-button-foreground"
            >
              {guardandoDb
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Conectando…</>
                : configDb ? 'Actualizar conexión' : 'Guardar conexión'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Parametrizar Conexión BD ── */}
      <Dialog open={dialogParametrizar} onOpenChange={setDialogParametrizar}>
        <DialogContent className="w-[calc(100%-2rem)] max-h-[90dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-success" />
              Parametrizar Conexión BD
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">

            {/* SELECT Tenant */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Tenant <span className="text-destructive">*</span>
              </Label>
              {pCargando && !pTenantId ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground h-9">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando…
                </div>
              ) : (
                <Select value={pTenantId} onValueChange={handlePTenantChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tenant…" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => {
                      const parametrizado = pTenantsParametrizados.has(t.iud);
                      return (
                        <SelectItem key={t.iud} value={t.iud}>
                          <span className="flex items-center gap-2">
                            {parametrizado
                              ? <Database className="w-3.5 h-3.5 text-success flex-shrink-0" />
                              : <DatabaseZap className="w-3.5 h-3.5 text-warning flex-shrink-0" />}
                            <span>{t.corporativo?.razon_social || t.corporativo?.titulo || t.iud}</span>
                            {t.corporativo?.nit_ruc_rtn && (
                              <span className="text-xs text-muted-foreground">— {t.corporativo.nit_ruc_rtn}</span>
                            )}
                            {parametrizado && (
                              <span className="ml-auto text-xs text-success font-medium">BD activa</span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                <Database className="w-3 h-3 inline text-success mr-1" />BD activa = ya tiene conexión configurada ·
                <DatabaseZap className="w-3 h-3 inline text-warning mx-1" />sin conexión
              </p>
            </div>

            {/* SELECT Contenedor (aparece al seleccionar tenant) */}
            {pTenantId && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Contenedor <span className="text-destructive">*</span>
                </Label>
                {pCargando && pContenedores.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground h-9">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cargando contenedores…
                  </div>
                ) : pContenedores.length === 0 ? (
                  /* ── Creación inline cuando no hay contenedores ── */
                  <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3 bg-muted">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                      <Layers className="w-4 h-4 text-primary" />
                      Sin contenedores — crea el primero para este tenant
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs text-muted-foreground">Nombre <span className="text-destructive">*</span></Label>
                        <Input
                          placeholder="Ej. Producción Principal"
                          value={pNombreNuevo}
                          onChange={(e) => {
                            setPNombreNuevo(e.target.value);
                            if (!pSlugManualNuevo) setPSlugNuevo(toSlug(e.target.value));
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Slug</Label>
                        <Input
                          placeholder="produccion-principal"
                          value={pSlugNuevo}
                          onChange={(e) => { setPSlugManualNuevo(true); setPSlugNuevo(e.target.value); }}
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Dominio API <span className="text-destructive">*</span></Label>
                        <Select value={pDominioNuevo} onValueChange={setPDominioNuevo}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona…" />
                          </SelectTrigger>
                          <SelectContent>
                            {dominios.filter((d) => d.estadoDominio).map((d) => {
                              const id = d.iud || d._id || '';
                              return (
                                <SelectItem key={id} value={id}>
                                  {d.dominio}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={pCrearContenedor}
                      disabled={pCreandoNuevo || !pNombreNuevo.trim() || !pDominioNuevo}
                      className="w-full bg-primary hover:bg-primary text-button-foreground"
                    >
                      {pCreandoNuevo
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando…</>
                        : <><Plus className="w-4 h-4 mr-2" />Crear contenedor y configurar BD</>}
                    </Button>
                  </div>
                ) : (
                  <Select value={pContenedor?.iud ?? ''} onValueChange={handlePContenedorChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un contenedor…" />
                    </SelectTrigger>
                    <SelectContent>
                      {pContenedores.map((c) => {
                        const cfg = pConfigPorContenedor.get(c.iud);
                        return (
                          <SelectItem key={c.iud} value={c.iud}>
                            <span className="flex items-center gap-2">
                              {cfg
                                ? <Database className="w-3 h-3 text-success flex-shrink-0" />
                                : <DatabaseZap className="w-3 h-3 text-warning flex-shrink-0" />}
                              <span style={{ paddingLeft: `${(c.nivel - 1) * 12}px` }}>
                                {c.nivel > 1 ? '└ ' : ''}{c.nombre}
                              </span>
                              {cfg && (
                                <span className="text-xs text-muted-foreground font-mono">({cfg.dbName})</span>
                              )}
                              {cfg && (
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${MIGRATION_BADGE[cfg.migrationStatus].cls}`}>
                                  {MIGRATION_BADGE[cfg.migrationStatus].label}
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Formulario de conexión (aparece al seleccionar contenedor) */}
            {pContenedor && (
              <>
                <Separator />

                {/* Estado actual si ya existe config */}
                {pConfigDb && (
                  <div className="flex items-center justify-between bg-success/10 border border-success/20 rounded-lg px-4 py-2.5 text-sm">
                    <div className="space-y-0.5">
                      <p className="font-medium text-success">{pConfigDb.dbName}</p>
                      <p className="text-xs text-success">Pool: {pConfigDb.poolName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {migBadgeFor(pConfigDb.migrationStatus)}
                      {pConfigDb.migrationStatus !== 'completada' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => handleMigrar(pConfigDb)}
                          disabled={migrando === pConfigDb.iud}
                        >
                          {migrando === pConfigDb.iud
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <><ShieldCheck className="w-3.5 h-3.5 mr-1" />Migrar</>}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Pool name */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Pool name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="ej. tenant-prod-pool"
                    value={pFormDb.poolName}
                    onChange={(e) => setPFormDb((p) => ({ ...p, poolName: e.target.value }))}
                  />
                </div>

                {/* MongoDB URI */}
                <div className="space-y-1.5">
                  <Label className="text-sm">MongoDB URI <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={pMostrarUri ? 'text' : 'password'}
                        placeholder="mongodb+srv://user:pass@cluster.mongodb.net"
                        value={pFormDb.mongoUri}
                        onChange={(e) => setPFormDb((p) => ({ ...p, mongoUri: e.target.value }))}
                        className="pr-9 font-mono text-sm"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                        onClick={() => setPMostrarUri((v) => !v)}
                      >
                        {pMostrarUri ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={pDescubrirBases}
                      disabled={pDescubriendo || !pFormDb.mongoUri.trim()}
                      title="Descubrir BDs disponibles"
                    >
                      {pDescubriendo
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <SearchCode className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* DB Name */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Nombre de BD <span className="text-destructive">*</span></Label>
                  {pBases.length > 0 ? (
                    <Select value={pFormDb.dbName} onValueChange={(v) => setPFormDb((p) => ({ ...p, dbName: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una base de datos…" />
                      </SelectTrigger>
                      <SelectContent>
                        {pBases.map((b) => (
                          <SelectItem key={b} value={b}>
                            <span className="font-mono text-sm">{b}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="mi-tenant-db"
                      value={pFormDb.dbName}
                      onChange={(e) => setPFormDb((p) => ({ ...p, dbName: e.target.value }))}
                      className="font-mono"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {pBases.length > 0
                      ? 'Selecciona de las BDs descubiertas en el cluster.'
                      : 'O usa el botón de descubrimiento (lupa) para ver las BDs disponibles.'}
                  </p>
                </div>

                {/* URL Base */}
                <div className="space-y-1.5">
                  <Label className="text-sm">URL base (opcional)</Label>
                  <Input
                    type="url"
                    placeholder="https://api.tenant.com"
                    value={pFormDb.urlBase}
                    onChange={(e) => setPFormDb((p) => ({ ...p, urlBase: e.target.value }))}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogParametrizar(false)} disabled={pGuardando}>
              Cancelar
            </Button>
            <Button
              onClick={pGuardarConexion}
              disabled={pGuardando || !pContenedor || !pFormDb.mongoUri.trim() || !pFormDb.dbName.trim()}
              className="bg-success hover:bg-success text-button-foreground"
            >
              {pGuardando
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Conectando…</>
                : pConfigDb ? 'Actualizar conexión' : 'Guardar conexión'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Helper local para badge de migración fuera del render principal ──
function migBadgeFor(status: MigrationStatus) {
  const b = MIGRATION_BADGE[status];
  return (
    <span className={`inline-flex text-xs px-2 py-0.5 rounded font-medium ${b.cls}`}>
      {b.label}
    </span>
  );
}
