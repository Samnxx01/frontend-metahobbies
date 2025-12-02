import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { ModalProps } from '@/types/components';

export default function Modal({ 
    open, 
    title, 
    children, 
    onClose, 
    actions 
}: ModalProps): React.ReactElement {
    const defaultActions = (
        <>
            <Button variant="outline" onClick={onClose}>
                Cancelar
            </Button>
            <Button onClick={onClose}>
                Aceptar
            </Button>
        </>
    );

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                {title && (
                    <>
                        <DialogHeader>
                            <DialogTitle>{title}</DialogTitle>
                        </DialogHeader>
                        <Separator />
                    </>
                )}
                <div className="py-4">
                    {children}
                </div>
                <DialogFooter>
                    {actions || defaultActions}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}