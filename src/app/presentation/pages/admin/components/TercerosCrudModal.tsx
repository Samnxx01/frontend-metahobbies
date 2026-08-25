import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, RefreshCw, Search, Settings2, UserRoundCog } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiFetchPublic } from '@/app/services/api';
import terceroService, { type TerceroAdmin } from '@/app/services/terceroService';
import tipoPersonaService, { type TipoPersonaAdmin } from '@/app/services/tipoPersonaService';
import TipoPersonaCrudSubModal, { type TipoPersonaSeleccionado } from './TipoPersonaCrudSubModal';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Ciudad = { ciudadId: string; nombre: string };
type Departamento = { departamentoId: string; nombre: string; ciudades: Ciudad[] };
type TipoDocumento = { id: string; codigo: string; nombre: string };
type Catalogos = { tiposDocumento: TipoDocumento[]; departamentos: Departamento[] };
type Props = { open: boolean; onOpenChange: (open: boolean) => void; renderMode?: 'modal' | 'page' };
type Draft = Omit<TerceroAdmin, 'iud' | '_id' | 'estado' | 'createdAt' | 'updatedAt'>;

const vacio: Draft = {
  tipoPersona: 'NATURAL', tipoDocumento: '', numeroDocumento: '', nombreCompleto: '', razonSocial: '', dv: '',
  email: '', telefono: '', direccion: '', ciudad: '', departamento: '', ciudadId: '', departamentoId: '', pais: 'CO',
};
const idTercero = (item: TerceroAdmin): string => String(item.iud || item._id || '');
const esEmpresa = (tipo: TipoDocumento): boolean => `${tipo.codigo} ${tipo.nombre}`.toUpperCase().includes('NIT') || tipo.codigo === '31';

