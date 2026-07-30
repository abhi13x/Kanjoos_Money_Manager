import { useState, useEffect } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
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
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="app-container">
        <Dashboard />
        <TransactionModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      </div>
    </ThemeProvider>
  )
}

export default App
