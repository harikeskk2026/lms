# Implementation Plan: Bulk Enroll Swallows Per-Student Errors

## 1. Issue Summary

When an admin bulk-enrolls multiple students into a course/batch via `POST /api/courses/{id}/enrollments/bulk`, the backend processes students in a loop but **silently swallows per-student errors**. The API returns only the successfully enrolled students with no indication of which students failed or why.

**Current behavior:**
- 10 students submitted → 7 succeed, 3 fail (duplicates/capacity/conflict)
- Response: `201 Created` with a list of 7 enrollment objects
- No failure information returned
- Frontend shows: "Successfully enrolled 10 students" (uses `selectedStudentIds.length`, not actual count)

**Expected behavior:**
- Response must report total processed, successful count, failed count
- Each failed student must include their identity and safe failure reason
- Frontend must display accurate success/failure counts and per-student results

---

## 2. Exact Root Cause

**File:** `api/src/main/java/com/careerlabs/lms/api/enrollment/service/impl/EnrollmentServiceImpl.java:285-295`

```java
@Override
@Transactional
public List<CourseEnrolledStudentResponse> bulkEnrollStudentsByAdmin(Long courseId, BulkEnrollStudentsRequest request) {
    // ...
    List<CourseEnrolledStudentResponse> responses = new ArrayList<>();
    for (Long studentId : request.studentIds()) {
        try {
            EnrollStudentRequest singleReq = new EnrollStudentRequest(studentId, request.batchId());
            CourseEnrolledStudentResponse response = enrollStudentByAdmin(courseId, singleReq);
            responses.add(response);
        } catch (ConflictException e) {
            // If student is already enrolled, continue processing remaining students
        }
    }
    return responses;
}
```

**Three compounding problems:**

1. **Silent catch:** `ConflictException` is caught and discarded. The failed student simply doesn't appear in the result list. No error record is created.

2. **Only `ConflictException` caught:** `BadRequestException` (capacity full, batch mismatch, inactive batch), `ResourceNotFoundException` (student/course/batch not found), and `ConflictException` from schedule conflicts are NOT caught. If any of these are thrown, the `@Transactional` annotation causes the **entire batch to roll back** — all previously successful enrollments in the loop are lost.

3. **Controller returns plain list:** `EnrollmentController.bulkEnrollStudents()` returns `ApiResponse<List<CourseEnrolledStudentResponse>>`. The response contains only the successful enrollments. There is no field for failures, counts, or error messages.

4. **Frontend ignores actual count:** `EnrolledStudentsTab.jsx:188` shows `Successfully enrolled ${selectedStudentIds.length} student(s)` — always reports the requested count, not the actual enrolled count.

---

## 3. Current Behavior

| Step | What happens |
|------|-------------|
| Admin selects 10 students, clicks "Enroll" | Frontend sends `POST /courses/{id}/enrollments/bulk` with `{ studentIds: [1..10], batchId }` |
| Backend processes student #1 | Enrolled successfully → added to response list |
| Backend processes student #2 | Already enrolled → `ConflictException` thrown → **caught and silently discarded** |
| Backend processes student #3 | Enrolled successfully → added to response list |
| Backend processes student #4 | Batch full → `BadRequestException` thrown → **propagates → transaction rolls back** |
| **Result** | **Entire transaction rolled back.** Students #1 and #3 are also NOT enrolled. |
| Controller returns | `500 Internal Server Error` (from propagated exception) |
| Frontend shows | "Failed to enroll student(s)" (generic error toast) |

