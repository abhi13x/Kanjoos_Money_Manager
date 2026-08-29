import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  IconButton,
  Drawer,
  InputBase,
  Select,
  MenuItem,
  Chip,
  Divider,
  useTheme,
  alpha,
  Stack,
  Alert,
  Snackbar,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { Trash2, Edit, Plus, TrendingUp, Wallet, Inbox } from 'lucide-react';
import { db, type Account, type AccountType, type InvestmentSubType, type CompoundingFrequency } from '@/db/schema';
import { projectInvestment, resolveInvestmentSubType } from '@/services/investmentService';

// ─── iOS Typography Stack ──────────────────────────────────────────────
const iOSFont = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Helvetica, Arial, sans-serif',
};

// ─── Constants ──────────────────────────────────────────────────
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
  mutual_fund: [{ value: 'sip', label: 'SIP' }],
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

// ─── Helpers ──────────────────────────────────────────────
const needsMonthlyInvestment = (subType: InvestmentSubType | ''): boolean =>
  ['rd', 'sip', 'ppf', 'nps', 'epfo'].includes(subType);

const needsRate = (type: AccountType): boolean =>
  ['mutual_fund', 'stock', 'fd_rd', 'scheme'].includes(type);

const getAccountSignedBalance = (acc: Account): number =>
  acc.type === 'credit_card' ? -acc.currentBalance : acc.currentBalance;

// ─── Reusable iOS Input Wrapper ─────────────────────────────────────────
interface IOSFieldProps {
  label: string;
  children: React.ReactNode;
}

const IOSField: React.FC<IOSFieldProps> = ({ label, children }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
    <Typography
      sx={{
        fontSize: 13,
        fontWeight: 500,
        color: '#8E8E93',
        ml: 0.5,
        ...iOSFont,
      }}
    >
      {label}
    </Typography>
    {children}
  </Box>
);

const iosInputSx = {
  bgcolor: alpha('#767680', 0.12),
  borderRadius: '10px',
  px: 1.75,
  py: 1,
  fontSize: 16,
  color: 'text.primary',
  width: '100%',
  ...iOSFont,
  '& .MuiInputBase-input': {
    p: 0,
    '&::placeholder': {
      color: '#8E8E93',
      opacity: 1,
    },
  },
};

// ─── Styles ──────────────────────────────────────────────────
const headerTitleSx = {
  fontWeight: 700,
  letterSpacing: '-0.5px',
  color: 'text.primary',
  fontSize: 34,
  lineHeight: '41px',
};

const addButtonSx = {
  borderRadius: '20px',
  fontWeight: 600,
  textTransform: 'none',
  px: 2,
  py: 0.75,
  fontSize: 15,
  bgcolor: '#007AFF',
  boxShadow: 'none',
  '&:hover': { bgcolor: '#0066CC', boxShadow: 'none' },
  ...iOSFont,
};

const netWorthCardSx = {
  p: 2,
  borderRadius: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const groupHeaderSx = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  mb: 0.75,
  px: 1,
};

const groupLabelSx = {
  fontWeight: 600,
  color: '#8E8E93',
  letterSpacing: '0.2px',
  fontSize: 13,
  textTransform: 'uppercase',
};

const accountPaperSx = {
  borderRadius: '16px',
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: alpha('#3C3C43', 0.12),
  overflow: 'hidden',
};

const accountRowSx = {
  p: 2,
};

const accountNameSx = {
  fontWeight: 600,
  fontSize: 17,
  letterSpacing: '-0.4px',
  color: 'text.primary',
};

const accountMetaSx = {
  fontSize: 13,
  color: '#8E8E93',
  fontWeight: 400,
  lineHeight: 1.4,
};

const projectionBoxSx = {
  mt: 1.25,
  p: 1.5,
  borderRadius: '10px',
  border: '1px solid',
  borderColor: alpha('#007AFF', 0.15),
};

