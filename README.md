# AlgoPrep 🚀
> **Production-Grade Computer Science Online Test & Assessment Platform (Computer-Based Test Engine)**

AlgoPrep is a full-stack Computer-Based Test (CBT) platform designed for proctored Computer Science assessments, AI-driven syllabus test generation, detailed analytics, and real-time leaderboard rankings.

---

## 🌟 Key Features

1. **Computer-Based Test (CBT) Engine**:
   - 25 Topic-Wise CS Core Subject Tests (15 MCQs per test, 30-minute attempt limit, +4 / -1 marking scheme).
   - 5-State Question Palette (`unattempted`, `answered`, `marked-review`, `marked-answered`, `current`).
   - Server-Authoritative Countdown Timer with 60-second latency grace period.
   - Monotonic Version Locking (`PATCH /api/attempts/:id/progress`) preventing out-of-order save data corruption.
   - Proctored Anti-Cheat System tracking tab-switch events via Visibility API.
   - Secure Answer Key Masking excluding `correctOptionIndex` during active test attempts.

2. **AI Syllabus-to-Test Generator**:
   - Upload PDF or TXT syllabus files (up to 5MB, top 8,000 characters processed).
   - Gemini AI (`@google/genai` SDK) integration with strict JSON output schema.
   - User-ID Keyed Rate Limiting (5 generations per user per hour).
   - Zod schema validation with automatic single-time repair retry fallback.

3. **Analytics, Review & Leaderboard**:
   - Comprehensive Scorecards: Final Score, Max Score, Accuracy %, Percentile, Time Spent.
   - Question Review with filter pills (**All**, **Correct**, **Incorrect**, **Unattempted**) and inline explanations.
   - AI Targeted Revision Plan generating personalized 3-step study recommendations.
   - Global & Per-Test Leaderboard powered by MongoDB `$setWindowFields` aggregation pipeline.
   - Multi-field tie-breaker rule: equal scores ranked by faster completion time.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite, JavaScript/JSX), Tailwind CSS (Dark Mode), Lucide Icons, Recharts.
- **Backend**: Node.js LTS, Express.js (JavaScript/ESM), Multer (file uploads), `@google/genai` (Gemini SDK), Zod validation.
- **Database**: MongoDB & Mongoose ODM with fallback to `mongodb-memory-server` in testing/dev environments.
- **Authentication**: JWT Access & Refresh token architecture with bcryptjs password hashing.
- **Testing**: Vitest & Supertest.

---

## 📁 Repository Structure

```
AlgoPrep/
├── client/                     # Vite React Frontend
│   ├── src/
│   │   ├── components/        # QuestionPalette, Timer, Modals
│   │   ├── context/           # AuthContext
│   │   ├── pages/             # Dashboard, TestTaking, Results, Leaderboard, Profile, SyllabusAI
│   │   └── services/          # API Client with token auto-refresh
│   └── vite.config.js
│
├── server/                     # Node.js Express Backend
│   ├── src/
│   │   ├── config/            # DB & Env configurations
│   │   ├── controllers/       # Auth, Test, Attempt, AI, Leaderboard controllers
│   │   ├── middleware/        # JWT auth, Zod validation, Multer upload, Rate limiter
│   │   ├── models/            # User, Test, Question, Attempt schemas
│   │   ├── routes/            # Express routers
│   │   ├── seeds/             # 25 CS Topic Tests & 375 MCQs seed data
│   │   └── utils/             # Scoring algorithm, JWT helper, Gemini generator, File extractor
│   └── tests/                 # Vitest integration test suite (19 tests)
│
├── INTERVIEW_PREP.md           # System Design & Technical Interview Preparation Guide
├── README.md                   # Project Documentation
└── package.json                # Root package workspace runner
```

---

## ⚡ Quickstart & Setup Guide

### 1. Prerequisites
- Node.js LTS (v18 or higher)
- npm or pnpm package manager

### 2. Installation
Clone the repository and install dependencies in root, server, and client:

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### 3. Environment Configuration
Create a `.env` file in `/server` (or edit root `.env`):

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/algoprep
JWT_SECRET=algoprep_super_secret_jwt_key_2026
JWT_REFRESH_SECRET=algoprep_super_secret_refresh_key_2026
GEMINI_API_KEY=your_optional_gemini_api_key_here
```

### 4. Database Seeding
Seed 25 topic-wise CS tests (375 MCQs total) and default test user accounts:

```bash
npm run seed
```

*Default Seed Credentials:*
- Student: `student@algoprep.com` / `password123`
- Admin: `admin@algoprep.com` / `password123`

### 5. Running Development Servers Concurrently
Start backend server (port 5000) and Vite frontend dev server (port 5173) concurrently:

```bash
npm run dev
```

Visit application in browser at: `http://localhost:5173`

### 6. Executing Test Suite
Run the full backend Vitest integration test suite:

```bash
npm run test
```

---

## 📡 API Endpoint Reference Table

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/signup` | Register new user account | No |
| `POST` | `/api/auth/login` | Authenticate user & get JWT tokens | No |
| `POST` | `/api/auth/refresh` | Auto-refresh access token | No |
| `GET` | `/api/tests` | Fetch all available CS subject tests | Yes |
| `GET` | `/api/tests/:id` | Fetch test details (masked answer keys) | Yes |
| `POST` | `/api/tests/:id/start` | Start new test attempt & launch server timer | Yes |
| `PATCH` | `/api/attempts/:id/progress` | Monotonic versioned progress auto-save | Yes |
| `POST` | `/api/attempts/:id/submit` | Submit test attempt & calculate final grade | Yes |
| `GET` | `/api/attempts/:id/review` | Question answer key review & explanations | Yes |
| `GET` | `/api/attempts/:id/ai-revision` | Gemini AI personalized revision plan | Yes |
| `GET` | `/api/attempts/user/my-attempts` | Fetch candidate attempted tests history | Yes |
| `POST` | `/api/ai/generate` | Synthesize AI test from PDF/text syllabus | Yes (Rate Limited) |
| `GET` | `/api/leaderboard` | Paginated leaderboard & percentile stats | Yes |

---


