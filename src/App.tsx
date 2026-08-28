import { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import Dashboard from './components/Dashboard';
import TransactionModal from './components/TransactionModal/TransactionModal';
import { GDriveSyncService } from './services/gdriveSync';
import { useSettings } from './hooks/useSettings';
import { getAppTheme } from './services/themeService';
import { IosSafeAreaLayoutContainer } from './components/iOSSafeAreaLayoutContainer';
import type { Transaction } from '@/db/schema';

function App() {
  const settings = useSettings();
  const themeMode = settings?.themeMode || 'system';
  const theme = getAppTheme(themeMode);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);

  // Sync theme mode with document root class for App.css variables
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (themeMode === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(systemDark ? 'dark' : 'light');
    } else {
      root.classList.add(themeMode);
    }
  }, [themeMode]);

  // Handle Google Drive auto-sync & edit modal custom event listeners
  useEffect(() => {
    const syncService = GDriveSyncService.getInstance();
    if (syncService.hasCachedSession()) {
      syncService.startAutoSync();
    }

    const handleEditModal = (e: Event) => {
      const customEvent = e as CustomEvent<Transaction>;
      if (customEvent.detail) {
        setEditTransaction(customEvent.detail);
        setIsModalOpen(true);
      }
    };

    window.addEventListener('open-edit-modal', handleEditModal);
    return () => window.removeEventListener('open-edit-modal', handleEditModal);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <IosSafeAreaLayoutContainer>
        <Dashboard />
        <TransactionModal 
          isOpen={isModalOpen} 
          onClose={() => {
            setIsModalOpen(false);
            setEditTransaction(null);
          }} 
          editTransaction={editTransaction}
        />
      </IosSafeAreaLayoutContainer>
    </ThemeProvider>
  );
}

export default App;