# CareerLabs LMS — Complete Module Workflow Documentation

> Generated from a full read-through of the codebase (backend controllers/services/entities under `api/src/main/java/com/careerlabs/lms/api/**`, and the corresponding Next.js frontend under `frontend/src/**`). This document describes **actual implemented behavior**, not intended/aspirational design — including gaps and mismatches found between frontend and backend.

## 0. System Architecture Overview

| Layer | Location | Notes |
|---|---|---|
| **Primary backend** | `api/` — Spring Boot (Java) | The real, active API. ~366 files across 22 domain packages. Runs on port 8081 by default. |
| **Legacy/stub backend** | `backend/` — Node.js + Express + Prisma | Minimal skeleton (auth/admin/student controllers only). Not the system the frontend actually talks to for most features — appears to be an earlier prototype, superseded by `api/`. |
| **Frontend** | `frontend/` — Next.js (App Router) | Two route groups: `(admin)/admin/**` and `(student)/student/**`, plus `(auth)/**` for login/password-reset. |

**Two HTTP clients coexist in the frontend** with different default base URLs:
- `frontend/src/utilities/apiCall.js` → default `http://localhost:8081/api` (used by `authService.js` and most `*Service.js` files — the "current" pages).
- `frontend/src/lib/api.js` → default `http://localhost:7000/api`, exports `adminApi`/`studentApi` (used by older/parallel pages — see per-module "legacy UI" notes below). Both are normally overridden by the same `NEXT_PUBLIC_JAVA_API_URL` env var in real deployments.

**Authentication/RBAC**: exactly two roles, `ADMIN` and `STUDENT` (`Role` enum). JWT-based, stateless, 1-hour default expiry, enforced centrally in `SecurityConfig`'s URL-pattern rules (no method-level `@PreAuthorize` in the codebase).

**Shared plumbing** (`common` package): `ApiResponse<T>` success envelope, `ApiErrorResponse` error envelope, a `GlobalExceptionHandler` translating a typed exception hierarchy (`ResourceNotFoundException`→404, `ConflictException`→409, `BadRequestException`→400, `ForbiddenException`→403, `AccountDisabledException`→403, `InvalidCredentialsException`→401) into consistent JSON across every module, and `FileStorageService` (shared file upload: extension whitelist + 10MB max, UUID-renamed, served back from `/uploads/**`).

**No scheduled jobs** exist anywhere in the backend — every "report", "alert", or "daily challenge" is computed on-demand per request, not via cron/`@Scheduled`.

---

## 1. Auth Module

**Package**: `api/.../auth`, `security`, `user`, `common`, `config`

