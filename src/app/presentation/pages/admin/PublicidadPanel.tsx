import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle2,
  Link as LinkIcon,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
} from 'lucide-react';

const LIST_URL = 'https://server-mabs-xo9s.onrender.com/api/configuration/listar/todas/publicidad';
const SAVE_URL = 'https://server-mabs-xo9s.onrender.com/api/configuration/guardar/publicidad/modal';

type Publicidad = {
  tittle?: string;
  subtittle?: string;
  body?: string;
  price?: string;
  buttonText?: string;
  buttonLink?: string;
};

type PublicidadForm = Required<Publicidad>;

const emptyForm: PublicidadForm = {
  tittle: '',
  subtittle: '',
  body: '',
  price: '',
  buttonText: '',
  buttonLink: '',
};

export default function PublicidadPanel() {
  const [data, setData] = useState<Publicidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<PublicidadForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await apiFetch(LIST_URL, { method: 'GET' });
      setData(res?.publicidad || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSuccess('');
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await apiFetch(SAVE_URL, {
        method: 'POST',
        body: form,
      });

      setForm(emptyForm);
      setSuccess('Publicidad guardada correctamente.');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Megaphone className="h-4 w-4" />
            Panel administrativo
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Publicidad</h1>
          <p className="text-sm text-muted-foreground">
            Crea y revisa los mensajes promocionales publicados.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading || submitting}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          Actualizar
        </Button>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader className="flex-row items-start justify-between space-y-0 border-b p-5">
            <div className="space-y-1">
              <CardTitle className="text-base">Publicidades actuales</CardTitle>
              <CardDescription>{data.length} registros encontrados</CardDescription>
            </div>
            <Badge variant="secondary" className="rounded-md">
              {data.length}
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando publicidades...
              </div>
            ) : data.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-6 text-center">
                <div className="rounded-full bg-muted p-3 text-muted-foreground">
                  <Megaphone className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-foreground">No hay publicidades registradas</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Agrega la primera desde el formulario lateral.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.map((pub, idx) => (
                  <article key={`${pub.tittle || 'publicidad'}-${idx}`} className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <h2 className="truncate text-sm font-semibold text-foreground">
                          {pub.tittle || 'Sin titulo'}
                        </h2>
                        {pub.subtittle ? (
                          <p className="text-sm text-muted-foreground">{pub.subtittle}</p>
                        ) : null}
                      </div>

                      {pub.price ? (
                        <Badge variant="outline" className="shrink-0 rounded-md">
                          {pub.price}
                        </Badge>
                      ) : null}
                    </div>

                    {pub.body ? (
                      <p className="text-sm leading-6 text-muted-foreground">{pub.body}</p>
                    ) : null}

                    {(pub.buttonText || pub.buttonLink) ? (
                      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                        <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {pub.buttonText || 'Boton'}
                          {pub.buttonLink ? ` - ${pub.buttonLink}` : ''}
                        </span>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="border-b p-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" />
              Nueva publicidad
            </CardTitle>
            <CardDescription>Completa los campos principales del mensaje.</CardDescription>
          </CardHeader>

          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="tittle">Titulo *</Label>
                <Input
                  id="tittle"
                  name="tittle"
                  value={form.tittle}
                  onChange={handleChange}
                  placeholder="Ej. Oferta de temporada"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtittle">Subtitulo *</Label>
                <Input
                  id="subtittle"
                  name="subtittle"
                  value={form.subtittle}
                  onChange={handleChange}
                  placeholder="Mensaje corto para destacar"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Descripcion *</Label>
                <Textarea
                  id="body"
                  name="body"
                  value={form.body}
                  onChange={handleChange}
                  placeholder="Detalle de la publicidad"
                  rows={4}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio</Label>
                  <Input
                    id="price"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="$0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buttonText">Texto boton</Label>
                  <Input
                    id="buttonText"
                    name="buttonText"
                    value={form.buttonText}
                    onChange={handleChange}
                    placeholder="Comprar ahora"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="buttonLink">Link boton</Label>
                <Input
                  id="buttonLink"
                  name="buttonLink"
                  value={form.buttonLink}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Agregar publicidad
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
