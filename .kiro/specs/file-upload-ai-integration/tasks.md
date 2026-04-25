# File Upload → AI Chat Integration - Implementation Tasks

## Phase 1: Database Setup ✓ Ready to implement

### Task 1.1: Create Database Migration
**Priority:** Critical
**Estimated Time:** 30 minutes

Create Supabase migration for `uploaded_files` table and update `transactions` table.

**Acceptance Criteria:**
- [ ] `uploaded_files` table created with all fields
- [ ] `file_id` column added to `transactions` table
- [ ] Indexes created for performance
- [ ] RLS policies configured
- [ ] Foreign key constraints set up
- [ ] Migration tested locally

**Files to Create:**
- `supabase/migrations/YYYYMMDD_add_uploaded_files.sql`

**SQL Schema:**
```sql
-- Create uploaded_files table
CREATE TABLE uploaded_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'xlsx', 'xls', 'pdf', 'txt')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  transaction_count INTEGER DEFAULT 0,
  total_income NUMERIC(12,2) DEFAULT 0,
  total_expenses NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Add file_id to transactions
ALTER TABLE transactions ADD COLUMN file_id UUID REFERENCES uploaded_files(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_uploaded_files_user_business ON uploaded_files(user_id, business_id);
CREATE INDEX idx_uploaded_files_status ON uploaded_files(status);
CREATE INDEX idx_transactions_file_id ON transactions(file_id);

-- RLS Policies
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own uploaded files"
  ON uploaded_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own uploaded files"
  ON uploaded_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uploaded files"
  ON uploaded_files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own uploaded files"
  ON uploaded_files FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Phase 2: Backend Functions ✓ Ready to implement

### Task 2.1: Add File Management Functions to db.ts
**Priority:** Critical
**Estimated Time:** 1 hour

Implement CRUD operations for uploaded files.

**Acceptance Criteria:**
- [ ] `createUploadedFile()` function implemented
- [ ] `updateFileStatus()` function implemented
- [ ] `getUploadedFiles()` function implemented
- [ ] `getUploadedFile()` function implemented
- [ ] `getFileTransactions()` function implemented
- [ ] `deleteUploadedFile()` function implemented
- [ ] All functions have proper error handling
- [ ] TypeScript types exported

**Files to Modify:**
- `looplink-landing-page-design-main/src/lib/db.ts`

**Functions to Add:**
```typescript
export interface UploadedFile {
  id: string;
  user_id: string;
  business_id: string;
  filename: string;
  file_size: number;
  file_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  transaction_count: number;
  total_income: number;
  total_expenses: number;
  created_at: string;
  processed_at: string | null;
}

export async function createUploadedFile(params: {
  businessId: string;
  filename: string;
  fileSize: number;
  fileType: string;
}): Promise<UploadedFile>;

export async function updateFileStatus(
  fileId: string,
  status: UploadedFile['status'],
  metadata?: {
    transactionCount?: number;
    totalIncome?: number;
    totalExpenses?: number;
    errorMessage?: string;
  }
): Promise<void>;

