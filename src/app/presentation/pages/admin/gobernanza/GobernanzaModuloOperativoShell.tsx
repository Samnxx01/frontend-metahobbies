import React from 'react';
import { Loader2, Radio, RefreshCcw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GOBERNANZA_INVENTARIO_PAGE } from './gobernanzaInventarioLayout';
import { NvlRestrictionsHelpDialog } from './NvlRestrictionsHelpDialog';

export type GobernanzaModuloOperativoShellProps = {
  title: string;
  description?: string;
  submenuTitle?: string;
  menuLoading?: boolean;
  onRefreshMenu?: () => void | Promise<void>;
  onReloadData?: () => void;
  reloadingData?: boolean;
  hideInfoBanner?: boolean;
  realtimeConnected?: boolean;
  onRealtimeClick?: () => void;
  showNvlRestrictionsHelp?: boolean;
  children: React.ReactNode;
};

/**
 * Shell operativo alineado a Inventario.tsx (cabecera + acciones + contenido).
 */
export function GobernanzaModuloOperativoShell({
  title,
  description,
  submenuTitle,
  menuLoading,
  onRefreshMenu,
  onReloadData,
  reloadingData,
  hideInfoBanner = false,
  realtimeConnected,
  onRealtimeClick,
  showNvlRestrictionsHelp = false,
  children,
}: GobernanzaModuloOperativoShellProps): React.ReactElement {
  return (
    <div className={GOBERNANZA_INVENTARIO_PAGE}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">ERP Gobernanza</p>
          <h1 className="text-2xl font-bold tracking-normal text-foreground md:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
          ) : null}
          {submenuTitle ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-primary">{submenuTitle}</p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end sm:justify-end">
          {showNvlRestrictionsHelp ? <NvlRestrictionsHelpDialog /> : null}
          {typeof realtimeConnected === 'boolean' ? (
            <Button
              type="button"
              variant="outline"
              onClick={onRealtimeClick}
              className={realtimeConnected ? 'w-full shrink-0 justify-center border-emerald-500 text-emerald-700 sm:w-auto' : 'w-full shrink-0 justify-center border-amber-500 text-amber-700 sm:w-auto'}
              title={realtimeConnected ? 'Datos de gobernanza sincronizados en tiempo real' : 'Reconectar visualización en tiempo real'}
            >
              <Radio className={`mr-2 h-4 w-4 ${realtimeConnected ? 'animate-pulse' : ''}`} />
              Visualización en tiempo real
            </Button>
          ) : null}
          {onReloadData || onRefreshMenu ? (
            <Button
              type="button"
              variant="outline"
              disabled={reloadingData || menuLoading}
              onClick={() => {
                void onRefreshMenu?.();
                onReloadData?.();
              }}
              className="w-full shrink-0 justify-center sm:w-auto"
            >
              {reloadingData ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="mr-2 h-4 w-4" />
              )}
              Actualizar
            </Button>
          ) : null}
        </div>
      </div>

      {!hideInfoBanner ? (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span>
          Menú y formularios se cargan desde la parametrización publicada (como las tarjetas de
          ConfigInventario).
        </span>
      </div>
      ) : null}

      {children}
    </div>
  );
}