const balanceSx = {
  fontWeight: 600,
  fontSize: 17,
  letterSpacing: '-0.4px',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

// ─── Main Component ─────────────────────────────────────────────
interface AccountsTabProps {
  accounts: Account[];
  format: (cents: number) => string;
}

export const AccountsTab: React.FC<AccountsTabProps> = ({ accounts, format }) => {
  const theme = useTheme();

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
      if (!window.confirm('Delete this account? This action cannot be undone.')) return;
      try {
        await db.accounts.delete(id);
        setSuccess('Account deleted.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete account.');
        console.error('Delete error:', err);
      }
    },
    []
  );

  // ─── Render Helpers ──────────────────────────────────────────
  const renderAccountRow = useCallback(
    (acc: Account, projection: any, subType: InvestmentSubType | null) => {
      const isCredit = acc.type === 'credit_card';
      return (
        <Box key={acc.id} sx={accountRowSx}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                <Typography sx={accountNameSx}>{acc.name}</Typography>
                {subType && (
                  <Chip
                    label={SUB_TYPE_LABELS[subType]}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontSize: 11,
                      height: 20,
                      borderRadius: '6px',
                      bgcolor: alpha('#007AFF', 0.1),
                      color: '#007AFF',
                    }}
                  />
                )}
              </Box>

              <Typography sx={accountMetaSx}>
                {acc.type.replace(/_/g, ' ').toUpperCase()}
                {(acc.interestRate ?? acc.expectedReturnRate)
                  ? ` · ${acc.expectedReturnRate ? 'Return' : 'Interest'}: ${acc.interestRate ?? acc.expectedReturnRate}%`
                  : ''}
                {acc.repeatInvestmentDate ? ` · SIP: Day ${acc.repeatInvestmentDate}` : ''}
                {acc.tenureMonths ? ` · Tenure: ${acc.tenureMonths}m` : ''}
              </Typography>

              {projection && (
                <Box sx={{ ...projectionBoxSx, bgcolor: alpha('#007AFF', 0.04) }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                    <TrendingUp size={14} color="#007AFF" />
                    <Typography sx={{ fontWeight: 600, fontSize: 11, textTransform: 'uppercase', color: '#007AFF' }}>
                      Investment Projection
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, color: '#8E8E93', lineHeight: 1.5 }}>
                    Maturity: <strong>{format(projection.maturityValueCents)}</strong>
                    {' · '}Gain: <strong>{format(projection.interestEarnedCents)}</strong>
                  </Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, flexShrink: 0 }}>
              <Typography sx={{ ...balanceSx, color: isCredit ? '#FF3B30' : 'text.primary' }}>
                {isCredit ? `-${format(acc.currentBalance)}` : format(acc.currentBalance)}
              </Typography>
              
              <Stack direction="row" spacing={0.5}>
                <IconButton
                  onClick={() => openEditMode(acc)}
                  aria-label={`Edit ${acc.name}`}
                  sx={{
                    width: 44,
                    height: 44,
                    bgcolor: alpha(theme.palette.action.hover, 0.06),
                    borderRadius: '50%',
                  }}
                >
                  <Edit size={16} color="#007AFF" />
                </IconButton>
                <IconButton
                  onClick={() => handleDelete(acc.id)}
                  aria-label={`Delete ${acc.name}`}
                  sx={{
                    width: 44,
                    height: 44,
                    bgcolor: alpha('#FF3B30', 0.08),
                    borderRadius: '50%',
                  }}
                >
                  <Trash2 size={16} color="#FF3B30" />
                </IconButton>
              </Stack>
            </Box>
          </Box>
        </Box>
      );
    },
    [format, openEditMode, handleDelete, theme]
  );

  // ─── Render ──────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 4, ...iOSFont }}>
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 0.5 }}>
          <Typography variant="h4" sx={headerTitleSx}>
            Accounts
          </Typography>
          <Button
            variant="contained"
            disableElevation
            startIcon={<Plus size={18} strokeWidth={2.5} />}
            onClick={openAddMode}
            sx={addButtonSx}
          >
            Add
          </Button>
        </Box>

        {/* Total Balance Card */}
        <Paper
          elevation={0}
          sx={{
            ...netWorthCardSx,
            bgcolor: alpha('#007AFF', 0.06),
            border: '1px solid',
            borderColor: alpha('#007AFF', 0.12),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                bgcolor: '#007AFF',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet size={22} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#8E8E93' }}>
                Total Net Balance
              </Typography>
              <Typography
                sx={{
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: '-0.5px',
                  color: totalNetWorthCents < 0 ? '#FF3B30' : 'text.primary',
                }}
              >
                {format(totalNetWorthCents)}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Account Categories */}
      {accounts.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
            px: 4,
            textAlign: 'center',
          }}
        >
          <Inbox size={56} color="#8E8E93" />
          <Typography sx={{ mt: 2, fontSize: 17, fontWeight: 600, color: 'text.primary' }}>
            No Accounts Added
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 15, color: '#8E8E93' }}>
            Tap “Add” to create your first balance tracking item.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {categorizedAccounts.map((cat, idx) => {
            const catAccounts = cat.accounts;
            if (catAccounts.length === 0) return null;

            const categorySubtotal = catAccounts.reduce(
              (sum, acc) => sum + getAccountSignedBalance(acc),
              0
            );

            return (
              <Box key={idx}>
                <Box sx={groupHeaderSx}>
                  <Typography variant="overline" sx={groupLabelSx}>
                    {cat.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: 13,
                      color: categorySubtotal < 0 ? '#FF3B30' : '#8E8E93',
                    }}
                  >
                    {format(categorySubtotal)}
                  </Typography>
                </Box>

                <Paper elevation={0} sx={accountPaperSx}>
                  {catAccounts.map((acc, accIdx) => {
                    const data = accountData.find((d) => d.account.id === acc.id);
                    const isLast = accIdx === catAccounts.length - 1;
                    return (
                      <React.Fragment key={acc.id}>
                        {renderAccountRow(acc, data?.projection || null, data?.subType || null)}
                        {!isLast && <Divider sx={{ ml: 2, borderColor: alpha('#3C3C43', 0.12) }} />}
                      </React.Fragment>
                    );
                  })}
                </Paper>
              </Box>
            );
          })}
        </Box>
      )}

      {/* ─── iOS Native Bottom Sheet (Drawer) ────────────────────────────── */}
      <Drawer
        anchor="bottom"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        slotProps={{
          backdrop: {
            sx: { bgcolor: 'rgba(0, 0, 0, 0.4)' },
          },
          paper: {
            sx: {
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              maxHeight: '90vh',
              bgcolor: 'background.paper',
              backgroundImage: 'none',
              ...iOSFont,
            },
          },
        }}
      >
        {/* Grab Handle */}
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.25, pb: 1 }}>
          <Box
            sx={{
              width: 36,
              height: 5,
              borderRadius: '2.5px',
              bgcolor: alpha('#767680', 0.3),
            }}
          />
        </Box>

        {/* iOS Navigation Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: alpha('#3C3C43', 0.12),
          }}
        >
          <Button
            onClick={() => setIsOpen(false)}
            sx={{
              color: '#007AFF',
              fontSize: 17,
              textTransform: 'none',
              minWidth: 'auto',
              p: 0,
              fontWeight: 400,
            }}
          >
            Cancel
          </Button>
          <Typography sx={{ fontWeight: 600, fontSize: 17, color: 'text.primary' }}>
            {editingAccount ? 'Edit Account' : 'New Account'}
          </Typography>
          <Button
            onClick={handleSave}
            sx={{
              color: '#007AFF',
              fontSize: 17,
              textTransform: 'none',
              minWidth: 'auto',
              p: 0,
              fontWeight: 600,
            }}
          >
            Done
          </Button>
        </Box>

        {/* Sheet Content / Form */}
        <Box
          component="form"
          onSubmit={handleSave}
          sx={{
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
            overflowY: 'auto',
          }}
        >
          <IOSField label="ACCOUNT NAME">
            <InputBase
              placeholder="e.g. HDFC Savings"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              sx={iosInputSx}
            />
          </IOSField>

          <IOSField label="ACCOUNT TYPE">
            <Select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as AccountType)}
              input={<InputBase sx={iosInputSx} />}
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
            </Select>
          </IOSField>

          {SUB_TYPE_OPTIONS[type]?.length > 1 && (
            <IOSField label="INVESTMENT TYPE">
              <Select
                value={investmentSubType}
                onChange={(e) => setInvestmentSubType(e.target.value as InvestmentSubType)}
                input={<InputBase sx={iosInputSx} />}
                fullWidth
              >
                {SUB_TYPE_OPTIONS[type].map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </IOSField>
          )}

          <IOSField label="CURRENT BALANCE (₹)">
            <InputBase
              type="number"
              placeholder="0.00"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              required
              fullWidth
              sx={iosInputSx}
            />
          </IOSField>

          {['mutual_fund', 'stock', 'fd_rd', 'scheme'].includes(type) && (
            <>
              <IOSField
                label={
                  ['mutual_fund', 'stock'].includes(type)
                    ? 'EXPECTED RETURN (% P.A.)'
                    : 'INTEREST RATE (% P.A.)'
                }
              >
                <InputBase
                  type="number"
                  inputProps={{ step: '0.01' }}
                  placeholder="e.g. 7.5"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  required
                  fullWidth
                  sx={iosInputSx}
                />
              </IOSField>

              <IOSField label="TENURE (MONTHS)">
                <InputBase
                  type="number"
                  placeholder="e.g. 12"
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(e.target.value)}
                  required
                  fullWidth
                  sx={iosInputSx}
                />
              </IOSField>

              <IOSField label="START DATE">
                <InputBase
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  fullWidth
                  sx={iosInputSx}
                />
              </IOSField>
            </>
          )}

          {needsMonthlyInvestment(investmentSubType) && (
            <IOSField label="MONTHLY INVESTMENT (₹)">
              <InputBase
                type="number"
                placeholder="0.00"
                value={monthlyInvestment}
                onChange={(e) => setMonthlyInvestment(e.target.value)}
                required
                fullWidth
                sx={iosInputSx}
              />
            </IOSField>
          )}

          {type === 'fd_rd' && investmentSubType === 'fd' && (
            <IOSField label="COMPOUNDING FREQUENCY">
              <ToggleButtonGroup
                value={compoundingFrequency}
                exclusive
                onChange={(_, val) => val && setCompoundingFrequency(val)}
                fullWidth
                sx={{
                  bgcolor: alpha('#767680', 0.12),
                  p: '2px',
                  borderRadius: '9px',
                  border: 'none',
                  '& .MuiToggleButton-root': {
                    border: 'none',
                    borderRadius: '7px',
                    py: 0.75,
                    fontSize: 13,
                    fontWeight: 600,
                    textTransform: 'none',
                    color: 'text.primary',
                    '&.Mui-selected': {
                      bgcolor: 'background.paper',
                      boxShadow: '0px 3px 8px rgba(0, 0, 0, 0.12)',
                    },
                  },
                }}
              >
                <ToggleButton value="monthly">Monthly</ToggleButton>
                <ToggleButton value="quarterly">Quarterly</ToggleButton>
                <ToggleButton value="annually">Annually</ToggleButton>
              </ToggleButtonGroup>
            </IOSField>
          )}

          {['mutual_fund', 'stock', 'fd_rd', 'scheme'].includes(type) && (
            <IOSField label="REPEAT INVESTMENT DAY (1-31)">
              <InputBase
                type="number"
                placeholder="e.g. 5"
                value={repeatDay}
                onChange={(e) => setRepeatDay(e.target.value)}
                fullWidth
                sx={iosInputSx}
              />
            </IOSField>
          )}

          {type === 'credit_card' && (
            <>
              <IOSField label="STATEMENT DATE (1-31)">
                <InputBase
                  type="number"
                  placeholder="e.g. 1"
                  value={ccStatement}
                  onChange={(e) => setCcStatement(e.target.value)}
                  required
                  fullWidth
                  sx={iosInputSx}
                />
              </IOSField>

              <IOSField label="DUE DATE (1-31)">
                <InputBase
                  type="number"
                  placeholder="e.g. 20"
                  value={ccDue}
                  onChange={(e) => setCcDue(e.target.value)}
                  required
                  fullWidth
                  sx={iosInputSx}
                />
              </IOSField>
            </>
          )}
        </Box>
      </Drawer>

      {/* Snackbar */}
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

export default AccountsTab;