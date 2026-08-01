import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { refreshUserProfile } from './lib/actions/authActions';
import { apiClient } from './lib/api/axiosConfig';
import './App.css';

import { Navbar, Footer, TopBanner, PrivateRoute, AdminRoute, JanazaToast } from './components';
import DeclareChoiceModal from './components/DeclareChoiceModal';
import { DeclareModalProvider } from './context/DeclareModalContext';
import LandingPage from './pages/LandingPage';
import PrieresPage from './pages/PrieresPage';
import MosqueesPage from './pages/MosqueesPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import DonatePage from './pages/DonatePage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID ?? '';

function AppRoutes() {
  const { i18n } = useTranslation();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);

  useEffect(() => {
    const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // La purge des janazas expirées est gérée côté serveur via getPrieresUpcoming.
  // Le client-side expire causait un blank de 15-20s toutes les 60s (mergeList guard
  // ne protège pas après que la liste a été vidée localement).
  // Les prières disparaissent naturellement à la prochaine réponse du poll (≤30s).

  useEffect(() => {
    apiClient.get('/api/features')
      .then(res => dispatch({ type: 'FEATURES_LOADED', payload: { donationButtonVisible: res.data.donationButtonVisible ?? true } }))
      .catch(() => {});
  }, [dispatch]);

  // Rafraîchit canImportFlyer dès que l'onglet redevient visible ou toutes les 3 minutes
  useEffect(() => {
    if (!isAuthenticated) return;
    const refresh = () => { if (!document.hidden) dispatch(refreshUserProfile()); };
    document.addEventListener('visibilitychange', refresh);
    const interval = setInterval(refresh, 30 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      clearInterval(interval);
    };
  }, [isAuthenticated, dispatch]);

  return (
    <BrowserRouter>
      <DeclareModalProvider>
        <DeclareChoiceModal />
        <div className="sticky-header">
          <TopBanner />
          <Navbar />
        </div>
        <JanazaToast />
        <main className="main-content">
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/prieres" element={<PrieresPage />} />
          <Route path="/mosquees" element={<MosqueesPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/soutenez-nous" element={<DonatePage />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/inscription" element={<RegisterPage />} />
          <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
          <Route path="/reinitialiser-mdp" element={<ResetPasswordPage />} />
          <Route
            path="/tableau-de-bord/*"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
          </Routes>
        </main>
        <Footer />
      </DeclareModalProvider>
    </BrowserRouter>
  );
}

function App() {
  if (GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AppRoutes />
      </GoogleOAuthProvider>
    );
  }
  return <AppRoutes />;
}

export default App;
