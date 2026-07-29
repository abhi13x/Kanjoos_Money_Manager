import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography,
  Grid, TextField, Button, MenuItem, Alert, Stack,
  List, ListItemButton, ListItemIcon, ListItemText, Divider, Chip,
} from '@mui/material';
import { Globe, Cloud, Upload, Download, LogOut, LogIn, Tag, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useGDriveSession } from '@/hooks/useGDriveSession';
import { GDriveSyncService } from '@/services/gdriveSync';

interface SettingsTabProps {
  onNavigateToCategories: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onNavigateToCategories }) => {
  const { defaultCurrency, updateDefaultCurrency } = useSettings();
  const gDriveSession = useGDriveSession();

  // Extract from hook with fallback to direct service calls
  const { isConnected, disconnect, exportBackup, importBackup } = gDriveSession;
  const connect = (gDriveSession as any).connect;
  const lastSyncTime = (gDriveSession as any).lastSyncTime;

  const USERNAME_STORAGE_KEY = 'kanjoos_username';
  const [profileName, setProfileName] = useState<string>(() => {
    return localStorage.getItem(USERNAME_STORAGE_KEY) || 'Abhishek Bhatnagar';
  });
  const [profileSavedMsg, setProfileSavedMsg] = useState<boolean>(false);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleProfileNameChange = (newName: string) => {
    setProfileName(newName);
    localStorage.setItem(USERNAME_STORAGE_KEY, newName);
    setProfileSavedMsg(true);
    setTimeout(() => setProfileSavedMsg(false), 2000);
  };

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
      const message = err instanceof Error ? err.message : 'Failed to sign in with Google.';
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
      const message = err instanceof Error ? err.message : 'Failed to sync with Google Drive.';
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
      window.location.reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to restore backup from Google Drive.';
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
                  ? `Your Google account is active. Session persists across app restarts.${
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
                      justify: 'flex-start',
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
                    justify: 'flex-start',
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
                    justify: 'flex-start',
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
                      justify: 'flex-start',
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
                    justify: 'flex-start',
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