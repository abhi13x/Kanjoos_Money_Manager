# Money Manager - File Structure and Descriptions

## Folder Structure

```
money-manager/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── assets/
│   │   └── (static assets like images, if any)
│   ├── components/
│   │   ├── AccountsTab.tsx
│   │   ├── CategoriesTab/
│   │   │   ├── CategoriesTab.tsx
│   │   │   └── views/
│   │   │       ├── AddCategoryModal.tsx
│   │   │       ├── EditCategoryModal.tsx
│   │   │       ├── MainCategory.tsx
│   │   │       ├── Subcategories.tsx
│   │   │       ├── TabSelector.tsx
│   │   │       └── TopHeaderNav.tsx
│   │   ├── Dashboard.tsx
│   │   ├── iOSSafeAreaLayoutContainer.tsx
│   │   ├── SettingsTab.tsx
│   │   ├── StatsTab/
│   │   │   ├── StatsTab.tsx
│   │   │   ├── features/
│   │   │   │   ├── Axis.tsx
│   │   │   │   ├── CategoryManager.tsx
│   │   │   │   ├── Chart/
│   │   │   │   │   ├── Periodic.tsx
│   │   │   │   │   ├── PieAndTable.tsx
│   │   │   │   │   └── Timeline.tsx
│   │   │   │   ├── ControlState.tsx
│   │   │   │   ├── DataFilters.tsx
│   │   │   │   └── Helper.tsx
│   │   │   └── view/
│   │   │       ├── CategoryBreakdownChart.tsx
│   │   │       ├── DashboardControlHeader.tsx
│   │   │       ├── TemporalVolumesChart.tsx
│   │   │       └── TimelineChart.tsx
│   │   ├── SummaryTab.tsx
│   │   ├── TabMenu.tsx
│   │   ├── TransactionModal/
│   │   │   ├── TransactionModal.tsx
│   │   │   └── views/
│   │   │       ├── AccAndCategory.tsx
│   │   │       ├── DatePicker.tsx
│   │   │       ├── Recurring.tsx
│   │   │       └── SegmentTypeSwitch.tsx
│   │   └── TransactionTab/
│   │       ├── TransactionTab.tsx
│   │       ├── feature/
│   │       │   ├── filterTransaction.tsx
│   │       │   └── GroupData.tsx
│   │       └── view/
│   │           ├── DateRangePicker.tsx
│   │           ├── DeleteDialog.tsx
│   │           ├── LedgerOutput/
│   │           │   ├── DataView.tsx
│   │           │   ├── DayGroupCard.tsx
│   │           │   ├── NoDataView.tsx
│   │           │   └── TransactionRow.tsx
│   │           ├── MonthSelector.tsx
│   │           └── ViewToggles.tsx
│   ├── constants/
│   │   └── statsTab.ts
│   ├── db/
│   │   └── schema.ts
│   ├── hooks/
│   │   ├── useGDriveSession.ts
│   │   ├── useSettings.ts
│   │   ├── useUserSummary.ts
│   │   └── useWindowSize.ts
│   ├── services/
│   │   ├── financeService.ts
│   │   ├── gdriveSync.ts
│   │   ├── investmentFormulas.ts
│   │   ├── investmentService.ts
│   │   └── themeService.ts
│   ├── types/
│   │   ├── finance.ts
│   │   └── google.d.ts
├── test/
│   ├── setupTests.ts
│   └── services/
│       └── investmentFormulas.test.ts
├── .env
├── .gitignore
├── bun.lock
├── eslint.config.js
├── index.html
├── modularity_graph.md
├── package.json
├── README.md
├── SKILL.md
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts
```

## File Descriptions

### Root Files
- **.env**: Environment variables (e.g., Google Client ID).
- **.gitignore**: Specifies files and directories to ignore in Git.
- **bun.lock**: Lock file for Bun package manager.
- **eslint.config.js**: ESLint configuration for code linting.
- **index.html**: Main HTML template for the Vite app.
- **modularity_graph.md**: Likely a diagram or documentation about module dependencies.
- **package.json**: Defines project dependencies, scripts, and metadata.
- **README.md**: Project overview, features, setup instructions, and high-level architecture.
- **SKILL.md**: Detailed technical specification covering architecture, data flow, and business logic.
- **tsconfig.app.json**: TypeScript configuration for the React app.
- **tsconfig.json**: Base TypeScript configuration.
- **tsconfig.node.json**: TypeScript configuration for Node.js (if any).
- **vite.config.ts**: Vite build configuration.
- **vitest.config.ts**: Vitest testing configuration.

### Public
- **public/favicon.svg**: Favicon for the browser tab.
- **public/icons.svg**: SVG icons used in the app.

### Source (src)
- **src/App.css**: Global CSS styles.
- **src/App.tsx**: Main React component that sets up routing and layout.
- **src/index.css**: Global CSS imports (possibly Tailwind base).
- **src/main.tsx**: Entry point that renders the App into the DOM.

