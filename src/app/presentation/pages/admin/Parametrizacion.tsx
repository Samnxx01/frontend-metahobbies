import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/app/services/api';
import { toast } from 'react-toastify';

// Shadcn UI components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';

// Lucide icons
import { Loader2, Settings, FileText, User, Globe, Phone, Flag, MapPin, Building2, MapPinned, Briefcase, Save } from 'lucide-react';

interface TipoDocumento {
    tipos: string;
    nombreDocumento: string;
    iud: string;
}

interface Genero {
    nombre_genero: string;
    id: string;
}

interface Nacionalidad {
    Nacionalidad: string;
    siglaNaciona: string;
    iud: string;
}

interface Prefijo {
    iud: string;
    prefijoTelefonicoPais: string;
}

interface Pais {
    Id: string;
    nombre_pais: string;
    codigoISO2: string;
}

interface Ciudad {
    ciudadId: string;
    nombre_ciudad: string;
}

interface Departamento {
    departamentoId: string;
    codigo_postal: string;
    ciudades: Ciudad[];
}

interface LocationData {
    pais: Pais;
    departamentos: Departamento[];
}

interface Representante {
    nombre: string;
    tipoDocumento: string;
    numeroDocumento: string;
    cargo: string;
    email: string;
    telefono: string;
}

interface TipoSociedad {
    codigo: string;
    nombre: string;
    descripcion: string;
}

interface DireccionPublica {
    direccion: string;
    ciudad: string;
    departamento: string;
    pais: string;
    codigoPostal: string;
}

interface SectorIndustria {
    sector: string;
    industria: string;
    tamañoEmpresa: string;
    numeroEmpleados: number;
    actividadEconomica: string;
}

interface ParametrizacionData {
    tiposDocumento: TipoDocumento[];
    generos: Genero[];
    nacionalidades: Nacionalidad[];
    prefijos: Prefijo[];
    locationData: LocationData | null;
}

