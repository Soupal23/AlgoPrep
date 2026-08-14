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
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel border border-slate-800 p-8 bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-indigo-950/40 shadow-2xl">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gemini AI Test Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Syllabus-to-Test AI Generator
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Upload your course syllabus PDF or plain text to instantly extract key CS concepts and synthesize a proctored 30-minute exam.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Card */}
      {generatedTest ? (
        <div className="glass-panel rounded-3xl p-8 border border-emerald-500/30 text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 uppercase">
              AI Generation Complete
            </span>
            <h2 className="text-2xl font-extrabold text-white mt-3">{generatedTest.title}</h2>
            <p className="text-sm text-slate-400 mt-1 max-w-lg mx-auto">{generatedTest.description}</p>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs font-mono text-slate-300 pt-2">
            <div>Questions: <span className="text-cyan-400 font-bold">{generatedTest.totalQuestions}</span></div>
            <div>Time Limit: <span className="text-amber-400 font-bold">{generatedTest.timeLimitMinutes}m</span></div>
            <div>Scheme: <span className="text-emerald-400 font-bold">+{generatedTest.markingScheme?.correct} / {generatedTest.markingScheme?.incorrect}</span></div>
          </div>

          <button
            onClick={() => navigate(`/test/${generatedTest._id}`)}
            className="px-8 py-3.5 rounded-xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 hover:opacity-95 transition-all inline-flex items-center gap-2"
          >
            <span>Start AI Exam Now</span>
            <Play className="w-4 h-4 fill-current" />
          </button>
        </div>
      ) : (
        /* Generator Form */
        <form onSubmit={handleGenerate} className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-6 shadow-xl">
          {/* File Upload Zone */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Upload Syllabus Document (PDF or TXT, Max 5MB)
            </label>
            <div className="relative border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-6 text-center transition-colors bg-slate-900/50 group">
              <input
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-2 pointer-events-none">
                <FileUp className="w-10 h-10 text-slate-500 group-hover:text-purple-400 mx-auto transition-colors" />
                {file ? (
                  <p className="text-sm font-semibold text-purple-300 font-mono">
                    Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-300">
                      Drag & drop your syllabus PDF / text file here, or click to browse
                    </p>
                    <p className="text-xs text-slate-500">Supported formats: PDF, TXT (capped at top 8,000 characters)</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Or Paste Text Option */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Or Paste Syllabus Excerpt Directly
            </label>
            <textarea
              rows={4}
              value={syllabusText}
              onChange={(e) => setSyllabusText(e.target.value)}
              placeholder="Paste syllabus topics, course modules, or lecture notes..."
              className="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Form Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Subject / Topic Title
              </label>
              <input
                type="text"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder="e.g. Distributed Systems & Microservices"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Number of MCQs
              </label>
              <select
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value, 10))}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
              >
                <option value={10}>10 Questions (Standard)</option>
                <option value={12}>12 Questions</option>
                <option value={15}>15 Questions (Full Exam)</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Extracting Syllabus & Prompting Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-purple-200" />
                  <span>Synthesize AI Test Now</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
