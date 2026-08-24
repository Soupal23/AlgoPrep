import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { RoleRoute } from './components/RoleRoute';

// Core & Student Pages
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { TestTaking } from './pages/TestTaking';
import { Results } from './pages/Results';
import { Leaderboard } from './pages/Leaderboard';
import { Profile } from './pages/Profile';
import { SyllabusAI } from './pages/SyllabusAI';

// Phase 5B Pages
import { BrowseTeachers } from './pages/BrowseTeachers';
import { AnnouncementFeed } from './pages/AnnouncementFeed';
import { RecordedLectures } from './pages/RecordedLectures';
import { Messages } from './pages/Messages';

// Phase 6B Pages
import { TeacherDashboard } from './pages/TeacherDashboard';
import { TeacherRoster } from './pages/TeacherRoster';
import { TeacherAnnouncements } from './pages/TeacherAnnouncements';
import { TeacherLectures } from './pages/TeacherLectures';
import { TeacherTests } from './pages/TeacherTests';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const AppContent = () => {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Student Routes */}
          <Route
            path="/dashboard"
            element={
              <RoleRoute allowedRoles={['student']}>
                <Dashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/teachers"
            element={
              <RoleRoute allowedRoles={['student']}>
                <BrowseTeachers />
              </RoleRoute>
            }
          />
          <Route
            path="/announcements"
            element={
              <RoleRoute allowedRoles={['student']}>
                <AnnouncementFeed />
              </RoleRoute>
            }
          />
          <Route
            path="/lectures"
            element={
              <RoleRoute allowedRoles={['student']}>
                <RecordedLectures />
              </RoleRoute>
            }
          />
          <Route
            path="/test/:id"
            element={
              <RoleRoute allowedRoles={['student']}>
                <TestTaking />
              </RoleRoute>
            }
          />

          {/* Teacher Routes */}
          <Route
            path="/teacher/dashboard"
            element={
              <RoleRoute allowedRoles={['teacher']}>
                <TeacherDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/teacher/roster"
            element={
              <RoleRoute allowedRoles={['teacher']}>
                <TeacherRoster />
              </RoleRoute>
            }
          />
          <Route
            path="/teacher/announcements"
            element={
              <RoleRoute allowedRoles={['teacher']}>
                <TeacherAnnouncements />
              </RoleRoute>
            }
          />
          <Route
            path="/teacher/lectures"
            element={
              <RoleRoute allowedRoles={['teacher']}>
                <TeacherLectures />
              </RoleRoute>
            }
          />
          <Route
            path="/teacher/tests"
            element={
              <RoleRoute allowedRoles={['teacher']}>
                <TeacherTests />
              </RoleRoute>
            }
          />

          {/* Shared Authenticated Routes */}
          <Route
            path="/messages"
            element={
              <RoleRoute allowedRoles={['student', 'teacher']}>
                <Messages />
              </RoleRoute>
            }
          />
          <Route
            path="/results/:id"
            element={
              <ProtectedRoute>
                <Results />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-generate"
            element={
              <ProtectedRoute>
                <SyllabusAI />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
