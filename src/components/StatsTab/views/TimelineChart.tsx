import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
} from '@mui/material';
import { TrendingUp } from 'lucide-react';
import { formatCompact } from '../features/Helper';

export interface TimelineDataPoint {
  label: string;
  val: number;
  tooltipDate: string;
}

export interface LineYAxis {
  ticks: number[];
  max: number;
}

export interface TimelineChartProps {
  timelineData: TimelineDataPoint[];
  lineYAxis: LineYAxis;
  selectedCategoryName: string;
  hoveredLineIndex: number | null;
  setHoveredLineIndex: (idx: number | null) => void;
  format: (cents: number) => string;
}

export const TimelineChart: React.FC<TimelineChartProps> = ({
  timelineData,
  lineYAxis,
  selectedCategoryName,
  hoveredLineIndex,
  setHoveredLineIndex,
  format,
}) => {
  const theme = useTheme();
  const count = timelineData.length;

  // Chart dimensions in SVG coordinate space
  const svgWidth = 500;
  const svgHeight = 200;
  const paddingLeft = 55;  // Space for Y-axis labels
  const paddingRight = 20; // Symmetric right margin
  const paddingTop = 20;   // Top headroom
  const paddingBottom = 35;// Space for X-axis labels

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const safeMax = useMemo(() => (lineYAxis.max > 0 ? lineYAxis.max : 1), [lineYAxis.max]);

  // Compute exact coordinates for SVG rendering
  const { pointsString, calculatedPoints } = useMemo(() => {
    if (count === 0) return { pointsString: '', calculatedPoints: [] };

    const points = timelineData.map((item, idx) => {
      const x = count === 1
        ? paddingLeft + plotWidth / 2
        : paddingLeft + (idx / (count - 1)) * plotWidth;
      const y = paddingTop + plotHeight - (item.val / safeMax) * plotHeight;
      return { x, y, item, idx };
    });

    const pointsString = points.map((p) => `${p.x},${p.y}`).join(' ');
    return { pointsString, calculatedPoints: points };
  }, [timelineData, safeMax, count, plotWidth, plotHeight, paddingLeft, paddingTop]);

  // X-axis label filtering (up to 6 ticks)
  const xTicks = useMemo(() => {
    if (count === 0) return [];
    if (count <= 6) return timelineData.map((d, i) => ({ label: d.label, index: i }));
    const step = (count - 1) / 5;
    return Array.from({ length: 6 }, (_, i) => {
      const idx = Math.round(i * step);
      return { label: timelineData[idx]?.label || '', index: idx };
    });
  }, [count, timelineData]);

  // Active hover tooltip positioning
  const activePoint = hoveredLineIndex !== null ? calculatedPoints[hoveredLineIndex] : null;

  return (
    <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp size={18} /> {selectedCategoryName} Timeline
        </Typography>

        {count === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 5, textAlign: 'center' }}>
            No transactions recorded for the selected time horizon and category filter.
          </Typography>
        ) : (
          <Box sx={{ width: '100%', position: 'relative' }}>
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ overflow: 'visible' }}
            >
              {/* Horizontal Gridlines & Y-Axis Labels */}
              {lineYAxis.ticks.map((tickVal, idx) => {
                const yPos = paddingTop + plotHeight - (tickVal / safeMax) * plotHeight;
                return (
                  <g key={idx}>
                    <line
                      x1={paddingLeft}
                      y1={yPos}
                      x2={svgWidth - paddingRight}
                      y2={yPos}
                      stroke={theme.palette.divider}
                      strokeWidth="0.8"
                      strokeDasharray={idx === 0 ? undefined : '3 3'}
                    />
                    <text
                      x={paddingLeft - 8}
                      y={yPos + 3}
                      textAnchor="end"
                      fill={theme.palette.text.secondary}
                      fontSize="11"
                      fontWeight="600"
                    >
                      {formatCompact(tickVal)}
                    </text>
                  </g>
                );
              })}

              {/* Gradient Underlay */}
              {count > 1 && (
                <polygon
                  points={`${paddingLeft},${paddingTop + plotHeight} ${pointsString} ${svgWidth - paddingRight},${paddingTop + plotHeight}`}
                  fill={theme.palette.primary.main}
                  fillOpacity={0.1}
                />
              )}

              {/* Connecting Line */}
              {count > 1 && (
                <polyline
                  fill="none"
                  stroke={theme.palette.primary.main}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pointsString}
                />
              )}

              {/* Data Circles */}
              {calculatedPoints.map(({ x, y, idx }) => {
                const isHovered = hoveredLineIndex === idx;
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r={isHovered ? 6 : 4}
                    fill={theme.palette.background.paper}
                    stroke={theme.palette.primary.main}
                    strokeWidth="2"
                    style={{ cursor: 'pointer', transition: 'all 0.15s ease-in-out' }}
                    onMouseEnter={() => setHoveredLineIndex(idx)}
                    onMouseLeave={() => setHoveredLineIndex(null)}
                  />
                );
              })}

              {/* X-Axis Labels */}
              {xTicks.map(({ label, index }) => {
                const xPos = count === 1
                  ? paddingLeft + plotWidth / 2
                  : paddingLeft + (index / (count - 1)) * plotWidth;

                // Explicitly type textAnchor to match SVG attributes
                let textAnchor: 'start' | 'end' | 'middle' = 'middle';
                if (index === 0 && count > 1) textAnchor = 'start';
                if (index === count - 1 && count > 1) textAnchor = 'end';

                return (
                  <text
                    key={index}
                    x={xPos}
                    y={svgHeight - 8}
                    textAnchor={textAnchor}
                    fill={theme.palette.text.secondary}
                    fontSize="11"
                    fontWeight="600"
                  >
                    {label}
                  </text>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {activePoint && (
              <Box
                sx={{
                  position: 'absolute',
                  left: `${(activePoint.x / svgWidth) * 100}%`,
                  top: `${(activePoint.y / svgHeight) * 100}%`,
                  transform: 'translate(-50%, -125%)',
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  px: 1.2,
                  py: 0.5,
                  borderRadius: '8px',
                  boxShadow: 4,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.68rem', color: 'text.secondary', display: 'block' }}>
                  {activePoint.item.tooltipDate}
                </Typography>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, fontSize: '0.78rem' }}>
                  {format(activePoint.item.val)}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};