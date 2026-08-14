# AlgoPrep — Technical Architecture & Interview Preparation Guide

> **Production-Grade Computer Science Online Test & Assessment Platform (Computer-Based Test Engine)**

This guide provides an exhaustive engineering deep dive into the architecture, design choices, data modeling, concurrency mechanisms, security measures, and algorithmic trade-offs of the **AlgoPrep** platform. It is structured specifically to help engineers articulate decisions during System Design and Full-Stack Engineering interviews.

---

## 1. Monorepo Architecture & Technology Stack

### Tech Stack Overview
- **Frontend**: React (Vite, JavaScript/JSX), Tailwind CSS (Dark Mode Glassmorphism), Lucide Icons, Recharts.
- **Backend**: Node.js LTS (Express.js, JavaScript/ES Modules), Multer (PDF/Text uploads up to 5MB), `@google/genai` (Gemini AI API), Zod (JSON validation).
- **Database**: MongoDB & Mongoose Object Data Modeling (ODM) with automatic fallback to `mongodb-memory-server` in non-production/testing environments.
- **Security & Authentication**: Dual JWT architecture (Access + Refresh tokens with HTTP Bearer headers), bcryptjs password hashing.
- **Test Framework**: Vitest & Supertest (Integration and unit test coverage).

---

## 2. CBT Test Taking & State Synchronization Engine

### State Machine Architecture
During an active assessment, a candidate's test state transitions through 5 distinct question palette states:

```
┌──────────────┐     Select Option     ┌───────────────┐
│ Unattempted  │ ─────────────────────►│   Answered    │
└──────┬───────┘                       └───────┬───────┘
       │                                       │
       │ Mark for Review                       │ Mark for Review & Answered
       ▼                                       ▼
┌──────────────┐                       ┌───────────────┐
│  Marked for  │                       │   Marked &    │
│    Review    │                       │   Answered    │
└──────────────┘                       └───────────────┘
```

The 5 palette states tracked per question in `Attempt.questionStates` are:
1. `unattempted` (Gray default)
2. `answered` (Emerald Green)
3. `marked-review` (Purple / Amber)
4. `marked-answered` (Purple with Green badge)
5. `current` (Cyan active border outline)

---

### Monotonic Version Lock Protocol (`PATCH /api/attempts/:id/progress`)

#### The Problem: Out-of-Order Network Jitter Overwrites
During a live 30-minute exam, auto-saves trigger on option selection and background intervals (e.g. every 10 seconds). In real-world cellular or high-latency Wi-Fi networks, HTTP request `Request #1 (v=5)` sent at `t=0s` might arrive *after* `Request #2 (v=6)` sent at `t=2s`. If unhandled, the stale payload `v=5` overwrites `v=6` on disk, causing candidate data loss.

#### The Solution: Optimistic Version Locking
1. The client maintains an incrementing integer `lastSavedVersion` in local React state.
2. Every progress update payload includes the client version `v`.
3. The server compares incoming `v` against `Attempt.lastSavedVersion`:
   - If `v > attempt.lastSavedVersion`, update MongoDB document and set `lastSavedVersion = v`.
   - If `v <= attempt.lastSavedVersion`, return HTTP 200 with `{ success: false, reason: 'stale_version' }` without mutating database state.

---

### Server-Authoritative Timer & Grace Period

#### Why Client Timers Are Insecure
Relying on client-side `setInterval()` or JavaScript clocks is vulnerable to:
- Browser tab suspension / sleep throttling (`requestAnimationFrame` and timers freeze when hidden).
- System clock manipulation by candidates attempting to gain extra time.

#### Implementation Architecture
1. **Creation**: When candidate starts test (`POST /api/tests/:id/start`), server records immutable `startedAt = new Date()`.
2. **Evaluation**: On submission (`POST /api/attempts/:id/submit`), elapsed duration is evaluated server-side:
   $$T_{\text{elapsed}} = \left\lfloor \frac{T_{\text{server\_now}} - T_{\text{startedAt}}}{1000} \right\rfloor$$
