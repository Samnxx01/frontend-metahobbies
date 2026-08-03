import type { ActionId } from '../types';
import { ENDPOINTS as GOVERNANCE_ENDPOINTS } from '@/app/presentation/pages/admin/gobernanza/parametrosGobernanzaEndpoints';

export type GovernedActionDefinition = {
  /** ID permanente. No debe depender del texto visible del botón. */
  id: ActionId;
  label: string;
  moduleId: string;
  moduleLabel: string;
  routePath: string;
  routeSecurity: {
    path: string;
    allowedCounterNodeTypes: readonly ['FORMULARIO', 'SUBFORMULARIO'];
    allowedCounterLevelOrders: readonly [3, 4];
  };
  groupId: string;
  groupLabel: string;
  operation: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXECUTE';
  description?: string;
  legacyIds?: readonly ActionId[];
};

export const TENANT_GOVERNANCE_ACTION_IDS = {
  OPEN_BUTTON_CATALOG: 'tenant.governance.buttons.catalog.open',
  VIEW_TENANT_USERS: 'tenant.governance.users.hierarchy.view',
  VIEW_CORPORATE_USERS: 'tenant.governance.users.corporate.view',
  MANAGE_GLOBAL_ROLES: 'tenant.governance.roles.global.manage',
  MANAGE_CORPORATE_ROLES: 'tenant.governance.roles.corporate.manage',
  MANAGE_ROUTE_SCOPES: 'tenant.governance.routes.permissions.manage',
  CREATE_TENANT_USER: 'tenant.superadmin.users.create',
} as const satisfies Record<string, ActionId>;

export const PRODUCT_ACTION_IDS = {
  MANAGE_RULE_SCOPE: 'products.rules.scope.manage',
  MANAGE_CATALOG_CONFIG: 'products.catalog.config.manage',
  MANAGE_SALES_SEQUENCE: 'products.sales.sequence.manage',
  MANAGE_SALES_RULES: 'products.sales.rules.manage',
  MANAGE_ACCOUNTING_RULES: 'products.accounting.rules.manage',
  REQUEUE_PIPELINE_B: 'products.pipeline-b.requeue',
  SYNC: 'products.catalog.sync',
  VIEW_CATEGORIES: 'products.categories.view',
  CREATE_CATEGORY: 'products.categories.create',
  MANAGE_PRODUCT_TYPES: 'products.types.manage',
  CREATE_PRODUCT_TYPE: 'products.types.create',
  UPDATE_PRODUCT_TYPE: 'products.types.update',
  DELETE_PRODUCT_TYPE: 'products.types.delete',
  CREATE_PRODUCT: 'products.create',
} as const satisfies Record<string, ActionId>;

export const TENANT_USERS_ACTION_IDS = {
  CREATE_SUPER_ADMIN: 'tenant.users.superadmin.create',
  CREATE_GLOBAL: 'tenant.users.global.create',
  VIEW_HIERARCHY: 'tenant.users.hierarchy.view',
  VIEW_CORPORATE: 'tenant.users.corporate.view',
  EDIT_USER: 'tenant.users.user.edit',
  CREATE_CORPORATE_USER: 'tenant.users.corporate.create',
  EDIT_TENANT_GLOBAL: 'tenant.users.tenant-global.edit',
  MANAGE_DOMAINS: 'tenant.users.domains.manage',
  OPEN_GOVERNANCE: 'tenant.users.governance.open',
} as const satisfies Record<string, ActionId>;

export const GOVERNANCE_PERMISSIONS_ACTION_IDS = {
  VALIDATE_NEW_ROUTES: 'governance.permissions.routes.validate',
  SYNC_NOW: 'governance.permissions.routes.sync',
  SYNC_RULES_INHERITANCE: 'governance.permissions.rules-inheritance.sync',
} as const satisfies Record<string, ActionId>;

