import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  Pencil,
  Loader2,
  Settings2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
  UserPlus,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  createEmpleadoGlobal,
  createParametrizacionEmpleado,
  createRolCorporativo,
  deleteParametrizacionEmpleado,
  deleteRolCorporativo,
  getEmpleadoGlobalContext,
  getParametrizacionEmpleado,
  getRolesCorporativos,
  getTenantCorporativos,
  listEmpleadosGlobal,
  updateParametrizacionEmpleado,
  updateRolCorporativo,
  type ActorScope,
  type CrearEmpleadoGlobalPayload,
  type EmpleadoGlobal,
  type ParametrizacionEmpleadoOption,
  type ParametrizacionEmpleadoTipo,
  type RolCorporativoOption,
  type TenantCorporativoOption,
  type TenantGlobalOption,
} from '@/app/services/empleadoGlobalService';

type EmpleadoFormState = {
  nombre: string;
  apellido: string;
  correo: string;
  password: string;
  cc: string;
  telefono: string;
  direccion: string;
  rh: string;
  fecha_nacimiento: string;
  tenantGlobalId: string;
  tenantCorporativoId: string;
  rolCorporativoId: string;
  cargo: string;
  tipoEmpleado: string;
  estadoLaboral: string;
};

const EMPTY_FORM: EmpleadoFormState = {
  nombre: '',
  apellido: '',
  correo: '',
  password: '',
  cc: '',
  telefono: '',
  direccion: '',
  rh: 'O+',
  fecha_nacimiento: '',
  tenantGlobalId: '',
  tenantCorporativoId: '',
  rolCorporativoId: '',
  cargo: '',
  tipoEmpleado: 'INTERNO',
  estadoLaboral: 'ACTIVO',
};

const RH_OPTIONS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const TIPO_EMPLEADO_OPTIONS = ['INTERNO', 'EXTERNO', 'TEMPORAL', 'CONTRATISTA'];
const ESTADO_LABORAL_OPTIONS = ['ACTIVO', 'INACTIVO', 'SUSPENDIDO', 'VACACIONES'];
const PARAM_TIPOS: Array<{ value: ParametrizacionEmpleadoTipo; label: string }> = [
  { value: 'RH', label: 'RH' },
  { value: 'TIPO_EMPLEADO', label: 'Tipo de empleado' },
  { value: 'ESTADO_LABORAL', label: 'Estado laboral' },
];

const formatActorBadge = (actor: ActorScope | null) => {
  if (!actor) return null;
  if (actor.tenantSuperAdminId) return { label: 'tenantSuperAdmin', className: 'border-info/20 bg-info/10 text-info' };
  if (actor.tenantGlobalId) return { label: 'tenantGlobal', className: 'border-info/20 bg-info/10 text-info' };
  return { label: actor.rol || 'sin scope', className: 'border-border bg-muted/40 text-foreground' };
};

const resolveCorporativoName = (value: EmpleadoGlobal['tenantCorporativoId']) => {
  if (!value) return '-';
  if (typeof value === 'string') return value;
  return value.coporativo || value._id || '-';
};

const resolveRolName = (value: EmpleadoGlobal['rolCorporativoId']) => {
  if (!value) return '-';
  if (typeof value === 'string') return value;
  return value.rol || value._id || '-';
};

