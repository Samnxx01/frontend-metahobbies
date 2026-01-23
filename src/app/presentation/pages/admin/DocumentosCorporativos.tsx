import React, { useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';

export default function DocumentosCorporativos() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // Referencia al input para poder limpiarlo visualmente
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(
        '/api/config/parametrizacion/listar/documentos/coporativa',
        { method: 'GET' }
      );
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
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

      await apiFetch('/api/config/parametrizacion/guardar/cerficados/coporativa', {
        method: 'POST',
        body: formData,
      });

      toast.success('Documento subido exitosamente');

      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      fetchDocuments();

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al subir el documento');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Documentos Corporativos</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tabla de visualización (igual que antes) */}
        {loading ? (
          <div className="flex items-center justify-center"><Loader2 className="animate-spin" /> Cargando...</div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : (
          <div className="mb-6">
            {Array.isArray(data?.documentos) && data.documentos.length > 0 ? (
              <div className="overflow-x-auto border rounded-md">
                <table className="min-w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Nombre</th>
                      <th className="px-3 py-2 text-left font-medium">Tipo</th>
                      <th className="px-3 py-2 text-left font-medium">Usuario</th>
                      <th className="px-3 py-2 text-left font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.documentos.map((doc: any) => (
                      <tr key={doc._id} className="border-t hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2 truncate max-w-[150px]" title={doc.nombre}>{doc.nombre}</td>
                        <td className="px-3 py-2">{doc.mimetype?.split('/')[1] || doc.mimetype}</td>
                        <td className="px-3 py-2">{doc.usuario}</td>
                        <td className="px-3 py-2 text-muted-foreground">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-md border border-dashed">
                No hay documentos registrados.
              </div>
            )}
          </div>
        )}

        {/* Formulario de subida */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-semibold mb-3">Subir nuevo documento</h3>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="w-full">
              <input
                ref={fileInputRef} // Vinculamos el ref
                type="file"
                accept=".png,.jpg,.jpeg,.pdf" // Agregué PDF por si acaso, quítalo si es estricto
                onChange={handleFileChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <Button type="submit" disabled={submitting || !file} className="w-full sm:w-auto">
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo</>
              ) : (
                'Subir'
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}