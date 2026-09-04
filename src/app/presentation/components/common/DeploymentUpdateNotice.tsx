import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';

declare const __APP_BUILD_ID__: string;

const CHECK_INTERVAL_MS = 60_000;

export default function DeploymentUpdateNotice(): React.ReactElement | null {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const checkVersion = useCallback(async (): Promise<void> => {
    if (import.meta.env.DEV || updateAvailable) return;
    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return;
      const manifest = await response.json() as { buildId?: string };
      const deployedBuildId = String(manifest?.buildId || '').trim();
      if (deployedBuildId && deployedBuildId !== __APP_BUILD_ID__) {
        setUpdateAvailable(true);
      }
    } catch {
      // Un fallo temporal de red no debe interrumpir el trabajo del usuario.
    }
  }, [updateAvailable]);

  useEffect(() => {
    if (import.meta.env.DEV) return undefined;
    void checkVersion();
    const intervalId = window.setInterval(() => void checkVersion(), CHECK_INTERVAL_MS);
    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') void checkVersion();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [checkVersion]);

  if (!updateAvailable) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[10000] mx-auto max-w-2xl rounded-lg border border-border bg-card p-4 text-card-foreground shadow-2xl"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Hay una nueva actualización disponible</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Termina y guarda lo que estés haciendo. Después recarga la aplicación para usar la nueva versión.
            </p>
          </div>
        </div>
        <Button
          type="button"
          className="shrink-0 gap-2"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-4 w-4" />
          Recargar ahora
        </Button>
      </div>
    </aside>
  );
}
