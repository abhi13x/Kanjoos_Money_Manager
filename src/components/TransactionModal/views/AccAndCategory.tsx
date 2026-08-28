import React from 'react';
import { Box, InputAdornment, MenuItem, TextField } from '@mui/material';
import { CreditCard, ArrowRightLeft, Tag, CornerDownRight } from 'lucide-react';
import type { Category } from '@/db/schema';

interface AccountOption {
  id: string;
  name: string;
}

interface AccAndCategoryProps {
  type: string;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  subCategoryId: string;
  accounts: AccountOption[];
  parentCategories: Category[];
  availableSubcategories: Category[];
  setAccountId: (id: string) => void;
  setToAccountId: (id: string) => void;
  setCategoryId: (id: string) => void;
  setSubCategoryId: (id: string) => void;
}

export const AccAndCategory: React.FC<AccAndCategoryProps> = ({ 
  type,
  accountId, 
  toAccountId, 
  categoryId, 
  subCategoryId,
  accounts, 
  parentCategories,
  availableSubcategories,
  setAccountId, 
  setToAccountId, 
  setCategoryId,
  setSubCategoryId,
}) => {
  const isTransfer = type === 'transfer';

  return (
    <Box 
      sx={{ 
        display: 'grid', 
        gridTemplateColumns: { 
          xs: '1fr', 
          sm: '1fr 1fr' 
        }, 
        gap: 2 
      }}
    >
      {/* Primary Account Selection */}
      <TextField
        select
        label={isTransfer ? 'From Account' : 'Account'}
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        required
        fullWidth
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <CreditCard size={18} />
              </InputAdornment>
            ),
            sx: { borderRadius: '14px' }
          }
        }}
      >
        {accounts.map((acc) => (
          <MenuItem key={acc.id} value={acc.id}>
            {acc.name}
          </MenuItem>
        ))}
      </TextField>

      {/* Transfer Destination or Main Category */}
      {isTransfer ? (
        <TextField
          select
          label="To Account"
          value={toAccountId}
          onChange={(e) => setToAccountId(e.target.value)}
          required
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <ArrowRightLeft size={18} />
                </InputAdornment>
              ),
              sx: { borderRadius: '14px' }
            }
          }}
        >
          {accounts
            .filter((acc) => acc.id !== accountId)
            .map((acc) => (
              <MenuItem key={acc.id} value={acc.id}>
                {acc.name}
              </MenuItem>
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
              startAdornment: (
                <InputAdornment position="start">
                  <Tag size={18} />
                </InputAdornment>
              ),
              sx: { borderRadius: '14px' }
            }
          }}
        >
          {parentCategories.length === 0 ? (
            <MenuItem disabled value="">
              No categories found
            </MenuItem>
          ) : (
            parentCategories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))
          )}
        </TextField>
      )}

      {/* Dynamic Subcategory Selection */}
      {!isTransfer && (
        <TextField
          select
          label="Subcategory (Optional)"
          value={subCategoryId}
          onChange={(e) => setSubCategoryId(e.target.value)}
          disabled={!categoryId || availableSubcategories.length === 0}
          fullWidth
          sx={{
            gridColumn: { xs: '1 / -1', sm: '1 / -1' }
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <CornerDownRight size={18} />
                </InputAdornment>
              ),
              sx: { borderRadius: '14px' }
            }
          }}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {availableSubcategories.map((sub) => (
            <MenuItem key={sub.id} value={sub.id}>
              {sub.name}
            </MenuItem>
          ))}
        </TextField>
      )}
    </Box>
  );
};

export default AccAndCategory;