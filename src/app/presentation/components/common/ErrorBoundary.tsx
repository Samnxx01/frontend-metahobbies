import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  redirectTo?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Captura cualquier error de renderizado en el árbol hijo.
 * Redirige automáticamente a la ruta indicada (por defecto "/").
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Error capturado:', error, info.componentStack);
  }

  componentDidUpdate(_: Props, prevState: State): void {
    if (this.state.hasError && !prevState.hasError) {
      const target = this.props.redirectTo ?? '/';
      // Pequeño delay para que el log quede registrado antes de redirigir
      setTimeout(() => {
        window.location.replace(target);
      }, 100);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return null; // No muestra nada — la redirección ocurre en componentDidUpdate
    }
    return this.props.children;
  }
}
