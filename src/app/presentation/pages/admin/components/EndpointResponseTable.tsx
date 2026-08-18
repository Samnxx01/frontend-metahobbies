import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Row = Record<string, unknown>;

const extractRows = (response: unknown): Row[] => {
  if (Array.isArray(response)) return response as Row[];
  if (!response || typeof response !== 'object') return [];
  const object = response as Record<string, unknown>;
  for (const key of ['data', 'items', 'rows', 'results', 'registros']) {
    if (Array.isArray(object[key])) return object[key] as Row[];
  }
  return [];
};

const displayValue = (value: unknown): string => {
  if (value == null) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export default function EndpointResponseTable({ response }: { response: unknown }): React.ReactElement {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const rows = useMemo(() => extractRows(response), [response]);
  const columns = useMemo(() => {
    const keys = new Set<string>();
    rows.slice(0, 50).forEach((row) => Object.keys(row || {}).forEach((key) => keys.add(key)));
    return [...keys];
  }, [rows]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [response, pageSize]);

  if (!rows.length) {
    return <pre className="max-h-[420px] overflow-auto rounded-lg bg-button p-4 font-mono text-xs text-foreground whitespace-pre-wrap break-words">{JSON.stringify(response, null, 2)}</pre>;
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{rows.length} registro(s)</p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filas</span>
          <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
            <SelectContent>{[5, 10, 20, 50].map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="w-full overflow-x-auto rounded-lg border border-border bg-card">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-muted text-foreground">
            <tr>{columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">{column}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((row, index) => (
              <tr key={String(row.iud || row._id || index)} className="hover:bg-muted/50">
                {columns.map((column) => <td key={column} className="max-w-72 px-3 py-2 align-top text-foreground"><span className="block max-h-20 overflow-auto break-words">{displayValue(row[column])}</span></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-muted-foreground">Página {page} de {pages}</span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button>
          <Button type="button" variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Siguiente</Button>
        </div>
      </div>
    </div>
  );
}
