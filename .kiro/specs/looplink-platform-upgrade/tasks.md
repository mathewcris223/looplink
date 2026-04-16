# Implementation Plan: LoopLink Platform Upgrade

## Overview

Incremental implementation across five parts: landing page restructure, dashboard redesign, AI experience upgrade, inventory module, and full data integration. Each task builds on the previous, ending with everything wired together.

## Tasks

- [x] 1. Part 1 — Landing Page Restructure
  - [x] 1.1 Fix Navbar.tsx: remove "How It Works" and "FAQ" links from desktop and mobile menus; keep only Logo, Login link (`/login`), and "Get Started" button (`/signup`)
    - Remove link arrays containing "Features", "How It Works", "FAQ" from both desktop nav and mobile menu
    - Preserve existing scroll-based glass-morphism logic (`scrolled` state, `window.scrollY > 20`)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 1.2 Write property test for Navbar scroll state
    - **Property 1: Navbar scroll state**
    - **Validates: Requirements 1.5, 1.6**
    - For any scroll position, assert glass-morphism classes present when `scrollY > 20` and absent when `scrollY ≤ 20`

  - [x] 1.3 Fix Footer.tsx: add FAQ, How It Works, Contact, and Terms links
    - Add a links column (or extend existing) with: FAQ → `/faq`, How It Works → `/#how-it-works`, Contact → `mailto:hello@looplink.app`, Terms → `#`
    - Preserve existing brand name and copyright notice
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 1.4 Write unit tests for Navbar and Footer
    - `src/test/Navbar.test.tsx`: assert only Logo, Login, Get Started are present; assert "How It Works" and "FAQ" are absent
    - `src/test/Footer.test.tsx`: assert FAQ, How It Works, Contact, Terms links are present with correct hrefs
    - _Requirements: 1.1, 1.2, 3.2_

- [x] 2. Part 2 — Dashboard Redesign
  - [x] 2.1 Elevate MetricCards in Dashboard.tsx: add `shadow-md`/`shadow-lg`, larger icon container (`w-10 h-10`), bold numeric value with display font (`font-display text-2xl`)
    - Ensure 2-col mobile / 4-col desktop grid is explicit (`grid-cols-2 lg:grid-cols-4`)
    - Apply green accent to Income, red to Expenses, conditional green/red to Net Profit, conditional green/amber to Profit Margin
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 2.2 Write property test for MetricCard aggregation
    - **Property 3: MetricCard values match transaction aggregates**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5**
    - Use `fc.array(transactionArb)` to verify Income = sum of income, Expenses = sum of expenses, Profit = income − expenses, Margin = (profit/income)×100 to 1 decimal (0 when income = 0)

  - [x] 2.3 Enforce explicit two-column main grid in Dashboard.tsx
    - Left column: `lg:col-span-2` containing AI Insights panel + Recent Transactions panel
    - Right column: `lg:col-span-1` containing Business Health panel + Quick Actions panel
    - Single column on viewports narrower than `lg` breakpoint
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 2.4 Redesign QuickActions in Dashboard.tsx as card-style with icons and hover effects; add "AI Chat" action
    - Replace existing button list with four card divs: Add Income, Add Expense, View Analytics, AI Chat
    - Each card: `rounded-2xl border bg-card p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/60 hover:scale-[1.02] transition-all`
    - Icons: `ArrowUpRight` (income), `ArrowDownRight` (expense), `BarChart3` (analytics), `MessageSquare` (chat)
    - Add Income → `openModal("income")`, Add Expense → `openModal("expense")`, View Analytics → `/analytics`, AI Chat → `/chat`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 2.5 Write unit tests for Dashboard layout and QuickActions
    - `src/test/Dashboard.test.tsx`: assert four MetricCards render, assert two-column grid classes present, assert all four QuickActions cards render with icons and correct labels
    - **Property 4: QuickActions cards all have icons**
    - **Validates: Requirements 6.2**
    - _Requirements: 4.1, 5.1, 6.1, 6.2_