3. **Grace Period**: Server allows a **60-second network latency buffer** over `test.timeLimitMinutes * 60`.
   - If $T_{\text{elapsed}} \le (T_{\text{limit}} \times 60 + 60)$, test marks `status = 'submitted'`.
   - If $T_{\text{elapsed}} > (T_{\text{limit}} \times 60 + 60)$, server auto-expires attempt (`status = 'expired'`).

---

## 3. Security & Anti-Cheat Proctoring Architecture

### Answer Key Masking (DevTools Prevention)
During test-taking (`GET /api/tests/:id` and `POST /api/tests/:id/start`), candidate client devices MUST NOT receive answer keys or explanations.
- **Implementation**: Mongoose queries explicitly exclude sensitive fields:
  ```js
  const test = await Test.findById(id).select('-correctOptionIndex -explanation');
  ```
- **Interview Key Point**: Prevents tech-savvy candidates from opening Chrome DevTools Network Tab or inspecting React State to discover answer keys (`correctOptionIndex`).

### Tab-Switch Proctoring (Visibility API)
- Client listens to `document.visibilityState === 'hidden'`.
- Triggers alert modal, increments local warning count, and immediately sends background beacon (`PATCH /api/attempts/:id/progress`) with timestamped event payload `{ timestamp: new Date() }`.
- Server pushes audit record into `Attempt.tabSwitchEvents` array and increments `tabSwitches` counter.

---

## 4. AI Syllabus-to-Test Generator (`POST /api/ai/generate`)

