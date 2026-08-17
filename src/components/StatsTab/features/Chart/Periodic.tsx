import { transactionMatchesCategory } from '../Helper';

export const getPeriodicData = (baseTx, selectedCategory, groupBy, categories) => {
    const summary = baseTx.reduce((acc, tx) => {
      const dateObj = new Date(tx.date);
      if (isNaN(dateObj.getTime())) return acc;

      if (!transactionMatchesCategory(tx, selectedCategory, categories)) {
        return acc;
      }

      const key =
        groupBy === 'month'
          ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
          : `${dateObj.getFullYear()}`;

      acc[key] = (acc[key] || 0) + tx.amount;
      return acc;
    }, {} as Record<string, number>);

    const sortedKeys = Object.keys(summary).sort();
    const limitedKeys = groupBy === 'month' ? sortedKeys.slice(-12) : sortedKeys.slice(-6);

    return limitedKeys.map((key) => {
      let label = key;
      if (groupBy === 'month') {
        const [year, month] = key.split('-');
        const dateObj = new Date(Number(year), Number(month) - 1, 1);
        label = dateObj.toLocaleString('default', { month: 'short', year: '2-digit' });
      }
      return { label, val: summary[key], rawKey: key };
    });
  };
