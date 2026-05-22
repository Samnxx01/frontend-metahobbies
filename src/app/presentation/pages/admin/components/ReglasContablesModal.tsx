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
};

export default function ReglasContablesModal({
  open,
  onOpenChange,
  saving = false,
  onReglasActualizadas,
  title = 'Parametrización de reglas contables',
  description = 'Configure impuestos, retenciones, márgenes y reglas comerciales por tenant. Las reglas activas se usan al calcular precios y totales de productos.',
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
        />
      </DialogContent>
    </Dialog>
  );
}