export const ROUTES_DYNAMIC_ACTION_IDS = {
  USERS: 'USUARIOS',
  VIEW_TREE: 'VER_ARBOL',
  MANAGE_TYPES: 'PARAM_TIPOS',
  MANAGE_ACCESS: 'PARAM_ACCESOS',
  CREATE_SUITE: 'NUEVA_SUITE',
  CREATE_MODULE: 'NUEVO_MODULO',
  CREATE_FORM: 'NUEVO_FORMULARIO',
  CREATE_SUBFORM: 'NUEVO_SUBFORMULARIO',
  PREVIEW_ROUTE: 'PREVIEW',
  EDIT_ROUTE: 'EDITAR',
  DISABLE_ROUTE: 'BAJA',
} as const satisfies Record<string, ActionId>;

export const INVENTORY_SHARED_ACTION_IDS = {
  VIEW_PURCHASE_ORDER: 'VER',
  EDIT_ENTITY: 'EDIT',
  DELETE_ENTITY: 'ELIMINAR',
} as const satisfies Record<string, ActionId>;

export const INVENTORY_PURCHASE_ACTION_IDS = {
  MANAGE_ORDER_STATUSES: 'inventory.purchases.order-statuses.manage',
  CREATE_RECEIPT: 'inventory.purchases.receipts.create',
  MANAGE_ACCOUNTING_RULES: 'inventory.purchases.accounting-rules.manage',
  CREATE_PROVIDER: 'inventory.purchases.providers.create',
  CREATE_ORDER: 'inventory.purchases.orders.create',
  EDIT_PROVIDER: 'inventory.purchases.providers.update',
  DEACTIVATE_PROVIDER: 'inventory.purchases.providers.deactivate',
} as const satisfies Record<string, ActionId>;

export const INVENTORY_SKU_ACTION_IDS = {
  REFRESH_CATALOG: 'inventory.skus.catalog.refresh',
  EXPORT_CATALOG: 'inventory.skus.catalog.export',
  IMPORT_CATALOG: 'inventory.skus.catalog.import',
  VIEW_DETAILS: 'inventory.skus.details.view',
  DEACTIVATE: 'inventory.skus.deactivate',
  DELETE: 'inventory.skus.delete',
  EDIT: 'inventory.skus.update',
  GENERATE_BARCODE: 'inventory.skus.barcode.generate',
} as const satisfies Record<string, ActionId>;

export const PAYMENT_METHOD_ACTION_IDS = {
  VIEW_COLOMBIA_BANKS: 'payments.banks.colombia.catalog.view',
} as const satisfies Record<string, ActionId>;

const productAction = (id: ActionId, label: string, groupId: string, groupLabel: string, operation: GovernedActionDefinition['operation'], description: string): GovernedActionDefinition => ({
  id, label, moduleId: 'products', moduleLabel: 'Gestión de Productos', routePath: '/admin/productos',
  routeSecurity: { path: '/admin/productos', allowedCounterNodeTypes: ['FORMULARIO', 'SUBFORMULARIO'], allowedCounterLevelOrders: [3, 4] },
  groupId, groupLabel, operation, description,
});

const governedAction = (
  id: ActionId,
  label: string,
  moduleId: string,
  moduleLabel: string,
  routePath: string,
  groupId: string,
  groupLabel: string,
  operation: GovernedActionDefinition['operation'],
  description: string,
): GovernedActionDefinition => ({
  id, label, moduleId, moduleLabel, routePath,
  routeSecurity: { path: routePath, allowedCounterNodeTypes: ['FORMULARIO', 'SUBFORMULARIO'], allowedCounterLevelOrders: [3, 4] },
  groupId, groupLabel, operation, description,
});

export const governanceEndpointActionId = (endpointId: string): ActionId =>
  `governance.endpoint.${String(endpointId || '').trim().toLowerCase()}`;
export const governanceEndpointConfigureActionId = (endpointId: string): ActionId =>
  `${governanceEndpointActionId(endpointId)}.configure`;

