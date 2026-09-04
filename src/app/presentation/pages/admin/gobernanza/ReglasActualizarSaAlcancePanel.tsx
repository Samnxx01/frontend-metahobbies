import React from 'react';
import { Building2, ChevronRight, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  buildTenantGlobalCadenaRamaAscendente,
  type TenantGlobalJerarquiaRow,
} from './tenantGlobalJerarquiaHelpers';
import { type SaJerarquiaCounterIndice } from './saJerarquiaCounterFilter';
import { formatSaJerarquiaOptionLabel } from './SaJerarquiaUsuariosPanel';

type SaJerarquiaMetaLite = {
  id: string;
  label?: string;
  codigoJerarquia?: string | null;
  coporativoNombre?: string | null;
  usuarioNombre?: string | null;
  usuarioCorreo?: string | null;
};

export type ReglasActualizarSaAlcancePanelProps = {
  actorTsaJwt?: string;
  actorTgJwt?: string;
  actorTcJwt?: string;
  saJerarquiaConCorporativo?: boolean;
  jerarquiaSaCounters?: SaJerarquiaCounterIndice[];
  tenantSuperAdminsJerarquiaCounters?: SaJerarquiaMetaLite[];
  saOptions?: SaJerarquiaMetaLite[];
  selectedSaId: string;
  onSaChange: (saId: string) => void;
  tenantGlobales?: TenantGlobalJerarquiaRow[];
  tenantGlobalRefs?: Array<{ id: string; label: string; meta?: Record<string, string | number | undefined> }>;
  selectedTenantGlobalId?: string;
};

