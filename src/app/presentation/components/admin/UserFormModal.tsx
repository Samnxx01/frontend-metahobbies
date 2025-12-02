import React, { useState, useEffect } from 'react';

// Shadcn UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';

// Lucide icons
import { Loader2, UserPlus } from 'lucide-react';

import type { UserFormModalProps } from '@/types/components';

interface FormData {
    correo: string;
    password: string;
    rol: string;
}

// Este componente recibe:
// - open: (boolean) para saber si está abierto
// - onClose: (función) para cerrarlo
// - onSubmit: (función) la función 'createUser' del hook
// - isSubmitting: (boolean) el estado 'isSubmitting' del hook
// - submitError: (error) el estado 'submitError' del hook
export const UserFormModal = ({ 
    open, 
    onClose, 
    onSubmit, 
    title = "Crear Nuevo Usuario",
    isSubmitting = false,
    submitError 
}: UserFormModalProps & {
    isSubmitting?: boolean;
    submitError?: Error | null;
}): React.ReactElement => {
    const [formData, setFormData] = useState<FormData>({
        correo: '',
        password: '',
        rol: 'ADMIN',
    });

    // Limpiar el formulario si cerramos el modal
    useEffect(() => {
        if (!open) {
            setFormData({ correo: '', password: '', rol: 'ADMIN' });
        }
    }, [open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        // Manejo de Input (correo, password)
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSelectChange = (value: string): void => {
        // Manejo de Select (rol)
        setFormData((prev) => ({
            ...prev,
            rol: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        // Validación básica manual antes de la llamada al hook
        if (!formData.correo || !formData.password || !formData.rol) {
            alert("Por favor, completa todos los campos."); // Usamos alert temporalmente
            return;
        }

        try {
            await onSubmit(formData); // Llama a 'createUser'
            onClose(); // Cierra el modal solo si tiene éxito
        } catch (error) {
            // El error ya se maneja en el hook, solo logueamos aquí
            console.error("Fallo al crear usuario:", error);
        }
    };

    // Reemplazamos Dialog y Box con Form nativo
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-primary" />
                        {title}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="py-4 space-y-4"> {/* Reemplaza DialogContent y Box con space-y-4 */}

                        {/* Campo Correo - Reemplaza TextField */}
                        <div className="space-y-2">
                            <Label htmlFor="correo">Correo Electrónico</Label>
                            <Input
                                id="correo"
                                name="correo"
                                type="email"
                                placeholder="ejemplo@correo.com"
                                value={formData.correo}
                                onChange={handleChange}
                                required
                                autoFocus
                            />
                        </div>

                        {/* Campo Contraseña - Reemplaza TextField */}
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Contraseña inicial"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* Selector de Rol - Reemplaza FormControl y Select */}
                        <div className="space-y-2">
                            <Label htmlFor="rol-select">Rol</Label>
                            <Select
                                name="rol"
                                value={formData.rol}
                                onValueChange={handleSelectChange}
                                required
                            >
                                <SelectTrigger id="rol-select">
                                    <SelectValue placeholder="Selecciona un Rol" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                                    <SelectItem value="CLIENTE">CLIENTE</SelectItem>
                                    <SelectItem value="DESARROLLADOR">DESARROLLADOR</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Mostrar error de envío */}
                        {submitError && (
                            <p className="text-sm text-destructive mt-2">
                                Error: {submitError.message}
                            </p>
                        )}

                    </div>

                    <DialogFooter className="pt-4 flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 'Crear Usuario'}
                        </Button>
                    </DialogFooter>
                </form>

            </DialogContent>
        </Dialog>
    );
};