import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface RouteUserMenuSettingsProps {
  enabled: boolean;
  menuKey: string | null | undefined;
  menuLabel: string | null | undefined;
  menuOrder: number | null | undefined;
  onEnabledChange: (checked: boolean) => void;
  onMenuKeyChange: (value: string) => void;
  onMenuLabelChange: (value: string) => void;
  onMenuOrderChange: (value: number) => void;
}

export default function RouteUserMenuSettings({
  enabled,
  menuKey,
  menuLabel,
  menuOrder,
  onEnabledChange,
  onMenuKeyChange,
  onMenuLabelChange,
  onMenuOrderChange,
}: RouteUserMenuSettingsProps): React.ReactElement {
  return (
    <>
      <div className="flex items-center justify-between rounded-md border px-3 py-2 md:col-span-2">
        <Label htmlFor="mostrarEnMenuUsuario" className="cursor-pointer">Mostrar en menu de usuario</Label>
        <Switch
          id="mostrarEnMenuUsuario"
          checked={enabled}
          onCheckedChange={onEnabledChange}
        />
      </div>
      {enabled && (
        <>
          <div className="space-y-2">
            <Label htmlFor="menuUsuarioKey">Clave del menu</Label>
            <Select
              value={String(menuKey || '')}
              onValueChange={onMenuKeyChange}
            >
              <SelectTrigger id="menuUsuarioKey">
                <SelectValue placeholder="Selecciona un item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PANEL_ADMIN">Panel Admin</SelectItem>
                <SelectItem value="MI_PERFIL">Mi Perfil</SelectItem>
                <SelectItem value="MI_MEMBRESIA">Mi Membresia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="menuUsuarioOrder">Orden en menu</Label>
            <Input
              id="menuUsuarioOrder"
              type="number"
              value={String(menuOrder ?? 0)}
              onChange={(e) => onMenuOrderChange(Number(e.target.value || 0))}
              placeholder="0"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="menuUsuarioLabel">Label personalizado</Label>
            <Input
              id="menuUsuarioLabel"
              value={String(menuLabel || '')}
              onChange={(e) => onMenuLabelChange(e.target.value)}
              placeholder="Opcional. Si lo dejas vacio usa el nombre de la ruta"
            />
          </div>
        </>
      )}
    </>
  );
}
