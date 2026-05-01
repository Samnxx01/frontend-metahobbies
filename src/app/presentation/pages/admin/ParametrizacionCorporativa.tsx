import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RepresentanteEmpresarial from '@/app/presentation/pages/admin/RepresentanteEmpresarial';
import SociedadesCorporativas from '@/app/presentation/pages/admin/SociedadesCorporativas';
import DireccionCorporativa from '@/app/presentation/pages/admin/DireccionCorporativa';
import DocumentosCorporativos from '@/app/presentation/pages/admin/DocumentosCorporativos';
import LogosCorporativos from '@/app/presentation/pages/admin/LogosCorporativos';
import SectorIndustriaEmpresa from '@/app/presentation/pages/admin/SectorIndustriaEmpresa';
import PerfilCorporativo from '@/app/presentation/pages/admin/PerfilCorporativo';
import DesactivarPerfilCorporativo from '@/app/presentation/pages/admin/DesactivarPerfilCorporativo';
import { getAdminSidebarTreeWithContext, type AdminNavTreeItem } from '@/app/services/routeService';

type TabComponent = () => ReactElement;

type DynamicTabDefinition = {
  value: string;
  label: string;
  componentKey: string;
  render: TabComponent;
  path?: string;
  destructive?: boolean;
  aliases?: string[];
};

const TAB_DEFINITIONS: DynamicTabDefinition[] = [
  {
    value: 'representante',
    label: 'Representante Empresarial',
    componentKey: 'RepresentanteEmpresarial',
    aliases: ['ParametrizacionRepresentante'],
    render: RepresentanteEmpresarial,
  },
  {
    value: 'sociedades',
    label: 'Sociedades Corporativas',
    componentKey: 'SociedadesCorporativas',
    aliases: ['ParametrizacionSociedades'],
    render: SociedadesCorporativas,
  },
  {
    value: 'direccion',
    label: 'Direccion Corporativa',
    componentKey: 'DireccionCorporativa',
    render: DireccionCorporativa,
  },
  {
    value: 'documentos',
    label: 'Documentos Corporativos',
    componentKey: 'DocumentosCorporativos',
    render: DocumentosCorporativos,
  },
  {
    value: 'logos',
    label: 'Logos Corporativos',
    componentKey: 'LogosCorporativos',
    aliases: ['CargaLogoCorporativo'],
    render: LogosCorporativos,
  },
  {
    value: 'sector',
    label: 'Sector/Industria Empresa',
    componentKey: 'SectorIndustriaEmpresa',
    aliases: ['SectorIndustrial'],
    render: SectorIndustriaEmpresa,
  },
  {
    value: 'perfil',
    label: 'Perfil Corporativo',
    componentKey: 'PerfilCorporativo',
    aliases: ['ParametrizacionCorporativa'],
    render: PerfilCorporativo,
  },
  {
    value: 'desactivar-perfil',
    label: 'Desactivar Perfil',
    componentKey: 'DesactivarPerfilCorporativo',
    aliases: ['DesactivarPerfil'],
    render: DesactivarPerfilCorporativo,
    destructive: true,
  },
];

const normalizeKey = (value: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .trim()
    .toLowerCase();

const matchesDefinition = (definition: DynamicTabDefinition, componentName: string): boolean => {
  const normalizedComponent = normalizeKey(componentName);
  if (normalizeKey(definition.componentKey) === normalizedComponent) return true;
  return Array.isArray(definition.aliases)
    ? definition.aliases.some((alias) => normalizeKey(alias) === normalizedComponent)
    : false;
};

const findNodeByComponent = (nodes: AdminNavTreeItem[], componentNames: string[]): AdminNavTreeItem | null => {
  for (const node of nodes) {
    const component = String(node.component || '').trim();
    if (componentNames.some((name) => normalizeKey(name) === normalizeKey(component))) {
      return node;
    }

    const childMatch = findNodeByComponent(node.children || [], componentNames);
    if (childMatch) return childMatch;
  }

  return null;
};

const headerStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--secondary)))',
};

