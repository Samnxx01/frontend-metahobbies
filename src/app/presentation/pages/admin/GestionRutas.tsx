import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  getAllRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  toggleRouteStatus,
  getTiposNodoRuta,
  createTipoNodoRuta,
  deleteTipoNodoRuta,
  type Route,
  type CreateRouteDto,
  type TipoNodoRuta
} from '@/app/services/routesService';
import { swalFire } from '@/lib/sweetalert';

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
import { ChevronDown, ChevronRight, Edit, Eye, Loader2, Network, Plus, RefreshCw, Trash2 } from 'lucide-react';

const LAYOUTS = ['PublicLayout', 'AuthLayout', 'AdminLayout'] as const;
type NodeTypeRef = string;

interface RouteTreeNode extends Route {
  id: string;
  children: RouteTreeNode[];
}

interface RouteTableRow {
  node: RouteTreeNode;
  depth: number;
  hasChildren: boolean;
}

interface NodeTypeFormState {
  codigo: string;
  nombre: string;
  descripcion: string;
}

export default function GestionRutas(): React.ReactElement {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [nodeTypes, setNodeTypes] = useState<TipoNodoRuta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isTreeModalOpen, setIsTreeModalOpen] = useState<boolean>(false);
  const [isNodeTypeModalOpen, setIsNodeTypeModalOpen] = useState<boolean>(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [nodeTypeSubmitting, setNodeTypeSubmitting] = useState<boolean>(false);
  const [creationType, setCreationType] = useState<NodeTypeRef>('');
  const [selectedSuiteIdForForm, setSelectedSuiteIdForForm] = useState<string>('');
  const [expandedTableNodes, setExpandedTableNodes] = useState<Record<string, boolean>>({});

  const [nodeTypeForm, setNodeTypeForm] = useState<NodeTypeFormState>({
    codigo: '',
    nombre: '',
    descripcion: '',
  });

  const [formData, setFormData] = useState<CreateRouteDto>({
    name: '',
    path: '',
    component: '',
    layout: 'AdminLayout',
    tipoNodo: '',
    tipoNodoId: '',
    padreId: null,
    mostrarEnSidebar: true,
  });

  useEffect(() => {
    void Promise.all([loadRoutes(), loadNodeTypes()]);
  }, []);

  const resolveRouteId = (route: Route): string =>
    String((route as any)?._id || route?.iud || '');
  const resolveNodeTypeId = (nodeType: TipoNodoRuta | any): string =>
    String(nodeType?.iud || nodeType?._id || '');

  const resolveParentId = (route: Route): string | null => {
    const parent = route?.padreId as any;
    if (!parent) return null;
    if (typeof parent === 'string') return parent;
    return String(parent?._id || parent?.iud || '');
  };

  const getTypeByCode = (code?: string | null): TipoNodoRuta | undefined =>
    nodeTypes.find((t) => String(t.codigo || '').toUpperCase() === String(code || '').toUpperCase());

  const getTypeById = (id?: string | null): TipoNodoRuta | undefined =>
    nodeTypes.find((t) => resolveNodeTypeId(t) === String(id || ''));

  const getTypeByName = (name?: string | null): TipoNodoRuta | undefined =>
    nodeTypes.find((t) => String(t.nombre || '').toUpperCase() === String(name || '').toUpperCase());

  const getTypeOrderByCode = (code?: string | null): number => {
    const found = getTypeByCode(code || '');
    return Number(found?.order ?? 0);
  };

  const suiteType = nodeTypes.find((t) => Number(t.order) === 1)
    || getTypeByName('SUITE')
    || getTypeByCode('SUITE');
  const moduloType = nodeTypes.find((t) => Number(t.order) === 2)
    || getTypeByName('MODULO')
    || getTypeByCode('MODULO');
  const formularioType = nodeTypes.find((t) => Number(t.order) === 3)
    || getTypeByName('FORMULARIO')
    || getTypeByCode('FORMULARIO');

  const selectedTypeDoc = getTypeById(String(formData.tipoNodoId || creationType || ''))
    || getTypeByCode(String(formData.tipoNodo || ''));
  const selectedTypeOrder = Number(selectedTypeDoc?.order ?? 0);
  const suiteOrder = Number(suiteType?.order ?? 1);
  const moduloOrder = Number(moduloType?.order ?? 2);
  const formularioOrder = Number(formularioType?.order ?? 3);
  const isSuiteType = selectedTypeOrder === Number(suiteType?.order ?? 1);
  const isModuloType = selectedTypeOrder === Number(moduloType?.order ?? 2);
  const isFormularioType = selectedTypeOrder === Number(formularioType?.order ?? 3);

  const getCreateDialogTitle = (): string => {
    if (!selectedTypeDoc) return 'Nueva Ruta';
    if (isSuiteType) return 'Nueva Suite';
    if (isModuloType) return 'Nuevo Modulo';
    if (isFormularioType) return 'Nuevo Formulario';
    return `Nuevo ${String(selectedTypeDoc.nombre || selectedTypeDoc.codigo || 'Nodo')}`;
  };

  const slugify = (value: string): string =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const toPascalCase = (value: string): string =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ]+/g, ' ')
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');

  const normalizePath = (value: string): string => {
    if (!value) return '';
    const clean = value.trim().replace(/\/+/g, '/');
    return clean.startsWith('/') ? clean : `/${clean}`;
  };

  const joinPath = (basePath: string, segment: string): string => {
    const base = normalizePath(basePath || '/');
    const seg = String(segment || '').replace(/^\/+/, '');
    if (!seg) return base;
    return base === '/' ? `/${seg}` : `${base}/${seg}`;
  };

  const buildPathByContext = (name: string, parentId: string | null | undefined, nodeOrder: number): string => {
    const leaf = slugify(name);
    if (!leaf) return '';
    if (nodeOrder <= suiteOrder) return `/${leaf}`;
    if (!parentId) return '';
    const parent = routes.find((r) => resolveRouteId(r) === String(parentId || ''));
    const parentPath = normalizePath(parent?.path || '/');
    return joinPath(parentPath, leaf);
  };

  const resolveTypeIdForRoute = (route: Route): string => {
    const routeTypeId = String(route?.tipoNodoId || '').trim();
    if (routeTypeId && getTypeById(routeTypeId)) return routeTypeId;
    const byCode = getTypeByCode(String(route?.tipoNodo || ''));
    return String(byCode ? resolveNodeTypeId(byCode) : '');
  };

  const getRouteType = (route: Route): string => {
    const byId = getTypeById(resolveTypeIdForRoute(route));
    if (byId?.nombre) return String(byId.nombre);
    if (byId?.codigo) return String(byId.codigo);
    return String(route?.tipoNodo || '-');
  };

  const getRouteTypeOrder = (route: Route): number => {
    const byId = getTypeById(resolveTypeIdForRoute(route));
    if (byId) return Number(byId.order ?? 0);
    return getTypeOrderByCode(String(route?.tipoNodo || ''));
  };

  const getRouteNameById = (id: string | null | undefined): string => {
    if (!id) return '-';
    const found = routes.find((route) => resolveRouteId(route) === String(id));
    return found?.name || '-';
  };

  const getParentOptions = (typeId: string): Route[] => {
    const currentLevel = Number(getTypeById(typeId)?.order ?? 0);
    if (currentLevel <= 1) return [];
    const parentLevel = currentLevel - 1;
    return routes.filter((route) => getRouteTypeOrder(route) === parentLevel);
  };

  const suiteOptions = useMemo(
    () => routes.filter((route) => getRouteTypeOrder(route) === Number(suiteType?.order ?? 1)),
    [routes, nodeTypes]
  );

  const moduloOptionsBySuite = useMemo(
    () => routes.filter((route) => {
      if (getRouteTypeOrder(route) !== Number(moduloType?.order ?? 2)) return false;
      if (!selectedSuiteIdForForm) return false;
      return String(resolveParentId(route) || '') === String(selectedSuiteIdForForm);
    }),
    [routes, selectedSuiteIdForForm, nodeTypes]
  );

  const treeNodes = useMemo(() => {
    const activeRoutes = routes.filter((route) => route.estadoRuta !== false);
    const map = new Map<string, RouteTreeNode>();
    const roots: RouteTreeNode[] = [];

    activeRoutes.forEach((route) => {
      const id = resolveRouteId(route);
      map.set(id, { ...route, id, children: [] });
    });

    map.forEach((node) => {
      const parentId = resolveParentId(node as Route);
      if (parentId && map.has(parentId)) {
        map.get(parentId)?.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortNodes = (nodes: RouteTreeNode[]): void => {
      nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      nodes.forEach((child) => sortNodes(child.children));
    };
    sortNodes(roots);
    return roots;
  }, [routes]);

  const tableTreeNodes = useMemo(() => {
    const map = new Map<string, RouteTreeNode>();
    const roots: RouteTreeNode[] = [];

    routes.forEach((route) => {
      const id = resolveRouteId(route);
      map.set(id, { ...route, id, children: [] });
    });

    map.forEach((node) => {
      const parentId = resolveParentId(node as Route);
      if (parentId && map.has(parentId)) {
        map.get(parentId)?.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortNodes = (nodes: RouteTreeNode[]): void => {
      nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      nodes.forEach((child) => sortNodes(child.children));
    };
    sortNodes(roots);
    return roots;
  }, [routes]);

  useEffect(() => {
    const nextExpanded: Record<string, boolean> = {};
    const walk = (nodes: RouteTreeNode[]): void => {
      nodes.forEach((node) => {
        if (node.children.length > 0) {
          nextExpanded[node.id] = expandedTableNodes[node.id] ?? true;
          walk(node.children);
        }
      });
    };
    walk(tableTreeNodes);
    setExpandedTableNodes(nextExpanded);
  }, [tableTreeNodes]);

  const tableRows = useMemo(() => {
    const rows: RouteTableRow[] = [];
    const walk = (nodes: RouteTreeNode[], depth = 0): void => {
      nodes.forEach((node) => {
        const hasChildren = node.children.length > 0;
        rows.push({ node, depth, hasChildren });
        if (hasChildren && expandedTableNodes[node.id] !== false) {
          walk(node.children, depth + 1);
        }
      });
    };
    walk(tableTreeNodes);
    return rows;
  }, [tableTreeNodes, expandedTableNodes]);

  const toggleTableNode = (id: string): void => {
    setExpandedTableNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const notifyRoutesUpdated = (): void => {
    window.dispatchEvent(new CustomEvent('admin-routes-updated'));
  };

  const resolvePreviewPath = (routePath: string): string => {
    const normalized = normalizePath(routePath || '');
    if (!normalized || normalized === '/') return '/';
    return normalized;
  };

  const handlePreviewRoute = (route: Route): void => {
    const previewPath = resolvePreviewPath(route.path);
    window.open(previewPath, '_blank', 'noopener,noreferrer');
  };

  const loadRoutes = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await getAllRoutes();
      if (response.success) {
        setRoutes(response.data);
      } else {
        toast.error('Error loading routes');
      }
    } catch (error) {
      console.error('Error loading routes:', error);
      toast.error('Error loading routes');
    } finally {
      setLoading(false);
    }
  };

  const loadNodeTypes = async (): Promise<void> => {
    try {
      const response = await getTiposNodoRuta();
      if (response.success) {
        const items = Array.isArray(response.data) ? response.data : [];
        items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setNodeTypes(items);
      }
    } catch (error) {
      console.error('Error loading node types:', error);
    }
  };

  const resetRouteForm = (typeId?: string): void => {
    const resolvedTypeId = String(typeId || creationType || resolveNodeTypeId(formularioType) || '');
    const resolvedType = getTypeById(resolvedTypeId);
    setFormData({
      name: '',
      path: '',
      component: '',
      layout: 'AdminLayout',
      tipoNodo: String(resolvedType?.codigo || ''),
      tipoNodoId: String(resolvedType ? resolveNodeTypeId(resolvedType) : ''),
      padreId: null,
      mostrarEnSidebar: true,
    });
  };

  const openRouteModal = (route?: Route, forceTypeId?: string): void => {
    if (route) {
      const routeTypeId = resolveTypeIdForRoute(route);
      const routeTypeOrder = Number(getTypeById(routeTypeId)?.order ?? 0);
      const routeParentId = resolveParentId(route);
      let suiteForForm = '';
      if (routeTypeOrder === Number(moduloType?.order ?? 2)) {
        suiteForForm = routeParentId || '';
      } else if (routeTypeOrder === Number(formularioType?.order ?? 3)) {
        const modulo = routes.find((r) => resolveRouteId(r) === String(routeParentId || ''));
        suiteForForm = resolveParentId(modulo as Route) || '';
      }
      setSelectedSuiteIdForForm(suiteForForm);
      setEditingRoute(route);
      setFormData({
        name: route.name,
        path: route.path,
        component: route.component,
        layout: route.layout as typeof LAYOUTS[number],
        tipoNodo: String(getTypeById(routeTypeId)?.codigo || route.tipoNodo || ''),
        tipoNodoId: routeTypeId,
        padreId: resolveParentId(route),
        mostrarEnSidebar: route?.mostrarEnSidebar !== false,
      });
    } else {
      const typeId = String(forceTypeId || resolveNodeTypeId(formularioType) || '');
      setCreationType(typeId);
      setEditingRoute(null);
      setSelectedSuiteIdForForm('');
      resetRouteForm(typeId);
    }
    setIsModalOpen(true);
  };

  const closeRouteModal = (): void => {
    setIsModalOpen(false);
    setEditingRoute(null);
    setSelectedSuiteIdForForm('');
    resetRouteForm();
  };

  const handleSubmitRoute = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    // 🔹 Resolver tipo seleccionado de forma segura
    const selectedTypeDoc =
      getTypeById(String(formData.tipoNodoId || '')) ??
      getTypeByCode(String(formData.tipoNodo || ''));

    // 🔒 Validación fuerte
    if (!selectedTypeDoc) {
      toast.error('No existe tipo de nodo activo');
      return;
    }

    if (!formData.name || !formData.path || !formData.component) {
      toast.error('Complete all required fields');
      return;
    }

    const selectedTypeOrder = Number(selectedTypeDoc.order ?? 0);

    if (selectedTypeOrder > 1 && !formData.padreId) {
      toast.error('You must select a parent for this node type');
      return;
    }

    try {
      setSubmitting(true);

      const parentRoute = routes.find(
        (r) => resolveRouteId(r) === String(formData.padreId || '')
      );

      const resolvedLayout = (() => {
        if (editingRoute) return formData.layout;
        if (selectedTypeOrder === Number(formularioType?.order ?? 3)) {
          return parentRoute?.layout || formData.layout || 'AdminLayout';
        }
        return formData.layout || 'AdminLayout';
      })();

      const payload: CreateRouteDto = {
        ...formData,
        path: normalizePath(formData.path || ''),
        layout: resolvedLayout as 'PublicLayout' | 'AuthLayout' | 'AdminLayout',
        tipoNodo: String(selectedTypeDoc.codigo || ''),
        tipoNodoId: resolveNodeTypeId(selectedTypeDoc),
        padreId: selectedTypeOrder <= 1
          ? null
          : (formData.padreId || null),
      };

      if (editingRoute) {
        await updateRoute(editingRoute.iud, payload);
        toast.success('Route updated');
      } else {
        await createRoute(payload);
        toast.success('Route created');
      }

      closeRouteModal();
      await loadRoutes();
      notifyRoutesUpdated();

    } catch (error: any) {
      console.error('Error saving route:', error);
      toast.error(error?.message || 'Error saving route');
    } finally {
      setSubmitting(false);
    }
  };
  const handleDeleteRoute = async (route: Route): Promise<void> => {
    const result = await swalFire({
      title: 'Are you sure?',
      text: `Route "${route.name}" will be deleted or deactivated according to your role`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, continue',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      const response = await deleteRoute(route.iud);
      toast.success(response?.message || 'Action completed successfully');
      await loadRoutes();
      notifyRoutesUpdated();
    } catch (error: any) {
      console.error('Error deleting route:', error);
      toast.error(error?.message || 'Error deactivating route');
    }
  };

  const handleToggleStatus = async (route: Route): Promise<void> => {
    try {
      await toggleRouteStatus(route.iud, !route.estadoRuta);
      toast.success(`Route ${!route.estadoRuta ? 'enabled' : 'disabled'}`);
      await loadRoutes();
      notifyRoutesUpdated();
    } catch (error: any) {
      console.error('Error toggling route:', error);
      toast.error(error?.message || 'Error changing route status');
    }
  };

  const handleCreateNodeType = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!nodeTypeForm.codigo.trim() || !nodeTypeForm.nombre.trim()) {
      toast.error('Code and name are required');
      return;
    }

    try {
      setNodeTypeSubmitting(true);
      await createTipoNodoRuta({
        codigo: nodeTypeForm.codigo.trim().toUpperCase(),
        nombre: nodeTypeForm.nombre.trim(),
        descripcion: nodeTypeForm.descripcion.trim(),
        estado: true,
      });
      toast.success('Creacion exitosa de jerarquia');
      setNodeTypeForm({ codigo: '', nombre: '', descripcion: '' });
      await loadNodeTypes();
    } catch (error: any) {
      console.error('Error creating node type:', error);
      toast.error(error?.message || 'Error creating node type');
    } finally {
      setNodeTypeSubmitting(false);
    }
  };

  const handleDeactivateNodeType = async (id: string): Promise<void> => {
    const result = await swalFire({
      title: 'Deactivate node type?',
      text: 'This will mark the node type as inactive',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Deactivate',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      await deleteTipoNodoRuta(id);
      toast.success('Node type deactivated');
      await loadNodeTypes();
    } catch (error: any) {
      console.error('Error deactivating node type:', error);
      toast.error(error?.message || 'Error deactivating node type');
    }
  };

  const renderTree = (nodes: RouteTreeNode[], level = 0): React.ReactNode => {
    return nodes.map((node) => (
      <div key={node.id} style={{ paddingLeft: `${level * 18}px` }} className="py-1">
        <div className="text-sm">
          <span className="font-semibold">{node.name}</span>
          <span className="text-muted-foreground ml-2">[{getRouteType(node)}]</span>
        </div>
        {node.children.length > 0 ? renderTree(node.children, level + 1) : null}
      </div>
    ));
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Gestion de Rutas</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Parametriza suite, modulo y formulario de forma jerarquica y dinamica
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => void loadRoutes()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" onClick={() => setIsTreeModalOpen(true)}>
              <Network className="h-4 w-4 mr-2" />
              Ver Arbol
            </Button>
            <Button variant="outline" onClick={() => setIsNodeTypeModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Param. Tipos
            </Button>
            <Button variant="outline" onClick={() => openRouteModal(undefined, resolveNodeTypeId(suiteType) || '')}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Suite
            </Button>
            <Button variant="outline" onClick={() => openRouteModal(undefined, resolveNodeTypeId(moduloType) || '')}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Modulo
            </Button>
            <Button onClick={() => openRouteModal(undefined, resolveNodeTypeId(formularioType) || '')}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Formulario
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
              <p>No routes found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Padre</TableHead>
                    <TableHead>Ruta</TableHead>
                    <TableHead>Componente</TableHead>
                    <TableHead>Layout</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.map(({ node: route, depth, hasChildren }) => (
                    <TableRow key={resolveRouteId(route)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 14}px` }}>
                          {hasChildren ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleTableNode(resolveRouteId(route))}
                            >
                              {expandedTableNodes[resolveRouteId(route)] !== false ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          ) : (
                            <span className="inline-block h-6 w-6" />
                          )}
                          <span>{route.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getRouteType(route)}</Badge>
                      </TableCell>
                      <TableCell>{getRouteNameById(resolveParentId(route))}</TableCell>
                      <TableCell>
                        <code className="px-2 py-1 bg-muted rounded text-xs">{route.path}</code>
                      </TableCell>
                      <TableCell>{route.component}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{route.layout}</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={route.estadoRuta}
                          onCheckedChange={() => void handleToggleStatus(route)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handlePreviewRoute(route)} title="Previsualizar">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openRouteModal(route)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => void handleDeleteRoute(route)}>
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <form onSubmit={(e) => void handleSubmitRoute(e)}>
            <DialogHeader>
              <DialogTitle>{editingRoute ? 'Editar Ruta' : getCreateDialogTitle()}</DialogTitle>
              <DialogDescription>
                Parametriza nodos jerarquicos (suite, modulo, formulario)
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {editingRoute ? (
                <div className="space-y-2">
                  <Label htmlFor="tipoNodo">Tipo de nodo *</Label>
                  <Select
                    value={formData.tipoNodoId || undefined}
                    onValueChange={(value) => {
                      const nextType = getTypeById(value);
                      const nextOrder = Number(nextType?.order ?? 0);
                      setFormData((prev) => ({
                        ...prev,
                        tipoNodo: String(nextType?.codigo || ''),
                        tipoNodoId: String(nextType ? resolveNodeTypeId(nextType) : ''),
                        padreId: nextOrder <= 1 ? null : prev.padreId,
                      }));
                      if (nextOrder !== Number(formularioType?.order ?? 3)) {
                        setSelectedSuiteIdForForm('');
                      }
                    }}
                  >
                    <SelectTrigger id="tipoNodo">
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {nodeTypes.filter((t) => t.estado !== false).map((tipo) => (
                        <SelectItem key={resolveNodeTypeId(tipo)} value={resolveNodeTypeId(tipo)}>
                          {String(tipo.nombre || tipo.codigo)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Tipo de nodo *</Label>
                  <Input
                    value={String(selectedTypeDoc?.nombre || selectedTypeDoc?.codigo || '')}
                    disabled
                  />
                </div>
              )}

              {isFormularioType && (
                <div className="space-y-2">
                  <Label htmlFor="suiteSelector">Suite asociada *</Label>
                  <Select
                    value={selectedSuiteIdForForm || undefined}
                    onValueChange={(value) => {
                      setSelectedSuiteIdForForm(value);
                      setFormData((prev) => ({
                        ...prev,
                        padreId: null,
                        path: editingRoute ? prev.path : '',
                      }));
                    }}
                  >
                    <SelectTrigger id="suiteSelector">
                      <SelectValue placeholder="Selecciona suite" />
                    </SelectTrigger>
                    <SelectContent>
                      {suiteOptions.map((suite) => (
                        <SelectItem key={resolveRouteId(suite)} value={resolveRouteId(suite)}>
                          {suite.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!isSuiteType && (
                <div className="space-y-2">
                  <Label htmlFor="padreId">
                    {isModuloType
                      ? 'Suite asociada *'
                      : 'Modulo padre *'}
                  </Label>
                  <Select
                    value={formData.padreId ? String(formData.padreId) : undefined}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        padreId: value,
                        path: editingRoute
                          ? prev.path
                          : buildPathByContext(prev.name, value, selectedTypeOrder),
                      }))
                    }
                    disabled={isFormularioType && !selectedSuiteIdForForm}
                  >
                    <SelectTrigger id="padreId">
                      <SelectValue placeholder={isModuloType ? 'Selecciona suite' : 'Selecciona modulo'} />
                    </SelectTrigger>
                    <SelectContent>
                      {isFormularioType
                        ? moduloOptionsBySuite.map((parent) => (
                          <SelectItem key={resolveRouteId(parent)} value={resolveRouteId(parent)}>
                            {parent.name}
                          </SelectItem>
                        ))
                        : getParentOptions(String(formData.tipoNodoId || '')).map((parent) => (
                          <SelectItem key={resolveRouteId(parent)} value={resolveRouteId(parent)}>
                            {parent.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {!editingRoute && isModuloType && getParentOptions(String(formData.tipoNodoId || '')).length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Primero crea una suite para poder crear modulos.
                    </p>
                  )}
                  {!editingRoute && isFormularioType && !selectedSuiteIdForForm && (
                    <p className="text-xs text-muted-foreground">
                      Primero selecciona la suite para habilitar los modulos.
                    </p>
                  )}
                  {!editingRoute && isFormularioType && selectedSuiteIdForForm && moduloOptionsBySuite.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No hay modulos en la suite seleccionada.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      name: nextName,
                      component: editingRoute ? prev.component : toPascalCase(nextName),
                      path: editingRoute
                        ? prev.path
                        : isSuiteType
                          ? prev.path
                          : buildPathByContext(nextName, prev.padreId || null, selectedTypeOrder),
                    }));
                  }}
                  placeholder="Ej: Gobernanza"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="path">Ruta *</Label>
                <Input
                  id="path"
                  value={formData.path}
                  onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                  readOnly={!editingRoute && !isSuiteType}
                  placeholder={
                    isSuiteType
                      ? 'Ej: /gobernanza'
                      : isModuloType
                        ? 'Ej: /gobernanza/modulo'
                        : 'Ej: /gobernanza/modulo/formulario'
                  }
                  required
                />
                {!editingRoute && (
                  <p className="text-xs text-muted-foreground">
                    La ruta se genera automaticamente segun la jerarquia.
                  </p>
                )}
              </div>
              {editingRoute && (
                <div className="space-y-2">
                  <Label htmlFor="component">Componente *</Label>
                  <Input
                    id="component"
                    value={formData.component}
                    onChange={(e) => setFormData({ ...formData, component: e.target.value })}
                    placeholder="Ej: Gobernanza"
                    required
                  />
                </div>
              )}
              {(editingRoute || !isFormularioType) ? (
                <div className="space-y-2">
                  <Label htmlFor="layout">Layout *</Label>
                  <Select
                    value={formData.layout}
                    onValueChange={(value) => setFormData({ ...formData, layout: value as typeof LAYOUTS[number] })}
                  >
                    <SelectTrigger id="layout">
                      <SelectValue placeholder="Selecciona layout" />
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
              ) : (
                <div className="space-y-2">
                  <Label>Layout</Label>
                  <Input
                    value={
                      routes.find((r) => resolveRouteId(r) === String(formData.padreId || ''))?.layout
                      || 'Se heredara del modulo padre'
                    }
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Para formularios, el layout es opcional y se hereda del modulo padre.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label htmlFor="mostrarEnSidebar" className="cursor-pointer">Mostrar en sidebar</Label>
                <Switch
                  id="mostrarEnSidebar"
                  checked={formData.mostrarEnSidebar !== false}
                  onCheckedChange={(checked) => setFormData({ ...formData, mostrarEnSidebar: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeRouteModal} disabled={submitting}>
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

      <Dialog open={isTreeModalOpen} onOpenChange={setIsTreeModalOpen}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Arbol jerarquico parametrizado</DialogTitle>
            <DialogDescription>
              Vista previa: Suite / Modulo / Formulario
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[420px] overflow-auto rounded-md border p-3">
            {treeNodes.length > 0 ? renderTree(treeNodes) : (
              <p className="text-sm text-muted-foreground">No hay nodos activos para mostrar.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTreeModalOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNodeTypeModalOpen} onOpenChange={setIsNodeTypeModalOpen}>
        <DialogContent className="sm:max-w-[660px]">
          <DialogHeader>
            <DialogTitle>Parametrizacion de Tipos de Nodo</DialogTitle>
            <DialogDescription>
              Todo dinamico: crea y desactiva tipos de nodo sin hardcode.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleCreateNodeType(e)} className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Codigo</Label>
                <Input
                  value={nodeTypeForm.codigo}
                  onChange={(e) => setNodeTypeForm({ ...nodeTypeForm, codigo: e.target.value })}
                  placeholder="SUITE"
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={nodeTypeForm.nombre}
                  onChange={(e) => setNodeTypeForm({ ...nodeTypeForm, nombre: e.target.value })}
                  placeholder="Suite"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Input
                value={nodeTypeForm.descripcion}
                onChange={(e) => setNodeTypeForm({ ...nodeTypeForm, descripcion: e.target.value })}
                placeholder="Nivel raiz"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={nodeTypeSubmitting}>
                {nodeTypeSubmitting ? 'Guardando...' : 'Guardar tipo'}
              </Button>
            </div>
          </form>
          <div className="rounded-md border max-h-[260px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Accion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodeTypes.map((item) => (
                  <TableRow key={resolveNodeTypeId(item)}>
                    <TableCell>{item.codigo}</TableCell>
                    <TableCell>{item.nombre}</TableCell>
                    <TableCell>{item.order}</TableCell>
                    <TableCell>
                      <Badge variant={item.estado ? 'outline' : 'secondary'}>
                        {item.estado ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!item.estado}
                        onClick={() => void handleDeactivateNodeType(resolveNodeTypeId(item))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
