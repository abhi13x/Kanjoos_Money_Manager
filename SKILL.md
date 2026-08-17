# Technical Specification: Money Manager (Kanjoos)

This document provides a comprehensive breakdown of the code structure, data flow, and business logic for the Money Manager application.

## 🏗️ Architecture Overview

The application follows a **Service-Oriented Architecture (SOA)** on the client side, separating the UI from the data persistence and business logic layers.

### Layer Diagram
`UI Components` $\rightarrow$ `Custom Hooks` $\rightarrow$ `Service Layer` $\rightarrow$ `Data Layer (Dexie/IndexedDB)`

---

## 📂 Code Structure & Responsibilities

### 1. Data Layer (`src/db/`)
- **`schema.ts`**: 
    - Defines the `KanjoosDatabase` class extending `Dexie`.
    - **Tables**:
        - `accounts`: Stores financial accounts (Cash, Bank, etc.) with `initialBalance` and `currentBalance`.
        - `categories`: Stores income/expense categories with support for hierarchical nesting (`parentId`).
        - `transactions`: Stores all financial movements.
    - **Seeding**: `seedDefaultCategories()` ensures a baseline set of categories exists on first load.

### 2. Service Layer (`src/services/`)
This layer encapsulates all business logic to ensure data integrity.

- **`financeService.ts`**: 
    - **Atomic Transactions**: Uses `db.transaction('rw', ...)` to ensure that when a transaction is added or deleted, the corresponding account balances are updated in a single atomic operation.
    - **Balance Logic**:
        - `Income`: `Account.currentBalance += Transaction.amount`
        - `Expense`: `Account.currentBalance -= Transaction.amount`
        - `Transfer`: `SourceAccount.currentBalance -= Transaction.amount` AND `TargetAccount.currentBalance += Transaction.amount`
    - **Reversion**: `deleteTransaction` reverses the balance impact of the transaction before removing the record.

- **`gdriveSync.ts`**: 
    - **OAuth2 Flow**: Manages authentication tokens and scopes.
    - **AppData Scope**: Uses the `appDataFolder` scope to keep backups hidden from the user's main Drive view.
    - **Backup Strategy**: 
        - Generates timestamped filenames (e.g., `BKP_250726_12:00:00.000.json`).
        - Serializes the entire IndexedDB state into JSON for upload/download.
    - **Folder Management**: Automatically creates 'Backups' and 'Exports' folders within the app data directory.

### 3. State & Logic Layer (`src/hooks/`)
- **`useUserSummary.ts`**: Aggregates data from multiple tables to provide high-level financial summaries (Total Assets, Monthly Spending).
- **`useSettings.ts`**: Manages user preferences (Currency, Theme, Sync settings) persisted in local storage.

### 4. UI Layer (`src/components/`)
- **`Dashboard.tsx`**: The central hub. Uses `useLiveQuery` for real-time updates when the database changes.
- **`TransactionModal.tsx`**: The primary input for new data. Calls `financeService.addTransaction()`.
- **`TabMenu.tsx`**: Handles navigation between different functional views (Accounts, Stats, Summary, Settings).

---

## ⚙️ Core Logic & Workflows

### 1. Monetary Precision (The "Cents" Pattern)
To prevent floating-point errors (e.g., $0.1 + 0.2 = 0.30000000000000004$), the app implements a strict integer-based storage system:
- **Storage**: All amounts are stored as integers (e.g., \$10.50 is stored as `1050`).
- **Conversion**: 
    - `toCents(amount)`: `Math.round(amount * 100)`
    - `fromCents(cents)`: `cents / 100`
- **Formatting**: `formatCurrency()` uses `Intl.NumberFormat` to convert the stored integer back to a localized string for the user.

### 2. Transaction Lifecycle
**Adding a Transaction:**
1. User enters amount in `TransactionModal`.
2. `financeService.addTransaction()` is called.
3. A Dexie transaction starts.
4. The transaction record is created.
5. The `currentBalance` of the associated `Account` is updated.
6. Transaction commits.
7. `useLiveQuery` triggers a re-render of the Dashboard.

**Deleting a Transaction:**
1. `financeService.deleteTransaction(id)` is called.
2. A Dexie transaction starts.
3. The transaction is fetched to determine its impact.
4. The `Account` balance is reverted (e.g., if it was an expense, the balance is increased).
5. The transaction record is deleted.
6. Transaction commits.

### 3. Google Drive Sync Flow
**Backup Process:**
1. `GDriveSyncService` authenticates via OAuth2.
2. All tables from `KanjoosDatabase` are exported to JSON.
3. A timestamped filename is generated.
4. The file is uploaded to the `appDataFolder` under the 'Backups' folder.

**Restore Process:**
1. The user selects a backup file from Google Drive.
2. The JSON content is downloaded.
3. The local Dexie database is cleared.
4. Data is bulk-inserted into the local tables.

---

## 🛠️ Technical Constraints & Decisions
- **Local-First**: Data is owned by the user and stored in their browser.
- **Privacy**: No central server; Google Drive is used only as a storage medium for encrypted/private blobs.
- **Reactivity**: `dexie-react-hooks` ensures the UI is always in sync with the database without manual state lifting.
