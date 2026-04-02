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
} from 'lucide-react';

import {
  tenantDbService,
  type TenantDbConfig,
  type SyncColeccion,
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

// ─── Formulario de conexión ───────────────────────────────────────────────────

interface FormConexion {
  tenantGlobalId: string;
  contenedor: string;   // nombre descriptivo / alias del tenant
  mongoUri: string;
  dbName: string;
  urlBase: string;
}

const FORM_VACIO: FormConexion = { tenantGlobalId: '', contenedor: '', mongoUri: '', dbName: '', urlBase: '' };

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

  useEffect(() => { void cargarConfigs(); }, [cargarConfigs]);

  // ─── Conexión ─────────────────────────────────────────────────────────────

  const handleGuardar = async () => {
    if (!form.tenantGlobalId || !form.mongoUri || !form.dbName) {
      toast.warning('Completa todos los campos obligatorios');
      return;
    }
    setSaving(true);
    try {
      const res = await tenantDbService.guardarConexion({
        tenantGlobalId: form.tenantGlobalId,
        mongoUri:       form.mongoUri,
        dbName:         form.dbName,
        urlBase:        form.urlBase || null,
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

  const handleDesactivar = async (tenantGlobalId: string) => {
    if (!window.confirm('¿Desactivar esta conexión? Se cerrará el pool del tenant.')) return;
    try {
      await tenantDbService.desactivar(tenantGlobalId);
      toast.success('Conexión desactivada');
      void cargarConfigs();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error desactivando');
    }
  };

  // ─── Sync ─────────────────────────────────────────────────────────────────

  const resolverTenantId = (config: TenantDbConfig): string =>
    typeof config.tenantGlobal === 'string' ? config.tenantGlobal : config.tenantGlobal?.iud ?? config.iud;

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
    const id = resolverTenantId(tenantSeleccionado);
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
    const id = resolverTenantId(config);
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
    const id = resolverTenantId(config);
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
          <Button size="sm" onClick={() => { setForm(FORM_VACIO); setDlgConexion(true); }}>
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
                  <Button variant="link" className="mt-1" onClick={() => setDlgConexion(true)}>
                    Agregar la primera conexión
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant Global ID</TableHead>
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
                      const id = resolverTenantId(cfg);
                      return (
                        <TableRow key={cfg.iud}>
                          <TableCell className="font-mono text-xs truncate max-w-[160px]" title={id}>
                            {id.slice(0, 12)}…
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
                              title="Configurar sync de colecciones"
                              onClick={() => abrirDlgSync(cfg)}
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
              const id = resolverTenantId(cfg);
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
                          <p className="font-semibold text-sm">{cfg.dbName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{id.slice(0, 20)}…</p>
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
      <Dialog open={dlgConexion} onOpenChange={setDlgConexion}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Registrar conexión de BD
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">

            {/* Contenedor / alias */}
            <div className="space-y-1">
              <Label htmlFor="contenedor">Contenedor (nombre descriptivo)</Label>
              <Input
                id="contenedor"
                placeholder="Ej: Empresa Acme — Producción"
                value={form.contenedor}
                onChange={e => setForm(f => ({ ...f, contenedor: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Alias visual para identificar este tenant en la UI. No se guarda en BD.
              </p>
            </div>

            {/* Tenant Global ID */}
            <div className="space-y-1">
              <Label htmlFor="tenantGlobalId">Tenant Global ID <span className="text-destructive">*</span></Label>
              <Input
                id="tenantGlobalId"
                placeholder="ObjectId del tenantGlobal"
                value={form.tenantGlobalId}
                onChange={e => setForm(f => ({ ...f, tenantGlobalId: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                El <code>_id</code> del documento en la colección <code>tenantGlobal</code>.
              </p>
            </div>

            {/* Cadena de conexión */}
            <div className="space-y-1">
              <Label htmlFor="mongoUri">
                Cadena de conexión (MongoDB URI) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="mongoUri"
                  type={showUri ? 'text' : 'password'}
                  placeholder="mongodb+srv://usuario:contraseña@cluster.mongodb.net/"
                  value={form.mongoUri}
                  onChange={e => setForm(f => ({ ...f, mongoUri: e.target.value }))}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowUri(v => !v)}
                >
                  {showUri ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Nombre de la BD */}
            <div className="space-y-1">
              <Label htmlFor="dbName">Nombre de la base de datos <span className="text-destructive">*</span></Label>
              <Input
                id="dbName"
                placeholder="empresa-acme-produccion"
                value={form.dbName}
                onChange={e => setForm(f => ({ ...f, dbName: e.target.value }))}
              />
            </div>

            {/* URL parametrizada */}
            <div className="space-y-1">
              <Label htmlFor="urlBase">URL parametrizada del tenant</Label>
              <Input
                id="urlBase"
                placeholder="https://acme.tuapp.com"
                value={form.urlBase}
                onChange={e => setForm(f => ({ ...f, urlBase: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                URL pública asociada a este tenant. Se usa para enrutamiento y configuración de dominio.
              </p>
            </div>

            <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">¿Qué ocurre al guardar?</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Se abre la conexión al MongoDB del tenant.</li>
                <li>Se migran todos los schemas (colecciones + índices) del master a la nueva BD.</li>
                <li>La cadena de conexión no se expone en respuestas futuras.</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgConexion(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Guardar y migrar
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
    </div>
  );
}
