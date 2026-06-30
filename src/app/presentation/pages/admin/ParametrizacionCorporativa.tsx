import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RepresentanteEmpresarial from '@/app/presentation/pages/admin/RepresentanteEmpresarial';
import SociedadesCorporativas from '@/app/presentation/pages/admin/SociedadesCorporativas';
import DireccionCorporativa from '@/app/presentation/pages/admin/DireccionCorporativa';
import DocumentosCorporativos from '@/app/presentation/pages/admin/DocumentosCorporativos';
import LogosCorporativos from '@/app/presentation/pages/admin/LogosCorporativos';
import SectorIndustriaEmpresa from '@/app/presentation/pages/admin/SectorIndustriaEmpresa';
import PerfilCorporativo from '@/app/presentation/pages/admin/PerfilCorporativo';
import DesactivarPerfilCorporativo from '@/app/presentation/pages/admin/DesactivarPerfilCorporativo';
import { fetchGobernanzaModuloOperativo } from '@/app/presentation/pages/admin/gobernanza/gobernanzaModuloService';
import { GOBERNANZA_TIPO_SECTION_EMPRESAS } from '@/app/presentation/pages/admin/gobernanza/gobernanzaTipoSectionConstants';
import { buildAccionesHubDesdeConfigsClient } from '@/app/presentation/pages/admin/gobernanza/gobernanzaModuloMenuMappers';
import type {
  GobernanzaModuloConfigApi,
  GobernanzaModuloMenuAccion,
} from '@/app/presentation/pages/admin/gobernanza/gobernanzaModuloApiTypes';

type TabComponent = () => ReactElement;

/** Solo resolución de componente React por nombre publicado en rutaseguridads (no define el menú). */
const EMPRESAS_COMPONENT_REGISTRY: Record<string, TabComponent> = {
  RepresentanteEmpresarial,
  ParametrizacionRepresentante: RepresentanteEmpresarial,
  SociedadesCorporativas,
  ParametrizacionSociedades: SociedadesCorporativas,
  DireccionCorporativa,
  DocumentosCorporativos,
  LogosCorporativos,
  CargaLogoCorporativo: LogosCorporativos,
  SectorIndustriaEmpresa,
  SectorIndustrial: SectorIndustriaEmpresa,
  PerfilCorporativo,
  ParametrizacionCorporativa: PerfilCorporativo,
  DesactivarPerfilCorporativo,
  DesactivarPerfil: DesactivarPerfilCorporativo,
};

type EmpresasTab = {
  value: string;
  label: string;
  path?: string;
  order: number;
  formularioComponent: string;
  destructive?: boolean;
};

const normalizeComponentKey = (value: string): string =>
  String(value || '')
    .replace(/\.(jsx|tsx|js|ts)$/i, '')
    .trim();

const resolveEmpresasTabComponent = (formularioComponent: string): TabComponent | null => {
  const key = normalizeComponentKey(formularioComponent);
  if (!key) return null;
  return EMPRESAS_COMPONENT_REGISTRY[key] ?? null;
};

const mapConfigToTab = (cfg: GobernanzaModuloConfigApi): EmpresasTab | null => {
  const formularioComponent = normalizeComponentKey(String(cfg.formularioComponent || '').trim());
  const label = String(cfg.nombre || cfg.label || '').trim();
  const path = String(cfg.menuPath || cfg.frontPath || cfg.rutaPath || '').trim();
  const value = String(cfg.slug || path || formularioComponent).trim();
  if (!formularioComponent || !label || !value) return null;
  if (!resolveEmpresasTabComponent(formularioComponent)) return null;
  return {
    value,
    label,
    path: path || undefined,
    order: Number(cfg.orden ?? 0),
    formularioComponent,
    destructive: /desactivar/i.test(formularioComponent) || /desactivar/i.test(label),
  };
};

const mapAccionToTab = (accion: GobernanzaModuloMenuAccion): EmpresasTab | null => {
  const formularioComponent = normalizeComponentKey(String(accion.formularioComponent || '').trim());
  const label = String(accion.shortLabel || accion.title || '').trim();
  const path = String(accion.menuPath || accion.path || '').trim();
  const value = String(accion.configSlug || accion.id || path || formularioComponent).trim();
  if (!formularioComponent || !label || !value) return null;
  if (!resolveEmpresasTabComponent(formularioComponent)) return null;
  return {
    value,
    label,
    path: path || undefined,
    order: Number(accion.orden ?? 0),
    formularioComponent,
    destructive: /desactivar/i.test(formularioComponent) || /desactivar/i.test(label),
  };
};

const dedupeTabs = (tabs: EmpresasTab[]): EmpresasTab[] =>
  tabs.filter((tab, index, array) => array.findIndex((candidate) => candidate.value === tab.value) === index);

const sortTabs = (tabs: EmpresasTab[]): EmpresasTab[] =>
  [...tabs].sort(
    (a, b) =>
      Number(a.order ?? 0) - Number(b.order ?? 0) ||
      String(a.label || '').localeCompare(String(b.label || '')),
  );

const buildTabsFromOperativo = (
  configs: GobernanzaModuloConfigApi[],
  acciones: GobernanzaModuloMenuAccion[],
): EmpresasTab[] => {
  const fromAcciones = acciones
    .map(mapAccionToTab)
    .filter((item): item is EmpresasTab => item !== null);
  if (fromAcciones.length) return sortTabs(dedupeTabs(fromAcciones));

  return sortTabs(
    dedupeTabs(
      configs
        .map(mapConfigToTab)
        .filter((item): item is EmpresasTab => item !== null),
    ),
  );
};

