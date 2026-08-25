import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { apiFetch } from '@/app/services/api';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  Briefcase,
  Building2,
  ChevronDown,
  ChevronRight,
  Globe,
  Layers,
  List,
  Loader2,
  Lock,
  Network,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Route,
  Search,
  Settings2,
  Shield,
  Trash2,
  Users,
  Wand2,
} from 'lucide-react';
import { NvlGlobalCrearHelpButton } from './gobernanza/NvlGlobalCrearHelpButton';

// ─────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────
type HttpMethod  = 'GET' | 'POST' | 'PUT' | 'DELETE';
type FieldType   = 'text' | 'id' | 'json' | 'textarea' | 'boolean' | 'number';
type EndpointSection =
  | 'catalogos'
  | 'nvl-global'
  | 'nvl-corporativo'
  | 'roles'
  | 'catalogo-corp'
  | 'reglas'
  | 'rutas'
  | 'dominios'
  | 'governance';

type FieldSpec = {
  name: string; label: string; type: FieldType;
  required?: boolean; placeholder?: string; hint?: string;
  pathParam?: boolean; header?: boolean;
  readOnly?: boolean;
};
// Configuracion del picker de entidades existentes
type PickerConfig = {
  listPath: string;             // endpoint GET para listar registros existentes
  label: string;                // etiqueta del boton/panel
  displayFields: string[];      // campos a mostrar en cada fila del picker
  fillMap: Record<string, string>; // campo_respuesta → nombre_campo_formulario
};

type EndpointSpec = {
  id: string; section: EndpointSection; method: HttpMethod;
  path: string; title: string; description: string; fields: FieldSpec[];
  picker?: PickerConfig;        // opcional: muestra panel de entidades existentes
};

type NvlGlobalItem = {
  iud?: string;
  _id?: string;
  nvlGeneracionGlobal?: string;
  /** Cuando viene del listado fusionado NVL padre + config hija */
  configNvlGlobalId?: string | null;
  nvl?: string | number;
  generation_tenant?: string;
  nombre?: string;
  descripcion?: string;
  orden?: number;
  securityPlatform?: boolean;
  secuencia?: number;
  estado?: boolean;
};

type NvlModalState = {
  nvl: string;
  generation_tenant: string;
  nombre: string;
  descripcion: string;
};

type NvlListEditState = {
  id: string;
  nvl: string;
  generation_tenant: string;
  nombre: string;
  descripcion: string;
};

type NvlSequenceState = {
  key: string;
  current: number;
  next: number;
  exists: boolean;
  retryLimit: number;
  totalRegistros: number;
  registros: Array<{
    _id?: string;
    iud?: string;
    nvl?: string | number | null;
    generation_tenant?: string | null;
    nombre?: string | null;
    descripcion?: string | null;
    nvlGeneracionGlobal?: string | null;
    secuencia?: number | null;
    securityPlatform?: boolean;
    estado?: boolean;
    nivelPadreActivo?: boolean;
    nivelPadreFaltante?: boolean;
  }>;
};

// ─────────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────────
const METHOD_STYLE: Record<HttpMethod, string> = {
  GET:    'bg-info/10 text-info border-info/20',
  POST:   'bg-success/10 text-success border-success/20',
  PUT:    'bg-warning/10 text-warning border-warning/20',
  DELETE: 'bg-destructive/10 text-destructive border-destructive/20',
};
const METHOD_ICON: Record<HttpMethod, React.ReactNode> = {
  GET:    <List    className="h-3 w-3" />,
  POST:   <Plus    className="h-3 w-3" />,
  PUT:    <Pencil  className="h-3 w-3" />,
  DELETE: <Trash2  className="h-3 w-3" />,
};
const SECTION_ICON: Record<EndpointSection, React.ReactNode> = {
  'catalogos':       <Layers    className="h-4 w-4" />,
  'nvl-global':      <Network   className="h-4 w-4" />,
  'nvl-corporativo': <Building2 className="h-4 w-4" />,
  'roles':           <Users     className="h-4 w-4" />,
  'catalogo-corp':   <Briefcase className="h-4 w-4" />,
  'reglas':          <Shield    className="h-4 w-4" />,
  'rutas':           <Route     className="h-4 w-4" />,
  'dominios':        <Globe     className="h-4 w-4" />,
  'governance':      <Lock      className="h-4 w-4" />,
};
const SECTION_COLOR: Record<EndpointSection, string> = {
  'catalogos':       'text-info',
  'nvl-global':      'text-info',
  'nvl-corporativo': 'text-success',
  'roles':           'text-info',
  'catalogo-corp':   'text-primary',
  'reglas':          'text-warning',
  'rutas':           'text-success',
  'dominios':        'text-warning',
  'governance':      'text-destructive',
};
const SECTION_LABEL: Record<EndpointSection, string> = {
  'catalogos':       'Catalogos base',
  'nvl-global':      'NVL Jerarquia Global',
  'nvl-corporativo': 'NVL Jerarquia Corporativa',
  'roles':           'Roles del sistema',
  'catalogo-corp':   'Catalogos corporativos',
  'reglas':          'Reglas de seguridad',
  'rutas':           'Rutas y navegacion',
  'dominios':        'Dominios registrados',
  'governance':      'Gobernanza y limitadores',
};
const SECTIONS: EndpointSection[] = [
  'catalogos', 'nvl-global', 'nvl-corporativo',
  'roles', 'catalogo-corp', 'reglas', 'rutas', 'dominios', 'governance',
];

const EMPTY_NVL_MODAL: NvlModalState = {
  nvl: '',
  generation_tenant: '',
  nombre: '',
  descripcion: '',
};

const EMPTY_NVL_LIST_EDIT: NvlListEditState = {
  id: '',
  nvl: '',
  generation_tenant: '',
  nombre: '',
  descripcion: '',
};

// ─────────────────────────────────────────────────────────────────
// ENDPOINTS — CATALOGOS BASE
// ─────────────────────────────────────────────────────────────────
const EP_CATALOGOS: EndpointSpec[] = [
  {
    id: 'cat-tipo-comprador-crear', section: 'catalogos', method: 'POST',
    path: '/api/config/tenant/tipo/acceso/globales/roles',
    title: 'Crear tipo comprador',
    description: 'Crea un registro en tenantCompraRoles. Define los tipos de comprador disponibles en el flujo de tenant corporativo.',
    fields: [
      { name: 'tipo_comprador', label: 'Tipo comprador', type: 'text', required: true, placeholder: 'Ej: PREMIUM', hint: 'Nombre identificador del tipo de comprador. Se almacena en uppercase.' },
      { name: 'sigla',          label: 'Sigla',          type: 'text', required: true, placeholder: 'Ej: PRE',     hint: 'Abreviatura de 2-5 caracteres usada en listados compactos.' },
    ],
  },
  {
    id: 'cat-tipo-tenant-crear', section: 'catalogos', method: 'POST',
    path: '/api/config/tenant/tipo/acceso/usu/coporativa',
    title: 'Crear tipo tenant',
    description: 'Crea un registro en tipoAccesoTenant. Define las categorias de acceso disponibles al crear un tenant global.',
    fields: [
      { name: 'tipo_acceso_apis', label: 'Tipo acceso APIs', type: 'text', required: true, placeholder: 'Ej: API_FULL', hint: 'Clave interna del tipo de acceso. Se usa en el selector al crear tenants.' },
      { name: 'sigla',            label: 'Sigla',            type: 'text', required: true, placeholder: 'Ej: AF',       hint: 'Abreviatura de 2-5 caracteres.' },
    ],
  },
  {
    id: 'cat-tipo-tenant-listar', section: 'catalogos', method: 'GET',
    path: '/api/config/tenant/tipo/acceso/usu/coporativa',
    title: 'Listar tipos acceso tenant',
    description:
      'Lista registros en tipoAccesoTenant (tipo_acceso_apis, sigla, estado). Opcional en query: todos=true (incluye inactivos), estado=true|false.',
    fields: [],
  },
  {
    id: 'cat-contexto-crear', section: 'catalogos', method: 'POST',
    path: '/api/config/tenant/tipo/api/contexto',
    title: 'Crear contexto',
    description: 'Crea un contexto en contextoApiyVista. Los contextos clasifican las reglas de acceso (VISTA, MODULO, API_INTERNA).',
    fields: [
      { name: 'contexto', label: 'Contexto', type: 'text', required: true, placeholder: 'Ej: VISTA', hint: 'Nombre del contexto en uppercase. Se usa al crear reglas de seguridad.' },
    ],
  },
  {
    id: 'cat-contexto-listar', section: 'catalogos', method: 'GET',
    path: '/api/config/tenant/tipo/api/contexto',
    title: 'Listar contextos',
    description: 'Lista todos los contextos activos en contextoApiyVista.',
    fields: [],
  },
  {
    id: 'cat-selects-tenant-global', section: 'catalogos', method: 'GET',
    path: '/api/config/tenant/tipo/listar/globales/contexto/roles',
    title: 'Selects flujo tenant global',
    description: 'Retorna todos los selects necesarios para crear un tenant global: tipos de acceso, niveles de jerarquia, roles disponibles, corporativos y dominios.',
    fields: [],
  },
  {
    id: 'cat-selects-vistas-reglas', section: 'catalogos', method: 'GET',
    path: '/api/config/tenant/tipo/listar/vistas/contexto/roles',
    title: 'Selects vistas y reglas',
    description: 'Retorna vistas (rutaSeguridad), acciones y contextos disponibles para construir reglas de seguridad.',
    fields: [],
  },
  {
    id: 'cat-acciones-listar', section: 'catalogos', method: 'GET',
    path: '/api/seguridad/rutas/acciones',
    title: 'Listar acciones HTTP',
    description: 'Retorna el catalogo de acciones HTTP disponibles (GET, POST, PUT, DELETE, PATCH) del modelo acciones.',
    fields: [],
  },
];

