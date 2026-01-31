import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Building2, Users, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';

interface SectorEmpresa {
  _id: string;
  sector_empresarial: string;
  numero_empleados: number;
  estado: boolean;
  usuCreacion?: string;
  fechaCreacion?: string;
}

interface RepresentanteLegal {
  nombre_representante_legal: string;
  cargo_representante_legal: string;
}

interface TipoSociedad {
  nombre: string;
  descripcion: string;
}

interface RegisUsuario {
  correo: string;
  rol: string;
}

interface PerfilEmpresa {
  _id: string;
  razon_social: string;
  estado: boolean;
  represeLegaEmpresa: RepresentanteLegal;
  tipo_sociedad: TipoSociedad;
  direccion_empresa_relacion?: Record<string, any>;
  regisUsuario: RegisUsuario;
}

const SectorIndustriaEmpresa = () => {
  const [perfiles, setPerfiles] = useState<PerfilEmpresa[]>([]);
  const [sectorExistente, setSectorExistente] = useState<SectorEmpresa | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ sector_empresarial: '', numero_empleados: '' });
  const [formLoading, setFormLoading] = useState(false);

  // 🔍 CARGAR SECTOR EXISTENTE
  const fetchSectorEmpresarial = async () => {
    console.log('🔄 Intentando cargar sector empresarial...');
    try {
      const data = await apiFetch('/api/configuracion/listar/sectores/sociedades', {
        method: 'GET'
      });

      console.log('✅ Respuesta de sectores empresariales:', data);

      if (data?.sectores && Array.isArray(data.sectores) && data.sectores.length > 0) {
        const sector = data.sectores[0];
        setSectorExistente(sector);
      } else if (data?.sector) {
        setSectorExistente(data.sector);
      } else {
        setSectorExistente(null);
      }
    } catch (err: any) {
      console.error('❌ Error al cargar sector:', err);
      setSectorExistente(null);
    }
  };

  // 🔍 CARGAR PERFILES CORPORATIVOS (Tipos de Sociedad)
  const fetchPerfiles = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/configuracion/listar/sectores/sociedades', {
        method: 'GET'
      });

      if (data?.sectores && Array.isArray(data.sectores)) {
        setPerfiles(data.sectores);
      } else if (data?.data && Array.isArray(data.data)) {
        setPerfiles(data.data);
      } else if (Array.isArray(data)) {
        setPerfiles(data);
      } else {
        setPerfiles([]);
      }
    } catch (err: any) {
      console.error('❌ Error al cargar datos:', err);
      console.error('❌ Mensaje de error:', err.message);
      toast.error('Error al cargar información corporativa');
      setPerfiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSectorEmpresarial();
    fetchPerfiles();
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setFormLoading(true);
    try {
      const payload = {
        sector_empresarial: form.sector_empresarial.trim(),
        numero_empleados: Number(form.numero_empleados),
      };

      const res = await apiFetch('/api/configuracion/parametrizacion/sector-industria-empresa', {
        method: 'POST',
        body: payload,
      });

      toast.success('✅ Sector empresarial registrado correctamente');
      setForm({ sector_empresarial: '', numero_empleados: '' });

      await fetchSectorEmpresarial();
      await fetchPerfiles();
    } catch (err: any) {
      console.error('❌ Error al guardar sector:', err);

      if (err.message?.includes('Ya tienes registrado')) {
        toast.error('Ya tienes un sector empresarial registrado');
        await fetchSectorEmpresarial();
      } else {
        toast.error(err.message || 'Error al guardar sector empresarial');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const yaExisteSector = !!sectorExistente;

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      {/* SECCIÓN DE REGISTRO/VISUALIZACIÓN DE SECTOR */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Sector e Industria de la Empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sectorExistente ? (
            /* MOSTRAR SECTOR EXISTENTE */
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4 border">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-lg">Sector Registrado</h3>
                  </div>
                  {sectorExistente.estado && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Activo
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">
                      Sector Empresarial
                    </label>
                    <div className="p-3 bg-white border rounded">
                      {sectorExistente.sector_empresarial}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Número de Empleados
                    </label>
                    <div className="p-3 bg-white border rounded font-semibold">
                      {sectorExistente.numero_empleados}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground text-center">
                Ya tienes un sector empresarial registrado. Contacta al administrador para modificarlo.
              </div>
            </div>
          ) : (
            /* FORMULARIO DE REGISTRO */
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Sector Empresarial *
                  </label>
                  <Input
                    name="sector_empresarial"
                    value={form.sector_empresarial}
                    onChange={handleFormChange}
                    placeholder="Ej: Tecnología y software"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Número de Empleados *
                  </label>
                  <Input
                    name="numero_empleados"
                    value={form.numero_empleados}
                    onChange={handleFormChange}
                    placeholder="Ej: 120"
                    type="number"
                    min="1"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-auto"
                disabled={formLoading || yaExisteSector}
              >
                {formLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Guardando...
                  </>
                ) : (
                  'Registrar Sector Empresarial'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* SECCIÓN DE PERFILES CORPORATIVOS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sectores Empresariales Registrados</span>
            {!loading && perfiles.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {perfiles.length} {perfiles.length === 1 ? 'sector' : 'sectores'}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
          ) : perfiles.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No hay sectores empresariales registrados</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {perfiles.map((sector: any) => (
                <Card key={sector._id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">{sector.sector_empresarial}</h3>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">{sector.numero_empleados} empleados</span>
                        </div>
                      </div>
                      {sector.estado ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      )}
                    </div>

                    {sector.createdAt && (
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        Registrado: {new Date(sector.createdAt).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SectorIndustriaEmpresa;