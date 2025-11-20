import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify'; // Usaremos toast para errores de validación simple

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
import { Loader2, User, UserCheck } from 'lucide-react';

// Recibe el 'user' para precargar los datos
export const UserEditModal = ({ open, onClose, onSubmit, user, isUpdating, updateError }) => {
    const [formData, setFormData] = useState({
        correo: '',
        rol: '',
    });

    // Efecto para cargar los datos del usuario cuando el modal se abre o el usuario cambia
    useEffect(() => {
        if (user && open) {
            setFormData({
                correo: user.correo || '',
                rol: user.rol || 'CLIENTE', // Asegúrate de tener un valor por defecto
            });
        } else if (!open) {
            // Limpiar el formulario si el modal se cierra
            setFormData({ correo: '', rol: 'CLIENTE' });
        }
    }, [user, open]);

    const handleChange = (e) => {
        // Manejo de Input (correo)
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSelectChange = (value) => {
        // Manejo de Select (rol)
        setFormData((prev) => ({
            ...prev,
            rol: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return; // Seguridad

        // Validación básica
        if (!formData.correo || !formData.rol) {
            toast.error("Por favor, completa todos los campos requeridos.");
            return;
        }

        try {
            // Llama a 'updateUser' con el ID y los datos
            await onSubmit(user._id, formData);
            onClose(); // Cierra el modal solo si tiene éxito
            toast.success("Usuario actualizado correctamente.");
        } catch (error) {
            // El error es manejado externamente por el hook y mostrado con updateError,
            // pero si hay un error de red/código, lo mostramos aquí.
            console.error("Fallo al actualizar usuario:", error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            {/* sm:max-w-md reemplaza maxWidth="xs" */}
            <DialogContent className="sm:max-w-md p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-primary" />
                        Editar Usuario: <span className="font-normal text-muted-foreground truncate max-w-[200px]">{user?.correo}</span>
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="py-4 space-y-4">

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
                                    <SelectItem value="DESARROLLADOR">DESARROLLADOR</SelectItem>
                                    <SelectItem value="CLIENTE">CLIENTE</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Mostrar error de actualización */}
                        {updateError && (
                            <p className="text-sm text-destructive mt-2">
                                Error: {updateError.message}
                            </p>
                        )}

                    </div>

                    <DialogFooter className="pt-4 flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isUpdating}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isUpdating}
                        >
                            {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 'Guardar Cambios'}
                        </Button>
                    </DialogFooter>
                </form>

            </DialogContent>
        </Dialog>
    );
};