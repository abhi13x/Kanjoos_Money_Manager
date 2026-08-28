import type { Category, Transaction } from '@/db/schema';
import { getParentId, transactionMatchesCategory } from './Helper';
import { CATEGORY_COLORS } from '../../../constants/statsTab';

export type StatType = 'expense' | 'income';

export interface SortedCategoryOption {
  id: string;
  label: string;
  isSub: boolean;
}

export interface SubCategoryBreakdown {
  id: string;
  name: string;
  amount: number;
  percentageOfTotal: number;
}

export interface CategoryBreakdownItem {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
  subCategories: SubCategoryBreakdown[];
}

type ExtendedCategory = Category & { color?: string; parentId?: string | null };
type ExtendedTransaction = Transaction & { subCategoryId?: string | null };

/** Safe float rounding to avoid JavaScript precision issues */
const roundToTwoDecimals = (val: number): number => Math.round((val + Number.EPSILON) * 100) / 100;

/**
 * Strictly orders category dropdown options:
 * Parents first (alphabetically), with subcategories nested directly below each parent (alphabetically).
 */
export const getSortedCategoryOptions = (
  categories: Category[],
  statType: StatType
): SortedCategoryOption[] => {
  const filtered = categories.filter((c) => c.type === statType);
  
  const parentCategories = filtered
    .filter((c) => !getParentId(c))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return parentCategories.flatMap((parent) => {
    const parentOption: SortedCategoryOption = {
      id: parent.id,
      label: parent.name,
      isSub: false,
    };

    const subCategories = filtered
      .filter((c) => getParentId(c) === parent.id)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      .map((sub) => ({
        id: sub.id,
        label: sub.name,
        isSub: true,
      }));

    return [parentOption, ...subCategories];
  });
};

/**
 * Functional, highly-optimized category expenditure breakdown generator using Map primitives.
 */
export const getCategoryBreakdown = (
  breakdownFilteredTx: Transaction[],
  categories: Category[],
  selectedCategory: string
): CategoryBreakdownItem[] => {
  const categoryLookupMap = new Map<string, ExtendedCategory>(
    categories.map((c) => [c.id, c])
  );

  type AccValue = {
    id: string;
    name: string;
    amount: number;
    customColor?: string;
    subMap: Map<string, { id: string; name: string; amount: number }>;
  };

  const parentAggregatesMap = new Map<string, AccValue>();
  let totalAmount = 0;

  for (const tx of breakdownFilteredTx) {
    if (!transactionMatchesCategory(tx, selectedCategory, categories)) {
      continue;
    }

    const txExt = tx as ExtendedTransaction;
    // Null-safe lookup for optional categoryId
    const txCat = tx.categoryId ? categoryLookupMap.get(tx.categoryId) : undefined;
    const txSubCat = txExt.subCategoryId ? categoryLookupMap.get(txExt.subCategoryId) : undefined;

    let parentId: string;
    let parentName: string;
    let parentColor: string | undefined;
    let subId: string | null = null;
    let subName: string | null = null;

    if (txSubCat) {
      subId = txSubCat.id;
      subName = txSubCat.name;
      const pId = getParentId(txSubCat);
      const targetParentId = pId || tx.categoryId;
      const pCat = targetParentId ? categoryLookupMap.get(targetParentId) : undefined;

      parentId = pCat?.id ?? tx.categoryId ?? 'uncategorized';
      parentName = pCat?.name ?? 'Uncategorized';
      parentColor = pCat?.color;
    } else if (txCat) {
      const pId = getParentId(txCat);
      if (pId) {
        subId = txCat.id;
        subName = txCat.name;
        const pCat = categoryLookupMap.get(pId);
        parentId = pCat?.id ?? txCat.id;
        parentName = pCat?.name ?? txCat.name;
        parentColor = pCat?.color ?? txCat.color;
      } else {
        parentId = txCat.id;
        parentName = txCat.name;
        parentColor = txCat.color;
      }
    } else {
      parentId = 'uncategorized';
      parentName = 'Uncategorized';
    }

    let existingParent = parentAggregatesMap.get(parentId);
    if (!existingParent) {
      existingParent = {
        id: parentId,
        name: parentName,
        amount: 0,
        customColor: parentColor,
        subMap: new Map(),
      };
      parentAggregatesMap.set(parentId, existingParent);
    }

    existingParent.amount += tx.amount;
    totalAmount += tx.amount;

    if (subId && subName) {
      const existingSub = existingParent.subMap.get(subId);
      if (existingSub) {
        existingSub.amount += tx.amount;
      } else {
        existingParent.subMap.set(subId, { id: subId, name: subName, amount: tx.amount });
      }
    }
  }

  return Array.from(parentAggregatesMap.values())
    .map((parent, index) => {
      const percentage = totalAmount > 0 ? roundToTwoDecimals((parent.amount / totalAmount) * 100) : 0;
      const color = parent.customColor || CATEGORY_COLORS[index % CATEGORY_COLORS.length];

      const subCategories: SubCategoryBreakdown[] = Array.from(parent.subMap.values())
        .map((sub) => ({
          id: sub.id,
          name: sub.name,
          amount: sub.amount,
          percentageOfTotal: totalAmount > 0 ? roundToTwoDecimals((sub.amount / totalAmount) * 100) : 0,
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

export const getSelectedCategoryName = (
  selectedCategory: string,
  categories: Category[]
): string => {
  if (selectedCategory === 'all') return 'All Categories';
  return categories.find((c) => c.id === selectedCategory)?.name ?? 'Category';
};