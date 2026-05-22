import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { catalogoAjusteUi } from './inventarioAjusteCatalogStyles';
import { MODO_REGISTRO_MANUAL } from './inventarioAjusteCatalogConstants';

export type CatalogoDinamicoOption = {
  codigo: string;
  nombre: string;
  extra?: string;
};

type InventarioCatalogoDinamicoSelectProps = {
  label: string;
  value: string;
  onChange: (codigo: string, option?: CatalogoDinamicoOption) => void;
  options: CatalogoDinamicoOption[];
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  refreshKey?: number;
  onRegistrarManual?: () => void;
  loadOptions?: () => Promise<CatalogoDinamicoOption[]>;
};

export default function InventarioCatalogoDinamicoSelect({
  label,
  value,
  onChange,
  options: optionsProp,
  loading: loadingProp = false,
  disabled = false,
  placeholder = 'Selecciona una opción',
  refreshKey = 0,
  onRegistrarManual,
  loadOptions,
}: InventarioCatalogoDinamicoSelectProps): React.ReactElement {
  const [options, setOptions] = useState<CatalogoDinamicoOption[]>(optionsProp);
  const [loading, setLoading] = useState(loadingProp);

  useEffect(() => {
    if (!loadOptions) {
      setOptions(optionsProp);
      return;
    }
    let mounted = true;
    const load = async (): Promise<void> => {
      try {
        setLoading(true);
        const data = await loadOptions();
        if (!mounted) return;
        setOptions(data);
        if (!value && data[0]?.codigo) {
          onChange(data[0].codigo, data[0]);
        }
      } catch (error) {
        console.error('Error cargando catálogo dinámico:', error);
        if (mounted) setOptions([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [refreshKey, loadOptions]);

  useEffect(() => {
    if (!loadOptions) setOptions(optionsProp);
  }, [optionsProp, loadOptions]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-foreground">{label}</Label>
        {onRegistrarManual ? (
          <button
            type="button"
            className={catalogoAjusteUi.linkAction}
            onClick={onRegistrarManual}
            disabled={disabled || loading}
          >
            <Plus className="mr-1 inline h-3 w-3" />
            Registrar manualmente
          </button>
        ) : null}
      </div>
      <Select
        value={value || undefined}
        onValueChange={(codigo) => {
          if (codigo === MODO_REGISTRO_MANUAL) {
            onRegistrarManual?.();
            return;
          }
          const option = options.find((item) => item.codigo === codigo);
          onChange(codigo, option);
        }}
        disabled={disabled || loading || options.length === 0}
      >
        <SelectTrigger className={catalogoAjusteUi.input}>
          <SelectValue placeholder={loading ? 'Cargando...' : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((item) => (
            <SelectItem key={item.codigo} value={item.codigo}>
              {item.nombre}
              {item.extra ? ` (${item.extra})` : ''}
            </SelectItem>
          ))}
          {onRegistrarManual ? (
            <SelectItem value={MODO_REGISTRO_MANUAL}>Registrar manualmente…</SelectItem>
          ) : null}
        </SelectContent>
      </Select>
    </div>
  );
}
