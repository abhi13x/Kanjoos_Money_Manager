import { type FC, useState, useMemo } from 'react';
import type { Category } from '@/db/schema';
import { db } from '@/db/schema';
import { 
  Box, 
  Button, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  TextField, 
  Typography,
  IconButton,
  MenuItem,
  Chip
} from '@mui/material';
import { X, FolderTree, Tag, CornerDownRight } from 'lucide-react';

interface AddCategoryModalProps {
  open: boolean;
  type: 'income' | 'expense';
  parentCategory?: Category | null;
  allCategories?: Category[];
  onClose: () => void;
}

export const AddCategoryModal: FC<AddCategoryModalProps> = ({
  open,
  type,
  parentCategory = null,
  allCategories = [],
  onClose,
}) => {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [wasOpen, setWasOpen] = useState(open);

  // Reset form fields whenever the modal transitions from closed to open (derived-state-during-render)
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setParentId(parentCategory?.id ?? '');
      setName('');
    }
  }

  // Filter root categories of matching type for optional parent selection
  const availableParents = useMemo(() => {
    return allCategories.filter(
      (cat) => cat.type === type && !cat.parentId && cat.id !== parentCategory?.id
    );
  }, [allCategories, type, parentCategory]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await db.categories.add({
        id: crypto.randomUUID(),
        name: name.trim(),
        type,
        parentId: parentId || undefined,
        updatedAt: Date.now(), // ✅ added
      });

      setName('');
      setParentId('');
      onClose();
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const isIncome = type === 'income';

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xs" 
      fullWidth 
      slotProps={{ 
        backdrop: {
          sx: {
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
          },
        },
        paper: { 
          sx: { 
            borderRadius: '24px',
            p: 0.5,
            backgroundImage: 'none',
            bgcolor: 'background.paper',
            boxShadow: '0px 16px 36px rgba(0, 0, 0, 0.12)',
            border: '1px solid',
            borderColor: 'divider',
          } 
        } 
      }}
    >
      {/* iOS/Desktop Navigation Bar Header */}
      <DialogTitle 
        sx={{ 
          m: 0, 
          p: 2, 
          pb: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justify: 'space-between' 
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip 
            label={isIncome ? 'Income' : 'Expense'} 
            size="small"
            color={isIncome ? 'success' : 'error'}
            sx={{ fontWeight: 700, borderRadius: '8px', height: 24, fontSize: '0.75rem' }}
          />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
            {parentCategory ? 'Add Subcategory' : 'New Category'}
          </Typography>
        </Box>
        <IconButton 
          onClick={onClose} 
          size="small" 
          aria-label="close"
          sx={{ 
            color: 'text.secondary',
            bgcolor: 'action.hover',
            '&:hover': { bgcolor: 'action.selected' },
            borderRadius: '50%',
            width: 44,
            height: 44,
          }}
        >
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleAdd}>
        <DialogContent sx={{ px: 2.5, py: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          
          {/* Parent Context Display or Dynamic Selection */}
          {parentCategory ? (
            <Box 
              sx={{ 
                p: 1.5, 
                borderRadius: '14px', 
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5 
              }}
            >
              <FolderTree size={18} style={{ opacity: 0.7 }} />
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', lineHeight: 1 }}>
                  Parent Category
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
                  {parentCategory.name}
                </Typography>
              </Box>
            </Box>
          ) : (
            availableParents.length > 0 && (
              <TextField
                select
                label="Parent Category (Optional)"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                fullWidth
                size="small"
                slotProps={{
                  input: {
                    sx: { borderRadius: '12px', fontSize: '0.9rem' }
                  }
                }}
              >
                <MenuItem value="">
                  <em>None (Top Level Category)</em>
                </MenuItem>
                {availableParents.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </TextField>
            )
          )}

          {/* Input field with rounded styling */}
          <TextField
            label={(parentCategory || parentId) ? 'Subcategory Name' : 'Category Name'}
            placeholder={(parentCategory || parentId) ? 'e.g., Dining Out, Groceries' : 'e.g., Food, Utilities'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            fullWidth
            variant="outlined"
            slotProps={{
              input: {
                startAdornment: (parentCategory || parentId) ? (
                  <CornerDownRight size={18} style={{ marginRight: 8, opacity: 0.6 }} />
                ) : (
                  <Tag size={18} style={{ marginRight: 8, opacity: 0.6 }} />
                ),
                sx: { 
                  borderRadius: '14px',
                  fontWeight: 500,
                  bgcolor: 'action.hover',
                  '& fieldset': { borderColor: 'transparent' },
                  '&:hover fieldset': { borderColor: 'divider' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main' }
                }
              }
            }}
          />
        </DialogContent>

        {/* Desktop / iOS Dialog Action Group */}
        <DialogActions sx={{ p: 2.5, pt: 1, gap: 1.5 }}>
          <Button 
            onClick={onClose} 
            fullWidth 
            variant="text"
            sx={{ 
              textTransform: 'none', 
              borderRadius: '12px', 
              fontWeight: 600,
              color: 'text.secondary',
              py: 1.2,
              bgcolor: 'action.hover',
              '&:hover': { bgcolor: 'action.selected' }
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disableElevation
            fullWidth
            color={isIncome ? 'success' : 'error'}
            disabled={!name.trim()}
            sx={{ 
              textTransform: 'none', 
              borderRadius: '12px', 
              fontWeight: 700, 
              py: 1.2 
            }}
          >
            Save Category
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default AddCategoryModal;