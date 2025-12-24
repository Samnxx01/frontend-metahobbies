import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export default function PublicidadPanel() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ tittle: '', subtittle: '', body: '', price: '', buttonText: '', buttonLink: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiFetch(
          'https://server-mabs-xo9s.onrender.com/api/configuration/listar/todas/publicidad',
          { method: 'GET' }
        );
        setData(res?.publicidad || []);
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
        'https://server-mabs-xo9s.onrender.com/api/configuration/guardar/publicidad/modal',
        {
          method: 'POST',
          body: form,
        }
      );
      setForm({ tittle: '', subtittle: '', body: '', price: '', buttonText: '', buttonLink: '' });
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
        <CardTitle>Publicidad</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center"><Loader2 className="animate-spin" /> Cargando...</div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : (
          <ul className="mb-4">
            {data.map((pub, idx) => (
              <li key={idx} className="border-b py-2 text-sm">{pub.tittle} - {pub.subtittle}</li>
            ))}
          </ul>
        )}
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input name="tittle" value={form.tittle} onChange={handleChange} placeholder="Título" required />
          <Input name="subtittle" value={form.subtittle} onChange={handleChange} placeholder="Subtítulo" required />
          <Input name="body" value={form.body} onChange={handleChange} placeholder="Cuerpo" required />
          <Input name="price" value={form.price} onChange={handleChange} placeholder="Precio" />
          <Input name="buttonText" value={form.buttonText} onChange={handleChange} placeholder="Texto botón" />
          <Input name="buttonLink" value={form.buttonLink} onChange={handleChange} placeholder="Link botón" />
          <Button type="submit" disabled={submitting}>{submitting ? 'Guardando...' : 'Agregar Publicidad'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
