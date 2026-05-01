import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantUsuarios } from '@/app/hooks/useTenantUsuarios';
import { UsuarioGlobalModal } from '@/app/presentation/components/admin/usuarios-tenant/UsuarioGlobalModal';
import type { TenantGlobalInfo } from '@/app/services/tenantUsuariosService';

/**
 * @see UsuarioSuperAdminModalPage — mismo motivo (ruta BD → modal sin props).
 */
export default function UsuarioGlobalModalPage(): React.ReactElement {
    const navigate = useNavigate();
    const [open, setOpen] = useState(true);
    const {
        jerarquia,
        crearUsuarioGlobal,
        isCreatingGlobal,
        errorCrearGlobal,
        sincronizarCanReferirUsuarios,
        isSincronizandoCanReferir,
        errorSincronizarCanReferir,
    } = useTenantUsuarios();

    const scope = jerarquia?.scope ?? 'SUPER_ADMIN';
    const tenantsGlobales: TenantGlobalInfo[] = (jerarquia?.tenantsGlobales ?? [])
        .map((tg) => tg.tenantGlobal)
        .filter((tg): tg is TenantGlobalInfo => tg !== null);

    const sincronizarGlobal = async (canReferir: boolean): Promise<any> => {
        const tenantGlobalId = jerarquia?.tenantsGlobales[0]?.tenantGlobal?.iud;
        if (!tenantGlobalId) throw new Error('No se pudo determinar el tenant global');
        return sincronizarCanReferirUsuarios({ tenantGlobalId, canReferir });
    };

    const handleClose = (): void => {
        setOpen(false);
        if (window.history.length > 1) navigate(-1);
        else navigate('/admin');
    };

    return (
        <div className="min-h-[40vh] bg-background p-4">
            <UsuarioGlobalModal
                open={open}
                onClose={handleClose}
                onSubmit={crearUsuarioGlobal}
                isSubmitting={isCreatingGlobal}
                submitError={errorCrearGlobal}
                tenantsGlobales={tenantsGlobales}
                scope={scope as 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO'}
                onSincronizarCanReferir={scope === 'TENANT_GLOBAL' ? sincronizarGlobal : undefined}
                isSincronizando={isSincronizandoCanReferir}
                sincronizarError={errorSincronizarCanReferir}
            />
        </div>
    );
}
