import { Attempt } from '../models/Attempt.js';
import { Test } from '../models/Test.js';
import { Question } from '../models/Question.js';
import { calculateScore } from '../utils/scoring.js';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import mongoose from 'mongoose';

export const saveProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { answers, questionStates, version, tabSwitchEvent } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const attempt = await Attempt.findById(id);

    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }

    if (attempt.userId.toString() !== userId) {
      res.status(403).json({ error: 'Forbidden: You do not own this attempt' });
      return;
    }

    if (attempt.status !== 'in-progress') {
      res.status(400).json({ error: `Cannot update progress for a ${attempt.status} test attempt` });
      return;
    }

    if (typeof version === 'number' && version <= attempt.lastSavedVersion) {
      res.status(200).json({
        success: false,
        reason: 'stale_version',
        message: 'Ignored stale progress payload',
        currentVersion: attempt.lastSavedVersion
      });
      return;
    }

    if (answers && typeof answers === 'object') {
      Object.entries(answers).forEach(([qId, optionIdx]) => {
        if (typeof optionIdx === 'number') {
          attempt.answers.set(qId, optionIdx);
        }
      });
    }

    if (questionStates && typeof questionStates === 'object') {
      Object.entries(questionStates).forEach(([qId, qState]) => {
        if (typeof qState === 'string') {
          attempt.questionStates.set(qId, qState);
        }
      });
    }

    if (typeof version === 'number') {
      attempt.lastSavedVersion = version;
    }

    if (tabSwitchEvent) {
      attempt.tabSwitches += 1;
      attempt.tabSwitchEvents.push({ timestamp: new Date(tabSwitchEvent.timestamp || Date.now()) });
    }

    await attempt.save();

    res.json({
      success: true,
      lastSavedVersion: attempt.lastSavedVersion,
      tabSwitches: attempt.tabSwitches
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save attempt progress' });
  }
};

