import React from 'react';
import {
  Box,
  Typography,
  useTheme,
} from '@mui/material';
import {
  BarChart,
} from '@mui/x-charts';
import { BarChart3 } from 'lucide-react';

interface TemporalVolumesChartProps {
  periodicData: Array<{
    label: string;
    val: number;
    rawKey: string;
  }>;
  groupBy: 'month' | 'year';
}

export const TemporalVolumesChart: React.FC<TemporalVolumesChartProps> = ({
  periodicData,
  groupBy,
}) => {
  const theme = useTheme();
  
  // Color palette for bars
  const colors = [
    '#1976D2', '#D32F2F', '#388E3C', '#F57C00', '#7B1FA2',
    '#00796B', '#C2185B', '#0097A7', '#6A1B9A', '#00695C',
    '#FF6F00', '#5E35B1', '#0288D1', '#E53935', '#43A047',
  ];
  
  // Format dataset for MUI BarChart
  const dataset = React.useMemo(() => 
    periodicData.length > 0 ? periodicData.map((d) => ({
      period: d.label,
      amount: d.val,
    })) : [],
  [periodicData]);
  
  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, px: { xs: 0, sm: 1 }, py: 0 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
        <BarChart3 size={18} /> Temporal Volumes ({groupBy.toUpperCase()})
      </Typography>

      {periodicData.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', py: 6, textAlign: 'center' }}>
          No historical volume data available.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <BarChart
            dataset={dataset}
            series={periodicData.map((_, idx) => ({
              dataKey: 'amount',
              label: ``,
              color: colors[idx % colors.length],
              valueFormatter: (value: number | null) => 
                value !== null ? `₹${(value / 100).toLocaleString()}` : '',
            }))}
            xAxis={[
              { 
                scaleType: 'band',
                dataKey: 'period',
              }
            ]}
            width={400}
            height={300}
            margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
            sx={{
              '& .MuiChartsLegend-root': {
                display: 'none',
              },
              '& .MuiChartsAxis-bottom .MuiChartsAxis-tickLabelStyle': {
                fontSize: 11,
                fill: theme.palette.text.secondary,
              },
              '& .MuiChartsAxis-left .MuiChartsAxis-tickLabelStyle': {
                fontSize: 11,
                fill: theme.palette.text.secondary,
              }
            }}
          />
        </Box>
      )}
    </Box>
  );
};