function ScopeChip({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  hint?: string;
}) {
  if (!value) return null;
  return (
    <div className="rounded-md border border-border/80 bg-background/80 px-2.5 py-1.5 text-[11px]">
      <div className="mb-0.5 flex items-center gap-1 font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="font-mono text-[10px] leading-snug text-foreground break-all" title={value}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function resolveSaMetaLabel(
  saId: string,
  metas: SaJerarquiaMetaLite[],
  counters: SaJerarquiaCounterIndice[],
): string {
  const meta = metas.find((m) => String(m.id) === saId);
  if (meta) return formatSaJerarquiaOptionLabel(meta);
  const row = counters.find((r) => String(r.tenantSuperAdminId) === saId);
  if (row?.codigoJerarquia) return row.codigoJerarquia;
  return saId.slice(-8);
}

/** Alcance JWT SA/TG/TC, selector SA y ramas — flujo actualizar reglas globales. */
export function ReglasActualizarSaAlcancePanel({
  actorTsaJwt = '',
  actorTgJwt = '',
  actorTcJwt = '',
  saJerarquiaConCorporativo = false,
  jerarquiaSaCounters = [],
  tenantSuperAdminsJerarquiaCounters = [],
  saOptions = [],
  selectedSaId,
  onSaChange,
  tenantGlobales = [],
  tenantGlobalRefs = [],
  selectedTenantGlobalId = '',
}: ReglasActualizarSaAlcancePanelProps) {
  const saSel = String(selectedSaId || actorTsaJwt || '').trim();
  const tgJwt = String(actorTgJwt || '').trim();
  const tc = String(actorTcJwt || '').trim();
  const tgSel = String(selectedTenantGlobalId || '').trim();

  const fuenteTg: TenantGlobalJerarquiaRow[] = [
    ...tenantGlobales,
    ...tenantGlobalRefs.map((r) => ({
      id: r.id,
      label: r.label,
      corporativo: String(r.meta?.corporativo || ''),
      tenantSuperAdmin: String(r.meta?.tenantSuperAdmin || ''),
      tenantGlobalAdmin: String(r.meta?.tenantGlobalAdmin || ''),
    })),
  ];

  const tgCadena = tgSel ? buildTenantGlobalCadenaRamaAscendente(tgSel, fuenteTg) : [];
  const tgRaiz = tgCadena[0];
  const tgPadreDirecto = tgCadena.length > 1 ? tgCadena[tgCadena.length - 2] : null;
  const saRamaTg =
    tgCadena.length > 0
      ? String(tgCadena.find((n) => n.tenantSuperAdmin)?.tenantSuperAdmin || tgRaiz?.tenantSuperAdmin || saSel).trim()
      : saSel;

  const tgJwtRow = tgJwt ? fuenteTg.find((t) => String(t.id) === tgJwt) : undefined;

  return (
    <div className="mb-3 space-y-2 rounded-lg border border-info/80 bg-info/40 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
        Actualizar regla · alcance SuperAdmin (JWT)
      </p>
      <p className="text-[11px] leading-snug text-foreground/80">
        Elige un SuperAdmin de tu alcance (ancestros + descendientes en tenantJerarquiaCounter) y un tenant global para consultar la regla parametrizada.
      </p>

      <div>
        <Label className="text-[11px] font-semibold text-foreground">
          Tenant SuperAdmin (SA) *
        </Label>
        <select
          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={saSel}
          onChange={(e) => onSaChange(e.target.value)}
        >
          <option value="">— Selecciona SuperAdmin de tu alcance —</option>
          {saOptions.map((s) => {
            const sid = String(s.id || '').trim();
            if (!sid) return null;
            return (
              <option key={sid} value={sid}>
                {formatSaJerarquiaOptionLabel(s)}
              </option>
            );
          })}
        </select>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ScopeChip
          icon={<Globe className="h-3 w-3" />}
          label="Tenant global sesión (TG)"
          value={tgJwt || undefined}
          hint={tgJwtRow?.label}
        />
        <ScopeChip
          icon={<Building2 className="h-3 w-3" />}
          label="Tenant corporativo (TC)"
          value={tc || undefined}
        />
      </div>

      {tgSel && tgCadena.length > 0 ? (
        <div className="rounded-md border border-info/80 bg-info/80 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
            Rama tenant global (padre → seleccionado)
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-foreground">
            {tgCadena.map((nodo, idx) => {
              const esSeleccionado = nodo.id === tgSel;
              return (
                <React.Fragment key={nodo.id}>
                  {idx > 0 ? <ChevronRight className="h-3 w-3 shrink-0 opacity-60" /> : null}
                  <Badge
                    variant={esSeleccionado ? 'default' : 'outline'}
                    className="max-w-[220px] truncate text-[10px] font-normal"
                    title={nodo.id}
                  >
                    {nodo.esRaizRama ? 'Raíz rama · ' : ''}
                    {nodo.label}
                  </Badge>
                </React.Fragment>
              );
            })}
          </div>
          <div className="mt-2 space-y-0.5 text-[10px] text-muted-foreground">
            {tgPadreDirecto ? (
              <p>
                Tenant padre directo:{' '}
                <span className="font-medium text-foreground">{tgPadreDirecto.label}</span>
                <span className="ml-1 font-mono">({tgPadreDirecto.id})</span>
              </p>
            ) : tgRaiz?.esRaizRama ? (
              <p>Este tenant global es raíz de su rama (sin tenantGlobalAdmin padre).</p>
            ) : null}
            {saRamaTg ? (
              <p>
                SuperAdmin de la rama:{' '}
                <span className="font-medium text-foreground">
                  {resolveSaMetaLabel(saRamaTg, tenantSuperAdminsJerarquiaCounters, jerarquiaSaCounters)}
                </span>
                <span className="ml-1 font-mono">({saRamaTg})</span>
              </p>
            ) : null}
            {tgCadena[tgCadena.length - 1]?.corporativo ? (
              <p>
                Corporativo (TC):{' '}
                <span className="font-medium text-foreground">{tgCadena[tgCadena.length - 1].corporativo}</span>
              </p>
            ) : null}
          </div>
        </div>
      ) : tgSel ? (
        <p className="text-[10px] text-warning">
          Tenant seleccionado sin cadena de padres en catálogo local. Recarga datos API si falta la rama.
        </p>
      ) : null}
    </div>
  );
}
