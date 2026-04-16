# Implementation Plan: Inventory System Rebuild

## Overview

Rebuild the LoopLink inventory module from a gated, basic page into a first-class, always-visible system supporting Product, Bulk, and Service item modes with pack/unit dual-tracking, loss recording, and full Dashboard/Analytics/AI integration. Implementation proceeds in six phases: database layer → context/navigation → UI components → page rebuild → app integration → SQL migration file.

## Tasks

- [ ] 1. SQL Migration — ALTER inventory_items
  - [ ] 1.1 Write ALTER TABLE statements to add all new columns to inventory_items
    - Add: `item_type` (TEXT, NOT NULL, DEFAULT 'product', CHECK IN ('product','bulk','service'))
    - Add: `unit_type`, `category`, `low_stock_threshold` (INTEGER DEFAULT 5), `status` (CHECK IN ('in_stock','low_stock','out_of_stock'))
    - Add: `purchase_type` (TEXT DEFAULT 'single', CHECK IN ('single','pack'))
    - Add: `units_per_pack` (INTEGER), `pack_cost` (NUMERIC 12,2), `unit_name`, `pack_name`
    - Add: `unit_selling_price` (NUMERIC 12,2), `pack_selling_price` (NUMERIC 12,2), `updated_at` (TIMESTAMPTZ DEFAULT NOW())
    - _Requirements: 11.1, 15.16_

  - [ ] 1.2 Add pack constraint and updated_at trigger to inventory_items
    - Add CHECK constraint `chk_pack_units`: when `purchase_type = 'pack'`, `units_per_pack` must be NOT NULL and > 0
    - Create `update_inventory_updated_at()` trigger function and attach as BEFORE UPDATE trigger
    - _Requirements: 11.3, 15.18_

  - [ ] 1.3 Ensure RLS policy exists on inventory_items
    - Enable RLS; create policy allowing access where `user_id = auth.uid()` OR `business_id` is in user's businesses
    - _Requirements: 11.2_

- [ ] 2. SQL Migration — CREATE inventory_losses
  - [ ] 2.1 Write CREATE TABLE statement for inventory_losses
    - Columns: `id` (UUID PK), `item_id` (UUID FK → inventory_items ON DELETE RESTRICT), `business_id` (UUID NOT NULL), `user_id` (UUID NOT NULL), `quantity_lost` (NUMERIC 12,2 NOT NULL CHECK > 0), `reason` (TEXT nullable), `created_at` (TIMESTAMPTZ DEFAULT NOW())
    - Enable RLS; create policy matching user_id or business_id
    - _Requirements: 12.1, 12.2, 12.3_

- [ ] 3. SQL Migration — ALTER inventory_sales
  - [ ] 3.1 Write ALTER TABLE statements to add new columns to inventory_sales
    - Add: `profit` (NUMERIC 12,2), `item_type` (TEXT CHECK IN ('product','bulk','service'))
    - Add: `sale_mode` (TEXT CHECK IN ('pack','unit')), `units_sold` (INTEGER), `packs_sold` (INTEGER)
    - ALTER `item_id` to DROP NOT NULL (support manual sales)
    - Ensure RLS policy exists
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 15.17_

- [ ] 4. Checkpoint — Consolidate SQL into migration file
  - Combine tasks 1–3 into `supabase/migrations/inventory_rebuild.sql` as a single idempotent migration script using `IF NOT EXISTS` / `IF EXISTS` guards throughout
  - _Requirements: 11, 12, 13_

- [ ] 5. Update TypeScript types in db.ts
  - [ ] 5.1 Add new type aliases and update InventoryItem interface
    - Export: `ItemType`, `PurchaseType`, `SaleMode`, `StockStatus` as string union types
    - Update `InventoryItem` interface with all new fields matching the schema from tasks 1–3
    - _Requirements: 11.1, 15.16_

  - [ ] 5.2 Add InventorySale and InventoryLoss interfaces
    - Update `InventorySale` with `profit`, `item_type`, `sale_mode`, `units_sold`, `packs_sold`, `item_id` as nullable
    - Add `InventoryLoss` interface with all columns from task 2.1
    - _Requirements: 12.1, 13.1, 13.4_

