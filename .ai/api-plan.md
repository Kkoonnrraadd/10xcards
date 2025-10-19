# REST API Plan for 10xCards

## 1. Resources

The API is organized around the following main resources, each corresponding to database tables:

- **Flashcards** (`flashcards` table) - User-created flashcards for learning
- **Generation Logs** (`generation_logs` table) - Analytics logs for AI-generated flashcard interactions
- **Generation Error Logs** (`generation_error_logs` table) - Error logs for failed AI generation attempts
- **Study Sessions** (virtual resource) - Learning sessions using spaced repetition algorithm

Note: User authentication and profile management is handled by Supabase Auth and does not require custom API endpoints.

## 2. Endpoints

### 2.1. Flashcard Generation

#### Generate Flashcard Candidates from Text

**Endpoint:** `POST /api/flashcards/generate`

**Description:** Accepts source text and uses AI to generate flashcard candidates. Candidates are returned but not saved to the database.

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "source_text": "string (1000-10000 characters)"
}
```

**Success Response (200 OK):**
```json
{
  "candidates": [
    {
      "front": "string (max 200 characters)",
      "back": "string (max 500 characters)"
    }
  ]
}
```

**Error Responses:**

- **400 Bad Request** - Invalid input
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Source text must be between 1000 and 10000 characters",
    "details": {
      "field": "source_text",
      "min_length": 1000,
      "max_length": 10000,
      "actual_length": 500
    }
  }
}
```

- **401 Unauthorized** - Missing or invalid authentication
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

- **429 Too Many Requests** - Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many generation requests. Please try again later.",
    "details": {
      "retry_after": 60
    }
  }
}
```

- **500 Internal Server Error** - AI service error (also logs to `generation_error_logs`)
```json
{
  "error": {
    "code": "AI_GENERATION_FAILED",
    "message": "Failed to generate flashcards. Please try again.",
    "details": {
      "error_id": "uuid"
    }
  }
}
```

- **504 Gateway Timeout** - AI service timeout
```json
{
  "error": {
    "code": "AI_TIMEOUT",
    "message": "AI service took too long to respond. Please try again."
  }
}
```

**Business Logic:**
1. Validate source text length (1000-10000 characters)
2. Call OpenRouter AI API with structured prompt
3. Parse AI response into candidate array
4. Validate each candidate (front ≤ 200 chars, back ≤ 500 chars)
5. On error: Log to `generation_error_logs` table with model, source_text_hash, source_text_length, error_code, error_message
6. Return candidates (not persisted to database)

**Rate Limiting:** 10 requests per minute per user

---

### 2.2. Flashcard CRUD Operations

#### Create Flashcard

**Endpoint:** `POST /api/flashcards`

**Description:** Creates a new flashcard. Can be used for manual creation or accepting/editing AI-generated candidates. If `generation_metadata` is provided, a corresponding entry is created in `generation_logs`.

**Authentication:** Required (JWT token)

**Request Body:**

For manual creation:
```json
{
  "front": "string (max 200 characters, required)",
  "back": "string (max 500 characters, required)"
}
```

For accepting AI-generated candidate:
```json
{
  "front": "string (max 200 characters, required)",
  "back": "string (max 500 characters, required)",
  "generation_metadata": {
    "original_front": "string (required)",
    "original_back": "string (required)"
  }
}
```

**Success Response (201 Created):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "front": "string",
  "back": "string",
  "due_date": "2025-10-18T12:00:00Z",
  "stability": null,
  "difficulty": null,
  "review_history": null,
  "created_at": "2025-10-18T12:00:00Z",
  "updated_at": "2025-10-18T12:00:00Z"
}
```

**Error Responses:**

