import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import RepresentanteEmpresarial from './RepresentanteEmpresarial';
import SociedadesCorporativas from './SociedadesCorporativas';
import DireccionCorporativa from './DireccionCorporativa';
import DocumentosCorporativos from './DocumentosCorporativos';
import LogosCorporativos from './LogosCorporativos';
import SectorIndustriaEmpresa from './SectorIndustriaEmpresa';
import PerfilCorporativo from './PerfilCorporativo';
import DesactivarPerfilCorporativo from './DesactivarPerfilCorporativo';
// import DesactivarRepresentante from './DesactivarRepresentante';
import { apiFetch } from '../../../services/api';
import { useAuth } from '@/app/providers/AuthProvider';
// import { Loader2 } from 'lucide-react';

type AccionHerencia = {
  method?: string;
  etiquetas?: string;
};

type HerenciaPermiso = {
  acciones?: AccionHerencia[];
};

const normalizePermissionKey = (value: unknown): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .trim()
    .toLowerCase();

const PERFIL_CORPORATIVO_ACTION_KEYS = new Set([
  'perfilcorporativo',
  'perfilcoporativo',
]);

export default function ParametrizacionCorporativa() {
  const { user } = useAuth();
  const normalizedRole = String(user?.role || user?.rol || '').toUpperCase();
  const isTenantSuperAdmin = normalizedRole === 'DIOS';
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('representante');
  const [canManagePerfilCorporativo, setCanManagePerfilCorporativo] = useState(isTenantSuperAdmin);

  useEffect(() => {
    let active = true;

    const resolvePerfilPermission = async () => {
      try {
        if (isTenantSuperAdmin) {
          if (active) setCanManagePerfilCorporativo(true);
          return;
        }

        const res = await apiFetch('/api/config/permisos/listar/usu/tenant/libres', {
          method: 'GET',
          useAuth: true
        }) as { ok?: boolean; herencias?: HerenciaPermiso[] } | null;

        const herencias = Array.isArray(res?.herencias) ? res.herencias : [];
        const hasPerfilAction = herencias.some((herencia) => {
          const acciones = Array.isArray(herencia?.acciones) ? herencia.acciones : [];
          return acciones.some((accion) => {
            const methodKey = normalizePermissionKey(accion?.method);
            const etiquetaKey = normalizePermissionKey(accion?.etiquetas);
            return PERFIL_CORPORATIVO_ACTION_KEYS.has(methodKey) || PERFIL_CORPORATIVO_ACTION_KEYS.has(etiquetaKey);
          });
        });

        if (active) setCanManagePerfilCorporativo(hasPerfilAction);
      } catch (error) {
        console.error('Error resolviendo permiso de Perfil Corporativo:', error);
        if (active) setCanManagePerfilCorporativo(isTenantSuperAdmin);
      } finally {
        if (active) setLoading(false);
      }
    };

    void resolvePerfilPermission();

    return () => {
      active = false;
    };
  }, [isTenantSuperAdmin]);

  useEffect(() => {
    if (!canManagePerfilCorporativo && activeTab === 'perfil') {
      setActiveTab('representante');
    }
  }, [activeTab, canManagePerfilCorporativo]);

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Cargando permisos...</div>;
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="w-full flex flex-col items-center">
        <TabsList className="flex flex-wrap w-full max-w-[80vw] md:max-w-[80%] gap-2 justify-center mb-4 min-h-[88px] md:min-h-[44px]">
          <TabsTrigger value="representante">Representante Empresarial</TabsTrigger>
          <TabsTrigger value="sociedades">Sociedades Corporativas</TabsTrigger>
          <TabsTrigger value="direccion">Dirección Corporativa</TabsTrigger>
          <TabsTrigger value="documentos">Documentos Corporativos</TabsTrigger>
          <TabsTrigger value="logos">Logos Corporativos</TabsTrigger>
          <TabsTrigger value="sector">Sector/Industria Empresa</TabsTrigger>
          {canManagePerfilCorporativo && (
            <TabsTrigger value="perfil">Perfil Corporativo</TabsTrigger>
          )}
          {isTenantSuperAdmin && (
            <TabsTrigger value="desactivar-perfil" className="text-destructive">
              Desactivar Perfil
            </TabsTrigger>
          )}
          {/* <TabsTrigger value="config" className="text-destructive">Desactivar Representante</TabsTrigger> */}
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
      {canManagePerfilCorporativo && (
        <TabsContent value="perfil">
          <PerfilCorporativo />
        </TabsContent>
      )}
      {isTenantSuperAdmin && (
        <TabsContent value="desactivar-perfil">
          <DesactivarPerfilCorporativo />
        </TabsContent>
      )}
      {/* <TabsContent value="config">
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
      </TabsContent> */}
    </Tabs>
  );
}

// PR hecho por Gustavo Pereira el 13-02-2026

