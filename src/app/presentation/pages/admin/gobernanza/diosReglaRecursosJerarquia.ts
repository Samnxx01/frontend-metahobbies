import {
  getJerarquiaOpcionesFromCounter,
  type Route,
} from '@/app/services/routesService';

export type DiosRecursoRow = {
  _id: string;
  name: string;
  path: string;
  /** FORMULARIO | SUBFORMULARIO */
  tipo: string;
  suiteId?: string;
  suiteName?: string;
  moduloId?: string;
  moduloName?: string;
};

export type DiosRecursoModuloJerarquia = {
  _id: string;
  name: string;
  formularios: DiosRecursoRow[];
};

export type DiosRecursoSuiteJerarquia = {
  _id: string;
  name: string;
  modulos: DiosRecursoModuloJerarquia[];
};

export type DiosJerarquiaRecursosCargados = {
  tree: DiosRecursoSuiteJerarquia[];
  flatFormularios: DiosRecursoRow[];
  byFormId: Map<string, DiosRecursoRow>;
};

type CounterRoute = Route & {
  padreRutaSeguridadId?: string | null;
  suiteRutaSeguridadId?: string | null;
  moduloRutaSeguridadId?: string | null;
  formularioRutaSeguridadId?: string | null;
  nivelOrder?: number;
};

const routeId = (r: CounterRoute): string => String(r._id || r.iud || '').trim();

const tipoLabel = (r: CounterRoute, fallback: string): string => {
  const codigo = String(
    (r.tipoNodoId as { codigo?: string } | undefined)?.codigo || r.tipoNodo || fallback
  )
    .trim()
    .toUpperCase();
  return codigo || fallback;
};

const activas = (rows: CounterRoute[] | undefined): CounterRoute[] =>
  (Array.isArray(rows) ? rows : []).filter((r) => r && r.estadoRuta !== false);

/** Evita «Nombre (/ruta) /ruta» cuando el API ya embebe path en name. */
export function formatDiosRecursoDisplayLabel(
  name: string,
  path?: string,
): { title: string; subtitle?: string } {
  const title = String(name || '').trim() || '—';
  const p = String(path || '').trim();
  if (!p || p === '—') return { title };
  const parenSuffix = `(${p})`;
  if (title.includes(parenSuffix) || title.endsWith(p) || title.includes(p)) {
    return { title };
  }
  return { title, subtitle: p };
}

/** Columna «Suite · Módulo» en la tabla de rutas DIOS. */
export function formatDiosRecursoJerarquiaTipo(row: Pick<DiosRecursoRow, 'suiteName' | 'moduloName' | 'tipo'>): string {
  const s = String(row.suiteName || '').trim();
  const m = String(row.moduloName || '').trim();
  if (s && m) return `${s} · ${m}`;
  if (s) return s;
  if (m) return m;
  return String(row.tipo || '—').trim() || '—';
}

/**
 * Árbol Suite → Módulo → Formulario/SubFormulario desde countertiponodorutas
 * (rutaseguridads poblado en cada relación RELACION_RUTA).
 */
