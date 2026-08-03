import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type ModuleHelpButtonProps = {
  id: string;
  title: string;
  description: string;
  details?: string[];
  compact?: boolean;
  className?: string;
};

export default function ModuleHelpButton({
  id,
  title,
  description,
  details = [],
  compact = false,
  className = '',
}: ModuleHelpButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          size="sm"
          className={`h-9 shrink-0 gap-1.5 px-2.5 ${className}`}
          aria-label={`Ayuda: ${title}`}
          title={`Ayuda: ${title}`}
        >
          <CircleHelp className="h-4 w-4" />
          {!compact && <span className="hidden sm:inline">Ayuda</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CircleHelp className="h-5 w-5" />{title}</DialogTitle>
          <DialogDescription className="text-left">{description}</DialogDescription>
        </DialogHeader>
        {details.length > 0 && (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {details.map((detail) => <li key={detail} className="rounded-md border p-2">{detail}</li>)}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
