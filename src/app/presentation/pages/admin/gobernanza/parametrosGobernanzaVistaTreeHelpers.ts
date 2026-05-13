/** Árbol de rutas / agrupación de vistas (ParametrosGobernanza). */

import type { NodoRuta, VistaItem, VistaLoc } from './parametrosGobernanzaTypes';

export const getTipoNodoLabel = (node: any): string =>
  String(node?.tipoNodoId?.codigo || node?.tipoNodo || '').trim().toUpperCase();

export const esNodoFormularioLike = (node: any): boolean => {
  const tipo = getTipoNodoLabel(node);
  return tipo === 'FORMULARIO' || tipo === 'SUBFORMULARIO';
};

export const hasChildNodes = (node: any): boolean => Array.isArray(node?.children) && node.children.length > 0;

export const collectFormularioLikeNodes = (nodes: any[] = []): any[] => {
  const collected: any[] = [];
  const walk = (items: any[] = []) => {
    items.forEach((item) => {
      if (!item) return;
      if (esNodoFormularioLike(item)) {
        collected.push(item);
      }
      if (Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children);
      }
    });
  };
  walk(nodes);
  return collected;
};

export const getModuloNodes = (suite: any): any[] =>
  (suite?.children || []).filter((n: any) => !esNodoFormularioLike(n) || hasChildNodes(n));

export const collectAllNodes = (nodes: any[] = []): any[] => {
  const collected: any[] = [];
  const walk = (items: any[] = []) => {
    items.forEach((item) => {
      if (!item) return;
      collected.push(item);
      if (Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children);
      }
    });
  };
  walk(nodes);
  return collected;
};

export const getEntityId = (value: any): string =>
  String(value?._id || value?.iud || value?.id || value || '').trim();

export const getEntityLabel = (value: any): string =>
  String(
    value?.label ||
    value?.nombre ||
    value?.name ||
    value?.razon_social ||
    value?.titulo ||
    value?.correo ||
    ''
  ).trim();

export const buildVistaLocationMap = (
  rutasJerarquia: NodoRuta[] = []
): { byId: Map<string, VistaLoc>; byPath: Map<string, VistaLoc> } => {
  const byId = new Map<string, VistaLoc>();
  const byPath = new Map<string, VistaLoc>();

  const reg = (id: string, path: string, loc: VistaLoc) => {
    if (id) byId.set(id, loc);
    if (path) byPath.set(path, loc);
  };

  rutasJerarquia.forEach((suite) => {
    const suiteId = getEntityId(suite);
    const suiteName = String(suite?.name || '').trim();
    const suitePath = String((suite as any)?.path || '').trim();

    reg(suiteId, suitePath, { suiteId, suiteName, moduloId: '', moduloName: '' });

    (suite.children || []).forEach((child: any) => {
      const childId = getEntityId(child);
      const childName = String(child?.name || '').trim();
      const childPath = String(child?.path || '').trim();

      if (!hasChildNodes(child)) {
        reg(childId, childPath, { suiteId, suiteName, moduloId: '', moduloName: '' });
        return;
      }

      collectAllNodes(child.children || []).forEach((node: any) => {
        const nodeId = getEntityId(node);
        const nodePath = String(node?.path || '').trim();
        reg(nodeId, nodePath, { suiteId, suiteName, moduloId: childId, moduloName: childName });
      });
      reg(childId, childPath, { suiteId, suiteName, moduloId: childId, moduloName: childName });
    });
  });

  return { byId, byPath };
};

export const buildGroupedVistas = (
  vistasDetalle: VistaItem[],
  byId: Map<string, VistaLoc>,
  byPath?: Map<string, VistaLoc>
) => {
  type ModuloGroup = { moduloName: string; vistas: VistaItem[] };
  type SuiteGroup = { suiteName: string; modulos: Map<string, ModuloGroup> };
  const suiteGroups = new Map<string, SuiteGroup>();
  const sinSuite: VistaItem[] = [];

  vistasDetalle.forEach((vista) => {
    const loc =
      byId.get(vista.id) ||
      (byPath && vista.path ? byPath.get(vista.path) : undefined);
    if (!loc) {
      sinSuite.push(vista);
      return;
    }
    if (!suiteGroups.has(loc.suiteId)) {
      suiteGroups.set(loc.suiteId, { suiteName: loc.suiteName, modulos: new Map() });
    }
    const sg = suiteGroups.get(loc.suiteId)!;
    const mKey = loc.moduloId || '__direct__';
    if (!sg.modulos.has(mKey)) {
      sg.modulos.set(mKey, { moduloName: loc.moduloName || 'Directo', vistas: [] });
    }
    sg.modulos.get(mKey)!.vistas.push(vista);
  });

  return { suiteGroups, sinSuite };
};

export const buildSuiteSummaryLabel = (
  suiteGroups: Map<string, { suiteName: string }>,
  sinSuiteCount = 0
): string => {
  const suiteNames = Array.from(suiteGroups.values())
    .map((suite) => String(suite.suiteName || '').trim())
    .filter(Boolean);
  if (!suiteNames.length) {
    return sinSuiteCount > 0 ? `Sin suite (${sinSuiteCount})` : 'Sin suites';
  }
  const top = suiteNames.slice(0, 2).join(', ');
  const restantes = suiteNames.length - 2;
  const suiteText = restantes > 0 ? `${top} (+${restantes})` : top;
  return sinSuiteCount > 0 ? `${suiteText} | Sin suite:${sinSuiteCount}` : suiteText;
};
