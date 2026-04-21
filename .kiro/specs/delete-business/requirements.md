# Requirements Document

## Introduction

The Delete Business feature allows LoopLink users to permanently delete a business and all its associated data from the platform. The feature is accessible via the "More" menu in the business management section. It includes a multi-step confirmation flow to prevent accidental deletion, requiring the user to type the business name before the delete action is enabled. After deletion, the app automatically transitions the user to another available business or redirects to the business creation screen if none remain.

## Glossary

- **Business**: A user-owned entity in LoopLink with associated transactions, inventory, and records
- **More_Menu**: The contextual overflow menu in the business management section containing additional business actions
- **Delete_Modal**: The confirmation dialog shown before a business deletion is executed
- **Business_Name_Input**: The text field inside the Delete_Modal where the user must type the exact business name to confirm deletion
- **Current_Business**: The currently active business reflected in global app state via `current_business_id`
- **Business_List**: The collection of businesses associated with the authenticated user
- **Global_State**: The application-wide state store managing the active business, business list, and related UI data
- **Supabase**: The backend-as-a-service used for database operations and authentication

## Requirements

### Requirement 1: Delete Business Menu Entry

**User Story:** As a business owner, I want a "Delete Business" option in the More menu, so that I can initiate the deletion of a business from within the management section.

#### Acceptance Criteria

1. THE More_Menu SHALL include a "Delete Business" option in the business management section.
2. THE More_Menu SHALL render the "Delete Business" option with red text to visually indicate it is a destructive action.
3. WHEN the user taps "Delete Business" in the More_Menu, THE Delete_Modal SHALL open.

---

### Requirement 2: Deletion Confirmation Modal

**User Story:** As a business owner, I want a confirmation modal before deletion, so that I understand the consequences and do not accidentally delete my business.

#### Acceptance Criteria

1. WHEN the Delete_Modal opens, THE Delete_Modal SHALL display the title "Delete Business?".
2. THE Delete_Modal SHALL display a message stating that the action is permanent and that all transactions, inventory, and records associated with the business will be deleted.
3. THE Delete_Modal SHALL be responsive and render correctly on mobile screen sizes.
4. THE Delete_Modal SHALL visually separate the confirm and cancel buttons to prevent accidental taps on mobile devices.
5. WHEN the user taps outside the Delete_Modal or taps the cancel button, THE Delete_Modal SHALL close without performing any deletion.

---

### Requirement 3: Business Name Confirmation Input

**User Story:** As a business owner, I want to type my business name to confirm deletion, so that the system has an extra safety check preventing accidental or unintended deletion.

#### Acceptance Criteria

1. THE Delete_Modal SHALL include a Business_Name_Input field prompting the user to type the exact business name to confirm.
2. WHILE the text entered in Business_Name_Input does not exactly match the current business name, THE Delete_Modal SHALL keep the confirm delete button disabled.
3. WHEN the text entered in Business_Name_Input exactly matches the current business name, THE Delete_Modal SHALL enable the confirm delete button.
4. THE Business_Name_Input comparison SHALL be case-sensitive.

---

### Requirement 4: Business Deletion Execution

**User Story:** As a business owner, I want the system to permanently delete all my business data when I confirm deletion, so that no residual data remains on the platform.

#### Acceptance Criteria

1. WHEN the user confirms deletion with a matching Business_Name_Input, THE System SHALL permanently delete the business record from Supabase.
2. WHEN a business is deleted, THE System SHALL permanently delete all transactions associated with that business from Supabase.
3. WHEN a business is deleted, THE System SHALL permanently delete all inventory records associated with that business from Supabase.
4. WHEN a business is deleted, THE System SHALL permanently delete all other records referencing that business from Supabase.
5. THE System SHALL remove the deleted business from the authenticated user's Business_List in Supabase.
6. IF a Supabase deletion operation fails, THEN THE System SHALL display an error message to the user and SHALL NOT partially delete business data.

---

### Requirement 5: Post-Deletion Navigation and State

**User Story:** As a business owner, I want the app to automatically handle navigation after deletion, so that I am never left on a broken screen referencing a deleted business.

#### Acceptance Criteria

1. WHEN a business is successfully deleted and the user has at least one remaining business, THE System SHALL update `current_business_id` in Global_State to reference an available business.
2. WHEN a business is successfully deleted and no businesses remain in the user's Business_List, THE System SHALL redirect the user to the "Create New Business" screen.
3. WHEN a business is deleted, THE Global_State SHALL remove the deleted business from the Business_List.
4. WHEN a business is deleted, THE System SHALL ensure no UI component renders data referencing the deleted business.

---

### Requirement 6: Global State Integrity

**User Story:** As a business owner, I want the app state to remain consistent after deletion, so that I do not see stale or broken data anywhere in the app.

#### Acceptance Criteria

1. WHEN a business is deleted, THE Global_State SHALL be updated atomically to remove the deleted business and set a new `current_business_id` before any navigation occurs.
2. THE System SHALL ensure that all components subscribed to Global_State re-render with the updated Business_List after deletion.
3. IF the deleted business was the only entry in Business_List, THEN THE Global_State SHALL set `current_business_id` to null before redirecting to the "Create New Business" screen.

---

### Requirement 7: No Silent or Instant Deletion

**User Story:** As a business owner, I want the system to always require explicit confirmation before deleting, so that I am never surprised by data loss.

#### Acceptance Criteria

1. THE System SHALL NOT delete any business data without the user completing the full confirmation flow in the Delete_Modal.
2. THE System SHALL NOT provide an undo or recovery mechanism after a confirmed deletion, and SHALL communicate this permanence clearly in the Delete_Modal message.
3. THE System SHALL NOT delete business data silently in the background without visible feedback to the user.
4. WHEN a deletion is in progress, THE System SHALL display a loading indicator and disable the confirm button to prevent duplicate submissions.
