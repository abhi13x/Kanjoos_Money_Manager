import React, { useState, useEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { SxProps, Theme } from '@mui/material/styles';
import { Tag, ChevronRight, User, Sun, Moon, Monitor, Cloud } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { DriveSyncSettings } from './DriveSyncSettings';

export interface SettingsTabProps {
  onNavigateToCategories: () => void;
  sx?: SxProps<Theme>;
}

const USERNAME_STORAGE_KEY = 'kanjoos_username';
const DEFAULT_USERNAME = 'User';

const iOSFont = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Helvetica, Arial, sans-serif',
};

export const SettingsTab: React.FC<SettingsTabProps> = ({ onNavigateToCategories, sx }) => {
  const { defaultCurrency, updateDefaultCurrency, themeMode, updateThemeMode } = useSettings();
  const [view, setView] = useState<'main' | 'drive'>('main');

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
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setProfileSavedMsg(false), 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const GroupedSection: React.FC<{ title?: string; children: React.ReactNode }> = ({
    title,
    children,
  }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {title && (
        <Typography
          variant="caption"
          sx={{
            px: 1.5,
            textTransform: 'uppercase',
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: '#8E8E93',
            fontSize: 13,
            ...iOSFont,
          }}
        >
          {title}
        </Typography>
      )}
      <Box
        sx={(theme) => ({
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(60,60,67,0.08)',
        })}
      >
        {children}
      </Box>
    </Box>
  );

  if (view === 'drive') {
    return (
      <Box sx={{ maxWidth: 680, mx: 'auto', px: 2, pt: 1, pb: 4, ...iOSFont, ...sx }}>
        <DriveSyncSettings onBack={() => setView('main')} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        maxWidth: 680,
        mx: 'auto',
        px: 2,
        pt: 1,
        pb: 4,
        ...iOSFont,
        ...sx,
      }}
    >
      <GroupedSection title="Account & Preferences">
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="Username"
            value={profileName}
            onChange={(e) => handleProfileNameChange(e.target.value)}
            variant="outlined"
            fullWidth
            slotProps={{
              input: {
                startAdornment: <User size={18} style={{ marginRight: 10, opacity: 0.6 }} />,
                sx: { borderRadius: '12px', ...iOSFont },
              },
              formHelperText: {
                sx: {
                  color: profileSavedMsg ? '#34C759' : '#8E8E93',
                  fontWeight: profileSavedMsg ? 600 : 400,
                  ...iOSFont,
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
                      sx: { borderRadius: '14px', mt: 0.5, ...iOSFont },
                    },
                  },
                },
              },
              input: { sx: { borderRadius: '12px', ...iOSFont } },
            }}
          >
            <MenuItem value="INR" sx={iOSFont}>INR (₹) — Indian Rupee</MenuItem>
            <MenuItem value="USD" sx={iOSFont}>USD ($) — US Dollar</MenuItem>
            <MenuItem value="EUR" sx={iOSFont}>EUR (€) — Euro</MenuItem>
            <MenuItem value="GBP" sx={iOSFont}>GBP (£) — British Pound</MenuItem>
          </TextField>
        </Box>
      </GroupedSection>

      <GroupedSection title="Appearance">
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: '#8E8E93',
              fontSize: 15,
              ...iOSFont,
            }}
          >
            Theme
          </Typography>
          <ToggleButtonGroup
            value={themeMode || 'auto'}
            exclusive
            onChange={(_, newMode) => {
              if (newMode && updateThemeMode) updateThemeMode(newMode);
            }}
            fullWidth
            size="small"
            sx={{
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
              p: 0.5,
              borderRadius: '12px',
              border: 'none',
              '& .MuiToggleButtonGroup-grouped': {
                border: 'none',
                borderRadius: '8px !important',
                py: 1,
                fontWeight: 600,
                fontSize: 15,
                textTransform: 'none',
                color: '#8E8E93',
                transition: 'all 0.2s ease',
                ...iOSFont,
                '&.Mui-selected': {
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  boxShadow: (theme) =>
                    theme.palette.mode === 'dark'
                      ? '0px 2px 6px rgba(0,0,0,0.4)'
                      : '0px 2px 6px rgba(0,0,0,0.12)',
                },
              },
            }}
          >
            <ToggleButton value="light">
              <Sun size={16} style={{ marginRight: 6 }} /> Light
            </ToggleButton>
            <ToggleButton value="dark">
              <Moon size={16} style={{ marginRight: 6 }} /> Dark
            </ToggleButton>
            <ToggleButton value="auto">
              <Monitor size={16} style={{ marginRight: 6 }} /> Auto
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </GroupedSection>

      <GroupedSection title="Management">
        <List disablePadding>
          <ListItemButton
            onClick={onNavigateToCategories}
            sx={{
              py: 1.5,
              px: 2,
              minHeight: 52,
              '&:active': { opacity: 0.7 },
              ...iOSFont,
            }}
          >
            <ListItemIcon sx={{ minWidth: 38, color: '#007AFF' }}>
              <Tag size={20} />
            </ListItemIcon>
            <ListItemText
              primary="Manage Categories"
              secondary="Income and expense taxonomy"
              slotProps={{
                primary: { sx: { fontWeight: 600, fontSize: 17, ...iOSFont } },
                secondary: { sx: { fontSize: 15, color: '#8E8E93', ...iOSFont } },
              }}
            />
            <ChevronRight size={18} style={{ opacity: 0.4 }} />
          </ListItemButton>

          {/* New Drive Sync Navigation Item */}
          <ListItemButton
            onClick={() => setView('drive')}
            sx={{
              py: 1.5,
              px: 2,
              minHeight: 52,
              '&:active': { opacity: 0.7 },
              ...iOSFont,
            }}
          >
            <ListItemIcon sx={{ minWidth: 38, color: '#007AFF' }}>
              <Cloud size={20} />
            </ListItemIcon>
            <ListItemText
              primary="Google Drive Sync"
              secondary="Backup & restore your data"
              slotProps={{
                primary: { sx: { fontWeight: 600, fontSize: 17, ...iOSFont } },
                secondary: { sx: { fontSize: 15, color: '#8E8E93', ...iOSFont } },
              }}
            />
            <ChevronRight size={18} style={{ opacity: 0.4 }} />
          </ListItemButton>
        </List>
      </GroupedSection>
    </Box>
  );
};

export default SettingsTab;