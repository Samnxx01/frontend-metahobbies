import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { CircleHelp, Maximize2, Minimize2, X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const textFromNode = (node: React.ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node).trim();
  if (Array.isArray(node)) return node.map(textFromNode).filter(Boolean).join(' ').trim();
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textFromNode(node.props.children);
  return '';
};

const findDialogText = (node: React.ReactNode, target: 'title' | 'description'): string => {
  const nodes = React.Children.toArray(node);
  for (const child of nodes) {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) continue;
    const type = child.type as { displayName?: string };
    const displayName = String(type?.displayName || '').toLowerCase();
    if (displayName.includes(target)) return textFromNode(child.props.children);
    const nested = findDialogText(child.props.children, target);
    if (nested) return nested;
  }
  return '';
};

const hasOwnHelpControl = (node: React.ReactNode): boolean => React.Children.toArray(node).some((child) => {
  if (!React.isValidElement<{ children?: React.ReactNode; title?: string; 'aria-label'?: string; id?: string }>(child)) return false;
  const marker = [child.props.title, child.props['aria-label'], child.props.id, textFromNode(child.props.children)]
    .filter(Boolean).join(' ').toLowerCase();
  if (marker.includes('ayuda') || marker.includes('help')) return true;
  return hasOwnHelpControl(child.props.children);
});

interface DialogOverlayProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> {}

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  DialogOverlayProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, ...props }, ref) => {
  // Si el consumidor no pasa aria-describedby ni renderiza su propio DialogDescription,
  // generamos uno oculto (sin id propio: dejamos que Radix use SU id interno vía contexto,
  // el mismo que ya asigna automáticamente a aria-describedby en Content). Ponerle un id
  // manual aquí rompe el enlace y Radix sigue advirtiendo aunque el elemento exista.
  const hasExplicitDescribedBy = 'aria-describedby' in props;
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const helpId = React.useId().replace(/:/g, '');
  const modalTitle = findDialogText(children, 'title') || 'este formulario';
  const ownDescriptionText = findDialogText(children, 'description');
  const hasOwnDescription = Boolean(ownDescriptionText);
  const modalDescription = ownDescriptionText || `Completa los campos de ${modalTitle} y revisa la información antes de guardar o confirmar.`;
  const showAutomaticHelp = !hasOwnHelpControl(children);
  const currentPath = typeof window !== 'undefined' ? String(window.location?.pathname || '').toLowerCase() : '';
  const isInventoryRoute = currentPath.includes('/inventory') || currentPath.includes('/inventario');
  const inventoryMobileViewportClass = isInventoryRoute
    ? 'max-sm:inset-0 max-sm:left-0 max-sm:top-0 max-sm:h-[100dvh] max-sm:max-h-none max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none'
    : '';
  // Al expandir se sobrescribe el max-w-* del consumidor (twMerge respeta el último grupo),
  // pero se mantiene en unidades relativas al viewport para seguir siendo responsive en cualquier tamaño.
  const expandedClass = expanded
    ? 'sm:w-[96vw] sm:max-w-[96vw] sm:h-[96dvh] sm:max-h-[96dvh]'
    : '';

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        {...props}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto border bg-background text-foreground p-4 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:w-full sm:p-6 sm:rounded-lg",
          className,
          inventoryMobileViewportClass,
          expandedClass
        )}
      >
        {!hasExplicitDescribedBy && !hasOwnDescription && (
          // Sin id manual: Radix asigna su propio id interno (vía contexto) tanto a este
          // Description como al aria-describedby de Content, y son SIEMPRE el mismo id
          // mientras nosotros no lo pisemos con uno propio.
          <DialogPrimitive.Description className="sr-only">
            {modalDescription}
          </DialogPrimitive.Description>
        )}
        <div className="flex items-center justify-end gap-1.5 pr-8 sm:min-h-8">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="hidden h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs hover:bg-muted sm:inline-flex"
            aria-pressed={expanded}
            aria-label={expanded ? 'Restaurar tamaño del formulario' : 'Agrandar formulario'}
            title={expanded ? 'Restaurar tamaño' : 'Agrandar formulario'}
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="hidden md:inline">{expanded ? 'Restaurar' : 'Agrandar'}</span>
          </button>
          {showAutomaticHelp && (
            <button id={`btn-ayuda-modal-${helpId}`} type="button" onClick={() => setHelpOpen((value) => !value)} className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs hover:bg-muted" aria-expanded={helpOpen} aria-label={`Ayuda: ${modalTitle}`} title={`Ayuda: ${modalTitle}`}>
              <CircleHelp className="h-3.5 w-3.5" /><span className="hidden sm:inline">Ayuda</span>
            </button>
          )}
        </div>
        {showAutomaticHelp && helpOpen && <div className="rounded-md border border-info/30 bg-info/10 p-3 pr-10 text-left text-sm"><p className="font-medium">Ayuda: {modalTitle}</p><p className="mt-1 text-muted-foreground">{modalDescription}</p></div>}
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
})
DialogContent.displayName = DialogPrimitive.Content.displayName

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const DialogHeader = ({ className, ...props }: DialogHeaderProps) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const DialogFooter = ({ className, ...props }: DialogFooterProps) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

interface DialogTitleProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> {}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  DialogTitleProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-foreground", className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

interface DialogDescriptionProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> {}

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  DialogDescriptionProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
export type {
  DialogOverlayProps,
  DialogContentProps,
  DialogHeaderProps,
  DialogFooterProps,
  DialogTitleProps,
  DialogDescriptionProps,
}
