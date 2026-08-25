import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useTenantUsuarios } from '@/app/hooks/useTenantUsuarios';
import { TenantGobernanzaCentroModal } from '@/app/presentation/components/admin/usuarios-tenant/TenantGobernanzaCentroModal';
import { UsuariosTenantJerarquiaListadoModal } from '@/app/presentation/components/admin/usuarios-tenant/UsuariosTenantJerarquiaListadoModal';
import { UsuariosRolCorporativoListadoModal } from '@/app/presentation/components/admin/usuarios-tenant/UsuariosRolCorporativoListadoModal';
import { RolesTgModal } from '@/app/presentation/components/admin/usuarios-tenant/RolesTgModal';
import { RolesGlobalesModal } from '@/app/presentation/components/admin/usuarios-tenant/RolesGlobalesModal';
import { RolesCorporativosModal } from '@/app/presentation/components/admin/usuarios-tenant/RolesCorporativosModal';

type Vista = 'centro' | 'usuarios' | 'corporativos' | 'roles-globales' | 'roles-tg' | 'roles-corporativos';

export default function TenantGobernanzaCentroPage(): React.ReactElement {
  const navigate = useNavigate();
  const { jerarquia, loadingJerarquia, errorJerarquia } = useTenantUsuarios();
  const [vista, setVista] = useState<Vista>('centro');
  const volver = (): void => setVista('centro');

  if (loadingJerarquia) {
    return <div className="flex min-h-[55vh] items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Cargando gobernanza Tenant…</div>;
  }
  if (errorJerarquia || !jerarquia?.scope) {
    return <div className="mx-auto mt-10 max-w-lg rounded-lg border border-destructive/40 p-5 text-sm text-destructive">No fue posible cargar el alcance de gobernanza Tenant.</div>;
  }

  return (
    <>
      <TenantGobernanzaCentroModal
        open={vista === 'centro'}
        embedded
        onClose={() => navigate(-1)}
        scope={jerarquia.scope}
        resumen={{ superAdmins: jerarquia.superAdmins.length, tenantGlobales: jerarquia.tenantsGlobales.length, usuariosCorporativos: jerarquia.usuariosRolCorporativo?.length ?? 0 }}
        onAbrirUsuariosJerarquia={() => setVista('usuarios')}
        onAbrirUsuariosCorporativos={() => setVista('corporativos')}
        onAbrirRolesGlobales={() => setVista('roles-globales')}
        onAbrirRolesTg={() => setVista('roles-tg')}
        onAbrirRolesCorporativos={() => setVista('roles-corporativos')}
      />
      <UsuariosTenantJerarquiaListadoModal open={vista === 'usuarios'} onClose={volver} />
      <UsuariosRolCorporativoListadoModal open={vista === 'corporativos'} onClose={volver} />
      <RolesGlobalesModal open={vista === 'roles-globales'} onClose={volver} scope={jerarquia.scope} />
      <RolesTgModal open={vista === 'roles-tg'} onClose={volver} />
      <RolesCorporativosModal open={vista === 'roles-corporativos'} onClose={volver} />
    </>
  );
}
