import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Transaction } from '@/db/schema';
import { addTransactionWithSync, updateTransactionWithSync } from '@/services/financeService';
import {
  Dialog, DialogTitle, DialogContent, Box, IconButton, TextField,
  Button, InputAdornment, Typography
} from '@mui/material';
import { X, FileText } from 'lucide-react';
import { AccAndCategory } from './views/AccAndCategory';
import { DatePicker } from './views/DatePicker';
import { SegmentTypeSwitcher } from './views/SegmentTypeSwitch';
import { Recurring } from './views/Recurring';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTransaction?: Transaction | null;
}

export type TransactionType = 'expense' | 'income' | 'transfer';
export type RepeatInterval = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

const VALID_INTERVALS: RepeatInterval[] = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  editTransaction,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [repeatInterval, setRepeatInterval] = useState<RepeatInterval>('monthly');

  // IndexedDB Dexie Live Queries
  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray()) ?? [];

  useEffect(() => {
    if (isOpen && editTransaction) {
      setType(editTransaction.type ?? 'expense');
      setAmount(editTransaction.amount ? (editTransaction.amount / 100).toFixed(2) : '');
      setAccountId(editTransaction.accountId ?? '');
      setToAccountId(editTransaction.toAccountId ?? '');
      setDate(
        editTransaction.date
          ? new Date(editTransaction.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setNote(editTransaction.note ?? '');
      setDescription(editTransaction.description ?? '');
      setIsRecurring(editTransaction.isRecurring ?? false);

      // Safe type narrowing guard against database schema string types
      const rawInterval = editTransaction.repeatInterval as RepeatInterval;
      setRepeatInterval(VALID_INTERVALS.includes(rawInterval) ? rawInterval : 'monthly');

      // Determine parent category and subcategory based on saved categoryId
      const targetCatId = editTransaction.categoryId ?? '';
      const foundCat = categories.find((c) => c.id === targetCatId);
      
      if (foundCat?.parentId) {
        setCategoryId(foundCat.parentId);
        setSubCategoryId(foundCat.id);
      } else {
        setCategoryId(targetCatId);
        setSubCategoryId('');
      }
    } else if (isOpen) {
      setType('expense');
      setAmount('');
      setAccountId('');
      setToAccountId('');
      setCategoryId('');
      setSubCategoryId('');
      setDate(new Date().toISOString().split('T')[0]);
      setNote('');
      setDescription('');
      setIsRecurring(false);
      setRepeatInterval('monthly');
    }
  }, [isOpen, editTransaction, categories]);

  // Filter root (parent) categories for the current type
  const parentCategories = useMemo(() => {
    if (type === 'transfer') return [];
    return categories.filter((cat) => cat.type === type && !cat.parentId);
  }, [categories, type]);

  // Filter subcategories under the selected parent category
  const availableSubcategories = useMemo(() => {
    if (!categoryId || type === 'transfer') return [];
    return categories.filter((cat) => cat.parentId === categoryId);
  }, [categories, categoryId, type]);

  const handleTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newType: TransactionType | null
  ) => {
    if (newType !== null) {
      setType(newType);
      setCategoryId('');
      setSubCategoryId('');
    }
  };

  const handleCategoryChange = (newParentId: string) => {
    setCategoryId(newParentId);
    setSubCategoryId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountId) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const amountCents = Math.round(parsedAmount * 100);

    // Save subcategoryId if selected, otherwise fallback to root categoryId
    const finalCategoryId = subCategoryId || categoryId;

    const payload = {
      amount: amountCents,
      type,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      categoryId: type === 'transfer' ? undefined : (finalCategoryId || undefined),
      date: new Date(date).getTime(),
      note: note.trim(),
      description: description.trim(),
      isRecurring,
      repeatInterval: isRecurring ? repeatInterval : ('none' as const),
    };

    try {
      if (editTransaction?.id) {
        await updateTransactionWithSync(editTransaction.id, payload);
      } else {
        await addTransactionWithSync(payload);
      }
      onClose();
    } catch (err) {
      console.error('Failed to sync transaction:', err);
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
          sx: {
            borderRadius: '24px',
            p: 1,
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.12)'
          }
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography component="span" variant="h6" sx={{ fontWeight: 800 }}>
          {editTransaction ? 'Edit Transaction' : 'New Transaction'}
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 1 }}>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* Segmented Type Switcher */}
          <SegmentTypeSwitcher
            type={type}
            handleTypeChange={handleTypeChange}
          />

          {/* Amount Field */}
          <TextField
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            fullWidth
            placeholder="0.00"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: 'text.secondary' }}>₹</Typography>
                  </InputAdornment>
                ),
                sx: { fontSize: '1.25rem', fontWeight: 800, borderRadius: '14px' }
              }
            }}
          />

          {/* Account and Category Selectors */}
          <AccAndCategory
            type={type}
            accounts={accounts}
            parentCategories={parentCategories}
            availableSubcategories={availableSubcategories}
            accountId={accountId}
            toAccountId={toAccountId}
            categoryId={categoryId}
            subCategoryId={subCategoryId}
            setAccountId={setAccountId}
            setToAccountId={setToAccountId}
            setCategoryId={handleCategoryChange}
            setSubCategoryId={setSubCategoryId}
          />

          {/* Date Picker */}
          <DatePicker
            date={date}
            setDate={setDate}
          />

          {/* Notes & Description */}
          <TextField
            label="Short Note"
            placeholder="e.g., Grocery shopping, Uber ride"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            slotProps={{ input: { sx: { borderRadius: '14px' } } }}
          />

          <TextField
            label="Extended Description"
            placeholder="Additional context or references..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                    <FileText size={18} />
                  </InputAdornment>
                ),
                sx: { borderRadius: '14px' }
              }
            }}
          />

          {/* Repeat Schedule Settings */}
          <Recurring
            isRecurring={isRecurring}
            setIsRecurring={setIsRecurring}
            repeatInterval={repeatInterval}
            setRepeatInterval={setRepeatInterval}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disableElevation
            sx={{ py: 1.6, borderRadius: '16px', fontWeight: 800, fontSize: '1rem', mb: 1 }}
          >
            {editTransaction ? 'Update Transaction' : 'Save Transaction'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionModal;