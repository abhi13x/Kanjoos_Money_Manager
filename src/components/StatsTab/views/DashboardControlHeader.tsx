import React, { useMemo } from 'react';
import { Box, Card, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Filter } from 'lucide-react';
import type { SortedCategoryOption } from '../features/CategoryManager';

interface DashboardControlHeaderProps {
  groupBy: 'month' | 'year';
  effectivePeriod: string;
  onEffectivePeriodChange: (val: string) => void;
  availablePeriods: string[];
  statType: 'expense' | 'income';
  handleStatTypeChange: (val: 'expense' | 'income') => void;
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  sortedCategoryOptions: SortedCategoryOption[];
}

const MONTHS = [
  { value: '01', label: 'Jan' },
  { value: '02', label: 'Feb' },
  { value: '03', label: 'Mar' },
  { value: '04', label: 'Apr' },
  { value: '05', label: 'May' },
  { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' },
  { value: '08', label: 'Aug' },
  { value: '09', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' },
];

export const DashboardControlHeader: React.FC<DashboardControlHeaderProps> = ({
  groupBy,
  effectivePeriod,
  onEffectivePeriodChange,
  availablePeriods,
  statType,
  handleStatTypeChange,
  selectedCategory,
  setSelectedCategory,
  sortedCategoryOptions,
}) => {
  // Extract unique sorted years from availablePeriods
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    availablePeriods.forEach((p) => {
      const year = p.split('-')[0];
      if (year && year.length === 4) {
        yearsSet.add(year);
      }
    });

    if (yearsSet.size === 0) {
      yearsSet.add(String(new Date().getFullYear()));
    }

    return Array.from(yearsSet).sort().reverse();
  }, [availablePeriods]);

  // Derive active year and month for month grouping ("YYYY-MM")
  const [currentYear, currentMonth] = useMemo(() => {
    if (effectivePeriod && effectivePeriod.includes('-')) {
      const [y, m] = effectivePeriod.split('-');
      return [y, m];
    }
    const fallback = availablePeriods[0] || `${new Date().getFullYear()}-01`;
    const [fy, fm] = fallback.split('-');
    return [fy, fm || '01'];
  }, [effectivePeriod, availablePeriods]);

  const handleMonthChange = (month: string) => {
    const year = currentYear || availableYears[0] || String(new Date().getFullYear());
    onEffectivePeriodChange(`${year}-${month}`);
  };

  const handleMonthYearChange = (year: string) => {
    const month = currentMonth || '01';
    onEffectivePeriodChange(`${year}-${month}`);
  };

  // Standardize category selection value matching state ('all')
  const safeSelectedCategory =
    selectedCategory.toLowerCase() === 'all' || !selectedCategory ? 'all' : selectedCategory;

  return (
    <Card
      sx={{
        p: 2.5,
        borderRadius: '16px',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {/* Header Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Filter size={20} />
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
          Analytics Dashboard
        </Typography>
      </Box>

      {/* Filter Dropdowns */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Conditional Time Horizon Controls */}
        {groupBy === 'month' ? (
          /* Split Month & Year Dropdowns when grouped by Month */
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="month-select-label">Month</InputLabel>
              <Select
                labelId="month-select-label"
                value={currentMonth}
                label="Month"
                onChange={(e) => handleMonthChange(e.target.value)}
              >
                {MONTHS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="year-select-label">Year</InputLabel>
              <Select
                labelId="year-select-label"
                value={currentYear}
                label="Year"
                onChange={(e) => handleMonthYearChange(e.target.value)}
              >
                {availableYears.map((yr) => (
                  <MenuItem key={yr} value={yr}>
                    {yr}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        ) : (
          /* Single Year Dropdown when grouped by Year */
          <FormControl fullWidth size="small">
            <InputLabel id="single-year-select-label">Year</InputLabel>
            <Select
              labelId="single-year-select-label"
              value={
                availableYears.includes(effectivePeriod)
                  ? effectivePeriod
                  : availableYears[0] || ''
              }
              label="Year"
              onChange={(e) => onEffectivePeriodChange(e.target.value)}
            >
              {availableYears.map((yr) => (
                <MenuItem key={yr} value={yr}>
                  {yr}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Type Select */}
        <FormControl fullWidth size="small">
          <InputLabel id="stat-type-label">Type</InputLabel>
          <Select
            labelId="stat-type-label"
            value={statType}
            label="Type"
            onChange={(e) => handleStatTypeChange(e.target.value as 'expense' | 'income')}
          >
            <MenuItem value="expense">Expense</MenuItem>
            <MenuItem value="income">Income</MenuItem>
          </Select>
        </FormControl>

        {/* Category Select (Parent Categories Only) */}
        <FormControl fullWidth size="small">
          <InputLabel id="category-select-label">Category</InputLabel>
          <Select
            labelId="category-select-label"
            value={safeSelectedCategory}
            label="Category"
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {sortedCategoryOptions.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Card>
  );
};