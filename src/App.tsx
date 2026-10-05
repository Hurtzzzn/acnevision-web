import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './store/auth';
import { Layout } from './components/Layout';
import { RequireAdmin, RequireAuth } from './components/guards';
import { Spinner } from './components/ui';
import Home from './pages/Home';
import HowItWorks from './pages/HowItWorks';
import Scan from './pages/Scan';
import Result from './pages/Result';
import DetectResult from './pages/DetectResult';
import About from './pages/About';
import { Login, Register, ResetPassword } from './pages/Auth';
import { DEFAULT_AFTER_LOGIN } from './lib/redirect';

const Analyze = lazy(() => import('./pages/Analyze'));
const UserDashboard = lazy(() => import('./pages/Dashboard'));
const History = lazy(() => import('./pages/History'));
const HistoryDetail = lazy(() => import('./pages/HistoryDetail'));
const Chat = lazy(() => import('./pages/Chat'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const ModelMonitor = lazy(() => import('./pages/admin/ModelMonitor'));
const Users = lazy(() => import('./pages/admin/Users'));
const Audit = lazy(() => import('./pages/admin/Audit'));

/** Landing page for guests; signed-in users go straight to their dashboard. */
function HomeRoute() {
  const { user, ready } = useAuth();
  if (!ready) return <div className="p-12 text-center"><Spinner label="Memuat..." /></div>;
  return user ? <Navigate to={DEFAULT_AFTER_LOGIN} replace /> : <Home />;
}

function NotFound() {
  return <div className="py-16 text-center"><h1>404</h1><p className="mt-2">Halaman tidak ditemukan.</p></div>;
}

export default function App() {
  const init = useAuth((s) => s.init);
  useEffect(() => { init(); }, [init]);

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="p-12 text-center"><Spinner label="Memuat..." /></div>}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomeRoute />} />
            <Route path="how-it-works" element={<HowItWorks />} />
            <Route path="scan" element={<Scan />} />
            <Route path="analysis/:analysisId" element={<RequireAuth><Result /></RequireAuth>} />
            <Route path="detect-result" element={<DetectResult />} />
            <Route path="about" element={<About />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="analyze" element={<RequireAuth><Analyze /></RequireAuth>} />
            <Route path="dashboard" element={<RequireAuth><UserDashboard /></RequireAuth>} />
            <Route path="history" element={<RequireAuth><History /></RequireAuth>} />
            <Route path="history/:scanId" element={<RequireAuth><HistoryDetail /></RequireAuth>} />
            <Route path="chat" element={<RequireAuth><Chat /></RequireAuth>} />
            <Route path="profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
            <Route index element={<Dashboard />} />
            <Route path="model" element={<ModelMonitor />} />
            <Route path="users" element={<Users />} />
            <Route path="audit" element={<Audit />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
