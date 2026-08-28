import { getTimelineData } from './Chart/Timeline';
import { getNiceYAxis } from './Helper';
import { getPeriodicData } from './Chart/Periodic';

/**
 * Determines the Y-axis ticks and maximum value for the bar chart.
 * Includes a 15% headroom multiplier for top padding.
 */
export const getBarYAxis = (transactions, selectedCategory, groupBy, categories) => {
    const periodicData = getPeriodicData(transactions, selectedCategory, groupBy, categories);
    const rawMax = Math.max(...periodicData.map((d) => d.val), 0);
    // Add 15% top padding to keep highest bar below top border line
    const maxVal = rawMax > 0 ? rawMax * 1.15 : 100;
    return getNiceYAxis(maxVal);
};

/**
 * Determines the Y-axis ticks and maximum value for the timeline line chart.
 * Includes a 15% headroom multiplier for top padding.
 */
export const getLineYAxis = (transactions, selectedCategory, groupBy, effectivePeriod, categories) => {
    const timelineData = getTimelineData(transactions, selectedCategory, groupBy, effectivePeriod, categories);
    const rawMax = Math.max(...timelineData.map((d) => d.val), 0);
    const maxVal = rawMax > 0 ? rawMax * 1.15 : 100;
    return getNiceYAxis(maxVal);
};