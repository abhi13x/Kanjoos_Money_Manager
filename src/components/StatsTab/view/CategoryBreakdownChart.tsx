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
  IconButton,
  Tooltip,
} from "@mui/material";
import { PieChart, Layers, ArrowLeft, Filter } from "lucide-react";

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
  const isFilteredByParent = selectedCategory !== "all" && selectedCategory !== "";

  const handleItemClick = (itemId: string | number) => {
    const stringId = String(itemId);
    if (String(selectedCategory) === stringId) {
      setSelectedCategory("all");
    } else {
      setSelectedCategory(stringId);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5, // iOS standard inset card padding (20px)
        borderRadius: "20px", // iOS HIG continuous rounded card radius
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
          mb: 2.5,
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {isFilteredByParent && (
            <Tooltip title="Back to all parent categories">
              <IconButton
                onClick={() => setSelectedCategory("all")}
                sx={{
                  mr: 0.5,
                  width: 36,
                  height: 36, // Meets iOS touch target minimums with padding
                }}
              >
                <ArrowLeft size={20} />
              </IconButton>
            </Tooltip>
          )}
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: "17px", // iOS Headline standard
              lineHeight: "22px",
              letterSpacing: "-0.4px",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <PieChart size={20} color={theme.palette.primary.main} />
            {isFilteredByParent ? "Child Category Breakdown" : "Parent Category Breakdown"}
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", flexWrap: "wrap" }}
        >
          {isFilteredByParent && (
            <Chip
              size="small"
              icon={<Filter size={14} />}
              label="Filtered by Parent"
              color="primary"
              variant="filled"
              onDelete={() => setSelectedCategory("all")}
              sx={{
                fontWeight: 500,
                fontSize: "13px", // iOS Footnote scale
                height: "28px",
                borderRadius: "14px",
              }}
            />
          )}
          <Chip
            size="small"
            label={statType.toUpperCase()}
            color={statType === "expense" ? "error" : "success"}
            variant="outlined"
            sx={{
              fontWeight: 600,
              fontSize: "12px", // iOS Caption scale
              height: "28px",
              borderRadius: "14px",
              letterSpacing: "0.2px",
            }}
          />
          <Chip
            size="small"
            icon={<Layers size={14} />}
            label={effectivePeriod === "all" ? `All ${groupBy}s` : effectivePeriod}
            sx={{
              fontWeight: 500,
              fontSize: "13px", // iOS Footnote scale
              height: "28px",
              borderRadius: "14px",
            }}
          />
        </Stack>
      </Box>

      {/* Total Amount Banner */}
      <Box
        sx={{
          p: 2,
          mb: 2.5,
          borderRadius: "16px", // iOS sub-container radius
          bgcolor: alpha(
            statType === "expense" ? theme.palette.error.main : theme.palette.success.main,
            0.06
          ),
          border: "1px solid",
          borderColor: alpha(
            statType === "expense" ? theme.palette.error.main : theme.palette.success.main,
            0.12
          ),
        }}
      >
        <Typography
          sx={{
            color: "text.secondary",
            fontWeight: 600,
            fontSize: "12px", // iOS Caption 1 uppercase standard
            lineHeight: "16px",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          TOTAL {statType} ({effectivePeriod === "all" ? "ALL TIME" : effectivePeriod})
        </Typography>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: "28px", // iOS Title 1 typography standard
            lineHeight: "34px",
            letterSpacing: "0.36px",
            color: statType === "expense" ? "error.main" : "success.main",
            mt: 0.5,
            fontVariantNumeric: "tabular-nums", // Prevents numeric jitter
          }}
        >
          {format(totalBreakdownAmount)}
        </Typography>
      </Box>

      {/* Category List */}
      {categoryBreakdown.length === 0 ? (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography
            sx={{
              fontSize: "15px", // iOS Subhead standard
              color: "text.secondary",
              lineHeight: "20px",
            }}
          >
            {isFilteredByParent
              ? "No child category transactions found under this parent category."
              : "No transactions found for the selected period."}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {categoryBreakdown.map((item) => {
            const isSelected = String(item.id) === String(selectedCategory);
            return (
              <Box
                key={String(item.id)}
                onClick={() => handleItemClick(item.id)}
                sx={{
                  cursor: "pointer",
                  p: 1.5,
                  minHeight: "44px", // Standard iOS 44pt touch target height
                  borderRadius: "12px",
                  transition: "background-color 0.15s ease-in-out",
                  bgcolor: isSelected
                    ? alpha(theme.palette.primary.main, 0.1)
                    : "transparent",
                  "&:hover": {
                    bgcolor: alpha(
                      theme.palette.primary.main,
                      isSelected ? 0.14 : 0.04
                    ),
                  },
                  "&:active": {
                    bgcolor: alpha(
                      theme.palette.primary.main,
                      isSelected ? 0.18 : 0.08
                    ),
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "15px", // iOS Subhead typography scale
                      lineHeight: "20px",
                      letterSpacing: "-0.2px",
                      fontWeight: isSelected ? 600 : 500,
                    }}
                  >
                    {item.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "15px", // iOS Subhead typography scale
                      lineHeight: "20px",
                      letterSpacing: "-0.2px",
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums", // iOS native aligned figures
                    }}
                  >
                    {format(item.amount)} ({item.percentage.toFixed(1)}%)
                  </Typography>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={Math.min(item.percentage, 100)}
                  sx={{
                    height: 6, // Slim iOS progress bar standard
                    borderRadius: "3px",
                    bgcolor: alpha(theme.palette.text.disabled, 0.12),
                    "& .MuiLinearProgress-bar": {
                      borderRadius: "3px",
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

export default CategoryBreakdownChart;