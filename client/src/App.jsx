import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/Auth';
import { Loading } from './ui';
import AppShell from './layout/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Agenda from './pages/Agenda';
import Consultations from './pages/Consultations';
import OdontoPage from './pages/OdontoPage';
import { PlansPage, PlanPage } from './pages/Plans';
import { OrthoList, OrthoDetail } from './pages/Ortho';
import { QuotesPage, QuotePage } from './pages/Quotes';
import { InvoicesPage, InvoicePage } from './pages/Invoices';
import Payments from './pages/Payments';
import Documents from './pages/Documents';
import Imaging from './pages/Imaging';
import Lab from './pages/Lab';
import Stock from './pages/Stock';
import Suppliers from './pages/Suppliers';
import Communication from './pages/Communication';
import Followups from './pages/Followups';
import Reviews from './pages/Reviews';
import Analytics from './pages/Analytics';
import Staff from './pages/Staff';
import Settings from './pages/Settings';
import Account from './pages/Account';

const Landing = lazy(() => import('./public/Landing'));
const Booking = lazy(() => import('./public/Booking'));
const Portal = lazy(() => import('./public/Portal'));

function RequireAuth({ children }) {
  const { status } = useAuth(); const loc = useLocation();
  if (status === 'loading') return <Loading text="Connexion sécurisée…" />;
  if (status === 'out') return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/rdv" element={<Booking />} />
        <Route path="/portail/*" element={<Portal />} />
        <Route path="/*" element={<AuthProvider><StaffRoutes /></AuthProvider>} />
      </Routes>
    </Suspense>
  );
}

function StaffRoutes() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route path="app" element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="patients" element={<Patients />} />
        <Route path="patients/:id" element={<PatientDetail />} />
        <Route path="patients/:id/:tab" element={<PatientDetail />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="consultations" element={<Consultations />} />
        <Route path="odontogramme" element={<OdontoPage />} />
        <Route path="odontogramme/:pid" element={<OdontoPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="plans/:id" element={<PlanPage />} />
        <Route path="orthodontie" element={<OrthoList />} />
        <Route path="orthodontie/:id" element={<OrthoDetail />} />
        <Route path="devis" element={<QuotesPage />} />
        <Route path="devis/:id" element={<QuotePage />} />
        <Route path="facturation" element={<InvoicesPage />} />
        <Route path="facturation/:id" element={<InvoicePage />} />
        <Route path="paiements" element={<Payments />} />
        <Route path="documents" element={<Documents />} />
        <Route path="radiographies" element={<Imaging />} />
        <Route path="radiographies/:tab" element={<Imaging />} />
        <Route path="laboratoire" element={<Lab />} />
        <Route path="stock" element={<Stock />} />
        <Route path="fournisseurs" element={<Suppliers />} />
        <Route path="communication" element={<Communication />} />
        <Route path="communication/:pid" element={<Communication />} />
        <Route path="suivis" element={<Followups />} />
        <Route path="avis" element={<Reviews />} />
        <Route path="personnel" element={<Staff />} />
        <Route path="parametres" element={<Settings />} />
        <Route path="compte" element={<Account />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
