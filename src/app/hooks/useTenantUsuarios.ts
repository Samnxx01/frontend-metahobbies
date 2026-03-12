import { useState, useEffect, useCallback } from 'react';
import {
    getJerarquiaUsuarios,
    createUsuarioGlobal,
    createUsuarioCorporativo,
} from '../services/tenantUsuariosService';
import type {
    JerarquiaResponse,
    CreateUsuarioGlobalData,
    CreateUsuarioCorporativoData,
} from '../services/tenantUsuariosService';

export const useTenantUsuarios = () => {
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

    // --- LÓGICA DE CARGA DE JERARQUÍA ---
    const fetchJerarquia = useCallback(async () => {
        try {
            setLoadingJerarquia(true);
            setErrorJerarquia(null);
            const data = await getJerarquiaUsuarios();
            setJerarquia(data);
        } catch (err) {
            setErrorJerarquia(err as Error);
        } finally {
            setLoadingJerarquia(false);
        }
    }, []);

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
    };
};
