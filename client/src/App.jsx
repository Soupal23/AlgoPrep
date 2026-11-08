import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { RoleRoute } from './components/RoleRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

// Core Pages
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { TestTaking } from './pages/TestTaking';
import { Results } from './pages/Results';
import { Profile } from './pages/Profile';
import { SyllabusAI } from './pages/SyllabusAI';
import { AdminDashboard } from './pages/AdminDashboard';
import { Workspaces } from './pages/Workspaces';
import { WorkspaceDetail } from './pages/WorkspaceDetail';
import { RoadmapView } from './pages/RoadmapView';
import { DayView } from './pages/DayView';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const GuestRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  if (isAuthenticated && user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export const AppContent = () => {
  const { user } = useAuth();
  const location = useLocation();

  const isTestRoute = location.pathname.startsWith('/test/');
  const isSidebarVisible = !!user && !isTestRoute;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f0eef5] flex flex-col font-sans">
      {!isTestRoute && <Navbar />}
      <main className={`flex-1 ${isSidebarVisible ? 'md:ml-64' : ''}`}>
        <ErrorBoundary>
          <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

          {/* Student / Core Routes */}
          <Route
            path="/workspaces"
            element={
              <ProtectedRoute>
                <Workspaces />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspaces/:id"
            element={
              <ProtectedRoute>
                <WorkspaceDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspaces/:id/roadmap"
            element={
              <ProtectedRoute>
                <RoadmapView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspaces/:workspaceId/days/:dayId"
            element={
              <ProtectedRoute>
                <DayView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/days/:dayId"
            element={
              <ProtectedRoute>
                <DayView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RoleRoute allowedRoles={['student', 'admin']}>
                <Dashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/test/:id"
            element={
              <RoleRoute allowedRoles={['student', 'admin']}>
                <TestTaking />
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

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <RoleRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </RoleRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
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
