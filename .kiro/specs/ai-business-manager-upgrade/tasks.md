# Implementation Plan: AI Business Manager Upgrade

## Overview

Incremental implementation across five phases: computation utilities, database functions, new components, existing component updates, and SQL indexes. Each phase builds on the previous, ending with full integration.

## Tasks

- [ ] 1. Install fast-check and set up test infrastructure
  - Run `npm install --save-dev fast-check` to add property-based testing library
  - Create `src/test/` directory with empty test files: `truthEngine.test.ts`, `bulkInput.test.ts`, `chatContext.test.ts`, `inventoryIntelligence.test.ts`, `appShell.test.ts`, `chatSearch.test.ts`
  - Add shared arbitraries (e.g. `arbitraryTransaction`, `arbitraryInventoryItem`, `arbitraryInventorySale`) in `src/test/arbitraries.ts`
  - _Requirements: 2.1, 2.5, 9.1_

---

- [x] 2. Add Truth Engine computation utilities to `src/lib/ai.ts`
  - [x] 2.1 Implement `computeTruthEngineData(transactions, inventoryItems, inventorySales)`
    - Compute `todayPnL`: sum income minus sum expense where `date(created_at) === today`
    - Compute `weeklyTrendPct`: `(currentWeekRevenue - prevWeekRevenue) / prevWeekRevenue * 100`, rounded to 1 decimal; return 0 when `prevWeekRevenue === 0`
    - Identify `topProduct`: inventory item with max `computeItemProfit30d` value
    - Identify `biggestExpenseCategory`: expense category with highest total spend in current month
    - Call `detectAnomaly` and include result
    - Return `Omit<TruthEngineData, 'aiTip'>`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 2.2 Write property tests for `computeTruthEngineData`
    - **Property 1: Today's P&L arithmetic invariant** — `todayPnL` equals sum of today's income minus sum of today's expenses for any transaction array
    - **Validates: Requirements 2.1**
    - **Property 2: Weekly trend percentage formula** — for any `currentWeek` and `prevWeek > 0`, result equals `(currentWeek - prevWeek) / prevWeek * 100` rounded to 1 decimal
    - **Validates: Requirements 2.2**
    - **Property 3: Top performer selection invariant** — identified top product has the maximum 30d profit; no other item has a higher value
    - **Validates: Requirements 2.3, 8.2**
    - **Property 4: Highest expense category selection** — identified category total is >= every other category's total for the current month
    - **Validates: Requirements 2.4**
    - **Property 7: Truth Engine refresh on transaction change** — after adding a transaction of known amount, `todayPnL` changes by exactly that amount
    - **Validates: Requirements 2.8**
    - _File: `src/test/truthEngine.test.ts`_

  - [x] 2.3 Implement `detectAnomaly(transactions)`
    - Group transactions by category; for each category compute mean and stddev of amounts
    - Flag the most recent transaction whose amount exceeds `mean + 3 * stddev` for its category
    - Return `{ description, amount, category }` or `null`
    - _Requirements: 2.5_

  - [ ]* 2.4 Write property test for `detectAnomaly`
    - **Property 5: Anomaly detection statistical invariant** — a transaction is flagged iff its amount exceeds `mean + 3*stddev`; transactions at or below threshold are never flagged
    - **Validates: Requirements 2.5**
    - _File: `src/test/truthEngine.test.ts`_

  - [x] 2.5 Implement `getInsightColor(value, type)`
    - `'pnl'`: green when `value > 0`, red when `value < 0`, yellow when `value === 0`
    - `'trend'`: green when `value > 0`, red when `value < 0`, yellow when `Math.abs(value) < 1`
    - `'expense'`: always red (expense category is inherently a loss indicator)
    - _Requirements: 1.3_

  - [ ]* 2.6 Write property test for `getInsightColor`
    - **Property 26: Insight card color coding** — color is deterministic for any given value and type; positive P&L → green, negative → red, anomaly/zero → yellow
    - **Validates: Requirements 1.3**
    - _File: `src/test/truthEngine.test.ts`_

