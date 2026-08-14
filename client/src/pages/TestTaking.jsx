import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { QuestionPalette } from '../components/QuestionPalette';
import { Timer } from '../components/Timer';
import { TabSwitchWarning } from '../components/TabSwitchWarning';
import { SubmitConfirmModal } from '../components/SubmitConfirmModal';
import { ChevronLeft, ChevronRight, Bookmark, RotateCcw, Send, ShieldAlert, Save } from 'lucide-react';

export const TestTaking = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [endTimeIso, setEndTimeIso] = useState('');

  const [answers, setAnswers] = useState({});
  const [questionStates, setQuestionStates] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingStatus, setSavingStatus] = useState('idle');

  const [tabSwitches, setTabSwitches] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const versionRef = useRef(0);
  const autoSaveIntervalRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    initTestAttempt();
  }, [id]);

  const initTestAttempt = async () => {
    try {
      setLoading(true);
      const res = await api.startTest(id);
      setAttemptId(res.attemptId);
      setTest(res.test);
      setQuestions(res.questions);
      setEndTimeIso(res.endTime);
      setAnswers(res.answers || {});
      setQuestionStates(res.questionStates || {});
      setTabSwitches(res.tabSwitches || 0);
      versionRef.current = res.lastSavedVersion || 0;

      if (res.questions.length > 0) {
        const firstQId = res.questions[0]._id;
        if (!res.questionStates[firstQId] || res.questionStates[firstQId] === 'unvisited') {
          setQuestionStates(prev => ({ ...prev, [firstQId]: 'not_answered' }));
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize test session');
    } finally {
      setLoading(false);
    }
  };

  const performSaveProgress = useCallback(
    async (overrideAnswers, overrideStates, tabSwitchPayload) => {
      if (!attemptId) return;

      try {
        setSavingStatus('saving');
        const nextVersion = versionRef.current + 1;

        const currentAnswers = overrideAnswers || answers;
        const currentStates = overrideStates || questionStates;

        const res = await api.saveProgress(attemptId, {
          answers: currentAnswers,
          questionStates: currentStates,
          version: nextVersion,
          tabSwitchEvent: tabSwitchPayload
        });

        if (res.success) {
          versionRef.current = res.lastSavedVersion;
          setSavingStatus('saved');
          setTimeout(() => setSavingStatus('idle'), 2000);
        } else if (res.reason === 'stale_version') {
          versionRef.current = res.currentVersion || versionRef.current;
          setSavingStatus('idle');
        }
      } catch (err) {
        setSavingStatus('error');
      }
    },
    [attemptId, answers, questionStates]
  );

  useEffect(() => {
    if (!attemptId) return;

    autoSaveIntervalRef.current = setInterval(() => {
      performSaveProgress();
    }, 10000);

    return () => {
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
    };
  }, [attemptId, performSaveProgress]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && attemptId) {
        const newCount = tabSwitches + 1;
        setTabSwitches(newCount);
        setShowTabWarning(true);
        performSaveProgress(undefined, undefined, { timestamp: new Date().toISOString() });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [attemptId, tabSwitches, performSaveProgress]);

  const handleSelectQuestion = (index, currentStateOverride) => {
    setCurrentIndex(index);
    const targetQId = questions[index]?._id;
    const baseStates = currentStateOverride || questionStates;

    if (targetQId && (!baseStates[targetQId] || baseStates[targetQId] === 'unvisited')) {
      const newStates = { ...baseStates, [targetQId]: 'not_answered' };
      setQuestionStates(newStates);
      performSaveProgress(answers, newStates);
    }
  };

  const handleSelectOption = (optionIndex) => {
    const currentQId = questions[currentIndex]._id;
    const newAnswers = { ...answers, [currentQId]: optionIndex };
    setAnswers(newAnswers);

    const currentSt = questionStates[currentQId];
    let newSt = 'answered';
    if (currentSt === 'marked' || currentSt === 'answered_marked') {
      newSt = 'answered_marked';
    }

    const newStates = { ...questionStates, [currentQId]: newSt };
    setQuestionStates(newStates);
    performSaveProgress(newAnswers, newStates);
  };

  const handleClearAnswer = () => {
    const currentQId = questions[currentIndex]._id;
    const newAnswers = { ...answers };
    delete newAnswers[currentQId];
    setAnswers(newAnswers);

    const currentSt = questionStates[currentQId];
    let newSt = 'not_answered';
    if (currentSt === 'marked' || currentSt === 'answered_marked') {
      newSt = 'marked';
    }

    const newStates = { ...questionStates, [currentQId]: newSt };
    setQuestionStates(newStates);
    performSaveProgress(newAnswers, newStates);
  };

  const handleToggleMarkForReview = () => {
    const currentQId = questions[currentIndex]._id;
    const hasAnswer = answers[currentQId] !== undefined && answers[currentQId] !== null;
    const currentSt = questionStates[currentQId];

    let newSt;
    if (currentSt === 'marked' || currentSt === 'answered_marked') {
      newSt = hasAnswer ? 'answered' : 'not_answered';
    } else {
      newSt = hasAnswer ? 'answered_marked' : 'marked';
    }

    const updatedStates = { ...questionStates, [currentQId]: newSt };
    setQuestionStates(updatedStates);
    performSaveProgress(answers, updatedStates);

    if (currentIndex < questions.length - 1) {
      handleSelectQuestion(currentIndex + 1, updatedStates);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      handleSelectQuestion(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      handleSelectQuestion(currentIndex - 1);
    }
  };

  const handleSubmitExam = async () => {
    if (!attemptId) return;

    try {
      setIsSubmitting(true);
      const nextVersion = versionRef.current + 1;

      await api.submitAttempt(attemptId, {
        answers,
        questionStates,
        version: nextVersion,
        timeSpentSeconds: 0
      });

      navigate(`/results/${attemptId}`);
    } catch (err) {
      setError(err.message || 'Failed to submit test');
      setIsSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-slate-400 font-mono text-sm">Initializing CBT Exam Environment...</p>
        </div>
      </div>
    );
  }

  if (error || !test || questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 glass-panel rounded-2xl border border-rose-800/40 text-center space-y-4">
        <p className="text-rose-300 font-semibold">{error || 'Test not found'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const currentSelectedOption = answers[currentQ._id];
  const isMarked =
    questionStates[currentQ._id] === 'marked' || questionStates[currentQ._id] === 'answered_marked';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span>{test.title}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700 font-mono">
              {test.topic}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Marking Scheme: <span className="font-mono text-emerald-400 font-bold">+{test.markingScheme.correct}</span> /{' '}
            <span className="font-mono text-rose-400 font-bold">{test.markingScheme.incorrect}</span> points per question
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <Save className={`w-3.5 h-3.5 ${savingStatus === 'saving' ? 'text-amber-400 animate-spin' : 'text-cyan-400'}`} />
            <span>
              {savingStatus === 'saving' ? 'Saving...' : savingStatus === 'saved' ? 'Saved' : 'Auto-Sync Active'}
            </span>
          </div>

          {tabSwitches > 0 && (
            <div className="flex items-center gap-1 text-xs text-rose-400 font-mono bg-rose-950/60 px-3 py-1.5 rounded-lg border border-rose-800">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Warnings: {tabSwitches}</span>
            </div>
          )}

          <Timer endTimeIso={endTimeIso} onTimeUp={handleSubmitExam} />

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-600/30 hover:opacity-95 transition-opacity flex items-center gap-1.5"
          >
            <span>Submit</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 min-h-[420px] flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800/80">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                {isMarked && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950 border border-purple-800 text-purple-300">
                    <Bookmark className="w-3 h-3 text-purple-400" />
                    Marked for Review
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed mb-8">
                {currentQ.questionText}
              </h2>

              <div className="space-y-3">
                {currentQ.options.map((opt, optIdx) => {
                  const isSelected = currentSelectedOption === optIdx;

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`w-full p-4 rounded-xl text-left text-sm font-medium transition-all flex items-start gap-3 border ${
                        isSelected
                          ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono shrink-0 transition-colors ${
                          isSelected ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="mt-0.5 leading-relaxed">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-8 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearAnswer}
                  disabled={currentSelectedOption === undefined}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-900 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Response</span>
                </button>

                <button
                  onClick={handleToggleMarkForReview}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                    isMarked
                      ? 'bg-purple-950 border-purple-800 text-purple-300'
                      : 'bg-slate-900 border-slate-800 text-purple-400 hover:bg-purple-950/50'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{isMarked ? 'Unmark Review' : 'Mark for Review'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={handleNext}
                  disabled={currentIndex === questions.length - 1}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <QuestionPalette
            questions={questions}
            currentIndex={currentIndex}
            questionStates={questionStates}
            onSelectQuestion={handleSelectQuestion}
          />
        </div>
      </div>

      <TabSwitchWarning
        isOpen={showTabWarning}
        switchCount={tabSwitches}
        onClose={() => setShowTabWarning(false)}
      />

      <SubmitConfirmModal
        isOpen={showSubmitModal}
        totalQuestions={questions.length}
        questionStates={questionStates}
        onConfirm={handleSubmitExam}
        onCancel={() => setShowSubmitModal(false)}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
