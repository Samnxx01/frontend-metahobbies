import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Settings2 } from 'lucide-react';
import ParametrizacionBypassMembresia from '@/app/presentation/pages/admin/ParametrizacionBypassMembresia';

interface BypassMembresiaModalProps {
    open: boolean;
    onClose: () => void;
}

export default function BypassMembresiaModal({ open, onClose }: BypassMembresiaModalProps): React.ReactElement {
    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5 text-primary" />
                        <DialogTitle>Bypass de Membresía</DialogTitle>
                    </div>
                    <DialogDescription>
                        Configura si los usuarios públicos pueden iniciar el flujo de membresía
                        sin enlace de referido previo.
                    </DialogDescription>
                </DialogHeader>
                <ParametrizacionBypassMembresia />
            </DialogContent>
        </Dialog>
    );
}
