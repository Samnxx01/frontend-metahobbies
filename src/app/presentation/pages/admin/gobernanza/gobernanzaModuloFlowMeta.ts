/** Textos de ayuda por acción (reutilizable en cualquier módulo). */

import { ENDPOINTS_BY_ID } from './gobernanzaEndpointCatalog';

export type GobernanzaModuloFlowMeta = {
  title: string;
  summary: string;
  helpTitle: string;
  helpParagraphs: string[];
  tips?: string[];
};

const META: Record<string, GobernanzaModuloFlowMeta> = {
  'tenant-listar-libres-tenantglobal': {
    title: 'Consultar tenants de tu red',
    summary:
      'Muestra los administradores de sistema (tenantSuperAdmin) que puedes ver según tu tenant global. Es el punto de partida antes de crear o modificar descendientes.',
    helpTitle: '¿Qué hace esta consulta?',
    helpParagraphs: [
      'Ejecuta una lectura (GET) sin modificar datos. El servidor filtra la lista usando el tenant global de tu sesión.',
      'Úsala para verificar nombres, IDs y alcance antes de dar de alta un tenant hijo o editar uno existente.',
    ],
    tips: ['No requiere completar campos: pulsa Ejecutar directamente.'],
  },
  'tenant-crear-global-usuario': {
    title: 'Dar de alta un tenant global hijo',
    summary:
      'Registra un nuevo tenant global bajo tu rama (descendencia). El nivel jerárquico lo calcula el servidor según tu configuración.',
    helpTitle: '¿Qué necesito para crear?',
    helpParagraphs: [
      'Completa corporativo (si aplica), dominios API, acción de usuario y rol MABS. Los campos obligatorios están marcados.',
      'Solo sesiones tenantGlobal (o tenantSuperAdmin con alcance) pueden ejecutar este alta.',
    ],
    tips: ['Tras crear, vuelve a Consultar para confirmar que el registro aparece en tu red.'],
  },
  'tenant-actualizar-global': {
    title: 'Modificar un tenant global',
    summary:
      'Cambia tipo de tenant, dominios o roles de un registro existente. Debes indicar el ID del tenant a actualizar.',
    helpTitle: '¿Cómo actualizo de forma segura?',
    helpParagraphs: [
      'Selecciona o escribe el ID del tenant global. Puedes cargar datos previos si el formulario ofrece autocompletado.',
      'Los cambios aplican solo al tenant indicado; el servidor valida que pertenezca a tu alcance (DIOS / SA).',
    ],
    tips: ['Si no ves el tenant en la lista, revisa primero la consulta GET.'],
  },
  'tenant-desactivar-global': {
    title: 'Bloquear un tenant global',
    summary:
      'Desactiva el tenant sin borrarlo del sistema. El registro queda inactivo y deja de usarse en flujos operativos.',
    helpTitle: '¿Bloqueo o eliminación?',
    helpParagraphs: [
      'El bloqueo es reversible a nivel de negocio (según políticas del backend). No elimina historial ni relaciones.',
      'Indica el ID del tenant global que deseas desactivar.',
    ],
    tips: ['Prefiere bloquear antes que eliminar si hay dudas sobre el impacto.'],
  },
  'tenant-eliminar-global': {
    title: 'Eliminar un tenant global',
    summary:
      'Eliminación definitiva del tenant global indicado. Operación crítica: verifica el ID antes de ejecutar.',
    helpTitle: '¿Cuándo usar eliminación?',
    helpParagraphs: [
      'Solo cuando el tenant debe retirarse por completo del catálogo y las reglas del servidor lo permitan.',
      'Requiere permisos de tenantSuperAdmin (DIOS) con alcance sobre ese registro.',
    ],
    tips: ['Si solo quieres suspender el acceso, usa Bloquear en su lugar.'],
  },
  'tenant-crear-dios-reglas': {
    title: 'Crear regla DIOS (acceso plataforma)',
    summary:
      'Parametriza la regla de plataforma para ramas tenant SuperAdmin: recursos (vistas), acciones HTTP y políticas runtime.',
    helpTitle: '¿Qué es acceso full al sistema?',
    helpParagraphs: [
      'Acceso full: el tenant SuperAdmin no tiene corporativo materializado en tenantJerarquiaCounter. Puedes crear la regla DIOS y sincronizar todas las vistas y acciones activas.',
      'Alcance acotado: si la rama tiene corporativo en counters, solo puedes consultar la regla ya parametrizada (sin sync total).',
      'Marca uno o varios tenant SuperAdmin en el formulario; si hay varios usuarios en una rama, elige cuáles parametrizar.',
    ],
    tips: [
      'El listado siguiente se arma con tu JWT y los tenant SuperAdmin visibles en selects.',
      'Sin corporativo en counters: botones Guardar y Sincronizar regla DIOS en verde.',
    ],
  },
  'tenant-actualizar-dios-reglas': {
    title: 'Actualizar / sincronizar regla DIOS',
    summary: 'Sincroniza recursos y acciones activas de la regla plataforma del tenant SuperAdmin elegido.',
    helpTitle: 'Sincronización y acceso full',
    helpParagraphs: [
      'Misma regla de acceso full: solo ramas SA sin corporativo en tenantJerarquiaCounter pueden sincronizar el catálogo completo.',
      'Con corporativo en counters el formulario queda en modo referencia.',
    ],
    tips: ['Usa el listado de tenant SuperAdmin abajo para ver qué ramas califican.'],
  },
};

export function getGobernanzaModuloFlowMeta(endpointId: string): GobernanzaModuloFlowMeta | null {
  const hardcoded = META[endpointId];
  if (hardcoded) return hardcoded;

  const spec = ENDPOINTS_BY_ID[endpointId];
  if (!spec) return null;

  return {
    title: spec.title,
    summary: spec.description || spec.title,
    helpTitle: spec.title,
    helpParagraphs: spec.description ? [spec.description] : [],
  };
}

export function registerGobernanzaModuloFlowMeta(endpointId: string, meta: GobernanzaModuloFlowMeta): void {
  META[endpointId] = meta;
}

/** @deprecated Usar getGobernanzaModuloFlowMeta */
export const getTenantFlowMeta = getGobernanzaModuloFlowMeta;
