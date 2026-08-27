import { transactionMatchesCategory } from '../Helper';

export const getTimelineData = (baseTx, selectedCategory, groupBy, effectivePeriod, categories) => {
        const categoryTx = baseTx.filter((tx) =>
            transactionMatchesCategory(tx, selectedCategory, categories)
        );

        if (categoryTx.length === 0) return [];

        const yearSet = new Set(
            categoryTx.map((tx) => new Date(tx.date).getFullYear()).filter((y) => !isNaN(y))
        );

        if (groupBy === 'year' && effectivePeriod === 'all' && yearSet.size > 1) {
            const yearlyMap: Record<string, number> = {};
            categoryTx.forEach((tx) => {
                const y = new Date(tx.date).getFullYear();
                if (isNaN(y)) return;
                yearlyMap[y] = (yearlyMap[y] || 0) + tx.amount;
            });
            const sortedYears = Object.keys(yearlyMap).sort();
            return sortedYears.map((yr) => ({
                label: yr,
                val: yearlyMap[yr],
                tooltipDate: `Year ${yr}`,
            }));
        }

        if (
            (groupBy === 'year' && effectivePeriod !== 'all') ||
            (groupBy === 'year' && effectivePeriod === 'all' && yearSet.size <= 1) ||
            (groupBy === 'month' && effectivePeriod === 'all')
        ) {
            const targetTx = categoryTx.filter((tx) => {
                if (effectivePeriod === 'all') return true;
                const dateObj = new Date(tx.date);
                if (isNaN(dateObj.getTime())) return false;
                if (groupBy === 'month') {
                    const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                    return key === effectivePeriod;
                } else {
                    return `${dateObj.getFullYear()}` === effectivePeriod;
                }
            });

            const monthlyMap: Record<string, number> = {};
            targetTx.forEach((tx) => {
                const dateObj = new Date(tx.date);
                if (isNaN(dateObj.getTime())) return;
                const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                monthlyMap[key] = (monthlyMap[key] || 0) + tx.amount;
            });

            const sortedKeys = Object.keys(monthlyMap).sort();
            return sortedKeys.map((key) => {
                const [y, m] = key.split('-');
                const dateObj = new Date(Number(y), Number(m) - 1, 1);
                const label = dateObj.toLocaleString('default', { month: 'short' });
                const fullLabel = `${dateObj.toLocaleString('default', { month: 'short' })} ${y}`;
                return {
                    label,
                    val: monthlyMap[key],
                    tooltipDate: fullLabel,
                };
            });
        }

        const targetTx = categoryTx.filter((tx) => {
            const dateObj = new Date(tx.date);
            if (isNaN(dateObj.getTime())) return false;
            const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            return key === effectivePeriod;
        });

        const dailyMap: Record<string, number> = {};
        targetTx.forEach((tx) => {
            const dateObj = new Date(tx.date);
            if (isNaN(dateObj.getTime())) return;

            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            const key = `${year}-${month}-${day}`;

            dailyMap[key] = (dailyMap[key] || 0) + tx.amount;
        });

        const sortedDays = Object.keys(dailyMap).sort();
        return sortedDays.map((dayStr) => {
            const dateObj = new Date(dayStr);
            const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return {
                label,
                val: dailyMap[dayStr],
                tooltipDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            };
        });
};