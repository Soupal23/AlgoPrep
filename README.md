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
