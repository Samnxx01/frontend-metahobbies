import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '../services/authService'; // Importa todos los exports
import { desconectadoUsu } from '../../socket/conectarSocket';

// 1. Crear el Contexto
const AuthContext = createContext(null);

// 2. Crear el Proveedor (Provider)
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Cargar usuario desde localStorage al iniciar
    useEffect(() => {
        const userJson = localStorage.getItem('user');
        if (userJson) {
            setUser(JSON.parse(userJson));
        }
        setLoading(false);
    }, []);

    // --- NUEVA FUNCIÓN DE LOGIN UNIFICADA ---
    const login = async (credentials) => {
        try {
            // 1. Llamamos a la ÚNICA función del servicio
            const response = await authService.login(credentials);

            // 2. Si la API devuelve el token y el usuario...
            if (response.token && response.usuario) {

                // 3. Normalizamos el 'rol' para que el resto de la app (como routeService)
                //    pueda leer 'role' (inglés) de forma consistente.
                const userToSave = {
                    ...response.usuario,
                    role: response.usuario.rol // Creamos 'role' a partir de 'rol'
                };

                // 4. Guardamos todo en localStorage y en el estado
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(userToSave));
                setToken(response.token);
                setUser(userToSave);

                // 5. Devolvemos la respuesta completa al componente Login
                return response;
            }
            return response;
        } catch (error) {
            console.error("Error en login (AuthProvider):", error);
            throw error; // Lanzamos el error para que Login.jsx lo atrape
        }
    };

    const logout = () => {
        try {

            localStorage.removeItem("token");
            localStorage.removeItem("user");
            desconectadoUsu();
            setToken(null);
            setUser(null);
        } catch (error) {
            console.error("Error durante logout:", error);
            throw error; // <-- Esto es lo que dispara tu toast rojo
        }
    };

    // 3. Valor que se pasa a los componentes hijos
    const value = {
        user,
        token,
        isAuthenticated: !!token,
        login, // <-- La nueva función
        logout
        // Ya no existen loginAdmin ni loginClient
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// 4. Hook personalizado para consumir el contexto
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};