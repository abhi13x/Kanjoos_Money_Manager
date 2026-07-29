import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  Grid,
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  MenuItem,
  Chip,
} from '@mui/material';
import { Trash2, Edit, PlusCircle, TrendingUp } from 'lucide-react';
import { db, type Account, type AccountType, type InvestmentSubType, type CompoundingFrequency } from '@/db/schema';
import { isInvestmentAccount, projectInvestment, resolveInvestmentSubType } from '@/services/investmentService';

interface AccountsTabProps {
  accounts: Account[];
  format: (cents: number) => string;
}

const ACCOUNT_CATEGORIES: { label: string; types: AccountType[] }[] = [
  { label: 'Liquid Cash & Banking', types: ['cash', 'savings', 'wallet'] },
  { label: 'Borrowing & Credit Lines', types: ['credit_card', 'debit_card'] },
  { label: 'Equities & Long Term Assets', types: ['mutual_fund', 'stock'] },
  { label: 'Deposits & Fixed Securities', types: ['fd_rd'] },
  { label: 'National Schemes', types: ['scheme'] }, 
];

const SUB_TYPE_OPTIONS: Record<string, { value: InvestmentSubType; label: string }[]> = {
  fd_rd: [
    { value: 'fd', label: 'Fixed Deposit (FD)' },
    { value: 'rd', label: 'Recurring Deposit (RD)' },
  ],
  mutual_fund: [{ value: 'sip', label: 'SIP (Systematic Investment Plan)' }],
  stock: [{ value: 'lumpsum', label: 'Lump Sum' }],
  scheme: [
    { value: 'ppf', label: 'PPF' },
    { value: 'nps', label: 'NPS' },
    { value: 'epfo', label: 'EPFO' },
  ],
};

const SUB_TYPE_LABELS: Record<InvestmentSubType, string> = {
  fd: 'FD',
  rd: 'RD',
  sip: 'SIP',
  lumpsum: 'Lump Sum',
  ppf: 'PPF',
  nps: 'NPS',
  epfo: 'EPFO',
};

const needsMonthlyInvestment = (subType: InvestmentSubType | ''): boolean =>
  ['rd', 'sip', 'ppf', 'nps', 'epfo'].includes(subType);

const needsRate = (type: AccountType): boolean =>
  ['mutual_fund', 'stock', 'fd_rd', 'scheme'].includes(type);

