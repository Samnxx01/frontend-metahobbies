import React, { useEffect, useMemo, useState } from 'react';
import { fetchGobernanzaBotonesCatalogo } from '@/app/presentation/pages/admin/gobernanza/gobernanzaModuloService';
import { GovernanceButtonProvider } from './GovernedButton';
import type { ActionId } from './types';

type ScopeState = {
  configured: boolean;
  configuredIds: ActionId[];
  allowedIds: ActionId[];
};

const UNCONFIGURED_SCOPE: ScopeState = { configured: false, configuredIds: [], allowedIds: [] };

/**
 * Resuelve una sola vez el alcance de botones para la sesión administrativa.
 * Si el catálogo aún no está parametrizado o el servicio falla, mantiene
 * compatibilidad y no bloquea la aplicación.
 */
export function GovernanceButtonScopeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [scope, setScope] = useState<ScopeState>(UNCONFIGURED_SCOPE);

  useEffect(() => {
    let active = true;
    const load = (): void => { void fetchGobernanzaBotonesCatalogo()
      .then((buttons) => {
        if (!active) return;
        if (buttons.length === 0) {
          setScope(UNCONFIGURED_SCOPE);
          return;
        }
        const allowedIds = buttons
          .filter((button) => button.estado !== false && button.disponible !== false)
          .map((button) => String(button.buttonId || '').trim())
          .filter(Boolean);
        const configuredIds = buttons
          .filter((button) => button.estado !== false)
          .map((button) => String(button.buttonId || '').trim())
          .filter(Boolean);
        setScope({ configured: true, configuredIds: [...new Set(configuredIds)], allowedIds: [...new Set(allowedIds)] });
      })
      .catch(() => {
        if (active) setScope(UNCONFIGURED_SCOPE);
      }); };
    load();
    window.addEventListener('governance-buttons-updated', load);
    return () => {
      active = false;
      window.removeEventListener('governance-buttons-updated', load);
    };
  }, []);

  const allowedActionIds = useMemo(
    () => scope.configured ? scope.allowedIds : undefined,
    [scope],
  );

  return (
    <GovernanceButtonProvider
      configuredActionIds={scope.configured ? scope.configuredIds : undefined}
      allowedActionIds={allowedActionIds}
      fallback="allow"
      deniedBehavior="hide"
    >
      {children}
    </GovernanceButtonProvider>
  );
}