- [ ] 6. Add utility functions to db.ts
  - [ ] 6.1 Implement formatStockDisplay and deriveStockStatus
    - `formatStockDisplay(item)`: returns "Service" for services; for pack items derives packs/loose units from `floor(qty/uPP)` and `qty % uPP`; falls back to `"N unit_type"` for simple items
    - `deriveStockStatus(item)`: returns null for services; `out_of_stock` when qty ≤ 0; `low_stock` when qty ≤ threshold; `in_stock` otherwise
    - _Requirements: 2.2, 2.3, 2.4, 3.4, 5.4, 5.5, 15.9, 15.10_

  - [ ]* 6.2 Write property test for formatStockDisplay and deriveStockStatus
    - **Property 1: Stock Status Assignment** — for any product/bulk item, exactly one of out_of_stock/low_stock/in_stock is assigned; cases are mutually exclusive and exhaustive
    - **Property 5: Pack/Unit Total Units Invariant** — pack count = floor(T/U), loose = T%U, pack count never negative
    - **Property 10: Low Stock Threshold Applies to Total Units** — status derived from total unit count, not pack count
    - **Property 15: Service Items Have No Stock** — service items always return null status
    - **Validates: Requirements 2.2, 2.3, 2.4, 3.4, 5.4, 5.5, 15.9, 15.10, 15.13, 4.2**

  - [ ] 6.3 Implement pack/unit math utility functions
    - `calcPackSaleStockReduction(currentUnits, packsSold, unitsPerPack)`: returns `packsSold * unitsPerPack`
    - `calcUnitSaleStockReduction(unitsSold)`: returns `unitsSold`
    - `calcPackSaleProfit(packsSold, packSellingPrice, packCost)`: returns `packsSold * (packSellingPrice - packCost)`
    - `calcUnitSaleProfit(unitsSold, unitSellingPrice, costPerUnit)`: returns `unitsSold * (unitSellingPrice - costPerUnit)`
    - `calcCostPerUnit(packCost, unitsPerPack)`: returns `packCost / unitsPerPack`
    - _Requirements: 15.3, 15.6, 15.7, 15.11, 15.12_

  - [ ]* 6.4 Write property tests for pack/unit math functions
    - **Property 6: Pack Sale Stock Reduction** — pack sale of P packs reduces total units by exactly P × U
    - **Property 7: Unit Sale Stock Reduction** — unit sale of N reduces total units by exactly N; resulting pack count = floor((T-N)/U)
    - **Property 8: Profit Calculation Correctness** — profit matches formula for pack, unit, and simple sales
    - **Property 9: Cost Per Unit Derivation** — cost_per_unit = pack_cost / units_per_pack for all U > 0
    - **Validates: Requirements 15.3, 15.6, 15.7, 15.11, 15.12, 6.4**

- [ ] 7. Add db.ts database functions
  - [ ] 7.1 Implement addInventoryItemV2
    - Accept `AddInventoryItemParams`; derive and store `status` via `deriveStockStatus`; insert into `inventory_items`; return typed `InventoryItem`
    - Validate required fields per item type before insert (name+qty+costPrice+sellingPrice+category for product; name+qty+unitType for bulk; name+sellingPrice for service)
    - _Requirements: 2.1, 3.1, 4.1, 14.4, 15.2_

  - [ ]* 7.2 Write property test for addInventoryItemV2 field validation
    - **Property 16: Required Field Validation** — any creation attempt missing a required field for its item type must be rejected
    - **Validates: Requirements 2.1, 3.1, 4.1, 15.2**

  - [ ] 7.3 Implement recordInventorySaleV2
    - Accept `RecordSaleParams`; for linked items: fetch current stock, validate sufficient quantity (reject if N > Q), compute stock reduction using calc functions, update `inventory_items.quantity` and `status`, insert into `inventory_sales` with profit
    - Call `addTransaction()` internally to log income + profit in transactions table
    - _Requirements: 3.3, 3.5, 5.1, 6.3, 6.4, 6.5, 15.6, 15.7, 15.8_

  - [ ]* 7.4 Write property tests for recordInventorySaleV2
    - **Property 2: Stock Reduction Invariant** — sale of N from stock Q results in exactly Q-N remaining
    - **Property 4: Oversell Prevention** — sale of N > Q is rejected; stock remains Q
    - **Validates: Requirements 3.3, 3.5, 5.1, 6.3, 15.8**

  - [ ] 7.5 Implement addInventoryLoss
    - Accept `itemId, businessId, quantityLost, reason?`; fetch current stock; warn if quantityLost > stock but allow (floor at 0); update `inventory_items.quantity` and `status`; insert into `inventory_losses`
    - Call `addTransaction()` internally to log as expense
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 5.2_

  - [ ]* 7.6 Write property test for addInventoryLoss
    - **Property 3: Restock Round Trip** — loss of N followed by restock of N returns stock to exactly Q
    - **Validates: Requirements 5.3, 7.6**

  - [ ] 7.7 Implement getInventoryLosses and getInventoryItemWithSales
    - `getInventoryLosses(businessId)`: query `inventory_losses` ordered by `created_at DESC`
    - `getInventoryItemWithSales(itemId)`: join `inventory_items` with aggregated `inventory_sales` to return `InventoryItemWithSales` (totalUnitsSold, totalRevenue, totalProfit, lastSaleDate)
    - _Requirements: 7.7, 9.4, 9.5_