- [ ] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Part 3 — AI Experience Upgrade
  - [x] 4.1 Extend `AIRequestPayload` in aiClient.ts with `inventoryContext` field; update `buildContextMessage` to append inventory section when present
    - Add `InventoryContext` interface and `inventoryContext?: InventoryContext` to `AIRequestPayload`
    - In `buildContextMessage`, append `[Inventory Context]` block; flag items with `quantity ≤ 5` as `(LOW)`
    - _Requirements: 8.4, 13.1, 13.2, 13.3_

  - [x] 4.2 Add sessionStorage persistence for chat history in Chat.tsx
    - On mount: restore from `sessionStorage.getItem("ll_chat_history")` if available; fall back to empty array if unavailable (e.g., private browsing)
    - On each `messages` state update: write back to `sessionStorage.setItem("ll_chat_history", ...)`
    - _Requirements: 9.3, 9.4_

  - [ ]* 4.3 Write property test for chat session persistence round-trip
    - **Property 11: Chat session persistence round-trip**
    - **Validates: Requirements 9.3, 9.4**
    - For any history H written to `sessionStorage`, reading it back should produce a history equal to H

  - [ ]* 4.4 Write property test for conversation history cap
    - **Property 10: Conversation history capped at 10 messages**
    - **Validates: Requirements 9.1**
    - Use `fc.array(messageArb, { minLength: 0, maxLength: 25 })` to assert `history.length === Math.min(N, 10)`

  - [x] 4.5 Add ContinuationChips to Chat.tsx
    - After each completed assistant message (`streaming === false`, last message is `role: "assistant"` with non-empty content), make a second non-streaming `aiRequest` call using `CHIP_PROMPT` to generate 2–4 follow-up chip strings
    - Store chips per-message index in `Map<number, string[]>` state
    - Fallback to static chips `["Give step-by-step plan", "Analyze your performance", "Suggest business ideas"]` if AI call fails or returns malformed JSON
    - Render chip buttons below the assistant message bubble; clicking a chip calls `sendMessage(chipText)`
    - Hide chips for any message that is currently streaming
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 4.6 Write property tests for ContinuationChips
    - **Property 5: Continuation chips count and required category**
    - **Validates: Requirements 7.1, 7.5**
    - For any completed assistant message, assert chip count is 2–4 and at least one chip matches a required category
    - **Property 6: Chip click sends chip text as user message**
    - **Validates: Requirements 7.3**
    - For any chip text T, clicking it appends a user message with content exactly equal to T
    - **Property 7: Chips hidden during streaming**
    - **Validates: Requirements 7.4**
    - For any in-progress streaming message, assert no chips are rendered for that message

  - [ ]* 4.7 Write property test for financial context completeness
    - **Property 8: Financial context always included in AI requests**
    - **Validates: Requirements 8.1, 8.2, 8.3**
    - For any AI request from Chat or Coach, assert payload contains `businessName`, `businessType`, `totalIncome`, `totalExpenses`, `profit`, and `transactions` (up to 20)

  - [ ]* 4.8 Write property test for inventory context in AI requests
    - **Property 9: Inventory context included when toggle is on**
    - **Validates: Requirements 8.4, 13.1**
    - For any request where `sellsGoods = true` and items exist, assert `inventoryContext` field is present with correct stock levels, prices, and units sold

