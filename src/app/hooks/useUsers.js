import { useState, useEffect, useCallback } from 'react';
// Importamos TODOS los servicios que necesitamos
import {
    listUsers,
    registerAdmin,
    updateUser as updateUserService,  // Renombramos para evitar colisión
    deactivateUser as deactivateUserService // Renombramos para evitar colisión
} from '../services/adminService';

export const useUsers = () => {
    const [users, setUsers] = useState([]);
    // --- Estados de LISTAR ---
    const [loadingList, setLoadingList] = useState(true);
    const [errorList, setErrorList] = useState(null);

    // --- Estados de CREAR ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // --- Estados de ACTUALIZAR ---
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState(null);

    // --- Estados de BORRAR ---
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);


    // --- LÓGICA DE LISTAR (fetchUsers) ---
    const fetchUsers = useCallback(async () => {
        try {
            setLoadingList(true);
            setErrorList(null);
            const data = await listUsers();
            setUsers(data?.usuarios || []);
        } catch (err) {
            setErrorList(err);
        } finally {
            setLoadingList(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // --- LÓGICA DE CREAR (createUser) ---
    const createUser = async (adminData) => {
        try {
            setIsSubmitting(true);
            setSubmitError(null);
            const data = await registerAdmin(adminData);
            await fetchUsers(); // Refrescar la lista
            setIsSubmitting(false);
            return data;
        } catch (err) {
            setSubmitError(err);
            setIsSubmitting(false);
            throw err;
        }
    };

    // --- LÓGICA DE ACTUALIZAR (updateUser) ---
    const updateUser = async (userId, userData) => {
        try {
            setIsUpdating(true);
            setUpdateError(null);
            // Llamamos al servicio de actualización
            const data = await updateUserService(userId, userData);
            await fetchUsers(); // Refrescar la lista
            setIsUpdating(false);
            return data;
        } catch (err) {
            setUpdateError(err);
            setIsUpdating(false);
            throw err;
        }
    };

    // --- LÓGICA DE BORRAR (deleteUser) ---
    const deleteUser = async (userId) => {
        try {
            setIsDeleting(true);
            setDeleteError(null);
            // Llamamos al servicio de desactivación
            await deactivateUserService(userId);
            await fetchUsers(); // Refrescar la lista
            setIsDeleting(false);
        } catch (err) {
            setDeleteError(err);
            setIsDeleting(false);
            throw err;
        }
    };

    // --- Exportar todo ---
    return {
        users,
        loadingList,
        errorList,
        refetch: fetchUsers,

        isSubmitting,
        submitError,
        createUser,

        isUpdating,
        updateError,
        updateUser,

        isDeleting,
        deleteError,
        deleteUser
    };
};