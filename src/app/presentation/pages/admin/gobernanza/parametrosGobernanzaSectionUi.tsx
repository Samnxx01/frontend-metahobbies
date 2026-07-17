import React from 'react';
import { Building2, KeyRound, ShieldCheck } from 'lucide-react';
import type { EndpointSection, HttpMethod } from './parametrosGobernanzaTypes';

export const METHOD_STYLE: Record<HttpMethod, string> = {
  GET: 'bg-info/10 text-info border-info/20',
  POST: 'bg-success/10 text-success border-success/20',
  PUT: 'bg-warning/10 text-warning border-warning/20',
  DELETE: 'bg-destructive/10 text-destructive border-destructive/20',
};

export const SECTION_META: Record<
  EndpointSection,
  { label: string; description: string; icon: React.ElementType }
> = {
  tenant: {
    label: 'Gobernanza Tenant',
    description: 'Tenants, reglas y jerarquia visible.',
    icon: ShieldCheck,
  },
  permisos: {
    label: 'Gobernanza Permisos',
    description: 'Herencias, vistas y acciones por alcance.',
    icon: KeyRound,
  },
  corporativo: {
    label: 'Gobernanza Corporativo',
    description: 'Catalogos, roles y niveles corporativos.',
    icon: Building2,
  },
  reglas: {
    label: 'Gobernanza Reglas',
    description: 'Reglas de jerarquia por tenant global.',
    icon: ShieldCheck,
  },
};
