import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { toast } from 'react-toastify';

export default function RepresentanteEmpresarial() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombre_representante_legal: '',
    cargo_representante_legal: '',
    tipoDocument: '',
    documentoidentidad: '',
    correo_representante: '',
    telefono_representante: '',
    nacionalidads: '',
    prefijo: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    nombre_representante_legal: '',
    cargo_representante_legal: '',
    tipoDocument: '',
    documentoidentidad: '',
    correo_representante: '',
    telefono_representante: '',
    nacionalidads: '',
    prefijo: ''
  });

  const [tiposDocumento, setTiposDocumento] = useState<any[]>([]);
  const [nacionalidades, setNacionalidades] = useState<any[]>([]);
  const [prefijos, setPrefijos] = useState<any[]>([]);
  const [loadingParams, setLoadingParams] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiFetch('/api/config/listar/represente/empresarial', { method: 'GET' });
        setData(res);

        if (res?.representantes && res.representantes.length > 0) {
          const rep = res.representantes[0];
          setUpdateForm({
            nombre_representante_legal: rep.nombre_representante_legal || '',
            cargo_representante_legal: rep.cargo_representante_legal || '',
            tipoDocument: rep.tipoDocument?.iud || rep.tipoDocument || '',
            documentoidentidad: rep.documentoidentidad || '',
            correo_representante: rep.correo_representante || '',
            telefono_representante: rep.telefono_representante || '',
            nacionalidads: rep.nacionalidads?.iud || rep.nacionalidads || '',
            prefijo: rep.prefijo?.iud || rep.prefijo || ''
          });
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchParams = async () => {
      setLoadingParams(true);
      try {
        const [tiposDoc, nacionalidades, prefijos] = await Promise.all([
          apiFetch('/api/perfil/seguridad/tipo/documentos', { method: 'GET' }),
          apiFetch('/api/perfil/seguridad/listar/tipo/nacionalidad', { method: 'GET' }),
          apiFetch('/api/perfil/seguridad/listar/tipo/prefijo', { method: 'GET' })
        ]);
        setTiposDocumento(tiposDoc?.tipos || []);
        setNacionalidades(nacionalidades?.nacionalidades || []);
        setPrefijos(prefijos?.prefijos || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingParams(false);
      }
    };
    fetchParams();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/api/configuracion/parametrizacion/representante', {
        method: 'POST',
        body: form
      });
      toast.success('Representante registrado exitosamente');
      setForm({
        nombre_representante_legal: '',
        cargo_representante_legal: '',
        tipoDocument: '',
        documentoidentidad: '',
        correo_representante: '',
        telefono_representante: '',
        nacionalidads: '',
        prefijo: ''
      });

      const res = await apiFetch('/api/config/listar/represente/empresarial', { method: 'GET' });
      setData(res);
    } catch (err: any) {
      toast.error('Error al registrar representante');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUpdateForm({ ...updateForm, [e.target.name]: e.target.value });
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.representantes?.[0]?._id) {
      toast.error("No se encontró ID del representante");
      return;
    }

    setUpdating(true);
    try {
      const id = data.representantes[0]._id;
      await apiFetch(`/api/config/parametrizacion/actualizar/represe/coporativa/${id}`, {
        method: 'PUT',
        body: updateForm
      });
      toast.success('Los datos del Representante han sido actualizados exitosamente!');
      setIsUpdateModalOpen(false);

      const res = await apiFetch('/api/config/listar/represente/empresarial', { method: 'GET' });
      setData(res);

      if (res?.representantes?.[0]) {
        const rep = res.representantes[0];
        setUpdateForm({
          nombre_representante_legal: rep.nombre_representante_legal || '',
          cargo_representante_legal: rep.cargo_representante_legal || '',
          tipoDocument: rep.tipoDocument?.iud || rep.tipoDocument || '',
          documentoidentidad: rep.documentoidentidad || '',
          correo_representante: rep.correo_representante || '',
          telefono_representante: rep.telefono_representante || '',
          nacionalidads: rep.nacionalidads?.iud || rep.nacionalidads || '',
          prefijo: rep.prefijo?.iud || rep.prefijo || ''
        });
      }

    } catch (err: any) {
      toast.error('Error al actualizar los datos');
    } finally {
      setUpdating(false);
    }
  };

  const getDocLabel = () => tiposDocumento.find(t => t.iud === updateForm.tipoDocument)?.nombreDocumento || '';
  const getNacLabel = () => nacionalidades.find(n => n.iud === updateForm.nacionalidads)?.naciondalidadss || '';
  const getPrefLabel = () => prefijos.find(p => p.iud === updateForm.prefijo)?.prefijoTelefonicoPais || '';

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Representante Empresarial</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center"><Loader2 className="animate-spin" /> Cargando...</div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : (
          <>
            {data?.representantes && data.representantes.length > 0 ? (
              <div className="space-y-3 mb-8 border p-4 rounded-lg bg-slate-50">
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Datos Actuales del Representante</h3>
                <div className="grid grid-cols-1 gap-2">
                  <Input value={updateForm.nombre_representante_legal} disabled className="bg-white text-gray-600" placeholder="Nombre" />
                  <Input value={updateForm.cargo_representante_legal} disabled className="bg-white text-gray-600" placeholder="Cargo" />
                  <Input value={getDocLabel()} disabled className="bg-white text-gray-600" placeholder="Tipo Documento" />
                  <Input value={updateForm.documentoidentidad} disabled className="bg-white text-gray-600" placeholder="Nro Documento" />
                  <Input value={updateForm.correo_representante} disabled className="bg-white text-gray-600" placeholder="Correo" />
                  <Input value={updateForm.telefono_representante} disabled className="bg-white text-gray-600" placeholder="Teléfono" />
                  <Input value={getNacLabel()} disabled className="bg-white text-gray-600" placeholder="Nacionalidad" />
                  <Input value={getPrefLabel()} disabled className="bg-white text-gray-600" placeholder="Prefijo" />
                </div>

                <Button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(true)}
                  className="w-44 mt-4" // Mismo ancho que el botón de registro
                >
                  Actualizar Representante
                </Button>
              </div>
            ) : (
              <p className="text-center text-muted-foreground mb-4">No hay un representante registrado actualmente.</p>
            )}

            {/* 2. FORMULARIO DE REGISTRO ORIGINAL (POST) */}
            {data?.representantes?.length > 0 && <div className="border-t my-6"></div>}

            <form onSubmit={handleSubmit} className="space-y-2 mt-4">
              <h3 className="font-semibold text-sm mb-2">Registrar Nuevo Representante</h3>
              <Input name="nombre_representante_legal" value={form.nombre_representante_legal} onChange={handleChange} placeholder="Nombre completo" required />
              <Input name="cargo_representante_legal" value={form.cargo_representante_legal} onChange={handleChange} placeholder="Cargo" required />
              <Select value={form.tipoDocument} onValueChange={val => setForm({ ...form, tipoDocument: val })} required disabled={loadingParams}>
                <SelectTrigger><SelectValue placeholder="Tipo de documento" /></SelectTrigger>
                <SelectContent>
                  {tiposDocumento.map((opt: any) => <SelectItem key={opt.iud} value={opt.iud}>{opt.nombreDocumento}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input name="documentoidentidad" value={form.documentoidentidad} onChange={handleChange} placeholder="Número de documento" required />
              <Input name="correo_representante" value={form.correo_representante} onChange={handleChange} placeholder="Correo" required type="email" />
              <Input name="telefono_representante" value={form.telefono_representante} onChange={handleChange} placeholder="Teléfono" required />
              <Select value={form.nacionalidads} onValueChange={val => setForm({ ...form, nacionalidads: val })} required disabled={loadingParams}>
                <SelectTrigger><SelectValue placeholder="Nacionalidad" /></SelectTrigger>
                <SelectContent>
                  {nacionalidades.map((opt: any) => <SelectItem key={opt.iud} value={opt.iud}>{opt.naciondalidadss}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.prefijo} onValueChange={val => setForm({ ...form, prefijo: val })} required disabled={loadingParams}>
                <SelectTrigger><SelectValue placeholder="Prefijo" /></SelectTrigger>
                <SelectContent>
                  {prefijos.map((opt: any) => <SelectItem key={opt.iud} value={opt.iud}>{opt.prefijoTelefonicoPais}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="submit" className="w-44" disabled={submitting || loadingParams}>{submitting ? 'Guardando...' : 'Registrar Representante'}</Button>
            </form>
          </>
        )}

        {/* 3. MODAL DE ACTUALIZACIÓN (PUT) */}
        <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Actualizar Representante</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateSubmit} className="space-y-3 mt-2">
              <Input name="nombre_representante_legal" value={updateForm.nombre_representante_legal} onChange={handleUpdateChange} placeholder="Nombre completo" required />
              <Input name="cargo_representante_legal" value={updateForm.cargo_representante_legal} onChange={handleUpdateChange} placeholder="Cargo" required />

              <Select value={updateForm.tipoDocument || undefined} onValueChange={val => setUpdateForm({ ...updateForm, tipoDocument: val })} required disabled={loadingParams}>
                <SelectTrigger><SelectValue placeholder="Tipo de documento" /></SelectTrigger>
                <SelectContent>
                  {tiposDocumento.map((opt: any) => <SelectItem key={opt.iud} value={opt.iud}>{opt.nombreDocumento}</SelectItem>)}
                </SelectContent>
              </Select>

              <Input name="documentoidentidad" value={updateForm.documentoidentidad} onChange={handleUpdateChange} placeholder="Número de documento" required />
              <Input name="correo_representante" value={updateForm.correo_representante} onChange={handleUpdateChange} placeholder="Correo" required type="email" />
              <Input name="telefono_representante" value={updateForm.telefono_representante} onChange={handleUpdateChange} placeholder="Teléfono" required />

              <Select value={updateForm.nacionalidads || undefined} onValueChange={val => setUpdateForm({ ...updateForm, nacionalidads: val })} required disabled={loadingParams}>
                <SelectTrigger><SelectValue placeholder="Nacionalidad" /></SelectTrigger>
                <SelectContent>
                  {nacionalidades.map((opt: any) => <SelectItem key={opt.iud} value={opt.iud}>{opt.naciondalidadss}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={updateForm.prefijo || undefined} onValueChange={val => setUpdateForm({ ...updateForm, prefijo: val })} required disabled={loadingParams}>
                <SelectTrigger><SelectValue placeholder="Prefijo" /></SelectTrigger>
                <SelectContent>
                  {prefijos.map((opt: any) => <SelectItem key={opt.iud} value={opt.iud}>{opt.prefijoTelefonicoPais}</SelectItem>)}
                </SelectContent>
              </Select>

              <Button type="submit" className="w-full mt-2" disabled={updating}>
                {updating ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

      </CardContent>
    </Card>
  );
}