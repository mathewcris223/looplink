# Requirements Document

## Introduction

The AI Business Manager Upgrade is a set of enhancements to the existing LoopLink SaaS platform — a financial tracking app for small business owners built with React + TypeScript + Vite + Tailwind + Supabase + Groq AI (llama-3.3-70b-versatile). The app already has inventory management, transaction history with edit/delete, AI chat with streaming and persistent history, a dashboard with metric cards, analytics, and an AppShell with dark sidebar.

This upgrade adds four major capabilities not yet built: the Daily Business Truth Engine (smart insights panel), Bulk Transaction Input (AI-parsed multi-entry mode), Inventory Intelligence (stock depletion predictions and profitability ranking), and Smart AI Context (data-driven follow-up suggestions). It also addresses remaining gaps in mobile UX, AI chat search, and overall performance.

## Glossary

- **Truth_Engine**: The smart insights panel rendered at the top of the Dashboard showing today's profit/loss, weekly trend, top product, loss category, anomalies, and actionable advice.
- **Insight_Card**: A single insight item within the Truth_Engine panel, color-coded green/red/yellow.
- **Bulk_Input**: The bulk/smart transaction entry mode where a user types or pastes multiple entries in natural language and the system parses them via AI.
- **Bulk_Preview**: The confirmation screen shown after AI parsing of a Bulk_Input entry, listing detected transactions before saving.
- **Transaction_Parser**: The AI-powered service that parses free-text bulk input into structured income/expense records.
- **Inventory_Intelligence**: The enhanced inventory view showing profitability ranking, low stock alerts, and stock depletion predictions.
- **Depletion_Prediction**: A computed estimate of how many days until an inventory item runs out of stock, based on recent sales velocity.
- **Sales_Velocity**: The average number of units sold per day for an inventory item, calculated over the past 30 days.
- **AI_Chat**: The existing conversational AI interface at `/chat` powered by Groq llama-3.3-70b-versatile.
- **Dynamic_Suggestions**: Follow-up action chips rendered after each AI response, generated based on the actual response content rather than a static list.
- **Chat_Search**: A search interface allowing users to find past AI conversations by keyword.
- **Transaction**: An existing income or expense record stored in the `transactions` Supabase table.
- **Dashboard**: The authenticated main overview page at `/dashboard`.
- **AppShell**: The authenticated layout wrapper providing sidebar navigation and top bar.
- **Bottom_Nav**: A fixed bottom navigation bar rendered on mobile viewports for key actions.
- **Supabase**: The backend-as-a-service providing database, auth, and real-time subscriptions.
- **Groq_AI**: The AI inference provider using the llama-3.3-70b-versatile model.

---

## Requirements

### Requirement 1: Daily Business Truth Engine — Panel Structure

**User Story:** As a business owner, I want a smart insights panel at the top of my dashboard, so that I can immediately understand how my business is performing today without digging through data.

#### Acceptance Criteria

1. THE Dashboard SHALL render the Truth_Engine panel as the first content section below the metric cards.
2. THE Truth_Engine SHALL display the following six Insight_Cards: today's profit/loss, weekly revenue trend percentage, top profitable product, highest loss-making expense category, spending anomaly alert, and one actionable advice item.
3. EACH Insight_Card SHALL be color-coded: green for positive/healthy indicators, red for negative/loss indicators, and yellow for warnings or anomalies.
4. THE Truth_Engine SHALL render all Insight_Cards in plain language without financial jargon.
5. THE Truth_Engine SHALL render responsively as a horizontally scrollable row on mobile viewports and a grid on desktop viewports.
6. WHEN the user has fewer than 3 transactions in the current day, THE Truth_Engine SHALL display a "Not enough data yet — add today's transactions to see insights" placeholder instead of empty or zero-value cards.

---

### Requirement 2: Daily Business Truth Engine — Data Computation

**User Story:** As a business owner, I want the insights panel to reflect my actual transaction and inventory data, so that the advice is specific to my business rather than generic.

#### Acceptance Criteria

