import React from 'react';
import { Building2, KeyRound, ShieldCheck } from 'lucide-react';
import type { EndpointSection, HttpMethod } from './parametrosGobernanzaTypes';

export const METHOD_STYLE: Record<HttpMethod, string> = {
  GET: 'bg-sky-50 text-sky-700 border-sky-200',
  POST: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PUT: 'bg-amber-50 text-amber-700 border-amber-200',
  DELETE: 'bg-red-50 text-red-600 border-red-200',
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
