import React, { useState } from 'react';
import type {
  PaletaRuta,
  PaletaRutaColores,
  ImgFondoConfig,
  BotonesConfig,
  RutaInfo,
} from '@/app/services/paletaRutaService';
import {
  DEFAULT_COLORES,
  DEFAULT_IMG_FONDO,
  DEFAULT_BOTONES_CONFIG,
} from '@/app/services/paletaRutaService';
import ColorPickerField from './ColorPickerField';
import PaletaPreview from './PaletaPreview';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  paletaInicial?: PaletaRuta;
  rutasDisponibles: RutaInfo[];
  onGuardar: (data: FormPayload) => void;
  onCancelar: () => void;
  cargando?: boolean;
}

export interface FormPayload {
  rutaId: string;
  nombre: string;
  activa: boolean;
  colores: PaletaRutaColores;
  imgFondo: ImgFondoConfig;
  botonesConfig: BotonesConfig;
}

// ─── Etiquetas de campos de color ─────────────────────────────────────────────

const COLOR_LABELS: Record<keyof PaletaRutaColores, { label: string; desc: string }> = {
  colorFondo:               { label: 'Fondo principal',           desc: 'Fondo de la vista completa' },
  colorFondoSecundario:     { label: 'Fondo secundario',          desc: 'Fondo de tarjetas y paneles' },
  colorPrimario:            { label: 'Color primario',            desc: 'Títulos y elementos destacados' },
  colorSecundario:          { label: 'Color secundario',          desc: 'Elementos de apoyo' },
  colorTexto:               { label: 'Texto principal',           desc: 'Texto de cuerpo' },
  colorTextoSecundario:     { label: 'Texto secundario',          desc: 'Subtítulos y descripciones' },
  colorNavbar:              { label: 'Fondo navbar',              desc: 'Barra de navegación' },
  colorNavbarTexto:         { label: 'Texto navbar',              desc: 'Texto e íconos del navbar' },
  colorBotonPrimario:       { label: 'Botón primario (fondo)',    desc: 'Fondo del botón principal' },
  colorBotonPrimarioTexto:  { label: 'Botón primario (texto)',    desc: 'Texto del botón principal' },
  colorBotonSecundario:     { label: 'Botón secundario (fondo)',  desc: 'Fondo del botón secundario' },
  colorBotonSecundarioTexto:{ label: 'Botón secundario (texto)', desc: 'Texto del botón secundario' },
  colorBorde:               { label: 'Borde',                     desc: 'Bordes de tarjetas y elementos' },
  colorSombra:              { label: 'Sombra',                    desc: 'Sombra de tarjetas (admite alfa, ej: #00000020)' },
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PaletaRutaForm({
  paletaInicial,
  rutasDisponibles,
  onGuardar,
  onCancelar,
  cargando = false,
}: Props) {
  const [rutaId, setRutaId] = useState<string>(
    typeof paletaInicial?.rutaId === 'object'
      ? paletaInicial.rutaId._id
      : (paletaInicial?.rutaId as string | undefined) ?? ''
  );
  const [nombre, setNombre] = useState(paletaInicial?.nombre ?? '');
  const [activa, setActiva] = useState(paletaInicial?.activa ?? true);
  const [colores, setColores] = useState<PaletaRutaColores>(
    paletaInicial?.colores ?? { ...DEFAULT_COLORES }
  );
  const [imgFondo, setImgFondo] = useState<ImgFondoConfig>(
    paletaInicial?.imgFondo ?? { ...DEFAULT_IMG_FONDO }
  );
  const [botonesConfig, setBotonesConfig] = useState<BotonesConfig>(
    paletaInicial?.botonesConfig ?? { ...DEFAULT_BOTONES_CONFIG }
  );

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const setColor = (key: keyof PaletaRutaColores) => (color: string) => {
    setColores((prev) => ({ ...prev, [key]: color }));
  };

  const setImgField = <K extends keyof ImgFondoConfig>(
    key: K,
    value: ImgFondoConfig[K]
  ) => {
    setImgFondo((prev) => ({ ...prev, [key]: value }));
  };

  const setBtnField = <K extends keyof BotonesConfig>(
    key: K,
    value: BotonesConfig[K]
  ) => {
    setBotonesConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGuardar({ rutaId, nombre, activa, colores, imgFondo, botonesConfig });
  };

  const rutaSeleccionada = rutasDisponibles.find((r) => r._id === rutaId);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Cabecera: nombre + ruta + activa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="paleta-nombre">Nombre de la paleta</Label>
          <Input
            id="paleta-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Paleta dashboard principal"
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="paleta-ruta">Ruta asociada</Label>
          <select
            id="paleta-ruta"
            value={rutaId}
            onChange={(e) => setRutaId(e.target.value)}
            required
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm
                       shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Seleccionar ruta...</option>
            {rutasDisponibles.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name} — {r.path}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="paleta-activa"
          checked={activa}
          onCheckedChange={setActiva}
        />
        <Label htmlFor="paleta-activa" className="cursor-pointer">
          Paleta activa
        </Label>
      </div>

      {/* Tabs de secciones */}
      <Tabs defaultValue="colores">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="colores">Colores</TabsTrigger>
          <TabsTrigger value="imagen">Imagen de fondo</TabsTrigger>
          <TabsTrigger value="botones">Botones</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* ── Tab: Colores ─────────────────────────────────────────── */}
        <TabsContent value="colores" className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(COLOR_LABELS) as Array<keyof PaletaRutaColores>).map((key) => (
              <ColorPickerField
                key={key}
                label={COLOR_LABELS[key].label}
                value={colores[key]}
                onChange={setColor(key)}
                descripcion={COLOR_LABELS[key].desc}
              />
            ))}
          </div>
        </TabsContent>

        {/* ── Tab: Imagen de fondo ─────────────────────────────────── */}
        <TabsContent value="imagen" className="pt-4 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="img-url">URL de la imagen</Label>
            <Input
              id="img-url"
              type="url"
              value={imgFondo.url ?? ''}
              onChange={(e) =>
                setImgField('url', e.target.value || null)
              }
              placeholder="https://ejemplo.com/imagen.jpg"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="img-opacidad">
              Opacidad: {Math.round(imgFondo.opacidad * 100)}%
            </Label>
            <input
              id="img-opacidad"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={imgFondo.opacidad}
              onChange={(e) => setImgField('opacidad', parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="img-tamano">Tamaño</Label>
              <select
                id="img-tamano"
                value={imgFondo.tamaño}
                onChange={(e) =>
                  setImgField('tamaño', e.target.value as ImgFondoConfig['tamaño'])
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm
                           shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="cover">cover</option>
                <option value="contain">contain</option>
                <option value="auto">auto</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="img-repetir">Repetir</Label>
              <select
                id="img-repetir"
                value={imgFondo.repetir}
                onChange={(e) =>
                  setImgField('repetir', e.target.value as ImgFondoConfig['repetir'])
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm
                           shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="no-repeat">no-repeat</option>
                <option value="repeat">repeat</option>
                <option value="repeat-x">repeat-x</option>
                <option value="repeat-y">repeat-y</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="img-posicion">Posición</Label>
            <Input
              id="img-posicion"
              value={imgFondo.posicion}
              onChange={(e) => setImgField('posicion', e.target.value)}
              placeholder="center center"
            />
          </div>
        </TabsContent>

        {/* ── Tab: Botones ─────────────────────────────────────────── */}
        <TabsContent value="botones" className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="btn-animacion">Animación</Label>
              <select
                id="btn-animacion"
                value={botonesConfig.animacion}
                onChange={(e) =>
                  setBtnField('animacion', e.target.value as BotonesConfig['animacion'])
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm
                           shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="none">Sin animación</option>
                <option value="pulse">Pulse</option>
                <option value="bounce">Bounce</option>
                <option value="shake">Shake</option>
                <option value="glow">Glow</option>
                <option value="scale">Scale (hover)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="btn-radio">Radio de borde</Label>
              <Input
                id="btn-radio"
                value={botonesConfig.bordeRadio}
                onChange={(e) => setBtnField('bordeRadio', e.target.value)}
                placeholder="0.375rem"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="btn-grosor">Grosor de borde</Label>
              <Input
                id="btn-grosor"
                value={botonesConfig.grosorBorde}
                onChange={(e) => setBtnField('grosorBorde', e.target.value)}
                placeholder="1px"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="btn-sombra"
                checked={botonesConfig.sombra}
                onCheckedChange={(val) => setBtnField('sombra', val)}
              />
              <Label htmlFor="btn-sombra" className="cursor-pointer">
                Sombra en botones
              </Label>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab: Preview ─────────────────────────────────────────── */}
        <TabsContent value="preview" className="pt-4">
          <PaletaPreview
            colores={colores}
            imgFondo={imgFondo}
            botonesConfig={botonesConfig}
            nombreRuta={rutaSeleccionada?.name}
          />
        </TabsContent>
      </Tabs>

      {/* Acciones */}
      <div className="flex justify-end gap-3 pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onCancelar}
          disabled={cargando}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={cargando}>
          {cargando ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar paleta'
          )}
        </Button>
      </div>
    </form>
  );
}