export default function ConfigCorporativo() {
  const [actor, setActor] = useState<ActorScope | null>(null);
  const [tenantGlobales, setTenantGlobales] = useState<TenantGlobalOption[]>([]);
  const [tenantCorporativos, setTenantCorporativos] = useState<TenantCorporativoOption[]>([]);
  const [rolesCorporativos, setRolesCorporativos] = useState<RolCorporativoOption[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoGlobal[]>([]);
  const [form, setForm] = useState<EmpleadoFormState>(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rolNombre, setRolNombre] = useState('');
  const [rolEditandoId, setRolEditandoId] = useState<string | null>(null);
  const [rolModalOpen, setRolModalOpen] = useState(false);
  const [savingRol, setSavingRol] = useState(false);
  const [deletingRolId, setDeletingRolId] = useState<string | null>(null);
  const [parametrosEmpleado, setParametrosEmpleado] = useState<ParametrizacionEmpleadoOption[]>([]);
  const [paramModalOpen, setParamModalOpen] = useState(false);
  const [paramTipo, setParamTipo] = useState<ParametrizacionEmpleadoTipo>('RH');
  const [paramValor, setParamValor] = useState('');
  const [paramEditandoId, setParamEditandoId] = useState<string | null>(null);
  const [savingParametro, setSavingParametro] = useState(false);
  const [deletingParametroId, setDeletingParametroId] = useState<string | null>(null);

  const actorBadge = useMemo(() => formatActorBadge(actor), [actor]);

  const corporativosDisponibles = useMemo(
    () => tenantCorporativos.filter((item) => item.tenantGlobalId === form.tenantGlobalId),
    [tenantCorporativos, form.tenantGlobalId]
  );

  const rolesDisponibles = useMemo(
    () => rolesCorporativos.filter((item) => item.tenantCorporativoId === form.tenantCorporativoId),
    [rolesCorporativos, form.tenantCorporativoId]
  );

  const parametrosPorTipo = useMemo(() => {
    const grouped: Record<ParametrizacionEmpleadoTipo, string[]> = {
      RH: [],
      TIPO_EMPLEADO: [],
      ESTADO_LABORAL: [],
    };

    parametrosEmpleado.forEach((item) => {
      grouped[item.tipo].push(item.valor);
    });

    return {
      RH: grouped.RH.length ? grouped.RH : RH_OPTIONS,
      TIPO_EMPLEADO: grouped.TIPO_EMPLEADO.length ? grouped.TIPO_EMPLEADO : TIPO_EMPLEADO_OPTIONS,
      ESTADO_LABORAL: grouped.ESTADO_LABORAL.length ? grouped.ESTADO_LABORAL : ESTADO_LABORAL_OPTIONS,
    };
  }, [parametrosEmpleado]);

  const parametrosModalList = useMemo(
    () => parametrosEmpleado.filter((item) => item.tipo === paramTipo),
    [parametrosEmpleado, paramTipo]
  );

  const empleadosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return empleados;

    return empleados.filter((empleado) => {
      const fields = [
        empleado.usuarioId?.correo,
        empleado.cargo,
        resolveCorporativoName(empleado.tenantCorporativoId),
        resolveRolName(empleado.rolCorporativoId),
        empleado.tipoEmpleado,
        empleado.estadoLaboral,
      ];

      return fields.some((field) => String(field || '').toLowerCase().includes(term));
    });
  }, [empleados, search]);

  const refreshEmpleados = async (tenantGlobalId: string, tenantCorporativoId?: string) => {
    if (!tenantGlobalId) {
      setEmpleados([]);
      return;
    }

    setLoadingTable(true);
    try {
      const data = await listEmpleadosGlobal({
        tenantGlobalId,
        tenantCorporativoId: tenantCorporativoId || undefined,
      });
      setEmpleados(data);
    } catch (error: any) {
      setEmpleados([]);
      toast.error(error?.message || 'No fue posible cargar los empleados');
    } finally {
      setLoadingTable(false);
    }
  };

  const refreshRolesCorporativos = async (tenantCorporativoId?: string) => {
    const roles = await getRolesCorporativos(tenantCorporativoId ? { tenantCorporativoId } : undefined);
    setRolesCorporativos((prev) => {
      if (!tenantCorporativoId) return roles;
      const externos = prev.filter((item) => item.tenantCorporativoId !== tenantCorporativoId);
      return [...externos, ...roles];
    });
  };

  const refreshParametrizacionEmpleado = async (tenantCorporativoId?: string) => {
    if (!tenantCorporativoId) {
      setParametrosEmpleado([]);
      return;
    }

    try {
      const data = await getParametrizacionEmpleado(tenantCorporativoId);
      setParametrosEmpleado(data);
    } catch (error: any) {
      setParametrosEmpleado([]);
      toast.error(error?.message || 'No fue posible cargar la parametrizacion de empleados');
    }
  };

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setLoading(true);
      try {
        const contexto = await getEmpleadoGlobalContext();
        if (!active) return;

        const actorContext = contexto.actor;
        const tenantGlobalId = actorContext.tenantGlobalId || contexto.tenantGlobales[0]?.id || '';
        const tenantCorporativoId = actorContext.tenantCorporativoId || '';

        const [corporativos, roles] = await Promise.all([
          getTenantCorporativos(tenantGlobalId ? { tenantGlobal: tenantGlobalId } : undefined),
          getRolesCorporativos(tenantCorporativoId ? { tenantCorporativoId } : undefined),
        ]);

        if (!active) return;

        setActor(actorContext);
        setTenantGlobales(contexto.tenantGlobales);
        setTenantCorporativos(corporativos);
        setRolesCorporativos(roles);
        setForm((prev) => ({
          ...prev,
          tenantGlobalId,
          tenantCorporativoId,
        }));

        if (tenantGlobalId) {
          await refreshEmpleados(tenantGlobalId, tenantCorporativoId || undefined);
        }
        if (tenantCorporativoId) {
          await refreshParametrizacionEmpleado(tenantCorporativoId);
        }
      } catch (error: any) {
        if (!active) return;
        toast.error(error?.message || 'No fue posible cargar la configuracion de empleados');
      } finally {
        if (active) setLoading(false);
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!form.tenantGlobalId) return;
    void refreshEmpleados(form.tenantGlobalId, form.tenantCorporativoId || undefined);
    void refreshParametrizacionEmpleado(form.tenantCorporativoId || undefined);
  }, [form.tenantGlobalId, form.tenantCorporativoId]);

  // Para SuperAdmin / TenantGlobal: cuando no hay tenantCorporativoId en scope,
  // auto-selecciona el primero disponible al cambiar el tenant global.
  useEffect(() => {
    if (actor?.tenantCorporativoId) return;
    if (form.tenantCorporativoId) return;
    const primero = corporativosDisponibles[0];
    if (!primero) return;
    void refreshRolesCorporativos(primero.id);
    setForm((prev) => ({ ...prev, tenantCorporativoId: primero.id, rolCorporativoId: '' }));
  }, [corporativosDisponibles, actor?.tenantCorporativoId]);

  useEffect(() => {
    if (!form.rolCorporativoId) return;
    const validRole = rolesCorporativos.some((role) => role.id === form.rolCorporativoId);
    if (!validRole) {
      setForm((prev) => ({ ...prev, rolCorporativoId: '' }));
    }
  }, [form.rolCorporativoId, rolesCorporativos]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      rh: parametrosPorTipo.RH.includes(prev.rh) ? prev.rh : parametrosPorTipo.RH[0] || '',
      tipoEmpleado: parametrosPorTipo.TIPO_EMPLEADO.includes(prev.tipoEmpleado)
        ? prev.tipoEmpleado
        : parametrosPorTipo.TIPO_EMPLEADO[0] || '',
      estadoLaboral: parametrosPorTipo.ESTADO_LABORAL.includes(prev.estadoLaboral)
        ? prev.estadoLaboral
        : parametrosPorTipo.ESTADO_LABORAL[0] || '',
    }));
  }, [parametrosPorTipo]);

  const handleField = (key: keyof EmpleadoFormState, value: string) => {
    setForm((prev) => {
      if (key === 'tenantGlobalId') {
        return {
          ...prev,
          tenantGlobalId: value,
          tenantCorporativoId: '',
          rolCorporativoId: '',
        };
      }

      if (key === 'tenantCorporativoId') {
        void refreshRolesCorporativos(value);
        return {
          ...prev,
          tenantCorporativoId: value,
          rolCorporativoId: '',
        };
      }

      return { ...prev, [key]: value };
    });
  };

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      tenantGlobalId: actor?.tenantGlobalId || form.tenantGlobalId,
      tenantCorporativoId: actor?.tenantCorporativoId || '',
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const requiredFields: Array<keyof EmpleadoFormState> = [
      'nombre',
      'apellido',
      'correo',
      'password',
      'cc',
      'telefono',
      'direccion',
      'fecha_nacimiento',
      'tenantCorporativoId',
      'rolCorporativoId',
    ];

    const missing = requiredFields.filter((field) => !String(form[field] || '').trim());
    if (missing.length) {
      toast.error(`Completa los campos obligatorios: ${missing.join(', ')}`);
      return;
    }

    const payload: CrearEmpleadoGlobalPayload = {
      correo: form.correo.trim(),
      password: form.password.trim(),
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      cc: form.cc.trim(),
      telefono: form.telefono.trim(),
      direccion: form.direccion.trim(),
      rh: form.rh.trim().toUpperCase(),
      fecha_nacimiento: form.fecha_nacimiento,
      tenantGlobalId: actor?.tenantSuperAdminId ? form.tenantGlobalId : undefined,
      tenantCorporativoId: form.tenantCorporativoId,
      rolCorporativoId: form.rolCorporativoId,
      cargo: form.cargo.trim() || undefined,
      tipoEmpleado: form.tipoEmpleado,
      estadoLaboral: form.estadoLaboral,
    };

    setSubmitting(true);
    try {
      await createEmpleadoGlobal(payload);
      toast.success('Empleado creado correctamente');
      resetForm();
      await refreshEmpleados(form.tenantGlobalId, form.tenantCorporativoId || undefined);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo crear el empleado');
    } finally {
      setSubmitting(false);
    }
  };

  const resetRolForm = () => {
    setRolNombre('');
    setRolEditandoId(null);
  };

  const resetParametroForm = () => {
    setParamValor('');
    setParamEditandoId(null);
  };

  const handleSaveRol = async () => {
    const nombre = rolNombre.trim();
    if (!form.tenantCorporativoId) {
      toast.error('Selecciona un tenant corporativo para gestionar sus roles');
      return;
    }
    if (!nombre) {
      toast.error('Escribe el nombre del rol corporativo');
      return;
    }

    setSavingRol(true);
    try {
      if (rolEditandoId) {
        await updateRolCorporativo(rolEditandoId, { rol: nombre });
        toast.success('Rol corporativo actualizado');
      } else {
        await createRolCorporativo({
          rol: nombre,
          tenantCorporativoId: form.tenantCorporativoId,
        });
        toast.success('Rol corporativo creado');
      }
      resetRolForm();
      await refreshRolesCorporativos(form.tenantCorporativoId);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo guardar el rol corporativo');
    } finally {
      setSavingRol(false);
    }
  };

  const handleEditRol = (role: RolCorporativoOption) => {
    setRolEditandoId(role.id);
    setRolNombre(role.label);
  };

  const handleDeleteRol = async (role: RolCorporativoOption) => {
    if (!window.confirm(`Deseas eliminar el rol ${role.label}?`)) return;

    setDeletingRolId(role.id);
    try {
      await deleteRolCorporativo(role.id);
      toast.success('Rol corporativo eliminado');
      if (form.rolCorporativoId === role.id) {
        setForm((prev) => ({ ...prev, rolCorporativoId: '' }));
      }
      if (rolEditandoId === role.id) {
        resetRolForm();
      }
      await refreshRolesCorporativos(form.tenantCorporativoId || undefined);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo eliminar el rol corporativo');
    } finally {
      setDeletingRolId(null);
    }
  };

  const handleSaveParametro = async () => {
    const valor = paramValor.trim();
    if (!form.tenantCorporativoId) {
      toast.error('Selecciona un tenant corporativo para parametrizar empleados');
      return;
    }
    if (!valor) {
      toast.error('Escribe el valor de la opcion');
      return;
    }

    setSavingParametro(true);
    try {
      if (paramEditandoId) {
        await updateParametrizacionEmpleado(paramEditandoId, valor);
        toast.success('Parametro actualizado');
      } else {
        await createParametrizacionEmpleado({
          tenantCorporativoId: form.tenantCorporativoId,
          tipo: paramTipo,
          valor,
        });
        toast.success('Parametro creado');
      }
      resetParametroForm();
      await refreshParametrizacionEmpleado(form.tenantCorporativoId);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo guardar el parametro');
    } finally {
      setSavingParametro(false);
    }
  };

  const handleEditParametro = (item: ParametrizacionEmpleadoOption) => {
    setParamTipo(item.tipo);
    setParamValor(item.valor);
    setParamEditandoId(item.id);
  };

  const handleDeleteParametro = async (item: ParametrizacionEmpleadoOption) => {
    if (item.isDefault) return;
    if (!window.confirm(`Deseas eliminar ${item.valor}?`)) return;

    setDeletingParametroId(item.id);
    try {
      await deleteParametrizacionEmpleado(item.id);
      toast.success('Parametro eliminado');
      if (paramEditandoId === item.id) resetParametroForm();
      await refreshParametrizacionEmpleado(form.tenantCorporativoId || undefined);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo eliminar el parametro');
    } finally {
      setDeletingParametroId(null);
    }
  };

  const totalActivos = useMemo(
    () => empleados.filter((empleado) => empleado.estadoLaboral === 'ACTIVO').length,
    [empleados]
  );

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando centro de empleados corporativos...
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-border bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_35%),linear-gradient(135deg,_#0f172a,_#111827_45%,_#0f766e)] px-6 py-7 text-button-foreground shadow-lg">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-border bg-muted/40 text-button-foreground hover:bg-muted/40">Config Corporativo</Badge>
              {actorBadge ? <Badge className={actorBadge.className}>{actorBadge.label}</Badge> : null}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Parametrizacion intuitiva de empleados</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Esta ruta debe gobernar personas, no repetir la parametrizacion corporativa vieja. Desde aqui puedes
                elegir el tenant global, definir el corporativo, configurar el rol corporativo y revisar el equipo activo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="border-border bg-muted/40 text-button-foreground shadow-none">
              <CardContent className="flex items-center gap-3 p-4">
                <Users className="h-5 w-5 text-success" />
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Empleados</p>
                  <p className="text-2xl font-semibold">{empleados.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-muted/40 text-button-foreground shadow-none">
              <CardContent className="flex items-center gap-3 p-4">
                <BadgeCheck className="h-5 w-5 text-info" />
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Activos</p>
                  <p className="text-2xl font-semibold">{totalActivos}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-muted/40 text-button-foreground shadow-none">
              <CardContent className="flex items-center gap-3 p-4">
                <Building2 className="h-5 w-5 text-info" />
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Corporativos</p>
                  <p className="text-2xl font-semibold">{corporativosDisponibles.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <UserPlus className="h-5 w-5 text-success" />
                  Alta guiada de empleado
                </CardTitle>
                <CardDescription>
                  Crea un empleado con tenant global, tenant corporativo y rol corporativo desde una sola vista.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => void refreshEmpleados(form.tenantGlobalId, form.tenantCorporativoId || undefined)}
                >
                  <RefreshCw className="h-4 w-4" />
                  Recargar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setParamModalOpen(true)}
                  disabled={!form.tenantCorporativoId}
                >
                  <Settings2 className="h-4 w-4" />
                  Parametrizar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tenant global</Label>
                  <Select
                    value={form.tenantGlobalId}
                    onValueChange={(value) => handleField('tenantGlobalId', value)}
                    disabled={Boolean(actor?.tenantGlobalId)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tenant global" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenantGlobales.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rol corporativo</Label>
                  <Select
                    value={form.rolCorporativoId}
                    onValueChange={(value) => handleField('rolCorporativoId', value)}
                    disabled={rolesCorporativos.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={rolesCorporativos.length === 0 ? 'Sin roles configurados' : 'Selecciona rol'} />
                    </SelectTrigger>
                    <SelectContent>
                      {rolesCorporativos.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={form.nombre} onChange={(e) => handleField('nombre', e.target.value)} placeholder="Ana" />
                </div>
                <div className="space-y-2">
                  <Label>Apellido</Label>
                  <Input value={form.apellido} onChange={(e) => handleField('apellido', e.target.value)} placeholder="Perez" />
                </div>
                <div className="space-y-2">
                  <Label>Correo</Label>
                  <Input type="email" value={form.correo} onChange={(e) => handleField('correo', e.target.value)} placeholder="empleado@empresa.com" />
                </div>
                <div className="space-y-2">
                  <Label>Password temporal</Label>
                  <Input type="password" value={form.password} onChange={(e) => handleField('password', e.target.value)} placeholder="Temporal123*" />
                </div>
                <div className="space-y-2">
                  <Label>Documento</Label>
                  <Input value={form.cc} onChange={(e) => handleField('cc', e.target.value)} placeholder="1032456789" />
                </div>
                <div className="space-y-2">
                  <Label>Telefono</Label>
                  <Input value={form.telefono} onChange={(e) => handleField('telefono', e.target.value)} placeholder="3001234567" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Direccion</Label>
                  <Input value={form.direccion} onChange={(e) => handleField('direccion', e.target.value)} placeholder="Cra 10 # 25 - 30" />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de nacimiento</Label>
                  <Input type="date" value={form.fecha_nacimiento} onChange={(e) => handleField('fecha_nacimiento', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>RH</Label>
                  <Select value={form.rh} onValueChange={(value) => handleField('rh', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="RH" />
                    </SelectTrigger>
                    <SelectContent>
                      {parametrosPorTipo.RH.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input value={form.cargo} onChange={(e) => handleField('cargo', e.target.value)} placeholder="Coordinador comercial" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de empleado</Label>
                  <Select value={form.tipoEmpleado} onValueChange={(value) => handleField('tipoEmpleado', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      {parametrosPorTipo.TIPO_EMPLEADO.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado laboral</Label>
                  <Select value={form.estadoLaboral} onValueChange={(value) => handleField('estadoLaboral', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Estado laboral" />
                    </SelectTrigger>
                    <SelectContent>
                      {parametrosPorTipo.ESTADO_LABORAL.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" className="gap-2" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Crear empleado
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Limpiar formulario
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <BriefcaseBusiness className="h-5 w-5 text-info" />
                    Parametrizacion
                  </CardTitle>
                  <CardDescription>Configura los catalogos que usa esta alta guiada.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="justify-start gap-2"
                onClick={() => setParamModalOpen(true)}
                disabled={!form.tenantCorporativoId}
              >
                <Settings2 className="h-4 w-4" />
                Campos empleado
              </Button>
              <Button
                type="button"
                variant="outline"
                className="justify-start gap-2"
                onClick={() => setRolModalOpen(true)}
                disabled={!form.tenantCorporativoId}
              >
                <BriefcaseBusiness className="h-4 w-4" />
                Roles corporativos
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-foreground">Equipo actual</CardTitle>
                  <CardDescription>Filtra por correo, rol, corporativo o cargo.</CardDescription>
                </div>
                <Badge variant="outline">{empleadosFiltrados.length} visibles</Badge>
              </div>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar empleado..."
              />
            </CardHeader>
            <CardContent>
              {loadingTable ? (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando empleados...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Correo</TableHead>
                        <TableHead>Corporativo</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {empleadosFiltrados.length ? (
                        empleadosFiltrados.map((empleado) => (
                          <TableRow key={empleado._id}>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-foreground">{empleado.usuarioId?.correo || '-'}</p>
                              </div>
                            </TableCell>
                            <TableCell>{resolveCorporativoName(empleado.tenantCorporativoId)}</TableCell>
                            <TableCell>{resolveRolName(empleado.rolCorporativoId)}</TableCell>
                            <TableCell>{empleado.cargo || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{empleado.estadoLaboral || 'N/D'}</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                            No hay empleados para el filtro actual.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={rolModalOpen} onOpenChange={setRolModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BriefcaseBusiness className="h-5 w-5 text-info" />
              Roles corporativos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={rolNombre}
                onChange={(event) => setRolNombre(event.target.value)}
                placeholder="Nombre del rol"
                disabled={!form.tenantCorporativoId || savingRol}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="gap-2"
                  onClick={() => void handleSaveRol()}
                  disabled={!form.tenantCorporativoId || savingRol}
                >
                  {savingRol ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {rolEditandoId ? 'Actualizar' : 'Guardar'}
                </Button>
                {rolEditandoId ? (
                  <Button type="button" variant="outline" onClick={resetRolForm} disabled={savingRol}>
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>

            {!form.tenantCorporativoId ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                Selecciona un tenant corporativo para listar y administrar sus roles.
              </div>
            ) : rolesDisponibles.length ? (
              <div className="space-y-2">
                {rolesDisponibles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-foreground">{role.label}</span>
                    <div className="flex shrink-0 gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleEditRol(role)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleDeleteRol(role)}
                        disabled={deletingRolId === role.id}
                      >
                        {deletingRolId === role.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                No hay roles corporativos para este tenant.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRolModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paramModalOpen} onOpenChange={setParamModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-info" />
              Parametrizacion de empleado
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-[0.8fr_1fr_auto]">
              <div className="space-y-2">
                <Label>Campo</Label>
                <Select
                  value={paramTipo}
                  onValueChange={(value) => {
                    setParamTipo(value as ParametrizacionEmpleadoTipo);
                    resetParametroForm();
                  }}
                  disabled={Boolean(paramEditandoId)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Campo" />
                  </SelectTrigger>
                  <SelectContent>
                    {PARAM_TIPOS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  value={paramValor}
                  onChange={(event) => setParamValor(event.target.value)}
                  placeholder="Ej: ACTIVO"
                />
              </div>

              <div className="flex items-end gap-2">
                <Button type="button" className="gap-2" onClick={() => void handleSaveParametro()} disabled={savingParametro}>
                  {savingParametro ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {paramEditandoId ? 'Actualizar' : 'Guardar'}
                </Button>
                {paramEditandoId ? (
                  <Button type="button" variant="outline" onClick={resetParametroForm} disabled={savingParametro}>
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              {parametrosModalList.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.valor}</p>
                    {item.isDefault ? <p className="text-xs text-muted-foreground">Default inicial</p> : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditParametro(item)}
                      disabled={item.isDefault}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleDeleteParametro(item)}
                      disabled={item.isDefault || deletingParametroId === item.id}
                    >
                      {deletingParametroId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setParamModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