### Components
- **src/components/AccountsTab.tsx**: View for managing financial accounts (add, edit, view balances).
- **src/components/CategoriesTab/CategoriesTab.tsx**: Main component for the Categories tab, managing category hierarchy.
- **src/components/CategoriesTab/views/AddCategoryModal.tsx**: Modal for adding a new category.
- **src/components/CategoriesTab/views/EditCategoryModal.tsx**: Modal for editing an existing category.
- **src/components/CategoriesTab/views/MainCategory.tsx**: Displays a top-level category and its subcategories.
- **src/components/CategoriesTab/views/Subcategories.tsx**: Lists subcategories under a parent category.
- **src/components/CategoriesTab/views/TabSelector.tsx**: Allows switching between different category views (e.g., income vs expense).
- **src/components/CategoriesTab/views/TopHeaderNav.tsx**: Header navigation within the Categories tab.
- **src/components/Dashboard.tsx**: Main dashboard showing overview of finances, recent transactions, and quick actions.
- **src/components/DriveSyncSettings.tsx**: View for managing Google Drive synchronization, including connecting, syncing, backing up, and restoring data.
- **src/components/iOSSafeAreaLayoutContainer.tsx**: Wrapper to handle iOS safe area (notch) for mobile responsiveness.
- **src/components/SettingsTab.tsx**: View for app settings, including Google Drive sync configuration.
- **src/components/StatsTab/StatsTab.tsx**: Main component for the Statistics tab, displaying charts and financial metrics.
- **src/components/StatsTab/features/Axis.tsx**: Custom axis component for charts.
- **src/components/StatsTab/features/CategoryManager.tsx**: Manages category selection and filtering for stats.
- **src/components/StatsTab/features/Chart/Periodic.tsx**: Chart showing periodic (e.g., monthly) income vs expenses.
- **src/components/StatsTab/features/Chart/PieAndTable.tsx**: Pie chart with accompanying table for category breakdown.
- **src/components/StatsTab/features/Chart/Timeline.tsx**: Timeline chart showing transaction trends over time.
- **src/components/StatsTab/features/ControlState.tsx**: Manages UI state for chart controls (date range, etc.).
- **src/components/StatsTab/features/DataFilters.tsx**: UI components for filtering data shown in stats.
- **src/components/StatsTab/features/Helper.tsx**: Utility functions or helpers for stats calculations.
- **src/components/StatsTab/view/CategoryBreakdownChart.tsx**: Chart visualizing spending by category.
- **src/components/StatsTab/view/DashboardControlHeader.tsx**: Header with controls for the dashboard (maybe reused).
- **src/components/StatsTab/view/TemporalVolumesChart.tsx**: Chart showing transaction volumes over time.
- **src/components/StatsTab/view/TimelineChart.tsx**: Chart showing transactions on a timeline.
- **src/components/SummaryTab.tsx**: View summarizing transactions (e.g., by month, category).
- **src/components/TabMenu.tsx**: Bottom or side navigation menu to switch between tabs (Accounts, Stats, Summary, Settings).
- **src/components/TransactionModal/TransactionModal.tsx**: Main modal for adding or editing a transaction.
- **src/components/TransactionModal/views/AccAndCategory.tsx**: Selectors for account and category within the transaction modal.
- **src/components/TransactionModal/views/DatePicker.tsx**: Custom date picker for transaction date.
- **src/components/TransactionModal/views/Recurring.tsx**: Options for setting up recurring transactions.
- **src/components/TransactionModal/views/SegmentTypeSwitch.tsx**: Switch to select transaction type (Income, Expense, Transfer).
- **src/components/TransactionTab/TransactionTab.tsx**: Main view for listing and managing transactions.
- **src/components/TransactionTab/feature/filterTransaction.tsx**: Logic or UI for filtering transactions (by date, account, etc.).
- **src/components/TransactionTab/feature/GroupData.tsx**: Groups transactions for display (e.g., by day, month).
- **src/components/TransactionTab/view/DateRangePicker.tsx**: Picker for selecting a date range to filter transactions.
- **src/components/TransactionTab/view/DeleteDialog.tsx**: Confirmation dialog for deleting a transaction.
- **src/components/TransactionTab/view/LedgerOutput/DataView.tsx**: Main table or list view of transactions.
- **src/components/TransactionTab/view/LedgerOutput/DayGroupCard.tsx**: Card component grouping transactions by day.
- **src/components/TransactionTab/view/LedgerOutput/NoDataView.tsx**: Shown when there are no transactions to display.
- **src/components/TransactionTab/view/LedgerOutput/TransactionRow.tsx**: Individual row representing a transaction in the ledger.
- **src/components/TransactionTab/view/MonthSelector.tsx**: Dropdown to select a month for viewing transactions.
- **src/components/TransactionTab/view/ViewToggles.tsx**: Toggles to switch between different views (e.g., list, chart).

### Constants
- **src/constants/statsTab.ts**: Constants used in the Statistics tab (e.g., chart colors, default time ranges).

### Database
- **src/db/schema.ts**: Defines the Dexie database schema for accounts, categories, and transactions; includes seeding logic.

### Hooks
- **src/hooks/useGDriveSession.ts**: Manages Google Drive authentication session and token handling.
- **src/hooks/useSettings.ts**: Persists and retrieves user settings (theme, currency, sync preferences) from localStorage.
- **src/hooks/useUserSummary.ts**: Computes aggregated financial summaries (total assets, monthly income/expenses, etc.).
- **src/hooks/useWindowSize.ts**: Tracks browser window dimensions for responsive layout adjustments.

### Services
- **src/services/financeService.ts**: Core business logic for transactions: adding, updating, deleting transactions while atomically updating account balances.
- **src/services/gdriveSync.ts**: Handles Google Drive API integration for backing up and restoring the database via OAuth2.
- **src/services/investmentFormulas.ts**: Financial formulas for calculating investment returns, interest, etc.
- **src/services/investmentService.ts**: Service for managing investment accounts and transactions (stocks, mutual funds).
- **src/services/themeService.ts**: Manages application theme (light/dark) and persists user preference.

### Types
- **src/types/finance.ts**: TypeScript interfaces and types for financial domain (Account, Category, Transaction, etc.) and currency conversion utilities.
- **src/types/google.d.ts**: TypeScript declarations for Google API libraries (gapi, etc.).

### Test
- **test/setupTests.ts**: Setup for Vitest (e.g., extending matchers, mocking).
- **test/services/investmentFormulas.test.ts**: Unit tests for the investment formulas service.