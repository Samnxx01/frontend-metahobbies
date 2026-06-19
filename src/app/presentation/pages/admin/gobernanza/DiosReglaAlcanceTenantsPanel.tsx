import React, { useEffect, useMemo } from 'react';

import {

  buildDiosReglaAlcancesPayload,

  getUsuariosParametrizablesSa,

  requiereSelectorUsuariosSa,

  type DiosReglaSaMeta,

} from './diosReglaAlcanceHelpers';

import { GobernanzaModuloDynamicMultiSelect } from './GobernanzaModuloDynamicMultiSelect';

import { formatSaTenantJerarquiaSelectLabel } from './SaJerarquiaUsuariosPanel';



type Props = {

  endpointId: string;

  disabled?: boolean;

  metas: DiosReglaSaMeta[];

  jwtSaId?: string;

  tenantsSel: string[];

  usuariosPorTenantSel: Record<string, string[]>;

  onTenantsChange: (endpointId: string, tenantIds: string[]) => void;

  onUsuariosChange: (endpointId: string, saId: string, userIds: string[]) => void;

  /** Dominio de plataforma por tenant SA (regla o UrlProduction). */
  resolveDominioSa?: (saId: string) => string;

};



export function DiosReglaAlcanceTenantsPanel({

  endpointId,

  disabled = false,

  metas,

  jwtSaId = '',

  tenantsSel,

  usuariosPorTenantSel,

  onTenantsChange,

  onUsuariosChange,

  resolveDominioSa,

}: Props): React.ReactElement {

  const metaById = useMemo(() => {

    const map = new Map(metas.map((m) => [String(m.id), m]));

    const jwtSa = String(jwtSaId || '').trim();

    if (jwtSa && !map.has(jwtSa)) {

      map.set(jwtSa, { id: jwtSa });

    }

    return map;

  }, [metas, jwtSaId]);



  const tenantOptions = useMemo(

    () =>

      Array.from(metaById.values()).map((meta) => ({

        value: String(meta.id),

        label: formatSaTenantJerarquiaSelectLabel(meta),

      })),

    [metaById],

  );

  const selectedTenants = useMemo(

    () => tenantsSel.map((id) => String(id || '').trim()).filter(Boolean),

    [tenantsSel],

  );

  const dominioAncla = useMemo(() => {
    if (!selectedTenants.length || !resolveDominioSa) return '';
    return resolveDominioSa(selectedTenants[0]);
  }, [selectedTenants, resolveDominioSa]);

  const tenantOptionsFiltradas = useMemo(() => {
    if (!resolveDominioSa || !dominioAncla || selectedTenants.length === 0) {
      return tenantOptions;
    }
    return tenantOptions.filter((o) => resolveDominioSa(o.value) === dominioAncla);
  }, [tenantOptions, resolveDominioSa, dominioAncla, selectedTenants.length]);



  useEffect(() => {

    if (disabled || !selectedTenants.length) return;

    for (const saId of selectedTenants) {

      const meta = metaById.get(saId);

      const usuarios = getUsuariosParametrizablesSa(meta);

      const current = usuariosPorTenantSel[saId] ?? [];

      if (usuarios.length === 1 && current[0] !== usuarios[0].id) {

        onUsuariosChange(endpointId, saId, [usuarios[0].id]);

      }

    }

  }, [

    disabled,

    endpointId,

    selectedTenants,

    metaById,

    usuariosPorTenantSel,

    onUsuariosChange,

  ]);



  const handleTenantsChange = (nextTenantIds: string[]) => {

    const prevSet = new Set(selectedTenants);

    onTenantsChange(endpointId, nextTenantIds);

    for (const saId of nextTenantIds) {

      if (prevSet.has(saId)) continue;

      const meta = metaById.get(saId);

      const users = getUsuariosParametrizablesSa(meta);

      if (users.length === 1) {

        onUsuariosChange(endpointId, saId, [users[0].id]);

      }

    }

  };



  const previewAlcances = buildDiosReglaAlcancesPayload(

    selectedTenants,

    usuariosPorTenantSel,

    metaById,

  );

  const totalUsuarios = previewAlcances.reduce(

    (acc, a) => acc + (a.usuariosIds?.length ?? 0),

    0,

  );



  return (

    <div className="space-y-4">

      <GobernanzaModuloDynamicMultiSelect

        id={`${endpointId}-tenants-sa`}

        label="Tenants SuperAdmin *"

        placeholder="Añadir tenant SuperAdmin…"

        options={tenantOptionsFiltradas}

        selected={selectedTenants}

        onSelectedChange={handleTenantsChange}

        disabled={disabled}

        emptyHint={

          jwtSaId

            ? 'Sin opciones en jerarquía (Recargar datos API). Si no eliges ninguno, el servidor usa el tenant del JWT.'

            : 'Sin opciones (Recargar datos API)'

        }

        emptySelectedHint={

          jwtSaId

            ? 'Ningún tenant seleccionado: se usará el tenant SuperAdmin del JWT al guardar.'

            : 'Selecciona al menos un tenant SuperAdmin.'

        }

      />

      {jwtSaId ? (

        <p className="-mt-2 text-xs text-muted-foreground">

          Código jerárquico de la rama SA. Varios tenants solo si comparten el mismo apisDominios.

          {dominioAncla ? (
            <span className="mt-1 block font-mono text-[11px] text-foreground/80">
              Dominio ancla: {dominioAncla}
            </span>
          ) : null}

        </p>

      ) : null}



      {selectedTenants.map((saId) => {

        const meta = metaById.get(saId);

        const tenantLabel = formatSaTenantJerarquiaSelectLabel(meta || { id: saId });

        const usuarios = getUsuariosParametrizablesSa(meta);

        if (!requiereSelectorUsuariosSa(meta)) {

          if (usuarios.length === 1) {

            return (

              <p key={saId} className="text-[11px] text-muted-foreground">

                {tenantLabel}: usuario único ({usuarios[0].label}).

              </p>

            );

          }

          return null;

        }

        const userOptions = usuarios.map((u) => ({

          value: u.id,

          label: u.label,

          hint: u.esPrincipal ? 'principal' : undefined,

        }));

        const selectedUsers = usuariosPorTenantSel[saId] ?? [];

        return (

          <div key={saId} className="rounded-md border border-border/60 bg-muted/20 p-3">

            <GobernanzaModuloDynamicMultiSelect

              id={`${endpointId}-usuarios-${saId}`}

              label={`Usuarios · ${tenantLabel}`}

              placeholder="Añadir usuario…"

              options={userOptions}

              selected={selectedUsers}

              onSelectedChange={(userIds) => onUsuariosChange(endpointId, saId, userIds)}

              disabled={disabled}

              emptySelectedHint="Selecciona al menos un usuario para este tenant."

            />

            {!selectedUsers.length ? (

              <p className="mt-1 text-xs text-amber-700">

                Este tenant tiene varios usuarios: elige al menos uno antes de guardar.

              </p>

            ) : null}

          </div>

        );

      })}



      {previewAlcances.length > 0 ? (

        <p className="text-[11px] text-muted-foreground">

          Alcance en payload: {previewAlcances.length} tenant(s)

          {totalUsuarios > 0 ? ` · ${totalUsuarios} usuario(s) seleccionado(s)` : ''}

        </p>

      ) : null}

    </div>

  );

}



export type { DiosReglaAlcancePayload } from './diosReglaAlcanceHelpers';


