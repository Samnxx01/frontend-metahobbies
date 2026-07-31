import React from 'react';
import { Shield, UserPlus } from 'lucide-react';
import { GovernedButton, TENANT_USERS_ACTION_IDS } from '@/app/presentation/actions';

interface TenantUserActionButtonsProps {
    scope: 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO' | null;
    onCreateSuperAdmin: () => void;
    onCreateGlobal: () => void;
}

export const TenantUserActionButtons = ({
    scope,
    onCreateSuperAdmin,
    onCreateGlobal,
}: TenantUserActionButtonsProps): React.ReactElement => (
    <>
        {scope === 'SUPER_ADMIN' && (
            <GovernedButton actionId={TENANT_USERS_ACTION_IDS.CREATE_SUPER_ADMIN} className="w-full justify-center whitespace-normal text-center sm:w-auto" size="sm" onClick={onCreateSuperAdmin}>
                <Shield className="h-4 w-4 mr-2" />
                Usuario SuperAdmin
            </GovernedButton>
        )}

        {(scope === 'SUPER_ADMIN' || scope === 'TENANT_GLOBAL') && (
            <GovernedButton actionId={TENANT_USERS_ACTION_IDS.CREATE_GLOBAL} className="w-full justify-center whitespace-normal text-center sm:w-auto" size="sm" onClick={onCreateGlobal}>
                <UserPlus className="h-4 w-4 mr-2" />
                Usuario Global
            </GovernedButton>
        )}
    </>
);
