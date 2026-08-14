export const calculateScore = (answersMap, questions, markingScheme) => {
  let score = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;

  const answers =
    answersMap instanceof Map
      ? Object.fromEntries(answersMap.entries())
      : answersMap || {};

  const totalQuestions = questions.length;
  const maxScore = totalQuestions * markingScheme.correct;

  questions.forEach((q) => {
    const qId = q._id.toString();
    const selectedOption = answers[qId];

    if (selectedOption === undefined || selectedOption === null || selectedOption < 0) {
      unattemptedCount++;
    } else if (selectedOption === q.correctOptionIndex) {
      correctCount++;
      score += markingScheme.correct;
    } else {
      incorrectCount++;
      score += markingScheme.incorrect;
    }
  });

  const attemptedCount = correctCount + incorrectCount;
  const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 1000) / 10 : 0;

  return {
    score,
    maxScore,
    accuracy,
    correctCount,
    incorrectCount,
    unattemptedCount,
    totalQuestions
  };
};
