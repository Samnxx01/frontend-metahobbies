import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import RepresentanteEmpresarial from './RepresentanteEmpresarial';
import SociedadesCorporativas from './SociedadesCorporativas';
import DireccionCorporativa from './DireccionCorporativa';
import DocumentosCorporativos from './DocumentosCorporativos';
import LogosCorporativos from './LogosCorporativos';
import SectorIndustriaEmpresa from './SectorIndustriaEmpresa';
import PerfilCorporativo from './PerfilCorporativo';

export default function ParametrizacionCorporativa() {
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
    </Tabs>
  );
}
