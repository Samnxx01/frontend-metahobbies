import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import inventarioService, { type EstadoOrdenCompraConfig, type InventarioCausalAjuste, type InventarioTipoMovimiento, type TipoEstadoInventarioDominio } from '@/app/services/inventarioService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { GobernanzaModuloDynamicMultiSelect } from '@/app/presentation/pages/admin/gobernanza/GobernanzaModuloDynamicMultiSelect';

const blankDraft = (): EstadoOrdenCompraConfig => ({
  codigo: '',
  nombre: '',
  descripcion: '',
  orden: 1,
  activo: true,
  esEstadoInicial: false,
  permiteEditarOrden: false,
  permiteConfirmarOrden: false,
  estadoDestinoConfirmacion: '',
  permiteComprobanteEntrada: false,
  generaComprobanteContable: false,
  aplicaKardex: false,
  causalIds: [],
});

export type InventarioEstadoOrdenCompraConfigModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (estados: EstadoOrdenCompraConfig[]) => void;
  dominio?: TipoEstadoInventarioDominio;
  title?: string;
  description?: string;
};

export default function InventarioEstadoOrdenCompraConfigModal({
  open,
  onOpenChange,
  onSaved,
  dominio = 'ORDEN_COMPRA',
  title = 'Parametrización estados — Orden de compra',
  description = 'Define el flujo: estado inicial, confirmación y acciones permitidas en cada estado.',
}: InventarioEstadoOrdenCompraConfigModalProps): React.ReactElement {
  const [rows, setRows] = useState<EstadoOrdenCompraConfig[]>([]);
  const [draft, setDraft] = useState<EstadoOrdenCompraConfig>(blankDraft());
  const [editCodigo, setEditCodigo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tiposMovimiento, setTiposMovimiento] = useState<InventarioTipoMovimiento[]>([]);
  const [causales, setCausales] = useState<InventarioCausalAjuste[]>([]);
  const [tipoMovimientoId, setTipoMovimientoId] = useState('');
  const [codigosRelacionados, setCodigosRelacionados] = useState<Set<string>>(new Set());
  const [relacionOpen, setRelacionOpen] = useState(false);
  const [relacionDraft, setRelacionDraft] = useState<EstadoOrdenCompraConfig>(blankDraft());

  const estadoId = (estado: EstadoOrdenCompraConfig | string | null | undefined): string => (
    typeof estado === 'string' ? estado : String(estado?._id || estado?.iud || '')
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setRows([]);
    setDraft(blankDraft());
    setEditCodigo(null);
    Promise.all([
      inventarioService.listarTiposEstado(dominio, { soloActivos: false }),
      dominio === 'INVENTORY_LEDGER' ? inventarioService.listarTiposMovimientoAdmin() : Promise.resolve([]),
      dominio === 'INVENTORY_LEDGER'
        ? inventarioService.listarCausalesAjusteAdmin().then((data) => (
          data.length ? data : inventarioService.listarCausalesAjuste()
        )).catch(() => inventarioService.listarCausalesAjuste())
        : Promise.resolve([]),
    ])
      .then(([data, tipos, causalesData]) => {
        if (!cancelled) {
          setRows(data);
          setTiposMovimiento(tipos);
          setCausales(causalesData);
          setTipoMovimientoId((prev) => prev || String(tipos[0]?._id || tipos[0]?.iud || ''));
        }
      })
      .catch((error) => {
        console.error(error);
        toast.error('No se pudieron cargar los estados de orden de compra.');
      });
    return () => {
      cancelled = true;
    };
  }, [dominio, open]);

  useEffect(() => {
    if (!open || dominio !== 'INVENTORY_LEDGER' || !tipoMovimientoId) return;
    let cancelled = false;
    inventarioService.listarEstadosTipoMovimiento(tipoMovimientoId).then((relaciones) => {
      if (cancelled) return;
      setCodigosRelacionados(new Set(relaciones.map((item) => (
        typeof item.tipoEstadoId === 'string' ? '' : item.tipoEstadoId.codigo
      )).filter(Boolean)));
      setRows((prev) => prev.map((estado) => {
        const relacion = relaciones.find((item) => estadoId(item.tipoEstadoId) === estadoId(estado));
        return relacion ? {
          ...estado,
          esEstadoInicial: relacion.esInicial,
          permiteEditarOrden: relacion.permiteEditar,
          permiteConfirmarOrden: relacion.permiteConfirmar,
          estadoDestinoConfirmacion: typeof relacion.estadoDestinoId === 'string'
            ? relacion.estadoDestinoId
            : relacion.estadoDestinoId?.codigo || '',
          aplicaKardex: relacion.aplicaKardex,
          generaComprobanteContable: relacion.generaComprobanteContable,
          causalIds: (relacion.causalIds || []).map((causal) => typeof causal === 'string' ? causal : String(causal._id || causal.iud || '')),
        } : { ...estado, esEstadoInicial: false, permiteEditarOrden: false, permiteConfirmarOrden: false, estadoDestinoConfirmacion: '', aplicaKardex: false, causalIds: [] };
      }));
    }).catch(() => toast.error('No se pudo cargar el flujo del tipo de movimiento.'));
    return () => { cancelled = true; };
  }, [dominio, open, tipoMovimientoId]);

  const codigosActivos = useMemo(
    () => rows.filter((r) => r.activo).map((r) => r.codigo),
    [rows],
  );
  // En INVENTORY_LEDGER se muestra todo el catálogo. La relación se identifica
  // por separado para que un tipo sin flujo configurado no parezca sin estados.
  const rowsVisibles = rows;

  const addOrUpdate = (): void => {
    const codigo = draft.codigo.trim().toUpperCase();
    const nombre = draft.nombre.trim();
    if (!codigo || !nombre) {
      toast.error('Código y nombre son obligatorios.');
      return;
    }
    const next: EstadoOrdenCompraConfig = {
      ...draft,
      codigo,
      nombre,
      descripcion: draft.descripcion?.trim() || '',
      orden: Math.max(0, Number(draft.orden) || 0),
      estadoDestinoConfirmacion: String(draft.estadoDestinoConfirmacion || '').trim().toUpperCase(),
    };
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.codigo === codigo);
      const merged = idx >= 0
        ? prev.map((r, i) => (i === idx ? { ...r, ...next } : r))
        : [...prev, next];
      if (next.esEstadoInicial) {
        return merged
          .map((r) => ({ ...r, esEstadoInicial: r.codigo === codigo }))
          .sort((a, b) => a.orden - b.orden || a.codigo.localeCompare(b.codigo));
      }
      return merged.sort((a, b) => a.orden - b.orden || a.codigo.localeCompare(b.codigo));
    });
    setDraft(blankDraft());
    setEditCodigo(null);
    if (dominio === 'INVENTORY_LEDGER') {
      setCodigosRelacionados((prev) => new Set(prev).add(codigo));
    }
  };

  const editRow = (row: EstadoOrdenCompraConfig): void => {
    setDraft({ ...row });
    setEditCodigo(row.codigo);
  };

  const removeRow = (codigo: string): void => {
    if (dominio === 'INVENTORY_LEDGER') {
      setCodigosRelacionados((prev) => {
        const next = new Set(prev);
        next.delete(codigo);
        return next;
      });
      return;
    }
    setRows((prev) => prev.map((r) => (
      r.codigo === codigo ? { ...r, activo: false, esEstadoInicial: false } : r
    )));
    if (editCodigo === codigo) {
      setDraft(blankDraft());
      setEditCodigo(null);
    }
  };

  const toggleField = (codigo: string, field: keyof EstadoOrdenCompraConfig): void => {
    setRows((prev) => prev.map((r) => {
      if (r.codigo !== codigo) {
        if (field === 'esEstadoInicial') return { ...r, esEstadoInicial: false };
        return r;
      }
      const nextVal = !(r[field] as boolean);
      if (field === 'esEstadoInicial' && nextVal) {
        return { ...r, esEstadoInicial: true };
      }
      return { ...r, [field]: nextVal };
    }));
  };

  const save = async (): Promise<void> => {
    const rowsFlujo = dominio === 'INVENTORY_LEDGER'
      ? rows.filter((row) => codigosRelacionados.has(row.codigo))
      : rows;
    if (!rowsFlujo.length) {
      toast.error('Agregue al menos un estado.');
      return;
    }
    if (rowsFlujo.filter((r) => r.activo).length === 0) {
      toast.error('Debe haber al menos un estado activo.');
      return;
    }
    if (dominio !== 'INVENTORY_LEDGER' && rowsFlujo.filter((r) => r.activo && r.esEstadoInicial).length !== 1) {
      toast.error('Debe haber exactamente un estado inicial activo.');
      return;
    }
    try {
      setSaving(true);
      const saved = await inventarioService.guardarTiposEstado(dominio, rows);
      if (dominio === 'INVENTORY_LEDGER') {
        if (!tipoMovimientoId) throw new Error('Seleccione un tipo de movimiento.');
        const activos = saved.filter((estado) => estado.activo && codigosRelacionados.has(estado.codigo));
        await inventarioService.guardarEstadosTipoMovimiento(tipoMovimientoId, activos.map((estado) => ({
          tipoEstadoId: estadoId(estado),
          causalIds: estado.causalIds || [],
          esInicial: estado.esEstadoInicial === true,
          permiteEditar: estado.permiteEditarOrden === true,
          permiteConfirmar: estado.permiteConfirmarOrden === true,
          estadoDestinoId: estadoId(activos.find((item) => item.codigo === estado.estadoDestinoConfirmacion)) || null,
          aplicaKardex: estado.aplicaKardex === true,
          generaComprobanteContable: estado.generaComprobanteContable === true,
          activo: true,
        })));
      }
      onSaved?.(saved);
      toast.success('Tipos de estado guardados.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[1200px] overflow-y-auto border-border bg-background p-3 text-foreground sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        {dominio === 'INVENTORY_LEDGER' ? (
          <div className="space-y-2">
            <Label>Tipo de movimiento *</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={tipoMovimientoId || undefined} onValueChange={setTipoMovimientoId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Selecciona tipo de movimiento" /></SelectTrigger>
                <SelectContent>
                  {tiposMovimiento.filter((tipo) => tipo.estado).map((tipo) => {
                    const id = String(tipo._id || tipo.iud || '');
                    return <SelectItem key={id} value={id}>{tipo.nombre} ({tipo.codigo})</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={() => { setRelacionDraft(blankDraft()); setRelacionOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Relacionar estado
              </Button>
            </div>
          </div>
        ) : null}

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
          <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
            <p className="text-sm font-medium">{editCodigo ? `Editar ${editCodigo}` : 'Nuevo estado'}</p>
            <div className="space-y-2">
              <Label>Código *</Label>
              <Input
                value={draft.codigo}
                onChange={(e) => setDraft((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                placeholder="VERIFICACION"
                disabled={Boolean(editCodigo)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={draft.nombre}
                onChange={(e) => setDraft((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Verificación"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={draft.descripcion || ''}
                onChange={(e) => setDraft((p) => ({ ...p, descripcion: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Orden</Label>
              <Input
                type="number"
                min="0"
                value={String(draft.orden ?? 0)}
                onChange={(e) => setDraft((p) => ({ ...p, orden: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado destino al confirmar</Label>
              <Select
                value={draft.estadoDestinoConfirmacion || '__none__'}
                onValueChange={(v) => setDraft((p) => ({
                  ...p,
                  estadoDestinoConfirmacion: v === '__none__' ? '' : v,
                }))}
              >
                <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {codigosActivos.filter((c) => c !== draft.codigo).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 text-sm">
              {([
                ['esEstadoInicial', dominio === 'INVENTORY_LEDGER' ? 'Estado inicial del movimiento' : 'Estado inicial (al crear OC)'],
                ['permiteEditarOrden', dominio === 'INVENTORY_LEDGER' ? 'Permite editar solicitud' : 'Permite editar / eliminar OC'],
                ['permiteConfirmarOrden', dominio === 'INVENTORY_LEDGER' ? 'Permite confirmar movimiento' : 'Muestra botón Confirmar orden'],
                ['generaComprobanteContable', 'Genera comprobante al llegar a este estado'],
                ...(dominio === 'INVENTORY_LEDGER' ? [['aplicaKardex', 'Aplica existencias / kardex'] as const] : []),
                ['permiteComprobanteEntrada', 'Permite comprobante de entrada'],
                ['activo', 'Activo'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex min-h-9 items-center gap-2 rounded-sm px-1">
                  <Checkbox
                    checked={Boolean(draft[key])}
                    onCheckedChange={() => setDraft((p) => ({ ...p, [key]: !p[key] }))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <Button type="button" className="w-full sm:w-auto" onClick={addOrUpdate} disabled={saving}>
              <Plus className="mr-2 h-4 w-4" />
              {editCodigo ? 'Actualizar' : 'Agregar'}
            </Button>
          </div>

          <div className="space-y-3 lg:hidden">
            {rowsVisibles.map((r) => (
              <article key={r.codigo} className="min-w-0 rounded-md border border-border bg-card p-3">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all font-mono text-xs text-muted-foreground">{r.codigo}</p>
                    <p className="break-words text-sm font-medium text-foreground">{r.nombre}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">Orden {r.orden}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {dominio === 'INVENTORY_LEDGER' ? (
                    <Badge variant={codigosRelacionados.has(r.codigo) ? 'default' : 'outline'}>
                      {codigosRelacionados.has(r.codigo) ? 'Relacionado' : 'Sin relacionar'}
                    </Badge>
                  ) : null}
                  {r.esEstadoInicial ? <Badge variant="secondary">Inicial</Badge> : null}
                  {r.permiteEditarOrden ? <Badge variant="outline">Edita</Badge> : null}
                  {r.permiteConfirmarOrden ? <Badge variant="outline">Confirma</Badge> : null}
                  {r.generaComprobanteContable ? <Badge variant="outline">Contable</Badge> : null}
                  {r.permiteComprobanteEntrada ? <Badge variant="outline">Entrada</Badge> : null}
                  {!r.activo ? <Badge variant="destructive">Inactivo</Badge> : null}
                </div>
                <div className="mt-3 text-xs">
                  <span className="text-muted-foreground">Destino al confirmar: </span>
                  <span className="break-all font-mono text-foreground">{r.estadoDestinoConfirmacion || '—'}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => editRow(r)}>Editar</Button>
                  <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeRow(r.codigo)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Desactivar
                  </Button>
                </div>
              </article>
            ))}
            {!rowsVisibles.length ? (
              <div className="rounded-md border border-border py-8 text-center text-sm text-muted-foreground">Sin estados parametrizados.</div>
            ) : null}
          </div>

          <div className="hidden overflow-x-auto rounded-md border border-border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-center">Ord.</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Destino confirm.</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsVisibles.map((r) => (
                  <TableRow key={r.codigo}>
                    <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                    <TableCell className="text-sm">{r.nombre}</TableCell>
                    <TableCell className="text-center tabular-nums">{r.orden}</TableCell>
                    <TableCell>
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {dominio === 'INVENTORY_LEDGER' ? (
                          <Badge variant={codigosRelacionados.has(r.codigo) ? 'default' : 'outline'}>
                            {codigosRelacionados.has(r.codigo) ? 'Relacionado' : 'Sin relacionar'}
                          </Badge>
                        ) : null}
                        {r.esEstadoInicial ? <Badge variant="secondary">Inicial</Badge> : null}
                        {r.permiteEditarOrden ? <Badge variant="outline">Edita</Badge> : null}
                        {r.permiteConfirmarOrden ? <Badge variant="outline">Confirma</Badge> : null}
                        {r.generaComprobanteContable ? <Badge variant="outline">Contable</Badge> : null}
                        {r.permiteComprobanteEntrada ? <Badge variant="outline">Entrada</Badge> : null}
                        {!r.activo ? <Badge variant="destructive">Inactivo</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.estadoDestinoConfirmacion || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => editRow(r)}>Editar</Button>
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeRow(r.codigo)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!rowsVisibles.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Sin estados parametrizados.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>

        <Dialog open={relacionOpen} onOpenChange={setRelacionOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
            <DialogHeader>
              <DialogTitle>Parametrizar tipo de movimiento–estado</DialogTitle>
              <DialogDescription>Seleccione un estado del catálogo y configure cómo participa en el flujo del tipo de movimiento actual.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Estado *</Label>
                <Select value={relacionDraft.codigo || undefined} onValueChange={(codigo) => {
                  const estado = rows.find((row) => row.codigo === codigo);
                  if (estado) setRelacionDraft({ ...estado });
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecciona estado" /></SelectTrigger>
                  <SelectContent>
                    {rows.filter((row) => row.activo).map((row) => (
                      <SelectItem key={row.codigo} value={row.codigo}>{row.nombre} ({row.codigo})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <GobernanzaModuloDynamicMultiSelect
                  id="causales-tipo-movimiento-estado"
                  label="Causales *"
                  placeholder="Selecciona una causal para agregar"
                  emptyHint="Sin causales activas parametrizadas"
                  emptySelectedHint="Seleccione una o varias causales."
                  selected={relacionDraft.causalIds || []}
                  onSelectedChange={(causalIds) => setRelacionDraft((prev) => ({ ...prev, causalIds }))}
                  options={causales.filter((causal) => causal.estado).map((causal) => {
                      const relacionado = typeof causal.tipoMovimientoId === 'string'
                        ? causal.tipoMovimientoId
                        : String(causal.tipoMovimientoId?._id || causal.tipoMovimientoId?.iud || causal.tipoMovimientoReferenciaId || '');
                      const id = String(causal._id || causal.iud || '');
                      const tipoActual = causal.tipoMovimiento?.codigo || tiposMovimiento.find((tipo) => String(tipo._id || tipo.iud || '') === relacionado)?.codigo;
                      return {
                        value: id,
                        label: `${causal.nombre} (${causal.codigo})`,
                        hint: relacionado && relacionado !== tipoMovimientoId ? `tipo actual: ${tipoActual || 'otro'}` : undefined,
                      };
                    }).filter((opcion) => Boolean(opcion.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Puede seleccionar cualquier causal activa para relacionarla con este flujo. Si ya pertenece a otro tipo, se muestra su tipo actual como referencia.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Estado destino al confirmar</Label>
                <Select value={relacionDraft.estadoDestinoConfirmacion || '__none__'} onValueChange={(value) => setRelacionDraft((prev) => ({ ...prev, estadoDestinoConfirmacion: value === '__none__' ? '' : value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {rows.filter((row) => row.activo && row.codigo !== relacionDraft.codigo).map((row) => (
                      <SelectItem key={row.codigo} value={row.codigo}>{row.nombre} ({row.codigo})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {([
                ['esEstadoInicial', 'Estado inicial para este tipo'],
                ['permiteEditarOrden', 'Permite editar solicitud'],
                ['permiteConfirmarOrden', 'Permite confirmar movimiento'],
                ['aplicaKardex', 'Aplica existencias / kardex'],
                ['generaComprobanteContable', 'Genera comprobante contable'],
              ] as const).map(([field, label]) => (
                <label key={field} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={Boolean(relacionDraft[field])} onCheckedChange={() => setRelacionDraft((prev) => ({ ...prev, [field]: !prev[field] }))} />
                  {label}
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRelacionOpen(false)}>Cancelar</Button>
              <Button type="button" disabled={saving} onClick={() => void (async () => {
                if (!relacionDraft.codigo) { toast.error('Seleccione un estado.'); return; }
                if (!relacionDraft.causalIds?.length) { toast.error('Seleccione al menos una causal.'); return; }
                const nextRows = rows.map((row) => {
                  const causalIds = relacionDraft.causalIds || [];
                  if (relacionDraft.esEstadoInicial && row.codigo !== relacionDraft.codigo && causalIds.some((causalId) => row.causalIds?.includes(causalId))) {
                    return { ...row, causalIds: (row.causalIds || []).filter((causalId) => !causalIds.includes(causalId)) };
                  }
                  return row.codigo === relacionDraft.codigo ? { ...row, ...relacionDraft } : row;
                });
                const nextCodigos = new Set(codigosRelacionados).add(relacionDraft.codigo);
                try {
                  setSaving(true);
                  const catalogoGuardado = await inventarioService.guardarTiposEstado(dominio, nextRows);
                  const rowsConIds = catalogoGuardado.map((estado) => ({
                    ...estado,
                    ...(nextRows.find((row) => row.codigo === estado.codigo) || {}),
                    _id: estado._id,
                    iud: estado.iud,
                  }));
                  const estadoActual = rowsConIds.find((estado) => estado.codigo === relacionDraft.codigo);
                  if (!estadoActual || !estadoId(estadoActual)) throw new Error('No se pudo resolver el estado seleccionado.');
                  const destino = relacionDraft.estadoDestinoConfirmacion
                    ? rowsConIds.find((estado) => estado.codigo === relacionDraft.estadoDestinoConfirmacion)
                    : null;
                  const causalesPorTipo = new Map<string, string[]>();
                  for (const causalId of relacionDraft.causalIds || []) {
                    const causal = causales.find((item) => String(item._id || item.iud || '') === causalId);
                    const referencia = causal?.tipoMovimientoId;
                    const referenciaCruda = typeof referencia === 'string'
                      ? referencia
                      : String(referencia?._id || referencia?.iud || causal?.tipoMovimientoReferenciaId || '');
                    const tipoCatalogo = tiposMovimiento.find((tipo) => (
                      String(tipo.iud || tipo._id || '') === referenciaCruda
                      || String(tipo.iud || tipo._id || '') === String(causal?.tipoMovimientoReferenciaId || '')
                    ));
                    const tipoIdCausal = String(tipoCatalogo?.iud || tipoCatalogo?._id || referenciaCruda || '');
                    if (!tipoIdCausal) throw new Error(`La causal ${causal?.nombre || causalId} no tiene tipo de movimiento configurado.`);
                    causalesPorTipo.set(tipoIdCausal, [...(causalesPorTipo.get(tipoIdCausal) || []), causalId]);
                  }
                  for (const [tipoIdCausal, causalIds] of causalesPorTipo) {
                    const existentes = await inventarioService.listarEstadosTipoMovimiento(tipoIdCausal);
                    const actualId = estadoId(estadoActual);
                    const normalizadas = existentes.map((item) => ({
                      tipoEstadoId: estadoId(item.tipoEstadoId),
                      causalIds: (item.causalIds || []).map((causal) => typeof causal === 'string' ? causal : String(causal._id || causal.iud || '')),
                      esInicial: item.esInicial === true,
                      permiteEditar: item.permiteEditar === true,
                      permiteConfirmar: item.permiteConfirmar === true,
                      estadoDestinoId: estadoId(item.estadoDestinoId),
                      aplicaKardex: item.aplicaKardex === true,
                      generaComprobanteContable: item.generaComprobanteContable === true,
                      activo: item.activo !== false,
                    }));
                    const sinActual = normalizadas
                      .filter((item) => item.tipoEstadoId !== actualId)
                      .map((item) => relacionDraft.esEstadoInicial
                        ? { ...item, causalIds: item.causalIds.filter((id) => !causalIds.includes(id)) }
                        : item);
                    await inventarioService.guardarEstadosTipoMovimiento(tipoIdCausal, [...sinActual, {
                      tipoEstadoId: actualId,
                      causalIds,
                      esInicial: relacionDraft.esEstadoInicial === true,
                      permiteEditar: relacionDraft.permiteEditarOrden === true,
                      permiteConfirmar: relacionDraft.permiteConfirmarOrden === true,
                      estadoDestinoId: destino ? estadoId(destino) : null,
                      aplicaKardex: relacionDraft.aplicaKardex === true,
                      generaComprobanteContable: relacionDraft.generaComprobanteContable === true,
                      activo: true,
                    }]);
                  }
                  setRows(rowsConIds);
                  setCodigosRelacionados(nextCodigos);
                  setRelacionOpen(false);
                  onSaved?.(rowsConIds);
                  toast.success('Relación guardada y vinculada al tipo de movimiento.');
                } catch (error) {
                  toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo guardar la relación.');
                } finally {
                  setSaving(false);
                }
              })()}>Guardar relación</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DialogFooter className="sticky -bottom-3 z-10 gap-2 border-t border-border bg-background pb-1 pt-3 sm:-bottom-6 sm:gap-0 sm:pb-0">
          <Button type="button" className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" className="w-full sm:w-auto" onClick={() => void save()} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            Guardar parametrización
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