export default function TercerosCrudModal({ open, onOpenChange, renderMode = 'modal' }: Props): React.ReactElement {
  const [rows, setRows] = useState<TerceroAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('true');
  const [tipoPersonaFiltro, setTipoPersonaFiltro] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editando, setEditando] = useState<TerceroAdmin | null>(null);
  const [draft, setDraft] = useState<Draft>(vacio);
  const [catalogos, setCatalogos] = useState<Catalogos>({ tiposDocumento: [], departamentos: [] });
  const [tiposPersona, setTiposPersona] = useState<TipoPersonaAdmin[]>([]);
  const [tipoPersonaModalOpen, setTipoPersonaModalOpen] = useState(false);
  const [confirmarDesactivar, setConfirmarDesactivar] = useState<TerceroAdmin | null>(null);

  const cargarTiposPersona = useCallback(async (): Promise<void> => {
    try {
      const tipos = await tipoPersonaService.listarActivos();
      setTiposPersona(tipos);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los tipos de persona.'); }
  }, []);

  const cargar = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await terceroService.listarAdmin({ q: q.trim(), estado, tipoPersona: tipoPersonaFiltro || undefined, limit: 100 });
      setRows(response.data || []);
      setTotal(response.total || 0);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los terceros.'); }
    finally { setLoading(false); }
  }, [q, estado, tipoPersonaFiltro]);

  useEffect(() => {
    if (!open) return;
    void cargarTiposPersona();
    void apiFetchPublic('/api/carrito/catalogos/facturacion', { method: 'GET' })
      .then((response) => setCatalogos(response.data as Catalogos))
      .catch(() => toast.error('No se pudieron cargar los catálogos de facturación.'));
  }, [open, cargarTiposPersona]);

  useEffect(() => {
    if (!open) return;
    void cargar();
    // Recarga automáticamente al cambiar estado/tipoPersona (no al escribir en el buscador: eso solo aplica con Enter/Buscar).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, estado, tipoPersonaFiltro]);

  const seleccionarTipoPersona = (tipo: TipoPersonaSeleccionado): void => {
    const codigo = tipo.codigo as Draft['tipoPersona'];
    const disponibles = catalogos.tiposDocumento.filter((item) => codigo === 'JURIDICA' ? esEmpresa(item) : !esEmpresa(item));
    setDraft((prev) => ({ ...prev, tipoPersona: codigo, tipoDocumento: disponibles[0]?.codigo || '', nombreCompleto: '', razonSocial: '' }));
    void cargarTiposPersona();
  };

  const tiposDisponibles = useMemo(() => {
    const filtrados = catalogos.tiposDocumento.filter((tipo) => draft.tipoPersona === 'JURIDICA' ? esEmpresa(tipo) : !esEmpresa(tipo));
    return filtrados.length ? filtrados : catalogos.tiposDocumento;
  }, [catalogos.tiposDocumento, draft.tipoPersona]);
  const ciudades = useMemo(() => catalogos.departamentos.find((item) => item.departamentoId === draft.departamentoId)?.ciudades || [], [catalogos.departamentos, draft.departamentoId]);

  const abrirCrear = (): void => {
    const naturales = catalogos.tiposDocumento.filter((tipo) => !esEmpresa(tipo));
    setEditando(null);
    setDraft({ ...vacio, tipoDocumento: naturales[0]?.codigo || '' });
    setEditorOpen(true);
  };
  const abrirEditar = (item: TerceroAdmin): void => {
    setEditando(item);
    setDraft({
      tipoPersona: item.tipoPersona, tipoDocumento: item.tipoDocumento, numeroDocumento: item.numeroDocumento,
      nombreCompleto: item.nombreCompleto || '', razonSocial: item.razonSocial || '', dv: item.dv || '', email: item.email,
      telefono: item.telefono, direccion: item.direccion, ciudad: item.ciudad, departamento: item.departamento,
      ciudadId: item.ciudadId, departamentoId: item.departamentoId, pais: item.pais || 'CO',
    });
    setEditorOpen(true);
  };
  const guardar = async (): Promise<void> => {
    if (!draft.tipoDocumento || !draft.numeroDocumento || !draft.email || !draft.telefono || !draft.direccion || !draft.departamentoId || !draft.ciudadId) {
      toast.error('Completa todos los campos obligatorios.'); return;
    }
    if (draft.tipoPersona === 'NATURAL' ? !draft.nombreCompleto : !draft.razonSocial) {
      toast.error('Completa el nombre o razón social.'); return;
    }
    setSaving(true);
    try {
      if (editando) await terceroService.actualizarAdmin(idTercero(editando), draft);
      else await terceroService.crearAdmin(draft);
      toast.success(editando ? 'Tercero actualizado.' : 'Tercero creado.');
      setEditorOpen(false);
      await cargar();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo guardar el tercero.'); }
    finally { setSaving(false); }
  };
  const cambiarEstado = async (item: TerceroAdmin): Promise<void> => {
    try {
      await terceroService.cambiarEstadoAdmin(idTercero(item), !item.estado);
      toast.success(item.estado ? 'Tercero desactivado.' : 'Tercero reactivado.');
      await cargar();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo cambiar el estado.'); }
  };

  const listaContenido = <>
    <div className="flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void cargar()} placeholder="Documento, nombre, correo, teléfono o ciudad" /></div><Select value={estado} onValueChange={setEstado}><SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Activos</SelectItem><SelectItem value="false">Inactivos</SelectItem><SelectItem value="todos">Todos</SelectItem></SelectContent></Select><Select value={tipoPersonaFiltro || 'todos'} onValueChange={(value) => setTipoPersonaFiltro(value === 'todos' ? '' : value)}><SelectTrigger className="sm:w-44"><SelectValue placeholder="Tipo persona" /></SelectTrigger><SelectContent><SelectItem value="todos">Tipo persona: todos</SelectItem>{tiposPersona.map((tipo) => <SelectItem key={tipo.codigo} value={tipo.codigo}>{tipo.nombre}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={() => void cargar()} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</Button><Button onClick={abrirCrear}><Plus className="mr-2 h-4 w-4" />Nuevo tercero</Button></div>
    <p className="text-sm text-muted-foreground">{total} registro(s)</p>
    <div className="overflow-x-auto rounded border"><Table className="min-w-[900px]"><TableHeader><TableRow><TableHead>Documento</TableHead><TableHead>Nombre / razón social</TableHead><TableHead>Contacto</TableHead><TableHead>Ubicación</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>{rows.map((item) => <TableRow key={idTercero(item)}><TableCell><strong>{item.tipoDocumento}</strong><br />{item.numeroDocumento}</TableCell><TableCell>{item.razonSocial || item.nombreCompleto || '—'}</TableCell><TableCell>{item.email}<br />{item.telefono}</TableCell><TableCell>{item.ciudad}, {item.departamento}</TableCell><TableCell><Badge variant={item.estado ? 'secondary' : 'destructive'}>{item.estado ? 'Activo' : 'Inactivo'}</Badge></TableCell><TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => abrirEditar(item)}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => item.estado ? setConfirmarDesactivar(item) : void cambiarEstado(item)}>{item.estado ? 'Desactivar' : 'Reactivar'}</Button></TableCell></TableRow>)}{!loading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No hay terceros para mostrar.</TableCell></TableRow>}</TableBody></Table></div>
  </>;

  return <>
    {renderMode === 'page' ? (
      <div className="container mx-auto max-w-7xl px-3 py-5 text-foreground sm:px-4 sm:py-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl"><UserRoundCog className="h-7 w-7 text-primary" />Administrar terceros</h1>
          <p className="mt-1 text-sm text-muted-foreground">Consulta y administra clientes sin eliminar sus relaciones históricas.</p>
        </div>
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-6">
          {listaContenido}
        </div>
      </div>
    ) : (
      <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto bg-background text-foreground">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><UserRoundCog className="h-5 w-5" />Administrar terceros</DialogTitle><DialogDescription>Consulta y administra clientes sin eliminar sus relaciones históricas.</DialogDescription></DialogHeader>
        {listaContenido}
      </DialogContent></Dialog>
    )}

    <Dialog open={editorOpen} onOpenChange={(value) => !saving && setEditorOpen(value)}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto bg-background text-foreground"><DialogHeader><DialogTitle>{editando ? 'Editar tercero' : 'Nuevo tercero'}</DialogTitle><DialogDescription>{editando ? 'El número de documento no puede modificarse porque identifica las relaciones históricas.' : 'Registra un cliente para facturación y ventas.'}</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <div className="flex items-center justify-between gap-2"><Label>Tipo persona *</Label><Button type="button" size="icon" variant="ghost" className="h-6 w-6" title="Parametrizar tipos de persona" onClick={() => setTipoPersonaModalOpen(true)}><Settings2 className="h-3.5 w-3.5" /></Button></div>
        <Select value={draft.tipoPersona} onValueChange={(value: 'NATURAL' | 'JURIDICA') => { const disponibles = catalogos.tiposDocumento.filter((tipo) => value === 'JURIDICA' ? esEmpresa(tipo) : !esEmpresa(tipo)); setDraft({ ...draft, tipoPersona: value, tipoDocumento: disponibles[0]?.codigo || '', nombreCompleto: '', razonSocial: '' }); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {tiposPersona.length > 0
              ? tiposPersona.map((tipo) => <SelectItem key={tipo.codigo} value={tipo.codigo}>{tipo.nombre}</SelectItem>)
              : <><SelectItem value="NATURAL">Natural</SelectItem><SelectItem value="JURIDICA">Jurídica</SelectItem></>}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Tipo documento *</Label>
        <Select value={draft.tipoDocumento} onValueChange={(value) => setDraft({ ...draft, tipoDocumento: value })}>
          <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
          <SelectContent>{tiposDisponibles.map((tipo) => <SelectItem key={tipo.id} value={tipo.codigo}>{tipo.codigo} · {tipo.nombre}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Número documento *</Label><Input disabled={Boolean(editando)} value={draft.numeroDocumento} onChange={(e) => setDraft({ ...draft, numeroDocumento: e.target.value })} /></div>
      <div><Label>{draft.tipoPersona === 'JURIDICA' ? 'Razón social' : 'Nombre completo'} *</Label><Input value={draft.tipoPersona === 'JURIDICA' ? draft.razonSocial : draft.nombreCompleto} onChange={(e) => setDraft({ ...draft, [draft.tipoPersona === 'JURIDICA' ? 'razonSocial' : 'nombreCompleto']: e.target.value })} /></div>
      <div><Label>Email *</Label><Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div><div><Label>Teléfono *</Label><Input value={draft.telefono} onChange={(e) => setDraft({ ...draft, telefono: e.target.value })} /></div><div className="lg:col-span-3"><Label>Dirección *</Label><Input value={draft.direccion} onChange={(e) => setDraft({ ...draft, direccion: e.target.value })} /></div>
      <div><Label>Departamento *</Label><Select value={draft.departamentoId} onValueChange={(value) => { const dep = catalogos.departamentos.find((item) => item.departamentoId === value); setDraft({ ...draft, departamentoId: value, departamento: dep?.nombre || '', ciudadId: '', ciudad: '' }); }}><SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger><SelectContent>{catalogos.departamentos.map((item) => <SelectItem key={item.departamentoId} value={item.departamentoId}>{item.nombre}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Ciudad *</Label><Select disabled={!draft.departamentoId} value={draft.ciudadId} onValueChange={(value) => { const ciudad = ciudades.find((item) => item.ciudadId === value); setDraft({ ...draft, ciudadId: value, ciudad: ciudad?.nombre || '' }); }}><SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger><SelectContent>{ciudades.map((item) => <SelectItem key={item.ciudadId} value={item.ciudadId}>{item.nombre}</SelectItem>)}</SelectContent></Select></div>
    </div><DialogFooter><Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>Cancelar</Button><Button onClick={() => void guardar()} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button></DialogFooter></DialogContent></Dialog>

    <TipoPersonaCrudSubModal open={tipoPersonaModalOpen} onOpenChange={setTipoPersonaModalOpen} onSelect={seleccionarTipoPersona} />

    <AlertDialog open={Boolean(confirmarDesactivar)} onOpenChange={(value) => !value && setConfirmarDesactivar(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Desactivar este tercero?</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmarDesactivar ? `${confirmarDesactivar.razonSocial || confirmarDesactivar.nombreCompleto || confirmarDesactivar.numeroDocumento} quedará inactivo. Podrás reactivarlo luego; sus relaciones históricas no se eliminan.` : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => { const item = confirmarDesactivar; setConfirmarDesactivar(null); if (item) void cambiarEstado(item); }}>Desactivar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