function Parametrizacion(): React.ReactElement {
    const [loading, setLoading] = useState<boolean>(true);
    const [data, setData] = useState<ParametrizacionData>({
        tiposDocumento: [],
        generos: [],
        nacionalidades: [],
        prefijos: [],
        locationData: null
    });
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);

    // Estados para formularios
    const [representante, setRepresentante] = useState<Representante>({
        nombre: '',
        tipoDocumento: 'CC',
        numeroDocumento: '',
        cargo: '',
        email: '',
        telefono: ''
    });

    const [tipoSociedad, setTipoSociedad] = useState<TipoSociedad>({
        codigo: '',
        nombre: '',
        descripcion: ''
    });

    const [direccionPublica, setDireccionPublica] = useState<DireccionPublica>({
        direccion: '',
        ciudad: '',
        departamento: '',
        pais: 'Colombia',
        codigoPostal: ''
    });

    const [sectorIndustria, setSectorIndustria] = useState<SectorIndustria>({
        sector: '',
        industria: '',
        tamañoEmpresa: 'Pequeña',
        numeroEmpleados: 0,
        actividadEconomica: ''
    });

    useEffect(() => {
        fetchParametrizacion();
    }, []);

    const fetchParametrizacion = async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

            // Cargar todos los endpoints de parametrización en paralelo
            const [
                tiposDocResponse,
                generosResponse,
                nacionalidadesResponse,
                prefijosResponse,
                locationResponse
            ] = await Promise.all([
                apiFetch(`${API_BASE_URL}/perfil/seguridad/tipo/documentos`, { method: 'GET' }),
                apiFetch(`${API_BASE_URL}/perfil/seguridad/listar/tipo/genero`, { method: 'GET' }),
                apiFetch(`${API_BASE_URL}/perfil/seguridad/listar/tipo/nacionalidad`, { method: 'GET' }),
                apiFetch(`${API_BASE_URL}/perfil/seguridad/listar/tipo/prefijo`, { method: 'GET' }),
                apiFetch(`${API_BASE_URL}/perfil/seguridad/listar/paises/departamentos/ciudades?paisId=1`, { method: 'GET' })
            ]);

            setData({
                tiposDocumento: tiposDocResponse?.tipos || [],
                generos: generosResponse?.generos || [],
                nacionalidades: nacionalidadesResponse?.nacionalidades || [],
                prefijos: prefijosResponse?.prefijos || [],
                locationData: locationResponse?.ok ? {
                    pais: locationResponse.pais,
                    departamentos: locationResponse.departamentos
                } : null
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al cargar parametrización';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitRepresentante = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
            const response = await apiFetch(`${API_BASE_URL}/configuracion/parametrizacion/representante`, {
                method: 'POST',
                body: representante
            });
            
            if (response) {
                toast.success('Representante registrado exitosamente');
                setRepresentante({
                    nombre: '',
                    tipoDocumento: 'CC',
                    numeroDocumento: '',
                    cargo: '',
                    email: '',
                    telefono: ''
                });
            }
        } catch (error) {
            toast.error('Error al registrar representante');
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitTipoSociedad = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
            const response = await apiFetch(`${API_BASE_URL}/configuracion/parametrizacion/tiposociedad`, {
                method: 'POST',
                body: tipoSociedad
            });
            
            if (response) {
                toast.success('Tipo de sociedad creado exitosamente');
                setTipoSociedad({
                    codigo: '',
                    nombre: '',
                    descripcion: ''
                });
            }
        } catch (error) {
            toast.error('Error al crear tipo de sociedad');
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitDireccionPublica = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
            const response = await apiFetch(`${API_BASE_URL}/configuracion/parametrizacion/direccion-publica`, {
                method: 'POST',
                body: direccionPublica
            });
            
            if (response) {
                toast.success('Dirección pública registrada exitosamente');
                setDireccionPublica({
                    direccion: '',
                    ciudad: '',
                    departamento: '',
                    pais: 'Colombia',
                    codigoPostal: ''
                });
            }
        } catch (error) {
            toast.error('Error al registrar dirección pública');
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitSectorIndustria = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
            const response = await apiFetch(`${API_BASE_URL}/configuracion/parametrizacion/sector-industria-empresa`, {
                method: 'POST',
                body: sectorIndustria
            });
            
            if (response) {
                toast.success('Sector e industria registrados exitosamente');
                setSectorIndustria({
                    sector: '',
                    industria: '',
                    tamañoEmpresa: 'Pequeña',
                    numeroEmpleados: 0,
                    actividadEconomica: ''
                });
            }
        } catch (error) {
            toast.error('Error al registrar sector e industria');
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 md:p-6 lg:p-8">
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                    <p className="font-semibold">Error al cargar parametrización</p>
                    <p className="text-sm">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 bg-background">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <Settings className="h-8 w-8 text-primary" />
                        Parametrización del Sistema
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Configuración de catálogos y parámetros del sistema
                    </p>

                                {/* Formularios de Configuración Empresarial */}
                                <Card className="shadow-md">
                                    <CardHeader>
                                        <CardTitle className="text-xl flex items-center gap-2">
                                            <Building2 className="h-6 w-6" />
                                            Configuración Empresarial
                                        </CardTitle>
                                        <CardDescription>
                                            Registra la información legal y operativa de la empresa
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Accordion type="single" collapsible className="w-full">
                            
                                            {/* Representante Legal */}
                                            <AccordionItem value="representante">
                                                <AccordionTrigger className="hover:no-underline">
                                                    <div className="flex items-center gap-3">
                                                        <User className="h-5 w-5 text-primary" />
                                                        <span className="font-semibold">Representante Legal</span>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <form onSubmit={handleSubmitRepresentante} className="pt-4 space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label htmlFor="rep-nombre">Nombre Completo *</Label>
                                                                <Input
                                                                    id="rep-nombre"
                                                                    value={representante.nombre}
                                                                    onChange={(e) => setRepresentante({...representante, nombre: e.target.value})}
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="rep-cargo">Cargo *</Label>
                                                                <Input
                                                                    id="rep-cargo"
                                                                    value={representante.cargo}
                                                                    onChange={(e) => setRepresentante({...representante, cargo: e.target.value})}
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="rep-tipoDoc">Tipo de Documento *</Label>
                                                                <Select value={representante.tipoDocumento} onValueChange={(val) => setRepresentante({...representante, tipoDocumento: val})}>
                                                                    <SelectTrigger id="rep-tipoDoc">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                                                                        <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                                                                        <SelectItem value="PA">Pasaporte</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="rep-numDoc">Número de Documento *</Label>
                                                                <Input
                                                                    id="rep-numDoc"
                                                                    value={representante.numeroDocumento}
                                                                    onChange={(e) => setRepresentante({...representante, numeroDocumento: e.target.value})}
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="rep-email">Email *</Label>
                                                                <Input
                                                                    id="rep-email"
                                                                    type="email"
                                                                    value={representante.email}
                                                                    onChange={(e) => setRepresentante({...representante, email: e.target.value})}
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="rep-telefono">Teléfono *</Label>
                                                                <Input
                                                                    id="rep-telefono"
                                                                    value={representante.telefono}
                                                                    onChange={(e) => setRepresentante({...representante, telefono: e.target.value})}
                                                                    placeholder="+57 300 123 4567"
                                                                    required
                                                                />
                                                            </div>
                                                        </div>
                                                        <Button type="submit" disabled={submitting}>
                                                            <Save className="h-4 w-4 mr-2" />
                                                            {submitting ? 'Guardando...' : 'Guardar Representante'}
                                                        </Button>
                                                    </form>
                                                </AccordionContent>
                                            </AccordionItem>

                                            <Separator />

                                            {/* Tipo de Sociedad */}
                                            <AccordionItem value="tipo-sociedad">
                                                <AccordionTrigger className="hover:no-underline">
                                                    <div className="flex items-center gap-3">
                                                        <Building2 className="h-5 w-5 text-primary" />
                                                        <span className="font-semibold">Tipo de Sociedad</span>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <form onSubmit={handleSubmitTipoSociedad} className="pt-4 space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label htmlFor="soc-codigo">Código *</Label>
                                                                <Input
                                                                    id="soc-codigo"
                                                                    value={tipoSociedad.codigo}
                                                                    onChange={(e) => setTipoSociedad({...tipoSociedad, codigo: e.target.value})}
                                                                    placeholder="SAS, LTDA, SA"
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="soc-nombre">Nombre *</Label>
                                                                <Input
                                                                    id="soc-nombre"
                                                                    value={tipoSociedad.nombre}
                                                                    onChange={(e) => setTipoSociedad({...tipoSociedad, nombre: e.target.value})}
                                                                    placeholder="Sociedad por Acciones Simplificada"
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2 md:col-span-2">
                                                                <Label htmlFor="soc-descripcion">Descripción</Label>
                                                                <Textarea
                                                                    id="soc-descripcion"
                                                                    value={tipoSociedad.descripcion}
                                                                    onChange={(e) => setTipoSociedad({...tipoSociedad, descripcion: e.target.value})}
                                                                    rows={3}
                                                                />
                                                            </div>
                                                        </div>
                                                        <Button type="submit" disabled={submitting}>
                                                            <Save className="h-4 w-4 mr-2" />
                                                            {submitting ? 'Guardando...' : 'Guardar Tipo de Sociedad'}
                                                        </Button>
                                                    </form>
                                                </AccordionContent>
                                            </AccordionItem>

                                            <Separator />

                                            {/* Dirección Pública */}
                                            <AccordionItem value="direccion-publica">
                                                <AccordionTrigger className="hover:no-underline">
                                                    <div className="flex items-center gap-3">
                                                        <MapPinned className="h-5 w-5 text-primary" />
                                                        <span className="font-semibold">Dirección Pública</span>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <form onSubmit={handleSubmitDireccionPublica} className="pt-4 space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2 md:col-span-2">
                                                                <Label htmlFor="dir-direccion">Dirección *</Label>
                                                                <Input
                                                                    id="dir-direccion"
                                                                    value={direccionPublica.direccion}
                                                                    onChange={(e) => setDireccionPublica({...direccionPublica, direccion: e.target.value})}
                                                                    placeholder="Calle 123 # 45-67"
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="dir-ciudad">Ciudad *</Label>
                                                                <Input
                                                                    id="dir-ciudad"
                                                                    value={direccionPublica.ciudad}
                                                                    onChange={(e) => setDireccionPublica({...direccionPublica, ciudad: e.target.value})}
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="dir-departamento">Departamento *</Label>
                                                                <Input
                                                                    id="dir-departamento"
                                                                    value={direccionPublica.departamento}
                                                                    onChange={(e) => setDireccionPublica({...direccionPublica, departamento: e.target.value})}
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="dir-pais">País *</Label>
                                                                <Input
                                                                    id="dir-pais"
                                                                    value={direccionPublica.pais}
                                                                    onChange={(e) => setDireccionPublica({...direccionPublica, pais: e.target.value})}
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="dir-codigoPostal">Código Postal</Label>
                                                                <Input
                                                                    id="dir-codigoPostal"
                                                                    value={direccionPublica.codigoPostal}
                                                                    onChange={(e) => setDireccionPublica({...direccionPublica, codigoPostal: e.target.value})}
                                                                />
                                                            </div>
                                                        </div>
                                                        <Button type="submit" disabled={submitting}>
                                                            <Save className="h-4 w-4 mr-2" />
                                                            {submitting ? 'Guardando...' : 'Guardar Dirección'}
                                                        </Button>
                                                    </form>
                                                </AccordionContent>
                                            </AccordionItem>

                                            <Separator />

                                            {/* Sector e Industria */}
                                            <AccordionItem value="sector-industria">
                                                <AccordionTrigger className="hover:no-underline">
                                                    <div className="flex items-center gap-3">
                                                        <Briefcase className="h-5 w-5 text-primary" />
                                                        <span className="font-semibold">Sector e Industria</span>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <form onSubmit={handleSubmitSectorIndustria} className="pt-4 space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label htmlFor="sect-sector">Sector *</Label>
                                                                <Input
                                                                    id="sect-sector"
                                                                    value={sectorIndustria.sector}
                                                                    onChange={(e) => setSectorIndustria({...sectorIndustria, sector: e.target.value})}
                                                                    placeholder="Tecnología"
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="sect-industria">Industria *</Label>
                                                                <Input
                                                                    id="sect-industria"
                                                                    value={sectorIndustria.industria}
                                                                    onChange={(e) => setSectorIndustria({...sectorIndustria, industria: e.target.value})}
                                                                    placeholder="Desarrollo de Software"
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="sect-tamano">Tamaño de Empresa *</Label>
                                                                <Select value={sectorIndustria.tamañoEmpresa} onValueChange={(val) => setSectorIndustria({...sectorIndustria, tamañoEmpresa: val})}>
                                                                    <SelectTrigger id="sect-tamano">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="Pequeña">Pequeña</SelectItem>
                                                                        <SelectItem value="Mediana">Mediana</SelectItem>
                                                                        <SelectItem value="Grande">Grande</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="sect-numEmpleados">Número de Empleados *</Label>
                                                                <Input
                                                                    id="sect-numEmpleados"
                                                                    type="number"
                                                                    min="0"
                                                                    value={sectorIndustria.numeroEmpleados}
                                                                    onChange={(e) => setSectorIndustria({...sectorIndustria, numeroEmpleados: parseInt(e.target.value) || 0})}
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="sect-actividad">Actividad Económica *</Label>
                                                                <Input
                                                                    id="sect-actividad"
                                                                    value={sectorIndustria.actividadEconomica}
                                                                    onChange={(e) => setSectorIndustria({...sectorIndustria, actividadEconomica: e.target.value})}
                                                                    placeholder="6201"
                                                                    required
                                                                />
                                                            </div>
                                                        </div>
                                                        <Button type="submit" disabled={submitting}>
                                                            <Save className="h-4 w-4 mr-2" />
                                                            {submitting ? 'Guardando...' : 'Guardar Sector e Industria'}
                                                        </Button>
                                                    </form>
                                                </AccordionContent>
                                            </AccordionItem>

                                        </Accordion>
                                    </CardContent>
                                </Card>
                </div>

                {/* Accordion de Parametrización */}
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="text-xl">Catálogos del Sistema</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            
                            {/* Tipos de Documento */}
                            <AccordionItem value="tipos-documento">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5 text-primary" />
                                        <div className="text-left">
                                            <p className="font-semibold">Tipos de Documento</p>
                                            <p className="text-sm text-muted-foreground">
                                                {data.tiposDocumento.length} tipos disponibles
                                            </p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="pt-4 space-y-2">
                                        {data.tiposDocumento.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {data.tiposDocumento.map((tipo) => (
                                                    <Card key={tipo.iud} className="border-border/40">
                                                        <CardContent className="p-4">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1">
                                                                    <p className="font-semibold text-sm">{tipo.nombreDocumento}</p>
                                                                    <Badge variant="secondary" className="mt-2 text-xs">
                                                                        {tipo.tipos}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-2 font-mono">
                                                                ID: {tipo.iud}
                                                            </p>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                No hay tipos de documento disponibles
                                            </p>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <Separator />

                            {/* Géneros */}
                            <AccordionItem value="generos">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <User className="h-5 w-5 text-primary" />
                                        <div className="text-left">
                                            <p className="font-semibold">Géneros</p>
                                            <p className="text-sm text-muted-foreground">
                                                {data.generos.length} géneros disponibles
                                            </p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="pt-4 space-y-2">
                                        {data.generos.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                {data.generos.map((genero) => (
                                                    <Card key={genero.id} className="border-border/40">
                                                        <CardContent className="p-4">
                                                            <p className="font-semibold text-sm">{genero.nombre_genero}</p>
                                                            <p className="text-xs text-muted-foreground mt-2 font-mono">
                                                                ID: {genero.id}
                                                            </p>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                No hay géneros disponibles
                                            </p>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <Separator />

                            {/* Nacionalidades */}
                            <AccordionItem value="nacionalidades">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <Flag className="h-5 w-5 text-primary" />
                                        <div className="text-left">
                                            <p className="font-semibold">Nacionalidades</p>
                                            <p className="text-sm text-muted-foreground">
                                                {data.nacionalidades.length} nacionalidades disponibles
                                            </p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="pt-4 space-y-2">
                                        {data.nacionalidades.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {data.nacionalidades.map((nacionalidad) => (
                                                    <Card key={nacionalidad.iud} className="border-border/40">
                                                        <CardContent className="p-4">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1">
                                                                    <p className="font-semibold text-sm">{nacionalidad.Nacionalidad}</p>
                                                                    <Badge variant="secondary" className="mt-2 text-xs">
                                                                        {nacionalidad.siglaNaciona}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-2 font-mono">
                                                                ID: {nacionalidad.iud}
                                                            </p>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                No hay nacionalidades disponibles
                                            </p>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <Separator />

                            {/* Prefijos Telefónicos */}
                            <AccordionItem value="prefijos">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-5 w-5 text-primary" />
                                        <div className="text-left">
                                            <p className="font-semibold">Prefijos Telefónicos</p>
                                            <p className="text-sm text-muted-foreground">
                                                {data.prefijos.length} prefijos disponibles
                                            </p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="pt-4 space-y-2">
                                        {data.prefijos.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                                {data.prefijos.map((prefijo) => (
                                                    <Card key={prefijo.iud} className="border-border/40">
                                                        <CardContent className="p-4 text-center">
                                                            <p className="font-bold text-2xl text-primary">
                                                                {prefijo.prefijoTelefonicoPais}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground mt-2 font-mono">
                                                                ID: {prefijo.iud}
                                                            </p>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                No hay prefijos disponibles
                                            </p>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            <Separator />

                            {/* Países, Departamentos y Ciudades */}
                            <AccordionItem value="ubicaciones">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <MapPin className="h-5 w-5 text-primary" />
                                        <div className="text-left">
                                            <p className="font-semibold">Ubicaciones (País, Departamentos y Ciudades)</p>
                                            <p className="text-sm text-muted-foreground">
                                                {data.locationData ? `${data.locationData.departamentos.length} departamentos` : 'No disponible'}
                                            </p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="pt-4 space-y-4">
                                        {data.locationData ? (
                                            <>
                                                {/* País */}
                                                <div>
                                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                                                        <Globe className="h-4 w-4" />
                                                        País
                                                    </h3>
                                                    <Card className="border-primary/20">
                                                        <CardContent className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                                                    <Globe className="h-6 w-6 text-primary" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-lg">{data.locationData.pais.nombre_pais}</p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <Badge variant="secondary" className="text-xs">
                                                                            {data.locationData.pais.codigoISO2}
                                                                        </Badge>
                                                                        <span className="text-xs text-muted-foreground font-mono">
                                                                            ID: {data.locationData.pais.Id}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </div>

                                                {/* Departamentos y Ciudades */}
                                                <div>
                                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                                                        <MapPin className="h-4 w-4" />
                                                        Departamentos y Ciudades
                                                    </h3>
                                                    <Accordion type="single" collapsible className="w-full space-y-2">
                                                        {data.locationData.departamentos.map((departamento) => (
                                                            <AccordionItem 
                                                                key={departamento.departamentoId} 
                                                                value={departamento.departamentoId}
                                                                className="border border-border rounded-lg px-4"
                                                            >
                                                                <AccordionTrigger className="hover:no-underline">
                                                                    <div className="flex items-center justify-between w-full pr-4">
                                                                        <span className="font-semibold">
                                                                            Departamento ID: {departamento.departamentoId}
                                                                        </span>
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {departamento.ciudades.length} ciudades
                                                                        </Badge>
                                                                    </div>
                                                                </AccordionTrigger>
                                                                <AccordionContent>
                                                                    <div className="pt-2 space-y-2">
                                                                        <p className="text-sm text-muted-foreground">
                                                                            Código Postal: <span className="font-mono">{departamento.codigo_postal}</span>
                                                                        </p>
                                                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-3">
                                                                            {departamento.ciudades.map((ciudad) => (
                                                                                <div 
                                                                                    key={ciudad.ciudadId}
                                                                                    className="p-3 bg-muted/30 rounded-lg border border-border/40"
                                                                                >
                                                                                    <p className="text-sm font-medium">{ciudad.nombre_ciudad}</p>
                                                                                    <p className="text-xs text-muted-foreground font-mono mt-1">
                                                                                        ID: {ciudad.ciudadId}
                                                                                    </p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                        ))}
                                                    </Accordion>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                No hay datos de ubicación disponibles
                                            </p>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                        </Accordion>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}

export default Parametrizacion;
