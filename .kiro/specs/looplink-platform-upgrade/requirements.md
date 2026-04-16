# Requirements Document

## Introduction

LoopLink is a SaaS financial tracking platform for small business owners in Nigeria. This upgrade transforms the existing app into a clean, modern, premium-level business platform across five major areas: landing page restructure, dashboard redesign, AI experience upgrade, a new inventory/goods management system, and full data integration across all modules. The tech stack is React + TypeScript + Vite + Tailwind CSS + Supabase + Groq AI (llama-3.3-70b-versatile).

## Glossary

- **Landing_Page**: The public-facing marketing page at the root route (`/`).
- **Navbar**: The top navigation bar rendered on the Landing_Page.
- **Footer**: The bottom section of the Landing_Page.
- **Dashboard**: The authenticated main overview page at `/dashboard`.
- **Metric_Card**: An elevated card component displaying a single KPI (income, expenses, profit, or margin) with shadow, colored accent, and icon.
- **Quick_Actions**: A set of card-style buttons on the Dashboard for common user actions.
- **AI_Chat**: The conversational AI interface at `/chat` powered by Groq llama-3.3-70b-versatile.
- **AI_Coach**: The AI coaching interface at `/coach`.
- **AI_Continuation**: A set of suggested follow-up actions rendered after each AI response.
- **Inventory_Module**: The new feature allowing users to track stock items, purchases, and sales.
- **Inventory_Item**: A record representing a product with quantity, cost price, and selling price.
- **Inventory_Sale**: A record representing units sold from an Inventory_Item.
- **Sells_Goods_Toggle**: A user preference flag stored in the user profile that enables or disables the Inventory_Module.
- **AppShell**: The authenticated layout wrapper providing sidebar navigation and top bar.
- **Transaction**: An existing income or expense record stored in the `transactions` Supabase table.
- **Business_Health_Score**: A computed 0–100 score derived from transaction data.
- **Supabase**: The backend-as-a-service providing database, auth, and real-time subscriptions.

---

## Requirements

### Requirement 1: Landing Page Navbar Restructure

**User Story:** As a visitor, I want a clean, focused navbar with only essential links, so that I can quickly find the login or sign-up action without distraction.

#### Acceptance Criteria

1. THE Navbar SHALL display only three elements: the LoopLink logo, a "Login" link, and a "Get Started" button.
2. THE Navbar SHALL remove the "How It Works" and "FAQ" navigation links from the desktop and mobile menu.
3. WHEN a visitor clicks the "Login" link, THE Navbar SHALL navigate to `/login`.
4. WHEN a visitor clicks the "Get Started" button, THE Navbar SHALL navigate to `/signup`.
5. WHILE the page is scrolled more than 20px from the top, THE Navbar SHALL apply a glass-morphism background with a bottom border.
6. WHILE the page is at the top (scroll position ≤ 20px), THE Navbar SHALL render with a transparent background.

---

### Requirement 2: Landing Page Hero Section

**User Story:** As a visitor, I want a compelling hero section with a strong headline and a single clear call-to-action, so that I immediately understand the value of LoopLink and know what to do next.

#### Acceptance Criteria

1. THE Landing_Page SHALL render a Hero section as the first visible content below the Navbar.
2. THE Hero section SHALL display a headline of no more than 12 words that communicates the core value proposition.
3. THE Hero section SHALL display a supporting sub-headline of no more than 25 words.
4. THE Hero section SHALL render exactly one primary CTA button labeled "Get Started Free".
5. WHEN a visitor clicks the "Get Started Free" CTA button, THE Landing_Page SHALL navigate to `/signup`.

---

### Requirement 3: Landing Page Footer

**User Story:** As a visitor, I want a footer with helpful links and legal information, so that I can find secondary content like FAQ, How It Works, Contact, and Terms without cluttering the navbar.

#### Acceptance Criteria

