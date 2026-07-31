import React, { useEffect, useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiFetch } from '@/app/services/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export type PerfilSuperAdminOption = { id: string; label: string; disponible?: boolean; usuarioVinculado?: string | null };
type RolOption = { id: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  perfiles: PerfilSuperAdminOption[];
  onCreated?: () => void;
};

const initial = {
  correo: '', password: '', rol: '', perfilSuperAdmin: '',
  estado: true, verificado: false, canReferir: true,
};

export function RegisUsuDirectoModal({ open, onClose, perfiles, onCreated }: Props) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<PerfilSuperAdminOption[]>(perfiles);
  const [roles, setRoles] = useState<RolOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    if (!open) { setForm(initial); return; }
    setLoadingOptions(true);
    apiFetch('/api/registro/usuario/regisusu/opciones', { method: 'GET' })
      .then((response: any) => {
        const rows = Array.isArray(response?.data?.perfilesSuperAdmin) ? response.data.perfilesSuperAdmin : [];
        setOptions(rows.map((row: any) => ({
          id: String(row.id || ''),
          label: String(row.label || row.id || ''),
          disponible: row.disponible !== false,
          usuarioVinculado: row.usuarioVinculado || null,
        })).filter((row: PerfilSuperAdminOption) => row.id));
        const rolesRows = Array.isArray(response?.data?.roles) ? response.data.roles : [];
        setRoles(rolesRows.map((row: any) => ({ id: String(row.id || ''), label: String(row.label || row.id || '') })).filter((row: RolOption) => row.id));
      })
      .catch(() => setOptions(perfiles))
      .finally(() => setLoadingOptions(false));
  }, [open, perfiles]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await apiFetch('/api/registro/usuario/regisusu', {
        method: 'POST',
        body: form,
      });
      toast.success(String((response as any)?.msg || 'Usuario RegisUsu creado correctamente.'));
      onCreated?.();
      onClose();
    } catch (error) {
      toast.error(String((error as Error)?.message || 'No se pudo crear el usuario RegisUsu.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Crear RegisUsu</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label>Correo *</Label><Input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Contraseña *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required /></div>
          <div className="space-y-2">
            <Label>Rol *</Label>
            <Select value={form.rol} onValueChange={(value) => setForm({ ...form, rol: value })} required>
              <SelectTrigger><SelectValue placeholder="Selecciona un rol activo" /></SelectTrigger>
              <SelectContent>{roles.map((rol) => <SelectItem key={rol.id} value={rol.id}>{rol.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Perfil SuperAdmin *</Label>
            <Select value={form.perfilSuperAdmin} onValueChange={(value) => setForm({ ...form, perfilSuperAdmin: value })} required>
              <SelectTrigger><SelectValue placeholder="Selecciona un perfil SuperAdmin" /></SelectTrigger>
              <SelectContent>{options.map((perfil) => <SelectItem key={perfil.id} value={perfil.id} disabled={perfil.disponible === false}>{perfil.label}{perfil.usuarioVinculado ? ` · vinculado a ${perfil.usuarioVinculado}` : ''}</SelectItem>)}</SelectContent>
            </Select>
            {loadingOptions && <p className="text-xs text-muted-foreground">Cargando perfiles disponibles…</p>}
            {!loadingOptions && !options.some((perfil) => perfil.disponible !== false) && <p className="text-xs text-destructive">No hay perfiles SuperAdmin activos disponibles.</p>}
          </div>
          {(['estado', 'verificado', 'canReferir'] as const).map((field) => (
            <div key={field} className="flex items-center justify-between rounded-md border p-3">
              <Label>{field}</Label><Switch checked={form[field]} onCheckedChange={(checked) => setForm({ ...form, [field]: checked })} />
            </div>
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving || loadingOptions || !roles.length || !options.some((perfil) => perfil.disponible !== false)}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear usuario</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
