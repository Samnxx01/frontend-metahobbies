import * as React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import type { ActionId } from './types';
import { getGovernedActionDefinition } from './registry/governedActionCatalog';

export type GovernedButtonFallback = 'allow' | 'deny';
export type GovernedButtonDeniedBehavior = 'hide' | 'disable';

type GovernanceButtonContextValue = {
  /** IDs que ya tienen una parametrización persistida. */
  configuredActionIds?: readonly ActionId[];
  allowedActionIds?: readonly ActionId[];
  loading?: boolean;
  fallback?: GovernedButtonFallback;
  deniedBehavior?: GovernedButtonDeniedBehavior;
};

const GovernanceButtonContext = React.createContext<GovernanceButtonContextValue>({});

export type GovernanceButtonProviderProps = GovernanceButtonContextValue & {
  children: React.ReactNode;
};

export function GovernanceButtonProvider({
  children,
  configuredActionIds,
  allowedActionIds,
  loading = false,
  fallback = 'allow',
  deniedBehavior = 'hide',
}: GovernanceButtonProviderProps): React.ReactElement {
  const value = React.useMemo(
    () => ({ configuredActionIds, allowedActionIds, loading, fallback, deniedBehavior }),
    [configuredActionIds, allowedActionIds, loading, fallback, deniedBehavior],
  );
  return <GovernanceButtonContext.Provider value={value}>{children}</GovernanceButtonContext.Provider>;
}

export interface GovernedButtonProps extends ButtonProps {
  actionId: ActionId;
  /** Sobrescribe el listado provisto por GovernanceButtonProvider. [] deniega todas. */
  allowedActionIds?: readonly ActionId[];
  fallback?: GovernedButtonFallback;
  deniedBehavior?: GovernedButtonDeniedBehavior;
  governanceLoading?: boolean;
}

/** Button compatible con shadcn que aplica alcance sin bloquear botones aún no parametrizados. */
export const GovernedButton = React.forwardRef<HTMLButtonElement, GovernedButtonProps>(
  (
    {
      actionId,
      allowedActionIds,
      fallback,
      deniedBehavior,
      governanceLoading,
      disabled,
      title,
      children,
      ...buttonProps
    },
    ref,
  ) => {
    const context = React.useContext(GovernanceButtonContext);
    const usesLocalWhitelist = allowedActionIds !== undefined;
    const effectiveIds = usesLocalWhitelist ? allowedActionIds : context.allowedActionIds;
    const effectiveFallback = fallback ?? context.fallback ?? 'allow';
    const effectiveBehavior = deniedBehavior ?? context.deniedBehavior ?? 'hide';
    const loading = governanceLoading ?? context.loading ?? false;
    const normalizedActionId = String(actionId || '').trim();
    const definition = getGovernedActionDefinition(normalizedActionId);
    const actionIsConfigured = usesLocalWhitelist
      || context.configuredActionIds?.some((id) => String(id) === normalizedActionId) === true;
    const isAllowed = actionIsConfigured
      ? effectiveIds?.some((id) => String(id) === normalizedActionId) === true
      : effectiveFallback === 'allow';

    if (!loading && !isAllowed && effectiveBehavior === 'hide') return null;

    return (
      <Button
        ref={ref}
        data-governed-action={normalizedActionId}
        data-governance-state={loading ? 'loading' : isAllowed ? 'allowed' : 'denied'}
        aria-label={buttonProps['aria-label'] ?? definition?.label}
        title={title ?? definition?.label}
        disabled={disabled || loading || !isAllowed}
        {...buttonProps}
      >
        {children ?? definition?.label}
      </Button>
    );
  },
);

GovernedButton.displayName = 'GovernedButton';
