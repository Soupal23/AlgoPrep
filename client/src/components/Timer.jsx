import React, { useEffect, useState, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export const Timer = ({ endTimeIso, initialRemainingSeconds, onTimeUp }) => {
  const targetEndTimeRef = useRef(null);

  const getTargetEndTime = () => {
    if (typeof initialRemainingSeconds === 'number' && initialRemainingSeconds >= 0) {
      return Date.now() + initialRemainingSeconds * 1000;
    }
    if (endTimeIso) {
      const end = new Date(endTimeIso).getTime();
      return !isNaN(end) ? end : Date.now();
    }
    return Date.now();
  };

  // Recalibrate target end time whenever initialRemainingSeconds or endTimeIso changes
  useEffect(() => {
    targetEndTimeRef.current = getTargetEndTime();
    const remaining = Math.max(0, Math.floor((targetEndTimeRef.current - Date.now()) / 1000));
    setSecondsLeft(remaining);
  }, [endTimeIso, initialRemainingSeconds]);

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
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm font-bold border transition-colors shadow-inner ${
        isWarning
          ? 'bg-rose-950/80 border-rose-800 text-rose-300 animate-pulse'
          : 'bg-[#1c1729] border-[#383050] text-purple-400'
      }`}
    >
      {isWarning ? (
        <AlertTriangle className="w-4 h-4 text-rose-400" />
      ) : (
        <Clock className="w-4 h-4 text-purple-400" />
      )}
      <span>{formattedTime}</span>
    </div>
  );
};