- [ ] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Rebuild InventoryContext.tsx
  - Remove `sellsGoods` gate and any conditional loading logic
  - Expose `inventoryItems`, `inventorySales`, `inventoryLosses`, `refreshInventory`, `loading` matching the `InventoryContextType` interface
  - Load all three datasets whenever `activeBusiness` changes; set `loading` true during fetch
  - _Requirements: 1.1, 1.3, 5.1, 5.2, 5.3_

- [ ] 10. Update AppShell.tsx
  - Remove `sellsGoods` import and conditional from `navItems`
  - Add Inventory as a permanent nav item at the same hierarchy level as Dashboard and Analytics
  - _Requirements: 1.1, 1.3_

- [ ] 11. Update Dashboard.tsx and App.tsx
  - Remove `sellsGoods` toggle card and any `InventorySummaryWidget` gated behind it
  - Remove `InventoryProvider` `sellsGoods` prop dependency in `App.tsx` if present
  - Ensure inventory sales flow through to income/profit totals via the transactions table (already handled by `recordInventorySaleV2` calling `addTransaction`)
  - _Requirements: 1.3, 9.1, 9.2, 9.3_

- [ ] 12. Create src/components/inventory/ directory and InventoryItemCard.tsx
  - Create `src/components/inventory/InventoryItemCard.tsx`
  - Display: item name, type badge, stock display via `formatStockDisplay`, status badge (In Stock / Low Stock / Out of Stock with appropriate colors), action buttons (Sale, Loss, Restock)
  - Props: `{ item: InventoryItem; onSale: () => void; onLoss: () => void; onRestock: () => void }`
  - _Requirements: 2.6, 5.4, 5.5, 8.3, 8.4_

- [ ] 13. Create AddProductModal.tsx
  - Create `src/components/inventory/AddProductModal.tsx`
  - Step 1: item type selection cards (Product / Bulk / Service)
  - Step 2: dynamic form — Product shows name/qty/costPrice/sellingPrice/category + purchase type toggle (Single/Pack); Pack sub-form shows unitsPerPack/packCost/packName/unitName/packSellingPrice/unitSellingPrice + live preview label ("1 Pack = N Units")
  - Step 3: summary preview before save; call `addInventoryItemV2` on confirm; call `onSuccess` then `refreshInventory`
  - Inline validation errors adjacent to invalid fields without clearing valid inputs
  - _Requirements: 2.1, 3.1, 4.1, 14.1, 14.4, 14.5, 15.1, 15.2, 15.14, 15.15_

- [ ] 14. Create RecordSaleModal.tsx
  - Create `src/components/inventory/RecordSaleModal.tsx`
  - Searchable combobox with 300ms debounce showing matching inventory items; auto-fills selling price on selection
  - For pack items: sale mode toggle (Full Pack / Individual Units); show profit preview before save
  - Manual text entry fallback when no item is selected (item_id = null)
  - Call `recordInventorySaleV2` on save; show inline error on insufficient stock; call `onSuccess` + `refreshInventory`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.7, 14.2, 14.3, 15.5_

- [ ] 15. Create RecordLossModal.tsx
  - Create `src/components/inventory/RecordLossModal.tsx`
  - Fields: item picker (dropdown of inventory items), quantity lost (number input), optional reason (text input)
  - Call `addInventoryLoss` on save; call `onSuccess` + `refreshInventory`
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 16. Create RestockModal.tsx
  - Create `src/components/inventory/RestockModal.tsx`
  - Fields: item picker, quantity to add (number input)
  - On save: update `inventory_items.quantity` by adding the restock amount; update `status` via `deriveStockStatus`; call `onSuccess` + `refreshInventory`
  - _Requirements: 7.5, 7.6, 5.3_

