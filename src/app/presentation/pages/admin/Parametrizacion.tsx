import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { BrandingConfig, obtenerBrandingPrivado } from '@/app/services/brandingWidget';
import { toast } from 'react-toastify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { FileText, User, Globe, Phone, Flag, MapPin, Loader2, Settings } from 'lucide-react';

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
  naciondalidadss: string;
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
  nombre_Dapartamento: string;
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

interface SectionConfig {
  enabled: boolean;
  title: string;
}

interface ParametrizacionSistemaConfig {
  headerTitle: string;
  headerSubtitle: string;
  catalogTitle: string;
  sections: {
    tiposDocumento: SectionConfig;
    generos: SectionConfig;
    nacionalidades: SectionConfig;
    prefijos: SectionConfig;
    ubicaciones: SectionConfig;
  };
}

const DEFAULT_CONFIG: ParametrizacionSistemaConfig = {
  headerTitle: 'Parametrizacion del Sistema',
  headerSubtitle: 'Configuracion de catalogos y parametros del sistema',
  catalogTitle: 'Catalogos del Sistema',
  sections: {
    tiposDocumento: { enabled: true, title: 'Tipos de Documento' },
    generos: { enabled: true, title: 'Generos' },
    nacionalidades: { enabled: true, title: 'Nacionalidades' },
    prefijos: { enabled: true, title: 'Prefijos Telefonicos' },
    ubicaciones: { enabled: true, title: 'Ubicaciones (Pais, Departamentos y Ciudades)' }
  }
};

const mergeConfig = (incoming?: Partial<ParametrizacionSistemaConfig>): ParametrizacionSistemaConfig => {
  if (!incoming) return DEFAULT_CONFIG;
  return {
    ...DEFAULT_CONFIG,
    ...incoming,
    sections: {
      ...DEFAULT_CONFIG.sections,
      ...(incoming.sections || {})
    }
  };
};

function Parametrizacion(): React.ReactElement {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewConfig, setViewConfig] = useState<ParametrizacionSistemaConfig>(DEFAULT_CONFIG);
  const [data, setData] = useState<ParametrizacionData>({
    tiposDocumento: [],
    generos: [],
    nacionalidades: [],
    prefijos: [],
    locationData: null
  });

  useEffect(() => {
    fetchParametrizacion();
  }, []);

  const fetchParametrizacion = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

      const [
        tiposDocResponse,
        generosResponse,
        nacionalidadesResponse,
        prefijosResponse,
        locationResponse,
        brandingResponse
      ] = await Promise.all([
        apiFetch(`${API_BASE_URL}/perfil/seguridad/tipo/documentos`, { method: 'GET' }),
        apiFetch(`${API_BASE_URL}/perfil/seguridad/listar/tipo/genero`, { method: 'GET' }),
        apiFetch(`${API_BASE_URL}/perfil/seguridad/listar/tipo/nacionalidad`, { method: 'GET' }),
        apiFetch(`${API_BASE_URL}/perfil/seguridad/listar/tipo/prefijo`, { method: 'GET' }),
        apiFetch(`${API_BASE_URL}/perfil/seguridad/listar/paises/departamentos/ciudades?paisId=1`, { method: 'GET' }),
        obtenerBrandingPrivado()
      ]);

      const branding = (brandingResponse || {}) as BrandingConfig;
      const parametrizacionWidget = (branding.widgets as Record<string, unknown> | undefined)
        ?.parametrizacionSistema as Partial<ParametrizacionSistemaConfig> | undefined;
      setViewConfig(mergeConfig(parametrizacionWidget));

      setData({
        tiposDocumento: tiposDocResponse?.tipos || [],
        generos: generosResponse?.generos || [],
        nacionalidades: nacionalidadesResponse?.nacionalidades || [],
        prefijos: prefijosResponse?.prefijos || [],
        locationData: locationResponse?.ok
          ? {
              pais: locationResponse.pais,
              departamentos: locationResponse.departamentos
            }
          : null
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar parametrizacion';
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
          <p className="font-semibold">Error al cargar parametrizacion</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            {viewConfig.headerTitle}
          </h1>
          <p className="text-muted-foreground mt-2">{viewConfig.headerSubtitle}</p>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">{viewConfig.catalogTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {viewConfig.sections.tiposDocumento.enabled && (
                <>
                  <AccordionItem value="tipos-documento">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <p className="font-semibold">{viewConfig.sections.tiposDocumento.title}</p>
                          <p className="text-sm text-muted-foreground">{data.tiposDocumento.length} tipos disponibles</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {data.tiposDocumento.map((tipo) => (
                          <Card key={tipo.iud} className="border-border/40">
                            <CardContent className="p-4">
                              <p className="font-semibold text-sm">{tipo.nombreDocumento}</p>
                              <Badge variant="secondary" className="mt-2 text-xs">{tipo.tipos}</Badge>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <Separator />
                </>
              )}

              {viewConfig.sections.generos.enabled && (
                <>
                  <AccordionItem value="generos">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <p className="font-semibold">{viewConfig.sections.generos.title}</p>
                          <p className="text-sm text-muted-foreground">{data.generos.length} generos disponibles</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {data.generos.map((genero) => (
                          <Card key={genero.id} className="border-border/40">
                            <CardContent className="p-4">
                              <p className="font-semibold text-sm">{genero.nombre_genero}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <Separator />
                </>
              )}

              {viewConfig.sections.nacionalidades.enabled && (
                <>
                  <AccordionItem value="nacionalidades">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Flag className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <p className="font-semibold">{viewConfig.sections.nacionalidades.title}</p>
                          <p className="text-sm text-muted-foreground">{data.nacionalidades.length} nacionalidades disponibles</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {data.nacionalidades.map((n) => (
                          <Card key={n.iud} className="border-border/40">
                            <CardContent className="p-4">
                              <p className="font-semibold text-sm">{n.siglaNaciona}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <Separator />
                </>
              )}

              {viewConfig.sections.prefijos.enabled && (
                <>
                  <AccordionItem value="prefijos">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <p className="font-semibold">{viewConfig.sections.prefijos.title}</p>
                          <p className="text-sm text-muted-foreground">{data.prefijos.length} prefijos disponibles</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {data.prefijos.map((p) => (
                          <Card key={p.iud} className="border-border/40">
                            <CardContent className="p-4 text-center">
                              <p className="font-bold text-2xl text-primary">{p.prefijoTelefonicoPais}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <Separator />
                </>
              )}

              {viewConfig.sections.ubicaciones.enabled && (
                <AccordionItem value="ubicaciones">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div className="text-left">
                        <p className="font-semibold">{viewConfig.sections.ubicaciones.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.locationData ? `${data.locationData.departamentos.length} departamentos` : 'No disponible'}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {data.locationData ? (
                      <div className="pt-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Globe className="h-4 w-4" /> {data.locationData.pais.nombre_pais}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {data.locationData.departamentos.map((d) => (
                            <Card key={d.departamentoId} className="border-border/40">
                              <CardContent className="p-4">
                                <p className="font-semibold text-sm">Departamento {d.departamentoId}</p>
                                <p className="text-xs text-muted-foreground">{d.ciudades.length} ciudades</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No hay datos de ubicacion disponibles</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Parametrizacion;
