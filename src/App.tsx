import { useState, useEffect } from 'react'
import { ThemeProvider, CssBaseline, Box } from '@mui/material'
import Dashboard from './components/Dashboard'
import TransactionModal from './components/TransactionModal'
import { GDriveSyncService } from './services/gdriveSync'
import { useSettings } from './hooks/useSettings'
import { getAppTheme } from './services/themeService'

function App() {
  const settings = useSettings();
  const theme = getAppTheme(settings?.themeMode || 'system');
  
  useEffect(() => {
    // Initialize auto-sync on startup if a valid session exists
    const syncService = GDriveSyncService.getInstance();
    if (syncService.hasCachedSession()) {
      syncService.startAutoSync();
    }

    const handleEditModal = (e: any) => {
      handleOpenModal(e.detail);
    };

    window.addEventListener('open-edit-modal', handleEditModal);
    return () => window.removeEventListener('open-edit-modal', handleEditModal);
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<any>(null);

  const handleOpenModal = (tx?: any) => {
    setEditTransaction(tx);
    setIsModalOpen(true);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh' }}>
        <Dashboard />
        <TransactionModal 
          isOpen={isModalOpen} 
          onClose={() => {
            setIsModalOpen(false);
            setEditTransaction(null);
          }} 
          editTransaction={editTransaction}
        />
      </Box>
    </ThemeProvider>
  )
}

export default App