### What exists
- `POST /api/auth/login` — email+password → BCrypt verify → JWT issue (claims: `sub`=userId, `email`, `role`; 1h expiry via `app.jwt.expiration-ms`). Checks `user.isActive()` **after** password verification (403 "This account has been disabled" if inactive).
- `GET /api/auth/me` — returns the current user from the JWT principal (no DB session; principal is decoded straight from token claims for authorization, then one DB fetch for profile data).
- `JwtAuthenticationFilter` sets a single `ROLE_<ROLE>` authority per request; no per-request active-user re-check (a disabled account's already-issued token stays valid until it expires).
- `RestAuthenticationEntryPoint` / `RestAccessDeniedHandler` produce consistent JSON 401/403 instead of Spring's default HTML/error pages.
- Admin accounts (`admin@careerlabs.com`) are available for system administration.

### Workflow: Login
1. Student/admin submits email+password on `/login` (React Hook Form + Zod).
2. `AuthContext.login()` → `authService.login()` → `POST /auth/login`.
3. On success: token + user cached in `localStorage` (`tokenStorage`), React state updated, redirect to `/student/dashboard` or `/admin/dashboard` based on role.
4. On page load: cached token/user render instantly (no flash), then `GET /auth/me` silently re-validates in the background; failure clears storage and logs out.

### ⚠️ Confirmed gaps (frontend expects, backend doesn't have)
- **No registration endpoint** — accounts are created by an admin (via Student module).
- **Password reset / OTP flow is 100% frontend-only.** `forgot-password` and `reset-password` pages implement a full 3-step OTP wizard calling `POST /auth/forgot-password`, `/auth/verify-otp`, `/auth/reset-password` — **none of these routes exist in the Spring backend.**
- **Logout/refresh are also frontend-only.** `AuthContext.logout()`/`logoutAll()` call `POST /auth/logout` / `/auth/logout-all`; `lib/api.js`'s interceptor implements silent-refresh-on-401 via `POST /auth/refresh` keyed on a `TOKEN_EXPIRED` error code the backend never emits. All of these calls fail server-side; the frontend swallows the error and just clears local storage anyway, so the UX still "works" for logout, but nothing is invalidated server-side.
- No token revocation/blacklist — a stolen/valid JWT works until natural expiry regardless of account state changes.

---

## 2. Academic Structure (College → Department, Course → Syllabus → Session, Batch, Material)

**Package**: `api/.../college`, `department`, `course`, `batch`, `syllabus`, `material`, `session`, `enrollment` (`module` and `topic` packages are **empty scaffolding** — real module/topic concepts live inside `syllabus` as `SyllabusModule`/`SyllabusTopic`)

### Real hierarchy (as coded, not as might be assumed)
```
College ──(many-to-many, college_courses join table)── Course
Department ──(many-to-one)── College        [NOT linked to Course — pure student demographic field]

Course ──(1:M)── SyllabusModule ──(1:M)── SyllabusTopic ──(1:M)── Session
Course ──(1:M)── Batch                                    (independent branch, own cohort/trainer/capacity)

Material → attaches to exactly ONE of {Course, SyllabusModule, SyllabusTopic, Session}
           (nullable owner-id columns, enforced only in application code)

Student ⟷ Course: TWO independent relationships —
  1. Enrollment (self-service, controls content visibility)
  2. Student.batch (admin-assigned, controls cohort/schedule, capacity-limited — one batch at a time)
```

### Workflow: building a course
1. Admin creates a `Course` (title, description, duration, level, thumbnail, status DRAFT/PUBLISHED/ARCHIVED) — a unique URL `slug` is auto-generated from the title.
2. Admin adds `SyllabusModule`s under the course, then `SyllabusTopic`s under each module (both orderable/reorderable via drag-and-drop → `PUT .../reorder` with `{orderedIds}`).
3. Admin schedules `Session`s under a topic (title, date/time, duration, type LIVE/RECORDED, meeting/recording URL).
4. Admin uploads `Material` scoped to exactly one of course/module/topic/session (PDF/DOC/DOCX/PPT/PPTX/MP4/MOV/WEBM, ≤10MB), with a `visibility` flag (PUBLISHED/DRAFT, null=PUBLISHED).
5. Admin creates one or more `Batch`es for the course (name, trainer id, start/end date, timing, mode ONLINE/OFFLINE/HYBRID, `maxStudents` default 30).

### Workflow: student access
1. Course browsing (`GET /api/courses`) shows PUBLISHED courses to everyone, plus any course the student is individually enrolled in.
2. Student self-enrolls: `POST /api/courses/{id}/enroll` — rejected if course isn't PUBLISHED (400) or already enrolled (409, unique DB constraint too).
3. **Syllabus/sessions/materials require actual enrollment**, not just a published course — `CourseAccessGuard.requireContentAccess` returns 404 (not 403, to avoid leaking existence) if the student has no `Enrollment` row for that course.
4. Separately, an admin can assign the student to a `Batch` (`POST /api/admin/batches/{batchId}/enroll`) — this is cohort/schedule/trainer assignment, capacity-checked against `maxStudents`, and **does not by itself grant content access** (though admin-side course assignment on the Student record does auto-create the matching `Enrollment` row as a side effect — see Enrollment module below).

### Business rules
- Batch **deletion is blocked** if it has enrolled students, assignments, or scheduled classes (409) — the one hierarchy-integrity guard that does exist.
- Course/college/department **deletion has no such guard** — a college can be deleted while departments/courses still reference it; a course can be deleted while batches still reference it (`Batch.course` is NOT NULL — latent FK-violation risk).
- Batch capacity is enforced only at assignment time (live headcount vs `maxStudents`); lowering `maxStudents` below current headcount later is not re-validated.
- `Course.active` field exists but is vestigial — only `Course.status` is actually checked anywhere.

### ⚠️ Confirmed gaps — duplicated/legacy admin & student pages
Two parallel UI surfaces exist for both courses and batches; only one set is wired to the real backend:

| Live (real API) | Legacy/stale (mismatched or 404s) |
|---|---|
| `admin/course-catalog` — via `courseService`/`courseContentService` | `admin/courses` — via `lib/api.js`'s `adminApi`, field names don't match backend DTOs (`fileUrl` vs `url`, different Material type enum, expects `_count` fields the API never returns) |
| `admin/batch-catalog` — via `batchService` | `admin/batches` list duplicates it; the `[id]` detail view (roster/attendance/scheduling) is actually the fuller UI, despite using the mismatched `lib/api.js` client |
| `student/course-catalog` + `student/my-courses` — via `courseService`/`courseContentService`, real access-gated flow | `student/courses` — calls `/student/courses`, `/student/dashboard`, `/student/classes`, **none of which have a matching Spring controller — confirmed 404** |

---

## 3. Enrollment & Student Modules

**Package**: `api/.../student`, `enrollment`

### Key facts
- **No self-registration exists anywhere** — only an admin can create a student account (`POST /api/students`), which also creates the linked `User` (role STUDENT, BCrypt password).
- `Student` has no lifecycle-status enum (no ACTIVE/COMPLETED/DROPPED) — the only on/off state is `User.active`, toggled via `PATCH /api/students/{id}/status`.
- `placementStatus` (SEEKING/INTERVIEWING/PLACED/NOT_SEEKING) is tracked directly on `Student`.

### Workflow: admin creates/manages a student
1. Admin fills the "Add Student" form (name, email, phone, password, college/department — free-typed with autocomplete, resolved-or-created — course, batch, academic score, passed-out year) → `POST /api/students`.
2. Server: checks email uniqueness → creates `User` + `Student` (auto-generated `enrollmentNo`, format `CL-<year>-<userId>`) → optionally assigns batch (capacity-checked) → **auto-creates a course `Enrollment` row if a course was set** (`syncCourseEnrollment`, a documented fix so admin-assigned courses actually show up on the student's "My Courses" page — this only ever adds rows, never removes on later changes, preserving enrollment history).
3. Admin can edit any field later (`PUT /api/students/{id}`), toggle active/inactive, or view a full detail page (academics, batch card, clickable placement-status buttons).

### Workflow: course self-enrollment (student-facing, distinct mechanism)
- `POST /api/courses/{id}/enroll`: 400 if course not PUBLISHED, 409 if already enrolled (unique constraint + explicit check), else inserts `Enrollment`.
- `GET /api/courses/mine`: student's own enrollment list.

### Resume handling (lives in `placement` package but modifies `Student.resumeUrl`)
- `POST /api/student/resume-file` — PDF only, ≤10MB, stored under `api/uploads/resumes/`.
- Separate "Resume Builder" (`GET/PUT /api/student/resume`) stores freeform structured JSON in a companion `ResumeData` entity — entirely unrelated to the uploaded file.

### Business rules
- Batch capacity check (headcount vs `maxStudents`) runs identically whether triggered from student create/update or the batch admin panel.
- No hard delete anywhere for students or enrollments — deactivation only; batch removal just nulls the FK.
- `/api/students/**` is ADMIN-only; `/api/student/**` (singular) is the student's own self-service surface.

---

## 4. Assignment & Submission Modules

**Package**: `api/.../assignment`, `submission`

### Entities
- `Assignment`: title, description, course+batch (both required — always scoped to exactly one), startDate (optional), dueDate (required), totalMarks, optional instructor attachment, status DRAFT/PUBLISHED/CLOSED.
- `AssignmentSubmission`: unique per (assignment, student) — **no resubmission possible**. fileUrl/fileName, notes, submittedAt, `late` (computed at submit time), marks (nullable), feedback, `reviewed` flag.

### Workflow
1. Admin creates an assignment (DRAFT by default) with an optional attachment upload (PDF/DOC/DOCX ≤10MB).
2. Admin publishes (`PATCH /{id}/publish`) → fires a batch-wide notification; only PUBLISHED/CLOSED assignments are ever visible to students (never DRAFT).
3. Student sees it on `GET /api/student/assignments` (merged with their own submission status + `isOverdue` flag) and submits a file (+ optional notes).
4. Server validates: student's batch matches the assignment's batch (400 if not); no prior submission exists (409 if one does — **no update/resubmit endpoint at all**); sets `late=true` if past due date, **but still accepts the submission** — there is no hard cutoff, and closing an assignment doesn't block submission at the service layer either.
5. Admin roster (`GET /{assignmentId}/submissions`) shows every batch student (including non-submitters as PENDING) with summary counts. Admin grades via `PATCH .../submissions/{id}` (marks, feedback, reviewed — all independently patchable); marks capped at `assignment.totalMarks` (400 if exceeded).
6. Student sees grade/feedback on next fetch (status becomes `"GRADED"` once `reviewed=true`); a notification is pushed on grading.

### ⚠️ Confirmed gap
The student frontend's submit button (`studentApi.submitAssignment` → `POST /api/student/assignments/{id}/submit`) targets a path that **does not exist** — the real backend endpoint is `POST /api/assignments/{assignmentId}/submissions`. As implemented, the student-side submit UI would 404 against the current backend routes.

---

## 5. Quiz Module (largest module, ~107 files)

**Package**: `api/.../quiz`

A full gamified assessment system, not just plain MCQ:

### Sub-domains
- **Question bank**: `Question` (types MCQ/MULTIPLE_CORRECT/TRUE_FALSE/CODE_OUTPUT/DEBUGGING/SCENARIO/SQL/INTERVIEW) + `QuestionOption`, owned independently and reused across quizzes via `QuizQuestion` join rows.
- **Quiz authoring**: `Quiz` (type MCQ/APTITUDE/CODING/INTERVIEW_PREP/ADAPTIVE; difficulty; duration; passingScore%; maxAttempts; optional course/batch scope; toggles for random questions/options and explanation visibility).
- **Attempts & scoring**: `QuizAttempt` (one per attempt) + `QuestionAttempt` (one per question **per attempt**, pre-created at start so progress survives a refresh).
- **Adaptive mode**: separate difficulty-ladder engine (own start/next endpoints), fixed 5-question session, steps EASY↔MEDIUM↔HARD based on correct/wrong.
- **Gamification**: `StudentGameStats` (XP, streaks), `StudentAchievement` (8 hardcoded achievement types), `DailyChallenge` (auto-generated 10-question quiz per calendar day).
- **Leaderboard**: cross-quiz (not per-quiz), ranked by XP — GLOBAL/WEEKLY/MONTHLY/MOST_IMPROVED views, computed live on every request (no caching).
- **Analytics**: student dashboard, weak-topic detection (auto-builds a targeted practice quiz), skill assessment.
- **Interview prep**: a parallel, simpler standalone Q&A bank (`InterviewQuestion`) — distinct from MCQ-based `INTERVIEW_PREP`-type quizzes.

### Workflow: taking a quiz
1. Admin builds a quiz via a 3-step wizard (Settings → attach bank Questions → Preview) → Save Draft or Publish.
2. Student browses PUBLISHED quizzes (answer-key stripped from the response) and starts (`POST .../start`) — server checks `maxAttempts` not exceeded, builds/resumes the `QuestionAttempt` rows (shuffled if `randomQuestions`).
3. Each answer is saved immediately as clicked (`POST .../answers`, fire-and-forget) so a page refresh mid-quiz resumes correctly; a client-side countdown timer (adjusted for elapsed time) auto-submits at zero.
4. On submit: auto-graded (exact-match on selected vs. correct option set — **no partial credit, no negative marking**); score/accuracy/pass computed; **gamification runs synchronously** — XP award (`correct*10 + 50 if passed`), streak update, 8 achievement-unlock checks.
5. Full per-question review returned (with explanations only if `quiz.showExplanation`).

### Business rules
- Attempt limit enforced server-side regardless of client checks.
- A quiz with existing attempts **cannot be deleted** (must archive instead).
- Question-option validation: MCQ/TRUE_FALSE require exactly 1 correct option; MULTIPLE_CORRECT requires ≥1.

### ⚠️ Confirmed gap
`admin/quizzes/[id]/leaderboard` and `student/quizzes/leaderboard/[id]` pages call **per-quiz** leaderboard/results endpoints that don't exist in the backend — the only real leaderboard is the cross-quiz `GET /student/leaderboard`. These two pages are orphaned.

---

## 6. Attendance Module (~58 files)

**Package**: `api/.../attendance`

### Entities
`DailyClass` (scheduled session, tied to a batch) → `Attendance` (per-student-per-class record, unique constraint prevents duplicates; statuses PRESENT/ABSENT/LATE/HALF_DAY/LEAVE/EXCUSED, default ABSENT) → `AttendanceAlert`, `AttendanceCorrection` (student-initiated dispute workflow), `AttendanceGoal` (personal target), `AttendancePolicy` (threshold config, cascades batch → course → global default 75%/65%).

### Workflow
1. Admin schedules a `DailyClass`, then loads the attendance sheet for it and marks each student (P/A/L/HalfDay/Leave/Excused, bulk-select, "Mark All X", or "Copy Previous Attendance"). Saving with `submit=true` flips the class to COMPLETED; `submit=false` saves as a draft.
2. Admin can also directly edit any past `Attendance` record via `PUT /{id}` — **no date-lock exists**; nothing blocks editing old records outside the formal correction workflow.
3. Percentage = present / total-marked-classes (LATE/HALF_DAY/EXCUSED count toward the denominator, not the present numerator). Risk classified HEALTHY (≥75%) / AT_RISK (≥65%) / CRITICAL, thresholds from the effective policy.
4. **Low-attendance alerts are admin-triggered on demand** (`POST /alerts/generate?threshold=`), not automatic — scans students below threshold (minimum 3 marked classes to qualify), creates/updates an `AttendanceAlert` + pushes a notification.
5. **Student correction workflow**: student disputes a specific record (`POST /attendance/corrections` with requested status + reason/evidence) → admin approves (overwrites the `Attendance` status) or rejects (no change) → student notified either way. Guards: can't dispute another student's record (403), can't have two pending corrections on the same record (409), can't re-review an already-decided correction (400).

### Business rules
- DB-level unique constraint on `(student, class)` plus find-or-update logic prevents duplicate marking.
- A class must be formally submitted (not just drafted) before "Copy Previous Attendance" can pull from it.
- Two slightly different "classes needed to reach threshold" projection formulas coexist (a simple one for the summary/alerts list, a denominator-aware one for the personal goal tracker) — both approximate, assuming all future classes are attended.

---

## 7. Placement Module

**Package**: `api/.../placement`

### Design intent (explicit in code comments)
Students **never apply directly** to a job — they only "express interest" in an admin-created `Drive`; all downstream review/shortlisting is meant to be admin-controlled.

### Entities
`Drive` (company/role/package/location/dates/description/requirements/skills; type CAMPUS/OFF_CAMPUS/POOL/VIRTUAL; status UPCOMING/ACTIVE/CLOSED/CANCELLED; eligibility criteria: minCgpa, minPercentage, maxBacklogs, minAttendancePct [modeled but **not enforced** — attendance-based eligibility isn't wired up], plus eligible batches/departments/courses). `DriveApplication` (student's interest record; documented status pipeline INTERESTED→UNDER_REVIEW→SHORTLISTED→RESUME_SHARED→SELECTED/NOT_SELECTED/REJECTED). `ResumeData` (Resume Builder JSON, separate from the uploaded PDF).

### Workflow (as actually implemented)
1. Admin creates a `Drive` with eligibility rules.
2. Student browses drives (`GET /student/drives`) — each annotated with computed `isEligible` + human-readable `ineligibilityReasons`, and their own application status if already expressed.
3. Student clicks "I'm Interested" (`POST /drives/{id}/interest`) — server re-validates eligibility (403 if not) and duplicate application (409) — creates a `DriveApplication` at status `INTERESTED`.

### ⚠️ Confirmed major gap — the pipeline stops here
**There is no backend endpoint or service method to progress a `DriveApplication` past `INTERESTED`.** The status pipeline, DTOs, and even some repository query methods (`findAllByDrive_Id...`) exist but are **never called by any controller** — admins currently have no real API to view a drive's applicant list or change an applicant's status. The admin frontend's "Applications" modal calls `GET/PATCH /admin/drives/{id}/applications...` routes that don't exist server-side, and even uses stale field names/status values that don't match the real `DriveApplicationStatus` enum — this whole panel is non-functional against the current backend.

### Business rules
- Eligibility re-validated server-side at interest-expression time (not just trusted from the list call).
- No application-deadline enforcement server-side (UI-only countdown/disabling).
- Resume file upload: PDF only, ≤10MB, unrelated to a specific application.

---

## 8. Reports & Notifications

**Package**: `api/.../report`, `notification`

### Reports — pure on-demand computation, nothing stored
No `Report` entity exists; every one of ~20 `GET /api/reports/*` endpoints recomputes live from other modules' repositories (students, batches, assignments, submissions, quiz attempts, attendance) on each call — no caching, no scheduled job. Covers: attendance, performance (per-student and aggregate), at-risk/declining students, placement readiness, batch health, quiz/assignment analytics, engagement, activity trend, leaderboards, correlations (explicitly disclaimed as non-causal), and CSV-style export (returned as JSON; the **frontend** converts it to a downloadable CSV client-side — the backend never generates a file).

Key hardcoded thresholds (not admin-configurable): 60% = low-performance cutoff; batch health GOOD/AVERAGE/POOR at 80%/60%; attendance HEALTHY/AT_RISK/CRITICAL at 75%/65%; placement readiness READY/NEARLY_READY/NEEDS_IMPROVEMENT/NOT_READY at 80%/65%/45%.

### Notifications — in-app only, no email/SMS
Single `Notification` entity (title, body, type, read flag, optional deep-link), created via async fan-out helpers (`notifyUser`, `notifyBatch`, `notifyAllStudents`, `notifyAdmins`) called from other modules' services. **Delivery is in-app only — no email/SMTP integration exists anywhere in the codebase.**

Confirmed real trigger points: assignment published → notify batch; submission graded → notify student; student submits → notify admins; attendance correction reviewed → notify student; low-attendance alert generated → notify student (admin-triggered, not automatic).

### ⚠️ Confirmed gaps
- **Quiz events never trigger notifications** (publish/grade), despite the assignment module doing so.
- **Placement never triggers notifications** — the `NotificationType` enum has DRIVE/INTERVIEW/RESUME/STATUS/PREP values seemingly reserved for it, but nothing constructs them.
- **The Announcements feature is entirely frontend-only** — `admin/announcements` calls `GET/POST/PATCH/DELETE /api/admin/announcements`, and **no such entity, controller, or reference exists anywhere in the backend.**
- Admin Dashboard page doesn't use the `report` package at all — it calls a separate `/admin/dashboard/stats` endpoint outside this module.

---

## Summary Table — Confirmed Frontend/Backend Mismatches

| Area | Frontend expects | Backend reality |
|---|---|---|
| Auth | Forgot/reset password (OTP), logout, logout-all, token refresh | None of these endpoints exist |
| Assignments | `POST /student/assignments/{id}/submit` | Real path is `POST /assignments/{id}/submissions` |
| Quiz | Per-quiz leaderboard/results pages | Only cross-quiz `/student/leaderboard` exists |
| Placement | View/manage drive applicants, change application status | No such endpoints; pipeline dead-ends at `INTERESTED` |
| Announcements | Full CRUD admin page | No backend support whatsoever |
| Courses (legacy) | `admin/courses` panel fields | Don't match current course/material/session DTOs |
| Student courses (legacy) | `student/courses`, `/student/dashboard`, `/student/classes` | No matching controllers — 404 |

These are worth prioritizing if the next phase of work is "make the existing UI fully functional" rather than "add new features."
