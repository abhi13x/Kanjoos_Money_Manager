import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  Grid,
  Button,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface MonthYearSelectorProps {
  selectedYear: number;
  selectedMonth: number; // 0 = Jan, 11 = Dec
  onChange: (year: number, month: number) => void;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr',
  'May', 'Jun', 'Jul', 'Aug',
  'Sep', 'Oct', 'Nov', 'Dec',
];

export const MonthYearSelector: React.FC<MonthYearSelectorProps> = ({
  selectedYear,
  selectedMonth,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(selectedYear);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const handleOpen = () => {
    setPickerYear(selectedYear);
    setOpen(true);
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      onChange(selectedYear - 1, 11);
    } else {
      onChange(selectedYear, selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      onChange(selectedYear + 1, 0);
    } else {
      onChange(selectedYear, selectedMonth + 1);
    }
  };

  const handleSelectMonth = (monthIndex: number) => {
    onChange(pickerYear, monthIndex);
    setOpen(false);
  };

  const handleThisMonth = () => {
    onChange(currentYear, currentMonth);
    setOpen(false);
  };

  return (
    <>
      {/* iOS Compact Navigation Bar Component */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: (theme) =>
            theme.palette.mode === 'dark'
              ? alpha('#2C3440', 0.8)
              : alpha('#E5E7EB', 0.6),
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          px: 0.5,
          py: 0.25,
          height: 40,
          borderRadius: '10px',
        }}
      >
        <IconButton
          onClick={handlePrevMonth}
          size="small"
          sx={{
            color: 'text.secondary',
            width: 36,
            height: 36,
            '&:active': { transform: 'scale(0.92)' },
          }}
        >
          <ChevronLeft size={20} strokeWidth={2.2} />
        </IconButton>

        <Button
          onClick={handleOpen}
          disableRipple
          sx={{
            color: 'text.primary',
            fontWeight: 600,
            fontSize: '0.95rem',
            letterSpacing: '-0.01em',
            textTransform: 'none',
            px: 1.5,
            height: 32,
            minWidth: 'auto',
            borderRadius: '8px',
            '&:active': { bgcolor: 'action.selected' },
          }}
        >
          {MONTHS[selectedMonth]} {selectedYear}
        </Button>

        <IconButton
          onClick={handleNextMonth}
          size="small"
          sx={{
            color: 'text.secondary',
            width: 36,
            height: 36,
            '&:active': { transform: 'scale(0.92)' },
          }}
        >
          <ChevronRight size={20} strokeWidth={2.2} />
        </IconButton>
      </Box>

      {/* iOS Translucent Sheet Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            sx: {
              bgcolor: (theme) =>
                theme.palette.mode === 'dark'
                  ? alpha('#1F2633', 0.88)
                  : alpha('#FFFFFF', 0.9),
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              color: 'text.primary',
              borderRadius: '20px',
              width: '100%',
              maxWidth: 320,
              p: 2,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              backgroundImage: 'none',
              border: '1px solid',
              borderColor: 'divider',
            },
          },
        }}
      >
        {/* Header Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '0.72rem',
            }}
          >
            Select Period
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              onClick={handleThisMonth}
              size="small"
              sx={{
                color: 'primary.main',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.82rem',
                minWidth: 'auto',
                p: 0,
              }}
            >
              Current Month
            </Button>

            <IconButton
              onClick={() => setOpen(false)}
              size="small"
              sx={{
                color: 'text.secondary',
                bgcolor: 'action.hover',
                width: 26,
                height: 26,
              }}
            >
              <X size={14} strokeWidth={2.5} />
            </IconButton>
          </Box>
        </Box>

        {/* Year Control */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            mb: 2,
            py: 0.5,
          }}
        >
          <IconButton
            onClick={() => setPickerYear((y) => y - 1)}
            size="small"
            sx={{
              color: 'primary.main',
              width: 32,
              height: 32,
              '&:active': { transform: 'scale(0.9)' },
            }}
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </IconButton>

          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1.1rem',
              letterSpacing: '-0.02em',
              minWidth: 50,
              textAlign: 'center',
            }}
          >
            {pickerYear}
          </Typography>

          <IconButton
            onClick={() => setPickerYear((y) => y + 1)}
            size="small"
            sx={{
              color: 'primary.main',
              width: 32,
              height: 32,
              '&:active': { transform: 'scale(0.9)' },
            }}
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </IconButton>
        </Box>

        {/* Month Selection Grid */}
        <Grid container spacing={1}>
          {MONTHS.map((month, idx) => {
            const isSelected =
              pickerYear === selectedYear && idx === selectedMonth;
            const isCurrent =
              pickerYear === currentYear && idx === currentMonth;

            return (
              <Grid key={month} size={3}>
                <Button
                  fullWidth
                  disableRipple
                  onClick={() => handleSelectMonth(idx)}
                  sx={{
                    height: 44, // 44px standard iOS touch target
                    borderRadius: '10px',
                    fontWeight: isSelected ? 700 : isCurrent ? 600 : 500,
                    fontSize: '0.88rem',
                    textTransform: 'none',
                    letterSpacing: '-0.01em',
                    color: isSelected
                      ? '#FFFFFF'
                      : isCurrent
                      ? 'primary.main'
                      : 'text.primary',
                    bgcolor: isSelected
                      ? 'primary.main'
                      : isCurrent
                      ? alpha('#3B82F6', 0.12)
                      : 'transparent',
                    '&:active': {
                      transform: 'scale(0.96)',
                      bgcolor: isSelected ? 'primary.dark' : 'action.selected',
                    },
                    transition: 'transform 0.1s ease, background-color 0.15s ease',
                  }}
                >
                  {month}
                </Button>
              </Grid>
            );
          })}
        </Grid>
      </Dialog>
    </>
  );
};

export default MonthYearSelector;