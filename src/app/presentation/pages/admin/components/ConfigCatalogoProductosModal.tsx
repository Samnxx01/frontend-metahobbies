import React from 'react';
import { Settings2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { GovernedButton } from '@/app/presentation/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProductoCatalogoConfig } from '@/app/hooks/useProductoCatalogoConfig';
import ConfigCatalogoProductosPanel from './ConfigCatalogoProductosPanel';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

export default function ConfigCatalogoProductosModal({
  open,
  onOpenChange,
  onSaved,
}: Props): React.ReactElement {
  const {
    config,
    patch,
    load,
    save,
    loading,
    saving,
  } = useProductoCatalogoConfig({ autoLoad: false });

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const handleSave = async (): Promise<void> => {
    try {
      await save();
      toast.success('Parametrización del catálogo guardada.');
      onSaved?.();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la configuración.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configuración del catálogo
          </DialogTitle>
          <DialogDescription>
            Límites de texto y comportamiento del mini-carrito para productos de venta.
          </DialogDescription>
        </DialogHeader>
        <ConfigCatalogoProductosPanel
          compact
          value={config}
          onChange={patch}
          onSave={handleSave}
          onReload={load}
          loading={loading}
          saving={saving}
        />
      </DialogContent>
    </Dialog>
  );
}

export function ConfigCatalogoProductosTrigger({
  onClick,
  className,
  actionId,
}: {
  onClick: () => void;
  className?: string;
  actionId?: string;
}): React.ReactElement {
  if (actionId) {
    return (
      <GovernedButton actionId={actionId} type="button" variant="outline" onClick={onClick} className={className}>
        <Settings2 className="mr-2 h-4 w-4" />
        Config. catálogo
      </GovernedButton>
    );
  }
  return (
    <Button type="button" variant="outline" onClick={onClick} className={className}>
      <Settings2 className="h-4 w-4 mr-2" />
      Config. catálogo
    </Button>
  );
}
