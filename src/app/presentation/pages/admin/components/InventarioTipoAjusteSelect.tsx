import { useCallback, useState } from 'react';
import inventarioService, { type InventarioTipoAjuste } from '@/app/services/inventarioService';
import InventarioCatalogoDinamicoSelect from './inventario-ajuste/InventarioCatalogoDinamicoSelect';
import InventarioTipoAjusteFormSubmodal from './inventario-ajuste/InventarioTipoAjusteFormSubmodal';

type InventarioTipoAjusteSelectProps = {
  value: string;
  onChange: (codigo: string, tipo?: InventarioTipoAjuste) => void;
  disabled?: boolean;
  label?: string;
  refreshKey?: number;
};

export default function InventarioTipoAjusteSelect({
  value,
  onChange,
  disabled = false,
  label = 'Tipo ajuste',
  refreshKey = 0,
}: InventarioTipoAjusteSelectProps): React.ReactElement {
  const [submodalOpen, setSubmodalOpen] = useState(false);
  const [internalRefresh, setInternalRefresh] = useState(0);
  const [tiposCache, setTiposCache] = useState<InventarioTipoAjuste[]>([]);

  const loadOptions = useCallback(async () => {
    const data = await inventarioService.listarTiposAjusteAdmin();
    setTiposCache(data);
    return data.map((tipo) => ({
      codigo: tipo.codigo,
      nombre: tipo.nombre,
      extra: `${tipo.direccion === 'POSITIVO' ? 'Entrada' : 'Salida'} · ${tipo.estado === false ? 'Inactivo' : 'Activo'}`,
    }));
  }, []);

  const handleCreado = (): void => {
    setInternalRefresh((prev) => prev + 1);
  };

  return (
    <>
      <InventarioCatalogoDinamicoSelect
        label={label}
        value={value}
        onChange={(codigo) => {
          const tipo = tiposCache.find((item) => item.codigo === codigo);
          onChange(codigo, tipo);
        }}
        options={[]}
        disabled={disabled}
        placeholder="Selecciona tipo de ajuste"
        refreshKey={refreshKey + internalRefresh}
        loadOptions={loadOptions}
        onRegistrarManual={() => setSubmodalOpen(true)}
      />
      <InventarioTipoAjusteFormSubmodal
        open={submodalOpen}
        onOpenChange={setSubmodalOpen}
        onGuardado={handleCreado}
      />
    </>
  );
}
