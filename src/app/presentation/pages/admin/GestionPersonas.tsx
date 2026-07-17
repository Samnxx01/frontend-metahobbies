import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { apiFetch } from '@/app/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  User,
  Users,
} from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type TenantActor = {
  rol: string;
  tenantSuperAdminId: string | null;
  tenantGlobalId: string | null;
  tenantCorporativoId: string | null;
};

type SelectOption = { id: string; label: string };

type TenantGlobalOption = SelectOption & { tenantSuperAdminId?: string };
type TenantCorpOption = SelectOption & { tenantGlobalId: string };

type CatalogoData = {
  tiposDocumento: SelectOption[];
  generos: SelectOption[];
  nacionalidades: SelectOption[];
  prefijos: SelectOption[];
};

type PersonaForm = {
  // Datos personales
  nombre: string;
  apellido: string;
  tipoDocumento: string;
  numeroDocumento: string;
  genero: string;
  nacionalidad: string;
  fechaNacimiento: string;
  // Contacto
  prefijo: string;
  telefono: string;
  correo: string;
  // Asignación Tenant
  tenantGlobal: string;
  tenantCorporativo: string;
  // Acceso
  password: string;
};

type PersonaListItem = {
  _id: string;
  correo: string;
  estado: boolean;
  tenantCorporativoId?: string;
  perfil?: {
    nombre_cliente?: string;
    apellido?: string;
    documentoIntentidad?: string;
    telefono?: string;
  };
};

