import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useSettings } from '@/hooks/useSettings';
import { formatCurrency } from '@/types/finance';

// Tabs Components Imports
import { SummaryTab } from './SummaryTab';
import { TransactionsTab } from './TransactionTab';
import { StatsTab } from './StatsTab';
import { AccountsTab } from './AccountsTab';
import { SettingsTab } from './SettingsTab';
import { CategoriesTab } from './CategoriesTab';
import TransactionModal from './TransactionModal';

import { 
  Box, Typography, Button, Menu, MenuItem, 
  CircularProgress, Container, Paper, 
  BottomNavigation, BottomNavigationAction, Fab 
} from '@mui/material';
import { 
  Plus, Settings, LayoutDashboard, ArrowRightLeft, BarChart3, Wallet 
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [settingsView, setSettingsView] = useState<'main' | 'categories'>('main');
  const [settingsMounted, setSettingsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Data queries
  const { defaultCurrency, updateDefaultCurrency } = useSettings();
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];

  const formatAmount = (cents: number) => formatCurrency(cents, defaultCurrency);
  const isLoading = !accounts || !categories || !transactions;

  useEffect(() => {
    if (currentTab === 4) setSettingsMounted(true);
  }, [currentTab]);

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
        pb: { xs: '84px', md: '24px' } // Padding to prevent mobile bottom-nav overlap
      }}
    >
      
      {/* Top Banner Navigation Header */}
      <Box component="header" sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', py: 2 }}>
        <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '-0.05em', color: 'primary.main' }}>
              KANJOOS
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Welcome back, Abhishek
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              onClick={(e) => setAnchorEl(e.currentTarget)}
              variant="outlined"
              startIcon={<Settings size={16} />}
              sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}
            >
              {defaultCurrency}
            </Button>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              {['INR', 'USD', 'EUR', 'GBP'].map((curr) => (
                <MenuItem key={curr} onClick={() => { updateDefaultCurrency(curr); setAnchorEl(null); }}>
                  {curr}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Container>
      </Box>

      {/* Main Container Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {currentTab === 0 && <SummaryTab accounts={accounts} transactions={transactions} format={formatAmount} />}
        {currentTab === 1 && <TransactionsTab transactions={transactions} accounts={accounts} categories={categories} format={formatAmount} />}
        {currentTab === 2 && <StatsTab transactions={transactions} categories={categories} format={formatAmount} />}
        {currentTab === 3 && <AccountsTab accounts={accounts} format={formatAmount} />}

        {settingsMounted && (
          <>
            <Box sx={{ display: currentTab === 4 && settingsView === 'categories' ? 'block' : 'none' }}>
              <CategoriesTab
                categories={categories}
                onBack={() => setSettingsView('main')}
              />
            </Box>
            <Box sx={{ display: currentTab === 4 && settingsView === 'main' ? 'block' : 'none' }}>
              <SettingsTab onNavigateToCategories={() => setSettingsView('categories')} />
            </Box>
          </>
        )}
      </Container>

      {/* FAB - Floating action button on Left Bottom Side */}
      {/* Rendered conditionally ONLY on Summary (Tab 0) and Transactions (Tab 1) */}
      {(currentTab === 0 || currentTab === 1) && (
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => setIsModalOpen(true)}
          sx={{
            position: 'fixed',
            right: 24,
            bottom: { xs: 88, md: 24 }, // Responsive adjustments to clear bottom nav
            boxShadow: 4,
          }}
        >
          <Plus size={24} />
        </Fab>
      )}

      {/* Global Transaction Modal Layover */}
      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Sticky Bottom Navigation Bar */}
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

    </Box>
  );
};

export default Dashboard;