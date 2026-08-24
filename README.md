# CareerLabs LMS

Full-stack Learning Management System for CareerLabs — student learning portal plus admin/trainer control panel.

## Stack

| Layer | Tech | Port |
|---|---|---|
| Backend | Node.js + Express + Prisma | 5040 |
| Frontend | Next.js 14 (App Router) + Tailwind CSS | 3040 |
| Database | PostgreSQL (`careerlabs_lms`) | 5432 |

## Setup

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env          # fill in DATABASE_URL + JWT secrets
npx prisma migrate deploy     # or: npx prisma db push
npx prisma generate
node prisma/seed.js           # seeds demo courses, batches, quizzes, students
npm run dev                   # http://localhost:5040

# 2. Frontend
cd frontend
npm install
cp .env.local.example .env.local
npm run dev                   # http://localhost:3040
```

If the frontend serves 404s for chunks, delete the `.next` cache and restart:
`rm -rf .next && npm run dev`

## Modules

- **Auth** — JWT access (15m) + refresh (7d, HTTP-only cookie), bcrypt, account lockout, OTP password reset, Next.js edge middleware route protection
- **Student** — dashboard, courses + syllabus tracking, attendance calendar, assignments, quizzes, placement hub
- **Admin** — dashboard KPIs, students, batches, courses, attendance marking + analytics, assignment grading, quiz builder, announcements, reports/CSV export
- **Quizzes** — MCQ / aptitude / interview-prep types, timed player, leaderboards
- **Placement** — resume builder, skills tracking, company drives, mock interviews

## API

```
/api/auth/*      login, refresh, forgot-password, reset-password, me
/api/student/*   student endpoints    (role: STUDENT)
/api/admin/*     admin endpoints      (roles: ADMIN, SUPERADMIN, TRAINER)
```

## Notes

- `backend/.env` is gitignored — copy `.env.example` and supply your own secrets.
- Imported media (`backend/storage/`) is gitignored.
