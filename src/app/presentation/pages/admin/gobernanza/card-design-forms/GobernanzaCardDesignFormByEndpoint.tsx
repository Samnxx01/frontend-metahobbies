import React from 'react';
import { EndpointCapabilityInventory } from './EndpointCapabilityInventory';
import type { GobernanzaEndpointDesignFormProps } from './types';
import { GobernanzaCardDesignFormGeneric } from './GobernanzaCardDesignFormGeneric';
import { TenantActualizarGlobalDesignForm } from './TenantActualizarGlobalDesignForm';
import { TenantCrearGlobalUsuarioDesignForm } from './TenantCrearGlobalUsuarioDesignForm';
import { TenantDesactivarGlobalDesignForm } from './TenantDesactivarGlobalDesignForm';
import { TenantEliminarGlobalDesignForm } from './TenantEliminarGlobalDesignForm';
import { TenantListarLibresTenantglobalDesignForm } from './TenantListarLibresTenantglobalDesignForm';

const REGISTRY: Record<string, React.ComponentType<GobernanzaEndpointDesignFormProps>> = {
  'tenant-crear-global-usuario': TenantCrearGlobalUsuarioDesignForm,
  'tenant-listar-libres-tenantglobal': TenantListarLibresTenantglobalDesignForm,
  'tenant-actualizar-global': TenantActualizarGlobalDesignForm,
  'tenant-desactivar-global': TenantDesactivarGlobalDesignForm,
  'tenant-eliminar-global': TenantEliminarGlobalDesignForm,
};

/**
 * Resuelve el formulario de diseño según `endpoint.id`: un componente por endpoint catalogado.
 */
export function GobernanzaCardDesignFormByEndpoint(props: GobernanzaEndpointDesignFormProps): React.ReactElement {
  const Form = REGISTRY[props.endpoint.id] ?? GobernanzaCardDesignFormGeneric;
  return (
    <div className="space-y-6">
      {props.capabilities ? <EndpointCapabilityInventory capabilities={props.capabilities} /> : null}
      <Form {...props} />
    </div>
  );
}
