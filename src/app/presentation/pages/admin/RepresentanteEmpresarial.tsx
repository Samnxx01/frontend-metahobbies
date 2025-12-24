import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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

  // Parametrización dinámica
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
        // No bloquear el form si falla
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
    } catch (err: any) {
      toast.error('Error al registrar representante');
    } finally {
      setSubmitting(false);
    }
  };

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
          <pre className="bg-muted/40 p-4 rounded text-xs overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>
        )}
        <form onSubmit={handleSubmit} className="space-y-2 mt-4">
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
          <Button type="submit" disabled={submitting || loadingParams}>{submitting ? 'Guardando...' : 'Registrar Representante'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
