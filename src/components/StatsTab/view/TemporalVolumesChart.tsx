import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
} from '@mui/material';
import { BarChart3 } from 'lucide-react';

export interface PeriodicDataPoint {
  label: string;
  val: number;
  rawKey?: string;
  tooltipDate?: string;
}

export interface VolumeYAxis {
  ticks: number[];
  max: number;
}

export interface TemporalVolumesChartProps {
  periodicData?: PeriodicDataPoint[];
  volumeData?: PeriodicDataPoint[];
  groupBy?: 'month' | 'year';
  volumeYAxis?: VolumeYAxis;
  selectedCategoryName?: string;
  hoveredBarIndex?: number | null;
  setHoveredBarIndex?: (idx: number | null) => void;
  format?: (cents: number) => string;
}

/** Compact currency formatter for Y-axis labels (e.g. 1000000 cents -> ₹10k) */
const formatCompact = (cents: number): string => {
  const amount = cents / 100;
  if (amount >= 1000000) return `₹${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}k`;
  return `₹${amount}`;
};

/** Default currency formatter if standard format prop isn't passed */
const defaultFormat = (cents: number): string => `₹${(cents / 100).toFixed(2)}`;

export const TemporalVolumesChart: React.FC<TemporalVolumesChartProps> = ({
  periodicData,
  volumeData,
  groupBy,
  volumeYAxis,
  selectedCategoryName = 'Temporal Volumes',
  hoveredBarIndex: externalHoveredIdx,
  setHoveredBarIndex: externalSetHoveredIdx,
  format = defaultFormat,
}) => {
  const theme = useTheme();

  // Internal hover state fallback if external state management isn't provided by parent
  const [internalHoveredIdx, setInternalHoveredIdx] = useState<number | null>(null);
  const hoveredBarIndex = externalHoveredIdx !== undefined ? externalHoveredIdx : internalHoveredIdx;
  const setHoveredBarIndex = externalSetHoveredIdx || setInternalHoveredIdx;

  // Resolve dataset from either periodicData or volumeData prop safely
  const safeData = useMemo(() => {
    const rawList = periodicData ?? volumeData ?? [];
    return Array.isArray(rawList) ? rawList : [];
  }, [periodicData, volumeData]);

  const count = safeData.length;

  // SVG viewbox dimensions
  const svgWidth = 500;
  const svgHeight = 200;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // Calculate dynamic max value and Y-axis ticks if volumeYAxis is not provided
  const computedYAxis = useMemo(() => {
    if (volumeYAxis && volumeYAxis.ticks.length > 0) {
      return volumeYAxis;
    }
    const maxVal = safeData.reduce((max, item) => Math.max(max, Number(item.val) || 0), 0);
    const safeMax = maxVal > 0 ? maxVal : 1;
    const ticks = [0, safeMax * 0.33, safeMax * 0.66, safeMax];
    return { max: safeMax, ticks };
  }, [volumeYAxis, safeData]);

  const safeMax = computedYAxis.max > 0 ? computedYAxis.max : 1;

  // Calculate coordinates for visual bars
  const calculatedBars = useMemo(() => {
    if (count === 0) return [];

    const slotWidth = plotWidth / count;
    const barWidth = Math.min(32, Math.max(6, slotWidth * 0.55));

    return safeData.map((item, idx) => {
      const val = Number(item.val) || 0;
      const x = paddingLeft + idx * slotWidth + (slotWidth - barWidth) / 2;
      const height = (val / safeMax) * plotHeight;
      const y = paddingTop + plotHeight - height;
      const centerX = x + barWidth / 2;

      return { x, y, width: barWidth, height, centerX, item: { ...item, val }, idx };
    });
  }, [safeData, safeMax, count, plotWidth, plotHeight, paddingLeft, paddingTop]);

  // Determine X-axis tick displays (up to 6 ticks)
  const xTicks = useMemo(() => {
    if (count === 0) return [];
    if (count <= 6) return safeData.map((d, i) => ({ label: d.label, index: i }));
    const step = (count - 1) / 5;
    return Array.from({ length: 6 }, (_, i) => {
      const idx = Math.round(i * step);
      return { label: safeData[idx]?.label || '', index: idx };
    });
  }, [count, safeData]);

  const activeBar = hoveredBarIndex !== null ? calculatedBars[hoveredBarIndex] : null;

  return (
    <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChart3 size={18} /> {selectedCategoryName} {groupBy ? `(${groupBy.toUpperCase()})` : ''}
        </Typography>

        {count === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 5, textAlign: 'center' }}>
            No transaction volume data available for the selected criteria.
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
              {computedYAxis.ticks.map((tickVal, idx) => {
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

              {/* Volume Bars */}
              {calculatedBars.map(({ x, y, width, height, idx }) => {
                const isHovered = hoveredBarIndex === idx;

                return (
                  <g key={idx}>
                    {/* Interaction Target Zone */}
                    <rect
                      x={x - 4}
                      y={paddingTop}
                      width={width + 8}
                      height={plotHeight}
                      fill="transparent"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                    />
                    {/* Bar Render */}
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={Math.max(2, height)}
                      rx={4}
                      ry={4}
                      fill={isHovered ? theme.palette.primary.main : theme.palette.primary.light}
                      fillOpacity={isHovered ? 1 : 0.75}
                      style={{ transition: 'all 0.15s ease-in-out', pointerEvents: 'none' }}
                    />
                  </g>
                );
              })}

              {/* X-Axis Tick Labels */}
              {xTicks.map(({ label, index }) => {
                const slotWidth = plotWidth / count;
                const xPos = paddingLeft + index * slotWidth + slotWidth / 2;

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
            {activeBar && (
              <Box
                sx={{
                  position: 'absolute',
                  left: `${(activeBar.centerX / svgWidth) * 100}%`,
                  top: `${(activeBar.y / svgHeight) * 100}%`,
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
                  {activeBar.item.tooltipDate || activeBar.item.label}
                </Typography>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, fontSize: '0.78rem' }}>
                  {format(activeBar.item.val)}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};