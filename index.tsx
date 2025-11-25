import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ToastProvider } from './hooks/useToast';
import { DarkModeProvider } from './hooks/useDarkMode';
import { ErrorBoundary } from './components/ErrorBoundary';


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <DarkModeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </DarkModeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);