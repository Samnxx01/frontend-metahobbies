// src/app/router/componentRegistry.ts
import { lazy } from 'react';

// Páginas lazy por nombre de archivo. Excluye `**/components/**`: son subcomponentes (p. ej. pestañas)
// que no deben registrarse como ruta; si se montan solos, no reciben props ni `loadData` del padre.
const modules = import.meta.glob(
  ['../presentation/pages/**/*.tsx', '!../presentation/pages/**/components/**'],
  { eager: false },
);

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