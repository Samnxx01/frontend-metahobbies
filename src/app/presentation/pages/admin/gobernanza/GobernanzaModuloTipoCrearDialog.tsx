import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { upsertGobernanzaModuloTipo } from './gobernanzaModuloService';
import type { GobernanzaModuloTipoApi } from './gobernanzaModuloApiTypes';
import {
  defaultsTipoDesdeComponente,
  esSectionSlugValido,
  GOBERNANZA_MODULO_SECTION_NUEVA,
  normalizarSectionInput,
  resolverSectionParaUpsert,
} from './gobernanzaModuloTipoDefaults';
import { useGobernanzaModuloTiposSections } from './useGobernanzaModuloTiposSections';

export type GobernanzaModuloTipoCrearDialogProps = {
  section?: string;
  formularioComponentHint?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (tipo: GobernanzaModuloTipoApi) => void;
};

export function GobernanzaModuloTipoCrearDialog({
  section: sectionProp = 'permisos',
  formularioComponentHint = null,
  open,
  onOpenChange,
  onCreated,
}: GobernanzaModuloTipoCrearDialogProps): React.ReactElement {
  const hints = useMemo(
    () => defaultsTipoDesdeComponente(formularioComponentHint),
    [formularioComponentHint]
  );

  const sectionSugerida = useMemo(() => {
    const fromProp = normalizarSectionInput(sectionProp);
    if (esSectionSlugValido(fromProp)) return fromProp;
    if (hints.section) return hints.section;
    return 'permisos';
  }, [sectionProp, hints.section]);

  const { sections, loading: sectionsLoading, refresh: refreshSections } =
    useGobernanzaModuloTiposSections(open, sectionSugerida);

  const sectionInicial = useMemo(() => {
    if (sections.includes(sectionSugerida)) return sectionSugerida;
    return sections[0] || sectionSugerida;
  }, [sections, sectionSugerida]);

  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [sectionModo, setSectionModo] = useState<'existente' | 'nueva'>('existente');
  const [sectionExistente, setSectionExistente] = useState(sectionInicial);
  const [sectionNueva, setSectionNueva] = useState('');
  const [guardando, setGuardando] = useState(false);

  const aplicarDefaults = () => {
    setNombre('');
    setCodigo(hints.codigo);
    setSectionModo('existente');
    setSectionExistente(sectionInicial);
    setSectionNueva('');
  };

  useEffect(() => {
    if (!open) return;
    aplicarDefaults();
  }, [open, sectionInicial, hints.codigo]);

  useEffect(() => {
    if (!open || sectionModo === 'nueva') return;
    if (sections.includes(sectionExistente)) return;
    setSectionExistente(sectionInicial);
  }, [open, sections, sectionInicial, sectionModo, sectionExistente]);

  const guardar = async () => {
    const nombreTrim = nombre.trim();
    if (!nombreTrim) {
      toast.error('El nombre del tipo es obligatorio.');
      return;
    }

    const section = resolverSectionParaUpsert(
      sectionModo === 'nueva' ? 'custom' : 'catalog',
      sectionExistente,
      sectionNueva,
      sectionInicial
    );

    if (!esSectionSlugValido(section)) {
      toast.error('Section inválida. Usa minúsculas y guiones (ej. permisos, reglas-tenant).');
      return;
    }

    const component = String(hints.formularioComponent || '').trim();

    setGuardando(true);
    try {
      const tipo = await upsertGobernanzaModuloTipo({
        section,
        nombre: nombreTrim,
        ...(codigo.trim() ? { codigo: codigo.trim() } : {}),
        ...(component ? { formularioComponent: component } : {}),
      });
      toast.success(`Tipo «${tipo.nombre}» guardado (section «${section}»).`);
      await refreshSections();
      onCreated?.(tipo);
      aplicarDefaults();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el tipo');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo tipo de formulario</DialogTitle>
          <DialogDescription>
            Elige una <span className="font-medium">section</span> ya creada en{' '}
            <code className="rounded bg-muted px-1 text-xs">gobernanzaModuloTipos</code> o define una
            nueva. El tipo queda asociado a esa section.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="tipo-section">Section</Label>
            <Select
              value={sectionModo === 'nueva' ? GOBERNANZA_MODULO_SECTION_NUEVA : sectionExistente}
              onValueChange={(value) => {
                if (value === GOBERNANZA_MODULO_SECTION_NUEVA) {
                  setSectionModo('nueva');
                  setSectionNueva(sectionExistente);
                  return;
                }
                setSectionModo('existente');
                setSectionExistente(value);
              }}
              disabled={sectionsLoading}
            >
              <SelectTrigger id="tipo-section" className="h-10">
                <SelectValue
                  placeholder={sectionsLoading ? 'Cargando sections…' : 'Selecciona section'}
                />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
                <SelectItem value={GOBERNANZA_MODULO_SECTION_NUEVA}>
                  + Nueva section…
                </SelectItem>
              </SelectContent>
            </Select>
            {sectionModo === 'nueva' ? (
              <Input
                value={sectionNueva}
                onChange={(e) => setSectionNueva(e.target.value)}
                placeholder="Ej. permisos, reglas, mi-modulo"
                className="font-mono text-sm"
              />
            ) : null}
            {sectionsLoading ? (
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Leyendo sections desde gobernanzaModuloTipos…
              </p>
            ) : sections.length ? (
              <p className="text-[11px] text-muted-foreground">
                {sections.length} section(s) en BD: {sections.join(', ')}
              </p>
            ) : (
              <p className="text-[11px] text-warning">
                No hay sections en BD aún. Usa «+ Nueva section…» para crear la primera.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tipo-nombre">Nombre</Label>
            <Input
              id="tipo-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Listar herencias"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tipo-codigo">Código (opcional)</Label>
            <Input
              id="tipo-codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder={hints.codigo || 'permisos-listar-herencias'}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={guardando || sectionsLoading} onClick={() => void guardar()}>
            {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Crear tipo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GobernanzaModuloTipoCrearButton({
  section,
  formularioComponentHint,
  onCreated,
  disabled,
}: Omit<GobernanzaModuloTipoCrearDialogProps, 'open' | 'onOpenChange'> & {
  disabled?: boolean;
}): React.ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        title="Crear tipo manualmente"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <GobernanzaModuloTipoCrearDialog
        section={section}
        formularioComponentHint={formularioComponentHint}
        open={open}
        onOpenChange={setOpen}
        onCreated={onCreated}
      />
    </>
  );
}
