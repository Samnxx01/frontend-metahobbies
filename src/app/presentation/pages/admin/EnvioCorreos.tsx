import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  DEFAULT_COLORS,
  EmailPaleta,
  PaletaColores,
  TIPOS_CORREO,
  TipoCorreo,
  ContenidoCorreo,
  CAMPOS_CONTENIDO,
  activarPaleta,
  actualizarPaleta,
  crearPaleta,
  eliminarPaleta,
  listarPaletas,
  previewEmail,
} from '@/app/services/emailPaletaService';
import { aplicarPaletaEnApp } from '@/app/utils/ColorUtils';

// Metadatos de cada color
const COLOR_META: Record<keyof PaletaColores, { label: string; zones: string[] }> = {
  COLOR_PRIMARY: { label: 'Color principal', zones: ['Botón CTA', 'Título', 'Logo', 'Texto de marca', 'Links'] },
  COLOR_ACCENT: { label: 'Color acento', zones: ['Borde del card', 'Borde ícono', 'Números de paso'] },
  COLOR_LIGHT: { label: 'Fondo ícono', zones: ['Círculo del ícono principal'] },
  COLOR_BG: { label: 'Fondo exterior', zones: ['Fondo del correo', 'Divisores'] },
  COLOR_CHAMPAGNE: { label: 'Fondo bloques', zones: ['Header', 'Footer', 'Bloque contraseña', 'Pasos'] },
  COLOR_SUNSET: { label: 'Acento cálido', zones: ['Franja superior', 'Borde bloque contraseña'] },
};

// Clases CSS del email → variable de color
const CLASS_ZONES: [string, keyof PaletaColores][] = [
  ['logo-mark', 'COLOR_PRIMARY'],
  ['brand', 'COLOR_PRIMARY'],
  ['header-accent', 'COLOR_PRIMARY'],
  ['header', 'COLOR_CHAMPAGNE'],
  ['badge-check', 'COLOR_LIGHT'],
  ['icon-wrap', 'COLOR_LIGHT'],
  ['hero-title', 'COLOR_PRIMARY'],
  ['title', 'COLOR_PRIMARY'],
  ['subtitle', 'COLOR_PRIMARY'],
  ['password-block', 'COLOR_CHAMPAGNE'],
  ['steps', 'COLOR_CHAMPAGNE'],
  ['btn', 'COLOR_PRIMARY'],
  ['step-num', 'COLOR_ACCENT'],
  ['footer', 'COLOR_CHAMPAGNE'],
  ['wrapper', 'COLOR_BG'],
  ['link-fallback', 'COLOR_CHAMPAGNE'],
  ['alert', 'COLOR_CHAMPAGNE'],
];

// Inyecta data-color-zone + script de interactividad en el HTML
function injectInteractivity(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    for (const [cls, key] of CLASS_ZONES) {
      doc.querySelectorAll(`.${cls}`).forEach(el => {
        el.setAttribute('data-color-zone', key);
      });
    }

    const script = doc.createElement('script');
    script.textContent = `
      var tip = document.createElement('div');
      tip.style.cssText = 'position:fixed;top:8px;right:8px;background:#1a1a1a;color:#fff;padding:3px 12px;border-radius:20px;font-size:11px;font-family:monospace;pointer-events:none;opacity:0;transition:opacity 0.2s;z-index:9999;white-space:nowrap';
      document.body.appendChild(tip);

      var lastEl = null;
      document.addEventListener('mouseover', function(e) {
        var el = e.target.closest('[data-color-zone]');
        if (lastEl && lastEl !== el) {
          lastEl.style.outline = '';
          lastEl.style.outlineOffset = '';
          lastEl.style.cursor = '';
        }
        if (el) {
          lastEl = el;
          el.style.outline = '2px dashed #C43670';
          el.style.outlineOffset = '2px';
          el.style.cursor = 'pointer';
          tip.textContent = '✏️ Editar ' + el.dataset.colorZone;
          tip.style.opacity = '1';
        } else {
          tip.style.opacity = '0';
        }
      });

      document.addEventListener('mouseleave', function() {
        if (lastEl) { lastEl.style.outline = ''; lastEl = null; }
        tip.style.opacity = '0';
      });

      document.addEventListener('click', function(e) {
        var el = e.target.closest('[data-color-zone]');
        if (el) {
          e.preventDefault();
          e.stopPropagation();
          window.parent.postMessage({ type: 'MABS_COLOR_ZONE', key: el.dataset.colorZone }, '*');
        }
      });
    `;
    doc.body.appendChild(script);

    return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
  } catch {
    return html;
  }
}

