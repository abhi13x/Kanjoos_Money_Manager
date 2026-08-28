import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useSettings } from '@/hooks/useSettings';
import { useWindowSize } from '@/hooks/useWindowSize';
import { formatCurrency } from '@/types/finance';

// Tabs Components Imports
import { SummaryTab } from './SummaryTab';
import { TransactionsTab } from './TransactionTab/TransactionTab';
import { StatsTab } from './StatsTab/StatsTab';
import { AccountsTab } from './AccountsTab';
import { SettingsTab } from './SettingsTab';
import { CategoriesTab } from './CategoriesTab/CategoriesTab';
import TransactionModal from './TransactionModal/TransactionModal';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Fab from '@mui/material/Fab';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';

import {
  Plus,
  LayoutDashboard,
  ArrowRightLeft,
  BarChart3,
  Wallet,
  Settings,
} from 'lucide-react';

const USERNAME_STORAGE_KEY = 'kanjoos_username';

export const Dashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [settingsView, setSettingsView] = useState<'main' | 'categories'>('main');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
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
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={40} />
      </Box>
    );
  }

  const isDesktop = !isMobile && !isTablet;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary',
        transition: 'background-color 0.2s, color 0.2s',
        // Bottom padding handles fixed navigation bar + iOS Home Indicator safe area
        pb: {
          xs: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          md: 'calc(90px + env(safe-area-inset-bottom, 0px))',
        },
        // Top padding offset for desktop fixed AppBar
        pt: isDesktop ? '72px' : 0,
      }}
    >
      {/* Desktop Header - Fixed AppBar */}
      {isDesktop && (
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ px: 4, height: 72 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 900,
                    letterSpacing: '-0.05em',
                    color: 'primary.main',
                  }}
                >
                  KANJOOS
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Welcome back, {username}
                </Typography>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>
      )}

      {/* Mobile/iOS Header - Integrated header with iOS Dynamic Island/Notch safe areas */}
      {!isDesktop && (
        <Box
          component="header"
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            // Accommodate iOS status bar / Dynamic island safe areas
            pt: 'calc(16px + env(safe-area-inset-top, 0px))',
            pb: 2,
          }}
        >
          <Container
            maxWidth="lg"
            sx={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 900,
                  letterSpacing: '-0.05em',
                  color: 'primary.main',
                }}
              >
                KANJOOS
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Welcome back, {username}
              </Typography>
            </Box>
          </Container>
        </Box>
      )}

      {/* Main Tab Content */}
      <Container maxWidth="lg" sx={{ py: isDesktop ? 5 : 3 }}>
        {currentTab === 0 && (
          <SummaryTab
            accounts={accounts}
            transactions={transactions}
            format={formatAmount}
          />
        )}
        {currentTab === 1 && (
          <TransactionsTab
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            format={formatAmount}
          />
        )}
        {currentTab === 2 && (
          <StatsTab
            transactions={transactions}
            categories={categories}
            format={formatAmount}
          />
        )}
        {currentTab === 3 && (
          <AccountsTab accounts={accounts} format={formatAmount} />
        )}

        {currentTab === 4 && (
          <>
            <Box sx={{ display: settingsView === 'categories' ? 'block' : 'none' }}>
              <CategoriesTab
                categories={categories}
                onBack={() => setSettingsView('main')}
              />
            </Box>
            <Box sx={{ display: settingsView === 'main' ? 'block' : 'none' }}>
              <SettingsTab
                onNavigateToCategories={() => setSettingsView('categories')}
              />
            </Box>
          </>
        )}
      </Container>

      {/* Bottom Navigation Bar - Fixed with iOS safe area padding */}
      <Paper
        elevation={4}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          borderTop: '1px solid',
          borderColor: 'divider',
          borderRadius: 0,
          bgcolor: 'background.paper',
          // Key iOS Safe Area fix for home indicator swipe bar
          pb: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <BottomNavigation
          showLabels
          value={currentTab}
          onChange={(_e, val) => {
            setCurrentTab(val);
            if (val === 4) {
              setSettingsView('main');
            }
          }}
          sx={{
            height: 64,
            bgcolor: 'background.paper',
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              py: 1,
              '&.Mui-selected': {
                color: 'primary.main',
              },
            },
          }}
        >
          <BottomNavigationAction label="Summary" icon={<LayoutDashboard size={20} />} />
          <BottomNavigationAction label="Transactions" icon={<ArrowRightLeft size={20} />} />
          <BottomNavigationAction label="Stats" icon={<BarChart3 size={20} />} />
          <BottomNavigationAction label="Accounts" icon={<Wallet size={20} />} />
          <BottomNavigationAction label="Settings" icon={<Settings size={20} />} />
        </BottomNavigation>
      </Paper>

      {/* Floating Action Button (FAB) - Positioned dynamically above navigation bar & iOS safe area */}
      {(currentTab === 0 || currentTab === 1) && (
        <Fab
          color="primary"
          aria-label="add transaction"
          onClick={() => setIsModalOpen(true)}
          sx={{
            position: 'fixed',
            right: { xs: 16, sm: 24, md: 32 },
            bottom: {
              xs: 'calc(76px + env(safe-area-inset-bottom, 0px))',
              sm: 'calc(84px + env(safe-area-inset-bottom, 0px))',
            },
            boxShadow: 4,
            zIndex: 1050,
          }}
        >
          <Plus size={24} />
        </Fab>
      )}

      {/* Global Transaction Modal Layover */}
      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </Box>
  );
};

export default Dashboard;