- **400 Bad Request** - Validation error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Front text must not exceed 200 characters",
    "details": {
      "field": "front",
      "max_length": 200
    }
  }
}
```

- **401 Unauthorized** - Missing or invalid authentication

**Business Logic:**
1. Validate `front` (required, max 200 chars) and `back` (required, max 500 chars)
2. Extract authenticated user ID from JWT
3. If `generation_metadata` is present:
   - Start database transaction
   - Insert flashcard with `user_id`, `front`, `back`, `due_date=now()`
   - Compare `front`/`back` with `original_front`/`original_back`:
     - If identical: status = 'accepted'
     - If different: status = 'accepted_with_edit'
   - Insert generation_log with `user_id`, `flashcard_id`, `status`, `original_front`, `original_back`
   - Commit transaction
4. If no `generation_metadata`:
   - Insert flashcard only (manual creation, no log entry)
5. Return created flashcard

**Rate Limiting:** 100 requests per minute per user

---

#### List Flashcards

**Endpoint:** `GET /api/flashcards`

**Description:** Retrieves a paginated list of the authenticated user's flashcards with optional search filtering.

**Authentication:** Required (JWT token)

**Query Parameters:**
- `page` (integer, optional, default: 1) - Page number (≥ 1)
- `limit` (integer, optional, default: 20) - Items per page (1-100)
- `search` (string, optional) - Search query to filter by front or back content

**Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "front": "string",
      "back": "string",
      "due_date": "2025-10-18T12:00:00Z",
      "stability": 1.5,
      "difficulty": 5.2,
      "review_history": [...],
      "created_at": "2025-10-18T12:00:00Z",
      "updated_at": "2025-10-18T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

**Error Responses:**

- **400 Bad Request** - Invalid pagination parameters
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid pagination parameters",
    "details": {
      "page": "Must be >= 1",
      "limit": "Must be between 1 and 100"
    }
  }
}
```

- **401 Unauthorized** - Missing or invalid authentication

**Business Logic:**
1. Parse and validate pagination parameters (page ≥ 1, limit 1-100)
2. Filter flashcards by authenticated user ID (via RLS)
3. If `search` parameter provided:
   - Apply filter: `WHERE (front ILIKE '%search%' OR back ILIKE '%search%')`
4. Order by `created_at DESC` (default sorting)
5. Calculate offset: `(page - 1) * limit`
6. Apply LIMIT and OFFSET to query
7. Count total matching records
8. Calculate total pages: `ceil(total / limit)`
9. Return data with pagination metadata

**Rate Limiting:** 100 requests per minute per user

---

#### Get Single Flashcard

**Endpoint:** `GET /api/flashcards/:id`

**Description:** Retrieves a single flashcard by ID.

**Authentication:** Required (JWT token)

**Path Parameters:**
- `id` (uuid, required) - Flashcard ID

**Success Response (200 OK):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "front": "string",
  "back": "string",
  "due_date": "2025-10-18T12:00:00Z",
  "stability": 1.5,
  "difficulty": 5.2,
  "review_history": [...],
  "created_at": "2025-10-18T12:00:00Z",
  "updated_at": "2025-10-18T12:00:00Z"
}
```

**Error Responses:**

- **400 Bad Request** - Invalid ID format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid flashcard ID format"
  }
}
```

- **401 Unauthorized** - Missing or invalid authentication

- **404 Not Found** - Flashcard not found or doesn't belong to user
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Flashcard not found"
  }
}
```

**Business Logic:**
1. Validate ID is valid UUID format
2. Query flashcard by ID and user_id (RLS ensures user ownership)
3. Return 404 if not found
4. Return flashcard

**Rate Limiting:** 100 requests per minute per user

---

#### Update Flashcard

**Endpoint:** `PATCH /api/flashcards/:id`

**Description:** Updates an existing flashcard's front and/or back content.

**Authentication:** Required (JWT token)

**Path Parameters:**
- `id` (uuid, required) - Flashcard ID

**Request Body:**
```json
{
  "front": "string (max 200 characters, optional)",
  "back": "string (max 500 characters, optional)"
}
```

**Success Response (200 OK):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "front": "string",
  "back": "string",
  "due_date": "2025-10-18T12:00:00Z",
  "stability": 1.5,
  "difficulty": 5.2,
  "review_history": [...],
  "created_at": "2025-10-18T12:00:00Z",
  "updated_at": "2025-10-18T12:30:00Z"
}
```

**Error Responses:**

