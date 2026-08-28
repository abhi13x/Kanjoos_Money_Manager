import type { Transaction } from '@/db/schema';

interface GroupDataProps {
    items: Transaction[];
    netCents: number;
    totalIncome: number;
    totalExpense: number;
}

export const GroupData = (
    { value, filteredTx }: { value: number; filteredTx: Transaction[] }
): Record<string, GroupDataProps> => {
    const groups: Record<string, GroupDataProps> = {};
    
        filteredTx.forEach((tx) => {
          const dateObj = new Date(tx.date);
          let key = '';
    
          if (value === 0) { // daily
            key = dateObj.toLocaleDateString(undefined, {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
          } else if (value === 1) { // monthly
            key = dateObj.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
          } else { // yearly
            key = dateObj.getFullYear().toString();
          }
    
          if (!groups[key]) {
            groups[key] = { items: [], netCents: 0, totalIncome: 0, totalExpense: 0 };
          }
    
          groups[key].items.push(tx);
    
          // Compute group net impact and absolute totals
          const multiplier = tx.type === 'income' ? 1 : tx.type === 'expense' ? -1 : 0;
          groups[key].netCents += tx.amount * multiplier;
          
          if (tx.type === 'income') groups[key].totalIncome += tx.amount;
          if (tx.type === 'expense') groups[key].totalExpense += tx.amount;
        });
    
        return groups;
}