- [ ] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Part 4 — Inventory Module: Schema and Data Layer
  - [x] 6.1 Add SQL migration for `inventory_items` and `inventory_sales` tables with RLS policies
    - Create `supabase/migrations/add_inventory_tables.sql` (or equivalent migration file)
    - Include `inventory_items` table, `inventory_sales` table, `ENABLE ROW LEVEL SECURITY`, and RLS policies as specified in the design
    - Include `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sells_goods boolean NOT NULL DEFAULT false`
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 12.4, 12.5_

  - [x] 6.2 Add TypeScript types and db.ts functions for inventory
    - Add `InventoryItem` and `InventorySale` interfaces to `src/lib/db.ts`
    - Implement `getInventoryItems(businessId)`, `addInventoryItem(...)`, `recordInventorySale(...)`, `updateInventoryStock(...)`
    - `recordInventorySale` performs two sequential writes (insert sale + decrement quantity); surface error if stock update fails after sale insert
    - _Requirements: 10.2, 10.3, 10.6, 11.1, 11.2, 11.3, 15.1, 15.2_

  - [ ]* 6.3 Write property tests for inventory data layer
    - **Property 13: Inventory item insert round-trip**
    - **Validates: Requirements 10.2, 10.3**
    - Use `fc.record({ name: fc.string({minLength:1}), quantity: fc.integer({min:1}), costPrice: fc.float({min:0}), sellingPrice: fc.float({min:0}) })` against mocked db functions
    - **Property 15: Stock addition is additive**
    - **Validates: Requirements 10.6**
    - For any item with quantity Q and additional A ≥ 1, assert result quantity = Q + A
    - **Property 16: Sale recording round-trip**
    - **Validates: Requirements 11.1, 11.2**
    - For any valid sale, assert returned record has correct `quantity_sold` and `sale_price_per_unit`
    - **Property 17: Sale decrements stock correctly**
    - **Validates: Requirements 11.3**
    - For item with quantity Q and sale of N (1 ≤ N ≤ Q), assert item quantity = Q − N after sale
    - **Property 18: Oversell is prevented**
    - **Validates: Requirements 11.4**
    - For any N > Q, assert sale is rejected with error and quantity remains Q
    - **Property 24: Total sales never exceed total stock added**
    - **Validates: Requirements 15.5**
    - For any sequence of valid sales, assert sum of `quantity_sold` ≤ cumulative quantity ever added

- [x] 7. Part 4 — Inventory Module: Context and UI
  - [x] 7.1 Create `src/context/InventoryContext.tsx`
    - Expose `sellsGoods`, `setSellsGoods`, `inventoryItems`, `refreshInventory`, `loading`
    - On mount: read `sells_goods` from `profiles` table; fall back to `false`; use `localStorage` as optimistic cache
    - `setSellsGoods`: update `localStorage` immediately, then upsert to `profiles`; on failure, show toast and retry once
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 7.2 Write property tests for InventoryContext toggle behavior
    - **Property 12: Inventory nav item conditional on toggle**
    - **Validates: Requirements 10.1, 12.2, 12.3**
    - For any `sellsGoods` value, assert AppShell nav contains "Inventory" iff `sellsGoods = true`; toggling false→true restores it
    - **Property 19: Toggle state persists across sessions**
    - **Validates: Requirements 12.4**
    - For any value V set via `setSellsGoods`, re-initializing InventoryContext should restore `sellsGoods = V`
    - **Property 20: Toggle defaults to false for new users**
    - **Validates: Requirements 12.5**
    - For a new user profile with no `sells_goods` record, assert `sellsGoods = false`

  - [x] 7.3 Create `src/components/dashboard/AddItemModal.tsx`
    - Form fields: item name (text, required), initial quantity (integer ≥ 1, required), cost price (decimal ≥ 0, required), selling price (decimal ≥ 0, required)
    - Inline field-level validation errors; prevent submission on invalid input
    - On valid submit: call `addInventoryItem(...)` then call `refreshInventory()`
    - _Requirements: 10.2, 10.3, 10.4_

  - [ ]* 7.4 Write property test for AddItemModal validation
    - **Property 14: Invalid inventory item form is rejected**
    - **Validates: Requirements 10.4**
    - Use `fc.record` with at least one invalid field (empty name, quantity < 1, price < 0); assert submission is rejected and field error is displayed

  - [x] 7.5 Create `src/components/dashboard/RecordSaleModal.tsx`
    - Form fields: quantity sold (integer ≥ 1, required), sale price per unit (pre-filled with `item.selling_price`, editable)
    - Client-side validation: reject if `quantity_sold > item.quantity` with error message
    - On valid submit: call `recordInventorySale(...)` then call `refreshInventory()`
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 7.6 Create `src/pages/Inventory.tsx`
    - Header: "Inventory" title + "Add Item" button (opens AddItemModal)
    - Stats row: Total Items, Total Stock Value (sum of `quantity × cost_price`), Total Units Sold, Total Profit from Sales
    - Item list: name, current quantity, cost price, selling price, profit per unit, "Add Stock" and "Record Sale" action buttons
    - Empty state when no items exist
    - Per-item metrics: total units purchased, total units sold, remaining stock, total profit from sales
    - Uses `useInventory()` for data
    - _Requirements: 10.5, 11.5, 14.2_

  - [ ]* 7.7 Write unit tests for Inventory page and modals
    - `src/test/Inventory.test.tsx`: assert list renders items, empty state renders when no items, AddItemModal validation errors, RecordSaleModal oversell rejection
    - _Requirements: 10.4, 10.5, 11.4, 11.5_

