import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  getAllRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  toggleRouteStatus,
  getTiposNodoRuta,
  getAccessTypes,
  getAccionesCatalogo,
  createAccessType,
  updateAccessType,
  deactivateAccessType,
  createTipoNodoRuta,
  deleteTipoNodoRuta,
  previewRoute,
  type Route,
  type CreateRouteDto,
  type TipoNodoRuta,
  type AccessTypeOption,
  type AccionOption
} from '@/app/services/routesService';
import { swalFire } from '@/lib/sweetalert';
import { normalizeRoutePath } from '@/app/services/routePathNormalizer';

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

interface AccessTypeFormState {
  accessType: string;
  layout: string;
}

export default function GestionRutas(): React.ReactElement {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [nodeTypes, setNodeTypes] = useState<TipoNodoRuta[]>([]);
  const [accessTypes, setAccessTypes] = useState<AccessTypeOption[]>([]);
  const [accionesCatalogo, setAccionesCatalogo] = useState<AccionOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isTreeModalOpen, setIsTreeModalOpen] = useState<boolean>(false);
  const [isNodeTypeModalOpen, setIsNodeTypeModalOpen] = useState<boolean>(false);
  const [isAccessTypeModalOpen, setIsAccessTypeModalOpen] = useState<boolean>(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [nodeTypeSubmitting, setNodeTypeSubmitting] = useState<boolean>(false);
  const [accessTypeSubmitting, setAccessTypeSubmitting] = useState<boolean>(false);
  const [editingAccessTypeId, setEditingAccessTypeId] = useState<string>('');
  const [useCustomComponent, setUseCustomComponent] = useState<boolean>(false);
  const [creationType, setCreationType] = useState<NodeTypeRef>('');
  const [selectedSuiteIdForForm, setSelectedSuiteIdForForm] = useState<string>('');
  const [expandedTableNodes, setExpandedTableNodes] = useState<Record<string, boolean>>({});
  const [nameFilter, setNameFilter] = useState<string>('');
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string>('ALL');

  const [nodeTypeForm, setNodeTypeForm] = useState<NodeTypeFormState>({
    codigo: '',
    nombre: '',
    descripcion: '',
  });
  const [accessTypeForm, setAccessTypeForm] = useState<AccessTypeFormState>({
    accessType: '',
    layout: '',
  });

  const [formData, setFormData] = useState<CreateRouteDto>({
    name: '',
    path: '',
    component: '',
    layout: 'AdminLayout',
    tipoNodo: '',
    tipoNodoId: '',
    padreId: null,
    heredaDeRuta: null,
    mostrarEnSidebar: true,
    mostrarEnMenuUsuario: false,
    menuUsuarioKey: null,
    menuUsuarioLabel: '',
    menuUsuarioOrder: 0,
    accessType: [],
    acciones: [],
  });

  useEffect(() => {
    void Promise.all([loadRoutes(), loadNodeTypes(), loadAccessTypes(), loadAccionesCatalogo()]);
  }, []);

  const resolveRouteId = (route: Route): string =>
    String((route as any)?._id || route?.iud || '');
  const resolveNodeTypeId = (nodeType: TipoNodoRuta | any): string =>
    String(nodeType?.iud || nodeType?._id || '');
  const resolveAccessTypeIds = (route: Route): string[] => {
    const raw = (route as any)?.accessType;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw
        .map((item) => String((item as any)?._id || (item as any)?.iud || item || '').trim())
        .filter(Boolean);
    }
    if (typeof raw === 'string') return [String(raw)];
    return [String(raw?._id || raw?.iud || '')].filter(Boolean);
  };
  const resolveActionIds = (route: Route): string[] => {
    const raw = (route as any)?.acciones;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw
        .map((item) => String((item as any)?._id || (item as any)?.iud || item || '').trim())
        .filter(Boolean);
    }
    if (typeof raw === 'string') return [String(raw)];
    return [String(raw?._id || raw?.iud || '')].filter(Boolean);
  };

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

  const resolveInheritedRouteId = (route: Route): string | null => {
    const inherited = route?.heredaDeRuta as any;
    if (!inherited) return null;
    if (typeof inherited === 'string') return inherited;
    return String(inherited?._id || inherited?.iud || '');
  };
  const getAccessTypeLabelsByIds = (ids: string[] = []): string[] => {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    return ids
      .map((id) => {
        const normalized = String(id || '').trim();
        const found = accessTypes.find((a) => String(a?._id || '') === normalized);
        return String(found?.layout || found?.accessType || '');
      })
      .filter(Boolean);
  };
  const getActionLabelsByIds = (ids: string[] = []): string[] => {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    return ids
      .map((id) => {
        const normalized = String(id || '').trim();
        const found = accionesCatalogo.find((a) => String(a?._id || a?.iud || '').trim() === normalized);
        if (!found) return '';
        const method = String(found.method || '').trim().toUpperCase();
        const etiqueta = String(found.etiquetas || '').trim();
        return etiqueta ? `${method} | ${etiqueta}` : method;
      })
      .filter(Boolean);
  };

  const resolveCanManageBaja = (route: Route): boolean => {
    const raw = (route as any)?.puedeGestionarBaja;
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'number') return raw === 1;
    if (typeof raw === 'string') {
      const normalized = raw.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0') return false;
    }

    const action = String((route as any)?.accionBajaPermitida || '').trim().toUpperCase();
    if (action === 'ELIMINAR' || action === 'DESACTIVAR') return true;

    // Fallback para no ocultar el icono cuando el backend aun no envia flags.
    return true;
  };

  const getParentOptions = (typeId: string): Route[] => {
    const currentLevel = Number(getTypeById(typeId)?.order ?? 0);
    if (currentLevel <= 1) return [];
    const parentLevel = currentLevel - 1;
    const editingId = editingRoute ? resolveRouteId(editingRoute) : '';
    return routes.filter((route) => {
      if (getRouteTypeOrder(route) !== parentLevel) return false;
      if (!editingId) return true;
      return resolveRouteId(route) !== editingId;
    });
  };
  const resolveSuiteIdForCurrentForm = (): string => {
    if (isSuiteType) return '';
    if (isModuloType) return String(formData.padreId || '');
    if (isFormularioType) return String(selectedSuiteIdForForm || '');
    return '';
  };
  const resolveSuiteComponentForCurrentForm = (): string => {
    const suiteId = resolveSuiteIdForCurrentForm();
    if (!suiteId) return '';
    const suite = routes.find((route) => resolveRouteId(route) === suiteId);
    return String(suite?.component || '');
  };
  const resolveSuiteComponentById = (suiteId: string): string => {
    if (!suiteId) return '';
    const suite = routes.find((route) => resolveRouteId(route) === String(suiteId));
    return String(suite?.component || '');
  };

  const suiteOptions = useMemo(
    () => routes.filter((route) => getRouteTypeOrder(route) === Number(suiteType?.order ?? 1)),
    [routes, nodeTypes]
  );

  const moduloOptionsBySuite = useMemo(
    () => routes.filter((route) => {
      if (getRouteTypeOrder(route) !== Number(moduloType?.order ?? 2)) return false;
      if (!selectedSuiteIdForForm) return false;
      const editingId = editingRoute ? resolveRouteId(editingRoute) : '';
      if (editingId && resolveRouteId(route) === editingId) return false;
      return String(resolveParentId(route) || '') === String(selectedSuiteIdForForm);
    }),
    [routes, selectedSuiteIdForForm, nodeTypes, editingRoute]
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
    const normalizedFilter = String(nameFilter || '').trim().toLowerCase();
    const isNameFiltering = normalizedFilter.length > 0;
    const normalizedTypeFilter = String(nodeTypeFilter || 'ALL').toUpperCase();
    const isTypeFiltering = normalizedTypeFilter !== 'ALL';
    const isFiltering = isNameFiltering || isTypeFiltering;

    const walk = (nodes: RouteTreeNode[], depth = 0): void => {
      nodes.forEach((node) => {
        const hasChildren = node.children.length > 0;
        const matchesName = String(node.name || '').toLowerCase().includes(normalizedFilter);
        const routeTypeName = String(getRouteType(node as Route) || '').toUpperCase();
        const matchesType = !isTypeFiltering || routeTypeName === normalizedTypeFilter;

        if (isFiltering) {
          if (matchesName && matchesType) {
            rows.push({ node, depth, hasChildren });
          }
          if (hasChildren) {
            walk(node.children, depth + 1);
          }
          return;
        }

        rows.push({ node, depth, hasChildren });
        if (hasChildren && expandedTableNodes[node.id] !== false) {
          walk(node.children, depth + 1);
        }
      });
    };
    walk(tableTreeNodes);
    return rows;
  }, [tableTreeNodes, expandedTableNodes, nameFilter, nodeTypeFilter, nodeTypes]);

  const toggleTableNode = (id: string): void => {
    setExpandedTableNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const notifyRoutesUpdated = (): void => {
    window.dispatchEvent(new CustomEvent('admin-routes-updated'));
  };

  const resolvePreviewPath = (routePath: string): string => {
    const normalized = normalizeRoutePath(routePath || '');
    if (!normalized || normalized === '/') return '/';
    return normalized;
  };

  const handlePreviewRoute = async (route: Route): Promise<void> => {
    try {
      const routeId = resolveRouteId(route);
      if (!routeId) {
        toast.error('No se pudo resolver el id de la ruta');
        return;
      }

      const response = await previewRoute(routeId);
      if (!response?.success || !response?.data?.path) {
        toast.error('No se pudo resolver la ruta a visualizar');
        return;
      }

      const previewPath = resolvePreviewPath(response.data.path);
      window.open(previewPath, '_blank', 'noopener,noreferrer');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No autorizado para visualizar esta ruta';
      toast.error(message);
    }
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

  const loadAccessTypes = async (): Promise<void> => {
    try {
      const response = await getAccessTypes();
      if (response.success) {
        const items = Array.isArray(response.data) ? response.data : [];
        setAccessTypes(items);
        setFormData((prev) => ({
          ...prev,
          accessType: Array.isArray(prev.accessType)
            ? prev.accessType
            : (prev.accessType ? [String(prev.accessType)] : []),
        }));
      }
    } catch (error) {
      console.error('Error loading access types:', error);
    }
  };

  const loadAccionesCatalogo = async (): Promise<void> => {
    try {
      const response = await getAccionesCatalogo();
      if (response.success) {
        const items = Array.isArray(response.data) ? response.data : [];
        setAccionesCatalogo(items.filter((item) => item?.estadoAccion !== false));
      }
    } catch (error) {
      console.error('Error loading acciones catalogo:', error);
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
      heredaDeRuta: null,
      mostrarEnSidebar: true,
      mostrarEnMenuUsuario: false,
      menuUsuarioKey: null,
      menuUsuarioLabel: '',
      menuUsuarioOrder: 0,
      accessType: [],
      acciones: [],
    });
    setUseCustomComponent(false);
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
      const inheritedFromSuite = resolveSuiteComponentById(suiteForForm);
      const isCustomForNonSuite = routeTypeOrder > Number(suiteType?.order ?? 1)
        && String(route.component || '').trim() !== String(inheritedFromSuite || '').trim();
      setSelectedSuiteIdForForm(suiteForForm);
      setUseCustomComponent(isCustomForNonSuite);
      setEditingRoute(route);
      setFormData({
        name: route.name,
        path: route.path,
        component: route.component,
        layout: route.layout,
        tipoNodo: String(getTypeById(routeTypeId)?.codigo || route.tipoNodo || ''),
        tipoNodoId: routeTypeId,
        padreId: resolveParentId(route),
        heredaDeRuta: resolveInheritedRouteId(route),
        mostrarEnSidebar: route?.mostrarEnSidebar !== false,
        mostrarEnMenuUsuario: route?.mostrarEnMenuUsuario === true,
        menuUsuarioKey: route?.menuUsuarioKey || null,
        menuUsuarioLabel: route?.menuUsuarioLabel || '',
        menuUsuarioOrder: Number(route?.menuUsuarioOrder ?? 0),
        accessType: resolveAccessTypeIds(route),
        acciones: resolveActionIds(route),
      });
    } else {
      const typeId = String(forceTypeId || resolveNodeTypeId(formularioType) || '');
      setCreationType(typeId);
      setEditingRoute(null);
      setSelectedSuiteIdForForm('');
      setUseCustomComponent(false);
      resetRouteForm(typeId);
    }
    setIsModalOpen(true);
  };

  const closeRouteModal = (): void => {
    setIsModalOpen(false);
    setEditingRoute(null);
    setSelectedSuiteIdForForm('');
    setUseCustomComponent(false);
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

    if (!formData.name || !formData.path) {
      toast.error('Complete all required fields');
      return;
    }

    const selectedTypeOrder = Number(selectedTypeDoc.order ?? 0);

    if (selectedTypeOrder > 1 && !formData.padreId) {
      toast.error('You must select a parent for this node type');
      return;
    }

    const resolvedComponent = (() => {
      if (isSuiteType) return String(formData.component || '').trim();
      const custom = String(formData.component || '').trim();
      if (useCustomComponent && custom) return custom;
      return String(resolveSuiteComponentForCurrentForm() || '').trim();
    })();

    if (!resolvedComponent) {
      toast.error('Componente no disponible. Configura primero el componente en la suite.');
      return;
    }

    const selectedAccessTypeIds = Array.isArray(formData.accessType)
      ? formData.accessType.filter(Boolean)
      : (formData.accessType ? [String(formData.accessType)] : []);
    const selectedAccionesIds = Array.isArray(formData.acciones)
      ? formData.acciones.filter(Boolean)
      : (formData.acciones ? [String(formData.acciones)] : []);

    if (isFormularioType && selectedAccessTypeIds.length === 0) {
      toast.error('Selecciona tipo de acceso para formulario');
      return;
    }

    try {
      setSubmitting(true);

      const parentRoute = routes.find(
        (r) => resolveRouteId(r) === String(formData.padreId || '')
      );

      const resolvedLayout = (() => {
        if (editingRoute) return formData.layout;
        if (isFormularioType) {
          // Formulario: el layout se deriva del primer accessType seleccionado
          const selectedAtIds = Array.isArray(formData.accessType) ? formData.accessType : [];
          const firstAt = accessTypes.find((a) => selectedAtIds.includes(String(a._id || '')));
          if (firstAt?.layout) return firstAt.layout;
          return parentRoute?.layout || formData.layout || '';
        }
        return formData.layout || '';
      })();

      const payload: CreateRouteDto = {
        ...formData,
        path: normalizePath(formData.path || ''),
        component: resolvedComponent,
        layout: resolvedLayout,
        tipoNodo: String(selectedTypeDoc.codigo || ''),
        tipoNodoId: resolveNodeTypeId(selectedTypeDoc),
        padreId: selectedTypeOrder <= 1
          ? null
          : (formData.padreId || null),
        heredaDeRuta: formData.heredaDeRuta || null,
        mostrarEnMenuUsuario: formData.mostrarEnMenuUsuario === true,
        menuUsuarioKey: formData.mostrarEnMenuUsuario === true ? (formData.menuUsuarioKey || null) : null,
        menuUsuarioLabel: formData.mostrarEnMenuUsuario === true
          ? String(formData.menuUsuarioLabel || '').trim()
          : null,
        menuUsuarioOrder: formData.mostrarEnMenuUsuario === true
          ? Number(formData.menuUsuarioOrder ?? 0)
          : 0,
      };

      const editingId = editingRoute ? resolveRouteId(editingRoute) : '';
      const payloadParentId = String((payload as any).padreId || '').trim();
      if (editingId && payloadParentId && payloadParentId === editingId) {
        toast.error('No puedes asignar la misma ruta como padre');
        return;
      }
      const payloadInheritedId = String((payload as any).heredaDeRuta || '').trim();
      if (editingId && payloadInheritedId && payloadInheritedId === editingId) {
        toast.error('No puedes heredar de la misma ruta');
        return;
      }

      if (isModuloType) {
        delete (payload as any).accessType;
        payload.acciones = selectedAccionesIds;
      }
      if (isSuiteType) {
        delete (payload as any).accessType;
        delete (payload as any).acciones;
      }
      if (isFormularioType) {
        payload.accessType = selectedAccessTypeIds;
        payload.acciones = selectedAccionesIds;
      }

      if (editingRoute) {
        await updateRoute(resolveRouteId(editingRoute), payload);
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
    const actionType = String((route as any)?.accionBajaPermitida || 'DESACTIVAR').toUpperCase();
    const actionLabel = actionType === 'ELIMINAR' ? 'eliminada' : 'desactivada';
    const result = await swalFire({
      title: 'Are you sure?',
      text: `Route "${route.name}" sera ${actionLabel} segun tus permisos`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, continue',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      const response = await deleteRoute(resolveRouteId(route));
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
      await toggleRouteStatus(resolveRouteId(route), !route.estadoRuta);
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

  const resetAccessTypeForm = (): void => {
    setAccessTypeForm({ accessType: '', layout: '' });
    setEditingAccessTypeId('');
  };

  const handleOpenAccessTypeModal = (): void => {
    resetAccessTypeForm();
    setIsAccessTypeModalOpen(true);
  };

  const handleSubmitAccessType = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const value = String(accessTypeForm.accessType || '').trim().toUpperCase();
    if (!value) {
      toast.error('El tipo de acceso es obligatorio');
      return;
    }

    try {
      setAccessTypeSubmitting(true);
      const payload = { accessType: value, layout: accessTypeForm.layout.trim().toUpperCase() };
      if (editingAccessTypeId) {
        await updateAccessType(editingAccessTypeId, payload);
        toast.success('Tipo de acceso actualizado');
      } else {
        await createAccessType(payload);
        toast.success('Tipo de acceso creado');
      }
      resetAccessTypeForm();
      await loadAccessTypes();
    } catch (error: any) {
      console.error('Error guardando tipo de acceso:', error);
      toast.error(error?.message || 'Error guardando tipo de acceso');
    } finally {
      setAccessTypeSubmitting(false);
    }
  };

  const handleEditAccessType = (item: AccessTypeOption): void => {
    setEditingAccessTypeId(String(item?._id || ''));
    setAccessTypeForm({
      accessType: String(item?.accessType || ''),
      layout: String(item?.layout || ''),
    });
  };

  const handleDeactivateAccessType = async (id: string): Promise<void> => {
    const result = await swalFire({
      title: 'Desactivar tipo de acceso?',
      text: 'Este tipo de acceso dejara de estar disponible para nuevas parametrizaciones.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Desactivar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;

    try {
      await deactivateAccessType(id);
      toast.success('Tipo de acceso desactivado');
      if (editingAccessTypeId === id) resetAccessTypeForm();
      await loadAccessTypes();
    } catch (error: any) {
      console.error('Error desactivando tipo de acceso:', error);
      toast.error(error?.message || 'Error desactivando tipo de acceso');
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
            <Button variant="outline" onClick={handleOpenAccessTypeModal}>
              <Plus className="h-4 w-4 mr-2" />
              Param. Accesos
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
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Filtrar por nombre..."
              className="max-w-sm"
            />
            <Select value={nodeTypeFilter} onValueChange={setNodeTypeFilter}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los tipos</SelectItem>
                {nodeTypes
                  .filter((type) => type.estado !== false)
                  .map((type) => {
                    const typeLabel = String(type.nombre || type.codigo || '').trim();
                    const typeValue = String(typeLabel || '').toUpperCase();
                    if (!typeValue) return null;
                    return (
                      <SelectItem key={resolveNodeTypeId(type)} value={typeValue}>
                        {typeLabel}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
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
                    <TableHead>Acceso</TableHead>
                    <TableHead>Acciones HTTP</TableHead>
                    <TableHead>Padre</TableHead>
                    <TableHead>Ruta</TableHead>
                    <TableHead>Componente</TableHead>
                    <TableHead>Layout</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
                        No hay rutas que coincidan con los filtros aplicados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableRows.map(({ node: route, depth, hasChildren }) => (
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
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {getAccessTypeLabelsByIds(resolveAccessTypeIds(route)).length > 0 ? (
                              getAccessTypeLabelsByIds(resolveAccessTypeIds(route)).map((label) => (
                                <Badge key={`${resolveRouteId(route)}-${label}`} variant="outline">
                                  {label}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline">-</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {getActionLabelsByIds(resolveActionIds(route)).length > 0 ? (
                              getActionLabelsByIds(resolveActionIds(route)).map((label) => (
                                <Badge key={`${resolveRouteId(route)}-accion-${label}`} variant="outline">
                                  {label}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline">-</Badge>
                            )}
                          </div>
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
                            <Button variant="ghost" size="icon" onClick={() => void handlePreviewRoute(route)} title="Previsualizar">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openRouteModal(route)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            {resolveCanManageBaja(route) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleDeleteRoute(route)}
                                title={String(route.accionBajaPermitida || '').toUpperCase() === 'ELIMINAR' ? 'Eliminar' : 'Desactivar'}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[980px]">
          <form onSubmit={(e) => void handleSubmitRoute(e)}>
            <DialogHeader>
              <DialogTitle>{editingRoute ? 'Editar Ruta' : getCreateDialogTitle()}</DialogTitle>
              <DialogDescription>
                Parametriza nodos jerarquicos (suite, modulo, formulario)
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 md:grid-cols-2">
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
                      component: isSuiteType ? toPascalCase(nextName) : prev.component,
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
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="component">Componente *</Label>
                {isSuiteType ? (
                  <Input
                    id="component"
                    value={formData.component}
                    onChange={(e) => setFormData({ ...formData, component: e.target.value })}
                    placeholder="Ej: Gobernanza"
                    required
                  />
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                      <Label htmlFor="useCustomComponent" className="cursor-pointer text-sm">
                        Usar componente personalizado
                      </Label>
                      <Switch
                        id="useCustomComponent"
                        checked={useCustomComponent}
                        onCheckedChange={(checked) => setUseCustomComponent(checked)}
                      />
                    </div>
                    <Input
                      id="component"
                      value={useCustomComponent ? String(formData.component || '') : (resolveSuiteComponentForCurrentForm() || '')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, component: e.target.value }))}
                      placeholder={useCustomComponent ? 'Ej: ParametrosAvanzados' : 'Heredado desde suite'}
                      disabled={!useCustomComponent}
                    />
                  </div>
                )}
                {!isSuiteType && (
                  <p className="text-xs text-muted-foreground">
                    Si no activas personalizado, el componente se hereda desde la suite.
                  </p>
                )}
              </div>
              {(editingRoute || !isFormularioType) ? (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="layout">Layout *</Label>
                  <Select
                    value={formData.layout}
                    onValueChange={(value) => setFormData({ ...formData, layout: value })}
                  >
                    <SelectTrigger id="layout">
                      <SelectValue placeholder="Selecciona layout" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(
                        new Set(
                          accessTypes
                            .filter((a) => a.estadoAcces !== false && a.layout)
                            .map((a) => a.layout as string)
                        )
                      ).map((layout) => (
                        <SelectItem key={layout} value={layout}>
                          {layout}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2 md:col-span-2">
                  <Label>Layout</Label>
                  <Input
                    value={(() => {
                      const selectedAtIds = Array.isArray(formData.accessType) ? formData.accessType : [];
                      const firstAt = accessTypes.find((a) => selectedAtIds.includes(String(a._id || '')));
                      if (firstAt?.layout) return firstAt.layout;
                      return routes.find((r) => resolveRouteId(r) === String(formData.padreId || ''))?.layout
                        || 'Se heredara del accessType seleccionado';
                    })()}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Para formularios, el layout es opcional y se hereda del modulo padre.
                  </p>
                </div>
              )}

              {isFormularioType && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Tipo de acceso *</Label>
                  <div className="rounded-md border p-3 flex flex-wrap gap-6">
                    {accessTypes
                      .filter((item) => item.estadoAcces !== false)
                      .map((item) => {
                      const id = String(item._id || '');
                      const selected = Array.isArray(formData.accessType) && formData.accessType.includes(id);
                      return (
                        <label key={id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData((prev) => {
                                const current = Array.isArray(prev.accessType)
                                  ? [...prev.accessType]
                                  : (prev.accessType ? [String(prev.accessType)] : []);
                                const next = checked
                                  ? [...new Set([...current, id])]
                                  : current.filter((value) => value !== id);
                                return { ...prev, accessType: next };
                              });
                            }}
                          />
                          <span>{String(item.layout || item.accessType || 'N/A')}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Puedes seleccionar uno o ambos tipos de acceso.
                  </p>
                </div>
              )}
              {(isModuloType || isFormularioType) && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="acciones">Acciones (ObjectId de acciones)</Label>
                  <div className="rounded-md border p-3 space-y-2">
                    {accionesCatalogo.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay acciones disponibles.</p>
                    ) : (
                      accionesCatalogo.map((accion) => {
                        const id = String(accion?._id || accion?.iud || '').trim();
                        const method = String(accion?.method || '').trim().toUpperCase();
                        const etiqueta = String(accion?.etiquetas || '').trim();
                        const label = etiqueta ? `${method} | ${etiqueta}` : method;
                        const selected = Array.isArray(formData.acciones)
                          ? formData.acciones.map((v) => String(v)).includes(id)
                          : String(formData.acciones || '') === id;
                        if (!id) return null;
                        return (
                          <label key={id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setFormData((prev) => {
                                  const current = Array.isArray(prev.acciones)
                                    ? [...prev.acciones.map((v) => String(v))]
                                    : (prev.acciones ? [String(prev.acciones)] : []);
                                  const next = checked
                                    ? [...new Set([...current, id])]
                                    : current.filter((value) => value !== id);
                                  return { ...prev, acciones: next };
                                });
                              }}
                            />
                            <span>{label}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecciona una o varias acciones. Se enviara como array de ObjectId.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between rounded-md border px-3 py-2 md:col-span-2">
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

      <Dialog
        open={isAccessTypeModalOpen}
        onOpenChange={(open) => {
          setIsAccessTypeModalOpen(open);
          if (!open) resetAccessTypeForm();
        }}
      >
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Parametrizacion de Tipos de Acceso</DialogTitle>
            <DialogDescription>
              Crea, modifica y desactiva los tipos de acceso disponibles para rutas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => void handleSubmitAccessType(e)} className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>Tipo de acceso</Label>
              <Input
                value={accessTypeForm.accessType}
                onChange={(e) => setAccessTypeForm((prev) => ({ ...prev, accessType: e.target.value }))}
                placeholder="PUBLIC o PRIVATE"
              />
            </div>
            <div className="space-y-2">
              <Label>Layout</Label>
              <Input
                value={accessTypeForm.layout}
                onChange={(e) => setAccessTypeForm((prev) => ({ ...prev, layout: e.target.value.toUpperCase() }))}
                placeholder="Ej: AUTHLAYOUT"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              {editingAccessTypeId ? (
                <Button type="button" variant="outline" onClick={resetAccessTypeForm} disabled={accessTypeSubmitting}>
                  Cancelar edicion
                </Button>
              ) : null}
              <Button type="submit" disabled={accessTypeSubmitting}>
                {accessTypeSubmitting
                  ? 'Guardando...'
                  : editingAccessTypeId
                    ? 'Actualizar'
                    : 'Crear'}
              </Button>
            </div>
          </form>

          <div className="rounded-md border max-h-[300px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Layouts</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessTypes.map((item) => {
                  const id = String(item?._id || '');
                  const active = item?.estadoAcces !== false;
                  return (
                    <TableRow key={id}>
                      <TableCell>{String(item?.accessType || '-')}</TableCell>
                      <TableCell>
                        {item?.layout
                          ? <Badge variant="secondary" className="text-xs">{item.layout}</Badge>
                          : <span className="text-muted-foreground text-xs">—</span>
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={active ? 'outline' : 'secondary'}>
                          {active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditAccessType(item)}
                            disabled={!active}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleDeactivateAccessType(id)}
                            disabled={!active}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
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
