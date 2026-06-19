import React from 'react';

import { GobernanzaFormularioPorRuta } from '../GobernanzaFormularioPorRuta';

import { ReglasActualizarDiosForm } from './ReglasActualizarDiosForm';
import { ReglasActualizarGlobalForm } from './ReglasActualizarGlobalForm';
import { ReglasCrearDiosForm } from './ReglasCrearDiosForm';
import { ReglasCrearGlobalForm } from './ReglasCrearGlobalForm';
import { ReglasDesactivarGlobalForm } from './ReglasDesactivarGlobalForm';
import { ReglasEliminarDiosForm } from './ReglasEliminarDiosForm';
import { ReglasEliminarGlobalForm } from './ReglasEliminarGlobalForm';
import { ReglasListarDiosForm } from './ReglasListarDiosForm';
import { ReglasListarTenantForm } from './ReglasListarTenantForm';
import type { GobernanzaReglasFormProps } from './types';

export const GOBERNANZA_REGLAS_FORM_REGISTRY: Record<
  string,
  React.ComponentType<GobernanzaReglasFormProps>
> = {
  ReglasListarTenantForm,
  ReglasCrearGlobalForm,
  ReglasActualizarGlobalForm,
  ReglasDesactivarGlobalForm,
  ReglasEliminarGlobalForm,
  ReglasCrearDiosForm,
  ReglasActualizarDiosForm,
  ReglasListarDiosForm,
  ReglasEliminarDiosForm,
  GobernanzaFormularioPorRuta: GobernanzaFormularioPorRuta as React.ComponentType<GobernanzaReglasFormProps>,
};

export const GOBERNANZA_REGLAS_FORM_BY_ENDPOINT: Record<
  string,
  React.ComponentType<GobernanzaReglasFormProps>
> = {
  'tenant-listar-reglas': ReglasListarTenantForm,
  'tenant-crear-global-reglas': ReglasCrearGlobalForm,
  'tenant-actualizar-global-reglas': ReglasActualizarGlobalForm,
  'tenant-desactivar-global-reglas': ReglasDesactivarGlobalForm,
  'tenant-eliminar-global-reglas': ReglasEliminarGlobalForm,
  'tenant-crear-dios-reglas': ReglasCrearDiosForm,
  'tenant-actualizar-dios-reglas': ReglasActualizarDiosForm,
  'tenant-listar-dios-reglas': ReglasListarDiosForm,
  'tenant-eliminar-dios-reglas': ReglasEliminarDiosForm,
};

export function resolverReglasFormComponent(
  formularioComponent?: string | null
): React.ComponentType<GobernanzaReglasFormProps> | null {
  const key = String(formularioComponent || '').trim();
  if (!key || key === 'GobernanzaReglasFormByEndpoint') return null;
  return GOBERNANZA_REGLAS_FORM_REGISTRY[key] ?? null;
}

export function resolverReglasFormPorEndpoint(
  endpointId?: string | null
): React.ComponentType<GobernanzaReglasFormProps> | null {
  const key = String(endpointId || '').trim();
  if (!key) return null;
  return GOBERNANZA_REGLAS_FORM_BY_ENDPOINT[key] ?? null;
}
