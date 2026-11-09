import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

export const PlanCharts = ({ stats, conceptBreakdown = [] }) => {
  if (!stats) return null;

  const pieData = [
    { name: 'Correct', value: stats.correct, color: '#10b981' },
    { name: 'Incorrect', value: stats.incorrect, color: '#f43f5e' },
    { name: 'Unattempted', value: stats.unattempted, color: '#71717a' }
  ].filter((d) => d.value > 0);

  const barData = conceptBreakdown.map((c) => {
    const accuracy = c.total > 0 ? Math.round((c.correct / c.total) * 100) : 0;
    return {
      concept: c.concept.length > 20 ? `${c.concept.slice(0, 18)}...` : c.concept,
      fullConcept: c.concept,
      accuracy,
      correct: c.correct,
      total: c.total
    };
  });

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-[#18181b] p-2.5 rounded-xl border border-zinc-700 text-xs shadow-xl font-mono">
          <span style={{ color: data.payload.color }} className="font-bold">
            {data.name}:
          </span>{' '}
          <span className="text-white font-bold">{data.value}</span> questions
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#18181b] p-2.5 rounded-xl border border-zinc-700 text-xs shadow-xl space-y-1">
          <div className="font-bold text-white">{data.fullConcept}</div>
          <div className="text-zinc-300 font-mono">
            Accuracy: <span className="text-amber-400 font-bold">{data.accuracy}%</span> ({data.correct}/{data.total})
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Response Distribution Donut */}
      <div className="bg-[#121215] rounded-2xl p-6 border border-zinc-700 shadow-sm flex flex-col justify-between">
        <div className="mb-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Response Distribution
          </h3>
        </div>

        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={50}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#121215" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-center gap-4 text-xs font-mono pt-3 border-t border-zinc-700">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            {stats.correct} Correct
          </span>
          <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            {stats.incorrect} Incorrect
          </span>
          <span className="flex items-center gap-1.5 text-zinc-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-zinc-500" />
            {stats.unattempted} Skipped
          </span>
        </div>
      </div>

      {/* Accuracy per Concept Bar Chart */}
      <div className="bg-[#121215] rounded-2xl p-6 border border-zinc-700 shadow-sm flex flex-col justify-between">
        <div className="mb-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Concept Competency (%)
          </h3>
        </div>

        <div className="h-52 w-full">
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#a1a1aa', fontSize: 10 }} unit="%" />
                <YAxis
                  dataKey="concept"
                  type="category"
                  tick={{ fill: '#d4d4d8', fontSize: 11 }}
                  width={90}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="accuracy" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono">
              No concept metrics available
            </div>
          )}
        </div>

        <div className="text-[11px] text-zinc-500 text-center font-mono pt-3 border-t border-zinc-700">
          Target: 80%+ threshold for subject competency
        </div>
      </div>
    </div>
  );
};
