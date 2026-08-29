// view/AccountsTab.tsx

import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Divider,
  useTheme,
  alpha,
  Stack,
} from '@mui/material';
import { Trash2, Edit, Plus, TrendingUp, Wallet } from 'lucide-react';
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

/** Helper to compute balance contribution (liabilities like credit cards subtract from total) */
const getAccountSignedBalance = (acc: Account): number => {
  return acc.type === 'credit_card' ? -acc.currentBalance : acc.currentBalance;
};

export const AccountsTab: React.FC<AccountsTabProps> = ({ accounts, format }) => {
  const theme = useTheme();
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

  // Overall portfolio net worth calculation
  const totalNetWorthCents = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + getAccountSignedBalance(acc), 0);
  }, [accounts]);

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
    const parsedBal = parseFloat(balance);
    const balCents = Math.round((isNaN(parsedBal) ? 0 : parsedBal) * 100);

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
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif',
      }}
    >
      {/* Header & Net Worth Overview */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 0.5 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              letterSpacing: '-0.5px',
              color: 'text.primary',
              fontSize: '28px',
              lineHeight: '34px',
            }}
          >
            Accounts
          </Typography>
          <Button
            variant="contained"
            disableElevation
            startIcon={<Plus size={18} strokeWidth={2.5} />}
            onClick={openAddMode}
            sx={{
              borderRadius: '20px',
              fontWeight: 600,
              textTransform: 'none',
              px: 2,
              py: 0.75,
              fontSize: '15px',
              bgcolor: 'primary.main',
              boxShadow: 'none',
              '&:hover': {
                bgcolor: 'primary.dark',
                boxShadow: 'none',
              },
            }}
          >
            Add Account
          </Button>
        </Box>

        {/* Total Net Worth Card */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: '20px',
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.12),
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '12px',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet size={22} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'text.secondary' }}>
                Total Net Balance
              </Typography>
              <Typography
                sx={{
                  fontSize: '24px',
                  fontWeight: 700,
                  letterSpacing: '-0.5px',
                  color: totalNetWorthCents < 0 ? 'error.main' : 'text.primary',
                }}
              >
                {format(totalNetWorthCents)}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Grouped iOS Inset Tables with Category Subtotals */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
        {ACCOUNT_CATEGORIES.map((cat, idx) => {
          const categorizedAccounts = accounts.filter((acc) => cat.types.includes(acc.type));
          if (categorizedAccounts.length === 0) return null;

          // Calculate subtotal for the current category
          const categorySubtotalCents = categorizedAccounts.reduce(
            (sum, acc) => sum + getAccountSignedBalance(acc),
            0
          );

          return (
            <Box key={idx}>
              {/* Group Section Header with Subtotal */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                  px: 1.5,
                }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    fontWeight: 600,
                    color: 'text.secondary',
                    letterSpacing: '0.2px',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                  }}
                >
                  {cat.label}
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: '13px',
                    color: categorySubtotalCents < 0 ? 'error.main' : 'text.secondary',
                  }}
                >
                  {format(categorySubtotalCents)}
                </Typography>
              </Box>

              {/* Inset Group Container */}
              <Paper
                elevation={0}
                sx={{
                  borderRadius: '20px',
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: alpha(theme.palette.divider, 0.8),
                  overflow: 'hidden',
                }}
              >
                {categorizedAccounts.map((acc, accIdx) => {
                  const projection = projectInvestment(acc);
                  const subType = resolveInvestmentSubType(acc);
                  const isLast = accIdx === categorizedAccounts.length - 1;

                  return (
                    <React.Fragment key={acc.id}>
                      <Box
                        sx={{
                          p: 2,
                          transition: 'background-color 0.15s ease',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.action.hover, 0.04),
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box sx={{ flex: 1, pr: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '16px',
                                  letterSpacing: '-0.3px',
                                  color: 'text.primary',
                                }}
                              >
                                {acc.name}
                              </Typography>
                              {subType && (
                                <Chip
                                  label={SUB_TYPE_LABELS[subType]}
                                  size="small"
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: '11px',
                                    height: '20px',
                                    borderRadius: '6px',
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: 'primary.main',
                                  }}
                                />
                              )}
                            </Box>

                            <Typography
                              sx={{
                                fontSize: '13px',
                                color: 'text.secondary',
                                fontWeight: 400,
                                lineHeight: 1.4,
                              }}
                            >
                              {acc.type.replace(/_/g, ' ').toUpperCase()}
                              {(acc.interestRate ?? acc.expectedReturnRate)
                                ? ` · ${acc.expectedReturnRate ? 'Return' : 'Interest'}: ${acc.interestRate ?? acc.expectedReturnRate}%`
                                : ''}
                              {acc.repeatInvestmentDate ? ` · SIP: Day ${acc.repeatInvestmentDate}` : ''}
                              {acc.tenureMonths ? ` · Tenure: ${acc.tenureMonths}m` : ''}
                            </Typography>

                            {/* Investment Projection Widget */}
                            {projection && (
                              <Box
                                sx={{
                                  mt: 1.5,
                                  p: 1.5,
                                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                                  borderRadius: '12px',
                                  border: '1px solid',
                                  borderColor: alpha(theme.palette.primary.main, 0.08),
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                                  <TrendingUp size={14} color={theme.palette.primary.main} />
                                  <Typography
                                    sx={{
                                      fontWeight: 600,
                                      fontSize: '11px',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.4px',
                                      color: 'primary.main',
                                    }}
                                  >
                                    Investment Projection
                                  </Typography>
                                </Box>
                                <Typography
                                  sx={{
                                    fontSize: '12px',
                                    color: 'text.secondary',
                                    lineHeight: 1.5,
                                  }}
                                >
                                  Maturity: <strong>{format(projection.maturityValueCents)}</strong>
                                  {' · '}Gain: <strong>{format(projection.interestEarnedCents)}</strong>
                                </Typography>
                                {acc.startDate && projection.projectedValueCents > 0 && (
                                  <Typography
                                    sx={{
                                      fontSize: '12px',
                                      color: 'text.secondary',
                                      mt: 0.25,
                                    }}
                                  >
                                    Expected today: <strong>{format(projection.projectedValueCents)}</strong>
                                    {' · '}Actual: <strong>{format(acc.currentBalance)}</strong>
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </Box>

                          {/* Balance & iOS Quick Actions */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: '17px',
                                letterSpacing: '-0.4px',
                                fontVariantNumeric: 'tabular-nums',
                                color: acc.type === 'credit_card' ? 'error.main' : 'text.primary',
                              }}
                            >
                              {acc.type === 'credit_card' ? `-${format(acc.currentBalance)}` : format(acc.currentBalance)}
                            </Typography>

                            <Stack direction="row" spacing={0.5}>
                              <IconButton
                                size="small"
                                onClick={() => openEditMode(acc)}
                                sx={{
                                  width: 30,
                                  height: 30,
                                  bgcolor: alpha(theme.palette.action.hover, 0.06),
                                  borderRadius: '50%',
                                }}
                              >
                                <Edit size={14} />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(acc.id)}
                                sx={{
                                  width: 30,
                                  height: 30,
                                  bgcolor: alpha(theme.palette.error.main, 0.08),
                                  color: 'error.main',
                                  borderRadius: '50%',
                                }}
                              >
                                <Trash2 size={14} />
                              </IconButton>
                            </Stack>
                          </Box>
                        </Box>
                      </Box>
                      {!isLast && <Divider sx={{ ml: 2, borderColor: alpha(theme.palette.divider, 0.5) }} />}
                    </React.Fragment>
                  );
                })}
              </Paper>
            </Box>
          );
        })}
      </Box>

      {/* iOS Modal Form Dialog */}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{
          paper: {
            sx: {
              borderRadius: '28px',
              p: 1,
              bgcolor: 'background.paper',
              backgroundImage: 'none',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: '20px',
            letterSpacing: '-0.4px',
            textAlign: 'center',
            pt: 2.5,
            pb: 1,
          }}
        >
          {editingAccount ? 'Edit Account' : 'Add Account'}
        </DialogTitle>
        <Box component="form" onSubmit={handleSave}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
            <TextField
              label="Account Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              variant="outlined"
              size="medium"
            />

            <TextField
              select
              label="Account Type"
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as AccountType)}
              required
              fullWidth
            >
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
              <TextField
                select
                label="Investment Type"
                value={investmentSubType}
                onChange={(e) => setInvestmentSubType(e.target.value as InvestmentSubType)}
                required
                fullWidth
              >
                {subTypeOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              label="Current Balance (₹)"
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              required
              fullWidth
            />

            {showInvestmentFields && (
              <>
                <TextField
                  label={
                    ['mutual_fund', 'stock'].includes(type)
                      ? 'Expected Return (% p.a.)'
                      : 'Interest Rate (% p.a.)'
                  }
                  type="number"
                  slotProps={{ htmlInput: { step: '0.01' } }}
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Tenure (months)"
                  type="number"
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />
              </>
            )}

            {showMonthly && (
              <TextField
                label="Monthly Investment (₹)"
                type="number"
                value={monthlyInvestment}
                onChange={(e) => setMonthlyInvestment(e.target.value)}
                required
                fullWidth
              />
            )}

            {type === 'fd_rd' && investmentSubType === 'fd' && (
              <TextField
                select
                label="Compounding"
                value={compoundingFrequency}
                onChange={(e) => setCompoundingFrequency(e.target.value as CompoundingFrequency)}
                fullWidth
              >
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly (Indian banks)</MenuItem>
                <MenuItem value="annually">Annually</MenuItem>
              </TextField>
            )}

            {showInvestmentFields && (
              <TextField
                label="Repeat Investment Day (1-31)"
                type="number"
                value={repeatDay}
                onChange={(e) => setRepeatDay(e.target.value)}
                fullWidth
              />
            )}

            {type === 'credit_card' && (
              <>
                <TextField
                  label="Statement Date (1-31)"
                  type="number"
                  value={ccStatement}
                  onChange={(e) => setCcStatement(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Due Date (1-31)"
                  type="number"
                  value={ccDue}
                  onChange={(e) => setCcDue(e.target.value)}
                  required
                  fullWidth
                />
              </>
            )}
          </DialogContent>

          {/* iOS Action Buttons */}
          <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
            <Button
              onClick={() => setIsOpen(false)}
              color="inherit"
              fullWidth
              sx={{
                borderRadius: '14px',
                py: 1.25,
                fontWeight: 600,
                textTransform: 'none',
                bgcolor: alpha(theme.palette.action.hover, 0.08),
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disableElevation
              fullWidth
              sx={{
                borderRadius: '14px',
                py: 1.25,
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              Save
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default AccountsTab;