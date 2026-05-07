import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown } from 'lucide-react';
import { ParametrosGobernanzaWithRouting } from './gobernanza';

/** Solo reglas DIOS (plataforma). `tenant-listar-reglas` queda en `ReglasTenantGlobalOperaciones` para no duplicar. */
export const REGLAS_TENANT_SUPER_ADMIN_IDS = ['tenant-crear-dios-reglas', 'tenant-actualizar-dios-reglas'];

/**
 * Panel de operaciones de reglas a nivel **tenantSuperAdmin (DIOS)**.
 * No incluye crear/actualizar reglas por tenant global concreto (eso va en `ReglasTenantGlobalOperaciones`).
 */
export function ReglasTenantSuperAdminOperaciones() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Crown className="h-5 w-5 text-amber-600" />
          Reglas tenant super admin (DIOS)
        </CardTitle>
        <CardDescription>
          Crear o actualizar la regla de plataforma (DIOS). Para listar reglas usa el bloque «tenant global» arriba.
          Requiere sesión SuperAdmin.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0 pt-2">
        <ParametrosGobernanzaWithRouting
          mode="full"
          initialSection="tenant"
          lockedSection="tenant"
          allowedEndpointIds={REGLAS_TENANT_SUPER_ADMIN_IDS}
        />
      </CardContent>
    </Card>
  );
}

/** Página dedicada solo al flujo SuperAdmin (DIOS). */
export default function ReglasTenantSuperAdmin() {
  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <ReglasTenantSuperAdminOperaciones />
    </div>
  );
}
