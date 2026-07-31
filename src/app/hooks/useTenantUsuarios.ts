import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import {
    getJerarquiaUsuarios,
    createUsuarioGlobal,
    createUsuarioCorporativo,
    createUsuarioSuperAdmin,
    sincronizarCanReferir,
    sincronizarCanReferirTodos,
} from '../services/tenantUsuariosService';
import type {
    JerarquiaResponse,
    CreateUsuarioGlobalData,
    CreateUsuarioCorporativoData,
    CreateUsuarioSuperAdminData,
    SincronizarCanReferirData,
} from '../services/tenantUsuariosService';

export const useTenantUsuarios = () => {
    const { token } = useAuth();

    // --- Estados de JERARQUÍA ---
    const [jerarquia, setJerarquia] = useState<JerarquiaResponse | null>(null);
    const [loadingJerarquia, setLoadingJerarquia] = useState(true);
    const [errorJerarquia, setErrorJerarquia] = useState<Error | null>(null);

    // --- Estados de CREAR usuario global ---
    const [isCreatingGlobal, setIsCreatingGlobal] = useState(false);
    const [errorCrearGlobal, setErrorCrearGlobal] = useState<Error | null>(null);

    // --- Estados de CREAR usuario corporativo ---
    const [isCreatingCorp, setIsCreatingCorp] = useState(false);
    const [errorCrearCorp, setErrorCrearCorp] = useState<Error | null>(null);

    // --- Estados de CREAR usuario SuperAdmin ---
    const [isCreatingSuperAdmin, setIsCreatingSuperAdmin] = useState(false);
    const [errorCrearSuperAdmin, setErrorCrearSuperAdmin] = useState<Error | null>(null);

    // --- Estados de SINCRONIZAR canReferir ---
    const [isSincronizandoCanReferir, setIsSincronizandoCanReferir] = useState(false);
    const [errorSincronizarCanReferir, setErrorSincronizarCanReferir] = useState<Error | null>(null);

    // --- Estados de SINCRONIZAR canReferir GLOBAL ---
    const [isSincronizandoGlobalCanReferir, setIsSincronizandoGlobalCanReferir] = useState(false);
    const [errorSincronizarGlobalCanReferir, setErrorSincronizarGlobalCanReferir] = useState<Error | null>(null);

    // --- LÓGICA DE CARGA DE JERARQUÍA ---
    const fetchJerarquia = useCallback(async () => {
        try {
            setLoadingJerarquia(true);
            setErrorJerarquia(null);
            const data = await getJerarquiaUsuarios({ useAuth: Boolean(token), forceRefresh: true });
            setJerarquia(data);
        } catch (err: any) {
            const status = err?.status ?? err?.response?.status ?? null;
            if (status === 401) {
                setJerarquia(null);
            } else {
                setErrorJerarquia(err as Error);
            }
        } finally {
            setLoadingJerarquia(false);
        }
    }, [token]);

    useEffect(() => {
        fetchJerarquia();
    }, [fetchJerarquia]);

    // --- LÓGICA DE CREAR USUARIO GLOBAL ---
    const crearUsuarioGlobal = async (data: CreateUsuarioGlobalData) => {
        try {
            setIsCreatingGlobal(true);
            setErrorCrearGlobal(null);
            const result = await createUsuarioGlobal(data);
            await fetchJerarquia();
            return result;
        } catch (err) {
            setErrorCrearGlobal(err as Error);
            throw err;
        } finally {
            setIsCreatingGlobal(false);
        }
    };

    // --- LÓGICA DE CREAR USUARIO CORPORATIVO ---
    const crearUsuarioCorporativo = async (data: CreateUsuarioCorporativoData) => {
        try {
            setIsCreatingCorp(true);
            setErrorCrearCorp(null);
            const result = await createUsuarioCorporativo(data);
            await fetchJerarquia();
            return result;
        } catch (err) {
            setErrorCrearCorp(err as Error);
            throw err;
        } finally {
            setIsCreatingCorp(false);
        }
    };

    // --- LÓGICA DE CREAR USUARIO SUPERADMIN ---
    const crearUsuarioSuperAdmin = async (data: CreateUsuarioSuperAdminData) => {
        try {
            setIsCreatingSuperAdmin(true);
            setErrorCrearSuperAdmin(null);
            const result = await createUsuarioSuperAdmin(data, { useAuth: Boolean(token) });
            await fetchJerarquia();
            return result;
        } catch (err) {
            setErrorCrearSuperAdmin(err as Error);
            throw err;
        } finally {
            setIsCreatingSuperAdmin(false);
        }
    };

    // --- LÓGICA DE SINCRONIZAR canReferir ---
    const sincronizarCanReferirUsuarios = async (data: SincronizarCanReferirData) => {
        try {
            setIsSincronizandoCanReferir(true);
            setErrorSincronizarCanReferir(null);
            const result = await sincronizarCanReferir(data);
            await fetchJerarquia();
            return result;
        } catch (err) {
            setErrorSincronizarCanReferir(err as Error);
            throw err;
        } finally {
            setIsSincronizandoCanReferir(false);
        }
    };

    // --- LÓGICA DE SINCRONIZAR canReferir GLOBAL (todos los tenants) ---
    const sincronizarGlobalCanReferirUsuarios = async (canReferir: boolean) => {
        try {
            setIsSincronizandoGlobalCanReferir(true);
            setErrorSincronizarGlobalCanReferir(null);
            const result = await sincronizarCanReferirTodos(canReferir);
            await fetchJerarquia();
            return result;
        } catch (err) {
            setErrorSincronizarGlobalCanReferir(err as Error);
            throw err;
        } finally {
            setIsSincronizandoGlobalCanReferir(false);
        }
    };

    return {
        jerarquia,
        loadingJerarquia,
        errorJerarquia,
        refetch: fetchJerarquia,

        isCreatingGlobal,
        errorCrearGlobal,
        crearUsuarioGlobal,

        isCreatingCorp,
        errorCrearCorp,
        crearUsuarioCorporativo,

        isCreatingSuperAdmin,
        errorCrearSuperAdmin,
        crearUsuarioSuperAdmin,

        isSincronizandoCanReferir,
        errorSincronizarCanReferir,
        sincronizarCanReferirUsuarios,

        isSincronizandoGlobalCanReferir,
        errorSincronizarGlobalCanReferir,
        sincronizarGlobalCanReferirUsuarios,
    };
};
