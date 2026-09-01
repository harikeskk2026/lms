# CareerLabs LMS

CareerLabs LMS is an enterprise-grade Learning Management System featuring a high-performance **Java Spring Boot** backend, **Next.js 14** web application, and **PostgreSQL** database. The system serves two main user spaces: a comprehensive **Student Learning Portal** and a full-featured **Admin & Management Console**.

---

## 🛠️ Technology Stack

| Layer | Technology | Port / Base URL |
|---|---|---|
| **Primary Backend API** | Java 21 + Spring Boot 3 + Spring Security + JPA/Hibernate | `http://localhost:7000/api` |
| **Frontend Web App** | Next.js 14 (App Router) + React + Tailwind CSS + Recharts | `http://localhost:3040` (or `3000`) |
| **Database** | PostgreSQL | `localhost:5432` (`lms_db` / `careerlabs_lms`) |
| **Legacy Backend** | Node.js + Express + Prisma *(Transitioned)* | `http://localhost:5040` |

---

## 🚀 Quick Start Guide

### 1. Backend Service (`api`)

Ensure Java 21 and Maven are installed, then configure `.env`:

```bash
cd api
cp .env.example .env
```

Start the Spring Boot application:

```bash
mvn spring-boot:run
```

*The API will start on port `7000`. On initial boot, admin seed data is generated automatically if enabled.*

### 2. Frontend Application (`frontend`)

Configure frontend environment variables:

```bash
cd frontend
cp .env.example .env.local
```

Ensure `NEXT_PUBLIC_JAVA_API_URL=http://localhost:7000/api` is configured in `.env.local`.

Install dependencies and launch dev server:

```bash
npm install
npm run dev
```

*The web client will be available at `http://localhost:3040`.*

---

## 💻 Core Modules Breakdown

### 🎓 1. Student Portal (`/student/*`)
- **Dashboard**: Real-time course progress overview, daily tasks, attendance health indicator, streak/XP gamification, and upcoming live sessions.
- **My Courses & Syllabus**: Interactive course syllabus breakdown, session materials, and video streaming.
- **Recorded Sessions**: Secure HLS video streaming (`.m3u8`) with short-lived playback tokens.
- **Attendance Hub**: Monthly attendance calendar, health score, attendance goal tracker, deficit calculation, and correction request submission.
- **Assignments & Submissions**: Active assignment lists, file attachment previews, and multipart submission uploads.
- **Quizzes & Leaderboards**: Timed MCQ quiz player, score breakdown, performance analytics, weak area identification, and class leaderboards.
- **Placement Hub**: Career launch center, placement status updates (`SEEKING`, `INTERVIEWING`, `PLACED`, `NOT_SEEKING`), Resume Builder with live preview/PDF export, resume file upload, and company drive interest submission.
- **Announcements & Notifications**: Real-time notification updates, unread counters, and broadcast announcements.

### 🛡️ 2. Admin Console (`/admin/*`)
- **Executive Dashboard**: System-wide statistics (student counts, batch metrics, enrollment analytics).
- **Student Management**: Student onboarding modal, batch assignment, profile editing, status activation/deactivation, CSV data export, and academic details management.
- **Academic History Management**: Student academic records (10th, 12th, Diploma, UG, PG) for placement eligibility verification.
- **Batch & Course Operations**: Batch creation, capacity enforcement, timing/mode controls, syllabus hierarchy setup (Modules $\rightarrow$ Topics $\rightarrow$ Sessions), and material attachments.
- **Attendance System**: Class attendance matrix, heatmap analytics, low-attendance alerts, draft auto-saving, and student correction request approvals.
- **Assignment & Quiz Control**: Assignment creation, student submission grading, quiz creation with custom question banks, and result leaderboards.
- **Company Drives & Placement**: Drive creation, applicant status tracking (`INTERESTED`, `SHORTLISTED`, `RESUME_SHARED`, `SELECTED`), and mock interview scheduling.
- **Announcements Engine**: Template-driven broadcasts, approval workflows, placeholder previews, and comment feeds.

---

## 🔒 Security & Authorization

- **Authentication**: Stateless JWT Bearer token authentication with password hashing using `BCryptPasswordEncoder`.
- **Role-Based Access Control (RBAC)**:
  - `/api/students/**` & `/api/admin/**` $\rightarrow$ Restricted to `ROLE_ADMIN`
  - `/api/student/**` $\rightarrow$ Authenticated `ROLE_STUDENT` self-service endpoints
- **Static Assets & Video Security**: Uploaded files framed via same-origin policy, and recorded session videos streamed via short-lived playback tokens.

---

## 📡 API Endpoint Overview

| Endpoint Pattern | Access Level | Description |
|---|---|---|
| `POST /api/auth/login` | Public | Authenticate user and issue JWT token |
| `GET /api/student/dashboard` | `STUDENT` | Fetch aggregated student dashboard data |
| `GET/POST /api/student/assignments` | `STUDENT` | Retrieve assignments & upload submissions |
| `GET /api/student/attendance` | `STUDENT` | Fetch monthly attendance calendar & summary |
| `GET /api/student/drives` | `STUDENT` | List active placement drives & express interest |
| `GET /api/students` | `ADMIN` | Paginated student list with search & filters |
| `POST /api/students` | `ADMIN` | Create new student profile & account |
| `PUT /api/students/{id}` | `ADMIN` | Update student profile and batch assignment |
| `GET/PUT /api/students/{id}/academic-details` | `ADMIN` | Manage student academic history for placement eligibility |

---

## 🛠️ Project Directory Structure

```
lms-aug-24/
├── api/                   # Primary Backend (Java 21, Spring Boot 3, Maven)
│   └── src/main/java/com/careerlabs/lms/api/
│       ├── academic/      # Student Academic Details & Eligibility
│       ├── assignment/    # Assignment Management
│       ├── attendance/    # Attendance Tracking & Corrections
│       ├── auth/          # Authentication & Login Controllers
│       ├── batch/         # Batch Management
│       ├── college/       # College Directory
│       ├── config/        # SecurityConfig, CORS, Beans
│       ├── course/        # Course Catalog & Content
│       ├── dashboard/     # Student & Admin Dashboard Controllers
│       ├── placement/     # Drives, Applications & Resume Upload
│       ├── quiz/          # Quiz Engine & Leaderboards
│       ├── recordedsession/# Secure HLS Video Streaming
│       ├── student/       # Admin Student Management Service
│       └── user/          # User Entity & Roles
├── frontend/              # Web Frontend Application (Next.js 14 App Router)
│   └── src/
│       ├── app/           # (admin) and (student) Page Routes
│       ├── components/    # Layouts, Modals, Forms & UI Components
│       ├── context/       # AuthContext & State Providers
│       ├── hooks/         # Custom Data Fetching Hooks
│       ├── lib/           # Axios Instance & API Services (`api.js`)
│       └── services/      # Service Layer (`studentService.js`, etc.)
└── README.md              # Project Documentation
```

