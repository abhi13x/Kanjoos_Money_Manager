import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Card, CardContent, Typography,
  Grid, TextField, Button, MenuItem, Alert, Stack,
  List, ListItemButton, ListItemIcon, ListItemText, Chip,
  Divider,
} from '@mui/material';
import {
  Globe, Cloud, Upload, Download, LogOut,
  LogIn, Tag, ChevronRight, CheckCircle2
} from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useGDriveSession } from '@/hooks/useGDriveSession';
import { GDriveSyncService } from '@/services/gdriveSync';

interface SettingsTabProps {
  onNavigateToCategories: () => void;
}

const USERNAME_STORAGE_KEY = 'kanjoos_username';

export const SettingsTab: React.FC<SettingsTabProps> = ({ onNavigateToCategories }) => {
  const { defaultCurrency, updateDefaultCurrency, themeMode, updateThemeMode } = useSettings();
  const gDriveSession = useGDriveSession();

  // Extract from hook with fallback to direct service calls
  const { isConnected, disconnect, exportBackup, importBackup } = gDriveSession;
  const connect = (gDriveSession as any).connect;

  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  useEffect(() => {
    const syncService = GDriveSyncService.getInstance();
    const unsubscribe = syncService.subscribe((status) => {
      setLastSyncTime(status.lastSyncTime);
    });
    return () => unsubscribe();
  }, []);

  // Username State with Timer Ref and Event Dispatch
  const [profileName, setProfileName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(USERNAME_STORAGE_KEY) || 'Abhishek';
    }
    return 'Abhishek';
  });
  const [profileSavedMsg, setProfileSavedMsg] = useState<boolean>(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleProfileNameChange = (newName: string) => {
    setProfileName(newName);
    localStorage.setItem(USERNAME_STORAGE_KEY, newName);
    
    // Dispatch event to inform Dashboard instantly
    window.dispatchEvent(new Event('kanjoos_username_updated'));

    setProfileSavedMsg(true);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      setProfileSavedMsg(false);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncStatus(null);

    try {
      if (typeof connect === 'function') {
        await connect();
      } else {
        await GDriveSyncService.getInstance().authenticate();
      }
      setSyncStatus('✓ Successfully signed in to Google Drive!');
    } catch (err: unknown) {
      let message = 'Failed to sign in with Google.';
      if (err instanceof Error) {
        message = err.message;
        if (message.includes('Forbidden') || message.includes('403')) {
          message = 'Google Drive API is not enabled. Please check your project settings.';
        } else if (message.includes('Unauthorized') || message.includes('401')) {
          message = 'Session expired. Please try signing in again.';
        }
      }
      setSyncError(message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleExport = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncStatus(null);

    try {
      setSyncStatus('Uploading backup to Google Drive...');
      const backupFileName = await exportBackup();
      setSyncStatus(`✓ Backup saved to Google Drive ("Backups/${backupFileName}")!`);
    } catch (err: unknown) {
      let message = 'Failed to sync with Google Drive.';
      if (err instanceof Error) {
        message = err.message;
        if (message.includes('Forbidden') || message.includes('403')) {
          message = 'Google Drive API is not enabled. Please check your project settings.';
        } else if (message.includes('Unauthorized') || message.includes('401')) {
          message = 'Session expired. Please try signing in again.';
        }
      }
      setSyncError(message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleImport = async () => {
    if (!confirm('Restoring from Google Drive will overwrite your local database with the latest backup. Continue?')) {
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncStatus(null);

    try {
      setSyncStatus('Fetching latest backup from Google Drive...');
      await importBackup();
      setSyncStatus('✓ Local database restored successfully!');
    } catch (err: unknown) {
      let message = 'Failed to restore backup from Google Drive.';
      if (err instanceof Error) {
        message = err.message;
        if (message.includes('Forbidden') || message.includes('403')) {
          message = 'Google Drive API is not enabled. Please check your project settings.';
        } else if (message.includes('Unauthorized') || message.includes('401')) {
          message = 'Session expired. Please try signing in again.';
        }
      }
      setSyncError(message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setSyncStatus('Disconnected Google account.');
  };

  const handleAppleMockLogin = () => {
    alert('iCloud Keychain sync coming soon!');
  };

  const formattedLastSync = lastSyncTime
    ? new Date(lastSyncTime).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {syncError && (
        <Alert severity="error" onClose={() => setSyncError(null)} sx={{ borderRadius: '12px' }}>
          {syncError}
        </Alert>
      )}
      {syncStatus && (
        <Alert severity="success" onClose={() => setSyncStatus(null)} sx={{ borderRadius: '12px' }}>
          {syncStatus}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Configuration */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Profile Config</Typography>

              <TextField
                label="Username"
                value={profileName}
                onChange={(e) => handleProfileNameChange(e.target.value)}
                helperText={profileSavedMsg ? '✓ Username updated' : 'Editable — updates saved automatically'}
                slotProps={{
                  formHelperText: { sx: { color: profileSavedMsg ? 'success.main' : 'text.secondary' } },
                }}
                fullWidth
              />

              <TextField
                select
                label="Base Currency"
                value={defaultCurrency}
                onChange={(e) => updateDefaultCurrency(e.target.value)}
                fullWidth
              >
                <MenuItem value="INR">INR (₹)</MenuItem>
                <MenuItem value="USD">USD ($)</MenuItem>
                <MenuItem value="EUR">EUR (€)</MenuItem>
                <MenuItem value="GBP">GBP (£)</MenuItem>
              </TextField>

              <TextField
                select
                label="Theme Mode"
                value={themeMode}
                onChange={(e) => updateThemeMode(e.target.value as any)}
                fullWidth
              >
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
                <MenuItem value="system">System</MenuItem>
              </TextField>
            </CardContent>
          </Card>
        </Grid>

        {/* Settings Navigation Menu */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <CardContent sx={{ p: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, px: 3, pt: 3, pb: 1 }}>Settings Menu</Typography>
              <List disablePadding>
                <ListItemButton onClick={onNavigateToCategories} sx={{ py: 2, px: 3 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
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

        {/* Sync & Cloud Backup Section */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Sync & Backup</Typography>
                <Chip
                  icon={isConnected ? <CheckCircle2 size={16} /> : <Globe size={16} />}
                  label={isConnected ? 'Google Drive Connected' : 'Not Connected'}
                  color={isConnected ? 'success' : 'default'}
                  variant={isConnected ? 'filled' : 'outlined'}
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              </Box>

              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {isConnected
                  ? `Your Google account is active. Automatic sync is enabled. Session persists across app restarts.${
                      formattedLastSync ? ` Last backup: ${formattedLastSync}` : ''
                    }`
                  : 'Sign in with your Google Account to enable automatic cloud backups and restore data across devices.'}
              </Typography>

              <Stack spacing={1.5} sx={{ mt: 1 }}>
                {/* Sign In Button (Visible when not connected) */}
                {!isConnected && (
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={isSyncing}
                    startIcon={<LogIn size={18} />}
                    onClick={handleGoogleSignIn}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: '12px',
                      justifyContent: 'flex-start',
                      py: 1.2,
                    }}
                  >
                    {isSyncing ? 'Connecting...' : 'Sign in with Google'}
                  </Button>
                )}

                {/* Backup & Export Button */}
                <Button
                  variant={isConnected ? 'contained' : 'outlined'}
                  color="primary"
                  disabled={isSyncing}
                  startIcon={isSyncing ? <Globe size={18} /> : <Upload size={18} />}
                  onClick={handleGoogleExport}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: '12px',
                    justifyContent: 'flex-start',
                    py: 1.2,
                  }}
                >
                  {isSyncing ? 'Working...' : 'Backup Data to Google Drive'}
                </Button>

                {/* Restore & Import Button */}
                <Button
                  variant="outlined"
                  color="info"
                  disabled={isSyncing}
                  startIcon={<Download size={18} />}
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

                {/* Disconnect Option (Visible when connected) */}
                {isConnected && (
                  <Button
                    variant="text"
                    color="error"
                    disabled={isSyncing}
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

                {/* iCloud Mock Button */}
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