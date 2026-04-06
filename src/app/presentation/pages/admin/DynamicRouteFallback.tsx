import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, Component, Route as RouteIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getRouteCatalog, type RouteCatalogItem } from '@/app/services/routeService';

interface DynamicRouteFallbackProps {
  routePath?: string;
  componentName?: string;
}

const normalizePath = (value: string): string => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const toAdminCandidatePaths = (pathname: string): string[] => {
  const normalized = normalizePath(pathname);
  const candidates = [normalized];

  if (normalized.startsWith('/admin/')) {
    candidates.push(normalized.replace(/^\/admin/, ''));
  } else {
    candidates.push(`/admin${normalized === '/' ? '' : normalized}`);
  }

  return Array.from(new Set(candidates.map(normalizePath)));
};

export default function DynamicRouteFallback({
  routePath = '',
  componentName = '',
}: DynamicRouteFallbackProps): React.ReactElement {
  const location = useLocation();
  const [catalogRoute, setCatalogRoute] = useState<RouteCatalogItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadRoute = async (): Promise<void> => {
      try {
        setLoading(true);
        const catalog = await getRouteCatalog();
        if (!active) return;

        const candidates = toAdminCandidatePaths(routePath || location.pathname);
        const found = catalog.find((route) => candidates.includes(normalizePath(route.path))) || null;
        setCatalogRoute(found);
      } catch (error) {
        console.error('Error cargando metadata de la ruta dinámica:', error);
        if (!active) return;
        setCatalogRoute(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadRoute();
    return () => {
      active = false;
    };
  }, [location.pathname, routePath]);

  return (
    <div className="p-6">
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle>Vista dinámica sin componente físico</CardTitle>
          </div>
          <CardDescription>
            La ruta existe en base de datos, pero no tiene un componente `.tsx` registrado en el frontend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Fallback activo</Badge>
            {catalogRoute?.layout ? <Badge variant="outline">{catalogRoute.layout}</Badge> : null}
            {catalogRoute?.component ? <Badge variant="outline">{catalogRoute.component}</Badge> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <RouteIcon className="h-4 w-4" />
                Ruta
              </div>
              <p className="font-mono text-sm">{catalogRoute?.path || routePath || location.pathname}</p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Component className="h-4 w-4" />
                Componente esperado
              </div>
              <p className="font-mono text-sm">{catalogRoute?.component || componentName || 'No definido'}</p>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">
              {loading ? 'Cargando metadata...' : catalogRoute?.name || 'Formulario dinámico'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Puedes seguir navegando sin que la app se rompa. Si después registras un componente físico con ese nombre,
              el router lo montará automáticamente sin cambiar esta ruta en BD.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
