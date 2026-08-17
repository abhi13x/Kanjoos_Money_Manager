import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
} from '@mui/material';
import {
  BarChart,
  ChartsXAxis,
  ChartsYAxis,
  ChartsGrid,
  ChartsTooltip,
} from '@mui/x-charts';
import { BarChart3 } from 'lucide-react';

interface TemporalVolumesChartProps {
  periodicData: Array<{
    label: string;
    val: number;
    rawKey: string;
  }>;
  barYAxis: {
    ticks: number[];
    max: number;
  };
  groupBy: 'month' | 'year';
}

export const TemporalVolumesChart: React.FC<TemporalVolumesChartProps> = ({
  periodicData,
  barYAxis,
  groupBy,
}) => {
  const theme = useTheme();
  
  // Transform data for MUI X Charts - series format
  const dataset = React.useMemo(() => periodicData.map((d) => ({
    label: d.label,
    value: d.val,
    rawKey: d.rawKey,
  })), [periodicData]);
  
  const series = React.useMemo(() => [{
    id: 'volumes',
    dataKey: 'value',
  }], []);

  // Axis configuration for MUI X Charts v7+
  const xAxis = React.useMemo(() => ([{
    id: 'x-axis',
    dataKey: 'label',
    scaleType: 'band' as const,
    label: groupBy.toUpperCase(),
  }]), [groupBy]);

  const yAxis = React.useMemo(() => ([{
    id: 'y-axis',
    dataKey: 'value',
    scaleType: 'linear' as const,
    label: 'Amount',
    min: 0,
    max: barYAxis.max,
  }]), [barYAxis.max]);

  return (
    <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
      <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChart3 size={18} /> Temporal Volumes ({groupBy.toUpperCase()})
        </Typography>

        {periodicData.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 6, textAlign: 'center', my: 'auto' }}>
            No historical volume data available.
          </Typography>
        ) : (
          <Box sx={{ flexGrow: 1, width: '100%', aspectRatio: '4 / 3', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Box sx={{ width: '100%', height: '100%' }}>
              <BarChart
                series={series}
                dataset={dataset}
                xAxis={xAxis}
                yAxis={yAxis}
                sx={{ width: '100%', height: '100%' }}
                margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
                layout="vertical"
              >
                <ChartsXAxis
                  axisId="x-axis"
                  tickLabelStyle={{ 
                    fontSize: 11, 
                    fill: theme.palette.text.secondary,
                    textAnchor: 'middle',
                  }}
                  slotProps={{
                    axisLine: { stroke: theme.palette.divider },
                    axisTick: { stroke: theme.palette.divider },
                    axisTickLabel: { 
                      fontSize: 11, 
                      fill: theme.palette.text.secondary,
                      dx: 0,
                      dy: 8,
                      textAnchor: 'middle',
                    },
                  }}
                />
                <ChartsYAxis
                  axisId="y-axis"
                  tickLabelStyle={{ 
                    fontSize: 11, 
                    fill: theme.palette.text.secondary,
                    textAnchor: 'end',
                  }}
                  slotProps={{
                    axisLine: { stroke: theme.palette.divider },
                    axisTick: { stroke: theme.palette.divider },
                    axisTickLabel: { 
                      fontSize: 11, 
                      fill: theme.palette.text.secondary,
                      dx: -8,
                      dy: 0,
                      textAnchor: 'end',
                    },
                  }}
                />
                <ChartsGrid vertical={false} horizontal />
                <ChartsTooltip trigger="item" />
              </BarChart>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};