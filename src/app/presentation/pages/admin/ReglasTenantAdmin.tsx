import { ReglasTenantGlobalesLista, ReglasTenantGlobalOperaciones } from './ReglasTenantGlobal';
import { ReglasTenantSuperAdminOperaciones } from './ReglasTenantSuperAdmin';

/**
 * Hub admin: lista de **tenant globales**, operaciones de reglas **por tenant global**, y bloque **individual** para
 * **tenant super admin (DIOS)**.
 */
export default function ReglasTenantAdmin() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-4 md:p-6">
      <ReglasTenantGlobalesLista />
      <ReglasTenantGlobalOperaciones />
      <ReglasTenantSuperAdminOperaciones />
    </div>
  );
}
