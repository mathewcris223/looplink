# File Upload → AI Chat Integration - Design

## Architecture Overview

```
┌─────────────────┐
│  User uploads   │
│      file       │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  1. UPLOAD PHASE                        │
│  - Save file metadata to DB             │
│  - Create uploaded_files record         │
│  - Status: 'pending'                    │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  2. PROCESSING PHASE                    │
│  - Parse file (CSV/Excel/PDF)           │
│  - Extract transactions                 │
│  - AI classify (batch)                  │
│  - Update status: 'processing'          │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  3. STORAGE PHASE                       │
│  - Save transactions with file_id       │
│  - Update file metadata (counts, totals)│
│  - Update status: 'completed'           │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  4. AI INTEGRATION PHASE                │
│  - Load file metadata into AI context   │
│  - Include file transactions in queries │
│  - Enable file-specific chat            │
└─────────────────────────────────────────┘
```

## Database Schema

### New Table: `uploaded_files`

```typescript
interface UploadedFile {
  id: string;
  user_id: string;
  business_id: string;
  filename: string;
  file_size: number;
  file_type: string; // 'csv' | 'xlsx' | 'pdf' | 'txt'
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  transaction_count: number;
  total_income: number;
  total_expenses: number;
  created_at: string;
  processed_at: string | null;
}
```

### Updated Table: `transactions`

```typescript
interface Transaction {
  // ... existing fields
  file_id: string | null; // NEW: Link to uploaded_files
}
```

## Component Architecture

### 1. Upload Flow (`Upload.tsx`)

**Current Flow:**
```
Select File → Parse → Show Results → Save to App (optional)
```

**New Flow:**
```
Select File → Save Metadata → Parse → Save Transactions → Update Metadata → Show Results
```

**Changes:**
- Add `saveFileMetadata()` before parsing
- Add `file_id` when saving transactions
- Update file record after processing
- Handle errors and update status

### 2. File List Component (`FileList.tsx` - NEW)

**Purpose:** Display all uploaded files with status and actions

**Features:**
- List files with metadata (name, date, status, transaction count)
- Status indicators (processing, ready, failed)
- Click to open AI chat with file context
- Delete file action
- Retry failed processing
- Filter by status
- Sort by date

**UI Layout:**
```
┌─────────────────────────────────────────┐
│  📁 My Uploaded Files                   │
├─────────────────────────────────────────┤
│  ✅ bank_statement_jan.csv              │
│     Jan 15, 2024 • 45 transactions      │
│     [Chat] [Delete]                     │
├─────────────────────────────────────────┤
│  ⏳ expenses_feb.xlsx                   │
│     Processing... 60%                   │
├─────────────────────────────────────────┤
│  ❌ invalid_file.pdf                    │
│     Failed: Unsupported format          │
│     [Retry] [Delete]                    │
└─────────────────────────────────────────┘
```

### 3. AI Chat Enhancement (`Chat.tsx`)

**Current Context:**
- Business name, type
- Recent transactions (last 30 days, limit 50)
- Inventory items (if enabled)

**New Context:**
- Uploaded files metadata
- File-specific transactions
- File source attribution

**Context Building:**
```typescript
function buildFileContext(files: UploadedFile[]): string {
  if (!files.length) return "";
  
  const fileList = files.map(f => 
    `- ${f.filename}: ${f.transaction_count} transactions, ` +
    `₦${f.total_income.toLocaleString()} income, ` +
    `₦${f.total_expenses.toLocaleString()} expenses`
  ).join("\n");
  
  return `[Uploaded Files]\n${fileList}`;
}
```

**New Features:**
- File-aware queries: "analyze my January statement"
- File comparison: "compare my last two uploads"
- File-specific insights: "what's unusual in bank_statement.csv?"

### 4. Data Chat Enhancement (`DataChat.tsx`)

**Current:** Temporary in-memory chat for uploaded file
**New:** Persistent chat linked to file record

**Changes:**
- Save chat messages to database
- Link messages to file_id
- Load previous chat history
- Enable cross-session conversations

## API Functions

### File Management (`lib/db.ts`)

```typescript
// Create file record
export async function createUploadedFile(params: {
  businessId: string;
  filename: string;
  fileSize: number;
  fileType: string;
}): Promise<UploadedFile>;

// Update file status
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

// Get all files for business
export async function getUploadedFiles(
  businessId: string
): Promise<UploadedFile[]>;

// Get file by ID
export async function getUploadedFile(
  fileId: string
): Promise<UploadedFile | null>;

// Get transactions for file
export async function getFileTransactions(
  fileId: string
): Promise<Transaction[]>;

// Delete file and optionally its transactions
export async function deleteUploadedFile(
  fileId: string,
  deleteTransactions: boolean = false
): Promise<void>;

// Retry processing
export async function retryFileProcessing(
  fileId: string
): Promise<void>;
```

### Transaction Updates