const governanceEndpointActions: GovernedActionDefinition[] = GOVERNANCE_ENDPOINTS.map((endpoint) => {
  const operation: GovernedActionDefinition['operation'] = endpoint.method === 'GET'
    ? 'VIEW'
    : endpoint.method === 'POST'
      ? 'CREATE'
      : endpoint.method === 'DELETE'
        ? 'DELETE'
        : 'UPDATE';
  const sectionLabels: Record<string, string> = {
    tenant: 'Multi Tenant', permisos: 'Permisos', reglas: 'Reglas tenant', corporativo: 'Corporativo Público',
  };
  return governedAction(
    governanceEndpointActionId(endpoint.id),
    endpoint.title,
    `governance-${endpoint.section}`,
    `Gobernanza / ${sectionLabels[endpoint.section] || endpoint.section}`,
    '/admin/gobernanza',
    endpoint.section,
    sectionLabels[endpoint.section] || endpoint.section,
    operation,
    endpoint.description,
  );
});
const governanceEndpointConfigureActions: GovernedActionDefinition[] = GOVERNANCE_ENDPOINTS
  .map((endpoint) => governedAction(
    governanceEndpointConfigureActionId(endpoint.id),
    `Configurar: ${endpoint.title}`,
    `governance-${endpoint.section}`,
    `Gobernanza / ${endpoint.section}`,
    '/admin/gobernanza',
    endpoint.section,
    'Configuración de operación',
    'UPDATE',
    `Abre la configuración de la operación ${endpoint.title}.`,
  ));

/**
 * Catálogo único de acciones gobernables del frontend.
 * Cada migración de botones debe registrar aquí un ID namespaced y estable.
 */
