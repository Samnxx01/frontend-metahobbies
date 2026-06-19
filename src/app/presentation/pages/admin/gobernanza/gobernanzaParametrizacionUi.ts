/** Conjuntos UI derivados de gobernanzaModuloConfigs (GET parametrizacion-ui). */
export type GobernanzaParametrizacionUi = {
  endpointIdsOcultosPanel: string[];
  endpointIdsModoReglas: string[];
  endpointIdsModoReglasSuperadmin: string[];
  endpointIdsModoReglasDios: string[];
  endpointIdsPermAdminActualizar: string[];
  endpointIdsJerarquiaTgSelect: string[];
  endpointIdsJerarquiaSaMulti: string[];
  inlineFlowTenant: {
    actionQueryParam: string;
    defaultActionId: string | null;
    endpointIds: string[];
  };
  configCount?: number;
};

export type GobernanzaParametrizacionUiSets = {
  endpointIdsOcultosPanel: Set<string>;
  endpointIdsModoReglas: Set<string>;
  endpointIdsModoReglasSuperadmin: Set<string>;
  endpointIdsModoReglasDios: Set<string>;
  endpointIdsPermAdminActualizar: Set<string>;
  endpointIdsJerarquiaTgSelect: Set<string>;
  endpointIdsJerarquiaSaMulti: Set<string>;
  inlineFlowTenant: {
    actionQueryParam: string;
    defaultActionId: string;
    endpointIds: Set<string>;
  };
};

const EMPTY_INLINE = {
  actionQueryParam: 'accion',
  defaultActionId: '',
  endpointIds: new Set<string>(),
};

/** Estado vacío mientras carga el GET (no oculta ni filtra nada). */
export const GOBERNANZA_PARAMETRIZACION_UI_SETS_VACIO: GobernanzaParametrizacionUiSets = {
  endpointIdsOcultosPanel: new Set(),
  endpointIdsModoReglas: new Set(),
  endpointIdsModoReglasSuperadmin: new Set(),
  endpointIdsModoReglasDios: new Set(),
  endpointIdsPermAdminActualizar: new Set(),
  endpointIdsJerarquiaTgSelect: new Set(),
  endpointIdsJerarquiaSaMulti: new Set(),
  inlineFlowTenant: { ...EMPTY_INLINE, endpointIds: new Set() },
};

export function toParametrizacionUiSets(
  raw: GobernanzaParametrizacionUi | null | undefined
): GobernanzaParametrizacionUiSets {
  if (!raw) return GOBERNANZA_PARAMETRIZACION_UI_SETS_VACIO;

  const inline = raw.inlineFlowTenant ?? {
    actionQueryParam: 'accion',
    defaultActionId: null,
    endpointIds: [],
  };

  return {
    endpointIdsOcultosPanel: new Set(raw.endpointIdsOcultosPanel ?? []),
    endpointIdsModoReglas: new Set(raw.endpointIdsModoReglas ?? []),
    endpointIdsModoReglasSuperadmin: new Set(raw.endpointIdsModoReglasSuperadmin ?? []),
    endpointIdsModoReglasDios: new Set(raw.endpointIdsModoReglasDios ?? []),
    endpointIdsPermAdminActualizar: new Set(raw.endpointIdsPermAdminActualizar ?? []),
    endpointIdsJerarquiaTgSelect: new Set(raw.endpointIdsJerarquiaTgSelect ?? []),
    endpointIdsJerarquiaSaMulti: new Set(raw.endpointIdsJerarquiaSaMulti ?? []),
    inlineFlowTenant: {
      actionQueryParam: String(inline.actionQueryParam || 'accion').trim() || 'accion',
      defaultActionId: String(inline.defaultActionId || '').trim(),
      endpointIds: new Set(inline.endpointIds ?? []),
    },
  };
}
