import React, { useState } from 'react';

// Reemplazamos los imports de MUI
import { useUsers } from '../../../hooks/useUsers'; // Ruta ajustada
import { UserFormModal } from '../../components/admin/UserFormModal'; // Ruta ajustada
import { UserEditModal } from '../../components/admin/UserEditModal'; // Ruta ajustada
import { DataTable } from '../../components/admin/DataTable'; // Ruta ajustada

// Shadcn UI components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// Lucide icons
import {
    Plus, Pencil, Trash2, AlertTriangle, Check, X, ShieldCheck, AlertCircle, Loader2, User
} from 'lucide-react';

const PRIMARY_COLOR_CLASS = 'text-primary';
const SUCCESS_COLOR_CLASS = 'text-green-600'; // Verde para ACTIVO
const DANGER_COLOR_CLASS = 'text-red-600';   // Rojo para INACTIVO
const ACCENT_BG_COLOR_CLASS = 'bg-primary/10';

export const GestionUsuarios = () => {
    const {
        users, loadingList, errorList, deleteUser, isSubmitting, isUpdating, isDeleting, createUser, updateUser
    } = useUsers();

    // Estados de Modales y Confirmación
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
    const [userToDeleteId, setUserToDeleteId] = useState(null);

    // --- Handlers de Acciones ---
    const handleEditClick = (id) => {
        const userToEdit = users.find(user => user._id === id);
        setCurrentUser(userToEdit);
        setEditModalOpen(true);
    };

    const confirmDelete = (id) => {
        setUserToDeleteId(id);
        setOpenConfirmDialog(true);
    };

    const handlePerformDelete = async () => {
        if (!userToDeleteId) return;
        setOpenConfirmDialog(false);
        try {
            await deleteUser(userToDeleteId);
        } catch (error) {
            console.error("Error al desactivar:", error);
        }
        setUserToDeleteId(null);
    };

    // --- Definición de Columnas (Adaptada a la estructura de la tabla) ---
    const columns = [
        {
            field: '_id',
            headerName: 'ID Ref.',
            minWidth: 100,
            flex: 1,
            // Reemplaza renderCell de MUI
            render: (user) => (
                <p className="text-xs text-muted-foreground">
                    {user._id.substring(0, 8)}...
                </p>
            )
        },

        { field: 'correo', headerName: 'Correo', minWidth: 180, flex: 1.5, render: (user) => <p className="text-sm">{user.correo}</p> },

        // ESTADO (Badge o Iconos)
        {
            field: 'estado',
            headerName: 'Estado',
            minWidth: 130,
            flex: 1.2,
            // Reemplaza renderCell con Badge de Shadcn/Tailwind
            render: (user) => {
                const isActive = user.estado;
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

        { field: 'cantidadPagadas', headerName: 'Pagos', type: 'number', minWidth: 80, flex: 0.7, align: 'center', render: (user) => <p className="text-center font-medium">{user.cantidadPagadas || 0}</p> },

        // VERIFICADO (Iconos de Lucide)
        {
            field: 'verificado',
            headerName: 'Verificado',
            minWidth: 100,
            flex: 1,
            // Reemplaza renderCell con iconos de Lucide
            render: (user) => {
                const isVerified = user.verificado;
                return isVerified ? (
                    <ShieldCheck className={`w-5 h-5 ${PRIMARY_COLOR_CLASS}`} />
                ) : (
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                );
            }
        },

        // ÚLTIMA SESIÓN (valueGetter)
        {
            field: 'tiempoSesion',
            headerName: 'Última Sesión',
            minWidth: 150,
            flex: 2,
            // Usamos un render para formatear la fecha
            render: (user) => {
                const dateString = user.tiempoSesion;
                const formattedDate = dateString
                    ? new Date(dateString).toLocaleString('es-CO')
                    : 'Nunca';
                return <p className="text-sm text-muted-foreground">{formattedDate}</p>;
            }
        },

        // ACCIONES
        {
            field: 'actions',
            headerName: 'Acciones',
            type: 'actions',
            width: 100,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            // Reemplaza renderCell de acciones
            render: (user) => (
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
        <div
            className="p-4 md:p-6 lg:p-8 bg-background shadow-lg rounded-xl w-full relative" // Reemplaza Paper y sus estilos
        >
            <div className="w-full">

                {/* --- HEADER DESKTOP Y MÓVIL --- */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
                    {/* Título Responsivo */}
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Gestión de Usuarios</h1>

                    {/* Botón de Escritorio */}
                    <Button
                        onClick={() => setCreateModalOpen(true)}
                        className="hidden sm:flex items-center gap-2 rounded-lg"
                    >
                        <Plus className="h-5 w-5" />
                        Crear Usuario
                    </Button>
                </div>

                {errorList && <div className="p-3 mb-4 bg-red-100 text-red-700 border border-red-300 rounded-lg text-sm">{`Error al cargar usuarios: ${errorList.message}`}</div>}

                {/* --- CONTENEDOR DE LA TABLA CON SCROLL HORIZONTAL --- */}
                <div
                    className="rounded-lg border shadow-sm overflow-x-auto bg-card" // Reemplaza Box y sus estilos
                >
                    {/* El componente DataTable debe ser adaptado para usar la estructura de Shadcn Table */}
                    {/* Nota: En un proyecto real, se envolvería la DataTable dentro de este div */}
                    <div style={{ minWidth: '900px', height: 'auto' }}>
                        <DataTable
                            rows={users.map(u => ({ ...u, id: u._id }))}
                            columns={columns}
                            getRowId={(row) => row._id}
                        // Aquí se inyectarían las clases y el cuerpo de la tabla. 
                        // Asumiremos que DataTable ha sido o será migrado para renderizar las columnas de Shadcn
                        />
                    </div>
                </div>

                {/* --- BOTÓN FLOTANTE (FAB) PARA MÓVIL --- */}
                <Button
                    onClick={() => setCreateModalOpen(true)}
                    className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-xl sm:hidden" // Reemplaza Fab y sus estilos
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

                {/* Modales de Subcomponente (Mantenemos la referencia) */}
                <UserFormModal
                    open={createModalOpen}
                    onClose={() => setCreateModalOpen(false)}
                    onSubmit={createUser}
                    isSubmitting={isSubmitting}
                />
                <UserEditModal
                    open={editModalOpen}
                    onClose={() => setEditModalOpen(false)}
                    user={currentUser}
                    onSubmit={updateUser}
                    isUpdating={isUpdating}
                />

            </div>
        </div>
    );
};

export default GestionUsuarios;