- **400 Bad Request** - Validation error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Front text must not exceed 200 characters",
    "details": {
      "field": "front",
      "max_length": 200
    }
  }
}
```

- **401 Unauthorized** - Missing or invalid authentication

- **404 Not Found** - Flashcard not found or doesn't belong to user

**Business Logic:**
1. Validate ID is valid UUID format
2. Validate provided fields (front ≤ 200 chars, back ≤ 500 chars)
3. Update flashcard where id=:id AND user_id=current_user (RLS enforces ownership)
4. Database trigger automatically updates `updated_at` timestamp
5. Return 404 if flashcard not found
6. Return updated flashcard

**Rate Limiting:** 100 requests per minute per user

---

#### Delete Flashcard

**Endpoint:** `DELETE /api/flashcards/:id`

**Description:** Permanently deletes a flashcard.

**Authentication:** Required (JWT token)

**Path Parameters:**
- `id` (uuid, required) - Flashcard ID

**Success Response (204 No Content)**

No response body.

**Error Responses:**

- **400 Bad Request** - Invalid ID format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid flashcard ID format"
  }
}
```

- **401 Unauthorized** - Missing or invalid authentication

- **404 Not Found** - Flashcard not found or doesn't belong to user
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Flashcard not found"
  }
}
```

**Business Logic:**
1. Validate ID is valid UUID format
2. Delete flashcard where id=:id AND user_id=current_user (RLS enforces ownership)
3. Return 404 if flashcard not found
4. Return 204 No Content on success

**Rate Limiting:** 100 requests per minute per user

---

### 2.3. Generation Logs

#### Create Generation Log (Reject Candidate)

**Endpoint:** `POST /api/generation-logs`

**Description:** Creates a log entry for a rejected AI-generated flashcard candidate. Used when user rejects a candidate without creating a flashcard.

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "status": "rejected",
  "original_front": "string (required)",
  "original_back": "string (required)"
}
```

**Success Response (201 Created):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "flashcard_id": null,
  "status": "rejected",
  "original_front": "string",
  "original_back": "string",
  "created_at": "2025-10-18T12:00:00Z"
}
```

**Error Responses:**

- **400 Bad Request** - Validation error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Status must be 'rejected' for this endpoint",
    "details": {
      "field": "status",
      "allowed_values": ["rejected"]
    }
  }
}
```

- **401 Unauthorized** - Missing or invalid authentication

**Business Logic:**
1. Validate `status` is 'rejected'
2. Validate `original_front` and `original_back` are provided
3. Extract authenticated user ID from JWT
4. Insert generation_log with `user_id`, `flashcard_id=null`, `status='rejected'`, `original_front`, `original_back`
5. Return created log entry

**Note:** Logs for 'accepted' and 'accepted_with_edit' statuses are created automatically by the `POST /api/flashcards` endpoint when `generation_metadata` is provided.

**Rate Limiting:** 100 requests per minute per user

---

### 2.4. Study Session

#### Get Due Flashcards

**Endpoint:** `GET /api/study/due`

**Description:** Retrieves flashcards that are due for review based on the spaced repetition schedule.

**Authentication:** Required (JWT token)

**Query Parameters:**
- `limit` (integer, optional, default: 20) - Maximum number of flashcards to return (1-100)

**Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "front": "string",
      "back": "string",
      "due_date": "2025-10-18T12:00:00Z",
      "stability": 1.5,
      "difficulty": 5.2,
      "review_history": [...],
      "created_at": "2025-10-18T12:00:00Z",
      "updated_at": "2025-10-18T12:00:00Z"
    }
  ],
  "total_due": 45
}
```

**Error Responses:**

- **400 Bad Request** - Invalid limit parameter
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Limit must be between 1 and 100",
    "details": {
      "field": "limit",
      "min": 1,
      "max": 100
    }
  }
}
```

- **401 Unauthorized** - Missing or invalid authentication

**Business Logic:**
1. Validate limit parameter (1-100, default: 20)
2. Query flashcards where:
   - `user_id = current_user` (via RLS)
   - `due_date <= now()`
3. Order by `due_date ASC` (oldest due first)
4. Apply limit
5. Count total due flashcards (without limit)
6. Return flashcards with total count

**Rate Limiting:** 100 requests per minute per user

---

#### Submit Review

**Endpoint:** `POST /api/study/review`