1. THE Truth_Engine SHALL compute today's profit/loss as the sum of all income transactions minus the sum of all expense transactions recorded on the current calendar day.
2. THE Truth_Engine SHALL compute the weekly trend percentage as the percentage change in total revenue between the current 7-day period and the previous 7-day period.
3. THE Truth_Engine SHALL identify the top profitable product as the inventory item with the highest total profit (quantity sold × profit per unit) in the past 30 days.
4. THE Truth_Engine SHALL identify the highest loss-making expense category as the transaction category with the highest total spend in the current month.
5. WHEN any single expense transaction exceeds 3 standard deviations above the user's mean transaction amount for that category, THE Truth_Engine SHALL flag it as a spending anomaly.
6. THE Truth_Engine SHALL generate the actionable advice item by sending the computed metrics to Groq_AI and rendering the response as a single plain-language sentence of no more than 20 words.
7. WHEN the Truth_Engine data is loading, THE Dashboard SHALL display skeleton placeholders for each Insight_Card.
8. THE Truth_Engine SHALL refresh its computed data WHEN a new Transaction is added or deleted within the same session.

---

### Requirement 3: Bulk Transaction Input — Mode Selection

**User Story:** As a business owner, I want to choose between a simple single-entry form and a bulk entry mode, so that I can quickly log multiple transactions at once when I have several to record.

#### Acceptance Criteria

1. THE Dashboard or transaction entry flow SHALL present two input mode options: "Simple" (single entry form) and "Bulk / Smart" (multi-entry natural language input).
2. WHEN a user selects "Simple" mode, THE Dashboard SHALL open the existing single-entry AddTransactionModal.
3. WHEN a user selects "Bulk / Smart" mode, THE Dashboard SHALL open the Bulk_Input interface.
4. THE mode selection SHALL be accessible from the Dashboard quick actions and from the transaction history page.

---

### Requirement 4: Bulk Transaction Input — Natural Language Parsing

**User Story:** As a business owner, I want to type or paste multiple transactions in plain language and have the system detect amounts, categories, and types automatically, so that I can log a full day's transactions in seconds.

#### Acceptance Criteria

1. THE Bulk_Input interface SHALL provide a multi-line text area where a user can type or paste entries such as "Bought rice 20000, transport 5000, sold coke 15000".
2. WHEN a user submits the Bulk_Input text, THE Transaction_Parser SHALL send the raw text to Groq_AI with a structured prompt requesting extraction of: transaction type (income or expense), amount, description, and suggested category for each entry.
3. THE Transaction_Parser SHALL return a structured list of parsed transactions within 5 seconds of submission for inputs containing up to 20 entries.
4. WHEN parsing is complete, THE Bulk_Input interface SHALL display the Bulk_Preview screen listing each detected transaction with its type, amount, description, and category.
5. THE Bulk_Preview SHALL color-code each row: green for income entries and red for expense entries.
6. IF the Transaction_Parser cannot confidently determine the type or amount for an entry, THEN THE Bulk_Preview SHALL flag that row with a yellow warning and require the user to manually confirm or correct it before saving.

---

### Requirement 5: Bulk Transaction Input — Preview and Confirmation

**User Story:** As a business owner, I want to review and edit parsed transactions before they are saved, so that I can correct any parsing errors without losing my input.

#### Acceptance Criteria

1. THE Bulk_Preview SHALL allow a user to edit the type, amount, description, and category of any parsed transaction row inline before confirming.
2. THE Bulk_Preview SHALL allow a user to delete any individual parsed transaction row before confirming.
3. WHEN a user confirms the Bulk_Preview, THE Bulk_Input interface SHALL save all remaining rows as individual Transaction records in Supabase in a single batch operation.
4. WHEN the batch save completes successfully, THE Bulk_Input interface SHALL close and THE Dashboard SHALL refresh the metric cards and recent transactions panel.
5. IF the batch save fails, THEN THE Bulk_Input interface SHALL display an error message and retain the Bulk_Preview data so the user can retry without re-entering input.
6. THE Bulk_Preview SHALL display a summary line showing the total number of income entries, total number of expense entries, and net amount before the user confirms.

---

### Requirement 6: Smart AI Context — Real Data in Responses

**User Story:** As a business owner using AI Chat, I want the AI to reference my actual transactions, inventory, and profit trends when answering questions, so that the advice is specific to my business situation.

#### Acceptance Criteria

