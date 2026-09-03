# CareerLabs LMS

CareerLabs LMS is an enterprise-grade Learning Management System featuring a high-performance **Java 21 Spring Boot** backend, **Next.js 14** web application, and **PostgreSQL** database. The platform supports a comprehensive **Student Learning Portal**, a full-featured **Admin & Management Console**, and role-based access for **Super Admins**, **Admins**, **Trainers**, and **Students**.

---

## 🛠️ Technology Stack

| Layer | Technology | Port / Base URL |
|---|---|---|
| **Primary Backend API** | Java 21 + Spring Boot 3 + Spring Security + JPA/Hibernate | `http://localhost:7000/api` |
| **Frontend Web App** | Next.js 14 (App Router) + React 18 + Vanilla CSS / Tailwind CSS + Recharts | `http://localhost:3040` |
| **Database** | PostgreSQL 16+ | `localhost:5432` (`careerlabs_lms`) |
| **Mail Service** | MailHog / SMTP | `localhost:1025` |

---

## 🚀 Quick Start Guide

### 1. Backend Service (`api`)

Ensure Java 21 SDK, Maven, and PostgreSQL are installed. Configure environment variables in `api/.env`:

```env
SERVER_PORT=7000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=careerlabs_lms
DB_USERNAME=postgres
DB_PASSWORD=yourpassword
JWT_SECRET=your_long_64_byte_hex_jwt_secret
CORS_ALLOWED_ORIGINS=http://localhost:3040
JPA_DDL_AUTO=update
```

Start the Spring Boot application:

```bash
cd api
mvn spring-boot:run
```

*The API will start on port `7000`.*

---

### 2. Frontend Application (`frontend`)

Configure environment variables in `frontend/.env.local`:

```env
NEXT_PUBLIC_JAVA_API_URL=http://localhost:7000/api
```

Install dependencies and start the development server:

```bash
cd frontend
npm install
npm run dev
```

*The web client will be available at `http://localhost:3040`.*

---

## 🔑 Demo System Credentials

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Super Admin** | `superadmin@careerlabs.com` | `ChangeMe123!` | Full System Administration |
| **Admin** | `admin@careerlabs.com` | `ChangeMe123!` | Management Console (Students, Batches, Courses, Colleges, Reports) |
| **Trainer** | `trainer@careerlabs.com` | `ChangeMe123!` | Management Console (Assigned Batches, Courses, Syllabus, Assignments, Attendance) |
| **Student** | `student@careerlabs.com` | `ChangeMe123!` | Student Learning Portal |

---

## 💻 Core Modules Breakdown

### 🎓 1. Student Portal (`/student/*`)
- **Dashboard**: Real-time course progress overview, daily schedule, attendance health indicator, streak/XP gamification, and upcoming live sessions.
- **My Courses & Syllabus**: Interactive course syllabus breakdown, session materials, and video streaming.
- **Recorded Sessions**: Secure HLS video streaming (`.m3u8`) with short-lived playback tokens.
- **Attendance Hub**: Monthly attendance calendar, health score, attendance goal tracker, deficit calculation, and correction request submission.
- **Assignments & Submissions**: Active assignment lists, file attachment previews, and multipart submission uploads.
- **Quizzes & Leaderboards**: Timed MCQ quiz player, score breakdown, performance analytics, weak area identification, and class leaderboards.
- **Placement Hub**: Placement status updates (`SEEKING`, `INTERVIEWING`, `PLACED`, `NOT_SEEKING`), Resume Builder with live preview/PDF export, resume file upload, and company drive interest submission.
- **Announcements & Notifications**: Real-time notification updates, unread counters, and broadcast announcements.

### 🛡️ 2. Admin & Management Console (`/admin/*`)
- **Executive Dashboard**: System-wide statistics (student counts, batch metrics, enrollment analytics).
- **Student Management**: Student onboarding modal, batch assignment, profile editing, status activation/deactivation, CSV data export, and academic details management.
- **Trainer Management**: Trainer account creation (`/api/trainers`), profile management, batch assignments, and active/inactive status toggle.
- **Academic History Management**: Student academic records (10th, 12th, Diploma, UG, PG) for placement eligibility verification.
- **Batch & Course Operations**: Batch creation, capacity enforcement, timing/mode controls, syllabus hierarchy setup (Modules $\rightarrow$ Topics $\rightarrow$ Sessions), and material attachments.
- **Attendance System**: Class attendance matrix, heatmap analytics, low-attendance alerts, draft auto-saving, and student correction request approvals.
- **Assignment & Quiz Control**: Assignment creation, student submission grading, quiz creation with custom question banks, and result leaderboards.
- **Company Drives & Placement**: Drive creation, applicant status tracking (`INTERESTED`, `SHORTLISTED`, `RESUME_SHARED`, `SELECTED`), and mock interview scheduling.
- **Announcements Engine**: Template-driven broadcasts, approval workflows, placeholder previews, and comment feeds.

