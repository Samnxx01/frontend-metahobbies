import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { CircleHelp, X } from "lucide-react"

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
  // When no aria-describedby is provided, generate a fallback ID pointing to a
  // hidden span so Radix doesn't emit the missing-description warning for
  // dialogs that intentionally omit DialogDescription.
  const fallbackDescId = React.useId();
  const hasExplicitDescribedBy = 'aria-describedby' in props;
  const [helpOpen, setHelpOpen] = React.useState(false);
  const helpId = React.useId().replace(/:/g, '');
  const modalTitle = findDialogText(children, 'title') || 'este formulario';
  const modalDescription = findDialogText(children, 'description') || `Completa los campos de ${modalTitle} y revisa la información antes de guardar o confirmar.`;

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        {...props}
        aria-describedby={hasExplicitDescribedBy ? props['aria-describedby'] : fallbackDescId}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto border bg-background text-foreground p-4 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:w-full sm:p-6 sm:rounded-lg",
          className
        )}
      >
        {!hasExplicitDescribedBy && (
          <span id={fallbackDescId} aria-hidden="true" className="sr-only" />
        )}
        <div className="flex min-h-8 items-center justify-end pr-8">
        <button id={`btn-ayuda-modal-${helpId}`} type="button" onClick={() => setHelpOpen((value) => !value)} className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs hover:bg-muted" aria-expanded={helpOpen} aria-label={`Ayuda: ${modalTitle}`} title={`Ayuda: ${modalTitle}`}>
          <CircleHelp className="h-3.5 w-3.5" /><span className="hidden sm:inline">Ayuda</span>
        </button>
        </div>
        {helpOpen && <div className="rounded-md border border-info/30 bg-info/10 p-3 pr-10 text-left text-sm"><p className="font-medium">Ayuda: {modalTitle}</p><p className="mt-1 text-muted-foreground">{modalDescription}</p></div>}
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
