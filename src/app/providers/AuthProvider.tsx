import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as authService from '../services/authService';
import { desconectadoUsu } from '../socket';
import { clearSessionCaches } from '../services/routeService';
import { clearHybridSpaPath } from '../services/api';
import type { User } from '../../types/common';

// Interfaces para los tipos de datos
interface LoginCredentials {
    correo: string;
    password: string;
}

interface LoginResponse {
    msg: string;
    usuario: User;
    token: string;
    requiereActualizacion?: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (credentials: LoginCredentials) => Promise<LoginResponse>;
    logout: () => void;
    loading: boolean;
}

interface AuthProviderProps {
    children: ReactNode;
}

// 1. Crear el Contexto
const AuthContext = createContext<AuthContextType | null>(null);

// 2. Crear el Proveedor (Provider)
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
    const [loading, setLoading] = useState<boolean>(true);

    // Cargar usuario desde localStorage al iniciar (solo si hay token vigente)
    useEffect(() => {
        const storedToken = String(localStorage.getItem('token') || '').trim();
        const userJson = localStorage.getItem('user');
        console.info('[MABS][AuthProvider] Restaurando sesión', {
            hasToken: Boolean(storedToken),
            hasStoredUser: Boolean(userJson),
        });

        if (!storedToken) {
            if (userJson) localStorage.removeItem('user');
            setToken(null);
            setUser(null);
            setLoading(false);
            return;
        }

        if (userJson) {
            try {
                const parsedUser = JSON.parse(userJson) as User;
                console.info('[MABS][AuthProvider] Usuario restaurado', {
                    hasUserId: Boolean(parsedUser?.id || parsedUser?._id || parsedUser?.iud),
                    role: parsedUser?.role || parsedUser?.rol || null,
                });
                setUser(parsedUser);
            } catch (error) {
                console.error('Error parsing user from localStorage:', error);
                localStorage.removeItem('user');
            }
        } else {
            console.error('[MABS][AuthProvider] Sesión inconsistente: existe token pero no usuario almacenado');
        }
        setLoading(false);
    }, []);

    // --- NUEVA FUNCIÓN DE LOGIN UNIFICADA ---
    const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
        try {
            // 1. Llamamos a la ÚNICA función del servicio
            const response = await authService.login(credentials) as LoginResponse;

            // 2. Si la API devuelve el token y el usuario...
            if (response.token && response.usuario) {

                // 3. Normalizamos el 'rol' para que el resto de la app (como routeService)
                //    pueda leer 'role' (inglés) de forma consistente.
                const userToSave: User = {
                    ...response.usuario,
                    role: response.usuario.rol // Creamos 'role' a partir de 'rol'
                };

                // 4. Guardamos todo en localStorage y en el estado
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(userToSave));
                setToken(response.token);
                setUser(userToSave);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('mabs-auth-changed'));
                }

                // 5. Devolvemos la respuesta completa al componente Login
                return response;
            }
            return response;
        } catch (error) {
            console.error("Error en login (AuthProvider):", error);
            throw error; // Lanzamos el error para que Login.jsx lo atrape
        }
    };

    const logout = (): void => {
        try {
            clearHybridSpaPath();
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            clearSessionCaches();
            desconectadoUsu();
            setToken(null);
            setUser(null);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('mabs-auth-changed'));
            }
        } catch (error) {
            console.error("Error durante logout:", error);
            throw error;
        }
    };

    // 3. Valor que se pasa a los componentes hijos
    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!token,
        loading,
        login, // <-- La nueva función
        logout
        // Ya no existen loginAdmin ni loginClient
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// 4. Hook personalizado para consumir el contexto
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};
