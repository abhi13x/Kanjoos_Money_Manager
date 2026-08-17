import type { Category, Transaction } from '@/db/schema';
import { getParentId, transactionMatchesCategory } from './Helper';
import { CATEGORY_COLORS } from '../../../constants/statsTab';

export interface SortedCategoryOption {
    id: string;
    label: string;
    isSub: boolean;
}
// Strictly order category dropdown: Parents first, subcategories nested directly below
export const getSortedCategoryOptions = (categories: Category[], statType: 'expense' | 'income'): SortedCategoryOption[] => {
    const filtered = categories.filter((c) => c.type === statType);
    const parentCategories = filtered.filter((c) => !getParentId(c));

    const result: SortedCategoryOption[] = [];

    parentCategories.forEach((parent) => {
        // Add parent category
        result.push({
            id: parent.id,
            label: parent.name,
            isSub: false,
        });

        // Add subcategories
        const subCategories = filtered.filter((c) => getParentId(c) === parent.id);
        subCategories.forEach((sub) => {
            result.push({
                id: sub.id,
                label: sub.name,
                isSub: true,
            });
        });
    });

    return result;
};

export const getCategoryBreakdown = (breakdownFilteredTx: Transaction[], categories: Category[], selectedCategory: string) => {
    const parentMap: Record<
      string,
      {
        id: string;
        name: string;
        amount: number;
        customColor?: string;
        subMap: Record<string, { id: string; name: string; amount: number }>;
      }
    > = {};

    let totalAmount = 0;

    breakdownFilteredTx.forEach((tx) => {
      if (!transactionMatchesCategory(tx, selectedCategory, categories)) {
        return;
      }

      const txCat = categories.find((c) => c.id === tx.categoryId);
      const txSubCat = (tx as any).subCategoryId
        ? categories.find((c) => c.id === (tx as any).subCategoryId)
        : null;

      let parentId: string;
      let parentName: string;
      let parentColor: string | undefined;
      let subId: string | null = null;
      let subName: string | null = null;

      if (txSubCat) {
        subId = txSubCat.id;
        subName = txSubCat.name;
        const pCat = categories.find((c) => c.id === getParentId(txSubCat) || (tx.categoryId && c.id === tx.categoryId));
        parentId = pCat ? pCat.id : (tx.categoryId ?? 'uncategorized');
        parentName = pCat ? pCat.name : 'Uncategorized';
        parentColor = pCat ? (pCat as any).color : undefined;
      } else if (txCat) {
        const pId = getParentId(txCat);
        if (pId) {
          subId = txCat.id;
          subName = txCat.name;
          const pCat = categories.find((c) => c.id === pId);
          parentId = pCat ? pCat.id : txCat.id;
          parentName = pCat ? pCat.name : txCat.name;
          parentColor = pCat ? (pCat as any).color : (txCat as any).color;
        } else {
          parentId = txCat.id;
          parentName = txCat.name;
          parentColor = (txCat as any).color;
        }
      } else {
        parentId = 'uncategorized';
        parentName = 'Uncategorized';
      }

      if (!parentMap[parentId]) {
        parentMap[parentId] = {
          id: parentId,
          name: parentName,
          amount: 0,
          customColor: parentColor,
          subMap: {},
        };
      }

      parentMap[parentId].amount += tx.amount;
      totalAmount += tx.amount;

      if (subId && subName) {
        if (!parentMap[parentId].subMap[subId]) {
          parentMap[parentId].subMap[subId] = { id: subId, name: subName, amount: 0 };
        }
        parentMap[parentId].subMap[subId].amount += tx.amount;
      }
    });

    return Object.values(parentMap)
      .map((parent, index) => {
        const percentage = totalAmount > 0 ? (parent.amount / totalAmount) * 100 : 0;
        const color = parent.customColor || CATEGORY_COLORS[index % CATEGORY_COLORS.length];

        const subCategories = Object.values(parent.subMap)
          .map((sub) => ({
            id: sub.id,
            name: sub.name,
            amount: sub.amount,
            percentageOfTotal: totalAmount > 0 ? (sub.amount / totalAmount) * 100 : 0,
          }))
          .sort((a, b) => b.amount - a.amount);

        return {
          id: parent.id,
          name: parent.name,
          amount: parent.amount,
          percentage,
          color,
          subCategories,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  };

export const getSelectedCategoryName = (selectedCategory: string, categories: Category[]): string => {
    if (selectedCategory === 'all') return 'Overall Category';
    const found = categories.find((c) => c.id === selectedCategory);
    return found ? found.name : 'Category';
  };