- [x] 3. Add inventory intelligence utilities to `src/lib/ai.ts`
  - [x] 3.1 Implement `computeSalesVelocity(sales, itemId)`
    - Filter sales for `itemId` within last 30 days
    - Return `sum(quantity_sold) / 30`
    - _Requirements: 9.1_

  - [x] 3.2 Implement `computeDepletionDays(currentStock, velocity)`
    - Return `null` when `velocity === 0`
    - Return `Math.round(currentStock / velocity)` otherwise
    - _Requirements: 9.1, 9.6_

  - [x] 3.3 Implement `getDepletionLabel(days)`
    - `days <= 7` → `{ text: 'Runs out in ~X days', color: 'red' }`
    - `8 <= days <= 14` → `{ text: 'Runs out in ~X days', color: 'yellow' }`
    - `days > 14` → `{ text: '~X days of stock remaining', color: 'green' }`
    - `null` → `{ text: 'No sales data', color: 'gray' }`
    - _Requirements: 9.2, 9.3, 9.4, 9.5_

  - [x] 3.4 Implement `computeItemProfit30d(sales, itemId)`
    - Filter sales for `itemId` within last 30 days; return `sum(profit)`
    - _Requirements: 2.3, 8.2_

  - [ ]* 3.5 Write property tests for inventory intelligence utilities
    - **Property 20: Depletion prediction formula and color classification** — `computeDepletionDays(stock, velocity)` equals `Math.round(stock / velocity)` for `velocity > 0`; color thresholds match spec; `velocity === 0` returns `null` with "No sales data" label
    - **Validates: Requirements 9.1–9.6**
    - _File: `src/test/inventoryIntelligence.test.ts`_

- [x] 4. Add `parseTransactions` to `src/lib/ai.ts`
  - Implement `parseTransactions(rawText, businessId): Promise<ParsedTransaction[]>`
  - Build prompt containing the four required fields: `type`, `amount`, `description`, `category`, plus `confidence`; embed `rawText` verbatim
  - Call Groq with the prompt; parse JSON response; return array of `ParsedTransaction`
  - On invalid JSON or empty array, throw a descriptive error for the caller to handle
  - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 4.1 Write property test for `parseTransactions` prompt construction
    - **Property 8: Bulk parse prompt completeness** — for any raw input text, the constructed prompt contains "type", "amount", "description", "category", and the raw text verbatim
    - **Validates: Requirements 4.2**
    - _File: `src/test/bulkInput.test.ts`_

- [x] 5. Add database functions to `src/lib/db.ts`
  - [x] 5.1 Implement `updateInventorySale(saleId, updates)`
    - Fetch existing sale to get old `quantity_sold`
    - Update `inventory_sales` record with new `quantity_sold`, `sale_price_per_unit`, `profit`
    - Compute stock delta: `oldQty - newQty`; apply to `inventory_items.quantity`
    - Return updated `InventorySale`
    - _Requirements: 10.2, 10.3_

  - [ ]* 5.2 Write property test for `updateInventorySale`
    - **Property 22: Edit sale round-trip** — after update, retrieved record has new `quantity_sold` and `sale_price_per_unit`; item stock adjusted by delta between old and new quantity
    - **Validates: Requirements 10.3**
    - _File: `src/test/inventoryIntelligence.test.ts`_

  - [x] 5.3 Implement `deleteInventorySale(saleId, itemId, quantityToRestore)`
    - Delete record from `inventory_sales`
    - Increment `inventory_items.quantity` by `quantityToRestore`
    - If resulting stock would be inconsistent, proceed but surface a warning (caller handles toast)
    - _Requirements: 10.4, 10.5_

  - [ ]* 5.4 Write property test for `deleteInventorySale`
    - **Property 21: Delete sale restores stock** — after deletion, item quantity equals pre-deletion quantity plus `quantity_sold`; restoration is exact
    - **Validates: Requirements 10.5**
    - _File: `src/test/inventoryIntelligence.test.ts`_

