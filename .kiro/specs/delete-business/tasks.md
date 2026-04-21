# Implementation Plan: Delete Business

## Overview

Implement a permanent business deletion flow: DB layer → context layer → modal component → AppShell wiring.

## Tasks

- [ ] 1. Add `deleteBusiness()` to db.ts
  - Explicitly delete `inventory_losses`, `inventory_sales`, `inventory_items`, `transactions`, then `businesses` row for the given `businessId`
  - Each step throws on error; no partial cleanup at app layer
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 2. Add `deleteBusiness(id)` to BusinessContext
  - [ ] 2.1 Update `BusinessContextType` interface to include `deleteBusiness: (id: string) => Promise<void>`
    - _Requirements: 6.1, 6.2_
  - [ ] 2.2 Implement `deleteBusiness` in `BusinessProvider`
    - Call `db.deleteBusiness(id)`, filter list, set new active (first remaining or null), update `localStorage` (`ll_active_biz`)
    - Re-throw on DB failure without mutating state
    - _Requirements: 5.1, 5.3, 6.1, 6.3_
  - [ ]* 2.3 Write property test for context state after deletion (Property 5 & 6)
    - **Property 5: Active business is updated after deletion**
    - **Property 6: Business list does not contain deleted business**
    - **Validates: Requirements 5.1, 5.3, 6.1**

- [ ] 3. Create `DeleteBusinessModal` component
  - [ ] 3.1 Scaffold component at `src/components/dashboard/DeleteBusinessModal.tsx`
    - Props: `business`, `onClose`, `onDeleted`
    - State: `inputValue`, `isLoading`, `error`
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ] 3.2 Implement confirm button enable/disable logic
    - Enabled only when `inputValue === business.name` (case-sensitive) and `!isLoading`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ]* 3.3 Write property test for confirm button state (Property 1)
    - **Property 1: Confirm button enabled iff input exactly matches business name**
    - **Validates: Requirements 3.2, 3.3, 3.4**
  - [ ] 3.4 Implement deletion handler
    - Call `context.deleteBusiness`, then `onDeleted` on success; catch and display error on failure
    - Show loading indicator and disable button while in progress
    - _Requirements: 4.6, 7.1, 7.3, 7.4_

- [ ] 4. Checkpoint — Ensure modal renders and confirm logic works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Wire `DeleteBusinessModal` into AppShell More sheet
  - [ ] 5.1 Add `showDeleteBiz` state and "Delete Business" danger button in More sheet business section
    - Button only rendered when `activeBusiness !== null`; red styling to indicate destructive action
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ] 5.2 Render `DeleteBusinessModal` when `showDeleteBiz` is true
    - `onDeleted`: close modal, close More sheet, navigate to `/onboarding` if `businesses.length === 0`
    - _Requirements: 5.2, 6.3_

- [ ] 6. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with Vitest
