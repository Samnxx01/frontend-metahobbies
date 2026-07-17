import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { gobernanzaEntityId } from './gobernanzaEntityId';
import { esEndpointCreacionSaDocumento } from './tenantSuperAdminInsertEndpoints';

type SelectOption = { id: string; label: string; rol?: string; meta?: Record<string, string | number | undefined> };

function resolveLabel(options: SelectOption[] = [], rawId: unknown): string {
  const id = gobernanzaEntityId(rawId) || String(rawId ?? '').trim();
  if (!id) return '';
  const hit = options.find((o) => gobernanzaEntityId(o.id) === id || o.id === id);
  return String(hit?.label || hit?.rol || '').trim() || id;
}

function extractPayload(response: unknown): Record<string, unknown> | null {
  if (!response || typeof response !== 'object') return null;
  const root = response as Record<string, unknown>;
  if (root.data && typeof root.data === 'object') return root.data as Record<string, unknown>;
  return root;
}

function accionIdsDesdePayload(
  payload: Record<string, unknown> | null,
  formFields: Record<string, string>
): string[] {
  const fromApi = payload?.accionesUsu;
  if (Array.isArray(fromApi) && fromApi.length) {
    return fromApi.map((x) => gobernanzaEntityId(x) || String(x ?? '').trim()).filter(Boolean);
  }
  return String(formFields.accionesUsu || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

type AltaTenantResultPanelProps = {
  endpointId: string;
  response: unknown;
  formFields?: Record<string, string>;
  selects?: Record<string, SelectOption[]>;
  fallbackJson?: string;
};

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 bg-white/70 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}

export function GobernanzaAltaTenantResultPanel({
  endpointId,
  response,
  formFields = {},
  selects = {},
  fallbackJson,
}: AltaTenantResultPanelProps) {
  const [showJson, setShowJson] = useState(false);

  const view = useMemo(() => {
    const root = response && typeof response === 'object' ? (response as Record<string, unknown>) : null;
    const payload = extractPayload(response);
    const codigoJerarquia = String(payload?.codigoJerarquia || '').trim();
    if (!payload || (!codigoJerarquia && !payload.iud && !payload._id)) return null;

    const rolRaw = payload.rolesMabs ?? formFields.rolesMabs;
    const rolLabel = resolveLabel(selects.rolesMabs, rolRaw);
    const accionIds = accionIdsDesdePayload(payload, formFields);
    const acciones = accionIds.map((id) => ({
      id,
      label: resolveLabel(selects.accionesUsu, id),
    }));

    const collection = String(payload._collectionDestino || '').trim();
    const esSa = collection === 'tenantSuperTenant' || esEndpointCreacionSaDocumento(endpointId);

    return {
      msg: String(root?.msg || 'Tenant creado correctamente').trim(),
      codigoJerarquia,
      codigoPadre: String(payload.codigoPadre || '').trim() || null,
      secuenciaJerarquia:
        payload.secuenciaJerarquia != null && payload.secuenciaJerarquia !== ''
          ? Number(payload.secuenciaJerarquia)
          : null,
      tenantId: gobernanzaEntityId(payload.iud ?? payload._id) || null,
      estado: payload.estado !== false,
      tipoDestino: esSa ? 'Tenant SuperAdmin' : 'Tenant Global',
      rolLabel,
      acciones,
    };
  }, [response, formFields, selects, endpointId]);

  if (!view) {
    return (
      <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-muted/50 p-3 text-xs text-foreground">
        {fallbackJson || 'Aún sin respuesta'}
      </pre>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-success/20 bg-gradient-to-b from-success/10 to-white shadow-sm">
      <div className="flex flex-wrap items-start gap-3 border-b border-success/10 px-4 py-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-success">{view.msg}</p>
          <p className="text-xs text-success/80">{view.tipoDestino} registrado en el sistema</p>
        </div>
        <Badge variant={view.estado ? 'default' : 'destructive'} className="shrink-0">
          {view.estado ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>

      <div className="px-4 py-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Código jerárquico</p>
        <p className="font-mono text-2xl font-bold tracking-tight text-success">{view.codigoJerarquia}</p>
        {(view.codigoPadre || view.secuenciaJerarquia != null) && (
          <p className="mt-1 text-xs text-muted-foreground">
            {view.codigoPadre ? <>Padre: <span className="font-mono font-medium">{view.codigoPadre}</span></> : null}
            {view.codigoPadre && view.secuenciaJerarquia != null ? ' · ' : null}
            {view.secuenciaJerarquia != null ? <>Secuencia {view.secuenciaJerarquia}</> : null}
          </p>
        )}
      </div>

      <div className="grid gap-2 px-4 pb-4 sm:grid-cols-2">
        <InfoRow label="Rol parametrizado">
          <span className="font-medium">{view.rolLabel || '—'}</span>
        </InfoRow>
        {view.tenantId ? (
          <InfoRow label="ID documento">
            <span className="break-all font-mono text-xs">{view.tenantId}</span>
          </InfoRow>
        ) : null}
      </div>

      <div className="border-t border-success/10 px-4 py-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Acciones parametrizadas ({view.acciones.length})
        </p>
        {view.acciones.length ? (
          <div className="flex flex-wrap gap-1.5">
            {view.acciones.map((a) => (
              <Badge key={a.id} variant="outline" className="border-success/20 bg-white text-xs font-normal">
                {a.label}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No se recibieron acciones en la respuesta.</p>
        )}
      </div>

      {fallbackJson ? (
        <div className="border-t border-success/10 px-4 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs text-muted-foreground"
            onClick={() => setShowJson((v) => !v)}
          >
            {showJson ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showJson ? 'Ocultar detalle técnico' : 'Ver detalle técnico (JSON)'}
          </Button>
          {showJson ? (
            <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-border bg-muted/40 p-2 text-[11px]">
              {fallbackJson}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
