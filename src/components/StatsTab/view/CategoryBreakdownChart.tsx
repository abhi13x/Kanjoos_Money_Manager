import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  MenuItem,
  InputLabel,
  Select,
  LinearProgress,
  FormControl,
  useTheme,
} from '@mui/material';
import {
  PieChart,
  PiePlot,
} from '@mui/x-charts';
import { PieChart as PieIcon } from 'lucide-react';
import { MONTHS } from '@/constants/statsTab';

interface PieSlice {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface CategoryBreakdownChartProps {
  categoryBreakdown: Array<{
    id: string;
    name: string;
    amount: number;
    percentage: number;
    color: string;
    subCategories: Array<{
      id: string;
      name: string;
      amount: number;
      percentageOfTotal: number;
    }>;
  }>;
  totalBreakdownAmount: number;
  selectedCategory: string;
  setSelectedCategory: (id: string) => void;
  breakdownMonth: number;
  breakdownYear: number;
  setBreakdownMonth: (month: number) => void;
  setBreakdownYear: (year: number) => void;
  availableYears: number[];
  statType: 'expense' | 'income';
  format: (cents: number) => string;
}

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  categoryBreakdown,
  totalBreakdownAmount,
  selectedCategory,
  setSelectedCategory,
  breakdownMonth,
  breakdownYear,
  setBreakdownMonth,
  setBreakdownYear,
  availableYears,
  statType,
  format
}) => {
  const theme = useTheme();
  // Calculate pie slices inline since it's view-specific logic
  const pieSlices = React.useMemo((): PieSlice[] => {
    // Drill down: If a specific category is selected, show its subcategories in the chart
    if (selectedCategory !== 'all' && categoryBreakdown.length > 0) {
      const parent = categoryBreakdown[0];
      if (parent.subCategories.length > 0) {
        return parent.subCategories.map((sub, idx) => ({
          id: sub.id,
          name: sub.name,
          amount: sub.amount,
          percentage: totalBreakdownAmount > 0 ? (sub.amount / totalBreakdownAmount) * 100 : 0,
          color: ['#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0', '#00BCD4', '#795548', '#607D8B'][idx % 8],
        }));
      }
    }

    return categoryBreakdown.map((item) => ({
      id: item.id,
      name: item.name,
      amount: item.amount,
      percentage: item.percentage,
      color: item.color,
    }));
  }, [categoryBreakdown, totalBreakdownAmount]);

  return (
    <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PieIcon size={18} /> Category Breakdown
          </Typography>

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
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 1, position: 'relative' }}>
              <Box
                sx={{
                  width: '80%',
                  aspectRatio: '1 / 1',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                <PieChart
                  sx={{ width: '100%', height: '100%' }}
                  series={[{ 
                    id: 'breakdown', 
                    type: 'pie' as const,
                    data: pieSlices.map((slice, idx) => ({
                      id: idx,
                      value: slice.percentage,
                      color: slice.color,
                      label: slice.name,
                    })),
                    innerRadius: 0.5,
                    outerRadius: '100%',
                    arcLabel: (item) => `${item.label} ${item.value.toFixed(1)}%`,
                    arcLabelRadius: '75%',
                    cornerRadius: 4,
                  }]}
                >
                  <PiePlot
                    slotProps={{
                      pieArc: {
                        stroke: theme.palette.background.paper,
                        strokeWidth: 2,
                      }
                    }}
                  />
                </PieChart>
              </Box>
              <Box
                sx={{
                  position: 'absolute',
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

            {/* Render Parent Categories and their nested Subcategories */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {categoryBreakdown.map((item) => {
                const isSelected = selectedCategory === item.id;
                return (
                  <Box
                    key={item.id}
                    sx={{
                      p: 1.5,
                      borderRadius: '12px',
                      bgcolor: isSelected ? 'action.selected' : 'action.hover',
                      border: '1px solid',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Main Parent Category Row */}
                    <Box
                      onClick={() => setSelectedCategory(isSelected ? 'all' : item.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                        <Typography variant="body2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color }} />
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
                          bgcolor: 'background.paper',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            backgroundColor: item.color,
                          },
                        }}
                      />
                    </Box>

                    {/* Nested Subcategories Container */}
                    {item.subCategories.length > 0 && (
                      <Box
                        sx={{
                          pl: 2,
                          mt: 1.5,
                          pt: 1,
                          pb: 0.5,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                          borderLeft: '2px dashed',
                          borderColor: 'primary.main',
                        }}
                      >
                        {item.subCategories.map((sub) => {
                          const isSubSelected = selectedCategory === sub.id;
                          return (
                            <Box
                              key={sub.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCategory(isSubSelected ? 'all' : sub.id);
                              }}
                              sx={{
                                cursor: 'pointer',
                                p: 1,
                                px: 1.5,
                                borderRadius: '8px',
                                bgcolor: isSubSelected ? 'action.selected' : 'background.paper',
                                border: '1px solid',
                                borderColor: isSubSelected ? 'primary.main' : 'divider',
                                '&:hover': { borderColor: 'primary.main' },
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 700,
                                  color: isSubSelected ? 'primary.main' : 'text.primary',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  fontSize: '0.82rem',
                                }}
                              >
                                <span style={{ color: theme.palette.text.secondary }}>↳</span> {sub.name}
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.82rem' }}>
                                {format(sub.amount)}{' '}
                                <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                                  ({sub.percentageOfTotal.toFixed(1)}%)
                                </Typography>
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};