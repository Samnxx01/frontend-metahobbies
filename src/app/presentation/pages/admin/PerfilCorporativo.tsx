import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Loader2, Building2, Edit, Save, MapPin, Phone, Globe, Calendar as CalendarIcon, FileText } from 'lucide-react';
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" /> Razón Social *
                </label>
                <Input required value={data.razon_social} onChange={e => updateField('razon_social', e.target.value)} placeholder="Nombre legal" />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Título / Eslogan</label>
                <Input value={data.titulo} onChange={e => updateField('titulo', e.target.value)} placeholder="Ej: Innovación constante" />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">NIT / RUC *</label>
                <Input required value={data.nit_ruc_rtn} onChange={e => updateField('nit_ruc_rtn', e.target.value)} />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Tipo de Sociedad *</label>
                <Select value={data.tipo_sociedad} onValueChange={v => {
                    console.log('📋 Tipo de sociedad seleccionado ID:', v);
                    updateField('tipo_sociedad', v);
                }}>
                    <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                    <SelectContent>
                        {tiposSociedad.map(t => (
                            <SelectItem key={t._id} value={t._id}>
                                {t.tipo_sociedad} - {t.nombre_sociedad}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Representante Legal</label>
                <Select value={data.represeLegaEmpresa} onValueChange={v => updateField('represeLegaEmpresa', v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                    <SelectContent>
                        {representantes.map(r => (
                            <SelectItem key={r._id} value={r._id}>{r.nombre_representante_legal}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Ubicación (Sede)</label>
                <Select value={data.direccion_empresa_relacion} onValueChange={v => updateField('direccion_empresa_relacion', v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                    <SelectContent>
                        {direcciones.map(d => (
                            <SelectItem key={d._id} value={d._id}>{d.ciudad?.nombre_ciudad} - {d.telefono_empresa}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Dirección (Nomenclatura) *</label>
                <Input required value={data.direccion_empresa} onChange={e => updateField('direccion_empresa', e.target.value)} placeholder="Ej: Calle 10 # 5-25" />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary" /> Fecha Constitución
                </label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn("w-full justify-start text-left font-normal", !data.fecha_constitucion && "text-muted-foreground")}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {data.fecha_constitucion && isValid(parseISO(data.fecha_constitucion))
                                ? format(parseISO(data.fecha_constitucion), "PPP", { locale: es })
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
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            locale={es}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Móvil Corporativo</label>
                <Input value={data.movil_corporativo} onChange={e => updateField('movil_corporativo', e.target.value)} />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Cámara de Comercio</label>
                <Input value={data.camara_comercio} onChange={e => updateField('camara_comercio', e.target.value)} />
            </div>

            <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold">Descripción General</label>
                <Textarea value={data.descripcion} onChange={e => updateField('descripcion', e.target.value)} rows={2} />
            </div>

            {/* CAMPOS DE MISIÓN Y VISIÓN */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2 text-primary">
                        <FileText className="w-4 h-4" /> Misión
                    </label>
                    <Textarea
                        value={data.descripcion_mision_empresa}
                        onChange={e => updateField('descripcion_mision_empresa', e.target.value)}
                        rows={3}
                        placeholder="Escribe la misión de la empresa..."
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2 text-primary">
                        <Globe className="w-4 h-4" /> Visión
                    </label>
                    <Textarea
                        value={data.descripcion_vision_empresa}
                        onChange={e => updateField('descripcion_vision_empresa', e.target.value)}
                        rows={3}
                        placeholder="Escribe la visión de la empresa..."
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
                apiFetch('/api/config/parametrizacion/direccion/coporativa', { method: 'GET' })
            ]);

            const reps = repsRes?.representantes || [];
            const socs = socRes?.sociedades || [];
            const dirs = dirRes?.direcciones || [];

            setRepresentantes(reps);
            setTiposSociedad(socs);
            setDirecciones(dirs);
        } catch (err) {
            console.error('❌ Error cargando catálogos:', err);
            toast.error('Error al cargar catálogos');
        }
    };

    const fetchPerfil = async () => {
        setLoading(true);

        try {
            const res = await apiFetch('/api/configuracion/listar/user/coporativo/perfil/publico', {
                method: 'GET'
            });

            if (res?.ok && res?.perfil) {

                setPerfil(res.perfil);
                setPerfilId(res.perfil._id);

                let tipoSociedadId = '';
                if (res.perfil.tipo_sociedad) {
                    tipoSociedadId = res.perfil.tipo_sociedad._id || '';
                }

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
                    estado: res.perfil.estado ?? true,
                });
            } else {
                setPerfil(null);
            }
        } catch (err: any) {
            console.error('❌ Error:', err);
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
        fetchCatalogos();
        fetchPerfil();
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
            estado: true,
        };

        try {
            const res = await apiFetch('/api/configuracion/parametrizacion/corporativo/perfil', {
                method: 'POST',
                body: payload,
            });

            if (res?.ok) {
                toast.success('✅ Perfil corporativo registrado');
                await fetchPerfil();
            }
        } catch (err: any) {
            console.error('❌ Error:', err);
            toast.error(err.message || 'Error al registrar');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!perfilId) {
            toast.error('No se encontró el ID del perfil');
            return;
        }

        setUpdating(true);

        try {
            const res = await apiFetch(`/api/configuracion/parametrizacion/actualizar/corporativo/perfil/${perfilId}`, {
                method: 'PUT',
                body: updateForm,
            });

            toast.success('✅ Información actualizada');
            setIsUpdateModalOpen(false);
            await fetchPerfil();
        } catch (err: any) {
            console.error('❌ Error:', err);
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
        <div className="container mx-auto p-4 max-w-5xl space-y-6">
            <Card className="border-t-4 border-t-primary shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="text-primary" />
                        {perfil ? 'Información de la Empresa' : 'Registro de Perfil Corporativo'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="animate-spin h-8 w-8 text-primary" />
                        </div>
                    ) : perfil ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-muted rounded-xl border">
                                <div>
                                    <p className="text-[10px] font-bold text-primary uppercase">Razón Social</p>
                                    <p className="font-bold text-lg">{perfil.razon_social}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-primary uppercase">NIT / Documento</p>
                                    <p className="font-medium">{perfil.nit_ruc_rtn}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-primary uppercase">Tipo de Sociedad</p>
                                    <p className="font-medium">{getTipoSociedadDisplay(perfil.tipo_sociedad)}</p>
                                </div>
                            </div>
                            <Button onClick={() => setIsUpdateModalOpen(true)} className="w-full h-12">
                                <Edit className="mr-2 h-5 w-5" /> Editar Información Corporativa
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleCreateSubmit} className="space-y-8">
                            <FormularioEmpresa
                                data={form}
                                setData={setForm}
                                representantes={representantes}
                                tiposSociedad={tiposSociedad}
                                direcciones={direcciones}
                            />
                            <Button type="submit" disabled={submitting} className="w-full h-12 text-lg">
                                {submitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                                Finalizar Registro de Empresa
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="text-primary" /> Actualizar Perfil
                        </DialogTitle>
                        <DialogDescription>
                            Actualiza la información corporativa de tu empresa
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateSubmit} className="space-y-6 pt-4">
                        <FormularioEmpresa
                            data={updateForm}
                            setData={setUpdateForm}
                            representantes={representantes}
                            tiposSociedad={tiposSociedad}
                            direcciones={direcciones}
                        />
                        <div className="flex justify-end gap-3 border-t pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsUpdateModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={updating} className="min-w-[150px]">
                                {updating ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
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