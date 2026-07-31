import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CircleHelp, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GOVERNED_ACTION_CATALOG, type GovernedActionDefinition } from './registry/governedActionCatalog';

export type GovernedButtonCatalogEditorProps = {
  selectedIds: ReadonlySet<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  catalog?: readonly GovernedActionDefinition[];
};

export function GovernedButtonCatalogEditor({
  selectedIds,
  onSelectedIdsChange,
  catalog = GOVERNED_ACTION_CATALOG,
}: GovernedButtonCatalogEditorProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [...catalog];
    return catalog.filter((item) => [item.id, item.label, item.moduleLabel, item.groupLabel, item.routePath]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }, [catalog, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages]);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );
  const groups = useMemo(() => {
    const map = new Map<string, GovernedActionDefinition[]>();
    paginated.forEach((item) => {
      const key = `${item.moduleId}:${item.groupId}`;
      map.set(key, [...(map.get(key) ?? []), item]);
    });
    return [...map.entries()];
  }, [paginated]);

  const toggle = (id: string, checked: boolean): void => {
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    onSelectedIdsChange(next);
  };

  return (
    <section className="space-y-4 rounded-xl border border-border/80 bg-card/60 p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold">Catálogo dedicado de botones</h3>
        <p className="text-xs text-muted-foreground">Selecciona botones UI por identificador estable. No corresponde a operaciones HTTP.</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar por ID, botón, módulo o ruta…" className="pl-9" />
      </div>
      <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>{filtered.length} botón(es) mapeado(s) · página {page} de {totalPages}</span>
        <label className="flex items-center gap-2">
          Mostrar
          <select className="h-8 rounded-md border border-input bg-background px-2 text-foreground" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
            <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
          </select>
        </label>
      </div>
      {groups.map(([key, items]) => {
        const allSelected = items.every((item) => selectedIds.has(item.id));
        return (
          <div key={key} className="space-y-2 rounded-lg border p-3">
            <label className="flex cursor-pointer items-center gap-2 font-medium">
              <Checkbox checked={allSelected} onCheckedChange={(value) => {
                const next = new Set(selectedIds);
                items.forEach((item) => value === true ? next.add(item.id) : next.delete(item.id));
                onSelectedIdsChange(next);
              }} />
              {items[0]?.moduleLabel} / {items[0]?.groupLabel}<Badge variant="outline">{items.length}</Badge>
            </label>
            <div className="space-y-2 pl-1 sm:pl-6">
              {items.map((item) => (
                <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
                  <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={(value) => toggle(item.id, value === true)} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="mt-2 block text-[11px] font-medium text-muted-foreground">Identificador del botón</span>
                    <code className="mt-1 block break-all text-[10px] text-muted-foreground">Clave técnica: {item.id}</code>
                    <span className="block truncate text-xs text-muted-foreground">{item.routePath}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                    <Badge variant="secondary">{item.operation}</Badge>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Ayuda de ${item.label}`}
                          onClick={(event) => event.preventDefault()}
                        >
                          <CircleHelp className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[min(calc(100vw-2rem),24rem)] space-y-3" align="end">
                        <div>
                          <p className="font-semibold text-foreground">{item.label}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.description || `Permite ejecutar la operación ${item.operation} en ${item.moduleLabel}.`}
                          </p>
                        </div>
                        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                          <dt className="font-medium">Identificador</dt><dd className="break-all font-mono">{item.id}</dd>
                          <dt className="font-medium">Módulo</dt><dd>{item.moduleLabel}</dd>
                          <dt className="font-medium">Grupo</dt><dd>{item.groupLabel}</dd>
                          <dt className="font-medium">Operación</dt><dd>{item.operation}</dd>
                          <dt className="font-medium">Ruta</dt><dd className="break-all font-mono">{item.routePath}</dd>
                        </dl>
                        <div className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
                          <p className="font-medium text-foreground">Alcance</p>
                          <p className="mt-1">
                            Puede asignarse a Tenant SuperAdmin, Tenant Global y usuarios asociados. Un SuperAdmin administra su propio subárbol; sus hijos no reciben automáticamente acciones exclusivas del padre.
                          </p>
                          <p className="mt-1">Estado actual: {selectedIds.has(item.id) ? 'seleccionado para parametrizar' : 'visible y sin seleccionar'}.</p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
      {groups.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No hay botones que coincidan.</p> : null}
      {filtered.length > 0 ? (
        <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Paginación del catálogo de botones">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button>
          <Badge variant="outline">{page} / {totalPages}</Badge>
          <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Siguiente<ChevronRight className="ml-1 h-4 w-4" /></Button>
        </nav>
      ) : null}
    </section>
  );
}
