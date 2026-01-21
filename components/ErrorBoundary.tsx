import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * Logs errors and displays a fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }

    // Log to external service (Sentry, etc) in production
    this.logErrorToService(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });
  }

  logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // TODO: Integrate with Sentry or other error tracking service
    // Example:
    // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });

    // For now, just log to console in production
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
      console.error('Production Error:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
          showDetails={this.props.showDetails}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Error Fallback UI Component
 * Displays a user-friendly error message with recovery options
 */
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
  onReload: () => void;
  onGoHome: () => void;
  showDetails?: boolean;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  onReset,
  onReload,
  onGoHome,
  showDetails = false,
}) => {
  const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        {/* Icon and Title */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Ops! Algo deu errado
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Ocorreu um erro inesperado na aplicação
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm font-mono text-red-800 dark:text-red-300">
              {error.message || 'Unknown error'}
            </p>
          </div>
        )}

        {/* Description */}
        <div className="mb-6 space-y-2">
          <p className="text-gray-700 dark:text-gray-300">
            Não se preocupe, seus dados estão seguros. Você pode tentar:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 text-sm">
            <li>Tentar novamente (às vezes é só um problema temporário)</li>
            <li>Recarregar a página</li>
            <li>Voltar para a página inicial</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            <RefreshCw size={18} />
            Tentar Novamente
          </button>
          <button
            onClick={onReload}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            <RefreshCw size={18} />
            Recarregar Página
          </button>
          <button
            onClick={onGoHome}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
          >
            <Home size={18} />
            Página Inicial
          </button>
        </div>

        {/* Technical Details (Development or showDetails) */}
        {(isDevelopment || showDetails) && errorInfo && (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              Detalhes Técnicos (para desenvolvedores)
            </summary>
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-auto">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Error Stack:
                </h3>
                <pre className="text-xs text-gray-600 dark:text-gray-400 font-mono whitespace-pre-wrap">
                  {error?.stack}
                </pre>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Component Stack:
                </h3>
                <pre className="text-xs text-gray-600 dark:text-gray-400 font-mono whitespace-pre-wrap">
                  {errorInfo.componentStack}
                </pre>
              </div>
            </div>
          </details>
        )}

        {/* Help Text */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Se o erro persistir, entre em contato com o suporte técnico informando o que você estava fazendo quando o erro ocorreu.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Utility component for catching async errors in specific sections
 */
interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
}

export const AsyncErrorBoundary: React.FC<AsyncErrorBoundaryProps> = ({
  children,
  fallbackMessage = 'Falha ao carregar este conteúdo',
}) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-yellow-800 dark:text-yellow-300 font-medium">
              {fallbackMessage}
            </p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * Hook to manually trigger error boundary
 * Useful for catching async errors
 */
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
};
