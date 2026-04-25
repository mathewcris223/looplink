# File Upload → AI Chat Integration - Requirements

## Problem Statement

Users upload financial files (PDF, Excel, CSV) but the files are NOT connected to the AI chat system:
- Files don't appear in AI chat context
- AI says "no transactions" or "no data" even after upload
- Clicking uploaded files does nothing
- No persistent storage of uploaded file metadata
- Uploaded transactions exist only in temporary state

## Current State Analysis

### What Works
- CSV/Excel parsing via `statementParser.ts`
- AI classification of transactions (Groq API)
- Transaction storage in Supabase `transactions` table
- AI chat with business context
- Upload UI with progress tracking

### What's Broken
- **No file metadata storage** - Files aren't saved to database
- **No file-to-chat connection** - AI chat doesn't know about uploaded files
- **Temporary state only** - Parsed data lost on page refresh
- **No file list UI** - Users can't see previously uploaded files
- **No file click behavior** - Uploaded files are not interactive

## Goals

### 1. File Upload & Storage
- Save uploaded file metadata to database
- Store file reference (name, size, upload date, status)
- Link files to user and business
- Support PDF, Excel, CSV formats

### 2. Data Extraction & Processing
- Extract transactions from uploaded files
- Parse dates, amounts, descriptions, types
- AI-powered classification and categorization
- Store extracted transactions with file reference

### 3. Persistent Storage
- Create `uploaded_files` table in Supabase
- Link transactions to source file via `file_id`
- Store processing status (pending, processing, completed, failed)
- Track file metadata (name, size, type, row count)

### 4. AI Chat Integration
- Automatically load uploaded file data into AI context
- Include file metadata in chat context
- Enable queries like "analyze my uploaded statement"
- Show file source in AI responses

### 5. File Management UI
- Display list of uploaded files
- Show file status (processing, ready, failed)
- Click file to open AI chat with that file's context
- Delete/re-process files

### 6. User Feedback
- Show "Processing your file..." with progress
- Display "File ready. Ask anything." on completion
- Clear error messages on failure
- Loading states throughout

### 7. Performance
- Async file processing (no UI freeze)
- Background processing for large files
- Progress updates during extraction
- Optimistic UI updates

### 8. Error Handling
- Clear error messages for unsupported formats
- Retry mechanism for failed processing
- Validation before upload
- Graceful degradation

## Success Criteria

1. User uploads file → File saved to database with metadata
2. File processing → Transactions extracted and stored with `file_id`
3. AI chat → Automatically includes uploaded file data in context
4. File list → Shows all uploaded files with status
5. Click file → Opens AI chat with that file's data loaded
6. No data loss → Files and transactions persist across sessions
7. Error handling → Clear messages, no silent failures
8. Performance → No UI freezing, async processing

## Non-Goals

- Real-time collaboration on files
- File versioning or history
- Advanced PDF parsing (OCR)
- Automatic bank API integration
- Multi-file batch upload (v1)

## Technical Requirements

### Database Schema
```sql
-- New table for uploaded files
CREATE TABLE uploaded_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  transaction_count INTEGER DEFAULT 0,
  total_income NUMERIC(12,2) DEFAULT 0,
  total_expenses NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Add file_id to transactions table
ALTER TABLE transactions ADD COLUMN file_id UUID REFERENCES uploaded_files(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_uploaded_files_user_business ON uploaded_files(user_id, business_id);
CREATE INDEX idx_uploaded_files_status ON uploaded_files(status);
CREATE INDEX idx_transactions_file_id ON transactions(file_id);
```

### API Functions Needed
- `uploadFile(file, businessId)` - Save file metadata
- `processFile(fileId)` - Extract and classify transactions
- `getUploadedFiles(businessId)` - List all files
- `getFileTransactions(fileId)` - Get transactions from specific file
- `deleteFile(fileId)` - Remove file and optionally its transactions
- `retryFileProcessing(fileId)` - Re-process failed file

### AI Context Enhancement
- Include uploaded file metadata in system prompt
- Add file-specific transaction context
- Enable file-aware queries
- Show file source in responses

## User Stories

1. **As a user**, I want to upload my bank statement and have it automatically saved, so I don't lose my data
2. **As a user**, I want to see a list of all my uploaded files, so I can track what I've imported
3. **As a user**, I want to click on an uploaded file and chat with AI about it, so I can get insights
4. **As a user**, I want the AI to remember my uploaded files, so I don't have to re-upload
5. **As a user**, I want clear feedback during file processing, so I know what's happening
6. **As a user**, I want to see which transactions came from which file, so I can trace data sources
7. **As a user**, I want to delete uploaded files, so I can manage my data
8. **As a user**, I want to retry failed uploads, so I can fix issues without re-uploading

## Constraints

- Must work with existing Supabase setup
- Must not break current Upload.tsx functionality
- Must maintain current AI chat experience
- Must handle files up to 10MB
- Must process files within 30 seconds
- Must work offline for file selection (online for processing)

## Dependencies

- Supabase database migrations
- Updated `db.ts` with new functions
- Modified `Upload.tsx` for persistence
- Enhanced `Chat.tsx` for file context
- New `FileList.tsx` component
- Updated `aiClient.ts` for file-aware context
