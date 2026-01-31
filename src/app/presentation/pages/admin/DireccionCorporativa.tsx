import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { toast } from 'react-toastify';

const DEPARTAMENTO_NOMBRES: Record<string, string> = {
  '1': 'Amazonas', '2': 'Antioquia', '3': 'Arauca', '4': 'Atlántico', '5': 'Bogotá D.C.',
  '6': 'Bolívar', '7': 'Boyacá', '8': 'Caldas', '9': 'Caquetá', '10': 'Casanare',
  '11': 'Cauca', '12': 'Cesar', '13': 'Chocó', '14': 'Córdoba', '15': 'Cundinamarca',
  '16': 'Guainía', '17': 'Guaviare', '18': 'Huila', '19': 'La Guajira', '20': 'Magdalena',
  '21': 'Meta', '22': 'Nariño', '23': 'Norte de Santander', '24': 'Putumayo', '25': 'Quindío',
  '26': 'Risaralda', '27': 'San Andrés y Providencia', '28': 'Santander', '29': 'Sucre',
  '30': 'Tolima', '31': 'Valle del Cauca', '32': 'Vaupés', '33': 'Vichada'
};

export default function DireccionCorporativa() {
  const [activeAddress, setActiveAddress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    paisId: '', depId: '', ciudadId: '', prefijoId: '',
    telefono_empresa: '', correo_empresa: '', horario_atencion: '',
  });

  const [updateForm, setUpdateForm] = useState({
    paisId: '', depId: '', ciudadId: '', prefijoId: '',
    depObjectId: '', ciudadObjectId: '', prefijoObjectId: '',
    telefono_empresa: '', correo_empresa: '', horario_atencion: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const [paises, setPaises] = useState<any[]>([]);
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [ciudades, setCiudades] = useState<any[]>([]);
  const [ciudadesUpdate, setCiudadesUpdate] = useState<any[]>([]);
  const [prefijos, setPrefijos] = useState<any[]>([]);
  const [loadingParams, setLoadingParams] = useState(true);

  const fetchDirecciones = async () => {
    console.log('🔄 Iniciando carga de direcciones...');
    setLoading(true);
    try {
      const res = await apiFetch('/api/config/parametrizacion/direccion/coporativa', { method: 'GET' });

      let lista = [];
      if (res?.direcciones && Array.isArray(res.direcciones)) lista = res.direcciones;
      else if (Array.isArray(res)) lista = res;


      if (lista.length > 0) {
        const dir = lista[0];
        setActiveAddress(dir);
        prepararUpdateForm(dir);
      } else {
        setActiveAddress(null);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const prepararUpdateForm = (dir: any) => {

    const depId = dir.departamento_estado?.Id || dir.depId || '';
    const ciudadId = dir.ciudad?.ciudadId || dir.ciudadId || '';
    const prefijoId = dir.prefijo?.iud || dir.prefijo?._id || dir.prefijoId || '';

    const depObjectId = dir.departamento_estado?._id || '';
    const ciudadObjectId = dir.ciudad?._id || '';
    const prefijoObjectId = dir.prefijo?.iud || dir.prefijo?._id || '';

    const formData = {
      paisId: '1',
      depId: String(depId),
      ciudadId: String(ciudadId),
      prefijoId: String(prefijoId),
      depObjectId: String(depObjectId),
      ciudadObjectId: String(ciudadObjectId),
      prefijoObjectId: String(prefijoObjectId),
      telefono_empresa: dir.telefono_empresa || '',
      correo_empresa: dir.correo_empresa || '',
      horario_atencion: dir.horario_atencion || '',
    };

    setUpdateForm(formData as any);
  };

  useEffect(() => {
    const fetchParams = async () => {
      setLoadingParams(true);
      try {
        const [location, prefijosRes] = await Promise.all([
          apiFetch('/api/perfil/seguridad/listar/paises/departamentos/ciudades?paisId=1', { method: 'GET' }),
          apiFetch('/api/perfil/seguridad/listar/tipo/prefijo', { method: 'GET' })
        ]);

        setPaises(location?.pais ? [location.pais] : []);
        setDepartamentos(location?.departamentos || []);
        setPrefijos(prefijosRes?.prefijos || []);
      } catch (err) {
        console.error('❌ Error al cargar parámetros:', err);
        toast.error('Error al cargar parámetros');
      } finally {
        setLoadingParams(false);
        fetchDirecciones();
      }
    };
    fetchParams();
  }, []);

  useEffect(() => {
    if (!form.depId) {
      setCiudades([]);
      return;
    }
    const dep = departamentos.find((d: any) => String(d.departamentoId) === String(form.depId));
    setCiudades(dep ? dep.ciudades : []);
  }, [form.depId, departamentos]);

  useEffect(() => {
    if (!updateForm.depId) {
      setCiudadesUpdate([]);
      return;
    }
    const dep = departamentos.find((d: any) => String(d.departamentoId) === String(updateForm.depId));
    setCiudadesUpdate(dep ? dep.ciudades : []);
  }, [updateForm.depId, departamentos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/configuracion/parametrizacion/direccion-publica', {
        method: 'POST',
        body: form,
      });

      if (res.ok || res.msg) {
        toast.success('✅ Dirección guardada correctamente');

        if (res.direccion) {

          const direccionEnriquecida = {
            ...res.direccion,
            depId: form.depId,
            ciudadId: form.ciudadId,
            prefijoId: form.prefijoId,
          };

          setActiveAddress(direccionEnriquecida);
          prepararUpdateForm(direccionEnriquecida);
        }

        setForm({
          paisId: '',
          depId: '',
          ciudadId: '',
          prefijoId: '',
          telefono_empresa: '',
          correo_empresa: '',
          horario_atencion: '',
        });

        await fetchDirecciones();
      }
    } catch (err: any) {
      console.error('❌ Error al guardar dirección:', err);
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = activeAddress?.iud || activeAddress?._id;

    if (!id) {
      toast.error('No se encontró el ID de la dirección');
      return;
    }

    const payload = {
      departamento_estado: updateForm.depObjectId,
      ciudad: updateForm.ciudadObjectId,
      prefijo: updateForm.prefijoObjectId,
      telefono_empresa: updateForm.telefono_empresa,
      correo_empresa: updateForm.correo_empresa,
      horario_atencion: updateForm.horario_atencion,
    };

    setUpdating(true);
    try {
      const res = await apiFetch(`/api/configuracion/parametrizacion/actualizar/direccion-publica/${id}`, {
        method: 'PUT',
        body: payload,
      });

      toast.success('✅ Dirección actualizada correctamente');
      setIsUpdateModalOpen(false);

      await fetchDirecciones();
    } catch (err: any) {
      console.error('❌ Error al actualizar dirección:', err);
      toast.error(err.message || 'Error al actualizar');
    } finally {
      setUpdating(false);
    }
  };

  const getLabelDepartamento = () => {
    const depData = activeAddress?.departamento_estado;
    const id = depData?.Id || depData?.departamentoId || activeAddress?.depId;

    const dep = departamentos.find(d => String(d.departamentoId) === String(id));
    const label = dep?.nombre_Departamento || depData?.nombre_Departamento || DEPARTAMENTO_NOMBRES[String(id)] || id;

    return label;
  };

  const getLabelCiudad = () => {
    const ciudadData = activeAddress?.ciudad;
    const ciudadId = ciudadData?.ciudadId || activeAddress?.ciudadId;
    const depId = activeAddress?.departamento_estado?.Id || activeAddress?.departamento_estado?.departamentoId || activeAddress?.depId;

    const depObj = departamentos.find(d => String(d.departamentoId) === String(depId));
    const ciudadObj = depObj?.ciudades?.find((c: any) => String(c.ciudadId) === String(ciudadId));
    const label = ciudadObj?.nombre_ciudad || ciudadData?.nombre_ciudad || ciudadId;

    return label;
  };

  const getLabelPrefijo = () => {
    const prefijoData = activeAddress?.prefijo;
    const id = prefijoData?.iud || prefijoData?._id || activeAddress?.prefijoId;

    const pre = prefijos.find(p => p.iud === id || p._id === id);
    const label = pre?.prefijoTelefonicoPais || prefijoData?.prefijoTelefonicoPais || id;

    return label;
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Dirección Corporativa</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin h-8 w-8" />
          </div>
        ) : activeAddress ? (
          /* VISTA DE INFORMACIÓN GUARDADA */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">País</label>
                <div className="p-2 bg-white border rounded">Colombia</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Departamento</label>
                <div className="p-2 bg-white border rounded">{getLabelDepartamento()}</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Ciudad</label>
                <div className="p-2 bg-white border rounded">{getLabelCiudad()}</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Teléfono</label>
                <div className="p-2 bg-white border rounded">{getLabelPrefijo()} {activeAddress.telefono_empresa}</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Correo</label>
                <div className="p-2 bg-white border rounded">{activeAddress.correo_empresa}</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Horario</label>
                <div className="p-2 bg-white border rounded">{activeAddress.horario_atencion}</div>
              </div>
            </div>
            <Button onClick={() => setIsUpdateModalOpen(true)} className="w-full">
              Actualizar Dirección
            </Button>
          </div>
        ) : (
          /* FORMULARIO DE REGISTRO */
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select value={form.paisId} onValueChange={val => setForm({ ...form, paisId: val, depId: '', ciudadId: '' })}>
              <SelectTrigger><SelectValue placeholder="País *" /></SelectTrigger>
              <SelectContent>
                {paises.map((p: any) => <SelectItem key={p.Id} value={p.Id}>{p.nombre_pais}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-4">
              <Select value={form.depId} onValueChange={val => setForm({ ...form, depId: val, ciudadId: '' })} disabled={!form.paisId}>
                <SelectTrigger><SelectValue placeholder="Departamento *" /></SelectTrigger>
                <SelectContent>
                  {departamentos.map((d: any) => (
                    <SelectItem key={d.departamentoId} value={d.departamentoId}>
                      {DEPARTAMENTO_NOMBRES[d.departamentoId] || d.nombre_Departamento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.ciudadId} onValueChange={val => setForm({ ...form, ciudadId: val })} disabled={!form.depId}>
                <SelectTrigger><SelectValue placeholder="Ciudad *" /></SelectTrigger>
                <SelectContent>
                  {ciudades.map((c: any) => <SelectItem key={c.ciudadId} value={c.ciudadId}>{c.nombre_ciudad}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Select value={form.prefijoId} onValueChange={val => setForm({ ...form, prefijoId: val })}>
                <SelectTrigger className="w-1/3"><SelectValue placeholder="Prefijo *" /></SelectTrigger>
                <SelectContent>
                  {prefijos.map((p: any) => <SelectItem key={p.iud} value={p.iud}>{p.prefijoTelefonicoPais}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Teléfono *" value={form.telefono_empresa} onChange={e => setForm({ ...form, telefono_empresa: e.target.value })} className="w-2/3" />
            </div>
            <Input type="email" placeholder="Correo *" value={form.correo_empresa} onChange={e => setForm({ ...form, correo_empresa: e.target.value })} />
            <Input placeholder="Horario de atención" value={form.horario_atencion} onChange={e => setForm({ ...form, horario_atencion: e.target.value })} />

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Guardando...</> : 'Guardar Dirección'}
            </Button>
          </form>
        )}

        {/* MODAL DE ACTUALIZACIÓN */}
        <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Editar Dirección Corporativa</DialogTitle></DialogHeader>
            <form onSubmit={handleUpdateSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={updateForm.depId}
                  onValueChange={val => {
                    setUpdateForm({ ...updateForm, depId: val, ciudadId: '' });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Departamento *" /></SelectTrigger>
                  <SelectContent>
                    {departamentos.map((d: any) => (
                      <SelectItem key={d.departamentoId} value={d.departamentoId}>
                        {DEPARTAMENTO_NOMBRES[d.departamentoId] || d.nombre_Departamento}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={updateForm.ciudadId}
                  onValueChange={val => {
                    setUpdateForm({ ...updateForm, ciudadId: val });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Ciudad *" /></SelectTrigger>
                  <SelectContent>
                    {ciudadesUpdate.map((c: any) => <SelectItem key={c.ciudadId} value={c.ciudadId}>{c.nombre_ciudad}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Select
                  value={updateForm.prefijoId}
                  onValueChange={val => {
                    setUpdateForm({ ...updateForm, prefijoId: val });
                  }}
                >
                  <SelectTrigger className="w-1/3"><SelectValue placeholder="Prefijo *" /></SelectTrigger>
                  <SelectContent>
                    {prefijos.map((p: any) => <SelectItem key={p.iud} value={p.iud}>{p.prefijoTelefonicoPais}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input value={updateForm.telefono_empresa} onChange={e => setUpdateForm({ ...updateForm, telefono_empresa: e.target.value })} className="w-2/3" placeholder="Teléfono" />
              </div>
              <Input type="email" value={updateForm.correo_empresa} onChange={e => setUpdateForm({ ...updateForm, correo_empresa: e.target.value })} placeholder="Correo" />
              <Input value={updateForm.horario_atencion} onChange={e => setUpdateForm({ ...updateForm, horario_atencion: e.target.value })} placeholder="Horario de atención" />
              <Button type="submit" className="w-full" disabled={updating}>
                {updating ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Actualizando...</> : 'Confirmar Cambios'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}