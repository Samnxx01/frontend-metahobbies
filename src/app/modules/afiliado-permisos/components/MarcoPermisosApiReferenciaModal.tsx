import React, { useState } from 'react';
import { BookOpen, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AFILIADO_PERMISOS_PATHS } from '../api/paths';
import type { MarcoPermisosAfiliado } from '../types/marco.types';

type Props = {
  marcoActivo: MarcoPermisosAfiliado | null;
  vistasCount: number;
  accionesCount: number;
};

function CodeBlock({ children }: { children: string }): React.ReactElement {
  const [copied, setCopied] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative rounded-md border bg-muted/40">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 h-7 w-7"
        onClick={() => void copiar()}
        title="Copiar"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
      <pre className="max-h-48 overflow-x-auto p-3 pr-10 text-xs leading-relaxed">{children}</pre>
    </div>
  );
}

function EndpointSection({
  method,
  title,
  description,
  request,
  response,
}: {
  method: 'GET' | 'PUT' | 'POST';
  title: string;
  description: string;
  request: string;
  response: string;
}): React.ReactElement {
  const methodColor =
    method === 'GET' ? 'secondary' : method === 'PUT' ? 'default' : 'outline';

  return (
    <section className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={methodColor} className="font-mono">
          {method}
        </Badge>
        <code className="text-xs break-all">{title}</code>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <p className="text-xs font-medium text-foreground">Request</p>
      <CodeBlock>{request}</CodeBlock>
      <p className="text-xs font-medium text-foreground">Response</p>
      <CodeBlock>{response}</CodeBlock>
    </section>
  );
}

export function MarcoPermisosApiReferenciaModal({
  marcoActivo,
  vistasCount,
  accionesCount,
}: Props): React.ReactElement {
  const seqActual = marcoActivo?.seq ?? 1;
  const seqNueva = seqActual + 1;

  const ejemploBodyGuardar = JSON.stringify(
    {
      vistas: ['idRutaSeguridad1', 'idRutaSeguridad2'],
      acciones: ['idAccionGet1', 'idAccionPost1'],
      notas: marcoActivo?.notas || 'Notas del techo',
    },
    null,
    2
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <BookOpen className="mr-2 h-4 w-4" />
          API y secuencia
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Referencia API — secuencia del techo</DialogTitle>
          <DialogDescription>
            Versión activa: <strong>seq {seqActual}</strong>. Al guardar techo pasa a{' '}
            <strong>seq {seqNueva}</strong> (con {vistasCount} vistas y {accionesCount} acciones
            seleccionadas). Requiere JWT en todos los endpoints salvo GET activo.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
          <div className="space-y-4">
            <EndpointSection
              method="GET"
              title={AFILIADO_PERMISOS_PATHS.marcoActivo(true)}
              description="Consulta el marco activo. Con bootstrap=true crea seq 1 vacío si no existe."
              request={`// Sin body
Authorization: Bearer <token>  // opcional en GET activo`}
              response={JSON.stringify(
                {
                  marco: { seq: seqActual, codigo: 'CLIENTE_PLATAFORMA', vistas: [], acciones: [] },
                  creado: false,
                  msg: 'Marco activo',
                },
                null,
                2
              )}
            />

            <EndpointSection
              method="PUT"
              title={AFILIADO_PERMISOS_PATHS.marcoGuardar}
              description={`Botón «Guardar techo». Desactiva seq ${seqActual} y crea nueva versión seq ${seqNueva}. Actualiza rolesCorporativos.marcoPermisosAfiliadoId.`}
              request={`Authorization: Bearer <token>
Content-Type: application/json

${ejemploBodyGuardar}`}
              response={JSON.stringify(
                {
                  msg: 'Marco de permisos afiliado guardado',
                  marco: {
                    _id: '674a...',
                    seq: seqNueva,
                    rolCorporativoId: '674a...',
                    vistas: ['...'],
                    acciones: ['...'],
                  },
                },
                null,
                2
              )}
            />

            <EndpointSection
              method="POST"
              title={AFILIADO_PERMISOS_PATHS.sync}
              description={`Botón «Sincronizar afiliados». Aplica seq ${seqNueva} a tenantJerarquiaCountersCliente + herencia por usuario CLIENTE global.`}
              request={`Authorization: Bearer <token>
// Body vacío`}
              response={JSON.stringify(
                {
                  msg: 'Barrido de permisos afiliado ejecutado',
                  resultado: {
                    procesados: 12,
                    errores: 0,
                    omitidos: 0,
                    marcoSeq: seqNueva,
                    pendientes: 13,
                  },
                },
                null,
                2
              )}
            />

            <section className="space-y-2 rounded-md border border-dashed p-3">
              <p className="text-sm font-medium">Flujo recomendado</p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Seleccionar vistas y acciones en el catálogo.</li>
                <li>
                  <strong>PUT</strong> guardar techo → sube <code>seq</code>.
                </li>
                <li>
                  <strong>POST</strong> sincronizar → materializa permisos por afiliado.
                </li>
                <li>Afiliados deben volver a iniciar sesión para JWT con marcoSeq actualizado.</li>
              </ol>
            </section>

            <section className="space-y-2">
              <p className="text-sm font-medium">JWT — rolCorporativoScope (tras login)</p>
              <CodeBlock>
                {JSON.stringify(
                  {
                    rolCorporativoScope: {
                      rolCorporativoId: '674a...',
                      modoAutorizacion: 'MARCO_AFILIADO',
                      marcoPermisosAfiliadoId: '674a...marco',
                      marcoSeq: seqNueva,
                      permisosSincronizados: true,
                      counter: {
                        id: '674a...counter',
                        herenciaId: '674a...herencia',
                        seqMarco: seqNueva,
                        marcoPermisosAfiliado: '674a...marco',
                      },
                    },
                  },
                  null,
                  2
                )}
              </CodeBlock>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
