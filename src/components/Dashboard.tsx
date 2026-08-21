import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useSettings } from '@/hooks/useSettings';
import { useWindowSize } from '@/hooks/useWindowSize';
import { formatCurrency } from '@/types/finance';

// Tabs Components Imports
import { SummaryTab } from './SummaryTab';
import { TransactionsTab } from './TransactionTab';
import { StatsTab } from './StatsTab/StatsTab';
import { AccountsTab } from './AccountsTab';
import { SettingsTab } from './SettingsTab';
import { CategoriesTab } from './CategoriesTab';
import TransactionModal from './TransactionModal';

import { 
  Box, Typography, 
  CircularProgress, Container, Paper, 
  BottomNavigation, BottomNavigationAction, Fab,
  AppBar, Toolbar, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import { 
  Plus, LayoutDashboard, ArrowRightLeft, BarChart3, Wallet, Settings
} from 'lucide-react';

const USERNAME_STORAGE_KEY = 'kanjoos_username';

export const Dashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [settingsView, setSettingsView] = useState<'main' | 'categories'>('main');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isMobile, isTablet } = useWindowSize();

  // Dynamic state listener for reactive username updating
  const [username, setUsername] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(USERNAME_STORAGE_KEY) || 'Abhishek';
    }
    return 'Abhishek';
  });

  useEffect(() => {
    const handleUsernameSync = () => {
      const stored = localStorage.getItem(USERNAME_STORAGE_KEY);
      if (stored) setUsername(stored);
    };

    window.addEventListener('kanjoos_username_updated', handleUsernameSync);
    window.addEventListener('storage', handleUsernameSync);

    return () => {
      window.removeEventListener('kanjoos_username_updated', handleUsernameSync);
      window.removeEventListener('storage', handleUsernameSync);
    };
  }, []);

  // Data queries
  const { defaultCurrency } = useSettings();
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];

  const formatAmount = (cents: number) => formatCurrency(cents, defaultCurrency);
  const isLoading = !accounts || !categories || !transactions;

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        bgcolor: 'background.default', 
        color: 'text.primary',
        transition: 'background-color 0.2s, color 0.2s',
        // Dynamic padding based on device to prevent overlap with navigation
        pb: isMobile ? '84px' : isTablet ? '64px' : '24px'
      }}
    >
      
      {/* Responsive Header - AppBar for desktop/tablet, integrated for mobile */}
      {!isMobile && (
        <AppBar position="fixed" sx={{ top: 0, left: 0, right: 0, zIndex: 1100, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Toolbar sx={{ px: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '-0.05em', color: 'primary.main' }}>
                  KANJOOS
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Welcome back, {username}
                </Typography>
              </Box>
              
              {/* Desktop/Tablet Navigation */}
              <ToggleButtonGroup
      exclusive
      value={currentTab}
      onChange={(_, newValue) => {
        setCurrentTab(newValue);
        if (newValue === 4) {
          setSettingsView('main');
        }
      }}
      sx={{ display: 'flex', alignItems: 'center', gap: 3 }}
    >
      <ToggleButton
        value={0}
        sx={{ px: 2, py: 1, borderRadius: '12px' }}
      >
        Summary
      </ToggleButton>
      <ToggleButton
        value={1}
        sx={{ px: 2, py: 1, borderRadius: '12px' }}
      >
        Transactions
      </ToggleButton>
      <ToggleButton
        value={2}
        sx={{ px: 2, py: 1, borderRadius: '12px' }}
      >
        Stats
      </ToggleButton>
      <ToggleButton
        value={3}
        sx={{ px: 2, py: 1, borderRadius: '12px' }}
      >
        Accounts
      </ToggleButton>
      <ToggleButton
        value={4}
        sx={{ px: 2, py: 1, borderRadius: '12px' }}
      >
        Settings
      </ToggleButton>
    </ToggleButtonGroup>
            </Box>
          </Toolbar>
        </AppBar>
      )}

      {/* Mobile Header - Integrated in main content */}
      {isMobile && (
        <Box component="header" sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', py: 2 }}>
          <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '-0.05em', color: 'primary.main' }}>
                KANJOOS
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Welcome back, {username}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Mobile menu button could go here if needed */}
            </Box>
          </Container>
        </Box>
      )}

      {/* Main Container Content */}
      <Container maxWidth="lg" sx={{ py: isMobile ? 4 : 6 }}>
        {currentTab === 0 && <SummaryTab accounts={accounts} transactions={transactions} format={formatAmount} />}
        {currentTab === 1 && <TransactionsTab transactions={transactions} accounts={accounts} categories={categories} format={formatAmount} />}
        {currentTab === 2 && <StatsTab transactions={transactions} categories={categories} format={formatAmount} />}
        {currentTab === 3 && <AccountsTab accounts={accounts} format={formatAmount} />}

        {currentTab === 4 && (
          <>
            <Box sx={{ display: settingsView === 'categories' ? 'block' : 'none' }}>
              <CategoriesTab
                categories={categories}
                onBack={() => setSettingsView('main')}
              />
            </Box>
            <Box sx={{ display: settingsView === 'main' ? 'block' : 'none' }}>
              <SettingsTab onNavigateToCategories={() => setSettingsView('categories')} />
            </Box>
          </>
        )}
      </Container>

      {/* FAB - Floating action button - only on mobile for tabs that need it */}
      {isMobile && (currentTab === 0 || currentTab === 1) && (
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => setIsModalOpen(true)}
          sx={{
            position: 'fixed',
            right: 24,
            bottom: 20,
            boxShadow: 4,
          }}
        >
          <Plus size={24} />
        </Fab>
      )}

      {/* Global Transaction Modal Layover */}
      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Responsive Navigation - Bottom for mobile, hidden for desktop/tablet (using AppBar above) */}
      {isMobile && (
        <Paper 
          elevation={4} 
          sx={{ 
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
            borderTop: '1px solid', borderColor: 'divider', borderRadius: 0
          }}
        >
          <BottomNavigation
            showLabels
            value={currentTab}
            onChange={(_e, val) => {
              setCurrentTab(val);
              if (val !== 4) setSettingsView('main');
            }}
            sx={{ height: '64px', bgcolor: 'background.paper' }}
          >
            <BottomNavigationAction label="Summary" icon={<LayoutDashboard size={20} />} />
            <BottomNavigationAction label="Transactions" icon={<ArrowRightLeft size={20} />} />
            <BottomNavigationAction label="Stats" icon={<BarChart3 size={20} />} />
            <BottomNavigationAction label="Accounts" icon={<Wallet size={20} />} />
            <BottomNavigationAction label="Settings" icon={<Settings size={20} />} />
          </BottomNavigation>
        </Paper>
      )}
      
      {/* Desktop/Tablet FAB - positioned differently */}
      {!isMobile && (currentTab === 0 || currentTab === 1) && (
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => setIsModalOpen(true)}
          sx={{
            position: 'fixed',
            right: 24,
            bottom: isTablet ? 80 : 24,
            boxShadow: 4,
          }}
        >
          <Plus size={24} />
        </Fab>
      )}

    </Box>
  );
};

export default Dashboard;