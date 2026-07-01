import React, { useMemo } from 'react';
import { Link2, Loader2, Plus, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GobernanzaModuloAccionesSelector } from './GobernanzaModuloAccionesSelector';
import { GobernanzaModuloTipoCrearButton } from './GobernanzaModuloTipoCrearDialog';
import { GobernanzaModuloSearchableSelect } from './GobernanzaModuloSearchableSelect';
import { useGobernanzaModuloTiposSections } from './useGobernanzaModuloTiposSections';
import type { useGobernanzaModuloParametrizar } from './useGobernanzaModuloParametrizar';

export type GobernanzaModuloParametrizarState = ReturnType<typeof useGobernanzaModuloParametrizar>;

export type GobernanzaModuloParametrizarFieldsProps = {
  state: GobernanzaModuloParametrizarState;
  moduloSlug: string;
};

function FieldCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="rounded-xl border border-border/80 bg-card/60 p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </section>
  );
}

export function GobernanzaModuloParametrizarFields({
  state,
  moduloSlug,
}: GobernanzaModuloParametrizarFieldsProps): React.ReactElement {
  const {
    label,
    setLabel,
    description,
    setDescription,
    tipoId,
    seleccionarTipoModulo,
    tipoSeleccionado,
    tiposOpciones,
    tiposLoading,
    sectionKey,
    tipoSectionFiltro,
    seleccionarTipoSectionFiltro,
    moduloTipos,
    rutaId,
    setRutaId,
    rutas,
    rutaSeleccionada,
    rutasLoading,
    formularioError,
    cargandoFormulario,
    accionesPublicables,
    accionesSeleccionadas,
    setAccionesSeleccionadas,
    accionesPublicadas,
    cargandoAccionesModulo,
    cargandoAccionesCatalogo,
    configCargada,
    configSlug,
    configsOpciones,
    seleccionarConfig,
    iniciarConfigNuevo,
    CONFIG_NUEVO,
    esModoNuevo,
    cargandoConfigSeleccionada,
    refrescarAcciones,
    refrescarTipos,
    componenteActivo,
  } = state;

  const { sections: sectionsBd, loading: sectionsLoading, refresh: refreshSectionsBd } =
    useGobernanzaModuloTiposSections(true, tipoSectionFiltro);

  const cargandoInicial = (cargandoAccionesModulo && !configCargada) || cargandoAccionesCatalogo;

  const accionesParaSelector = useMemo(
    () =>
      accionesPublicables.map((a) => ({
        accionId: a.accionId,
        method: String(a.method || 'GET').toUpperCase(),
        title: a.title || a.accionId,
      })),
    [accionesPublicables]
  );

  const registradasCount = accionesPublicadas.filter((a) => a.id).length;

  const rutasSelectOptions = useMemo(
    () =>
      rutas.map((r) => ({
        value: r.id,
        searchText: [r.name, r.path, r.component, r.id].filter(Boolean).join(' '),
        label: (
          <>
            <span className="font-medium">{r.name || 'Sin nombre'}</span>
            {r.path ? <span className="ml-1 text-muted-foreground">· {r.path}</span> : null}
          </>
        ),
      })),
    [rutas],
  );

  const tiposSelectOptions = useMemo(
    () =>
      tiposOpciones.map((o) => ({
        value: o.value,
        searchText: o.label,
        label: o.label,
      })),
    [tiposOpciones],
  );

  const configsSelectOptions = useMemo(
    () =>
      configsOpciones.map((o) => ({
        value: o.value,
        searchText: [o.label, o.hint].filter(Boolean).join(' '),
        label: (
          <>
            <span className="font-medium">{o.label}</span>
            {o.hint ? <span className="ml-1 text-muted-foreground">· {o.hint}</span> : null}
          </>
        ),
      })),
    [configsOpciones],
  );

  return (
    <div className="space-y-4">
      {cargandoInicial ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Cargando parametrización…
        </p>
      ) : null}

      <FieldCard title="Ruta y tipo" icon={<Link2 className="h-4 w-4 text-primary" aria-hidden />}>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="gm-ruta" className="text-xs text-muted-foreground">
              Ruta (rutaseguridads)
            </Label>
            <GobernanzaModuloSearchableSelect
              id="gm-ruta"
              value={rutaId}
              onValueChange={setRutaId}
              options={rutasSelectOptions}
              disabled={rutasLoading}
              placeholder={rutasLoading ? 'Cargando…' : 'Selecciona la ruta'}
              searchPlaceholder="Buscar por nombre, path o componente…"
              emptyMessage="No hay rutas que coincidan"
            />
            {rutaSeleccionada?.path ? (
              <p className="truncate font-mono text-[11px] text-muted-foreground">{rutaSeleccionada.path}</p>
            ) : null}
            {rutaSeleccionada?.component ? (
              <p className="text-[11px] text-muted-foreground">
                Componente:{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono">{rutaSeleccionada.component}</code>
              </p>
            ) : null}
            {rutaId ? (
              <p className="text-[11px] text-muted-foreground">
                Se guardará la relación con rutaseguridads (id):{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono">{rutaId}</code>
              </p>
            ) : null}
            {formularioError ? <p className="text-xs text-destructive">{formularioError}</p> : null}
            {!rutasLoading && rutas.length === 0 ? (
              <p className="rounded-md border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                No hay rutas disponibles. Créala en Seguridad → Rutas.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gm-tipo-section" className="text-xs text-muted-foreground">
              Section (filtro de tipos)
            </Label>
            <Select
              value={tipoSectionFiltro}
              onValueChange={seleccionarTipoSectionFiltro}
              disabled={sectionsLoading}
            >
              <SelectTrigger id="gm-tipo-section" className="h-10">
                <SelectValue placeholder={sectionsLoading ? 'Cargando…' : 'Section'} />
              </SelectTrigger>
              <SelectContent>
                {sectionsBd.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Section canónica en <code className="rounded bg-muted px-1">gobernanzaModuloTipos</code>
              {sectionsBd.length ? ` (${sectionsBd.join(', ')})` : ''}. Para reglas SA usa <code className="rounded bg-muted px-1">reglas</code> (reglas-sa en la URL se normaliza sola).
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="gm-tipo" className="text-xs text-muted-foreground">
                Tipo (gobernanzaModuloTipos)
              </Label>
              <GobernanzaModuloTipoCrearButton
                section={tipoSectionFiltro}
                formularioComponentHint={componenteActivo || rutaSeleccionada?.component}
                disabled={tiposLoading}
                onCreated={(tipo) => {
                  const sec = String(tipo.section || tipoSectionFiltro).trim().toLowerCase();
                  void refreshSectionsBd();
                  if (sec && sec !== tipoSectionFiltro) {
                    seleccionarTipoSectionFiltro(sec);
                  }
                  void refrescarTipos(sec);
                  if (tipo.id) seleccionarTipoModulo(tipo.id);
                }}
              />
            </div>
            <GobernanzaModuloSearchableSelect
              id="gm-tipo"
              value={tipoId || ''}
              onValueChange={seleccionarTipoModulo}
              options={tiposSelectOptions}
              disabled={tiposLoading || tiposOpciones.length === 0}
              placeholder={tiposLoading ? 'Cargando…' : 'Selecciona el tipo'}
              searchPlaceholder="Buscar tipo…"
              emptyMessage="No hay tipos que coincidan"
            />
            {tipoSeleccionado ? (
              <p className="text-[11px] text-muted-foreground">
                {tipoSeleccionado.section ? (
                  <>Section: <code className="rounded bg-muted px-1">{tipoSeleccionado.section}</code></>
                ) : null}
                {tipoSeleccionado.codigo ? (
                  <>{tipoSeleccionado.section ? ' · ' : ''}Código: {tipoSeleccionado.codigo}</>
                ) : null}
              </p>
            ) : null}
            {!tiposLoading && moduloTipos.length === 0 ? (
              <p className="rounded-md border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                No hay tipos para section «{tipoSectionFiltro}». Pulsa + para crear uno en gobernanzaModuloTipos.
              </p>
            ) : null}
          </div>
        </div>
      </FieldCard>

      <FieldCard title="Identidad del módulo" icon={<Tag className="h-4 w-4 text-primary" aria-hidden />}>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="gm-label" className="text-xs text-muted-foreground">
                Nombre (gobernanzaModuloConfigs)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                title="Crear módulo nuevo"
                onClick={() => iniciarConfigNuevo()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {esModoNuevo || configsOpciones.length === 0 ? (
              <Input
                id="gm-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ej. Visualizar permisos"
                className="h-10"
              />
            ) : (
              <GobernanzaModuloSearchableSelect
                id="gm-label"
                value={configSlug || ''}
                onValueChange={(v) => void seleccionarConfig(v)}
                options={[
                  ...configsSelectOptions,
                  { value: CONFIG_NUEVO, label: '+ Nuevo módulo', searchText: 'nuevo modulo' },
                ]}
                disabled={cargandoConfigSeleccionada}
                placeholder={
                  cargandoConfigSeleccionada ? 'Cargando módulo…' : 'Selecciona un módulo publicado'
                }
                searchPlaceholder="Buscar módulo…"
                emptyMessage="No hay módulos que coincidan"
              />
            )}
            {configSlug && !esModoNuevo && label ? (
              <p className="text-[11px] text-muted-foreground">Nombre: {label}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gm-desc">Descripción</Label>
            <Textarea
              id="gm-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción visible en el menú"
              className="min-h-[72px] resize-y"
            />
          </div>
        </div>
      </FieldCard>

      <GobernanzaModuloAccionesSelector
        acciones={accionesParaSelector}
        seleccion={accionesSeleccionadas}
        onSeleccionChange={setAccionesSeleccionadas}
        loading={cargandoInicial}
        refreshLoading={cargandoAccionesModulo || cargandoAccionesCatalogo}
        onRefresh={refrescarAcciones}
        origen="gobernanzaModuloConfigs"
      />

      {registradasCount > 0 ? (
        <p className="text-center text-[11px] text-muted-foreground">
          {registradasCount} operación(es) guardada(s) para esta ruta.
        </p>
      ) : null}
    </div>
  );
}
