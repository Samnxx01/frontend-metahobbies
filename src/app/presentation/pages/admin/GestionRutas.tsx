import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  getAllRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  toggleRouteStatus,
  getTiposNodoRuta,
  getTiposNodoRutaOpciones,
  getPerfilesCorporativosParaCodigo,
  getTiposNodoCodigos,
  getCatalogoCodigos,
  createCatalogoCodigo,
  getAccessTypes,
  getAccionesCatalogo,
  createAccessType,
  updateAccessType,
  deactivateAccessType,
  createTipoNodoRuta,
  updateTipoNodoRuta,
  deleteTipoNodoRuta,
  deleteCatalogoCodigo,
  migrarTipoNodoRutas,
  type MigracionTipoNodoResult,
  previewRoute,
  type Route,
  type CreateRouteDto,
  type TipoNodoRuta,
  type AccessTypeOption,
  type AccionOption,
  type PerfilCorporativoItem,
  type CatalogoCodigoItem,
  type CodigoNodoItem,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronDown, ChevronRight, Edit, Eye, Loader2, Network, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { apiFetch } from '@/app/services/api';

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
  codigoCatalogoId: string;
  codigo: string;
  nombre: string;
  descripcion: string;
}

interface AccessTypeFormState {
  accessType: string;
  layout: string;
}

interface SubFormFormState {
  name: string;
  padreId: string;
  tipoNodoId: string;
  component: string;
  path: string;
  accessType: string[];
  acciones: string[];
}

interface NodeTypeCodeOption {
  iud: string;
  codigo: string;
  source: 'catalogo' | 'codigoNodo';
  tenantCorporativoId?: string | null;
  perfilCorporativoId?: string | null;
}

export default function GestionRutas(): React.ReactElement {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [nodeTypes, setNodeTypes] = useState<TipoNodoRuta[]>([]);
  const [subFormCodeOptions, setSubFormCodeOptions] = useState<TipoNodoRuta[]>([]);
  const [accessTypes, setAccessTypes] = useState<AccessTypeOption[]>([]);
  const [accionesCatalogo, setAccionesCatalogo] = useState<AccionOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isTreeModalOpen, setIsTreeModalOpen] = useState<boolean>(false);
  const [isNodeTypeModalOpen, setIsNodeTypeModalOpen] = useState<boolean>(false);
  const [isNodeTypeCodeModalOpen, setIsNodeTypeCodeModalOpen] = useState<boolean>(false);
  const [isAccessTypeModalOpen, setIsAccessTypeModalOpen] = useState<boolean>(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [nodeTypeSubmitting, setNodeTypeSubmitting] = useState<boolean>(false);
  const [savingNodeTypeCode, setSavingNodeTypeCode] = useState<boolean>(false);
  const [accessTypeSubmitting, setAccessTypeSubmitting] = useState<boolean>(false);
  const [editingAccessTypeId, setEditingAccessTypeId] = useState<string>('');
  const [creationType, setCreationType] = useState<NodeTypeRef>('');
  const [selectedSuiteIdForForm, setSelectedSuiteIdForForm] = useState<string>('');
  const [expandedTableNodes, setExpandedTableNodes] = useState<Record<string, boolean>>({});
  const [nameFilter, setNameFilter] = useState<string>('');
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string>('ALL');
  const [parentSelectSearch, setParentSelectSearch] = useState<string>('');
  const [subFormParentSearch, setSubFormParentSearch] = useState<string>('');
  const [routesActorTipo, setRoutesActorTipo] = useState<string>('UNKNOWN');
  const [routesSourceCollection, setRoutesSourceCollection] = useState<string>('');
  const [formularioPadreId, setFormularioPadreId] = useState<string>('');
  const [isSubFormModalOpen, setIsSubFormModalOpen] = useState<boolean>(false);
  const [subFormSubmitting, setSubFormSubmitting] = useState<boolean>(false);
  const [nodeTypeToDelete, setNodeTypeToDelete] = useState<string>('');
  const [catalogoCodigoToDelete, setCatalogoCodigoToDelete] = useState<string>('');
  const [deletingCatalogoCodigo, setDeletingCatalogoCodigo] = useState<boolean>(false);
  const [migratingNodeTypes, setMigratingNodeTypes] = useState<boolean>(false);
  const [migracionResult, setMigracionResult] = useState<MigracionTipoNodoResult | null>(null);

  // Modal edición de usuarios
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [usuarioSearch, setUsuarioSearch] = useState('');
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userEditForm, setUserEditForm] = useState({ correo: '', password: '', rol: '' });
  const [userEditSaving, setUserEditSaving] = useState(false);
  const [subFormData, setSubFormData] = useState<SubFormFormState>({
    name: '',
    padreId: '',
    tipoNodoId: '',
    component: '',
    path: '',
    accessType: [],
    acciones: [],
  });

  const [nodeTypeForm, setNodeTypeForm] = useState<NodeTypeFormState>({
    codigoCatalogoId: '',
    codigo: '',
    nombre: '',
    descripcion: '',
  });
  const [nodeTypeCodeTouched, setNodeTypeCodeTouched] = useState<boolean>(false);
  const [nodeTypeCodeDraft, setNodeTypeCodeDraft] = useState<string>('');
  const [savedNodeTypeCode, setSavedNodeTypeCode] = useState<NodeTypeCodeOption | null>(null);
  const [editingNodeTypeId, setEditingNodeTypeId] = useState<string | null>(null);
  const [editingNodeTypeOrder, setEditingNodeTypeOrder] = useState<number>(0);
  const [perfilesCorporativos, setPerfilesCorporativos] = useState<PerfilCorporativoItem[]>([]);
  const [loadingPerfilesCorporativos, setLoadingPerfilesCorporativos] = useState<boolean>(false);
  const [selectedPerfilCorporativoId, setSelectedPerfilCorporativoId] = useState<string>('');
  const [catalogoCodigoOptions, setCatalogoCodigoOptions] = useState<NodeTypeCodeOption[]>([]);
