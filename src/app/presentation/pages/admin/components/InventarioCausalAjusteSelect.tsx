import { useCallback, useState } from 'react';
import inventarioService, { type InventarioCausalAjuste } from '@/app/services/inventarioService';
import InventarioCatalogoDinamicoSelect from './inventario-ajuste/InventarioCatalogoDinamicoSelect';
import InventarioCausalAjusteFormSubmodal from './inventario-ajuste/InventarioCausalAjusteFormSubmodal';

type InventarioCausalAjusteSelectProps = {
  value: string;
  onChange: (codigo: string, causal?: InventarioCausalAjuste) => void;
  disabled?: boolean;
  label?: string;
  refreshKey?: number;
};

export default function InventarioCausalAjusteSelect({
  value,
  onChange,
  disabled = false,
  label = 'Causal',
  refreshKey = 0,
}: InventarioCausalAjusteSelectProps): React.ReactElement {
  const [submodalOpen, setSubmodalOpen] = useState(false);
  const [internalRefresh, setInternalRefresh] = useState(0);
  const [causalesCache, setCausalesCache] = useState<InventarioCausalAjuste[]>([]);

  const loadOptions = useCallback(async () => {
    const data = await inventarioService.listarCausalesAjuste();
    setCausalesCache(data);
    return data.map((causal) => ({
      codigo: causal.codigo,
      nombre: causal.nombre,
    }));
  }, []);

  const handleCreada = (): void => {
    setInternalRefresh((prev) => prev + 1);
  };

  return (
    <>
      <InventarioCatalogoDinamicoSelect
        label={label}
        value={value}
        onChange={(codigo) => {
          const causal = causalesCache.find((item) => item.codigo === codigo);
          onChange(codigo, causal);
        }}
        options={[]}
        disabled={disabled}
        placeholder="Selecciona causal"
        refreshKey={refreshKey + internalRefresh}
        loadOptions={loadOptions}
        onRegistrarManual={() => setSubmodalOpen(true)}
      />
      <InventarioCausalAjusteFormSubmodal
        open={submodalOpen}
        onOpenChange={setSubmodalOpen}
        onGuardada={handleCreada}
      />
    </>
  );
}
