import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { QuestionPalette } from '../components/QuestionPalette';
import { Timer } from '../components/Timer';
import { TabSwitchWarning } from '../components/TabSwitchWarning';
import { SubmitConfirmModal } from '../components/SubmitConfirmModal';
import { ChevronLeft, ChevronRight, Bookmark, RotateCcw, Send, ShieldAlert, Save, Maximize, Minimize } from 'lucide-react';

const SAVE_DEBOUNCE_MS = 1500;
const SAFETY_AUTOSAVE_MS = 15000;
const MAX_SUBMIT_RETRIES = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const TestTaking = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [endTimeIso, setEndTimeIso] = useState('');
  const [initialRemainingSeconds, setInitialRemainingSeconds] = useState(null);

  const [answers, setAnswers] = useState({});
  const [questionStates, setQuestionStates] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingStatus, setSavingStatus] = useState('idle');

  const [tabSwitches, setTabSwitches] = useState(0);
  const [warningModal, setWarningModal] = useState({
    isOpen: false,
    title: '',
    message: ''
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isFullscreenRef = useRef(false);
  const lastViolationTimeRef = useRef(0);

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatusText, setSubmitStatusText] = useState('');

  // ---- Save engine state (refs so timers/handlers always see the latest values) ----
  const versionRef = useRef(0);
  const attemptIdRef = useRef(null);
  const answersRef = useRef({});
  const statesRef = useRef({});
  const questionTimeSpentRef = useRef({});
  const questionEnterTimestampRef = useRef(Date.now());
  const pendingTabEventsRef = useRef([]);
  const dirtyRef = useRef(false);
  const inFlightRef = useRef(null); // Promise of the save currently in flight
  const debounceTimerRef = useRef(null);
  const retryTimerRef = useRef(null);
  const savedIdleTimerRef = useRef(null);
  const submittedRef = useRef(false);
  const endTimeRef = useRef('');
  const submitRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    initTestAttempt();
  }, [id]);

  useEffect(() => {
    return () => {
      clearTimeout(debounceTimerRef.current);
      clearTimeout(retryTimerRef.current);
      clearTimeout(savedIdleTimerRef.current);
    };
  }, []);

  const initTestAttempt = async () => {
    try {
      setLoading(true);
      const res = await api.startTest(id);
      const initialAnswers = res.answers || {};
      let initialStates = res.questionStates || {};

      if (res.questions.length > 0) {
        const firstQId = res.questions[0]._id;
        if (!initialStates[firstQId] || initialStates[firstQId] === 'unvisited') {
          initialStates = { ...initialStates, [firstQId]: 'not_answered' };
          dirtyRef.current = true;
        }
      }

      attemptIdRef.current = res.attemptId;
      answersRef.current = initialAnswers;
      statesRef.current = initialStates;
      versionRef.current = res.lastSavedVersion || 0;

      setAttemptId(res.attemptId);
      setTest(res.test);
      setQuestions(res.questions);
      setEndTimeIso(res.endTime);
      endTimeRef.current = res.endTime;
      setInitialRemainingSeconds(
        typeof res.timeRemainingSeconds === 'number' ? res.timeRemainingSeconds : null
      );
      setAnswers(initialAnswers);
      setQuestionStates(initialStates);
      setTabSwitches(res.tabSwitches || 0);

      if (res.wasResumed && res.test?.mode !== 'practice') {
        setWarningModal({
          isOpen: true,
          title: 'Warning: Session Resumed!',
          message:
            'You previously left or reloaded the exam window. An unauthorized re-entry was recorded and a -10 minute time penalty has been deducted.',
          penaltyMinutes: 10
        });
      }

      if (typeof res.timeRemainingSeconds === 'number' && res.timeRemainingSeconds <= 0) {
        submitRef.current?.();
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize test session');
    } finally {
      setLoading(false);
    }
  };

  const recordActiveQuestionTime = useCallback(() => {
    const activeQ = questions[currentIndex];
    if (!activeQ?._id) return;
    const now = Date.now();
    const elapsedSec = Math.max(0, Math.floor((now - questionEnterTimestampRef.current) / 1000));
    questionEnterTimestampRef.current = now;
    if (elapsedSec > 0) {
      questionTimeSpentRef.current[activeQ._id] =
        (questionTimeSpentRef.current[activeQ._id] || 0) + elapsedSec;
    }
  }, [questions, currentIndex]);

  /**
   * Sends at most one save at a time with a snapshot of the latest state.
   * If changes happen while a save is in flight, another save follows once it completes.
   */
  const flushSave = useCallback(async () => {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;

    if (submittedRef.current || !attemptIdRef.current) return;

    if (inFlightRef.current) {
      // A follow-up save will be triggered when the current one finishes (dirty flag stays set).
      return inFlightRef.current;
    }

    const hasTabEvent = pendingTabEventsRef.current.length > 0;
    if (!dirtyRef.current && !hasTabEvent) return;

    dirtyRef.current = false;
    const tabEvent = hasTabEvent ? pendingTabEventsRef.current[0] : undefined;
    const nextVersion = versionRef.current + 1;

    const run = (async () => {
      let retryDelayMs = 0;
      try {
        setSavingStatus('saving');
        recordActiveQuestionTime();
        const res = await api.saveProgress(attemptIdRef.current, {
          answers: answersRef.current,
          questionStates: statesRef.current,
          questionTimeSpent: { ...questionTimeSpentRef.current },
          version: nextVersion,
          tabSwitchEvent: tabEvent
        });

        if (res.success) {
          versionRef.current = res.lastSavedVersion;
          if (tabEvent) pendingTabEventsRef.current.shift();
          setSavingStatus('saved');
          clearTimeout(savedIdleTimerRef.current);
          savedIdleTimerRef.current = setTimeout(() => setSavingStatus('idle'), 2000);
        } else if (res.reason === 'stale_version') {
          versionRef.current = Math.max(versionRef.current, res.currentVersion || 0);
          dirtyRef.current = true; // resend latest snapshot with a fresh version
          setSavingStatus('idle');
        }
      } catch (err) {
        dirtyRef.current = true;
        if (err.status === 429) {
          setSavingStatus('rate_limited');
          retryDelayMs = Math.max(1, err.retryAfterSeconds || 5) * 1000;
        } else {
          setSavingStatus('error');
          retryDelayMs = 5000;
        }
      } finally {
        inFlightRef.current = null;
      }

      if (submittedRef.current) return;

      if (retryDelayMs > 0) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => flushSave(), retryDelayMs);
      } else if (dirtyRef.current || pendingTabEventsRef.current.length > 0) {
        await flushSave();
      }
    })();

    inFlightRef.current = run;
    return run;
  }, []);

  /** Marks state dirty and (re)starts the debounce timer. */
  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => flushSave(), SAVE_DEBOUNCE_MS);
  }, [flushSave]);

  const commitState = (nextAnswers, nextStates) => {
    if (nextAnswers) {
      answersRef.current = nextAnswers;
      setAnswers(nextAnswers);
    }
    if (nextStates) {
      statesRef.current = nextStates;
      setQuestionStates(nextStates);
    }
    scheduleSave();
  };

  // Safety-net autosave: only fires when there are unsaved changes.
  useEffect(() => {
    if (!attemptId) return;
    const interval = setInterval(() => {
      if (dirtyRef.current || pendingTabEventsRef.current.length > 0) flushSave();
    }, SAFETY_AUTOSAVE_MS);
    return () => clearInterval(interval);
  }, [attemptId, flushSave]);

  const triggerViolation = useCallback(
    (reason, title, message) => {
      if (submittedRef.current || !attemptIdRef.current || test?.mode === 'practice') return;

      const now = Date.now();
      // Throttle rapid consecutive events (e.g. window blur immediately before visibilitychange)
      if (now - lastViolationTimeRef.current < 1500) {
        return;
      }
      lastViolationTimeRef.current = now;

      // 10-minute time penalty (600 seconds)
      const currentEndMs = endTimeRef.current ? new Date(endTimeRef.current).getTime() : Date.now();
      const PENALTY_MS = 10 * 60 * 1000;
      const penalizedEndMs = currentEndMs - PENALTY_MS;
      const updatedEndTimeIso = new Date(penalizedEndMs).toISOString();
      const remainingSeconds = Math.floor((penalizedEndMs - Date.now()) / 1000);

      endTimeRef.current = updatedEndTimeIso;
      setEndTimeIso(updatedEndTimeIso);
      setTabSwitches((prev) => prev + 1);

      pendingTabEventsRef.current.push({
        timestamp: new Date().toISOString(),
        reason: reason || 'tab_switch',
        penaltySeconds: 600
      });
      flushSave();

      if (remainingSeconds <= 0) {
        setWarningModal({
          isOpen: true,
          title: 'Time Expired by Penalty!',
          message:
            'A -10 minute time penalty has reduced your remaining time to 0. Your test is being automatically submitted.',
          penaltyMinutes: 10
        });
        submitRef.current?.();
        return;
      }

      setWarningModal({
        isOpen: true,
        title: title || 'Warning: Proctoring Alert!',
        message:
          message
            ? `${message} A -10 minute penalty has been deducted from your remaining time.`
            : 'A -10 minute penalty has been deducted from your remaining time.',
        penaltyMinutes: 10
      });
    },
    [flushSave]
  );

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        isFullscreenRef.current = true;
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        isFullscreenRef.current = false;
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  };

  useEffect(() => {
    if (test?.mode === 'practice') return;
    // 1. Trap Browser Back/Forward navigation by pushing a dummy state onto history
    try {
      window.history.pushState({ examLocked: true }, '', window.location.href);
    } catch (_) {}

    const handlePopState = () => {
      if (submittedRef.current) return;
      // Re-push state immediately so user stays trapped on the exam page
      try {
        window.history.pushState({ examLocked: true }, '', window.location.href);
      } catch (_) {}

      triggerViolation(
        'back_navigation',
        'Warning: Navigation Attempt Detected!',
        'Browser back/forward navigation is strictly prohibited during an exam. This violation has been recorded in your official attempt record.'
      );
    };

    // 2. Tab switch (visibility change)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && attemptIdRef.current && !submittedRef.current) {
        triggerViolation(
          'tab_switch',
          'Warning: Tab Switch Detected!',
          'You navigated away from the exam window or switched tabs. This activity has been recorded in your official attempt record.'
        );
      }
    };

    // 3. Window blur (lost focus to another app, devtools, or address bar)
    const handleWindowBlur = () => {
      if (attemptIdRef.current && !submittedRef.current && document.visibilityState !== 'hidden') {
        triggerViolation(
          'window_blur',
          'Warning: Window Focus Lost!',
          'The exam window lost focus. Please keep your cursor and attention inside the exam window.'
        );
      }
    };

    // 4. Fullscreen change listener
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs && isFullscreenRef.current && !submittedRef.current && attemptIdRef.current) {
        isFullscreenRef.current = false;
        triggerViolation(
          'fullscreen_exit',
          'Warning: Fullscreen Exited!',
          'You exited fullscreen mode. Please remain in fullscreen mode throughout the exam.'
        );
      }
    };

    // 5. Tab close / page reload guard
    const handleBeforeUnload = (e) => {
      if (!submittedRef.current && attemptIdRef.current) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    // 6. Send keepalive departure beacon if page is forcefully unloaded
    const handlePageHide = () => {
      if (!submittedRef.current && attemptIdRef.current) {
        try {
          const token = localStorage.getItem('algoprep_access_token');
          const apiBase = import.meta.env.VITE_API_URL || '/api';
          const payload = JSON.stringify({
            version: versionRef.current + 1,
            tabSwitchEvent: {
              timestamp: new Date().toISOString(),
              reason: 'page_unload',
              penaltySeconds: 600
            }
          });
          fetch(`${apiBase}/attempts/${attemptIdRef.current}/progress`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: payload,
            keepalive: true
          });
        } catch (_) {}
      }
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [triggerViolation]);

  const handleSelectQuestion = (index, currentStateOverride) => {
    recordActiveQuestionTime();
    setCurrentIndex(index);
    const targetQId = questions[index]?._id;
    const baseStates = currentStateOverride || statesRef.current;

    if (targetQId && (!baseStates[targetQId] || baseStates[targetQId] === 'unvisited')) {
      commitState(null, { ...baseStates, [targetQId]: 'not_answered' });
    }
  };

  const handleSelectOption = (optionIndex) => {
    const currentQId = questions[currentIndex]._id;
    const newAnswers = { ...answersRef.current, [currentQId]: optionIndex };

    const currentSt = statesRef.current[currentQId];
    let newSt = 'answered';
    if (currentSt === 'marked' || currentSt === 'answered_marked') {
      newSt = 'answered_marked';
    }

    commitState(newAnswers, { ...statesRef.current, [currentQId]: newSt });
  };

  const handleClearAnswer = () => {
    const currentQId = questions[currentIndex]._id;
    const newAnswers = { ...answersRef.current };
    delete newAnswers[currentQId];

    const currentSt = statesRef.current[currentQId];
    let newSt = 'not_answered';
    if (currentSt === 'marked' || currentSt === 'answered_marked') {
      newSt = 'marked';
    }

    commitState(newAnswers, { ...statesRef.current, [currentQId]: newSt });
  };

  const handleToggleMarkForReview = () => {
    const currentQId = questions[currentIndex]._id;
    const currentAnswers = answersRef.current;
    const hasAnswer = currentAnswers[currentQId] !== undefined && currentAnswers[currentQId] !== null;
    const currentSt = statesRef.current[currentQId];

    let newSt;
    if (currentSt === 'marked' || currentSt === 'answered_marked') {
      newSt = hasAnswer ? 'answered' : 'not_answered';
    } else {
      newSt = hasAnswer ? 'answered_marked' : 'marked';
    }

    let updatedStates = { ...statesRef.current, [currentQId]: newSt };

    // Advance and mark the next question visited in the same (single, debounced) save.
    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextQId = questions[nextIndex]?._id;
      if (nextQId && (!updatedStates[nextQId] || updatedStates[nextQId] === 'unvisited')) {
        updatedStates = { ...updatedStates, [nextQId]: 'not_answered' };
      }
      setCurrentIndex(nextIndex);
    }

    commitState(null, updatedStates);
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
    if (!attemptIdRef.current || submittedRef.current) return;

    setIsSubmitting(true);
    setSubmitStatusText('');

    recordActiveQuestionTime();

    // Stop further autosaves and wait for any in-flight save to settle.
    clearTimeout(debounceTimerRef.current);
    clearTimeout(retryTimerRef.current);
    submittedRef.current = true;
    if (inFlightRef.current) {
      try {
        await inFlightRef.current;
      } catch {
        // ignore - submit carries the full latest snapshot anyway
      }
    }

    for (let attempt = 0; attempt <= MAX_SUBMIT_RETRIES; attempt++) {
      try {
        await api.submitAttempt(attemptIdRef.current, {
          answers: answersRef.current,
          questionStates: statesRef.current,
          questionTimeSpent: { ...questionTimeSpentRef.current },
          version: versionRef.current + 1,
          timeSpentSeconds: 0
        });

        if (document.fullscreenElement) {
          try {
            await document.exitFullscreen();
          } catch (_) {}
        }

        navigate(`/results/${attemptIdRef.current}`);
        return;
      } catch (err) {
        if (err.status === 429 && attempt < MAX_SUBMIT_RETRIES) {
          const waitSeconds = err.retryAfterSeconds || 2 ** (attempt + 1);
          setSubmitStatusText(`Server busy - retrying submission in ${waitSeconds}s...`);
          await sleep(waitSeconds * 1000);
          continue;
        }

        submittedRef.current = false;
        setError(err.message || 'Failed to submit test');
        setIsSubmitting(false);
        setSubmitStatusText('');
        setShowSubmitModal(false);
        return;
      }
    }
  };
  submitRef.current = handleSubmitExam;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 rounded-full border-2 border-white border-t-transparent animate-spin mx-auto" />
          <p className="text-zinc-400 font-mono text-sm">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (error || !test || questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-[#121215] rounded-2xl border border-zinc-700 text-center space-y-4">
        <p className="text-zinc-300 font-semibold">{error || 'Test not found'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-colors"
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
      <div className="bg-[#121215] rounded-2xl p-5 border border-zinc-700 space-y-4 shadow-sm">
        {/* Top Header Row: Test Title & Marking Scheme */}
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white flex flex-wrap items-center gap-2">
            <span>{test.title}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#18181b] text-zinc-400 border border-zinc-700 font-mono">
              {test.topic}
            </span>
            {test.mode === 'practice' ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#18181b] text-zinc-300 border border-zinc-700 font-mono font-medium">
                Practice Mode
              </span>
            ) : (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white text-black font-mono font-semibold">
                Exam Mode
              </span>
            )}
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Scheme: <span className="text-emerald-400 font-semibold">+{test.markingScheme.correct}</span> /{' '}
            <span className="text-rose-400 font-semibold">{test.markingScheme.incorrect}</span> points per question
          </p>
        </div>

        {/* Action Controls Bar: Auto-save on LEFT, Remaining Buttons on RIGHT */}
        <div className="pt-3 border-t border-zinc-700 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          {/* LEFT: Static Micro-Dot & Text (VS Code / JetBrains Status Bar Style - Zero motion/pulse) */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 bg-[#18181b] px-3 py-1.5 rounded-full border border-zinc-700 select-none">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                savingStatus === 'saving'
                  ? 'bg-zinc-300'
                  : savingStatus === 'rate_limited' || savingStatus === 'error'
                    ? 'bg-zinc-500'
                    : 'bg-zinc-600'
              }`}
            />
            <span>
              {savingStatus === 'saving'
                ? 'Saving...'
                : savingStatus === 'saved'
                  ? 'Saved'
                  : savingStatus === 'rate_limited'
                    ? 'Save paused - retrying'
                    : savingStatus === 'error'
                      ? 'Save failed - retrying'
                      : 'Synced'}
            </span>
          </div>

          {/* RIGHT: Remaining Controls stuck to the right */}
          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            {tabSwitches > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-mono bg-[#18181b] px-3 py-1.5 rounded-full border border-zinc-700">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Warnings: {tabSwitches}</span>
              </div>
            )}

            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (Recommended)'}
              className="flex items-center gap-1.5 text-xs text-zinc-300 font-mono bg-[#18181b] hover:bg-[#27272a] px-3.5 py-1.5 rounded-full border border-zinc-700 transition-colors cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize className="w-3.5 h-3.5 text-zinc-300" />
              ) : (
                <Maximize className="w-3.5 h-3.5 text-zinc-300" />
              )}
              <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
            </button>

            <Timer
              endTimeIso={endTimeIso}
              initialRemainingSeconds={initialRemainingSeconds}
              onTimeUp={handleSubmitExam}
            />

            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-5 py-1.5 rounded-full text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all flex items-center gap-1.5 cursor-pointer font-mono"
            >
              <span>Submit</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#121215] rounded-2xl p-6 sm:p-8 border border-zinc-700 min-h-[420px] flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-zinc-700">
                <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                {isMarked && (
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 border border-amber-500/40 text-amber-300 font-mono">
                    <Bookmark className="w-3 h-3 text-zinc-400" />
                    Marked for Review
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-medium text-white leading-relaxed mb-8">
                {currentQ.questionText}
              </h2>

              <div className="space-y-3">
                {currentQ.options.map((opt, optIdx) => {
                  const isSelected = currentSelectedOption === optIdx;

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`w-full p-4 rounded-xl text-left text-sm font-medium transition-all flex items-start gap-3 border cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/60 text-white font-medium shadow-sm'
                          : 'bg-[#18181b] border-zinc-700 text-zinc-300 hover:border-zinc-500'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono shrink-0 transition-colors ${
                          isSelected ? 'bg-amber-500 text-black font-bold' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
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

            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-8 border-t border-zinc-700">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearAnswer}
                  disabled={currentSelectedOption === undefined}
                  className="px-3.5 py-2 rounded-full text-xs font-medium text-zinc-400 hover:text-white hover:bg-[#18181b] border border-transparent hover:border-zinc-700 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-500 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Response</span>
                </button>

                <button
                  onClick={handleToggleMarkForReview}
                  className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isMarked
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                      : 'bg-[#18181b] border-zinc-700 text-zinc-300 hover:bg-[#27272a]'
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
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-[#18181b] border border-zinc-700 text-zinc-300 hover:bg-[#27272a] disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer font-mono"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={handleNext}
                  disabled={currentIndex === questions.length - 1}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-40 transition-all flex items-center gap-1 shadow-[0_0_15px_rgba(245,158,11,0.25)] cursor-pointer font-mono"
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
        isOpen={warningModal.isOpen}
        title={warningModal.title}
        message={warningModal.message}
        penaltyMinutes={warningModal.penaltyMinutes || 10}
        switchCount={tabSwitches}
        onClose={() => setWarningModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <SubmitConfirmModal
        isOpen={showSubmitModal}
        totalQuestions={questions.length}
        questionStates={questionStates}
        onConfirm={handleSubmitExam}
        onCancel={() => setShowSubmitModal(false)}
        isSubmitting={isSubmitting}
        statusText={submitStatusText}
      />
    </div>
  );
};
