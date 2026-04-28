import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  getEmpleadoGlobalContext,
  getRolesCorporativos,
  getTenantCorporativos,
  listEmpleadosGlobal,
  type ActorScope,
  type CrearEmpleadoGlobalPayload,
  type EmpleadoGlobal,
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
  jefeDirectoId: string;
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
  jefeDirectoId: 'none',
};

const RH_OPTIONS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const TIPO_EMPLEADO_OPTIONS = ['INTERNO', 'EXTERNO', 'TEMPORAL', 'CONTRATISTA'];
const ESTADO_LABORAL_OPTIONS = ['ACTIVO', 'INACTIVO', 'SUSPENDIDO', 'VACACIONES'];

const formatActorBadge = (actor: ActorScope | null) => {
  if (!actor) return null;
  if (actor.tenantSuperAdminId) return { label: 'tenantSuperAdmin', className: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700' };
  if (actor.tenantGlobalId) return { label: 'tenantGlobal', className: 'border-sky-200 bg-sky-50 text-sky-700' };
  return { label: actor.rol || 'sin scope', className: 'border-slate-200 bg-slate-50 text-slate-700' };
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

const resolveJefeName = (value: EmpleadoGlobal['jefeDirectoId']) => {
  if (!value) return 'Sin jefe asignado';
  if (typeof value === 'string') return value;
  return value.correo || value._id || 'Sin jefe asignado';
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

  const actorBadge = useMemo(() => formatActorBadge(actor), [actor]);

  const corporativosDisponibles = useMemo(
    () => tenantCorporativos.filter((item) => item.tenantGlobalId === form.tenantGlobalId),
    [tenantCorporativos, form.tenantGlobalId]
  );

  const rolesDisponibles = useMemo(
    () => rolesCorporativos.filter((item) => item.tenantCorporativoId === form.tenantCorporativoId),
    [rolesCorporativos, form.tenantCorporativoId]
  );

  const jefeOptions = useMemo(
    () =>
      empleados.map((empleado) => ({
        id: String(empleado.usuarioId?._id || ''),
        label: `${empleado.usuarioId?.correo || 'Sin correo'}${empleado.cargo ? ` · ${empleado.cargo}` : ''}`,
      })).filter((item) => item.id),
    [empleados]
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

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setLoading(true);
      try {
        const [contexto, corporativos, roles] = await Promise.all([
          getEmpleadoGlobalContext(),
          getTenantCorporativos(),
          getRolesCorporativos(),
        ]);

        if (!active) return;

        const actorContext = contexto.actor;
        const tenantGlobalId = actorContext.tenantGlobalId || contexto.tenantGlobales[0]?.id || '';

        setActor(actorContext);
        setTenantGlobales(contexto.tenantGlobales);
        setTenantCorporativos(corporativos);
        setRolesCorporativos(roles);
        setForm((prev) => ({
          ...prev,
          tenantGlobalId,
          tenantCorporativoId: actorContext.tenantCorporativoId || '',
        }));

        if (tenantGlobalId) {
          await refreshEmpleados(tenantGlobalId, actorContext.tenantCorporativoId || undefined);
        }
      } catch (error: any) {
        if (!active) return;
        toast.error(error?.message || 'No fue posible cargar la parametrizacion de empleados');
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
  }, [form.tenantGlobalId, form.tenantCorporativoId]);

  useEffect(() => {
    if (!form.tenantCorporativoId) {
      setForm((prev) => ({ ...prev, rolCorporativoId: '', jefeDirectoId: 'none' }));
      return;
    }

    const validRole = rolesDisponibles.some((role) => role.id === form.rolCorporativoId);
    if (!validRole) {
      setForm((prev) => ({ ...prev, rolCorporativoId: '' }));
    }
  }, [form.rolCorporativoId, form.tenantCorporativoId, rolesDisponibles]);

  const handleField = (key: keyof EmpleadoFormState, value: string) => {
    setForm((prev) => {
      if (key === 'tenantGlobalId') {
        return {
          ...prev,
          tenantGlobalId: value,
          tenantCorporativoId: '',
          rolCorporativoId: '',
          jefeDirectoId: 'none',
        };
      }

      if (key === 'tenantCorporativoId') {
        return {
          ...prev,
          tenantCorporativoId: value,
          rolCorporativoId: '',
          jefeDirectoId: 'none',
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
      jefeDirectoId: form.jefeDirectoId !== 'none' ? form.jefeDirectoId : undefined,
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

  const totalActivos = useMemo(
    () => empleados.filter((empleado) => empleado.estadoLaboral === 'ACTIVO').length,
    [empleados]
  );

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando centro de empleados corporativos...
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_35%),linear-gradient(135deg,_#0f172a,_#111827_45%,_#0f766e)] px-6 py-7 text-white shadow-lg">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/10 bg-white/10 text-white hover:bg-white/10">Config Corporativo</Badge>
              {actorBadge ? <Badge className={actorBadge.className}>{actorBadge.label}</Badge> : null}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Parametrizacion intuitiva de empleados</h1>
              <p className="mt-2 text-sm text-slate-200">
                Esta ruta debe gobernar personas, no repetir la parametrizacion corporativa vieja. Desde aqui puedes
                elegir el tenant, definir el rol corporativo, asignar jefe directo y revisar el equipo activo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="border-white/10 bg-white/10 text-white shadow-none">
              <CardContent className="flex items-center gap-3 p-4">
                <Users className="h-5 w-5 text-emerald-200" />
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Empleados</p>
                  <p className="text-2xl font-semibold">{empleados.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/10 text-white shadow-none">
              <CardContent className="flex items-center gap-3 p-4">
                <BadgeCheck className="h-5 w-5 text-sky-200" />
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Activos</p>
                  <p className="text-2xl font-semibold">{totalActivos}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/10 text-white shadow-none">
              <CardContent className="flex items-center gap-3 p-4">
                <Building2 className="h-5 w-5 text-fuchsia-200" />
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Corporativos</p>
                  <p className="text-2xl font-semibold">{corporativosDisponibles.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <UserPlus className="h-5 w-5 text-emerald-600" />
                  Alta guiada de empleado
                </CardTitle>
                <CardDescription>
                  Crea un empleado con tenant corporativo, rol corporativo y linea de reporte desde una sola vista.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => void refreshEmpleados(form.tenantGlobalId, form.tenantCorporativoId || undefined)}
              >
                <RefreshCw className="h-4 w-4" />
                Recargar
              </Button>
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
                  <Label>Tenant corporativo</Label>
                  <Select
                    value={form.tenantCorporativoId}
                    onValueChange={(value) => handleField('tenantCorporativoId', value)}
                    disabled={!form.tenantGlobalId || Boolean(actor?.tenantCorporativoId)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona corporativo" />
                    </SelectTrigger>
                    <SelectContent>
                      {corporativosDisponibles.map((item) => (
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
                    disabled={!form.tenantCorporativoId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {rolesDisponibles.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Jefe directo</Label>
                  <Select value={form.jefeDirectoId} onValueChange={(value) => handleField('jefeDirectoId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin jefe directo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin jefe directo</SelectItem>
                      {jefeOptions.map((item) => (
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
                      {RH_OPTIONS.map((item) => (
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
                      {TIPO_EMPLEADO_OPTIONS.map((item) => (
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
                      {ESTADO_LABORAL_OPTIONS.map((item) => (
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
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <BriefcaseBusiness className="h-5 w-5 text-fuchsia-600" />
                Contexto operativo
              </CardTitle>
              <CardDescription>Resumen rapido del alcance con el que estas parametrizando empleados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span>Rol del actor</span>
                <span className="font-medium text-slate-900">{actor?.rol || 'Sin rol'}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span>Tenant global activo</span>
                <span className="font-medium text-slate-900">{form.tenantGlobalId || 'No seleccionado'}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span>Corporativo activo</span>
                <span className="font-medium text-slate-900">{form.tenantCorporativoId || 'Todos'}</span>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-800">
                La duplicacion ocurria porque `ConfigCorporativo` seguia montando las tabs antiguas de
                `ParametrizacionCorporativa`. Ahora esta vista queda especializada en empleados.
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-slate-900">Equipo actual</CardTitle>
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
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando empleados...
                </div>
              ) : (
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
                              <p className="font-medium text-slate-900">{empleado.usuarioId?.correo || '-'}</p>
                              <p className="text-xs text-slate-500">{resolveJefeName(empleado.jefeDirectoId)}</p>
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
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-500">
                          No hay empleados para el filtro actual.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
