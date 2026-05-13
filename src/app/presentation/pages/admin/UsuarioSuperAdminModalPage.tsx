import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantUsuarios } from '@/app/hooks/useTenantUsuarios';
import { UsuarioSuperAdminModal } from '@/app/presentation/components/admin/usuarios-tenant/UsuarioSuperAdminModal';
import { useAuth } from '@/app/providers/AuthProvider';

/**
 * Página envoltorio cuando la ruta en BD usa el nombre del modal como componente.
 * Sin esto, el modal monta con open=undefined → diálogo cerrado → pantalla vacía.
 */
export default function UsuarioSuperAdminModalPage(): React.ReactElement {
    const navigate = useNavigate();
    const { token } = useAuth();
    const {
        crearUsuarioSuperAdmin,
        isCreatingSuperAdmin,
        errorCrearSuperAdmin,
        sincronizarGlobalCanReferirUsuarios,
        isSincronizandoGlobalCanReferir,
        errorSincronizarGlobalCanReferir,
    } = useTenantUsuarios();

    const handleClose = (): void => {
        if (window.history.length > 1) navigate(-1);
        else navigate('/admin');
    };

    return (
        <UsuarioSuperAdminModal
            open
            renderMode="page"
            onClose={handleClose}
            onSubmit={crearUsuarioSuperAdmin}
            isSubmitting={isCreatingSuperAdmin}
            submitError={errorCrearSuperAdmin}
            scope="SUPER_ADMIN"
            onSincronizarGlobalCanReferir={token ? sincronizarGlobalCanReferirUsuarios : undefined}
            isSincronizandoGlobal={isSincronizandoGlobalCanReferir}
            sincronizarGlobalError={errorSincronizarGlobalCanReferir}
        />
    );
}
