// @ts-nocheck
import {
  getEntityId,
  collectAllNodes,
  isTenantSuperAdminScopeOption,
  normalizePermisoRefId,
  collectGobernanzaRefIds,
  extractPermisoRefIds,
  idsPermisoRefsCoinciden,
  findReglaPlataformaPorSuperAdmin,
  findReglasPorTenantSuperAdmin,
  resolveTenantSuperAdminIdForHerenciaSelect,
  vistaIdEnCounterFormularioSubformulario,
  type Vista,
  type Accion,
  type HeredaGlobalOption,
} from './parametrosGobernanzaPureHelpers';
import { TENANT_SUPERADMIN_SCOPE_PREFIX } from './parametrosGobernanzaConstants';

export interface PermisosCatalogDeps {
  vistas: Vista[];
  rutasJerarquia: any[];
  diosRecursosJerarquiaFlat: any[];
  acciones: Accion[];
  ruleCatalog: Record<string, any>;
  deltaByEndpoint: Record<string, any>;
  loadingDeltaByEndpoint: Record<string, boolean>;
  herenciaAsociadaDataByEndpoint: Record<string, any>;
  herenciasUsuario: any[];
  tenantGlobales: any[];
  tenantGlobalActor: any;
  result: Record<string, string>;
  getFieldValue: (endpointId: string, field: string) => string;
  actorEsTenantGlobalScope: () => boolean;
  actorEsTenantSuperAdmin: () => boolean;
  getHeredaOptionsPermitidasPorTenantGlobal: (...args: any[]) => HeredaGlobalOption[];
  getHerenciaGlobalOpcionesParaTG: () => HeredaGlobalOption[];
  resolveReglaTechoPermUsuario: (endpointId: string) => Record<string, unknown> | null;
  PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS: Set<string>;
  consultaReglasGlobalesRamaCorporativo: (endpointId: string) => boolean;
  findReglaTechoJerarquiaSa: (saId: string) => any | undefined;
  getReglasFiltradasPorTenant: (endpointId: string) => any[];
  resolveSaParaReglasGlobalesEndpoint: (endpointId: string) => string;
  resolveTenantGlobalIdFromRule: (rule: any) => string;
  resolveTenantGlobalParaReglasEndpoint: (endpointId: string) => string;
}

