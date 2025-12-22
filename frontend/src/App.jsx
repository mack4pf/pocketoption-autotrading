import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminSignals from './pages/AdminSignals';
import Signals from './pages/Signals';

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen bg-primary"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div></div>;

  if (!user) {
    return <Navigate to={requireAdmin ? "/admin" : "/"} replace />;
  }

  if (requireAdmin && !user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-primary text-gray-100 font-sans">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin" element={<AdminLogin />} />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/signals" element={
            <ProtectedRoute>
              <Signals />
            </ProtectedRoute>
          } />

          <Route path="/admin/dashboard" element={
            <ProtectedRoute requireAdmin={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin/signals" element={
            <ProtectedRoute requireAdmin={true}>
              <AdminSignals />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
