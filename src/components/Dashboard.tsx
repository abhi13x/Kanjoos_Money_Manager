import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useSettings } from '@/hooks/useSettings';
import { useWindowSize } from '@/hooks/useWindowSize';
import { useGDriveSession } from '@/hooks/useGDriveSession';
import { formatCurrency } from '@/types/finance';

import { SummaryTab } from './SummaryTab';
import { TransactionsTab } from './TransactionTab/TransactionTab';
import { StatsTab } from './StatsTab/StatsTab';
import { AccountsTab } from './AccountsTab/AccountsTab';
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
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import { alpha } from '@mui/material/styles';

import {
  Plus,
  LayoutDashboard,
  ArrowRightLeft,
  BarChart3,
  Wallet,
  Settings,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';

const USERNAME_STORAGE_KEY = 'kanjoos_username';

const iOSFont = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Helvetica, Arial, sans-serif',
};

export const Dashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [settingsView, setSettingsView] = useState<'main' | 'categories'>('main');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const { isMobile, isTablet } = useWindowSize();
  const [syncError, setSyncError] = useState<string | null>(null);
  const { isConnected, isSyncing, lastSyncTime } = useGDriveSession();

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

  useEffect(() => {
    const handleSyncError = (event: CustomEvent<{ message: string }>) => {
      setSyncError(event.detail.message);
    };
    window.addEventListener('kanjoos_sync_error', handleSyncError as EventListener);
    return () => {
      window.removeEventListener('kanjoos_sync_error', handleSyncError as EventListener);
    };
  }, []);

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
          bgcolor: (t) => t.palette.background.default,
        }}
      >
        <CircularProgress size={36} thickness={4.5} />
      </Box>
    );
  }

  const isDesktop = !isMobile && !isTablet;

  // Build status badge color
  const getStatusColor = () => {
    if (isSyncing) return '#FF9500'; // orange
    if (isConnected) return '#34C759'; // green
    return '#8E8E93'; // grey
  };

  const getStatusText = () => {
    if (isSyncing) return 'Syncing...';
    if (isConnected) {
      const last = lastSyncTime ? new Date(lastSyncTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'never';
      return `Last sync: ${last}`;
    }
    return 'Disconnected';
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: (t) => t.palette.background.default,
        color: (t) => t.palette.text.primary,
        ...iOSFont,
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        pb: {
          xs: 'calc(76px + env(safe-area-inset-bottom, 0px))',
          md: 'calc(88px + env(safe-area-inset-bottom, 0px))',
        },
        pt: isDesktop ? '72px' : 0,
      }}
    >
      {/* Desktop Header */}
      {isDesktop && (
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
            bgcolor: (t) => alpha(t.palette.background.paper, 0.8),
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid',
            borderColor: 'rgba(60, 60, 67, 0.08)',
          }}
        >
          <Toolbar sx={{ px: 4, height: 72, ...iOSFont }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    color: '#007AFF',
                    fontSize: 28,
                    lineHeight: 1.2,
                  }}
                >
                  KANJOOS
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#8E8E93',
                    fontWeight: 500,
                    fontSize: 15,
                    mt: -0.5,
                  }}
                >
                  Welcome back, {username}
                </Typography>
              </Box>

              {/* Drive Status Indicator with Tooltip */}
              <Tooltip title={getStatusText()} placement="bottom" arrow>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'default' }}>
                  {isSyncing ? (
                    <RefreshCw size={22} color="#FF9500" className="animate-spin" />
                  ) : (
                    <Badge
                      variant="dot"
                      color="success"
                      invisible={!isConnected}
                      sx={{
                        '& .MuiBadge-badge': {
                          backgroundColor: getStatusColor(),
                          boxShadow: `0 0 0 2px ${alpha(getStatusColor(), 0.2)}`,
                        },
                      }}
                    >
                      {isConnected ? (
                        <Cloud size={22} color="#34C759" />
                      ) : (
                        <CloudOff size={22} color="#8E8E93" />
                      )}
                    </Badge>
                  )}
                  <Typography variant="caption" sx={{ color: '#8E8E93', fontWeight: 500, fontSize: 13 }}>
                    {isSyncing ? 'Syncing' : isConnected ? 'Drive' : 'Offline'}
                  </Typography>
                </Box>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>
      )}

      {/* Mobile Header */}
      {!isDesktop && (
        <Box
          component="header"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1100,
            borderBottom: '1px solid',
            borderColor: 'rgba(60, 60, 67, 0.08)',
            bgcolor: (t) => alpha(t.palette.background.paper, 0.8),
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            pt: 'calc(12px + env(safe-area-inset-top, 0px))',
            pb: 1.5,
            ...iOSFont,
          }}
        >
          <Container
            maxWidth="lg"
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              px: 2.5,
            }}
          >
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                  color: '#007AFF',
                  fontSize: 24,
                  lineHeight: 1.2,
                }}
              >
                KANJOOS
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#8E8E93',
                  fontWeight: 500,
                  fontSize: 13,
                  display: 'block',
                  mt: -0.5,
                }}
              >
                Welcome back, {username}
              </Typography>
            </Box>

            <Tooltip title={getStatusText()} placement="bottom" arrow>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {isSyncing ? (
                  <RefreshCw size={20} color="#FF9500" className="animate-spin" />
                ) : (
                  <Badge
                    variant="dot"
                    color="success"
                    invisible={!isConnected}
                    sx={{
                      '& .MuiBadge-badge': {
                        backgroundColor: getStatusColor(),
                        boxShadow: `0 0 0 2px ${alpha(getStatusColor(), 0.2)}`,
                      },
                    }}
                  >
                    {isConnected ? (
                      <Cloud size={20} color="#34C759" />
                    ) : (
                      <CloudOff size={20} color="#8E8E93" />
                    )}
                  </Badge>
                )}
                <Typography variant="caption" sx={{ color: '#8E8E93', fontWeight: 500, fontSize: 11 }}>
                  {isSyncing ? 'Syncing' : isConnected ? 'Drive' : 'Offline'}
                </Typography>
              </Box>
            </Tooltip>
          </Container>
        </Box>
      )}

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: isDesktop ? 4 : 2.5, px: { xs: 2, sm: 3 } }}>
        {currentTab === 0 && (
          <SummaryTab accounts={accounts} transactions={transactions} format={formatAmount} />
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
          <StatsTab transactions={transactions} categories={categories} format={formatAmount} />
        )}
        {currentTab === 3 && <AccountsTab accounts={accounts} format={formatAmount} />}
        {currentTab === 4 && (
          <>
            <Box sx={{ display: settingsView === 'categories' ? 'block' : 'none' }}>
              <CategoriesTab categories={categories} onBack={() => setSettingsView('main')} />
            </Box>
            <Box sx={{ display: settingsView === 'main' ? 'block' : 'none' }}>
              <SettingsTab onNavigateToCategories={() => setSettingsView('categories')} />
            </Box>
          </>
        )}
      </Container>

      {/* Bottom Navigation */}
      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          borderTop: '1px solid',
          borderColor: 'rgba(60, 60, 67, 0.08)',
          borderRadius: 0,
          bgcolor: (t) => alpha(t.palette.background.paper, 0.85),
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          pb: 'env(safe-area-inset-bottom, 0px)',
          ...iOSFont,
        }}
      >
        <BottomNavigation
          showLabels
          value={currentTab}
          onChange={(_e, val) => {
            setCurrentTab(val);
            if (val === 4) setSettingsView('main');
          }}
          sx={{
            height: 60,
            bgcolor: 'transparent',
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              py: 0.75,
              color: '#8E8E93',
              transition: 'color 0.15s ease-in-out',
              '& .MuiBottomNavigationAction-label': {
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '-0.01em',
                mt: 0.25,
                '&.Mui-selected': {
                  fontSize: 11,
                  fontWeight: 700,
                },
              },
              '&.Mui-selected': {
                color: '#007AFF',
              },
            },
          }}
        >
          <BottomNavigationAction label="Summary" icon={<LayoutDashboard size={20} strokeWidth={2.2} />} />
          <BottomNavigationAction label="Transactions" icon={<ArrowRightLeft size={20} strokeWidth={2.2} />} />
          <BottomNavigationAction label="Stats" icon={<BarChart3 size={20} strokeWidth={2.2} />} />
          <BottomNavigationAction label="Accounts" icon={<Wallet size={20} strokeWidth={2.2} />} />
          <BottomNavigationAction label="Settings" icon={<Settings size={20} strokeWidth={2.2} />} />
        </BottomNavigation>
      </Paper>

      {/* FAB */}
      {(currentTab === 0 || currentTab === 1) && (
        <Fab
          color="primary"
          aria-label="add transaction"
          onClick={() => setIsModalOpen(true)}
          sx={{
            position: 'fixed',
            right: { xs: 20, sm: 28 },
            bottom: {
              xs: 'calc(76px + env(safe-area-inset-bottom, 0px))',
              sm: 'calc(84px + env(safe-area-inset-bottom, 0px))',
            },
            boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.22)',
            zIndex: 1050,
            bgcolor: '#007AFF',
            '&:active': { transform: 'scale(0.95)' },
            transition: 'transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
          }}
        >
          <Plus size={24} strokeWidth={2.5} />
        </Fab>
      )}

      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Sync Error Snackbar */}
      <Snackbar
        open={!!syncError}
        autoHideDuration={6000}
        onClose={() => setSyncError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSyncError(null)}
          severity="error"
          variant="filled"
          sx={{
            width: '100%',
            borderRadius: 14,
            ...iOSFont,
          }}
        >
          {syncError}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;