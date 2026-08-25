import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiFetch } from '@/app/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { encodePublicIdForPath, resolveEntityPublicId } from '@/app/utils/entityPublicId';

type RolGlobal = { iud?: string; _id?: string; codigo: string; nombre: string; descripcion?: string; tipoAlcance: string; nivel: number; rolPadre?: RolGlobal | string | null; tenantSuperAdminPadre?: { iud?: string; _id?: string } | string | null; esSistema: boolean; asignable: boolean; estado: boolean };
type TenantSuperAdminPadre = { id: string; tenantSuperAdminId: string; codigoJerarquia?: string | null; rolId?: string | null; rolNombre?: string | null; corporativoNombre?: string | null };
type Form = { id: string; codigo: string; nombre: string; descripcion: string; rolPadre: string; asignable: boolean; estado: boolean };
const EMPTY: Form = { id: '', codigo: '', nombre: '', descripcion: '', rolPadre: '', asignable: true, estado: true };
const idOf = (value: unknown): string => resolveEntityPublicId(value) || '';

export function RolesTgModal({ open, onClose }: { open: boolean; onClose: () => void }): React.ReactElement {
  const [roles, setRoles] = useState<RolGlobal[]>([]);
  const [tenantsSuperAdmin, setTenantsSuperAdmin] = useState<TenantSuperAdminPadre[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState('');
  const rolesTg = useMemo(() => roles.filter((r) => r.tipoAlcance === 'TENANT_GLOBAL'), [roles]);
  const padres = useMemo(() => tenantsSuperAdmin.filter((r) => r.tenantSuperAdminId), [tenantsSuperAdmin]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [res, padresSa]: any[] = await Promise.all([
        apiFetch('/api/seguridad/roles-globales', { method: 'GET' }),
        apiFetch('/api/seguridad/roles-globales/padres-sa', { method: 'GET' }),
      ]);
      setRoles(Array.isArray(res?.rolesGlobales) ? res.rolesGlobales : []);
      setTenantsSuperAdmin(Array.isArray(padresSa?.tenantSuperAdmins) ? padresSa.tenantSuperAdmins : []);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudieron cargar los roles TG'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (open) void cargar(); else setForm(EMPTY); }, [open, cargar]);

  const editar = (r: RolGlobal) => setForm({ id: idOf(r), codigo: r.codigo, nombre: r.nombre, descripcion: r.descripcion || '', rolPadre: idOf(r.tenantSuperAdminPadre), asignable: r.asignable, estado: r.estado });
  const guardar = async () => {
    if (!form.codigo.trim() || !form.nombre.trim() || !form.rolPadre) return void toast.error('Código, nombre y rol padre SA son obligatorios');
    setSaving(true);
    try {
      const body = { codigo: form.codigo, nombre: form.nombre, descripcion: form.descripcion, tipoAlcance: 'TENANT_GLOBAL', tenantSuperAdminPadre: form.rolPadre, esSistema: false, asignable: form.asignable, estado: form.estado };
      await apiFetch(form.id ? `/api/seguridad/roles-globales/${encodePublicIdForPath(form.id)}` : '/api/seguridad/roles-globales', { method: form.id ? 'PUT' : 'POST', body });
      toast.success(form.id ? 'Rol TG actualizado' : 'Rol TG creado'); setForm(EMPTY); await cargar();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo guardar el rol TG'); }
    finally { setSaving(false); }
  };
  const eliminar = async (r: RolGlobal) => {
    const id = idOf(r); if (!id || !window.confirm(`¿Eliminar ${r.nombre}?`)) return;
    setDeleting(id);
    try { await apiFetch(`/api/seguridad/roles-globales/${encodePublicIdForPath(id)}`, { method: 'DELETE' }); toast.success('Rol TG eliminado'); await cargar(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo eliminar'); }
    finally { setDeleting(''); }
  };

  return <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle className="flex gap-2"><Globe className="h-5 w-5" />Roles TG</DialogTitle></DialogHeader>
    <div className="grid gap-4 md:grid-cols-2"><section className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold">{form.id ? 'Modificar rol TG' : 'Crear rol TG'}</h3>
      <Label>Código</Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} placeholder="ADMIN_TG" />
      <Label>Nombre</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value.toUpperCase() })} placeholder="ADMIN" />
      <Label>Descripción</Label><Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
      <p className="text-xs text-muted-foreground">El nivel se asigna automáticamente a partir del rol padre SA.</p>
      <Label>Rol padre SA</Label><Select value={form.rolPadre} onValueChange={(rolPadre) => setForm({ ...form, rolPadre })}><SelectTrigger><SelectValue placeholder="Selecciona TenantSuperAdmin" /></SelectTrigger><SelectContent>{padres.map((r) => <SelectItem key={r.tenantSuperAdminId} value={r.tenantSuperAdminId}>{r.codigoJerarquia || 'SA'} · {r.rolNombre || 'Sin rol'} · {r.corporativoNombre || 'Sin corporativo'}</SelectItem>)}</SelectContent></Select>
      {!padres.length && <p className="text-xs text-destructive">No hay TenantSuperAdmin activos con rolesMabs asociado.</p>}
      <label className="flex gap-2 text-sm"><Checkbox checked={form.asignable} onCheckedChange={(v) => setForm({ ...form, asignable: v === true })} />Asignable</label><label className="flex gap-2 text-sm"><Checkbox checked={form.estado} onCheckedChange={(v) => setForm({ ...form, estado: v === true })} />Activo</label>
      <div className="flex gap-2"><Button disabled={saving} onClick={() => void guardar()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{form.id ? 'Guardar' : 'Crear'}</Button>{form.id && <Button variant="outline" onClick={() => setForm(EMPTY)}>Cancelar</Button>}</div>
    </section><section className="space-y-3"><div className="flex justify-between"><h3 className="font-semibold">Catálogo TENANT_GLOBAL</h3><Button size="icon" variant="ghost" onClick={() => void cargar()}><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></Button></div>
      {rolesTg.map((r) => <div key={idOf(r)} className="rounded-md border p-3"><div className="flex justify-between"><div><b>{r.nombre}</b><p className="font-mono text-xs text-muted-foreground">{r.codigo}</p></div><div><Button size="icon" variant="ghost" onClick={() => editar(r)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" disabled={deleting === idOf(r)} onClick={() => void eliminar(r)}>{deleting === idOf(r) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button></div></div><div className="mt-2 flex gap-1"><Badge>NVL {r.nivel}</Badge><Badge variant="outline">{r.asignable ? 'Asignable' : 'No asignable'}</Badge></div></div>)}
      {!loading && !rolesTg.length && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No hay roles TG.</p>}
    </section></div><DialogFooter><Button variant="outline" onClick={onClose}>Cerrar</Button></DialogFooter></DialogContent></Dialog>;
}
