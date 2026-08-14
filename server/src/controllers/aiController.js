import { extractTextFromBuffer } from '../utils/fileExtractor.js';
import { generateTestFromSyllabus } from '../utils/geminiGenerator.js';
import { Test } from '../models/Test.js';
import { Question } from '../models/Question.js';

export const generateAITestController = async (req, res, next) => {
  try {
    let syllabusText = req.body.syllabusText || '';

    if (req.file) {
      syllabusText = await extractTextFromBuffer(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );
    }

    if (!syllabusText || syllabusText.trim().length < 20) {
      res.status(400).json({ error: 'Please upload a valid PDF/text file or paste syllabus text (minimum 20 characters).' });
      return;
    }

    const numQuestions = parseInt(req.body.numQuestions || '10', 10);
    const topicName = req.body.topicName || 'AI Generated';

    // Generate test structure via Gemini / AI Generator
    const generatedData = await generateTestFromSyllabus(syllabusText, numQuestions, topicName);

    // Save Test to database
    const testDoc = await Test.create({
      title: generatedData.title,
      description: generatedData.description,
      topic: generatedData.topic,
      timeLimitMinutes: generatedData.timeLimitMinutes || 30,
      markingScheme: generatedData.markingScheme || { correct: 4, incorrect: -1 },
      totalQuestions: generatedData.questions.length,
      isAIGenerated: true,
      createdBy: req.user.userId
    });

    // Save Questions to database
    const questionDocs = generatedData.questions.map((q, idx) => ({
      testId: testDoc._id,
      questionText: q.questionText,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      explanation: q.explanation,
      order: q.order || idx + 1
    }));

    await Question.insertMany(questionDocs);

    res.status(201).json({
      message: 'AI Test generated successfully',
      test: testDoc
    });
  } catch (err) {
    next(err);
  }
};
