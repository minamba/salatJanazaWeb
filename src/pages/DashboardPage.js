import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchPrieresByUser } from '../lib/actions/priereJanazaActions';
import { fetchMosquees } from '../lib/actions/mosqueeActions';
import { logout } from '../lib/actions/authActions';
import DeclarePriereForm from './shared/DeclarePriereForm';
import PriereCard from './shared/PriereCard';
import { deletePriere } from '../lib/actions/priereJanazaActions';
import { getUtilisateurByIdentityId } from '../lib/api/utilisateurApi';

export default function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useSelector((s) => s.auth);
  const { myPrieres: prieres, myPrieresLoading: loading } = useSelector((s) => s.priereJanaza);
  const [resolvedDbId, setResolvedDbId] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    if (user.dbId) {
      setResolvedDbId(user.dbId);
    } else {
      getUtilisateurByIdentityId(user.id)
        .then(res => { if (res.data?.id) setResolvedDbId(res.data.id); })
        .catch(() => {});
    }
    dispatch(fetchMosquees());
  }, [dispatch, user]);

  useEffect(() => {
    if (resolvedDbId) dispatch(fetchPrieresByUser(resolvedDbId));
  }, [dispatch, resolvedDbId]);

  const handleDelete = (id) => {
    if (window.confirm('Supprimer cette prière ?')) dispatch(deletePriere(id));
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <div className="page dashboard">
      <div className="dashboard-sidebar">
        <div className="dashboard-user">
          <div className="avatar">{(user?.prenom?.[0] ?? '?').toUpperCase()}</div>
          <div>
            <p className="user-name">{user?.prenom} {user?.nom}</p>
            <p className="user-email">{user?.email}</p>
          </div>
        </div>
        <nav className="dashboard-nav">
          <Link to="/tableau-de-bord">{t('dashboard.my_prayers')}</Link>
          <Link to="/tableau-de-bord/declarer">{t('dashboard.declare')}</Link>
          {user?.role === 'admin' && (
            <Link to="/admin">{t('dashboard.admin')}</Link>
          )}
          <button className="btn-logout" onClick={handleLogout}>{t('dashboard.logout')}</button>
        </nav>
      </div>

      <div className="dashboard-content">
        <Routes>
          <Route
            index
            element={
              <>
                <h2>{t('dashboard.title')}</h2>
                {loading && <p className="text-muted">{t('dashboard.loading')}</p>}
                {!loading && prieres.length === 0 && (
                  <div className="empty-state">
                    <p>{t('dashboard.empty')}</p>
                    <Link to="/tableau-de-bord/declarer" className="btn btn-primary">
                      {t('dashboard.declare_first')}
                    </Link>
                  </div>
                )}
                <div className="card-grid">
                  {prieres.map((p) => (
                    <PriereCard key={p.id} priere={p} onDelete={handleDelete} />
                  ))}
                </div>
              </>
            }
          />
          <Route path="declarer" element={<DeclarePriereForm />} />
        </Routes>
      </div>
    </div>
  );
}
