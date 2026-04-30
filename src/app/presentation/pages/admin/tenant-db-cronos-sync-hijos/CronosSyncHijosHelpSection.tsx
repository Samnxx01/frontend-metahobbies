import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CronosSyncHijosHelpSection() {
  return (
    <Card className="border-dashed bg-muted/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Notas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-muted-foreground">
        <p>
          Esta pantalla solo persiste la política en la base master (colección <span className="font-mono">tenantdbcronsyncsettings</span>). El proceso Node programa el cron hijo→padre al iniciar y al guardar; el bloque padre→hijos queda listo para cuando enlaces ese job en el servidor.
        </p>
        <ul className="list-disc space-y-1 pl-4">
          <li>Bloque superior: política para futuros jobs padre→hijos.</li>
          <li>Bloque inferior: cron que ejecuta la réplica solo en bases <span className="font-mono">backupReplicaDbName</span> (requiere tenerla configurada en cada conexión hija).</li>
        </ul>
      </CardContent>
    </Card>
  );
}
