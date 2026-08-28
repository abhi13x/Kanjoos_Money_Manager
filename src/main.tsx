import { StrictMode, useState, useEffect, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './App.css';
import App from './App.tsx';
import { db } from './db/schema';

// App Initializer Wrapper component to handle async DB seeding cleanly
function AppInitializer({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await db.seedDefaultCategories();
        if (mounted) setIsReady(true);
      } catch (err) {
        console.error('Failed to initialize application database:', err);
        if (mounted) setError(err instanceof Error ? err : new Error('Unknown initialization error'));
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <div role="alert" className="init-error-container">
        <h2>Initialization Error</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="init-loader-container">
        <div className="spinner" aria-label="Loading application..." />
      </div>
    );
  }

  return <>{children}</>;
}

const container = document.getElementById('root');
if (!container) throw new Error('Root container element #root not found in document.');

createRoot(container).render(
  <StrictMode>
    <AppInitializer>
      <App />
    </AppInitializer>
  </StrictMode>
);