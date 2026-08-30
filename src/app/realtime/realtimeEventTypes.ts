export interface InventarioInvalidadoEvent {
  eventId: string;
  occurredAt: string;
  scopes: string[];
  method: string;
  resource: string;
  changedBy: string | null;
}

export interface GobernanzaInvalidadaEvent {
  eventId: string;
  occurredAt: string;
  scopes: Array<'reglas' | 'herencias' | string>;
  method: string;
  resource: string;
  changedBy: string | null;
}

export interface PedidosAprobadosInvalidadoEvent {
  eventId: string;
  occurredAt: string;
  scopes: string[];
  method: string;
  resource: string;
  changedBy: string | null;
}
