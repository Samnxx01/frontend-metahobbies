import React, { createContext, useContext } from 'react';

export type GobernanzaFlowHelpContextValue = {
  renderHelpExtra?: (endpointId: string) => React.ReactNode;
};

const GobernanzaFlowHelpContext = createContext<GobernanzaFlowHelpContextValue>({});

export function GobernanzaFlowHelpProvider({
  value,
  children,
}: {
  value: GobernanzaFlowHelpContextValue;
  children: React.ReactNode;
}): React.ReactElement {
  return <GobernanzaFlowHelpContext.Provider value={value}>{children}</GobernanzaFlowHelpContext.Provider>;
}

export function useGobernanzaFlowHelpExtra(endpointId: string): React.ReactNode {
  const ctx = useContext(GobernanzaFlowHelpContext);
  return ctx.renderHelpExtra?.(endpointId) ?? null;
}
