import { useState, useEffect, type ReactNode } from 'react';
import { db } from './db/schema';

// Wrapper component to handle async DB seeding cleanly before rendering the app
export function AppInitializer({ children }: { children: ReactNode }) {
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
