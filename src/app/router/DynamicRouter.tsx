// src/app/router/DynamicRouter.tsx
import React, { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { getLazyComponent } from './componentRegistry';
import { RouteCatalogItem } from '../services/routeService';
import DynamicRouteFallback from '@/app/presentation/pages/admin/DynamicRouteFallback';

interface DynamicRouterProps {
    routes: RouteCatalogItem[];
    fallback?: React.ReactNode;
}

export function DynamicRouter({ routes, fallback = <div>Cargando...</div> }: DynamicRouterProps) {
    return (
        <Routes>
            {routes.map((route) => {
                const LazyComponent = getLazyComponent(route.component);

                if (!LazyComponent) {
                    console.warn(`Componente "${route.component}" no encontrado para la ruta "${route.path}"`);
                    return (
                        <Route
                            key={route.iud || route.path}
                            path={route.path}
                            element={<DynamicRouteFallback routePath={route.path} componentName={route.component} />}
                        />
                    );
                }

                return (
                    <Route
                        key={route.iud || route.path}
                        path={route.path}
                        element={
                            <Suspense fallback={fallback}>
                                <LazyComponent />
                            </Suspense>
                        }
                    />
                );
            })}
        </Routes>
    );
}
