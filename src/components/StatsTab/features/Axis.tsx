import { getTimelineData } from './Chart/Timeline';
import { getNiceYAxis } from './Helper';
import { getPeriodicData } from './Chart/Periodic';

/**
 * Determines the Y-axis ticks and maximum value for the bar chart.
 */
export const getBarYAxis = (transactions, selectedCategory, groupBy, categories) => {
    const periodicData = getPeriodicData(transactions, selectedCategory, groupBy, categories);
    const maxVal = Math.max(...periodicData.map((d) => d.val), 0);
    return getNiceYAxis(maxVal);
};

/**
 * Determines the Y-axis ticks and maximum value for the timeline line chart.
 */
export const getLineYAxis = (transactions, selectedCategory, groupBy, effectivePeriod, categories) => {
    const timelineData = getTimelineData(transactions, selectedCategory, groupBy, effectivePeriod, categories);
    const maxVal = Math.max(...timelineData.map((d) => d.val), 0);
    return getNiceYAxis(maxVal);
};