- [ ] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Part 4 — Inventory Module: Routing and Navigation
  - [x] 9.1 Update AppShell.tsx to conditionally include Inventory nav item
    - Read `sellsGoods` from `useInventory()` inside AppShell (or accept as prop)
    - Add `{ path: "/inventory", icon: Package, label: "Inventory" }` to nav items array when `sellsGoods = true`
    - _Requirements: 10.1, 12.2, 12.3_

  - [ ]* 9.2 Write unit test for AppShell conditional nav
    - `src/test/AppShell.test.tsx`: assert "Inventory" nav link present when `sellsGoods = true`, absent when `sellsGoods = false`
    - _Requirements: 10.1, 12.2, 12.3_

  - [x] 9.3 Update App.tsx: add `/inventory` route and wrap app with `InventoryProvider`
    - Import and render `<InventoryProvider>` wrapping `<AppShell>` (inside `<BusinessProvider>`)
    - Add `<Route path="/inventory" element={<Inventory />} />` inside the authenticated route group
    - _Requirements: 10.1_

- [x] 10. Part 5 — Connect Everything
  - [x] 10.1 Update Dashboard.tsx: add `InventorySummaryWidget` conditionally rendered when `sellsGoods = true`
    - Read `sellsGoods` and `inventoryItems` from `useInventory()`
    - Widget shows: total items count, total stock value (sum of `quantity × cost_price`), "View Inventory" link to `/inventory`
    - Hide widget entirely when `sellsGoods = false`
    - _Requirements: 12.2, 12.3, 14.1_

  - [x] 10.2 Update Chat.tsx: pass inventory context to AI requests when `sellsGoods = true`
    - Read `sellsGoods` and `inventoryItems` from `useInventory()`
    - When `sellsGoods = true` and items exist, fetch sales data and build `inventoryContext` payload; pass to `aiStream` via `AIRequestPayload.inventoryContext`
    - _Requirements: 8.4, 13.1, 13.2, 13.3_

  - [x] 10.3 Install fast-check and configure test setup
    - Run `npm install --save-dev fast-check`
    - Ensure `vitest.config.ts` has `environment: "jsdom"` and `setupFiles: ["./src/test/setup.ts"]`
    - Create or update `src/test/setup.ts` with any required mocks (e.g., `sessionStorage`, Supabase client)
    - _Requirements: (testing infrastructure)_

  - [ ]* 10.4 Write property-based tests for real-time data integration
    - **Property 21: Transaction add triggers metric refresh**
    - **Validates: Requirements 14.1**
    - For any transaction T added via `addTransaction`, assert MetricCards subsequently display values including T's amount
    - **Property 22: AI insights re-fetched after transaction add**
    - **Validates: Requirements 14.3**
    - For any transaction added while Dashboard is mounted, assert `generateInsights` is called with a list including the new transaction

  - [ ]* 10.5 Write unit tests for Chat inventory context wiring
    - `src/test/Chat.test.tsx`: assert `inventoryContext` is present in AI request payload when `sellsGoods = true` and items exist; assert `inventoryContext` is absent when `sellsGoods = false`
    - _Requirements: 8.4, 13.1_

- [ ] 11. Final Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check with a minimum of 100 iterations per property
- DB-level property tests (P13, P16, P17, P18, P24) use mocked/stubbed db functions
- The Supabase RPC for atomic sale recording is recommended but the implementation can use two sequential writes with error handling as a fallback