export const AccountsTab: React.FC<AccountsTabProps> = ({ accounts, format }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

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

  const resetForm = () => {
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
  };

  const openAddMode = () => {
    setEditingAccount(null);
    resetForm();
    setIsOpen(true);
  };

  const openEditMode = (acc: Account) => {
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
  };

  const handleTypeChange = (newType: AccountType) => {
    setType(newType);
    const options = SUB_TYPE_OPTIONS[newType];
    if (options?.length === 1) {
      setInvestmentSubType(options[0].value);
    } else if (!options) {
      setInvestmentSubType('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const balCents = Math.round(parseFloat(balance) * 100);

    const data: Partial<Account> = {
      name,
      type,
      currentBalance: balCents,
      initialBalance: editingAccount ? editingAccount.initialBalance : balCents,
      currency: 'INR',
    };

    if (['mutual_fund', 'stock', 'fd_rd', 'scheme'].includes(type)) {
      data.repeatInvestmentDate = parseInt(repeatDay) || undefined;
      data.investmentSubType = investmentSubType || undefined;
      data.tenureMonths = parseInt(tenureMonths) || undefined;
      data.startDate = startDate ? new Date(startDate).getTime() : undefined;
      data.monthlyInvestment = monthlyInvestment
        ? Math.round(parseFloat(monthlyInvestment) * 100)
        : undefined;
    }

    if (needsRate(type)) {
      const rate = parseFloat(interest);
      if (['mutual_fund', 'stock'].includes(type)) {
        data.expectedReturnRate = rate || undefined;
      } else {
        data.interestRate = rate || undefined;
      }
    }

    if (type === 'fd_rd' && investmentSubType === 'fd') {
      data.compoundingFrequency = compoundingFrequency;
    }

    if (type === 'credit_card') {
      data.statementDate = parseInt(ccStatement) || undefined;
      data.dueDate = parseInt(ccDue) || undefined;
    }

    if (editingAccount) {
      await db.accounts.update(editingAccount.id, data);
    } else {
      await db.accounts.add({
        ...(data as Account),
        id: crypto.randomUUID(),
      });
    }
    setIsOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this account? Associated balance records will be detached.")) {
      await db.accounts.delete(id);
    }
  };

  const subTypeOptions = SUB_TYPE_OPTIONS[type] ?? [];
  const activeSubType = investmentSubType as InvestmentSubType;
  const showMonthly = needsMonthlyInvestment(activeSubType);
  const showInvestmentFields = isInvestmentAccount(type);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Asset Registers</Typography>
        <Button variant="contained" startIcon={<PlusCircle size={18} />} onClick={openAddMode} sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}>
          Add Account
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {ACCOUNT_CATEGORIES.map((cat, idx) => {
          const categorizedAccounts = accounts.filter(acc => cat.types.includes(acc.type));
          if (categorizedAccounts.length === 0) return null;

          return (
            <Box key={idx}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {cat.label}
              </Typography>
              <Grid container spacing={3}>
                {categorizedAccounts.map((acc) => {
                  const projection = projectInvestment(acc);
                  const subType = resolveInvestmentSubType(acc);

                  return (
                    <Grid size={{ xs: 12, sm: 6 }} key={acc.id}>
                      <Card sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                        <CardContent sx={{ p: 2.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="body1" sx={{ fontWeight: 800 }}>{acc.name}</Typography>
                                {subType && (
                                  <Chip label={SUB_TYPE_LABELS[subType]} size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                                )}
                              </Box>
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                {acc.type.replace(/_/g, ' ').toUpperCase()}
                                {(acc.interestRate ?? acc.expectedReturnRate)
                                  ? ` | ${acc.expectedReturnRate ? 'Expected Return' : 'Interest'}: ${acc.interestRate ?? acc.expectedReturnRate}%`
                                  : ''}
                                {acc.repeatInvestmentDate ? ` | SIP Date: Day ${acc.repeatInvestmentDate}` : ''}
                                {acc.tenureMonths ? ` | Tenure: ${acc.tenureMonths} mo` : ''}
                              </Typography>

                              {projection && (
                                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: '10px' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                    <TrendingUp size={13} />
                                    <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      Projection
                                    </Typography>
                                  </Box>
                                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                    Maturity: <strong>{format(projection.maturityValueCents)}</strong>
                                    {' · '}Interest/Gain: <strong>{format(projection.interestEarnedCents)}</strong>
                                  </Typography>
                                  {acc.startDate && projection.projectedValueCents > 0 && (
                                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.25 }}>
                                      Expected today: <strong>{format(projection.projectedValueCents)}</strong>
                                      {' · '}Actual: <strong>{format(acc.currentBalance)}</strong>
                                    </Typography>
                                  )}
                                </Box>
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, ml: 2 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                                {format(acc.currentBalance)}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton size="small" onClick={() => openEditMode(acc)}><Edit size={15} /></IconButton>
                                <IconButton size="small" color="error" onClick={() => handleDelete(acc.id)}><Trash2 size={15} /></IconButton>
                              </Box>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          );
        })}
      </Box>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{editingAccount ? 'Edit Account' : 'Add Account'}</DialogTitle>
        <Box component="form" onSubmit={handleSave}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField label="Account Name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />

            <TextField select label="Account Type" value={type} onChange={(e) => handleTypeChange(e.target.value as AccountType)} required fullWidth>
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="savings">Savings Account</MenuItem>
              <MenuItem value="wallet">Wallet</MenuItem>
              <MenuItem value="credit_card">Credit Card</MenuItem>
              <MenuItem value="debit_card">Debit Card</MenuItem>
              <MenuItem value="mutual_fund">Mutual Fund</MenuItem>
              <MenuItem value="stock">Stocks</MenuItem>
              <MenuItem value="fd_rd">Fixed Deposit / RD</MenuItem>
              <MenuItem value="scheme">Scheme (NPS, PPF, EPFO)</MenuItem>
            </TextField>

            {subTypeOptions.length > 1 && (
              <TextField select label="Investment Type" value={investmentSubType} onChange={(e) => setInvestmentSubType(e.target.value as InvestmentSubType)} required fullWidth>
                {subTypeOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            )}

            <TextField label="Current Balance (₹)" type="number" value={balance} onChange={(e) => setBalance(e.target.value)} required fullWidth />

            {showInvestmentFields && (
              <>
                <TextField
                  label={['mutual_fund', 'stock'].includes(type) ? 'Expected Return (% p.a.)' : 'Interest Rate (% p.a.)'}
                  type="number"
                  slotProps={{ htmlInput: { step: '0.01' } }}
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  required
                  fullWidth
                />
                <TextField label="Tenure (months)" type="number" value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value)} required fullWidth />
                <TextField label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              </>
            )}

            {showMonthly && (
              <TextField label="Monthly Investment (₹)" type="number" value={monthlyInvestment} onChange={(e) => setMonthlyInvestment(e.target.value)} required fullWidth />
            )}

            {type === 'fd_rd' && investmentSubType === 'fd' && (
              <TextField select label="Compounding" value={compoundingFrequency} onChange={(e) => setCompoundingFrequency(e.target.value as CompoundingFrequency)} fullWidth>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly (Indian banks)</MenuItem>
                <MenuItem value="annually">Annually</MenuItem>
              </TextField>
            )}

            {showInvestmentFields && (
              <TextField label="Repeat Investment Day (1-31)" type="number" value={repeatDay} onChange={(e) => setRepeatDay(e.target.value)} fullWidth />
            )}

            {type === 'credit_card' && (
              <>
                <TextField label="Statement Date (1-31)" type="number" value={ccStatement} onChange={(e) => setCcStatement(e.target.value)} required fullWidth />
                <TextField label="Due Date (1-31)" type="number" value={ccDue} onChange={(e) => setCcDue(e.target.value)} required fullWidth />
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button onClick={() => setIsOpen(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};
