# Requirements Document

## Introduction

The Inventory System Rebuild is a comprehensive overhaul of the LoopLink SaaS app's inventory module. The rebuild replaces the gated, basic inventory page with a first-class, always-visible inventory system that supports three item modes (Product, Bulk, Service), real-time stock management, damage/loss tracking, sales-to-inventory integration, and full cross-app analytics and AI insight integration. The system targets small business owners who sell physical goods, bulk commodities, or services — or any combination of the three.

## Glossary

- **Inventory_System**: The rebuilt inventory module within LoopLink, covering all item types, stock management, sales recording, and loss tracking.
- **Inventory_Item**: A single record in the inventory representing a product, bulk commodity, or service.
- **Product_Mode**: An inventory item type representing a discrete, countable physical product with quantity, cost price, and selling price.
- **Bulk_Mode**: An inventory item type representing a commodity sold in portions from a larger stock unit (e.g., selling 1 kg from a 50 kg bag).
- **Service_Mode**: An inventory item type representing a service offering with a price and optional cost, but no stock quantity.
- **Stock_Level**: The current available quantity of a Product_Mode or Bulk_Mode item.
- **Low_Stock_Threshold**: A user-defined or system-default quantity below which an item is considered low in stock.
- **Inventory_Value**: The total monetary value of all current stock, calculated as quantity × cost price per item.
- **Sale_Record**: A logged transaction representing the sale of one or more Inventory_Items.
- **Loss_Record**: A logged transaction representing stock reduction due to damage, spoilage, theft, or other loss.
- **Restock_Record**: A logged transaction representing the addition of stock to an existing Inventory_Item.
- **Profit**: The difference between the selling price and cost price for a given Sale_Record.
- **Dead_Stock**: Inventory_Items that have not recorded a sale within a configurable period.
- **Business_Health_Score**: A composite score reflecting overall business performance, including inventory metrics.
- **AppShell**: The main application shell containing the sidebar navigation.
- **Dashboard**: The LoopLink main dashboard page showing summary financial metrics.
- **Analytics**: The LoopLink analytics page showing trends and breakdowns.
- **AI_Insights**: The AI-powered insight engine powered by Groq AI (llama-3.3-70b-versatile).
- **AI_Coach**: The LoopLink AI coaching page.
- **RLS**: Row-Level Security policies in Supabase restricting data access per user and business.
- **Supabase**: The backend database and authentication provider for LoopLink.

---

## Requirements

### Requirement 1: Always-Visible Inventory Navigation

**User Story:** As a business owner, I want Inventory to always appear in the sidebar navigation, so that I can access it without needing to toggle any feature gate.

#### Acceptance Criteria

1. THE AppShell SHALL display the Inventory navigation item in the sidebar at the same hierarchy level as Dashboard and Analytics, regardless of any user setting or business type flag.
2. WHEN a user has no Inventory_Items, THE Inventory_System SHALL display an empty state screen with a "Start Adding Products" call-to-action button.
3. THE AppShell SHALL remove any "sells goods" toggle or conditional gate that previously controlled Inventory visibility.
4. WHEN a user clicks the "Start Adding Products" CTA, THE Inventory_System SHALL open the Add Item modal.

---

### Requirement 2: Product Mode Inventory Items

**User Story:** As a business owner selling discrete physical products, I want to add items in Product Mode, so that I can track individual units with cost and selling prices.

#### Acceptance Criteria

1. WHEN a user creates an Inventory_Item in Product_Mode, THE Inventory_System SHALL require the following fields: name, quantity, cost price, selling price, and category.
2. THE Inventory_System SHALL assign a status of "In Stock" to a Product_Mode item WHEN its Stock_Level is above the Low_Stock_Threshold.
3. THE Inventory_System SHALL assign a status of "Low Stock" to a Product_Mode item WHEN its Stock_Level is greater than zero and less than or equal to the Low_Stock_Threshold.
4. THE Inventory_System SHALL assign a status of "Out of Stock" to a Product_Mode item WHEN its Stock_Level reaches zero.
5. WHEN a user does not set a Low_Stock_Threshold, THE Inventory_System SHALL apply a default threshold of 5 units.
6. THE Inventory_System SHALL display the status of each Product_Mode item as a visible badge in the product list.