export default function ParametrizacionCorporativa() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('representante');
  const [dynamicTabs, setDynamicTabs] = useState<DynamicTabDefinition[]>([]);
  const [parentRoutePath, setParentRoutePath] = useState<string>('');

  useEffect(() => {
    let active = true;

    const loadDynamicTabs = async () => {
      try {
        const { tree, actorTipo } = await getAdminSidebarTreeWithContext();
        const parentNode = findNodeByComponent(tree, ['ParametrizacionCorporativa']);
        const children = Array.isArray(parentNode?.children) ? parentNode.children : [];

        const resolvedTabs = children
          .map((child) => {
            const componentName = String(child.component || '').trim();
            const definition = TAB_DEFINITIONS.find((item) => matchesDefinition(item, componentName));
            if (!definition) return null;
            return {
              ...definition,
              path: String(child.path || '').trim() || undefined,
            };
          })
          .filter((item): item is DynamicTabDefinition => item !== null);

        const uniqueTabs = resolvedTabs.filter(
          (tab, index, array) => array.findIndex((candidate) => candidate.value === tab.value) === index
        );

        const fallbackTabs = TAB_DEFINITIONS.filter((tab) => tab.value !== 'desactivar-perfil');
        const routeAuthorizedButLeaf =
          !!parentNode &&
          String(parentNode.path || '').trim() === window.location.pathname &&
          children.length === 0;

        const nextTabs = uniqueTabs.length
          ? uniqueTabs
          : routeAuthorizedButLeaf || actorTipo === 'SUPERADMIN'
            ? fallbackTabs
            : parentNode
              ? []
              : fallbackTabs;

        if (!active) return;

        setParentRoutePath(String(parentNode?.path || '').trim());
        setDynamicTabs(nextTabs);
        setActiveTab((current) => {
          if (nextTabs.some((tab) => tab.value === current)) return current;
          return nextTabs[0]?.value || 'representante';
        });
      } catch (error) {
        console.error('Error resolviendo tabs dinamicos de parametrizacion corporativa:', error);
        if (!active) return;

        setParentRoutePath('');
        const fallbackTabs = TAB_DEFINITIONS.filter((tab) => tab.value !== 'desactivar-perfil');
        setDynamicTabs(fallbackTabs);
        setActiveTab((current) => (fallbackTabs.some((tab) => tab.value === current) ? current : fallbackTabs[0].value));
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadDynamicTabs();

    return () => {
      active = false;
    };
  }, []);

  const visibleTabs = useMemo(() => dynamicTabs, [dynamicTabs]);
  const activeTabConfig = useMemo(
    () => visibleTabs.find((tab) => tab.value === activeTab) || visibleTabs[0] || null,
    [activeTab, visibleTabs]
  );

  const handleTabChange = (value: string) => {
    const selectedTab = visibleTabs.find((tab) => tab.value === value);
    setActiveTab(value);
    if (selectedTab?.path) {
      window.history.replaceState(window.history.state, '', selectedTab.path);
    }
  };

  useEffect(() => {
    if (!visibleTabs.length) return;

    const currentPath = window.location.pathname;
    if (parentRoutePath && currentPath === parentRoutePath) {
      const firstTabValue = visibleTabs[0]?.value || 'representante';
      if (firstTabValue !== activeTab) {
        setActiveTab(firstTabValue);
      }
      return;
    }

    const matchedTab = visibleTabs.find((tab) => tab.path && tab.path === currentPath);
    if (matchedTab && matchedTab.value !== activeTab) {
      setActiveTab(matchedTab.value);
    }
  }, [activeTab, parentRoutePath, visibleTabs]);

  useEffect(() => {
    if (!activeTabConfig?.path) return;
    if (parentRoutePath && window.location.pathname === parentRoutePath) return;
    if (window.location.pathname === activeTabConfig.path) return;

    window.history.replaceState(window.history.state, '', activeTabConfig.path);
  }, [activeTabConfig?.path, parentRoutePath]);

  if (loading) {
    return <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Cargando parametrizacion corporativa...</div>;
  }

  if (!visibleTabs.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/80 p-6 text-sm text-muted-foreground">
        No tienes rutas autorizadas para esta parametrizacion corporativa con el alcance actual del JWT.
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div
        className="rounded-2xl border border-border px-5 py-6 text-primary-foreground shadow-sm"
        style={headerStyle}
      >
        <p className="text-xs uppercase tracking-[0.22em] text-primary-foreground/80">Parametrizacion Corporativa</p>
        <h1 className="mt-2 text-2xl font-semibold">Centro de parametrizacion Empresas</h1>
        <p className="mt-2 max-w-3xl text-sm text-primary-foreground/85">
          Administra perfiles, representantes, logos, documentos y los demas parametros visibles segun las rutas
          autorizadas en tu contexto.
        </p>
      </div>

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

        {visibleTabs.map((tab) => {
          const TabComponent = tab.render;
          return (
            <TabsContent key={tab.value} value={tab.value}>
              <TabComponent />
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
}