1. THE Footer SHALL render at the bottom of the Landing_Page.
2. THE Footer SHALL include links to: FAQ, How It Works, Contact, and Terms.
3. WHEN a visitor clicks the "FAQ" link, THE Footer SHALL navigate to the FAQ page or section.
4. WHEN a visitor clicks the "How It Works" link, THE Footer SHALL scroll to or navigate to the How It Works section.
5. THE Footer SHALL display the LoopLink brand name and a copyright notice.

---

### Requirement 4: Dashboard Metric Cards Redesign

**User Story:** As a business owner, I want elevated metric cards at the top of my dashboard, so that I can instantly see my key financial figures in a visually clear and premium layout.

#### Acceptance Criteria

1. THE Dashboard SHALL render four Metric_Cards in a responsive grid (2 columns on mobile, 4 columns on desktop) at the top of the main content area.
2. THE Metric_Card for "Total Income" SHALL display the summed income amount, a green accent color, and an upward-arrow icon.
3. THE Metric_Card for "Total Expenses" SHALL display the summed expense amount, a red accent color, and a downward-arrow icon.
4. THE Metric_Card for "Net Profit" SHALL display the profit value (income minus expenses), a green accent when profit ≥ 0, and a red accent when profit < 0.
5. THE Metric_Card for "Profit Margin" SHALL display the margin as a percentage with one decimal place, a green accent when margin ≥ 20%, and an amber accent when margin < 20%.
6. EACH Metric_Card SHALL render with a visible box shadow, a colored icon container, and a bold numeric value using the display font.

---

### Requirement 5: Dashboard Two-Column Main Grid

**User Story:** As a business owner, I want a structured two-column dashboard layout, so that I can see AI insights and recent transactions on the left, and business health and quick actions on the right, without scrolling excessively.

#### Acceptance Criteria

1. THE Dashboard SHALL render a two-column grid below the Metric_Cards on screens wider than 1024px (lg breakpoint).
2. THE left column SHALL span two-thirds of the grid and contain the AI Insights panel and the Recent Transactions panel stacked vertically.
3. THE right column SHALL span one-third of the grid and contain the Business Health panel and the Quick Actions panel stacked vertically.
4. WHILE the viewport is narrower than 1024px, THE Dashboard SHALL render all panels in a single column.

---

### Requirement 6: Dashboard Quick Actions Redesign

**User Story:** As a business owner, I want large, modern card-style quick action buttons with icons and hover effects, so that I can trigger common actions quickly and the dashboard feels premium.

#### Acceptance Criteria

1. THE Quick_Actions panel SHALL render four action cards: "Add Income", "Add Expense", "View Analytics", and "AI Chat".
2. EACH Quick_Actions card SHALL display a descriptive icon alongside the action label.
3. EACH Quick_Actions card SHALL apply a visible hover effect (background color change or scale transform) on mouse enter.
4. WHEN a user clicks "Add Income", THE Quick_Actions panel SHALL open the AddTransactionModal with type set to "income".
5. WHEN a user clicks "Add Expense", THE Quick_Actions panel SHALL open the AddTransactionModal with type set to "expense".
6. WHEN a user clicks "View Analytics", THE Quick_Actions panel SHALL navigate to `/analytics`.
7. WHEN a user clicks "AI Chat", THE Quick_Actions panel SHALL navigate to `/chat`.
8. THE Quick_Actions panel SHALL render the "AI Chat" card as a visible entry point to the AI_Chat feature.

---

### Requirement 7: AI Response Continuation Suggestions

**User Story:** As a business owner using AI Chat, I want the AI to suggest follow-up actions after each response, so that the conversation flows naturally and I discover more ways to get value from the AI.

#### Acceptance Criteria

1. WHEN the AI_Chat receives a completed assistant response, THE AI_Chat SHALL render a set of 2–4 suggested follow-up action chips below the assistant message.
2. THE suggested follow-up chips SHALL be contextually relevant to the assistant's response content.
3. WHEN a user clicks a follow-up chip, THE AI_Chat SHALL send that chip's text as the next user message.
4. WHILE the AI is streaming a response, THE AI_Chat SHALL hide the follow-up chips for the in-progress message.
5. THE AI_Chat SHALL include at least one of the following suggestion categories per response: "Give step-by-step plan", "Analyze your performance", or "Suggest business ideas".

