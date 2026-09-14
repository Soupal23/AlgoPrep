# AlgoPrep

> AlgoPrep is a comprehensive computer-based testing platform designed specifically for computer science students and educators. It enables users to take proctored, time-bound technical assessments while leveraging AI to generate customized practice tests directly from syllabus documents.

![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=flat&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Framework-Express-000000?style=flat&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![Gemini API](https://img.shields.io/badge/AI-Gemini-4285F4?style=flat&logo=googlegemini&logoColor=white)

## Overview
This platform serves as a vital bridge between academic learning and technical interviews, helping computer science candidates identify their weak areas through detailed analytics and personalized AI revision plans. By providing a realistic, proctored test environment with strict time limits, it helps students build confidence and improve their problem-solving speed under pressure. For educators and recruiters, AlgoPrep offers a secure, reliable, and automated way to evaluate a candidate's core computer science fundamentals.

## ✨ Key Features (Built for Scale & Integrity)

- 🤖 **AI-Powered Test Generation**: Integrates the Gemini API to parse uploaded syllabus PDFs and synthesize customized, strict JSON-schema validated practice exams. Includes automatic repair retries and user-keyed rate limiting.
- 🔒 **Proctored Anti-Cheat System**: Utilizes the browser Visibility API to detect tab-switching and focus loss, reporting anomalies directly to the server to maintain test integrity.
- ⏱️ **Server-Authoritative Test Engine**: Features a zero-trust architecture with a server-side countdown timer and **monotonic version locking** to prevent race conditions or out-of-order save data corruption during active attempts.
- 📊 **Advanced Analytics & AI Revision**: Provides detailed scorecards (percentiles, accuracy) and a personalized, AI-generated 3-step study recommendation plan based on the candidate's incorrect answers.
- 🏆 **High-Performance Leaderboards**: Employs complex MongoDB aggregation pipelines (`$setWindowFields`) to calculate global and per-test rankings, including multi-field tie-breaker rules.
- 🧑‍🏫 **Educator Hiring Pipeline**: A dedicated, streamlined workflow for recruiting, evaluating, and onboarding teachers applying to join the AlgoPrep platform.

---

## 📸 Application Screenshots

*(Replace the placeholder links with your actual screenshot paths once you take them)*

### 🎓 Student Portal
| Dashboard | Test Interface |
| :---: | :---: |
| ![Student Dashboard](./docs/screenshots/student-dashboard.png) | ![Test Taking](./docs/screenshots/test-taking.png) |
| **Leaderboard** | **Analytics & AI Revision** |
| ![Leaderboard](./docs/screenshots/leaderboard.png) | ![Analytics](./docs/screenshots/analytics.png) |

### 🧑‍🏫 Teacher Portal
| Educator Dashboard | Syllabus Upload (AI Gen) |
| :---: | :---: |
| ![Teacher Dashboard](./docs/screenshots/teacher-dashboard.png) | ![Syllabus AI](./docs/screenshots/syllabus-ai.png) |
| **Test Management** | **Candidate Analytics** |
| ![Test Management](./docs/screenshots/test-management.png) | ![Candidate Analytics](./docs/screenshots/candidate-analytics.png) |

### 🛡️ Admin Portal & Hiring
| Admin Dashboard | Hiring Pipeline Workflow |
| :---: | :---: |
| ![Admin Dashboard](./docs/screenshots/admin-dashboard.png) | ![Hiring Pipeline](./docs/screenshots/hiring-pipeline.png) |
| **User Management** | **System Configuration** |
| ![User Management](./docs/screenshots/user-management.png) | ![System Logs](./docs/screenshots/system-config.png) |

---

## 🏗️ System Architecture & System Design

AlgoPrep employs a robust, zero-trust Client-Server architecture designed for high availability and strict data integrity during live exams. Below is the visual workflow mapping how our React frontend portals, Node.js backend micro-services, MongoDB aggregation pipelines, and the Gemini AI engine interact in real-time.

```mermaid
graph TD
    %% User Roles
    subgraph "Frontend Layer (React / Vite)"
        S["🎓 Student"]
        T["🧑‍🏫 Teacher"]
        A["🛡️ Admin"]
        
        SP["Student Portal<br/>(Test Engine, Analytics)"]
        TP["Teacher Portal<br/>(Syllabus Upload, Hiring)"]
        AP["Admin Portal<br/>(User Mgmt, System Config)"]
        
        S ---> SP
        T ---> TP
        A ---> AP
    end

    %% Backend API Gateway
    subgraph "Backend API Layer (Node.js / Express)"
        API["API Gateway & Auth Router<br/>(JWT Access/Refresh)"]
        
        SP --- REST Requests ---> API
        TP --- REST Requests ---> API
        AP --- REST Requests ---> API
        
        subgraph "Core Micro-Services (Controllers)"
            CBT["CBT Engine<br/>(Server Timer, Grading, Locks)"]
            AI["AI Generator<br/>(Multer Parsing, Zod Validation)"]
            LBD["Leaderboard Engine<br/>($setWindowFields Aggregation)"]
            PROC["Proctoring Service<br/>(Visibility API, Anti-Cheat)"]
            HR["Hiring Pipeline<br/>(Teacher Applications)"]
        end
        
        API ---> CBT
        API ---> AI
        API ---> LBD
        API ---> PROC
        API ---> HR
    end

    %% External Services
    subgraph "External AI Service"
        GEMINI["Google Gemini API<br/>(@google/genai)"]
    end
    AI --- Extracted Syllabus Text / Prompt ---> GEMINI
    GEMINI --- Strict JSON Schema ---> AI

    %% Database Layer
    subgraph "Database Layer (MongoDB)"
        DB[("MongoDB Database")]
        CBT --- Monotonic Version Updates ---> DB
        AI --- Stores Generated Tests ---> DB
        LBD --- Aggregation Queries ---> DB
        PROC --- Saves Audit Logs ---> DB
        HR --- Application Statuses ---> DB
    end
```