function EmpresasTabPanel({ formularioComponent }: { formularioComponent: string }): ReactElement {
  const Component = resolveEmpresasTabComponent(formularioComponent);
  if (!Component) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Componente no disponible: <code className="font-mono">{formularioComponent}</code>
      </div>
    );
  }
  return <Component />;
}

const headerStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--secondary)))',
};

export default function ParametrizacionCorporativa() {
  const { pathname } = useLocation();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('');
  const [dynamicTabs, setDynamicTabs] = useState<EmpresasTab[]>([]);
  const [parentRoutePath, setParentRoutePath] = useState('');
  const [hubTitle, setHubTitle] = useState('');
  const [hubDescription, setHubDescription] = useState('');

  const loadTabsFromParametrizacion = useCallback(async (menuPath: string): Promise<EmpresasTab[]> => {
    const res = await fetchGobernanzaModuloOperativo({
      section: 'corporativo',
      menuPath,
      hubOperaciones: true,
      tipoSection: GOBERNANZA_TIPO_SECTION_EMPRESAS,
    });

    const configs = Array.isArray(res.configs) ? res.configs : [];
    let acciones = Array.isArray(res.acciones) ? res.acciones : [];
    if (!acciones.length && configs.length) {
      acciones = buildAccionesHubDesdeConfigsClient(configs, menuPath);
    }

    const tabs = buildTabsFromOperativo(configs, acciones);
    setParentRoutePath(String(res.modulo?.menuPath || menuPath).trim());
    setHubTitle(String(res.modulo?.nombre || res.modulo?.label || '').trim());
    setHubDescription(String(res.modulo?.description || '').trim());
    return tabs;
  }, []);

  useEffect(() => {
    let active = true;

    const loadDynamicTabs = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const nextTabs = await loadTabsFromParametrizacion(pathname);
        if (!active) return;

        setDynamicTabs(nextTabs);
        setActiveTab((current) => {
          if (current && nextTabs.some((tab) => tab.value === current)) return current;
          const byPath = nextTabs.find((tab) => tab.path && tab.path === pathname);
          return byPath?.value || nextTabs[0]?.value || '';
        });
      } catch (error) {
        console.error('Error cargando menú empresas desde gobernanzaModuloConfigs:', error);
        if (!active) return;
        setDynamicTabs([]);
        setActiveTab('');
        setParentRoutePath('');
        setHubTitle('');
        setHubDescription('');
        setLoadError(error instanceof Error ? error.message : 'No se pudo cargar la parametrización');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadDynamicTabs();

    return () => {
      active = false;
    };
  }, [pathname, loadTabsFromParametrizacion]);

  const visibleTabs = useMemo(() => dynamicTabs, [dynamicTabs]);
  const activeTabConfig = useMemo(
    () => visibleTabs.find((tab) => tab.value === activeTab) || visibleTabs[0] || null,
    [activeTab, visibleTabs],
  );

  const handleTabChange = (value: string) => {
    const selectedTab = visibleTabs.find((tab) => tab.value === value);
    setActiveTab(value);
    if (selectedTab?.path) {
      window.history.replaceState(window.history.state, '', selectedTab.path);
    }
  };

  useEffect(() => {
    if (!visibleTabs.length || !activeTab) return;

    if (parentRoutePath && pathname === parentRoutePath) {
      const firstTabValue = visibleTabs[0]?.value || '';
      if (firstTabValue && firstTabValue !== activeTab) {
        setActiveTab(firstTabValue);
      }
      return;
    }

    const matchedTab = visibleTabs.find((tab) => tab.path && tab.path === pathname);
    if (matchedTab && matchedTab.value !== activeTab) {
      setActiveTab(matchedTab.value);
    }
  }, [activeTab, parentRoutePath, pathname, visibleTabs]);

  useEffect(() => {
    if (!activeTabConfig?.path || !activeTab) return;
    if (parentRoutePath && pathname === parentRoutePath) return;
    if (pathname === activeTabConfig.path) return;

    window.history.replaceState(window.history.state, '', activeTabConfig.path);
  }, [activeTab, activeTabConfig?.path, parentRoutePath, pathname]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Cargando parametrizacion corporativa...
      </div>
    );
  }

  if (loadError || !visibleTabs.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/80 p-6 text-sm text-muted-foreground">
        {loadError
          ? loadError
          : 'Sin parametrización publicada para tipo «empresas». Publica módulos en gobernanzaModuloConfigs (Parametrizar menú) antes de usar esta vista.'}
      </div>
    );
  }

  return (
    <section className="space-y-5">
      {(hubTitle || hubDescription) ? (
        <div
          className="rounded-2xl border border-border px-5 py-6 text-primary-foreground shadow-sm"
          style={headerStyle}
        >
          {hubTitle ? (
            <>
              <p className="text-xs uppercase tracking-[0.22em] text-primary-foreground/80">Parametrizacion</p>
              <h1 className="mt-2 text-2xl font-semibold">{hubTitle}</h1>
            </>
          ) : null}
          {hubDescription ? (
            <p className="mt-2 max-w-3xl text-sm text-primary-foreground/85">{hubDescription}</p>
          ) : null}
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex w-full flex-col items-center">
          <TabsList className="mb-4 flex min-h-[88px] w-full max-w-[80vw] flex-wrap justify-center gap-2 md:min-h-[44px] md:max-w-[80%]">
            {visibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={tab.destructive ? 'text-destructive' : undefined}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {activeTabConfig?.path ? (
            <div className="mb-4 w-full max-w-[80vw] rounded-md border border-border bg-muted/60 px-3 py-2 text-xs text-foreground md:max-w-[80%]">
              Ruta parametrizada: <span className="font-medium">{activeTabConfig.path}</span>
            </div>
          ) : null}
        </div>

        {visibleTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <EmpresasTabPanel formularioComponent={tab.formularioComponent} />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
