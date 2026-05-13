import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, Shield } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ParametrosGobernanzaWithRouting } from './gobernanza';

/** Endpoints de reglas por **tenant global** concreto (no reglas DIOS). */
export const REGLAS_TENANT_GLOBAL_IDS = [
  'tenant-crear-global-reglas',
  'tenant-listar-reglas',
  'tenant-actualizar-global-reglas',
  'tenant-desactivar-global-reglas',
];

type ActorContext = {
  scope?: string | null;
  tenantSuperAdminId?: string | null;
  tenantGlobalId?: string | null;
  tenantCorporativoId?: string | null;
  rol?: string | null;
};

export type TenantGlobalListRow = {
  id?: string;
  tenantGlobalId?: string;
  label?: string;
  tenantSuperAdmin?: string | null;
  tenantGlobalAdmin?: string | null;
  corporativo?: string | null;
  coporativo?: unknown;
};

function pickRows(payload: unknown): TenantGlobalListRow[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  if (Array.isArray(p.data)) return p.data as TenantGlobalListRow[];
  const items = p.items ?? (p.data as Record<string, unknown> | undefined)?.items;
  if (Array.isArray(items)) return items as TenantGlobalListRow[];
  return [];
}

function pickActor(payload: unknown): ActorContext | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  const a = p.actor;
  if (a && typeof a === 'object') return a as ActorContext;
  return null;
}

function rowId(r: TenantGlobalListRow): string {
  return String(r.tenantGlobalId || r.id || '').trim();
}

/**
 * Solo la tabla de **tenant globales** autorizados por el API (sin formularios de reglas).
 * Reutilizable en `ReglasTenantAdmin` u otras pantallas.
 */
export function ReglasTenantGlobalesLista() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<TenantGlobalListRow[]>([]);
  const [actor, setActor] = useState<ActorContext | null>(null);
  const [query, setQuery] = useState('');

  const loadTenantGlobales = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/config/tenant/tipo/listar/globales/contexto/roles', {
        method: 'GET',
      });
      const list = pickRows(res);
      const seen = new Set<string>();
      const deduped = list.filter((r) => {
        const id = rowId(r);
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      setRows(deduped);
      setActor(pickActor(res));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudieron cargar los tenant globales';
      setError(msg);
      setRows([]);
      setActor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTenantGlobales();
  }, [loadTenantGlobales]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const id = rowId(r);
      const label = String(r.label || '').toLowerCase();
      const corp = String(r.corporativo || '').toLowerCase();
      const admin = String(r.tenantGlobalAdmin || '').toLowerCase();
      return id.includes(q) || label.includes(q) || corp.includes(q) || admin.includes(q);
    });
  }, [rows, query]);

  const sesionListadoPlataforma = Boolean(String(actor?.tenantSuperAdminId || '').trim());

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Shield className="h-5 w-5 text-primary" />
          Tenant globales (alcance reglas)
        </CardTitle>
        <CardDescription>
          Cada fila es un <strong>tenant global</strong> (documento TG). No es un listado de cuentas SuperAdmin: el API
          filtra qué TGs ves según tu JWT.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
          role="note"
        >
          <span className="font-medium text-foreground">Regla de negocio (servidor): </span>
          {sesionListadoPlataforma ? (
            <>
              Con sesión de plataforma, solo entran TGs con fila en <strong>TenantJerarquiaCounter</strong> (corporativo +
              tenant global en counter) dentro de tu árbol autorizado.
            </>
          ) : (
            <>
              Con <strong>tenantGlobal</strong> o <strong>tenantCorporativo</strong> en el JWT, el listado se acota al
              corporativo / alcance que resuelve el servidor.
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Filtrar por id, etiqueta, corporativo o tenant global padre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xl"
            aria-label="Filtro de tenant globales"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => void loadTenantGlobales()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualizar listado
          </Button>
        </div>

        {actor ? (
          <p className="text-xs text-muted-foreground">
            Sesión: rol <span className="font-mono">{actor.rol || '—'}</span>
            {actor.tenantGlobalId ? (
              <>
                {' · '}
                TG (JWT): <span className="font-mono">{actor.tenantGlobalId}</span>
              </>
            ) : null}
            {actor.tenantCorporativoId ? (
              <>
                {' · '}
                TC: <span className="font-mono">{actor.tenantCorporativoId}</span>
              </>
            ) : null}
            {sesionListadoPlataforma && !actor.tenantGlobalId ? (
              <span className="text-muted-foreground">
                {' '}
                — Las filas de la tabla son <strong>tenant globales</strong>, no entradas de SuperAdmin.
              </span>
            ) : null}
          </p>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant global</TableHead>
                <TableHead className="hidden md:table-cell">Padre (TG)</TableHead>
                <TableHead>Corporativo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Cargando…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No hay tenant globales para tu alcance actual. Revisa counters/jerarquía o tu JWT.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  const id = rowId(r);
                  return (
                    <TableRow key={id}>
                      <TableCell>
                        <div className="font-medium">{r.label || id}</div>
                        <div className="font-mono text-xs text-muted-foreground">{id}</div>
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs md:table-cell">
                        {r.tenantGlobalAdmin || '—'}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm">{r.corporativo || '—'}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/** Formularios ParametrosGobernanza: crear/listar/actualizar/desactivar reglas **por tenant global**. */
export function ReglasTenantGlobalOperaciones() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Operaciones · reglas por tenant global</CardTitle>
        <CardDescription>
          Crear, listar, actualizar o desactivar reglas asociadas a un tenant global destino (no la regla DIOS de
          plataforma).
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0 pt-2">
        <ParametrosGobernanzaWithRouting
          mode="full"
          initialSection="tenant"
          lockedSection="tenant"
          allowedEndpointIds={REGLAS_TENANT_GLOBAL_IDS}
        />
      </CardContent>
    </Card>
  );
}

/**
 * Página completa: tabla de tenant globales + operaciones TG. Para DIOS puro usar `ReglasTenantSuperAdmin`.
 */
export default function ReglasTenantGlobal() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
      <ReglasTenantGlobalesLista />
      <ReglasTenantGlobalOperaciones />
    </div>
  );
}
