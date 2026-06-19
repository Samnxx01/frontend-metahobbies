const STORAGE_KEY = 'mabs.login.savedCredentials.v1';

export interface SavedLoginCredentials {
    correo: string;
    password: string;
}

const encodePassword = (value: string): string => {
    try {
        return btoa(unescape(encodeURIComponent(value)));
    } catch {
        return '';
    }
};

const decodePassword = (value: string): string => {
    try {
        return decodeURIComponent(escape(atob(value)));
    } catch {
        return '';
    }
};

export const readSavedLoginCredentials = (): SavedLoginCredentials | null => {
    if (typeof window === 'undefined') return null;

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as { correo?: string; password?: string };
        const correo = String(parsed.correo || '').trim().toLowerCase();
        const password = decodePassword(String(parsed.password || ''));

        if (!correo || !password) return null;
        return { correo, password };
    } catch {
        return null;
    }
};

export const persistSavedLoginCredentials = (correo: string, password: string): void => {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                correo: correo.trim().toLowerCase(),
                password: encodePassword(password),
            })
        );
    } catch {
        // Ignorar errores de storage para no bloquear el login.
    }
};

export const clearSavedLoginCredentials = (): void => {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Ignorar errores de storage.
    }
};
