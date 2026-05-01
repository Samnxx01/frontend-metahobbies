import React from 'react';
import { Shield, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
            <Button size="sm" onClick={onCreateSuperAdmin}>
                <Shield className="h-4 w-4 mr-2" />
                Usuario SuperAdmin
            </Button>
        )}

        {(scope === 'SUPER_ADMIN' || scope === 'TENANT_GLOBAL') && (
            <Button size="sm" onClick={onCreateGlobal}>
                <UserPlus className="h-4 w-4 mr-2" />
                Usuario Global
            </Button>
        )}
    </>
);
