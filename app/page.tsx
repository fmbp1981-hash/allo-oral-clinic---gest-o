'use client';

import dynamic from 'next/dynamic';
import { ToastProvider } from '../hooks/useToast';
import { DarkModeProvider } from '../hooks/useDarkMode';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Dynamically import the App component with SSR disabled
const App = dynamic(() => import('../App'), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )
});

export default function HomePage() {
  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <DarkModeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </DarkModeProvider>
    </ErrorBoundary>
  );
}
