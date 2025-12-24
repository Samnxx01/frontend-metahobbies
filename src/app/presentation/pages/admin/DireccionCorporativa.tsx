import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

const DEPARTAMENTO_NOMBRES: Record<string, string> = {
  '1': 'Amazonas',
  '2': 'Antioquia',
  '3': 'Arauca',
  '4': 'Atlántico',
  '5': 'Bogotá D.C.',
  '6': 'Bolívar',
  '7': 'Boyacá',
  '8': 'Caldas',
  '9': 'Caquetá',
  '10': 'Casanare',
  '11': 'Cauca',
  '12': 'Cesar',
  '13': 'Chocó',
  '14': 'Córdoba',
  '15': 'Cundinamarca',
  '16': 'Guainía',
  '17': 'Guaviare',
  '18': 'Huila',
  '19': 'La Guajira',
  '20': 'Magdalena',
  '21': 'Meta',
  '22': 'Nariño',
  '23': 'Norte de Santander',
  '24': 'Putumayo',
  '25': 'Quindío',
  '26': 'Risaralda',
  '27': 'San Andrés y Providencia',
  '28': 'Santander',
  '29': 'Sucre',
  '30': 'Tolima',
  '31': 'Valle del Cauca',
  '32': 'Vaupés',
  '33': 'Vichada'
};

export default function DireccionCorporativa() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    paisId: '',
    depId: '',
    ciudadId: '',
    prefijoId: '',
    telefono_empresa: '',
    correo_empresa: '',
    horario_atencion: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Parametrización dinámica
  const [paises, setPaises] = useState<any[]>([]);
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [ciudades, setCiudades] = useState<any[]>([]);
  const [prefijos, setPrefijos] = useState<any[]>([]);
  const [loadingParams, setLoadingParams] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiFetch(
          'https://server-mabs-xo9s.onrender.com/api/config/parametrizacion/direccion/coporativa',
          { method: 'GET' }
        );
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
        const [location, prefijosRes] = await Promise.all([
          apiFetch('/api/perfil/seguridad/listar/paises/departamentos/ciudades?paisId=1', { method: 'GET' }),
          apiFetch('/api/perfil/seguridad/listar/tipo/prefijo', { method: 'GET' })
        ]);
        setPaises(location?.pais ? [location.pais] : []);
        setDepartamentos(location?.departamentos || []);
        setPrefijos(prefijosRes?.prefijos || []);
      } catch (err) {
        // No bloquear el form si falla
      } finally {
        setLoadingParams(false);
      }
    };
    fetchParams();
  }, []);

  // Manejo dependiente de departamentos y ciudades
  useEffect(() => {
    if (form.paisId && paises.length > 0) {
      // Solo mostrar departamentos del país seleccionado
      setDepartamentos(
        (paises[0]?.Id === form.paisId ? departamentos : [])
      );
    }
  }, [form.paisId, paises, departamentos]);

  useEffect(() => {
    if (form.depId && departamentos.length > 0) {
      const dep = departamentos.find((d: any) => d.departamentoId === form.depId);
      setCiudades(dep ? dep.ciudades : []);
    } else {
      setCiudades([]);
    }
  }, [form.depId, departamentos]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      // Body con los nombres exactos requeridos
      const body = {
        paisId: form.paisId,
        depId: form.depId,
        ciudadId: form.ciudadId,
        prefijoId: form.prefijoId,
        telefono_empresa: form.telefono_empresa,
        correo_empresa: form.correo_empresa,
        horario_atencion: form.horario_atencion
      };
      await apiFetch(
        'https://server-mabs-xo9s.onrender.com/api/configuracion/parametrizacion/direccion-publica',
        {
          method: 'POST',
          body,
        }
      );
      setForm({
        paisId: '',
        depId: '',
        ciudadId: '',
        prefijoId: '',
        telefono_empresa: '',
        correo_empresa: '',
        horario_atencion: '',
      });
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Dirección Corporativa</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center"><Loader2 className="animate-spin" /> Cargando...</div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : (
          <div className="mb-4">
            {Array.isArray(data?.direcciones) && data.direcciones.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border rounded">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="px-2 py-1 text-left">Ciudad</th>
                      <th className="px-2 py-1 text-left">Departamento</th>
                      <th className="px-2 py-1 text-left">Prefijo</th>
                      <th className="px-2 py-1 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.direcciones.map((dir: any) => (
                      <tr key={dir._id} className="border-b">
                        <td className="px-2 py-1">{dir.ciudad?.nombre_ciudad || '-'}</td>
                        <td className="px-2 py-1">{dir.departamento_estado?.nombre_Departamento || '-'}</td>
                        <td className="px-2 py-1">{dir.prefijo?.prefijoTelefonicoPais || '-'}</td>
                        <td className="px-2 py-1">{dir.estado ? 'Activo' : 'Inactivo'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">No hay direcciones registradas.</div>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-2 mt-4">
          <Select name="paisId" value={form.paisId} onValueChange={val => setForm({ ...form, paisId: val, depId: '', ciudadId: '' })} required disabled={loadingParams}>
            <SelectTrigger><SelectValue placeholder="País" /></SelectTrigger>
            <SelectContent>
              {paises.map((p: any) => <SelectItem key={p.Id} value={p.Id}>{p.nombre_pais}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select name="depId" value={form.depId} onValueChange={val => setForm({ ...form, depId: val, ciudadId: '' })} required disabled={loadingParams || !form.paisId}>
            <SelectTrigger><SelectValue placeholder="Departamento" /></SelectTrigger>
            <SelectContent>
              {departamentos.map((d: any) => (
                <SelectItem key={d.departamentoId} value={d.departamentoId}>
                  {DEPARTAMENTO_NOMBRES[d.departamentoId] || d.nombre_Departamento || d.departamentoId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select name="ciudadId" value={form.ciudadId} onValueChange={val => setForm({ ...form, ciudadId: val })} required disabled={loadingParams || !form.depId}>
            <SelectTrigger><SelectValue placeholder="Ciudad" /></SelectTrigger>
            <SelectContent>
              {ciudades.map((c: any) => <SelectItem key={c.ciudadId} value={c.ciudadId}>{c.nombre_ciudad}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select name="prefijoId" value={form.prefijoId} onValueChange={val => setForm({ ...form, prefijoId: val })} required disabled={loadingParams}>
            <SelectTrigger><SelectValue placeholder="Prefijo" /></SelectTrigger>
            <SelectContent>
              {prefijos.map((p: any) => <SelectItem key={p.iud} value={p.iud}>{p.prefijoTelefonicoPais}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input name="telefono_empresa" value={form.telefono_empresa} onChange={handleChange} placeholder="Teléfono empresa" />
          <Input name="correo_empresa" value={form.correo_empresa} onChange={handleChange} placeholder="Correo empresa" />
          <Input name="horario_atencion" value={form.horario_atencion} onChange={handleChange} placeholder="Horario atención" />
          <Button type="submit" disabled={submitting || loadingParams}>{submitting ? 'Guardando...' : 'Guardar Dirección'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
