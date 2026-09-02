import type { Transaction, Category } from '@/db/schema';

// Helper: Resolve parent category ID across database schemas
export const getParentId = (cat: Category): string | null => {
  return cat.parentId ?? null;
};

// Helper: Get target category ID + all sub-category IDs linked to it
export const getCategoryFamilyIds = (categoryId: string, categories: Category[]): Set<string> => {
  const family = new Set<string>([categoryId]);
  categories.forEach((c) => {
    const parentId = getParentId(c);
    if (parentId && parentId === categoryId) {
      family.add(c.id);
    }
  });
  return family;
};

// Helper: Check if a transaction belongs to the selected filter category or subcategory
export const transactionMatchesCategory = (
  tx: Transaction,
  selectedCatId: string,
  categories: Category[]
): boolean => {
  if (selectedCatId === 'all') return true;

  const familyIds = getCategoryFamilyIds(selectedCatId, categories);
  
  // Safely assign optional string fields with fallback to empty string
  const txCatId: string = tx.categoryId ?? '';
  const txSubCatId: string = tx.subCategoryId ?? '';

  if (txCatId && familyIds.has(txCatId)) return true;
  if (txSubCatId && familyIds.has(txSubCatId)) return true;

  return false;
};

// Helper: Compute dynamic Y-axis scale ticks
export const getNiceYAxis = (maxValue: number, targetTicks = 4) => {
  if (maxValue <= 0) {
    return { ticks: [1000, 500, 0], max: 1000 };
  }

  const rawInterval = maxValue / (targetTicks - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)));
  const norm = rawInterval / magnitude;

  let niceStep: number;
  if (norm > 5) niceStep = 10 * magnitude;
  else if (norm > 2.5) niceStep = 5 * magnitude;
  else if (norm > 1.25) niceStep = 2 * magnitude;
  else niceStep = magnitude;

  const maxTick = Math.ceil(maxValue / niceStep) * niceStep;
  const ticks: number[] = [];

  for (let val = maxTick; val >= 0; val -= niceStep) {
    ticks.push(Math.round(val));
  }

  return { ticks, max: maxTick || 1 };
}

/** Compact currency formatter for chart axis labels (e.g. 1000000 cents -> ₹10k) */
export const formatCompact = (cents: number): string => {
  const amount = cents / 100;
  if (amount >= 1000000) return `₹${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}k`;
  return `₹${amount}`;
};