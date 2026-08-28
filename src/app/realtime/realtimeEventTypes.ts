export interface InventarioInvalidadoEvent {
  eventId: string;
  occurredAt: string;
  scopes: string[];
  method: string;
  resource: string;
  changedBy: string | null;
}
