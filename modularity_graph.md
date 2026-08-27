# StatsTab Modularity Graph

This document maps the data flow and dependencies of the `StatsTab` module to guide modularization.

## 1. Architecture Overview

The `StatsTab` module follows a **Container-Logic-View** pattern:
- **Container**: `StatsTab.tsx` (Orchestrates state and data flow)
- **Logic (Features)**: `features/` directory (Pure functions for data transformation)
- **View**: `view/` directory (Presentational components)
- **State**: `ControlState.tsx` (Centralized state management)

---

## 2. Dependency Graph

### A. Data Flow Pipeline
`Input Data` $\rightarrow$ `Filter/Transformation Logic` $\rightarrow$ `Calculated Result` $\rightarrow$ `View Component`

#### 1. Timeline Chart Flow
- **Input**: `transactions`, `categories`
- **Logic**: 
    - `getTimelineData(baseTx, selectedCategory, groupBy, effectivePeriod, categories)`
    - Uses `transactionMatchesCategory` from `Helper.tsx`
- **Result**: `timelineData` (Array of `{label, val, tooltipDate}`)
- **View**: `Timeline.tsx` (via `StatsTab.tsx`)

#### 2. Category Breakdown Flow
- **Input**: `transactions`, `categories`
- **Logic**:
    - `getSortedCategoryOptions(categories, statType)` $\rightarrow$ `sortedCategoryOptions`
    - `getCategoryBreakdown(breakdownFilteredTx, categories, selectedCategory)` $\rightarrow$ `categoryBreakdown`
    - `getPieSlices(categoryBreakdown, totalBreakdownAmount)` $\rightarrow$ `pieSlices`
- **Result**: `pieSlices` (Array of `{id, name, amount, percentage, color}`)
- **View**: `PieAndTable.tsx` (via `StatsTab.tsx`)

#### 3. Bar Chart / Periodic Flow
- **Input**: `transactions`, `categories`
- **Logic**:
    - `getPeriodicData(transactions, selectedCategory, groupBy, categories)` $\rightarrow$ `periodicData`
    - `getBarYAxis(...)` $\rightarrow$ `barYAxis` (Calls `getPeriodicData` $\rightarrow$ `getNiceYAxis`)
- **Result**: `periodicData`, `barYAxis`
- **View**: `Periodic.tsx` (via `StatsTab.tsx`)

#### 4. Axis Scaling Flow
- **Input**: `maxVal` (from computed data)
- **Logic**: `getNiceYAxis(maxValue, targetTicks)` in `Helper.tsx`
- **Result**: `{ticks, max}`

---

## 3. File Linkage Map

| File | Provides (Exports) | Depends On | Purpose |
| :--- | :--- | :--- | :--- |
| `StatsTab.tsx` | `StatsTab` Component | `ControlState`, `CategoryManager`, `Timeline`, `PieAndTable`, `Periodic`, `Axis`, `DashboardControlHeader` | Main Orchestrator |
| `ControlState.tsx` | `ControlState` hook | React `useState` | Central State Store |
| `CategoryManager.tsx` | `getSortedCategoryOptions`, `getCategoryBreakdown` | `Helper.tsx` | Category logic & aggregation |
| `Timeline.tsx` | `getTimelineData` | `Helper.tsx` | Time-series data generation |
| `PieAndTable.tsx` | `getPieSlices` | `constants/statsTab` | Donut chart data preparation |
| `Periodic.tsx` | `getPeriodicData` | `Helper.tsx` | Periodic aggregation (Bar chart) |
| `Axis.tsx` | `getBarYAxis`, `getLineYAxis` | `Timeline.tsx`, `Periodic.tsx`, `Helper.tsx` | Y-Axis scale calculations |
| `Helper.tsx` | `getParentId`, `getCategoryFamilyIds`, `transactionMatchesCategory`, `getNiceYAxis` | `db/schema` | Shared utility functions |
| `DashboardControlHeader.tsx` | `DashboardControlHeader` | `ControlState`, `CategoryManager`, `Periodic` | Filter UI |

---

## 4. Modularity Opportunities

1. **Logic Extraction**: `StatsTab.tsx` still contains some `useMemo` blocks for filtering (e.g., `baseTx`, `availablePeriods`, `effectivePeriod`). These should move to `Helper.tsx` or a new `DataFilter.tsx` feature file.
2. **State Decoupling**: `DashboardControlHeader` is currently tightly coupled to the `ControlState` return type. Passing a generic `onFilterChange` prop would make it more reusable.
3. **View Isolation**: Move the SVG/Chart rendering logic inside `StatsTab.tsx` (if any remains) into separate components in `view/`.