export const submitAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { answers, questionStates, version } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const attempt = await Attempt.findById(id);

    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }

    if (attempt.userId.toString() !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (attempt.status !== 'in-progress') {
      res.json({
        message: 'Attempt already submitted',
        attempt
      });
      return;
    }

    if (answers && typeof answers === 'object') {
      Object.entries(answers).forEach(([qId, optionIdx]) => {
        if (typeof optionIdx === 'number') {
          attempt.answers.set(qId, optionIdx);
        }
      });
    }

    if (questionStates && typeof questionStates === 'object') {
      Object.entries(questionStates).forEach(([qId, qState]) => {
        if (typeof qState === 'string') {
          attempt.questionStates.set(qId, qState);
        }
      });
    }

    const test = await Test.findById(attempt.testId);
    if (!test) {
      res.status(404).json({ error: 'Associated test not found' });
      return;
    }

    const now = new Date();
    const startTime = new Date(attempt.startedAt).getTime();
    const elapsedSeconds = Math.floor((now.getTime() - startTime) / 1000);
    const maxAllowedSeconds = test.timeLimitMinutes * 60 + 60;

    const actualTimeSpent = Math.min(elapsedSeconds, test.timeLimitMinutes * 60);

    const questions = await Question.find({ testId: test._id });
    const scoringResult = calculateScore(attempt.answers, questions, test.markingScheme);

    attempt.score = scoringResult.score;
    attempt.maxScore = scoringResult.maxScore;
    attempt.accuracy = scoringResult.accuracy;
    attempt.timeSpentSeconds = actualTimeSpent;
    attempt.score = scoringResult.score;
    attempt.maxScore = scoringResult.maxScore;
    attempt.accuracy = scoringResult.accuracy;
    attempt.timeSpentSeconds = actualTimeSpent;
    attempt.status = 'submitted';
    attempt.submittedAt = now;
    if (typeof version === 'number') {
      attempt.lastSavedVersion = version;
    }

    await attempt.save();

    res.json({
      message: 'Test submitted successfully',
      attempt: {
        id: attempt._id,
        testId: attempt.testId,
        testTitle: test.title,
        status: attempt.status,
        score: attempt.score,
        maxScore: attempt.maxScore,
        accuracy: attempt.accuracy,
        timeSpentSeconds: attempt.timeSpentSeconds,
        tabSwitches: attempt.tabSwitches,
        scoringBreakdown: scoringResult,
        submittedAt: attempt.submittedAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit test attempt' });
  }
};

export const getAttemptById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const attempt = await Attempt.findById(id).populate('testId');
    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }

    if (attempt.userId.toString() !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({ attempt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attempt' });
  }
};

export const getUserAttempts = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const attempts = await Attempt.find({ userId, status: 'submitted' })
      .populate('testId', 'title topic timeLimitMinutes totalQuestions markingScheme')
      .sort({ submittedAt: -1 });

    res.json({ attempts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user attempts' });
  }
};

export const getAttemptReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const attempt = await Attempt.findById(id).populate('testId');
    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }

    if (attempt.userId.toString() !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const questions = await Question.find({ testId: attempt.testId._id }).sort({ order: 1 });

    const userAnswers = attempt.answers || new Map();

    const reviewQuestions = questions.map((q) => {
      const qId = q._id.toString();
      const selectedOptionIndex = userAnswers.get ? userAnswers.get(qId) : userAnswers[qId];

      let isCorrect = false;
      let status = 'unattempted';

      if (selectedOptionIndex !== undefined && selectedOptionIndex !== null && selectedOptionIndex >= 0) {
        if (selectedOptionIndex === q.correctOptionIndex) {
          isCorrect = true;
          status = 'correct';
        } else {
          isCorrect = false;
          status = 'incorrect';
        }
      }

      return {
        _id: q._id,
        order: q.order,
        questionText: q.questionText,
        options: q.options,
        selectedOptionIndex: selectedOptionIndex !== undefined ? selectedOptionIndex : null,
        correctOptionIndex: q.correctOptionIndex,
        explanation: q.explanation,
        status,
        isCorrect
      };
    });

    res.json({
      attempt,
      test: attempt.testId,
      questions: reviewQuestions
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch test review' });
  }
};

// Phase 3 & 4 Enhanced: Educational High-Yield AI Revision Plan Generator with Recommended Study Resources
export const getAIRevisionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const attempt = await Attempt.findById(id).populate('testId');
    if (!attempt || attempt.userId.toString() !== userId) {
      res.status(403).json({ error: 'Unauthorized or attempt not found' });
      return;
    }

    const questions = await Question.find({ testId: attempt.testId._id }).sort({ order: 1 });
    const userAnswers = attempt.answers || new Map();

    const missedDetails = [];
    let correctCount = 0;

    questions.forEach((q) => {
      const qId = q._id.toString();
      const selected = userAnswers.get ? userAnswers.get(qId) : userAnswers[qId];

      if (selected === q.correctOptionIndex) {
        correctCount++;
      } else {
        const userChoiceText = (selected !== undefined && selected !== null && selected >= 0)
          ? q.options[selected]
          : 'Unattempted';

        missedDetails.push({
          order: q.order,
          questionText: q.questionText,
          userSelected: userChoiceText,
          correctAnswer: q.options[q.correctOptionIndex],
          explanation: q.explanation
        });
      }
    });

    let revisionPlan = '';

    if (config.geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
        const prompt = `You are a Senior Computer Science Educator analyzing a candidate's exam results.
Test Title: "${attempt.testId.title}" (${attempt.testId.topic})
Score: ${attempt.score} / ${attempt.maxScore} (${attempt.accuracy}% Accuracy)
Total Questions: ${questions.length} | Correct: ${correctCount} | Missed/Unattempted: ${missedDetails.length}

The candidate missed or unattempted the following specific questions:
${missedDetails.map((m, idx) => `
[Item ${idx + 1}]
- Question: ${m.questionText}
- Candidate Choice: ${m.userSelected}
- Correct Key: ${m.correctAnswer}
- Explanation: ${m.explanation}
`).join('\n')}

Generate an exceptional, high-yield, structured CS Study & Remediation Plan in Markdown.

Structure required:
### 📊 Performance Diagnostic Summary
(Provide performance level assessment and accuracy breakdown)

### 🔍 Concept-by-Concept Remediation Breakdown
(For each missed concept, explain the core computer science principle clearly and why the correct key is correct)

### 📚 Recommended High-Yield Revision Resources
(Provide 3-5 specific, highly authoritative learning resources, standard textbooks, documentation links like MDN/OSDev/RFCs/CMU/MIT OCW, and online tutorial topics tailored directly to the candidate's missed concepts. Format links as [Title](URL))

### 🛠️ 3-Step Actionable Revision Strategy
1. **Theoretical Deep-Dive**: (Key topics to re-read)
2. **Practice Recommendations**: (Specific edge cases to practice)
3. **Recommended Next Steps**: (Follow-up tests on AlgoPrep Dashboard)

Format cleanly in Markdown with bold key terms and markdown links. Make it encouraging, analytical, and highly educational.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        });

        revisionPlan = response.text;
      } catch (err) {
        console.warn('Gemini API call for revision plan failed. Using structured fallback.', err.message);
      }
    }

    if (!revisionPlan) {
      const perfLevel = attempt.accuracy >= 80 ? 'Mastery Level' : attempt.accuracy >= 50 ? 'Intermediate Competency' : 'Needs Targeted Revision';

      const topicResourcesMap = {
        'Operating Systems': [
          '📖 **Textbook**: *Operating System Concepts* by Silberschatz, Galvin & Gagne (Chapter: Processes & Virtual Memory)',
          '🌐 **Documentation**: [OSDev Wiki & Kernel Architecture](https://wiki.osdev.org)',
          '🎓 **Course**: [MIT OCW 6.S081: Operating System Engineering](https://ocw.mit.edu)'
        ],
        'Computer Networks': [
          '📖 **Textbook**: *Computer Networking: A Top-Down Approach* by Kurose & Ross (Chapter: Transport & Network Layers)',
          '🌐 **Documentation**: [RFC 793 - Transmission Control Protocol (TCP)](https://datatracker.ietf.org/doc/html/rfc793)',
          '🎓 **Course**: [Stanford CS144: Introduction to Computer Networking](https://cs144.github.io)'
        ],
        'DBMS': [
          '📖 **Textbook**: *Database System Concepts* by Silberschatz, Korth & Sudarshan (Chapter: Normalization & Indexing)',
          '🌐 **Documentation**: [PostgreSQL Internals & Query Architecture](https://www.postgresql.org/docs/current/internals.html)',
          '🎓 **Course**: [CMU 15-445/645: Database Systems (Andy Pavlo)](https://db.cs.cmu.edu)'
        ],
        'Data Structures & Algorithms': [
          '📖 **Textbook**: *Introduction to Algorithms (CLRS)* by Cormen, Leiserson, Rivest & Stein',
          '🌐 **Visualizer**: [VisuAlgo — Visualizing Data Structures and Algorithms](https://visualgo.net)',
          '🎓 **Course**: [MIT OCW 6.006: Introduction to Algorithms](https://ocw.mit.edu)'
        ],
        'Object-Oriented Programming': [
          '📖 **Textbook**: *Design Patterns: Elements of Reusable Object-Oriented Software* (Gang of Four)',
          '🌐 **Guide**: [Refactoring.Guru — Design Patterns & SOLID Principles](https://refactoring.guru)',
          '📖 **Book**: *Clean Code: A Handbook of Agile Software Craftsmanship* by Robert C. Martin'
        ]
      };

      const defaultResources = topicResourcesMap[attempt.testId.topic] || [
        '📖 **Reference**: Standard Computer Science Core Engineering Textbooks',
        '🌐 **Guide**: [GeeksforGeeks CS Core Tutorials](https://www.geeksforgeeks.org)',
        '🎓 **Course**: [MIT OpenCourseWare Computer Science Curriculum](https://ocw.mit.edu)'
      ];

      let fallbackMarkdown = `### 📊 Performance Diagnostic Summary
**Test:** ${attempt.testId.title} (${attempt.testId.topic})  
**Score:** ${attempt.score} / ${attempt.maxScore} (${attempt.accuracy}% Accuracy) — **${perfLevel}**

---

### 🔍 Concept-by-Concept Remediation Breakdown
`;

      if (missedDetails.length === 0) {
        fallbackMarkdown += `\n🎉 **Perfect Score!** You demonstrated 100% mastery across all concepts in ${attempt.testId.topic}. You are ready for advanced topic tests!`;
      } else {
        missedDetails.forEach((m) => {
          let cleanTopic = m.questionText
            .replace(/^Based on the uploaded syllabus section on\s+["']?(.*?)["']?,\s+which of the following statements.*/i, '$1')
            .trim();

          if (cleanTopic.length > 70) {
            cleanTopic = `Question ${m.order} Concept`;
          }

          fallbackMarkdown += `\n#### Q${m.order}: ${cleanTopic}
- **Your Choice:** ${m.userSelected}
- **Correct Key:** ${m.correctAnswer}
- **Key Takeaway:** ${m.explanation}
`;
        });
      }

      fallbackMarkdown += `

---

### 📚 Recommended High-Yield Revision Resources
${defaultResources.map(r => `- ${r}`).join('\n')}

---

### 🛠️ Actionable 3-Step Study Plan
#### 1. Fundamental Theoretical Review
- Review core textbook principles covering **${attempt.testId.topic}**.
- Re-examine the detailed explanation boxes for each missed question in the **Question Answer Key** tab above.

#### 2. Targeted Practice & Pitfall Avoidance
- Practice 5–10 additional problems focusing on tricky edge cases in ${attempt.testId.topic}.
- Pay special attention to distinguishing correct keys from common distractor trap options.

#### 3. Recommended Follow-up Modules
- Retake this CBT assessment after reviewing the missed concepts to verify your score improvement.
- Explore adjacent topic tests in the AlgoPrep Dashboard to build well-rounded computer science mastery!`;

      revisionPlan = fallbackMarkdown;
    }

    res.json({ revisionPlan });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate revision plan' });
  }
};
