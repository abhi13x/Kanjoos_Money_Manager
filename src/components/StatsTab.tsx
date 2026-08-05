import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  MenuItem,
  TextField,
  Grid,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  LinearProgress,
  useTheme,
} from '@mui/material';
import { BarChart3, PieChart as PieIcon, TrendingUp, Filter } from 'lucide-react';
import type { Transaction, Category } from '@/db/schema';

interface StatsTabProps {
  transactions: Transaction[];
  categories: Category[];
  format: (cents: number) => string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CATEGORY_COLORS = [
  '#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0', '#00BCD4', '#E91E63', '#795548',
  '#6366f1', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ef4444', '#3b82f6'
];

// Utility: Generate standard rounded Y-axis tick steps
function getNiceYAxis(maxValue: number, targetTicks = 4) {
  if (maxValue <= 0) {
    return { ticks: [1000, 500, 0], max: 1000 };
  }

  const rawInterval = maxValue / (targetTicks - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)));
  const norm = rawInterval / magnitude;

  let niceStep = magnitude;
  if (norm > 5) niceStep = 10 * magnitude;
  else if (norm > 2.5) niceStep = 5 * magnitude;
  else if (norm > 1.25) niceStep = 2 * magnitude;
  else niceStep = 1 * magnitude;

  const maxTick = Math.ceil(maxValue / niceStep) * niceStep;
  const ticks: number[] = [];

  for (let val = maxTick; val >= 0; val -= niceStep) {
    ticks.push(Math.round(val));
  }

  return { ticks, max: maxTick || 1 };
}

