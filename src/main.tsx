import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './App.css';
import App from './App.tsx';
import { AppInitializer } from './AppInitializer';

const container = document.getElementById('root');
if (!container) throw new Error('Root container element #root not found in document.');

createRoot(container).render(
  <StrictMode>
    <AppInitializer>
      <App />
    </AppInitializer>
  </StrictMode>
);