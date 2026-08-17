import {
    Box,
    Typography,
    MenuItem,
    TextField,
    Paper,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';

import { Filter } from 'lucide-react';
import type { SortedCategoryOption } from '../features/CategoryManager';



interface DashboardControlHeaderProps {
    groupBy: 'month' | 'year';
    onGroupByChange: (val: 'month' | 'year') => void;
    effectivePeriod: string;
    onEffectivePeriodChange: (val: string) => void;
    availablePeriods: string[];
    statType: 'expense' | 'income';
    handleStatTypeChange: (val: 'expense' | 'income') => void;
    selectedCategory: string | number;
    setSelectedCategory: (val: string) => void;
    sortedCategoryOptions: SortedCategoryOption[];
}

export const DashboardControlHeader = ({
    groupBy,
    onGroupByChange,
    effectivePeriod,
    onEffectivePeriodChange,
    availablePeriods,
    statType,
    handleStatTypeChange,
    selectedCategory,
    setSelectedCategory,
    sortedCategoryOptions
}: DashboardControlHeaderProps) => {

    return (
        <Paper sx={{ p: 2, borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Typography component="span" variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Filter size={20} /> Analytics Dashboard
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <ToggleButtonGroup
                        size="small"
                        value={groupBy}
                        exclusive
                        onChange={(_, val) => val && onGroupByChange(val)}
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
                        onChange={(e) => {
                            const value = e.target.value;
                            // @ts-ignore
                            onEffectivePeriodChange(value);
                        }}
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
                        sx={{ minWidth: '220px' }}
                    >
                        <MenuItem value="all">All Categories</MenuItem>
                        {sortedCategoryOptions.map((cat) => (
                            <MenuItem
                                key={cat.id}
                                value={cat.id}
                                sx={
                                    cat.isSub
                                        ? { pl: 3.5, fontSize: '0.85rem', color: 'text.secondary' }
                                        : { fontWeight: 700 }
                                }
                            >
                                {cat.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </Box>
            </Box>
        </Paper>
    );
};