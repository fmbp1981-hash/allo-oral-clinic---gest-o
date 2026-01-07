'use client';

import dynamic from 'next/dynamic';

// Dynamically import the entire app with SSR disabled
// This prevents localStorage and other browser APIs from being called during build
const ClientApp = dynamic(
  () => import('../App').then((mod) => {
    // Also need to import providers
    const { ToastProvider } = require('../hooks/useToast');
    const { DarkModeProvider } = require('../hooks/useDarkMode');
    const { ErrorBoundary } = require('../components/ErrorBoundary');
    
    const App = mod.default;
    
    // Return a wrapper component
    return function AppWithProviders() {
      return (
        <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
          <DarkModeProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </DarkModeProvider>
        </ErrorBoundary>
      );
    };
  }),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }
);

export default function HomePage() {
  return <ClientApp />;
}