1. WHEN a user sends a message in AI_Chat, THE AI_Chat SHALL include in the Groq_AI request context: total income for the current month, total expenses for the current month, net profit for the current month, profit trend direction (up/down/flat) compared to the previous month, and up to 20 most recent transactions.
2. WHERE the user has inventory data, THE AI_Chat SHALL also include in the context: the top 5 inventory items by sales volume, current low-stock items, and total inventory value.
3. THE AI_Chat SHALL instruct Groq_AI via the system prompt to reference specific figures from the provided context when answering business questions, rather than giving generic advice.
4. WHEN the AI response contains a specific monetary figure or product name drawn from the user's data, THE AI_Chat SHALL render that response without modification.

---

### Requirement 7: Smart AI Context — Dynamic Follow-Up Suggestions

**User Story:** As a business owner using AI Chat, I want follow-up suggestion chips that are relevant to what the AI just said, so that I can continue the conversation naturally without thinking of what to ask next.

#### Acceptance Criteria

1. WHEN an AI_Chat response is completed, THE AI_Chat SHALL generate 2–4 Dynamic_Suggestions by sending the completed assistant response to Groq_AI with a prompt requesting contextually relevant follow-up questions.
2. THE Dynamic_Suggestions SHALL be rendered as tappable chips below the assistant message.
3. WHEN a user taps a Dynamic_Suggestion chip, THE AI_Chat SHALL send that suggestion text as the next user message.
4. WHILE the AI is streaming a response, THE AI_Chat SHALL not render Dynamic_Suggestions for the in-progress message.
5. THE Dynamic_Suggestions SHALL NOT be a static predefined list; each set of suggestions SHALL be generated fresh based on the content of the preceding assistant response.

---

### Requirement 8: Inventory Intelligence — Profitability and Stock Summary

**User Story:** As a business owner, I want my inventory page to show which items are most profitable and give me a clear stock health summary, so that I can make better purchasing and pricing decisions.

#### Acceptance Criteria

1. THE Inventory_Intelligence view SHALL display the following summary metrics at the top of the inventory page: total number of items, count of low-stock items, most profitable item (by total profit in the past 30 days), and highest-revenue item (by total sales amount in the past 30 days).
2. THE Inventory_Intelligence view SHALL rank inventory items by total profit in the past 30 days and display a "Top Performer" badge on the highest-ranked item.
3. THE Inventory_Intelligence view SHALL display a "Low Stock" alert badge on any item whose current stock is at or below its low stock threshold.
4. WHEN an inventory item has zero sales in the past 30 days, THE Inventory_Intelligence view SHALL display a "No Recent Sales" badge on that item.

---

### Requirement 9: Inventory Intelligence — Stock Depletion Prediction

**User Story:** As a business owner, I want to see how many days until each item runs out of stock based on my sales history, so that I can restock before running out.

#### Acceptance Criteria

1. THE Inventory_Intelligence view SHALL compute the Depletion_Prediction for each Product_Mode and Bulk_Mode inventory item as: current stock quantity divided by Sales_Velocity (average units sold per day over the past 30 days).
2. WHEN an item's Depletion_Prediction is 7 days or fewer, THE Inventory_Intelligence view SHALL display the prediction as a red label reading "Runs out in ~X days".
3. WHEN an item's Depletion_Prediction is between 8 and 14 days, THE Inventory_Intelligence view SHALL display the prediction as a yellow label reading "Runs out in ~X days".
4. WHEN an item's Depletion_Prediction is more than 14 days, THE Inventory_Intelligence view SHALL display the prediction as a green label reading "~X days of stock remaining".
5. WHEN an item has no sales in the past 30 days (Sales_Velocity is zero), THE Inventory_Intelligence view SHALL display "No sales data" instead of a prediction.
6. FOR ALL inventory items with a non-zero Sales_Velocity, the Depletion_Prediction SHALL equal the current stock quantity divided by the Sales_Velocity, rounded to the nearest whole number.

---

### Requirement 10: Edit and Delete — Complete Coverage

**User Story:** As a business owner, I want to edit or delete any record in the system including inventory sales, so that I can correct mistakes without losing data integrity.

#### Acceptance Criteria

