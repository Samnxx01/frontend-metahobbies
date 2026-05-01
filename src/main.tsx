import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import LoadingProvider from './app/providers/LoadingProvider.jsx';
import { ThemeProvider } from 'next-themes';
import { sincronizarPaletaAntesDeMontarReact } from '@/app/bootstrap/sincronizarPaletaBootstrap';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

void (async (): Promise<void> => {
  /** Evita pintar pantallas públicas/login con valores del stylesheet antes de corroborar servidor. */
  await sincronizarPaletaAntesDeMontarReact(15000);

  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <LoadingProvider>
          <App />
        </LoadingProvider>
      </ThemeProvider>
    </StrictMode>,
  );
})();
