import React from 'react';
import { TextField, InputAdornment } from '@mui/material';
import { Calendar } from 'lucide-react';

export const DatePicker: React.FC<{ date, setDate }> = ({ date, setDate }) => {
  return (
    <TextField
      type="date"
      label="Date"
      value={date}
      onChange={(e) => setDate(e.target.value)}
      required
      fullWidth
      slotProps={{
        inputLabel: { shrink: true },
        input: {
          startAdornment: (
          <InputAdornment position="start">
            <Calendar size={18} />
            </InputAdornment>
            ),
          sx: { borderRadius: '14px' }
        }
      }}
    />
  )

}