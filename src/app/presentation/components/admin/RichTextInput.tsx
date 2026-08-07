import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bold, Italic, Underline, RemoveFormatting, Palette } from 'lucide-react';
import {
    TOKENS_PALETA_SEMANTICA,
    colorResueltoDeToken,
    cssVarDeToken,
} from '@/app/utils/paletaSemanticaTokens';

const FONT_FAMILIES: { label: string; value: string }[] = [
    { label: 'Predeterminada', value: '__default__' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Times New Roman', value: "'Times New Roman', serif" },
    { label: 'Courier New', value: "'Courier New', monospace" },
    { label: 'Verdana', value: 'Verdana, sans-serif' },
    { label: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
];

const FONT_SIZES: { label: string; value: string }[] = [
    { label: 'Pequeña', value: '2' },
    { label: 'Normal', value: '3' },
    { label: 'Mediana', value: '4' },
    { label: 'Grande', value: '5' },
    { label: 'Muy grande', value: '6' },
];

interface RichTextInputProps {
    id?: string;
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: number;
}

/**
 * Editor de texto enriquecido liviano (sin dependencias) para parametrizar
 * estilos de fuente: negrita, cursiva, subrayado, fuente, tamano y color.
 * Entrega/recibe HTML con estilos inline.
 */
export default function RichTextInput({
    id,
    value,
    onChange,
    placeholder,
    minHeight = 96,
}: RichTextInputProps): React.ReactElement {
    const editorRef = useRef<HTMLDivElement>(null);
    /** Última selección hecha dentro del editor: los desplegables y el picker de
     *  color roban el foco, así que hay que restaurarla antes de aplicar estilos. */
    const rangoGuardadoRef = useRef<Range | null>(null);

    // Sincroniza el valor externo solo cuando el editor no tiene el foco,
    // para no perder la posicion del cursor mientras se escribe.
    useEffect(() => {
        const el = editorRef.current;
        if (!el) return;
        if (document.activeElement === el) return;
        if (el.innerHTML !== (value || '')) {
            el.innerHTML = value || '';
        }
    }, [value]);

    const emitChange = (): void => {
        const el = editorRef.current;
        if (!el) return;
        onChange(el.innerHTML);
    };

    const guardarSeleccion = (): void => {
        const el = editorRef.current;
        const seleccion = window.getSelection();
        if (!el || !seleccion || seleccion.rangeCount === 0) return;

        const rango = seleccion.getRangeAt(0);
        if (el.contains(rango.commonAncestorContainer)) {
            rangoGuardadoRef.current = rango.cloneRange();
        }
    };

    /** Devuelve el foco al editor con la selección que tenía el usuario. */
    const restaurarSeleccion = (): Range | null => {
        const el = editorRef.current;
        if (!el) return null;
        el.focus();

        const rango = rangoGuardadoRef.current;
        if (!rango || !el.contains(rango.commonAncestorContainer)) return null;

        const seleccion = window.getSelection();
        if (!seleccion) return null;
        seleccion.removeAllRanges();
        seleccion.addRange(rango);
        return rango;
    };

    const exec = (command: string, arg?: string): void => {
        const el = editorRef.current;
        if (!el) return;
        restaurarSeleccion();
        try {
            document.execCommand('styleWithCSS', false, 'true');
        } catch {
            /* navegadores antiguos */
        }
        document.execCommand(command, false, arg);
        guardarSeleccion();
        emitChange();
    };

    /**
     * Aplica un color de la paleta como referencia a la CSS var, no como HEX.
     * execCommand normaliza el color a un valor calculado y perdería el `var()`,
     * por eso la selección se envuelve manualmente con la Range API.
     */
    const aplicarColorPaleta = (token: string): void => {
        const el = editorRef.current;
        if (!el) return;

        const rango = restaurarSeleccion();
        if (!rango || rango.collapsed) return;

        const span = document.createElement('span');
        span.style.color = cssVarDeToken(token);
        span.appendChild(rango.extractContents());
        rango.insertNode(span);

        // Deja la selección sobre el texto recién coloreado.
        const seleccion = window.getSelection();
        if (seleccion) {
            seleccion.removeAllRanges();
            const nuevoRango = document.createRange();
            nuevoRango.selectNodeContents(span);
            seleccion.addRange(nuevoRango);
            rangoGuardadoRef.current = nuevoRango.cloneRange();
        }

        emitChange();
    };

    return (
        <div className="rounded-md border border-border bg-background">
            <div className="flex flex-wrap items-center gap-1 border-b border-border p-1.5">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Negrita"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => exec('bold')}
                >
                    <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Cursiva"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => exec('italic')}
                >
                    <Italic className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Subrayado"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => exec('underline')}
                >
                    <Underline className="h-3.5 w-3.5" />
                </Button>

                <Select onValueChange={(fontValue) => exec('fontName', fontValue === '__default__' ? 'inherit' : fontValue)}>
                    <SelectTrigger className="h-7 w-[150px] text-xs">
                        <SelectValue placeholder="Fuente" />
                    </SelectTrigger>
                    <SelectContent>
                        {FONT_FAMILIES.map((font) => (
                            <SelectItem key={font.value} value={font.value} className="text-xs">
                                {font.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select onValueChange={(sizeValue) => exec('fontSize', sizeValue)}>
                    <SelectTrigger className="h-7 w-[110px] text-xs">
                        <SelectValue placeholder="Tamaño" />
                    </SelectTrigger>
                    <SelectContent>
                        {FONT_SIZES.map((size) => (
                            <SelectItem key={size.value} value={size.value} className="text-xs">
                                {size.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select onValueChange={aplicarColorPaleta}>
                    <SelectTrigger
                        className="h-7 w-[170px] text-xs"
                        title="Color de la paleta activa: se guarda como referencia y sigue los cambios de la paleta"
                    >
                        <SelectValue placeholder="Color de paleta" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                        {TOKENS_PALETA_SEMANTICA.map((item) => (
                            <SelectItem key={item.token} value={item.token} className="text-xs">
                                <span className="flex items-center gap-2">
                                    <span
                                        className="inline-block h-3 w-3 rounded-full border border-border"
                                        style={{ backgroundColor: colorResueltoDeToken(item.token) }}
                                    />
                                    {item.label}
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <label
                    className="flex h-7 cursor-pointer items-center gap-1 rounded-md border border-border px-1.5 text-xs text-muted-foreground hover:bg-accent"
                    title="Color personalizado: se guarda como valor fijo, independiente de la paleta"
                >
                    <Palette className="h-3.5 w-3.5" />
                    Personalizado
                    <input
                        type="color"
                        className="h-4 w-6 cursor-pointer border-0 bg-transparent p-0"
                        onChange={(event) => exec('foreColor', event.target.value)}
                    />
                </label>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Limpiar formato"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => exec('removeFormat')}
                >
                    <RemoveFormatting className="h-3.5 w-3.5" />
                </Button>
            </div>

            <div
                id={id}
                ref={editorRef}
                contentEditable
                role="textbox"
                aria-multiline="true"
                data-placeholder={placeholder || ''}
                onInput={() => {
                    guardarSeleccion();
                    emitChange();
                }}
                onKeyUp={guardarSeleccion}
                onMouseUp={guardarSeleccion}
                onBlur={() => {
                    guardarSeleccion();
                    emitChange();
                }}
                className="w-full px-3 py-2 text-sm outline-none [&:empty::before]:pointer-events-none [&:empty::before]:text-muted-foreground [&:empty::before]:content-[attr(data-placeholder)]"
                style={{ minHeight }}
                suppressContentEditableWarning
            />
        </div>
    );
}