export async function cargarJerarquiaRecursosDesdeCounter(): Promise<DiosJerarquiaRecursosCargados> {
  const jerarquiaRes = await getJerarquiaOpcionesFromCounter({ nivelOrder: 'all' });
  const niveles = jerarquiaRes?.niveles || {};

  const suites = activas(niveles['1'] as CounterRoute[]);
  const modulos = activas(niveles['2'] as CounterRoute[]);
  const formularios = activas(niveles['3'] as CounterRoute[]);
  const subformularios = activas(niveles['4'] as CounterRoute[]);

  const suiteNameById = new Map<string, string>();
  for (const s of suites) {
    const id = routeId(s);
    if (id) suiteNameById.set(id, String(s.name || s.path || id));
  }

  const moduloNameById = new Map<string, string>();
  for (const m of modulos) {
    const id = routeId(m);
    if (id) moduloNameById.set(id, String(m.name || m.path || id));
    const suiteId = String(m.suiteRutaSeguridadId || m.padreRutaSeguridadId || '').trim();
    if (suiteId && !suiteNameById.has(suiteId)) {
      suiteNameById.set(suiteId, suiteId.slice(-8));
    }
  }

  const modulosBySuite = new Map<string, CounterRoute[]>();
  for (const m of modulos) {
    const suiteId = String(m.suiteRutaSeguridadId || m.padreRutaSeguridadId || '').trim();
    if (!suiteId) continue;
    const list = modulosBySuite.get(suiteId) ?? [];
    list.push(m);
    modulosBySuite.set(suiteId, list);
  }

  const formsByModulo = new Map<string, CounterRoute[]>();
  for (const f of formularios) {
    const modId = String(f.moduloRutaSeguridadId || f.padreRutaSeguridadId || '').trim();
    if (!modId) continue;
    const list = formsByModulo.get(modId) ?? [];
    list.push(f);
    formsByModulo.set(modId, list);
    const suiteId = String(f.suiteRutaSeguridadId || '').trim();
    if (suiteId && !suiteNameById.has(suiteId)) {
      suiteNameById.set(suiteId, suiteId.slice(-8));
    }
    if (modId && !moduloNameById.has(modId)) {
      moduloNameById.set(modId, modId.slice(-8));
    }
  }

  const subByForm = new Map<string, CounterRoute[]>();
  for (const s of subformularios) {
    const formId = String(s.formularioRutaSeguridadId || s.padreRutaSeguridadId || '').trim();
    if (!formId) continue;
    const list = subByForm.get(formId) ?? [];
    list.push(s);
    subByForm.set(formId, list);
  }

  const flatFormularios: DiosRecursoRow[] = [];
  const byFormId = new Map<string, DiosRecursoRow>();
  const tree: DiosRecursoSuiteJerarquia[] = [];

  const suiteIdsOrdenados = [
    ...suites.map((s) => routeId(s)).filter(Boolean),
    ...[...modulosBySuite.keys()].filter((id) => !suites.some((s) => routeId(s) === id)),
  ];
  const suiteIdsUnicos = [...new Set(suiteIdsOrdenados)];

  for (const suiteId of suiteIdsUnicos) {
    const mods = modulosBySuite.get(suiteId) ?? [];
    const modulosOut: DiosRecursoModuloJerarquia[] = [];
    const suiteName = suiteNameById.get(suiteId) || suiteId.slice(-8);

    for (const mod of mods) {
      const modId = routeId(mod);
      const modName = moduloNameById.get(modId) || String(mod.name || mod.path || modId);
      const forms = formsByModulo.get(modId) ?? [];
      const formRows: DiosRecursoRow[] = [];

      for (const form of forms) {
        const formId = routeId(form);
        const row: DiosRecursoRow = {
          _id: formId,
          name: String(form.name || form.path || formId),
          path: String(form.path || ''),
          tipo: tipoLabel(form, 'FORMULARIO'),
          suiteId,
          suiteName,
          moduloId: modId,
          moduloName: modName,
        };
        formRows.push(row);
        flatFormularios.push(row);
        byFormId.set(formId, row);

        for (const sub of subByForm.get(formId) ?? []) {
          const subId = routeId(sub);
          const subRow: DiosRecursoRow = {
            _id: subId,
            name: String(sub.name || sub.path || subId),
            path: String(sub.path || ''),
            tipo: tipoLabel(sub, 'SUBFORMULARIO'),
            suiteId,
            suiteName,
            moduloId: modId,
            moduloName: modName,
          };
          formRows.push(subRow);
          flatFormularios.push(subRow);
          byFormId.set(subId, subRow);
        }
      }

      if (formRows.length) {
        modulosOut.push({ _id: modId, name: modName, formularios: formRows });
      }
    }

    if (modulosOut.length) {
      tree.push({ _id: suiteId, name: suiteName, modulos: modulosOut });
    }
  }

  return { tree, flatFormularios, byFormId };
}
