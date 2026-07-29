import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { 
  Dialog, DialogTitle, DialogContent, Box, IconButton, TextField, 
  MenuItem, Button, ToggleButton, ToggleButtonGroup, 
  InputAdornment, Typography, FormControlLabel, Checkbox 
} from '@mui/material';
import { X, Calendar, Tag, CreditCard, ArrowRightLeft, FileText } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose }) => {
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [repeatInterval, setRepeatInterval] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const handleTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newType: 'expense' | 'income' | 'transfer' | null
  ) => {
    if (newType !== null) {
      setType(newType);
      setCategoryId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountId) return;

    const amountCents = Math.round(parseFloat(amount) * 100);

    try {
      await db.transaction('rw', [db.transactions, db.accounts], async () => {
        // Create transactional logging profile
        await db.transactions.add({
          id: crypto.randomUUID(),
          amount: amountCents,
          type,
          accountId,
          toAccountId: type === 'transfer' ? toAccountId : undefined,
          categoryId: type === 'transfer' ? undefined : categoryId,
          date: new Date(date).getTime(),
          note,
          description,
          isRecurring,
          repeatInterval: isRecurring ? repeatInterval : 'none',
        });

        // Live Balance calculations
        const srcAccount = await db.accounts.get(accountId);
        if (srcAccount) {
          const multiplier = type === 'income' ? 1 : -1;
          await db.accounts.update(accountId, {
            currentBalance: srcAccount.currentBalance + (amountCents * multiplier),
          });
        }

        if (type === 'transfer' && toAccountId) {
          const targetAccount = await db.accounts.get(toAccountId);
          if (targetAccount) {
            await db.accounts.update(toAccountId, {
              currentBalance: targetAccount.currentBalance + amountCents,
            });
          }
        }
      });

      // Reset local state fields
      setAmount('');
      setAccountId('');
      setToAccountId('');
      setCategoryId('');
      setNote('');
      setDescription('');
      setIsRecurring(false);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Local IndexedDB Transaction error occured');
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
          sx: { borderRadius: '24px', p: 1, bgcolor: 'background.paper', backgroundImage: 'none' }
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography component="span" variant="h6" sx={{ fontWeight: 800 }}>
          Add Entry
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <X size={20} />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ borderTop: 'none', px: 3, py: 2 }}>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          
          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={handleTypeChange}
            fullWidth
            size="small"
            sx={{
              bgcolor: 'action.hover', p: 0.5, borderRadius: '12px', border: 'none',
              '& .MuiToggleButtonGroup-grouped': {
                border: 0, borderRadius: '8px !important', textTransform: 'capitalize', fontWeight: 700,
                '&.Mui-selected': { bgcolor: 'background.paper', boxShadow: 1, color: 'primary.main' }
              }
            }}
          >
            <ToggleButton value="expense">Expense</ToggleButton>
            <ToggleButton value="income">Income</ToggleButton>
            <ToggleButton value="transfer">Transfer</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography sx={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'text.secondary' }}>₹</Typography>
                  </InputAdornment>
                ),
                sx: { fontSize: '1.25rem', fontWeight: 'bold', borderRadius: '12px' }
              }
            }}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              select
              label={type === 'transfer' ? 'From Account' : 'Account'}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (<InputAdornment position="start"><CreditCard size={18} /></InputAdornment>),
                  sx: { borderRadius: '12px' }
                }
              }}
            >
              {accounts.map((acc) => (
                <MenuItem key={acc.id} value={acc.id}>{acc.name}</MenuItem>
              ))}
            </TextField>

            {type === 'transfer' ? (
              <TextField
                select
                label="To Account"
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                required
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (<InputAdornment position="start"><ArrowRightLeft size={18} /></InputAdornment>),
                    sx: { borderRadius: '12px' }
                  }
                }}
              >
                {accounts.filter((acc) => acc.id !== accountId).map((acc) => (
                  <MenuItem key={acc.id} value={acc.id}>{acc.name}</MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                select
                label="Category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (<InputAdornment position="start"><Tag size={18} /></InputAdornment>),
                    sx: { borderRadius: '12px' }
                  }
                }}
              >
                {categories.filter((c) => c.type === type).map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.parentId ? `↳ ${cat.name}` : cat.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Box>

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
                startAdornment: (<InputAdornment position="start"><Calendar size={18} /></InputAdornment>),
                sx: { borderRadius: '12px' }
              }
            }}
          />

          <TextField
            label="Short Note"
            placeholder="Quick reference details"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            slotProps={{ input: { sx: { borderRadius: '12px' } } }}
          />

          <TextField
            label="Extended Description"
            placeholder="Enter additional details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            slotProps={{
              input: {
                startAdornment: (<InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}><FileText size={18} /></InputAdornment>),
                sx: { borderRadius: '12px' }
              }
            }}
          />

          {/* Repeat Schedule logic */}
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 1.5 }}>
            <FormControlLabel
              control={<Checkbox checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />}
              label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Enable Repeat Cycle</Typography>}
            />
            {isRecurring && (
              <TextField
                select
                size="small"
                label="Repeat Interval"
                value={repeatInterval}
                onChange={(e) => setRepeatInterval(e.target.value as any)}
                fullWidth
                sx={{ mt: 1.5 }}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly (SIP standard)</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </TextField>
            )}
          </Box>

          <Button type="submit" variant="contained" size="large" fullWidth sx={{ py: 1.8, borderRadius: '16px', fontWeight: 'bold' }}>
            Save Transaction
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionModal;