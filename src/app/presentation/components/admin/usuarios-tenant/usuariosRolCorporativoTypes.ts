import type { HerenciaClienteRelacion } from '@/app/modules/afiliado-permisos/types/marco.types';
import type { TenantUsuario } from '@/app/services/tenantUsuariosService';

export interface UsuarioRolCorporativoItem extends TenantUsuario {
    origen: 'TENANT_CORPORATIVO' | 'PLATAFORMA_GLOBAL';
    tenantCorporativoId: string | null;
    permisosClientePendiente?: boolean;
    marcoAfiliadoSeqAplicada?: number | null;
    herenciaCliente?: HerenciaClienteRelacion | null;
}

export interface ListadoUsuariosRolCorporativoResponse {
    scope: string | null;
    total: number;
    resumen: {
        enTenantCorporativo: number;
        plataformaGlobal: number;
        enColumnaOrganigrama: number;
    };
    usuarios: UsuarioRolCorporativoItem[];
}
