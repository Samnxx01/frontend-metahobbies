import React from 'react';
import type { DiosReglaSaAccesoHelpRow } from './diosReglaAyudaHelpers';

type Props = {
  rows: DiosReglaSaAccesoHelpRow[];
  jwtScopeFullValidado?: boolean;
  jwtSaTieneCorporativo?: boolean;
};

export function DiosReglaAccesoFullHelpSection({
  rows,
  jwtScopeFullValidado = false,
  jwtSaTieneCorporativo,
}: Props): React.ReactElement | null {
  if (!rows.length) return null;

  const full = rows.filter((r) => r.accesoFull);
  const acotados = rows.filter((r) => !r.accesoFull);

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <p className="text-xs font-semibold text-foreground">Tenant SuperAdmin y acceso al sistema</p>
      {jwtSaTieneCorporativo === false || jwtScopeFullValidado ? (
        <p className="text-[11px] leading-relaxed text-success">
          Tu sesión JWT califica para acceso full: tenant SuperAdmin sin corporativo en{' '}
          <code className="rounded bg-success/10 px-1">tenantJerarquiaCounter</code>.
        </p>
      ) : jwtSaTieneCorporativo === true ? (
        <p className="text-[11px] leading-relaxed text-warning">
          Tu JWT tiene corporativo en counters: crear/sincronizar totales está bloqueado; solo referencia de regla.
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">Validando alcance JWT…</p>
      )}

      {full.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-success">Acceso full (parametrizar regla DIOS)</p>
          <ul className="list-none space-y-1 pl-0">
            {full.map((r) => (
              <li
                key={r.id}
                className="rounded border border-success/20 bg-success/80 px-2 py-1 text-[11px] text-success"
              >
                <span className="font-medium">{r.label}</span>
                {r.esJwt ? <span className="ml-1 text-success">· JWT</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {acotados.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-warning">Alcance acotado (con corporativo en counters)</p>
          <ul className="list-none space-y-1 pl-0">
            {acotados.map((r) => (
              <li
                key={r.id}
                className="rounded border border-warning/20 bg-warning/80 px-2 py-1 text-[11px] text-warning"
              >
                <span className="font-medium">{r.label}</span>
                {r.esJwt ? <span className="ml-1 text-warning">· JWT</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
