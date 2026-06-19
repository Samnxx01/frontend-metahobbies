import React, { useEffect, useMemo, useState } from 'react';
import { formatDiosRecursoDisplayLabel, type DiosRecursoRow, type DiosRecursoSuiteJerarquia } from './diosReglaRecursosJerarquia';
import { gobernanzaEntityId } from './gobernanzaEntityId';

type Props = {
  tree: DiosRecursoSuiteJerarquia[];
  flatFallback: DiosRecursoRow[];
  seleccionados: string[];
  onChangeSeleccion: (ids: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
};

function RecursoLabel({ name, path, tipo }: { name: string; path?: string; tipo?: string }) {
  const { title, subtitle } = formatDiosRecursoDisplayLabel(name, path);
  return (
    <span className="min-w-0">
      <span className="font-medium">{title}</span>
      {tipo ? <span className="ml-1 text-[10px] text-muted-foreground">({tipo})</span> : null}
      {subtitle ? (
        <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">{subtitle}</span>
      ) : null}
    </span>
  );
}

export function DiosReglaRecursosJerarquiaPanel({
  tree,
  flatFallback,
  seleccionados,
  onChangeSeleccion,
  disabled = false,
  loading = false,
}: Props): React.ReactElement {
  const [modulosAbiertos, setModulosAbiertos] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!tree.length) return;
    const keys = tree.flatMap((suite) =>
      suite.modulos.map((mod) => `${gobernanzaEntityId(suite)}::${gobernanzaEntityId(mod)}`)
    );
    setModulosAbiertos(new Set(keys));
  }, [tree]);

  const recursosFlat = useMemo(
    () => (tree.length ? tree.flatMap((s) => s.modulos.flatMap((m) => m.formularios)) : flatFallback),
    [tree, flatFallback],
  );

  const selSet = useMemo(() => new Set(seleccionados.map((id) => String(id).trim())), [seleccionados]);

  const toggle = (id: string, on: boolean) => {
    const next = new Set(selSet);
    if (on) next.add(id);
    else next.delete(id);
    onChangeSeleccion(Array.from(next));
  };

  const toggleModulo = (_moduloKey: string, ids: string[], on: boolean) => {
    const next = new Set(selSet);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    onChangeSeleccion(Array.from(next));
  };

  const toggleModuloExpanded = (moduloKey: string) => {
    setModulosAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(moduloKey)) next.delete(moduloKey);
      else next.add(moduloKey);
      return next;
    });
  };

  if (loading) {
    return (
      <p className="px-3 py-3 text-xs text-muted-foreground">
        Cargando jerarquía desde countertiponodorutas…
      </p>
    );
  }

  if (!recursosFlat.length) {
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground">
        No hay formularios en countertiponodorutas. Sincroniza counter desde Gestión de rutas.
      </p>
    );
  }

  if (!tree.length) {
    return (
      <div className="space-y-1">
        {flatFallback.map((r) => (
          <label key={gobernanzaEntityId(r)} className="flex cursor-pointer items-start gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              className="accent-primary mt-0.5"
              disabled={disabled}
              checked={selSet.has(gobernanzaEntityId(r))}
              onChange={(e) => toggle(gobernanzaEntityId(r), e.target.checked)}
            />
            <span>
              <RecursoLabel name={r.name} path={r.path} />
            </span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tree.map((suite) => (
        <div key={gobernanzaEntityId(suite)} className="rounded-md border border-border/80 bg-muted/20">
          <div className="border-b border-border/60 bg-muted/40 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-foreground">
            {suite.name}
            <span className="ml-2 font-normal normal-case text-muted-foreground">Suite</span>
          </div>
          <div className="space-y-1 p-1.5">
            {suite.modulos.map((mod) => {
              const modKey = `${gobernanzaEntityId(suite)}::${gobernanzaEntityId(mod)}`;
              const ids = mod.formularios.map((f) => gobernanzaEntityId(f));
              const selectedInMod = ids.filter((id) => selSet.has(id)).length;
              const expanded = modulosAbiertos.has(modKey);
              return (
                <div key={modKey} className="rounded border border-border/70 bg-card">
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <button
                      type="button"
                      className="flex flex-1 items-center justify-between text-left text-xs font-semibold text-foreground hover:text-primary"
                      onClick={() => toggleModuloExpanded(modKey)}
                    >
                      <span>
                        {mod.name}
                        <span className="ml-1.5 font-normal text-muted-foreground">Módulo</span>
                      </span>
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {selectedInMod}/{ids.length} {expanded ? '▲' : '▼'}
                      </span>
                    </button>
                    {!disabled ? (
                      <button
                        type="button"
                        className="text-[10px] text-primary hover:underline shrink-0"
                        onClick={() => toggleModulo(modKey, ids, selectedInMod < ids.length)}
                      >
                        {selectedInMod < ids.length ? 'Todos' : 'Ninguno'}
                      </button>
                    ) : null}
                  </div>
                  {expanded ? (
                    <div className="border-t border-border/60 px-2 py-1 space-y-0.5">
                      {mod.formularios.map((f) => (
                        <label
                          key={gobernanzaEntityId(f)}
                          className="flex cursor-pointer items-start gap-2 py-0.5 text-xs text-foreground"
                          style={{ paddingLeft: f.tipo === 'SUBFORMULARIO' ? 12 : 0 }}
                        >
                          <input
                            type="checkbox"
                            className="accent-primary mt-0.5"
                            disabled={disabled}
                            checked={selSet.has(gobernanzaEntityId(f))}
                            onChange={(e) => toggle(gobernanzaEntityId(f), e.target.checked)}
                          />
                          <RecursoLabel name={f.name} path={f.path} tipo={f.tipo} />
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
