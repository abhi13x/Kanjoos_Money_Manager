// features/CategoryManager.ts

import type { Transaction, Category } from "@/db/schema";

// System Palette Fallbacks for Category Visuals
export const DEFAULT_CATEGORY_COLORS = [
  "#007AFF", // System Blue
  "#FF9500", // System Orange
  "#AF52DE", // System Purple
  "#34C759", // System Green
  "#FF2D55", // System Pink
  "#5856D6", // System Indigo
  "#00C7BE", // System Teal
  "#FFCC00", // System Yellow
];

export interface SubCategoryItem {
  id: string | number;
  name: string;
  amount: number;
  percentage?: number;
}

export interface CategoryBreakdownItem {
  id: string | number;
  name: string;
  amount: number;
  percentage: number;
  color?: string;
  subCategories?: SubCategoryItem[];
}

export interface PieSlice {
  id: string | number;
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface SortedCategoryOption {
  id: string | number;
  label: string;
  value?: string | number;
  parentId?: string | number | null;
  isParent?: boolean;
  type?: "expense" | "income";
  color?: string;
}

/**
 * Returns the human-readable display name for the currently selected category option.
 */
export const getSelectedCategoryName = (
  selectedCategory: string | number,
  categories: Category[]
): string => {
  if (!selectedCategory || selectedCategory === "all") {
    return "All Categories";
  }

  const foundCategory = categories.find(
    (cat) => String(cat.id) === String(selectedCategory)
  );

  return foundCategory ? foundCategory.name : "All Categories";
};

/**
 * Generates a hierarchically ordered list of parent and child categories for control selectors.
 */
export const getSortedCategoryOptions = (
  categories: Category[],
  statType: "expense" | "income"
): SortedCategoryOption[] => {
  const filteredCategories = categories.filter((cat) => cat.type === statType);
  const parentCategories = filteredCategories.filter((cat) => !cat.parentId);

  const childrenMap = new Map<string | number, Category[]>();
  filteredCategories.forEach((cat) => {
    if (cat.parentId) {
      const existing = childrenMap.get(cat.parentId) || [];
      existing.push(cat);
      childrenMap.set(cat.parentId, existing);
    }
  });

  const sortedOptions: SortedCategoryOption[] = [
    {
      id: "all",
      label: "All Categories",
      value: "all",
      isParent: true,
      type: statType,
    },
  ];

  parentCategories
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((parent) => {
      sortedOptions.push({
        id: parent.id,
        label: parent.name,
        value: parent.id,
        parentId: null,
        isParent: true,
        type: parent.type as "expense" | "income",
        color: parent.color ?? undefined,
      });

      const children = childrenMap.get(parent.id) || [];
      children
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((child) => {
          sortedOptions.push({
            id: child.id,
            label: `— ${child.name}`,
            value: child.id,
            parentId: parent.id,
            isParent: false,
            type: child.type as "expense" | "income",
            color: child.color ?? undefined,
          });
        });
    });

  return sortedOptions;
};

/**
 * Aggregates transaction data into main category breakdown or child category breakdown when filtered.
 */
export const getCategoryBreakdown = (
  transactions: Transaction[],
  categories: Category[],
  selectedCategory: string | number
): CategoryBreakdownItem[] => {
  if (!transactions || transactions.length === 0) return [];

  const categoryMap = new Map<string, Category>();
  categories.forEach((cat) => categoryMap.set(String(cat.id), cat));

  const isFilteredByParent = selectedCategory !== "all" && selectedCategory !== "";

  if (isFilteredByParent) {
    const childCategories = categories.filter(
      (cat) => String(cat.parentId) === String(selectedCategory)
    );
    const childIds = new Set(childCategories.map((cat) => String(cat.id)));
    const subCategoryAmounts = new Map<string, number>();
    let filteredTotal = 0;

    transactions.forEach((tx) => {
      const txCatId = String(tx.categoryId);
      if (childIds.has(txCatId) || txCatId === String(selectedCategory)) {
        const amt = Math.abs(tx.amount);
        filteredTotal += amt;
        const targetKey = childIds.has(txCatId) ? txCatId : String(selectedCategory);
        subCategoryAmounts.set(
          targetKey,
          (subCategoryAmounts.get(targetKey) || 0) + amt
        );
      }
    });

    const breakdown: CategoryBreakdownItem[] = [];
    subCategoryAmounts.forEach((amt, catId) => {
      const cat = categoryMap.get(catId);
      if (amt > 0) {
        breakdown.push({
          id: catId,
          name: cat ? cat.name : "Uncategorized",
          amount: amt,
          percentage: filteredTotal > 0 ? (amt / filteredTotal) * 100 : 0,
          color: cat?.color ?? undefined,
        });
      }
    });

    // Always return here: selecting a leaf category (no children) should show just
    // that category's own breakdown, not silently fall back to the full unfiltered view.
    return breakdown.sort((a, b) => b.amount - a.amount);
  }

  const parentTotals = new Map<
    string,
    { amount: number; subCats: Map<string, number> }
  >();
  let grandTotal = 0;

  transactions.forEach((tx) => {
    const amt = Math.abs(tx.amount);
    grandTotal += amt;

    const cat = categoryMap.get(String(tx.categoryId));
    const parentId = cat
      ? cat.parentId
        ? String(cat.parentId)
        : String(cat.id)
      : "uncategorized";

    if (!parentTotals.has(parentId)) {
      parentTotals.set(parentId, { amount: 0, subCats: new Map() });
    }

    const parentRecord = parentTotals.get(parentId)!;
    parentRecord.amount += amt;

    if (cat && cat.parentId) {
      const childId = String(cat.id);
      parentRecord.subCats.set(
        childId,
        (parentRecord.subCats.get(childId) || 0) + amt
      );
    }
  });

  const breakdown: CategoryBreakdownItem[] = [];

  parentTotals.forEach((data, parentId) => {
    const parentCat = categoryMap.get(parentId);
    const subCategories: SubCategoryItem[] = [];

    data.subCats.forEach((subAmt, subId) => {
      const subCat = categoryMap.get(subId);
      subCategories.push({
        id: subId,
        name: subCat ? subCat.name : "Other",
        amount: subAmt,
        percentage: data.amount > 0 ? (subAmt / data.amount) * 100 : 0,
      });
    });

    breakdown.push({
      id: parentId,
      name: parentCat ? parentCat.name : "Uncategorized",
      amount: data.amount,
      percentage: grandTotal > 0 ? (data.amount / grandTotal) * 100 : 0,
      color: parentCat?.color ?? undefined,
      subCategories: subCategories.sort((a, b) => b.amount - a.amount),
    });
  });

  return breakdown.sort((a, b) => b.amount - a.amount);
};

/**
 * Computes individual pie slices for donut chart rendering.
 */
export const getPieSlices = (
  categoryBreakdown: CategoryBreakdownItem[],
  totalBreakdownAmount: number
): PieSlice[] => {
  const firstItem = categoryBreakdown[0];
  const subCategories = firstItem?.subCategories;

  if (categoryBreakdown.length === 1 && subCategories && subCategories.length > 0) {
    return subCategories.map((sub, idx) => ({
      id: sub.id,
      name: sub.name,
      amount: sub.amount,
      percentage: totalBreakdownAmount > 0 ? (sub.amount / totalBreakdownAmount) * 100 : 0,
      color: DEFAULT_CATEGORY_COLORS[idx % DEFAULT_CATEGORY_COLORS.length],
    }));
  }

  return categoryBreakdown.map((item, idx) => ({
    id: item.id,
    name: item.name,
    amount: item.amount,
    percentage: item.percentage,
    color: item.color || DEFAULT_CATEGORY_COLORS[idx % DEFAULT_CATEGORY_COLORS.length],
  }));
};