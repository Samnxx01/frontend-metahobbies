export function CronosSyncJerarquiaIntro() {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
      <h3 className="text-sm font-semibold text-foreground">Réplica automática hija → BD backup en cluster padre</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Los datos salen de la BD del hijo y se escriben solo en la base indicada en <span className="font-mono">backupReplicaDbName</span>
        (misma URI que el padre, otro <span className="font-mono">dbName</span>). La base operativa del padre no se modifica.
      </p>
    </div>
  );
}