---

### Requirement 8: AI Personalized Financial Context

**User Story:** As a business owner, I want the AI to use my actual financial data when giving advice, so that the responses are specific to my business situation rather than generic.

#### Acceptance Criteria

1. WHEN a user sends a message in AI_Chat, THE AI_Chat SHALL include the user's total income, total expenses, net profit, and up to 20 recent transactions in the AI request context.
2. WHEN a user sends a message in AI_Coach, THE AI_Coach SHALL include the same financial context as specified in criterion 1.
3. THE AI_Chat SHALL include the active business name and business type in every AI request.
4. IF the user has inventory data and the Sells_Goods_Toggle is enabled, THEN THE AI_Chat SHALL include a summary of inventory stock levels and recent sales in the AI request context.

---

### Requirement 9: AI Conversation Continuity

**User Story:** As a business owner, I want the AI to maintain conversation context across messages, so that I can have a coherent multi-turn dialogue without repeating myself.

#### Acceptance Criteria

1. THE AI_Chat SHALL maintain a message history of up to the last 10 messages (user + assistant pairs) and include this history in each new AI request.
2. WHEN a user sends a new message, THE AI_Chat SHALL append the new user message to the existing history before sending the request.
3. THE AI_Chat SHALL preserve the conversation history for the duration of the browser session.
4. IF the user navigates away from AI_Chat and returns within the same session, THEN THE AI_Chat SHALL restore the previous conversation history.

---

### Requirement 10: Inventory Module — Item Management

**User Story:** As a business owner who sells goods, I want to add and manage stock items with quantity, cost price, and selling price, so that I can track my inventory accurately.

#### Acceptance Criteria

1. WHERE the Sells_Goods_Toggle is enabled, THE Inventory_Module SHALL be accessible from the AppShell navigation.
2. THE Inventory_Module SHALL allow a user to create an Inventory_Item with the following required fields: item name, initial quantity (integer ≥ 1), cost price per unit (decimal ≥ 0), and selling price per unit (decimal ≥ 0).
3. WHEN a user submits a valid new Inventory_Item form, THE Inventory_Module SHALL insert a record into the `inventory_items` Supabase table and display the item in the inventory list.
4. IF a user submits an Inventory_Item form with a missing required field, THEN THE Inventory_Module SHALL display a field-level validation error and prevent submission.
5. THE Inventory_Module SHALL display a list of all Inventory_Items for the active business, showing: item name, current stock quantity, cost price, selling price, and profit per unit (selling price minus cost price).
6. THE Inventory_Module SHALL allow a user to add more stock to an existing Inventory_Item by specifying an additional quantity, which increments the current stock quantity.

---

### Requirement 11: Inventory Module — Sales Recording

**User Story:** As a business owner who sells goods, I want to record sales of inventory items, so that the system automatically updates remaining stock and calculates profit.

#### Acceptance Criteria

1. WHERE the Sells_Goods_Toggle is enabled, THE Inventory_Module SHALL allow a user to record a sale for any Inventory_Item by specifying the quantity sold (integer ≥ 1).
2. WHEN a user records a sale, THE Inventory_Module SHALL insert a record into the `inventory_sales` Supabase table with: item_id, quantity_sold, sale_price_per_unit, and created_at.
3. WHEN a user records a sale, THE Inventory_Module SHALL decrement the Inventory_Item's current stock quantity by the quantity sold.
4. IF a user attempts to record a sale with a quantity greater than the current stock, THEN THE Inventory_Module SHALL display an error message and prevent the sale from being recorded.
5. THE Inventory_Module SHALL display per-item metrics: total units purchased (sum of all stock additions), total units sold, remaining stock, and total profit from sales (quantity sold × (selling price − cost price)).

---

### Requirement 12: Inventory Module — Sells Goods Toggle

**User Story:** As a business owner, I want to toggle whether I sell goods, so that the inventory module is only shown when relevant to my business type.

