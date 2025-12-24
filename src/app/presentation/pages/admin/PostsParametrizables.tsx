

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';


export default function PostsParametrizables() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<{
    tittle: string;
    subtittle: string;
    body: string;
    price: string;
    buttonText: string;
    buttonLink: string;
    file: File | null;
    filePreview: string | null;
  }>({
    tittle: '',
    subtittle: '',
    body: '',
    price: '',
    buttonText: '',
    buttonLink: '',
    file: null,
    filePreview: null
  });
  const [submitting, setSubmitting] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  // fetchData must be accessible for reload
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/parametrizable/listar/todas/post', { method: 'GET' });
      setData(res?.publicaciones || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
      if (!validTypes.includes(file.type)) {
        alert('Solo se permiten imágenes (JPEG, PNG, GIF, WEBP) o videos (MP4, WEBM)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        setForm(prev => ({ ...prev, file, filePreview: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    } else {
      setForm(prev => ({ ...prev, file: null, filePreview: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (!form.tittle.trim() || !form.body.trim() || !form.file) {
        setError('Todos los campos obligatorios deben estar completos');
        setSubmitting(false);
        return;
      }
      const formDataToSend = new FormData();
      formDataToSend.append('tittle', form.tittle);
      formDataToSend.append('subtittle', form.subtittle);
      formDataToSend.append('body', form.body);
      if (form.price) formDataToSend.append('price', form.price);
      if (form.buttonText) formDataToSend.append('buttonText', form.buttonText);
      if (form.buttonLink) formDataToSend.append('buttonLink', form.buttonLink);
      if (form.file) formDataToSend.append('file', form.file);
      await apiFetch('/api/parametrizable/guardar/contenido/post', {
        method: 'POST',
        body: formDataToSend,
      });
      setForm({ tittle: '', subtittle: '', body: '', price: '', buttonText: '', buttonLink: '', file: null, filePreview: null });
      setOpenModal(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

    return (
      <div className="mx-auto mt-8 max-w-4xl">
        {/* Título principal y subtítulo */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Posts Parametrizables</h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Gestiona los posts multimedia que aparecen en la plataforma
          </p>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
            <h2 className="text-xl font-bold">Posts Registrados</h2>
            <Button size="sm" onClick={() => setOpenModal(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Nuevo Post
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin" /> Cargando...</div>
            ) : error ? (
              <div className="text-destructive">{error}</div>
            ) : (
              <ul className="mb-4">
                {data.map((post, idx) => (
                  <li key={idx} className="border-b py-2 text-sm">
                    <div className="font-bold">{post.tittle}</div>
                    <div className="text-xs text-muted-foreground">{post.subtittle}</div>
                    <div className="text-xs">{post.body}</div>
                    <div className="text-xs">Precio: {post.price ? `$${post.price}` : '-'}</div>
                    <div className="text-xs">Botón: {post.buttonText || '-'} | Link: {post.buttonLink || '-'}</div>
                    <div className="text-xs">Estado: {post.estado ? 'Activo' : 'Inactivo'}</div>
                    <div className="text-xs">Creado: {post.creadoEl ? new Date(post.creadoEl).toLocaleString() : '-'}</div>
                    <div className="text-xs">Creador: {post.creador?.correo || '-'} ({post.creador?.rol || '-'})</div>
                    <div className="text-xs">Tipo: {post.tipo || '-'} | Mime: {post.mimetype || '-'}</div>
                  </li>
                ))}
              </ul>
            )}
            <Dialog open={openModal} onOpenChange={setOpenModal}>
              <DialogContent className="max-w-lg w-full">
                <DialogHeader className="mb-2">
                  <DialogTitle asChild>
                    <h2 className="text-2xl font-bold text-primary text-center">Nuevo Post Parametrizable</h2>
                  </DialogTitle>
                  <p className="text-center text-muted-foreground text-base mt-1 mb-2">
                    Crea un post multimedia para mostrar en la plataforma
                  </p>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-2">
                  <Input name="tittle" value={form.tittle} onChange={handleChange} placeholder="Título" required />
                  <Input name="subtittle" value={form.subtittle} onChange={handleChange} placeholder="Subtítulo" />
                  <Textarea name="body" value={form.body} onChange={handleChange} placeholder="Cuerpo" required />
                  <Input name="price" value={form.price} onChange={handleChange} placeholder="Precio" type="number" />
                  <Input name="buttonText" value={form.buttonText} onChange={handleChange} placeholder="Texto botón" />
                  <Input name="buttonLink" value={form.buttonLink} onChange={handleChange} placeholder="Link botón" />
                  <div>
                    <label className="block font-semibold mb-1">Imagen o video *</label>
                    <input type="file" accept="image/*,video/*" onChange={handleFileChange} />
                    {form.filePreview && (
                      <div className="mt-2">
                        {form.file && typeof form.file.type === 'string' && form.file.type.startsWith('video/') ? (
                          <video src={form.filePreview} className="w-32 h-32 object-cover" controls />
                        ) : (
                          <img src={form.filePreview} alt="Preview" className="w-32 h-32 object-cover" />
                        )}
                      </div>
                    )}
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="button" variant="outline" onClick={() => setOpenModal(false)} disabled={submitting}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        'Agregar Post'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
  );
}
