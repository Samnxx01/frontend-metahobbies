import { Timer } from 'lucide-react';

export function CronosSyncHijosHeader() {
  return (
    <div className="flex items-start gap-3">
      <Timer className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
      <div>
            <h2 className="text-lg font-semibold tracking-tight">Cronos y sincronización entre servidores</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Parametriza cron de bajada padre→hijos y de subida hija→padre sobre las mismas conexiones registradas en este módulo.
        </p>
      </div>
    </div>
  );
}
