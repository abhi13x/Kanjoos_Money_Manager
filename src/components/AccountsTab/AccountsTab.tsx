import React, { useState, useMemo, useCallback } from 'react';
import { Alert, Box, Snackbar } from '@mui/material';
import { db, type Account, type AccountType, type InvestmentSubType, type CompoundingFrequency } from '@/db/schema';
import { projectInvestment, resolveInvestmentSubType } from '@/services/investmentService';
import { deleteAccountWithSync, countTransactionsForAccount } from '@/services/financeService';
import { ACCOUNT_CATEGORIES, SUB_TYPE_OPTIONS, getAccountSignedBalance, iOSFont, needsRate } from './features/accountHelpers';
import { AccountsHeader } from './views/AccountsHeader';
import { AccountList } from './views/AccountList';
import { AccountFormDrawer, type AccountFormValues } from './views/AccountFormDrawer';

interface AccountsTabProps {
  accounts: Account[];
  format: (cents: number) => string;
}

export const AccountsTab: React.FC<AccountsTabProps> = ({ accounts, format }) => {
  // ─── State ──────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('savings');
  const [balance, setBalance] = useState('');
  const [repeatDay, setRepeatDay] = useState('');
  const [interest, setInterest] = useState('');
  const [ccStatement, setCcStatement] = useState('');
  const [ccDue, setCcDue] = useState('');
  const [monthlyInvestment, setMonthlyInvestment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [tenureMonths, setTenureMonths] = useState('');
  const [investmentSubType, setInvestmentSubType] = useState<InvestmentSubType | ''>('');
  const [compoundingFrequency, setCompoundingFrequency] = useState<CompoundingFrequency>('quarterly');

  // ─── Computed Values ────────────────────────────────────────
  const totalNetWorthCents = useMemo(
    () => accounts.reduce((sum, acc) => sum + getAccountSignedBalance(acc), 0),
    [accounts]
  );

  const categorizedAccounts = useMemo(
    () =>
      ACCOUNT_CATEGORIES.map((cat) => ({
        ...cat,
        accounts: accounts.filter((acc) => cat.types.includes(acc.type)),
      })),
    [accounts]
  );

  const accountData = useMemo(() => {
    return accounts.map((acc) => ({
      account: acc,
      projection: projectInvestment(acc),
      subType: resolveInvestmentSubType(acc),
    }));
  }, [accounts]);

  // ─── Handlers ─────────────────────────────────────────
  const resetForm = useCallback(() => {
    setName('');
    setType('savings');
    setBalance('');
    setRepeatDay('');
    setInterest('');
    setCcStatement('');
    setCcDue('');
    setMonthlyInvestment('');
    setStartDate('');
    setTenureMonths('');
    setInvestmentSubType('');
    setCompoundingFrequency('quarterly');
  }, []);

  const openAddMode = useCallback(() => {
    setEditingAccount(null);
    resetForm();
    setIsOpen(true);
  }, [resetForm]);

  const openEditMode = useCallback((acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setBalance((acc.currentBalance / 100).toString());
    setRepeatDay(acc.repeatInvestmentDate?.toString() || '');
    setInterest((acc.interestRate ?? acc.expectedReturnRate)?.toString() || '');
    setCcStatement(acc.statementDate?.toString() || '');
    setCcDue(acc.dueDate?.toString() || '');
    setMonthlyInvestment(acc.monthlyInvestment ? (acc.monthlyInvestment / 100).toString() : '');
    setStartDate(acc.startDate ? new Date(acc.startDate).toISOString().slice(0, 10) : '');
    setTenureMonths(acc.tenureMonths?.toString() || '');
    setInvestmentSubType(acc.investmentSubType ?? resolveInvestmentSubType(acc) ?? '');
    setCompoundingFrequency(acc.compoundingFrequency ?? 'quarterly');
    setIsOpen(true);
  }, []);

  const handleTypeChange = useCallback((newType: AccountType) => {
    setType(newType);
    const options = SUB_TYPE_OPTIONS[newType];
    if (options?.length === 1) {
      setInvestmentSubType(options[0].value);
    } else if (!options) {
      setInvestmentSubType('');
    }
  }, []);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);

      const parsedBal = parseFloat(balance);
      if (isNaN(parsedBal) || parsedBal < 0) {
        setError('Please enter a valid positive balance.');
        return;
      }
      const balCents = Math.round(parsedBal * 100);

      const data: Partial<Account> = {
        name: name.trim(),
        type,
        currentBalance: balCents,
        initialBalance: editingAccount ? editingAccount.initialBalance : balCents,
        currency: 'INR',
        updatedAt: Date.now(),
      };

      if (['mutual_fund', 'stock', 'fd_rd', 'scheme'].includes(type)) {
        data.repeatInvestmentDate = parseInt(repeatDay) || undefined;
        data.investmentSubType = investmentSubType || undefined;
        data.tenureMonths = parseInt(tenureMonths) || undefined;
        data.startDate = startDate ? new Date(startDate).getTime() : undefined;
        const parsedMonthly = parseFloat(monthlyInvestment);
        data.monthlyInvestment = !isNaN(parsedMonthly) && parsedMonthly > 0
          ? Math.round(parsedMonthly * 100)
          : undefined;
      }

      if (needsRate(type)) {
        const rate = parseFloat(interest);
        if (['mutual_fund', 'stock'].includes(type)) {
          data.expectedReturnRate = !isNaN(rate) ? rate : undefined;
        } else {
          data.interestRate = !isNaN(rate) ? rate : undefined;
        }
      }

      if (type === 'fd_rd' && investmentSubType === 'fd') {
        data.compoundingFrequency = compoundingFrequency;
      }

      if (type === 'credit_card') {
        data.statementDate = parseInt(ccStatement) || undefined;
        data.dueDate = parseInt(ccDue) || undefined;
      }

      try {
        if (editingAccount) {
          await db.accounts.update(editingAccount.id, data);
          setSuccess('Account updated successfully.');
        } else {
          await db.accounts.add({
            ...(data as Account),
            id: crypto.randomUUID(),
          });
          setSuccess('Account added successfully.');
        }
        setIsOpen(false);
        resetForm();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save account.');
        console.error('Save error:', err);
      }
    },
    [
      name,
      type,
      balance,
      repeatDay,
      interest,
      ccStatement,
      ccDue,
      monthlyInvestment,
      startDate,
      tenureMonths,
      investmentSubType,
      compoundingFrequency,
      editingAccount,
      resetForm,
    ]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const linkedCount = await countTransactionsForAccount(id);
      const message = linkedCount > 0
        ? `Delete this account? It has ${linkedCount} transaction(s) which will also be deleted. This action cannot be undone.`
        : 'Delete this account? This action cannot be undone.';
      if (!window.confirm(message)) return;
      try {
        await deleteAccountWithSync(id);
        setSuccess('Account deleted.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete account.');
        console.error('Delete error:', err);
      }
    },
    []
  );

  const formValues: AccountFormValues = {
    name, type, balance, repeatDay, interest, ccStatement, ccDue,
    monthlyInvestment, startDate, tenureMonths, investmentSubType, compoundingFrequency,
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 4, ...iOSFont }}>
      <AccountsHeader totalNetWorthCents={totalNetWorthCents} format={format} onAddClick={openAddMode} />

      <AccountList
        accounts={accounts}
        categorizedAccounts={categorizedAccounts}
        accountData={accountData}
        format={format}
        onEdit={openEditMode}
        onDelete={handleDelete}
      />

      <AccountFormDrawer
        isOpen={isOpen}
        editingAccount={editingAccount}
        values={formValues}
        setters={{
          setName, setBalance, setRepeatDay, setInterest, setCcStatement, setCcDue,
          setMonthlyInvestment, setStartDate, setTenureMonths, setInvestmentSubType, setCompoundingFrequency,
        }}
        onTypeChange={handleTypeChange}
        onClose={() => setIsOpen(false)}
        onSave={handleSave}
      />

      <Snackbar
        open={!!error || !!success}
        autoHideDuration={4000}
        onClose={() => { setError(null); setSuccess(null); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={error ? 'error' : 'success'}
          onClose={() => { setError(null); setSuccess(null); }}
          variant="filled"
          sx={{ borderRadius: '14px', ...iOSFont }}
        >
          {error || success}
        </Alert>
      </Snackbar>
    </Box>
  );
};