- [ ] 17. Rebuild src/pages/Inventory.tsx
  - [ ] 17.1 Implement summary cards and tab layout
    - Four summary cards: Total Stock Value (sum of qty × cost_price for product/bulk), Total Items, Low Stock count, Out of Stock count
    - Tabbed layout: Overview / Products / Sales History / Losses
    - Loading skeleton while `loading === true`
    - _Requirements: 8.1, 8.2, 8.6_

  - [ ] 17.2 Implement empty state and item grid
    - When `inventoryItems.length === 0`: render empty state with three CTA buttons — "Add your first product", "Add a service", "Add a bulk item" — each opening `AddProductModal` pre-seeded to the correct type
    - Item grid using `InventoryItemCard`; show out-of-stock alert toast when status changes to `out_of_stock`
    - _Requirements: 1.2, 1.4, 5.6, 5.7, 8.3, 14.1_

  - [ ] 17.3 Wire all four action buttons and modals
    - Floating or header action buttons: Add Product, Record Sale, Record Damage/Loss, Restock
    - Each opens the corresponding modal; all modals call `refreshInventory` on success
    - Mobile responsive layout — no horizontal scroll or overlapping elements
    - _Requirements: 8.4, 8.5_

- [ ] 18. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Update aiClient.ts — enrich InventoryContextItem
  - Extend `InventoryContextItem` interface with: `itemType: ItemType`, `isDeadStock: boolean`, `isLowStock: boolean`, `totalLosses: number`
  - In `buildContextMessage`, map inventory items to include stock flags and loss count in the context string
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 20. Update ai.ts — calcHealthScore with inventory penalties
  - Add `InventoryMetrics` interface: `{ deadStockCount: number; highLossItemCount: number; outOfStockCount: number }`
  - Update `calcHealthScore` signature to accept optional `inventoryMetrics` parameter
  - Apply penalties: -2 per dead stock item, -5 per recurring loss item, -3 per OOS item (max -15); clamp score to [0, 100]
  - _Requirements: 10.6_

  - [ ]* 20.1 Write property test for calcHealthScore inventory penalties
    - **Property 17: Health Score Inventory Penalty** — score with dead stock / loss penalties ≤ score without; adding more penalties never increases score
    - **Validates: Requirements 10.6**

- [ ] 21. Update Analytics.tsx — add inventory section
  - Add inventory analytics section with three sub-sections:
    - Best-Selling Products: bar chart ranked by `totalUnitsSold` descending for selected time period
    - Dead Stock: list of items with no sale in past 30 days, showing tied-up capital (qty × cost_price)
    - Inventory Value: metric card showing current total stock value
  - Derive data from `InventoryContext` + `getInventoryItemWithSales` calls
  - _Requirements: 9.4, 9.5, 9.6_

  - [ ]* 21.1 Write property tests for analytics calculations
    - **Property 11: Total Stock Value Calculation** — sum of (qty × cost_price) for product/bulk; services contribute zero; order-independent
    - **Property 12: Dead Stock Detection** — no sale in 30 days → dead stock; at least one sale in 30 days → not dead stock
    - **Property 13: Best-Selling Products Ordering** — list ordered by totalUnitsSold descending; no item with fewer sales appears before one with more
    - **Property 14: Recurring Loss Detection** — >3 losses in 30-day window → flagged; ≤3 → not flagged
    - **Validates: Requirements 9.4, 9.5, 9.6, 10.2, 10.5**

- [ ] 22. Final Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests live in `src/test/inventory.property.test.ts` using `fast-check` (`npm install --save-dev fast-check`)
- Each property test runs minimum 100 iterations: `fc.assert(fc.property(...), { numRuns: 100 })`
- Tag format for each property test: `// Feature: inventory-system-rebuild, Property N: <property_text>`
- The SQL migration file at `supabase/migrations/inventory_rebuild.sql` (task 4) is the artifact to run in Supabase
- All db.ts functions must call `refreshInventory()` from the calling component after success — not internally
- `recordInventorySaleV2` and `addInventoryLoss` call `addTransaction()` internally to keep Dashboard totals in sync
