// src/app/router/componentRegistry.ts
import { lazy } from 'react';

// Usamos import.meta.glob para cargar todos los componentes de páginas de forma lazy
const modules = import.meta.glob('../presentation/pages/**/*.tsx', { eager: false });

// Función para obtener el componente lazy por nombre
export function getLazyComponent(componentName: string): React.LazyExoticComponent<any> | null {
    const path = Object.keys(modules).find(p => {
        const fileName = p.split('/').pop()?.replace('.tsx', '');
        return fileName === componentName;
    });

    if (!path) return null;

    return lazy(() => modules[path]());
}

// Para debugging: lista de componentes disponibles
export function getAvailableComponents(): string[] {
    return Object.keys(modules).map(p => p.split('/').pop()?.replace('.tsx', '') || '').filter(Boolean);
}