---

### Requirement 3: Bulk Mode Inventory Items

**User Story:** As a business owner selling commodities by portion, I want to add items in Bulk Mode, so that I can track stock in large units and sell in smaller portions automatically.

#### Acceptance Criteria

1. WHEN a user creates an Inventory_Item in Bulk_Mode, THE Inventory_System SHALL require the following fields: name, total quantity, and unit type (selected from: kg, liters, bags, pieces, or a custom unit).
2. WHEN a user configures a Bulk_Mode item, THE Inventory_System SHALL allow the user to define a portion size representing the quantity sold per transaction (e.g., 1 kg from a 50 kg bag).
3. WHEN a Sale_Record is created for a Bulk_Mode item, THE Inventory_System SHALL automatically reduce the Stock_Level by the portion size multiplied by the quantity sold.
4. THE Inventory_System SHALL assign stock status badges (In Stock, Low Stock, Out of Stock) to Bulk_Mode items using the same threshold logic as Product_Mode items, measured in the item's defined unit type.
5. IF a Sale_Record would reduce a Bulk_Mode item's Stock_Level below zero, THEN THE Inventory_System SHALL reject the sale and display an error message indicating insufficient stock.

---

### Requirement 4: Service Mode Inventory Items

**User Story:** As a business owner offering services, I want to add items in Service Mode, so that I can log service income and profit without tracking physical stock.

#### Acceptance Criteria

1. WHEN a user creates an Inventory_Item in Service_Mode, THE Inventory_System SHALL require a service name and price, and SHALL allow an optional cost field.
2. THE Inventory_System SHALL NOT track or display a Stock_Level for Service_Mode items.
3. WHEN a Sale_Record is created for a Service_Mode item, THE Inventory_System SHALL log the income and, if a cost is defined, calculate and log the Profit.
4. THE Inventory_System SHALL include Service_Mode Sale_Records in Dashboard income totals and Analytics breakdowns.
5. THE Inventory_System SHALL allow a user to mix Product_Mode, Bulk_Mode, and Service_Mode items within the same business inventory.

---

### Requirement 5: Real-Time Stock Management

**User Story:** As a business owner, I want my stock levels to update immediately when a sale or loss is recorded, so that I always have an accurate view of available inventory.

#### Acceptance Criteria

1. WHEN a Sale_Record is saved, THE Inventory_System SHALL reduce the Stock_Level of the associated Inventory_Item within 2 seconds.
2. WHEN a Loss_Record is saved, THE Inventory_System SHALL reduce the Stock_Level of the associated Inventory_Item within 2 seconds.
3. WHEN a Restock_Record is saved, THE Inventory_System SHALL increase the Stock_Level of the associated Inventory_Item within 2 seconds.
4. WHEN a Product_Mode or Bulk_Mode item's Stock_Level reaches zero, THE Inventory_System SHALL display an "Out of Stock" badge on that item in the product list.
5. WHEN a Product_Mode or Bulk_Mode item's Stock_Level falls to or below the Low_Stock_Threshold, THE Inventory_System SHALL display a "Low Stock" warning badge and a restock suggestion alert.
6. THE Inventory_System SHALL retain Out of Stock items in the product list and in sale/loss history rather than deleting them.
7. WHEN a stock status changes to "Out of Stock", THE Inventory_System SHALL display an in-app alert with the message "Out of Stock: [item name]. Consider restocking."

---

### Requirement 6: Sales Recording with Inventory Integration

**User Story:** As a business owner, I want to record a sale by selecting a product from my inventory, so that stock is automatically reduced and income and profit are logged in one step.

#### Acceptance Criteria

