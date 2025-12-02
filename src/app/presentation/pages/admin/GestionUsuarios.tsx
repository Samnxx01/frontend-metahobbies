import React, { useState } from 'react';

// Hooks y componentes personalizados
import { useUsers } from '../../../hooks/useUsers';
import { UserFormModal } from '../../components/admin/UserFormModal';
import { UserEditModal } from '../../components/admin/UserEditModal';
import { DataTable } from '../../components/admin/DataTable';

// Shadcn UI components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// Lucide icons
import {
    Plus, Pencil, Trash2, AlertTriangle, Check, X, Loader2
} from 'lucide-react';

// Types
import type { User } from '@/types/common';
import type { ReactNode } from 'react';

const PRIMARY_COLOR_CLASS = 'text-primary';

interface DataTableColumn {
    field: string;
    headerName: string;
    minWidth?: number;
    flex?: number;
    align?: 'left' | 'center' | 'right';
    type?: string;
    sortable?: boolean;
    filterable?: boolean;
    disableColumnMenu?: boolean;
    width?: number;
    render?: (user: User) => ReactNode;
}

export const GestionUsuarios = (): React.ReactElement => {
    const {
        users, loadingList, errorList, deleteUser, isSubmitting, isUpdating, isDeleting, createUser, updateUser
    } = useUsers();

    // Estados de Modales y Confirmación
    const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
    const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [openConfirmDialog, setOpenConfirmDialog] = useState<boolean>(false);
    const [userToDeleteId, setUserToDeleteId] = useState<string | null>(null);

    // --- Handlers de Acciones ---
    const handleEditClick = (id: string): void => {
        const userToEdit = users.find((user: User) => user._id === id);
        setCurrentUser(userToEdit || null);
        setEditModalOpen(true);
    };

    const confirmDelete = (id: string): void => {
        setUserToDeleteId(id);
        setOpenConfirmDialog(true);
    };

    const handlePerformDelete = async (): Promise<void> => {
        if (!userToDeleteId) return;
        setOpenConfirmDialog(false);
        try {
            await deleteUser(userToDeleteId);
        } catch (error) {
            console.error("Error al desactivar:", error);
        }
        setUserToDeleteId(null);
    };

    // --- Definición de Columnas ---
    const columns: DataTableColumn[] = [
        {
            field: 'id',
            headerName: 'ID Ref.',
            minWidth: 100,
            flex: 1,
            render: (user: User) => (
                <p className="text-xs text-muted-foreground">
                    {user._id.substring(0, 8)}...
                </p>
            )
        },
        { 
            field: 'correo', 
            headerName: 'Correo', 
            minWidth: 180, 
            flex: 1.5, 
            render: (user: User) => <p className="text-sm">{user.correo}</p> 
        },
        {
            field: 'estado',
            headerName: 'Estado',
            minWidth: 130,
            flex: 1.2,
            render: (user: User) => {
                const isActive = user.estado === 'ACTIVO';
                return (
                    <Badge
                        variant={isActive ? 'default' : 'outline'}
                        className={`font-semibold text-xs py-1 px-2 rounded-full ${isActive
                                ? 'bg-green-100 text-green-600 hover:bg-green-100'
                                : 'bg-red-100 text-red-600 border-red-300 hover:bg-red-100'
                            }`}
                    >
                        {isActive ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                        {isActive ? "ACTIVO" : "INACTIVO"}
                    </Badge>
                );
            }
        },
        {
            field: 'actions',
            headerName: 'Acciones',
            type: 'actions',
            width: 100,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            render: (user: User) => (
                <div className="flex gap-1">
                    <Button
                        onClick={() => handleEditClick(user._id)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:bg-primary/10"
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={() => confirmDelete(user._id)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        disabled={isDeleting && userToDeleteId === user._id}
                    >
                        {isDeleting && userToDeleteId === user._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            )
        }
    ];

    if (loadingList) return (
        <div className="flex justify-center py-10">
            <Loader2 className={`w-8 h-8 animate-spin ${PRIMARY_COLOR_CLASS}`} />
        </div>
    );

    return (
        <div className="p-4 md:p-6 lg:p-8 bg-background shadow-lg rounded-xl w-full relative">
            <div className="w-full">

                {/* --- HEADER --- */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Gestión de Usuarios</h1>

                    <Button
                        onClick={() => setCreateModalOpen(true)}
                        className="hidden sm:flex items-center gap-2 rounded-lg"
                    >
                        <Plus className="h-5 w-5" />
                        Crear Usuario
                    </Button>
                </div>

                {errorList && (
                    <div className="p-3 mb-4 bg-red-100 text-red-700 border border-red-300 rounded-lg text-sm">
                        {`Error al cargar usuarios: ${errorList.message}`}
                    </div>
                )}

                {/* --- TABLA --- */}
                <div className="rounded-lg border shadow-sm overflow-x-auto bg-card">
                    <div style={{ minWidth: '900px', height: 'auto' }}>
                        <DataTable
                            data={users}
                            columns={columns}
                        />
                    </div>
                </div>

                {/* --- BOTÓN FLOTANTE MÓVIL --- */}
                <Button
                    onClick={() => setCreateModalOpen(true)}
                    className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-xl sm:hidden"
                    size="icon"
                >
                    <Plus className="h-6 w-6" />
                </Button>

                {/* Diálogo de Confirmación de Desactivación */}
                <Dialog open={openConfirmDialog} onOpenChange={setOpenConfirmDialog}>
                    <DialogContent className="sm:max-w-xs text-center p-6">
                        <DialogHeader className="flex items-center space-y-3">
                            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
                            <DialogTitle className="text-xl font-bold pt-2">Confirmar Desactivación</DialogTitle>
                        </DialogHeader>

                        <p className="text-muted-foreground mt-2 text-sm">
                            Esta acción **desactivará** el usuario y no podrá acceder. ¿Deseas continuar?
                        </p>

                        <DialogFooter className="mt-4 flex justify-center gap-3">
                            <Button onClick={() => setOpenConfirmDialog(false)} variant="outline">Cancelar</Button>
                            <Button onClick={handlePerformDelete} variant="destructive">Sí, Desactivar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Modales de Subcomponente */}
                <UserFormModal
                    open={createModalOpen}
                    onClose={() => setCreateModalOpen(false)}
                    onSubmit={createUser}
                    isSubmitting={isSubmitting}
                />
                {currentUser && (
                    <UserEditModal
                        open={editModalOpen}
                        onClose={() => setEditModalOpen(false)}
                        user={currentUser}
                        onSave={(userData) => updateUser(currentUser._id, userData)}
                        isUpdating={isUpdating}
                    />
                )}

            </div>
        </div>
    );
};

export default GestionUsuarios;