const EMPTY_FORM: PersonaForm = {
  nombre: '',
  apellido: '',
  tipoDocumento: '',
  numeroDocumento: '',
  genero: '',
  nacionalidad: '',
  fechaNacimiento: '',
  prefijo: '',
  telefono: '',
  correo: '',
  tenantGlobal: '',
  tenantCorporativo: '',
  password: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const scopeBadge = (actor: TenantActor | null) => {
  if (!actor) return null;
  if (actor.tenantSuperAdminId) return <Badge className="bg-info/10 text-info border-info/20">Proveedor de Software</Badge>;
  if (actor.tenantGlobalId && !actor.tenantCorporativoId) return <Badge className="bg-info/10 text-info border-info/20">Licencia Global</Badge>;
  if (actor.tenantCorporativoId) return <Badge className="bg-success/10 text-success border-success/20">Corporativo</Badge>;
  return null;
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function GestionPersonas() {
  // Estado del actor JWT
  const [actor, setActor] = useState<TenantActor | null>(null);

  // Catálogos
  const [catalogos, setCatalogos] = useState<CatalogoData>({
    tiposDocumento: [],
    generos: [],
    nacionalidades: [],
    prefijos: [],
  });
  const [tenantGlobales, setTenantGlobales] = useState<TenantGlobalOption[]>([]);
  const [tenantCorps, setTenantCorps] = useState<TenantCorpOption[]>([]);
  const [loadingCorps, setLoadingCorps] = useState(false);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  // Formulario
  const [form, setForm] = useState<PersonaForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>({
    personal: true,
    contacto: true,
    tenant: true,
    acceso: true,
  });

  // Lista de personas
  const [personas, setPersonas] = useState<PersonaListItem[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'formulario' | 'lista'>('formulario');

  // ─── Carga inicial ──────────────────────────────────────────────────────────

  const cargarCatalogos = useCallback(async () => {
    setLoadingCatalogos(true);
    try {
      const API = import.meta.env.VITE_API_BASE_URL ?? '/api';
      const [docsRes, generosRes, nacRes, prefRes, selectsRes, tgsRes] = await Promise.allSettled([
        apiFetch(`${API}/perfil/seguridad/tipo/documentos`, { method: 'GET' }),
        apiFetch(`${API}/perfil/seguridad/listar/tipo/genero`, { method: 'GET' }),
        apiFetch(`${API}/perfil/seguridad/listar/tipo/nacionalidad`, { method: 'GET' }),
        apiFetch(`${API}/perfil/seguridad/listar/tipo/prefijo`, { method: 'GET' }),
        apiFetch(`${API}/config/global/creacion/usu/tenant/global/selects`, { method: 'GET' }),
        apiFetch(`${API}/config/tenant/tipo/listar/globales/contexto/roles`, { method: 'GET' }),
      ]);

      // Catálogos básicos
      const tiposDocumento: SelectOption[] = docsRes.status === 'fulfilled'
        ? (docsRes.value?.tipos ?? []).map((t: any) => ({ id: String(t?.iud || t?._id || ''), label: String(t?.nombreDocumento || t?.tipos || '') })).filter((x: SelectOption) => x.id)
        : [];
      const generos: SelectOption[] = generosRes.status === 'fulfilled'
        ? (generosRes.value?.generos ?? []).map((g: any) => ({ id: String(g?.id || g?._id || ''), label: String(g?.nombre_genero || '') })).filter((x: SelectOption) => x.id)
        : [];
      const nacionalidades: SelectOption[] = nacRes.status === 'fulfilled'
        ? (nacRes.value?.nacionalidades ?? []).map((n: any) => ({ id: String(n?.iud || n?._id || ''), label: String(n?.naciondalidadss || n?.siglaNaciona || '') })).filter((x: SelectOption) => x.id)
        : [];
      const prefijos: SelectOption[] = prefRes.status === 'fulfilled'
        ? (prefRes.value?.prefijos ?? []).map((p: any) => ({ id: String(p?.iud || p?._id || ''), label: String(p?.prefijoTelefonicoPais || '') })).filter((x: SelectOption) => x.id)
        : [];

      setCatalogos({ tiposDocumento, generos, nacionalidades, prefijos });

      // Actor JWT
      if (selectsRes.status === 'fulfilled') {
        const data = (selectsRes.value as any)?.data || {};
        const actorData: TenantActor = {
          rol: String(data?.actor?.rol || ''),
          tenantSuperAdminId: data?.actor?.tenantSuperAdminId ? String(data.actor.tenantSuperAdminId) : null,
          tenantGlobalId: data?.actor?.tenantGlobalId ? String(data.actor.tenantGlobalId) : null,
          tenantCorporativoId: data?.actor?.tenantCorporativoId ? String(data.actor.tenantCorporativoId) : null,
        };
        setActor(actorData);

        // Pre-set campos si el actor ya tiene un scope fijo
        if (actorData.tenantGlobalId && !actorData.tenantSuperAdminId) {
          setForm((prev) => ({ ...prev, tenantGlobal: actorData.tenantGlobalId! }));
        }
        if (actorData.tenantCorporativoId) {
          setForm((prev) => ({ ...prev, tenantCorporativo: actorData.tenantCorporativoId! }));
        }
      }

      // TenantGlobales
      if (tgsRes.status === 'fulfilled') {
        const raw = (tgsRes.value as any) ?? {};
        const rows: any[] = Array.isArray(raw?.tenants) ? raw.tenants
          : Array.isArray(raw?.data) ? raw.data
          : Array.isArray(raw?.tenantGlobales) ? raw.tenantGlobales
          : [];
        const opts: TenantGlobalOption[] = rows
          .map((r: any) => {
            const id = String(r?.id || r?._id || '').trim();
            const label = String(r?.label || r?.rol || r?.nombre || id);
            const tsaId = r?.tenantSuperAdminId ? String(r.tenantSuperAdminId) : undefined;
            return id ? { id, label, tenantSuperAdminId: tsaId } : null;
          })
          .filter(Boolean) as TenantGlobalOption[];
        setTenantGlobales(opts);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error cargando catálogos');
    } finally {
      setLoadingCatalogos(false);
    }
  }, []);

  useEffect(() => { void cargarCatalogos(); }, [cargarCatalogos]);

  // ─── Cargar TenantCorporativos al cambiar tenantGlobal ──────────────────────

  const cargarCorporativos = useCallback(async (tenantGlobalId: string) => {
    if (!tenantGlobalId) { setTenantCorps([]); return; }
    setLoadingCorps(true);
    try {
      const API = import.meta.env.VITE_API_BASE_URL ?? '/api';
      const res = await apiFetch(`${API}/config/permisos/creacion/admin/tenant/corporativos`, { method: 'GET' });
      const rows: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res?.items) ? res.items : [];
      const filtrados: TenantCorpOption[] = rows
        .filter((r: any) => {
          const tg = String(r?.tenantGlobal?._id || r?.tenantGlobal || r?.tenantGlobalId || '').trim();
          return tg === tenantGlobalId || !tenantGlobalId;
        })
        .map((r: any) => {
          const id = String(r?.id || r?._id || '').trim();
          const label = String(r?.label || r?.name || r?.nombre || id);
          const tgId = String(r?.tenantGlobal?._id || r?.tenantGlobal || r?.tenantGlobalId || '').trim();
          return id ? { id, label: `${label} | ${id.slice(0, 8)}...`, tenantGlobalId: tgId } : null;
        })
        .filter(Boolean) as TenantCorpOption[];
      setTenantCorps(filtrados);
    } catch {
      setTenantCorps([]);
    } finally {
      setLoadingCorps(false);
    }
  }, []);

  useEffect(() => {
    if (form.tenantGlobal) void cargarCorporativos(form.tenantGlobal);
    else setTenantCorps([]);
  }, [form.tenantGlobal, cargarCorporativos]);

  // ─── Lista de personas ──────────────────────────────────────────────────────

  const cargarPersonas = useCallback(async () => {
    setLoadingPersonas(true);
    try {
      const API = import.meta.env.VITE_API_BASE_URL ?? '/api';
      const res = await apiFetch(`${API}/registro/listarRegistro`, { method: 'GET' });
      const rows: PersonaListItem[] = Array.isArray(res?.usuarios) ? res.usuarios
        : Array.isArray(res?.data) ? res.data
        : Array.isArray(res) ? res
        : [];
      setPersonas(rows);
    } catch (err: any) {
      toast.error(err?.message || 'Error cargando personas');
    } finally {
      setLoadingPersonas(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'lista') void cargarPersonas();
  }, [tab, cargarPersonas]);

  // ─── Helpers de formulario ──────────────────────────────────────────────────

  const setField = (key: keyof PersonaForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleSection = (key: string) =>
    setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    if (actor?.tenantGlobalId && !actor.tenantSuperAdminId)
      setForm((prev) => ({ ...prev, tenantGlobal: actor.tenantGlobalId! }));
    if (actor?.tenantCorporativoId)
      setForm((prev) => ({ ...prev, tenantCorporativo: actor.tenantCorporativoId! }));
  };

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredFields: (keyof PersonaForm)[] = ['nombre', 'apellido', 'correo', 'password', 'tipoDocumento', 'numeroDocumento', 'telefono', 'tenantCorporativo'];
    const missing = requiredFields.filter((f) => !form[f].trim());
    if (missing.length) {
      toast.error(`Campos requeridos: ${missing.join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      const API = import.meta.env.VITE_API_BASE_URL ?? '/api';

      // Paso 1: Crear cuenta de usuario
      const payload = {
        correo: form.correo.trim(),
        password: form.password.trim(),
        nombre_cliente: form.nombre.trim(),
        apellido: form.apellido.trim(),
        tipoDeIntendidad: form.tipoDocumento || undefined,
        documentoIntentidad: form.numeroDocumento.trim(),
        genero: form.genero || undefined,
        nacionalidad: form.nacionalidad || undefined,
        prefijo: form.prefijo || undefined,
        telefono: form.telefono.trim(),
        fecha_nacimiento: form.fechaNacimiento || undefined,
        tenantCorporativoId: form.tenantCorporativo || undefined,
        rol: 'CLIENTE',
      };

      await apiFetch(`${API}/registro/client`, { method: 'POST', body: payload });

      toast.success('Persona creada correctamente. Se envió correo de verificación.');
      resetForm();
      if (tab === 'lista') void cargarPersonas();
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear persona');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render sección colapsable ──────────────────────────────────────────────

  const SectionHeader = ({ id, icon, title, hint }: { id: string; icon: React.ReactNode; title: string; hint?: string }) => (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-2 py-1 text-left"
      onClick={() => toggleSection(id)}
    >
      <span className="flex items-center gap-2 font-semibold text-slate-800">
        {icon}
        {title}
        {hint && (
          <span className="flex items-center gap-1 text-xs font-normal text-slate-500">
            <HelpCircle className="h-3 w-3" /> {hint}
          </span>
        )}
      </span>
      {sectionOpen[id] ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
    </button>
  );

  // ─── Filtro de lista ────────────────────────────────────────────────────────

  const personasFiltradas = personas.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.correo?.toLowerCase().includes(q) ||
      p.perfil?.nombre_cliente?.toLowerCase().includes(q) ||
      p.perfil?.apellido?.toLowerCase().includes(q) ||
      p._id?.includes(q)
    );
  });

  // ─── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-5">

        {/* Header */}
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-900 p-2">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black text-slate-900">Gestión de Personas</CardTitle>
                  <p className="text-sm text-slate-500">Registro y asignación al árbol multi-tenant</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {loadingCatalogos
                  ? <Badge variant="outline"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Cargando...</Badge>
                  : scopeBadge(actor)}
                {actor?.tenantSuperAdminId && <Badge variant="outline" className="text-xs">TSA: {actor.tenantSuperAdminId.slice(0, 8)}…</Badge>}
                {actor?.tenantGlobalId && <Badge variant="outline" className="text-xs">TG: {actor.tenantGlobalId.slice(0, 8)}…</Badge>}
                {actor?.tenantCorporativoId && <Badge variant="outline" className="text-xs">TC: {actor.tenantCorporativoId.slice(0, 8)}…</Badge>}
              </div>
            </div>

            {/* Info box multi-tenant */}
            <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-slate-100 bg-white p-3 text-xs sm:grid-cols-3">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 rounded bg-info/10 p-1"><Shield className="h-3 w-3 text-info" /></div>
                <div>
                  <p className="font-semibold text-slate-700">Proveedor (SuperAdmin)</p>
                  <p className="text-slate-500">Gestiona el software. Puede crear personas en cualquier árbol.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 rounded bg-info/10 p-1"><Building2 className="h-3 w-3 text-info" /></div>
                <div>
                  <p className="font-semibold text-slate-700">Licencia (TenantGlobal)</p>
                  <p className="text-slate-500">Dueño de la licencia. Crea personas en sus corporativos.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 rounded bg-success/10 p-1"><User className="h-3 w-3 text-success" /></div>
                <div>
                  <p className="font-semibold text-slate-700">Corporativo</p>
                  <p className="text-slate-500">Área o división. Sus empleados y clientes se gestionan aquí.</p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === 'formulario' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setTab('formulario')}
          >
            Nueva persona
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === 'lista' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setTab('lista')}
          >
            Ver personas
          </button>
        </div>

        {/* ── FORMULARIO ─────────────────────────────────────────────────────── */}
        {tab === 'formulario' && (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">

            {/* Sección 1: Asignación Tenant (primero para contexto) */}
            <Card className="border-slate-200">
              <CardContent className="pt-4">
                <SectionHeader
                  id="tenant"
                  icon={<Building2 className="h-4 w-4 text-info" />}
                  title="Asignación Tenant"
                  hint="Define en qué árbol organizacional queda la persona"
                />
                {sectionOpen.tenant && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {/* TenantGlobal */}
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1">
                        Licencia (TenantGlobal)
                        {actor?.tenantGlobalId && !actor.tenantSuperAdminId && <Badge className="ml-1 text-xs bg-info/10 text-info">Pre-asignado</Badge>}
                      </Label>
                      {actor?.tenantSuperAdminId ? (
                        <Select
                          value={form.tenantGlobal}
                          onValueChange={(v) => {
                            setField('tenantGlobal', v);
                            setField('tenantCorporativo', '');
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={loadingCatalogos ? 'Cargando...' : 'Selecciona licencia'} />
                          </SelectTrigger>
                          <SelectContent>
                            {tenantGlobales.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          readOnly
                          value={actor?.tenantGlobalId ? `${actor.tenantGlobalId.slice(0, 8)}… (del JWT)` : 'Sin tenantGlobal en JWT'}
                          className="bg-slate-50 text-slate-500"
                        />
                      )}
                      <p className="text-xs text-slate-500">Contenedor de licencia al que pertenece la persona.</p>
                    </div>

                    {/* TenantCorporativo */}
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1">
                        Corporativo / Área *
                        {actor?.tenantCorporativoId && <Badge className="ml-1 text-xs bg-success/10 text-success">Pre-asignado</Badge>}
                      </Label>
                      {actor?.tenantCorporativoId ? (
                        <Input
                          readOnly
                          value={`${actor.tenantCorporativoId.slice(0, 8)}… (del JWT)`}
                          className="bg-slate-50 text-slate-500"
                        />
                      ) : (
                        <Select
                          value={form.tenantCorporativo}
                          onValueChange={(v) => setField('tenantCorporativo', v)}
                          disabled={!form.tenantGlobal || loadingCorps}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              loadingCorps ? 'Cargando corporativos...'
                                : !form.tenantGlobal ? 'Selecciona licencia primero'
                                : tenantCorps.length ? 'Selecciona área/corporativo'
                                : 'Sin corporativos disponibles'
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {tenantCorps.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <p className="text-xs text-slate-500">Área o división donde se crean empleados y clientes.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sección 2: Datos personales */}
            <Card className="border-slate-200">
              <CardContent className="pt-4">
                <SectionHeader
                  id="personal"
                  icon={<User className="h-4 w-4 text-slate-600" />}
                  title="Datos personales"
                />
                {sectionOpen.personal && (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Nombre *</Label>
                        <Input value={form.nombre} onChange={(e) => setField('nombre', e.target.value)} placeholder="Ej: Ana María" />
                      </div>
                      <div className="space-y-1">
                        <Label>Apellido *</Label>
                        <Input value={form.apellido} onChange={(e) => setField('apellido', e.target.value)} placeholder="Ej: García López" />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Tipo de documento *</Label>
                        <Select value={form.tipoDocumento} onValueChange={(v) => setField('tipoDocumento', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingCatalogos ? 'Cargando...' : 'Selecciona tipo'} />
                          </SelectTrigger>
                          <SelectContent>
                            {catalogos.tiposDocumento.map((d) => (
                              <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Número de documento *</Label>
                        <Input value={form.numeroDocumento} onChange={(e) => setField('numeroDocumento', e.target.value)} placeholder="Ej: 1234567890" />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Género</Label>
                        <Select value={form.genero} onValueChange={(v) => setField('genero', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona género" />
                          </SelectTrigger>
                          <SelectContent>
                            {catalogos.generos.map((g) => (
                              <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Fecha de nacimiento</Label>
                        <Input type="date" value={form.fechaNacimiento} onChange={(e) => setField('fechaNacimiento', e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sección 3: Contacto */}
            <Card className="border-slate-200">
              <CardContent className="pt-4">
                <SectionHeader
                  id="contacto"
                  icon={<Users className="h-4 w-4 text-slate-600" />}
                  title="Contacto"
                />
                {sectionOpen.contacto && (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label>Prefijo</Label>
                        <Select value={form.prefijo} onValueChange={(v) => setField('prefijo', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Prefijo" />
                          </SelectTrigger>
                          <SelectContent>
                            {catalogos.prefijos.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label>Teléfono *</Label>
                        <Input value={form.telefono} onChange={(e) => setField('telefono', e.target.value)} placeholder="Ej: 3001234567" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Correo electrónico *</Label>
                      <Input type="email" value={form.correo} onChange={(e) => setField('correo', e.target.value)} placeholder="persona@empresa.com" />
                      <p className="text-xs text-slate-500">Se enviará un correo de verificación a esta dirección.</p>
                    </div>

                    <div className="space-y-1">
                      <Label>Nacionalidad</Label>
                      <Select value={form.nacionalidad} onValueChange={(v) => setField('nacionalidad', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona nacionalidad" />
                        </SelectTrigger>
                        <SelectContent>
                          {catalogos.nacionalidades.map((n) => (
                            <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sección 4: Acceso */}
            <Card className="border-slate-200">
              <CardContent className="pt-4">
                <SectionHeader
                  id="acceso"
                  icon={<Shield className="h-4 w-4 text-slate-600" />}
                  title="Credenciales de acceso"
                  hint="La persona deberá cambiar la contraseña en su primer ingreso"
                />
                {sectionOpen.acceso && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-1">
                      <Label>Contraseña temporal *</Label>
                      <Input
                        type="password"
                        value={form.password}
                        onChange={(e) => setField('password', e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                      />
                      <p className="text-xs text-slate-500">Contraseña inicial. El sistema puede requerir cambio en el primer ingreso.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumen de asignación */}
            {(form.tenantGlobal || actor?.tenantGlobalId) && (
              <div className="rounded-xl border border-success/20 bg-success/10 p-4 text-sm">
                <p className="mb-2 font-semibold text-success">Resumen de asignación</p>
                <div className="grid gap-1 text-xs text-success">
                  <p>• <strong>Licencia (TG):</strong> {form.tenantGlobal || actor?.tenantGlobalId || '—'}</p>
                  <p>• <strong>Corporativo (TC):</strong> {
                    actor?.tenantCorporativoId
                      ? actor.tenantCorporativoId
                      : tenantCorps.find(c => c.id === form.tenantCorporativo)?.label || form.tenantCorporativo || '—'
                  }</p>
                  <p>• <strong>Correo:</strong> {form.correo || '—'}</p>
                  <p>• <strong>Nombre:</strong> {[form.nombre, form.apellido].filter(Boolean).join(' ') || '—'}</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Botones */}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={submitting} className="min-w-[140px]">
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...</> : 'Crear persona'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>
                Limpiar
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setTab('lista'); }} disabled={submitting}>
                Ver lista de personas
              </Button>
            </div>
          </form>
        )}

        {/* ── LISTA ──────────────────────────────────────────────────────────── */}
        {tab === 'lista' && (
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-lg">Personas registradas</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por nombre, correo o ID..."
                      className="pl-8 w-64"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void cargarPersonas()} disabled={loadingPersonas}>
                    {loadingPersonas ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPersonas ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : personasFiltradas.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p>{search ? 'Sin resultados para la búsqueda' : 'No hay personas registradas'}</p>
                </div>
              ) : (
                <div className="overflow-auto rounded-lg border border-slate-100">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                      <tr>
                        <th className="px-4 py-3 text-left">Nombre</th>
                        <th className="px-4 py-3 text-left">Correo</th>
                        <th className="px-4 py-3 text-left">Documento</th>
                        <th className="px-4 py-3 text-left">Teléfono</th>
                        <th className="px-4 py-3 text-left">Corporativo</th>
                        <th className="px-4 py-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {personasFiltradas.map((p) => (
                        <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {[p.perfil?.nombre_cliente, p.perfil?.apellido].filter(Boolean).join(' ') || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{p.correo}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                            {p.perfil?.documentoIntentidad || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{p.perfil?.telefono || '—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                            {p.tenantCorporativoId ? `${String(p.tenantCorporativoId).slice(0, 8)}…` : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={p.estado ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}>
                              {p.estado ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-2 text-right text-xs text-slate-400">{personasFiltradas.length} persona{personasFiltradas.length !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