1. WHEN a user opens the Record Sale flow, THE Inventory_System SHALL present a searchable dropdown of existing Inventory_Items as the primary input method.
2. THE Inventory_System SHALL also allow a user to record a sale via manual text input when no matching Inventory_Item exists.
3. WHEN a Sale_Record is saved with a linked Inventory_Item, THE Inventory_System SHALL automatically reduce the item's Stock_Level by the sold quantity.
4. WHEN a Sale_Record is saved, THE Inventory_System SHALL calculate Profit as selling price minus cost price and log it alongside the income entry.
5. WHEN a Sale_Record is saved, THE Dashboard SHALL reflect the updated Total Income and Profit values within 2 seconds.
6. WHEN a Sale_Record is saved, THE AI_Insights engine SHALL have access to the updated sale data for pattern analysis.
7. WHEN a user types in the sale item search field, THE Inventory_System SHALL display autocomplete suggestions matching existing Inventory_Item names.

---

### Requirement 7: Damage, Loss, and Returns Tracking

**User Story:** As a business owner, I want to record damaged or lost stock and process returns, so that my inventory accurately reflects real-world stock changes.

#### Acceptance Criteria

1. WHEN a user records a damage or loss event, THE Inventory_System SHALL require the user to select an Inventory_Item and enter the quantity lost.
2. THE Inventory_System SHALL allow an optional reason field when recording a Loss_Record (e.g., "damaged", "stolen", "expired").
3. WHEN a Loss_Record is saved, THE Inventory_System SHALL reduce the Stock_Level of the associated Inventory_Item by the quantity lost.
4. WHEN a Loss_Record is saved, THE Inventory_System SHALL log the event as an expense entry in the financial records.
5. WHEN a user processes a return or restock, THE Inventory_System SHALL allow the user to select an Inventory_Item and enter the quantity being returned or restocked.
6. WHEN a Restock_Record is saved, THE Inventory_System SHALL increase the Stock_Level of the associated Inventory_Item by the restocked quantity.
7. THE Inventory_System SHALL display all Loss_Records and Restock_Records in the item's history view.

---

### Requirement 8: Inventory Dashboard UI

**User Story:** As a business owner, I want a clear inventory overview page with summary cards and a product list, so that I can quickly assess my stock health at a glance.

#### Acceptance Criteria

1. THE Inventory_System SHALL display the following summary cards at the top of the inventory page: Total Stock Value, Total Items, Low Stock Items count, and Out of Stock Items count.
2. THE Inventory_System SHALL calculate Total Stock Value as the sum of (quantity × cost price) for all active Product_Mode and Bulk_Mode items.
3. THE Inventory_System SHALL display a product list showing each Inventory_Item's name, type, stock level (where applicable), status badge, and action buttons.
4. THE Inventory_System SHALL provide the following action buttons accessible from the inventory page: Add Product, Record Sale, Record Damage/Loss, and Restock.
5. THE Inventory_System SHALL render the inventory page layout responsively, adapting to mobile screen widths without horizontal scrolling or overlapping elements.
6. WHEN the inventory page is loading data, THE Inventory_System SHALL display a loading skeleton or spinner to indicate activity.

---

### Requirement 9: Full App Integration — Dashboard and Analytics

**User Story:** As a business owner, I want my inventory sales and losses to automatically appear in the Dashboard and Analytics pages, so that I have a unified view of my business performance.

#### Acceptance Criteria

1. WHEN a Sale_Record linked to an Inventory_Item is saved, THE Dashboard SHALL include the sale amount in the Total Income metric.
2. WHEN a Sale_Record linked to an Inventory_Item is saved, THE Dashboard SHALL include the calculated Profit in the Total Profit metric.
3. WHEN a Loss_Record is saved, THE Dashboard SHALL include the loss value in the Total Expenses metric.
4. THE Analytics page SHALL display a best-selling products breakdown, ranked by total units sold within the selected time period.
5. THE Analytics page SHALL identify and display Dead_Stock items — Inventory_Items with no Sale_Record in the past 30 days.
6. THE Analytics page SHALL display the current Inventory_Value as a metric within the inventory analytics section.

---

### Requirement 10: AI Insights Integration

