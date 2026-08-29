import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Snackbar,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CloudOff,
  Upload,
  Download,
  LogOut,
  LogIn,
  CheckCircle,
  ChevronLeft,
  RefreshCw,
} from 'lucide-react'; // removed unused Cloud, AlertCircle
import { useGDriveSession } from '@/hooks/useGDriveSession';

// ─── Constants ────────────────────────────────────────────────
const iOSFont = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Helvetica, Arial, sans-serif',
};

const statusCardSx = {
  p: 2.5,
  borderRadius: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  mb: 3,
};

// ─── Helpers ──────────────────────────────────────────────────
const formatRelativeTime = (timestamp: number | null): string => {
  if (!timestamp) return 'Never';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

// ─── Main Component ───────────────────────────────────────────
interface DriveSyncSettingsProps {
  onBack: () => void;
}

export const DriveSyncSettings: React.FC<DriveSyncSettingsProps> = ({ onBack }) => {
  const theme = useTheme();
  const {
    isConnected,
    isSyncing,
    lastSyncTime,
    error: hookError,
    isPending,
    ensureAuthenticated,
    disconnect,
    sync,            // added: full bidirectional sync
    exportBackup,
    importBackup,
  } = useGDriveSession();

  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const isBusy = isSyncing || isPending;

  // Memoize formatted strings
  const formattedLastSync = useMemo(() => {
    if (!lastSyncTime) return null;
    return {
      absolute: new Date(lastSyncTime).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      relative: formatRelativeTime(lastSyncTime),
    };
  }, [lastSyncTime]);

  // ─── Handlers ────────────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    setLocalError(null);
    setSuccess(null);
    try {
      await ensureAuthenticated();
      setSuccess('Connected to Google Drive');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, [ensureAuthenticated]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setSuccess('Disconnected from Google Drive');
  }, [disconnect]);

  const handleSync = useCallback(async () => {
    setLocalError(null);
    setSuccess(null);
    try {
      await sync();
      setSuccess('Sync completed successfully');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Sync failed');
    }
  }, [sync]);

  const handleBackup = useCallback(async () => {
    setLocalError(null);
    setSuccess(null);
    try {
      const fileName = await exportBackup();
      setSuccess(`Backup saved: ${fileName}`);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Backup failed');
    }
  }, [exportBackup]);

  const handleRestore = useCallback(async () => {
    setConfirmRestore(false);
    setLocalError(null);
    setSuccess(null);
    try {
      await importBackup();
      setSuccess('Database restored from latest backup');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Restore failed');
    }
  }, [importBackup]);

  // ─── Render ──────────────────────────────────────────────────
  return (
    <Box sx={{ ...iOSFont }}>
      {/* Navigation Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 2,
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'rgba(60,60,67,0.08)',
        }}
      >
        <ListItemButton
          onClick={onBack}
          aria-label="Go back to settings"
          sx={{
            borderRadius: '10px',
            p: 0.5,
            minWidth: 'auto',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <ChevronLeft size={24} />
        </ListItemButton>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.3px' }}>
          Google Drive Sync
        </Typography>
      </Box>

      {/* Status Card */}
      <Paper
        elevation={0}
        sx={{
          ...statusCardSx,
          bgcolor: isConnected
            ? alpha(theme.palette.success.main, 0.06)
            : alpha(theme.palette.grey[500], 0.06),
          border: '1px solid',
          borderColor: isConnected
            ? alpha(theme.palette.success.main, 0.2)
            : alpha(theme.palette.grey[500], 0.12),
        }}
      >
        {isBusy ? (
          <CircularProgress size={32} thickness={5} aria-label="Syncing" />
        ) : isConnected ? (
          <CheckCircle size={32} color={theme.palette.success.main} />
        ) : (
          <CloudOff size={32} color={theme.palette.grey[500]} />
        )}
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 17 }}>
            {isBusy ? 'Syncing...' : isConnected ? 'Connected' : 'Not Connected'}
          </Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            {isConnected && formattedLastSync
              ? `Last sync: ${formattedLastSync.relative} (${formattedLastSync.absolute})`
              : 'No sync yet'}
          </Typography>
        </Box>
      </Paper>

      {/* Feedback Messages */}
      {(localError || success) && (
        <Alert
          severity={localError ? 'error' : 'success'}
          onClose={() => { setLocalError(null); setSuccess(null); }}
          sx={{ borderRadius: '14px', mb: 3 }}
          role="status"
        >
          {localError || success}
        </Alert>
      )}

      {/* Action List */}
      <List disablePadding>
        {!isConnected ? (
          <ListItemButton
            onClick={handleConnect}
            disabled={isBusy}
            sx={{ py: 1.5, px: 2, borderRadius: '12px', bgcolor: 'action.hover' }}
          >
            <ListItemIcon sx={{ minWidth: 38, color: 'primary.main' }}>
              {isBusy ? <CircularProgress size={20} /> : <LogIn size={20} />}
            </ListItemIcon>
            <ListItemText
              primary="Sign in with Google"
              secondary={isBusy ? 'Authenticating...' : undefined}
            />
          </ListItemButton>
        ) : (
          <>
            {/* Sync Now – full bidirectional sync */}
            <ListItemButton
              onClick={handleSync}
              disabled={isBusy}
              sx={{ py: 1.5, px: 2, borderRadius: '12px' }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: 'primary.main' }}>
                {isBusy ? <CircularProgress size={20} /> : <RefreshCw size={20} />}
              </ListItemIcon>
              <ListItemText
                primary="Sync Now"
                secondary={isBusy ? 'Merging changes...' : 'Pull & push latest changes'}
              />
            </ListItemButton>

            <Divider sx={{ my: 1 }} />

            {/* Backup */}
            <ListItemButton
              onClick={handleBackup}
              disabled={isBusy}
              sx={{ py: 1.5, px: 2, borderRadius: '12px' }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: 'primary.main' }}>
                {isBusy ? <CircularProgress size={20} /> : <Upload size={20} />}
              </ListItemIcon>
              <ListItemText
                primary="Backup Now"
                secondary={isBusy ? 'Uploading...' : 'Upload latest data to Drive'}
              />
            </ListItemButton>

            <Divider sx={{ my: 1 }} />

            {/* Restore */}
            <ListItemButton
              onClick={() => setConfirmRestore(true)}
              disabled={isBusy}
              sx={{ py: 1.5, px: 2, borderRadius: '12px' }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: 'warning.main' }}>
                <Download size={20} />
              </ListItemIcon>
              <ListItemText
                primary="Restore Latest Backup"
                secondary="Overwrite local data with Drive version"
              />
            </ListItemButton>

            <Divider sx={{ my: 1 }} />

            {/* Disconnect */}
            <ListItemButton
              onClick={handleDisconnect}
              disabled={isBusy}
              sx={{ py: 1.5, px: 2, borderRadius: '12px', color: 'error.main' }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>
                <LogOut size={20} />
              </ListItemIcon>
              <ListItemText primary="Disconnect Google Account" />
            </ListItemButton>
          </>
        )}
      </List>

      {/* Restore Confirmation (inline) */}
      {confirmRestore && (
        <Box
          sx={{
            mt: 3,
            p: 2,
            bgcolor: alpha(theme.palette.warning.main, 0.08),
            borderRadius: '14px',
            border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
          }}
          role="alertdialog"
          aria-label="Confirm restore"
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Overwrite all local data?
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            This will replace all your current accounts, transactions, and categories with the version from Drive.
            This action cannot be undone.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="error"
              onClick={handleRestore}
              disabled={isBusy}
              sx={{ borderRadius: '12px', textTransform: 'none', flex: 1 }}
              startIcon={isBusy ? <CircularProgress size={16} /> : undefined}
            >
              {isBusy ? 'Restoring...' : 'Restore'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setConfirmRestore(false)}
              disabled={isBusy}
              sx={{ borderRadius: '12px', textTransform: 'none', flex: 1 }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      )}

      {/* Auto‑dismiss Snackbar for hook errors (if not already shown) */}
      <Snackbar
        open={!!hookError && !localError}
        autoHideDuration={6000}
        onClose={() => {}}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" sx={{ borderRadius: '14px', ...iOSFont }}>
          {hookError}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DriveSyncSettings;