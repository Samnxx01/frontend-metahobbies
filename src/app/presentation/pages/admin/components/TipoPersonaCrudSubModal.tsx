import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, RefreshCw, Search, UserCog2 } from 'lucide-react';
import { toast } from 'react-toastify';
import tipoPersonaService, { type TipoPersonaAdmin } from '@/app/services/tipoPersonaService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type TipoPersonaSeleccionado = { id: string; codigo: string; nombre: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (tipo: TipoPersonaSeleccionado) => void;
};

type Draft = { codigo: string; nombre: string; descripcion: string; codigoDian: string };

const vacio: Draft = { codigo: '', nombre: '', descripcion: '', codigoDian: '' };

const idTipoPersona = (item: TipoPersonaAdmin): string => String(item.iud || item._id || '');

const aSeleccion = (item: TipoPersonaAdmin): TipoPersonaSeleccionado => ({
  id: idTipoPersona(item),
  codigo: item.codigo,
  nombre: item.nombre,
});

export default function TipoPersonaCrudSubModal({ open, onOpenChange, onSelect }: Props): React.ReactElement {
  const [rows, setRows] = useState<TipoPersonaAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('true');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editando, setEditando] = useState<TipoPersonaAdmin | null>(null);
  const [draft, setDraft] = useState<Draft>(vacio);

  const cargar = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await tipoPersonaService.listarAdmin({ q: q.trim(), estado, limit: 100 });
      setRows(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los tipos de persona.');
    } finally {
      setLoading(false);
    }
  }, [q, estado]);

  useEffect(() => {
    if (!open) return;
    void cargar();
  }, [open, cargar]);

  const abrirCrear = (): void => {
    setEditando(null);
    setDraft(vacio);
    setEditorOpen(true);
  };

  const abrirEditar = (item: TipoPersonaAdmin): void => {
    setEditando(item);
    setDraft({ codigo: item.codigo, nombre: item.nombre, descripcion: item.descripcion || '', codigoDian: item.codigoDian || '' });
    setEditorOpen(true);
  };

  const guardar = async (): Promise<void> => {
    if (!draft.codigo.trim() || !draft.nombre.trim()) {
      toast.error('Completa código y nombre.');
      return;
    }
    setSaving(true);
    try {
      let resultado: TipoPersonaAdmin;
      if (editando) {
        resultado = await tipoPersonaService.actualizar(idTipoPersona(editando), draft);
        toast.success('Tipo de persona actualizado.');
      } else {
        resultado = await tipoPersonaService.crear(draft);
        toast.success('Tipo de persona creado.');
      }
      setEditorOpen(false);
      await cargar();
      if (!editando && onSelect) {
        onSelect(aSeleccion(resultado));
        onOpenChange(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el tipo de persona.');
    } finally {
      setSaving(false);
    }
  };

  const cambiarEstado = async (item: TipoPersonaAdmin): Promise<void> => {
    try {
      await tipoPersonaService.cambiarEstado(idTipoPersona(item), !item.estado);
      toast.success(item.estado ? 'Tipo de persona desactivado.' : 'Tipo de persona reactivado.');
      await cargar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cambiar el estado.');
    }
  };

  const usar = (item: TipoPersonaAdmin): void => {
    if (!onSelect) return;
    onSelect(aSeleccion(item));
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog2 className="h-5 w-5" />
              Parametrizar tipos de persona
            </DialogTitle>
            <DialogDescription>
              Crea, edita o activa/desactiva los tipos de persona disponibles para terceros.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void cargar()}
                placeholder="Código, nombre o descripción"
              />
            </div>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Activos</SelectItem>
                <SelectItem value="false">Inactivos</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => void cargar()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button onClick={abrirCrear}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo tipo de persona
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{total} registro(s)</p>

          <div className="overflow-x-auto rounded border">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Cód. DIAN</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item) => (
                  <TableRow key={idTipoPersona(item)}>
                    <TableCell>
                      <strong>{item.codigo}</strong>
                    </TableCell>
                    <TableCell>{item.nombre}</TableCell>
                    <TableCell>{item.descripcion || '—'}</TableCell>
                    <TableCell>{item.codigoDian || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={item.estado ? 'secondary' : 'destructive'}>
                        {item.estado ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {onSelect && (
                        <Button size="sm" variant="default" className="mr-2" onClick={() => usar(item)}>
                          Usar
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => abrirEditar(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void cambiarEstado(item)}>
                        {item.estado ? 'Desactivar' : 'Reactivar'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No hay tipos de persona para mostrar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={(value) => !saving && setEditorOpen(value)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto bg-background text-foreground">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar tipo de persona' : 'Nuevo tipo de persona'}</DialogTitle>
            <DialogDescription>
              {editando
                ? 'El código no puede modificarse si ya hay terceros usando este tipo de persona.'
                : 'Registra un nuevo tipo de persona para el catálogo de terceros.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Código *</Label>
              <Input
                value={draft.codigo}
                onChange={(e) => setDraft({ ...draft, codigo: e.target.value.toUpperCase() })}
                placeholder="NATURAL"
              />
            </div>
            <div>
              <Label>Nombre *</Label>
              <Input
                value={draft.nombre}
                onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
                placeholder="Persona natural"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input
                value={draft.descripcion}
                onChange={(e) => setDraft({ ...draft, descripcion: e.target.value })}
              />
            </div>
            <div>
              <Label>Código DIAN</Label>
              <Input
                value={draft.codigoDian}
                onChange={(e) => setDraft({ ...draft, codigoDian: e.target.value })}
                placeholder="1 = Jurídica · 2 = Natural"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void guardar()} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
