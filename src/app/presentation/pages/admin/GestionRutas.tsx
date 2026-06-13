import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { invalidateSidebarCache } from '@/app/services/routeService';
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
  getRouteById,
  createAccessType,
  updateAccessType,
  deactivateAccessType,
  createTipoNodoRuta,
  updateTipoNodoRuta,
  deleteTipoNodoRuta,
  deleteCatalogoCodigo,
  migrarTipoNodoRutas,
  getJerarquiaOpcionesFromCounter,
  sincronizarJerarquiaCounter,
  migrarJerarquiaCounter,
  type SincronizarJerarquiaCounterResult,
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
import { normalizeMongoId, resolveRouteApiId } from '@/app/utils/normalizeMongoId';
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
import { ChevronDown, ChevronRight, Edit, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { apiFetch, persistHybridSpaPath } from '@/app/services/api';
import { getJerarquiaUsuarios, type JerarquiaResponse } from '@/app/services/tenantUsuariosService';
import { GestionRutasUsuariosOrganigrama } from '@/app/presentation/pages/admin/components/GestionRutasUsuariosOrganigrama';
import { OrganigramaLegendaInfoButton } from '@/app/presentation/components/admin/usuarios-tenant/JerarquiaOrganigrama';
import {
  GestionRutasToolbarParametrizacion,
  type GestionRutasToolbarDraft,
  type GestionRutasToolbarMode,
} from '@/app/presentation/pages/admin/components/GestionRutasToolbarParametrizacion';
import {
  buildJerarquiaUsuariosListaParaModal,
  type JerarquiaUsuariosListaMeta,
} from '@/app/presentation/utils/jerarquiaUsuariosFlatten';
import { contarUsuariosPoolJerarquia } from '@/app/presentation/utils/gestionRutasOrganigramaTree';
import {
  ParameterizedActionBar,
  ParameterizedToolbarActionBar,
  buildGestionRutasToolbarCatalog,
  buildRouteRowActionCatalog,
  GESTION_RUTAS_TOOLBAR_ACTION_IDS,
  resolveRouteRowAllowedIds,
} from '@/app/presentation/actions';
import type { ActionId } from '@/app/presentation/actions';

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

interface GestionRutasToolbarPolicy {
  mode?: GestionRutasToolbarMode | string;
  actionIds?: string[];
  rowActionIds?: string[];
  canList?: boolean;
  canCreate?: boolean;
  canManage?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export default function GestionRutas(): React.ReactElement {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [nodeTypes, setNodeTypes] = useState<TipoNodoRuta[]>([]);
  const [subFormCodeOptions, setSubFormCodeOptions] = useState<TipoNodoRuta[]>([]);
  const [accessTypes, setAccessTypes] = useState<AccessTypeOption[]>([]);
  const [accionesCatalogo, setAccionesCatalogo] = useState<AccionOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toolbarPolicy, setToolbarPolicy] = useState<GestionRutasToolbarPolicy | null>(null);
  const [toolbarDraft, setToolbarDraft] = useState<GestionRutasToolbarDraft | null>(null);
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
  const [selectedSuiteIdForSubForm, setSelectedSuiteIdForSubForm] = useState<string>('');
  const [selectedModuloIdForSubForm, setSelectedModuloIdForSubForm] = useState<string>('');
  const [expandedTableNodes, setExpandedTableNodes] = useState<Record<string, boolean>>({});
  const [nameFilter, setNameFilter] = useState<string>('');
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string>('ALL');
  const [parentSelectSearch, setParentSelectSearch] = useState<string>('');
  const [suiteSelectSearch, setSuiteSelectSearch] = useState<string>('');
  const [subFormParentSearch, setSubFormParentSearch] = useState<string>('');
  const [routesActorTipo, setRoutesActorTipo] = useState<string>('UNKNOWN');
  const [routesSourceCollection, setRoutesSourceCollection] = useState<string>('');
  const [formularioPadreId, setFormularioPadreId] = useState<string>('');
  const [counterJerarquiaSuites, setCounterJerarquiaSuites] = useState<Route[]>([]);
  const [counterJerarquiaModulos, setCounterJerarquiaModulos] = useState<Route[]>([]);
  const [counterJerarquiaFormularios, setCounterJerarquiaFormularios] = useState<Route[]>([]);
  const [syncingCounterJerarquia, setSyncingCounterJerarquia] = useState<boolean>(false);
  const [isSubFormModalOpen, setIsSubFormModalOpen] = useState<boolean>(false);
  const [subFormSubmitting, setSubFormSubmitting] = useState<boolean>(false);
  const [nodeTypeToDelete, setNodeTypeToDelete] = useState<string>('');
  const [catalogoCodigoToDelete, setCatalogoCodigoToDelete] = useState<string>('');
  const [deletingCatalogoCodigo, setDeletingCatalogoCodigo] = useState<boolean>(false);
  const [migratingNodeTypes, setMigratingNodeTypes] = useState<boolean>(false);
  const [migracionResult, setMigracionResult] = useState<MigracionTipoNodoResult | null>(null);

  // Modal edición de usuarios
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [usuariosJerarquiaMeta, setUsuariosJerarquiaMeta] = useState<JerarquiaUsuariosListaMeta | null>(null);
  const [jerarquiaUsuariosRaw, setJerarquiaUsuariosRaw] = useState<JerarquiaResponse | null>(null);
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
    persistHybridSpaPath();

    const reloadCatalogos = (): void => {
      void Promise.all([
        loadRoutes(),
        loadNodeTypes(),
        loadSubFormCodeOptions(),
        loadAccessTypes(),
        loadAccionesCatalogo(),
      ]);
    };

    reloadCatalogos();
    window.addEventListener('mabs-auth-changed', reloadCatalogos);
    return () => window.removeEventListener('mabs-auth-changed', reloadCatalogos);
  }, []);

  const resolveRouteId = (route: Route): string => resolveRouteApiId(route);
  const resolveNodeTypeId = (nodeType: TipoNodoRuta | any): string =>
    normalizeMongoId(nodeType);
  const resolveAccessTypeIds = (route: Route, catalog: AccessTypeOption[] = accessTypes): string[] => {
    const raw = (route as any)?.accessType;
    let ids: string[] = [];
    if (Array.isArray(raw)) {
      ids = raw.map((item) => normalizeMongoId(item)).filter(Boolean);
    } else if (typeof raw === 'string') {
      ids = [String(raw).trim()].filter(Boolean);
    } else if (raw) {
      ids = [normalizeMongoId(raw)].filter(Boolean);
    }

    if (ids.length > 0) return [...new Set(ids)];

    const layoutNorm = String(route?.layout || '')
      .replace(/\//g, '')
      .trim()
      .toUpperCase();
    if (!layoutNorm || !catalog.length) return [];

    const matched = catalog
      .filter((item) => {
        const candidates = [
          String(item?.layout || '').replace(/\//g, '').trim().toUpperCase(),
          String(item?.accessType || '').trim().toUpperCase(),
        ].filter(Boolean);
        return candidates.some((c) => c === layoutNorm || layoutNorm.includes(c) || c.includes(layoutNorm));
      })
      .map((item) => normalizeMongoId(item))
      .filter(Boolean);

    return [...new Set(matched)];
  };
  const resolveActionIds = (route: Route): string[] => {
    const raw = (route as any)?.acciones;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw
        .map((item) => normalizeMongoId(item))
        .filter(Boolean);
    }
    if (typeof raw === 'string') return [String(raw).trim()].filter(Boolean);
    return [normalizeMongoId(raw)].filter(Boolean);
  };

  const resolveParentId = (route: Route): string | null => {
    const parent = route?.padreId as any;
    if (!parent) return null;
    if (typeof parent === 'string') return parent;
    return String(parent?._id || parent?.iud || '');
  };

  /** padreId directo o último ancestor cuando el listado no trae padreId poblado. */
  const resolveRouteParentIdFromDoc = (route: Route): string | null => {
    const direct = resolveParentId(route);
    if (direct) return direct;

    const ancestors = (route as any)?.ancestors;
    if (Array.isArray(ancestors) && ancestors.length > 0) {
      for (let i = ancestors.length - 1; i >= 0; i -= 1) {
        const id = normalizeMongoId(ancestors[i]);
        if (id) return id;
      }
    }
    return null;
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
    const fromRoutes = routes.find((route) => getRouteIdentitySet(route).has(normalized));
    if (fromRoutes) return fromRoutes;
    const counterPools = [
      ...counterJerarquiaSuites,
      ...counterJerarquiaModulos,
      ...counterJerarquiaFormularios,
    ];
    return counterPools.find((route) => getRouteIdentitySet(route).has(normalized));
  };

  const getTypeByCode = (code?: string | null): TipoNodoRuta | undefined =>
    nodeTypes.find((t) => String(t.codigo || '').toUpperCase() === String(code || '').toUpperCase());

  const getTypeById = (id?: string | null): TipoNodoRuta | undefined => {
    const normalized = String(id || '').trim();
    if (!normalized) return undefined;
    return nodeTypes.find((t) => {
      const typeId = resolveNodeTypeId(t);
      return typeId === normalized
        || String((t as any)?._id || '').trim() === normalized
        || String(t?.iud || '').trim() === normalized;
    });
  };

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
    || getTypeByCode(String(formData.tipoNodo || ''))
    || (editingRoute ? getTypeByCode(String(editingRoute.tipoNodo || '')) : undefined)
    || (editingRoute && String(editingRoute.component || '').trim() ? formularioType : undefined);
  const selectedTypeOrder = Number(selectedTypeDoc?.order ?? 0);
  const suiteOrder = Number(suiteType?.order ?? 1);

  const formularioOrder = Number(formularioType?.order ?? 3);
  const isSuiteType = selectedTypeOrder === Number(suiteType?.order ?? 1);
  const isModuloType = selectedTypeOrder === Number(moduloType?.order ?? 2);
  const isFormularioType = selectedTypeOrder === Number(formularioType?.order ?? 3);
  const isSubFormularioType = selectedTypeOrder === Number(subFormularioType?.order ?? 4);

  const needsCounterHierarchySelects = isModalOpen
    && (isModuloType || isFormularioType || isSubFormularioType);

  const activeSuiteIdForCounterModulos = isFormularioType
    ? selectedSuiteIdForForm
    : isSubFormularioType
      ? selectedSuiteIdForSubForm
      : '';

  useEffect(() => {
    if (!needsCounterHierarchySelects) {
      setCounterJerarquiaSuites([]);
      return;
    }
    void (async () => {
      try {
        const res = await getJerarquiaOpcionesFromCounter({ nivelOrder: 1 });
        if (res.success && Array.isArray(res.data)) {
          setCounterJerarquiaSuites(res.data);
        } else {
          setCounterJerarquiaSuites([]);
        }
      } catch {
        setCounterJerarquiaSuites([]);
      }
    })();
  }, [needsCounterHierarchySelects]);

  useEffect(() => {
    if (!isModalOpen || !(isFormularioType || isSubFormularioType) || !String(activeSuiteIdForCounterModulos || '').trim()) {
      setCounterJerarquiaModulos([]);
      return;
    }
    void (async () => {
      try {
        const res = await getJerarquiaOpcionesFromCounter({
          nivelOrder: 2,
          padreRutaSeguridadId: activeSuiteIdForCounterModulos,
        });
        if (res.success && Array.isArray(res.data)) {
          setCounterJerarquiaModulos(res.data);
        } else {
          setCounterJerarquiaModulos([]);
        }
      } catch {
        setCounterJerarquiaModulos([]);
      }
    })();
  }, [isModalOpen, isFormularioType, isSubFormularioType, activeSuiteIdForCounterModulos]);

  useEffect(() => {
    if (!isModalOpen || !isSubFormularioType || !String(selectedModuloIdForSubForm || '').trim()) {
      setCounterJerarquiaFormularios([]);
      return;
    }
    void (async () => {
      try {
        const res = await getJerarquiaOpcionesFromCounter({
          nivelOrder: 3,
          padreRutaSeguridadId: selectedModuloIdForSubForm,
          suiteRutaSeguridadId: selectedSuiteIdForSubForm || undefined,
        });
        if (res.success && Array.isArray(res.data)) {
          setCounterJerarquiaFormularios(res.data);
        } else {
          setCounterJerarquiaFormularios([]);
        }
      } catch {
        setCounterJerarquiaFormularios([]);
      }
    })();
  }, [isModalOpen, isSubFormularioType, selectedModuloIdForSubForm, selectedSuiteIdForSubForm]);

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
    const parent = findRouteByAnyId(String(parentId || ''));
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
    if (derived) return derived;
    return fallbackPath ? normalizePath(fallbackPath) : '';
  };

  /** Alineado a resolverTipoNodoPorRutaDoc (backend): recorre padreId hasta la raíz. */
  const inferRouteTypeOrderFromDepth = (route: Route): number => {
    let depth = 1;
    let current: Route | undefined = route;
    const visited = new Set<string>();
    while (current && depth < 20) {
      const parentId = resolveParentId(current);
      if (!parentId || visited.has(parentId)) break;
      visited.add(parentId);
      depth += 1;
      current = findRouteByAnyId(parentId);
    }
    const byDepth = nodeTypes.find((t) => Number(t.order) === depth);
    return Number(byDepth?.order ?? depth);
  };

  /** Profundidad jerárquica: 1=Suite, 2=Modulo, 3=Formulario, 4=SubFormulario. */
  const calcularProfundidadRuta = (route: Route): number => {
    const ancestors = (route as any)?.ancestors;
    if (Array.isArray(ancestors) && ancestors.length > 0) {
      return ancestors.length + 1;
    }
    return inferRouteTypeOrderFromDepth(route);
  };

  /**
   * Tipo efectivo alineado al backend: si tipoNodoId no coincide con la profundidad jerárquica,
   * prevalece el tipo inferido por ancestors/padreId.
   */
  const resolveEffectiveRouteTypeDoc = (route: Route): TipoNodoRuta | undefined => {
    const profundidad = calcularProfundidadRuta(route);
    const typeByDepth = nodeTypes.find((t) => Number(t.order ?? 0) === profundidad);

    const populatedTipo = (route as any)?.tipoNodoId;
    let typeByCatalog: TipoNodoRuta | undefined;

    if (typeof populatedTipo === 'object' && populatedTipo != null) {
      const id = normalizeMongoId(populatedTipo);
      typeByCatalog = id ? getTypeById(id) : undefined;
      if (!typeByCatalog) {
        const codigo = String(populatedTipo.codigo || '').trim();
        if (codigo) typeByCatalog = getTypeByCode(codigo);
      }
    } else {
      const id = normalizeMongoId(route?.tipoNodoId);
      if (id) typeByCatalog = getTypeById(id);
    }

    if (!typeByCatalog) {
      const legacyCodigo = String(route?.tipoNodo || '').trim();
      if (legacyCodigo) typeByCatalog = getTypeByCode(legacyCodigo) || getTypeByName(legacyCodigo);
    }

    if (typeByCatalog && typeByDepth) {
      const orderCatalogo = Number(typeByCatalog.order ?? 0);
      const orderProfundidad = Number(typeByDepth.order ?? 0);
      if (orderCatalogo !== orderProfundidad && profundidad > 1) {
        return typeByDepth;
      }
    }

    return typeByCatalog || typeByDepth;
  };

  const resolveTypeIdForRoute = (route: Route): string => {
    const effective = resolveEffectiveRouteTypeDoc(route);
    if (effective) return resolveNodeTypeId(effective);

    const populatedTipo = (route as any)?.tipoNodoId;
    const routeTypeId = normalizeMongoId(populatedTipo) || normalizeMongoId(route?.tipoNodoId);
    if (routeTypeId) return routeTypeId;

    const codigoFromPopulate = typeof populatedTipo === 'object'
      ? String(populatedTipo?.codigo || '').trim()
      : '';
    const tipoText = codigoFromPopulate || String(route?.tipoNodo || '').trim();
    if (tipoText) {
      const byCode = getTypeByCode(tipoText);
      if (byCode) return resolveNodeTypeId(byCode);
    }

    const orderFromPopulate = typeof populatedTipo === 'object'
      ? Number(populatedTipo?.order ?? 0)
      : 0;
    if (orderFromPopulate > 0) {
      const byOrder = nodeTypes.find((t) => Number(t.order) === orderFromPopulate);
      if (byOrder) return resolveNodeTypeId(byOrder);
    }

    if (String(route?.component || '').trim()) {
      return resolveNodeTypeId(formularioType || getTypeByCode('FORMULARIO') || subFormularioType);
    }

    return '';
  };

  const resolveTypeOrderForRoute = (route: Route, routeTypeId = ''): number => {
    const typeId = routeTypeId || resolveTypeIdForRoute(route);
    const byId = getTypeById(typeId);
    if (byId) return Number(byId.order ?? 0);
    const populatedTipo = (route as any)?.tipoNodoId;
    if (typeof populatedTipo === 'object' && populatedTipo?.order != null) {
      return Number(populatedTipo.order);
    }
    return getTypeOrderByCode(String(route?.tipoNodo || ''));
  };

  const nodeTypesForEditSelect = useMemo(() => {
    const active = nodeTypes.filter((t) => t.estado !== false);
    if (!editingRoute) return active;
    const currentId = resolveTypeIdForRoute(editingRoute);
    if (!currentId) return active;
    const current = getTypeById(currentId);
    if (!current) return active;
    const exists = active.some((t) => resolveNodeTypeId(t) === currentId);
    return exists ? active : [...active, current];
  }, [nodeTypes, editingRoute]);

  const getRouteType = (route: Route): string => {
    const effective = resolveEffectiveRouteTypeDoc(route);
    if (effective?.nombre) return String(effective.nombre);
    if (effective?.codigo) return String(effective.codigo);
    const populatedTipo = (route as any)?.tipoNodoId;
    if (typeof populatedTipo === 'object' && populatedTipo?.nombre) return String(populatedTipo.nombre);
    if (typeof populatedTipo === 'object' && populatedTipo?.codigo) return String(populatedTipo.codigo);
    return String(route?.tipoNodo || '-');
  };

  const getRouteTypeOrder = (route: Route): number => {
    const effective = resolveEffectiveRouteTypeDoc(route);
    if (effective) return Number(effective.order ?? 0);
    return resolveRouteTypeOrderLikeBackend(route);
  };

  const routeMatchesTypeFilter = (route: Route, filterValue: string): boolean => {
    const normalizedFilter = String(filterValue || '').trim().toUpperCase();
    if (!normalizedFilter || normalizedFilter === 'ALL') return true;

    const filterTypeDoc = nodeTypes.find((type) => {
      const label = String(type.nombre || type.codigo || '').trim().toUpperCase();
      return label === normalizedFilter;
    });

    if (filterTypeDoc) {
      return routeMatchesNodeType(
        route,
        filterTypeDoc,
        String(filterTypeDoc.nombre || filterTypeDoc.codigo || '')
      );
    }

    return String(getRouteType(route) || '').trim().toUpperCase() === normalizedFilter;
  };

  const resolveRouteNodeTypeCodigo = (route: Route): string => {
    const effective = resolveEffectiveRouteTypeDoc(route);
    if (effective?.codigo) return String(effective.codigo).trim().toUpperCase();

    const populatedTipo = (route as any)?.tipoNodoId;

    if (typeof populatedTipo === 'object' && populatedTipo != null) {
      const codigo = String(populatedTipo.codigo || '').trim().toUpperCase();
      if (codigo) return codigo;
    }

    const typeId = normalizeMongoId(populatedTipo) || normalizeMongoId(route?.tipoNodoId);
    if (typeId) {
      const typeDoc = getTypeById(typeId);
      if (typeDoc?.codigo) return String(typeDoc.codigo).trim().toUpperCase();
      return '';
    }

    return String(route?.tipoNodo || '').trim().toUpperCase();
  };

  const resolveRouteNodeTypeOrder = (route: Route): number => {
    const populatedTipo = (route as any)?.tipoNodoId;
    if (typeof populatedTipo === 'object' && populatedTipo != null && populatedTipo.order != null) {
      return Number(populatedTipo.order);
    }
    const typeId = normalizeMongoId(populatedTipo) || normalizeMongoId(route?.tipoNodoId);
    if (typeId) {
      const typeDoc = getTypeById(typeId);
      if (typeDoc) return Number(typeDoc.order ?? 0);
    }
    return getTypeOrderByCode(String(route?.tipoNodo || ''));
  };

  /** Nombre del tipo (SUITE, MODULO, …) alineado al catálogo y profundidad jerárquica. */
  const resolveRouteNodeTypeNombre = (route: Route): string => {
    const effective = resolveEffectiveRouteTypeDoc(route);
    if (effective?.nombre) return String(effective.nombre).trim().toUpperCase();
    if (effective?.codigo) return String(effective.codigo).trim().toUpperCase();

    const populatedTipo = (route as any)?.tipoNodoId;
    if (typeof populatedTipo === 'object' && populatedTipo != null) {
      const nombre = String(populatedTipo.nombre || '').trim().toUpperCase();
      if (nombre) return nombre;
    }

    const typeId = normalizeMongoId(populatedTipo) || normalizeMongoId(route?.tipoNodoId);
    if (typeId) {
      const typeDoc = getTypeById(typeId);
      if (typeDoc?.nombre) return String(typeDoc.nombre).trim().toUpperCase();
    }

    const legacy = String(route?.tipoNodo || '').trim().toUpperCase();
    if (legacy) {
      const byName = getTypeByName(legacy);
      if (byName?.nombre) return String(byName.nombre).trim().toUpperCase();
      const order = resolveRouteTypeOrderLikeBackend(route);
      const byOrder = nodeTypes.find((t) => Number(t.order ?? 0) === order);
      if (byOrder?.nombre) return String(byOrder.nombre).trim().toUpperCase();
      return legacy;
    }

    const order = resolveRouteTypeOrderLikeBackend(route);
    const byOrder = nodeTypes.find((t) => Number(t.order ?? 0) === order);
    return String(byOrder?.nombre || '').trim().toUpperCase();
  };

  const routeMatchesNodeType = (
    route: Route,
    typeDoc: TipoNodoRuta | undefined,
    fallbackNombre: string
  ): boolean => {
    if (!typeDoc) return false;
    const expectedOrder = Number(typeDoc.order ?? 0);
    const expectedNombre = String(typeDoc.nombre || fallbackNombre).trim().toUpperCase();
    const effective = resolveEffectiveRouteTypeDoc(route);
    if (effective) {
      const effectiveNombre = String(effective.nombre || effective.codigo || '').trim().toUpperCase();
      return effectiveNombre === expectedNombre && Number(effective.order ?? 0) === expectedOrder;
    }
    const routeNombre = resolveRouteNodeTypeNombre(route);
    const routeOrder = resolveRouteTypeOrderLikeBackend(route);
    return routeNombre === expectedNombre && routeOrder === expectedOrder;
  };

  const isSuiteTypeRoute = (route: Route): boolean =>
    routeMatchesNodeType(route, suiteType, 'SUITE');

  const isModuloTypeRoute = (route: Route): boolean =>
    routeMatchesNodeType(route, moduloType, 'MODULO');

  const isFormularioTypeRoute = (route: Route): boolean =>
    routeMatchesNodeType(route, formularioType, 'FORMULARIO');

  const routeBelongsToSelectedSuite = (route: Route, suite: Route): boolean => {
    const suiteIds = getRouteIdentitySet(suite);
    const parentId = resolveParentId(route);
    if (parentId && suiteIds.has(parentId)) return true;

    const rootId = normalizeMongoId((route as any)?.root);
    if (rootId && suiteIds.has(rootId)) return true;

    const ancestors = (route as any)?.ancestors;
    if (Array.isArray(ancestors)) {
      if (ancestors.some((ancestor) => suiteIds.has(normalizeMongoId(ancestor)))) return true;
    }

    return routeBelongsToSuiteBranch(route, suite);
  };

  const routeBelongsToSuiteBranch = (route: Route, suite: Route): boolean => {
    const suiteIds = getRouteIdentitySet(suite);
    let current: Route | undefined = route;
    const visited = new Set<string>();
    while (current) {
      if (suiteIds.has(resolveRouteId(current))) return true;
      const parentId = resolveParentId(current);
      if (!parentId || visited.has(parentId)) break;
      visited.add(parentId);
      current = findRouteByAnyId(parentId);
    }
    return false;
  };

  const resolveRouteTypeOrderLikeBackend = (route: Route): number => {
    const effective = resolveEffectiveRouteTypeDoc(route);
    if (effective) return Number(effective.order ?? 0);

    const populatedTipo = (route as any)?.tipoNodoId;
    const typeId = normalizeMongoId(populatedTipo) || normalizeMongoId(route?.tipoNodoId);

    if (typeId) {
      const typeDoc = getTypeById(typeId);
      if (typeDoc) return Number(typeDoc.order ?? 0);
      if (typeof populatedTipo === 'object' && populatedTipo != null) {
        if (populatedTipo.order != null) return Number(populatedTipo.order);
        const populatedCodigo = String(populatedTipo.codigo || '').trim().toUpperCase();
        if (populatedCodigo) {
          const orderByPopulatedCode = getTypeOrderByCode(populatedCodigo);
          if (orderByPopulatedCode > 0) return orderByPopulatedCode;
        }
      }
      return inferRouteTypeOrderFromDepth(route);
    }

    const codigo = resolveRouteNodeTypeCodigo(route);
    if (codigo) {
      const orderByCode = getTypeOrderByCode(codigo);
      if (orderByCode > 0) return orderByCode;
    }
    return inferRouteTypeOrderFromDepth(route);
  };

  const isRootSuiteRoute = (route: Route): boolean => {
    if (!isSuiteTypeRoute(route)) return false;
    if (resolveParentId(route)) return false;
    const suiteOrderValue = Number(suiteType?.order ?? 1);
    return resolveRouteTypeOrderLikeBackend(route) === suiteOrderValue;
  };

  const inferSuiteIdFromPath = (path: string): string => {
    const norm = normalizePath(path);
    if (!norm) return '';
    const suiteOrderValue = Number(suiteType?.order ?? 1);
    const candidates = routes
      .filter((r) => isSuiteTypeRoute(r))
      .filter((r) => {
        const suitePath = normalizePath(r.path || '');
        return suitePath && suitePath !== '/' && norm.startsWith(`${suitePath}/`);
      })
      .sort((a, b) => normalizePath(b.path || '').length - normalizePath(a.path || '').length);
    return candidates[0] ? resolveRouteId(candidates[0]) : '';
  };

  const subFormParentOptions = useMemo(
    () => {
      if (!selectedModuloIdForSubForm) return [];
      const editingId = editingRoute ? resolveRouteId(editingRoute) : '';
      return counterJerarquiaFormularios.filter((route) => {
        if (editingId && resolveRouteId(route) === editingId) return false;
        return true;
      });
    },
    [counterJerarquiaFormularios, selectedModuloIdForSubForm, editingRoute]
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

  const getSuiteLabel = (route: Route): string =>
    String(route.name || '').trim() || 'Sin nombre';

  const getModuloLabel = (route: Route): string =>
    String(route.name || '').trim() || 'Sin nombre';

  const matchesNodeOptionSearch = (route: Route, search: string, label: string): boolean => {
    const normalizedSearch = String(search || '').trim().toLowerCase();
    if (!normalizedSearch) return true;
    const searchableText = [label, route.name, route.path].filter(Boolean).join(' ').toLowerCase();
    return searchableText.includes(normalizedSearch);
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
  const getAccessTypeCodesByIds = (ids: string[] = [], catalog: AccessTypeOption[] = accessTypes): string[] => {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    return [...new Set(
      ids
        .map((id) => {
          const normalized = String(id || '').trim();
          const found = catalog.find((a) => normalizeMongoId(a) === normalized);
          return String(found?.accessType || '').trim().toUpperCase();
        })
        .filter(Boolean),
    )];
  };

  const getAccessTypeCodesFromRoute = (route: Route): string[] => {
    const raw = (route as any)?.accessType;
    if (Array.isArray(raw) && raw.length > 0) {
      const fromPopulated = raw
        .map((item: any) => {
          if (typeof item === 'string') {
            const found = accessTypes.find((a) => normalizeMongoId(a) === String(item).trim());
            return String(found?.accessType || item).trim().toUpperCase();
          }
          return String(item?.accessType || '').trim().toUpperCase();
        })
        .filter(Boolean);
      if (fromPopulated.length > 0) return [...new Set(fromPopulated)];
    }
    return getAccessTypeCodesByIds(resolveAccessTypeIds(route));
  };

  const isPublicAccessRoute = (route: Route): boolean =>
    getAccessTypeCodesFromRoute(route).includes('PUBLIC');

  const isPrivateAccessRoute = (route: Route): boolean =>
    getAccessTypeCodesFromRoute(route).includes('PRIVATE');

  const isHybridAccessRoute = (route: Route): boolean =>
    isPublicAccessRoute(route) && isPrivateAccessRoute(route);

  const isSubFormularioTypeRoute = (route: Route): boolean =>
    routeMatchesNodeType(route, subFormularioType, 'SUBFORMULARIO');

  const isVisibilityConfigurableRoute = (route: Route): boolean =>
    isFormularioTypeRoute(route) || isSubFormularioTypeRoute(route);

  const normalizeActionMethodLabel = (method = '', etiqueta = ''): string => {
    const combined = `${method} ${etiqueta}`.trim();
    const match = combined.match(/\b(GET|POST|PUT|PATCH|DELETE)\b/i);
    if (match) return match[1].toUpperCase();
    return String(method || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
  };

  const getActionLabelsByIds = (ids: string[] = []): string[] => {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    return ids
      .map((id) => {
        const normalized = String(id || '').trim();
        const found = accionesCatalogo.find((a) => normalizeMongoId(a) === normalized);
        if (!found) return '';
        const method = normalizeActionMethodLabel(String(found.method || ''), String(found.etiquetas || ''));
        const etiqueta = String(found.etiquetas || '').trim().replace(/^(GET|POST|PUT|PATCH|DELETE)\s*,?\s*$/i, '').trim();
        return etiqueta ? `${method} | ${etiqueta}` : method;
      })
      .filter(Boolean);
  };

  const resolveCanManageBaja = (route: Route): boolean => {
    if (toolbarPolicy && toolbarPolicy.canDelete === false) return false;
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
    if (toolbarPolicy && toolbarPolicy.canEdit === false) return false;
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

  const resolveCanTogglePublicStatus = (route: Route): boolean => {
    if (!resolveCanEditRoute(route)) return false;
    if (!isVisibilityConfigurableRoute(route)) return false;
    if (route.mostrarEnNavbarPublico === true) return true;
    if (!isPublicAccessRoute(route)) return false;
    return true;
  };

  const resolveFormAccessTypeCodes = (): string[] => {
    const selectedIds = Array.isArray(formData.accessType)
      ? formData.accessType.filter(Boolean)
      : (formData.accessType ? [String(formData.accessType)] : []);
    return getAccessTypeCodesByIds(selectedIds);
  };

  const resolveFormIsHybridAccess = (): boolean => {
    const codes = resolveFormAccessTypeCodes();
    return codes.includes('PUBLIC') && codes.includes('PRIVATE');
  };

  const syncFormVisibilityFlags = (
    accessTypeIds: string[],
    prev: CreateRouteDto,
    toggledCode?: string,
    toggledChecked?: boolean,
  ): Pick<CreateRouteDto, 'mostrarEnNavbarPublico' | 'mostrarEnSidebar'> => {
    const codes = getAccessTypeCodesByIds(accessTypeIds);
    let navbar = codes.includes('PUBLIC') && prev.mostrarEnNavbarPublico === true;
    let sidebar = codes.includes('PRIVATE') && prev.mostrarEnSidebar === true;

    if (toggledCode === 'PUBLIC') {
      navbar = toggledChecked === true;
      if (navbar && !codes.includes('PRIVATE')) sidebar = false;
    }
    if (toggledCode === 'PRIVATE') {
      sidebar = toggledChecked === true;
      if (sidebar && !codes.includes('PUBLIC')) navbar = false;
    }

    if (navbar && sidebar && !(codes.includes('PUBLIC') && codes.includes('PRIVATE'))) {
      if (toggledCode === 'PUBLIC') sidebar = false;
      else if (toggledCode === 'PRIVATE') navbar = false;
      else {
        navbar = false;
        sidebar = false;
      }
    }

    return {
      mostrarEnNavbarPublico: navbar,
      mostrarEnSidebar: sidebar,
    };
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
  /** Suites desde countertiponodorutas (nivel 1). */
  const suiteOptionsFromCounter = useMemo(
    () => counterJerarquiaSuites,
    [counterJerarquiaSuites]
  );

  const suiteOptionsForFormulario = suiteOptionsFromCounter;

  const filteredSuiteOptions = useMemo(
    () => suiteOptionsFromCounter.filter((route) =>
      matchesNodeOptionSearch(route, parentSelectSearch, getSuiteLabel(route))
    ),
    [suiteOptionsFromCounter, parentSelectSearch]
  );

  const filteredSuiteOptionsForFormulario = useMemo(
    () => suiteOptionsForFormulario.filter((route) =>
      matchesNodeOptionSearch(route, suiteSelectSearch, getSuiteLabel(route))
    ),
    [suiteOptionsForFormulario, suiteSelectSearch]
  );

  const moduloOptionsBySuite = useMemo(
    () => {
      if (!selectedSuiteIdForForm) return [];
      const editingId = editingRoute ? resolveRouteId(editingRoute) : '';
      return counterJerarquiaModulos.filter((route) => {
        if (editingId && resolveRouteId(route) === editingId) return false;
        return true;
      });
    },
    [selectedSuiteIdForForm, counterJerarquiaModulos, editingRoute]
  );

  const moduloOptionsForSubForm = useMemo(
    () => {
      if (!selectedSuiteIdForSubForm) return [];
      const editingId = editingRoute ? resolveRouteId(editingRoute) : '';
      return counterJerarquiaModulos.filter((route) => {
        if (editingId && resolveRouteId(route) === editingId) return false;
        return true;
      });
    },
    [selectedSuiteIdForSubForm, counterJerarquiaModulos, editingRoute]
  );

  const filteredModuloOptionsForSubForm = useMemo(
    () => moduloOptionsForSubForm.filter((route) =>
      matchesNodeOptionSearch(route, parentSelectSearch, getModuloLabel(route))
    ),
    [moduloOptionsForSubForm, parentSelectSearch]
  );

  const filteredModuloOptionsBySuite = useMemo(
    () => moduloOptionsBySuite.filter((route) =>
      matchesNodeOptionSearch(route, parentSelectSearch, getModuloLabel(route))
    ),
    [moduloOptionsBySuite, parentSelectSearch]
  );

  const parentOptionsForSelectedType = useMemo(() => {
    let options: Route[] = [];
    if (isFormularioType) options = moduloOptionsBySuite;
    else if (isSubFormularioType) options = subFormParentOptions;
    else if (isModuloType) {
      options = suiteOptionsFromCounter.length > 0
        ? suiteOptionsFromCounter
        : routes.filter((route) => isSuiteTypeRoute(route));
    }
    else options = getParentOptions(String(formData.tipoNodoId || ''));

    const padreId = String(formData.padreId || '').trim();
    if (editingRoute && padreId) {
      const currentParent = findRouteByAnyId(padreId);
      if (currentParent) {
        const parentValid = isModuloType
          ? isSuiteTypeRoute(currentParent)
          : isFormularioType
            ? isModuloTypeRoute(currentParent)
              && (() => {
                const suiteId = String(selectedSuiteIdForForm || '').trim();
                if (!suiteId) return true;
                const suite = findRouteByAnyId(suiteId);
                return suite ? routeBelongsToSelectedSuite(currentParent, suite) : true;
              })()
          : isSubFormularioType
            ? isFormularioTypeRoute(currentParent)
            : true;
        if (parentValid) {
          const currentParentKey = resolveRouteId(currentParent);
          const exists = options.some((r) => resolveRouteId(r) === currentParentKey);
          if (!exists) options = [currentParent, ...options];
        }
      }
    }
    return options;
  }, [
    formData.tipoNodoId,
    formData.padreId,
    isFormularioType,
    isModuloType,
    isSubFormularioType,
    suiteOptionsFromCounter,
    suiteOptionsForFormulario,
    moduloOptionsBySuite,
    subFormParentOptions,
    routes,
    nodeTypes,
    editingRoute,
    selectedSuiteIdForForm,
  ]);

  const tipoNodoSelectValue = useMemo(() => {
    const fromForm = String(formData.tipoNodoId || '').trim();
    if (fromForm) return fromForm;
    if (editingRoute) {
      const inferred = resolveTypeIdForRoute(editingRoute);
      return inferred || '';
    }
    return '';
  }, [formData.tipoNodoId, editingRoute, nodeTypes]);

  const padreSelectValue = useMemo(() => {
    const padreId = String(
      (isFormularioType && formularioPadreId) ? formularioPadreId : (formData.padreId || '')
    ).trim();
    if (!padreId) return '';
    const found = findRouteByAnyId(padreId);
    return found ? resolveRouteId(found) : padreId;
  }, [formData.padreId, formularioPadreId, isFormularioType, routes, counterJerarquiaSuites]);

  const subFormSuiteSelectValue = useMemo(() => {
    const suiteId = String(selectedSuiteIdForSubForm || '').trim();
    if (!suiteId) return '';
    const found = findRouteByAnyId(suiteId);
    return found ? resolveRouteId(found) : suiteId;
  }, [selectedSuiteIdForSubForm, routes, counterJerarquiaSuites]);

  const subFormModuloSelectValue = useMemo(() => {
    const moduloId = String(selectedModuloIdForSubForm || '').trim();
    if (!moduloId) return '';
    const found = findRouteByAnyId(moduloId);
    return found ? resolveRouteId(found) : moduloId;
  }, [selectedModuloIdForSubForm, routes, counterJerarquiaModulos]);

  const suiteSelectValue = useMemo(() => {
    const suiteId = String(selectedSuiteIdForForm || '').trim();
    if (!suiteId) return '';
    const found = findRouteByAnyId(suiteId);
    return found ? resolveRouteId(found) : suiteId;
  }, [selectedSuiteIdForForm, routes, counterJerarquiaSuites]);

  const filteredSubFormParentOptions = useMemo(
    () => subFormParentOptions.filter((route) => matchesRouteSearch(route, parentSelectSearch)),
    [subFormParentOptions, parentSelectSearch]
  );

  const filteredParentOptionsForSelectedType = useMemo(
    () => parentOptionsForSelectedType.filter((route) => matchesRouteSearch(route, parentSelectSearch)),
    [parentOptionsForSelectedType, parentSelectSearch]
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
        const matchesType = !isTypeFiltering || routeMatchesTypeFilter(node as Route, normalizedTypeFilter);
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

  const cargarUsuariosJerarquia = async (force = false): Promise<void> => {
    if (!force && jerarquiaUsuariosRaw) return;
    setUsuariosLoading(true);
    try {
      const jerarquia = await getJerarquiaUsuarios();
      const { meta } = buildJerarquiaUsuariosListaParaModal(jerarquia);
      setJerarquiaUsuariosRaw(jerarquia);
      setUsuariosJerarquiaMeta({
        ...meta,
        total: contarUsuariosPoolJerarquia(jerarquia),
      });
      if (!meta.total) {
        toast.info(meta.mensajeAlcance);
      }
    } catch (error) {
      console.error('Error cargando usuarios por jerarquía:', error);
      toast.error(
        error instanceof Error
          ? error.message.replace(/^\[\d+\]\s*/, '')
          : 'Error cargando usuarios de la jerarquía',
      );
      setJerarquiaUsuariosRaw(null);
      setUsuariosJerarquiaMeta(null);
    } finally {
      setUsuariosLoading(false);
    }
  };

  const openUserModal = async (): Promise<void> => {
    setIsUserModalOpen(true);
    setUsuarioSearch('');
    setEditingUser(null);
    await cargarUsuariosJerarquia(true);
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
      setEditingUser(null);
      await cargarUsuariosJerarquia(true);
    } catch (e: any) {
      toast.error(String(e?.message || 'Error al actualizar'));
    } finally {
      setUserEditSaving(false);
    }
  };

  const notifyRoutesUpdated = (): void => {
    invalidateSidebarCache();
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
        setToolbarPolicy(response.toolbarPolicy ?? null);
        setToolbarDraft(null);
      } else {
        toast.error('Error loading routes');
      }
    } catch (error) {
      console.error('Error loading routes:', error);
      setRoutesActorTipo('UNKNOWN');
      setRoutesSourceCollection('');
      setToolbarPolicy(null);
      setToolbarDraft(null);
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

  const applyRouteToForm = (route: Route): void => {
    const routeTypeId = resolveTypeIdForRoute(route);
    const routeTypeOrder = resolveTypeOrderForRoute(route, routeTypeId);
    const routeParentId = resolveRouteParentIdFromDoc(route);
    const parentRoute = routeParentId ? findRouteByAnyId(routeParentId) : undefined;
    const moduloOrder = Number(moduloType?.order ?? 2);
    const formularioOrderValue = Number(formularioType?.order ?? 3);
    const subFormOrder = Number(subFormularioType?.order ?? 4);

    let suiteForForm = '';
    let moduloForSubForm = '';
    let padreForForm = routeParentId || '';

    if (routeTypeOrder === moduloOrder) {
      padreForForm = routeParentId || inferSuiteIdFromPath(route.path || '');
      suiteForForm = padreForForm;
    } else if (routeTypeOrder === formularioOrderValue) {
      padreForForm = routeParentId || '';
      suiteForForm = parentRoute ? (resolveRouteParentIdFromDoc(parentRoute) || resolveParentId(parentRoute) || '') : '';
      if (!suiteForForm) suiteForForm = inferSuiteIdFromPath(route.path || '');
    } else if (routeTypeOrder === subFormOrder) {
      padreForForm = routeParentId || '';
      const formulario = parentRoute;
      const modulo = formulario
        ? findRouteByAnyId(resolveRouteParentIdFromDoc(formulario) || resolveParentId(formulario) || '')
        : undefined;
      moduloForSubForm = modulo ? resolveRouteId(modulo) : '';
      suiteForForm = modulo
        ? (resolveRouteParentIdFromDoc(modulo) || resolveParentId(modulo) || '')
        : '';
      if (!suiteForForm) suiteForForm = inferSuiteIdFromPath(route.path || '');
    }

    if (suiteForForm) {
      const suiteRoute = findRouteByAnyId(suiteForForm);
      if (suiteRoute) suiteForForm = resolveRouteId(suiteRoute);
    }
    if (moduloForSubForm) {
      const moduloRoute = findRouteByAnyId(moduloForSubForm);
      if (moduloRoute) moduloForSubForm = resolveRouteId(moduloRoute);
    }
    if (padreForForm) {
      const resolvedParent = findRouteByAnyId(padreForForm);
      if (resolvedParent) padreForForm = resolveRouteId(resolvedParent);
    }

    setSelectedSuiteIdForForm(routeTypeOrder === formularioOrderValue ? suiteForForm : '');
    if (routeTypeOrder === subFormOrder) {
      setSelectedSuiteIdForSubForm(suiteForForm);
      setSelectedModuloIdForSubForm(moduloForSubForm);
    } else {
      setSelectedSuiteIdForSubForm('');
      setSelectedModuloIdForSubForm('');
    }
    if (routeTypeOrder === formularioOrderValue) {
      setFormularioPadreId(padreForForm || '');
    } else {
      setFormularioPadreId('');
    }

    const typeDoc = getTypeById(routeTypeId);
    const existingPath = String(route.path || '').trim();
    const routeAccessIds = resolveAccessTypeIds(route);
    const routeAccessCodes = getAccessTypeCodesFromRoute(route);
    setFormData({
      name: route.name,
      path: resolveHierarchyPathForDraft(route.name, padreForForm, routeTypeOrder, existingPath),
      component: String(route.component || ''),
      layout: route.layout,
      tipoNodo: String(typeDoc?.codigo || route.tipoNodo || ''),
      tipoNodoId: routeTypeId,
      padreId: padreForForm,
      heredaDeRuta: resolveInheritedRouteId(route),
      mostrarEnNavbarPublico: routeAccessCodes.includes('PUBLIC') && route?.mostrarEnNavbarPublico === true,
      mostrarEnSidebar: routeAccessCodes.includes('PRIVATE') && route?.mostrarEnSidebar === true,
      mostrarEnMenuUsuario: route?.mostrarEnMenuUsuario === true,
      tiquetaNavb: route?.tiquetaNavb || null,
      menuUsuarioLabel: route?.menuUsuarioLabel || '',
      menuUsuarioOrder: Number(route?.menuUsuarioOrder ?? 0),
      accessType: routeAccessIds,
      acciones: resolveActionIds(route),
    });
  };

  const openRouteModal = async (route?: Route, forceTypeId?: string): Promise<void> => {
    setParentSelectSearch('');
    setSuiteSelectSearch('');
    if (route) {
      setIsModalOpen(true);
      setEditingRoute(route);
      applyRouteToForm(route);
      const routeId = resolveRouteId(route);
      if (routeId) {
        try {
          const detail = await getRouteById(routeId);
          if (detail?.success && detail?.data) {
            const merged = { ...route, ...detail.data } as Route;
            setEditingRoute(merged);
            applyRouteToForm(merged);
          }
        } catch (error) {
          console.error('Error loading route detail:', error);
        }
      }
      return;
    }
    const typeId = String(forceTypeId || resolveNodeTypeId(formularioType) || '');
    setCreationType(typeId);
    setEditingRoute(null);
    setSelectedSuiteIdForForm('');
    setSelectedSuiteIdForSubForm('');
    setSelectedModuloIdForSubForm('');
    resetRouteForm(typeId);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!isModalOpen || !editingRoute) return;
    const needsTipo = !String(formData.tipoNodoId || '').trim();
    const needsPadre = !String(formData.padreId || '').trim()
      && resolveTypeOrderForRoute(editingRoute) > Number(suiteType?.order ?? 1);
    const needsAccess = !Array.isArray(formData.accessType) || formData.accessType.length === 0;
    const catalogsReady = nodeTypes.length > 0 && routes.length > 0;
    if (
      catalogsReady
      && ((needsTipo && nodeTypes.length > 0) || needsPadre || (needsAccess && accessTypes.length > 0))
    ) {
      applyRouteToForm(editingRoute);
    }
  }, [isModalOpen, editingRoute, nodeTypes.length, accessTypes.length, routes.length, counterJerarquiaSuites.length]);

  const closeRouteModal = (): void => {
    setIsModalOpen(false);
    setEditingRoute(null);
    setSelectedSuiteIdForForm('');
    setSelectedSuiteIdForSubForm('');
    setSelectedModuloIdForSubForm('');
    setFormularioPadreId('');
    setParentSelectSearch('');
    setSuiteSelectSearch('');
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

    if (isModuloType) {
      const parentForModulo = findRouteByAnyId(String(formData.padreId || ''));
      if (!parentForModulo || !isSuiteTypeRoute(parentForModulo)) {
        toast.error('Selecciona una suite valida como padre del modulo');
        return;
      }
    }

    if (isSubFormularioType) {
      if (!String(selectedSuiteIdForSubForm || '').trim()) {
        toast.error('Selecciona una suite (tipo SUITE)');
        return;
      }
      if (!String(selectedModuloIdForSubForm || '').trim()) {
        toast.error('Selecciona un modulo padre');
        return;
      }
      const formPadreId = String(formData.padreId || '').trim();
      const formParent = findRouteByAnyId(formPadreId);
      if (!formParent || !isFormularioTypeRoute(formParent)) {
        toast.error('Selecciona un formulario padre valido');
        return;
      }
    }

    if (isFormularioType) {
      if (!String(selectedSuiteIdForForm || '').trim()) {
        toast.error('Selecciona una suite (tipo SUITE)');
        return;
      }
      const suiteForForm = findRouteByAnyId(selectedSuiteIdForForm);
      if (!suiteForForm || !isSuiteTypeRoute(suiteForForm)) {
        toast.error('La suite seleccionada no es válida (debe ser tipo SUITE)');
        return;
      }
      const moduloPadreId = String(formularioPadreId || formData.padreId || '').trim();
      const moduloParent = findRouteByAnyId(moduloPadreId);
      if (!moduloParent || !isModuloTypeRoute(moduloParent)) {
        toast.error('Selecciona un módulo padre válido (tipo MODULO)');
        return;
      }
      if (!routeBelongsToSelectedSuite(moduloParent, suiteForForm)) {
        toast.error('El módulo seleccionado no pertenece a la suite elegida');
        return;
      }
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

      const parentRoute = findRouteByAnyId(String(formData.padreId || ''));

      const resolvedLayout = (() => {
        const selectedAtIds = Array.isArray(formData.accessType) ? formData.accessType : [];
        const firstAt = accessTypes.find((a) => selectedAtIds.includes(normalizeMongoId(a)));
        if (firstAt?.layout) return firstAt.layout;
        return parentRoute?.layout || formData.layout || editingRoute?.layout || '';
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
        mostrarEnNavbarPublico: (isFormularioType || isSubFormularioType)
          ? formData.mostrarEnNavbarPublico === true
          : false,
        mostrarEnSidebar: (isFormularioType || isSubFormularioType)
          ? formData.mostrarEnSidebar === true
          : false,
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
      notifyRoutesUpdated();
      await loadRoutes();

    } catch (error: any) {
      console.error('Error saving route:', error);
      toast.error(error?.message || 'Error saving route');
    } finally {
      setSubmitting(false);
    }
  };
  const handleDeleteRoute = async (route: Route): Promise<void> => {
    const actorTipo = String(routesActorTipo || '').trim().toUpperCase();
    const esSuperAdminActor = actorTipo === 'SUPERADMIN'
      || actorTipo === 'DIOS'
      || actorTipo === 'DESARROLLADOR';
    let accionSeleccionada: 'ELIMINAR' | 'DESACTIVAR' | null = null;

    if (esSuperAdminActor) {
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
      notifyRoutesUpdated();
      await loadRoutes();
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
      notifyRoutesUpdated();
      await loadRoutes();
    } catch (error: any) {
      console.error('Error toggling route:', error);
      toast.error(error?.message || 'Error changing route status');
    }
  };

  const handleTogglePublicStatus = async (route: Route): Promise<void> => {
    const next = route?.mostrarEnNavbarPublico !== true;
    if (next && !isPublicAccessRoute(route)) {
      toast.error('Para activar navbar publico la ruta debe tener access PUBLIC.');
      return;
    }
    if (next && route.mostrarEnSidebar === true && !isHybridAccessRoute(route)) {
      toast.error('Solo las rutas HYBRID pueden quedar activas a la vez en navbar publico y sidebar.');
      return;
    }

    try {
      await updateRoute(resolveRouteId(route), { mostrarEnNavbarPublico: next } as CreateRouteDto);
      toast.success(next ? 'Navbar publico activado' : 'Navbar publico desactivado');
      notifyRoutesUpdated();
      await loadRoutes();
    } catch (error: any) {
      console.error('Error toggling public route status:', error);
      toast.error(error?.message || 'Error al cambiar estado publico');
    }
  };

  const routeRowActionCatalog = buildRouteRowActionCatalog({
    onPreview: handlePreviewRoute,
    onEdit: (route) => { void openRouteModal(route); },
    onDelete: handleDeleteRoute,
  });

  const toolbarPresetOptions = useMemo(() => [
    {
      mode: 'all' as const,
      label: 'Todos los botones',
      ids: undefined,
    },
    {
      mode: 'consulta' as const,
      label: 'Solo consulta',
      ids: [
        GESTION_RUTAS_TOOLBAR_ACTION_IDS.REFRESCAR,
        GESTION_RUTAS_TOOLBAR_ACTION_IDS.USUARIOS,
        GESTION_RUTAS_TOOLBAR_ACTION_IDS.VER_ARBOL,
      ],
    },
    {
      mode: 'parametrizacion' as const,
      label: 'Solo parametrización',
      ids: [
        GESTION_RUTAS_TOOLBAR_ACTION_IDS.REFRESCAR,
        GESTION_RUTAS_TOOLBAR_ACTION_IDS.PARAM_TIPOS,
        GESTION_RUTAS_TOOLBAR_ACTION_IDS.PARAM_ACCESOS,
      ],
    },
    {
      mode: 'crear' as const,
      label: 'Solo crear nodos',
      ids: [
        GESTION_RUTAS_TOOLBAR_ACTION_IDS.REFRESCAR,
        GESTION_RUTAS_TOOLBAR_ACTION_IDS.NUEVA_SUITE,
        GESTION_RUTAS_TOOLBAR_ACTION_IDS.NUEVO_MODULO,
        GESTION_RUTAS_TOOLBAR_ACTION_IDS.NUEVO_FORMULARIO,
        GESTION_RUTAS_TOOLBAR_ACTION_IDS.NUEVO_SUBFORMULARIO,
      ],
    },
  ], []);

  const formRowActionIds = useMemo((): ActionId[] => {
    const ids = Array.isArray(toolbarPolicy?.rowActionIds) ? toolbarPolicy.rowActionIds : [];
    return ids.map((id) => String(id || '').trim()).filter(Boolean) as ActionId[];
  }, [toolbarPolicy?.rowActionIds]);

  const canNavigateList = toolbarPolicy == null || toolbarPolicy.canList !== false;

  const tenantToolbarDraft = useMemo((): GestionRutasToolbarDraft => {
    const mode = String(toolbarPolicy?.mode || '').trim() as GestionRutasToolbarMode;
    const policyIds = Array.isArray(toolbarPolicy?.actionIds)
      ? toolbarPolicy.actionIds.map((id) => String(id || '').trim()).filter(Boolean) as ActionId[]
      : [];

    if (['all', 'consulta', 'parametrizacion', 'crear', 'sin-acceso'].includes(mode)) {
      return {
        mode: mode === 'sin-acceso' ? 'consulta' : mode,
        actionIds: policyIds.length > 0 ? policyIds : toolbarPresetOptions.find((item) => item.mode === mode)?.ids,
      };
    }

    const actor = String(routesActorTipo || '').trim().toUpperCase();
    const fallbackMode: GestionRutasToolbarMode = actor === 'SUPERADMIN'
      ? 'all'
      : (actor === 'GLOBAL' && toolbarPolicy?.canCreate)
        ? 'crear'
        : (actor === 'GLOBAL' && toolbarPolicy?.canManage)
          ? 'parametrizacion'
          : 'consulta';

    return {
      mode: fallbackMode,
      actionIds: toolbarPresetOptions.find((item) => item.mode === fallbackMode)?.ids,
    };
  }, [routesActorTipo, toolbarPolicy, toolbarPresetOptions]);

  const effectiveToolbarDraft = toolbarDraft ?? tenantToolbarDraft;
  const toolbarMode = effectiveToolbarDraft.mode;
  const toolbarParametrizedIds = effectiveToolbarDraft.actionIds;

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

  const handleSincronizarCounterJerarquia = async (): Promise<void> => {
    setSyncingCounterJerarquia(true);
    try {
      const counterRes = await sincronizarJerarquiaCounter();
      const data = counterRes?.data as SincronizarJerarquiaCounterResult | undefined;
      if (!counterRes?.success) {
        toast.error(counterRes?.message || 'No se pudo sincronizar countertiponodorutas');
        return;
      }
      const creadas = Number(data?.creadas ?? 0);
      const actualizadas = Number(data?.actualizadas ?? 0);
      const sinCambios = Number(data?.sinCambios ?? data?.omitidas ?? 0);
      const errores = Number(data?.errores ?? 0);
      const relacionesActivas = Number(data?.relacionesActivas ?? 0);
      toast.success(
        `Counter sincronizado: ${relacionesActivas} relaciones activas (${creadas} creadas, ${actualizadas} actualizadas, ${sinCambios} sin cambios${errores ? `, ${errores} con error` : ''}).`
      );
      await loadRoutes();
      try {
        const suitesRes = await getJerarquiaOpcionesFromCounter({ nivelOrder: 1 });
        if (suitesRes.success && Array.isArray(suitesRes.data)) {
          setCounterJerarquiaSuites(suitesRes.data);
        }
        if (String(selectedSuiteIdForForm || '').trim()) {
          const modulosRes = await getJerarquiaOpcionesFromCounter({
            nivelOrder: 2,
            padreRutaSeguridadId: selectedSuiteIdForForm,
          });
          if (modulosRes.success && Array.isArray(modulosRes.data)) {
            setCounterJerarquiaModulos(modulosRes.data);
          }
        }
        if (String(selectedSuiteIdForSubForm || '').trim()) {
          const modulosSubRes = await getJerarquiaOpcionesFromCounter({
            nivelOrder: 2,
            padreRutaSeguridadId: selectedSuiteIdForSubForm,
          });
          if (modulosSubRes.success && Array.isArray(modulosSubRes.data)) {
            setCounterJerarquiaModulos(modulosSubRes.data);
          }
          if (String(selectedModuloIdForSubForm || '').trim()) {
            const formsRes = await getJerarquiaOpcionesFromCounter({
              nivelOrder: 3,
              padreRutaSeguridadId: selectedModuloIdForSubForm,
              suiteRutaSeguridadId: selectedSuiteIdForSubForm,
            });
            if (formsRes.success && Array.isArray(formsRes.data)) {
              setCounterJerarquiaFormularios(formsRes.data);
            }
          }
        }
      } catch {
        /* opciones counter opcionales tras sync */
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al sincronizar counter';
      toast.error(message);
    } finally {
      setSyncingCounterJerarquia(false);
    }
  };

  const handleMigrarTipoNodoRutas = async (): Promise<void> => {
    setMigratingNodeTypes(true);
    try {
      const res = await migrarTipoNodoRutas();
      const counterRes = await sincronizarJerarquiaCounter();
      setMigracionResult({
        ...res,
        counterJerarquia: counterRes?.data,
      } as MigracionTipoNodoResult & { counterJerarquia?: unknown });
      if (counterRes?.success) {
        toast.success('Tipos de nodo y relaciones counter sincronizados (sin borrar rutas).');
      }
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
      notifyRoutesUpdated();
      await loadRoutes();
    } catch (error: any) {
      console.error('Error creando SubFormulario:', error);
      toast.error(error?.message || 'Error creando SubFormulario');
    } finally {
      setSubFormSubmitting(false);
    }
  };

  const gestionRutasToolbarCatalog = useMemo(
    () =>
      buildGestionRutasToolbarCatalog({
        onRefrescar: () => void handleSincronizarCounterJerarquia(),
        onUsuarios: () => void openUserModal(),
        onVerArbol: () => setIsTreeModalOpen(true),
        onParamTipos: () => setIsNodeTypeModalOpen(true),
        onParamAccesos: handleOpenAccessTypeModal,
        onNuevaSuite: () => openRouteModal(undefined, resolveNodeTypeId(suiteType) || ''),
        onNuevoModulo: () => openRouteModal(undefined, resolveNodeTypeId(moduloType) || ''),
        onNuevoFormulario: () => openRouteModal(undefined, resolveNodeTypeId(formularioType) || ''),
        onNuevoSubFormulario: () => openRouteModal(undefined, resolveNodeTypeId(subFormularioType) || ''),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers de pantalla
    [suiteType, moduloType, formularioType, subFormularioType],
  );

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
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <GestionRutasToolbarParametrizacion
              catalog={gestionRutasToolbarCatalog}
              value={effectiveToolbarDraft}
              tenantValue={tenantToolbarDraft}
              presets={toolbarPresetOptions}
              onChange={setToolbarDraft}
            />
            <ParameterizedToolbarActionBar
              catalog={gestionRutasToolbarCatalog}
              parametrizedIds={toolbarParametrizedIds}
              context={{ loading: loading || syncingCounterJerarquia }}
            />
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
          ) : !canNavigateList ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <p>Este formulario no tiene accion GET parametrizada.</p>
              <p className="text-sm">Agrega GET en las acciones del formulario para habilitar consulta y navegacion.</p>
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
                    <TableHead>Publico</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground">
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
                            {(() => {
                              const codes = getAccessTypeCodesFromRoute(route);
                              if (codes.length === 0) return <Badge variant="outline">-</Badge>;
                              if (isHybridAccessRoute(route)) {
                                return <Badge variant="outline">HYBRID</Badge>;
                              }
                              return codes.map((code) => (
                                <Badge key={`${resolveRouteId(route)}-${code}`} variant="outline">
                                  {code}
                                </Badge>
                              ));
                            })()}
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
                          {isVisibilityConfigurableRoute(route) ? (
                            <div className="flex flex-col items-start gap-1">
                              <Switch
                                checked={route.mostrarEnNavbarPublico === true}
                                disabled={!resolveCanTogglePublicStatus(route)}
                                onCheckedChange={() => void handleTogglePublicStatus(route)}
                              />
                              {route.mostrarEnNavbarPublico === true ? (
                                <span className="text-[10px] text-muted-foreground">Navbar activo</span>
                              ) : !isPublicAccessRoute(route) ? (
                                <span className="text-[10px] text-muted-foreground">Sin PUBLIC</span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={route.estadoRuta}
                            disabled={!resolveCanToggleRouteStatus(route)}
                            onCheckedChange={() => void handleToggleStatus(route)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <ParameterizedActionBar
                            catalog={routeRowActionCatalog}
                            allowedIds={resolveRouteRowAllowedIds(route, {
                              canEdit: resolveCanEditRoute,
                              canManageBaja: resolveCanManageBaja,
                              parametrizedIds: formRowActionIds.length > 0 ? formRowActionIds : undefined,
                            })}
                            context={route}
                            className="gap-2"
                          />
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
        <DialogContent className="flex max-h-[90vh] w-[min(980px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[980px]">
          <form onSubmit={(e) => void handleSubmitRoute(e)} className="flex min-h-0 flex-1 flex-col">
            <DialogHeader className="shrink-0 space-y-1.5 border-b px-6 py-4 pr-12">
              <DialogTitle>{editingRoute ? 'Editar Ruta' : getCreateDialogTitle()}</DialogTitle>
              <DialogDescription>
                Parametriza nodos jerarquicos (suite, modulo, formulario y subformulario)
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              {editingRoute ? (
                <div className="space-y-2">
                  <Label htmlFor="tipoNodo">Tipo de nodo *</Label>
                  <Select
                    value={tipoNodoSelectValue}
                    onValueChange={(value) => {
                      setParentSelectSearch('');
                      const nextType = getTypeById(value);
                      const nextOrder = Number(nextType?.order ?? 0);
                      const formularioOrderValue = Number(formularioType?.order ?? 3);
                      const nextPadreId = nextOrder <= 1 ? null : formData.padreId;
                      if (nextOrder === formularioOrderValue && nextPadreId) {
                        const modulo = findRouteByAnyId(String(nextPadreId));
                        const suiteId = modulo ? resolveParentId(modulo) : '';
                        if (suiteId) {
                          const suiteRoute = findRouteByAnyId(suiteId);
                          setSelectedSuiteIdForForm(suiteRoute ? resolveRouteId(suiteRoute) : suiteId);
                        }
                      } else if (nextOrder !== formularioOrderValue) {
                        setSelectedSuiteIdForForm('');
                        setFormularioPadreId('');
                      }
                      setFormData((prev) => ({
                        ...prev,
                        tipoNodo: String(nextType?.codigo || ''),
                        tipoNodoId: String(nextType ? resolveNodeTypeId(nextType) : ''),
                        padreId: nextPadreId,
                        path: nextOrder <= 1
                          ? prev.path
                          : resolveHierarchyPathForDraft(prev.name, nextPadreId, nextOrder, prev.path),
                      }));
                    }}
                  >
                    <SelectTrigger id="tipoNodo">
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {nodeTypesForEditSelect.map((tipo) => (
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

              {(isFormularioType || isSubFormularioType) && (
                <div className="space-y-2">
                  <Label htmlFor="suiteSelector">Suite asociada *</Label>
                  <Select
                    value={isFormularioType ? suiteSelectValue : subFormSuiteSelectValue}
                    onValueChange={(value) => {
                      setSuiteSelectSearch('');
                      setParentSelectSearch('');
                      if (isFormularioType) {
                        setSelectedSuiteIdForForm(value);
                        setFormularioPadreId('');
                        setFormData((prev) => ({
                          ...prev,
                          padreId: null,
                          path: resolveHierarchyPathForDraft(prev.name, null, selectedTypeOrder, ''),
                        }));
                      } else {
                        setSelectedSuiteIdForSubForm(value);
                        setSelectedModuloIdForSubForm('');
                        setFormData((prev) => ({
                          ...prev,
                          padreId: null,
                          path: resolveHierarchyPathForDraft(prev.name, null, selectedTypeOrder, ''),
                        }));
                      }
                    }}
                  >
                    <SelectTrigger id="suiteSelector">
                      <SelectValue placeholder="Selecciona suite" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 border-border bg-popover text-popover-foreground">
                      <div className="sticky top-0 z-10 border-b border-border bg-popover p-2">
                        <Input
                          value={suiteSelectSearch}
                          onChange={(e) => setSuiteSelectSearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          placeholder="Buscar suite..."
                          className="h-9 border-input bg-background text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      {filteredSuiteOptionsForFormulario.length > 0 ? (
                        filteredSuiteOptionsForFormulario.map((suite) => (
                          <SelectItem key={resolveRouteId(suite)} value={resolveRouteId(suite)}>
                            {getSuiteLabel(suite)}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          {suiteOptionsForFormulario.length === 0
                            ? 'No hay suites en countertiponodorutas. Sincroniza counter o crea una suite.'
                            : 'No hay resultados para la busqueda.'}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isSubFormularioType && (
                <div className="space-y-2">
                  <Label htmlFor="moduloSubFormSelector">Modulo *</Label>
                  <Select
                    value={subFormModuloSelectValue}
                    onValueChange={(value) => {
                      setParentSelectSearch('');
                      setSelectedModuloIdForSubForm(value);
                      setFormData((prev) => ({
                        ...prev,
                        padreId: null,
                        path: resolveHierarchyPathForDraft(prev.name, null, selectedTypeOrder, ''),
                      }));
                    }}
                    disabled={!selectedSuiteIdForSubForm}
                  >
                    <SelectTrigger id="moduloSubFormSelector">
                      <SelectValue placeholder="Selecciona modulo" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 border-border bg-popover text-popover-foreground">
                      <div className="sticky top-0 z-10 border-b border-border bg-popover p-2">
                        <Input
                          value={parentSelectSearch}
                          onChange={(e) => setParentSelectSearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          placeholder="Buscar modulo..."
                          className="h-9 border-input bg-background text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      {filteredModuloOptionsForSubForm.length > 0 ? (
                        filteredModuloOptionsForSubForm.map((modulo) => (
                          <SelectItem key={resolveRouteId(modulo)} value={resolveRouteId(modulo)}>
                            {getModuloLabel(modulo)}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          {!selectedSuiteIdForSubForm
                            ? 'Primero selecciona la suite.'
                            : moduloOptionsForSubForm.length === 0
                              ? 'No hay modulos en la suite seleccionada (countertiponodorutas).'
                              : 'No hay resultados para la busqueda.'}
                        </div>
                      )}
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
                    value={padreSelectValue}
                    onValueChange={(value) => {
                      setParentSelectSearch('');
                      if (isFormularioType) setFormularioPadreId(value);
                      setFormData((prev) => ({
                        ...prev,
                        padreId: value,
                        path: resolveHierarchyPathForDraft(prev.name, value, selectedTypeOrder, prev.path),
                      }));
                    }}
                    disabled={
                      (isFormularioType && !selectedSuiteIdForForm)
                      || (isSubFormularioType && !selectedModuloIdForSubForm)
                    }
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
                      {isModuloType ? (
                        filteredParentOptionsForSelectedType.length > 0 ? (
                          filteredParentOptionsForSelectedType.map((parent) => (
                            <SelectItem key={resolveRouteId(parent)} value={resolveRouteId(parent)}>
                              {getSuiteLabel(parent)}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            {parentOptionsForSelectedType.length === 0
                              ? 'No hay suites disponibles. Sincroniza counter o crea una suite.'
                              : 'No hay resultados para la busqueda.'}
                          </div>
                        )
                      ) : isFormularioType ? (
                        filteredModuloOptionsBySuite.length > 0 ? (
                          filteredModuloOptionsBySuite.map((parent) => (
                            <SelectItem key={resolveRouteId(parent)} value={resolveRouteId(parent)}>
                              {getModuloLabel(parent)}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            {!selectedSuiteIdForForm
                              ? 'Primero selecciona la suite.'
                              : moduloOptionsBySuite.length === 0
                                ? 'No hay modulos en la suite seleccionada (countertiponodorutas).'
                                : 'No hay resultados para la busqueda.'}
                          </div>
                        )
                      ) : isSubFormularioType ? (
                        filteredSubFormParentOptions.length > 0 ? (
                          filteredSubFormParentOptions.map((parent) => (
                            <SelectItem key={resolveRouteId(parent)} value={resolveRouteId(parent)}>
                              {getRouteHierarchyLabel(parent)}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            {!selectedSuiteIdForSubForm
                              ? 'Primero selecciona la suite.'
                              : !selectedModuloIdForSubForm
                                ? 'Primero selecciona el modulo.'
                                : subFormParentOptions.length === 0
                                  ? 'No hay formularios en el modulo seleccionado (countertiponodorutas).'
                                  : 'No hay resultados para la busqueda.'}
                          </div>
                        )
                      ) : filteredParentOptionsForSelectedType.length > 0 ? (
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
                  {!editingRoute && isModuloType && suiteOptionsFromCounter.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        No hay suites en countertiponodorutas. Sincroniza desde rutaseguridads existentes.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={syncingCounterJerarquia}
                        onClick={() => void handleSincronizarCounterJerarquia()}
                      >
                        {syncingCounterJerarquia ? 'Sincronizando...' : 'Sincronizar counter con rutas existentes'}
                      </Button>
                    </div>
                  )}
                  {!editingRoute && (isFormularioType || isSubFormularioType) && !selectedSuiteIdForForm && !selectedSuiteIdForSubForm && (
                    <p className="text-xs text-muted-foreground">
                      Primero selecciona la suite para habilitar los selectores jerarquicos.
                    </p>
                  )}
                  {!editingRoute && isFormularioType && selectedSuiteIdForForm && moduloOptionsBySuite.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        No hay modulos en la suite seleccionada en countertiponodorutas.
                        Puedes sincronizar desde rutaseguridads existentes sin borrar ni recrear rutas.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={syncingCounterJerarquia}
                        onClick={() => void handleSincronizarCounterJerarquia()}
                      >
                        {syncingCounterJerarquia ? 'Sincronizando...' : 'Sincronizar counter con rutas existentes'}
                      </Button>
                    </div>
                  )}
                  {!editingRoute && isSubFormularioType && selectedModuloIdForSubForm && subFormParentOptions.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        No hay formularios en el modulo seleccionado en countertiponodorutas.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={syncingCounterJerarquia}
                        onClick={() => void handleSincronizarCounterJerarquia()}
                      >
                        {syncingCounterJerarquia ? 'Sincronizando...' : 'Sincronizar counter con rutas existentes'}
                      </Button>
                    </div>
                  )}
                  {!editingRoute && isSubFormularioType && !selectedModuloIdForSubForm && selectedSuiteIdForSubForm && (
                    <p className="text-xs text-muted-foreground">
                      Selecciona el modulo para habilitar los formularios padre.
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
                      .filter((a) => selectedAtIds.includes(normalizeMongoId(a)) && a.layout)
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
                  <div className="rounded-md border p-4 flex flex-wrap gap-x-6 gap-y-3">
                    {accessTypes
                      .filter((item) => item.estadoAcces !== false)
                      .map((item) => {
                      const id = normalizeMongoId(item);
                      if (!id) return null;
                      const selected = Array.isArray(formData.accessType) && formData.accessType.includes(id);
                      return (
                        <label key={id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const itemCode = String(item.accessType || '').trim().toUpperCase();
                              setFormData((prev) => {
                                const current = Array.isArray(prev.accessType)
                                  ? [...prev.accessType]
                                  : (prev.accessType ? [String(prev.accessType)] : []);
                                const next = checked
                                  ? [...new Set([...current, id])]
                                  : current.filter((value) => value !== id);
                                const visibility = syncFormVisibilityFlags(
                                  next,
                                  prev,
                                  itemCode === 'PUBLIC' || itemCode === 'PRIVATE' ? itemCode : undefined,
                                  checked,
                                );
                                return {
                                  ...prev,
                                  accessType: next,
                                  ...visibility,
                                };
                              });
                            }}
                          />
                          <span>
                            {String(item.accessType || 'N/A')}
                            {item.layout ? ` (${String(item.layout)})` : ''}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Puedes seleccionar uno o varios tipos de acceso. El layout efectivo se resolvera desde la seleccion.
                  </p>
                </div>
              )}
              {(isFormularioType || isSubFormularioType) && (() => {
                const formAccessCodes = resolveFormAccessTypeCodes();
                const canNavbar = formAccessCodes.includes('PUBLIC');
                const canSidebar = formAccessCodes.includes('PRIVATE');
                const navbarChecked = canNavbar && formData.mostrarEnNavbarPublico === true;
                const sidebarChecked = canSidebar && formData.mostrarEnSidebar === true;

                return (
                <div className="space-y-3 md:col-span-2 rounded-md border p-4">
                  <p className="text-sm font-medium">Visibilidad en menus</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className={`flex min-w-0 items-center justify-between gap-4 rounded-md border px-4 py-3 ${!canNavbar ? 'opacity-70' : ''}`}>
                      <div className="min-w-0 space-y-1">
                        <Label>Navbar publico</Label>
                        <p className="text-xs text-muted-foreground">
                          {canNavbar
                            ? 'Expone la ruta en el catalogo publico.'
                            : 'Marca un tipo de acceso PUBLIC para habilitarlo.'}
                        </p>
                      </div>
                      <Switch
                        className="shrink-0"
                        checked={navbarChecked}
                        onCheckedChange={(checked) => {
                          if (checked && !canNavbar) {
                            toast.info('Marca un tipo de acceso PUBLIC antes de activar el navbar publico.');
                            return;
                          }
                          if (checked && sidebarChecked && !resolveFormIsHybridAccess()) {
                            toast.error('Solo las rutas HYBRID pueden quedar activas a la vez en navbar publico y sidebar.');
                            return;
                          }
                          setFormData((prev) => ({ ...prev, mostrarEnNavbarPublico: checked }));
                        }}
                      />
                    </div>
                    <div className={`flex min-w-0 items-center justify-between gap-4 rounded-md border px-4 py-3 ${!canSidebar ? 'opacity-70' : ''}`}>
                      <div className="min-w-0 space-y-1">
                        <Label>Sidebar privado</Label>
                        <p className="text-xs text-muted-foreground">
                          {canSidebar
                            ? 'Visible en el panel administrativo.'
                            : 'Marca un tipo de acceso PRIVATE para habilitarlo.'}
                        </p>
                      </div>
                      <Switch
                        className="shrink-0"
                        checked={sidebarChecked}
                        onCheckedChange={(checked) => {
                          if (checked && !canSidebar) {
                            toast.info('Marca un tipo de acceso PRIVATE antes de activar el sidebar privado.');
                            return;
                          }
                          if (checked && navbarChecked && !resolveFormIsHybridAccess()) {
                            toast.error('Solo las rutas HYBRID pueden quedar activas a la vez en navbar publico y sidebar.');
                            return;
                          }
                          setFormData((prev) => ({ ...prev, mostrarEnSidebar: checked }));
                        }}
                      />
                    </div>
                  </div>
                </div>
                );
              })()}
              {(isFormularioType || isSubFormularioType) && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="acciones">Acciones HTTP *</Label>
                  <div className="rounded-md border p-4 flex flex-wrap gap-x-6 gap-y-3">
                    {accionesCatalogo.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay acciones disponibles.</p>
                    ) : (
                      accionesCatalogo.map((accion) => {
                        const id = normalizeMongoId(accion);
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
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4 sm:justify-end">
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
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex flex-wrap items-start justify-between gap-2 pr-8">
              <div className="min-w-0 flex-1">
                <DialogTitle>Gestión de Usuarios</DialogTitle>
                <DialogDescription>
                  Organigrama de usuarios según tu sesión (JWT) y tenantJerarquiaCounter /
                  tenantJerarquiaCountersGlobal.
                </DialogDescription>
              </div>
              <OrganigramaLegendaInfoButton label="Organigrama · orden" />
            </div>
          </DialogHeader>

          {usuariosJerarquiaMeta ? (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                Alcance: {usuariosJerarquiaMeta.scope ?? 'sin sesión'}
                {usuariosJerarquiaMeta.vistaDios ? ' (DIOS)' : ''}
                {' · '}
                {usuariosJerarquiaMeta.total} usuario(s)
              </span>
              <p className="mt-1">{usuariosJerarquiaMeta.mensajeAlcance}</p>
            </div>
          ) : null}

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
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-3 flex gap-2">
                <Input
                  placeholder="Buscar en el organigrama..."
                  value={usuarioSearch}
                  onChange={(e) => setUsuarioSearch(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={() => void cargarUsuariosJerarquia(true)} disabled={usuariosLoading}>
                  <RefreshCw className={`h-4 w-4 ${usuariosLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <GestionRutasUsuariosOrganigrama
                  jerarquia={jerarquiaUsuariosRaw}
                  loading={usuariosLoading}
                  busqueda={usuarioSearch}
                  onEditUsuario={(u) => openEditUser(u)}
                />
              </div>
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

