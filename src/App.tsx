import { useState } from 'react'
import Dashboard from './components/Dashboard'
import TransactionModal from './components/TransactionModal'
import { GDriveSyncService } from './services/gdriveSync'

function App() {
  useState(() => {
    // Initialize auto-sync on startup if a valid session exists
    const syncService = GDriveSyncService.getInstance();
    if (syncService.hasCachedSession()) {
      syncService.startAutoSync();
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="app-container">
      <Dashboard />
      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  )
}

export default App
