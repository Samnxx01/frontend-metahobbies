import React, { useEffect, useState } from 'react';
import { Building2, Calendar as CalendarIcon, FileText, Globe, Loader2, Save } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { apiFetch } from '@/app/services/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { resolveEntityPublicId } from '@/app/utils/entityPublicId';

interface PerfilCorporativoCreateModalProps {
  open: boolean;
  onClose: () => void;
}

interface FormState {
  razon_social: string;
  titulo: string;
  descripcion: string;
  represeLegaEmpresa: string;
  nit_ruc_rtn: string;
  tipo_sociedad: string;
  direccion_empresa: string;
  direccion_empresa_relacion: string;
  movil_corporativo: string;
  descripcion_mision_empresa: string;
  descripcion_vision_empresa: string;
  fecha_constitucion: string;
  camara_comercio: string;
  estado: boolean;
}

const EMPTY_FORM: FormState = {
  razon_social: '',
  titulo: '',
  descripcion: '',
  represeLegaEmpresa: '',
  nit_ruc_rtn: '',
  tipo_sociedad: '',
  direccion_empresa: '',
  direccion_empresa_relacion: '',
  movil_corporativo: '',
  descripcion_mision_empresa: '',
  descripcion_vision_empresa: '',
  fecha_constitucion: '',
  camara_comercio: '',
  estado: false,
};

