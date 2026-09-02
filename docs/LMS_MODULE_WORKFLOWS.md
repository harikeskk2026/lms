# CareerLabs LMS — Complete Module & Role Workflow Documentation

> Generated from a full read-through of the codebase (backend controllers/services/entities under `api/src/main/java/com/careerlabs/lms/api/**`, and the corresponding Next.js frontend under `frontend/src/**`) as of 2026-09-02. This document describes **actual implemented behavior**, not intended/aspirational design — including gaps and mismatches found between frontend and backend. It supersedes the previous version of this file, which predated several commits (login-latency fixes, the Announcements module, student-side calendar, acknowledgement feature, placement pipeline, superadmin seed account) that changed a number of its conclusions.

## 0. System Architecture Overview

| Layer | Location | Notes |
|---|---|---|
| **Primary backend** | `api/` — Spring Boot (Java 21) | The real, active API. Runs on port 8081 (`SERVER_PORT`) / documented as 7000 in some configs — confirm your `.env`. |
| **Legacy/stub backend** | `backend/` — Node.js + Express + Prisma | Minimal skeleton, superseded by `api/`. Not used for any feature described below. |
| **Frontend** | `frontend/` — Next.js 14 (App Router) | Two route groups: `(admin)/admin/**` and `(student)/student/**`, plus `(auth)/**` for login/password-reset. |
| **Database** | PostgreSQL | Schema managed by Hibernate `ddl-auto` (see `.env` `JPA_DDL_AUTO`). |

**Two HTTP clients coexist in the frontend**: `frontend/src/utilities/apiCall.js` (used by `authService.js` and most `*Service.js` files — the modern, fully-wired pages) and `frontend/src/lib/api.js` (exports `adminApi`/`studentApi`, used by older/parallel pages). Both point at the same Java API base URL in practice (`NEXT_PUBLIC_JAVA_API_URL`). Per-module notes below flag where a page still uses the legacy client with a broken/mismatched endpoint.

**Shared plumbing** (`common` package): `ApiResponse<T>` success envelope, `ApiErrorResponse` error envelope, a `GlobalExceptionHandler` translating a typed exception hierarchy (`ResourceNotFoundException`→404, `ConflictException`→409, `BadRequestException`→400, `ForbiddenException`→403, `AccountDisabledException`→403, `InvalidCredentialsException`→401) into consistent JSON, and `FileStorageService` (shared upload: extension whitelist + size caps, UUID-renamed, served from `/uploads/**`).

**Scheduled jobs**: almost the entire backend still computes everything on-demand per request — **except Announcements**, which now has a real `@Scheduled` sweep (see §8). Every other module (reports, alerts, dashboards) remains request-time computation with no caching.

---

## 1. Roles — what actually exists vs. what's wired up

The `Role` enum (`user/entity/Role.java`) has **four** values: `SUPERADMIN`, `ADMIN`, `TRAINER`, `STUDENT`. The frontend is already built to branch on all four — `frontend/src/app/(admin)/layout.jsx` defines `ADMIN_ROLES = ['SUPERADMIN', 'ADMIN', 'TRAINER']`, and `AdminShell.jsx` has distinct role-chip colors for each (red/yellow/green).

**In practice, only two roles are ever assigned at runtime: `ADMIN` and `STUDENT`.**
- No code path anywhere sets `Role.SUPERADMIN` or `Role.TRAINER` on a user. The demo seed account with email `superadmin@careerlabs.com` (created by `SampleDataPurgeRunner`, gated behind `app.purge-sample-data=true`) is saved with `Role.ADMIN` — "Super Admin" is a display label from the email/seed data only, not a distinct backend role.
- `SecurityConfig.java` only ever checks `.hasRole("ADMIN")` / `.hasRole("STUDENT")` — there is no SUPERADMIN- or TRAINER-specific authorization rule anywhere.
- There is **no admin-facing UI or API to create additional admin/trainer accounts** — the only source of admin users is the hardcoded seeder. Students are the only role with a real creation workflow (admin-driven, see §3).

**Practical consequence for "workflow including all the roles"**: every workflow below that says "Admin" applies identically regardless of which of SUPERADMIN/ADMIN/TRAINER label was used to log in — there is currently no narrower "trainer view" or elevated "superadmin-only" action anywhere in the system. Treat the role model as binary (**Admin** / **Student**) until account provisioning and authorization rules are built out for the other two.

