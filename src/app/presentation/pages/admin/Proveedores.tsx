import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Building2, Mail, MapPin, Pencil, Phone, RefreshCcw, Search, ShieldCheck, Trash2 } from 'lucide-react';
import inventarioService, { type InventarioProveedor } from '@/app/services/inventarioService';
import InventarioProveedorModal, { type InventarioProveedorDraft } from './components/InventarioProveedorModal';
import ProveedorResponsabilidadesModal from './components/ProveedorResponsabilidadesModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function Proveedores(): React.ReactElement {
  const [proveedores, setProveedores] = useState<InventarioProveedor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [proveedorResponsabilidades, setProveedorResponsabilidades] = useState<InventarioProveedor | null>(null);
  const [proveedorEditar, setProveedorEditar] = useState<InventarioProveedor | null>(null);
  const [proveedorEliminar, setProveedorEliminar] = useState<InventarioProveedor | null>(null);

  const cargarProveedores = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await inventarioService.listarProveedoresCompra();
      setProveedores(data);
    } catch (error) {
      console.error('Error cargando proveedores:', error);
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudieron cargar los proveedores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarProveedores();
  }, []);

  const proveedoresFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return proveedores;
    return proveedores.filter((proveedor) => [
      proveedor.nombre,
      proveedor.nit,
      proveedor.correo,
      proveedor.telefono,
      proveedor.direccion,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(term));
  }, [proveedores, search]);

  const guardarProveedor = async (draft: InventarioProveedorDraft): Promise<void> => {
    const nombre = draft.nombre.trim();
    const nit = draft.nit.trim();

    if (!nombre) {
      toast.error('El nombre del proveedor es obligatorio.');
      return;
    }
    if (!nit) {
      toast.error('El NIT del proveedor es obligatorio.');
      return;
    }

    try {
      setSaving(true);
      const created = await inventarioService.crearProveedorCompra({
        nombre,
        nit,
        correo: draft.correo.trim(),
        telefono: draft.telefono.trim(),
        direccion: draft.direccion.trim(),
        aplicaIva: draft.aplicaIva,
        tipoProveedorId: draft.tipoProveedorId || undefined,
        paisId: draft.paisId || undefined,
        departamentoId: draft.departamentoId || undefined,
        ciudadId: draft.ciudadId || undefined,
      });
      const proveedorId = String(created._id || (created as { iud?: string }).iud || '');
      if (draft.responsabilidadesFiscales.length && proveedorId) {
        await inventarioService.guardarResponsabilidadesProveedor(proveedorId, draft.responsabilidadesFiscales);
      }
      setProveedores((prev) => [...prev, created].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
      setModalOpen(false);
      toast.success('Proveedor registrado.');
    } catch (error) {
      console.error('Error creando proveedor:', error);
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo registrar el proveedor.');
    } finally {
      setSaving(false);
    }
  };

  const actualizarProveedor = async (draft: InventarioProveedorDraft): Promise<void> => {
    if (!proveedorEditar?._id) return;
    try {
      setSaving(true);
      const updated = await inventarioService.actualizarProveedorCompra(proveedorEditar._id, {
        nombre: draft.nombre.trim(), nit: draft.nit.trim(), correo: draft.correo.trim(), telefono: draft.telefono.trim(),
        direccion: draft.direccion.trim(), aplicaIva: draft.aplicaIva, tipoProveedorId: draft.tipoProveedorId || undefined,
        paisId: draft.paisId || undefined, departamentoId: draft.departamentoId || undefined, ciudadId: draft.ciudadId || undefined,
      });
      setProveedores((prev) => prev.map((item) => item._id === updated._id ? updated : item));
      setProveedorEditar(null);
      toast.success('Proveedor actualizado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo actualizar el proveedor.');
    } finally { setSaving(false); }
  };

  const eliminarProveedor = async (): Promise<void> => {
    if (!proveedorEliminar?._id) return;
    try {
      setSaving(true);
      await inventarioService.eliminarProveedorCompra(proveedorEliminar._id);
      setProveedores((prev) => prev.filter((item) => item._id !== proveedorEliminar._id));
      setProveedorEliminar(null);
      toast.success('Proveedor eliminado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo eliminar el proveedor.');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">ERP Inventario</p>
          <h1 className="text-2xl font-bold tracking-normal text-foreground md:text-3xl">
            Proveedores
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Parametrizacion principal de proveedores para ordenes de compra, recepciones y conciliacion contable.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => void cargarProveedores()} disabled={loading || saving}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <InventarioProveedorModal
            open={modalOpen}
            saving={saving}
            onOpenChange={setModalOpen}
            onSubmit={guardarProveedor}
            showTrigger
            triggerClassName="shrink-0"
          />
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Building2 className="h-5 w-5 text-primary" />
                Catalogo de proveedores
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Gestiona los datos base usados al preparar documentos de compra.
              </CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar proveedor, NIT o correo"
                className="border-input bg-background pl-9 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="rounded-md border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              Cargando proveedores...
            </div>
          ) : proveedoresFiltrados.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
              {proveedores.length === 0
                ? 'Aun no hay proveedores registrados. Crea el primero para empezar a parametrizar compras.'
                : 'No hay proveedores que coincidan con la busqueda.'}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {proveedoresFiltrados.map((proveedor) => (
                <div
                  key={proveedor._id}
                  className="rounded-md border border-border bg-background p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{proveedor.nombre}</p>
                      <p className="mt-1 text-xs text-muted-foreground">NIT {proveedor.nit}</p>
                      {(proveedor.tipoProveedorNombre || (proveedor.tipoProveedorId as any)?.nombre) ? (
                        <p className="mt-1 text-xs font-medium text-primary">
                          {proveedor.tipoProveedorNombre || (proveedor.tipoProveedorId as any)?.nombre}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      Activo
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {proveedor.correo ? (
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        {proveedor.correo}
                      </p>
                    ) : null}
                    {proveedor.telefono ? (
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        {proveedor.telefono}
                      </p>
                    ) : null}
                    {proveedor.direccion ? (
                      <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="line-clamp-2">{proveedor.direccion}</span>
                      </p>
                    ) : null}
                    {(proveedor.ciudadNombre || proveedor.departamentoNombre || proveedor.paisNombre) ? (
                      <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{[proveedor.ciudadNombre, proveedor.departamentoNombre, proveedor.paisNombre].filter(Boolean).join(', ')}</span>
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4">
                    <p className="mb-3 text-xs font-medium text-foreground">IVA: {proveedor.aplicaIva ? 'Sí aplica' : 'No aplica'}</p>
                    <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setProveedorResponsabilidades(proveedor)}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Responsabilidades DIAN
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setProveedorEditar(proveedor)}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => setProveedorEliminar(proveedor)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ProveedorResponsabilidadesModal
        open={Boolean(proveedorResponsabilidades)}
        onOpenChange={(open) => {
          if (!open) setProveedorResponsabilidades(null);
        }}
        proveedor={proveedorResponsabilidades}
      />
      <InventarioProveedorModal
        open={Boolean(proveedorEditar)} saving={saving} proveedor={proveedorEditar}
        onOpenChange={(value) => { if (!value) setProveedorEditar(null); }} onSubmit={actualizarProveedor}
      />
      {proveedorEliminar ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-5 text-foreground shadow-xl">
            <h2 className="text-lg font-semibold">Eliminar proveedor</h2>
            <p className="mt-2 text-sm text-muted-foreground">¿Deseas eliminar a {proveedorEliminar.nombre}? Dejará de aparecer en el catálogo.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setProveedorEliminar(null)} disabled={saving}>Cancelar</Button>
              <Button variant="destructive" onClick={() => void eliminarProveedor()} disabled={saving}>Eliminar</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