export const GOVERNED_ACTION_CATALOG = [
  governedAction(PAYMENT_METHOD_ACTION_IDS.VIEW_COLOMBIA_BANKS, 'Catálogo de bancos de Colombia', 'payment-methods', 'Métodos de pago', '/admin/inventory', 'banks', 'Bancos', 'VIEW', 'Consulta y sincroniza las entidades bancarias colombianas disponibles mediante Wompi.'),
  ...governanceEndpointActions,
  ...governanceEndpointConfigureActions,
  governedAction(ROUTES_DYNAMIC_ACTION_IDS.USERS, 'Usuarios de rutas', 'dynamic-routes', 'Rutas Dinámicas', '/admin/dinamic/rutas/administracion-accesos', 'toolbar', 'Barra principal', 'VIEW', 'Consulta usuarios relacionados con las rutas.'),
  governedAction(ROUTES_DYNAMIC_ACTION_IDS.VIEW_TREE, 'Ver árbol de rutas', 'dynamic-routes', 'Rutas Dinámicas', '/admin/dinamic/rutas/administracion-accesos', 'toolbar', 'Barra principal', 'VIEW', 'Visualiza la jerarquía completa de rutas.'),
  governedAction(ROUTES_DYNAMIC_ACTION_IDS.MANAGE_TYPES, 'Parametrizar tipos', 'dynamic-routes', 'Rutas Dinámicas', '/admin/dinamic/rutas/administracion-accesos', 'toolbar', 'Barra principal', 'UPDATE', 'Administra los tipos de nodo de rutas.'),
  governedAction(ROUTES_DYNAMIC_ACTION_IDS.MANAGE_ACCESS, 'Parametrizar accesos', 'dynamic-routes', 'Rutas Dinámicas', '/admin/dinamic/rutas/administracion-accesos', 'toolbar', 'Barra principal', 'UPDATE', 'Administra los tipos de acceso de rutas.'),
  governedAction(ROUTES_DYNAMIC_ACTION_IDS.CREATE_SUITE, 'Crear suite', 'dynamic-routes', 'Rutas Dinámicas', '/admin/dinamic/rutas/administracion-accesos', 'creation', 'Creación', 'CREATE', 'Crea una suite de navegación.'),
  governedAction(ROUTES_DYNAMIC_ACTION_IDS.CREATE_MODULE, 'Crear módulo', 'dynamic-routes', 'Rutas Dinámicas', '/admin/dinamic/rutas/administracion-accesos', 'creation', 'Creación', 'CREATE', 'Crea un módulo de navegación.'),
  governedAction(ROUTES_DYNAMIC_ACTION_IDS.CREATE_FORM, 'Crear formulario', 'dynamic-routes', 'Rutas Dinámicas', '/admin/dinamic/rutas/administracion-accesos', 'creation', 'Creación', 'CREATE', 'Crea una ruta de formulario.'),
  governedAction(ROUTES_DYNAMIC_ACTION_IDS.CREATE_SUBFORM, 'Crear subformulario', 'dynamic-routes', 'Rutas Dinámicas', '/admin/dinamic/rutas/administracion-accesos', 'creation', 'Creación', 'CREATE', 'Crea una ruta de subformulario.'),
  governedAction(ROUTES_DYNAMIC_ACTION_IDS.PREVIEW_ROUTE, 'Previsualizar ruta', 'dynamic-routes', 'Rutas Dinámicas', '/admin/dinamic/rutas/administracion-accesos', 'rows', 'Acciones por ruta', 'VIEW', 'Previsualiza la ruta seleccionada.'),
  governedAction(ROUTES_DYNAMIC_ACTION_IDS.EDIT_ROUTE, 'Editar ruta', 'dynamic-routes', 'Rutas Dinámicas', '/admin/dinamic/rutas/administracion-accesos', 'rows', 'Acciones por ruta', 'UPDATE', 'Edita la ruta seleccionada.'),
  governedAction(ROUTES_DYNAMIC_ACTION_IDS.DISABLE_ROUTE, 'Desactivar ruta', 'dynamic-routes', 'Rutas Dinámicas', '/admin/dinamic/rutas/administracion-accesos', 'rows', 'Acciones por ruta', 'DELETE', 'Desactiva o elimina la ruta seleccionada.'),
  governedAction(INVENTORY_SHARED_ACTION_IDS.VIEW_PURCHASE_ORDER, 'Ver orden de compra', 'inventory', 'Inventario', '/admin/inventory', 'purchase-orders', 'Órdenes de compra', 'VIEW', 'Consulta el detalle de una orden de compra.'),
  governedAction(INVENTORY_SHARED_ACTION_IDS.EDIT_ENTITY, 'Editar registro de inventario', 'inventory', 'Inventario', '/admin/inventory', 'shared', 'Acciones de registros', 'UPDATE', 'Edita un registro operativo de inventario.'),
  governedAction(INVENTORY_SHARED_ACTION_IDS.DELETE_ENTITY, 'Eliminar registro de inventario', 'inventory', 'Inventario', '/admin/inventory', 'shared', 'Acciones de registros', 'DELETE', 'Elimina un registro cuando las reglas del inventario lo permiten.'),
  governedAction(INVENTORY_PURCHASE_ACTION_IDS.MANAGE_ORDER_STATUSES, 'Estados OC', 'inventory', 'Inventario', '/admin/inventory', 'purchases', 'Orden/compras', 'UPDATE', 'Administra los estados de las órdenes de compra.'),
  governedAction(INVENTORY_PURCHASE_ACTION_IDS.CREATE_RECEIPT, 'Comprobante de entrada', 'inventory', 'Inventario', '/admin/inventory', 'purchases', 'Orden/compras', 'CREATE', 'Registra la recepción de mercancía de una orden de compra.'),
  governedAction(INVENTORY_PURCHASE_ACTION_IDS.MANAGE_ACCOUNTING_RULES, 'Reglas contables', 'inventory', 'Inventario', '/admin/inventory', 'purchases', 'Orden/compras', 'UPDATE', 'Administra las reglas contables aplicables a compras.'),
  governedAction(INVENTORY_PURCHASE_ACTION_IDS.CREATE_PROVIDER, 'Nuevo proveedor', 'inventory', 'Inventario', '/admin/inventory', 'providers', 'Proveedores', 'CREATE', 'Crea un proveedor para las órdenes de compra.'),
  governedAction(INVENTORY_PURCHASE_ACTION_IDS.CREATE_ORDER, 'Nueva orden de compra', 'inventory', 'Inventario', '/admin/inventory', 'purchase-orders', 'Órdenes de compra', 'CREATE', 'Crea una nueva orden de compra.'),
  governedAction(INVENTORY_PURCHASE_ACTION_IDS.EDIT_PROVIDER, 'Editar proveedor', 'inventory', 'Inventario', '/admin/inventory', 'providers', 'Proveedores', 'UPDATE', 'Edita los datos del proveedor seleccionado.'),
  governedAction(INVENTORY_PURCHASE_ACTION_IDS.DEACTIVATE_PROVIDER, 'Desactivar proveedor', 'inventory', 'Inventario', '/admin/inventory', 'providers', 'Proveedores', 'DELETE', 'Desactiva el proveedor seleccionado.'),
  governedAction(INVENTORY_SKU_ACTION_IDS.REFRESH_CATALOG, 'Actualizar catálogo SKU', 'inventory', 'Inventario', '/admin/inventory', 'skus', 'Catálogo SKU', 'VIEW', 'Recarga el catálogo de SKU desde la base de datos.'),
  governedAction(INVENTORY_SKU_ACTION_IDS.EXPORT_CATALOG, 'Exportar catálogo SKU', 'inventory', 'Inventario', '/admin/inventory', 'skus', 'Catálogo SKU', 'EXECUTE', 'Exporta el catálogo de SKU a Excel.'),
  governedAction(INVENTORY_SKU_ACTION_IDS.IMPORT_CATALOG, 'Importar catálogo SKU', 'inventory', 'Inventario', '/admin/inventory', 'skus', 'Catálogo SKU', 'CREATE', 'Importa productos y SKU desde Excel.'),
  governedAction(INVENTORY_SKU_ACTION_IDS.VIEW_DETAILS, 'Ver detalles del SKU', 'inventory', 'Inventario', '/admin/inventory', 'skus', 'Catálogo SKU', 'VIEW', 'Consulta la información y el código de barras del SKU.'),
  governedAction(INVENTORY_SKU_ACTION_IDS.DEACTIVATE, 'Desactivar SKU', 'inventory', 'Inventario', '/admin/inventory', 'skus', 'Catálogo SKU', 'UPDATE', 'Desactiva el SKU seleccionado.'),
  governedAction(INVENTORY_SKU_ACTION_IDS.DELETE, 'Eliminar SKU', 'inventory', 'Inventario', '/admin/inventory', 'skus', 'Catálogo SKU', 'DELETE', 'Elimina el SKU seleccionado.'),
  governedAction(INVENTORY_SKU_ACTION_IDS.EDIT, 'Editar SKU', 'inventory', 'Inventario', '/admin/inventory', 'skus', 'Catálogo SKU', 'UPDATE', 'Edita el SKU seleccionado.'),
  governedAction(INVENTORY_SKU_ACTION_IDS.GENERATE_BARCODE, 'Generar código de barras', 'inventory', 'Inventario', '/admin/inventory', 'skus', 'Catálogo SKU', 'EXECUTE', 'Genera un código de barras para el SKU seleccionado.'),
  governedAction(TENANT_USERS_ACTION_IDS.CREATE_SUPER_ADMIN, 'Crear usuario SuperAdmin', 'tenant-users', 'Usuarios Tenant', '/admin/usuarios-tenant', 'users', 'Usuarios', 'CREATE', 'Crea un usuario dentro del Tenant SuperAdmin autorizado.'),
  governedAction(TENANT_USERS_ACTION_IDS.CREATE_GLOBAL, 'Crear usuario Global', 'tenant-users', 'Usuarios Tenant', '/admin/usuarios-tenant', 'users', 'Usuarios', 'CREATE', 'Crea un usuario dentro del Tenant Global autorizado.'),
  governedAction(TENANT_USERS_ACTION_IDS.VIEW_HIERARCHY, 'Listar usuarios Tenant SA, TG y TC', 'tenant-users', 'Usuarios Tenant', '/admin/usuarios-tenant', 'users', 'Usuarios', 'VIEW', 'Abre el listado de usuarios de la jerarquía Tenant dentro del alcance autorizado.'),
  governedAction(TENANT_USERS_ACTION_IDS.VIEW_CORPORATE, 'Listar usuarios con rol corporativo', 'tenant-users', 'Usuarios Tenant', '/admin/usuarios-tenant', 'users', 'Usuarios', 'VIEW', 'Abre el listado de usuarios con rol corporativo dentro del alcance autorizado.'),
  governedAction(TENANT_USERS_ACTION_IDS.EDIT_USER, 'Editar usuario Tenant', 'tenant-users', 'Usuarios Tenant', '/admin/usuarios-tenant', 'users', 'Usuarios', 'UPDATE', 'Abre la edición del usuario Tenant seleccionado.'),
  governedAction(TENANT_USERS_ACTION_IDS.CREATE_CORPORATE_USER, 'Agregar usuario corporativo', 'tenant-users', 'Usuarios Tenant', '/admin/usuarios-tenant', 'users', 'Usuarios', 'CREATE', 'Agrega un usuario a la relación corporativa seleccionada.'),
  governedAction(TENANT_USERS_ACTION_IDS.EDIT_TENANT_GLOBAL, 'Editar Tenant Global', 'tenant-users', 'Usuarios Tenant', '/admin/usuarios-tenant', 'tenants', 'Tenant Global', 'UPDATE', 'Abre la edición del Tenant Global seleccionado.'),
  governedAction(TENANT_USERS_ACTION_IDS.MANAGE_DOMAINS, 'Administrar dominios', 'tenant-users', 'Usuarios Tenant', '/admin/usuarios-tenant', 'domains', 'Dominios', 'UPDATE', 'Administra los dominios disponibles en la rama Tenant.'),
  governedAction(TENANT_USERS_ACTION_IDS.OPEN_GOVERNANCE, 'Abrir Gobernanza Tenant', 'tenant-users', 'Usuarios Tenant', '/admin/usuarios-tenant', 'governance', 'Gobernanza', 'VIEW', 'Abre el Centro de gobernanza Tenant.'),
  governedAction(GOVERNANCE_PERMISSIONS_ACTION_IDS.VALIDATE_NEW_ROUTES, 'Validar rutas nuevas', 'governance-permissions', 'Gobernanza / Permisos', '/admin/gobernanza', 'synchronization', 'Sincronización', 'VIEW', 'Valida rutas nuevas o faltantes antes de sincronizar permisos.'),
  governedAction(GOVERNANCE_PERMISSIONS_ACTION_IDS.SYNC_NOW, 'Sincronizar permisos ahora', 'governance-permissions', 'Gobernanza / Permisos', '/admin/gobernanza', 'synchronization', 'Sincronización', 'EXECUTE', 'Sincroniza las rutas y permisos del alcance seleccionado.'),
  governedAction(GOVERNANCE_PERMISSIONS_ACTION_IDS.SYNC_RULES_INHERITANCE, 'Actualizar catálogo de reglas y herencia', 'governance-permissions', 'Gobernanza / Permisos', '/admin/gobernanza', 'inheritance', 'Reglas y herencia', 'UPDATE', 'Actualiza reglas, herencia, vistas y acciones desde el servidor.'),
  productAction(PRODUCT_ACTION_IDS.MANAGE_RULE_SCOPE, 'Alcance reglas', 'rules', 'Reglas', 'UPDATE', 'Parametriza el alcance de las reglas aplicables a productos.'),
  productAction(PRODUCT_ACTION_IDS.MANAGE_CATALOG_CONFIG, 'Configurar catálogo', 'catalog', 'Catálogo', 'UPDATE', 'Administra la configuración comercial del catálogo.'),
  productAction(PRODUCT_ACTION_IDS.MANAGE_SALES_SEQUENCE, 'Secuencia ventas', 'sales', 'Ventas', 'UPDATE', 'Administra la secuencia utilizada en ventas.'),
  productAction(PRODUCT_ACTION_IDS.MANAGE_SALES_RULES, 'Reglas ventas', 'sales', 'Ventas', 'UPDATE', 'Administra las reglas de venta asociadas a productos.'),
  productAction(PRODUCT_ACTION_IDS.MANAGE_ACCOUNTING_RULES, 'Reglas contables', 'accounting', 'Contabilidad', 'UPDATE', 'Administra las reglas contables aplicables a productos.'),
  productAction(PRODUCT_ACTION_IDS.REQUEUE_PIPELINE_B, 'Reencolar Pipeline B', 'sales', 'Ventas', 'EXECUTE', 'Reprocesa las comisiones pendientes del Pipeline B.'),
  productAction(PRODUCT_ACTION_IDS.SYNC, 'Sincronizar productos', 'catalog', 'Catálogo', 'EXECUTE', 'Sincroniza productos desde la colección.'),
  productAction(PRODUCT_ACTION_IDS.VIEW_CATEGORIES, 'Ver categorías', 'categories', 'Categorías', 'VIEW', 'Consulta el catálogo de categorías.'),
  productAction(PRODUCT_ACTION_IDS.CREATE_CATEGORY, 'Crear categoría', 'categories', 'Categorías', 'CREATE', 'Crea una categoría de productos.'),
  productAction(PRODUCT_ACTION_IDS.MANAGE_PRODUCT_TYPES, 'Parametrizar tipos', 'types', 'Tipos de producto', 'UPDATE', 'Administra el catálogo de tipos de producto.'),
  productAction(PRODUCT_ACTION_IDS.CREATE_PRODUCT_TYPE, 'Crear tipo de producto', 'types', 'Tipos de producto', 'CREATE', 'Crea un tipo de producto.'),
  productAction(PRODUCT_ACTION_IDS.UPDATE_PRODUCT_TYPE, 'Editar tipo de producto', 'types', 'Tipos de producto', 'UPDATE', 'Edita un tipo de producto.'),
  productAction(PRODUCT_ACTION_IDS.DELETE_PRODUCT_TYPE, 'Desactivar tipo de producto', 'types', 'Tipos de producto', 'DELETE', 'Desactiva un tipo de producto.'),
  productAction(PRODUCT_ACTION_IDS.CREATE_PRODUCT, 'Agregar producto', 'products', 'Productos', 'CREATE', 'Abre el formulario de creación de productos.'),
  {
    id: TENANT_GOVERNANCE_ACTION_IDS.OPEN_BUTTON_CATALOG,
    label: 'Parametrizar botones',
    moduleId: 'tenant-governance',
    moduleLabel: 'Gobernanza Tenant',
    routePath: '/admin/gobernanza/multi-tenant/botones-alcance',
    routeSecurity: { path: '/admin/gobernanza/multi-tenant/botones-alcance', allowedCounterNodeTypes: ['FORMULARIO', 'SUBFORMULARIO'], allowedCounterLevelOrders: [3, 4] },
    groupId: 'buttons',
    groupLabel: 'Botones',
    operation: 'VIEW',
    description: 'Abre el catálogo central de botones gobernables.',
  },
  {
    id: TENANT_GOVERNANCE_ACTION_IDS.VIEW_TENANT_USERS,
    label: 'Consultar usuarios SA, TG y TC',
    moduleId: 'tenant-governance',
    moduleLabel: 'Gobernanza Tenant',
    routePath: '/admin/gobernanza/multi-tenant/botones-alcance',
    routeSecurity: { path: '/admin/gobernanza/multi-tenant/botones-alcance', allowedCounterNodeTypes: ['FORMULARIO', 'SUBFORMULARIO'], allowedCounterLevelOrders: [3, 4] },
    groupId: 'users',
    groupLabel: 'Usuarios',
    operation: 'VIEW',
  },
  {
    id: TENANT_GOVERNANCE_ACTION_IDS.VIEW_CORPORATE_USERS,
    label: 'Consultar usuarios por relación corporativa',
    moduleId: 'tenant-governance',
    moduleLabel: 'Gobernanza Tenant',
    routePath: '/admin/gobernanza/multi-tenant/botones-alcance',
    routeSecurity: { path: '/admin/gobernanza/multi-tenant/botones-alcance', allowedCounterNodeTypes: ['FORMULARIO', 'SUBFORMULARIO'], allowedCounterLevelOrders: [3, 4] },
    groupId: 'users',
    groupLabel: 'Usuarios',
    operation: 'VIEW',
  },
  {
    id: TENANT_GOVERNANCE_ACTION_IDS.MANAGE_GLOBAL_ROLES,
    label: 'Administrar roles globales',
    moduleId: 'tenant-governance',
    moduleLabel: 'Gobernanza Tenant',
    routePath: '/admin/gobernanza/multi-tenant/botones-alcance',
    routeSecurity: { path: '/admin/gobernanza/multi-tenant/botones-alcance', allowedCounterNodeTypes: ['FORMULARIO', 'SUBFORMULARIO'], allowedCounterLevelOrders: [3, 4] },
    groupId: 'roles',
    groupLabel: 'Roles',
    operation: 'UPDATE',
    description: 'Abre el catálogo de roles globales para consultarlos y administrarlos según el alcance autorizado.',
  },
  {
    id: TENANT_GOVERNANCE_ACTION_IDS.MANAGE_CORPORATE_ROLES,
    label: 'Administrar roles corporativos',
    moduleId: 'tenant-governance',
    moduleLabel: 'Gobernanza Tenant',
    routePath: '/admin/gobernanza/multi-tenant/botones-alcance',
    routeSecurity: { path: '/admin/gobernanza/multi-tenant/botones-alcance', allowedCounterNodeTypes: ['FORMULARIO', 'SUBFORMULARIO'], allowedCounterLevelOrders: [3, 4] },
    groupId: 'roles',
    groupLabel: 'Roles',
    operation: 'UPDATE',
    description: 'Abre el catálogo de roles corporativos para consultarlos y administrarlos según el alcance autorizado.',
  },
  {
    id: TENANT_GOVERNANCE_ACTION_IDS.MANAGE_ROUTE_SCOPES,
    label: 'Parametrizar módulos, rutas y acciones',
    moduleId: 'tenant-governance',
    moduleLabel: 'Gobernanza Tenant',
    routePath: '/admin/gobernanza/multi-tenant/botones-alcance',
    routeSecurity: { path: '/admin/gobernanza/multi-tenant/botones-alcance', allowedCounterNodeTypes: ['FORMULARIO', 'SUBFORMULARIO'], allowedCounterLevelOrders: [3, 4] },
    groupId: 'routes',
    groupLabel: 'Módulos y rutas',
    operation: 'UPDATE',
  },
  {
    id: TENANT_GOVERNANCE_ACTION_IDS.CREATE_TENANT_USER,
    label: 'Guardar tenant usuario',
    moduleId: 'tenant-superadmin',
    moduleLabel: 'Tenant SuperAdmin',
    routePath: '/admin/gobernanza/parametros/tenantsuperadmin',
    routeSecurity: { path: '/admin/gobernanza/parametros/tenantsuperadmin', allowedCounterNodeTypes: ['FORMULARIO', 'SUBFORMULARIO'], allowedCounterLevelOrders: [3, 4] },
    groupId: 'users',
    groupLabel: 'Creación de usuarios',
    operation: 'CREATE',
    description: 'Guarda la creación y relación del usuario dentro del Tenant SuperAdmin.',
  },
] as const satisfies readonly GovernedActionDefinition[];

const catalogById = new Map<ActionId, GovernedActionDefinition>();
for (const action of GOVERNED_ACTION_CATALOG) {
  if (catalogById.has(action.id)) throw new Error(`ID de acción duplicado: ${action.id}`);
  catalogById.set(action.id, action);
}

export const getGovernedActionDefinition = (id: ActionId): GovernedActionDefinition | undefined =>
  catalogById.get(String(id || '').trim());

export const groupGovernedActionsByModule = (
  catalog: readonly GovernedActionDefinition[] = GOVERNED_ACTION_CATALOG,
): Map<string, GovernedActionDefinition[]> => {
  const grouped = new Map<string, GovernedActionDefinition[]>();
  catalog.forEach((action) => {
    const current = grouped.get(action.moduleId) ?? [];
    grouped.set(action.moduleId, [...current, action]);
  });
  return grouped;
};
