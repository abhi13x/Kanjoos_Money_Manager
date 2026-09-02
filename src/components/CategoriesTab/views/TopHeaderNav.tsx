import { Box, Button, IconButton, Typography } from '@mui/material';
import { ArrowLeft, Plus } from 'lucide-react';
import type { FC } from 'react';
import type { Category } from '@/db/schema';

export const TopHeaderNav: FC<{
  selectedParentCategory: Category | null;
  activeTab: 'income' | 'expense';
  onBack: () => void;
  setSelectedParentCategory: (category: Category | null) => void;
  setAddModalState: (state: { open: boolean; type: 'income' | 'expense'; parentCategory?: Category | null }) => void;
}> = ({ selectedParentCategory, activeTab, onBack, setSelectedParentCategory, setAddModalState }) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      py: 1 
      }}>
      <Button
        startIcon={<ArrowLeft size={20} />}
        onClick={() => {
          if (selectedParentCategory) {
            setSelectedParentCategory(null);
          } else {
            onBack();
          }
        }}
        sx={{ 
          fontWeight: 700, 
          textTransform: 'none', 
          color: 'text.primary' 
        }}
      >
        {selectedParentCategory
          ? activeTab === 'expense'
            ? 'Expenses'
            : 'Income'
          : 'Settings'}
      </Button>

      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        {
        selectedParentCategory ? 
        selectedParentCategory.name : activeTab === 'expense' ? 
        'Expenses' : 'Income'
        }
      </Typography>

      <IconButton
        color="primary"
        sx={{ width: 44, height: 44 }}
        onClick={() => {
          if (selectedParentCategory) {
            setAddModalState({ 
              open: true, 
              type: activeTab, 
              parentCategory: selectedParentCategory 
            });
          } else {
            setAddModalState({ 
              open: true, 
              type: activeTab, 
              parentCategory: null 
            });
          }
        }}
      >
        <Plus size={24} />
      </IconButton>
    </Box>
  )
}