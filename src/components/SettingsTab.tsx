import React, { useState, useEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
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
  User,
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
const DEFAULT_USERNAME = 'User';

/**
 * iOS-styled Settings view adhering to Apple Human Interface Guidelines (HIG).
 * Uses inset grouped sections, standard tap target sizes (≥44px), custom dialogs,
 * and fluid layout structures.
 */
export const SettingsTab: React.FC<SettingsTabProps> = ({ onNavigateToCategories, sx }) => {
  const { defaultCurrency, updateDefaultCurrency } = useSettings();

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

  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [iCloudInfoOpen, setICloudInfoOpen] = useState(false);

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
     ACTION HANDLERS
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
      setSyncStatus('Connected to Google Drive');
    } catch (err: unknown) {
      setLocalError(formatErrorMessage(err, 'Failed to authenticate with Google Drive.'));
    }
  };

  const handleGoogleExport = async () => {
    setLocalError(null);
    setSyncStatus('Uploading backup to Google Drive...');
    try {
      const backupFileName = await exportBackup();
      setSyncStatus(`Backup saved ("Backups/${backupFileName}")`);
    } catch (err: unknown) {
      setLocalError(formatErrorMessage(err, 'Failed to export backup to Google Drive.'));
    }
  };

  const executeImport = async () => {
    setConfirmImportOpen(false);
    setLocalError(null);
    setSyncStatus('Fetching latest backup file...');
    try {
      await importBackup();
      setSyncStatus('Database restored successfully');
    } catch (err: unknown) {
      setLocalError(formatErrorMessage(err, 'Failed to restore database from Google Drive.'));
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setSyncStatus('Google Drive disconnected.');
  };

  const formattedLastSync = lastSyncTime
    ? new Date(lastSyncTime).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    : null;

  /* ==========================================================
     REUSABLE IOS STYLED GROUP CONTAINER
     ========================================================== */
  const GroupedSection: React.FC<{ title?: string; children: React.ReactNode }> = ({
    title,
    children,
  }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {title && (
        <Typography
          variant="caption"
          sx={{
            px: 2,
            textTransform: 'uppercase',
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: 'text.secondary',
            fontSize: '0.75rem',
          }}
        >
          {title}
        </Typography>
      )}
      <Box
        sx={(theme) => ({
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'background.paper',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'divider',
        })}
      >
        {children}
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        maxWidth: 680,
        mx: 'auto',
        pb: 4,
        ...sx,
      }}
    >
      {/* Dynamic Banners */}
      <Stack spacing={1}>
        {activeError && (
          <Alert severity="error" onClose={() => setLocalError(null)} sx={{ borderRadius: '14px' }}>
            {activeError}
          </Alert>
        )}
        {syncStatus && (
          <Alert severity="success" onClose={() => setSyncStatus(null)} sx={{ borderRadius: '14px' }}>
            {syncStatus}
          </Alert>
        )}
      </Stack>

      {/* Profile Section */}
      <GroupedSection title="Account & Preferences">
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Username"
            value={profileName}
            onChange={(e) => handleProfileNameChange(e.target.value)}
            variant="outlined"
            fullWidth
            slotProps={{
              input: {
                startAdornment: <User size={18} style={{ marginRight: 10, opacity: 0.6 }} />,
              },
              formHelperText: {
                sx: {
                  color: profileSavedMsg ? 'success.main' : 'text.secondary',
                  fontWeight: profileSavedMsg ? 600 : 400,
                },
              },
            }}
            helperText={profileSavedMsg ? '✓ Changes saved' : 'Displayed in app greetings'}
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
                      sx: { borderRadius: '14px', mt: 0.5 },
                    },
                  },
                },
              },
            }}
          >
            <MenuItem value="INR">INR (₹) — Indian Rupee</MenuItem>
            <MenuItem value="USD">USD ($) — US Dollar</MenuItem>
            <MenuItem value="EUR">EUR (€) — Euro</MenuItem>
            <MenuItem value="GBP">GBP (£) — British Pound</MenuItem>
          </TextField>
        </Box>
      </GroupedSection>

      {/* Navigation Group */}
      <GroupedSection title="Management">
        <List disablePadding>
          <ListItemButton
            onClick={onNavigateToCategories}
            sx={{
              py: 1.5,
              px: 2,
              minHeight: 52,
              '&:active': { opacity: 0.7 },
            }}
          >
            <ListItemIcon sx={{ minWidth: 38, color: 'primary.main' }}>
              <Tag size={20} />
            </ListItemIcon>
            <ListItemText
              primary="Manage Categories"
              secondary="Income and expense taxonomy"
              slotProps={{
                primary: { sx: { fontWeight: 600, fontSize: '0.95rem' } },
                secondary: { sx: { fontSize: '0.8rem' } },
              }}
            />
            <ChevronRight size={18} style={{ opacity: 0.4 }} />
          </ListItemButton>
        </List>
      </GroupedSection>

      {/* Cloud & Backup Group */}
      <GroupedSection title="Cloud Backup & Sync">
        <List disablePadding>
          {/* Status Row */}
          <ListItem
            sx={{
              py: 1.5,
              px: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {isConnected ? (
                <CheckCircle2 size={20} style={{ color: '#10B981' }} />
              ) : (
                <Globe size={20} style={{ opacity: 0.5 }} />
              )}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {isConnected ? 'Google Drive Active' : 'Google Drive'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {isConnected
                    ? formattedLastSync
                      ? `Last backup: ${formattedLastSync}`
                      : 'Sync ready'
                    : 'Not connected'}
                </Typography>
              </Box>
            </Box>
          </ListItem>

          <Divider />

          {/* Connect / Disconnect Actions */}
          {!isConnected ? (
            <ListItemButton
              disabled={isBusy}
              onClick={handleGoogleSignIn}
              sx={{ py: 1.5, px: 2, minHeight: 48, color: 'primary.main' }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>
                {isBusy ? <CircularProgress size={18} /> : <LogIn size={18} />}
              </ListItemIcon>
              <ListItemText
                primary="Sign in with Google"
                slotProps={{ primary: { sx: { fontWeight: 600, fontSize: '0.95rem' } } }}
              />
            </ListItemButton>
          ) : (
            <>
              <ListItemButton
                disabled={isBusy}
                onClick={handleGoogleExport}
                sx={{ py: 1.5, px: 2, minHeight: 48 }}
              >
                <ListItemIcon sx={{ minWidth: 38, color: 'primary.main' }}>
                  {isBusy ? <CircularProgress size={18} /> : <Upload size={18} />}
                </ListItemIcon>
                <ListItemText
                  primary="Backup Now to Drive"
                  slotProps={{ primary: { sx: { fontWeight: 600, fontSize: '0.95rem' } } }}
                />
              </ListItemButton>

              <Divider />

              <ListItemButton
                disabled={isBusy}
                onClick={() => setConfirmImportOpen(true)}
                sx={{ py: 1.5, px: 2, minHeight: 48 }}
              >
                <ListItemIcon sx={{ minWidth: 38, color: 'info.main' }}>
                  <Download size={18} />
                </ListItemIcon>
                <ListItemText
                  primary="Restore Latest Backup"
                  slotProps={{ primary: { sx: { fontWeight: 600, fontSize: '0.95rem' } } }}
                />
              </ListItemButton>

              <Divider />

              <ListItemButton
                disabled={isBusy}
                onClick={handleDisconnect}
                sx={{ py: 1.5, px: 2, minHeight: 48, color: 'error.main' }}
              >
                <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>
                  <LogOut size={18} />
                </ListItemIcon>
                <ListItemText
                  primary="Disconnect Google Account"
                  slotProps={{ primary: { sx: { fontWeight: 600, fontSize: '0.95rem' } } }}
                />
              </ListItemButton>
            </>
          )}

          <Divider />

          {/* iCloud Option */}
          <ListItemButton
            onClick={() => setICloudInfoOpen(true)}
            sx={{ py: 1.5, px: 2, minHeight: 48 }}
          >
            <ListItemIcon sx={{ minWidth: 38, color: 'text.secondary' }}>
              <Cloud size={18} />
            </ListItemIcon>
            <ListItemText
              primary="iCloud Keychain Sync"
              secondary="Coming soon"
              slotProps={{
                primary: { sx: { fontWeight: 600, fontSize: '0.95rem' } },
                secondary: { sx: { fontSize: '0.75rem' } },
              }}
            />
            <ChevronRight size={18} style={{ opacity: 0.3 }} />
          </ListItemButton>
        </List>
      </GroupedSection>

      {/* iOS Styled Confirmation Dialog for Database Restore */}
      <Dialog
        open={confirmImportOpen}
        onClose={() => setConfirmImportOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '18px',
              p: 1,
              maxWidth: 340,
              backdropFilter: 'blur(20px)',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 1 }}>
          Restore Database?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ textAlign: 'center', fontSize: '0.9rem' }}>
            Restoring from Google Drive will replace all current local records with the latest backup file.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', gap: 1, px: 2, pb: 1.5 }}>
          <Button
            fullWidth
            variant="contained"
            color="error"
            onClick={executeImport}
            sx={{ borderRadius: '12px', py: 1, fontWeight: 700, textTransform: 'none' }}
          >
            Overwrite & Restore
          </Button>
          <Button
            fullWidth
            variant="text"
            color="inherit"
            onClick={() => setConfirmImportOpen(false)}
            sx={{ borderRadius: '12px', py: 0.8, fontWeight: 600, textTransform: 'none' }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Info Dialog for iCloud Sync */}
      <Dialog
        open={iCloudInfoOpen}
        onClose={() => setICloudInfoOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '18px',
              p: 1,
              maxWidth: 320,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 1 }}>
          iCloud Sync
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ textAlign: 'center', fontSize: '0.9rem' }}>
            iCloud Keychain & CloudKit auto-sync support will be available in an upcoming update.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 1 }}>
          <Button
            variant="contained"
            onClick={() => setICloudInfoOpen(false)}
            sx={{ borderRadius: '12px', px: 4, fontWeight: 700, textTransform: 'none' }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};