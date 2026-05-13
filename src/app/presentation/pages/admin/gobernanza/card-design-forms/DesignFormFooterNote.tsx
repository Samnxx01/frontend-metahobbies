import React from 'react';

export function DesignFormFooterNote(): React.ReactElement {
  return (
    <p className="text-xs text-muted-foreground">
      Los cambios son locales al navegador y sirven para prototipar el aspecto de cada tarjeta; no modifican permisos ni
      endpoints en servidor.
    </p>
  );
}
