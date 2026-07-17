import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import LoadingProvider from './app/providers/LoadingProvider.jsx';
import { ThemeProvider } from 'next-themes';
import { sincronizarPaletaAntesDeMontarReact } from '@/app/bootstrap/sincronizarPaletaBootstrap';
import { reportarErrorFrontend, registrarEntornoNewRelic } from '@/app/observability/newRelicBrowser';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

registrarEntornoNewRelic();

void (async (): Promise<void> => {
  /** Evita pintar pantallas públicas/login con valores del stylesheet antes de corroborar servidor. */
  await sincronizarPaletaAntesDeMontarReact(15000);

  const root = createRoot(rootElement, {
    onUncaughtError: (error, errorInfo) => {
      reportarErrorFrontend(error, {
        reactErrorType: 'uncaught',
        reactComponentStack: errorInfo.componentStack || 'no-disponible',
      });
    },
    onCaughtError: (error, errorInfo) => {
      reportarErrorFrontend(error, {
        reactErrorType: 'caught',
        reactComponentStack: errorInfo.componentStack || 'no-disponible',
      });
    },
    onRecoverableError: (error, errorInfo) => {
      reportarErrorFrontend(error, {
        reactErrorType: 'recoverable',
        reactComponentStack: errorInfo.componentStack || 'no-disponible',
      });
    },
  });

  root.render(
    <StrictMode>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <LoadingProvider>
          <App />
        </LoadingProvider>
      </ThemeProvider>
    </StrictMode>,
  );
})();
