import { CircleHelp, GitBranch, ShieldCheck } from 'lucide-react';
import { GovernedButton, TENANT_GOVERNANCE_ACTION_IDS } from '@/app/presentation/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const LEVELS = [
  {
    level: 'NVL 0 · SUPER ADMIN / LIBRE',
    detail:
      'Crea un tenantSuperAdmin (sub-SA). Exige un tenantSuperAdmin en el JWT. El padre debe ser el mismo SA autenticado o un SA de su subárbol; nunca puede quedar fuera de su rama.',
  },
  {
    level: 'NVL 1 · TENANT GLOBAL',
    detail:
      'Crea un tenant global dentro de la rama autorizada. El corporativo debe ser coherente con la jerarquía y el backend permite el mismo NVL cuando se trata de expansión interna bajo el mismo SA.',
  },
  {
    level: 'NVL 2 · CORPORATIVO',
    detail:
      'Crea el nivel corporativo. En el flujo SA no necesitas tenantGlobalRef: el registro puede iniciar una nueva rama bajo el tenantSuperAdmin del JWT. En el flujo tenantGlobal puro se usa el propio tenant global como padre. El corporativo siempre debe ser coherente con los counters.',
  },
] as const;

export function NvlRestrictionsHelpDialog(): React.ReactElement {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <GovernedButton
          actionId={TENANT_GOVERNANCE_ACTION_IDS.VIEW_LEVEL_RESTRICTIONS_HELP}
          type="button"
          variant="outline"
          className="w-full shrink-0 justify-center sm:w-auto"
        >
          <CircleHelp className="mr-2 h-4 w-4" aria-hidden />
          Ayuda NVL
        </GovernedButton>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" aria-hidden />
            Restricciones por nivel de generación
          </DialogTitle>
          <DialogDescription>
            El nivel elegido define qué documento se crea y el alcance siempre se valida contra el JWT,
            las configuraciones NVL activas y tenantjerarquiacounters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {LEVELS.map((item) => (
            <section key={item.level} className="rounded-lg border border-border bg-muted/40 p-4">
              <h3 className="text-sm font-semibold text-foreground">{item.level}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
            </section>
          ))}

          <section className="rounded-lg border border-primary/30 bg-primary/10 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
              Excepción DIOS raíz
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Puedes seleccionar cualquier rol MABS en cualquier NVL únicamente cuando el rol del JWT es
              DIOS, existe su registro en tenantjerarquiacounters y ese registro tiene codigoPadre en null.
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              Esta excepción amplía el selector de roles; no elimina los campos obligatorios ni permite
              crear fuera de la rama que valida el backend.
            </p>
          </section>

          <section className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground">Para cualquier otro usuario</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              El rol DIOS se oculta en NVL 1 y NVL 2. Solo se muestran niveles, corporativos, tenant globales
              y padres alcanzables desde la rama del JWT. Tener el rol DIOS con codigoPadre informado no
              convierte al usuario en raíz.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