**Description:** Submits a review result for a flashcard and updates its scheduling parameters using the FSRS algorithm.

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "flashcard_id": "uuid (required)",
  "rating": 1-4 (required)
}
```

Rating scale:
- 1: Again (complete failure)
- 2: Hard (difficult but recalled)
- 3: Good (recalled with some effort)
- 4: Easy (perfect recall)

**Success Response (200 OK):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "front": "string",
  "back": "string",
  "due_date": "2025-10-20T15:30:00Z",
  "stability": 2.3,
  "difficulty": 4.8,
  "review_history": [
    {
      "date": "2025-10-18T12:00:00Z",
      "rating": 3
    }
  ],
  "created_at": "2025-10-18T12:00:00Z",
  "updated_at": "2025-10-18T12:00:00Z"
}
```

**Error Responses:**

- **400 Bad Request** - Validation error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Rating must be between 1 and 4",
    "details": {
      "field": "rating",
      "min": 1,
      "max": 4
    }
  }
}
```

- **401 Unauthorized** - Missing or invalid authentication

- **404 Not Found** - Flashcard not found or doesn't belong to user
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Flashcard not found"
  }
}
```

**Business Logic:**
1. Validate `flashcard_id` is valid UUID
2. Validate `rating` is integer 1-4
3. Fetch flashcard (verify ownership via RLS)
4. Return 404 if not found
5. Use FSRS library to calculate new scheduling parameters:
   - Input: current `stability`, `difficulty`, `rating`
   - Output: new `stability`, `difficulty`, `due_date`
6. Append review to `review_history` JSONB array:
   ```json
   {
     "date": "current_timestamp",
     "rating": rating
   }
   ```
7. Update flashcard with new values
8. Return updated flashcard

**Rate Limiting:** 100 requests per minute per user

---

## 3. Authentication and Authorization

### Authentication Mechanism

The API uses **Supabase Authentication** with JWT (JSON Web Tokens) for user authentication.

#### Implementation Details

1. **User Registration and Login:**
   - Handled by Supabase Auth API (not custom endpoints)
   - Frontend uses Supabase JS client to call `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`
   - Supabase returns JWT access token and refresh token

2. **Token Usage:**
   - All API endpoints (except auth-related) require authentication
   - Client includes JWT in Authorization header: `Authorization: Bearer <jwt_token>`
   - JWT contains user ID (`sub` claim) used to identify authenticated user

3. **Token Validation:**
   - Backend validates JWT using Supabase public key
   - Invalid or expired tokens return 401 Unauthorized
   - Supabase JS client automatically handles token refresh

4. **Supabase Client Initialization:**
   - For authenticated requests: Create Supabase client with user's JWT
   - This allows Row-Level Security (RLS) policies to work correctly
   - Example:
     ```typescript
     const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
       global: {
         headers: {
           Authorization: `Bearer ${userJwt}`
         }
       }
     })
     ```

### Authorization (Row-Level Security)

All database tables have **Row-Level Security (RLS)** policies enabled to ensure users can only access their own data.

#### RLS Policies

1. **`users` table:**
   - Policy: Users can manage their own profile
   - Rule: `auth.uid() = id`

2. **`flashcards` table:**
   - Policy: Users can manage their own flashcards
   - Rule: `auth.uid() = user_id`
   - Operations: SELECT, INSERT, UPDATE, DELETE

3. **`generation_logs` table:**
   - Policy: Users can view and create their own logs
   - Rule: `auth.uid() = user_id`
   - Operations: SELECT, INSERT
   - Note: UPDATE and DELETE not allowed for end users

4. **`generation_error_logs` table:**
   - Policy: Users can manage their own error logs
   - Rule: `auth.uid() = user_id`
   - Operations: SELECT, INSERT

#### Authorization Flow

1. Client sends request with JWT in Authorization header
2. Backend extracts JWT and creates Supabase client with user's token
3. All database queries automatically filtered by RLS policies
4. Supabase uses `auth.uid()` from JWT to enforce user_id constraints
5. Attempts to access other users' data return empty results or 404

### Password Management

Handled by Supabase Auth:
- **Change Password:** `supabase.auth.updateUser({ password: newPassword })`
- **Reset Password:** `supabase.auth.resetPasswordForEmail(email)`

### Account Deletion

Handled by Supabase Auth:
- Call `supabase.auth.admin.deleteUser(userId)` (requires service role)
- Database cascade deletion (ON DELETE CASCADE) automatically removes all user data
- Deletes from: `users`, `flashcards`, `generation_logs`, `generation_error_logs`

---

## 4. Validation and Business Logic

### 4.1. Validation Rules

#### Input Length Validation

