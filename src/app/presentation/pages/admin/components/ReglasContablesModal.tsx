import ReglasContablesParametrizacion from '../ParametrizacionContable/ReglasContablesParametrizacion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { reglasContablesUi } from './reglas-contables/reglasContablesUi';

type ReglasContablesModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  onReglasActualizadas?: () => void;
  title?: string;
  description?: string;
  /** Oculta "Parametrizar tipos/ámbitos/tarifas" y "Agregar regla"; deja solo Recargar + botón a la parametrización completa. */
  modoResumen?: boolean;
  /** Callback del botón "Ir a parametrización completa" (visible solo si se pasa junto con `modoResumen`). */
  onIrACompleta?: () => void;
};

export default function ReglasContablesModal({
  open,
  onOpenChange,
  saving = false,
  onReglasActualizadas,
  title = 'Parametrización de reglas contables',
  description = 'Configure impuestos, retenciones, márgenes y reglas comerciales por tenant. Las reglas activas se usan al calcular precios y totales de productos.',
  modoResumen = false,
  onIrACompleta,
}: ReglasContablesModalProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={reglasContablesUi.dialogContent}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className={reglasContablesUi.description}>{description}</DialogDescription>
        </DialogHeader>
        <ReglasContablesParametrizacion
          embedded
          saving={saving}
          onReglasActualizadas={onReglasActualizadas}
          modoResumen={modoResumen}
          onIrACompleta={onIrACompleta}
        />
      </DialogContent>
    </Dialog>
  );
}
