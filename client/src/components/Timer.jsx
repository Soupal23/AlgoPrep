import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export const Timer = ({ endTimeIso, onTimeUp }) => {
  const calculateRemainingSeconds = () => {
    const end = new Date(endTimeIso).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((end - now) / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState(calculateRemainingSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = calculateRemainingSeconds();
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onTimeUp();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTimeIso]);

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isWarning = secondsLeft < 120;

  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm font-bold border transition-colors shadow-inner ${
        isWarning
          ? 'bg-rose-950/80 border-rose-600 text-rose-300 animate-pulse'
          : 'bg-slate-900 border-slate-700 text-cyan-400'
      }`}
    >
      {isWarning ? (
        <AlertTriangle className="w-4 h-4 text-rose-400" />
      ) : (
        <Clock className="w-4 h-4 text-cyan-400" />
      )}
      <span>{formattedTime}</span>
    </div>
  );
};
