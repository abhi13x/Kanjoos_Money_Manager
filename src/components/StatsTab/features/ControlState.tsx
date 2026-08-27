import { useState } from 'react';

export const useControlState = (currentDate?: Date) => {
    const [statType, setStatType] = useState<'expense' | 'income'>('expense');
    const [groupBy, setGroupBy] = useState<'month' | 'year'>('month');
    const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);
    const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);

    // Category Breakdown Specific Controls
    const [breakdownMonth, setBreakdownMonth] = useState<number>(currentDate ? currentDate.getMonth() : new Date().getMonth());
    const [breakdownYear, setBreakdownYear] = useState<number>(currentDate ? currentDate.getFullYear() : new Date().getFullYear());

    const setHandleStatTypeChange = (newType: 'expense' | 'income') => {
        setStatType(newType);
        setSelectedCategory('all');
    };

    const setHandleGroupByChange = (newGroup: 'month' | 'year') => {
        setGroupBy(newGroup);
        setSelectedPeriod('all');
    };

    return {
        statType,
        setStatType,
        groupBy,
        setGroupBy,
        selectedPeriod,
        setSelectedPeriod,
        selectedCategory,
        setSelectedCategory,
        hoveredPieIndex,
        setHoveredPieIndex,
        hoveredLineIndex,
        setHoveredLineIndex,
        breakdownMonth,
        setBreakdownMonth,
        breakdownYear,
        setBreakdownYear,
        setHandleStatTypeChange,
        setHandleGroupByChange
    }
}