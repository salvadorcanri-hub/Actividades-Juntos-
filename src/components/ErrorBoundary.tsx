import React from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught unexpected UI error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0B0F17] text-slate-100 flex items-center justify-center p-6">
          <div
            role="alert"
            className="w-full max-w-md p-6 rounded-2xl bg-[#111827] border border-slate-800 shadow-2xl text-center space-y-4"
          >
            <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h1 className="font-display text-lg font-bold text-white">
                Ocurrió un problema inesperado
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tus proyectos y tareas permanecen protegidos. Recarga la página
                para recuperar tu espacio de trabajo.
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Recargar aplicación</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