function isValidHex(v: string) { return /^#[0-9A-Fa-f]{6}$/.test(v); }

const EMPTY_FORM = { nombre: '', colores: { ...DEFAULT_COLORS } };

export default function EnvioCorreos() {
  const [paletas, setPaletas] = useState<EmailPaleta[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ nombre: string; colores: PaletaColores }>(EMPTY_FORM);
  const [hexDraft, setHexDraft] = useState<Partial<Record<keyof PaletaColores, string>>>({});
  const [tipoPreview, setTipoPreview] = useState<TipoCorreo>('activacion-membresia');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [contenido, setContenido] = useState<ContenidoCorreo>({});
  const [highlightedKey, setHighlightedKey] = useState<keyof PaletaColores | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorRowRefs = useRef<Partial<Record<keyof PaletaColores, HTMLDivElement | null>>>({});

  // Cargar lista
  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listarPaletas();
      const nuevasPaletas = (res.paletas ?? []).map(paleta => ({
        ...paleta,
        colores: { ...paleta.colores },
      }));
      setPaletas(nuevasPaletas);
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      toast.error(err.message ?? 'Error al cargar paletas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Escuchar postMessage del iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'MABS_COLOR_ZONE') return;
      const key = event.data.key as keyof PaletaColores;
      if (!DEFAULT_COLORS[key]) return;

      setHighlightedKey(key);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightedKey(null), 2500);

      setTimeout(() => {
        colorRowRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Preview con debounce
  const actualizarPreview = useCallback((colores: PaletaColores, tipo: TipoCorreo, cnt: ContenidoCorreo) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingPreview(true);
      try {
        const html = await previewEmail(tipo, colores, cnt);
        setPreviewHtml(html);
      } catch { /* silencioso */ }
      finally { setLoadingPreview(false); }
    }, 400);
  }, []);

  useEffect(() => {
    actualizarPreview(form.colores, tipoPreview, contenido);
  }, [form.colores, tipoPreview, contenido, actualizarPreview]);

  useEffect(() => { setContenido({}); }, [tipoPreview]);

  // Manejadores de color
  const handleColorPicker = (key: keyof PaletaColores, value: string) => {
    setForm(prev => ({ ...prev, colores: { ...prev.colores, [key]: value } }));
    setHexDraft(prev => ({ ...prev, [key]: value }));
  };

  const handleHexInput = (key: keyof PaletaColores, raw: string) => {
    const v = raw.startsWith('#') ? raw : `#${raw}`;
    setHexDraft(prev => ({ ...prev, [key]: v }));
    if (isValidHex(v)) {
      setForm(prev => ({ ...prev, colores: { ...prev.colores, [key]: v } }));
    }
  };

  const handleHexBlur = (key: keyof PaletaColores) => {
    const draft = hexDraft[key] ?? '';
    if (!isValidHex(draft)) {
      setHexDraft(prev => ({ ...prev, [key]: form.colores[key] }));
    }
  };

  const handleResetColor = (key: keyof PaletaColores) => {
    const def = DEFAULT_COLORS[key];
    setForm(prev => ({ ...prev, colores: { ...prev.colores, [key]: def } }));
    setHexDraft(prev => ({ ...prev, [key]: def }));
  };

  const handleResetAll = () => {
    setForm(prev => ({ ...prev, colores: { ...DEFAULT_COLORS } }));
    setHexDraft({});
  };

  const draftOrReal = (key: keyof PaletaColores) => hexDraft[key] !== undefined ? hexDraft[key]! : form.colores[key];
  const isModified = (key: keyof PaletaColores) => form.colores[key].toLowerCase() !== DEFAULT_COLORS[key].toLowerCase();

  // Manejadores de lista
  const handleEdit = (paleta: EmailPaleta) => {
    setEditingId(paleta._id);
    const colores = { ...DEFAULT_COLORS, ...paleta.colores };
    setForm({ nombre: paleta.nombre, colores });
    setHexDraft({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setHexDraft({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await actualizarPaleta(editingId, form);
        toast.success('Paleta actualizada');
      } else {
        await crearPaleta(form);
        toast.success('Paleta creada');
      }
      handleCancel();
      await cargar();
    } catch (err: any) {
      toast.error(err.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Activar paleta — aplica colores en la app inmediatamente
  const handleActivar = async (paleta: EmailPaleta) => {
    try {
      await activarPaleta(paleta._id);

      // Aplicar los colores en la app React al instante,
      // sin necesidad de recargar la página
      aplicarPaletaEnApp(paleta.colores);

      toast.success(`Paleta "${paleta.nombre}" activada — colores aplicados`);
      await cargar();
    } catch (err: any) {
      toast.error(err.message ?? 'Error al activar');
    }
  };

  const handleEliminar = async (paleta: EmailPaleta) => {
    if (paleta.activa) { toast.error('No puedes eliminar la paleta activa'); return; }
    if (!window.confirm(`¿Eliminar la paleta "${paleta.nombre}"?`)) return;
    try {
      await eliminarPaleta(paleta._id);
      toast.success('Paleta eliminada');
      await cargar();
    } catch (err: any) {
      toast.error(err.message ?? 'Error al eliminar');
    }
  };
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">

      {/* FORMULARIO + PREVIEW */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

        {/* Columna izquierda: Formulario */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle>{editingId ? 'Editar paleta' : 'Nueva paleta de correos'}</CardTitle>
              <button
                type="button"
                onClick={handleResetAll}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors shrink-0"
              >
                Restablecer defaults
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Nombre */}
              <div className="space-y-1">
                <Label htmlFor="nombre">Nombre de la paleta</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Paleta MABS Principal"
                  required
                />
              </div>

              {/* Editores de color */}
              <div>
                <p className="text-sm font-medium mb-1">Colores</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Haz clic en el swatch para abrir el selector, escribe el hex directamente, o
                  <span className="font-medium text-primary"> haz clic sobre cualquier zona del correo</span> en la vista previa para saltar al color correspondiente.
                </p>
                <div className="space-y-2">
                  {(Object.keys(DEFAULT_COLORS) as (keyof PaletaColores)[]).map(key => {
                    const meta = COLOR_META[key];
                    const val = form.colores[key];
                    const draft = draftOrReal(key);
                    const mod = isModified(key);
                    const valid = isValidHex(draft);
                    const isHighlight = highlightedKey === key;

                    return (
                      <div
                        key={key}
                        ref={el => { colorRowRefs.current[key] = el; }}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ${isHighlight
                          ? 'border-primary ring-2 ring-primary/40 bg-primary/8 scale-[1.01]'
                          : mod
                            ? 'border-primary/30 bg-primary/5'
                            : 'bg-muted/20 border-border'
                          }`}
                      >
                        {/* Swatch + picker nativo */}
                        <div className="relative shrink-0 group">
                          <div
                            className={`w-10 h-10 rounded-lg border border-black/10 shadow-sm transition-transform group-hover:scale-110 ${isHighlight ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                            style={{ background: val }}
                            title="Haz clic para abrir el selector"
                          />
                          <input
                            type="color"
                            value={val}
                            onChange={e => handleColorPicker(key, e.target.value)}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold">{meta.label}</span>
                            <span className="text-xs font-mono text-muted-foreground">{key}</span>
                            {isHighlight && (
                              <span className="text-[10px] text-primary font-semibold animate-pulse">← seleccionado desde preview</span>
                            )}
                            {!isHighlight && mod && (
                              <span className="text-[10px] text-primary">modificado</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {meta.zones.map(z => (
                              <span key={z} className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                                {z}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={draft}
                              onChange={e => handleHexInput(key, e.target.value)}
                              onBlur={() => handleHexBlur(key)}
                              maxLength={7}
                              spellCheck={false}
                              className={`w-24 h-6 px-2 rounded border font-mono text-xs outline-none focus:ring-1 transition-colors ${valid
                                ? 'border-border focus:ring-primary/40'
                                : 'border-destructive bg-destructive/10'
                                }`}
                              placeholder="#RRGGBB"
                            />
                            {!valid && (
                              <span className="text-[10px] text-destructive">Hex inválido</span>
                            )}
                          </div>
                        </div>

                        {/* Reset individual */}
                        {mod && (
                          <button
                            type="button"
                            onClick={() => handleResetColor(key)}
                            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title={`Restablecer a ${DEFAULT_COLORS[key]}`}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                              <path d="M3 3v5h5" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Guardando…' : editingId ? 'Actualizar paleta' : 'Crear paleta'}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Columna derecha: Preview interactivo */}
        <div className="space-y-3 xl:sticky xl:top-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold">Vista previa interactiva</p>
              <p className="text-xs text-muted-foreground">Haz clic en cualquier zona para editar ese color</p>
            </div>
            {loadingPreview && (
              <span className="text-xs text-muted-foreground animate-pulse">Actualizando…</span>
            )}
          </div>

          {/* Tabs tipo de correo */}
          <div className="flex flex-wrap gap-2">
            {TIPOS_CORREO.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipoPreview(t.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${tipoPreview === t.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-muted'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Edición de contenido por template */}
          {CAMPOS_CONTENIDO[tipoPreview].length > 0 && (
            <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contenido del correo</p>
              {CAMPOS_CONTENIDO[tipoPreview].map(campo => (
                <div key={campo.key} className="flex items-center gap-2">
                  <Label className="text-xs w-40 shrink-0">{campo.label}</Label>
                  <Input
                    type={campo.type ?? 'text'}
                    value={contenido[campo.key] ?? ''}
                    onChange={e => setContenido(prev => ({ ...prev, [campo.key]: e.target.value }))}
                    placeholder={campo.placeholder}
                    className="h-7 text-xs"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Iframe interactivo */}
          <div className="rounded-xl border overflow-hidden shadow-md bg-white">
            {previewHtml ? (
              <iframe
                srcDoc={injectInteractivity(previewHtml)}
                title="Vista previa interactiva del correo"
                className="w-full"
                style={{ height: 700, border: 'none' }}
                sandbox="allow-scripts"
              />
            ) : (
              <div className="flex items-center justify-center h-80 text-sm text-muted-foreground">
                {loadingPreview ? 'Generando preview…' : 'El preview aparecerá aquí'}
              </div>
            )}
          </div>

          {/* Leyenda de colores */}
          {previewHtml && (
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(DEFAULT_COLORS) as (keyof PaletaColores)[]).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setHighlightedKey(key);
                    if (highlightTimer.current) clearTimeout(highlightTimer.current);
                    highlightTimer.current = setTimeout(() => setHighlightedKey(null), 2500);
                    colorRowRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left transition-colors ${highlightedKey === key ? 'border-primary bg-primary/10' : 'hover:bg-muted/50 border-border'
                    }`}
                >
                  <div className="w-4 h-4 rounded-full shrink-0 border border-black/10" style={{ background: form.colores[key] }} />
                  <span className="text-[10px] font-mono truncate text-muted-foreground">{key.replace('COLOR_', '')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LISTA DE PALETAS GUARDADAS */}
      <div>
        <h2 className="text-base font-semibold mb-4">Paletas guardadas</h2>
        {loading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {!loading && paletas.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay paletas creadas aún.</p>
        )}
        <div key={refreshKey} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paletas.map(paleta => (
            <Card
              key={`${paleta._id}-${paleta.fechaActualizacion || paleta.fechaCreacion}`}
              className={`transition-shadow ${paleta.activa ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'}`}
            >
              <CardContent className="pt-4 space-y-3">

                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-sm leading-tight">{paleta.nombre}</span>
                  {paleta.activa && <Badge variant="default" className="shrink-0 text-xs">Activa</Badge>}
                </div>

                <div className="flex gap-1.5">
                  {(Object.entries(paleta.colores ?? {}) as [keyof PaletaColores, string][]).map(([key, val]) => (
                    <div
                      key={key}
                      title={`${key}: ${val}`}
                      className="w-7 h-7 rounded-full border border-black/10 shadow-sm shrink-0"
                      style={{ background: val || DEFAULT_COLORS[key] }}
                    />
                  ))}
                </div>

                <div
                  className="h-1.5 rounded-full"
                  style={{
                    background: `linear-gradient(90deg,
                      ${paleta.colores?.COLOR_PRIMARY ?? DEFAULT_COLORS.COLOR_PRIMARY}   0%,
                      ${paleta.colores?.COLOR_ACCENT ?? DEFAULT_COLORS.COLOR_ACCENT}    50%,
                      ${paleta.colores?.COLOR_SUNSET ?? DEFAULT_COLORS.COLOR_SUNSET}    100%)`
                  }}
                />

                <p className="text-xs text-muted-foreground">
                  {new Date(paleta.fechaCreacion).toLocaleDateString('es-CO', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </p>

                <div className="flex gap-2 flex-wrap pt-1">
                  {!paleta.activa && (
                    <Button size="sm" className="text-xs h-7" onClick={() => handleActivar(paleta)}>
                      Activar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleEdit(paleta)}>
                    Editar
                  </Button>
                  {!paleta.activa && (
                    <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => handleEliminar(paleta)}>
                      Eliminar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}