1. THE Inventory_Intelligence view SHALL display an edit icon and a delete icon on each inventory sale record row.
2. WHEN a user clicks the edit icon on an inventory sale record, THE Inventory_Intelligence view SHALL open an inline or modal edit form pre-filled with the sale's current values.
3. WHEN a user saves an edited inventory sale record, THE Inventory_Intelligence view SHALL update the record in Supabase and recalculate the affected item's stock level and profit metrics.
4. WHEN a user clicks the delete icon on an inventory sale record, THE Inventory_Intelligence view SHALL display a confirmation prompt before deleting.
5. WHEN a user confirms deletion of an inventory sale record, THE Inventory_Intelligence view SHALL remove the record from Supabase and restore the associated item's stock level by the deleted sale's quantity.
6. THE edit and delete icons SHALL be visible without requiring hover on mobile viewports.

---

### Requirement 11: Mobile-First UI — Bottom Navigation

**User Story:** As a business owner using LoopLink on a mobile device, I want a bottom navigation bar for key actions, so that I can reach the most important features with one thumb tap.

#### Acceptance Criteria

1. WHILE the viewport width is less than 768px, THE AppShell SHALL render a Bottom_Nav bar fixed to the bottom of the screen containing links to: Dashboard, Transactions, Inventory, Chat, and Analytics.
2. THE Bottom_Nav SHALL display an icon and a short label for each navigation item.
3. THE Bottom_Nav SHALL highlight the active route's navigation item with a distinct color or underline indicator.
4. WHILE the viewport width is 768px or greater, THE AppShell SHALL hide the Bottom_Nav and use the existing sidebar navigation.
5. THE Bottom_Nav SHALL not overlap or obscure any page content; the main content area SHALL include sufficient bottom padding to account for the Bottom_Nav height.

---

### Requirement 12: Mobile-First UI — Tap Targets and Readability

**User Story:** As a business owner on mobile, I want all buttons and interactive elements to be easy to tap and all text to be fully readable, so that I can use the app comfortably on a small screen.

#### Acceptance Criteria

1. THE AppShell SHALL ensure all interactive elements (buttons, links, icons) have a minimum tap target size of 44×44px on mobile viewports.
2. THE Dashboard SHALL not truncate any metric label or value on viewports 375px wide or wider.
3. THE Inventory_Intelligence view SHALL not require horizontal scrolling on viewports 375px wide or wider.
4. THE Bulk_Input text area SHALL be at least 120px tall on mobile viewports to allow comfortable multi-line input.
5. WHEN a modal is open on a mobile viewport, THE modal SHALL occupy at least 90% of the viewport height and be scrollable if content exceeds the viewport.

---

### Requirement 13: AI Chat Search

**User Story:** As a business owner, I want to search through my past AI conversations by keyword, so that I can find specific advice I received without scrolling through all history.

#### Acceptance Criteria

1. THE AI_Chat history panel SHALL include a search input field that filters the displayed conversation list by keyword.
2. WHEN a user types in the Chat_Search input, THE AI_Chat SHALL filter the conversation list to show only conversations whose title or message content contains the search term, within 300ms of the last keystroke.
3. WHEN no conversations match the search term, THE AI_Chat SHALL display a "No conversations found" empty state message.
4. WHEN a user clears the Chat_Search input, THE AI_Chat SHALL restore the full conversation list.
5. THE Chat_Search SHALL search across conversation titles and the text content of all messages within each conversation stored in Supabase.

---

### Requirement 14: Performance — Reduced Action Steps

**User Story:** As a business owner, I want to complete common actions in as few steps as possible, so that I can manage my business quickly without friction.

#### Acceptance Criteria

1. THE Dashboard SHALL allow a user to open the transaction entry form in no more than 2 taps from the main dashboard view.
2. THE Inventory_Intelligence view SHALL allow a user to record a sale in no more than 3 taps from the inventory list view.
3. THE Bulk_Input interface SHALL allow a user to go from typing raw text to saving all parsed transactions in no more than 2 steps: submit text → review and confirm.
4. WHEN the Truth_Engine actionable advice is displayed, THE Dashboard SHALL render a tappable CTA that navigates directly to the relevant section (e.g., AI Chat, Inventory, or Add Transaction) in one tap.
5. THE AI_Chat SHALL render the Dynamic_Suggestions within 3 seconds of the assistant response completing.
