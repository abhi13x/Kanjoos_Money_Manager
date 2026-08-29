import React, { useMemo, useState } from "react";
import { Box, Tabs, Tab, useTheme } from "@mui/material";
import type { Transaction, Category } from "@/db/schema";
import {
  getSortedCategoryOptions,
  getCategoryBreakdown,
  getSelectedCategoryName,
} from "./features/CategoryManager";
import { getTimelineData } from "./features/Chart/Timeline";
import { getPeriodicData } from "./features/Chart/Periodic";
import { getLineYAxis } from "./features/Axis";
import { useControlState } from "./features/ControlState";
import { DashboardControlHeader } from "./view/DashboardControlHeader";
import { CategoryBreakdownChart } from "./view/CategoryBreakdownChart";
import { TemporalVolumesChart } from "./view/TemporalVolumesChart";
import { TimelineChart } from "./view/TimelineChart";
import {
  useBaseTransactions,
  useAvailablePeriods,
  useEffectivePeriod,
  useBreakdownFilteredTransactions,
  useTotalBreakdownAmount,
} from "./features/DataFilters";

interface StatsTabProps {
  transactions: Transaction[];
  categories: Category[];
  format: (cents: number) => string;
}

export const StatsTab: React.FC<StatsTabProps> = ({
  transactions,
  categories,
  format,
}) => {
  const theme = useTheme();
  const currentDate = new Date();
  const [activeTab, setActiveTab] = useState(0);

  const {
    statType,
    groupBy,
    selectedPeriod,
    selectedCategory,
    hoveredLineIndex,
    setSelectedPeriod,
    setSelectedCategory,
    setHoveredLineIndex,
    setHandleGroupByChange,
    setHandleStatTypeChange,
  } = useControlState(currentDate);

  const baseTx = useBaseTransactions(transactions, statType);
  const availablePeriods = useAvailablePeriods(baseTx, groupBy);
  const effectivePeriod = useEffectivePeriod(selectedPeriod, availablePeriods);

  const breakdownFilteredTx = useBreakdownFilteredTransactions(
    transactions,
    statType,
    effectivePeriod,
    groupBy
  );

  const sortedCategoryOptions = useMemo(
    () => getSortedCategoryOptions(categories, statType),
    [categories, statType]
  );

  const categoryBreakdown = useMemo(
    () => getCategoryBreakdown(breakdownFilteredTx, categories, selectedCategory),
    [breakdownFilteredTx, categories, selectedCategory]
  );

  const totalBreakdownAmount = useTotalBreakdownAmount(categoryBreakdown);

  const timelineData = useMemo(
    () => getTimelineData(baseTx, selectedCategory, groupBy, effectivePeriod, categories),
    [baseTx, selectedCategory, groupBy, effectivePeriod, categories]
  );

  const lineYAxis = useMemo(
    () => getLineYAxis(transactions, selectedCategory, groupBy, effectivePeriod, categories),
    [transactions, selectedCategory, groupBy, effectivePeriod, categories]
  );

  const selectedCategoryName = getSelectedCategoryName(selectedCategory, categories);

  const periodicData = useMemo(
    () => getPeriodicData(transactions, selectedCategory, groupBy, categories),
    [transactions, selectedCategory, groupBy, categories]
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif',
      }}
    >
      {/* Top iOS HIG Segmented Control: Month vs Year Switcher */}
      <Box sx={{ width: "100%" }}>
        <Box
          sx={{
            p: "2px",
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(118, 118, 128, 0.24)"
                : "rgba(118, 118, 128, 0.12)",
            borderRadius: "9px",
            display: "flex",
            alignItems: "center",
          }}
        >
          {(["month", "year"] as const).map((periodMode) => {
            const isSelected = groupBy === periodMode;
            return (
              <Box
                key={periodMode}
                onClick={() => setHandleGroupByChange(periodMode)}
                sx={{
                  flex: 1,
                  py: 0.75,
                  px: 1.5,
                  borderRadius: "7px",
                  fontSize: "13px",
                  fontWeight: 600,
                  lineHeight: "18px",
                  letterSpacing: "-0.08px",
                  textAlign: "center",
                  cursor: "pointer",
                  userSelect: "none",
                  textTransform: "capitalize",
                  color: isSelected ? "text.primary" : "text.secondary",
                  bgcolor: isSelected ? "background.paper" : "transparent",
                  boxShadow: isSelected
                    ? "0px 3px 8px rgba(0, 0, 0, 0.12), 0px 3px 1px rgba(0, 0, 0, 0.04)"
                    : "none",
                  transition: "all 0.2s cubic-bezier(0.2, 0, 0, 1)",
                  "&:active": {
                    opacity: isSelected ? 1 : 0.7,
                  },
                }}
              >
                {periodMode === "month" ? "Month" : "Year"}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Dashboard Control Header */}
      <DashboardControlHeader
        groupBy={groupBy}
        onGroupByChange={setHandleGroupByChange}
        effectivePeriod={effectivePeriod}
        onEffectivePeriodChange={(val: string) => setSelectedPeriod(val)}
        availablePeriods={availablePeriods}
        statType={statType}
        handleStatTypeChange={setHandleStatTypeChange}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        sortedCategoryOptions={sortedCategoryOptions}
      />

      {/* Navigation Tabs */}
      <Box sx={{ width: "100%" }}>
        <Box
          sx={{
            p: "2px",
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(118, 118, 128, 0.24)"
                : "rgba(118, 118, 128, 0.12)",
            borderRadius: "9px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
            aria-label="Stats charts navigation tabs"
            sx={{
              width: "100%",
              minHeight: 32,
              "& .MuiTabs-indicator": {
                display: "none",
              },
              "& .MuiTab-root": {
                minHeight: 32,
                py: 0.75,
                px: 1.5,
                borderRadius: "7px",
                fontSize: "13px",
                fontWeight: 600,
                lineHeight: "18px",
                letterSpacing: "-0.08px",
                textTransform: "none",
                color: "text.secondary",
                transition: "all 0.2s cubic-bezier(0.2, 0, 0, 1)",
                "&:active": {
                  opacity: 0.7,
                },
                "&.Mui-selected": {
                  color: "text.primary",
                  bgcolor: "background.paper",
                  boxShadow:
                    "0px 3px 8px rgba(0, 0, 0, 0.12), 0px 3px 1px rgba(0, 0, 0, 0.04)",
                  "&:active": {
                    opacity: 1,
                  },
                },
              },
            }}
          >
            <Tab label="Category Breakdown" value={0} disableRipple />
            <Tab label="Temporal Volumes" value={1} disableRipple />
            <Tab label="Timeline" value={2} disableRipple />
          </Tabs>
        </Box>

        {/* Tab Content Panels */}
        <Box sx={{ pt: 2, width: "100%" }}>
          {activeTab === 0 && (
            <Box sx={{ width: "100%", minHeight: "50vh" }}>
              <CategoryBreakdownChart
                categoryBreakdown={categoryBreakdown}
                totalBreakdownAmount={totalBreakdownAmount}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                effectivePeriod={effectivePeriod}
                groupBy={groupBy}
                statType={statType}
                format={format}
              />
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ width: "100%" }}>
              <TemporalVolumesChart
                periodicData={periodicData}
                groupBy={groupBy}
              />
            </Box>
          )}

          {activeTab === 2 && (
            <Box sx={{ width: "100%" }}>
              <TimelineChart
                timelineData={timelineData}
                lineYAxis={lineYAxis}
                selectedCategoryName={selectedCategoryName}
                hoveredLineIndex={hoveredLineIndex}
                setHoveredLineIndex={setHoveredLineIndex}
                format={format}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default StatsTab;