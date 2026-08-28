import React, { useState, useEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import type { SxProps, Theme } from '@mui/material/styles';
import {
  Globe,
  Cloud,
  Upload,
  Download,
  LogOut,
  LogIn,
  Tag,
  ChevronRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useGDriveSession } from '@/hooks/useGDriveSession';

export interface SettingsTabProps {
  /** Callback to navigate to category management screen */
  onNavigateToCategories: () => void;
  /** Optional container style overrides */
  sx?: SxProps<Theme>;
}

const USERNAME_STORAGE_KEY = 'kanjoos_username';
const DEFAULT_USERNAME = 'Abhishek';

/**
 * Settings tab component supporting theme configuration, currency selection,
 * user profile edits, and Google Drive cloud backup synchronization.
 */
export const SettingsTab: React.FC<SettingsTabProps> = ({ onNavigateToCategories, sx }) => {
  const { defaultCurrency, updateDefaultCurrency } = useSettings();

  // Reactive Google Drive session state
  const {
    isConnected,
    isSyncing,
    lastSyncTime,
    error: hookError,
    isPending,
    ensureAuthenticated,
    disconnect,
    exportBackup,
    importBackup,
  } = useGDriveSession();

  // Local notification banner states
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const activeError = localError || hookError;
  const isBusy = isSyncing || isPending;

  /* ==========================================================
     PROFILE NAME STATE & LOCALSTORAGE SYNCHRONIZATION
     ========================================================== */

  const [profileName, setProfileName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(USERNAME_STORAGE_KEY) || DEFAULT_USERNAME;
    }
    return DEFAULT_USERNAME;
  });

  const [profileSavedMsg, setProfileSavedMsg] = useState<boolean>(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleProfileNameChange = useCallback((newName: string) => {
    setProfileName(newName);
    if (typeof window !== 'undefined') {
      localStorage.setItem(USERNAME_STORAGE_KEY, newName);
      window.dispatchEvent(new Event('kanjoos_username_updated'));
    }

    setProfileSavedMsg(true);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      setProfileSavedMsg(false);
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  /* ==========================================================
     CLOUD BACKUP ACTIONS & ERROR HANDLING
     ========================================================== */

  const formatErrorMessage = useCallback((err: unknown, fallbackMessage: string): string => {
    if (err instanceof Error) {
      const msg = err.message;
      if (msg.includes('Forbidden') || msg.includes('403')) {
        return 'Google Drive API is not enabled for this project. Check Cloud Console API permissions.';
      }
      if (msg.includes('Unauthorized') || msg.includes('401')) {
        return 'OAuth session expired. Please sign in again.';
      }
      return msg;
    }
    return fallbackMessage;
  }, []);

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setSyncStatus(null);
    try {
      await ensureAuthenticated();
      setSyncStatus('✓ Connected to Google Drive!');
    } catch (err: unknown) {
      setLocalError(formatErrorMessage(err, 'Failed to authenticate with Google Drive.'));
    }
  };

  const handleGoogleExport = async () => {
    setLocalError(null);
    setSyncStatus('Uploading backup to Google Drive...');
    try {
      const backupFileName = await exportBackup();
      setSyncStatus(`✓ Backup saved successfully ("Backups/${backupFileName}")!`);
    } catch (err: unknown) {
      setLocalError(formatErrorMessage(err, 'Failed to export backup to Google Drive.'));
    }
  };

  const handleGoogleImport = async () => {
    if (!window.confirm('Restoring from Google Drive will replace current local database records. Continue?')) {
      return;
    }
    setLocalError(null);
    setSyncStatus('Fetching latest backup file...');
    try {
      await importBackup();
      setSyncStatus('✓ Database restored successfully!');
    } catch (err: unknown) {
      setLocalError(formatErrorMessage(err, 'Failed to restore database from Google Drive.'));
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setSyncStatus('Google Drive disconnected.');
  };

  const handleAppleMockLogin = () => {
    window.alert('iCloud Keychain sync is coming soon!');
  };

  const formattedLastSync = lastSyncTime
    ? new Date(lastSyncTime).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, ...sx }}>
      {/* Alert Status Banners */}
      {activeError && (
        <Alert
          severity="error"
          onClose={() => setLocalError(null)}
          sx={{ borderRadius: '12px' }}
        >
          {activeError}
        </Alert>
      )}

      {syncStatus && (
        <Alert
          severity="success"
          onClose={() => setSyncStatus(null)}
          sx={{ borderRadius: '12px' }}
        >
          {syncStatus}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile & Display Settings */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: '18px',
              borderColor: 'divider',
              boxShadow: 'none',
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Profile Config
              </Typography>

              <TextField
                label="Username"
                value={profileName}
                onChange={(e) => handleProfileNameChange(e.target.value)}
                helperText={
                  profileSavedMsg
                    ? '✓ Username updated'
                    : 'Editable — saved automatically'
                }
                slotProps={{
                  formHelperText: {
                    sx: {
                      color: profileSavedMsg ? 'success.main' : 'text.secondary',
                      fontWeight: profileSavedMsg ? 600 : 400,
                    },
                  },
                }}
                fullWidth
              />

              <TextField
                select
                label="Base Currency"
                value={defaultCurrency}
                onChange={(e) => updateDefaultCurrency(e.target.value)}
                fullWidth
                slotProps={{
                  select: {
                    MenuProps: {
                      slotProps: {
                        paper: {
                          sx: {
                            '& .MuiMenuItem-root': {
                              px: { xs: 2, sm: 3 },
                            },
                          },
                        },
                      },
                    },
                  },
                }}
              >
                <MenuItem value="INR">INR (₹)</MenuItem>
                <MenuItem value="USD">USD ($)</MenuItem>
                <MenuItem value="EUR">EUR (€)</MenuItem>
                <MenuItem value="GBP">GBP (£)</MenuItem>
              </TextField>
            </CardContent>
          </Card>
        </Grid>

        {/* Navigation & Preferences */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: '18px',
              borderColor: 'divider',
              boxShadow: 'none',
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, px: 3, pt: 3, pb: 1 }}>
                Settings Menu
              </Typography>
              <List disablePadding>
                <ListItemButton
                  onClick={onNavigateToCategories}
                  sx={{ py: 2, px: 3, borderRadius: '12px', mx: 1, my: 0.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'primary.main' }}>
                    <Tag size={20} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Manage Categories"
                    secondary="Income and expense categories"
                    slotProps={{
                      primary: { sx: { fontWeight: 700 } },
                      secondary: { sx: { fontSize: '0.8rem' } },
                    }}
                  />
                  <ChevronRight size={18} />
                </ListItemButton>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Cloud Sync & Backup Section */}
        <Grid size={{ xs: 12 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: '18px',
              borderColor: 'divider',
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Sync & Backup
                </Typography>
                <Chip
                  icon={
                    isConnected ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <Globe size={16} />
                    )
                  }
                  label={isConnected ? 'Google Drive Connected' : 'Not Connected'}
                  color={isConnected ? 'success' : 'default'}
                  variant={isConnected ? 'filled' : 'outlined'}
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              </Box>

              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {isConnected
                  ? `Google Account active. Data sync enabled.${
                      formattedLastSync ? ` Last backup: ${formattedLastSync}` : ''
                    }`
                  : 'Connect Google Drive to automate cloud backups and enable restore across devices.'}
              </Typography>

              <Stack spacing={1.5} sx={{ mt: 1 }}>
                {!isConnected && (
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={isBusy}
                    startIcon={
                      isBusy ? (
                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <LogIn size={18} />
                      )
                    }
                    onClick={handleGoogleSignIn}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: '12px',
                      justifyContent: 'flex-start',
                      py: 1.2,
                    }}
                  >
                    {isBusy ? 'Connecting...' : 'Sign in with Google'}
                  </Button>
                )}

                <Button
                  variant={isConnected ? 'contained' : 'outlined'}
                  color="primary"
                  disabled={isBusy}
                  startIcon={
                    isBusy ? (
                      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Upload size={18} />
                    )
                  }
                  onClick={handleGoogleExport}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: '12px',
                    justifyContent: 'flex-start',
                    py: 1.2,
                  }}
                >
                  {isBusy ? 'Working...' : 'Backup Data to Google Drive'}
                </Button>

                <Button
                  variant="outlined"
                  color="info"
                  disabled={isBusy}
                  startIcon={
                    isBusy ? (
                      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Download size={18} />
                    )
                  }
                  onClick={handleGoogleImport}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: '12px',
                    justifyContent: 'flex-start',
                    py: 1.2,
                  }}
                >
                  Restore Latest Backup from Drive
                </Button>

                {isConnected && (
                  <Button
                    variant="text"
                    color="error"
                    disabled={isBusy}
                    startIcon={<LogOut size={18} />}
                    onClick={handleDisconnect}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: '12px',
                      justifyContent: 'flex-start',
                      py: 0.5,
                      mt: 1,
                    }}
                  >
                    Disconnect Google Account
                  </Button>
                )}

                <Divider sx={{ my: 0.5 }} />

                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<Cloud size={18} />}
                  onClick={handleAppleMockLogin}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: '12px',
                    justifyContent: 'flex-start',
                    py: 1.2,
                  }}
                >
                  Sync with iCloud Keychain
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};