```typescript
// Modified: Add file_id parameter
export async function addTransaction(
  businessId: string,
  type: "income" | "expense",
  amount: number,
  description: string,
  category: string,
  fileId?: string // NEW
): Promise<Transaction>;

// NEW: Batch insert with file_id
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

## Processing Pipeline

### Step 1: File Upload Handler

```typescript
async function handleFileUpload(file: File, businessId: string) {
  // 1. Create file record
  const uploadedFile = await createUploadedFile({
    businessId,
    filename: file.name,
    fileSize: file.size,
    fileType: file.name.split('.').pop()!,
  });

  // 2. Start processing
  await processUploadedFile(uploadedFile.id, file);
  
  return uploadedFile;
}
```

### Step 2: File Processor

```typescript
async function processUploadedFile(fileId: string, file: File) {
  try {
    // Update status to processing
    await updateFileStatus(fileId, 'processing');

    // Parse file
    const { transactions, summary } = await parseStatement(
      file,
      (progress) => {
        // Emit progress events
        emitProgress(fileId, progress);
      }
    );

    // Save transactions with file_id
    const savedTxs = await addTransactionsBatch(
      businessId,
      transactions.map(tx => ({
        type: tx.type as 'income' | 'expense',
        amount: tx.amount,
        description: tx.description,
        category: tx.category,
        date: tx.date,
      })),
      fileId
    );

    // Update file metadata
    await updateFileStatus(fileId, 'completed', {
      transactionCount: savedTxs.length,
      totalIncome: summary.totalIncome,
      totalExpenses: summary.totalExpenses,
    });

  } catch (error) {
    // Update status to failed
    await updateFileStatus(fileId, 'failed', {
      errorMessage: error.message,
    });
    throw error;
  }
}
```

### Step 3: AI Context Builder

```typescript
async function buildAIContext(businessId: string) {
  // Load uploaded files
  const files = await getUploadedFiles(businessId);
  const completedFiles = files.filter(f => f.status === 'completed');

  // Build file context
  const fileContext = completedFiles.length > 0
    ? `[Uploaded Files]\n${completedFiles.map(f => 
        `- ${f.filename}: ${f.transaction_count} transactions, ` +
        `₦${f.total_income.toLocaleString()} income, ` +
        `₦${f.total_expenses.toLocaleString()} expenses`
      ).join('\n')}`
    : '';

  // Load transactions (including file-sourced ones)
  const transactions = await getTransactions(businessId);

  return {
    fileContext,
    transactions,
    files: completedFiles,
  };
}
```

## UI/UX Flow

### Upload Page Flow

```
1. User selects file
   ↓
2. Show "Saving file..." (instant)
   ↓
3. File metadata saved to DB
   ↓
4. Show "Processing..." with progress
   ↓
5. Parse → Classify → Save transactions
   ↓
6. Show "File ready!" with summary
   ↓
7. Options:
   - [Chat with this file]
   - [View all files]
   - [Upload another]
```

### File List Page Flow

```
1. Display all uploaded files
   ↓
2. User clicks file
   ↓
3. Navigate to Chat with file context
   ↓
4. AI chat loads file transactions
   ↓
5. User asks questions about file
```

### Chat Page Flow

```
1. Load business context
   ↓
2. Load uploaded files
   ↓
3. Include file metadata in AI context
   ↓
4. User asks: "analyze my uploaded statement"
   ↓
5. AI responds with file-specific insights
```

## Error Handling

### Upload Errors
- **File too large**: Show size limit, suggest compression
- **Unsupported format**: List supported formats
- **Network error**: Retry mechanism with exponential backoff
- **Permission denied**: Check auth, redirect to login

### Processing Errors
- **Parse failure**: Show sample format, suggest CSV export
- **AI classification timeout**: Fall back to rule-based classification
- **Database error**: Retry with exponential backoff
- **Partial success**: Save what worked, flag failures

### Recovery Strategies
- **Failed upload**: Retry button with same file
- **Failed processing**: Re-process without re-upload
- **Corrupted data**: Manual review and edit
- **Duplicate detection**: Warn before saving duplicates

## Performance Optimization

### File Processing
- **Async processing**: Use Web Workers for parsing
- **Batch operations**: Insert transactions in batches of 100
- **Progress streaming**: Real-time updates via Supabase Realtime
- **Lazy loading**: Load file list on demand

### AI Context
- **Smart filtering**: Only include relevant files in context
- **Token optimization**: Summarize large files
- **Caching**: Cache file metadata for 5 minutes
- **Pagination**: Load transactions in chunks

### Database
- **Indexes**: On user_id, business_id, file_id, status
- **Partitioning**: Consider partitioning transactions by date
- **Archiving**: Move old files to archive table
- **Cleanup**: Soft delete with retention policy

## Security Considerations

### File Upload
- **Validation**: Check file type, size, content
- **Sanitization**: Strip malicious content
- **Virus scanning**: Consider ClamAV integration
- **Rate limiting**: Max 10 uploads per hour

### Data Access
- **RLS policies**: User can only access their files
- **Business isolation**: Files scoped to business
- **Audit logging**: Track file access and modifications
- **Encryption**: Encrypt sensitive file metadata

### API Security
- **Authentication**: Require valid session
- **Authorization**: Check business ownership
- **Input validation**: Validate all parameters
- **SQL injection**: Use parameterized queries

## Testing Strategy

### Unit Tests
- File metadata CRUD operations
- Transaction batch insert
- AI context building
- Error handling

### Integration Tests
- End-to-end upload flow
- File processing pipeline
- AI chat with file context
- File deletion cascade

### E2E Tests
- User uploads file → sees in list
- User clicks file → opens chat
- User asks question → AI responds with file data
- User deletes file → removed from list

## Migration Plan

### Phase 1: Database Setup
1. Create `uploaded_files` table
2. Add `file_id` column to `transactions`
3. Create indexes
4. Set up RLS policies

### Phase 2: Backend Functions
1. Implement file CRUD functions
2. Update transaction functions
3. Add batch insert
4. Implement processing pipeline

### Phase 3: UI Updates
1. Update Upload.tsx for persistence
2. Create FileList.tsx component
3. Update Chat.tsx for file context
4. Add navigation links

### Phase 4: Testing & Rollout
1. Test with sample files
2. Beta test with users
3. Monitor performance
4. Gradual rollout

## Success Metrics

- **Upload success rate**: >95%
- **Processing time**: <30s for 1000 transactions
- **AI context accuracy**: File data correctly included
- **User engagement**: Files clicked and used in chat
- **Error rate**: <5% failed uploads
- **Performance**: No UI freezing during upload
