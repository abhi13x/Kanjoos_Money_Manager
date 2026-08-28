import { Box, Button, InputAdornment, TextField, Tooltip } from '@mui/material';
import { FilterX, Calendar } from 'lucide-react';
import type { Theme } from '@mui/material/styles';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
}

const dateInputSx = {
  // Enforce 16px minimum on mobile to prevent iOS Safari auto-zooming on focus
  fontSize: { xs: '16px', sm: '0.875rem' },
  borderRadius: '12px',
  minHeight: 44, // iOS Human Interface Guidelines minimum touch target
  colorScheme: (theme: Theme) => theme.palette.mode,

  '& .MuiInputBase-input': {
    py: 1,
    px: 1,
    fontSize: { xs: '16px', sm: '0.875rem' },
  },

  '& ::-webkit-calendar-picker-indicator': {
    cursor: 'pointer',
    width: '1.25em',
    height: '1.25em',
    padding: '0.2em',
    borderRadius: '6px',
    filter: (theme: Theme) => (theme.palette.mode === 'dark' ? 'invert(1)' : 'none'),
    opacity: 0.75,
    transition: 'opacity 0.2s ease, transform 0.15s ease',

    '&:active': {
      transform: 'scale(0.92)',
    },
  },
};

export const DateRangePicker = ({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
}: DateRangePickerProps) => {
  const hasFilter = Boolean(startDate || endDate);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 1.5, sm: 2 },
        alignItems: 'stretch',
        bgcolor: 'background.paper',
        p: { xs: 1.75, sm: 2 },
        borderRadius: '20px',
        border: '1px solid',
        borderColor: 'divider',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Inputs container - neatly aligned side-by-side on iPhone */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.25,
          flex: 1,
          alignItems: 'center',
        }}
      >
        <TextField
          type="date"
          label="From"
          size="small"
          fullWidth
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          slotProps={{
            inputLabel: { shrink: true },
            input: {
              startAdornment: (
                <InputAdornment position="start" sx={{ mr: 0.5 }}>
                  <Calendar size={16} />
                </InputAdornment>
              ),
              sx: dateInputSx,
            },
          }}
        />

        <TextField
          type="date"
          label="To"
          size="small"
          fullWidth
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          slotProps={{
            inputLabel: { shrink: true },
            input: {
              startAdornment: (
                <InputAdornment position="start" sx={{ mr: 0.5 }}>
                  <Calendar size={16} />
                </InputAdornment>
              ),
              sx: dateInputSx,
            },
          }}
        />
      </Box>

      {/* Clear Button */}
      {hasFilter && (
        <Tooltip title="Reset date filters">
          <Button
            color="error"
            variant="outlined"
            size="small"
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            startIcon={<FilterX size={16} />}
            sx={{
              alignSelf: { xs: 'stretch', sm: 'center' },
              fontWeight: 700,
              borderRadius: '12px',
              height: 44,
              minWidth: { xs: '100%', sm: 'auto' },
              borderColor: 'error.light',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Clear Filters
          </Button>
        </Tooltip>
      )}
    </Box>
  );
};