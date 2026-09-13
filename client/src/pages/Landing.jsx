import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Terminal,
  ArrowRight,
  Sparkles,
  Clock,
  Award,
  CheckCircle2,
  BrainCircuit,
  Cpu,
  Network,
  Database,
  Code,
  BookOpen,
  Play,
  FileUp,
  LogIn,
  UserPlus,
  BarChart3
} from 'lucide-react';

export const Landing = () => {
  const { isAuthenticated } = useAuth();

  const topics = [
    {
      name: 'Operating Systems',
      icon: Cpu,
      badge: 'Processes • Memory • Semaphores',
    },
    {
      name: 'Computer Networks',
      icon: Network,
      badge: 'OSI • TCP/IP • Routing',
    },
    {
      name: 'Database Management',
      icon: Database,
      badge: 'SQL • Normalization • ACID',
    },
    {
      name: 'Data Structures & Algorithms',
      icon: Code,
      badge: 'Trees • Graphs • DP',
    },
    {
      name: 'Object-Oriented Programming',
      icon: BookOpen,
      badge: 'Encapsulation • Polymorphism',
    }
  ];

  return (
    <div className="relative overflow-hidden bg-[#0a0a0f] text-[#f0eef5] min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#f0eef5] leading-[1.15]">
            Master Computer Science Exams with{' '}
            <span className="text-indigo-400">
              Real CBT Simulation
            </span>
          </h1>

          {/* Call-To-Action Button Group */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors flex items-center justify-center gap-3 text-base"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Go to Tests Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors flex items-center justify-center gap-3 text-base"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Get Started Free</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl font-semibold bg-[#1c1729] text-[#f0eef5] border border-[#2a2240] hover:bg-[#251e35] transition-colors flex items-center justify-center gap-2 text-base"
                >
                  <LogIn className="w-5 h-5 text-purple-400" />
                  <span>Sign In to Account</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Topic Explorer Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl font-extrabold text-[#f0eef5]">Computer Science Subjects</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {topics.map((t, i) => {
            const Icon = t.icon;
            return (
              <div
                key={i}
                className="bg-[#14111f] p-6 rounded-2xl border border-[#2a2240] flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#1c1729] border border-[#2a2240] flex items-center justify-center text-purple-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#1c1729] border border-[#2a2240] text-[#9f99b0]">
                      {t.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#f0eef5]">
                    {t.name}
                  </h3>
                </div>

                <div className="pt-3 border-t border-[#2a2240] flex items-center justify-between text-xs font-mono text-[#9f99b0]">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Mock Tests Available</span>
                  </span>
                  <Link
                    to={isAuthenticated ? '/dashboard' : '/login'}
                    className="text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Practice</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Special AI Generator Card */}
          <div className="bg-[#14111f] p-6 rounded-2xl border border-purple-800/60 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400">
                  <FileUp className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-1 rounded bg-purple-950 text-purple-300 border border-purple-800">
                  AI Feature
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#f0eef5]">AI Custom Test Builder</h3>
            </div>

            <Link
              to={isAuthenticated ? '/ai-generate' : '/register'}
              className="w-full py-2.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white text-xs text-center flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Try AI Generator</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#14111f] rounded-3xl border border-[#2a2240] p-8 sm:p-12 text-center max-w-3xl mx-auto">
          <div className="space-y-6 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto shadow-sm">
              <Terminal className="w-6 h-6 text-white" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-[#f0eef5]">Ready to Test Your Computer Science Skills?</h2>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/login"
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold bg-[#1c1729] border border-[#2a2240] text-[#f0eef5] hover:bg-[#251e35] transition-colors"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-[#2a2240] text-center text-xs text-[#6b6380] font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-[#9f99b0]">AlgoPrep CBT Platform</span>
          </div>
          <div>
            <span>&copy; {new Date().getFullYear()} AlgoPrep. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
