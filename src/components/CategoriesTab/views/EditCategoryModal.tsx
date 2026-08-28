import { useState, useEffect } from 'react';
import type { Category } from '@/db/schema';
import { db } from '@/db/schema';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
} from '@mui/material';

interface EditCategoryModalProps {
  open: boolean;
  category: Category | null;
  onClose: () => void;
}

export const EditCategoryModal: React.FC<EditCategoryModalProps> = ({ 
    open, category, onClose }) => {
  const [name, setName] = useState(category?.name || '');

  useEffect(() => {
    if (category) {
      setName(category.name);
    }
  }, [category]);

  if (!category) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await db.categories.update(category.id, {
      name: name.trim(),
    });

    onClose();
  };

  return (
    <Dialog open={open} 
    onClose={onClose} 
    maxWidth="xs" 
    fullWidth 
    slotProps={{ 
        paper: { 
            sx: { 
                borderRadius: '16px' 
                } 
              } 
          }}
      >
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Edit Name</DialogTitle>
      <Box component="form" onSubmit={handleSave}>
        <DialogContent sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 2, 
          pt: 1 
          }}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            size="small"
            fullWidth
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button 
          onClick={onClose} 
          sx={{ 
            textTransform: 'none', 
            borderRadius: '10px', 
            fontWeight: 600 
            }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            sx={{ 
              textTransform: 'none', 
              borderRadius: '10px', 
              fontWeight: 700 
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};