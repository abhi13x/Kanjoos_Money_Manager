import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography,
  Grid, TextField, Button, MenuItem, Alert, Stack,
  List, ListItemButton, ListItemIcon, ListItemText, Divider,
} from '@mui/material';
import { Globe, Cloud, Upload, Download, LogOut, Tag, ChevronRight } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useGDriveSession } from '@/hooks/useGDriveSession';

interface SettingsTabProps {
  onNavigateToCategories: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onNavigateToCategories }) => {
  const { defaultCurrency, updateDefaultCurrency } = useSettings();
  const { isConnected, disconnect, exportBackup, importBackup } = useGDriveSession();

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

  const handleGoogleExport = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncStatus(null);

    try {
      setSyncStatus('Signing in to Google Drive...');
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
    if (!confirm('Restoring from Google Drive will overwrite local database with the latest backup. Continue?')) {
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncStatus(null);

    try {
      setSyncStatus('Signing in to Google Drive...');
      await importBackup();
      setSyncStatus('✓ Local database restored successfully from latest backup!');
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

        <Grid size={{ xs: 12 }}>
          <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Sync & Backup</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {isConnected
                  ? 'Google account connected. Session persists across all pages until you disconnect.'
                  : 'Sign in to Google Drive when you back up or restore — no login required until then.'}
              </Typography>

              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Button
                  variant="contained"
                  disabled={isSyncing}
                  startIcon={isSyncing ? <Globe size={18} /> : <Upload size={18} />}
                  onClick={handleGoogleExport}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '12px', justifyContent: 'flex-start', py: 1.2 }}
                >
                  {isSyncing ? 'Working...' : 'Sync & Backup to Google Drive'}
                </Button>

                <Button
                  variant="outlined"
                  color="info"
                  disabled={isSyncing}
                  startIcon={<Download size={18} />}
                  onClick={handleGoogleImport}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '12px', justifyContent: 'flex-start', py: 1.2 }}
                >
                  Restore Latest Backup from Drive
                </Button>

                {isConnected && (
                  <Button
                    variant="text"
                    color="error"
                    disabled={isSyncing}
                    startIcon={<LogOut size={18} />}
                    onClick={handleDisconnect}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '12px', justifyContent: 'flex-start', py: 0.5 }}
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
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '12px', justifyContent: 'flex-start', py: 1.2 }}
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
