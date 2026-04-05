import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

const Login = lazy(() => import('./components/auth/Login'));
const Register = lazy(() => import('./components/auth/Register'));
const DashboardPage = lazy(() => import('./components/dashboard/DashboardPage'));

function App() {
  const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
  };

  const PrivateRoute = ({ children }) => {
    return isAuthenticated() ? children : <Navigate to="/login" />;
  };

  return (
    <Router>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/budgets"
            element={
              <PrivateRoute>
                <DashboardPage view="budgets" />
              </PrivateRoute>
            }
          />
          <Route
            path="/forecasts"
            element={
              <PrivateRoute>
                <DashboardPage view="forecasts" />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <DashboardPage view="reports" />
              </PrivateRoute>
            }
          />
          <Route
            path="/service-analysis"
            element={
              <PrivateRoute>
                <DashboardPage view="service-analysis" />
              </PrivateRoute>
            }
          />
          <Route
            path="/anomalies"
            element={
              <PrivateRoute>
                <DashboardPage view="anomalies" />
              </PrivateRoute>
            }
          />
          <Route
            path="/integrations"
            element={
              <PrivateRoute>
                <DashboardPage view="integrations" />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
