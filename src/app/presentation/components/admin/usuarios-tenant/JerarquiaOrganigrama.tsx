import React from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const PASOS = [
    { id: 'sa', label: 'Super Admin', desc: 'tenantJerarquiaCounter sin campo corporativo' },
    { id: 'corp', label: 'Rol corporativo', desc: 'Operadores corp.' },
    { id: 'tg', label: 'Tenant global', desc: 'Empresa / TG' },
    { id: 'rama', label: 'Corporativos y usuarios', desc: 'Ramas y cuentas' },
];

/** Leyenda horizontal / vertical según pantalla: orden del organigrama */
type OrganigramaLegendaProps = {
    className?: string;
};

export function OrganigramaLegenda({ className }: OrganigramaLegendaProps = {}): React.ReactElement {
    return (
        <div
            className={cn(
                'mb-6 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-primary/[0.04] px-3 py-4 shadow-sm',
                className,
            )}
        >
            <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Organigrama · orden jerárquico
            </p>
            <div className="flex flex-col items-center gap-1 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-1 sm:gap-y-2">
                {PASOS.map((p, i) => (
                    <React.Fragment key={p.id}>
                        {i > 0 && (
                            <>
                                <ChevronDown className="h-4 w-4 shrink-0 text-primary/45 sm:hidden" aria-hidden />
                                <span className="hidden px-1 text-primary/40 sm:inline" aria-hidden>
                                    →
                                </span>
                            </>
                        )}
                        <span
                            className="inline-flex max-w-[220px] flex-col items-center gap-0.5 rounded-lg border border-primary/15 bg-background/95 px-3 py-2 text-center shadow-sm sm:max-w-none sm:inline-flex sm:flex-row sm:gap-2 sm:py-1.5 sm:text-left"
                            title={`${p.label}: ${p.desc}`}
                        >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                                {i + 1}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-xs font-semibold leading-tight text-foreground">{p.label}</span>
                                <span className="block text-[10px] leading-tight text-muted-foreground">{p.desc}</span>
                            </span>
                        </span>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

type OrganigramaLegendaInfoButtonProps = {
    className?: string;
    label?: string;
};

export function OrganigramaLegendaInfoButton({
    className,
    label = 'Orden jerárquico',
}: OrganigramaLegendaInfoButtonProps): React.ReactElement {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn('h-8 shrink-0 gap-1.5 text-xs', className)}
                    aria-label="Ver orden jerárquico del organigrama"
                >
                    <Info className="h-3.5 w-3.5" />
                    {label}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto max-w-[min(calc(100vw-2rem),32rem)] border-0 p-0 shadow-lg"
                align="end"
                sideOffset={8}
            >
                <OrganigramaLegenda className="mb-0 border-0 shadow-none" />
            </PopoverContent>
        </Popover>
    );
}

type OrganigramaColumnProps = {
    /** Paso dentro del organigrama visible (1, 2, 3…) según lo que se muestre */
    orden: number;
    titulo: string;
    descripcion?: string;
    headerAction?: React.ReactNode;
    children: React.ReactNode;
};

/** Bloque numerado del organigrama (nivel visual alineado al flujo 1→2→3) */
export function OrganigramaColumn({
    orden,
    titulo,
    descripcion,
    headerAction,
    children,
}: OrganigramaColumnProps): React.ReactElement {
    const mod = ((orden - 1) % 3) + 1;
    const accent =
        mod === 1
            ? 'border-l-primary bg-primary/[0.04]'
            : mod === 2
              ? 'border-l-amber-500/70 bg-warning/[0.04]'
              : 'border-l-violet-500/70 bg-info/[0.03]';

    return (
        <div className={`relative overflow-hidden rounded-xl border border-border/90 shadow-sm ${accent} border-l-[4px]`}>
            <div className="border-b border-border/50 bg-muted/30 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/90 text-xs font-bold text-primary-foreground shadow-sm">
                            {orden}
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-sm font-semibold leading-snug text-foreground">{titulo}</h2>
                            {descripcion && (
                                <p className="mt-0.5 text-[11px] text-muted-foreground">{descripcion}</p>
                            )}
                        </div>
                    </div>
                    {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
                </div>
            </div>
            <div className="p-3 sm:p-4">{children}</div>
        </div>
    );
}

/** Conector entre dos niveles (línea + flecha) */
export function OrganigramaConector(): React.ReactElement {
    return (
        <div className="flex flex-col items-center py-2" aria-hidden>
            <div className="h-6 w-px bg-gradient-to-b from-primary/50 to-primary/20" />
            <div
                className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[7px] border-l-transparent border-r-transparent border-t-primary/45"
                style={{ marginTop: -1 }}
            />
        </div>
    );
}