const [loadingCatalogoCodigo, setLoadingCatalogoCodigo] = useState<boolean>(false);
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
    mostrarEnNavbarPublico: false,
    mostrarEnSidebar: false,
    mostrarEnMenuUsuario: false,
    tiquetaNavb: null,
    menuUsuarioLabel: '',
    menuUsuarioOrder: 0,
    accessType: [],
    acciones: [],
  });

  useEffect(() => {
    void Promise.all([loadRoutes(), loadNodeTypes(), loadSubFormCodeOptions(), loadAccessTypes(), loadAccionesCatalogo()]);
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
  const getRouteIdentitySet = (route?: Route | null): Set<string> => {
    const values = [
      String(route?._id || '').trim(),
      String(route?.iud || '').trim(),
      resolveRouteId(route as Route),
    ].filter(Boolean);
    return new Set(values);
  };
  const findRouteByAnyId = (id: string | null | undefined): Route | undefined => {
    const normalized = String(id || '').trim();
    if (!normalized) return undefined;
    return routes.find((route) => getRouteIdentitySet(route).has(normalized));
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
  const subFormularioType = nodeTypes.find((t) => Number(t.order) === 4)
    || getTypeByName('SUBFORMULARIO')
    || getTypeByCode('SUBFORMULARIO');

  const selectedTypeDoc = getTypeById(String(formData.tipoNodoId || creationType || ''))
    || getTypeByCode(String(formData.tipoNodo || ''));
  const selectedTypeOrder = Number(selectedTypeDoc?.order ?? 0);
  const suiteOrder = Number(suiteType?.order ?? 1);

  const formularioOrder = Number(formularioType?.order ?? 3);
  const isSuiteType = selectedTypeOrder === Number(suiteType?.order ?? 1);
  const isModuloType = selectedTypeOrder === Number(moduloType?.order ?? 2);
  const isFormularioType = selectedTypeOrder === Number(formularioType?.order ?? 3);
  const isSubFormularioType = selectedTypeOrder === Number(subFormularioType?.order ?? 4);

  const getCreateDialogTitle = (): string => {
    if (!selectedTypeDoc) return 'Nueva Ruta';
    if (isSuiteType) return 'Nueva Suite';
    if (isModuloType) return 'Nuevo Modulo';
    if (isFormularioType) return 'Nuevo Formulario';
    if (isSubFormularioType) return 'Nuevo SubFormulario';
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

  const normalizePath = (value: string): string => {
    if (!value) return '';
    const clean = value.trim().replace(/\/+/g, '/');
    return clean.startsWith('/') ? clean : `/${clean}`;
  };

  const normalizeNodeTypeCode = (value: string): string =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^A-Z0-9 -]/g, '');

  const nextNodeTypeOrder = useMemo(
    () => nodeTypes.reduce((max, item) => Math.max(max, Number(item?.order ?? 0)), 0) + 1,
    [nodeTypes]
  );

  const nodeTypeCodePreview = normalizeNodeTypeCode(nodeTypeForm.codigo || nodeTypeForm.nombre);
  const nodeTypeCodeExists = nodeTypes.some(
    (item) =>
      String(item?.codigo || '').trim().toUpperCase() === nodeTypeCodePreview &&
      Number(item?.order ?? 0) === (editingNodeTypeId ? editingNodeTypeOrder : nextNodeTypeOrder)
  );
  const orderFourNodeTypes = useMemo(
    () => subFormCodeOptions.filter((t) => t.estado !== false && Number(t.order ?? 0) === 4),
    [subFormCodeOptions]
  );
  const nodeTypeRowsByFilteredCode = useMemo(
    () => [...nodeTypes].sort((a, b) => Number(a?.order ?? 0) - Number(b?.order ?? 0)),
    [nodeTypes]
  );
  const getNodeTypeHierarchyByCode = (item: TipoNodoRuta): string => {
    const currentOrder = Number(item?.order ?? 0);
    return nodeTypeRowsByFilteredCode
      .filter((row) => Number(row?.order ?? 0) <= currentOrder)
      .sort((a, b) => Number(a?.order ?? 0) - Number(b?.order ?? 0))
      .map((row) => String(row?.nombre || row?.codigo || '').trim())
      .filter(Boolean)
      .join(' > ');
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

  const resolveHierarchyPathForDraft = (
    name: string,
    parentId: string | null | undefined,
    nodeOrder: number,
    fallbackPath = ''
  ): string => {
    if (nodeOrder <= suiteOrder) {
      return fallbackPath ? normalizePath(fallbackPath) : buildPathByContext(name, null, nodeOrder);
    }

    const derived = buildPathByContext(name, parentId, nodeOrder);
    return derived || '';
  };

  const resolveTypeIdForRoute = (route: Route): string => {
    const routeTypeId = String((route as any)?.tipoNodoId?._id || (route as any)?.tipoNodoId?.iud || route?.tipoNodoId || '').trim();
    if (routeTypeId && getTypeById(routeTypeId)) return routeTypeId;
    const byCode = getTypeByCode(String(route?.tipoNodo || ''));
    return String(byCode ? resolveNodeTypeId(byCode) : '');
  };

  const getRouteType = (route: Route): string => {
    const byId = getTypeById(resolveTypeIdForRoute(route));
    if (byId?.nombre) return String(byId.nombre);
    if (byId?.codigo) return String(byId.codigo);
    const populatedTipo = (route as any)?.tipoNodoId;
    if (populatedTipo?.nombre) return String(populatedTipo.nombre);
    if (populatedTipo?.codigo) return String(populatedTipo.codigo);
    return String(route?.tipoNodo || '-');
  };

  const getRouteTypeOrder = (route: Route): number => {
    const byId = getTypeById(resolveTypeIdForRoute(route));
    if (byId) return Number(byId.order ?? 0);
    return getTypeOrderByCode(String(route?.tipoNodo || ''));
  };
  const isFormularioRoute = (route: Route): boolean => {
    const ownOrder = getRouteTypeOrder(route);
    if (ownOrder === formularioOrder) return true;

    const ownTypeText = String(route?.tipoNodo || route?.tipoNodoId?.codigo || '').trim().toUpperCase();
    if (ownTypeText === 'FORMULARIO') return true;

    const parentId = resolveParentId(route);
    if (!parentId) return false;

    const parentRoute = findRouteByAnyId(parentId);
    if (!parentRoute) return false;

    const parentOrder = getRouteTypeOrder(parentRoute);
    const parentTypeText = String(parentRoute?.tipoNodo || parentRoute?.tipoNodoId?.codigo || '').trim().toUpperCase();
    if (parentOrder === Number(moduloType?.order ?? 2) || parentTypeText === 'MODULO') return true;

    // Fallback para datos inconsistentes: si el nodo tiene padre y abuelo, y el abuelo luce como suite,
    // tratar este nodo como formulario aunque su tipo no haya quedado perfectamente normalizado.
    const grandParentRoute = findRouteByAnyId(resolveParentId(parentRoute));
    if (!grandParentRoute) return false;
    const grandParentOrder = getRouteTypeOrder(grandParentRoute);
    const grandParentTypeText = String(
      grandParentRoute?.tipoNodo || grandParentRoute?.tipoNodoId?.codigo || ''
    ).trim().toUpperCase();
    return grandParentOrder === Number(suiteType?.order ?? 1) || grandParentTypeText === 'SUITE';
  };
  const subFormParentOptions = useMemo(
    () =>
      routes.filter((route) => {
        if (route?.estadoRuta === false) return false;
        return isFormularioRoute(route);
      }),
    [routes, formularioOrder, moduloType]
  );

  const getRouteNameById = (id: string | null | undefined): string => {
    if (!id) return '-';
    const found = findRouteByAnyId(String(id));
    return found?.name || '-';
  };

  const getRouteHierarchyLabel = (route: Route): string => {
    const hierarchyNames: string[] = [];
    let current: Route | undefined = route;
    let safety = 0;

    while (current && safety < 10) {
      hierarchyNames.unshift(String(current.name || '').trim() || 'Sin nombre');
      const parentId = resolveParentId(current);
      if (!parentId) break;
      current = findRouteByAnyId(parentId);
      safety += 1;
    }

    return hierarchyNames.join(' > ');
  };

  const matchesRouteSearch = (route: Route, search: string): boolean => {
    const normalizedSearch = String(search || '').trim().toLowerCase();
    if (!normalizedSearch) return true;

    const searchableText = [
      getRouteHierarchyLabel(route),
      route.name,
      route.path,
      route.component,
      route.layout,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedSearch);
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

    const actorTipo = String(routesActorTipo || '').trim().toUpperCase();
    if (actorTipo === 'SUPERADMIN' || actorTipo === 'GLOBAL') return true;
    return false;
  };

  const resolveCanEditRoute = (route: Route): boolean => {
    const raw = (route as any)?.puedeEditar;
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'number') return raw === 1;
    if (typeof raw === 'string') {
      const normalized = raw.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0') return false;
    }

    return String(routesActorTipo || '').trim().toUpperCase() !== 'CORPORATIVO';
  };

  const resolveCanToggleRouteStatus = (route: Route): boolean => {
    const raw = (route as any)?.puedeCambiarEstado;
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'number') return raw === 1;
    if (typeof raw === 'string') {
      const normalized = raw.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0') return false;
    }

    return String(routesActorTipo || '').trim().toUpperCase() !== 'CORPORATIVO';
  };

  const routesScopeSummary = useMemo(() => {
    const actor = String(routesActorTipo || '').trim().toUpperCase();
    const source = String(routesSourceCollection || '').trim();
    if (actor === 'SUPERADMIN') {
      return 'Scope activo: tenantSuperAdmin. El datatable se renderiza desde rutasSeguridad.';
    }
    if (actor === 'GLOBAL') {
      return `Scope activo: tenantGlobal. El datatable se renderiza por herenciaGlobal${source ? ` (${source})` : ''}.`;
    }
    if (actor === 'CORPORATIVO') {
      return `Scope activo: tenantCorporativo. El datatable se renderiza por herenciaCorporativa${source ? ` (${source})` : ''}.`;
    }
    if (source) {
      return `Fuente de rutas actual: ${source}.`;
    }
    return '';
  }, [routesActorTipo, routesSourceCollection]);

  const filteredNodeTypeCodeOptions = useMemo(() => {
    if (!selectedPerfilCorporativoId) return catalogoCodigoOptions;
    return catalogoCodigoOptions.filter((item) => {
      if (item.source === 'catalogo') return true;
      return String(item.perfilCorporativoId || '') === String(selectedPerfilCorporativoId || '');
    });
  }, [catalogoCodigoOptions, selectedPerfilCorporativoId]);

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
  const suiteOptions = useMemo(
    () => routes.filter((route) => getRouteTypeOrder(route) === Number(suiteType?.order ?? 1)),
    [routes, nodeTypes]
  );

  const moduloOptionsBySuite = useMemo(
    () => routes.filter((route) => {
      if (!selectedSuiteIdForForm) return false;
      const editingId = editingRoute ? resolveRouteId(editingRoute) : '';
      if (editingId && resolveRouteId(route) === editingId) return false;
      const selectedSuite = findRouteByAnyId(selectedSuiteIdForForm);
      if (!selectedSuite) return false;
      const selectedSuiteIds = getRouteIdentitySet(selectedSuite);
      const parentRoute = findRouteByAnyId(resolveParentId(route));
      if (!parentRoute) return false;
      const parentMatchesSuite = Array.from(getRouteIdentitySet(parentRoute)).some((id) => selectedSuiteIds.has(id));
      if (!parentMatchesSuite) return false;

      const ownOrder = getRouteTypeOrder(route);
      const ownTypeText = String(route?.tipoNodo || route?.tipoNodoId?.codigo || '').trim().toUpperCase();

      if (ownOrder === Number(moduloType?.order ?? 2)) return true;
      if (ownTypeText === 'MODULO') return true;

      // Fallback para datos viejos/inconsistentes:
      // si cuelga directo de la suite seleccionada, permitirlo como candidato a modulo.
      return true;
    }),
    [routes, selectedSuiteIdForForm, nodeTypes, editingRoute]
  );

  const parentOptionsForSelectedType = useMemo(() => {
    if (isFormularioType) return moduloOptionsBySuite;
    if (isSubFormularioType) return subFormParentOptions;
    return getParentOptions(String(formData.tipoNodoId || ''));
  }, [
    formData.tipoNodoId,
    isFormularioType,
    isSubFormularioType,
    moduloOptionsBySuite,
    subFormParentOptions,
    routes,
    nodeTypes,
    editingRoute,
  ]);

  const filteredParentOptionsForSelectedType = useMemo(
    () => parentOptionsForSelectedType.filter((route) => matchesRouteSearch(route, parentSelectSearch)),
    [parentOptionsForSelectedType, parentSelectSearch]
  );

  const filteredSubFormParentOptions = useMemo(
    () => subFormParentOptions.filter((route) => matchesRouteSearch(route, subFormParentSearch)),
    [subFormParentOptions, subFormParentSearch]
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

    if (!isFiltering) {
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
    }

    // Cuando hay filtro: marcar todos los nodos que hacen match O tienen un descendiente que hace match
    // Así se muestra la jerarquía completa (ancestros incluidos)
    const includedIds = new Set<string>();
    const markIncluded = (nodes: RouteTreeNode[]): boolean => {
      let anyIncluded = false;
      for (const node of nodes) {
        const matchesName = !isNameFiltering || String(node.name || '').toLowerCase().includes(normalizedFilter);
        const routeTypeName = String(getRouteType(node as Route) || '').toUpperCase();
        const matchesType = !isTypeFiltering || routeTypeName === normalizedTypeFilter;
        const selfMatches = matchesName && matchesType;
        const childrenIncluded = node.children.length > 0 && markIncluded(node.children);
        if (selfMatches || childrenIncluded) {
          includedIds.add(node.id);
          anyIncluded = true;
        }
      }
      return anyIncluded;
    };
    markIncluded(tableTreeNodes);

    const walk = (nodes: RouteTreeNode[], depth = 0): void => {
      for (const node of nodes) {
        if (!includedIds.has(node.id)) continue;
        const hasChildren = node.children.length > 0;
        rows.push({ node, depth, hasChildren });
        if (hasChildren) {
          walk(node.children, depth + 1);
        }
      }
    };
    walk(tableTreeNodes);
    return rows;
  }, [tableTreeNodes, expandedTableNodes, nameFilter, nodeTypeFilter, nodeTypes]);

  const toggleTableNode = (id: string): void => {
    setExpandedTableNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openUserModal = async (): Promise<void> => {
    setIsUserModalOpen(true);
    setUsuarioSearch('');
    setEditingUser(null);
    if (usuarios.length) return;
    setUsuariosLoading(true);
    try {
      const res = await apiFetch('/api/registro/listarRegistro', { method: 'GET' });
      const list = (res as any)?.data ?? (res as any)?.usuarios ?? (Array.isArray(res) ? res : []);
      setUsuarios(list);
    } catch {
      toast.error('Error cargando usuarios');
    } finally {
      setUsuariosLoading(false);
    }
  };

  const openEditUser = (u: any): void => {
    setEditingUser(u);
    setUserEditForm({
      correo: String(u?.correo || u?.email || ''),
      password: '',
      rol: String(u?.rol || ''),
    });
  };

  const handleSaveUser = async (): Promise<void> => {
    if (!editingUser) return;
    const id = String(editingUser?._id || editingUser?.iud || editingUser?.id || '');
    if (!id) { toast.error('Sin ID de usuario'); return; }
    const body: Record<string, string> = {};
    if (userEditForm.correo) body.correo = userEditForm.correo;
    if (userEditForm.password) body.password = userEditForm.password;
    if (userEditForm.rol) body.rol = userEditForm.rol;
    setUserEditSaving(true);
    try {
      await apiFetch(`/api/seguridad/pruebas/actualizar/registro/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      toast.success('Usuario actualizado');
      setUsuarios((prev) => prev.map((u) => {
        const uid = String(u?._id || u?.iud || u?.id || '');
        return uid === id ? { ...u, ...body } : u;
      }));
      setEditingUser(null);
    } catch (e: any) {
      toast.error(String(e?.message || 'Error al actualizar'));
    } finally {
      setUserEditSaving(false);
    }
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
        setRoutes(Array.isArray(response.data) ? response.data : []);
        setRoutesActorTipo(String(response.actorTipo || 'UNKNOWN'));
        setRoutesSourceCollection(String(response.sourceCollection || ''));
      } else {
        toast.error('Error loading routes');
      }
    } catch (error) {
      console.error('Error loading routes:', error);
      setRoutesActorTipo('UNKNOWN');
      setRoutesSourceCollection('');
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

  const loadSubFormCodeOptions = async (): Promise<void> => {
    try {
      const response = await getTiposNodoRutaOpciones(4);
      if (response.success) {
        setSubFormCodeOptions(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error loading subform code options:', error);
      setSubFormCodeOptions([]);
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
      mostrarEnNavbarPublico: false,
      mostrarEnSidebar: false,
      mostrarEnMenuUsuario: false,
      tiquetaNavb: null,
      menuUsuarioLabel: '',
      menuUsuarioOrder: 0,
      accessType: [],
      acciones: [],
    });
  };

  const openRouteModal = (route?: Route, forceTypeId?: string): void => {
    setParentSelectSearch('');
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
      } else if (routeTypeOrder === Number(subFormularioType?.order ?? 4)) {
        const formulario = routes.find((r) => resolveRouteId(r) === String(routeParentId || ''));
        const modulo = routes.find((r) => resolveRouteId(r) === String(resolveParentId(formulario as Route) || ''));
        suiteForForm = resolveParentId(modulo as Route) || '';
      }
      setSelectedSuiteIdForForm(suiteForForm);
      setEditingRoute(route);
      setFormData({
        name: route.name,
        path: resolveHierarchyPathForDraft(route.name, resolveParentId(route), routeTypeOrder, route.path),
        component: route.component,
        layout: route.layout,
        tipoNodo: String(getTypeById(routeTypeId)?.codigo || route.tipoNodo || ''),
        tipoNodoId: routeTypeId,
        padreId: resolveParentId(route),
        heredaDeRuta: resolveInheritedRouteId(route),
        mostrarEnNavbarPublico: route?.mostrarEnNavbarPublico === true,
        mostrarEnSidebar: route?.mostrarEnSidebar === true,
        mostrarEnMenuUsuario: route?.mostrarEnMenuUsuario === true,
        tiquetaNavb: route?.tiquetaNavb || null,
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
      resetRouteForm(typeId);
    }
    setIsModalOpen(true);
  };

  const closeRouteModal = (): void => {
    setIsModalOpen(false);
    setEditingRoute(null);
    setSelectedSuiteIdForForm('');
    setFormularioPadreId('');
    setParentSelectSearch('');
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

    const selectedAccessTypeIds = Array.isArray(formData.accessType)
      ? formData.accessType.filter(Boolean)
      : (formData.accessType ? [String(formData.accessType)] : []);
    const selectedAccionesIds = Array.isArray(formData.acciones)
      ? formData.acciones.filter(Boolean)
      : (formData.acciones ? [String(formData.acciones)] : []);
    const normalizedComponent = String(formData.component || '').trim();

    if (isFormularioType && selectedAccessTypeIds.length === 0) {
      toast.error('Selecciona al menos un tipo de acceso para el formulario');
      return;
    }

    if ((isFormularioType || isSubFormularioType) && selectedAccionesIds.length === 0) {
      toast.error('Selecciona al menos una acción HTTP para este tipo de nodo');
      return;
    }
    if ((isFormularioType || isSubFormularioType) && !normalizedComponent) {
      toast.error('El componente es obligatorio para formulario y subformulario');
      return;
    }

    try {
      setSubmitting(true);

      const parentRoute = routes.find(
        (r) => resolveRouteId(r) === String(formData.padreId || '')
      );

      const resolvedLayout = (() => {
        const selectedAtIds = Array.isArray(formData.accessType) ? formData.accessType : [];
        const firstAt = accessTypes.find((a) => selectedAtIds.includes(String(a._id || '')));
        if (firstAt?.layout) return firstAt.layout;
        return parentRoute?.layout || formData.layout || '';
      })();

      const payload: CreateRouteDto = {
        ...formData,
        path: normalizePath(formData.path || ''),
        component: (isFormularioType || isSubFormularioType) ? normalizedComponent : undefined,
        layout: resolvedLayout,
        tipoNodo: String(selectedTypeDoc.codigo || ''),
        tipoNodoId: resolveNodeTypeId(selectedTypeDoc),
        padreId: selectedTypeOrder <= 1
          ? null
          : (isFormularioType && formularioPadreId ? formularioPadreId : formData.padreId || null),
        heredaDeRuta: formData.heredaDeRuta || null,
        mostrarEnMenuUsuario: formData.mostrarEnMenuUsuario === true,
        tiquetaNavb: formData.mostrarEnMenuUsuario === true ? (formData.tiquetaNavb || null) : null,
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

      if (isSuiteType) {
        // Suite: sin acciones ni accessType
        delete (payload as any).accessType;
        delete (payload as any).acciones;
      }
      if (isModuloType) {
        // Modulo: sin acciones ni accessType (hereda de Suite en render)
        delete (payload as any).accessType;
        delete (payload as any).acciones;
      }
      if (isFormularioType) {
        // Formulario: accessType + acciones requeridos
        payload.accessType = selectedAccessTypeIds;
        payload.acciones = selectedAccionesIds;
      }
      if (isSubFormularioType) {
        // SubFormulario: acciones requeridas y accessType opcional/multiple
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
    const actorTipo = String(routesActorTipo || '').trim().toUpperCase();
    let accionSeleccionada: 'ELIMINAR' | 'DESACTIVAR' | null = null;

    if (actorTipo === 'SUPERADMIN') {
      const result = await swalFire({
        title: 'Gestionar baja de ruta',
        text: `Selecciona si deseas desactivar o eliminar la ruta "${route.name}".`,
        icon: 'warning',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Eliminar',
        denyButtonText: 'Desactivar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc2626',
        denyButtonColor: '#2563eb',
      });

      if (result.isConfirmed) accionSeleccionada = 'ELIMINAR';
      if (result.isDenied) accionSeleccionada = 'DESACTIVAR';
      if (!accionSeleccionada) return;
    } else if (actorTipo === 'GLOBAL') {
      const result = await swalFire({
        title: 'Desactivar ruta',
        text: `La ruta "${route.name}" sera desactivada.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Desactivar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2563eb',
      });

      if (!result.isConfirmed) return;
      accionSeleccionada = 'DESACTIVAR';
    } else {
      return;
    }

    try {
      const response = await deleteRoute(resolveRouteId(route), { accion: accionSeleccionada });
      toast.success(response?.message || 'Action completed successfully');
      await loadRoutes();
      notifyRoutesUpdated();
    } catch (error: any) {
      console.error('Error deleting route:', error);
      const fallbackMessage = accionSeleccionada === 'ELIMINAR' ? 'Error deleting route' : 'Error deactivating route';
      toast.error(error?.message || fallbackMessage);
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

  const resetNodeTypeForm = (): void => {
    setNodeTypeForm({ codigoCatalogoId: '', codigo: '', nombre: '', descripcion: '' });
    setNodeTypeCodeTouched(false);
    setNodeTypeCodeDraft('');
    setEditingNodeTypeId(null);
    setEditingNodeTypeOrder(0);
  };

  const startEditNodeType = (item: TipoNodoRuta): void => {
    setEditingNodeTypeId(resolveNodeTypeId(item));
    setEditingNodeTypeOrder(Number(item.order ?? 0));
    setNodeTypeForm({
      codigoCatalogoId: item.codigoCatalogoId || '',
      codigo: item.codigo || '',
      nombre: item.nombre || '',
      descripcion: item.descripcion || '',
    });
    setNodeTypeCodeTouched(true);
  };

  const handleCreateNodeType = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const codigoNormalizado = normalizeNodeTypeCode(nodeTypeForm.codigo || nodeTypeForm.nombre);

    if (!codigoNormalizado || !nodeTypeForm.nombre.trim()) {
      toast.error('Codigo y nombre son obligatorios');
      return;
    }

    try {
      setNodeTypeSubmitting(true);

      if (editingNodeTypeId) {
        await updateTipoNodoRuta(editingNodeTypeId, {
          codigo: codigoNormalizado,
          codigoCatalogoId: nodeTypeForm.codigoCatalogoId || null,
          nombre: nodeTypeForm.nombre.trim(),
          descripcion: nodeTypeForm.descripcion.trim(),
          order: editingNodeTypeOrder,
        });
        toast.success('Tipo de nodo actualizado correctamente');
        resetNodeTypeForm();
      } else {
        if (nodeTypeCodeExists) {
          toast.error('Ya existe un tipo de nodo con ese codigo');
          return;
        }
        await createTipoNodoRuta({
          codigo: codigoNormalizado,
          codigoCatalogoId: nodeTypeCodeTouched ? nodeTypeForm.codigoCatalogoId || undefined : undefined,
          nombre: nodeTypeForm.nombre.trim(),
          descripcion: nodeTypeForm.descripcion.trim(),
          order: nextNodeTypeOrder,
          estado: true,
        });
        toast.success('Creacion exitosa de jerarquia');
        resetNodeTypeForm();
      }

      await loadNodeTypes();
      await loadSubFormCodeOptions();
    } catch (error: any) {
      console.error('Error saving node type:', error);
      toast.error(error?.message || 'Error al guardar tipo de nodo');
    } finally {
      setNodeTypeSubmitting(false);
    }
  };

  const handleDeactivateNodeType = (id: string): void => {
    setNodeTypeToDelete(id);
  };

  const confirmDeleteNodeType = async (): Promise<void> => {
    const id = nodeTypeToDelete;
    setNodeTypeToDelete('');
    try {
      const res = await deleteTipoNodoRuta(id);
      const msg = (res as any)?.accion === 'eliminado'
        ? 'Tipo de nodo eliminado correctamente.'
        : 'Tipo de nodo desactivado correctamente.';
      toast.success(msg);
      await loadNodeTypes();
      await loadSubFormCodeOptions();
    } catch (error: any) {
      console.error('Error gestionando tipo de nodo:', error);
      toast.error(error?.message || 'Error al gestionar tipo de nodo');
    }
  };

  const confirmDeleteCatalogoCodigo = async (): Promise<void> => {
    const id = catalogoCodigoToDelete;
    setCatalogoCodigoToDelete('');
    setDeletingCatalogoCodigo(true);
    try {
      const res = await deleteCatalogoCodigo(id);
      const msg = res?.accion === 'eliminado'
        ? 'Codigo eliminado del catalogo.'
        : 'Codigo desactivado del catalogo.';
      toast.success(msg);
      setNodeTypeForm((prev) => ({ ...prev, codigoCatalogoId: '', codigo: '' }));
      setNodeTypeCodeTouched(false);
    } catch (error: any) {
      toast.error(error?.message || 'Error al gestionar codigo del catalogo');
    } finally {
      setDeletingCatalogoCodigo(false);
    }
  };

  const handleMigrarTipoNodoRutas = async (): Promise<void> => {
    setMigratingNodeTypes(true);
    try {
      const res = await migrarTipoNodoRutas();
      setMigracionResult(res);
    } catch (error: any) {
      toast.error(error?.message || 'Error al ejecutar migración');
    } finally {
      setMigratingNodeTypes(false);
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

  // ── SubFormulario modal (independiente) ──────────────────────────────────────

  const resetSubFormData = (): void => {
    setSubFormData({ name: '', padreId: '', tipoNodoId: '', component: '', path: '', accessType: [], acciones: [] });
  };

  const openNodeTypeCodeModal = (): void => {
    setNodeTypeCodeDraft(nodeTypeForm.codigo || normalizeNodeTypeCode(nodeTypeForm.nombre));
    setSavedNodeTypeCode(
      nodeTypeForm.codigoCatalogoId && nodeTypeForm.codigo
        ? { iud: nodeTypeForm.codigoCatalogoId, codigo: nodeTypeForm.codigo, source: 'catalogo' }
        : null
    );
    setSelectedPerfilCorporativoId('');
    setCatalogoCodigoOptions([]);
    setIsNodeTypeCodeModalOpen(true);

    // Cargar perfiles y catálogo de codigos del padre
    setLoadingPerfilesCorporativos(true);
    setLoadingCatalogoCodigo(true);
    const currentSaved = nodeTypeForm.codigoCatalogoId && nodeTypeForm.codigo
      ? { iud: nodeTypeForm.codigoCatalogoId, codigo: nodeTypeForm.codigo, source: 'catalogo' as const }
      : null;

    Promise.all([
      getPerfilesCorporativosParaCodigo().catch(() => ({ data: [] as PerfilCorporativoItem[] })),
      getCatalogoCodigos().catch((err: any) => {
        toast.error(err?.message || 'Error al cargar codigos del catalogo');
        return { data: [] as CatalogoCodigoItem[] };
      }),
      getTiposNodoCodigos().catch(() => ({ data: [] as CodigoNodoItem[] })),
    ]).then(([perfilesRes, catalogoRes, codigosRes]) => {
      setPerfilesCorporativos(perfilesRes?.data ?? []);
      const catalogo = (catalogoRes?.data ?? []).map((item) => ({
        iud: item.iud,
        codigo: item.codigo,
        source: 'catalogo' as const,
        tenantCorporativoId: null,
        perfilCorporativoId: null,
      }));
      const codigosCorporativos = (codigosRes?.data ?? []).map((item) => ({
        iud: item.iud,
        codigo: item.codigo,
        source: 'codigoNodo' as const,
        tenantCorporativoId: item.tenantCorporativoId || null,
        perfilCorporativoId: item.perfilCorporativoId || null,
      }));
      const catalogoUnificado = [...catalogo, ...codigosCorporativos];
      setCatalogoCodigoOptions(catalogoUnificado);
      const savedSigueDisponible = currentSaved
        ? catalogoUnificado.some((item) => item.iud === currentSaved.iud && item.source === currentSaved.source)
        : false;
      if (currentSaved && !savedSigueDisponible) {
        setSavedNodeTypeCode(null);
        setNodeTypeCodeDraft('');
      }
      if (!currentSaved && catalogoUnificado.length > 0) {
        setSavedNodeTypeCode(catalogoUnificado[0]);
        setNodeTypeCodeDraft(catalogoUnificado[0].codigo);
      }
    }).finally(() => {
      setLoadingPerfilesCorporativos(false);
      setLoadingCatalogoCodigo(false);
    });
  };

  const saveNodeTypeCode = async (): Promise<void> => {
    const codigo = normalizeNodeTypeCode(nodeTypeCodeDraft);
    if (!codigo) {
      toast.error('El codigo es obligatorio');
      return;
    }

    try {
      setSavingNodeTypeCode(true);
      const response = await createCatalogoCodigo({
        codigo,
        tipoNodoRutaId: editingNodeTypeId || undefined,
      });
      const nuevo: CatalogoCodigoItem = response.data;
      setSavedNodeTypeCode({ iud: nuevo.iud, codigo: nuevo.codigo });
      setNodeTypeCodeDraft(nuevo.codigo);
      setCatalogoCodigoOptions((prev) => {
        const existe = prev.find((c) => c.iud === nuevo.iud);
        return existe ? prev : [...prev, nuevo].sort((a, b) => a.codigo.localeCompare(b.codigo, 'es'));
      });
      toast.success(response.created ? 'Codigo creado en el catalogo' : 'Codigo reutilizado del catalogo');
    } catch (error: any) {
      console.error('Error saving node type code:', error);
      toast.error(error?.message || 'Error parametrizando codigo');
    } finally {
      setSavingNodeTypeCode(false);
    }
  };

  const applyNodeTypeCode = (): void => {
    const codigo = normalizeNodeTypeCode(nodeTypeCodeDraft);
    if (!codigo) {
      toast.error('El codigo es obligatorio');
      return;
    }

    if (!savedNodeTypeCode || savedNodeTypeCode.codigo !== codigo) {
      toast.error('Guarda primero el codigo antes de aplicarlo');
      return;
    }

    setNodeTypeCodeTouched(true);
    setNodeTypeForm((prev) => ({
      ...prev,
      codigo: savedNodeTypeCode.codigo,
      codigoCatalogoId: savedNodeTypeCode.source === 'catalogo' ? savedNodeTypeCode.iud : '',
    }));
    setIsNodeTypeCodeModalOpen(false);
    toast.success('Codigo aplicado al formulario padre');
  };

  const openSubFormModal = (): void => {
    setSubFormParentSearch('');
    const onlyParent = subFormParentOptions.length === 1 ? resolveRouteId(subFormParentOptions[0]) : '';
    const defaultTipoNodoId = orderFourNodeTypes.length === 1 ? resolveNodeTypeId(orderFourNodeTypes[0]) : '';
    const prefixPath = onlyParent
      ? normalizePath(routes.find((r) => resolveRouteId(r) === onlyParent)?.path || '') + '/'
      : '';
    setSubFormData({ name: '', padreId: onlyParent, tipoNodoId: defaultTipoNodoId, component: '', path: prefixPath, accessType: [], acciones: [] });
    setIsSubFormModalOpen(true);
  };

  const closeSubFormModal = (): void => {
    setIsSubFormModalOpen(false);
    setSubFormParentSearch('');
    resetSubFormData();
  };

  const handleSubmitSubForm = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    const selectedSubFormType = orderFourNodeTypes.length === 1
      ? orderFourNodeTypes[0]
      : getTypeById(subFormData.tipoNodoId);
    if (orderFourNodeTypes.length > 0 && !selectedSubFormType) {
      toast.error('Selecciona el tipo de nodo a consumir para el subformulario');
      return;
    }
    if (!subFormData.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (!subFormData.padreId) { toast.error('Selecciona el formulario padre'); return; }
    if (!subFormData.acciones.length) { toast.error('Selecciona al menos una acción HTTP para el subformulario'); return; }
    if (!subFormData.component.trim()) { toast.error('El componente es obligatorio para el subformulario'); return; }
    if (!subFormData.path.trim()) { toast.error('La ruta es obligatoria'); return; }

    const formularioPadre = routes.find((r) => resolveRouteId(r) === subFormData.padreId);
    if (!formularioPadre) { toast.error('Formulario padre no encontrado'); return; }

    const path = normalizePath(subFormData.path);

    try {
      setSubFormSubmitting(true);
      await createRoute({
        name: subFormData.name.trim(),
        path,
        component: subFormData.component.trim(),
        layout: formularioPadre.layout || 'AdminLayout',
        tipoNodo: selectedSubFormType ? String(selectedSubFormType.codigo || '') : '',
        tipoNodoId: selectedSubFormType ? resolveNodeTypeId(selectedSubFormType) : undefined,
        padreId: subFormData.padreId,
        heredaDeRuta: null,
        mostrarEnSidebar: true,
        mostrarEnMenuUsuario: false,
        tiquetaNavb: null,
        menuUsuarioLabel: '',
        menuUsuarioOrder: 0,
        accessType: subFormData.accessType,
        acciones: subFormData.acciones,
      });
      toast.success('SubFormulario creado correctamente');
      closeSubFormModal();
      await loadRoutes();
      notifyRoutesUpdated();
    } catch (error: any) {
      console.error('Error creando SubFormulario:', error);
      toast.error(error?.message || 'Error creando SubFormulario');
    } finally {
      setSubFormSubmitting(false);
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
            <Button variant="outline" onClick={() => void openUserModal()}>
              <Users className="h-4 w-4 mr-2" />
              Usuarios
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
            <Button variant="outline" onClick={() => openRouteModal(undefined, resolveNodeTypeId(subFormularioType) || '')}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo SubFormulario
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
          {routesScopeSummary && (
            <p className="mb-4 text-xs text-muted-foreground">
              {routesScopeSummary}
            </p>
          )}
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
                    <TableHead>Componente Efectivo</TableHead>
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
                        <TableCell>{route.component || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{route.layout}</Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={route.estadoRuta}
                            disabled={!resolveCanToggleRouteStatus(route)}
                            onCheckedChange={() => void handleToggleStatus(route)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => void handlePreviewRoute(route)} title="Previsualizar">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={!resolveCanEditRoute(route)}
                              onClick={() => openRouteModal(route)}
                              title={resolveCanEditRoute(route) ? 'Editar' : 'Tu scope actual no puede editar esta ruta'}
                            >
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
                Parametriza nodos jerarquicos (suite, modulo, formulario y subformulario)
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 md:grid-cols-2">
              {editingRoute ? (
                <div className="space-y-2">
                  <Label htmlFor="tipoNodo">Tipo de nodo *</Label>
                  <Select
                    value={formData.tipoNodoId || undefined}
                    onValueChange={(value) => {
                      setParentSelectSearch('');
                      const nextType = getTypeById(value);
                      const nextOrder = Number(nextType?.order ?? 0);
                      setFormData((prev) => ({
                        ...prev,
                        tipoNodo: String(nextType?.codigo || ''),
                        tipoNodoId: String(nextType ? resolveNodeTypeId(nextType) : ''),
                        padreId: nextOrder <= 1 ? null : prev.padreId,
                        path: nextOrder <= 1
                          ? prev.path
                          : resolveHierarchyPathForDraft(prev.name, prev.padreId, nextOrder, prev.path),
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
                      setParentSelectSearch('');
                      setSelectedSuiteIdForForm(value);
                      setFormData((prev) => ({
                        ...prev,
                        padreId: null,
                        path: resolveHierarchyPathForDraft(prev.name, null, selectedTypeOrder, ''),
                      }));
                    }}
                  >
                    <SelectTrigger id="suiteSelector">
                      <SelectValue placeholder="Selecciona suite" />
                    </SelectTrigger>
                    <SelectContent>
                      {suiteOptions.map((suite) => (
                        <SelectItem key={resolveRouteId(suite)} value={resolveRouteId(suite)}>
                          {getRouteHierarchyLabel(suite)}
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
                      : isSubFormularioType
                        ? 'Formulario padre *'
                        : 'Modulo padre *'}
                  </Label>
                  <Select
                    value={formData.padreId ? String(formData.padreId) : undefined}
                    onValueChange={(value) => {
                      setParentSelectSearch('');
                      setFormData((prev) => ({
                        ...prev,
                        padreId: value,
                        path: resolveHierarchyPathForDraft(prev.name, value, selectedTypeOrder, prev.path),
                      }));
                    }}
                    disabled={isFormularioType && !selectedSuiteIdForForm}
                  >
                    <SelectTrigger id="padreId">
                      <SelectValue placeholder={
                        isModuloType
                          ? 'Selecciona suite'
                          : isSubFormularioType
                            ? 'Selecciona formulario'
                          : 'Selecciona modulo'
                      } />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 border-border bg-popover text-popover-foreground">
                      <div className="sticky top-0 z-10 border-b border-border bg-popover p-2">
                        <Input
                          value={parentSelectSearch}
                          onChange={(e) => setParentSelectSearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          placeholder={
                            isModuloType
                              ? 'Buscar suite...'
                              : isSubFormularioType
                                ? 'Buscar formulario...'
                                : 'Buscar modulo...'
                          }
                          className="h-9 border-input bg-background text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      {filteredParentOptionsForSelectedType.length > 0 ? (
                        filteredParentOptionsForSelectedType.map((parent) => (
                          <SelectItem key={resolveRouteId(parent)} value={resolveRouteId(parent)}>
                            {getRouteHierarchyLabel(parent)}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No hay resultados para la busqueda.
                        </div>
                      )}
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
                  {!editingRoute && isSubFormularioType && subFormParentOptions.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No hay formularios disponibles para asociar el subformulario.
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
                    const efectivePadre = (isFormularioType && formularioPadreId) ? formularioPadreId : null;
                    setFormData((prev) => ({
                      ...prev,
                      name: nextName,
                      path: isSuiteType
                        ? prev.path
                        : resolveHierarchyPathForDraft(nextName, efectivePadre || prev.padreId || null, selectedTypeOrder, prev.path),
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
                  readOnly={!isSuiteType}
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
              <div className="space-y-2 md:col-span-2 rounded-md border border-dashed p-3 bg-muted/30">
                <p className="text-sm font-medium">Guia de jerarquia</p>
                <p className="text-xs text-muted-foreground">
                  Suite: crea la raiz del flujo. Modulo: depende de una suite. Formulario: depende de un modulo dentro de la suite seleccionada. Subformulario: depende de un formulario existente.
                </p>
                <p className="text-xs text-muted-foreground">
                  Suite y Modulo no manejan componente. Formulario y Subformulario si deben enviar componente y ese valor se guarda en backend.
                </p>
              </div>
              {!isSuiteType && !isModuloType && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="component">Componente *</Label>
                  <Input
                    id="component"
                    value={String(formData.component || '')}
                    onChange={(e) => setFormData((prev) => ({ ...prev, component: e.target.value }))}
                    placeholder="Ej: ParametrosGobernanza"
                    required={isFormularioType || isSubFormularioType}
                  />
                  <p className="text-xs text-muted-foreground">
                    Obligatorio para formulario y subformulario. Debe coincidir con el componente que el frontend puede resolver.
                  </p>
                </div>
              )}
              <div className="space-y-2 md:col-span-2">
                <Label>Layout</Label>
                <Input
                  value={(() => {
                    const selectedAtIds = Array.isArray(formData.accessType) ? formData.accessType : [];
                    const layouts = accessTypes
                      .filter((a) => selectedAtIds.includes(String(a._id || '')) && a.layout)
                      .map((a) => String(a.layout));
                    if (layouts.length > 0) return layouts.join(', ');
                    return 'Se derivara de los tipos de acceso seleccionados';
                  })()}
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  El layout se resuelve automaticamente desde los tipos de acceso seleccionados.
                </p>
              </div>

              {(
                <div className="space-y-2 md:col-span-2">
                  <Label>Tipo de acceso {(isFormularioType || isSubFormularioType) ? '*' : ''}</Label>
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
                    Puedes seleccionar uno o varios tipos de acceso. El layout efectivo se resolvera desde la seleccion.
                  </p>
                </div>
              )}
              {(isFormularioType || isSubFormularioType) && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="acciones">Acciones HTTP *</Label>
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

      {/* ── Modal independiente: Nuevo SubFormulario ─────────────────────────── */}
      <Dialog open={isSubFormModalOpen} onOpenChange={(open) => { if (!open) closeSubFormModal(); }}>
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle>Nuevo SubFormulario</DialogTitle>
            <DialogDescription>
              Crea un sub-formulario anidado bajo un formulario existente en la misma colección.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmitSubForm(e)}>
            <div className="grid gap-4 py-4 md:grid-cols-2">

              {/* Formulario padre */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="sf-padreId">Formulario padre *</Label>
                {subFormParentOptions.length > 1 ? (
                  <Select
                    value={subFormData.padreId || undefined}
                    onValueChange={(value) => {
                      setSubFormParentSearch('');
                      const padre = routes.find((r) => resolveRouteId(r) === value);
                      const prefix = padre?.path ? normalizePath(padre.path) + '/' : '';
                      setSubFormData((prev) => ({
                        ...prev,
                        padreId: value,
                        path: prefix,
                      }));
                    }}
                  >
                    <SelectTrigger id="sf-padreId">
                      <SelectValue placeholder="Selecciona el formulario padre" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 border-border bg-popover text-popover-foreground">
                      <div className="sticky top-0 z-10 border-b border-border bg-popover p-2">
                        <Input
                          value={subFormParentSearch}
                          onChange={(e) => setSubFormParentSearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          placeholder="Buscar formulario..."
                          className="h-9 border-input bg-background text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      {filteredSubFormParentOptions.length > 0 ? (
                        filteredSubFormParentOptions.map((r) => (
                          <SelectItem key={resolveRouteId(r)} value={resolveRouteId(r)}>
                            {getRouteHierarchyLabel(r)}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No hay resultados para la busqueda.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                ) : subFormParentOptions.length === 1 ? (
                  <Input
                    id="sf-padreId"
                    value={getRouteHierarchyLabel(subFormParentOptions[0])}
                    readOnly
                    className="bg-muted"
                  />
                ) : null}
                {subFormParentOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">No hay formularios disponibles.</p>
                )}
              </div>

              {orderFourNodeTypes.length > 0 && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="sf-tipoNodoId">Codigo parametrizado *</Label>
                  {orderFourNodeTypes.length > 1 ? (
                    <Select
                      value={subFormData.tipoNodoId || undefined}
                      onValueChange={(value) =>
                        setSubFormData((prev) => ({
                          ...prev,
                          tipoNodoId: value,
                        }))
                      }
                    >
                      <SelectTrigger id="sf-tipoNodoId">
                        <SelectValue placeholder="Selecciona el codigo parametrizado" />
                      </SelectTrigger>
                      <SelectContent>
                        {orderFourNodeTypes.map((item) => (
                          <SelectItem key={resolveNodeTypeId(item)} value={resolveNodeTypeId(item)}>
                            {item.codigo}
                            <span className="text-muted-foreground text-xs ml-2">{item.nombre}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="sf-tipoNodoId"
                      value={`${orderFourNodeTypes[0].codigo} | ${orderFourNodeTypes[0].nombre}`}
                      readOnly
                      className="bg-muted"
                    />
                  )}
                </div>
              )}

              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="sf-name">Nombre *</Label>
                <Input
                  id="sf-name"
                  value={subFormData.name}
                  onChange={(e) => setSubFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Detalle Comisiones"
                  required
                />
              </div>

              {/* Componente */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="sf-component">Componente *</Label>
                <Input
                  id="sf-component"
                  value={subFormData.component}
                  onChange={(e) => setSubFormData((prev) => ({ ...prev, component: e.target.value }))}
                  placeholder="Ej: DetalleComisiones"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Obligatorio para el subformulario y debe existir en el frontend.
                </p>
              </div>

              {/* Ruta editable con prefijo suite/módulo pre-cargado */}
              <div className="space-y-2">
                <Label htmlFor="sf-path">Ruta *</Label>
                <Input
                  id="sf-path"
                  value={subFormData.path}
                  onChange={(e) => setSubFormData((prev) => ({ ...prev, path: e.target.value }))}
                  placeholder="Selecciona el formulario padre para cargar el prefijo"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  El prefijo se carga del formulario padre. Completa el segmento final (ej: <code>/detalle</code>).
                </p>
              </div>


              {/* Tipo de acceso */}
              <div className="space-y-2 md:col-span-2">
                <Label>Tipo de acceso</Label>
                <div className="rounded-md border p-3 flex flex-wrap gap-6">
                  {accessTypes.filter((item) => item.estadoAcces !== false).map((item) => {
                    const id = String(item._id || '');
                    const selected = subFormData.accessType.includes(id);
                    return (
                      <label key={id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSubFormData((prev) => ({
                              ...prev,
                              accessType: checked
                                ? [...new Set([...prev.accessType, id])]
                                : prev.accessType.filter((v) => v !== id),
                            }));
                          }}
                        />
                        <span>{String(item.layout || item.accessType || 'N/A')}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Acciones */}
              <div className="space-y-2 md:col-span-2">
                <Label>Acciones HTTP *</Label>
                <div className="rounded-md border p-3 space-y-2 max-h-[160px] overflow-auto">
                  {accionesCatalogo.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay acciones disponibles.</p>
                  ) : (
                    accionesCatalogo.map((accion) => {
                      const id = String(accion?._id || accion?.iud || '').trim();
                      const method = String(accion?.method || '').toUpperCase();
                      const etiqueta = String(accion?.etiquetas || '').trim();
                      const label = etiqueta ? `${method} | ${etiqueta}` : method;
                      const selected = subFormData.acciones.includes(id);
                      if (!id) return null;
                      return (
                        <label key={id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSubFormData((prev) => ({
                                ...prev,
                                acciones: checked
                                  ? [...new Set([...prev.acciones, id])]
                                  : prev.acciones.filter((v) => v !== id),
                              }));
                            }}
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeSubFormModal} disabled={subFormSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={subFormSubmitting}>
                {subFormSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                ) : 'Crear SubFormulario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isNodeTypeModalOpen}
        onOpenChange={(open) => {
          setIsNodeTypeModalOpen(open);
          if (!open) resetNodeTypeForm();
        }}
      >
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
                <div className="flex gap-2">
                  <Input
                    value={nodeTypeForm.codigo}
                    readOnly
                    placeholder="SUBFORMULARIO"
                    className="bg-muted cursor-pointer"
                    onClick={openNodeTypeCodeModal}
                  />
                  <Button type="button" variant="outline" onClick={openNodeTypeCodeModal}>
                    Parametrizar codigo
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Define el codigo desde el submodal y luego ese registro se consumira por defecto o en un select.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={nodeTypeForm.nombre}
                  onChange={(e) => {
                    const nombre = e.target.value;
                    setNodeTypeForm((prev) => ({
                      ...prev,
                      nombre,
                      codigo: nodeTypeCodeTouched ? prev.codigo : normalizeNodeTypeCode(nombre),
                      codigoCatalogoId: nodeTypeCodeTouched ? prev.codigoCatalogoId : '',
                    }));
                  }}
                  placeholder="Subformulario"
                />
              </div>
            </div>
              <div className="space-y-2">
              <Label>{editingNodeTypeId ? 'Orden' : 'Orden siguiente'}</Label>
              <Input
                type="number"
                value={editingNodeTypeId ? String(editingNodeTypeOrder) : String(nextNodeTypeOrder)}
                readOnly={!editingNodeTypeId}
                className={!editingNodeTypeId ? 'bg-muted' : ''}
                onChange={(e) => { if (editingNodeTypeId) setEditingNodeTypeOrder(Number(e.target.value)); }}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Input
                value={nodeTypeForm.descripcion}
                onChange={(e) => setNodeTypeForm({ ...nodeTypeForm, descripcion: e.target.value })}
                placeholder="Nivel raiz"
              />
            </div>
            <div className="flex justify-end gap-2">
              {editingNodeTypeId && (
                <Button type="button" variant="outline" onClick={resetNodeTypeForm}>
                  Cancelar edición
                </Button>
              )}
              <Button
                type="submit"
                disabled={nodeTypeSubmitting || !nodeTypeCodePreview || (!editingNodeTypeId && nodeTypeCodeExists)}
              >
                {nodeTypeSubmitting ? 'Guardando...' : editingNodeTypeId ? 'Actualizar tipo' : 'Guardar tipo'}
              </Button>
            </div>
          </form>
          <div className="flex justify-end mb-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={migratingNodeTypes}
              onClick={handleMigrarTipoNodoRutas}
            >
              {migratingNodeTypes ? 'Migrando...' : 'Migrar jerarquía'}
            </Button>
          </div>
          <div className="rounded-md border max-h-[260px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Jerarquia</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Accion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodeTypeRowsByFilteredCode.map((item) => (
                  <TableRow key={resolveNodeTypeId(item)}>
                    <TableCell>{item.codigo}</TableCell>
                    <TableCell>{item.nombre}</TableCell>
                    <TableCell>{getNodeTypeHierarchyByCode(item) || '-'}</TableCell>
                    <TableCell>{item.order}</TableCell>
                    <TableCell>
                      <Badge variant={item.estado ? 'outline' : 'secondary'}>
                        {item.estado ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditNodeType(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!item.estado}
                        onClick={() => handleDeactivateNodeType(resolveNodeTypeId(item))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {nodeTypeRowsByFilteredCode.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      No encontramos jerarquia para el codigo filtrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog resultado migración tipos de nodo */}
      <Dialog open={!!migracionResult} onOpenChange={(open) => { if (!open) setMigracionResult(null); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Resultado de migración</DialogTitle>
            <DialogDescription>{migracionResult?.message}</DialogDescription>
          </DialogHeader>
          {migracionResult && (
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-muted p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{migracionResult.actualizadas}</p>
                  <p className="text-xs text-muted-foreground">Actualizadas</p>
                </div>
                <div className="rounded-md bg-muted p-3 text-center">
                  <p className="text-2xl font-bold">{migracionResult.yaCorrectas}</p>
                  <p className="text-xs text-muted-foreground">Ya correctas</p>
                </div>
                <div className="rounded-md bg-muted p-3 text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{migracionResult.sinTipoNodo}</p>
                  <p className="text-xs text-muted-foreground">Sin tipo nodo</p>
                </div>
                <div className="rounded-md bg-muted p-3 text-center">
                  <p className="text-2xl font-bold text-destructive">{migracionResult.sinCandidato.length}</p>
                  <p className="text-xs text-muted-foreground">Sin candidato</p>
                </div>
              </div>
              {migracionResult.sinCandidato.length > 0 && (
                <div className="rounded-md border border-destructive/40 p-3 space-y-1">
                  <p className="font-medium text-destructive text-xs">Rutas sin TipoNodoRuta coincidente:</p>
                  {migracionResult.sinCandidato.map((r, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• {r.path} <span className="text-foreground">({r.tipoNodo})</span></p>
                  ))}
                </div>
              )}
              {migracionResult.detalle.length > 0 && (
                <div className="rounded-md border p-3 max-h-[160px] overflow-auto space-y-1">
                  <p className="font-medium text-xs mb-1">Rutas actualizadas:</p>
                  {migracionResult.detalle.map((r, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• {r.path} → <span className="text-foreground">order {r.order}</span></p>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMigracionResult(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNodeTypeCodeModalOpen} onOpenChange={setIsNodeTypeCodeModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Parametrizar codigo</DialogTitle>
            <DialogDescription>
              Define el codigo que luego sera consumido por el formulario segun el registro creado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="node-type-code-catalog">Codigo</Label>
              {loadingCatalogoCodigo ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando catalogo...
                </div>
              ) : (
                <Select
                  value={savedNodeTypeCode?.iud ?? (nodeTypeCodeDraft && !savedNodeTypeCode ? '__new__' : '__none__')}
                  onValueChange={(v) => {
                    if (v === '__new__' || v === '__none__') {
                      setSavedNodeTypeCode(null);
                      setNodeTypeCodeDraft('');
                      return;
                    }
                    const found = filteredNodeTypeCodeOptions.find((c) => c.iud === v);
                    if (found) {
                      setSavedNodeTypeCode(found);
                      setNodeTypeCodeDraft(found.codigo);
                    }
                  }}
                >
                  <SelectTrigger id="node-type-code-catalog">
                    <SelectValue placeholder="Selecciona un codigo del catalogo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Seleccionar codigo —</SelectItem>
                    {filteredNodeTypeCodeOptions.map((c) => (
                      <SelectItem key={c.iud} value={c.iud}>
                        {c.codigo}
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__">+ Nuevo codigo</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {!savedNodeTypeCode && (
                <Input
                  value={nodeTypeCodeDraft}
                  onChange={(e) => setNodeTypeCodeDraft(e.target.value)}
                  placeholder="SUBFORMULARIO"
                />
              )}
            </div>
              <div className="space-y-2">
                <Label>Perfil corporativo</Label>
              {loadingPerfilesCorporativos ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando perfiles...
                </div>
              ) : (
                <Select
                  value={selectedPerfilCorporativoId || '__none__'}
                  onValueChange={(v) => {
                    const nextValue = v === '__none__' ? '' : v;
                    setSelectedPerfilCorporativoId(nextValue);
                    if (nextValue) {
                      const firstMatch = catalogoCodigoOptions.find((item) =>
                        item.source === 'catalogo' || String(item.perfilCorporativoId || '') === nextValue
                      );
                      if (firstMatch) {
                        setSavedNodeTypeCode(firstMatch);
                        setNodeTypeCodeDraft(firstMatch.codigo);
                      } else {
                        setSavedNodeTypeCode(null);
                        setNodeTypeCodeDraft('');
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin perfil corporativo (scope global)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin perfil corporativo (scope global)</SelectItem>
                    {perfilesCorporativos.map((p) => {
                      const id = String(p._id || p.iud || '');
                      const label = p.razon_social || p.titulo || `Perfil ...${id.slice(-6)}`;
                      const nit = p.nit_ruc_rtn ? ` — NIT: ${p.nit_ruc_rtn}` : '';
                      const inactivo = p.estado === false ? ' (inactivo)' : '';
                      return (
                        <SelectItem key={id} value={id}>
                          {`${label}${nit}${inactivo}`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                El codigo quedará asociado al perfil corporativo seleccionado en el catalogo.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Se normaliza en mayusculas y luego se consume por defecto cuando exista un unico registro del nivel.
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {savedNodeTypeCode && savedNodeTypeCode.source === 'catalogo' ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deletingCatalogoCodigo}
                onClick={() => setCatalogoCodigoToDelete(savedNodeTypeCode.iud)}
              >
                {deletingCatalogoCodigo ? 'Procesando...' : 'Eliminar del catálogo'}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsNodeTypeCodeModalOpen(false)}>
                Cancelar
              </Button>
              {!savedNodeTypeCode && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void saveNodeTypeCode()}
                  disabled={savingNodeTypeCode || !normalizeNodeTypeCode(nodeTypeCodeDraft)}
                >
                  {savingNodeTypeCode ? 'Guardando...' : 'Guardar codigo'}
                </Button>
              )}
              <Button
                type="button"
                onClick={applyNodeTypeCode}
                disabled={!savedNodeTypeCode}
              >
                Aplicar codigo
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Editar Usuario ─────────────────────────────────── */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Gestión de Usuarios</DialogTitle>
            <DialogDescription>Busca y edita cualquier usuario del sistema.</DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Buscar por nombre, correo o rol..."
              value={usuarioSearch}
              onChange={(e) => setUsuarioSearch(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="icon" onClick={() => { setUsuarios([]); void openUserModal(); }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {editingUser ? (
            <div className="flex flex-col gap-4 py-2">
              <p className="text-sm text-slate-500">
                Editando: <span className="font-semibold text-slate-800">{String(editingUser?.nombre || editingUser?.correo || editingUser?.email || '')}</span>
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label>Correo</Label>
                  <Input
                    value={userEditForm.correo}
                    onChange={(e) => setUserEditForm((p) => ({ ...p, correo: e.target.value }))}
                    placeholder="nuevo@correo.com"
                  />
                </div>
                <div>
                  <Label>Rol</Label>
                  <Input
                    value={userEditForm.rol}
                    onChange={(e) => setUserEditForm((p) => ({ ...p, rol: e.target.value }))}
                    placeholder="ADMIN_ROLE / USER_ROLE..."
                  />
                </div>
                <div>
                  <Label>Nueva contraseña <span className="text-slate-400 text-xs">(dejar vacío para no cambiar)</span></Label>
                  <Input
                    type="password"
                    value={userEditForm.password}
                    onChange={(e) => setUserEditForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <DialogFooter className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
                <Button onClick={() => void handleSaveUser()} disabled={userEditSaving}>
                  {userEditSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Guardar cambios
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="overflow-auto flex-1">
              {usuariosLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-rose-500" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Correo</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Editar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios
                      .filter((u) => {
                        const q = usuarioSearch.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          String(u?.nombre || '').toLowerCase().includes(q) ||
                          String(u?.correo || u?.email || '').toLowerCase().includes(q) ||
                          String(u?.rol || '').toLowerCase().includes(q)
                        );
                      })
                      .map((u, i) => {
                        const uid = String(u?._id || u?.iud || u?.id || i);
                        return (
                          <TableRow key={uid}>
                            <TableCell className="font-medium">{String(u?.nombre || u?.name || '-')}</TableCell>
                            <TableCell className="text-xs text-slate-500">{String(u?.correo || u?.email || '-')}</TableCell>
                            <TableCell><Badge variant="outline">{String(u?.rol || '-')}</Badge></TableCell>
                            <TableCell>
                              <Badge variant={u?.estado !== false ? 'outline' : 'secondary'}>
                                {u?.estado !== false ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openEditUser(u)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    {!usuariosLoading && usuarios.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-400 py-6">Sin usuarios cargados</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!catalogoCodigoToDelete} onOpenChange={(open) => { if (!open) setCatalogoCodigoToDelete(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Gestionar codigo del catálogo?</AlertDialogTitle>
            <AlertDialogDescription>
              El SuperAdmin eliminará el registro permanentemente. El TenantGlobal lo desactivará. Esta acción afecta el scope del tenant actual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteCatalogoCodigo()}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!nodeTypeToDelete} onOpenChange={(open) => { if (!open) setNodeTypeToDelete(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Gestionar tipo de nodo?</AlertDialogTitle>
            <AlertDialogDescription>
              El SuperAdmin eliminará el registro permanentemente. El TenantGlobal lo desactivará.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteNodeType()}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

