import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Loader2, Building2, Edit, Save, Globe, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { toast } from 'react-toastify';

interface FormularioProps {
    data: any;
    setData: (data: any) => void;
    representantes: any[];
    tiposSociedad: any[];
    direcciones: any[];
}

const FormularioEmpresa = ({ data, setData, representantes, tiposSociedad, direcciones }: FormularioProps) => {
    const updateField = (field: string, value: any) => {
        setData({ ...data, [field]: value });
    };

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold">
                    <Building2 className="h-4 w-4 text-primary" /> Razon Social *
                </label>
                <Input required value={data.razon_social} onChange={(e) => updateField('razon_social', e.target.value)} placeholder="Nombre legal" />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Titulo / Eslogan</label>
                <Input value={data.titulo} onChange={(e) => updateField('titulo', e.target.value)} placeholder="Ej: Innovacion constante" />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">NIT / RUC *</label>
                <Input required value={data.nit_ruc_rtn} onChange={(e) => updateField('nit_ruc_rtn', e.target.value)} />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Tipo de Sociedad *</label>
                <Select
                    value={data.tipo_sociedad}
                    onValueChange={(value) => {
                        updateField('tipo_sociedad', value);
                    }}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                        {tiposSociedad.map((tipo) => (
                            <SelectItem key={tipo._id} value={tipo._id}>
                                {tipo.tipo_sociedad} - {tipo.nombre_sociedad}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Representante Legal</label>
                <Select value={data.represeLegaEmpresa} onValueChange={(value) => updateField('represeLegaEmpresa', value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                        {representantes.map((representante) => (
                            <SelectItem key={representante._id} value={representante._id}>
                                {representante.nombre_representante_legal}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Ubicacion (Sede)</label>
                <Select value={data.direccion_empresa_relacion} onValueChange={(value) => updateField('direccion_empresa_relacion', value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                        {direcciones.map((direccion) => (
                            <SelectItem key={direccion._id} value={direccion._id}>
                                {direccion.ciudad?.nombre_ciudad} - {direccion.telefono_empresa}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Direccion (Nomenclatura) *</label>
                <Input required value={data.direccion_empresa} onChange={(e) => updateField('direccion_empresa', e.target.value)} placeholder="Ej: Calle 10 # 5-25" />
            </div>

            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarIcon className="h-4 w-4 text-primary" /> Fecha Constitucion
                </label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !data.fecha_constitucion && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {data.fecha_constitucion && isValid(parseISO(data.fecha_constitucion))
                                ? format(parseISO(data.fecha_constitucion), 'PPP', { locale: es })
                                : <span>Seleccionar fecha</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            captionLayout="dropdown"
                            fromYear={1900}
                            toYear={new Date().getFullYear()}
                            selected={data.fecha_constitucion ? parseISO(data.fecha_constitucion) : undefined}
                            onSelect={(date) => updateField('fecha_constitucion', date ? format(date, 'yyyy-MM-dd') : '')}
                            disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                            locale={es}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Movil Corporativo</label>
                <Input value={data.movil_corporativo} onChange={(e) => updateField('movil_corporativo', e.target.value)} />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Camara de Comercio</label>
                <Input value={data.camara_comercio} onChange={(e) => updateField('camara_comercio', e.target.value)} />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Perfil Publico</label>
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
                    <div>
                        <p className="text-sm font-medium">Publicar perfil en vistas publicas</p>
                        <p className="text-xs text-muted-foreground">El sitio publico solo renderiza perfiles con `publicar = true`.</p>
                    </div>
                    <Switch checked={data.publicar === true} onCheckedChange={(checked) => updateField('publicar', checked)} />
                </div>
            </div>

            <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold">Descripcion General</label>
                <Textarea value={data.descripcion} onChange={(e) => updateField('descripcion', e.target.value)} rows={2} />
            </div>

            <div className="grid grid-cols-1 gap-4 pt-2 md:col-span-2 md:grid-cols-2">
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <FileText className="h-4 w-4" /> Mision
                    </label>
                    <Textarea
                        value={data.descripcion_mision_empresa}
                        onChange={(e) => updateField('descripcion_mision_empresa', e.target.value)}
                        rows={3}
                        placeholder="Escribe la mision de la empresa..."
                    />
                </div>
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <Globe className="h-4 w-4" /> Vision
                    </label>
                    <Textarea
                        value={data.descripcion_vision_empresa}
                        onChange={(e) => updateField('descripcion_vision_empresa', e.target.value)}
                        rows={3}
                        placeholder="Escribe la vision de la empresa..."
                    />
                </div>
            </div>
        </div>
    );
};

const initialFormState = {
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
    publicar: false,
    estado: true,
};

export default function PerfilCorporativo() {
    const [perfil, setPerfil] = useState<any>(null);
    const [perfilId, setPerfilId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

    const [representantes, setRepresentantes] = useState<any[]>([]);
    const [tiposSociedad, setTiposSociedad] = useState<any[]>([]);
    const [direcciones, setDirecciones] = useState<any[]>([]);

    const [form, setForm] = useState(initialFormState);
    const [updateForm, setUpdateForm] = useState(initialFormState);

    const fetchCatalogos = async () => {
        try {
            const [repsRes, socRes, dirRes] = await Promise.all([
                apiFetch('/api/config/listar/represente/empresarial', { method: 'GET' }),
                apiFetch('/api/config/parametrizacion/sociedades/coporativa', { method: 'GET' }),
                apiFetch('/api/config/parametrizacion/direccion/coporativa', { method: 'GET' }),
            ]);

            setRepresentantes(repsRes?.representantes || []);
            setTiposSociedad(socRes?.sociedades || []);
            setDirecciones(dirRes?.direcciones || []);
        } catch (err) {
            console.error('Error cargando catalogos:', err);
            toast.error('Error al cargar catalogos');
        }
    };

    const fetchPerfil = async () => {
        setLoading(true);

        try {
            const res = await apiFetch('/api/configuracion/listar/user/coporativo/perfil/publico', {
                method: 'GET',
            });

            if (res?.ok && res?.perfil) {
                setPerfil(res.perfil);
                setPerfilId(res.perfil._id);

                const tipoSociedadId = res.perfil.tipo_sociedad?._id || '';

                setUpdateForm({
                    razon_social: res.perfil.razon_social || '',
                    titulo: res.perfil.titulo || '',
                    descripcion: res.perfil.descripcion || '',
                    represeLegaEmpresa: res.perfil.represeLegaEmpresa?._id || '',
                    nit_ruc_rtn: res.perfil.nit_ruc_rtn || '',
                    tipo_sociedad: tipoSociedadId,
                    direccion_empresa: res.perfil.direccion_empresa || '',
                    direccion_empresa_relacion: res.perfil.direccion_empresa_relacion?._id || '',
                    movil_corporativo: res.perfil.movil_corporativo?.toString() || '',
                    descripcion_mision_empresa: res.perfil.descripcion_mision_empresa || '',
                    descripcion_vision_empresa: res.perfil.descripcion_vision_empresa || '',
                    fecha_constitucion: res.perfil.fecha_constitucion ? res.perfil.fecha_constitucion.split('T')[0] : '',
                    camara_comercio: res.perfil.camara_comercio || '',
                    publicar: res.perfil.publicar === true,
                    estado: res.perfil.estado ?? true,
                });
            } else {
                setPerfil(null);
            }
        } catch (err: any) {
            console.error('Error cargando perfil:', err);
            if (err.message?.includes('no encontrado') || err.message?.includes('404')) {
                setPerfil(null);
            } else {
                toast.error('Error al cargar el perfil');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchCatalogos();
        void fetchPerfil();
    }, []);

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.tipo_sociedad) {
            toast.error('Debe seleccionar un tipo de sociedad');
            return;
        }

        setSubmitting(true);

        const payload = {
            ...form,
            publicar: form.publicar === true,
            estado: true,
        };

        try {
            const res = await apiFetch('/api/configuracion/parametrizacion/corporativo/perfil', {
                method: 'POST',
                body: payload,
            });

            if (res?.ok) {
                toast.success('Perfil corporativo registrado');
                await fetchPerfil();
            }
        } catch (err: any) {
            console.error('Error registrando perfil:', err);
            toast.error(err.message || 'Error al registrar');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!perfilId) {
            toast.error('No se encontro el ID del perfil');
            return;
        }

        setUpdating(true);

        try {
            await apiFetch(`/api/configuracion/parametrizacion/actualizar/corporativo/perfil/${perfilId}`, {
                method: 'PUT',
                body: updateForm,
            });

            toast.success('Informacion actualizada');
            setIsUpdateModalOpen(false);
            await fetchPerfil();
        } catch (err: any) {
            console.error('Error actualizando perfil:', err);
            toast.error(err.message || 'Error al actualizar');
        } finally {
            setUpdating(false);
        }
    };

    const getTipoSociedadDisplay = (tipoSociedad: any) => {
        if (!tipoSociedad) return '-';

        const nombre = tipoSociedad.nombre_sociedad || '';
        const sigla = tipoSociedad.tipo_sociedad?.tipo_sociedad || '';

        return sigla ? `${nombre} (${sigla})` : nombre;
    };

    return (
        <div className="container mx-auto max-w-5xl space-y-6 p-4">
            <Card className="border-t-4 border-t-primary shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="text-primary" />
                        {perfil ? 'Informacion de la Empresa' : 'Registro de Perfil Corporativo'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : perfil ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-4 rounded-xl border bg-muted p-5 md:grid-cols-4">
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-primary">Razon Social</p>
                                    <p className="text-lg font-bold">{perfil.razon_social}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-primary">NIT / Documento</p>
                                    <p className="font-medium">{perfil.nit_ruc_rtn}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-primary">Tipo de Sociedad</p>
                                    <p className="font-medium">{getTipoSociedadDisplay(perfil.tipo_sociedad)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-primary">Publicacion</p>
                                    <p className="font-medium">{perfil.publicar === true ? 'Publicado' : 'Privado'}</p>
                                </div>
                            </div>
                            <Button onClick={() => setIsUpdateModalOpen(true)} className="h-12 w-full">
                                <Edit className="mr-2 h-5 w-5" /> Editar Informacion Corporativa
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleCreateSubmit} className="space-y-8">
                            <FormularioEmpresa data={form} setData={setForm} representantes={representantes} tiposSociedad={tiposSociedad} direcciones={direcciones} />
                            <Button type="submit" disabled={submitting} className="h-12 w-full text-lg">
                                {submitting ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                                Finalizar Registro de Empresa
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
                <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="text-primary" /> Actualizar Perfil
                        </DialogTitle>
                        <DialogDescription>Actualiza la informacion corporativa de tu empresa</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateSubmit} className="space-y-6 pt-4">
                        <FormularioEmpresa data={updateForm} setData={setUpdateForm} representantes={representantes} tiposSociedad={tiposSociedad} direcciones={direcciones} />
                        <div className="flex justify-end gap-3 border-t pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsUpdateModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={updating} className="min-w-[150px]">
                                {updating ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                                Guardar Cambios
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// PR hecho por Gustavo Pereira el 13-02-2026