// ─────────────────────────────────────────────────────────────────
// ENDPOINTS — NVL GLOBAL
// ─────────────────────────────────────────────────────────────────
const EP_NVL_GLOBAL: EndpointSpec[] = [
  {
    id: 'nvlg-listar', section: 'nvl-global', method: 'GET',
    path: '/api/config/tenant/tipo/acceso/globales/jerarquia/roles',
    title: 'Listar niveles globales',
    description: 'Lista todos los niveles de jerarquia global (generacionGlobalNvlRoles). La secuencia visible sale de la parametrizacion hija generacionglobalnvlrolesconfigs.',
    fields: [],
  },
  {
    id: 'nvlg-crear', section: 'nvl-global', method: 'POST',
    path: '/api/config/tenant/tipo/acceso/globales/jerarquia/roles',
    title: 'Crear nivel global',
    description: 'Crea un nuevo escalon en la jerarquia global. nvl determina el poder (menor = mayor jerarquia). La parametrizacion avanzada del NVL se gestiona desde el modal Parametrizar.',
    picker: {
      listPath: '/api/config/tenant/tipo/acceso/globales/jerarquia/roles',
      label: 'Ver NVL globales existentes',
      displayFields: ['nvl', 'generation_tenant', 'nombre', 'orden', 'estado'],
      fillMap: { nvl: 'nvl', generation_tenant: 'generation_tenant', nombre: 'nombre', descripcion: 'descripcion', orden: 'orden' },
    },
    fields: [
      { name: 'nvl', label: 'Numero de nivel (nvl)', type: 'text', required: true, placeholder: 'Ej: 3', hint: 'Menor numero = mayor poder. Elige un NVL parametrizado en el listado o «Otro / nuevo nivel» y completa datos con Parametrizar (barra bajo el formulario).' },
      { name: 'generation_tenant', label: 'Clave interna', type: 'text', required: true, placeholder: 'Ej: TENANT-REGIONAL', hint: 'Clave tecnica en UPPERCASE. Ej: LIBRE, TENANT-GLOBAL, TENANT-CORPORATIVO.' },
      { name: 'nombre', label: 'Nombre visible', type: 'text', placeholder: 'Ej: REGIONAL', hint: 'Etiqueta en UPPERCASE que se muestra en la UI al crear tenants.' },
      { name: 'descripcion', label: 'Descripcion', type: 'text', placeholder: 'Ej: Administrador regional', hint: 'Texto explicativo visible en formularios y tooltips.' },
      { name: 'orden', label: 'Secuencia de NVL registrados', type: 'number', placeholder: 'Calculada por contador', hint: 'Este numero sale de la parametrizacion hija generacionglobalnvlrolesconfigs.', readOnly: true },
      { name: 'securityPlatform', label: 'Acceso libre (securityPlatform)', type: 'boolean', hint: 'Este estado se envía desde el formulario padre a la parametrización hija del nivel global.' },
    ],
  },
  {
    id: 'nvlg-modificar', section: 'nvl-global', method: 'PUT',
    path: '/api/config/tenant/tipo/acceso/globales/jerarquia/roles/:id',
    title: 'Modificar nivel global',
    description: 'Actualiza campos del catalogo base de un nivel global. La parametrizacion avanzada del NVL se administra aparte para no mezclar responsabilidades.',
    picker: {
      listPath: '/api/config/tenant/tipo/acceso/globales/jerarquia/roles',
      label: 'Cargar NVL global existente',
      displayFields: ['nvl', 'generation_tenant', 'nombre', 'orden', 'estado'],
      fillMap: { iud: 'id', _id: 'id', nvl: 'nvl', generation_tenant: 'generation_tenant', nombre: 'nombre', descripcion: 'descripcion', orden: 'orden' },
    },
    fields: [
      { name: 'id', label: 'ID del nivel', type: 'id', required: true, pathParam: true, placeholder: 'ObjectId del nivel', hint: 'Obtenlo desde Listar niveles globales.' },
      { name: 'nombre', label: 'Nombre visible', type: 'text', placeholder: 'Ej: SUPER ADMIN' },
      { name: 'descripcion', label: 'Descripcion', type: 'text', placeholder: 'Ej: Nivel raiz con acceso total' },
      { name: 'orden', label: 'Secuencia de NVL registrados', type: 'number', placeholder: 'Ej: 0', readOnly: true },
    ],
  },
  {
    id: 'nvlg-desactivar', section: 'nvl-global', method: 'DELETE',
    path: '/api/config/tenant/tipo/acceso/globales/jerarquia/roles/:id',
    title: 'Desactivar nivel global',
    description: 'Soft delete del nivel global. El registro persiste en DB. Tenants que lo referencian no se ven afectados.',
    picker: {
      listPath: '/api/config/tenant/tipo/acceso/globales/jerarquia/roles',
      label: 'Seleccionar NVL global a desactivar',
      displayFields: ['nvl', 'generation_tenant', 'nombre', 'estado'],
      fillMap: { iud: 'id', _id: 'id' },
    },
    fields: [
      { name: 'id', label: 'ID del nivel', type: 'id', required: true, pathParam: true, placeholder: 'ObjectId del nivel', hint: 'Obtenlo desde Listar niveles globales.' },
    ],
  },
  {
    id: 'nvlg-param-listar', section: 'nvl-global', method: 'GET',
    path: '/api/config/tenant/tipo/acceso/globales/jerarquia/roles/parametrizacion',
    title: 'Listar parametrizacion NVL global',
    description: 'Lista la parametrizacion hija del catalogo NVL global. Aqui vive securityPlatform por cada nivel global padre creado.',
    fields: [],
  },
  {
    id: 'nvlg-param-modificar', section: 'nvl-global', method: 'PUT',
    path: '/api/config/tenant/tipo/acceso/globales/jerarquia/roles/parametrizacion/:id',
    title: 'Modificar parametrizacion NVL global',
    description: 'Actualiza la parametrizacion hija de un nivel global ya creado sin tocar el catalogo padre.',
    fields: [
      { name: 'id', label: 'ID parametrizacion', type: 'id', required: true, pathParam: true, placeholder: 'ObjectId de la parametrizacion' },
      { name: 'securityPlatform', label: 'Acceso libre (securityPlatform)', type: 'boolean' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
// ENDPOINTS — NVL CORPORATIVO
// ─────────────────────────────────────────────────────────────────
const EP_NVL_CORP: EndpointSpec[] = [
  {
    id: 'nvlc-listar', section: 'nvl-corporativo', method: 'GET',
    path: '/api/config/permisos/corporativo/listar/nvl/corporativo',
    title: 'Listar niveles corporativos',
    description: 'Lista los niveles corporativos del tenant autenticado (nvlPermisosCorpo). Incluye nombre, nvlGeneracion, securityPlatform y acciones permitidas.',
    fields: [],
  },
  {
    id: 'nvlc-listar-global', section: 'nvl-corporativo', method: 'GET',
    path: '/api/config/permisos/corporativo/listar/nvl/global',
    title: 'Listar niveles de scope global',
    description: 'Lista nvlPermisosCorpo de scope global (sin tenantCorporativo asignado).',
    fields: [],
  },
  {
    id: 'nvlc-crear', section: 'nvl-corporativo', method: 'POST',
    path: '/api/config/permisos/corporativo/crear/tenant/nvl/corporativo',
    title: 'Crear nivel corporativo',
    description: 'Crea un nivel en el catalogo corporativo del tenant autenticado. nvlGeneracion controla la capacidad de crear sub-corporativos.',
    picker: {
      listPath: '/api/config/permisos/corporativo/listar/nvl/corporativo',
      label: 'Ver NVL corporativos existentes',
      displayFields: ['nombre', 'nvlGeneracion', 'securityPlatform', 'estado'],
      fillMap: { nombre: 'nombre', descripcion: 'descripcion', orden: 'orden', nvlGeneracion: 'nvlGeneracion', securityPlatform: 'securityPlatform', heredarPermisos: 'heredarPermisos' },
    },
    fields: [
      { name: 'nombre', label: 'Nombre del nivel', type: 'text', required: true, placeholder: 'Ej: BODEGA', hint: 'UPPERCASE. Ej: ADMIN_CORPORATIVO, BODEGA, OPERADOR. Unico por tenantGlobal.' },
      { name: 'descripcion', label: 'Descripcion', type: 'text', placeholder: 'Ej: Encargado de inventario' },
      { name: 'orden', label: 'Orden en listas', type: 'number', placeholder: 'Ej: 2' },
      { name: 'nvlGeneracion', label: 'Capacidad de crear sub-tenants', type: 'number', required: true, placeholder: 'Ej: 0', hint: '0 = no crea hijos. 1 = puede crear 1 nivel. -1 = ilimitado.' },
      { name: 'securityPlatform', label: 'Acceso libre (securityPlatform)', type: 'boolean', hint: 'true = bypass jerarquico corporativo. Normalmente solo el nivel ADMIN raiz.' },
      { name: 'heredarPermisos', label: 'Hereda permisos hacia abajo', type: 'boolean', hint: 'true = propaga permisos automaticamente a sub-tenants corporativos.' },
      { name: 'tenantGlobal', label: 'tenantGlobal (ObjectId)', type: 'id', required: true, placeholder: 'ObjectId del tenantGlobal', hint: 'Cada tenantGlobal tiene su propio catalogo de NVL corporativos.' },
    ],
  },
  {
    id: 'nvlc-modificar', section: 'nvl-corporativo', method: 'PUT',
    path: '/api/config/permisos/corporativo/modificar/nvl/corporativo/:id',
    title: 'Modificar nivel corporativo',
    description: 'Actualiza campos de un nivel corporativo existente.',
    picker: {
      listPath: '/api/config/permisos/corporativo/listar/nvl/corporativo',
      label: 'Cargar NVL corporativo existente',
      displayFields: ['nombre', 'nvlGeneracion', 'securityPlatform', 'heredarPermisos', 'estado'],
      fillMap: { iud: 'id', _id: 'id', nombre: 'nombre', descripcion: 'descripcion', orden: 'orden', nvlGeneracion: 'nvlGeneracion', securityPlatform: 'securityPlatform', heredarPermisos: 'heredarPermisos' },
    },
    fields: [
      { name: 'id', label: 'ID del nivel corporativo', type: 'id', required: true, pathParam: true, placeholder: 'ObjectId del nivel', hint: 'Obtenlo desde Listar niveles corporativos.' },
      { name: 'nombre', label: 'Nombre del nivel', type: 'text', placeholder: 'Ej: SUPERVISOR' },
      { name: 'descripcion', label: 'Descripcion', type: 'text', placeholder: 'Ej: Supervisa operaciones' },
      { name: 'orden', label: 'Orden en listas', type: 'number', placeholder: 'Ej: 1' },
      { name: 'nvlGeneracion', label: 'Capacidad de crear sub-tenants', type: 'number', placeholder: 'Ej: 0', hint: '0 = no crea hijos. 1 = 1 nivel. -1 = ilimitado.' },
      { name: 'securityPlatform', label: 'Acceso libre', type: 'boolean' },
      { name: 'heredarPermisos', label: 'Hereda permisos hacia abajo', type: 'boolean' },
    ],
  },
  {
    id: 'nvlc-desactivar', section: 'nvl-corporativo', method: 'DELETE',
    path: '/api/config/permisos/corporativo/desactivar/nvl/corporativo/:id',
    title: 'Desactivar nivel corporativo',
    description: 'Soft delete del nivel corporativo. Los tenantCorporativo que lo referencian no se ven afectados.',
    picker: {
      listPath: '/api/config/permisos/corporativo/listar/nvl/corporativo',
      label: 'Seleccionar NVL corporativo a desactivar',
      displayFields: ['nombre', 'nvlGeneracion', 'estado'],
      fillMap: { iud: 'id', _id: 'id' },
    },
    fields: [
      { name: 'id', label: 'ID del nivel corporativo', type: 'id', required: true, pathParam: true, placeholder: 'ObjectId del nivel', hint: 'Obtenlo desde Listar niveles corporativos.' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
// ENDPOINTS — ROLES DEL SISTEMA
// ─────────────────────────────────────────────────────────────────
const EP_ROLES: EndpointSpec[] = [
  {
    id: 'roles-globales-listar', section: 'roles', method: 'GET',
    path: '/api/seguridad/roles-globales',
    title: 'Listar catálogo de roles globales',
    description: 'Lista la jerarquía de roles globales ordenada por nivel y rol padre.',
    fields: [],
  },
  {
    id: 'roles-globales-crear', section: 'roles', method: 'POST',
    path: '/api/seguridad/roles-globales',
    title: 'Crear rol global jerárquico',
    description: 'Crea una definición de rol global con nivel, alcance y relación padre.',
    fields: [
      { name: 'codigo', label: 'Código', type: 'text', required: true, placeholder: 'Ej: ADMIN_TG' },
      { name: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: ADMIN' },
      { name: 'descripcion', label: 'Descripción', type: 'textarea', placeholder: 'Responsabilidad del rol' },
      { name: 'tipoAlcance', label: 'Tipo de alcance', type: 'text', required: true, placeholder: 'TENANT_GLOBAL', hint: 'SISTEMA, TENANT_SUPER_ADMIN, TENANT_GLOBAL, TENANT_CORPORATIVO o USUARIO.' },
      { name: 'nivel', label: 'Nivel jerárquico', type: 'number', required: true, placeholder: '2' },
      { name: 'rolPadre', label: 'ID del rol padre', type: 'id', placeholder: 'ObjectId; vacío únicamente para SISTEMA' },
      { name: 'esSistema', label: 'Es rol de sistema', type: 'boolean' },
      { name: 'asignable', label: 'Es asignable', type: 'boolean' },
      { name: 'estado', label: 'Estado activo', type: 'boolean' },
    ],
  },
  {
    id: 'roles-globales-actualizar', section: 'roles', method: 'PUT',
    path: '/api/seguridad/roles-globales/:id',
    title: 'Modificar rol global jerárquico',
    description: 'Actualiza la definición y valida que no se produzcan ciclos o niveles inválidos.',
    fields: [
      { name: 'id', label: 'ID del rol global', type: 'id', required: true, pathParam: true },
      { name: 'codigo', label: 'Código', type: 'text', required: true },
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'descripcion', label: 'Descripción', type: 'textarea' },
      { name: 'tipoAlcance', label: 'Tipo de alcance', type: 'text', required: true },
      { name: 'nivel', label: 'Nivel jerárquico', type: 'number', required: true },
      { name: 'rolPadre', label: 'ID del rol padre', type: 'id' },
      { name: 'esSistema', label: 'Es rol de sistema', type: 'boolean' },
      { name: 'asignable', label: 'Es asignable', type: 'boolean' },
      { name: 'estado', label: 'Estado activo', type: 'boolean' },
    ],
  },
  {
    id: 'roles-globales-eliminar', section: 'roles', method: 'DELETE',
    path: '/api/seguridad/roles-globales/:id',
    title: 'Eliminar rol global jerárquico',
    description: 'Elimina un rol sin hijos. Los roles de sistema están protegidos.',
    fields: [
      { name: 'id', label: 'ID del rol global', type: 'id', required: true, pathParam: true },
    ],
  },
  {
    id: 'roles-listar', section: 'roles', method: 'GET',
    path: '/api/seguridad/roles/admin',
    title: 'Listar roles admin',
    description: 'Lista todos los roles del sistema (coleccion roles) con su contexto de tenant.',
    fields: [],
  },
  {
    id: 'roles-crear', section: 'roles', method: 'POST',
    path: '/api/seguridad/roles/admin',
    title: 'Crear rol admin',
    description: 'Crea un nuevo rol en el sistema. El rol se vincula al tenant del usuario autenticado segun su scope JWT.',
    fields: [
      { name: 'rol', label: 'Nombre del rol', type: 'text', required: true, placeholder: 'Ej: ADMIN_VENTAS', hint: 'Nombre identificador del rol en UPPERCASE. Unico dentro del mismo tenant.' },
      { name: 'tenantSuperAdmin', label: 'tenantSuperAdmin (ObjectId)', type: 'id', placeholder: 'ObjectId del super admin', hint: 'Solo si el rol pertenece al nivel super admin. Opcional segun scope.' },
      { name: 'tenantGlobal', label: 'tenantGlobal (ObjectId)', type: 'id', placeholder: 'ObjectId del tenant global', hint: 'Solo si el rol pertenece a un tenant global.' },
      { name: 'tenantCorporativo', label: 'tenantCorporativo (ObjectId)', type: 'id', placeholder: 'ObjectId del corporativo', hint: 'Solo si el rol pertenece a un tenant corporativo.' },
    ],
  },
  {
    id: 'roles-actualizar', section: 'roles', method: 'PUT',
    path: '/api/seguridad/actualizar/roles/admin/:id',
    title: 'Actualizar rol admin',
    description: 'Actualiza el nombre u otros campos de un rol existente.',
    fields: [
      { name: 'id', label: 'ID del rol', type: 'id', required: true, pathParam: true, placeholder: 'ObjectId del rol', hint: 'Obtenlo desde Listar roles admin.' },
      { name: 'rol', label: 'Nuevo nombre del rol', type: 'text', placeholder: 'Ej: SUPERVISOR_VENTAS', hint: 'Nuevo nombre en UPPERCASE.' },
    ],
  },
  {
    id: 'roles-desactivar', section: 'roles', method: 'DELETE',
    path: '/api/seguridad/roles/admin/:id',
    title: 'Desactivar rol admin',
    description: 'Soft delete del rol. El registro persiste en DB con estado=false.',
    fields: [
      { name: 'id', label: 'ID del rol', type: 'id', required: true, pathParam: true, placeholder: 'ObjectId del rol', hint: 'Obtenlo desde Listar roles admin.' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
// ENDPOINTS — CATALOGOS CORPORATIVOS
// ─────────────────────────────────────────────────────────────────
const EP_CATALOGO_CORP: EndpointSpec[] = [
  {
    id: 'cc-catalogo-listar', section: 'catalogo-corp', method: 'GET',
    path: '/api/config/permisos/corporativo/listar/catalogo/tenant/corporativo',
    title: 'Listar catalogo tipo comprador corporativo',
    description: 'Lista los catalogos de tipo comprador corporativo (tenantCompraRolesCorporativo) del tenant autenticado.',
    fields: [],
  },
  {
    id: 'cc-catalogo-crear', section: 'catalogo-corp', method: 'POST',
    path: '/api/config/permisos/corporativo/guardar/catologo/tenant/corporativo',
    title: 'Crear catalogo tipo comprador corporativo',
    description: 'Crea un nuevo catalogo de tipo comprador en el scope corporativo. Define los tipos de compradores disponibles dentro del corporativo.',
    fields: [
      { name: 'tipo_comprador', label: 'Tipo comprador', type: 'text', required: true, placeholder: 'Ej: CLIENTE_DIRECTO', hint: 'Nombre del tipo de comprador en UPPERCASE. Unico dentro del mismo tenantGlobal.' },
      { name: 'sigla', label: 'Sigla', type: 'text', required: true, placeholder: 'Ej: CD', hint: 'Abreviatura de 2-5 caracteres.' },
      { name: 'esDefault', label: 'Es tipo por defecto', type: 'boolean', hint: 'Si true, este tipo se asigna automaticamente cuando no se especifica uno.' },
    ],
  },
  {
    id: 'cc-catalogo-modificar', section: 'catalogo-corp', method: 'PUT',
    path: '/api/config/permisos/corporativo/modificar/catalogo/tenant/corporativo/:id',
    title: 'Modificar catalogo tipo comprador corporativo',
    description: 'Actualiza campos de un catalogo de tipo comprador corporativo.',
    fields: [
      { name: 'id', label: 'ID del catalogo', type: 'id', required: true, pathParam: true, placeholder: 'ObjectId del catalogo', hint: 'Obtenlo desde Listar catalogo tipo comprador corporativo.' },
      { name: 'tipo_comprador', label: 'Tipo comprador', type: 'text', placeholder: 'Ej: DISTRIBUIDOR' },
      { name: 'sigla', label: 'Sigla', type: 'text', placeholder: 'Ej: DIS' },
      { name: 'esDefault', label: 'Es tipo por defecto', type: 'boolean' },
    ],
  },
  {
    id: 'cc-catalogo-desactivar', section: 'catalogo-corp', method: 'DELETE',
    path: '/api/config/permisos/corporativo/desactivar/catalogo/tenant/corporativo/:id',
    title: 'Desactivar catalogo tipo comprador corporativo',
    description: 'Soft delete del catalogo de tipo comprador corporativo.',
    fields: [
      { name: 'id', label: 'ID del catalogo', type: 'id', required: true, pathParam: true, placeholder: 'ObjectId del catalogo', hint: 'Obtenlo desde Listar catalogo tipo comprador corporativo.' },
    ],
  },
  {
    id: 'cc-roles-corp-listar', section: 'catalogo-corp', method: 'GET',
    path: '/api/config/permisos/corporativo/listar/roles/tenant/corporativo',
    title: 'Listar roles corporativos',
    description: 'Lista los roles corporativos (rolesCorporativos) del tenant corporativo autenticado con sus acciones asignadas.',
    fields: [],
  },
];

// ─────────────────────────────────────────────────────────────────
// ENDPOINTS — REGLAS DE SEGURIDAD
// ─────────────────────────────────────────────────────────────────
const EP_REGLAS: EndpointSpec[] = [
  {
    id: 'reg-crear-global', section: 'reglas', method: 'POST',
    path: '/api/config/tenant/tipo/crear/globales/reglas/jerarquia/roles',
    title: 'Crear regla global',
    description: 'Crea una regla de seguridad global en la coleccion reglas. Vincula recurso + acciones + contexto + niveles de jerarquia.',
    fields: [
      { name: 'recurso', label: 'Recurso (ObjectId)', type: 'id', required: true, placeholder: 'ObjectId del recurso/ruta', hint: 'ID de la rutaSeguridad que esta regla protege.' },
      { name: 'generacionTenatGlobales', label: 'Generation Tenant (ObjectId)', type: 'id', required: true, placeholder: 'ObjectId del generation_tenant', hint: 'ID del nivel de generation_tenant al que aplica esta regla.' },
      { name: 'generacionGlovallNvlRoles', label: 'NVL Global (ObjectId)', type: 'id', required: true, placeholder: 'ObjectId del nvlGlobal', hint: 'ID del nivel jerarquico global (generacionGlobalNvlRoles) al que se aplica.' },
      { name: 'generacionCoporativolNvlRoles', label: 'NVL Corporativo (ObjectId)', type: 'id', placeholder: 'ObjectId del nvlCorporativo', hint: 'ID del nivel corporativo (nvlPermisosCorpo) si la regla aplica a nivel corporativo.' },
      { name: 'accionesUsu', label: 'Acciones (array de ObjectIds JSON)', type: 'textarea', placeholder: '["id1","id2"]', hint: 'Array JSON de IDs de acciones permitidas (coleccion acciones). Obtenlos desde Listar acciones HTTP.' },
      { name: 'contextoDefi', label: 'Contexto (ObjectId)', type: 'id', placeholder: 'ObjectId del contexto', hint: 'ID del contexto (contextoApiyVista) al que pertenece la regla.' },
      { name: 'securityPlatform', label: 'Security Platform', type: 'boolean', hint: 'true = esta regla otorga acceso libre al recurso sin restriccion jerarquica.' },
    ],
  },
  {
    id: 'reg-actualizar-global', section: 'reglas', method: 'PUT',
    path: '/api/config/tenant/tipo/actualizar/globales/reglas/jerarquia',
    title: 'Actualizar regla global',
    description: 'Actualiza una regla global existente. Requiere el ID como campo adicional.',
    fields: [
      { name: 'reglaId', label: 'ID de la regla', type: 'id', required: true, placeholder: 'ObjectId de la regla', hint: 'ID de la regla a actualizar. Obtenlo desde Listar selects flujo tenant global.' },
      { name: 'accionesUsu', label: 'Acciones (array JSON)', type: 'textarea', placeholder: '["id1","id2"]', hint: 'Nuevo array de IDs de acciones permitidas.' },
      { name: 'contextoDefi', label: 'Contexto (ObjectId)', type: 'id', placeholder: 'ObjectId del contexto' },
      { name: 'securityPlatform', label: 'Security Platform', type: 'boolean' },
    ],
  },
  {
    id: 'reg-desactivar-global', section: 'reglas', method: 'DELETE',
    path: '/api/config/tenant/tipo/desactivar/globales/reglas/jerarquia',
    title: 'Desactivar regla global',
    description: 'Soft delete de una regla global (estado: false).',
    fields: [
      { name: 'reglaId', label: 'ID de la regla', type: 'id', required: true, placeholder: 'ObjectId de la regla', hint: 'ID de la regla a desactivar.' },
    ],
  },
  {
    id: 'reg-crear-dios', section: 'reglas', method: 'POST',
    path: '/api/config/tenant/tipo/crear/dios/reglas/jerarquia/roles',
    title: 'Crear regla DIOS (NVL 0)',
    description: 'Crea una regla especial para el nivel DIOS (NVL 0) con acceso libre. Requiere el ID del nvlGlobal de nivel 0.',
    fields: [
      { name: 'nvlGlobalId', label: 'ID NVL Global DIOS', type: 'id', required: true, placeholder: 'ObjectId del nvlGlobal NVL 0', hint: 'ID del nivel global de NVL 0 (DIOS/LIBRE). Obtenlo desde Listar niveles globales.' },
    ],
  },
  {
    id: 'reg-actualizar-dios', section: 'reglas', method: 'PUT',
    path: '/api/config/tenant/tipo/actualizar/dios/reglas/jerarquia/roles',
    title: 'Actualizar regla DIOS',
    description: 'Actualiza la regla de nivel DIOS.',
    fields: [
      { name: 'nvlGlobalId', label: 'ID NVL Global DIOS', type: 'id', required: true, placeholder: 'ObjectId del nvlGlobal NVL 0', hint: 'ID del nivel global de NVL 0.' },
      { name: 'accionesUsu', label: 'Acciones (array JSON)', type: 'textarea', placeholder: '["id1","id2"]', hint: 'Array de IDs de acciones.' },
      { name: 'securityPlatform', label: 'Security Platform', type: 'boolean' },
    ],
  },
  {
    id: 'reg-crear-corporativo', section: 'reglas', method: 'POST',
    path: '/api/config/tenant/tipo/crear/globales/corporativo/jerarquia/roles',
    title: 'Crear regla corporativa global',
    description: 'Crea una regla global que aplica al nivel corporativo. Vincula el nvlCorporativo con acciones y contextos.',
    fields: [
      { name: 'generacionCoporativolNvlRoles', label: 'NVL Corporativo (ObjectId)', type: 'id', required: true, placeholder: 'ObjectId del nvlCorporativo', hint: 'ID del nivel corporativo (nvlPermisosCorpo) al que aplica la regla.' },
      { name: 'accionesUsu', label: 'Acciones (array JSON)', type: 'textarea', placeholder: '["id1","id2"]', hint: 'Array de IDs de acciones (coleccion acciones).' },
      { name: 'contextoDefi', label: 'Contexto (ObjectId)', type: 'id', placeholder: 'ObjectId del contexto' },
      { name: 'securityPlatform', label: 'Security Platform', type: 'boolean' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
// ENDPOINTS — RUTAS Y NAVEGACION
// ─────────────────────────────────────────────────────────────────
const EP_RUTAS: EndpointSpec[] = [
  {
    id: 'rut-listar-admin', section: 'rutas', method: 'GET',
    path: '/api/seguridad/rutas/listarRutas/admin',
    title: 'Listar todas las rutas (admin)',
    description: 'Lista todas las rutas del sistema (RutaSeguridad) con todos sus campos. Solo accesible por administradores.',
    fields: [],
  },
  {
    id: 'rut-listar-arbol', section: 'rutas', method: 'GET',
    path: '/api/seguridad/rutas/listarRutas/arbol/admin',
    title: 'Listar rutas en arbol',
    description: 'Lista las rutas organizadas en estructura jerarquica de arbol (padres + hijos).',
    fields: [],
  },
  {
    id: 'rut-modificar', section: 'rutas', method: 'PUT',
    path: '/api/seguridad/rutas/modificar/:id',
    title: 'Modificar ruta',
    description: 'Actualiza los campos configurables de una rutaSeguridad existente (sidebar, navbar, orden, etc.).',
    fields: [
      { name: 'id', label: 'ID de la ruta', type: 'id', required: true, pathParam: true, placeholder: 'ObjectId de la ruta', hint: 'Obtenlo desde Listar todas las rutas.' },
      { name: 'mostrarEnSidebar', label: 'Mostrar en sidebar', type: 'boolean', hint: 'true = la ruta aparece en el menu lateral de la aplicacion.' },
      { name: 'mostrarEnNavbarPublico', label: 'Mostrar en navbar publico', type: 'boolean', hint: 'true = la ruta aparece en la barra de navegacion publica.' },
      { name: 'mostrarEnMenuUsuario', label: 'Mostrar en menu usuario', type: 'boolean', hint: 'true = aparece en el menu desplegable del perfil de usuario.' },
      { name: 'tiquetaNavb', label: 'Etiqueta en navbar', type: 'text', placeholder: 'Ej: Inicio', hint: 'Texto a mostrar en la barra de navegacion.' },
      { name: 'menuUsuarioLabel', label: 'Etiqueta menu usuario', type: 'text', placeholder: 'Ej: Mi perfil', hint: 'Texto a mostrar en el menu del usuario.' },
      { name: 'menuUsuarioOrder', label: 'Orden en menu usuario', type: 'number', placeholder: 'Ej: 1', hint: 'Posicion dentro del menu de usuario. Menor = primero.' },
      { name: 'order', label: 'Orden general', type: 'number', placeholder: 'Ej: 5', hint: 'Orden de aparicion en listas y sidebars.' },
    ],
  },
  {
    id: 'rut-estado', section: 'rutas', method: 'PUT',
    path: '/api/seguridad/rutas/modificar/estados/:id',
    title: 'Cambiar estado de ruta',
    description: 'Activa o desactiva una ruta del sistema.',
    fields: [
      { name: 'id', label: 'ID de la ruta', type: 'id', required: true, pathParam: true, placeholder: 'ObjectId de la ruta' },
      { name: 'estadoRuta', label: 'Estado de la ruta', type: 'boolean', required: true, hint: 'true = activa. false = inactiva (no aparece en ninguna navegacion).' },
    ],
  },
  {
    id: 'rut-desactivar', section: 'rutas', method: 'DELETE',
    path: '/api/seguridad/rutas/inactivo/sistema/:id',
    title: 'Desactivar ruta del sistema',
    description: 'Soft delete de una ruta del sistema.',
    fields: [
      { name: 'id', label: 'ID de la ruta', type: 'id', required: true, pathParam: true, placeholder: 'ObjectId de la ruta' },
    ],
  },
  {
    id: 'rut-tipos-nodo-listar', section: 'rutas', method: 'GET',
    path: '/api/seguridad/rutas/tipos-nodo',
    title: 'Listar tipos de nodo de ruta',
    description: 'Lista el catalogo TipoNodoRuta: MODULO, VISTA, ACCION y otros tipos de nodo de la jerarquia de rutas.',
    fields: [],
  },
  {
    id: 'rut-tipos-nodo-crear', section: 'rutas', method: 'POST',
    path: '/api/seguridad/rutas/tipos-nodo',
    title: 'Crear tipo de nodo de ruta',
    description: 'Crea un nuevo tipo de nodo en el catalogo TipoNodoRuta.',
    fields: [
      { name: 'codigo', label: 'Codigo', type: 'text', required: true, placeholder: 'Ej: MODULO', hint: 'Clave identificadora en UPPERCASE. Ej: MODULO, VISTA, ACCION.' },
      { name: 'nombre', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Modulo del sistema', hint: 'Nombre descriptivo del tipo de nodo.' },
      { name: 'descripcion', label: 'Descripcion', type: 'text', placeholder: 'Ej: Agrupa vistas de un dominio funcional' },
      { name: 'order', label: 'Orden', type: 'number', placeholder: 'Ej: 1' },
    ],
  },
  {
    id: 'rut-tipos-nodo-modificar', section: 'rutas', method: 'PUT',
    path: '/api/seguridad/rutas/tipos-nodo/:id',
    title: 'Modificar tipo de nodo de ruta',
    description: 'Actualiza un tipo de nodo del catalogo TipoNodoRuta.',
    fields: [
      { name: 'id', label: 'ID del tipo de nodo', type: 'id', required: true, pathParam: true, placeholder: 'ObjectId del tipo de nodo', hint: 'Obtenlo desde Listar tipos de nodo.' },
      { name: 'nombre', label: 'Nombre', type: 'text', placeholder: 'Nuevo nombre' },
      { name: 'descripcion', label: 'Descripcion', type: 'text', placeholder: 'Nueva descripcion' },
      { name: 'order', label: 'Orden', type: 'number', placeholder: 'Ej: 2' },
    ],
  },
  {
    id: 'rut-acceso-listar', section: 'rutas', method: 'GET',
    path: '/api/seguridad/rutas/listarTiposRutas/admin',
    title: 'Listar tipos de acceso de ruta',
    description: 'Lista los tipos de acceso (AccesoSeguridad): PUBLIC, PRIVATE, HYBRID y sus layouts asociados.',
    fields: [],
  },
  {
    id: 'rut-acceso-crear', section: 'rutas', method: 'POST',
    path: '/api/seguridad/rutas/parametrizacion/permisos',
    title: 'Crear tipo de acceso de ruta',
    description: 'Crea un nuevo tipo de acceso en AccesoSeguridad. Define si las rutas son publicas o privadas y el layout que usan.',
    fields: [
      { name: 'accessType', label: 'Tipo de acceso', type: 'text', required: true, placeholder: 'Ej: PRIVATE', hint: 'Clave del tipo de acceso. Ej: PUBLIC, PRIVATE, HYBRID.' },
      { name: 'layout', label: 'Layout principal', type: 'text', placeholder: 'Ej: DashboardLayout', hint: 'Nombre del componente de layout que usan las rutas de este tipo.' },
    ],
  },
  {
    id: 'rut-acceso-modificar', section: 'rutas', method: 'PUT',
    path: '/api/seguridad/rutas/parametrizacion/permisos/:id',
    title: 'Modificar tipo de acceso de ruta',
    description: 'Actualiza un tipo de acceso existente.',
    fields: [
      { name: 'id', label: 'ID del tipo de acceso', type: 'id', required: true, pathParam: true, placeholder: 'ObjectId del tipo de acceso', hint: 'Obtenlo desde Listar tipos de acceso.' },
      { name: 'accessType', label: 'Tipo de acceso', type: 'text', placeholder: 'Ej: HYBRID' },
      { name: 'layout', label: 'Layout principal', type: 'text', placeholder: 'Ej: PublicLayout' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
// ENDPOINTS — DOMINIOS REGISTRADOS
// ─────────────────────────────────────────────────────────────────
const EP_DOMINIOS: EndpointSpec[] = [
  {
    id: 'dom-listar', section: 'dominios', method: 'GET',
    path: '/api/seguridad/listar/dominios',
    title: 'Listar dominios',
    description: 'Lista todos los dominios registrados (apisDominio) con su estado y proveedor.',
    fields: [],
  },
  {
    id: 'dom-crear', section: 'dominios', method: 'POST',
    path: '/api/seguridad/dominio',
    title: 'Crear dominio',
    description: 'Registra un nuevo dominio/URL en el catalogo apisDominio. Se usa para vincular tenants con dominios externos.',
    fields: [
      { name: 'etiquetas', label: 'Etiqueta', type: 'text', required: true, placeholder: 'Ej: tienda-principal', hint: 'Identificador amigable del dominio. Se usa en listados y selects.' },
      { name: 'dominio', label: 'URL del dominio', type: 'text', required: true, placeholder: 'Ej: https://tienda.ejemplo.com', hint: 'URL completa del dominio incluyendo protocolo.' },
      { name: 'proovedor', label: 'Proveedor', type: 'text', placeholder: 'Ej: AWS, GCP, NETLIFY', hint: 'Proveedor de hosting o CDN del dominio.' },
    ],
  },
  {
    id: 'dom-actualizar', section: 'dominios', method: 'PUT',
    path: '/api/seguridad/dominio/:id',
    title: 'Actualizar dominio',
    description: 'Actualiza los datos de un dominio registrado o sincroniza su estado.',
    fields: [
      { name: 'id', label: 'ID del dominio', type: 'id', required: true, pathParam: true, placeholder: 'ObjectId del dominio', hint: 'Obtenlo desde Listar dominios.' },
      { name: 'etiquetas', label: 'Etiqueta', type: 'text', placeholder: 'Nueva etiqueta' },
      { name: 'dominio', label: 'URL del dominio', type: 'text', placeholder: 'Nueva URL' },
      { name: 'proovedor', label: 'Proveedor', type: 'text', placeholder: 'Ej: AWS' },
      { name: 'estadoDominio', label: 'Estado del dominio', type: 'boolean', hint: 'true = dominio activo y disponible. false = inactivo.' },
    ],
  },
  {
    id: 'dom-eliminar', section: 'dominios', method: 'DELETE',
    path: '/api/seguridad/dominio/:id',
    title: 'Eliminar dominio',
    description: 'Elimina un dominio registrado del catalogo. Accion permanente — verifica dependencias antes de eliminar.',
    fields: [
      { name: 'id', label: 'ID del dominio', type: 'id', required: true, pathParam: true, placeholder: 'ObjectId del dominio', hint: 'Obtenlo desde Listar dominios.' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
// ENDPOINTS — GOBERNANZA Y LIMITADORES
// ─────────────────────────────────────────────────────────────────
const EP_GOVERNANCE: EndpointSpec[] = [
  {
    id: 'gov-limitador-consultar', section: 'governance', method: 'GET',
    path: '/api/governance/parametrizacion/global/:tenantGlobalId',
    title: 'Consultar limitador de governance',
    description: 'Consulta los limites y restricciones configurados para un tenantGlobal especifico (coleccion limitadorDominio).',
    fields: [
      { name: 'tenantGlobalId', label: 'ID del tenant global', type: 'id', required: true, pathParam: true, placeholder: 'ObjectId del tenantGlobal', hint: 'ID del tenantGlobal cuya parametrizacion deseas consultar.' },
    ],
  },
  {
    id: 'gov-limitador-configurar', section: 'governance', method: 'DELETE',
    path: '/api/governance/parametrizacion/global/:tenantGlobalId',
    title: 'Configurar limitador de governance',
    description: 'Crea o actualiza (upsert) la parametrizacion de limites para un tenantGlobal. Controla cuantos corporativos puede crear, permisos de auditoria, etc.',
    fields: [
      { name: 'tenantGlobalId', label: 'ID del tenant global', type: 'id', required: true, pathParam: true, placeholder: 'ObjectId del tenantGlobal', hint: 'ID del tenantGlobal al que aplicar los limites.' },
    ],
  },
  {
    id: 'gov-listar-tenant-global', section: 'governance', method: 'GET',
    path: '/api/config/tenant/tipo/listar/globales/contexto/roles',
    title: 'Selects completos de governance',
    description: 'Retorna todos los datos necesarios para el flujo de governance: tipos de acceso, niveles, roles, corporativos, dominios y limitadores activos.',
    fields: [],
  },
];

// ─────────────────────────────────────────────────────────────────
// COLECCION COMPLETA DE ENDPOINTS
// ─────────────────────────────────────────────────────────────────
const ENDPOINTS: EndpointSpec[] = [
  ...EP_CATALOGOS,
  ...EP_NVL_GLOBAL,
  ...EP_NVL_CORP,
  ...EP_ROLES,
  ...EP_CATALOGO_CORP,
  ...EP_REGLAS,
  ...EP_RUTAS,
  ...EP_DOMINIOS,
  ...EP_GOVERNANCE,
];

// ─────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────
const parseMaybeJson = (rawValue: string): unknown => {
  const value = rawValue.trim();
  if (!value) return '';
  if (value.startsWith('[') || value.startsWith('{') || value === 'true' || value === 'false') {
    return JSON.parse(value);
  }
  return value;
};

// ─────────────────────────────────────────────────────────────────
// SUBCOMPONENTE: Badge HTTP
// ─────────────────────────────────────────────────────────────────
function MethodBadge({ method, size = 'md' }: { method: HttpMethod; size?: 'sm' | 'md' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded border px-1.5 font-mono font-semibold',
      size === 'sm' ? 'text-[10px] py-0' : 'text-xs py-0.5',
      METHOD_STYLE[method]
    )}>
      {METHOD_ICON[method]}
      {method}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// SUBCOMPONENTE: Item del sidebar
// ─────────────────────────────────────────────────────────────────
function NavItem({ endpoint, isActive, onClick }: {
  endpoint: EndpointSpec; isActive: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left transition-colors',
        isActive ? 'bg-destructive/10 text-destructive ring-1 ring-destructive/20' : 'hover:bg-muted text-foreground'
      )}
    >
      <span className="mt-0.5 shrink-0"><MethodBadge method={endpoint.method} size="sm" /></span>
      <span className={cn('text-sm leading-tight', isActive && 'font-medium')}>{endpoint.title}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
// SUBCOMPONENTE: Fila de campo
// ─────────────────────────────────────────────────────────────────
function FieldRow({ field, renderField }: {
  field: FieldSpec; value: string; onChange: (v: string) => void;
  renderField: () => React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-sm font-medium text-foreground">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {field.pathParam && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">path param</Badge>}
        {field.type === 'boolean' && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">boolean</Badge>}
        {field.type === 'number'  && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">number</Badge>}
        {field.type === 'id'      && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-info">ObjectId</Badge>}
      </div>
      {renderField()}
      {field.hint && <p className="text-xs text-muted-foreground leading-snug">{field.hint}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────
const ParametrizacionCatologTenant: React.FC = () => {
  const { user } = useAuth();
  const [selectedId, setSelectedId]   = useState<string>(ENDPOINTS[0].id);
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({});
  const [result, setResult]           = useState<Record<string, string>>({});
  const [loading, setLoading]         = useState<Record<string, boolean>>({});
  const [search, setSearch]           = useState('');
  const [nvlModalOpen, setNvlModalOpen] = useState(false);
  const [nvlModalLoading, setNvlModalLoading] = useState(false);
  const [nvlModalSaving, setNvlModalSaving] = useState(false);
  const [nvlModalState, setNvlModalState] = useState<NvlModalState>(EMPTY_NVL_MODAL);
  const [nvlGlobales, setNvlGlobales] = useState<NvlGlobalItem[]>([]);
  const [nvlParamConfigs, setNvlParamConfigs] = useState<NvlGlobalItem[]>([]);
  const [nvlSequenceModalOpen, setNvlSequenceModalOpen] = useState(false);
  const [nvlSequenceLoading, setNvlSequenceLoading] = useState(false);
  const [nvlSequenceState, setNvlSequenceState] = useState<NvlSequenceState | null>(null);
  const [nvlSequenceActionId, setNvlSequenceActionId] = useState<string | null>(null);
  const [sequenceRowRefreshing, setSequenceRowRefreshing] = useState<string | null>(null);
  const [retryModalOpen, setRetryModalOpen] = useState(false);
  const [retryModalValue, setRetryModalValue] = useState('2');
  const [retryModalLoading, setRetryModalLoading] = useState(false);
  const [retryModalSaving, setRetryModalSaving] = useState(false);
  const [nvlGlobalListData, setNvlGlobalListData] = useState<NvlGlobalItem[]>([]);
  const [nvlGlobalListLoading, setNvlGlobalListLoading] = useState(false);
  const [nvlGlobalActionId, setNvlGlobalActionId] = useState<string | null>(null);
  const [nvlListEditOpen, setNvlListEditOpen] = useState(false);
  const [nvlListEditSaving, setNvlListEditSaving] = useState(false);
  const [nvlListEditState, setNvlListEditState] = useState<NvlListEditState>(EMPTY_NVL_LIST_EDIT);
  const [collapsed, setCollapsed]     = useState<Record<EndpointSection, boolean>>(
    Object.fromEntries(SECTIONS.map((s) => [s, false])) as Record<EndpointSection, boolean>
  );
  const [pickerOpen, setPickerOpen]       = useState(false);
  const [pickerItems, setPickerItems]     = useState<Record<string, unknown>[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const selectedEndpoint = ENDPOINTS.find((e) => e.id === selectedId) ?? ENDPOINTS[0];
  const tenantScope = user?.auth?.tenantScope || {};
  const actorScope = {
    tenantSuperAdminId: String(user?.tenantSuperAdminId || tenantScope?.tenantSuperAdminId || '').trim(),
    tenantGlobalId: String(user?.tenantGlobalId || tenantScope?.tenantGlobalId || '').trim(),
    tenantCorporativoId: String(user?.tenantCorporativoId || tenantScope?.tenantCorporativoId || '').trim(),
  };
  const canManageGlobalNvlState =
    Boolean(actorScope.tenantSuperAdminId) &&
    !actorScope.tenantGlobalId &&
    !actorScope.tenantCorporativoId;
  const isRestrictedGlobalNvlEndpoint = (endpointId: string): boolean =>
    endpointId === 'nvlg-crear' || endpointId === 'nvlg-param-modificar';

  const filteredEndpoints = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ENDPOINTS;
    return ENDPOINTS.filter((e) =>
      [e.title, e.path, e.description, e.method, e.section].join(' ').toLowerCase().includes(q)
    );
  }, [search]);

  const endpointsBySection = useMemo(() =>
    Object.fromEntries(
      SECTIONS.map((s) => [s, filteredEndpoints.filter((e) => e.section === s)])
    ) as Record<EndpointSection, EndpointSpec[]>,
  [filteredEndpoints]);
  const isSelectedEndpointBlocked =
    isRestrictedGlobalNvlEndpoint(selectedEndpoint.id) && !canManageGlobalNvlState;

  // ── Fields ────────────────────────────────────────────────────
  const getField = (eid: string, name: string) => fieldValues?.[eid]?.[name] ?? '';
  const setField = (eid: string, name: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [eid]: { ...(prev[eid] || {}), [name]: value } }));
  };
  const currentRetryCount = getField('nvlg-crear', '__retryCount') || String(nvlSequenceState?.retryLimit ?? 2);
  const handleClean = (eid: string) => {
    setFieldValues((prev) => ({ ...prev, [eid]: {} }));
    setResult((prev) => ({ ...prev, [eid]: '' }));
    toast.info('Formulario limpiado.');
  };

  const formatKeyFromText = (value: string): string =>
    String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const getSortedNvlGlobales = (items: NvlGlobalItem[]): NvlGlobalItem[] =>
    [...items].sort((a, b) => Number(a?.nvl ?? 0) - Number(b?.nvl ?? 0));

  const hydrateNvlModalFromParent = (eid: string, items: NvlGlobalItem[]): NvlModalState => {
    const currentNvl = getField(eid, 'nvl').trim();
    const currentNombre = getField(eid, 'nombre').trim();
    const currentDescripcion = getField(eid, 'descripcion').trim();
    const currentKey = getField(eid, 'generation_tenant').trim();

    const suggestedNvl = currentNvl || String(
      getSortedNvlGlobales(items).reduce((max, row) => Math.max(max, Number(row?.nvl ?? -1)), -1) + 1
    );
    const suggestedNombre = currentNombre || (suggestedNvl ? `NVL ${suggestedNvl}` : '');
    const suggestedKey = currentKey || formatKeyFromText(suggestedNombre || `TENANT-NVL-${suggestedNvl}`);

    return {
      nvl: suggestedNvl,
      generation_tenant: suggestedKey,
      nombre: currentNombre || suggestedNombre,
      descripcion: currentDescripcion || `Nivel global ${suggestedNvl}`,
    };
  };

  const syncNvlSequenceToForm = (sequence: NvlSequenceState, eid = 'nvlg-crear'): void => {
    setFieldValues((prev) => ({
      ...prev,
      [eid]: {
        ...(prev[eid] || {}),
        orden: String(sequence?.next ?? ''),
      }
    }));
  };

  const fetchNvlSequenceState = async (eid?: string): Promise<NvlSequenceState> => {
    const response = await apiFetch('/api/config/tenant/tipo/acceso/globales/jerarquia/roles/parametrizacion/secuencia', {
      method: 'GET',
    });
    const data = response?.data ?? response;
    const normalized: NvlSequenceState = {
      key: String(data?.key || 'generacionglobalnvlrolesconfigs'),
      current: Number(data?.current || 0),
      next: Number(data?.next || 1),
      exists: Boolean(data?.exists),
      retryLimit: Number(data?.retryLimit || 2),
      totalRegistros: Number(data?.totalRegistros || 0),
      registros: Array.isArray(data?.registros) ? data.registros : [],
    };
    setNvlSequenceState(normalized);
    if (eid) {
      syncNvlSequenceToForm(normalized, eid);
    }
    return normalized;
  };

  const fetchNvlGlobalList = async (): Promise<NvlGlobalItem[]> => {
    setNvlGlobalListLoading(true);
    try {
      const response = await apiFetch('/api/config/tenant/tipo/acceso/globales/jerarquia/roles?todos=true', {
        method: 'GET',
      });
      const rows = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];
      setNvlGlobalListData(rows);
      return rows;
    } finally {
      setNvlGlobalListLoading(false);
    }
  };

  const openNvlModal = async (eid: string): Promise<void> => {
    try {
      setNvlModalLoading(true);
      const [response, configs] = await Promise.all([
        apiFetch('/api/config/tenant/tipo/acceso/globales/jerarquia/roles', { method: 'GET' }),
        apiFetch('/api/config/tenant/tipo/acceso/globales/jerarquia/roles/parametrizacion', { method: 'GET' }),
        fetchNvlSequenceState(eid),
        /** Misma fuente que el select del formulario (contador ↔ catálogo). */
        fetchNvlGlobalList(),
      ]);
      const rows = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];
      const configRows = Array.isArray(configs?.data)
        ? configs.data
        : Array.isArray(configs)
          ? configs
          : [];
      setNvlGlobales(rows);
      setNvlParamConfigs(configRows);
      setNvlModalState(hydrateNvlModalFromParent(eid, rows));
      setNvlModalOpen(true);
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar los niveles globales para parametrizar el NVL.');
    } finally {
      setNvlModalLoading(false);
    }
  };

  const openNvlSequenceModal = async (eid: string): Promise<void> => {
    try {
      setNvlSequenceLoading(true);
      await fetchNvlSequenceState(eid === 'nvlg-crear' ? eid : undefined);
      setNvlSequenceModalOpen(true);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo consultar la secuencia de NVL registrados.');
    } finally {
      setNvlSequenceLoading(false);
    }
  };

  /** GET parametrizacion filtrando por nivel padre y refresca tabla de secuencia (validacion puntual por registro). */
  const validarRegistroSecuenciaIndividual = async (parentGlobalId?: string | null): Promise<void> => {
    const pid = String(parentGlobalId || '').trim();
    if (!pid) {
      toast.error('Este registro no tiene id del nivel padre para validarlo.');
      return;
    }
    setSequenceRowRefreshing(pid);
    try {
      await apiFetch(
        `/api/config/tenant/tipo/acceso/globales/jerarquia/roles/parametrizacion?nvlGeneracionGlobalId=${encodeURIComponent(pid)}`,
        { method: 'GET' },
      );
      await fetchNvlSequenceState();
      toast.success('Parametrizacion del nivel revisada contra el backend.');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo consultar este registro de parametrizacion.');
    } finally {
      setSequenceRowRefreshing(null);
    }
  };

  const handleUpdateSequenceConfig = async (item: NvlSequenceState['registros'][number]): Promise<void> => {
    const id = String(item?.iud || item?._id || '').trim();
    if (!id) {
      toast.error('No se encontro el id de la parametrizacion.');
      return;
    }
    try {
      setNvlSequenceActionId(id);
      await apiFetch(`/api/config/tenant/tipo/acceso/globales/jerarquia/roles/parametrizacion/${id}`, {
        method: 'PUT',
        body: {
          securityPlatform: !item?.securityPlatform,
        },
      });
      await fetchNvlSequenceState();
      toast.success('Parametrizacion actualizada correctamente.');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo actualizar la parametrizacion del NVL.');
    } finally {
      setNvlSequenceActionId(null);
    }
  };

  const openNvlListEditModal = (item: NvlGlobalItem): void => {
    setNvlListEditState({
      id: String(item?.iud || item?._id || ''),
      nvl: String(item?.nvl ?? ''),
      generation_tenant: String(item?.generation_tenant ?? ''),
      nombre: String(item?.nombre ?? ''),
      descripcion: String(item?.descripcion ?? ''),
    });
    setNvlListEditOpen(true);
  };

  const handleSaveNvlListEdit = async (): Promise<void> => {
    if (!nvlListEditState.id) {
      toast.error('No se encontro el id del NVL global.');
      return;
    }
    try {
      setNvlListEditSaving(true);
      await apiFetch(`/api/config/tenant/tipo/acceso/globales/jerarquia/roles/${nvlListEditState.id}`, {
        method: 'PUT',
        body: {
          nombre: nvlListEditState.nombre.trim(),
          descripcion: nvlListEditState.descripcion.trim(),
          generation_tenant: nvlListEditState.generation_tenant.trim(),
        },
      });
      await fetchNvlGlobalList();
      setNvlListEditOpen(false);
      toast.success('Nivel global actualizado correctamente.');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo actualizar el nivel global.');
    } finally {
      setNvlListEditSaving(false);
    }
  };

  const handleDeactivateNvlGlobal = async (item: NvlGlobalItem): Promise<void> => {
    const id = String(item?.iud || item?._id || '').trim();
    if (!id) {
      toast.error('No se encontro el id del NVL global.');
      return;
    }
    try {
      setNvlGlobalActionId(id);
      await apiFetch(`/api/config/tenant/tipo/acceso/globales/jerarquia/roles/${id}`, {
        method: 'DELETE',
      });
      await fetchNvlGlobalList();
      await fetchNvlSequenceState().catch(() => undefined);
      toast.success('Nivel global desactivado correctamente.');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo desactivar el nivel global.');
    } finally {
      setNvlGlobalActionId(null);
    }
  };

  const handleDeleteNvlGlobal = async (item: NvlGlobalItem): Promise<void> => {
    const id = String(item?.iud || item?._id || '').trim();
    if (!id) {
      toast.error('No se encontro el id del NVL global.');
      return;
    }
    try {
      setNvlGlobalActionId(id);
      await apiFetch(`/api/config/tenant/tipo/acceso/globales/jerarquia/roles/eliminar/${id}`, {
        method: 'DELETE',
      });
      await fetchNvlGlobalList();
      await fetchNvlSequenceState().catch(() => undefined);
      toast.success('Nivel global eliminado correctamente.');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo eliminar el nivel global.');
    } finally {
      setNvlGlobalActionId(null);
    }
  };

  const handleDeactivateSequenceConfig = async (item: NvlSequenceState['registros'][number]): Promise<void> => {
    const id = String(item?.iud || item?._id || '').trim();
    if (!id) {
      toast.error('No se encontro el id de la parametrizacion.');
      return;
    }
    try {
      setNvlSequenceActionId(id);
      await apiFetch(`/api/config/tenant/tipo/acceso/globales/jerarquia/roles/parametrizacion/desactivar/${id}`, {
        method: 'DELETE',
      });
      await fetchNvlSequenceState();
      toast.success('Parametrizacion desactivada correctamente.');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo desactivar la parametrizacion del NVL.');
    } finally {
      setNvlSequenceActionId(null);
    }
  };

  const handleDeleteSequenceConfig = async (item: NvlSequenceState['registros'][number]): Promise<void> => {
    const id = String(item?.iud || item?._id || '').trim();
    if (!id) {
      toast.error('No se encontro el id de la parametrizacion.');
      return;
    }
    try {
      setNvlSequenceActionId(id);
      await apiFetch(`/api/config/tenant/tipo/acceso/globales/jerarquia/roles/parametrizacion/eliminar/${id}`, {
        method: 'DELETE',
      });
      await fetchNvlSequenceState();
      toast.success('Parametrizacion eliminada correctamente.');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo eliminar la parametrizacion del NVL.');
    } finally {
      setNvlSequenceActionId(null);
    }
  };

  const openRetryModal = async (eid: string): Promise<void> => {
    try {
      setRetryModalLoading(true);
      const response = await apiFetch('/api/config/tenant/tipo/acceso/globales/jerarquia/roles/parametrizacion/reintentos', {
        method: 'GET',
      });
      const data = response?.data ?? response;
      const retryLimit = String(Number(data?.retryLimit || data?.currentRetryLimit || 2));
      setRetryModalValue(retryLimit);
      setFieldValues((prev) => ({
        ...prev,
        [eid]: {
          ...(prev[eid] || {}),
          __retryCount: retryLimit,
        }
      }));
      setRetryModalOpen(true);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar la configuracion de reintentos desde backend.');
    } finally {
      setRetryModalLoading(false);
    }
  };

  const applyRetryModalToParent = async (eid: string): Promise<void> => {
    const parsed = Math.max(1, Math.min(10, Number(retryModalValue || '2')));
    try {
      setRetryModalSaving(true);
      const response = await apiFetch('/api/config/tenant/tipo/acceso/globales/jerarquia/roles/parametrizacion/reintentos', {
        method: 'PUT',
        body: { retryLimit: parsed },
      });
      const data = response?.data ?? response;
      const resolvedRetryLimit = String(Number(data?.retryLimit || parsed));
      setFieldValues((prev) => ({
        ...prev,
        [eid]: {
          ...(prev[eid] || {}),
          __retryCount: resolvedRetryLimit,
        }
      }));
      setNvlSequenceState((prev) => prev ? {
        ...prev,
        retryLimit: Number(resolvedRetryLimit),
      } : prev);
      setRetryModalOpen(false);
      toast.success(`Reintentos parametrizados en backend: ${resolvedRetryLimit}.`);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo guardar la configuracion de reintentos en backend.');
    } finally {
      setRetryModalSaving(false);
    }
  };

  useEffect(() => {
    if (selectedId !== 'nvlg-crear') return;

    void fetchNvlGlobalList().catch((error) => {
      console.error(error);
    });
    void fetchNvlSequenceState(selectedId).catch((error) => {
      console.error(error);
    });
  }, [selectedId]);

  const applyNvlModalToParent = (eid: string): void => {
    const generatedKey = formatKeyFromText(
      nvlModalState.generation_tenant || nvlModalState.nombre || `TENANT-NVL-${nvlModalState.nvl}`
    );
    const generatedNombre = String(nvlModalState.nombre || '').trim().toUpperCase();

    setFieldValues((prev) => ({
      ...prev,
      [eid]: {
        ...(prev[eid] || {}),
        nvl: nvlModalState.nvl.trim(),
        generation_tenant: generatedKey,
        nombre: generatedNombre,
        descripcion: nvlModalState.descripcion.trim(),
        __nvlModalReady: 'true',
      }
    }));

    setNvlModalOpen(false);
    toast.success('Parametrizacion NVL aplicada al formulario.');
  };

  const handleSaveNvlModal = async (): Promise<void> => {
    try {
      if (!canManageGlobalNvlState) {
        throw new Error('Solo el scope tenantSuperAdmin del JWT puede guardar la parametrizacion NVL global.');
      }
      setNvlModalSaving(true);

      const payload = {
        nvl: nvlModalState.nvl.trim(),
        generation_tenant: formatKeyFromText(
          nvlModalState.generation_tenant || nvlModalState.nombre || `TENANT-NVL-${nvlModalState.nvl}`
        ),
        nombre: String(nvlModalState.nombre || '').trim().toUpperCase() || null,
        descripcion: String(nvlModalState.descripcion || '').trim() || null,
      };

      if (!payload.nvl || !payload.generation_tenant) {
        throw new Error('Debes definir el numero de nivel y la clave interna antes de guardar.');
      }

      const parentLookup = await apiFetch(
        `/api/config/tenant/tipo/acceso/globales/jerarquia/roles?nvl=${encodeURIComponent(payload.nvl)}&generation_tenant=${encodeURIComponent(payload.generation_tenant)}`,
        { method: 'GET' }
      );
      const existingParents = Array.isArray(parentLookup?.data)
        ? parentLookup.data
        : Array.isArray(parentLookup)
          ? parentLookup
          : [];
      const existingParent = existingParents[0] ?? null;

      const parentResponse = existingParent
        ? {
            ok: true,
            msg: 'El catalogo NVL ya existia y se reutilizo para la parametrizacion.',
            data: existingParent,
          }
        : await apiFetch('/api/config/tenant/tipo/acceso/globales/jerarquia/roles', {
            method: 'POST',
            body: payload,
          });

      const parentRecord = parentResponse?.data ?? existingParent ?? null;
      const parentId = String(parentRecord?._id || parentRecord?.iud || '').trim();

      /**
       * Sin fila en generacionglobalnvlrolesconfigs no hay secuencia en el contador:
       * el select del formulario cruza registros de parametrizacion/secuencia con el catalogo.
       * Igual que al ejecutar nvlg-crear: crear parametrizacion hija si aun no existe.
       */
      if (parentId) {
        const configLookup = await apiFetch(
          `/api/config/tenant/tipo/acceso/globales/jerarquia/roles/parametrizacion?nvlGeneracionGlobalId=${encodeURIComponent(parentId)}`,
          { method: 'GET' },
        );
        const existingConfigs = Array.isArray(configLookup?.data)
          ? configLookup.data
          : Array.isArray(configLookup)
            ? configLookup
            : [];
        const existingConfig = existingConfigs[0] ?? null;
        const cid = String(existingConfig?._id || existingConfig?.iud || '').trim();
        const securityPlatform = String(getField('nvlg-crear', 'securityPlatform') || '').trim() === 'true';
        if (!cid) {
          await apiFetch('/api/config/tenant/tipo/acceso/globales/jerarquia/roles/parametrizacion', {
            method: 'POST',
            body: {
              nvlGeneracionGlobalId: parentId,
              securityPlatform,
            },
          });
        }
      }

      /** Catálogo + registros del contador (secuencia/reintentos): alimenta el select. */
      const catalogRows = await fetchNvlGlobalList();
      setNvlGlobales(catalogRows);
      const seqState = await fetchNvlSequenceState();

      let ordenForm = String(parentRecord?.orden ?? '');
      if (parentId && seqState.registros?.length) {
        const reg = seqState.registros.find(
          (x) => String(x.nvlGeneracionGlobal || '').trim() === parentId,
        );
        if (reg != null && reg.secuencia != null && String(reg.secuencia).trim() !== '') {
          ordenForm = String(reg.secuencia);
        }
      }

      setFieldValues((prev) => ({
        ...prev,
        ['nvlg-crear']: {
          ...(prev['nvlg-crear'] || {}),
          nvl: String(parentRecord?.nvl ?? payload.nvl),
          generation_tenant: String(parentRecord?.generation_tenant ?? payload.generation_tenant),
          nombre: String(parentRecord?.nombre ?? payload.nombre ?? ''),
          descripcion: String(parentRecord?.descripcion ?? payload.descripcion ?? ''),
          orden: ordenForm || String(prev['nvlg-crear']?.orden ?? ''),
          __nvlModalReady: 'true',
        }
      }));

      setNvlModalState({
        nvl: String(parentRecord?.nvl ?? payload.nvl),
        generation_tenant: String(parentRecord?.generation_tenant ?? payload.generation_tenant),
        nombre: String(parentRecord?.nombre ?? payload.nombre ?? ''),
        descripcion: String(parentRecord?.descripcion ?? payload.descripcion ?? ''),
      });

      toast.success(parentResponse?.msg || 'Catalogo NVL guardado correctamente. Ya puedes ejecutar el formulario padre.');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la parametrizacion NVL.');
    } finally {
      setNvlModalSaving(false);
    }
  };

  // ── Execute ───────────────────────────────────────────────────
  const buildRequest = (ep: EndpointSpec) => {
    let resolvedPath = ep.path;
    const body: Record<string, unknown> = {};
    const headers: Record<string, string> = {};

    ep.fields.forEach((field) => {
      const rawValue = getField(ep.id, field.name);
      const value = rawValue.trim();
      if (field.required && !value) throw new Error(`Campo requerido: ${field.label}`);
      if (!value) return;
      if (field.pathParam) { resolvedPath = resolvedPath.replace(`:${field.name}`, encodeURIComponent(value)); return; }
      if (field.header)    { headers[field.name] = value; return; }
      if (field.type === 'boolean') { body[field.name] = value === 'true'; return; }
      if (field.type === 'number')  { body[field.name] = Number(value);    return; }
      if (field.type === 'json' || field.type === 'textarea') { body[field.name] = parseMaybeJson(value); return; }
      body[field.name] = value;
    });

    return { path: resolvedPath, body, headers };
  };

  const handleRun = async (ep: EndpointSpec): Promise<void> => {
    try {
      if (isRestrictedGlobalNvlEndpoint(ep.id) && !canManageGlobalNvlState) {
        throw new Error('Solo el scope tenantSuperAdmin del JWT puede ejecutar esta accion sobre NVL global.');
      }
      setLoading((prev) => ({ ...prev, [ep.id]: true }));
      const { path, body, headers } = buildRequest(ep);
      const hasBody = ep.method !== 'GET' && ep.method !== 'DELETE';
      let response;

      if (ep.id === 'nvlg-crear') {
        if (getField('nvlg-crear', '__nvlModalReady') !== 'true') {
          throw new Error('Primero debes parametrizar el NVL desde el modal y luego ejecutar el formulario padre.');
        }

        const { securityPlatform, orden: _omitSeqForm, ...catalogBody } = body as Record<string, unknown>;
        const parentLookup = await apiFetch(
          `/api/config/tenant/tipo/acceso/globales/jerarquia/roles?nvl=${encodeURIComponent(String(catalogBody.nvl ?? ''))}&generation_tenant=${encodeURIComponent(String(catalogBody.generation_tenant ?? ''))}`,
          { method: 'GET' }
        );
        const existingParents = Array.isArray(parentLookup?.data)
          ? parentLookup.data
          : Array.isArray(parentLookup)
            ? parentLookup
            : [];
        const existingParent = existingParents[0] ?? null;

        response = existingParent
          ? {
              ok: true,
              msg: 'El nivel global ya existia en el catalogo. Se reutilizo el registro padre.',
              data: existingParent,
            }
          : await apiFetch(path, {
              method: ep.method,
              headers,
              ...(hasBody
                ? {
                    body: {
                      ...catalogBody,
                      securityPlatform: Boolean(securityPlatform === true || securityPlatform === 'true'),
                    },
                  }
                : {}),
            });

        const parentRecord = response?.data ?? existingParent ?? null;
        if (parentRecord?._id || parentRecord?.iud) {
          const parentId = String(parentRecord?._id || parentRecord?.iud || '');
          const configLookup = await apiFetch(
            `/api/config/tenant/tipo/acceso/globales/jerarquia/roles/parametrizacion?nvlGeneracionGlobalId=${encodeURIComponent(parentId)}`,
            { method: 'GET' }
          );
          const existingConfigs = Array.isArray(configLookup?.data)
            ? configLookup.data
            : Array.isArray(configLookup)
              ? configLookup
              : [];
          const existingConfig = existingConfigs[0] ?? null;

          await apiFetch(
            existingConfig?._id || existingConfig?.iud
              ? `/api/config/tenant/tipo/acceso/globales/jerarquia/roles/parametrizacion/${existingConfig?._id || existingConfig?.iud}`
              : '/api/config/tenant/tipo/acceso/globales/jerarquia/roles/parametrizacion',
            {
              method: existingConfig?._id || existingConfig?.iud ? 'PUT' : 'POST',
              body: existingConfig?._id || existingConfig?.iud
                ? {
                    securityPlatform: securityPlatform === true,
                  }
                : {
                    nvlGeneracionGlobalId: parentId,
                    securityPlatform: securityPlatform === true,
                  },
            }
          );
        }
      } else {
        response = await apiFetch(path, { method: ep.method, headers, ...(hasBody ? { body } : {}) });
      }

      if (ep.id === 'nvlg-listar') {
        const rows = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];
        setNvlGlobalListData(rows);
      }

      setResult((prev) => ({ ...prev, [ep.id]: '' }));

      if (ep.id === 'nvlg-crear' || ep.id === 'nvlg-desactivar') {
        await fetchNvlSequenceState('nvlg-crear').catch((error) => {
          console.error(error);
        });
      }

      let notifyMsg = `${ep.title} ejecutado correctamente.`;
      if (response && typeof response === 'object') {
        const r = response as Record<string, unknown>;
        if (typeof r.msg === 'string' && r.msg.trim()) notifyMsg = r.msg.trim();
      }
      toast.success(notifyMsg);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al ejecutar el endpoint';
      setResult((prev) => ({ ...prev, [ep.id]: msg }));
      toast.error(msg);
    } finally {
      setLoading((prev) => ({ ...prev, [ep.id]: false }));
    }
  };

  // ── Render campo ──────────────────────────────────────────────
  const renderField = (field: FieldSpec, eid: string): React.ReactNode => {
    const value = getField(eid, field.name);
    const isGlobalNvlStateField =
      field.name === 'securityPlatform' &&
      (eid === 'nvlg-crear' || eid === 'nvlg-param-modificar');
    if (field.type === 'boolean') {
      return (
        <Select
          value={value || ''}
          onValueChange={(v) => setField(eid, field.name, v)}
          disabled={isGlobalNvlStateField && !canManageGlobalNvlState}
        >
          <SelectTrigger><SelectValue placeholder="Selecciona true o false" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="true">true — activado</SelectItem>
            <SelectItem value="false">false — desactivado</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    if (eid === 'nvlg-crear' && field.name === 'nvl') {
      /**
       * Mismo origen que el modal «Catálogo NVL guardado»: GET catálogo `generacionGlobalNvlRoles`
       * (`nvlGlobalListData`). Se enriquece con secuencia/security del contador si ya hay fila en
       * `generacionglobalnvlrolesconfigs`; si no, el NVL sigue apareciendo en el select.
       */
      const sortedExisting = getSortedNvlGlobales(nvlGlobalListData);
      const regs = nvlSequenceState?.registros ?? [];
      const regByParentId = new Map<string, (typeof regs)[number]>();
      for (const reg of regs) {
        if (reg.estado === false) continue;
        const pid = String(reg.nvlGeneracionGlobal || '').trim();
        if (pid && !regByParentId.has(pid)) regByParentId.set(pid, reg);
      }

      const parametrizados: NvlGlobalItem[] = sortedExisting.map((parent) => {
        const id = String(parent?.iud || parent?._id || '').trim();
        const reg = id ? regByParentId.get(id) : undefined;
        if (!reg) return parent;
        const seq = Number(reg.secuencia ?? 0);
        return {
          ...parent,
          orden: seq,
          secuencia: seq,
          securityPlatform:
            typeof reg.securityPlatform === 'boolean' ? reg.securityPlatform : parent.securityPlatform,
          configNvlGlobalId: String(reg._id || reg.iud || parent.configNvlGlobalId || ''),
        };
      });

      const parametrizadosOptionIds = new Set(
        parametrizados.map((row) => String(row?.iud || row?._id || '').trim()).filter(Boolean),
      );

      const nvlTrim = String(value || '').trim();
      const keyTrim = String(getField(eid, 'generation_tenant') || '').trim();
      const matchedParam = parametrizados.find(
        (row) =>
          String(row?.nvl ?? '').trim() === nvlTrim &&
          String(row?.generation_tenant ?? '').trim() === keyTrim,
      );
      /** Radix Select exige que `value` exista como SelectItem; si no, el trigger queda vacio. */
      const matchedIdRaw = matchedParam ? String(matchedParam.iud || matchedParam._id || '').trim() : '';
      const selectNvlControlled =
        matchedIdRaw && parametrizadosOptionIds.has(matchedIdRaw) ? matchedIdRaw : '__manual';

      const displaySeqRow =
        selectNvlControlled !== '__manual'
          ? parametrizados.find((item) => String(item?.iud || item?._id || '') === selectNvlControlled)
          : matchedParam;
      const secuenciaParametrizacion =
        displaySeqRow?.orden != null && String(displaySeqRow.orden).trim() !== ''
          ? Number(displaySeqRow.orden)
          : null;

      const applyExistingNvlToForm = (row: NvlGlobalItem): void => {
        const idRow = row?.iud || row?._id;
        setField(eid, 'nvl', String(row?.nvl ?? '').trim());
        setField(eid, 'generation_tenant', String(row?.generation_tenant ?? '').trim());
        setField(eid, 'nombre', String(row?.nombre ?? '').trim());
        setField(eid, 'descripcion', String(row?.descripcion ?? '').trim());
        if (row?.orden != null && String(row?.orden ?? '').trim() !== '') {
          setField(eid, 'orden', String(row?.orden ?? ''));
        }
        if (typeof row?.securityPlatform === 'boolean') {
          setField(eid, 'securityPlatform', row.securityPlatform ? 'true' : 'false');
        }
        if (idRow) {
          setField(eid, '__nvlSeleccionTemplate', String(idRow));
        }
      };

      return (
        <div className="space-y-1.5">
          <Select
            value={selectNvlControlled}
            onValueChange={(val) => {
              if (!val || val === '__manual') {
                setField(eid, '__nvlSeleccionTemplate', '');
                return;
              }
              const row = parametrizados.find((item) => String(item?.iud || item?._id || '') === val);
              if (row) applyExistingNvlToForm(row);
            }}
            disabled={nvlGlobalListLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  nvlGlobalListLoading
                    ? 'Cargando catalogo de niveles…'
                    : parametrizados.length === 0
                      ? 'Sin niveles en el catálogo. Pulsa «Actualizar lista» o abre Parametrizar.'
                      : 'Elige un NVL del catálogo (mismo listado que el modal) u otro / nuevo nivel'
                }
              />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="__manual">
                Otro / nuevo nivel (definelo con Parametrizar en la barra de acciones del formulario)
              </SelectItem>
              {parametrizados.map((item) => {
                const id = String(item?.iud || item?._id || '');
                if (!id) return null;
                const seq = item?.orden != null ? Number(item.orden) : null;
                return (
                  <SelectItem key={`p-${id}`} value={id}>
                    <span className="font-medium">NVL {String(item?.nvl ?? '?')}</span>
                    {seq != null && Number.isFinite(seq) ? (
                      <span className="text-muted-foreground"> · sec. {seq}</span>
                    ) : null}
                    {' · '}
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(item?.generation_tenant ?? '') || '—'}
                    </span>
                    {item?.nombre ? (
                      <span className="text-muted-foreground"> — {String(item.nombre)}</span>
                    ) : null}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {secuenciaParametrizacion != null && Number.isFinite(secuenciaParametrizacion) ? (
              <>
                Contador en parametrización (secuencia){' '}
                <span className="font-semibold text-foreground">{secuenciaParametrizacion}</span>
                {canManageGlobalNvlState ? (
                  <>
                    {' '}
                    · Reintentos en flujo (límite del contador){' '}
                    <span className="font-semibold text-foreground">{currentRetryCount}</span>
                  </>
                ) : null}
              </>
            ) : (
              <>
                Listado = catálogo <code className="rounded bg-muted px-1 text-[11px]">generacionGlobalNvlRoles</code>
                (como en Parametrizar). La <span className="font-medium">secuencia</span> aparece cuando existe parametrización en{' '}
                <code className="rounded bg-muted px-1 text-[11px]">generacionglobalnvlrolesconfigs</code>.
                {canManageGlobalNvlState ? (
                  <>
                    {' '}
                    Reintentos en flujo (límite global){' '}
                    <span className="font-semibold text-foreground">{currentRetryCount}</span>.
                  </>
                ) : null}
              </>
            )}
          </p>
        </div>
      );
    }
    if ((eid === 'nvlg-crear' || eid === 'nvlg-modificar') && field.name === 'orden') {
      return (
        <div className="flex items-center gap-3">
          <Input
            value={value}
            type="number"
            readOnly
            className="bg-muted"
            placeholder={field.placeholder || 'Calculada por contador'}
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0 gap-2"
            onClick={() => void openNvlSequenceModal(eid)}
            disabled={nvlSequenceLoading}
          >
            {nvlSequenceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <List className="h-4 w-4" />}
            Validar secuencia
          </Button>
        </div>
      );
    }
    if (field.type === 'textarea') {
      return (
        <Textarea rows={4} value={value} placeholder={field.placeholder || ''} onChange={(e) => setField(eid, field.name, e.target.value)} />
      );
    }
    return (
      <Input value={value} type={field.type === 'number' ? 'number' : 'text'}
        placeholder={field.placeholder || `Ingresa ${field.label}`}
        readOnly={field.readOnly}
        className={field.readOnly ? 'bg-muted' : undefined}
        onChange={(e) => setField(eid, field.name, e.target.value)} />
    );
  };

  const toggleSection = (s: EndpointSection) => setCollapsed((prev) => ({ ...prev, [s]: !prev[s] }));
  const isRunning = !!loading[selectedEndpoint.id];
  const resultText = result[selectedEndpoint.id] || '';
  const nvlCatalogoGuardado = getSortedNvlGlobales(nvlGlobales);

  return (
    <>
      <Dialog open={nvlSequenceModalOpen} onOpenChange={setNvlSequenceModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Validar secuencia de NVL registrados</DialogTitle>
            <DialogDescription>
              Coleccion{' '}
              <code className="rounded bg-muted px-1">generacionglobalnvlrolesconfigs</code>{' '}
              : expande cada registro para ver el vinculo con el nivel global padre. Cada alta por POST en el nivel global crea tambien una fila de parametrizacion (secuencia) en la misma operacion atomicamente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="border-slate-200 bg-muted">
                <CardHeader className="pb-2">
                  <CardDescription>Contador actual</CardDescription>
                  <CardTitle className="text-2xl">{nvlSequenceState?.current ?? 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-destructive/20 bg-destructive/10">
                <CardHeader className="pb-2">
                  <CardDescription>Proxima secuencia</CardDescription>
                  <CardTitle className="text-2xl text-destructive">{nvlSequenceState?.next ?? 1}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-slate-200 bg-card">
                <CardHeader className="pb-2">
                  <CardDescription>Registros relacionados</CardDescription>
                  <CardTitle className="text-2xl">{nvlSequenceState?.totalRegistros ?? 0}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="rounded-lg border border-slate-200 bg-card p-4">
              <p className="text-sm font-medium text-foreground">Registros individuales (parametrizacion por NVL)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Abre cada acordeon para revisar datos del nivel padre, validar ese registro contra el API y administrar securityPlatform / estado.
              </p>
              <div className="mt-3">
                {nvlSequenceState?.registros?.length ? (
                  <Accordion type="multiple" className="w-full divide-y rounded-lg border border-slate-100">
                    {nvlSequenceState.registros.map((item, idx) => {
                      const cfgId = String(item?.iud || item?._id || `idx-${idx}`);
                      const accordionValue = `${cfgId}-${Number(item?.secuencia ?? idx)}`;
                      const parentId = String(item?.nvlGeneracionGlobal || '').trim();
                      const validandoEste = Boolean(parentId) && sequenceRowRefreshing === parentId;
                      const padreHueco = Boolean(item?.nivelPadreFaltante);
                      return (
                        <AccordionItem key={`nvl-seq-${accordionValue}`} value={accordionValue} className="border-0 px-2">
                          <AccordionTrigger className="py-3 text-sm hover:no-underline [&[data-state=open]]:pb-2">
                            <span className="flex flex-wrap items-center gap-2 text-left">
                              <Badge variant="outline" className="bg-card shrink-0">
                                Sec. config {Number(item?.secuencia ?? 0)}
                              </Badge>
                              <Badge variant="outline" className="bg-card shrink-0">
                                NVL {String(item?.nvl ?? '?')}
                              </Badge>
                              <Badge variant={item?.estado === false ? 'secondary' : 'outline'} className="bg-card shrink-0">
                                {item?.estado === false ? 'Config inactiva' : 'Config activa'}
                              </Badge>
                              {padreHueco ? (
                                <Badge variant="destructive" className="shrink-0">Padre NVL sin datos enlazados</Badge>
                              ) : null}
                              <span className="truncate text-xs font-mono text-muted-foreground">
                                {String(item?.generation_tenant ?? '') || '—'}
                              </span>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 rounded-lg border border-slate-100 bg-muted p-4">
                              <div className="space-y-2 text-xs text-muted-foreground">
                                <p>
                                  <span className="font-semibold text-foreground">ID parametrizacion: </span>
                                  <code className="rounded bg-card px-1">{cfgId}</code>
                                </p>
                                <p>
                                  <span className="font-semibold text-foreground">ID nivel global padre: </span>
                                  <code className="rounded bg-card px-1">{parentId || '—'}</code>
                                </p>
                                <p className="text-sm font-medium text-foreground">
                                  {String(item?.nombre ?? '') || 'Sin nombre visible'}
                                </p>
                                <p>{String(item?.descripcion ?? '') || 'Sin descripcion del nivel padre'}</p>
                                <Badge variant={item?.securityPlatform ? 'default' : 'secondary'} className="w-fit">
                                  Acceso libre (securityPlatform): {item?.securityPlatform ? 'true' : 'false'}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="gap-1"
                                  disabled={!parentId || validandoEste}
                                  onClick={() => void validarRegistroSecuenciaIndividual(parentId)}
                                >
                                  {validandoEste ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                  Validar este registro (GET parametrizacion)
                                </Button>
                                {canManageGlobalNvlState ? (
                                  <>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="gap-1"
                                      onClick={() => void handleUpdateSequenceConfig(item)}
                                      disabled={nvlSequenceActionId === String(item?.iud || item?._id || '')}
                                    >
                                      {nvlSequenceActionId === String(item?.iud || item?._id || '') ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Pencil className="h-3.5 w-3.5" />
                                      )}
                                      Toggle acceso libre
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="gap-1"
                                      onClick={() => void handleDeactivateSequenceConfig(item)}
                                      disabled={
                                        nvlSequenceActionId === String(item?.iud || item?._id || '') || item?.estado === false
                                      }
                                    >
                                      Desactivar
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="gap-1 text-destructive"
                                      onClick={() => void handleDeleteSequenceConfig(item)}
                                      disabled={nvlSequenceActionId === String(item?.iud || item?._id || '')}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Eliminar
                                    </Button>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                ) : (
                  <Badge variant="outline" className="w-fit bg-card">No hay registros asociados a la secuencia todavia</Badge>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNvlSequenceModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={nvlModalOpen} onOpenChange={setNvlModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Parametrizar NVL global</DialogTitle>
            <DialogDescription>
              Configura el nivel y aplica sus valores al formulario padre antes de ejecutar el endpoint.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5">
            <div className="rounded-lg border border-slate-200 bg-muted p-4">
              <p className="text-sm font-medium text-foreground">Catalogo NVL guardado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Aqui ves la informacion existente en `generacionGlobalNvlRoles` para reutilizar el catalogo padre y evitar duplicados.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {nvlCatalogoGuardado.length > 0 ? (
                  nvlCatalogoGuardado.map((item) => (
                    <button
                      key={`nvl-catalog-${item?.iud || item?._id || item?.nvl}`}
                      type="button"
                      className="rounded-lg border border-slate-200 bg-card p-3 text-left transition-colors hover:border-destructive/30 hover:bg-destructive/10"
                      onClick={() =>
                        setNvlModalState({
                          nvl: String(item?.nvl ?? ''),
                          generation_tenant: String(item?.generation_tenant ?? ''),
                          nombre: String(item?.nombre ?? ''),
                          descripcion: String(item?.descripcion ?? ''),
                        })
                      }
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-card">
                          NVL {String(item?.nvl ?? '')}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">
                          {String(item?.generation_tenant ?? '') || 'SIN-CLAVE'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {String(item?.nombre ?? '') || 'Sin nombre visible'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {String(item?.descripcion ?? '') || 'Sin descripcion parametrizada'}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Secuencia relacionada: {Number(item?.orden ?? 0)}
                      </p>
                    </button>
                  ))
                ) : (
                  <Badge variant="outline" className="bg-card">Sin registros en generacionGlobalNvlRoles</Badge>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Numero de nivel</Label>
                <Input
                  value={nvlModalState.nvl}
                  type="number"
                  placeholder="Ej: 3"
                  onChange={(e) =>
                    setNvlModalState((prev) => {
                      const nextNvl = e.target.value;
                      const nextNombre = prev.nombre && !/^NVL\s+\d+$/i.test(prev.nombre) ? prev.nombre : (nextNvl ? `NVL ${nextNvl}` : '');
                      const nextKey = prev.generation_tenant && !/^TENANT-NVL-\d+$/i.test(prev.generation_tenant)
                        ? prev.generation_tenant
                        : formatKeyFromText(nextNombre || `TENANT-NVL-${nextNvl}`);
                      return {
                        ...prev,
                        nvl: nextNvl,
                        nombre: nextNombre,
                        generation_tenant: nextKey,
                        descripcion: prev.descripcion && !/^Nivel global \d+$/i.test(prev.descripcion)
                          ? prev.descripcion
                          : (nextNvl ? `Nivel global ${nextNvl}` : ''),
                      };
                    })
                  }
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Clave interna</Label>
                <Input
                  value={nvlModalState.generation_tenant}
                  placeholder="Ej: TENANT-REGIONAL"
                  onChange={(e) =>
                    setNvlModalState((prev) => ({
                      ...prev,
                      generation_tenant: formatKeyFromText(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Nombre visible</Label>
                <Input
                  value={nvlModalState.nombre}
                  placeholder="Ej: REGIONAL"
                  onChange={(e) =>
                    setNvlModalState((prev) => ({
                      ...prev,
                      nombre: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Descripcion</Label>
                <Input
                  value={nvlModalState.descripcion}
                  placeholder="Ej: Administrador regional"
                  onChange={(e) =>
                    setNvlModalState((prev) => ({
                      ...prev,
                      descripcion: e.target.value,
                    }))
                  }
                />
              </div>

            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNvlModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSaveNvlModal()}
              disabled={!nvlModalState.nvl.trim() || nvlModalSaving || !canManageGlobalNvlState}
            >
              {nvlModalSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {nvlModalSaving ? 'Guardando...' : 'Guardar parametrizacion'}
            </Button>
            <Button
              type="button"
              onClick={() => applyNvlModalToParent('nvlg-crear')}
              disabled={!nvlModalState.nvl.trim()}
            >
              Aplicar al formulario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={retryModalOpen} onOpenChange={setRetryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Parametrizar reintentos</DialogTitle>
            <DialogDescription>
              Visible solo para el scope `tenantSuperAdmin`. Esta configuracion se guarda en el `counter` de `generacionglobalnvlrolesconfigs` y gobierna los reintentos reales del backend.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-muted p-3 text-sm text-muted-foreground">
              Valor activo en backend: <span className="font-semibold text-foreground">{currentRetryCount}</span>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="retry-count-param">Cantidad de reintentos</Label>
              <Input
                id="retry-count-param"
                type="number"
                min={1}
                max={10}
                value={retryModalValue}
                onChange={(e) => setRetryModalValue(e.target.value)}
                disabled={retryModalLoading || retryModalSaving}
              />
              <p className="text-xs text-muted-foreground">
                Si no lo parametrizas, el backend usa el valor por defecto. La relacion queda sobre el ultimo registro del counter.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRetryModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void applyRetryModalToParent('nvlg-crear')}
              disabled={!canManageGlobalNvlState || retryModalLoading || retryModalSaving}
            >
              {retryModalSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {retryModalSaving ? 'Guardando...' : 'Aplicar reintentos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={nvlListEditOpen} onOpenChange={setNvlListEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Actualizar nivel global</DialogTitle>
            <DialogDescription>
              Edita el catalogo base del NVL global. La secuencia y el acceso libre siguen viviendo en la parametrizacion hija.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Nivel</Label>
              <Input value={nvlListEditState.nvl} disabled />
            </div>
            <div className="grid gap-1.5">
              <Label>Clave interna</Label>
              <Input
                value={nvlListEditState.generation_tenant}
                onChange={(e) => setNvlListEditState((prev) => ({ ...prev, generation_tenant: formatKeyFromText(e.target.value) }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Nombre visible</Label>
              <Input
                value={nvlListEditState.nombre}
                onChange={(e) => setNvlListEditState((prev) => ({ ...prev, nombre: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Descripcion</Label>
              <Input
                value={nvlListEditState.descripcion}
                onChange={(e) => setNvlListEditState((prev) => ({ ...prev, descripcion: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNvlListEditOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleSaveNvlListEdit()} disabled={nvlListEditSaving}>
              {nvlListEditSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {nvlListEditSaving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex h-full min-h-screen bg-muted">

      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 border-r bg-card flex flex-col shadow-sm">
        <div className="px-4 py-4 border-b space-y-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-destructive" />
            <span className="font-semibold text-foreground text-sm">Catalogo Tenant</span>
            <Badge variant="outline" className="ml-auto text-[10px]">{ENDPOINTS.length}</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar endpoint..." className="pl-8 h-9 text-sm" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <nav className="p-3 space-y-0.5">
            {SECTIONS.map((section) => {
              const items = endpointsBySection[section];
              const isOpen = !collapsed[section];
              return (
                <div key={section}>
                  <button onClick={() => toggleSection(section)}
                    className="w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-muted transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={cn('shrink-0', SECTION_COLOR[section])}>{SECTION_ICON[section]}</span>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {SECTION_LABEL[section]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground font-mono">{items.length}</span>
                      <span className="text-muted-foreground">
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </span>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="mt-0.5 mb-2 ml-2 pl-2 border-l border-slate-100 space-y-0.5">
                      {items.length === 0 && (
                        <p className="px-3 py-2 text-xs text-muted-foreground italic">Sin resultados</p>
                      )}
                      {items.map((ep) => (
                        <NavItem key={ep.id} endpoint={ep} isActive={selectedId === ep.id}
                          onClick={() => setSelectedId(ep.id)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </ScrollArea>
      </aside>

      {/* ── PANEL PRINCIPAL ─────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-5">

          {/* Breadcrumb */}
          <div>
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
              <span className={SECTION_COLOR[selectedEndpoint.section]}>{SECTION_ICON[selectedEndpoint.section]}</span>
              <span>{SECTION_LABEL[selectedEndpoint.section]}</span>
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <MethodBadge method={selectedEndpoint.method} />
              <h1 className="text-2xl font-bold text-foreground">{selectedEndpoint.title}</h1>
              {selectedEndpoint.id === 'nvlg-crear' ? <NvlGlobalCrearHelpButton /> : null}
            </div>
          </div>

          {/* Info card */}
          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4 space-y-2">
              <code className="block rounded bg-muted px-3 py-2 text-xs text-foreground font-mono break-all">
                {selectedEndpoint.path}
              </code>
              <p className="text-sm text-muted-foreground">{selectedEndpoint.description}</p>
              {isSelectedEndpointBlocked && (
                <p className="text-sm font-medium text-warning">
                  Solo el scope `tenantSuperAdmin` del JWT puede guardar o ejecutar esta accion. `tenantGlobal` y `tenantCorporativo` quedan sin accion.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Formulario */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                Parametros
              </CardTitle>
              {selectedEndpoint.fields.length === 0 && (
                <CardDescription>
                  Este endpoint no requiere parametros. Haz clic en Ejecutar para probarlo.
                </CardDescription>
              )}
            </CardHeader>

            {selectedEndpoint.fields.length > 0 && (
              <CardContent className="space-y-5">
                {(() => {
                  const pathFields = selectedEndpoint.fields.filter((f) => f.pathParam);
                  const bodyFields = selectedEndpoint.fields.filter((f) => !f.pathParam && !f.header);
                  return (
                    <>
                      {pathFields.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Path params</span>
                            <Separator className="flex-1" />
                          </div>
                          {pathFields.map((field) => (
                            <FieldRow key={field.name} field={field}
                              value={getField(selectedEndpoint.id, field.name)}
                              onChange={(v) => setField(selectedEndpoint.id, field.name, v)}
                              renderField={() => renderField(field, selectedEndpoint.id)} />
                          ))}
                        </div>
                      )}
                      {bodyFields.length > 0 && (
                        <div className="space-y-4">
                          {pathFields.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Body</span>
                              <Separator className="flex-1" />
                            </div>
                          )}
                          {bodyFields.map((field) => (
                            <FieldRow key={field.name} field={field}
                              value={getField(selectedEndpoint.id, field.name)}
                              onChange={(v) => setField(selectedEndpoint.id, field.name, v)}
                              renderField={() => renderField(field, selectedEndpoint.id)} />
                          ))}
                        </div>
                      )}
                      {selectedEndpoint.id === 'nvlg-crear' && (
                        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-muted/80 px-3 py-3">
                          {canManageGlobalNvlState ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="shrink-0 gap-2"
                              onClick={() => void openRetryModal('nvlg-crear')}
                              disabled={retryModalLoading}
                            >
                              <Settings2 className="h-4 w-4" />
                              Reintentos
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            className="shrink-0 gap-2"
                            onClick={() => void openNvlModal('nvlg-crear')}
                            disabled={nvlModalLoading || !canManageGlobalNvlState}
                          >
                            {nvlModalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                            Parametrizar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0 gap-1 text-xs"
                            onClick={() => void fetchNvlGlobalList()}
                            disabled={nvlGlobalListLoading}
                          >
                            {nvlGlobalListLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                            Actualizar lista (GET catalogo)
                          </Button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            )}
          </Card>

          {/* Acciones */}
          <div className="flex items-center gap-3">
            <Button onClick={() => void handleRun(selectedEndpoint)} disabled={isRunning || isSelectedEndpointBlocked} className="gap-2">
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isRunning ? 'Ejecutando...' : 'Ejecutar'}
            </Button>
            <Button variant="outline" onClick={() => handleClean(selectedEndpoint.id)} disabled={isRunning} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Limpiar
            </Button>
          </div>

          {/* Resultado */}
          {(resultText || isRunning || (selectedEndpoint.id === 'nvlg-listar' && nvlGlobalListData.length > 0)) && (
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-foreground">Respuesta</CardTitle>
              </CardHeader>
              <CardContent>
                {isRunning ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Ejecutando solicitud...
                  </div>
                ) : selectedEndpoint.id === 'nvlg-listar' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-muted px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Tabla de niveles globales</p>
                        <p className="text-xs text-muted-foreground">Vista estetica del catalogo base y su relacion con la parametrizacion hija.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-card">
                          {nvlGlobalListData.length} registros
                        </Badge>
                        <Button type="button" variant="outline" size="sm" onClick={() => void fetchNvlGlobalList()} disabled={nvlGlobalListLoading}>
                          {nvlGlobalListLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-card">
                      <div className="grid grid-cols-2 gap-0 bg-muted text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <div className="px-4 py-3">Resumen del nivel</div>
                        <div className="px-4 py-3 text-left lg:text-right">Estado y acciones</div>
                      </div>
                      <div className="divide-y divide-slate-200 bg-card">
                        {nvlGlobalListData.map((item) => {
                          const itemId = String(item?.iud || item?._id || '');
                          const busy = nvlGlobalActionId === itemId;
                          return (
                            <div
                              key={itemId || `${item?.nvl}-${item?.generation_tenant}`}
                              className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.95fr)]"
                            >
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="bg-card">NVL {String(item?.nvl ?? '-')}</Badge>
                                  <Badge variant="secondary">Secuencia #{Number(item?.secuencia ?? item?.orden ?? 0)}</Badge>
                                  <Badge variant={item?.estado === false ? 'secondary' : 'default'}>
                                    {item?.estado === false ? 'Inactivo' : 'Activo'}
                                  </Badge>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-muted px-4 py-3">
                                  <div className="flex flex-col gap-1">
                                    <p className="text-base font-semibold text-foreground">{String(item?.nombre ?? 'Sin nombre')}</p>
                                    <p className="font-mono text-xs text-muted-foreground">{String(item?.generation_tenant ?? 'SIN-CLAVE')}</p>
                                    <p className="text-sm text-muted-foreground">{String(item?.descripcion ?? 'Sin descripcion')}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-background to-slate-50 p-4">
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="rounded-xl border border-slate-200 bg-card px-3 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Acceso libre</p>
                                    <p className={`mt-2 text-sm font-semibold ${item?.securityPlatform ? 'text-success' : 'text-warning'}`}>
                                      {item?.securityPlatform ? 'true' : 'false'}
                                    </p>
                                  </div>
                                  <div className="rounded-xl border border-slate-200 bg-card px-3 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Registro</p>
                                    <p className="mt-2 break-all text-xs text-muted-foreground">{itemId || 'Sin id'}</p>
                                  </div>
                                </div>
                                <div className="border-t border-slate-200 pt-3">
                                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Acciones disponibles</p>
                                  {canManageGlobalNvlState ? (
                                    <div className="flex flex-wrap gap-2">
                                      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => openNvlListEditModal(item)} disabled={busy}>
                                        <Pencil className="h-3.5 w-3.5" />
                                        Update
                                      </Button>
                                      <Button type="button" variant="outline" size="sm" onClick={() => void handleDeactivateNvlGlobal(item)} disabled={busy || item?.estado === false}>
                                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Desactivar'}
                                      </Button>
                                      <Button type="button" variant="outline" size="sm" className="gap-1 text-destructive" onClick={() => void handleDeleteNvlGlobal(item)} disabled={busy}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Eliminar
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="rounded-lg border border-dashed border-slate-200 bg-muted px-3 py-2 text-xs text-muted-foreground">
                                      Sin acciones para este scope
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {!nvlGlobalListData.length ? (
                          <div className="px-4 py-6 text-sm text-muted-foreground">No hay niveles globales para mostrar.</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : resultText ? (
                  <pre className="overflow-auto rounded bg-button text-muted-foreground p-4 text-xs font-mono leading-relaxed max-h-[400px] whitespace-pre-wrap break-words">
                    {resultText}
                  </pre>
                ) : null}
              </CardContent>
            </Card>
          )}

        </div>
      </main>
      </div>
    </>
  );
};

export default ParametrizacionCatologTenant;
