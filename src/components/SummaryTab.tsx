import React from 'react';
import { Box, Grid, Card, CardContent, Typography, List, ListItem, ListItemText, Chip } from '@mui/material';
import Divider from '@mui/divider';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Calendar, CreditCard as CardIcon, LineChart } from 'lucide-react';
import type { Account, Transaction } from '@/db/schema';
import { getInvestmentSummaries, getTotalProjectedInterest, getTotalProjectedMaturity } from '@/services/investmentService';

interface SummaryTabProps {
  accounts: Account[];
  transactions: Transaction[];
  format: (cents: number) => string;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({ accounts, transactions, format }) => {
  // Calculations
  const totalIncome = transactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpense = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const savings = Math.max(0, totalIncome - totalExpense);

  // Group assets: Cash + Savings + Wallets + Investments (Stocks, Mutual Funds, Schemes, FDs)
  const assetTypes = ['cash', 'savings', 'wallet', 'mutual_fund', 'stock', 'fd_rd', 'scheme'];
  const totalAssets = accounts
    .filter((acc) => assetTypes.includes(acc.type))
    .reduce((sum, acc) => sum + (acc.currentBalance ?? acc.initialBalance), 0);

  // Credit Card Usage Balance Tracking
  const creditCards = accounts.filter((acc) => acc.type === 'credit_card');
  const totalCCDebt = creditCards.reduce((sum, acc) => sum + Math.abs(acc.currentBalance), 0);

  // Compute upcoming recurring transactions or investment schedules
  const upcomingPayments = accounts
    .filter((acc) => ['mutual_fund', 'stock', 'fd_rd', 'scheme', 'credit_card'].includes(acc.type))
    .map((acc) => {
      const today = new Date().getDate();
      let dueDay = acc.repeatInvestmentDate || acc.dueDate || 5;
      let status = dueDay >= today ? 'Upcoming' : 'Overdue';

      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        dueDay,
        status,
        amount: acc.type === 'credit_card'
          ? acc.currentBalance
          : (acc.monthlyInvestment ?? 0),
      };
    })
    .sort((a, b) => a.dueDay - b.dueDay);

  const investmentSummaries = getInvestmentSummaries(accounts);
  const totalProjectedMaturity = getTotalProjectedMaturity(accounts);
  const totalProjectedInterest = getTotalProjectedInterest(accounts);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* 4 Core Financial Metrics */}
      <Grid container spacing={3}>
        {[
          { label: 'Total Income', val: totalIncome, icon: <TrendingUp size={24} />, color: 'success.main', bg: 'rgba(76, 175, 80, 0.08)' },
          { label: 'Total Expense', val: totalExpense, icon: <TrendingDown size={24} />, color: 'error.main', bg: 'rgba(244, 67, 54, 0.08)' },
          { label: 'Net Savings', val: savings, icon: <PiggyBank size={24} />, color: 'info.main', bg: 'rgba(3, 169, 244, 0.08)' },
          { label: 'Total Assets', val: totalAssets, icon: <Wallet size={24} />, color: 'primary.main', bg: 'rgba(33, 150, 243, 0.08)' },
        ].map((m, idx) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
            <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardContent sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                    {m.label}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, mt: 1, color: m.color }}>
                    {format(m.val)}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, bgcolor: m.bg, color: m.color, borderRadius: '12px', display: 'flex' }}>
                  {m.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Investment Projections */}
      {investmentSummaries.length > 0 && (
        <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <LineChart size={20} /> Investment Projections
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                  Total Maturity Value
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'success.main' }}>
                  {format(totalProjectedMaturity)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                  Total Interest / Gains
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'info.main' }}>
                  {format(totalProjectedInterest)}
                </Typography>
              </Grid>
            </Grid>
            <List disablePadding>
              {investmentSummaries.map(({ account, subType, projection }) => (
                <Box key={account.id}>
                  <ListItem sx={{ px: 0, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <ListItemText
                      primary={account.name}
                      secondary={`${subType.toUpperCase()} · ${account.tenureMonths} mo @ ${account.interestRate ?? account.expectedReturnRate}%`}
                      slotProps={{
                        primary: { sx: { fontWeight: 700, fontSize: '0.9rem' } },
                        secondary: { sx: { fontSize: '0.75rem' } },
                      }}
                    />
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {format(projection.maturityValueCents)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700 }}>
                        +{format(projection.interestEarnedCents)}
                      </Typography>
                    </Box>
                  </ListItem>
                  <Divider />
                </Box>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* Credit Card Utilization Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CardIcon size={20} /> Credit Card Usage
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: totalCCDebt > 0 ? 'warning.main' : 'text.primary', mb: 3 }}>
                {format(totalCCDebt)}
              </Typography>
              <List disablePadding>
                {creditCards.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
                    No credit cards linked.
                  </Typography>
                ) : (
                  creditCards.map((card) => (
                    <Box key={card.id}>
                      <ListItem sx={{ px: 0, py: 1.5, display: 'flex', justifyContent: 'space-between' }}>
                        {/* Updated legacy typography props to slotProps */}
                        <ListItemText 
                          primary={card.name} 
                          secondary={`Due Date: Day ${card.dueDate} | Statement: Day ${card.statementDate}`} 
                          slotProps={{
                            primary: { sx: { fontWeight: 700, fontSize: '0.9rem' } },
                            secondary: { sx: { fontSize: '0.75rem' } }
                          }}
                        />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'error.main' }}>
                          {format(Math.abs(card.currentBalance))}
                        </Typography>
                      </ListItem>
                      <Divider />
                    </Box>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Outflows */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Calendar size={20} /> Upcoming Payments & SIPs
              </Typography>
              <List disablePadding>
                {upcomingPayments.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
                    No recurring investments or scheduled accounts.
                  </Typography>
                ) : (
                  upcomingPayments.map((p) => (
                    <Box key={p.id}>
                      <ListItem sx={{ px: 0, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {/* Updated legacy typography props to slotProps */}
                        <ListItemText 
                          primary={p.name} 
                          secondary={`Due on Day ${p.dueDay} of this month`} 
                          slotProps={{
                            primary: { sx: { fontWeight: 700, fontSize: '0.9rem' } },
                            secondary: { sx: { fontSize: '0.75rem' } }
                          }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          {p.amount !== 0 && (
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              {format(Math.abs(p.amount))}
                            </Typography>
                          )}
                          <Chip 
                            label={p.status} 
                            size="small" 
                            color={p.status === 'Upcoming' ? 'primary' : 'error'} 
                            sx={{ fontWeight: 800, fontSize: '0.65rem' }} 
                          />
                        </Box>
                      </ListItem>
                      <Divider />
                    </Box>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};