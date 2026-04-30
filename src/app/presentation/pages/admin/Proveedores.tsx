import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Building2, Mail, MapPin, Phone, RefreshCcw, Search } from 'lucide-react';
import inventarioService, { type InventarioProveedor } from '@/app/services/inventarioService';
import InventarioProveedorModal, { type InventarioProveedorDraft } from './components/InventarioProveedorModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function Proveedores(): React.ReactElement {
  const [proveedores, setProveedores] = useState<InventarioProveedor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

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
        tipoProveedorId: draft.tipoProveedorId || undefined,
        paisId: draft.paisId || undefined,
        departamentoId: draft.departamentoId || undefined,
        ciudadId: draft.ciudadId || undefined,
      });
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
