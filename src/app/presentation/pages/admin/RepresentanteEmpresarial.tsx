import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-toastify';

const emptyRepresentativeForm = {
  nombre_representante_legal: '',
  cargo_representante_legal: '',
  tipoDocument: '',
  documentoidentidad: '',
  correo_representante: '',
  telefono_representante: '',
  nacionalidads: '',
  prefijo: '',
};

export default function RepresentanteEmpresarial() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ ...emptyRepresentativeForm });
  const [submitting, setSubmitting] = useState(false);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateForm, setUpdateForm] = useState({ ...emptyRepresentativeForm });

  const [tiposDocumento, setTiposDocumento] = useState<any[]>([]);
  const [nacionalidades, setNacionalidades] = useState<any[]>([]);
  const [prefijos, setPrefijos] = useState<any[]>([]);
  const [loadingParams, setLoadingParams] = useState(true);

  const refreshRepresentantes = async () => {
    const res = await apiFetch('/api/config/listar/represente/empresarial', {
      method: 'GET',
      useAuth: true,
    });

    setData(res);

    if (res?.representantes?.length > 0) {
      const rep = res.representantes[0];
      setUpdateForm({
        nombre_representante_legal: rep.nombre_representante_legal || '',
        cargo_representante_legal: rep.cargo_representante_legal || '',
        tipoDocument: rep.tipoDocument?.iud || rep.tipoDocument || '',
        documentoidentidad: rep.documentoidentidad || '',
        correo_representante: rep.correo_representante || '',
        telefono_representante: rep.telefono_representante || '',
        nacionalidads: rep.nacionalidads?.iud || rep.nacionalidads || '',
        prefijo: rep.prefijo?.iud || rep.prefijo || '',
      });
      return;
    }

    setUpdateForm({ ...emptyRepresentativeForm });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        await refreshRepresentantes();
      } catch (err: any) {
        setError(err.message || 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  useEffect(() => {
    const fetchParams = async () => {
      setLoadingParams(true);
      try {
        const [tiposDoc, nacionalidadesRes, prefijosRes] = await Promise.all([
          apiFetch('/api/perfil/seguridad/tipo/documentos', { method: 'GET', useAuth: true }),
          apiFetch('/api/perfil/seguridad/listar/tipo/nacionalidad', { method: 'GET', useAuth: true }),
          apiFetch('/api/perfil/seguridad/listar/tipo/prefijo', { method: 'GET', useAuth: true }),
        ]);
        setTiposDocumento(tiposDoc?.tipos || []);
        setNacionalidades(nacionalidadesRes?.nacionalidades || []);
        setPrefijos(prefijosRes?.prefijos || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingParams(false);
      }
    };

    void fetchParams();
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
        body: form,
        useAuth: true,
      });
      toast.success('Representante registrado exitosamente');
      setForm({ ...emptyRepresentativeForm });
      await refreshRepresentantes();
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
      toast.error('No se encontro ID del representante');
      return;
    }

    setUpdating(true);
    try {
      const id = data.representantes[0]._id;
      await apiFetch(`/api/config/parametrizacion/actualizar/represe/coporativa/${id}`, {
        method: 'PUT',
        body: updateForm,
        useAuth: true,
      });
      toast.success('Los datos del representante han sido actualizados exitosamente');
      setIsUpdateModalOpen(false);
      await refreshRepresentantes();
    } catch (err: any) {
      toast.error('Error al actualizar los datos');
    } finally {
      setUpdating(false);
    }
  };

  const getDocLabel = () => tiposDocumento.find((t) => t.iud === updateForm.tipoDocument)?.nombreDocumento || '';
  const getNacLabel = () => nacionalidades.find((n) => n.iud === updateForm.nacionalidads)?.naciondalidadss || '';
  const getPrefLabel = () => prefijos.find((p) => p.iud === updateForm.prefijo)?.prefijoTelefonicoPais || '';

  return (
    <Card className="mx-auto mt-8 max-w-2xl">
      <CardHeader>
        <CardTitle>Representante Empresarial</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" />
            Cargando...
          </div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : (
          <>
            {data?.representantes?.length > 0 ? (
              <div className="mb-8 space-y-3 rounded-lg border bg-slate-50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Datos Actuales del Representante</h3>
                <div className="grid grid-cols-1 gap-2">
                  <Input value={updateForm.nombre_representante_legal} disabled className="bg-white text-gray-600" placeholder="Nombre" />
                  <Input value={updateForm.cargo_representante_legal} disabled className="bg-white text-gray-600" placeholder="Cargo" />
                  <Input value={getDocLabel()} disabled className="bg-white text-gray-600" placeholder="Tipo Documento" />
                  <Input value={updateForm.documentoidentidad} disabled className="bg-white text-gray-600" placeholder="Numero de documento" />
                  <Input value={updateForm.correo_representante} disabled className="bg-white text-gray-600" placeholder="Correo" />
                  <Input value={updateForm.telefono_representante} disabled className="bg-white text-gray-600" placeholder="Telefono" />
                  <Input value={getNacLabel()} disabled className="bg-white text-gray-600" placeholder="Nacionalidad" />
                  <Input value={getPrefLabel()} disabled className="bg-white text-gray-600" placeholder="Prefijo" />
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
                  <Button type="button" onClick={() => setIsUpdateModalOpen(true)} className="w-44">
                    Actualizar Representante
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mb-4 text-center text-muted-foreground">No hay un representante registrado actualmente.</p>
            )}

            {data?.representantes?.length > 0 && <div className="my-6 border-t" />}

            <form onSubmit={handleSubmit} className="mt-4 space-y-2">
              <h3 className="mb-2 text-sm font-semibold">Registrar Nuevo Representante</h3>
              <Input name="nombre_representante_legal" value={form.nombre_representante_legal} onChange={handleChange} placeholder="Nombre completo" required />
              <Input name="cargo_representante_legal" value={form.cargo_representante_legal} onChange={handleChange} placeholder="Cargo" required />
              <Select value={form.tipoDocument} onValueChange={(val) => setForm({ ...form, tipoDocument: val })} disabled={loadingParams}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de documento" />
                </SelectTrigger>
                <SelectContent>
                  {tiposDocumento.map((opt: any) => (
                    <SelectItem key={opt.iud} value={opt.iud}>
                      {opt.nombreDocumento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input name="documentoidentidad" value={form.documentoidentidad} onChange={handleChange} placeholder="Numero de documento" required />
              <Input name="correo_representante" value={form.correo_representante} onChange={handleChange} placeholder="Correo" required type="email" />
              <Input name="telefono_representante" value={form.telefono_representante} onChange={handleChange} placeholder="Telefono" required />
              <Select value={form.nacionalidads} onValueChange={(val) => setForm({ ...form, nacionalidads: val })} disabled={loadingParams}>
                <SelectTrigger>
                  <SelectValue placeholder="Nacionalidad" />
                </SelectTrigger>
                <SelectContent>
                  {nacionalidades.map((opt: any) => (
                    <SelectItem key={opt.iud} value={opt.iud}>
                      {opt.naciondalidadss}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.prefijo} onValueChange={(val) => setForm({ ...form, prefijo: val })} disabled={loadingParams}>
                <SelectTrigger>
                  <SelectValue placeholder="Prefijo" />
                </SelectTrigger>
                <SelectContent>
                  {prefijos.map((opt: any) => (
                    <SelectItem key={opt.iud} value={opt.iud}>
                      {opt.prefijoTelefonicoPais}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" className="w-44" disabled={submitting || loadingParams}>
                {submitting ? 'Guardando...' : 'Registrar Representante'}
              </Button>
            </form>
          </>
        )}

        <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Actualizar Representante</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateSubmit} className="mt-2 space-y-3">
              <Input name="nombre_representante_legal" value={updateForm.nombre_representante_legal} onChange={handleUpdateChange} placeholder="Nombre completo" required />
              <Input name="cargo_representante_legal" value={updateForm.cargo_representante_legal} onChange={handleUpdateChange} placeholder="Cargo" required />

              <Select value={updateForm.tipoDocument || undefined} onValueChange={(val) => setUpdateForm({ ...updateForm, tipoDocument: val })} disabled={loadingParams}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de documento" />
                </SelectTrigger>
                <SelectContent>
                  {tiposDocumento.map((opt: any) => (
                    <SelectItem key={opt.iud} value={opt.iud}>
                      {opt.nombreDocumento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input name="documentoidentidad" value={updateForm.documentoidentidad} onChange={handleUpdateChange} placeholder="Numero de documento" required />
              <Input name="correo_representante" value={updateForm.correo_representante} onChange={handleUpdateChange} placeholder="Correo" required type="email" />
              <Input name="telefono_representante" value={updateForm.telefono_representante} onChange={handleUpdateChange} placeholder="Telefono" required />

              <Select value={updateForm.nacionalidads || undefined} onValueChange={(val) => setUpdateForm({ ...updateForm, nacionalidads: val })} disabled={loadingParams}>
                <SelectTrigger>
                  <SelectValue placeholder="Nacionalidad" />
                </SelectTrigger>
                <SelectContent>
                  {nacionalidades.map((opt: any) => (
                    <SelectItem key={opt.iud} value={opt.iud}>
                      {opt.naciondalidadss}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={updateForm.prefijo || undefined} onValueChange={(val) => setUpdateForm({ ...updateForm, prefijo: val })} disabled={loadingParams}>
                <SelectTrigger>
                  <SelectValue placeholder="Prefijo" />
                </SelectTrigger>
                <SelectContent>
                  {prefijos.map((opt: any) => (
                    <SelectItem key={opt.iud} value={opt.iud}>
                      {opt.prefijoTelefonicoPais}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button type="submit" className="mt-2 w-full" disabled={updating}>
                {updating ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
