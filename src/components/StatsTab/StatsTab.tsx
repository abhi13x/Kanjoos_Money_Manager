import React, { useMemo, useState } from "react";
import { Box, Tabs, Tab, useTheme, alpha } from "@mui/material";
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

  // Data filtering hooks driven by Header state
  const baseTx = useBaseTransactions(transactions, statType);
  const availablePeriods = useAvailablePeriods(baseTx, groupBy);
  const effectivePeriod = useEffectivePeriod(selectedPeriod, availablePeriods);

  // Breakdown transactions dynamically filtered by header effectivePeriod & groupBy
  const breakdownFilteredTx = useBreakdownFilteredTransactions(
    transactions,
    statType,
    effectivePeriod,
    groupBy
  );

  // Sorted category options (includes parent categories and nested subcategories)
  const sortedCategoryOptions = useMemo(
    () => getSortedCategoryOptions(categories, statType),
    [categories, statType]
  );

  // Generate breakdown chart data
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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
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

      {/* iOS HIG Segmented Control Container */}
      <Box sx={{ width: "100%" }}>
        <Box
          sx={{
            p: "3px",
            bgcolor: alpha(theme.palette.text.primary, 0.06),
            borderRadius: "12px",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
            aria-label="Stats charts tabs"
            sx={{
              minHeight: 40,
              "& .MuiTabs-indicator": {
                display: "none", // Modern MUI way to hide default indicator line
              },
              "& .MuiTab-root": {
                minHeight: 40,
                borderRadius: "9px",
                fontSize: "13px", // iOS Footnote typography scale
                fontWeight: 600,
                lineHeight: "18px",
                letterSpacing: "-0.08px",
                textTransform: "none",
                color: "text.secondary",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                "&.Mui-selected": {
                  color: "text.primary",
                  bgcolor: "background.paper",
                  boxShadow: "0px 3px 8px rgba(0, 0, 0, 0.12), 0px 3px 1px rgba(0, 0, 0, 0.04)",
                },
              },
            }}
          >
            <Tab label="Category Breakdown" value={0} />
            <Tab label="Temporal Volumes" value={1} />
            <Tab label="Timeline" value={2} />
          </Tabs>
        </Box>

        {/* Tab Panels */}
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