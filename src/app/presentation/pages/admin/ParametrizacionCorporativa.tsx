import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import RepresentanteEmpresarial from './RepresentanteEmpresarial';
import SociedadesCorporativas from './SociedadesCorporativas';
import DireccionCorporativa from './DireccionCorporativa';
import DocumentosCorporativos from './DocumentosCorporativos';
import LogosCorporativos from './LogosCorporativos';
import SectorIndustriaEmpresa from './SectorIndustriaEmpresa';
import PerfilCorporativo from './PerfilCorporativo';
import DesactivarRepresentante from './DesactivarRepresentante';
import { apiFetch } from '../../../services/api';
import { Loader2 } from 'lucide-react';

export default function ParametrizacionCorporativa() {
  const [representanteId, setRepresentanteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchId = async () => {
      try {
        const res = await apiFetch('/api/configuracion/listar/user/coporativo/perfil/publico', { method: 'GET' });
        if (res?.ok && res.perfil?.representante_empresarial) {
          const id = res.perfil.representante_empresarial._id || res.perfil.representante_empresarial.id;
          setRepresentanteId(id);
        }
      } catch (error) {
        console.error("Error obteniendo ID del representante:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchId();
  }, []);

  return (
    <Tabs defaultValue="representante" className="w-full">
      <div className="w-full flex flex-col items-center">
        <TabsList className="flex flex-wrap w-full max-w-[80vw] md:max-w-[80%] gap-2 justify-center mb-4 min-h-[88px] md:min-h-[44px]">
          <TabsTrigger value="representante">Representante Empresarial</TabsTrigger>
          <TabsTrigger value="sociedades">Sociedades Corporativas</TabsTrigger>
          <TabsTrigger value="direccion">Dirección Corporativa</TabsTrigger>
          <TabsTrigger value="documentos">Documentos Corporativos</TabsTrigger>
          <TabsTrigger value="logos">Logos Corporativos</TabsTrigger>
          <TabsTrigger value="sector">Sector/Industria Empresa</TabsTrigger>
          <TabsTrigger value="perfil">Perfil Corporativo</TabsTrigger>
          <TabsTrigger value="config" className="text-destructive">Desactivar Representante</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="representante">
        <RepresentanteEmpresarial />
      </TabsContent>
      <TabsContent value="sociedades">
        <SociedadesCorporativas />
      </TabsContent>
      <TabsContent value="direccion">
        <DireccionCorporativa />
      </TabsContent>
      <TabsContent value="documentos">
        <DocumentosCorporativos />
      </TabsContent>
      <TabsContent value="logos">
        <LogosCorporativos />
      </TabsContent>
      <TabsContent value="sector">
        <SectorIndustriaEmpresa />
      </TabsContent>
      <TabsContent value="perfil">
        <PerfilCorporativo />
      </TabsContent>
      <TabsContent value="config">
        <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-card space-y-4 shadow-sm">
          <h3 className="text-xl font-bold">Zona Peligrosa</h3>
          <p className="text-muted-foreground text-sm text-center max-w-md">
            Si desactivas este perfil, se realizará una eliminación lógica del representante legal en el sistema.
          </p>

          {loading ? (
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
          ) : representanteId ? (
            <DesactivarRepresentante
              idRepresentante={representanteId}
              onSuccess={() => setRepresentanteId(null)}
            />
          ) : (
            <p className="text-amber-600 text-sm font-medium bg-amber-50 p-3 rounded-md">
              No se encontró un representante legal activo para desactivar.
            </p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

