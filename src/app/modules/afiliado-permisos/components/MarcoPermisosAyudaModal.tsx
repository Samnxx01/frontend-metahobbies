import React, { useState } from 'react';
import {
  ArrowDownToLine,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Copy,
  LayoutGrid,
  LogIn,
  MousePointerClick,
  RefreshCw,
  Send,
  Server,
  Shield,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

type HttpMethod = 'GET' | 'PUT' | 'POST';

const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: 'border-success/40 bg-success/10 text-success dark:text-success',
  POST: 'border-info/40 bg-info/10 text-info dark:text-info',
  PUT: 'border-warning/40 bg-warning/10 text-warning dark:text-warning',
};

function HttpMethodBadge({ method }: { method: HttpMethod }): React.ReactElement {
  return (
    <span
      className={`inline-flex min-w-[3.25rem] items-center justify-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide ${METHOD_STYLES[method]}`}
    >
      {method}
    </span>
  );
}

function CodeBlock({
  children,
  label,
  variant = 'default',
}: {
  children: string;
  label: string;
  variant?: 'request' | 'response' | 'default';
}): React.ReactElement {
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

  const accent =
    variant === 'request'
      ? 'border-l-blue-500'
      : variant === 'response'
        ? 'border-l-emerald-500'
        : 'border-l-zinc-600';

  const Icon = variant === 'request' ? Send : variant === 'response' ? Server : ArrowDownToLine;

  return (
    <div
      className={`overflow-hidden rounded-lg border border-zinc-800/80 bg-button shadow-sm ring-1 ring-black/5 dark:ring-white/5 border-l-[3px] ${accent}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/90 bg-button/80 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 gap-1.5 px-2 text-muted-foreground hover:bg-button hover:text-muted-foreground"
          onClick={() => void copiar()}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-success" />
              <span className="text-[10px]">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span className="text-[10px]">Copiar</span>
            </>
          )}
        </Button>
      </div>
      <pre className="max-h-48 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-muted-foreground [scrollbar-color:rgb(63_63_70)_rgb(24_24_27)]">
        {children}
      </pre>
    </div>
  );
}

function FlowStep({
  step,
  icon,
  title,
  description,
  actionHint,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  actionHint?: string;
}): React.ReactElement {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center gap-1">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {step}
        </span>
        <div className="hidden h-full w-px flex-1 bg-border/60 sm:block" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 pb-5">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-primary">{icon}</span>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            {actionHint ? (
              <p className="rounded-md border border-border/50 bg-muted/30 px-2.5 py-1.5 text-xs text-foreground">
                {actionHint}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

function StatPill({ label, value }: { label: string; value: string | number }): React.ReactElement {
  return (
    <div className="min-w-[4.5rem] rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">{value}</p>
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
  method: HttpMethod;
  title: string;
  description: string;
  request: string;
  response: string;
}): React.ReactElement {
  return (
    <article className="overflow-hidden rounded-xl border border-border/60 bg-card/40 shadow-sm">
      <div className="space-y-2 border-b border-border/50 bg-muted/30 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <HttpMethodBadge method={method} />
          <code className="break-all rounded-md border border-border/40 bg-background/80 px-2 py-1 font-mono text-[11px] text-foreground">
            {title}
          </code>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2">
        <CodeBlock label="Request" variant="request">
          {request}
        </CodeBlock>
        <CodeBlock label="Response" variant="response">
          {response}
        </CodeBlock>
      </div>
    </article>
  );
}

export function MarcoPermisosAyudaModal({
  marcoActivo,
  vistasCount,
  accionesCount,
}: Props): React.ReactElement {
  const [apiAbierta, setApiAbierta] = useState(false);
  const seqActual = marcoActivo?.seq ?? 1;
  const seqNueva = seqActual + 1;

  const ejemploBodyGuardar = JSON.stringify(
    {
      vistas: ['idRutaSeguridad1', 'idRutaSeguridad2'],
      acciones: ['idAccionGet1', 'idAccionPost1'],
    },
    null,
    2
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          title="Ayuda sobre el techo de permisos"
        >
          <CircleHelp className="h-4 w-4" />
          Ayuda
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-3xl gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="space-y-3 border-b border-border/50 px-6 py-5 pr-12">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CircleHelp className="h-5 w-5 text-primary" />
            ¿Cómo funciona el techo de permisos?
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            El <strong>techo</strong> define el máximo de pantallas y llamadas API que puede usar un
            afiliado según su rol corporativo. Aquí configuras ese límite, lo publicas y lo aplicas
            a los usuarios.
          </DialogDescription>

          <div className="flex flex-wrap gap-2 pt-1">
            <StatPill label="Versión activa" value={`seq ${seqActual}`} />
            <StatPill label="Tras guardar" value={`seq ${seqNueva}`} />
            <StatPill label="Vistas marcadas" value={vistasCount} />
            <StatPill label="Acciones marcadas" value={accionesCount} />
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(92vh-11rem)]">
          <div className="space-y-5 px-6 py-5">
            <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex gap-3">
                <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-foreground">En pocas palabras</p>
                  <p className="leading-relaxed text-muted-foreground">
                    Seleccionas qué rutas del front (<strong>vistas</strong>) y qué endpoints HTTP (
                    <strong>acciones</strong>) quedan permitidos. Al guardar se crea una nueva
                    versión numerada (<strong>seq</strong>) y el sistema actualiza la herencia de
                    permisos de los afiliados con ese rol.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Flujo paso a paso</h3>
              <ol className="list-none space-y-0">
                <FlowStep
                  step={1}
                  icon={<Users className="h-4 w-4" />}
                  title="Elige el rol corporativo"
                  description="Usa el selector de rol para parametrizar el techo del perfil correcto (por ejemplo CLIENTE global). Cada rol puede tener su propio marco."
                />
                <FlowStep
                  step={2}
                  icon={<LayoutGrid className="h-4 w-4" />}
                  title="Marca vistas y acciones en el catálogo"
                  description="En las pestañas del catálogo, activa las pantallas que el afiliado podrá ver y los métodos HTTP (GET, POST, etc.) que podrá invocar. Solo lo incluido aquí quedará autorizado."
                  actionHint="Tip: filtra por sugeridas para ver rutas habituales de afiliado."
                />
                <FlowStep
                  step={3}
                  icon={<MousePointerClick className="h-4 w-4" />}
                  title="Publica con «Guardar techo»"
                  description={`Al guardar se desactiva la versión seq ${seqActual} y se crea seq ${seqNueva} con tu selección actual (${vistasCount} vistas, ${accionesCount} acciones). El backend sincroniza automáticamente la herenciaCliente de los usuarios de ese rol.`}
                  actionHint="Botón «Guardar techo» en la barra superior."
                />
                <FlowStep
                  step={4}
                  icon={<RefreshCw className="h-4 w-4" />}
                  title="Sincroniza tu sesión (opcional)"
                  description="Si tú mismo eres afiliado o quieres probar el marco recién guardado, usa «Sincronizar mi sesión» para refrescar tu token con la seq actual sin cerrar sesión manualmente."
                  actionHint="Botón «Sincronizar mi sesión» — solo afecta al usuario autenticado."
                />
                <FlowStep
                  step={5}
                  icon={<LogIn className="h-4 w-4" />}
                  title="Los afiliados deben volver a iniciar sesión"
                  description="Tras un guardado, los afiliados que ya tenían sesión abierta pueden seguir con permisos antiguos hasta que renueven su JWT. Pídeles que cierren sesión y entren de nuevo para aplicar la nueva seq."
                />
              </ol>
            </section>

            <section className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-semibold text-foreground">Conceptos clave</p>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-0.5">
                  <dt className="text-xs font-medium text-foreground">seq (secuencia)</dt>
                  <dd className="text-xs leading-relaxed text-muted-foreground">
                    Número de versión del techo. Cada guardado incrementa la seq; la versión anterior
                    queda desactivada pero conservada en historial.
                  </dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-xs font-medium text-foreground">Vista</dt>
                  <dd className="text-xs leading-relaxed text-muted-foreground">
                    Pantalla o ruta de navegación del front que el afiliado puede abrir.
                  </dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-xs font-medium text-foreground">Acción</dt>
                  <dd className="text-xs leading-relaxed text-muted-foreground">
                    Endpoint HTTP concreto (método + ruta API) que el afiliado puede llamar.
                  </dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-xs font-medium text-foreground">herenciaCliente</dt>
                  <dd className="text-xs leading-relaxed text-muted-foreground">
                    Registro por usuario que materializa el techo activo. Se actualiza al guardar y
                    al sincronizar.
                  </dd>
                </div>
              </dl>
            </section>

            <section className="overflow-hidden rounded-xl border border-border/60">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                onClick={() => setApiAbierta((v) => !v)}
                aria-expanded={apiAbierta}
              >
                <span className="text-sm font-medium text-foreground">
                  Referencia técnica (API)
                </span>
                {apiAbierta ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {apiAbierta ? (
                <div className="space-y-4 border-t border-border/50 p-4">
                  <p className="text-xs text-muted-foreground">
                    Endpoints usados por esta pantalla. JWT requerido salvo en{' '}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                      GET activo
                    </code>{' '}
                    (token opcional).
                  </p>

                  <EndpointSection
                    method="GET"
                    title={AFILIADO_PERMISOS_PATHS.marcoActivo(true)}
                    description="Carga el marco activo del rol. Con bootstrap=true crea seq 1 vacío si aún no existe."
                    request={`// Sin body
Authorization: Bearer <token>  // opcional en GET activo`}
                    response={JSON.stringify(
                      {
                        marco: {
                          seq: seqActual,
                          codigo: 'CLIENTE_PLATAFORMA',
                          vistas: [],
                          acciones: [],
                        },
                        creado: false,
                        msg: 'Marco activo',
                      },
                      null,
                      2
                    )}
                  />

                  <EndpointSection
                    method="POST"
                    title={AFILIADO_PERMISOS_PATHS.marcoGuardar}
                    description={`Equivale a «Guardar techo»: desactiva seq ${seqActual} y crea seq ${seqNueva}.`}
                    request={`Authorization: Bearer <token>
Content-Type: application/json

${ejemploBodyGuardar}`}
                    response={JSON.stringify(
                      {
                        msg: 'Marco de permisos afiliado guardado',
                        marco: {
                          seq: seqNueva,
                          rolCorporativoId: '…',
                          vistas: ['…'],
                          acciones: ['…'],
                        },
                      },
                      null,
                      2
                    )}
                  />

                  <EndpointSection
                    method="POST"
                    title={AFILIADO_PERMISOS_PATHS.sync}
                    description="Equivale a «Sincronizar mi sesión» o barrido por lote de afiliados."
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

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Fragmento del JWT tras login del afiliado
                    </p>
                    <CodeBlock label="rolCorporativoScope" variant="default">
                      {JSON.stringify(
                        {
                          rolCorporativoScope: {
                            modoAutorizacion: 'MARCO_AFILIADO',
                            marcoSeq: seqNueva,
                            permisosSincronizados: true,
                          },
                        },
                        null,
                        2
                      )}
                    </CodeBlock>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Usar MarcoPermisosAyudaModal */
export const MarcoPermisosApiReferenciaModal = MarcoPermisosAyudaModal;