- [ ] 6. Checkpoint — Ensure all utility and DB tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

- [x] 7. Create `src/components/dashboard/TruthEngine.tsx`
  - Accept props: `transactions`, `inventoryItems`, `inventorySales`, `businessId`
  - Call `computeTruthEngineData` to derive metrics; fire Groq request for `aiTip` (≤20 words, enforce word count after receiving response)
  - Render six `Insight_Card` elements using `getInsightColor` for color coding
  - Show `animate-pulse` skeleton cards while loading
  - Show "Not enough data yet — add today's transactions to see insights" placeholder when `todayTransactions.length < 3`
  - Layout: `overflow-x-auto flex gap-3` on mobile, `md:grid md:grid-cols-3` on desktop
  - AI tip card includes a tappable CTA that navigates to `/chat`, `/inventory`, or `/dashboard` via keyword match on tip text
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.6, 2.7, 14.4_

  - [ ]* 7.1 Write property test for AI tip word count enforcement
    - **Property 6: AI tip word count constraint** — any tip string returned by TruthEngine contains ≤20 words when split on whitespace, regardless of what Groq returns
    - **Validates: Requirements 2.6**
    - _File: `src/test/truthEngine.test.ts`_

- [x] 8. Create `src/components/dashboard/BulkInputModal.tsx`
  - [x] 8.1 Implement Step 1 — text input view
    - `<textarea>` with `min-height: 120px` on mobile
    - Submit button calls `parseTransactions(rawText, businessId)` and transitions to preview step
    - Show inline error "Couldn't parse your input. Try rephrasing or add entries one at a time." on parse failure; retain textarea content
    - _Requirements: 4.1, 4.6, 12.4_

  - [x] 8.2 Implement Step 2 — Bulk_Preview view
    - Render one editable row per `ParsedTransaction` with inline inputs for `type`, `amount`, `description`, `category`
    - Color-code rows: `bg-emerald-*` for income, `bg-red-*` for expense
    - Yellow warning row when `confidence === 'low'`; require user to confirm/correct before enabling save
    - Delete row button per row
    - Summary line: `{incomeCount} income · {expenseCount} expense · Net: ₦{net}`
    - Confirm button calls `addTransaction` for each row sequentially; on success calls `onSaved()` and `onClose()`
    - On partial failure: show error toast with saved count; retain full preview for retry
    - _Requirements: 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 14.3_

  - [ ]* 8.3 Write property tests for BulkInputModal preview logic
    - **Property 9: Bulk preview row count matches parse output** — preview renders exactly N rows for N parsed transactions; after K deletions renders N-K rows
    - **Validates: Requirements 4.4, 5.2**
    - **Property 10: Bulk preview color coding** — income rows have `bg-emerald-*`, expense rows have `bg-red-*`; no cross-coloring
    - **Validates: Requirements 4.5**
    - **Property 11: Bulk preview summary arithmetic** — income count, expense count, and net amount match the current row data exactly
    - **Validates: Requirements 5.6**
    - _File: `src/test/bulkInput.test.ts`_

- [x] 9. Create `src/components/inventory/EditSaleModal.tsx`
  - Accept props: `sale`, `item`, `onClose`, `onSaved`
  - Pre-fill form with `sale.quantity_sold`, `sale.sale_price_per_unit`
  - Save calls `updateInventorySale`; on success calls `onSaved()` and `onClose()`
  - Delete button shows confirmation dialog; on confirm calls `deleteInventorySale`; on stock-inconsistency warning show toast but proceed
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 10. Checkpoint — Ensure all new component tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

