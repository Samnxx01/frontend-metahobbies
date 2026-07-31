import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from '@/components/ui/popover';

interface MembresiaHelpButtonProps {
    id: string;
    title: string;
    description: string;
    items?: string[];
    iconOnly?: boolean;
    align?: 'start' | 'center' | 'end';
}

export default function MembresiaHelpButton({
    id,
    title,
    description,
    items = [],
    iconOnly = false,
    align = 'end',
}: MembresiaHelpButtonProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    size={iconOnly ? 'icon' : 'sm'}
                    className={iconOnly ? 'h-8 w-8 shrink-0' : 'h-8 shrink-0 gap-1.5 px-2.5 text-xs'}
                    aria-label={`Ayuda: ${title}`}
                    title={iconOnly ? 'Ayuda' : undefined}
                >
                    <CircleHelp className="h-3.5 w-3.5" />
                    {!iconOnly && <span>Ayuda</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent align={align} className="w-80 max-w-[calc(100vw-2rem)]">
                <PopoverHeader>
                    <PopoverTitle className="text-sm">{title}</PopoverTitle>
                    <PopoverDescription asChild>
                        <div className="space-y-3 pt-1 text-xs leading-relaxed text-muted-foreground">
                            <p>{description}</p>
                            {items.length > 0 && (
                                <ul className="list-disc space-y-1.5 pl-4">
                                    {items.map(item => <li key={item}>{item}</li>)}
                                </ul>
                            )}
                        </div>
                    </PopoverDescription>
                </PopoverHeader>
            </PopoverContent>
        </Popover>
    );
}
