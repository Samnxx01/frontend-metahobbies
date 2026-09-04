import React from 'react';
import { ParametrosGobernanzaWithRouting } from '../';
import { TenantFormShell } from './TenantFormShell';
import type { GobernanzaTenantFormProps } from './types';

const ENDPOINT_IDS = ['tenant-superadmin-desactivar', 'tenant-superadmin-eliminar'];

export function TenantSuperAdminEstadoForm(props: GobernanzaTenantFormProps): React.ReactElement {
  if (!props.embeddedApiForm) {
    return (
      <ParametrosGobernanzaWithRouting
        mode="full"
        initialSection="tenant"
        lockedSection="tenant"
        allowedEndpointIds={ENDPOINT_IDS}
        singleFormInline
      />
    );
  }

  const esEliminar = props.endpoint?.id === 'tenant-superadmin-eliminar';
  return (
    <TenantFormShell
      {...props}
      eyebrow={esEliminar ? 'Eliminar tenantSuperAdmin' : 'Desactivar tenantSuperAdmin'}
      hint={
        esEliminar
          ? 'Elimina definitivamente un SA previamente desactivado y sin relaciones dependientes.'
          : 'Desactiva el SA seleccionado sin borrarlo. Solo se muestran SA dentro del alcance autorizado por el JWT.'
      }
    />
  );
}