| Field | Min Length | Max Length | Required | Validated At |
|-------|-----------|-----------|----------|--------------|
| `source_text` (generation) | 1000 chars | 10000 chars | Yes | Frontend, Backend |
| `flashcard.front` | 1 char | 200 chars | Yes | Frontend, Backend, Database (varchar 200) |
| `flashcard.back` | 1 char | 500 chars | Yes | Frontend, Backend, Database (varchar 500) |

#### Pagination Validation

| Parameter | Min Value | Max Value | Default | Type |
|-----------|-----------|-----------|---------|------|
| `page` | 1 | - | 1 | Integer |
| `limit` | 1 | 100 | 20 | Integer |

#### Study Rating Validation

| Parameter | Min Value | Max Value | Type | Description |
|-----------|-----------|-----------|------|-------------|
| `rating` | 1 | 4 | Integer | 1=Again, 2=Hard, 3=Good, 4=Easy |

#### UUID Validation

All ID parameters (`:id`, `flashcard_id`) must be valid UUID v4 format:
- Pattern: `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`
- Error: 400 Bad Request with message "Invalid ID format"

#### Enum Validation

| Field | Allowed Values | Context |
|-------|---------------|---------|
| `generation_logs.status` | 'accepted', 'accepted_with_edit', 'rejected' | Database ENUM |

### 4.2. Business Logic Implementation

#### BL-1: AI Flashcard Generation

**Endpoint:** `POST /api/flashcards/generate`

**Process:**
1. **Validate Input:**
   - Check `source_text` length (1000-10000 chars)
   - Return 400 if invalid

2. **Prepare AI Request:**
   - Construct prompt with instructions and character limits
   - Example prompt structure:
     ```
     Generate flashcards from the following text. Each flashcard should have:
     - front: A question or prompt (max 200 characters)
     - back: An answer or explanation (max 500 characters)
     
     Create 5-10 flashcards that cover the key concepts.
     
     Text:
     {source_text}
     
     Return as JSON array: [{"front": "...", "back": "..."}, ...]
     ```

3. **Call AI Service:**
   - Send request to OpenRouter API
   - Set timeout: 60 seconds
   - Handle timeout: Return 504 Gateway Timeout

4. **Parse Response:**
   - Parse JSON response
   - Validate structure (array of objects with front/back)
   - Validate each candidate (front ≤ 200, back ≤ 500)
   - Filter out invalid candidates

5. **Error Handling:**
   - On AI service error:
     - Log to `generation_error_logs` table:
       - `user_id`: Current user
       - `model`: AI model name (e.g., "gpt-4")
       - `source_text_hash`: SHA-256 hash of source_text
       - `source_text_length`: Length of source_text
       - `error_code`: Error code from AI service
       - `error_message`: Full error message
     - Return 500 with generic error message and error_id

6. **Return Candidates:**
   - Return array of valid candidates
   - Candidates are NOT saved to database

#### BL-2: Accept/Edit AI-Generated Flashcard

**Endpoint:** `POST /api/flashcards` (with `generation_metadata`)

**Process:**
1. **Validate Input:**
   - Check `front` (required, ≤ 200 chars)
   - Check `back` (required, ≤ 500 chars)
   - Check `generation_metadata.original_front` and `original_back` are present
   - Return 400 if invalid

2. **Determine Status:**
   - Compare `front` with `original_front` and `back` with `original_back`
   - If both identical: status = 'accepted'
   - If either different: status = 'accepted_with_edit'

3. **Atomic Transaction:**
   - Start database transaction
   - Insert flashcard:
     - `user_id`: From JWT
     - `front`, `back`: From request
     - `due_date`: Current timestamp (now())
     - `stability`, `difficulty`, `review_history`: NULL (not yet reviewed)
   - Get inserted flashcard ID
   - Insert generation_log:
     - `user_id`: From JWT
     - `flashcard_id`: From inserted flashcard
     - `status`: Determined in step 2
     - `original_front`, `original_back`: From generation_metadata
   - Commit transaction
   - Rollback on any error

4. **Return Result:**
   - Return created flashcard (201 Created)

#### BL-3: Reject AI-Generated Flashcard

**Endpoint:** `POST /api/generation-logs`

