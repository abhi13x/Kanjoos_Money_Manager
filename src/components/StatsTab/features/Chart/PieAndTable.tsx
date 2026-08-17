import { CATEGORY_COLORS } from '@/constants/statsTab';

export const getPieSlices = (categoryBreakdown, totalBreakdownAmount) => {
    if (categoryBreakdown.length === 1 && categoryBreakdown[0].subCategories.length > 0) {
        const parent = categoryBreakdown[0];
        return parent.subCategories.map((sub, idx) => ({
            id: sub.id,
            name: sub.name,
            amount: sub.amount,
            percentage: totalBreakdownAmount > 0 ? (sub.amount / totalBreakdownAmount) * 100 : 0,
            color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        }));
    }

    return categoryBreakdown.map((item) => ({
        id: item.id,
        name: item.name,
        amount: item.amount,
        percentage: item.percentage,
        color: item.color,
    }));
};