---

## 2. Auth & Session Workflow (all roles)

**Login** (`POST /api/auth/login`, `auth/service/impl/AuthServiceImpl.java`):
1. `UserRepository.findByEmailIgnoreCase` → BCrypt password match → **then** `user.isActive()` check (403 if disabled, checked *after* password verification, so a disabled account can't distinguish "wrong password" from "disabled" via timing) → `lastLoginAt` updated → JWT issued (claims `sub`=userId, `email`, `role`; expiry via `app.jwt.expiration-ms`, default 1h).
2. `GET /api/auth/me` returns the profile from one DB fetch keyed off the JWT-decoded principal — no server-side session store.

**Frontend flow**: `frontend/src/app/(auth)/login/page.jsx` → `AuthContext.login()` → `POST /auth/login` → on success, token+user cached in `localStorage` (`tokenStorage.js`), then `router.push('/student/dashboard')` or `'/admin/dashboard'` by role. On every page load, `AuthContext` hydrates instantly from the cached user (no flash), then silently re-validates via `GET /auth/me` in the background; a failure clears storage and logs out.

**Route gating** happens in the two route-group layouts, not the login page:
- `(admin)/layout.jsx` — role must be in `ADMIN_ROLES`; else redirect to `/student/dashboard`.
- `(student)/layout.jsx` — role must be `STUDENT`; else redirect to `/admin/dashboard`.
- Both redirect unauthenticated users to `/login?redirect=<path>`.

**Still-missing backend features** (frontend UI exists, backend routes do not):
- **Forgot/reset password**: `frontend/src/app/(auth)/forgot-password/**` implements a full 3-step OTP wizard calling `/auth/forgot-password`, `/auth/verify-otp`, `/auth/reset-password` — none of these exist in `AuthController` (only `/login` and `/me` do). Confirmed still broken.
- **Logout / logout-all**: `AuthContext.logout()`/`logoutAll()` call `POST /auth/logout` / `/auth/logout-all` — no matching backend routes, calls fail silently and the frontend just clears local storage anyway. A stolen/valid JWT keeps working until natural expiry regardless of "logout."
- **Token refresh**: fully removed from the frontend (not merely broken) — a 401 now triggers an immediate one-shot toast + hard redirect to `/login` instead of a silent-refresh attempt.

**Account provisioning**: Students are created only by an admin (`POST /api/students`, see §3). Admin/Trainer/Superadmin accounts have no creation workflow — only the hardcoded seed accounts exist.

---

## 3. Academic Structure & Student Management

### Data model
```
College ──(M:N via college_courses)── Course
Course ──(1:M)── SyllabusModule ──(1:M)── SyllabusTopic ──(1:M)── Session
Course ──(1:M)── Batch                                    (independent: cohort/trainer/capacity)
Material → attaches to exactly ONE of {Course, SyllabusModule, SyllabusTopic, Session}
Student ⟷ Course: Enrollment (self-service, gates content access) + Student.batch (admin-assigned, gates cohort/schedule)
Student ── AcademicDetails (1:1)                           (10th/12th/diploma/UG/PG history — replaces the old "Department" entity)
```
A `department` entity no longer exists; department-like data now lives as free-text fields (`ugDepartment`/`pgDepartment`) inside `AcademicDetails`, which is the source of truth for Placement eligibility checks (§7). `Course.status` (DRAFT/PUBLISHED/ARCHIVED) and nullable `status`/`visibility` on modules/topics/sessions/materials (null = published) gate visibility; `Course.active` is vestigial and unused for gating.

### Admin workflow — building a course (role: Admin)
1. Create a `Course` via **`admin/course-catalog`** (title, description, duration, level, thumbnail, status) — this is the one fully-wired course-builder page.
2. Add `SyllabusModule`s → `SyllabusTopic`s (drag-and-drop reorder) from the course's `[id]` content-authoring screen.
3. Schedule `Session`s under a topic (title, date/time, type LIVE/RECORDED, meeting/recording URL).
4. Upload `Material` scoped to exactly one of course/module/topic/session (PDF/DOC/DOCX/PPT/PPTX/MP4/MOV/WEBM, ≤10MB), with DRAFT/PUBLISHED visibility.
5. Create one or more `Batch`es for the course (name, trainer, dates, timing, mode, `maxStudents` default 30) via **`admin/batches`**.

**⚠️ Known-broken admin page**: `admin/courses` (distinct from `admin/course-catalog`) has its own course list/create working (migrated to the real API), but its **Materials/Syllabus/Sessions management panels call endpoints that don't exist on the backend** (`/admin/courses/{id}/materials`, `/sessions`, `/syllabus/modules`) and its stat badges (`_count.batches`, `_count.materials`) always render blank because `CourseResponse` never returns those fields. **Use `admin/course-catalog` for all course-content authoring — `admin/courses`'s content panels don't work.**

### Student workflow — course access (role: Student)
1. Browse published courses at **`student/course-catalog`**, self-enroll (`POST /api/courses/{id}/enroll` — 400 if not published, 409 if already enrolled).
2. Access syllabus/sessions/materials only after enrollment — `CourseAccessGuard` returns 404 (not 403, to avoid leaking a course's existence) if there's no `Enrollment` row, even if the student was separately batch-assigned by an admin.
3. View enrolled courses at **`student/my-courses`**.

**⚠️ Known-broken student page**: `student/courses` (a separate, older page from `student/course-catalog`/`my-courses`) calls `GET /student/courses`, which has no matching backend controller — this page's course list will always fail to load. Avoid it; use `student/course-catalog` and `student/my-courses` instead.

### Admin workflow — managing students (role: Admin)
1. **`admin/students`** → "Add Student" (name, email, phone, password, college/department autocomplete, course, batch, academic score, passed-out year) → `POST /api/students`.
2. Server creates `User`+`Student` (auto-generated `enrollmentNo`, format `CL-<year>-<userId>`), optionally batch-assigns (capacity-checked against `maxStudents`), and **auto-creates a course `Enrollment` row** if a course was set — this only ever adds rows, never removes them on a later change, preserving enrollment history.
3. Edit any field, toggle active/inactive (`User.active` — there's no separate student lifecycle status), or view a full detail page.

### Business rules (current)
- **Batch deletion** is blocked (409) if it has enrolled students, assignments, **or** scheduled classes.
- **Course deletion** now cascades: deletes its syllabus modules (→ topics → sessions), materials, and enrollments before deleting the course itself — it does **not** touch batches, and since `Batch.course` is a required FK, deleting a course with existing batches can still hit a DB constraint violation.
- Batch capacity is enforced only at assignment time; lowering `maxStudents` afterward isn't re-validated against current headcount.

---

## 4. Assignments (roles: Admin creates/grades, Student submits)

1. Admin creates an assignment as DRAFT (course+batch required, dueDate required, optional attachment, totalMarks) via **`admin/assignments`**.
2. `PATCH /{id}/publish` makes it visible to students (only PUBLISHED/CLOSED are ever returned to students) and notifies the batch.
3. Student submits a file + optional notes via **`student/assignments`** (`POST /api/assignments/{assignmentId}/submissions`). This student-submit flow **is now fully working end-to-end** — a previously-documented path mismatch has been fixed.
4. Server rejects if the student's batch doesn't match the assignment's batch (400), or if they've already submitted (409 — **no resubmission endpoint exists at all**, one submission per student per assignment, enforced both in code and by a DB unique constraint).
5. `late` is computed once at submit time but a late submission is still accepted — there's no hard cutoff, and a CLOSED assignment doesn't block submission at the service layer either.
6. Admin grades (`PATCH .../submissions/{id}`: marks capped at `totalMarks`, feedback, reviewed flag — all independently patchable) — the student gets a "Graded" notification, and admins get a "New Submission" notification whenever a student submits.

---

## 5. Quizzes (roles: Admin/Trainer builds, Student takes)

A large gamified assessment system covering plain quizzes, an adaptive difficulty-ladder mode, a daily challenge, and cross-cutting XP/streaks/achievements/leaderboard.

### Admin workflow
1. 3-step wizard (Settings → attach/create Questions from the bank → Preview) at **`admin/quizzes`**: `POST /admin/quizzes` (draft) → attach questions → `PUT` with `status: PUBLISHED` to publish.
2. **Targeting/scheduling** (newer than earlier documentation): a `QuizAssignment` lets an admin assign a quiz to specific students/batches with an `availableFrom`/`availableUntil` window — starting a quiz outside that window, or without being assigned, is rejected server-side (403/409), not just hidden in the UI.
3. **Result visibility** can be set per quiz: `IMMEDIATE` (default) or `MANUAL` — for `MANUAL`, admin calls `POST /{id}/release-results` before students can see their scores.
4. **Negative marking** is a per-quiz opt-in toggle (default off) — when enabled, a wrong (non-skipped) answer deducts the full point value for that question.
5. A quiz with existing attempts can't be deleted — must be archived/unpublished instead.

### Student workflow
1. Browse published, assigned quizzes at **`student/quizzes`** (answer key stripped from the response).
2. Start (`POST .../start`) — resumes an in-progress attempt if one exists, or creates one; `maxAttempts` is enforced server-side (counts only submitted attempts, 409 once exceeded); questions/options shuffle if configured.
3. Each answer saves immediately as clicked (fire-and-forget), so a refresh mid-quiz resumes correctly. If a student abandons an attempt past its time limit, the **next** start/resume call auto-expires it server-side (scores it as all-skipped) — this is a genuine server-side safety net, not just a client-side countdown.
4. On submit: exact-match auto-grading (no partial credit), score/accuracy/pass computed, then gamification runs synchronously — XP (`correctCount*10 + 50 if passed`), streak update, and 8 achievement-unlock checks, all before the response returns.

### ⚠️ Confirmed still-broken pages
`admin/quizzes/[id]/leaderboard` and `student/quizzes/leaderboard/[id]` call a **per-quiz** leaderboard/results endpoint that has never existed on the backend (only a cross-quiz `GET /student/leaderboard` exists, which the live quiz pages correctly use instead). These two pages are not just broken but **unreachable from any in-app navigation** — no link anywhere in the frontend points to them. Safe to ignore or remove.

---

## 6. Attendance (roles: Admin/Trainer marks, Student views/disputes)

### Data model
`DailyClass` (scheduled session tied to a batch, status SCHEDULED→COMPLETED/CANCELLED) → `Attendance` (per-student-per-class, unique `(student, class)`, statuses PRESENT/ABSENT/LATE/HALF_DAY/LEAVE/EXCUSED, defaults to ABSENT if never marked) → `AttendanceAlert`, `AttendanceCorrection` (dispute workflow), `AttendanceGoal` (personal target), `AttendancePolicy` (threshold config, cascades batch → course → global default 75%/65%).

**Percentage** = present ÷ every marked record (LATE/HALF_DAY/LEAVE/EXCUSED count against the denominator, never toward the numerator). Risk: HEALTHY (≥75%) / AT_RISK (≥65%) / CRITICAL, from the effective policy.

### Admin/Trainer workflow (`admin/attendance`, tabs: Today, Mark Attendance, Batch Overview, Analytics, Alerts, History, Corrections)
1. **Today tab** (command-center dashboard): today's class count, average attendance, count below threshold, critical count, unmarked-past-classes count — a live "what needs attention today" summary.
2. **Mark Attendance**: load a class's sheet (unmarked students default to ABSENT), bulk-mark, "Copy Previous Attendance" (only pulls from the batch's most recently **completed** class), save as draft (`submit=false`) or finalize (`submit=true`, flips class to COMPLETED).
3. Any past record can still be directly edited (`PUT /admin/attendance/{id}`) with **no date-lock** — this bypasses the formal correction workflow entirely.
4. **Alerts**: admin-triggered on demand (`POST /alerts/generate?threshold=`), not automatic — scans students below threshold (minimum 3 marked classes to qualify) and notifies them.
5. **Corrections**: review a student's dispute, approve (overwrites the record) or reject — student is notified either way.
6. **Gap**: `AttendancePolicy` (per-batch/course threshold override) is fully implemented server-side, but **no admin UI screen calls it** — thresholds are effectively fixed at the 75/65 defaults in practice.

### Student workflow (`student/attendance`)
1. **Calendar/list toggle** — a month-grid calendar (`AttendanceCalendar`) color-codes each day's status, click-through to a day's class detail.
2. **Health card** — current %, previous %, delta, risk level.
3. **Goal tracker** — set a personal target %, see classes still needed.
4. **Correction requests** — dispute a specific record with a reason/evidence; can't dispute another student's record (403), can't have two pending disputes on the same record (409), can't re-review an already-decided one (400).

Note: the student-side attendance calendar is a distinct feature from the Announcements module's own calendar view (§8) — they show different data and live on different pages.

---

## 7. Placement (roles: Admin manages drives/applicants, Student expresses interest)

### Data model
`Drive` (company/role/package/eligibility: minCgpa, minPercentage, maxBacklogs, minAttendancePct, eligible batches/courses; status UPCOMING/ACTIVE/CLOSED/CANCELLED) → `DriveApplication` (unique per student+drive) → `DriveApplicationStatusHistory` (audit trail of every status change) → `ResumeData` (Resume Builder's JSON, separate from an uploaded resume PDF).

**Status pipeline** (enforced server-side, illegal jumps rejected with 400):
```
INTERESTED → UNDER_REVIEW → SHORTLISTED → RESUME_SHARED → SELECTED | NOT_SELECTED
UNDER_REVIEW → REJECTED
SHORTLISTED → REJECTED
```

**This module's admin-side applicant pipeline is now fully functional** — a previous major gap (no way to view a drive's applicants or change their status) has been fixed. Admin can list a drive's applicants and progress/reject their status (`GET/PATCH /admin/drives/{id}/applications[/{appId}]`), with every transition notifying the student and recorded in the history table (`GET .../history`).

### Admin workflow
1. Create a `Drive` with eligibility rules via **`admin/placement`**.
2. Manage the drive's own lifecycle (`PATCH /admin/drives/{id}/status`).
3. View/manage its applicant list, progress statuses (the UI's status dropdown doesn't pre-filter to only legal next states, but the server rejects illegal picks with a 400, so no silent corruption occurs).

### Student workflow
1. Browse drives at **`student/placement`** — each shows a server-computed `isEligible` + human-readable ineligibility reasons.
2. **"Express Interest" is the only application action** — students never apply directly; there's no separate "apply" endpoint.
3. Resume Builder (`GET/PUT /student/resume`, freeform JSON) is separate from uploading an actual resume file (`POST /student/resume-file`, PDF ≤10MB) — neither is tied to a specific application.
4. Track application status inline on the drives list.

### Business rules
- Eligibility and **deadline** are both re-validated server-side at interest-expression time (403 past `applyDeadline`, or on a CLOSED/CANCELLED drive) — deadline enforcement is a new server-side check, previously UI-only.
- Duplicate applications blocked (409 + DB unique constraint).
- `minAttendancePct` remains **modeled but explicitly not enforced** — the code's own comment states attendance-based eligibility isn't wired up yet.

### ⚠️ Confirmed still-broken feature: Mock Interviews
The frontend calls `/admin/mock-interviews`, `/student/mock-interviews`, `/student/mock-analytics`, and these paths are even role-gated in `SecurityConfig`, but **no controller, service, or entity implements any of them anywhere in the backend** — these calls will 404. (Separately, `/admin/interview-questions` and `/student/interview-prep` **are** real — a static Q&A bank in the `quiz` package, unrelated to drives/applications.)

---

## 8. Announcements (roles: Admin authors/approves, Student views/acknowledges)

**This entire module is now fully implemented backend-to-frontend** — previously it did not exist server-side at all; that gap is completely closed.

### Data model
`Announcement` (title, body, batch/college/course targeting or rule-based audience targeting e.g. "attendance below X%", status DRAFT→PENDING_APPROVAL→SCHEDULED→PUBLISHED→EXPIRED, priority LOW/NORMAL/HIGH/CRITICAL, category GENERAL/URGENT/PLACEMENT/EXAM/HOLIDAY/ATTENDANCE, pinning, expiry, `requiresAcknowledgment`, `allowComments`) plus `AnnouncementAcknowledgment`, `AnnouncementView` (read tracking), `AnnouncementComment`, `AnnouncementVersion` (edit history), `AnnouncementTemplate`.

### Admin workflow (`admin/announcements`)
1. Draft an announcement, optionally submit it for approval (another admin approves/rejects — approving with a future `scheduledAt` lands it in SCHEDULED rather than publishing immediately).
2. Publish immediately or schedule — **a real background job** (`AnnouncementSchedulerService`, runs every 60s) auto-publishes due scheduled announcements, and a separate 5-minute sweep flips expired published ones to EXPIRED. This is the one genuine scheduled/cron job in the whole backend.
3. View per-announcement analytics: targeted/viewed/unread/acknowledged/pending-acknowledgment counts and rates.
4. Reuse announcement templates (CRUD + "apply template" with variable substitution), duplicate an existing announcement, view its full edit-history log.

### Student workflow (`student/announcements`)
1. See announcements filtered to their audience (batch/college/course/rule-based), with placeholders resolved per-student (e.g. `{{studentName}}`).
2. List view or **calendar view** — a month grid dotting days an announcement was published or expires; this calendar is generated client-side from the already-fetched announcement list (no separate calendar endpoint), and is a **different feature** from the Attendance module's own calendar (§6).
3. **Acknowledge** an announcement flagged `requiresAcknowledgment` (one-time; a second attempt is rejected) — this is the "acknowledgement feature" from recent development.
4. Comment on announcements that allow it (if enabled).

---

## 9. Notifications (in-app only, all roles)

Single `Notification` entity (title, body, type, read flag, optional deep-link) — delivery remains **in-app only, no email/SMS anywhere in the codebase**. Fan-out helpers (`notifyUser`, `notifyBatch`, `notifyAllStudents`, `notifyAdmins`) are called from other modules.

**Confirmed trigger points today**: assignment published → notify batch; submission graded → notify student; student submits → notify admins; attendance correction reviewed → notify student; low-attendance alert generated → notify student; **every placement application status change → notify student, and expressing interest → notify admins** (this is new — previously placement triggered no notifications at all); **announcement published → notify its audience** (also new).

**Confirmed still-missing**: quiz events (publish, grade, results release) never trigger a notification, despite the machinery existing for other modules.

---

## 10. Reports & Dashboards (role: Admin — students get their own dashboard, not the Reports page)

**Reports** (`admin/reports`, ~20 endpoints): attendance, performance (per-student and aggregate), at-risk/declining students, placement readiness, batch health, quiz/assignment analytics, engagement, activity trend, leaderboards, correlations (explicitly non-causal), and CSV export (returned as JSON — the **frontend** converts it to a downloadable file client-side). Everything is still computed live on each request, no caching.

**Admin Dashboard** (`admin/dashboard`) is tightly integrated with the Report/Attendance/Quiz services — it computes the full performance report once per load and reuses it for both the overview stats and the performance widget (this used to be computed twice; see the performance-fix work earlier in this project). Shows: overview counts, performance, attendance, assignments, quizzes, placement, upcoming sessions, recent activity feed.

**Student Dashboard** (`student/dashboard`) assembles: overview, "continue learning" (first uncompleted module/topic/session per enrollment), today's tasks (pending assignments + available quizzes + upcoming classes), performance, attendance health, gamification (XP/streak/achievements/daily challenge/leaderboard/weak areas), placement snapshot, and upcoming classes.

---

## Summary Table — Current Known Gaps (all other previously-documented gaps are now fixed)

| Area | Gap |
|---|---|
| Auth | Forgot/reset password, logout, logout-all — no backend routes; a JWT can't be server-side revoked |
| Roles | SUPERADMIN/TRAINER exist as enum values and in frontend UI, but no account is ever assigned them and no authorization rule treats them differently from ADMIN |
| Courses (admin) | `admin/courses` page's Materials/Syllabus/Sessions panels call nonexistent endpoints — use `admin/course-catalog` instead |
| Courses (student) | `student/courses` page's course list calls a nonexistent endpoint — use `student/course-catalog`/`student/my-courses` instead |
| Quiz | Per-quiz leaderboard/results pages are orphaned (no backend endpoint, no in-app link to them) — harmless, cross-quiz leaderboard works fine |
| Quiz | Quiz events (publish/grade/results-release) never send a notification |
| Placement | Mock interview scheduling/analytics pages exist in the frontend with role-gated routes, but no backend implementation at all — will 404 |
| Placement | `minAttendancePct` eligibility criterion is modeled but not enforced |
| Attendance | No date-lock on directly editing old records outside the correction workflow; `AttendancePolicy` threshold overrides have no admin UI to set them |
| Announcements | A `SystemAnnouncementService` helper exists but is never called from any event — dead scaffolding for a future auto-announcement trigger |

These are worth prioritizing if the next phase of work is "close remaining gaps" rather than "add new features."
