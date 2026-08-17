import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
} from '@mui/material';
import { TrendingUp } from 'lucide-react';

interface TimelineChartProps {
  timelineData: Array<{
    label: string;
    val: number;
    tooltipDate: string;
  }>;
  lineYAxis: {
    ticks: number[];
    max: number;
  };
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
  return (
    <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp size={18} /> {selectedCategoryName} Timeline
        </Typography>

        {timelineData.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 5, textAlign: 'center' }}>
            No transactions recorded for the selected time horizon and category filter.
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: '85px 1fr', gap: 1, alignItems: 'stretch', mt: 1 }}>
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

                        {count > 1 && (
                          <path d={`M 20,140 L ${points} L 480,140 Z`} fill="rgba(33, 150, 243, 0.12)" stroke="none" />
                        )}

                        {count > 1 && (
                          <polyline fill="none" stroke="#2196F3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
                        )}

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
  );
};