export async function getUploadedFiles(businessId: string): Promise<UploadedFile[]>;
export async function getUploadedFile(fileId: string): Promise<UploadedFile | null>;
export async function getFileTransactions(fileId: string): Promise<Transaction[]>;
export async function deleteUploadedFile(fileId: string, deleteTransactions?: boolean): Promise<void>;
```

---

### Task 2.2: Add Batch Transaction Insert
**Priority:** High
**Estimated Time:** 30 minutes

Add function to insert multiple transactions at once with file_id.

**Acceptance Criteria:**
- [ ] `addTransactionsBatch()` function implemented
- [ ] Accepts array of transactions and file_id
- [ ] Uses Supabase batch insert
- [ ] Returns inserted transactions
- [ ] Handles errors gracefully

**Files to Modify:**
- `looplink-landing-page-design-main/src/lib/db.ts`

**Function Signature:**
```typescript
export async function addTransactionsBatch(
  businessId: string,
  transactions: Array<{
    type: "income" | "expense";
    amount: number;
    description: string;
    category: string;
    date?: string;
  }>,
  fileId: string
): Promise<Transaction[]>;
```

---

### Task 2.3: Update Existing addTransaction Function
**Priority:** Medium
**Estimated Time:** 15 minutes

Add optional file_id parameter to existing transaction function.

**Acceptance Criteria:**
- [ ] `fileId` parameter added (optional)
- [ ] File ID saved when provided
- [ ] Backward compatible with existing calls
- [ ] No breaking changes

**Files to Modify:**
- `looplink-landing-page-design-main/src/lib/db.ts`

---

## Phase 3: File Processing Pipeline ✓ Ready to implement

### Task 3.1: Update Upload.tsx for Persistence
**Priority:** Critical
**Estimated Time:** 1.5 hours

Modify upload flow to save file metadata and link transactions.

**Acceptance Criteria:**
- [ ] Create file record before processing
- [ ] Update status during processing
- [ ] Save transactions with file_id
- [ ] Update file metadata after completion
- [ ] Handle errors and update status to 'failed'
- [ ] Show file ID in UI for debugging
- [ ] Maintain existing UI/UX

**Files to Modify:**
- `looplink-landing-page-design-main/src/pages/Upload.tsx`

**Changes:**
1. Import file management functions
2. Create file record on upload
3. Pass file_id to transaction save
4. Update file status throughout process
5. Handle errors with status updates

---

### Task 3.2: Create File Processing Service
**Priority:** High
**Estimated Time:** 1 hour

Extract file processing logic into reusable service.

**Acceptance Criteria:**
- [ ] `processUploadedFile()` function created
- [ ] Handles full pipeline: parse → classify → save
- [ ] Updates file status at each step
- [ ] Emits progress events
- [ ] Comprehensive error handling
- [ ] Can be called from multiple places

**Files to Create:**
- `looplink-landing-page-design-main/src/lib/fileProcessor.ts`

**Function Signature:**
```typescript
export async function processUploadedFile(
  fileId: string,
  file: File,
  businessId: string,
  onProgress?: (message: string, step: number) => void
): Promise<{
  transactions: ParsedTransaction[];
  summary: StatementSummary;
}>;
```

---

## Phase 4: File List UI ✓ Ready to implement

### Task 4.1: Create FileList Component
**Priority:** High
**Estimated Time:** 2 hours

Build component to display all uploaded files.

**Acceptance Criteria:**
- [ ] Lists all files for active business
- [ ] Shows file metadata (name, date, status, counts)
- [ ] Status indicators (processing, ready, failed)
- [ ] Click file to navigate to chat
- [ ] Delete file action with confirmation
- [ ] Retry failed files
- [ ] Empty state when no files
- [ ] Loading state while fetching
- [ ] Responsive design

**Files to Create:**
- `looplink-landing-page-design-main/src/components/upload/FileList.tsx`

**UI Features:**
- File card with icon based on type
- Status badge (processing/ready/failed)
- Transaction count and totals
- Action buttons (Chat, Delete, Retry)
- Confirmation dialog for delete
- Error message display for failed files

---

### Task 4.2: Create Files Page
**Priority:** Medium
**Estimated Time:** 30 minutes

Create dedicated page for file management.

**Acceptance Criteria:**
- [ ] New route `/files` created
- [ ] Uses FileList component
- [ ] Includes "Upload New" button
- [ ] Wrapped in AppShell
- [ ] Proper navigation

**Files to Create:**
- `looplink-landing-page-design-main/src/pages/Files.tsx`

**Files to Modify:**
- `looplink-landing-page-design-main/src/App.tsx` (add route)

---

### Task 4.3: Add Navigation Links
**Priority:** Low
**Estimated Time:** 15 minutes

Add "Files" link to navigation.

**Acceptance Criteria:**
- [ ] "Files" link in AppShell navigation
- [ ] Icon for files (FileText or Folder)
- [ ] Active state when on /files route
- [ ] Badge showing file count (optional)

**Files to Modify:**
- `looplink-landing-page-design-main/src/components/dashboard/AppShell.tsx`

---

## Phase 5: AI Chat Integration ✓ Ready to implement

### Task 5.1: Enhance AI Context with File Data
**Priority:** Critical
**Estimated Time:** 1 hour

Update AI context builder to include uploaded files.

**Acceptance Criteria:**
- [ ] Load uploaded files in Chat.tsx
- [ ] Include file metadata in AI context
- [ ] Format file context for AI prompt
- [ ] Only include completed files
- [ ] Optimize token usage
- [ ] Test with multiple files

**Files to Modify:**
- `looplink-landing-page-design-main/src/pages/Chat.tsx`
- `looplink-landing-page-design-main/src/lib/aiClient.ts`

**Context Format:**
```typescript
[Uploaded Files]
- bank_statement_jan.csv: 45 transactions, ₦250,000 income, ₦180,000 expenses
- expenses_feb.xlsx: 32 transactions, ₦0 income, ₦95,000 expenses
```

---

### Task 5.2: Add File-Specific Chat Mode
**Priority:** Medium
**Estimated Time:** 1 hour

Enable chat focused on specific file.

**Acceptance Criteria:**
- [ ] Accept `fileId` query parameter in Chat route
- [ ] Load only that file's transactions
- [ ] Show file name in chat header
- [ ] Filter AI context to file data
- [ ] "View all data" button to exit file mode

**Files to Modify:**
- `looplink-landing-page-design-main/src/pages/Chat.tsx`

**URL Pattern:**
- `/chat?fileId=abc-123` - Chat about specific file
- `/chat` - Chat about all data

---

### Task 5.3: Update System Prompt for File Awareness
**Priority:** Medium
**Estimated Time:** 30 minutes

Enhance AI system prompt to handle file queries.

**Acceptance Criteria:**
- [ ] Prompt mentions uploaded files capability
- [ ] Instructions for file-specific queries
- [ ] Examples of file-aware questions
- [ ] Attribution instructions (cite file source)

**Files to Modify:**
- `looplink-landing-page-design-main/src/lib/aiClient.ts`

**Prompt Addition:**
```
The user has uploaded financial files. When answering questions about specific files or time periods, reference the file name. Available files are listed in the [Uploaded Files] section.
```

---

## Phase 6: Enhanced User Feedback ✓ Ready to implement

### Task 6.1: Add Progress Tracking to Upload
**Priority:** Medium
**Estimated Time:** 30 minutes

Show detailed progress during file processing.

**Acceptance Criteria:**
- [ ] Progress bar with percentage
- [ ] Step-by-step status messages
- [ ] Estimated time remaining
- [ ] Cancel button (optional)
- [ ] Smooth animations

**Files to Modify:**
- `looplink-landing-page-design-main/src/pages/Upload.tsx`

---

### Task 6.2: Add Success Notifications
**Priority:** Low
**Estimated Time:** 20 minutes

Show toast notifications for key actions.

**Acceptance Criteria:**
- [ ] "File uploaded successfully" toast
- [ ] "Processing complete" toast
- [ ] "File deleted" toast
- [ ] Error toasts for failures
- [ ] Use existing toast system

**Files to Modify:**
- `looplink-landing-page-design-main/src/pages/Upload.tsx`
- `looplink-landing-page-design-main/src/components/upload/FileList.tsx`

---

### Task 6.3: Add Empty States
**Priority:** Low
**Estimated Time:** 15 minutes

Design empty states for no files.

**Acceptance Criteria:**
- [ ] Empty state in FileList
- [ ] Helpful message and CTA
- [ ] Illustration or icon
- [ ] "Upload your first file" button

**Files to Modify:**
- `looplink-landing-page-design-main/src/components/upload/FileList.tsx`

---

## Phase 7: Error Handling & Recovery ✓ Ready to implement

### Task 7.1: Add Retry Mechanism
**Priority:** High
**Estimated Time:** 45 minutes

Allow users to retry failed file processing.

**Acceptance Criteria:**
- [ ] Retry button on failed files
- [ ] Re-process without re-upload
- [ ] Reset status to 'pending'
- [ ] Clear error message
- [ ] Show retry in progress

**Files to Modify:**
- `looplink-landing-page-design-main/src/lib/db.ts` (add retryFileProcessing)
- `looplink-landing-page-design-main/src/components/upload/FileList.tsx`

---

### Task 7.2: Add Error Boundaries
**Priority:** Medium
**Estimated Time:** 30 minutes

Catch and display errors gracefully.

**Acceptance Criteria:**
- [ ] Error boundary around FileList
- [ ] Error boundary around Upload
- [ ] Fallback UI with retry option
- [ ] Error logging

**Files to Create:**
- `looplink-landing-page-design-main/src/components/ErrorBoundary.tsx`

---

### Task 7.3: Add Validation
**Priority:** Medium
**Estimated Time:** 30 minutes

Validate files before upload.

**Acceptance Criteria:**
- [ ] Check file size (max 10MB)
- [ ] Check file type (whitelist)
- [ ] Check file name length
- [ ] Show validation errors
- [ ] Prevent invalid uploads

**Files to Modify:**
- `looplink-landing-page-design-main/src/pages/Upload.tsx`

---

## Phase 8: Testing & Polish ✓ Ready to implement

### Task 8.1: Manual Testing
**Priority:** Critical
**Estimated Time:** 2 hours

Test complete flow end-to-end.

**Test Cases:**
- [ ] Upload CSV file → appears in list
- [ ] Upload Excel file → processes correctly
- [ ] Click file → opens chat with context
- [ ] Ask AI about file → gets relevant response
- [ ] Delete file → removed from list
- [ ] Retry failed file → processes successfully
- [ ] Upload large file → shows progress
- [ ] Upload invalid file → shows error
- [ ] Multiple files → all appear in list
- [ ] File data in AI context → AI uses it

---

### Task 8.2: Performance Testing
**Priority:** High
**Estimated Time:** 1 hour

Test with large files and many transactions.

**Test Cases:**
- [ ] 1000 transaction file → processes in <30s
- [ ] 5000 transaction file → doesn't freeze UI
- [ ] 10 files uploaded → list loads quickly
- [ ] AI chat with 10 files → responds in <5s
- [ ] Batch insert 1000 transactions → completes

---

### Task 8.3: Error Scenario Testing
**Priority:** High
**Estimated Time:** 1 hour

Test error handling and recovery.

**Test Cases:**
- [ ] Network error during upload → shows error
- [ ] Invalid CSV format → shows helpful message
- [ ] AI API timeout → falls back gracefully
- [ ] Database error → shows error, allows retry
- [ ] Duplicate file → warns user
- [ ] Corrupted file → fails gracefully

---

## Phase 9: Documentation ✓ Ready to implement

### Task 9.1: Update README
**Priority:** Low
**Estimated Time:** 30 minutes

Document new file upload feature.

**Acceptance Criteria:**
- [ ] Feature description
- [ ] Supported file formats
- [ ] Usage instructions
- [ ] Screenshots
- [ ] Troubleshooting section

**Files to Modify:**
- `looplink-landing-page-design-main/README.md`

---

### Task 9.2: Add Code Comments
**Priority:** Low
**Estimated Time:** 30 minutes

Document complex functions.

**Acceptance Criteria:**
- [ ] JSDoc comments on public functions
- [ ] Inline comments for complex logic
- [ ] Type documentation
- [ ] Example usage

**Files to Modify:**
- All new files created

---

## Summary

**Total Estimated Time:** 18-20 hours

**Critical Path:**
1. Database setup (Task 1.1)
2. Backend functions (Tasks 2.1, 2.2)
3. Update Upload.tsx (Task 3.1)
4. AI context enhancement (Task 5.1)
5. Testing (Task 8.1)

**Quick Wins:**
- Task 2.3: Update addTransaction (15 min)
- Task 4.3: Add navigation links (15 min)
- Task 6.3: Add empty states (15 min)

**Dependencies:**
- Phase 2 depends on Phase 1
- Phase 3 depends on Phase 2
- Phase 4 can be done in parallel with Phase 3
- Phase 5 depends on Phase 2
- Phase 6-9 depend on Phases 1-5

**Recommended Order:**
1. Phase 1 (Database)
2. Phase 2 (Backend)
3. Phase 3 (Processing)
4. Phase 5 (AI Integration)
5. Phase 4 (UI)
6. Phase 6 (Feedback)
7. Phase 7 (Error Handling)
8. Phase 8 (Testing)
9. Phase 9 (Documentation)
