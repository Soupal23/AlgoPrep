import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Sparkles, FileUp, FileText, CheckCircle2, AlertCircle, ArrowRight, Shield, Play } from 'lucide-react';

export const SyllabusAI = () => {
  const [file, setFile] = useState(null);
  const [syllabusText, setSyllabusText] = useState('');
  const [topicName, setTopicName] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedTest, setGeneratedTest] = useState(null);

  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setError('File size exceeds maximum limit of 5MB.');
        return;
      }
      setError('');
      setFile(selected);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setGeneratedTest(null);

    if (!file && (!syllabusText || syllabusText.trim().length < 20)) {
      setError('Please upload a PDF/text file or paste syllabus text (at least 20 characters).');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      formData.append('syllabusText', syllabusText);
      formData.append('topicName', topicName || 'AI Syllabus');
      formData.append('numQuestions', numQuestions.toString());

      const res = await api.generateAITest(formData);
      setGeneratedTest(res.test);
    } catch (err) {
      setError(err.message || 'Failed to generate AI test.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-[#121215] border border-[#27272a] p-6 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Quick Quiz
        </h1>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] text-zinc-300 text-xs font-mono flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-zinc-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Card */}
      {generatedTest ? (
        <div className="bg-[#121215] rounded-2xl p-8 border border-[#27272a] text-center space-y-5 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-[#18181b] border border-[#27272a] text-zinc-300 uppercase font-semibold">
              Ready
            </span>
            <h2 className="text-lg font-bold text-white mt-3">{generatedTest.title}</h2>
          </div>

          <div className="flex items-center justify-center gap-5 text-xs font-mono text-zinc-400 pt-1">
            <div>Questions: <span className="text-white font-semibold">{generatedTest.totalQuestions}</span></div>
            <div>Time Limit: <span className="text-white font-semibold">{generatedTest.timeLimitMinutes}m</span></div>
            <div>Scheme: <span className="text-white font-semibold">+{generatedTest.markingScheme?.correct} / {generatedTest.markingScheme?.incorrect}</span></div>
          </div>

          <button
            onClick={() => navigate(`/test/${generatedTest._id}`)}
            className="px-6 py-2.5 rounded-full font-semibold text-xs bg-white hover:bg-zinc-200 text-black shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Start Exam</span>
            <Play className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      ) : (
        /* Generator Form */
        <form onSubmit={handleGenerate} className="bg-[#121215] rounded-2xl p-6 sm:p-8 border border-[#27272a] space-y-5 shadow-sm">
          {/* File Upload Zone */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
              Syllabus Document (PDF or TXT, Max 5MB)
            </label>
            <div className="relative border border-dashed border-[#27272a] hover:border-zinc-500 rounded-xl p-6 text-center transition-colors bg-[#18181b] group">
              <input
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-2 pointer-events-none">
                <FileUp className="w-8 h-8 text-zinc-500 group-hover:text-zinc-300 mx-auto transition-colors" />
                {file ? (
                  <p className="text-xs font-semibold text-white font-mono">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-medium text-zinc-300">
                      Drag &amp; drop syllabus PDF / text file here, or click to browse
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Or Paste Text Option */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
              Or Paste Syllabus Text
            </label>
            <textarea
              rows={4}
              value={syllabusText}
              onChange={(e) => setSyllabusText(e.target.value)}
              placeholder="Paste syllabus topics or notes..."
              className="w-full p-3 rounded-xl bg-[#18181b] border border-[#27272a] text-white text-xs font-mono focus:outline-none focus:border-zinc-500 transition-colors resize-none"
            />
          </div>

          {/* Form Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                Topic Title
              </label>
              <input
                type="text"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder="e.g. Distributed Systems"
                className="w-full px-3.5 py-2 rounded-xl bg-[#18181b] border border-[#27272a] text-white text-xs font-mono focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                Number of MCQs
              </label>
              <select
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#18181b] border border-[#27272a] text-white text-xs font-mono focus:outline-none focus:border-zinc-500 cursor-pointer"
              >
                <option value={10}>10 Questions</option>
                <option value={12}>12 Questions</option>
                <option value={15}>15 Questions</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full font-semibold text-xs bg-white hover:bg-zinc-200 text-black shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <span>Synthesize Quiz</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
