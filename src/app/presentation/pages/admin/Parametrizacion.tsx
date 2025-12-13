import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/app/services/api';
import { toast } from 'react-toastify';

// Shadcn UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';

// Lucide icons
import { Loader2, Settings, FileText, User, Globe, Phone, Flag, MapPin } from 'lucide-react';

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
