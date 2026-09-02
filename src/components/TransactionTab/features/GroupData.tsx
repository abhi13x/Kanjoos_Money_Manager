import type { Transaction } from '@/db/schema';

export interface GroupDataProps {
  items: Transaction[];
  netCents: number;
  totalIncome: number;
  totalExpense: number;
}

export type GroupedDataMap = Record<string, GroupDataProps>;

const dailyFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const monthlyFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
});

const parseTxDate = (dateVal: string | number | Date): Date => {
  if (dateVal instanceof Date) return dateVal;
  if (typeof dateVal === 'number') return new Date(dateVal);

  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    const [y, m, d] = dateVal.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  return new Date(dateVal);
};

export const GroupData = ({
  value,
  filteredTx,
}: {
  value: number;
  filteredTx: Transaction[];
}): GroupedDataMap => {
  const groups: GroupedDataMap = {};

  filteredTx.forEach((tx) => {
    const dateObj = parseTxDate(tx.date);
    let key: string;

    if (value === 0) {
      key = dailyFormatter.format(dateObj);
    } else if (value === 1) {
      key = monthlyFormatter.format(dateObj);
    } else {
      key = dateObj.getFullYear().toString();
    }

    if (!groups[key]) {
      groups[key] = {
        items: [],
        netCents: 0,
        totalIncome: 0,
        totalExpense: 0,
      };
    }

    groups[key].items.push(tx);

    const multiplier = tx.type === 'income' ? 1 : tx.type === 'expense' ? -1 : 0;
    groups[key].netCents += tx.amount * multiplier;

    if (tx.type === 'income') groups[key].totalIncome += tx.amount;
    if (tx.type === 'expense') groups[key].totalExpense += tx.amount;
  });

  return groups;
};