- [x] 11. Update `src/components/dashboard/AppShell.tsx` — add BottomNav
  - Define `bottomNavItems` array with 5 items: Dashboard, History, Add (action), Inventory, Chat
  - Render `BottomNav` as `fixed bottom-0 left-0 right-0 z-40 md:hidden`
  - Center "Add" button is visually prominent (larger, gradient background); opens mode selector (Simple / Bulk)
  - Active route item highlighted with `text-primary` and dot indicator
  - Add `pb-20 md:pb-0` to main content area to prevent overlap
  - All nav tap targets ≥ 44×44px
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 12.1_

  - [ ]* 11.1 Write property test for BottomNav active state
    - **Property 23: Bottom nav active state** — for any route path, exactly one nav item has the active indicator class; no two items are active simultaneously
    - **Validates: Requirements 11.3**
    - _File: `src/test/appShell.test.ts`_

- [x] 12. Update `src/pages/Dashboard.tsx` — integrate TruthEngine and mode toggle
  - Render `<TruthEngine>` as the first content section below metric cards, passing `transactions`, `inventoryItems`, `inventorySales`, `businessId`
  - Add mode toggle UI (Simple / Bulk) accessible from dashboard quick actions
  - "Simple" opens existing `AddTransactionModal`; "Bulk / Smart" opens `BulkInputModal`
  - On `onSaved` callback from either modal, re-fetch transactions so TruthEngine refreshes
  - Ensure no metric label or value is truncated on viewports ≥ 375px wide
  - Transaction entry reachable in ≤ 2 taps from dashboard
  - _Requirements: 1.1, 2.8, 3.1, 3.2, 3.3, 3.4, 12.2, 14.1_

- [x] 13. Update `src/pages/Inventory.tsx` — inventory intelligence
  - Add summary cards at top: total items, low-stock count, most profitable item name, highest-revenue item name
  - Compute `InventorySummary` from items and 30d sales data using `computeItemProfit30d` and `computeSalesVelocity`
  - Pass `topPerformerId` (item with max `computeItemProfit30d`) down to each `InventoryItemCard`
  - Render `EditSaleModal` when edit icon is clicked on a sale row; render delete confirmation when delete icon is clicked
  - Edit/delete icons visible without hover on mobile
  - No horizontal scrolling on viewports ≥ 375px wide
  - Sale recordable in ≤ 3 taps from inventory list
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 10.1, 10.6, 12.3, 14.2_

  - [ ]* 13.1 Write property tests for inventory summary metrics
    - **Property 18: Inventory summary metrics correctness** — `totalItems` = item count, `lowStockCount` = items where `quantity <= low_stock_threshold`, `totalInventoryValue` = `sum(quantity * cost_price)`
    - **Validates: Requirements 8.1**
    - _File: `src/test/inventoryIntelligence.test.ts`_

- [x] 14. Update `src/components/inventory/InventoryItemCard.tsx` — badges and depletion label
  - Accept new props: `salesVelocity`, `depletionDays`, `isTopPerformer`, `isSaleInLast30Days`
  - Render depletion label using `getDepletionLabel(depletionDays)` with appropriate color class
  - Render "Top Performer" badge (amber/gold) when `isTopPerformer === true`
  - Render "Low Stock" badge (red) when `quantity <= low_stock_threshold`
  - Render "No Recent Sales" badge (gray) when `isSaleInLast30Days === false`
  - All badges and icons ≥ 44×44px tap target on mobile
  - _Requirements: 8.2, 8.3, 8.4, 9.2, 9.3, 9.4, 9.5, 12.1_

  - [ ]* 14.1 Write property test for low stock badge invariant
    - **Property 19: Low stock badge invariant** — badge shown iff `quantity <= low_stock_threshold`; items above threshold never show badge
    - **Validates: Requirements 8.3**
    - _File: `src/test/inventoryIntelligence.test.ts`_

