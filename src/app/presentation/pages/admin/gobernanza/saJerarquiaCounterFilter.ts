/** Índice SA desde GET selects → jerarquiaSaCounters (tenantjerarquiacounters). */
export type SaJerarquiaCounterIndice = {
  tenantSuperAdminId: string;
  codigoJerarquia?: string | null;
  codigoPadre?: string | null;
  secuenciaJerarquia?: number | null;
  corporativoId?: string | null;
};

function construirMapasIndiceSa(indice: SaJerarquiaCounterIndice[] = []) {
  const byId = new Map<string, SaJerarquiaCounterIndice>();
  const byCodigo = new Map<string, SaJerarquiaCounterIndice>();
  for (const row of indice) {
    const id = String(row?.tenantSuperAdminId || '').trim();
    if (id) byId.set(id, row);
    const cod = String(row?.codigoJerarquia || '').trim();
    if (cod) byCodigo.set(cod, row);
  }
  return { byId, byCodigo };
}

export function resolverCadenaAscSa(indice: SaJerarquiaCounterIndice[], anclaSaId: string) {
  const { byId, byCodigo } = construirMapasIndiceSa(indice);
  const ancla = byId.get(String(anclaSaId || '').trim());
  if (!ancla) return [];

  const cadena: SaJerarquiaCounterIndice[] = [];
  const seen = new Set<string>();
  let cur: SaJerarquiaCounterIndice | null | undefined = ancla;
  while (cur && !seen.has(cur.tenantSuperAdminId)) {
    seen.add(cur.tenantSuperAdminId);
    cadena.push(cur);
    const cp = String(cur.codigoPadre || '').trim();
    cur = cp ? byCodigo.get(cp) : null;
  }
  return cadena.sort(
    (a, b) =>
      (a.secuenciaJerarquia ?? Number.MAX_SAFE_INTEGER) -
      (b.secuenciaJerarquia ?? Number.MAX_SAFE_INTEGER),
  );
}

export function resolverDescendientesSa(indice: SaJerarquiaCounterIndice[], codigoRaiz: string) {
  const raiz = String(codigoRaiz || '').trim();
  if (!raiz) return [];
  const out: SaJerarquiaCounterIndice[] = [];
  const collect = (codigoPadre: string) => {
    for (const row of indice) {
      if (String(row?.codigoPadre || '').trim() !== codigoPadre) continue;
      out.push(row);
      const cod = String(row?.codigoJerarquia || '').trim();
      if (cod) collect(cod);
    }
  };
  collect(raiz);
  return out;
}

/** Subárbol visible desde ancla (JWT o SA elegido en combo). */
export function filtrarIndiceSaSubarbol(
  indice: SaJerarquiaCounterIndice[] = [],
  opts: {
    anclaSaId?: string;
    anclaCodigo?: string;
    incluirAncestros?: boolean;
    incluirDescendientes?: boolean;
  } = {},
): SaJerarquiaCounterIndice[] {
  const { byId, byCodigo } = construirMapasIndiceSa(indice);
  let ancla = opts.anclaSaId ? byId.get(String(opts.anclaSaId).trim()) : undefined;
  if (!ancla && opts.anclaCodigo) {
    ancla = byCodigo.get(String(opts.anclaCodigo).trim());
  }
  if (!ancla) return [...indice];

  const incluirAncestros = opts.incluirAncestros !== false;
  const incluirDescendientes = opts.incluirDescendientes !== false;
  const allowed = new Set<string>();

  if (incluirAncestros) {
    for (const row of resolverCadenaAscSa(indice, ancla.tenantSuperAdminId)) {
      allowed.add(row.tenantSuperAdminId);
    }
  } else {
    allowed.add(ancla.tenantSuperAdminId);
  }

  if (incluirDescendientes && ancla.codigoJerarquia) {
    for (const row of resolverDescendientesSa(indice, ancla.codigoJerarquia)) {
      allowed.add(row.tenantSuperAdminId);
    }
  }

  return indice.filter((r) => allowed.has(r.tenantSuperAdminId));
}

/** Filtra metadatos SA del GET selects al subárbol del ancla (codigoPadre en counters). */
export function filtrarSaJerarquiaMetaPorSubarbol<T extends { id?: string }>(
  metas: T[],
  indice: SaJerarquiaCounterIndice[],
  anclaSaId: string,
  opts: { incluirAncestros?: boolean; incluirDescendientes?: boolean } = {},
): T[] {
  if (!indice.length || !String(anclaSaId || '').trim()) return metas;
  const incluirAncestros = opts.incluirAncestros !== false;
  const incluirDescendientes = opts.incluirDescendientes !== false;
  const allowed = new Set(
    filtrarIndiceSaSubarbol(indice, {
      anclaSaId,
      incluirAncestros,
      incluirDescendientes,
    }).map((r) => r.tenantSuperAdminId),
  );
  return metas.filter((m) => allowed.has(String(m?.id || '').trim()));
}

/** Rama propia + descendientes (sin ancestros): SA del JWT y tenants SA creados bajo su codigoJerarquia. */
export function filtrarSaJerarquiaMetaRamaDescendiente<T extends { id?: string }>(
  metas: T[],
  indice: SaJerarquiaCounterIndice[],
  anclaSaId: string,
): T[] {
  return filtrarSaJerarquiaMetaPorSubarbol(metas, indice, anclaSaId, {
    incluirAncestros: false,
    incluirDescendientes: true,
  });
}
