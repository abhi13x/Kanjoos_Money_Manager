// view/CategoryBreakdownChart.tsx

import React, { useState, useMemo } from "react";
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
import { PieChart as PieIcon, Layers, ArrowLeft, Filter, ChevronRight } from "lucide-react";
import {
  type CategoryBreakdownItem,
  type PieSlice,
  getPieSlices,
  DEFAULT_CATEGORY_COLORS,
} from "../features/CategoryManager";

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

/** Formats period string strictly according to the active tab (Month vs Year) */
const formatPeriodDisplay = (period: string, groupBy: "month" | "year"): string => {
  if (groupBy === "year") {
    if (!period || period === "all") return "All Time";
    return period;
  }

  // Under 'month' view, 'all' is invalid; fallback to formatting month
  if (!period || period === "all") {
    const date = new Date();
    return `${date.toLocaleString("en-US", { month: "short" })} ${date.getFullYear()}`;
  }

  const parts = period.split("-");
  if (parts.length === 2) {
    const [yearStr, monthStr] = parts;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;

    if (!isNaN(year) && !isNaN(month) && month >= 0 && month < 12) {
      const date = new Date(year, month, 1);
      return `${date.toLocaleString("en-US", { month: "short" })} ${year}`;
    }
  }
  return period;
};

/** SVG Donut Arc Helper */
const getArcPath = (
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
) => {
  const angleDiff = endAngle - startAngle;
  if (angleDiff <= 0) return "";

  const safeEndAngle = angleDiff >= 360 ? startAngle + 359.999 : endAngle;

  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((safeEndAngle - 90) * Math.PI) / 180;

  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);

  const largeArcFlag = angleDiff > 180 ? 1 : 0;

  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
};

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
  const [hoveredSlice, setHoveredSlice] = useState<PieSlice | null>(null);

  const isFilteredByParent = selectedCategory !== "all" && selectedCategory !== "";
  const periodLabel = formatPeriodDisplay(effectivePeriod, groupBy);

  const pieSlices = useMemo(
    () => getPieSlices(categoryBreakdown, totalBreakdownAmount),
    [categoryBreakdown, totalBreakdownAmount]
  );

  const pieArcs = useMemo(() => {
    return pieSlices.reduce<{ slice: PieSlice; startAngle: number; endAngle: number }[]>(
      (acc, slice) => {
        const start = acc.length > 0 ? acc[acc.length - 1].endAngle : 0;
        const angle = (slice.percentage / 100) * 360;
        acc.push({ slice, startAngle: start, endAngle: start + angle });
        return acc;
      },
      []
    );
  }, [pieSlices]);

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
        p: { xs: 2, sm: 2.5 },
        borderRadius: "24px",
        border: "1px solid",
        borderColor: alpha(theme.palette.divider, 0.8),
        bgcolor: "background.paper",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif',
      }}
    >
      {/* Header Bar */}
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
            <Tooltip title="Back to all categories">
              <IconButton
                onClick={() => setSelectedCategory("all")}
                sx={{
                  mr: 0.5,
                  width: 44,
                  height: 44,
                  bgcolor: alpha(theme.palette.action.hover, 0.06),
                  borderRadius: "50%",
                }}
              >
                <ArrowLeft size={18} />
              </IconButton>
            </Tooltip>
          )}
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: "17px",
              lineHeight: "22px",
              letterSpacing: "-0.41px",
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "text.primary",
            }}
          >
            <PieIcon size={20} color={theme.palette.primary.main} />
            {isFilteredByParent ? "Child Category Breakdown" : "Parent Category Breakdown"}
          </Typography>
        </Box>

        {/* Status Chips */}
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          {isFilteredByParent && (
            <Chip
              size="small"
              icon={<Filter size={13} />}
              label="Filtered"
              color="primary"
              variant="filled"
              onDelete={() => setSelectedCategory("all")}
              sx={{ fontWeight: 500, fontSize: "13px", height: "28px", borderRadius: "14px" }}
            />
          )}
          <Chip
            size="small"
            label={statType.toUpperCase()}
            color={statType === "expense" ? "error" : "success"}
            variant="outlined"
            sx={{
              fontWeight: 600,
              fontSize: "11px",
              height: "28px",
              borderRadius: "14px",
              borderWidth: "1.5px",
            }}
          />
          <Chip
            size="small"
            icon={<Layers size={13} />}
            label={periodLabel}
            sx={{
              fontWeight: 500,
              fontSize: "13px",
              height: "28px",
              borderRadius: "14px",
              bgcolor: alpha(theme.palette.action.selected, 0.08),
            }}
          />
        </Stack>
      </Box>

      {/* Donut Chart Display */}
      {pieSlices.length > 0 && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            my: 3,
            position: "relative",
          }}
        >
          <Box sx={{ width: 200, height: 200, position: "relative" }}>
            <svg width="200" height="200" viewBox="0 0 200 200">
              {pieArcs.map(({ slice, startAngle, endAngle }) => {
                const isSelected = String(slice.id) === String(selectedCategory);
                const isHovered = hoveredSlice?.id === slice.id;
                const pathD = getArcPath(100, 100, 75, startAngle, endAngle);

                if (!pathD) return null;

                return (
                  <path
                    key={String(slice.id)}
                    d={pathD}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={isSelected || isHovered ? 24 : 18}
                    strokeLinecap="round"
                    style={{
                      cursor: "pointer",
                      transition: "stroke-width 0.2s ease, opacity 0.2s ease",
                      opacity: hoveredSlice && !isHovered ? 0.45 : 1,
                    }}
                    onMouseEnter={() => setHoveredSlice(slice)}
                    onMouseLeave={() => setHoveredSlice(null)}
                    onClick={() => handleItemClick(slice.id)}
                  />
                );
              })}
            </svg>

            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                textAlign: "center",
                px: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {hoveredSlice ? hoveredSlice.name : "Total Categories"}
              </Typography>
              <Typography
                sx={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "text.primary",
                  fontVariantNumeric: "tabular-nums",
                  mt: 0.25,
                }}
              >
                {hoveredSlice
                  ? `${hoveredSlice.percentage.toFixed(1)}%`
                  : pieSlices.length}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Summary Banner */}
      <Box
        sx={{
          p: 2,
          mb: 2.5,
          borderRadius: "18px",
          bgcolor: alpha(
            statType === "expense" ? theme.palette.error.main : theme.palette.success.main,
            0.05
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
            fontSize: "12px",
            lineHeight: "16px",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          TOTAL {statType} ({periodLabel.toUpperCase()})
        </Typography>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: "28px",
            lineHeight: "34px",
            letterSpacing: "-0.5px",
            color: statType === "expense" ? "error.main" : "success.main",
            mt: 0.5,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {format(totalBreakdownAmount)}
        </Typography>
      </Box>

      {/* Category List */}
      {categoryBreakdown.length === 0 ? (
        <Box sx={{ py: 5, textAlign: "center" }}>
          <Typography sx={{ fontSize: "15px", color: "text.secondary" }}>
            No transactions found for the selected period.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {categoryBreakdown.map((item, idx) => {
            const isSelected = String(item.id) === String(selectedCategory);
            const activeColor =
              item.color || DEFAULT_CATEGORY_COLORS[idx % DEFAULT_CATEGORY_COLORS.length];

            return (
              <Box
                key={String(item.id)}
                onClick={() => handleItemClick(item.id)}
                onMouseEnter={() =>
                  setHoveredSlice(pieSlices.find((s) => String(s.id) === String(item.id)) || null)
                }
                onMouseLeave={() => setHoveredSlice(null)}
                sx={{
                  cursor: "pointer",
                  p: 1.5,
                  minHeight: "44px",
                  borderRadius: "14px",
                  transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                  bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.08) : "transparent",
                  border: "1px solid",
                  borderColor: isSelected
                    ? alpha(theme.palette.primary.main, 0.2)
                    : "transparent",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, isSelected ? 0.12 : 0.04),
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
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: activeColor,
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: "15px",
                        lineHeight: "20px",
                        fontWeight: isSelected ? 600 : 500,
                        color: "text.primary",
                      }}
                    >
                      {item.name}
                    </Typography>
                    {!isFilteredByParent && (
                      <ChevronRight
                        size={14}
                        style={{
                          opacity: 0.4,
                          transform: isSelected ? "rotate(90deg)" : "none",
                          transition: "transform 0.2s ease",
                        }}
                      />
                    )}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "15px",
                      lineHeight: "20px",
                      fontWeight: 600,
                      color: "text.primary",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {format(item.amount)}{" "}
                    <Box
                      component="span"
                      sx={{
                        fontSize: "13px",
                        color: "text.secondary",
                        fontWeight: 500,
                        ml: 0.5,
                      }}
                    >
                      ({item.percentage.toFixed(1)}%)
                    </Box>
                  </Typography>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={Math.min(item.percentage, 100)}
                  sx={{
                    height: 6,
                    borderRadius: "3px",
                    bgcolor: alpha(theme.palette.text.primary, 0.06),
                    "& .MuiLinearProgress-bar": {
                      borderRadius: "3px",
                      bgcolor: activeColor,
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