export function computePermisosCatalog(
  deps: PermisosCatalogDeps,
  endpointId: string,
  ruleIdOverride?: string,
  deltaOverride?: any,
): { vistasCatalogo: Vista[]; accionesCatalogo: Accion[] } {
  const {
    vistas, rutasJerarquia, diosRecursosJerarquiaFlat, acciones, ruleCatalog,
    deltaByEndpoint, loadingDeltaByEndpoint, herenciaAsociadaDataByEndpoint, herenciasUsuario, tenantGlobales,
    tenantGlobalActor, result,
    getFieldValue, actorEsTenantGlobalScope, actorEsTenantSuperAdmin,
    getHeredaOptionsPermitidasPorTenantGlobal, getHerenciaGlobalOpcionesParaTG,
    resolveReglaTechoPermUsuario,
    PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS,
    consultaReglasGlobalesRamaCorporativo,
    findReglaTechoJerarquiaSa,
    getReglasFiltradasPorTenant,
    resolveSaParaReglasGlobalesEndpoint,
    resolveTenantGlobalIdFromRule,
    resolveTenantGlobalParaReglasEndpoint,
  } = deps;
  // rawOID → canonical Vista (iud-keyed) built once per computePermisosCatalog call
  const _vistaById = new Map<string, Vista>(vistas.map((v) => [v.id, v]));
  const _rawOidToVista = new Map<string, Vista>();
  rutasJerarquia.forEach((suite: any) => {
    const suiteId = getEntityId(suite);
    const suiteRawOid = String(suite?._id || '').trim();
    if (suiteId) {
      const sv: Vista = {
        id: suiteId,
        ...(suiteRawOid && suiteRawOid !== suiteId ? { _id: suiteRawOid } : {}),
        label: String(suite?.name || suite?.path || suiteId),
        path: String(suite?.path || ''),
      };
      if (!_vistaById.has(suiteId)) _vistaById.set(suiteId, sv);
      if (suiteRawOid && suiteRawOid !== suiteId && !_rawOidToVista.has(suiteRawOid))
        _rawOidToVista.set(suiteRawOid, _vistaById.get(suiteId) ?? sv);
    }
    collectAllNodes(suite.children || []).forEach((node: any) => {
      const nodeId = getEntityId(node);
      const nodeRawOid = String(node?._id || '').trim();
      if (!nodeId) return;
      if (!_vistaById.has(nodeId)) {
        const nv: Vista = {
          id: nodeId,
          ...(nodeRawOid && nodeRawOid !== nodeId ? { _id: nodeRawOid } : {}),
          label: String(node?.name || node?.path || nodeId),
          path: String(node?.path || ''),
        };
        _vistaById.set(nodeId, nv);
        if (nodeRawOid && nodeRawOid !== nodeId && !_rawOidToVista.has(nodeRawOid))
          _rawOidToVista.set(nodeRawOid, nv);
      } else if (nodeRawOid && nodeRawOid !== nodeId && !_rawOidToVista.has(nodeRawOid)) {
        _rawOidToVista.set(nodeRawOid, _vistaById.get(nodeId)!);
      }
    });
  });

  const resolveVistaCatalogByIds = (ids: string[]): Vista[] => {
      const hierarchyById = new Map<string, Vista>(_vistaById);

      diosRecursosJerarquiaFlat.forEach((r) => {
        const rid = String(r._id || '').trim();
        if (!rid) return;
        const canonical = _rawOidToVista.get(rid);
        if (canonical) {
          if (!hierarchyById.has(rid)) hierarchyById.set(rid, canonical);
        } else if (!hierarchyById.has(rid)) {
          hierarchyById.set(rid, {
            id: rid,
            label: String(r.name || r.path || rid),
            path: String(r.path || ''),
          });
        }
      });

      return ids
        .map((id) => _rawOidToVista.get(id) || hierarchyById.get(id) || { id, label: id, path: '' })
        .filter(Boolean) as Vista[];
    };

    if (endpointId === 'perm-usuario-tenant-global') {
      const getId = (value: any): string => String(value?._id || value || '').trim();
      const reglaTecho = resolveReglaTechoPermUsuario(endpointId);
      if (reglaTecho) {
        const recursoIds = (Array.isArray(reglaTecho?.recurso) ? reglaTecho.recurso : [])
          .map((v: any) => getId(v))
          .filter(Boolean);
        const accionIds = (Array.isArray(reglaTecho?.accionesUsu) ? reglaTecho.accionesUsu : [])
          .map((a: any) => getId(a))
          .filter(Boolean);
        const accionByIdTecho = new Map(acciones.map((a) => [a.id, a]));
        const vistasDesdeRegla = resolveVistaCatalogByIds(recursoIds);
        const accionesDesdeRegla = accionIds.length
          ? accionIds.map((aid: string) => accionByIdTecho.get(aid) || { id: aid, label: aid, method: '' })
          : [];
        if (vistasDesdeRegla.length) {
          return { vistasCatalogo: vistasDesdeRegla, accionesCatalogo: accionesDesdeRegla };
        }
        if (recursoIds.length > 0) {
          return { vistasCatalogo: [], accionesCatalogo: [] };
        }
      }

      const selectedHeredaGlobal = getFieldValue(endpointId, 'heredaGlobal').trim();
      const selectedEsReglaCatalogo = !!(selectedHeredaGlobal && ruleCatalog[selectedHeredaGlobal]);
      const usarSeleccionComoFuenteCatalogo =
        selectedHeredaGlobal &&
        (actorEsTenantGlobalScope() || selectedEsReglaCatalogo || endpointId !== 'perm-usuario-tenant-global');
      const sourceIds = usarSeleccionComoFuenteCatalogo
        ? [selectedHeredaGlobal]
        : actorEsTenantGlobalScope()
        ? getHerenciaGlobalOpcionesParaTG().map((opt) => String(opt.id || '').trim()).filter(Boolean)
        : getHeredaOptionsPermitidasPorTenantGlobal(getFieldValue(endpointId, 'tenantGlobalScope').trim())
            .map((opt) => String(opt.id || '').trim())
            .filter(Boolean);
      const vistasMap = new Map<string, Vista>();
      const accionesMap = new Map<string, Accion>();
      const accionById = new Map(acciones.map((a) => [a.id, a]));
      const addVista = (vista: Vista | null | undefined) => {
        if (vista?.id && !vistasMap.has(vista.id)) vistasMap.set(vista.id, vista);
      };
      const addAccion = (accion: Accion | null | undefined) => {
        if (accion?.id && !accionesMap.has(accion.id)) accionesMap.set(accion.id, accion);
      };
      if (!selectedHeredaGlobal && actorEsTenantGlobalScope()) {
        sourceIds.forEach((sourceId) => {
          const herencia = herenciasUsuario.find((h: any) =>
            String(h?.iud || h?._id || '').trim() === sourceId
          );
          if (!herencia) return;
          (Array.isArray(herencia?.vistas) ? herencia.vistas : []).forEach((v: any) => {
            const id = getId(v);
            if (!id) return;
            addVista({ id, label: String(v?.name || v?.path || id), path: String(v?.path || '') });
          });
          (Array.isArray(herencia?.acciones) ? herencia.acciones : []).forEach((a: any) => {
            const id = getId(a);
            if (!id) return;
            addAccion({ id, label: String(a?.etiquetas || a?.method || id), method: String(a?.method || '') });
          });
        });
        // Si hay vistas de herencias propias del TG, retornarlas; sino caer al last resort
        if (vistasMap.size > 0) {
          return { vistasCatalogo: Array.from(vistasMap.values()), accionesCatalogo: Array.from(accionesMap.values()) };
        }
      }
      if (!selectedHeredaGlobal && !actorEsTenantGlobalScope()) {
        sourceIds.forEach((sourceId) => {
          const herenciaDirectaSA = herenciasUsuario.find((h: any) =>
            String(h?.iud || h?._id || '').trim() === sourceId
          );
          const herenciaConDatos = herenciaDirectaSA || herenciasUsuario.find((h: any) => {
            const heredaId = String(h?.heredaGlobal?._id || h?.heredaGlobal || '').trim();
            return heredaId === sourceId && Array.isArray(h?.vistas) && h.vistas.length > 0;
          });
          if (herenciaConDatos) {
            (Array.isArray(herenciaConDatos?.vistas) ? herenciaConDatos.vistas : []).forEach((v: any) => {
              const id = getId(v);
              if (!id) return;
              addVista({ id, label: String(v?.name || v?.path || id), path: String(v?.path || '') });
            });
            (Array.isArray(herenciaConDatos?.acciones) ? herenciaConDatos.acciones : []).forEach((a: any) => {
              const id = getId(a);
              if (!id) return;
              addAccion({ id, label: String(a?.etiquetas || a?.method || id), method: String(a?.method || '') });
            });
            return;
          }
          const rule = ruleCatalog[sourceId];
          if (!rule) return;
          const recursoIds = (Array.isArray(rule?.recurso) ? rule.recurso : [])
            .map((v: any) => getId(v))
            .filter(Boolean);
          const accionIds = (Array.isArray(rule?.accionesUsu) ? rule.accionesUsu : [])
            .map((a: any) => getId(a))
            .filter(Boolean);
          resolveVistaCatalogByIds(recursoIds).forEach(addVista);
          accionIds
            .map((id: string) => accionById.get(id) || { id, label: id, method: '' })
            .forEach(addAccion);
        });
        if (vistasMap.size || accionesMap.size) {
          return { vistasCatalogo: Array.from(vistasMap.values()), accionesCatalogo: Array.from(accionesMap.values()) };
        }
      }

      // TG scope: la herencia seleccionada ES el _id del registro herenciaGlobal (no tiene campo heredaGlobal)
      if (actorEsTenantGlobalScope()) {
        const herencia = herenciasUsuario.find((h: any) =>
          String(h?.iud || h?._id || '').trim() === selectedHeredaGlobal
        );
        if (herencia) {
          const vistasCatalogo = (Array.isArray(herencia?.vistas) ? herencia.vistas : [])
            .map((v: any) => {
              const id = getId(v);
              if (!id) return null;
              return { id, label: String(v?.name || v?.path || id), path: String(v?.path || '') };
            })
            .filter(Boolean) as Vista[];
          const accionesCatalogo = (Array.isArray(herencia?.acciones) ? herencia.acciones : [])
            .map((a: any) => {
              const id = getId(a);
              if (!id) return null;
              return { id, label: String(a?.etiquetas || a?.method || id), method: String(a?.method || '') };
            })
            .filter(Boolean) as Accion[];
          if (vistasCatalogo.length && accionesCatalogo.length) {
            return { vistasCatalogo, accionesCatalogo };
          }
        }
        // Sin herencia con datos: caer al last resort para mostrar todas las rutasSeguridad
      }

      // SA scope: buscar primero por _id directo (herenciaGlobal directa del tenant)
      // y como fallback por campo h.heredaGlobal (referencia a regla - estilo antiguo)
      const herenciaDirectaSA = herenciasUsuario.find((h: any) =>
        String(h?.iud || h?._id || '').trim() === selectedHeredaGlobal
      );
      const herenciaConDatos = herenciaDirectaSA || herenciasUsuario.find((h: any) => {
        const heredaId = String(h?.heredaGlobal?._id || h?.heredaGlobal || '').trim();
        return heredaId === selectedHeredaGlobal && Array.isArray(h?.vistas) && h.vistas.length > 0;
      });

      if (herenciaConDatos) {
        // Para SA: el techo del catálogo es la REGLA padre (66 vistas), no la herencia (45).
        // La herencia es un subconjunto de la regla — mostrar todas las vistas de la regla
        // para que el SA pueda ampliar/modificar la asignación de la herencia.
        const ruleRef = String(herenciaConDatos?.heredaGlobal?._id || herenciaConDatos?.heredaGlobal || '').trim();
        const parentRule = ruleRef ? ruleCatalog[ruleRef] : null;

        if (parentRule) {
          const recursoIds = (Array.isArray(parentRule?.recurso) ? parentRule.recurso : [])
            .map((v: any) => getId(v))
            .filter(Boolean);
          const accionIds = (Array.isArray(parentRule?.accionesUsu) ? parentRule.accionesUsu : [])
            .map((a: any) => getId(a))
            .filter(Boolean);
          const accionByIdMap = new Map(acciones.map((a) => [a.id, a]));
          const vistasDesdeRegla = resolveVistaCatalogByIds(recursoIds);
          const accionesDesdeRegla = accionIds.length
            ? accionIds.map((id: string) => accionByIdMap.get(id) || { id, label: id, method: '' })
            : acciones;
          if (vistasDesdeRegla.length) {
            return { vistasCatalogo: vistasDesdeRegla, accionesCatalogo: accionesDesdeRegla };
          }
        }

        // Sin regla padre resolvible: usar vistas de la herencia directamente como catálogo
        const vistasCatalogo = (Array.isArray(herenciaConDatos?.vistas) ? herenciaConDatos.vistas : [])
          .map((v: any) => {
            const id = getId(v);
            if (!id) return null;
            return {
              id,
              label: String(v?.name || v?.path || id),
              path: String(v?.path || ''),
            };
          })
          .filter(Boolean) as Vista[];

        const accionesCatalogo = (Array.isArray(herenciaConDatos?.acciones) ? herenciaConDatos.acciones : [])
          .map((a: any) => {
            const id = getId(a);
            if (!id) return null;
            return {
              id,
              label: String(a?.etiquetas || a?.method || id),
              method: String(a?.method || ''),
            };
          })
          .filter(Boolean) as Accion[];

        if (vistasCatalogo.length && accionesCatalogo.length) {
          return { vistasCatalogo, accionesCatalogo };
        }
      }

      // Fallback: si la herencia no trae datos, usar recurso/acciones de la regla.
      const rule = ruleCatalog[selectedHeredaGlobal];
      if (rule) {
        const recursoIds = (Array.isArray(rule?.recurso) ? rule.recurso : [])
          .map((v: any) => getId(v))
          .filter(Boolean);
        const accionIds = (Array.isArray(rule?.accionesUsu) ? rule.accionesUsu : [])
          .map((a: any) => getId(a))
          .filter(Boolean);

        const accionById = new Map(acciones.map((a) => [a.id, a]));

        const vistasCatalogo = resolveVistaCatalogByIds(recursoIds);
        const accionesCatalogo = accionIds.length
          ? accionIds.map((id: string) => accionById.get(id) || { id, label: id, method: '' })
          : [];

        if (vistasCatalogo.length) {
          return { vistasCatalogo, accionesCatalogo };
        }

        // La regla tiene vistas pero todas estÃ¡n inactivas â†’ informar sin catÃ¡logo
        if (recursoIds.length > 0) {
          return { vistasCatalogo: [], accionesCatalogo: [] };
        }
      }

      // Last resort: solo para SA puro sin tenantGlobal ni tenantCorporativo en el JWT.
      // Si el JWT trae tenant, no se debe exponer el catalogo completo.
      const esSaPuro = actorEsTenantSuperAdmin()
        && !String(tenantGlobalActor?.tenantGlobalId || '').trim()
        && !String(tenantGlobalActor?.tenantCorporativoId || '').trim();
      if (esSaPuro) {
        // Derivar vistas desde rutasJerarquia (incluye rutas nuevas no enlazadas a contextos aun)
        const seenIds = new Set<string>();
        const allFromTree: Vista[] = [];
        const traverseTree = (nodes: NodoRuta[]) => {
          nodes.forEach((node) => {
            const id = String(node._id || '').trim();
            if (id && !seenIds.has(id)) {
              seenIds.add(id);
              allFromTree.push({ id, label: String(node.name || node.path || id), path: String(node.path || '') });
            }
            if (Array.isArray(node.children)) traverseTree(node.children);
          });
        };
        traverseTree(rutasJerarquia);
        const sourceVistas = allFromTree.length ? allFromTree : vistas;
        if (sourceVistas.length) return { vistasCatalogo: sourceVistas, accionesCatalogo: acciones };
      }

      return { vistasCatalogo: [], accionesCatalogo: [] };
    }

    /** Une vistas/acciones de la fila herencia con las reglas del catálogo (GET listar reglas) del mismo SA/TG,
     * para que rutas nuevas en reglas aparezcan en el árbol sin depender de que el doc herencia ya esté sincronizado. */
    const mergeReglasTenantEnCatalogoPermAdmin = (
      endpointIdMerge: string,
      vistasBase: Vista[],
      accionesBase: Accion[]
    ): { vistasCatalogo: Vista[]; accionesCatalogo: Accion[] } => {
      const mergeVistas = (a: Vista[], b: Vista[]): Vista[] => {
        const m = new Map<string, Vista>();
        a.forEach((v) => {
          if (v?.id) m.set(v.id, v);
        });
        b.forEach((v) => {
          if (v?.id && !m.has(v.id)) m.set(v.id, v);
        });
        return Array.from(m.values());
      };
      const mergeAccs = (a: Accion[], b: Accion[]): Accion[] => {
        const m = new Map<string, Accion>();
        a.forEach((x) => {
          if (x?.id) m.set(x.id, x);
        });
        b.forEach((x) => {
          if (x?.id && !m.has(x.id)) m.set(x.id, x);
        });
        return Array.from(m.values());
      };

      let vistasOut = vistasBase;
      let accionesOut = accionesBase;
      const tgSel = getFieldValue(endpointIdMerge, 'tenantGlobal').trim();
      if (!tgSel || !Object.keys(ruleCatalog || {}).length) {
        return { vistasCatalogo: vistasOut, accionesCatalogo: accionesOut };
      }
      const jwtSa = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
      const effectiveSa = resolveTenantSuperAdminIdForHerenciaSelect(tgSel, tenantGlobales, jwtSa);
      if (!effectiveSa) return { vistasCatalogo: vistasOut, accionesCatalogo: accionesOut };

      let reglas = findReglasPorTenantSuperAdmin(ruleCatalog, effectiveSa).sort((a: any, b: any) => {
        const pa = a?.securityPlatform === true ? 0 : a?.securityPlatform === false ? 1 : 2;
        const pb = b?.securityPlatform === true ? 0 : b?.securityPlatform === false ? 1 : 2;
        return pa - pb;
      });
      const isTsaScope = isTenantSuperAdminScopeOption(tgSel);
      if (!isTsaScope && tgSel) {
        reglas = reglas.filter((r: any) => {
          const tgRule = resolveTenantGlobalIdFromRule(r);
          if (!tgRule) return true;
          return tgRule === tgSel;
        });
      }
      if (!reglas.length) {
        const plataforma = findReglaPlataformaPorSuperAdmin(ruleCatalog, effectiveSa);
        if (plataforma) reglas = [plataforma];
      }

      const accionByIdMap = new Map(acciones.map((a) => [a.id, a]));
      const vistasExtra: Vista[] = [];
      const accionesExtra: Accion[] = [];
      for (const regla of reglas) {
        const recursoIds = (Array.isArray(regla?.recurso) ? regla.recurso : [])
          .map((v: any) => normalizePermisoRefId(v))
          .filter(Boolean);
        resolveVistaCatalogByIds(recursoIds).forEach((v) => vistasExtra.push(v));
        const accionIds = (Array.isArray(regla?.accionesUsu) ? regla.accionesUsu : [])
          .map((a: any) => normalizePermisoRefId(a))
          .filter(Boolean);
        accionIds.forEach((id: string) => {
          const fromCat = accionByIdMap.get(id);
          accionesExtra.push(
            fromCat || {
              id,
              label: String(id).slice(-8),
              method: '',
            }
          );
        });
      }
      vistasOut = mergeVistas(vistasOut, vistasExtra);
      accionesOut = mergeAccs(accionesOut, accionesExtra);
      return { vistasCatalogo: vistasOut, accionesCatalogo: accionesOut };
    };

    /** Si hay fila de «Herencia asociada», el catálogo sale de esa herencia; si no, reglas del SA/TG (techo). */
    const isPermAdminHerenciaCatalogEndpoint =
      endpointId === 'perm-admin-tenant-global' || PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId);

    if (isPermAdminHerenciaCatalogEndpoint) {
      const byId = herenciaAsociadaDataByEndpoint[endpointId] || {};
      const selectedHerenciaId = getFieldValue(endpointId, 'herenciaAsociada').trim();
      const row =
        (selectedHerenciaId ? byId[selectedHerenciaId] : null) ||
        (Object.keys(byId).length ? byId[Object.keys(byId)[0]] : null);

      let vistasCatalogo: Vista[] = [];
      let accionesCatalogo: Accion[] = [];

      if (row) {
        vistasCatalogo = (Array.isArray(row?.vistas) ? row.vistas : [])
          .map((v: any) => {
            const id = normalizePermisoRefId(v);
            if (!id) return null;
            return {
              id,
              label: String(v?.name || v?.path || id),
              path: String(v?.path || ''),
            };
          })
          .filter(Boolean) as Vista[];

        accionesCatalogo = (Array.isArray(row?.acciones) ? row.acciones : [])
          .map((a: any) => {
            const id = normalizePermisoRefId(a);
            if (!id) return null;
            return {
              id,
              label: String(a?.etiquetas || a?.method || id),
              method: String(a?.method || ''),
            };
          })
          .filter(Boolean) as Accion[];
      }

      const merged = mergeReglasTenantEnCatalogoPermAdmin(endpointId, vistasCatalogo, accionesCatalogo);
      if (merged.vistasCatalogo.length || merged.accionesCatalogo.length) {
        return merged;
      }

      const tenantGlobalRaw = getFieldValue(endpointId, 'tenantGlobal').trim();
      if (tenantGlobalRaw) {
        const superAdminRefForRegla = (() => {
          if (isTenantSuperAdminScopeOption(tenantGlobalRaw)) {
            return tenantGlobalRaw.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length).trim();
          }
          const tenantSel = tenantGlobales.find((t) => String(t.id) === tenantGlobalRaw);
          let sa = String(tenantSel?.tenantSuperAdmin || '').trim();
          if (!sa && tenantSel) {
            const parentId = String(tenantSel?.tenantGlobalAdmin || '').trim();
            if (parentId) {
              const padre = tenantGlobales.find((t) => t.id === parentId);
              sa = String(padre?.tenantSuperAdmin || '').trim();
            }
          }
          return sa || String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
        })();

        if (superAdminRefForRegla) {
          const seenTreeIds = new Set<string>();
          const allVistasFromTree: Vista[] = [];
          const traversePermAdminFallback = (nodes: NodoRuta[]) => {
            nodes.forEach((node) => {
              const id = String(node._id || '').trim();
              if (id && !seenTreeIds.has(id)) {
                seenTreeIds.add(id);
                allVistasFromTree.push({
                  id,
                  label: String(node.name || node.path || id),
                  path: String(node.path || ''),
                });
              }
              if (Array.isArray(node.children)) traversePermAdminFallback(node.children);
            });
          };
          traversePermAdminFallback(rutasJerarquia);
          const vistasFallback = allVistasFromTree.length ? allVistasFromTree : vistas;

          const reglaDios = findReglaPlataformaPorSuperAdmin(ruleCatalog, superAdminRefForRegla) as any;
          if (reglaDios) {
            const recursoIds = Array.isArray(reglaDios?.recurso)
              ? reglaDios.recurso.map((v: any) => String(v?._id || v || '').trim()).filter(Boolean)
              : [];
            const accionIds = Array.isArray(reglaDios?.accionesUsu)
              ? reglaDios.accionesUsu.map((a: any) => String(a?._id || a || '').trim()).filter(Boolean)
              : [];
            if (recursoIds.length) {
              const accionById = new Map(acciones.map((a) => [a.id, a]));
              const vistasDesdeRegla = resolveVistaCatalogByIds(recursoIds);
              const accionesDesdeRegla = accionIds.length
                ? accionIds.map((id: string) => accionById.get(id) || { id, label: id, method: '' })
                : acciones;
              return { vistasCatalogo: vistasDesdeRegla, accionesCatalogo: accionesDesdeRegla };
            }
          }
          return { vistasCatalogo: vistasFallback, accionesCatalogo: acciones };
        }
      }

      return { vistasCatalogo: [], accionesCatalogo: [] };
    }

    if (endpointId === 'tenant-actualizar-global-reglas') {
      const ruleId = String(ruleIdOverride || getFieldValue(endpointId, 'x-regla-id')).trim();
      if (!ruleId) {
        return { vistasCatalogo: [], accionesCatalogo: [] };
      }

      const rule = ruleCatalog[ruleId] || null;
      const delta = deltaOverride ?? deltaByEndpoint[endpointId];
      const saSel = resolveSaParaReglasGlobalesEndpoint(endpointId);
      const reglaTecho = saSel ? findReglaTechoJerarquiaSa(saSel) : null;
      const recursoFuente = [
        ...(Array.isArray(rule?.recurso) ? rule.recurso : []),
        ...(Array.isArray(delta?.reglaActual?.recurso) ? delta.reglaActual.recurso : []),
      ];
      const accionesFuente = [
        ...(Array.isArray(rule?.accionesUsu) ? rule.accionesUsu : []),
        ...(Array.isArray(delta?.reglaActual?.accionesUsu) ? delta.reglaActual.accionesUsu : []),
      ];
      const accionByIdMap = new Map<string, Accion>();
      acciones.forEach((a) => {
        accionByIdMap.set(a.id, a);
        collectGobernanzaRefIds(a).forEach((alt) => {
          if (!accionByIdMap.has(alt)) accionByIdMap.set(alt, a);
        });
      });

      const vistasDesdeReglaDoc: Vista[] = [];
      const vistaMer = new Map<string, Vista>();
      recursoFuente.forEach((v: any) => {
        const id = normalizePermisoRefId(v);
        if (!id) return;
        const fromTree = resolveVistaCatalogByIds([id])[0];
        const row =
          fromTree ||
          ({
            id,
            label: String(v?.name || v?.path || v?.label || id),
            path: String(v?.path || ''),
          } as Vista);
        if (!vistaMer.has(row.id)) vistaMer.set(row.id, row);
      });
      extractPermisoRefIds(recursoFuente).forEach((id) => {
        if (vistaMer.has(id)) return;
        const fromTree = resolveVistaCatalogByIds([id])[0];
        if (fromTree && !vistaMer.has(fromTree.id)) vistaMer.set(fromTree.id, fromTree);
      });
      vistasDesdeReglaDoc.push(...vistaMer.values());

      const accionesDesdeReglaDoc: Accion[] = [];
      const accMer = new Map<string, Accion>();
      accionesFuente.forEach((a: any) => {
        const id = normalizePermisoRefId(a);
        if (!id) return;
        const fromCat = accionByIdMap.get(id);
        const labelRaw = String(a?.etiquetas || a?.method || a?.nombre || a?.label || '').trim();
        const row =
          fromCat ||
          ({
            id,
            label: labelRaw && labelRaw !== '[object Object]' ? labelRaw : id,
            method: String(a?.method || ''),
          } as Accion);
        if (!accMer.has(row.id)) accMer.set(row.id, row);
      });
      extractPermisoRefIds(accionesFuente).forEach((id) => {
        if (accMer.has(id)) return;
        const fromCat = accionByIdMap.get(id);
        if (fromCat) accMer.set(fromCat.id, fromCat);
      });
      accionesDesdeReglaDoc.push(...accMer.values());

      const counterFormIds = new Set<string>(
        diosRecursosJerarquiaFlat.flatMap((r) => {
          const rid = String(r._id || '').trim();
          if (!rid) return [];
          const canonical = _rawOidToVista.get(rid);
          return canonical && canonical.id !== rid ? [rid, canonical.id] : [rid];
        }),
      );
      const idsVistasReglaHijo = new Set(vistasDesdeReglaDoc.map((v) => v.id));

      const aplicarTechoJerarquia = (result: { vistasCatalogo: Vista[]; accionesCatalogo: Accion[] }) => {
        if (consultaReglasGlobalesRamaCorporativo(endpointId)) return result;
        if (!reglaTecho) return result;
        const vistaMerTecho = new Map(result.vistasCatalogo.map((v) => [v.id, v]));
        const accMerTecho = new Map(result.accionesCatalogo.map((a) => [a.id, a]));
        (Array.isArray(reglaTecho.recurso) ? reglaTecho.recurso : []).forEach((v: any) => {
          const id = normalizePermisoRefId(v);
          if (!id) return;
          const fromTree = resolveVistaCatalogByIds([id])[0];
          const canonId = fromTree?.id || id;
          if (vistaMerTecho.has(canonId) || idsVistasReglaHijo.has(canonId)) return;
          if (canonId !== id && (vistaMerTecho.has(id) || idsVistasReglaHijo.has(id))) return;
          if (
            !vistaIdEnCounterFormularioSubformulario(canonId, counterFormIds) &&
            !vistaIdEnCounterFormularioSubformulario(id, counterFormIds)
          ) return;
          const fromCounter = diosRecursosJerarquiaFlat.find(
            (r) => String(r._id || '').trim() === id || idsPermisoRefsCoinciden(r._id, id),
          );
          vistaMerTecho.set(
            canonId,
            fromTree ||
              ({
                id: canonId,
                label: String(fromCounter?.name || v?.name || v?.path || v?.label || canonId),
                path: String(fromCounter?.path || v?.path || ''),
              } as Vista),
          );
        });
        (Array.isArray(reglaTecho.accionesUsu) ? reglaTecho.accionesUsu : []).forEach((a: any) => {
          const id = normalizePermisoRefId(a);
          if (!id || accMerTecho.has(id)) return;
          const fromCat = accionByIdMap.get(id);
          const labelRaw = String(a?.etiquetas || a?.method || a?.nombre || a?.label || '').trim();
          accMerTecho.set(
            id,
            fromCat ||
              ({
                id,
                label: labelRaw && labelRaw !== '[object Object]' ? labelRaw : id,
                method: String(a?.method || ''),
              } as Accion),
          );
        });
        return {
          vistasCatalogo: Array.from(vistaMerTecho.values()),
          accionesCatalogo: accMerTecho.size
            ? Array.from(accMerTecho.values())
            : result.accionesCatalogo,
        };
      };

      if (delta) {
        const vistasDelta: Vista[] = (Array.isArray(delta.vistasFaltantes) ? delta.vistasFaltantes : [])
          .map((v: any) => {
            const id = normalizePermisoRefId(v);
            return {
              id,
              label: String(v?.name || v?.path || id || ''),
              path: String(v?.path || ''),
            };
          })
          .filter(
            (v) =>
              v.id &&
              (counterFormIds.size === 0 || vistaIdEnCounterFormularioSubformulario(v.id, counterFormIds)),
          );
        const accionesDelta: Accion[] = (Array.isArray(delta.accionesFaltantes) ? delta.accionesFaltantes : [])
          .map((a: any) => {
            const id = normalizePermisoRefId(a);
            const labelRaw = String(a?.etiquetas || a?.method || a?.nombre || '').trim();
            return {
              id,
              label: labelRaw && labelRaw !== '[object Object]' ? labelRaw : id,
              method: String(a?.method || ''),
            };
          })
          .filter((a) => a.id);
        const vistaMerDelta = new Map<string, Vista>();
        vistasDesdeReglaDoc.forEach((v) => vistaMerDelta.set(v.id, v));
        vistasDelta.forEach((v) => {
          if (v.id && !vistaMerDelta.has(v.id)) vistaMerDelta.set(v.id, v);
        });
        const accMerDelta = new Map<string, Accion>();
        accionesDesdeReglaDoc.forEach((a) => accMerDelta.set(a.id, a));
        accionesDelta.forEach((a) => {
          if (a.id && !accMerDelta.has(a.id)) accMerDelta.set(a.id, a);
        });
        const vistasMerged = Array.from(vistaMerDelta.values());
        const accionesMerged = Array.from(accMerDelta.values());
        return aplicarTechoJerarquia({
          vistasCatalogo: vistasMerged,
          accionesCatalogo: accionesMerged.length ? accionesMerged : accionesDesdeReglaDoc,
        });
      }

      if (loadingDeltaByEndpoint[endpointId] && ruleId) {
        if (vistasDesdeReglaDoc.length) {
          return aplicarTechoJerarquia({
            vistasCatalogo: vistasDesdeReglaDoc,
            accionesCatalogo: accionesDesdeReglaDoc.length ? accionesDesdeReglaDoc : acciones,
          });
        }
        return { vistasCatalogo: [], accionesCatalogo: [] };
      }

      if (ruleId && (vistasDesdeReglaDoc.length || accionesDesdeReglaDoc.length)) {
        return aplicarTechoJerarquia({
          vistasCatalogo: vistasDesdeReglaDoc,
          accionesCatalogo: accionesDesdeReglaDoc.length ? accionesDesdeReglaDoc : acciones,
        });
      }

      return { vistasCatalogo: [], accionesCatalogo: [] };
    }

    if (endpointId === 'tenant-crear-global-reglas') {
      // Derivar vistas desde rutasJerarquia para incluir rutas nuevas no sincronizadas aún en `vistas`
      const seenTreeIds = new Set<string>();
      const allVistasFromTree: Vista[] = [];
      const traverseForReglas = (nodes: NodoRuta[]) => {
        nodes.forEach((node) => {
          const id = String(node._id || '').trim();
          if (id && !seenTreeIds.has(id)) {
            seenTreeIds.add(id);
            allVistasFromTree.push({ id, label: String(node.name || node.path || id), path: String(node.path || '') });
          }
          if (Array.isArray(node.children)) traverseForReglas(node.children);
        });
      };
      traverseForReglas(rutasJerarquia);
      const vistasFallback = allVistasFromTree.length ? allVistasFromTree : vistas;

      const tenantGlobalRaw = resolveTenantGlobalParaReglasEndpoint(endpointId);
      if (!tenantGlobalRaw) return { vistasCatalogo: [], accionesCatalogo: [] };

      let superAdminRef = '';
      const tenantSel = tenantGlobales.find((t) => t.id === tenantGlobalRaw);
      superAdminRef = String(tenantSel?.tenantSuperAdmin || '').trim();
      if (!superAdminRef) {
        const parentTenantId = String(tenantSel?.tenantGlobalAdmin || '').trim();
        if (parentTenantId) {
          const tenantPadre = tenantGlobales.find((t) => t.id === parentTenantId);
          superAdminRef = String(tenantPadre?.tenantSuperAdmin || '').trim();
        }
      }
      if (!superAdminRef) {
        superAdminRef = String(tenantGlobalActor?.tenantSuperAdminId || '').trim();
      }
      if (!superAdminRef) return { vistasCatalogo: vistasFallback, accionesCatalogo: acciones };

      const reglasTenant = getReglasFiltradasPorTenant(endpointId);
      if (reglasTenant.length) {
        const accionByIdMerged = new Map(acciones.map((a) => [a.id, a]));
        const vistaMer = new Map<string, Vista>();
        const accMer = new Map<string, Accion>();
        for (const opt of reglasTenant) {
          const regla = ruleCatalog[opt.id];
          if (!regla) continue;
          const recursoIds = (Array.isArray(regla?.recurso) ? regla.recurso : [])
            .map((v: any) => String(v?._id || v || '').trim())
            .filter(Boolean);
          resolveVistaCatalogByIds(recursoIds).forEach((v) => vistaMer.set(v.id, v));
          (Array.isArray(regla?.accionesUsu) ? regla.accionesUsu : [])
            .map((a: any) => String(a?._id || a || '').trim())
            .filter(Boolean)
            .forEach((id: string) => {
              accMer.set(id, accionByIdMerged.get(id) || { id, label: id, method: '' });
            });
        }
        if (vistaMer.size) {
          return {
            vistasCatalogo: Array.from(vistaMer.values()),
            accionesCatalogo: accMer.size ? Array.from(accMer.values()) : acciones,
          };
        }
      }

      const reglaDios = findReglaPlataformaPorSuperAdmin(ruleCatalog, superAdminRef) as any;

      if (!reglaDios) return { vistasCatalogo: vistasFallback, accionesCatalogo: acciones };

      const recursoIds = Array.isArray(reglaDios?.recurso)
        ? reglaDios.recurso.map((v: any) => String(v?._id || v || '').trim()).filter(Boolean)
        : [];
      const accionIds = Array.isArray(reglaDios?.accionesUsu)
        ? reglaDios.accionesUsu.map((a: any) => String(a?._id || a || '').trim()).filter(Boolean)
        : [];

      if (!recursoIds.length) return { vistasCatalogo: vistasFallback, accionesCatalogo: acciones };

      const accionById = new Map(acciones.map((a) => [a.id, a]));

      const vistasDesdeRegla = resolveVistaCatalogByIds(recursoIds);
      const accionesDesdeRegla = accionIds.length
        ? accionIds.map((id: string) => accionById.get(id) || { id, label: id, method: '' })
        : acciones;

      return {
        vistasCatalogo: vistasDesdeRegla.length ? vistasDesdeRegla : vistasFallback,
        accionesCatalogo: accionesDesdeRegla.length ? accionesDesdeRegla : acciones,
      };
    }

    if (endpointId !== 'perm-admin-tenant-global' && !PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS.has(endpointId)) {
      return { vistasCatalogo: vistas, accionesCatalogo: acciones };
    }

    const tenantGlobalRaw = getFieldValue(endpointId, 'tenantGlobal').trim();
    if (!tenantGlobalRaw) return { vistasCatalogo: vistas, accionesCatalogo: acciones };

    const vistaPermitida = new Set<string>();
    const accionPermitida = new Set<string>();
    const actorTenantGlobal = String(tenantGlobalActor.tenantGlobalId || '').trim();
    const actorTenantSuper = String(tenantGlobalActor.tenantSuperAdminId || '').trim();
    let effectiveSuperAdmin = actorTenantSuper;
    if (isTenantSuperAdminScopeOption(tenantGlobalRaw)) {
      const sid = tenantGlobalRaw.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length).trim();
      if (sid) effectiveSuperAdmin = sid;
    }

    const getId = (value: any): string => String(value?._id || value || '').trim();
    const matchesSuperAdminContext = (h: any): boolean => {
      if (!effectiveSuperAdmin) return false;
      const tenantSuperH = String(h?.tenantSuperTenant?._id || h?.tenantSuperTenant || '').trim();
      return tenantSuperH === effectiveSuperAdmin;
    };
    const matchesGlobalContext = (h: any): boolean => {
      if (!actorTenantGlobal) return false;
      const tgH = getId(h?.tenantGlobal);
      return tgH === actorTenantGlobal;
    };
    const matchesTargetTenant = (h: any): boolean => {
      const tgH = getId(h?.tenantGlobal);
      return tgH === tenantGlobalRaw;
    };

    herenciasUsuario.forEach((h: any) => {
      // SUPERADMIN: acepta herencias del superadmin, priorizando las que apunten al tenantGlobal objetivo.
      // TENANTGLOBAL: solo herencias del tenantGlobal autenticado y del tenant objetivo.
      const inSuperCtx = matchesSuperAdminContext(h);
      const inGlobalCtx = matchesGlobalContext(h);
      const inTarget = matchesTargetTenant(h);
      if (!((inSuperCtx && (inTarget || !getId(h?.tenantGlobal))) || (inGlobalCtx && inTarget))) return;

      const vs = Array.isArray(h?.vistas) ? h.vistas : [];
      const ac = Array.isArray(h?.acciones) ? h.acciones : [];
      vs.forEach((v: any) => {
        const id = getId(v);
        if (id) vistaPermitida.add(id);
      });
      ac.forEach((a: any) => {
        const id = getId(a);
        if (id) accionPermitida.add(id);
      });
    });

    // Sin herencia de usuario parametrizada: mismo criterio que reglas globales — regla de plataforma del SA (efectivo).
    if (!vistaPermitida.size || !accionPermitida.size) {
      if (isPermAdminHerenciaCatalogEndpoint) {
        const superAdminRefForRegla = (() => {
          if (isTenantSuperAdminScopeOption(tenantGlobalRaw)) return effectiveSuperAdmin;
          const tenantSel = tenantGlobales.find((t) => String(t.id) === tenantGlobalRaw);
          let sa = String(tenantSel?.tenantSuperAdmin || '').trim();
          if (!sa && tenantSel) {
            const parentId = String(tenantSel?.tenantGlobalAdmin || '').trim();
            if (parentId) {
              const padre = tenantGlobales.find((t) => t.id === parentId);
              sa = String(padre?.tenantSuperAdmin || '').trim();
            }
          }
          return sa || effectiveSuperAdmin;
        })();

        if (superAdminRefForRegla) {
          const seenTreeIds = new Set<string>();
          const allVistasFromTree: Vista[] = [];
          const traversePermAdminFallback = (nodes: NodoRuta[]) => {
            nodes.forEach((node) => {
              const id = String(node._id || '').trim();
              if (id && !seenTreeIds.has(id)) {
                seenTreeIds.add(id);
                allVistasFromTree.push({ id, label: String(node.name || node.path || id), path: String(node.path || '') });
              }
              if (Array.isArray(node.children)) traversePermAdminFallback(node.children);
            });
          };
          traversePermAdminFallback(rutasJerarquia);
          const vistasFallback = allVistasFromTree.length ? allVistasFromTree : vistas;

          const reglaDios = findReglaPlataformaPorSuperAdmin(ruleCatalog, superAdminRefForRegla) as any;
          if (reglaDios) {
            const recursoIds = Array.isArray(reglaDios?.recurso)
              ? reglaDios.recurso.map((v: any) => String(v?._id || v || '').trim()).filter(Boolean)
              : [];
            const accionIds = Array.isArray(reglaDios?.accionesUsu)
              ? reglaDios.accionesUsu.map((a: any) => String(a?._id || a || '').trim()).filter(Boolean)
              : [];
            if (recursoIds.length) {
              const accionById = new Map(acciones.map((a) => [a.id, a]));
              const vistasDesdeRegla = resolveVistaCatalogByIds(recursoIds);
              const accionesDesdeRegla = accionIds.length
                ? accionIds.map((id: string) => accionById.get(id) || { id, label: id, method: '' })
                : acciones;
              return { vistasCatalogo: vistasDesdeRegla, accionesCatalogo: accionesDesdeRegla };
            }
          }
          return { vistasCatalogo: vistasFallback, accionesCatalogo: acciones };
        }
      }
      return { vistasCatalogo: [], accionesCatalogo: [] };
    }

    return {
      vistasCatalogo: vistas.filter((v) => vistaPermitida.has(v.id)),
      accionesCatalogo: acciones.filter((a) => accionPermitida.has(a.id)),
    };
}
