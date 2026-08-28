import React from "react";
import { Box, Tabs, Tab } from "@mui/material";
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
  const currentDate = new Date();
  const [activeTab, setActiveTab] = React.useState(0);

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
  // Directly pass effectivePeriod and groupBy strings
  const breakdownFilteredTx = useBreakdownFilteredTransactions(
    transactions,
    statType,
    effectivePeriod,
    groupBy
  );
  // Derived data
  const sortedCategoryOptions = getSortedCategoryOptions(categories, statType);
  const categoryBreakdown = getCategoryBreakdown(
    breakdownFilteredTx,
    categories,
    selectedCategory
  );
  const totalBreakdownAmount = useTotalBreakdownAmount(categoryBreakdown);
  const timelineData = getTimelineData(
    baseTx,
    selectedCategory,
    groupBy,
    effectivePeriod,
    categories
  );
  const lineYAxis = getLineYAxis(
    transactions,
    selectedCategory,
    groupBy,
    effectivePeriod,
    categories
  );
  const selectedCategoryName = getSelectedCategoryName(selectedCategory, categories);
  const periodicData = getPeriodicData(transactions, selectedCategory, groupBy, categories);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
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

      {/* Charts Tabs */}
      <Box sx={{ flexGrow: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          aria-label="Stats charts tabs"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            borderRadius: "12px 12px 0 0",
          }}
        >
          <Tab label="Category Breakdown" value={0} />
          <Tab label="Temporal Volumes" value={1} />
          <Tab label="Timeline" value={2} />
        </Tabs>

        {/* Tab Panels */}
        <Box sx={{ p: { xs: 1, sm: 2.5 }, flexGrow: 1, overflow: "hidden", width: "100%" }}>
          {activeTab === 0 && (
            <Box sx={{ width: "100%", minHeight: "50vh", mt: 1.5 }}>
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
            <Box sx={{ width: "100%", mt: 1.5 }}>
              <TemporalVolumesChart
                periodicData={periodicData}
                groupBy={groupBy}
              />
            </Box>
          )}

          {activeTab === 2 && (
            <Box sx={{ width: "100%", mt: 1.5 }}>
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