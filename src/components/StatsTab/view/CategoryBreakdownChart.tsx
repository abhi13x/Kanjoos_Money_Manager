import React from "react";
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  Stack,
  Chip,
  useTheme,
  alpha,
} from "@mui/material";
import { PieChart, Layers } from "lucide-react";

export interface CategoryBreakdownItem {
  id: string | number;
  name: string;
  amount: number; // in cents or currency unit
  percentage: number;
}

interface CategoryBreakdownChartProps {
  categoryBreakdown: CategoryBreakdownItem[];
  totalBreakdownAmount: number;
  selectedCategory: string | number;
  setSelectedCategory: (val: string) => void;
  effectivePeriod: string;
  groupBy: "month" | "year";
  statType: "expense" | "income";
  format: (cents: number) => string;
}

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  categoryBreakdown,
  totalBreakdownAmount,
  selectedCategory,
  setSelectedCategory,
  effectivePeriod,
  groupBy,
  statType,
  format,
}) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: "18px",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            fontSize: "1rem",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <PieChart size={18} color={theme.palette.primary.main} />
          Category Breakdown
        </Typography>

        <Stack direction="row" spacing={1}>
          <Chip
            size="small"
            label={statType.toUpperCase()}
            color={statType === "expense" ? "error" : "success"}
            variant="outlined"
            sx={{ fontWeight: 700, fontSize: "0.7rem" }}
          />
          <Chip
            size="small"
            icon={<Layers size={12} />}
            label={effectivePeriod === "all" ? `All ${groupBy}s` : effectivePeriod}
            sx={{ fontWeight: 600, fontSize: "0.7rem" }}
          />
        </Stack>
      </Box>

      {/* Total Amount Header */}
      <Box
        sx={{
          p: 2,
          mb: 3,
          borderRadius: "12px",
          bgcolor: alpha(
            statType === "expense" ? theme.palette.error.main : theme.palette.success.main,
            0.06
          ),
          border: "1px solid",
          borderColor: alpha(
            statType === "expense" ? theme.palette.error.main : theme.palette.success.main,
            0.15
          ),
        }}
      >
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
          TOTAL {statType.toUpperCase()} ({effectivePeriod === "all" ? "ALL TIME" : effectivePeriod})
        </Typography>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            color: statType === "expense" ? "error.main" : "success.main",
            mt: 0.5,
          }}
        >
          {format(totalBreakdownAmount)}
        </Typography>
      </Box>

      {/* Category List */}
      {categoryBreakdown.length === 0 ? (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No transactions found for the selected period.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2.5}>
          {categoryBreakdown.map((item) => {
            const isSelected = String(item.id) === String(selectedCategory);
            return (
              <Box
                key={String(item.id)}
                onClick={() => setSelectedCategory(String(item.id))}
                sx={{
                  cursor: "pointer",
                  p: 1,
                  borderRadius: "8px",
                  transition: "background-color 0.2s",
                  bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.08) : "transparent",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.action.hover, 0.08),
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 0.75,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: isSelected ? 700 : 600 }}>
                    {item.name}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {format(item.amount)} ({item.percentage.toFixed(1)}%)
                  </Typography>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={Math.min(item.percentage, 100)}
                  sx={{
                    height: 8,
                    borderRadius: "4px",
                    bgcolor: alpha(theme.palette.text.disabled, 0.12),
                    "& .MuiLinearProgress-bar": {
                      borderRadius: "4px",
                      bgcolor:
                        statType === "expense" ? "error.main" : "success.main",
                    },
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
};