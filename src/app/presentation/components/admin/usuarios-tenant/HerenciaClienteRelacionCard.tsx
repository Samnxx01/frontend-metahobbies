import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Link2 } from 'lucide-react';
import type { HerenciaClienteRelacion } from '@/app/modules/afiliado-permisos/types/marco.types';

type Props = {
  herenciaCliente: HerenciaClienteRelacion | null | undefined;
  compact?: boolean;
};

export function HerenciaClienteRelacionCard({
  herenciaCliente,
  compact = false,
}: Props): React.ReactElement {
  if (!herenciaCliente) {
    return (
      <p className="text-xs text-muted-foreground rounded-md border border-dashed px-3 py-2">
        Sin herenciaCliente — aplique el marco para crear herencia + counter.
      </p>
    );
  }

  const { herencia, counter, marcoActivo, enlazado, permisosSincronizados } = herenciaCliente;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        {marcoActivo ? (
          <Badge variant="outline">marco seq {marcoActivo.seq}</Badge>
        ) : null}
        {herencia ? <Badge variant="secondary">herencia {herencia.id.slice(-6)}</Badge> : null}
        {counter ? (
          <Badge variant="secondary">counter → herencia {counter.herenciaId?.slice(-6) ?? '—'}</Badge>
        ) : null}
        {permisosSincronizados ? (
          <Badge className="bg-success/90">sync OK</Badge>
        ) : enlazado ? (
          <Badge variant="outline">enlazado</Badge>
        ) : (
          <Badge variant="destructive">sin enlace</Badge>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-2">
      <div className="flex items-center gap-2 font-medium text-foreground">
        <Link2 className="h-3.5 w-3.5 text-primary" />
        Herencia cliente (MARCO_AFILIADO)
      </div>
      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
        <li>
          Marco{' '}
          <code className="rounded bg-muted px-1">
            {marcoActivo?.codigo ?? '—'} seq {marcoActivo?.seq ?? '—'}
          </code>
        </li>
        <li>
          Herencia{' '}
          {herencia ? (
            <code className="rounded bg-muted px-1">{herencia.id}</code>
          ) : (
            <span className="text-destructive">pendiente</span>
          )}
          {herencia ? ` · ${herencia.vistasCount} vistas, ${herencia.accionesCount} acciones` : null}
        </li>
        <li>
          Counter{' '}
          {counter ? (
            <>
              <code className="rounded bg-muted px-1">{counter.id}</code>
              {' → herenciaId '}
              <code className="rounded bg-muted px-1">{counter.herenciaId ?? '—'}</code>
            </>
          ) : (
            <span className="text-destructive">pendiente</span>
          )}
        </li>
      </ol>
      <div className="flex flex-wrap gap-1.5 pt-1">
        <Badge variant={enlazado ? 'default' : 'destructive'}>
          {enlazado ? 'Herencia ↔ Counter enlazados' : 'Sin enlace herenciaId'}
        </Badge>
        <Badge variant={permisosSincronizados ? 'default' : 'outline'}>
          {permisosSincronizados ? 'Permisos sincronizados' : 'Permisos desactualizados'}
        </Badge>
        {counter?.corporativoAsociado?.fuente ? (
          <Badge variant="outline">corp. {counter.corporativoAsociado.fuente}</Badge>
        ) : null}
      </div>
    </div>
  );
}