### PDF/Text Upload Parsing Pipeline
- **Multer Filter ([upload.js](file:///c:/Users/DELL/Desktop/AlgoPrep/server/src/middleware/upload.js))**: Capped at **5MB** file size limit. Rejects unsupported mimetypes (`image/png`, `.exe`) with `400 Bad Request`.
- **Text Extractor ([fileExtractor.js](file:///c:/Users/DELL/Desktop/AlgoPrep/server/src/utils/fileExtractor.js))**: Extracts raw text using `pdf-parse` for PDFs or UTF-8 string decoding for text files.
- **8,000-Character Truncation Cap**: Truncates extracted text to the top 8,000 characters to prevent payload buffer overflow and token budget exhaustion.

### User-ID Keyed Rate Limiting
- **Why User ID over IP?**: IP-based rate limiting fails on campus Wi-Fi / office networks where hundreds of candidates share a NAT gateway IP.
- **Implementation ([rateLimiter.js](file:///c:/Users/DELL/Desktop/AlgoPrep/server/src/middleware/rateLimiter.js))**: Keyed by authenticated JWT User ID (`req.user.userId`). Restricts users to **5 test generation calls per hour**. Excess calls return `429 Too Many Requests`.

### Gemini Prompting & Zod Schema Validation
1. **Prompt Engineering**: Invokes `@google/genai` (`gemini-2.5-flash`) with structured system prompt requiring strictly valid JSON matching:
   - `title`, `description`, `topic`, `timeLimitMinutes: 30`, `markingScheme: { correct: 4, incorrect: -1 }`, `questions: [{ order, questionText, options (4 strings), correctOptionIndex (0-3), explanation }]`.
2. **Zod Validation & 1-Time Retry**:
   - Parses response against `aiGeneratedTestSchema`.
   - If validation fails, issues a single repair retry prompt appending validation error logs.
3. **Fallback Engine**: On API key absence or network failure, falls back to a rule-based AI generator, guaranteeing test environment stability.

---

## 5. Analytics, Leaderboard & Aggregation Pipelines

### MongoDB Aggregation Pipeline Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Stage 1: $match│────►│  Stage 2: $sort │────►│Stage 3:              │────►│  Stage 4: $facet│
│ (Filter Submitted│    │ (Score DESC,    │     │$setWindowFields      │     │ (Pagination &   │
│   Attempts)     │     │ Time ASC)       │     │($documentNumber Rank)│     │  User Stats)    │
└─────────────────┘     └─────────────────┘     └──────────────────────┘     └─────────────────┘
```

#### Multi-Field Tie-Breaking Strategy
When two candidates achieve identical test scores, the candidate who completed the assessment faster ranks higher.
- **Sort Order**: `{ score: -1, timeSpentSeconds: 1 }`
- **Rank Assignment**: `$setWindowFields` assigns dense ranks using `$documentNumber` over the pre-sorted stream.

#### Index Optimization vs Sort Complexity
- **Index Optimization**: An index on `Attempt.score` (`{ score: -1 }`) accelerates the Stage 1 `$match` filtering stage.
- **Interview Distinction**: Clarify to interviewers that while the index speeds up filtering, sorting over matched documents remains $O(N \log N)$ over the matched result set size $N$.

#### Percentile Formula
$$\text{Percentile} = \max\left(0, \min\left(100, \frac{N - R}{N - 1} \times 100\right)\right)$$
Where $N$ is total participants and $R$ is candidate rank.

---

## 6. Frequently Asked Interview Questions & Sample Responses

### Q1: How do you prevent out-of-order auto-save requests from overwriting data in your CBT engine?
> **Answer**: "We implemented an optimistic monotonic version locking scheme in `PATCH /api/attempts/:id/progress`. Each save payload includes a client-side integer version counter `v`. The server compares `v` against `Attempt.lastSavedVersion` stored in MongoDB. If `v <= lastSavedVersion`, the server rejects the patch with `{ success: false, reason: 'stale_version' }` without mutating the database, guaranteeing network jitter cannot overwrite newer progress."

### Q2: Why did you use `req.user.userId` instead of IP address for rate limiting the AI generator?
> **Answer**: "IP-based rate limiting breaks down when candidates take exams on shared networks such as university campuses, libraries, or corporate Wi-Fi sharing a single public NAT IP address. By keying our rate limiter map by authenticated User ID (`req.user.userId`), we enforce strict per-student quotas (5 requests/hour) without penalizing peers on the same network."

### Q3: How do you prevent candidates from discovering answer keys via DevTools?
> **Answer**: "We enforce strict security at the API projection layer. During active test attempts, endpoints (`GET /api/tests/:id` and `POST /api/tests/:id/start`) project out sensitive data using Mongoose `.select('-correctOptionIndex -explanation')`. Answer keys and inline explanations are only sent to the client after formal test submission via `GET /api/attempts/:id/review`."

### Q4: How does your leaderboard scale as the number of test attempts grows to millions?
> **Answer**: "We utilize a 4-stage MongoDB aggregation pipeline (`$match` $\rightarrow$ `$sort` $\rightarrow$ `$setWindowFields` $\rightarrow$ `$facet`). We place a compound index on `{ testId: 1, status: 1, score: -1 }` which allows MongoDB to filter submitted attempts instantly during `$match`. For massive multi-million attempt scales, we would pre-aggregate leaderboard rankings asynchronously using change streams or scheduled background workers into a Redis Sorted Set (`ZADD` / `ZREVRANGE`)."

---

## 7. Verification & Test Suite Summary

- **Total Integration Tests**: 19 passed across 5 test suites.
  - `auth.test.js`: 6 tests passed (JWT registration, login, refresh, security).
  - `scoring.test.js`: 2 tests passed (+4 / -1 grading math, accuracy calculations).
  - `progress.test.js`: 6 tests passed (Monotonic version locking, state transitions, tab switches).
  - `ai.test.js`: 3 tests passed (Multer file type checks, 8k capping, rate limiting).
  - `leaderboard.test.js`: 2 tests passed (Multi-field tie-breaking, percentile math).
