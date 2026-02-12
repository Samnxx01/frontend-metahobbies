import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/app/services/api';
import { toast } from 'sonner';
import { UserX, Loader2, AlertTriangle } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DesactivarProps {
    idRepresentante: string;
    onSuccess?: () => void;
}

export default function DesactivarRepresentante({ idRepresentante, onSuccess }: DesactivarProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDesactivar = async () => {
        setIsDeleting(true);

        try {
            const response = await apiFetch(`/api/config/parametrizacion/desactivar/repre/coporativa/${idRepresentante}`, {
                method: 'DELETE',
                body: JSON.stringify({ id: idRepresentante })
            });

            if (response?.ok) {
                toast.success("Representante legal desactivado correctamente");
                if (onSuccess) onSuccess();
            } else {
                toast.error(response?.msg || "Error al desactivar");
            }
        } catch (error) {
            console.error("Error desactivando perfil:", error);
            toast.error("Error de conexión con el servidor");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                    <UserX className="h-4 w-4" />
                    Desactivar Perfil
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="text-destructive h-5 w-5" />
                        ¿Estás completamente seguro?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción desactivará al representante legal de forma lógica.
                        No podrá realizar gestiones corporativas hasta que sea reactivado por un administrador.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDesactivar}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeleting}
                    >
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, desactivar"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}