export function PerfilCorporativoCreateModal({
  open,
  onClose,
}: PerfilCorporativoCreateModalProps): React.ReactElement {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [representantes, setRepresentantes] = useState<any[]>([]);
  const [tiposSociedad, setTiposSociedad] = useState<any[]>([]);
  const [direcciones, setDirecciones] = useState<any[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);

  const tiposSociedadUnicos = tiposSociedad.filter((item, index, array) => {
    const id = resolveEntityPublicId(item);
    if (id) {
      return array.findIndex((candidate) => resolveEntityPublicId(candidate) === id) === index;
    }

    const key = `${String(item?.tipo_sociedad || '').trim()}|${String(item?.nombre_sociedad || '').trim()}`;
    return array.findIndex((candidate) => (
      `${String(candidate?.tipo_sociedad || '').trim()}|${String(candidate?.nombre_sociedad || '').trim()}`
    ) === key) === index;
  });

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      return;
    }

    const fetchCatalogos = async (): Promise<void> => {
      try {
        setLoadingCatalogos(true);
        const [repsRes, socRes, dirRes] = await Promise.all([
          apiFetch('/api/config/listar/represente/empresarial', { method: 'GET' }),
          apiFetch('/api/config/parametrizacion/sociedades/coporativa', { method: 'GET' }),
          apiFetch('/api/config/parametrizacion/direccion/coporativa', { method: 'GET' }),
        ]);

        setRepresentantes(repsRes?.representantes || []);
        setTiposSociedad(socRes?.sociedades || []);
        setDirecciones(dirRes?.direcciones || []);
      } catch (error) {
        console.error('Error cargando catalogos corporativos:', error);
        toast.error('No se pudieron cargar los catálogos del perfil corporativo');
      } finally {
        setLoadingCatalogos(false);
      }
    };

    void fetchCatalogos();
  }, [open]);

  const updateField = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await apiFetch('/api/configuracion/parametrizacion/corporativo/perfil', {
        method: 'POST',
        body: form,
      });

      if (res?.ok) {
        toast.success(res?.msg || 'Perfil corporativo creado correctamente');
        onClose();
      } else {
        toast.error(res?.msg || 'No se pudo crear el perfil corporativo');
      }
    } catch (error: any) {
      console.error('Error creando perfil corporativo:', error);
      toast.error(error?.message || 'Error creando perfil corporativo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Crear Perfil Corporativo
          </DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="block">Registra un nuevo perfil corporativo desde esta vista.</span>
            <span className="block">Endpoint: <code>POST /api/configuracion/parametrizacion/corporativo/perfil</code></span>
          </DialogDescription>
        </DialogHeader>

        {loadingCatalogos ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Razón Social *
                </Label>
                <Input
                  required
                  value={form.razon_social}
                  onChange={(e) => updateField('razon_social', e.target.value)}
                  placeholder="Nombre legal"
                />
              </div>

              <div className="space-y-2">
                <Label>Título / Eslogan</Label>
                <Input
                  value={form.titulo}
                  onChange={(e) => updateField('titulo', e.target.value)}
                  placeholder="Ej: Innovación constante"
                />
              </div>

              <div className="space-y-2">
                <Label>NIT / RUC *</Label>
                <Input
                  required
                  value={form.nit_ruc_rtn}
                  onChange={(e) => updateField('nit_ruc_rtn', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Sociedad *</Label>
                <Select value={form.tipo_sociedad} onValueChange={(value) => updateField('tipo_sociedad', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposSociedadUnicos.map((item) => {
                      const id = resolveEntityPublicId(item);
                      return (
                      <SelectItem key={id} value={id}>
                        {item.tipo_sociedad} - {item.nombre_sociedad}
                      </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Representante Legal *</Label>
                <Select value={form.represeLegaEmpresa} onValueChange={(value) => updateField('represeLegaEmpresa', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {representantes.map((item) => {
                      const id = resolveEntityPublicId(item);
                      return (
                      <SelectItem key={id} value={id}>
                        {item.nombre_representante_legal}
                      </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ubicación (Sede) *</Label>
                <Select
                  value={form.direccion_empresa_relacion}
                  onValueChange={(value) => updateField('direccion_empresa_relacion', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {direcciones.map((item) => {
                      const id = resolveEntityPublicId(item);
                      return (
                      <SelectItem key={id} value={id}>
                        {item.ciudad?.nombre_ciudad} - {item.telefono_empresa}
                      </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dirección (Nomenclatura) *</Label>
                <Input
                  required
                  value={form.direccion_empresa}
                  onChange={(e) => updateField('direccion_empresa', e.target.value)}
                  placeholder="Ej: Calle 10 # 5-25"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  Fecha Constitución *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !form.fecha_constitucion && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.fecha_constitucion && isValid(parseISO(form.fecha_constitucion))
                        ? format(parseISO(form.fecha_constitucion), 'PPP', { locale: es })
                        : <span>Seleccionar fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      captionLayout="dropdown"
                      fromYear={1900}
                      toYear={new Date().getFullYear()}
                      selected={form.fecha_constitucion ? parseISO(form.fecha_constitucion) : undefined}
                      onSelect={(date) => updateField('fecha_constitucion', date ? format(date, 'yyyy-MM-dd') : '')}
                      disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Móvil Corporativo *</Label>
                <Input
                  required
                  value={form.movil_corporativo}
                  onChange={(e) => updateField('movil_corporativo', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Cámara de Comercio *</Label>
                <Input
                  required
                  value={form.camara_comercio}
                  onChange={(e) => updateField('camara_comercio', e.target.value)}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>Descripción General</Label>
                <Textarea
                  value={form.descripcion}
                  onChange={(e) => updateField('descripcion', e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-primary">
                  <FileText className="w-4 h-4" />
                  Misión *
                </Label>
                <Textarea
                  required
                  value={form.descripcion_mision_empresa}
                  onChange={(e) => updateField('descripcion_mision_empresa', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-primary">
                  <Globe className="w-4 h-4" />
                  Visión *
                </Label>
                <Textarea
                  required
                  value={form.descripcion_vision_empresa}
                  onChange={(e) => updateField('descripcion_vision_empresa', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-1">
                  <Label htmlFor="perfil-corporativo-estado">Estado inicial</Label>
                  <p className="text-xs text-muted-foreground">
                    Puedes crearlo inactivo con <code>false</code> o activarlo antes de guardar.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{form.estado ? 'Activo' : 'Inactivo'}</span>
                  <Switch
                    id="perfil-corporativo-estado"
                    checked={form.estado}
                    onCheckedChange={(checked) => updateField('estado', checked)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Crear Perfil
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
