import { getTimelineData } from './Chart/Timeline';
import { getNiceYAxis } from './Helper';

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