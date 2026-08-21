import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, TextField,
  Button, MenuItem, List, ListItem, ListItemText, IconButton,
  Divider,
} from '@mui/material';
import { Plus, Trash2, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { db, type Category } from '@/db/schema';

interface CategoriesTabProps {
  categories: Category[];
  onBack: () => void;
}

const CategorySection: React.FC<{
  type: 'income' | 'expense';
  title: string;
  icon: React.ReactNode;
  color: string;
  categories: Category[];
  allCategories: Category[];
  onDelete: (id: string) => void;
}> = ({ type, title, icon, color, categories, allCategories, onDelete }) => {
  const [newName, setNewName] = useState('');
  const [parentId, setParentId] = useState('');

  const roots = categories.filter((c) => !c.parentId);
  const getChildren = (rootId: string) => categories.filter((c) => c.parentId === rootId);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    await db.categories.add({
      id: crypto.randomUUID(),
      name: newName.trim(),
      type,
      parentId: parentId || undefined,
    });

    setNewName('');
    setParentId('');
  };

  return (
    <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
      <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ p: 1, bgcolor: `${color}14`, color, borderRadius: '10px', display: 'flex' }}>
            {icon}
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{title}</Typography>
          <Typography variant="caption" sx={{ ml: 'auto', fontWeight: 700, color: 'text.secondary' }}>
            {categories.length} total
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleAdd} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            label="Category Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            size="small"
            fullWidth
          />
          <TextField
            select
            label="Nest as Sub-category"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            size="small"
            fullWidth
          >
            <MenuItem value=""><em>None (Root)</em></MenuItem>
            {allCategories
              .filter((c) => c.type === type && !c.parentId)
              .map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
          </TextField>
          <Button
            type="submit"
            variant="contained"
            color={type === 'income' ? 'success' : 'error'}
            startIcon={<Plus size={16} />}
            sx={{ borderRadius: '12px', fontWeight: 700, py: 1, textTransform: 'none' }}
          >
            Add {type === 'income' ? 'Income' : 'Expense'} Category
          </Button>
        </Box>

        <Divider />

        <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
          {roots.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', py: 2, textAlign: 'center' }}>
              No {type} categories yet.
            </Typography>
          ) : (
            <List disablePadding>
              {roots.map((root) => (
                <Box key={root.id}>
                  <ListItem sx={{ py: 0.5, px: 1, display: 'flex', justifyContent: 'space-between' }}>
                    <ListItemText
                      primary={root.name}
                      slotProps={{ primary: { sx: { fontWeight: 700, fontSize: '0.9rem' } } }}
                    />
                    <IconButton size="small" color="error" onClick={() => onDelete(root.id)}>
                      <Trash2 size={14} />
                    </IconButton>
                  </ListItem>
                  {getChildren(root.id).map((child) => (
                    <ListItem key={child.id} sx={{ py: 0.25, px: 1, pl: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <ListItemText
                        primary={`↳ ${child.name}`}
                        slotProps={{ primary: { sx: { fontWeight: 500, fontSize: '0.85rem', color: 'text.secondary' } } }}
                      />
                      <IconButton size="small" color="error" onClick={() => onDelete(child.id)}>
                        <Trash2 size={14} />
                      </IconButton>
                    </ListItem>
                  ))}
                </Box>
              ))}
            </List>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export const CategoriesTab: React.FC<CategoriesTabProps> = ({ categories, onBack }) => {
  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category? Sub-categories will be unlinked.')) return;

    await db.categories.delete(id);
    const children = categories.filter((c) => c.parentId === id);
    for (const child of children) {
      await db.categories.update(child.id, { parentId: undefined });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowLeft size={18} />}
          onClick={onBack}
          sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '12px' }}
        >
          Back to Settings
        </Button>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Manage Categories</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <CategorySection
            type="income"
            title="Income"
            icon={<TrendingUp size={18} />}
            color="#4CAF50"
            categories={incomeCategories}
            allCategories={categories}
            onDelete={handleDeleteCategory}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <CategorySection
            type="expense"
            title="Expense"
            icon={<TrendingDown size={18} />}
            color="#F44336"
            categories={expenseCategories}
            allCategories={categories}
            onDelete={handleDeleteCategory}
          />
        </Grid>
      </Grid>
    </Box>
  );
};