**Process:**
1. **Validate Input:**
   - Check `status` is 'rejected'
   - Check `original_front` and `original_back` are provided
   - Return 400 if invalid

2. **Create Log Entry:**
   - Insert generation_log:
     - `user_id`: From JWT
     - `flashcard_id`: NULL (no flashcard created)
     - `status`: 'rejected'
     - `original_front`, `original_back`: From request

3. **Return Result:**
   - Return created log entry (201 Created)

#### BL-4: Manual Flashcard Creation

**Endpoint:** `POST /api/flashcards` (without `generation_metadata`)

**Process:**
1. **Validate Input:**
   - Check `front` (required, ≤ 200 chars)
   - Check `back` (required, ≤ 500 chars)
   - Return 400 if invalid

2. **Create Flashcard:**
   - Insert flashcard:
     - `user_id`: From JWT
     - `front`, `back`: From request
     - `due_date`: Current timestamp (now())
     - `stability`, `difficulty`, `review_history`: NULL
   - No generation_log entry (manual creation)

3. **Return Result:**
   - Return created flashcard (201 Created)

#### BL-5: List Flashcards with Search

**Endpoint:** `GET /api/flashcards`

**Process:**
1. **Validate Parameters:**
   - Parse `page` (default: 1, min: 1)
   - Parse `limit` (default: 20, min: 1, max: 100)
   - Parse `search` (optional)
   - Return 400 if invalid

2. **Build Query:**
   - Base query: `SELECT * FROM flashcards WHERE user_id = current_user`
   - If `search` provided:
     - Add: `AND (front ILIKE '%{search}%' OR back ILIKE '%{search}%')`
   - Order by: `created_at DESC`
   - Calculate offset: `(page - 1) * limit`
   - Add: `LIMIT {limit} OFFSET {offset}`

3. **Execute Query:**
   - Fetch flashcards
   - Count total matching records (without limit/offset)

4. **Calculate Pagination:**
   - `total`: Total matching records
   - `pages`: `ceil(total / limit)`

5. **Return Result:**
   - Return `{ data: [...], pagination: { page, limit, total, pages } }`

#### BL-6: Update Flashcard

**Endpoint:** `PATCH /api/flashcards/:id`

**Process:**
1. **Validate Input:**
   - Check ID is valid UUID
   - If `front` provided: Check ≤ 200 chars
   - If `back` provided: Check ≤ 500 chars
   - Return 400 if invalid

2. **Update Flashcard:**
   - Build UPDATE query with provided fields
   - Add WHERE clause: `id = :id AND user_id = current_user`
   - Execute update
   - Database trigger automatically updates `updated_at`

3. **Check Result:**
   - If no rows affected: Return 404 Not Found
   - Otherwise: Fetch and return updated flashcard

#### BL-7: Delete Flashcard

**Endpoint:** `DELETE /api/flashcards/:id`

**Process:**
1. **Validate Input:**
   - Check ID is valid UUID
   - Return 400 if invalid

2. **Delete Flashcard:**
   - Execute: `DELETE FROM flashcards WHERE id = :id AND user_id = current_user`
   - RLS policy ensures user ownership

3. **Check Result:**
   - If no rows affected: Return 404 Not Found
   - Otherwise: Return 204 No Content

#### BL-8: Get Due Flashcards

**Endpoint:** `GET /api/study/due`

**Process:**
1. **Validate Parameters:**
   - Parse `limit` (default: 20, min: 1, max: 100)
   - Return 400 if invalid

2. **Query Due Flashcards:**
   - Query: `SELECT * FROM flashcards WHERE user_id = current_user AND due_date <= now() ORDER BY due_date ASC LIMIT {limit}`
   - Count total due: `SELECT COUNT(*) FROM flashcards WHERE user_id = current_user AND due_date <= now()`

3. **Return Result:**
   - Return `{ data: [...], total_due: count }`

#### BL-9: Submit Review (FSRS Update)

**Endpoint:** `POST /api/study/review`

**Process:**
1. **Validate Input:**
   - Check `flashcard_id` is valid UUID
   - Check `rating` is integer 1-4
   - Return 400 if invalid

2. **Fetch Flashcard:**
   - Query flashcard by ID (RLS ensures ownership)
   - Return 404 if not found

