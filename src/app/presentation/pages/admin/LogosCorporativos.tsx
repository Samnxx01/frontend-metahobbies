import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LogosCorporativos() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiFetch(
          'https://server-mabs-xo9s.onrender.com/api/config/parametrizacion/listar/logos/coporativa',
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      await apiFetch('/api/config/parametrizacion/guardar/logos/coporativa', {
        method: 'POST',
        body: formData,
        headers: { }, // No poner Content-Type, el navegador lo gestiona
      });
      setFile(null);
      // Opcional: recargar lista de logos
    } catch (err: any) {
      // Manejo de error opcional
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Logos Corporativos</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2">
          <input type="file" accept=".png,.jpg,.jpeg" onChange={handleFileChange} />
          <Button type="submit" disabled={submitting || !file}>{submitting ? 'Subiendo...' : 'Subir Logo'}</Button>
        </form>
        {loading ? (
          <div className="flex items-center justify-center"><Loader2 className="animate-spin" /> Cargando...</div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : (
          <div className="mb-4">
            {Array.isArray(data?.logos) && data.logos.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border rounded">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="px-2 py-1 text-left">Nombre</th>
                      <th className="px-2 py-1 text-left">Tipo</th>
                      <th className="px-2 py-1 text-left">Usuario</th>
                      <th className="px-2 py-1 text-left">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logos.map((logo: any) => (
                      <tr key={logo._id} className="border-b">
                        <td className="px-2 py-1">{logo.nombre}</td>
                        <td className="px-2 py-1">{logo.mimetype}</td>
                        <td className="px-2 py-1">{logo.usuario}</td>
                        <td className="px-2 py-1">{logo.createdAt ? new Date(logo.createdAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">No hay logos registrados.</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
