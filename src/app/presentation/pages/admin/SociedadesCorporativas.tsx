import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export default function SociedadesCorporativas() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ nombre_sociedad: '', tipo_sociedad: ''});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiFetch(
          'https://server-mabs-xo9s.onrender.com/api/config/parametrizacion/sociedades/coporativa',
          { method: 'GET' }
        );
        setData(res?.sociedades || []);
      } catch (err: any) {
        setError(err.message || 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await apiFetch(
        '/api/configuracion/parametrizacion/tiposociedad',
        {
          method: 'POST',
          body: form,
        }
      );
      setForm({ nombre_sociedad: '', tipo_sociedad: '' });
      // Optionally reload data
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Sociedades Corporativas</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center"><Loader2 className="animate-spin" /> Cargando...</div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : (
          <ul className="mb-4">
            {data.map((soc, idx) => (
              <li key={idx} className="border-b py-2 text-sm">{soc.nombre} - {soc.descripcion}</li>
            ))}
          </ul>
        )}
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input name="nombre_sociedad" value={form.nombre_sociedad} onChange={handleChange} placeholder="Nombre de la sociedad" required />
          <Input name="tipo_sociedad" value={form.tipo_sociedad} onChange={handleChange} placeholder="Sigla (ej: SAS, LTDA)" required />
           <Button type="submit" disabled={submitting}>{submitting ? 'Guardando...' : 'Agregar Sociedad'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
