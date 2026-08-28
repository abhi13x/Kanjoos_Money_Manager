import React from 'react';
import { 
  Box, Typography, List, 
  ListItem, IconButton, Divider, Stack 
} from '@mui/material';
import { Pencil, GripVertical, MinusCircle } from 'lucide-react';
import type { Category } from '@/db/schema';

export const MainCategory: React.FC<{ 
  rootCategories: Category[], 
  getSubcategories: (parentId: string) => Category[], 
  setSelectedParentCategory: (category: Category) => void,
  handleDeleteCategory: (id: string) => void,
  setEditingCategory: (category: Category) => void
}> = ({ 
  rootCategories, 
  getSubcategories, 
  setSelectedParentCategory, 
  handleDeleteCategory,
  setEditingCategory
}) => {
  return (
    <List disablePadding>
      {rootCategories.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>
          No categories found. Click + to add one.
        </Typography>
      ) : (
        rootCategories.map((root, index) => {
          const subs = getSubcategories(root.id);
          const subNames = subs.map((s) => s.name).join(', ');

          return (
            <React.Fragment key={root.id}>
              {index > 0 && <Divider />}
              <ListItem
                sx={{
                  py: 1.5,
                  px: 2,
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => setSelectedParentCategory(root)}
              >
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.5, 
                  flex: 1 
                  }}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(root.id);
                    }}
                    sx={{ p: 0.5 }}
                  >
                    <MinusCircle size={20} color="#F44336" />
                  </IconButton>

                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      {root.name}
                      {subs.length > 0 && `(${subs.length})`}
                    </Typography>
                    {subNames && (
                      <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'text.secondary', 
                        fontWeight: 500 
                        }}>
                        {subNames}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
                  <IconButton 
                  size="small" 
                  onClick={() => setEditingCategory(root)}
                  >
                    <Pencil size={18} color="#9E9E9E" />
                  </IconButton>
                  <IconButton size="small" sx={{ cursor: 'grab' }}>
                    <GripVertical size={18} color="#CCCCCC" />
                  </IconButton>
                </Stack>
              </ListItem>
            </React.Fragment>
          );
        })
      )}
    </List>
  )
}