---

## 🔒 Security & Authorization

- **Authentication**: Stateless JWT Bearer token authentication with password hashing using `BCryptPasswordEncoder`.
- **Password Reset & OTP**: Email-based 6-digit OTP verification flow for secure password resets (`/api/auth/forgot-password`, `/api/auth/verify-otp`, `/api/auth/reset-password`).
- **Role-Based Access Control (RBAC)**:
  - `SUPERADMIN` & `ADMIN`: Full administrative control across student management, trainer management, college directory, placement drives, and reporting.
  - `TRAINER`: Administrative control over assigned courses, batches, assignments, grading, syllabus content, and attendance marking (`ADMIN_ROLES = ['SUPERADMIN', 'ADMIN', 'TRAINER']`).
  - `STUDENT`: Self-service portal access for assigned courses, attendance, submissions, quizzes, and placement drives.
- **Static Assets & Video Security**: Uploaded files framed via same-origin policy, and recorded session videos streamed via short-lived playback tokens.

---

## 📡 Key API Endpoints

| Endpoint Pattern | Access Level | Description |
|---|---|---|
| `POST /api/auth/login` | Public | Authenticate user and issue JWT token |
| `POST /api/auth/forgot-password` | Public | Request password reset OTP email |
| `POST /api/auth/verify-otp` | Public | Verify 6-digit password reset OTP |
| `POST /api/auth/reset-password` | Public | Reset account password with OTP |
| `GET /api/student/dashboard` | `STUDENT` | Fetch aggregated student dashboard data |
| `GET/POST /api/student/assignments` | `STUDENT` | Retrieve assignments & upload submissions |
| `GET /api/student/attendance` | `STUDENT` | Fetch monthly attendance calendar & summary |
| `GET /api/student/drives` | `STUDENT` | List active placement drives & express interest |
| `GET /api/students` | `ADMIN`, `SUPERADMIN` | Paginated student list with search & filters |
| `POST /api/students` | `ADMIN`, `SUPERADMIN` | Create new student profile & account |
| `GET /api/trainers` | `ADMIN`, `SUPERADMIN` | Paginated trainer directory with search & status filters |
| `POST /api/trainers` | `ADMIN`, `SUPERADMIN` | Create new trainer profile & account |
| `PUT /api/trainers/{id}` | `ADMIN`, `SUPERADMIN` | Update trainer profile & batch assignments |
| `PATCH /api/trainers/{id}/status` | `ADMIN`, `SUPERADMIN` | Toggle trainer active/inactive status |
| `POST /api/batches` | `ADMIN`, `SUPERADMIN`, `TRAINER` | Create batch & assign lead trainer |

---

## 🛠️ Project Directory Structure

```
lms-aug-24/
├── api/                    # Primary Backend (Java 21, Spring Boot 3, Maven)
│   └── src/main/java/com/careerlabs/lms/api/
│       ├── academic/       # Student Academic Details & Eligibility
│       ├── announcement/   # Broadcast Announcements Engine
│       ├── assignment/     # Assignment Creation & Submission Grading
│       ├── attendance/     # Attendance Tracking, Alerts & Corrections
│       ├── auth/           # Authentication, JWT & Password Reset OTP
│       ├── batch/          # Batch Management & Trainer Assignments
│       ├── college/        # College Directory
│       ├── config/         # SecurityConfig, WebConfig, CORS
│       ├── course/         # Course Catalog & Enrollment
│       ├── dashboard/      # Aggregated Dashboard Controllers
│       ├── material/       # Course Learning Materials & Files
│       ├── notification/   # Notification Engine
│       ├── placement/      # Placement Drives, Applications & Resumes
│       ├── quiz/           # Quiz Engine, Questions & Leaderboards
│       ├── recordedsession/# Secure HLS Video Streaming & Access Tokens
│       ├── session/        # Live Class Sessions & Timetables
│       ├── student/        # Admin Student Management Service
│       ├── syllabus/       # Syllabus Modules & Topics Hierarchy
│       ├── trainer/        # Admin Trainer Management Service
│       └── user/           # User Entity & Role Enum (SUPERADMIN, ADMIN, TRAINER, STUDENT)
├── frontend/               # Web Frontend Application (Next.js 14 App Router)
│   └── src/
│       ├── app/            # (admin), (student), (auth) Page Routes
│       ├── components/     # Layouts (AdminShell), Modals, Forms & Components
│       ├── context/        # AuthContext & State Providers
│       ├── hooks/          # Custom Data Fetching Hooks
│       ├── lib/            # Axios Instance & API Config (`api.js`)
│       ├── services/       # Service Layer (`studentService.js`, `trainerService.js`, etc.)
│       └── validations/    # Zod Form Validation Schemas
├── docs/                   # System Documentation & Module Workflows
└── README.md               # Main Project Documentation
```