**Even worse scenario:** If all failures are `ConflictException` (duplicates), the loop completes successfully. The response contains 8 enrollments (students #1, #3, #5-#10). The frontend shows "Successfully enrolled 10 students" — **2 students silently failed with no feedback.**

---

## 4. Expected Behavior

| Step | What happens |
|------|-------------|
| Admin selects 10 students, clicks "Enroll" | Frontend sends `POST /courses/{id}/enrollments/bulk` |
| Backend processes all 10 students | Each student processed in its own transaction; failures captured, not swallowed |
| Backend returns | `200 OK` with structured response containing successes and failures |
| Frontend displays | "7 enrolled successfully, 3 failed" with per-student details |

---

## 5. Affected Files/Classes/Components

### Backend — Files to modify

| File | Change |
|------|--------|
| `api/.../enrollment/service/EnrollmentService.java` | Change `bulkEnrollStudentsByAdmin` return type to `BulkEnrollmentResponse` |
| `api/.../enrollment/service/impl/EnrollmentServiceImpl.java` | Rewrite `bulkEnrollStudentsByAdmin` with `TransactionTemplate`; add per-student enrollment helper; add exception classification; add logging for unexpected errors |
| `api/.../enrollment/controller/EnrollmentController.java` | Update `bulkEnrollStudents` handler to return `BulkEnrollmentResponse` |

### Backend — Files to create

| File | Purpose |
|------|---------|
| `api/.../enrollment/dto/response/BulkEnrollmentResponse.java` | Response DTO with total, successful, failed counts + per-student results |
| `api/.../enrollment/dto/response/EnrollmentResultItem.java` | Per-student result DTO with studentId, name, success flag, message, enrollmentId |

### Frontend — Files to modify

| File | Change |
|------|--------|
| `frontend/src/components/admin/course/EnrolledStudentsTab.jsx` | Parse `BulkEnrollmentResponse`; show accurate counts; display per-student failure details; fix fallback endpoint |

### Files NOT modified

| File | Reason |
|------|--------|
| `Enrollment.java` (entity) | No schema change |
| `EnrollmentRepository.java` | No new queries needed |
| `BulkEnrollStudentsRequest.java` | Request shape unchanged |
| `CourseEnrolledStudentResponse.java` | Still used for individual enrollment responses |
| `BatchScheduleConflictValidator.java` | Unchanged |
| `GlobalExceptionHandler.java` | Unchanged |
| `Batch.java` (entity) | No changes |
| `BatchRepository.java` | No changes |

---

## 6. API Response Design

### Current Response

```json
// POST /api/courses/{id}/enrollments/bulk
// Response: 201 Created
{
  "success": true,
  "message": "Students enrolled successfully",
  "data": [
    { "enrollmentId": 1, "studentId": 101, "name": "Alice", ... },
    { "enrollmentId": 2, "studentId": 102, "name": "Bob", ... }
  ],
  "timestamp": "2026-09-15T10:30:00Z"
}
```

Problem: No failure information. Count in `data` may be less than requested. No error messages.

### Proposed Response

```json
// POST /api/courses/{id}/enrollments/bulk
// Response: 200 OK
{
  "success": true,
  "message": "Bulk enrollment completed: 7 enrolled, 3 failed",
  "data": {
    "totalProcessed": 10,
    "successful": 7,
    "failed": 3,
    "results": [
      {
        "studentId": 101,
        "studentName": "Alice Johnson",
        "email": "alice@example.com",
        "success": true,
        "message": "Enrolled successfully",
        "enrollmentId": 1
      },
      {
        "studentId": 102,
        "studentName": "Bob Smith",
        "email": "bob@example.com",
        "success": false,
        "message": "Already enrolled in this course",
        "enrollmentId": null
      },
      {
        "studentId": 103,
        "studentName": "Charlie Brown",
        "email": "charlie@example.com",
        "success": false,
        "message": "Batch 'Batch A' is at full capacity (30 students max)",
        "enrollmentId": null
      },
      {
        "studentId": 104,
        "studentName": "Diana Prince",
        "email": "diana@example.com",
        "success": false,
        "message": "Schedule conflict with existing batch 'Batch B' (Mon-Fri, 10:00 AM - 12:00 PM)",
        "enrollmentId": null
      }
    ]
  },
  "timestamp": "2026-09-15T10:30:00Z"
}
```

**Design decisions:**
- HTTP `200 OK` (not 201, not 400) — partial success is a valid business outcome, not an error
- `success: true` at top level — the operation completed (as opposed to a system failure)
- Per-student `success` boolean and `message` — frontend can display inline
- `enrollmentId` present only on success — null on failure
- `studentName` and `email` included — frontend can display without additional lookups
- Safe error messages only — no SQL errors, stack traces, or internal details

---

## 7. Transaction Strategy (Critical Design Decision)

### Why a Single Outer `@Transactional` Is Unsafe

The previous plan considered keeping `@Transactional` on the bulk method and catching exceptions per student. **This is unreliable** because:

1. **Spring marks transactions rollback-only on certain exceptions.** Even if a `RuntimeException` (like `DataIntegrityViolationException` or any `Exception` subclass) is caught inside the method, Spring's transaction infrastructure may have already marked the current transaction as rollback-only. When the method returns, Spring throws `UnexpectedRollbackException` instead of committing.

2. **The `enrollStudentByAdmin` method catches `DataIntegrityViolationException` and rethrows as `ConflictException`** (line ~260). If the `DataIntegrityViolationException` is caught by Spring's transaction interceptor before our catch block, the transaction becomes rollback-only.

3. **Any unexpected exception in the loop** (e.g., `NullPointerException`, `ClassCastException`, DB connection error) would poison the entire transaction even if caught later.

**Conclusion:** A single outer transaction cannot guarantee partial success. Each student MUST have its own independent transaction.

### Per-Student Transaction Isolation via `TransactionTemplate`

**Primary approach:** Use `TransactionTemplate` with `PROPAGATION_REQUIRES_NEW` for each student. Each student enrollment runs in its own transaction:

```
bulkEnrollStudentsByAdmin (NO @Transactional)
  │
  ├─ TransactionTemplate.execute() → Student #1
  │     BEGIN TRANSACTION
  │     Acquire pessimistic lock on batch
  │     Check capacity (count < maxStudents)
  │     Check duplicate enrollment
  │     Check schedule conflict
  │     Save enrollment
  │     COMMIT (on success) or ROLLBACK (on failure)
  │
  ├─ TransactionTemplate.execute() → Student #2
  │     BEGIN TRANSACTION
  │     Acquire pessimistic lock on batch
  │     Check capacity (sees committed count from #1)
  │     ... 
  │     COMMIT or ROLLBACK
  │
  └─ ... Student #N
```

**Key properties:**
- Each student's success/failure is independent
- Successful enrollments are committed immediately and visible to subsequent students
- Failed enrollments are rolled back with no side effects
- The pessimistic lock is acquired and released within each student's transaction
- The capacity count is accurate because each transaction sees previously committed counts

### Why `TransactionTemplate` Instead of `REQUIRES_NEW` on a Separate Service

The existing `enrollStudentByAdmin()` method has `@Transactional` on it. To call it with `REQUIRES_NEW`, we would need to:
1. Extract it into a separate Spring bean (Spring AOP cannot intercept self-invocation)
2. Or use `AopContext.currentProxy()` (fragile, requires `exposeProxy=true`)

`TransactionTemplate` is simpler:
- No new beans needed
- No proxy tricks
- Explicit, visible transaction boundaries
- Works with private methods
- No dependency on Spring AOP interception

### Why Not Remove `@Transactional` From `enrollStudentByAdmin`

`enrollStudentByAdmin()` is also called by the **single-student enrollment endpoint** (`POST /courses/{id}/enrollments`). That endpoint needs `@Transactional` for its own correctness. We must not remove it.

### Implementation: Private Enrollment Helper

Since `enrollStudentByAdmin()` is on the same bean, calling it from `TransactionTemplate` would create nested transactions (the `@Transactional` on `enrollStudentByAdmin` uses `REQUIRED` propagation by default, which joins the existing `TransactionTemplate` transaction — this actually works correctly for the lock and capacity check, but it's semantically confusing).

**Cleaner approach:** Extract the core enrollment logic into a **private method** `executeEnrollment` that does NOT have `@Transactional`. This method runs within the `TransactionTemplate`'s transaction:

```java
@Override // NO @Transactional on the bulk method
public BulkEnrollmentResponse bulkEnrollStudentsByAdmin(Long courseId, BulkEnrollStudentsRequest request) {
    if (request.studentIds() == null || request.studentIds().isEmpty()) {
        throw new BadRequestException("At least one student must be selected for enrollment");
    }

    List<EnrollmentResultItem> results = new ArrayList<>();
    for (Long studentId : request.studentIds()) {
        EnrollmentResultItem result = processSingleStudent(courseId, studentId, request.batchId());
        results.add(result);
    }

    long successful = results.stream().filter(EnrollmentResultItem::success).count();
    long failed = results.size() - successful;

    return new BulkEnrollmentResponse(
        results.size(), (int) successful, (int) failed, results,
        String.format("Bulk enrollment completed: %d enrolled, %d failed", successful, failed)
    );
}

private EnrollmentResultItem processSingleStudent(Long courseId, Long studentId, Long batchId) {
    // 1. Resolve student identity for the response (even if enrollment fails)
    StudentIdentity identity = resolveStudentIdentity(studentId);

    // 2. Execute enrollment in its own transaction
    try {
        EnrollmentResultItem result = transactionTemplate.execute(status -> {
            return executeEnrollment(courseId, studentId, batchId, identity);
        });
        return result;
    } catch (Exception e) {
        // TransactionTemplate itself failed (infrastructure error)
        log.error("Unexpected error processing enrollment for student {} in course {}", studentId, courseId, e);
        return EnrollmentResultItem.failure(studentId, identity.name(), identity.email(),
                "An unexpected error occurred. Please try again.");
    }
}

private EnrollmentResultItem executeEnrollment(Long courseId, Long studentId, Long batchId, StudentIdentity identity) {
    // NOTE: This method runs INSIDE a TransactionTemplate transaction.
    // Do NOT add @Transactional to this method.
    // The transaction boundary is managed by the caller (processSingleStudent).

    try {
        EnrollStudentRequest req = new EnrollStudentRequest(studentId, batchId);
        CourseEnrolledStudentResponse response = enrollStudentByAdmin(courseId, req);
        return EnrollmentResultItem.success(studentId, identity.name(), identity.email(),
                "Enrolled successfully", response.enrollmentId());
    } catch (ConflictException e) {
        return EnrollmentResultItem.failure(studentId, identity.name(), identity.email(),
                sanitizeMessage(e.getMessage()));
    } catch (BadRequestException e) {
        return EnrollmentResultItem.failure(studentId, identity.name(), identity.email(),
                sanitizeMessage(e.getMessage()));
    } catch (ResourceNotFoundException e) {
        return EnrollmentResultItem.failure(studentId, identity.name(), identity.email(),
                sanitizeMessage(e.getMessage()));
    } catch (Exception e) {
        // Unexpected exception — log technical details, return safe message
        log.error("Unexpected error enrolling student {} in course {}", studentId, courseId, e);
        return EnrollmentResultItem.failure(studentId, identity.name(), identity.email(),
                "An unexpected error occurred. Please try again.");
    }
}
```

### Self-Invocation of `enrollStudentByAdmin` Within `TransactionTemplate`

When `executeEnrollment` calls `enrollStudentByAdmin(courseId, req)`:
- `enrollStudentByAdmin` has `@Transactional` with default `REQUIRED` propagation
- It is called on the same bean → Spring AOP proxy does NOT intercept the self-call
- Therefore, `@Transactional` on `enrollStudentByAdmin` is **ignored**
- The method runs within the `TransactionTemplate`'s existing transaction
- The pessimistic lock (`findByIdWithLock`) and capacity check work correctly within this transaction
- If the method throws, `TransactionTemplate` marks the transaction for rollback
- The transaction rolls back, and `processSingleStudent` catches the exception

This is correct behavior. The `@Transactional` on `enrollStudentByAdmin` still works for the **single-student enrollment endpoint** (called through the Spring proxy from the controller).

### Pessimistic Lock Behavior Across Transactions

Each `TransactionTemplate.execute()` creates a new transaction:

1. **Student #1 transaction starts**
   - `findByIdWithLock(batchId)` acquires `PESSIMISTIC_WRITE` lock on the batch row
   - Capacity check: `countByBatchIdAndActiveTrue(batchId)` → 29
   - `maxStudents = 30` → capacity available
   - Enrollment saved
   - Transaction commits → lock released, enrollment visible to other transactions

2. **Student #2 transaction starts** (sees committed state from #1)
   - `findByIdWithLock(batchId)` acquires lock
   - Capacity check: `countByBatchIdAndActiveTrue(batchId)` → 30 (sees #1's enrollment)
   - `maxStudents = 30` → capacity full → `BadRequestException`
   - Transaction rolls back → lock released, no side effects

3. **Student #3 transaction starts** (sees committed state from #1, rolled-back #2)
   - Same as #2 → capacity full → `BadRequestException`

**Result:** Student #1 enrolled, students #2 and #3 failed. Student #1's enrollment is committed and permanent.

### Capacity Verification Example

```
Batch capacity: 30
Current enrolled: 29
Bulk enroll: [Student A, Student B, Student C]

Student A:
  Transaction starts
  Lock batch row
  Count active enrollments: 29 < 30 → OK
  Save enrollment (count becomes 30 in this transaction)
  Commit → lock released, count now 30 in DB

Student B:
  Transaction starts
  Lock batch row
  Count active enrollments: 30 >= 30 → FULL
  Throw BadRequestException("Batch 'X' is at full capacity (30 students max)")
  Rollback → lock released

Student C:
  Transaction starts
  Lock batch row
  Count active enrollments: 30 >= 30 → FULL
  Throw BadRequestException("Batch 'X' is at full capacity (30 students max)")
  Rollback → lock released

Final state:
  Batch enrolled count: 30
  Student A: enrolled (committed)
  Student B: not enrolled (rolled back)
  Student C: not enrolled (rolled back)
  Response: total=3, successful=1, failed=2
```

---

## 8. Error-Handling Strategy

### Exception Classification

Not all exceptions are equal. The implementation must distinguish between:

**A. Expected business exceptions** — become per-student failure results:
| Exception | Source | Safe Message |
|-----------|--------|-------------|
| `ConflictException` | Duplicate enrollment | "Student 'X' is already enrolled in this course" |
| `ConflictException` | Schedule conflict | "Schedule conflict with existing batch 'Y' (Mon-Fri, 10:00 AM - 12:00 PM)" |
| `BadRequestException` | Capacity full | "Batch 'X' is at full capacity (30 students max)" |
| `BadRequestException` | Batch mismatch | "Selected batch 'X' does not belong to course 'Y'" |
| `BadRequestException` | Inactive batch | "Batch 'X' is inactive" |
| `BadRequestException` | Course not published | "This course is not open for enrollment" |
| `ResourceNotFoundException` | Student not found | "Student not found with ID: X" |
| `ResourceNotFoundException` | Course not found | "Course not found: X" |
| `ResourceNotFoundException` | Batch not found | "Batch not found with ID: X" |

**B. Unexpected infrastructure exceptions** — logged with full details, returned as safe generic message:
| Exception | Action |
|-----------|--------|
| `DataIntegrityViolationException` | Log full exception, return "An unexpected error occurred" |
| `NullPointerException` | Log full stack trace, return "An unexpected error occurred" |
| `ClassCastException` | Log full stack trace, return "An unexpected error occurred" |
| `JDBCException` / `SQLException` | Log full exception (including SQL), return "An unexpected error occurred" |
| Any other `Exception` | Log full exception, return "An unexpected error occurred" |

### Logging Rules

```java
// Expected business exceptions — NO logging (they're normal flow)
catch (ConflictException | BadRequestException | ResourceNotFoundException e) {
    // Do NOT log — these are expected enrollment outcomes
    return EnrollmentResultItem.failure(..., sanitizeMessage(e.getMessage()));
}

// Unexpected exceptions — FULL logging (need to investigate)
catch (Exception e) {
    log.error("Unexpected error enrolling student {} in course {}: {}",
        studentId, courseId, e.getMessage(), e);  // full stack trace
    return EnrollmentResultItem.failure(..., "An unexpected error occurred. Please try again.");
}
```

### Message Sanitization

The `sanitizeMessage()` helper ensures no internal details leak:

```java
private String sanitizeMessage(String message) {
    if (message == null || message.isBlank()) {
        return "Enrollment failed";
    }
    // Our custom exceptions already have clean messages.
    // Truncate to prevent excessively long messages from reaching the frontend.
    return message.length() > 200 ? message.substring(0, 200) + "..." : message;
}
```

If a non-standard exception somehow has a message containing SQL/Java artifacts:

```java
private String sanitizeMessage(String message) {
    if (message == null || message.isBlank()) return "Enrollment failed";
    String sanitized = message
        .replaceAll("(?i)\\bexception\\b.*", "")
        .replaceAll("(?i)\\bconstraint\\b.*", "")
        .replaceAll("(?i)\\btable\\b.*", "")
        .replaceAll("(?i)\\bcolumn\\b.*", "")
        .replaceAll("\\[.*?\\]", "")
        .replaceAll("\\s+", " ")
        .trim();
    if (sanitized.isEmpty()) return "Enrollment failed";
    return sanitized.length() > 200 ? sanitized.substring(0, 200) + "..." : sanitized;
}
```

### Student Identity Resolution

For failed students, the response must include their name and email. This requires loading the student record even if enrollment fails:

```java
private record StudentIdentity(String name, String email) {}

private StudentIdentity resolveStudentIdentity(Long studentId) {
    try {
        return studentRepository.findById(studentId)
            .map(s -> new StudentIdentity(
                s.getUser() != null ? s.getUser().getName() : null,
                s.getUser() != null ? s.getUser().getEmail() : null))
            .orElse(new StudentIdentity(null, null));
    } catch (Exception e) {
        log.warn("Could not resolve identity for student {}", studentId, e);
        return new StudentIdentity(null, null);
    }
}
```

---

## 9. Multi-Batch Architecture Compatibility

The LMS uses `Enrollment(student_id, course_id, batch_id, is_active)` with a unique constraint on `(student_id, course_id)`.

**Verification points:**
- ✅ Duplicate detection uses `findByStudentIdAndCourseId()` — correct for multi-batch model
- ✅ Capacity check uses `countByBatchIdAndActiveTrue()` — per-batch, correct
- ✅ Schedule conflict validation checks all active enrollments — correct for multi-batch
- ✅ Reactivation sets `enrollment.batch` — correct, no `Student.batch_id` involvement
- ✅ `unenrollStudentByAdmin` clears batch and sets active=false — correct
- ✅ No reintroduction of `Student.batch_id` or `Student.batch` fields
- ✅ Each student's transaction is independent — no cross-student contamination

**The bulk enrollment fix does NOT change any enrollment data model or business rules.** It only changes how results are reported and how transactions are managed.

---

## 10. Security/Authorization Considerations

### Current State

`POST /api/courses/{id}/enrollments/bulk` has **no `@PreAuthorize` annotation** on the controller endpoint. The `enrollStudentByAdmin()` method it calls also has no role check.

However, `SecurityConfig` URL rules protect the path:
```java
.requestMatchers(HttpMethod.POST, "/api/courses/*/enroll", "/api/courses/*/enrollments/**")
    .hasAnyRole("ADMIN", "SUPERADMIN")
```

So only ADMIN/SUPERADMIN can reach the endpoint.

### Requirements

- Do NOT weaken authorization
- The new response DTO does not expose any new data beyond what `CourseEnrolledStudentResponse` already exposes
- Each student's transaction runs with the same security context as the caller
- No authorization checks are bypassed by the `TransactionTemplate` approach

---

## 11. Test Cases

### 11a. Unit Tests — `EnrollmentServiceImpl.bulkEnrollStudentsByAdmin`

```
test bulkEnroll_allStudentsSuccessful
  - 3 students, all new → 3 enrollments created
  - Response: total=3, successful=3, failed=0
  - All 3 results have success=true
  - All 3 enrollments committed to DB

test bulkEnroll_oneStudentDuplicate
  - 3 students: #1 new, #2 already enrolled (active), #3 new
  - Response: total=3, successful=2, failed=1
  - Result #2: success=false, message contains "already enrolled"
  - Enrollments #1 and #3 are committed to DB

test bulkEnroll_multipleStudentsDuplicate
  - 5 students: #1,#3 new, #2,#4,#5 already enrolled
  - Response: total=5, successful=2, failed=3
  - All 3 failures have appropriate duplicate messages

test bulkEnroll_allStudentsFail
  - 3 students: all already enrolled
  - Response: total=3, successful=0, failed=3
  - No new enrollments in DB

test bulkEnroll_capacityFull
  - Batch capacity=2, 1 existing, try to enroll 3 new
  - Response: total=3, successful=1, failed=2
  - Student #1 succeeds (count goes 1→2)
  - Students #2 and #3 fail with capacity message
  - Final DB count = 2 (= maxStudents)

test bulkEnroll_capacityExactBoundary
  - Batch capacity=30, 29 existing, enroll 3
  - Student #1 succeeds (29→30)
  - Students #2 and #3 fail (30>=30)
  - Response: total=3, successful=1, failed=2

test bulkEnroll_capacityAcrossTransactions
  - Verify capacity count is accurate across independent transactions
  - Each student's transaction sees previously committed enrollments
  - No phantom reads or lost updates

test bulkEnroll_scheduleConflict
  - Student enrolled in Batch A (Mon-Fri 10-12)
  - Try to enroll in Batch B (Mon-Fri 11-1)
  - Response: that student has success=false, message contains schedule conflict info
  - Student remains enrolled only in Batch A

test bulkEnroll_batchMismatch
  - Batch belongs to Course X, enrollment request is for Course Y
  - Response: that student has success=false, message="Selected batch 'X' does not belong to course 'Y'"

test bulkEnroll_inactiveBatch
  - Batch is inactive
  - Response: that student has success=false, message="Batch 'X' is inactive"

test bulkEnroll_studentNotFound
  - Student ID does not exist
  - Response: that student has success=false, message="Student not found with ID: X"
  - Other students still processed

test bulkEnroll_mixedSuccessAndFailure
  - 6 students: 3 new, 1 duplicate, 1 capacity full, 1 schedule conflict
  - Response: total=6, successful=3, failed=3
  - Each failure has distinct, accurate message
  - 3 successful enrollments are committed

test bulkEnroll_emptyStudentList
  - studentIds = []
  - Response: BadRequestException thrown (existing validation, before any transactions)

test bulkEnroll_sameStudentTwice
  - studentIds = [101, 101]
  - Student #101 (first iteration): succeeds
  - Student #101 (second iteration): duplicate error
  - Response: total=2, successful=1, failed=1
  - Only 1 enrollment in DB

test bulkEnroll_studentAlreadyEnrolledInOtherBatch
  - Student enrolled in Batch A of Course X
  - Try to enroll in Batch B of Course X (same course, different batch)
  - Existing behavior: reactivate/update enrollment with new batch
  - Verify correct behavior per existing enrollment logic

test bulkEnroll_unexpectedExceptionHandledGracefully
  - Mock a scenario where an unexpected RuntimeException occurs for one student
  - That student gets success=false, message="An unexpected error occurred"
  - Other students still processed
  - Exception is logged (verify log output)
```

### 11b. Integration Tests — `EnrollmentController`

```
test bulkEnroll_endpoint_returnsCorrectStructure
  - POST /api/courses/{id}/enrollments/bulk
  - Response contains: totalProcessed, successful, failed, results[]
  - Each result contains: studentId, studentName, email, success, message, enrollmentId

test bulkEnroll_endpoint_httpStatus
  - Partial success returns 200 OK
  - Full success returns 200 OK
  - All fail returns 200 OK

test bulkEnroll_endpoint_authorization
  - Unauthenticated → 401
  - STUDENT role → 403
  - TRAINER role → 403
  - ADMIN role → 200
  - SUPERADMIN role → 200
```

### 11c. Frontend Tests

```
test frontend_displaysCorrectCounts
  - 7 success, 3 failure → shows "7 enrolled, 3 failed"

test frontend_showsFailureDetails
  - Expand/click → shows per-student failure reasons

test frontend_handlesAllSuccess
  - All 5 succeed → shows "5 students enrolled successfully" (green toast)

test frontend_handlesAllFailure
  - All 3 fail → shows "0 enrolled, 3 failed" with reasons

test frontend_handlesEmptyList
  - No students selected → submit button disabled

test frontend_handlesBackendError
  - Network error → generic error toast
```

---

## 12. Regression Tests

```
test singleEnroll_byAdminStillWorks
  - POST /api/courses/{id}/enrollments (single) → 201, unchanged

test singleEnroll_selfEnrollStillWorks
  - POST /api/courses/{id}/enroll → 201, unchanged

test unenroll_stillWorks
  - DELETE /api/courses/{id}/enrollments/{enrollmentId} → soft-delete, unchanged

test listEnrollments_stillWorks
  - GET /api/courses/{id}/enrollments → pagination, search, filter, unchanged

test listMine_stillWorks
  - GET /api/courses/mine → student sees enrolled courses, unchanged

test batchCapacity_enforcedCorrectly
  - Batch with 30 max, 29 enrolled → enroll 2 more → 1 succeeds, 1 fails

test scheduleConflict_enforcedCorrectly
  - Overlapping batches → conflict detected per-student

test duplicateDetection_enforcedCorrectly
  - Active enrollment → reported as duplicate per-student

test csvBulkImport_stillWorks
  - POST /api/students/bulk-import → separate endpoint, unchanged

test batchEnrollViaAdmin_stillWorks
  - POST /api/admin/batches/{batchId}/enroll → separate endpoint, unchanged

test pessimisticLock_preventsConcurrentCapacityOverrun
  - Two concurrent bulk requests for same batch
  - Pessimistic lock serializes them
  - Total enrollments do not exceed capacity
```

---

## 13. File-by-File Change List

### `api/.../enrollment/dto/response/BulkEnrollmentResponse.java` (NEW)

```java
package com.careerlabs.lms.api.enrollment.dto.response;

import java.util.List;

public record BulkEnrollmentResponse(
    int totalProcessed,
    int successful,
    int failed,
    List<EnrollmentResultItem> results,
    String message
) {}
```

### `api/.../enrollment/dto/response/EnrollmentResultItem.java` (NEW)

```java
package com.careerlabs.lms.api.enrollment.dto.response;

public record EnrollmentResultItem(
    Long studentId,
    String studentName,
    String email,
    boolean success,
    String message,
    Long enrollmentId
) {
    public static EnrollmentResultItem success(Long studentId, String name, String email,
                                               String message, Long enrollmentId) {
        return new EnrollmentResultItem(studentId, name, email, true, message, enrollmentId);
    }

    public static EnrollmentResultItem failure(Long studentId, String name, String email,
                                               String message) {
        return new EnrollmentResultItem(studentId, name, email, false, message, null);
    }
}
```

### `api/.../enrollment/service/EnrollmentService.java` (MODIFY)

```java
// Before:
List<CourseEnrolledStudentResponse> bulkEnrollStudentsByAdmin(Long courseId, BulkEnrollStudentsRequest request);

// After:
BulkEnrollmentResponse bulkEnrollStudentsByAdmin(Long courseId, BulkEnrollStudentsRequest request);
```

### `api/.../enrollment/service/impl/EnrollmentServiceImpl.java` (MODIFY)

Changes:
1. **Remove `@Transactional`** from `bulkEnrollStudentsByAdmin`
2. **Inject `TransactionTemplate`** via constructor
3. **Inject `Logger`** for unexpected exception logging
4. **Rewrite `bulkEnrollStudentsByAdmin`** — iterate students, call `processSingleStudent()` via `TransactionTemplate`, collect results, return `BulkEnrollmentResponse`
5. **Add `processSingleStudent()`** — resolves student identity, executes enrollment in `TransactionTemplate`, catches all exceptions
6. **Add `executeEnrollment()`** — private method containing the actual enrollment logic (calls `enrollStudentByAdmin`), catches expected business exceptions, returns `EnrollmentResultItem`
7. **Add `resolveStudentIdentity()`** — loads student name/email for the response
8. **Add `sanitizeMessage()`** — cleans exception messages
9. **Add `StudentIdentity` private record** — holds name/email pair

Key imports to add:
- `org.springframework.transaction.support.TransactionTemplate`
- `org.slf4j.Logger`
- `org.slf4j.LoggerFactory`
- `com.careerlabs.lms.api.enrollment.dto.response.BulkEnrollmentResponse`
- `com.careerlabs.lms.api.enrollment.dto.response.EnrollmentResultItem`

### `api/.../enrollment/controller/EnrollmentController.java` (MODIFY)

```java
// Before:
@PostMapping("/{id}/enrollments/bulk")
public ResponseEntity<ApiResponse<List<CourseEnrolledStudentResponse>>> bulkEnrollStudents(
        @PathVariable Long id,
        @Valid @RequestBody BulkEnrollStudentsRequest request) {
    List<CourseEnrolledStudentResponse> response = enrollmentService.bulkEnrollStudentsByAdmin(id, request);
    return ResponseEntity.status(201).body(ApiResponse.of("Students enrolled successfully", response));
}

// After:
@PostMapping("/{id}/enrollments/bulk")
public ResponseEntity<ApiResponse<BulkEnrollmentResponse>> bulkEnrollStudents(
        @PathVariable Long id,
        @Valid @RequestBody BulkEnrollStudentsRequest request) {
    BulkEnrollmentResponse response = enrollmentService.bulkEnrollStudentsByAdmin(id, request);
    return ResponseEntity.ok(ApiResponse.of(response.getMessage(), response));
}
```

Note: HTTP status changes from `201` to `200` since partial success is a business outcome.

### `frontend/src/components/admin/course/EnrolledStudentsTab.jsx` (MODIFY)

1. **Parse new response structure:**
```jsx
// Before:
await courseService.bulkEnrollStudents(courseId, payload)
toast.success(`Successfully enrolled ${count} student(s)`)

// After:
const res = await courseService.bulkEnrollStudents(courseId, payload)
const data = res.data
if (data.failed === 0) {
  toast.success(`Successfully enrolled ${data.successful} student(s)`)
} else {
  toast.warning(`${data.successful} enrolled, ${data.failed} failed`)
  // Show failure details in expandable section
}
```

2. **Display per-student failure details** — add an expandable section or modal showing each failed student's name and reason

3. **Fix fallback endpoint** — the current fallback calls `POST /courses/{id}/enroll` (self-enroll). Remove the fallback or change it to `POST /courses/{id}/enrollments` (admin single enrollment)

---

## 14. Recommended Implementation Order

| Step | Task | Files |
|------|------|-------|
| 1 | Create `EnrollmentResultItem` record | `enrollment/dto/response/EnrollmentResultItem.java` (new) |
| 2 | Create `BulkEnrollmentResponse` record | `enrollment/dto/response/BulkEnrollmentResponse.java` (new) |
| 3 | Update `EnrollmentService` interface | `enrollment/service/EnrollmentService.java` |
| 4 | Inject `TransactionTemplate` + `Logger` into `EnrollmentServiceImpl` | `EnrollmentServiceImpl.java` constructor |
| 5 | Rewrite `bulkEnrollStudentsByAdmin` (no `@Transactional`) | `EnrollmentServiceImpl.java` |
| 6 | Add `processSingleStudent` with `TransactionTemplate.execute()` | `EnrollmentServiceImpl.java` |
| 7 | Add `executeEnrollment` private method | `EnrollmentServiceImpl.java` |
| 8 | Add `resolveStudentIdentity`, `sanitizeMessage`, `StudentIdentity` | `EnrollmentServiceImpl.java` |
| 9 | Update controller return type and HTTP status | `EnrollmentController.java` |
| 10 | Compile and run existing tests | `mvn clean compile && mvn test` |
| 11 | Add unit tests for new behavior | Test class for `EnrollmentServiceImpl` |
| 12 | Update frontend bulk enrollment handler | `EnrolledStudentsTab.jsx` |
| 13 | Fix frontend fallback endpoint | `EnrolledStudentsTab.jsx` |
| 14 | Manual testing with curl + frontend | Full integration test |
| 15 | Run lint and type checks | `mvn compile`, `npm run lint` |

---

## 15. Risks and Edge Cases

| Risk | Mitigation |
|------|------------|
| `TransactionTemplate` + self-invocation of `enrollStudentByAdmin` | Self-call ignores `@Transactional` on `enrollStudentByAdmin`. Method runs within `TransactionTemplate`'s transaction. Pessimistic lock and capacity check work correctly. |
| Pessimistic lock released between students | Each student's transaction acquires and releases the lock independently. Subsequent students see committed state from previous students. This is correct and intentional. |
| Student identity resolution adds extra DB queries | One `studentRepository.findById()` per student (success or failure). Acceptable since bulk enrollments are typically <100 students. |
| Frontend backward compatibility | `data` field changes from array to object. If frontend is not updated, it will break. Deploy backend and frontend together. |
| Same student appearing twice in request | First succeeds, second gets duplicate error. Correct behavior. |
| Concurrent bulk enrollment requests | Pessimistic lock serializes capacity checks across transactions. No data corruption. |
| `courseService.enrollStudent` fallback hits wrong endpoint | Fix the fallback as part of this implementation. The fallback calls `POST /courses/{id}/enroll` (self-enroll) instead of `POST /courses/{id}/enrollments` (admin enrollment). |
| `DataIntegrityViolationException` inside `enrollStudentByAdmin` | Caught by `enrollStudentByAdmin`'s own catch block, rethrown as `ConflictException`. Handled by `executeEnrollment`'s `ConflictException` catch. No issue. |
| Unexpected `RuntimeException` in `TransactionTemplate` | Caught by `processSingleStudent`'s outer catch block. Logged with full details. Returns safe generic message. Other students continue processing. |

---

## 16. Final Verification Checklist

- [ ] `BulkEnrollmentResponse` DTO created with correct fields
- [ ] `EnrollmentResultItem` DTO created with correct fields and static factory methods
- [ ] `EnrollmentService` interface updated
- [ ] `@Transactional` removed from `bulkEnrollStudentsByAdmin`
- [ ] `TransactionTemplate` injected into `EnrollmentServiceImpl`
- [ ] `Logger` injected for unexpected exception logging
- [ ] `bulkEnrollStudentsByAdmin` iterates students and calls `processSingleStudent`
- [ ] `processSingleStudent` wraps enrollment in `TransactionTemplate.execute()`
- [ ] `executeEnrollment` catches `ConflictException`, `BadRequestException`, `ResourceNotFoundException`, `Exception`
- [ ] Expected business exceptions return per-student failure results (no logging)
- [ ] Unexpected exceptions are logged with full details and return safe generic message
- [ ] `resolveStudentIdentity` loads name/email for all students
- [ ] `sanitizeMessage` prevents internal detail leakage
- [ ] Controller return type updated to `BulkEnrollmentResponse`
- [ ] Controller HTTP status changed to `200 OK`
- [ ] Frontend parses new response structure
- [ ] Frontend shows accurate success/failure counts
- [ ] Frontend displays per-student failure reasons
- [ ] Frontend fallback endpoint fixed (or removed)
- [ ] Existing single enrollment still works
- [ ] Existing unenrollment still works
- [ ] Existing enrollment list still works
- [ ] Batch capacity enforced correctly across independent transactions
- [ ] Schedule conflict enforced per-student
- [ ] Duplicate detection enforced per-student
- [ ] Pessimistic lock works within `TransactionTemplate`
- [ ] Authorization unchanged (ADMIN/SUPERADMIN only)
- [ ] No new DB migrations needed
- [ ] No `Student.batch_id` reintroduced
- [ ] `mvn clean compile` passes
- [ ] `mvn test` passes
- [ ] `npm run lint` passes
- [ ] Manual curl test: all success scenario
- [ ] Manual curl test: partial success scenario
- [ ] Manual curl test: all failure scenario
- [ ] Manual curl test: capacity boundary (29→30, enroll 3)
- [ ] Frontend test: enrollment modal displays results correctly