**User Story:** As a business owner, I want the AI Insights engine to analyze my inventory data, so that I receive actionable recommendations about stock, sales patterns, and losses.

#### Acceptance Criteria

1. THE AI_Insights engine SHALL analyze Sale_Records and Loss_Records to detect patterns and generate recommendations.
2. WHEN Dead_Stock is detected, THE AI_Insights engine SHALL generate a recommendation such as "You may be losing money from unsold stock in [item name]."
3. WHEN an Inventory_Item has the highest sale frequency in the past 30 days, THE AI_Insights engine SHALL generate a recommendation such as "[item name] is your fastest-selling product. Consider keeping higher stock."
4. WHEN an Inventory_Item's Stock_Level falls below the Low_Stock_Threshold, THE AI_Insights engine SHALL generate a restock recommendation for that item.
5. WHEN Loss_Records for a single Inventory_Item exceed 3 events in a 30-day period, THE AI_Insights engine SHALL generate an alert recommending the user investigate the cause of recurring losses.
6. THE Business_Health_Score SHALL incorporate inventory performance metrics, including a penalty for Dead_Stock items and a penalty for Loss_Records exceeding a configurable threshold.

---

### Requirement 11: Database Schema — inventory_items Table

**User Story:** As a developer, I want the inventory_items table to support all three item modes and required metadata, so that the application can persist and query inventory data correctly.

#### Acceptance Criteria

1. THE Supabase inventory_items table SHALL include the following columns: id, business_id, user_id, name, item_type (enum: product, bulk, service), quantity, unit_type, cost_price, selling_price, category, low_stock_threshold, status, created_at, updated_at.
2. THE Supabase inventory_items table SHALL enforce RLS policies ensuring a user can only read, insert, update, or delete rows where the user_id or business_id matches the authenticated session.
3. WHEN an inventory_items row is updated, THE Supabase inventory_items table SHALL automatically update the updated_at timestamp.
4. THE inventory_items table SHALL allow null values for quantity and unit_type columns for Service_Mode items.

---

### Requirement 12: Database Schema — inventory_losses Table

**User Story:** As a developer, I want a dedicated inventory_losses table to persist all damage and loss events, so that loss history is auditable and queryable for analytics.

#### Acceptance Criteria

1. THE Supabase inventory_losses table SHALL include the following columns: id, item_id (foreign key to inventory_items), business_id, user_id, quantity_lost, reason (nullable text), created_at.
2. THE Supabase inventory_losses table SHALL enforce RLS policies ensuring a user can only read, insert, update, or delete rows where the user_id or business_id matches the authenticated session.
3. WHEN a Loss_Record is inserted into inventory_losses, THE Supabase database SHALL enforce referential integrity by rejecting inserts where item_id does not reference a valid inventory_items row.

---

### Requirement 13: Database Schema — inventory_sales Table

**User Story:** As a developer, I want the inventory_sales table to capture profit data alongside income, so that profit calculations are persisted and available for analytics.

#### Acceptance Criteria

1. THE Supabase inventory_sales table SHALL include a profit column storing the calculated Profit value for each Sale_Record.
2. THE Supabase inventory_sales table SHALL include an item_type column to distinguish sales originating from Product_Mode, Bulk_Mode, or Service_Mode items.
3. THE Supabase inventory_sales table SHALL enforce RLS policies ensuring a user can only read, insert, update, or delete rows where the user_id or business_id matches the authenticated session.
4. THE inventory_sales table SHALL allow a null value for the item_id column to support manually entered sales not linked to an Inventory_Item.

---

### Requirement 14: Smart UX and Input Efficiency

**User Story:** As a business owner, I want the inventory interface to minimize friction and guide me through common actions, so that I can record sales and manage stock quickly.

#### Acceptance Criteria