3. **Calculate FSRS Parameters:**
   - Initialize FSRS library with current card state:
     - `stability`: From flashcard (or default if NULL)
     - `difficulty`: From flashcard (or default if NULL)
   - Call FSRS algorithm with rating
   - Get new values:
     - `new_stability`: Updated stability
     - `new_difficulty`: Updated difficulty
     - `interval`: Days until next review
     - `new_due_date`: Current time + interval

4. **Update Review History:**
   - Parse existing `review_history` JSONB (or initialize as empty array)
   - Append new review:
     ```json
     {
       "date": "current_timestamp",
       "rating": rating
     }
     ```
   - Serialize back to JSONB

5. **Update Flashcard:**
   - Execute UPDATE:
     - `stability = new_stability`
     - `difficulty = new_difficulty`
     - `due_date = new_due_date`
     - `review_history = updated_history`

6. **Return Result:**
   - Fetch and return updated flashcard

### 4.3. Error Handling

#### Standard Error Response Format

All errors follow this structure:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Optional additional context
    }
  }
}
```

#### HTTP Status Codes

| Status Code | Usage |
|-------------|-------|
| 200 OK | Successful GET, PATCH, POST (non-creation) |
| 201 Created | Successful POST (resource creation) |
| 204 No Content | Successful DELETE |
| 400 Bad Request | Validation error, malformed request |
| 401 Unauthorized | Missing or invalid authentication |
| 404 Not Found | Resource not found or not owned by user |
| 429 Too Many Requests | Rate limit exceeded |
| 500 Internal Server Error | Server error, AI service error |
| 504 Gateway Timeout | AI service timeout |

#### Error Codes

| Error Code | HTTP Status | Description |
|-----------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | Authentication required or invalid |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `AI_GENERATION_FAILED` | 500 | AI service error |
| `AI_TIMEOUT` | 504 | AI service timeout |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### 4.4. Rate Limiting

Rate limits are applied per authenticated user:

| Endpoint Pattern | Limit | Window |
|-----------------|-------|--------|
| `POST /api/flashcards/generate` | 10 requests | 1 minute |
| All other endpoints | 100 requests | 1 minute |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1697635200
```

