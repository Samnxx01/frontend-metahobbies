import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  getAllRoutes, 
  createRoute, 
  updateRoute, 
  deleteRoute, 
  toggleRouteStatus,
  type Route, 
  type CreateRouteDto 
} from '@/app/services/routesService';
import { swalFire } from '@/lib/sweetalert';

// Shadcn UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Icons
import { Plus, Edit, Trash2, Loader2, RefreshCw } from 'lucide-react';

const LAYOUTS = ['PublicLayout', 'AuthLayout', 'AdminLayout'] as const;

export default function GestionRutas(): React.ReactElement {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState<CreateRouteDto>({
    name: '',
    path: '',
    component: '',
    layout: 'PublicLayout',
  });

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await getAllRoutes();
      if (response.success) {
        setRoutes(response.data);
      } else {
        toast.error('Error al cargar las rutas');
      }
    } catch (error) {
      console.error('Error loading routes:', error);
      toast.error('Error al cargar las rutas');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (route?: Route): void => {
    if (route) {
      setEditingRoute(route);
      setFormData({
        name: route.name,
        path: route.path,
        component: route.component,
        layout: route.layout as typeof LAYOUTS[number],
      });
    } else {
      setEditingRoute(null);
      setFormData({
        name: '',
        path: '',
        component: '',
        layout: 'PublicLayout',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = (): void => {
    setIsModalOpen(false);
    setEditingRoute(null);
    setFormData({
      name: '',
      path: '',
      component: '',
      layout: 'PublicLayout',
    });
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!formData.name || !formData.path || !formData.component) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      setSubmitting(true);
      if (editingRoute) {
        await updateRoute(editingRoute.iud, formData);
        toast.success('Ruta actualizada exitosamente');
      } else {
        await createRoute(formData);
        toast.success('Ruta creada exitosamente');
      }
      handleCloseModal();
      loadRoutes();
    } catch (error: any) {
      console.error('Error saving route:', error);
      toast.error(error.message || 'Error al guardar la ruta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (route: Route): Promise<void> => {
    const result = await swalFire({
      title: '¿Estás seguro?',
      text: `Se eliminará la ruta "${route.name}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      try {
        await deleteRoute(route.iud);
        toast.success('Ruta eliminada exitosamente');
        loadRoutes();
      } catch (error: any) {
        console.error('Error deleting route:', error);
        toast.error(error.message || 'Error al eliminar la ruta');
      }
    }
  };

  const handleToggleStatus = async (route: Route): Promise<void> => {
    try {
      await toggleRouteStatus(route.iud, !route.estadoRuta);
      toast.success(`Ruta ${!route.estadoRuta ? 'activada' : 'desactivada'} exitosamente`);
      loadRoutes();
    } catch (error: any) {
      console.error('Error toggling route status:', error);
      toast.error(error.message || 'Error al cambiar el estado de la ruta');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Gestión de Rutas</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Administra las rutas de la aplicación
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={loadRoutes}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Ruta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : routes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No hay rutas registradas</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Ruta</TableHead>
                    <TableHead>Componente</TableHead>
                    <TableHead>Layout</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((route) => (
                    <TableRow key={route.iud}>
                      <TableCell className="font-medium">{route.name}</TableCell>
                      <TableCell>
                        <code className="px-2 py-1 bg-muted rounded text-xs">
                          {route.path}
                        </code>
                      </TableCell>
                      <TableCell>{route.component}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{route.layout}</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={route.estadoRuta}
                          onCheckedChange={() => handleToggleStatus(route)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenModal(route)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(route)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para crear/editar ruta */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingRoute ? 'Editar Ruta' : 'Nueva Ruta'}
              </DialogTitle>
              <DialogDescription>
                {editingRoute
                  ? 'Modifica los datos de la ruta existente'
                  : 'Completa los campos para crear una nueva ruta'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ej: Inicio"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="path">
                  Ruta <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="path"
                  value={formData.path}
                  onChange={(e) =>
                    setFormData({ ...formData, path: e.target.value })
                  }
                  placeholder="Ej: / o /productos"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="component">
                  Componente <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="component"
                  value={formData.component}
                  onChange={(e) =>
                    setFormData({ ...formData, component: e.target.value })
                  }
                  placeholder="Ej: Home"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="layout">
                  Layout <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.layout}
                  onValueChange={(value) =>
                    setFormData({ ...formData, layout: value as typeof LAYOUTS[number] })
                  }
                >
                  <SelectTrigger id="layout">
                    <SelectValue placeholder="Selecciona un layout" />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUTS.map((layout) => (
                      <SelectItem key={layout} value={layout}>
                        {layout}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : editingRoute ? (
                  'Actualizar'
                ) : (
                  'Crear'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
