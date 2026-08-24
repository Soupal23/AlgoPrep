import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Briefcase, Upload, CheckCircle2, AlertCircle, ArrowLeft, FileText } from 'lucide-react';

export const TeachHere = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subjectFocus, setSubjectFocus] = useState('');
  const [bio, setBio] = useState('');
  const [resumeFile, setResumeFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subjectFocus.trim() || !resumeFile) {
      setError('Please fill in all required fields and upload your resume.');
      return;
    }

    const fd = new FormData();
    fd.append('name', name.trim());
    fd.append('email', email.trim());
    fd.append('subjectFocus', subjectFocus.trim());
    if (bio.trim()) fd.append('bio', bio.trim());
    fd.append('file', resumeFile);

    try {
      setSubmitting(true);
      setError('');
      await api.submitTeacherApplication(fd);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit teacher application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <Link to="/" className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </Link>

      <div className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-400 shadow-lg">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Join AlgoPrep as an Instructor</h1>
            <p className="text-xs text-slate-400">Apply to teach computer science CBT courses, host live tests, and publish lectures</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {submitted ? (
        <div className="glass-panel rounded-3xl p-12 text-center space-y-6 shadow-2xl border border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-400 mx-auto shadow-lg">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Application Received!</h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              Thank you for applying to teach on AlgoPrep. Our administrative team will review your resume and email <strong className="text-emerald-400 font-mono">{email}</strong> once your account is approved for teacher registration.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-center gap-4">
            <Link
              to="/login"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 text-white font-bold text-xs shadow-md"
            >
              Return to Login
            </Link>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-8 border border-slate-800 shadow-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Donald Knuth"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="knuth@university.edu"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-2">Subject Specialization *</label>
              <input
                type="text"
                value={subjectFocus}
                onChange={(e) => setSubjectFocus(e.target.value)}
                placeholder="e.g. Data Structures, Algorithms, Operating Systems"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-2">Teaching Experience & Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about your computer science background and teaching experience..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-2">Upload Resume / CV (.pdf, .doc, .docx, .txt) *</label>
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-dashed border-slate-700 text-center space-y-3">
                <FileText className="w-8 h-8 text-emerald-400 mx-auto" />
                <div>
                  <label
                    htmlFor="resume-file"
                    className="cursor-pointer text-xs font-bold text-emerald-400 hover:underline"
                  >
                    {resumeFile ? resumeFile.name : 'Click to select resume document'}
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1">Maximum file size: 5MB</p>
                </div>
                <input
                  id="resume-file"
                  type="file"
                  accept=".pdf, .doc, .docx, .txt"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  className="hidden"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 text-white font-bold text-sm shadow-lg hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>{submitting ? 'Submitting Candidate Application...' : 'Submit Application'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