- [x] 15. Update `src/pages/Chat.tsx` — enhanced search and smart AI context
  - [x] 15.1 Upgrade chat search to filter by message content
    - Implement `filterConversations(conversations, messages, query)` — returns conversations where `query` appears (case-insensitive) in title OR any `message.content`
    - Debounce filter 300ms via `useDebounce` hook
    - Show "No conversations found" empty state with "Clear search" button when result is empty
    - Clearing input restores full list (idempotent)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 15.2 Write property tests for chat search
    - **Property 24: Chat search filter correctness** — returns only conversations containing query in title or any message content; conversations without match are excluded
    - **Validates: Requirements 13.2, 13.5**
    - **Property 25: Chat search clear restores full list** — `filterConversations(conversations, messages, '')` returns complete original list; idempotent on repeated calls
    - **Validates: Requirements 13.4**
    - _File: `src/test/chatSearch.test.ts`_

  - [x] 15.3 Enhance AI context payload
    - Extend `buildContextMessage` / `EnhancedAIRequestPayload` to include: `monthlyIncome`, `monthlyExpenses`, `monthlyProfit`, `profitTrend`, up to 20 most recent transactions
    - When inventory data present, also include: `topInventoryItems` (top 5 by sales volume), `lowStockItems`, `totalInventoryValue`
    - Append to system prompt: "When answering business questions, always reference specific figures from the provided context. Never give generic advice when real data is available."
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 15.4 Write property tests for AI context payload
    - **Property 13: Chat context completeness** — for any user message, Groq payload contains `monthlyIncome`, `monthlyExpenses`, `monthlyProfit`, `profitTrend`, and up to 20 recent transactions; when inventory present, also contains `topInventoryItems`, `lowStockItems`, `totalInventoryValue`
    - **Validates: Requirements 6.1, 6.2**
    - **Property 14: AI response pass-through** — rendered chat text is identical to Groq response string; no characters added, removed, or modified
    - **Validates: Requirements 6.4**
    - _File: `src/test/chatContext.test.ts`_

  - [x] 15.5 Implement dynamic follow-up suggestions
    - After each completed (non-streaming) AI response, call `generateSuggestions(assistantResponse, businessContext)` — non-streaming Groq request returning 2–4 short question strings
    - Render suggestions as `<button>` chips below the assistant message only when `isStreaming === false`
    - Tapping a chip calls `sendMessage(chipText)` with the exact chip label text
    - On suggestions Groq failure, render no chips (chat remains functional)
    - Dynamic suggestions generated fresh per response; not a static list
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 14.5_

  - [ ]* 15.6 Write property tests for dynamic suggestions
    - **Property 15: Dynamic suggestions count invariant** — suggestions array length is between 2 and 4 inclusive; empty array or length > 4 never rendered as chips
    - **Validates: Requirements 7.1**
    - **Property 16: Suggestions suppressed during streaming** — when `isStreaming === true`, suggestions chips are not rendered for that message
    - **Validates: Requirements 7.4**
    - **Property 17: Suggestion chip sends correct message** — tapping chip with text T calls `sendMessage` with exactly T
    - **Validates: Requirements 7.3**
    - _File: `src/test/chatContext.test.ts`_

- [ ] 16. Checkpoint — Ensure all integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

- [x] 17. Apply SQL indexes
  - Add the following SQL to your Supabase migration or run in the SQL editor:
    ```sql
    -- Full-text search on chat message content
    CREATE INDEX IF NOT EXISTS idx_chat_messages_content_fts
      ON chat_messages USING gin(to_tsvector('english', content));

    -- Filter inventory sales by item and date range
    CREATE INDEX IF NOT EXISTS idx_inventory_sales_item_created
      ON inventory_sales (item_id, created_at DESC);
    ```
  - _Requirements: 13.5, 9.1_

- [ ] 18. Final checkpoint — Full regression pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at phase boundaries
- Property tests validate universal correctness; unit tests cover edge cases and error paths
- SQL indexes in task 17 are safe to apply at any point after task 5