#### Acceptance Criteria

1. THE Dashboard or Settings SHALL render a "I sell goods" toggle control visible to authenticated users.
2. WHEN a user enables the Sells_Goods_Toggle, THE AppShell SHALL add an "Inventory" navigation link and THE Dashboard SHALL display an inventory summary widget.
3. WHEN a user disables the Sells_Goods_Toggle, THE AppShell SHALL hide the "Inventory" navigation link and THE Dashboard SHALL hide the inventory summary widget.
4. THE Sells_Goods_Toggle state SHALL be persisted to the user's profile in Supabase so that it is restored on subsequent sessions.
5. THE Sells_Goods_Toggle default value SHALL be false (disabled) for new users.

---

### Requirement 13: Inventory AI Integration

**User Story:** As a business owner who sells goods, I want the AI to reference my inventory data when giving advice, so that I receive relevant suggestions about stock management and promotion.

#### Acceptance Criteria

1. WHERE the Sells_Goods_Toggle is enabled, THE AI_Chat SHALL include inventory context in AI requests: list of items with current stock, cost price, selling price, and total units sold.
2. WHEN the AI response references inventory, THE AI_Chat SHALL be capable of surfacing insights such as low-stock warnings or promotion suggestions based on the inventory data provided.
3. THE AI_Chat SHALL not fabricate inventory figures; all inventory data referenced SHALL come from the `inventory_items` and `inventory_sales` Supabase tables.

---

### Requirement 14: Real-Time Data Integration

**User Story:** As a business owner, I want all my actions (adding transactions, recording sales, updating inventory) to immediately reflect across the dashboard, AI insights, and analytics, so that I always see accurate, up-to-date information.

#### Acceptance Criteria

1. WHEN a user adds a Transaction via the AddTransactionModal, THE Dashboard SHALL refresh the Metric_Cards and Recent Transactions panel without requiring a full page reload.
2. WHEN a user records an Inventory_Sale, THE Inventory_Module SHALL update the displayed stock quantity and profit metrics immediately after the sale is saved.
3. WHEN a user adds a Transaction, THE Dashboard AI Insights panel SHALL re-fetch AI insights using the updated transaction data within the same session.
4. THE Dashboard SHALL link to AI_Chat via the Quick_Actions "AI Chat" card so that users can navigate directly from financial data to conversational AI advice.
5. WHEN a user navigates from the Dashboard to AI_Chat, THE AI_Chat SHALL have access to the same transaction data that was loaded on the Dashboard.

---

### Requirement 15: Supabase Schema — Inventory Tables

**User Story:** As a developer, I want the correct Supabase tables for inventory management, so that inventory data is stored reliably and can be queried efficiently.

#### Acceptance Criteria

1. THE Supabase database SHALL contain an `inventory_items` table with columns: `id` (uuid, primary key), `business_id` (uuid, foreign key to businesses), `user_id` (uuid, foreign key to auth.users), `name` (text, not null), `quantity` (integer, not null, default 0), `cost_price` (numeric, not null), `selling_price` (numeric, not null), `created_at` (timestamptz, default now()).
2. THE Supabase database SHALL contain an `inventory_sales` table with columns: `id` (uuid, primary key), `item_id` (uuid, foreign key to inventory_items), `business_id` (uuid, foreign key to businesses), `user_id` (uuid, foreign key to auth.users), `quantity_sold` (integer, not null), `sale_price_per_unit` (numeric, not null), `created_at` (timestamptz, default now()).
3. THE `inventory_items` table SHALL enforce Row Level Security (RLS) so that a user can only read and write records where `user_id` matches the authenticated user's ID.
4. THE `inventory_sales` table SHALL enforce Row Level Security (RLS) so that a user can only read and write records where `user_id` matches the authenticated user's ID.
5. FOR ALL valid Inventory_Item records, querying `inventory_sales` by `item_id` and summing `quantity_sold` SHALL produce a value less than or equal to the Inventory_Item's total quantity ever added (round-trip consistency between stock additions and sales).
