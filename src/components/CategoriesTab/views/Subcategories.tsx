import React, { useMemo } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  IconButton, 
  Divider, 
  Stack, 
  Paper 
} from '@mui/material';
import { Pencil, GripVertical, Trash2, FolderOpen, CornerDownRight } from 'lucide-react';
import type { Category } from '@/db/schema';

interface SubcategoriesProps {
  getSubcategories: (parentId: string) => Category[];
  selectedParentCategory: Category;
  handleDeleteCategory: (id: string) => void;
  setEditingCategory: (category: Category) => void;
}

export const Subcategories: React.FC<SubcategoriesProps> = ({ 
  getSubcategories, 
  selectedParentCategory, 
  handleDeleteCategory, 
  setEditingCategory 
}) => {
  const subcategories = useMemo(
    () => getSubcategories(selectedParentCategory.id),
    [getSubcategories, selectedParentCategory.id]
  );

  // Empty State Container
  if (subcategories.length === 0) {
    return (
      <Box 
        sx={{ 
          py: 4, 
          px: 2, 
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
          borderRadius: '18px',
          bgcolor: 'action.hover',
          border: '1px stroke',
          borderColor: 'divider',
          my: 1
        }}
      >
        <FolderOpen size={32} style={{ opacity: 0.4 }} />
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            No Subcategories
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
            Tap + to create a subcategory under {selectedParentCategory.name}.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '18px',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        my: 1
      }}
    >
      <List disablePadding>
        {subcategories.map((sub, index) => (
          <React.Fragment key={sub.id}>
            {index > 0 && <Divider component="li" sx={{ ml: 6 }} />}
            <ListItem
              sx={{
                py: 1.25,
                px: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'background-color 0.15s ease',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              {/* Category label and action */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <IconButton
                  size="small"
                  aria-label={`Delete ${sub.name}`}
                  onClick={() => handleDeleteCategory(sub.id)}
                  sx={{ 
                    color: 'error.main',
                    width: 44,
                    height: 44,
                    borderRadius: '10px',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <Trash2 size={16} />
                </IconButton>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CornerDownRight size={14} style={{ opacity: 0.4 }} />
                  <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary' }}>
                    {sub.name}
                  </Typography>
                </Box>
              </Box>

              {/* Edit and Reorder Drag Handle */}
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <IconButton 
                  size="small" 
                  aria-label={`Edit ${sub.name}`}
                  onClick={() => setEditingCategory(sub)}
                  sx={{ 
                    color: 'text.secondary',
                    width: 44,
                    height: 44,
                    borderRadius: '10px',
                    '&:hover': { bgcolor: 'action.selected', color: 'text.primary' }
                  }}
                >
                  <Pencil size={16} />
                </IconButton>
                <IconButton 
                  size="small" 
                  aria-label="Reorder subcategory"
                  sx={{ 
                    color: 'text.disabled',
                    cursor: 'grab',
                    width: 44,
                    height: 44,
                    borderRadius: '10px',
                    '&:active': { cursor: 'grabbing' },
                    '&:hover': { color: 'text.secondary' }
                  }}
                >
                  <GripVertical size={16} />
                </IconButton>
              </Stack>
            </ListItem>
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default Subcategories;