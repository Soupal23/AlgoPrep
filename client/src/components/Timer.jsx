import React, { useEffect, useState, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export const Timer = ({ endTimeIso, initialRemainingSeconds, onTimeUp }) => {
  const targetEndTimeRef = useRef(null);

  const getTargetEndTime = () => {
    if (endTimeIso) {
      const end = new Date(endTimeIso).getTime();
      if (!isNaN(end)) return end;
    }
    if (typeof initialRemainingSeconds === 'number' && initialRemainingSeconds >= 0) {
      return Date.now() + initialRemainingSeconds * 1000;
    }
    return Date.now();
  };

  // Recalibrate target end time whenever initialRemainingSeconds or endTimeIso changes
  useEffect(() => {
    targetEndTimeRef.current = getTargetEndTime();
    const remaining = Math.max(0, Math.floor((targetEndTimeRef.current - Date.now()) / 1000));
    setSecondsLeft(remaining);

    if (remaining <= 0 && typeof onTimeUp === 'function') {
      onTimeUp();
    }
  }, [endTimeIso, initialRemainingSeconds, onTimeUp]);

  const calculateRemainingSeconds = () => {
    const target = targetEndTimeRef.current || getTargetEndTime();
    return Math.max(0, Math.floor((target - Date.now()) / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState(() => calculateRemainingSeconds());

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = calculateRemainingSeconds();
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (typeof onTimeUp === 'function') {
          onTimeUp();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [onTimeUp]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const secs = secondsLeft % 60;
  const isWarning = secondsLeft < 300; // Warning under 5 minutes

  const formattedTime = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-mono text-xs font-bold border transition-all shadow-sm ${
        isWarning
          ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.35)]'
          : 'bg-[#18181b] border-zinc-700 text-white'
      }`}
    >
      {isWarning ? (
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-[#ffa116]" />
      )}
      <span>{formattedTime}</span>
    </div>
  );
};
