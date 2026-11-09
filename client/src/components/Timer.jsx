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
  const isWarning = secondsLeft < 120;

  const formattedTime = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs font-bold border transition-colors shadow-sm ${
        isWarning
          ? 'bg-zinc-900 border-rose-900 text-rose-400'
          : 'bg-zinc-900 border-zinc-800 text-white'
      }`}
    >
      {isWarning ? (
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-zinc-400" />
      )}
      <span>{formattedTime}</span>
    </div>
  );
};