export const StatsTab: React.FC<StatsTabProps> = ({ transactions, categories, format }) => {
  const theme = useTheme();
  const currentDate = new Date();

  // Global Dashboard Filter States
  const [statType, setStatType] = useState<'expense' | 'income'>('expense');
  const [groupBy, setGroupBy] = useState<'month' | 'year'>('month');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);

  // Category Breakdown Specific Filter States
  const [breakdownMonth, setBreakdownMonth] = useState<number>(currentDate.getMonth());
  const [breakdownYear, setBreakdownYear] = useState<number>(currentDate.getFullYear());

  const handleStatTypeChange = (newType: 'expense' | 'income') => {
    setStatType(newType);
    setSelectedCategory('all');
  };

  const handleGroupByChange = (newGroup: 'month' | 'year') => {
    setGroupBy(newGroup);
    setSelectedPeriod('all');
  };

  // Dynamically extract unique available years for dropdowns
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(currentDate.getFullYear());
    transactions.forEach((tx) => {
      if (tx.date) {
        yearsSet.add(new Date(tx.date).getFullYear());
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions]);

  const baseTx = useMemo(() => {
    return transactions.filter((tx) => tx.type === statType);
  }, [transactions, statType]);

  const availablePeriods = useMemo(() => {
    const periodSet = new Set<string>();
    baseTx.forEach((tx) => {
      const dateObj = new Date(tx.date);
      if (isNaN(dateObj.getTime())) return;
      if (groupBy === 'month') {
        const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        periodSet.add(key);
      } else {
        periodSet.add(`${dateObj.getFullYear()}`);
      }
    });

    return Array.from(periodSet).sort().reverse();
  }, [baseTx, groupBy]);

  const effectivePeriod = useMemo(() => {
    if (selectedPeriod === 'all') return 'all';
    return availablePeriods.includes(selectedPeriod) ? selectedPeriod : 'all';
  }, [selectedPeriod, availablePeriods]);

  // Filtered transactions for Category Breakdown based on Month and Year dropdowns
  const breakdownFilteredTx = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.type !== statType) return false;
      const d = new Date(tx.date);
      return d.getMonth() === breakdownMonth && d.getFullYear() === breakdownYear;
    });
  }, [transactions, statType, breakdownMonth, breakdownYear]);

  // 1. Dynamic Category Breakdown with Safe Color Fallback
  const categoryBreakdown = useMemo(() => {
    const catMap: Record<string, number> = {};
    let totalAmount = 0;

    breakdownFilteredTx.forEach((tx) => {
      const catId = tx.categoryId || 'uncategorized';
      catMap[catId] = (catMap[catId] || 0) + tx.amount;
      totalAmount += tx.amount;
    });

    return Object.entries(catMap)
      .map(([catId, amount]) => {
        const category = categories.find((c) => c.id === catId);
        const customColor = (category as { color?: string })?.color;

        return {
          id: catId,
          name: category ? category.name : 'Uncategorized',
          customColor,
          amount,
          percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .map((item, index) => ({
        ...item,
        color: item.customColor || CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }));
  }, [breakdownFilteredTx, categories]);

  const totalBreakdownAmount = useMemo(() => {
    return categoryBreakdown.reduce((sum, item) => sum + item.amount, 0);
  }, [categoryBreakdown]);

  // 2. Temporal Volume Bar Chart Data
  const periodicData = useMemo(() => {
    const summary = baseTx.reduce((acc, tx) => {
      const dateObj = new Date(tx.date);
      if (isNaN(dateObj.getTime())) return acc;

      const key =
        groupBy === 'month'
          ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
          : `${dateObj.getFullYear()}`;

      if (selectedCategory !== 'all' && tx.categoryId !== selectedCategory) {
        return acc;
      }

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
  }, [baseTx, groupBy, selectedCategory]);

  const barYAxis = useMemo(() => {
    const maxVal = Math.max(...periodicData.map((d) => d.val), 0);
    return getNiceYAxis(maxVal);
  }, [periodicData]);

  // 3. Category Timeline Aggregated Trend Data
  const timelineData = useMemo(() => {
    const categoryTx = baseTx.filter(
      (tx) => selectedCategory === 'all' || tx.categoryId === selectedCategory
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
  }, [baseTx, selectedCategory, groupBy, effectivePeriod]);

  const lineYAxis = useMemo(() => {
    const maxVal = Math.max(...timelineData.map((d) => d.val), 0);
    return getNiceYAxis(maxVal);
  }, [timelineData]);

  const selectedCategoryName = useMemo(() => {
    if (selectedCategory === 'all') return 'Overall Category';
    const found = categories.find((c) => c.id === selectedCategory);
    return found ? found.name : 'Category';
  }, [selectedCategory, categories]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Global Dashboard Control Header */}
      <Paper sx={{ p: 2, borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Filter size={20} /> Analytics Dashboard
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <ToggleButtonGroup
              size="small"
              value={groupBy}
              exclusive
              onChange={(_, val) => val && handleGroupByChange(val)}
              sx={{ height: 40 }}
            >
              <ToggleButton value="month" sx={{ px: 2, fontWeight: 800, fontSize: '0.75rem' }}>MONTH</ToggleButton>
              <ToggleButton value="year" sx={{ px: 2, fontWeight: 800, fontSize: '0.75rem' }}>YEAR</ToggleButton>
            </ToggleButtonGroup>

            <TextField
              select
              size="small"
              label="Time Horizon"
              value={effectivePeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              sx={{ minWidth: '150px' }}
            >
              <MenuItem value="all">All {groupBy === 'month' ? 'Months' : 'Years'}</MenuItem>
              {availablePeriods.map((pKey) => {
                let display = pKey;
                if (groupBy === 'month') {
                  const [y, m] = pKey.split('-');
                  display = `${new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', { month: 'short' })} ${y}`;
                }
                return (
                  <MenuItem key={pKey} value={pKey}>
                    {display}
                  </MenuItem>
                );
              })}
            </TextField>

            <TextField
              select
              size="small"
              label="Type"
              value={statType}
              onChange={(e) => handleStatTypeChange(e.target.value as 'expense' | 'income')}
              sx={{ minWidth: '120px' }}
            >
              <MenuItem value="expense">Expense</MenuItem>
              <MenuItem value="income">Income</MenuItem>
            </TextField>

            <TextField
              select
              size="small"
              label="Category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              sx={{ minWidth: '160px' }}
            >
              <MenuItem value="all">All Categories</MenuItem>
              {categories.filter((c) => c.type === statType).map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Dynamic Category Breakdown with Month & Year Selectors */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PieIcon size={18} /> Category Breakdown
                </Typography>

                {/* Month & Year Selectors */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel id="breakdown-month-label">Month</InputLabel>
                    <Select
                      labelId="breakdown-month-label"
                      value={breakdownMonth}
                      label="Month"
                      onChange={(e) => setBreakdownMonth(Number(e.target.value))}
                      sx={{ borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem' }}
                    >
                      {MONTHS.map((monthName, idx) => (
                        <MenuItem key={monthName} value={idx}>
                          {monthName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 90 }}>
                    <InputLabel id="breakdown-year-label">Year</InputLabel>
                    <Select
                      labelId="breakdown-year-label"
                      value={breakdownYear}
                      label="Year"
                      onChange={(e) => setBreakdownYear(Number(e.target.value))}
                      sx={{ borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem' }}
                    >
                      {availableYears.map((year) => (
                        <MenuItem key={year} value={year}>
                          {year}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {categoryBreakdown.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary', py: 6, textAlign: 'center' }}>
                  No {statType}s recorded for {MONTHS[breakdownMonth]} {breakdownYear}.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* SVG Pie Chart */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 1 }}>
                    <Box sx={{ position: 'relative', width: '170px', height: '170px' }}>
                      <svg width="170" height="170" viewBox="0 0 32 32">
                        {(() => {
                          if (categoryBreakdown.length === 1 || categoryBreakdown.some((item) => item.amount === totalBreakdownAmount)) {
                            return (
                              <circle
                                cx="16"
                                cy="16"
                                r="16"
                                fill={categoryBreakdown[0].color}
                                style={{ cursor: 'pointer' }}
                                onClick={() => setSelectedCategory(categoryBreakdown[0].id)}
                              />
                            );
                          }

                          let cumulativePercent = 0;
                          return categoryBreakdown.map((item, idx) => {
                            const percentage = totalBreakdownAmount > 0 ? item.amount / totalBreakdownAmount : 0;
                            if (percentage <= 0) return null;

                            const startAngle = cumulativePercent * 360;
                            cumulativePercent += percentage;
                            const endAngle = cumulativePercent * 360;

                            const x1 = 16 + 16 * Math.cos((Math.PI * (startAngle - 90)) / 180);
                            const y1 = 16 + 16 * Math.sin((Math.PI * (startAngle - 90)) / 180);
                            const x2 = 16 + 16 * Math.cos((Math.PI * (endAngle - 90)) / 180);
                            const y2 = 16 + 16 * Math.sin((Math.PI * (endAngle - 90)) / 180);
                            const largeArcFlag = percentage > 0.5 ? 1 : 0;
                            const isSelected = selectedCategory === item.id;
                            const isHovered = hoveredPieIndex === idx;

                            return (
                              <path
                                key={idx}
                                d={`M 16 16 L ${x1} ${y1} A 16 16 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                                fill={item.color}
                                stroke={theme.palette.background.paper}
                                strokeWidth={isSelected || isHovered ? '1' : '0.4'}
                                style={{
                                  cursor: 'pointer',
                                  transform: isHovered || isSelected ? 'scale(1.04)' : 'scale(1)',
                                  transformOrigin: 'center',
                                  transition: 'all 0.2s ease',
                                  opacity: selectedCategory !== 'all' && !isSelected ? 0.45 : 1,
                                }}
                                onMouseEnter={() => setHoveredPieIndex(idx)}
                                onMouseLeave={() => setHoveredPieIndex(null)}
                                onClick={() => setSelectedCategory(isSelected ? 'all' : item.id)}
                              />
                            );
                          });
                        })()}
                        <circle cx="16" cy="16" r="8.5" fill={theme.palette.background.paper} />
                      </svg>
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          textAlign: 'center',
                          pointerEvents: 'none',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary', fontWeight: 700, display: 'block' }}>
                          TOTAL
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                          {format(totalBreakdownAmount)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Progress Bars & Details List */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {categoryBreakdown.map((item) => {
                      const isSelected = selectedCategory === item.id;
                      return (
                        <Box
                          key={item.id}
                          onClick={() => setSelectedCategory(isSelected ? 'all' : item.id)}
                          sx={{
                            cursor: 'pointer',
                            p: 1,
                            borderRadius: '10px',
                            bgcolor: isSelected ? 'action.selected' : 'transparent',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color }} />
                              {item.name}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                              {format(item.amount)}{' '}
                              <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
                                ({item.percentage.toFixed(1)}%)
                              </Typography>
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={item.percentage}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: 'action.hover',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                backgroundColor: item.color,
                              },
                            }}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Temporal Volumes Bar Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChart3 size={18} /> Temporal Volumes ({groupBy.toUpperCase()})
              </Typography>

              {periodicData.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary', py: 6, textAlign: 'center', my: 'auto' }}>
                  No historical volume data available.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '85px 1fr', gap: 1, alignItems: 'stretch' }}>
                    {/* Y-Axis Ticks */}
                    <Box
                      sx={{
                        position: 'relative',
                        height: '180px',
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        pr: 1.5,
                      }}
                    >
                      {barYAxis.ticks.map((tickVal, i) => {
                        const topPercent = (1 - tickVal / barYAxis.max) * 100;
                        return (
                          <Typography
                            key={i}
                            variant="caption"
                            sx={{
                              position: 'absolute',
                              top: `${topPercent}%`,
                              right: '12px',
                              transform: 'translateY(-50%)',
                              fontSize: '0.65rem',
                              color: 'text.secondary',
                              fontWeight: 700,
                              lineHeight: 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {format(tickVal)}
                          </Typography>
                        );
                      })}
                    </Box>

                    {/* Chart Body */}
                    <Box sx={{ position: 'relative', height: '215px', width: '100%' }}>
                      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '180px', pointerEvents: 'none' }}>
                        {barYAxis.ticks.map((tickVal, idx) => {
                          const topPercent = (1 - tickVal / barYAxis.max) * 100;
                          return (
                            <Box
                              key={idx}
                              sx={{
                                position: 'absolute',
                                top: `${topPercent}%`,
                                left: 0,
                                right: 0,
                                height: '1px',
                                bgcolor: 'divider',
                                opacity: 0.6,
                              }}
                            />
                          );
                        })}
                      </Box>

                      <Box
                        sx={{
                          display: 'flex',
                          height: '100%',
                          justify: periodicData.length === 1 ? 'center' : 'space-around',
                          alignItems: 'stretch',
                          width: '100%',
                        }}
                      >
                        {periodicData.map(({ label, val, rawKey }, idx) => {
                          const barHeightPercent = Math.max((val / barYAxis.max) * 100, 2);
                          const isSelectedPeriod = effectivePeriod === rawKey;

                          return (
                            <Box
                              key={idx}
                              onClick={() => setSelectedPeriod(isSelectedPeriod ? 'all' : rawKey)}
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                flex: periodicData.length === 1 ? 'none' : 1,
                                maxWidth: '50px',
                                cursor: 'pointer',
                                zIndex: 2,
                                '&:hover .bar-element': { filter: 'brightness(1.25)' },
                                '&:hover .bar-tooltip': { opacity: 1, visibility: 'visible' },
                              }}
                            >
                              <Box
                                sx={{
                                  position: 'relative',
                                  height: '180px',
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'flex-end',
                                  justify: 'center',
                                }}
                              >
                                <Box
                                  className="bar-tooltip"
                                  sx={{
                                    position: 'absolute',
                                    top: `${Math.max(100 - barHeightPercent, 10)}%`,
                                    transform: 'translateY(-115%)',
                                    bgcolor: 'background.paper',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: '6px',
                                    boxShadow: 3,
                                    zIndex: 10,
                                    opacity: 0,
                                    visibility: 'hidden',
                                    transition: 'all 0.15s ease-in-out',
                                    pointerEvents: 'none',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.7rem', display: 'block' }}>
                                    {label}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, fontSize: '0.75rem' }}>
                                    {format(val)}
                                  </Typography>
                                </Box>

                                <Box
                                  className="bar-element"
                                  sx={{
                                    width: '22px',
                                    height: `${barHeightPercent}%`,
                                    bgcolor: isSelectedPeriod ? 'secondary.main' : 'primary.main',
                                    borderRadius: '5px 5px 0 0',
                                    transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s',
                                  }}
                                />
                              </Box>

                              <Box sx={{ width: '100%', height: '1px', bgcolor: 'divider' }} />

                              <Box sx={{ height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: isSelectedPeriod ? 900 : 700,
                                    color: isSelectedPeriod ? 'primary.main' : 'text.secondary',
                                    fontSize: '0.68rem',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {label}
                                </Typography>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Selected Category Timeline (Line Graph) */}
      <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp size={18} /> {selectedCategoryName} Timeline
          </Typography>

          {timelineData.length < 2 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', py: 5, textAlign: 'center' }}>
              Add more sequential transaction data across time periods to render a trend line.
            </Typography>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: '85px 1fr', gap: 1, alignItems: 'stretch', mt: 1 }}>
              {/* Y-Axis Ticks */}
              <Box
                sx={{
                  position: 'relative',
                  height: '180px',
                  borderRight: '1px solid',
                  borderColor: 'divider',
                  pr: 1.5,
                }}
              >
                {lineYAxis.ticks.map((tickVal, i) => {
                  const topPercent = (1 - tickVal / lineYAxis.max) * 100;
                  return (
                    <Typography
                      key={i}
                      variant="caption"
                      sx={{
                        position: 'absolute',
                        top: `${topPercent}%`,
                        right: '12px',
                        transform: 'translateY(-50%)',
                        fontSize: '0.65rem',
                        color: 'text.secondary',
                        fontWeight: 700,
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {format(tickVal)}
                    </Typography>
                  );
                })}
              </Box>

              {/* Line Graph Plot & X-Axis */}
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '215px' }}>
                <Box sx={{ height: '180px', position: 'relative', width: '100%' }}>
                  <svg width="100%" height="100%" viewBox="0 0 500 150" preserveAspectRatio="none">
                    {(() => {
                      const count = timelineData.length;
                      const points = timelineData
                        .map((item, idx) => {
                          const x = count === 1 ? 250 : (idx / (count - 1)) * 460 + 20;
                          const y = 140 - (item.val / lineYAxis.max) * 130;
                          return `${x},${y}`;
                        })
                        .join(' ');

                      return (
                        <>
                          {lineYAxis.ticks.map((tickVal, idx) => {
                            const yPos = 140 - (tickVal / lineYAxis.max) * 130;
                            return (
                              <line
                                key={idx}
                                x1="0"
                                y1={yPos}
                                x2="500"
                                y2={yPos}
                                stroke={theme.palette.divider}
                                strokeWidth="0.8"
                                strokeDasharray={idx === lineYAxis.ticks.length - 1 ? undefined : '3 3'}
                              />
                            );
                          })}

                          <path d={`M 20,140 L ${points} L 480,140 Z`} fill="rgba(33, 150, 243, 0.12)" stroke="none" />

                          <polyline fill="none" stroke="#2196F3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />

                          {timelineData.map((item, idx) => {
                            const x = count === 1 ? 250 : (idx / (count - 1)) * 460 + 20;
                            const y = 140 - (item.val / lineYAxis.max) * 130;
                            const isHovered = hoveredLineIndex === idx;

                            return (
                              <circle
                                key={idx}
                                cx={x}
                                cy={y}
                                r={isHovered ? '7' : '5'}
                                fill={theme.palette.background.paper}
                                stroke="#2196F3"
                                strokeWidth="2.5"
                                style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                                onMouseEnter={() => setHoveredLineIndex(idx)}
                                onMouseLeave={() => setHoveredLineIndex(null)}
                              />
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>

                  {hoveredLineIndex !== null && timelineData[hoveredLineIndex] && (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                      {(() => {
                        const point = timelineData[hoveredLineIndex];
                        const count = timelineData.length;
                        const xPercent = count === 1 ? 50 : (hoveredLineIndex / (count - 1)) * 92 + 4;
                        const yVal = 140 - (point.val / lineYAxis.max) * 130;
                        const yPercent = (yVal / 150) * 100;

                        return (
                          <Box
                            sx={{
                              position: 'absolute',
                              left: `${xPercent}%`,
                              top: `${yPercent}%`,
                              transform: 'translate(-50%, -120%)',
                              bgcolor: 'background.paper',
                              border: '1px solid',
                              borderColor: 'divider',
                              px: 1.2,
                              py: 0.6,
                              borderRadius: '8px',
                              boxShadow: 4,
                              zIndex: 20,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.68rem', color: 'text.secondary', display: 'block' }}>
                              {point.tooltipDate}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, fontSize: '0.78rem' }}>
                              {format(point.val)}
                            </Typography>
                          </Box>
                        );
                      })()}
                    </Box>
                  )}
                </Box>

                {/* Dynamic Non-Overlapping X-Axis Labels */}
                <Box sx={{ position: 'relative', height: '35px', width: '100%', mt: 0.5 }}>
                  {(() => {
                    const count = timelineData.length;
                    if (count === 0) return null;

                    let indicesToDisplay: number[] = [];
                    if (count <= 6) {
                      indicesToDisplay = timelineData.map((_, i) => i);
                    } else {
                      const step = (count - 1) / 5;
                      indicesToDisplay = Array.from({ length: 6 }, (_, i) => Math.round(i * step));
                    }

                    return indicesToDisplay.map((pointIdx) => {
                      const item = timelineData[pointIdx];
                      if (!item) return null;
                      const leftPercent = count === 1 ? 50 : (pointIdx / (count - 1)) * 92 + 4;

                      return (
                        <Box
                          key={pointIdx}
                          sx={{
                            position: 'absolute',
                            left: `${leftPercent}%`,
                            transform:
                              count === 1
                                ? 'translateX(-50%)'
                                : pointIdx === 0
                                ? 'translateX(0%)'
                                : pointIdx === count - 1
                                ? 'translateX(-100%)'
                                : 'translateX(-50%)',
                            textAlign:
                              count === 1
                                ? 'center'
                                : pointIdx === 0
                                ? 'left'
                                : pointIdx === count - 1
                                ? 'right'
                                : 'center',
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                            {item.label}
                          </Typography>
                        </Box>
                      );
                    });
                  })()}
                </Box>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};