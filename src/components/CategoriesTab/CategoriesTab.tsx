/**
 * CategoriesTab Component
 * 
 * This component manages the display and manipulation of income and expense categories.
 * It allows users to view, add, edit, and delete categories and subcategories.
 * 
 * The component is split into several views for better modularity:
 *   - TopHeaderNav: handles navigation and modal controls
 *   - TabSelector: switches between income and expense tabs
 *   - MainCategory: displays list of main categories
 *   - Subcategories: displays subcategories of a selected main category
 *   - AddCategoryModal: modal for adding new categories
 *   - EditCategoryModal: modal for editing category names
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Box, Card, CardContent } from '@mui/material';
import { db, type Category } from '@/db/schema';
import { TopHeaderNav } from './views/TopHeaderNav';
import { AddCategoryModal } from './views/AddCategoryModal';
import { EditCategoryModal } from './views/EditCategoryModal';
import { TabSelector } from './views/TabSelector';
import { MainCategory } from './views/MainCategory';
import { Subcategories } from './views/Subcategories';

interface CategoriesTabProps {
  categories: Category[];
  onBack: () => void;
}

export const CategoriesTab: React.FC<CategoriesTabProps> = ({ categories, onBack }) => {
  /**
   * State Variables
   *   activeTab: currently selected tab ('expense' or 'income')
   *   selectedParentCategory: the category whose subcategories are being viewed (null for root)
   *   editingCategory: the category currently being edited (null if none)
   *   addModalState: controls the add category modal (open, type, parentCategory)
   */
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [selectedParentCategory, setSelectedParentCategory] = useState<Category | null>(null);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [addModalState, setAddModalState] = useState<{
    open: boolean;
    type: 'income' | 'expense';
    parentCategory?: Category | null;
  }>({
    open: false,
    type: 'expense',
    parentCategory: null,
  });

  /**
 * Memoized Values and Callbacks
 *   filteredCategories: categories filtered by activeTab (income/expense)
 *   rootCategories: top-level categories (no parentId)
 *   getSubcategories: returns subcategories for a given parentId
 */
// Memoize filtered and root categories for performance optimization
  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === activeTab),
    [categories, activeTab]
  );

  const rootCategories = useMemo(
    () => filteredCategories.filter((c) => !c.parentId),
    [filteredCategories]
  );

  const getSubcategories = useCallback(
    (parentId: string) => {
      return categories.filter((c) => c.parentId === parentId);
    },
    [categories]
  );

  /**
   * Delete Category Handler
   *   Deletes a category and its associated subcategories
   *   @param id - The ID of the category to delete
   */
  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category? Associated subcategories will also be deleted.')) return;

    try {
      await db.categories.delete(id);
      const children = categories.filter((c) => c.parentId === id);
      for (const child of children) {
        await db.categories.delete(child.id);
      }
      
      // Reset selected parent state if deleting the active parent category
      if (selectedParentCategory?.id === id) {
        setSelectedParentCategory(null);
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  return (
    <Box 
      sx={{
        maxWidth: 600, 
        mx: 'auto', 
        px: { xs: 2, sm: 3 },
        py: 2,
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2 
      }}
    >
      {/* Top Header Navigation */}
      <TopHeaderNav
        selectedParentCategory={selectedParentCategory}
        activeTab={activeTab}
        onBack={onBack}
        setSelectedParentCategory={setSelectedParentCategory}
        setAddModalState={setAddModalState}
      />

      {/* Tabs Selector (Income / Expense) when at root level */}
      {!selectedParentCategory && (
        <TabSelector 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Main Content Card Container */}
      <Card 
        elevation={0}
        sx={{ 
          borderRadius: '20px', 
          border: '1px solid', 
          borderColor: 'divider',
          bgcolor: 'background.paper',
          overflow: 'hidden'
        }}
      >
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {!selectedParentCategory ? (
            /* LIST VIEW: Main Categories */
            <MainCategory
              rootCategories={rootCategories}
              getSubcategories={getSubcategories}
              setSelectedParentCategory={setSelectedParentCategory}
              handleDeleteCategory={handleDeleteCategory}
              setEditingCategory={setEditingCategory}
            />
          ) : (
            /* DRILL-DOWN VIEW: Subcategories of selected category */
            <Subcategories
              getSubcategories={getSubcategories}
              selectedParentCategory={selectedParentCategory}
              handleDeleteCategory={handleDeleteCategory}
              setEditingCategory={setEditingCategory}
            />
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <AddCategoryModal
        open={addModalState.open}
        type={addModalState.type}
        parentCategory={addModalState.parentCategory}
        allCategories={categories}
        onClose={() => setAddModalState((prev) => ({ ...prev, open: false }))}
      />

      {/* Edit Dialog */}
      <EditCategoryModal
        open={Boolean(editingCategory)}
        category={editingCategory}
        onClose={() => setEditingCategory(null)}
      />
    </Box>
  );
};

export default CategoriesTab;