**Rate Limit Exceeded Response:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retry_after": 60
    }
  }
}
```

---

## 5. Implementation Notes

### 5.1. Technology Stack Integration

#### Astro API Routes

- API endpoints implemented as Astro API routes in `src/pages/api/`
- File structure:
  ```
  src/pages/api/
  ├── flashcards/
  │   ├── index.ts          # GET /api/flashcards, POST /api/flashcards
  │   ├── [id].ts           # GET/PATCH/DELETE /api/flashcards/:id
  │   └── generate.ts       # POST /api/flashcards/generate
  ├── generation-logs/
  │   └── index.ts          # POST /api/generation-logs
  └── study/
      ├── due.ts            # GET /api/study/due
      └── review.ts         # POST /api/study/review
  ```

#### Supabase Integration

- Use `@supabase/supabase-js` client library
- For authenticated requests:
  ```typescript
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  const supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    }
  );
  ```
- RLS policies automatically enforce user_id filtering

#### FSRS Library

- Use `ts-fsrs` package for TypeScript FSRS implementation
- Initialize with default parameters:
  ```typescript
  import { FSRS, Rating } from 'ts-fsrs';
  
  const fsrs = new FSRS();
  const card = {
    stability: flashcard.stability || undefined,
    difficulty: flashcard.difficulty || undefined,
  };
  
  const result = fsrs.repeat(card, rating);
  // result contains: new_stability, new_difficulty, interval
  ```

#### OpenRouter AI Integration

- Use OpenRouter API for AI generation
- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Authentication: API key in `Authorization: Bearer <key>` header
- Request structure:
  ```typescript
  {
    model: "openai/gpt-4",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: { type: "json_object" }
  }
  ```

### 5.2. Database Considerations

#### Automatic Timestamps

Create PostgreSQL function and trigger for `updated_at`:
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### User Profile Creation

Create PostgreSQL function and trigger to auto-create user profile:
```sql
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, created_at, updated_at)
  VALUES (NEW.id, now(), now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();
```

#### Indexes

Ensure indexes exist for performance:
```sql
CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX idx_flashcards_due_date ON flashcards(due_date);
CREATE INDEX idx_generation_logs_user_id ON generation_logs(user_id);
CREATE INDEX idx_generation_logs_flashcard_id ON generation_logs(flashcard_id);
CREATE INDEX idx_generation_error_logs_user_id ON generation_error_logs(user_id);
```

### 5.3. Security Best Practices

1. **Never expose service role key** to frontend
2. **Validate all inputs** on backend, even if frontend validates
3. **Use parameterized queries** to prevent SQL injection (Supabase client handles this)
4. **Sanitize error messages** - don't expose internal details to users
5. **Implement rate limiting** to prevent abuse
6. **Use HTTPS** for all API communication
7. **Rotate API keys** regularly (OpenRouter, Supabase)
8. **Log security events** (failed auth attempts, rate limit violations)

### 5.4. Testing Considerations

#### Unit Tests

- Test validation functions
- Test FSRS calculations
- Test business logic functions
- Mock Supabase and OpenRouter clients

#### Integration Tests

- Test API endpoints with test database
- Test authentication flow
- Test RLS policies
- Test transaction rollbacks

#### End-to-End Tests

- Test complete user flows
- Test AI generation and review process
- Test study session workflow

---

## 6. Future Considerations (Out of MVP Scope)

The following features are not part of the MVP but may be considered for future iterations:

1. **Flashcard Decks/Categories:**
   - Add `decks` table and `flashcard_deck_id` foreign key
   - New endpoints: `GET/POST/PATCH/DELETE /api/decks`
   - Update flashcard endpoints to support deck filtering

2. **Shared Flashcards:**
   - Add `flashcard_shares` table with permissions
   - New endpoints: `POST /api/flashcards/:id/share`, `GET /api/shared`
   - Update RLS policies to allow shared access

3. **Rich Text and Images:**
   - Add `front_html`, `back_html` fields
   - Add `attachments` table for images
   - New endpoints: `POST /api/attachments`
   - Update validation for HTML content

4. **Analytics Dashboard:**
   - New endpoints: `GET /api/analytics/acceptance-rate`, `GET /api/analytics/adoption-rate`
   - Aggregate data from `generation_logs`

5. **Usage Limits:**
   - Add `user_quotas` table
   - Implement quota checking in generation endpoint
   - New endpoints: `GET /api/quotas`

6. **Custom FSRS Parameters:**
   - Add `fsrs_settings` to user profile
   - Allow customization of FSRS algorithm parameters

7. **Batch Operations:**
   - `POST /api/flashcards/batch` - Create multiple flashcards at once
   - `DELETE /api/flashcards/batch` - Delete multiple flashcards

8. **Export/Import:**
   - `GET /api/flashcards/export` - Export flashcards as JSON/CSV
   - `POST /api/flashcards/import` - Import flashcards from file

---

## 7. API Versioning

For MVP, no versioning is implemented. All endpoints are under `/api/`.

For future versions, consider:
- URL versioning: `/api/v1/`, `/api/v2/`
- Header versioning: `Accept: application/vnd.10xcards.v1+json`

---

## 8. CORS Configuration

Since frontend (Astro) and API are in the same application, CORS is not required for MVP.

If frontend and backend are deployed separately in the future:
```typescript
// CORS headers for API responses
{
  'Access-Control-Allow-Origin': 'https://10xcards.com',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
}
```

---

## 9. API Documentation

For MVP, this document serves as the API specification.

For future iterations, consider:
- **OpenAPI/Swagger:** Generate interactive API documentation
- **Postman Collection:** Provide collection for testing
- **SDK Generation:** Auto-generate client SDKs from OpenAPI spec

---

## Appendix: Complete Endpoint Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/flashcards/generate` | Generate flashcard candidates from text | Yes |
| POST | `/api/flashcards` | Create flashcard (manual or accept AI candidate) | Yes |
| GET | `/api/flashcards` | List flashcards with pagination and search | Yes |
| GET | `/api/flashcards/:id` | Get single flashcard | Yes |
| PATCH | `/api/flashcards/:id` | Update flashcard | Yes |
| DELETE | `/api/flashcards/:id` | Delete flashcard | Yes |
| POST | `/api/generation-logs` | Create log entry (reject candidate) | Yes |
| GET | `/api/study/due` | Get due flashcards for study session | Yes |
| POST | `/api/study/review` | Submit review and update FSRS parameters | Yes |

