import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

const TIPOS_SOCIEDAD = ["SAS", "LTDA", "SA", "SC", "S. en C.", "SCA", "EU"];

export default function SociedadesCorporativas() {
  const [readOnlyData, setReadOnlyData] = useState<any>(null);
  const [form, setForm] = useState({ nombre_sociedad: '', tipo_sociedad: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchSociedadRegistrada = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/config/parametrizacion/sociedades/coporativa', { method: 'GET' });

      const lista = res?.sociedades || res?.data || (Array.isArray(res) ? res : []);

      if (lista.length > 0) {
        const sociedadGuardada = lista[0];
        setReadOnlyData(sociedadGuardada);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSociedadRegistrada();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (value: string) => {
    setForm({ ...form, tipo_sociedad: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiFetch(
        '/api/configuracion/parametrizacion/tiposociedad',
        { method: 'POST', body: form }
      );

      toast.success("Sociedad registrada exitosamente");

      await fetchSociedadRegistrada();

      setForm({ nombre_sociedad: '', tipo_sociedad: '' });

    } catch (err: any) {
      toast.error(err.message || "Error al guardar la sociedad");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto mt-8">

      {/* --- PARTE 1: FORMULARIO DE LECTURA (Persistente) --- */}
      <Card className="bg-muted/20">
        <CardHeader>
          <CardTitle className="text-lg">Sociedad Registrada</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Verificando registros...
            </div>
          ) : readOnlyData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Nombre Razón Social</label>
                <div className="p-2 bg-background border rounded-md font-medium">
                  {/* Verificamos todas las posibles variantes de nombres que pueda traer el backend */}
                  {readOnlyData.nombre_sociedad || readOnlyData.nombre || readOnlyData.razonSocial || ''}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Tipo de Sociedad</label>
                <div className="p-2 bg-background border rounded-md font-medium text-primary">
                  {/* Si el backend devuelve un objeto poblado, accedemos al nombre, si no, al string */}
                  {typeof readOnlyData.tipo_sociedad === 'object'
                    ? readOnlyData.tipo_sociedad.nombre || readOnlyData.tipo_sociedad.sigla
                    : readOnlyData.tipo_sociedad}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic border border-dashed p-4 rounded text-center">
              No hay una sociedad registrada en el sistema.
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- PARTE 2: FORMULARIO DE REGISTRO --- */}
      <Card>
        <CardHeader>
          <CardTitle>Configurar Nueva Sociedad</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre de la Sociedad</label>
                <Input
                  name="nombre_sociedad"
                  value={form.nombre_sociedad}
                  onChange={handleChange}
                  placeholder="Ej: Inversiones Globales"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Sociedad</label>
                <Select value={form.tipo_sociedad} onValueChange={handleSelectChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_SOCIEDAD.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : 'Registrar Sociedad'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}