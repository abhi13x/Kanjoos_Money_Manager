import React from 'react';
import { Box, TextField, Typography, Switch, MenuItem } from '@mui/material';
import { Repeat } from 'lucide-react';
import type { RepeatInterval } from '../TransactionModal';

export const Recurring: React.FC<{
  isRecurring,
  setIsRecurring,
  repeatInterval,
  setRepeatInterval: React.Dispatch<React.SetStateAction<RepeatInterval>>
}> = ({
  isRecurring,
  setIsRecurring,
  repeatInterval,
  setRepeatInterval

 }) => {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Repeat size={18} />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>Recurring Transaction</Typography>
        </Box>
        <Switch
          checked={isRecurring}
          onChange={(e) => setIsRecurring(e.target.checked)}
          size="small"
        />
      </Box>

      {isRecurring && (
        <TextField
          select
          size="small"
          label="Repeat Interval"
          value={repeatInterval}
          onChange={(e) => setRepeatInterval(e.target.value as RepeatInterval)}
          fullWidth
          sx={{ mt: 2 }}
          slotProps={{ input: { sx: { borderRadius: '10px' } } }}
        >
          <MenuItem value="daily">Daily</MenuItem>
          <MenuItem value="weekly">Weekly</MenuItem>
          <MenuItem value="monthly">Monthly (SIP standard)</MenuItem>
          <MenuItem value="yearly">Yearly</MenuItem>
        </TextField>
      )}
    </Box>
  )
}