1. WHEN the inventory page is in an empty state, THE Inventory_System SHALL display contextual suggestions for the first action to take, including "Add your first product", "Add a service", or "Add a bulk item".
2. WHEN a user begins typing in the sale item input field, THE Inventory_System SHALL display matching Inventory_Item suggestions within 300ms.
3. THE Inventory_System SHALL pre-fill the selling price field in the Record Sale modal when an Inventory_Item is selected from the dropdown.
4. THE Inventory_System SHALL allow a user to complete the Add Item flow in no more than 5 form fields for the minimum required configuration of any item type.
5. WHEN a form submission fails validation, THE Inventory_System SHALL display inline error messages adjacent to the invalid fields without clearing previously entered valid data.

---

### Requirement 15: Smart Unit Conversion

**User Story:** As a business owner who buys goods in bulk packs but sells in smaller units, I want the system to track both pack-level and unit-level stock simultaneously and calculate profit correctly for each selling mode, so that I never have to do the math manually.

#### Acceptance Criteria

1. WHEN a user creates an Inventory_Item, THE Inventory_System SHALL present a purchase type selection of either "Single Unit" or "Pack/Bulk".
2. WHEN a user selects "Pack/Bulk" as the purchase type, THE Inventory_System SHALL require the following additional fields: units per pack, total pack cost, pack name, and unit name.
3. WHEN a user saves a Pack/Bulk Inventory_Item, THE Inventory_System SHALL auto-calculate and store the cost per unit as total pack cost divided by units per pack.
4. THE Inventory_System SHALL track both total packs remaining and total units remaining simultaneously for all Pack/Bulk items.
5. WHEN a user records a sale for a Pack/Bulk item, THE Inventory_System SHALL present a sale mode selection of either "Sell as Full Pack" or "Sell as Individual Units".
6. WHEN a sale is recorded in "Sell as Full Pack" mode, THE Inventory_System SHALL reduce the pack count by the number of packs sold and reduce the unit count by the equivalent number of units (packs sold × units per pack).
7. WHEN a sale is recorded in "Sell as Individual Units" mode, THE Inventory_System SHALL reduce the unit count only by the number of units sold and recalculate the remaining pack count accordingly.
8. IF a sale in "Sell as Individual Units" mode would reduce the unit count below zero, THEN THE Inventory_System SHALL reject the sale and display an error message indicating insufficient units.
9. WHEN a Pack/Bulk item has zero full packs remaining but a non-zero unit count, THE Inventory_System SHALL display the stock as the remaining unit count without displaying a negative pack count.
10. THE Inventory_System SHALL display Pack/Bulk item stock in the inventory dashboard as "[X] packs + [Y] units remaining" when both packs and units are present, or "[Y] units remaining" when no full packs remain.
11. WHEN a sale is recorded in "Sell as Full Pack" mode, THE Inventory_System SHALL calculate Profit as the pack selling price minus the total pack cost.
12. WHEN a sale is recorded in "Sell as Individual Units" mode, THE Inventory_System SHALL calculate Profit as (unit selling price × quantity sold) minus (cost per unit × quantity sold).
13. THE Low_Stock_Threshold for Pack/Bulk items SHALL apply to the total unit count, not the pack count.
14. THE Inventory_System SHALL allow a user to define custom names for both the pack unit and the individual unit (e.g., "Pack" and "Bottle", "Bag" and "kg", "Keg" and "Liter").
15. WHEN a user is adding a Pack/Bulk item, THE Inventory_System SHALL display a preview label showing the relationship between pack and unit (e.g., "1 Pack = 24 Bottles").
16. THE Supabase inventory_items table SHALL include the following additional columns for Pack/Bulk support: purchase_type (enum: single, pack), units_per_pack (nullable integer), pack_cost (nullable numeric), unit_name (nullable text), pack_name (nullable text), unit_selling_price (nullable numeric), pack_selling_price (nullable numeric).
17. THE Supabase inventory_sales table SHALL include the following additional columns for Pack/Bulk sale tracking: sale_mode (nullable enum: pack, unit), units_sold (nullable integer), packs_sold (nullable integer).
18. THE Supabase inventory_items table SHALL enforce a constraint that WHEN purchase_type is "pack", the units_per_pack value SHALL be greater than zero.
