import { useEffect, useState, useMemo } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchPrieresByUser, updatePriere, deletePriere } from '../lib/actions/priereJanazaActions';
import { fetchMosquees } from '../lib/actions/mosqueeActions';
import { logout } from '../lib/actions/authActions';
import { useDeclareModal } from '../context/DeclareModalContext';
import DeclarePriereForm from './shared/DeclarePriereForm';
import PriereCard from './shared/PriereCard';
import EditPriereModal, { buildInitialForm, buildPayload } from './shared/EditPriereModal';
import { getUtilisateurByIdentityId } from '../lib/api/utilisateurApi';

function normalize(str) {
  return (str ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useSelector((s) => s.auth);
  const { openModal } = useDeclareModal();
  const canImport = !!(user?.canImportFlyer || ['admin', 'superadmin'].includes(user?.role?.toLowerCase()));

  function handleDeclare(e) {
    if (canImport) {
      e.preventDefault();
      openModal();
    }
  }
  const { myPrieres, myPrieresLoading } = useSelector((s) => s.priereJanaza);
  const [resolvedDbId, setResolvedDbId] = useState(null);

  const isAdmin = user?.role && ['admin', 'superadmin'].includes(user.role.toLowerCase());

  const displayPrieres = myPrieres;
  const displayLoading = myPrieresLoading;

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [filterGenre,   setFilterGenre]   = useState('');
  const [filterMosquee, setFilterMosquee] = useState('');
  const [filterDate,    setFilterDate]    = useState('');

  // ── Edit modal ────────────────────────────────────────────────────────────────
  const [editPriere, setEditPriere] = useState(null);
  const [priereForm, setPriereForm] = useState({});

  // ── Resolve DB user ID ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    if (user.dbId) { setResolvedDbId(user.dbId); return; }
    getUtilisateurByIdentityId(user.id)
      .then(res => { if (res.data?.id) setResolvedDbId(res.data.id); })
      .catch(() => {});
  }, [user]);

  // ── Fetch data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchMosquees());
  }, [dispatch]);

  useEffect(() => {
    if (resolvedDbId) dispatch(fetchPrieresByUser(resolvedDbId));
  }, [dispatch, resolvedDbId]);

  // ── Sort: newest → oldest by dateCreation ────────────────────────────────────
  const sortedPrieres = useMemo(() => {
    return [...displayPrieres].sort((a, b) =>
      new Date(b.dateCreation ?? 0) - new Date(a.dateCreation ?? 0)
    );
  }, [displayPrieres]);

  // ── Filter options ────────────────────────────────────────────────────────────
  const uniqueMosquees = useMemo(() => {
    const seen = new Set();
    return sortedPrieres
      .map((p) => p.mosqueeNom)
      .filter((n) => { if (!n || seen.has(n)) return false; seen.add(n); return true; })
      .sort();
  }, [sortedPrieres]);

  const uniqueDates = useMemo(() => {
    const seen = new Set();
    return sortedPrieres
      .map((p) => {
        if (!p.dateHeurePriere) return null;
        const value = new Date(p.dateHeurePriere).toISOString().slice(0, 10);
        const label = new Date(p.dateHeurePriere).toLocaleDateString('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long',
        });
        return { value, label };
      })
      .filter(Boolean)
      .filter(({ value }) => { if (seen.has(value)) return false; seen.add(value); return true; })
      .sort((a, b) => b.value.localeCompare(a.value));
  }, [sortedPrieres]);

  // ── Filtered list ─────────────────────────────────────────────────────────────
  const filteredPrieres = useMemo(() => {
    let result = sortedPrieres;
    if (filterGenre)   result = result.filter((p) => normalize(p.genre) === normalize(filterGenre));
    if (filterMosquee) result = result.filter((p) => p.mosqueeNom === filterMosquee);
    if (filterDate)    result = result.filter((p) =>
      p.dateHeurePriere && new Date(p.dateHeurePriere).toISOString().slice(0, 10) === filterDate
    );
    return result;
  }, [sortedPrieres, filterGenre, filterMosquee, filterDate]);

  const hasFilter = filterGenre || filterMosquee || filterDate;
  const clearFilters = () => { setFilterGenre(''); setFilterMosquee(''); setFilterDate(''); };

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleDelete = (id) => {
    if (window.confirm('Supprimer cette prière ?')) dispatch(deletePriere(id));
  };

  const openEdit = (priere) => {
    setEditPriere(priere);
    setPriereForm(buildInitialForm(priere));
  };

  const handleSavePriere = (e) => {
    e.preventDefault();
    dispatch(updatePriere(editPriere.id, buildPayload(priereForm)));
    setEditPriere(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  // ─────────────────────────────────────────────────────────────────────────────
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
          <Link to="/tableau-de-bord/declarer" onClick={handleDeclare}>{t('dashboard.declare')}</Link>
          {isAdmin && (
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h2 style={{ margin: 0 }}>{t('dashboard.title')}</h2>
                  {isAdmin && (
                    <span style={{ background: '#e8f0fe', color: '#1a56db', fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 500 }}>
                      Compte administrateur
                    </span>
                  )}
                </div>

                {/* ── Filtres ── */}
                {!displayLoading && sortedPrieres.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
                    <select
                      className="tile-filter-select"
                      value={filterGenre}
                      onChange={(e) => setFilterGenre(e.target.value)}
                    >
                      <option value="">Tous les genres</option>
                      <option value="homme">Homme</option>
                      <option value="femme">Femme</option>
                      <option value="enfant">Enfant</option>
                    </select>

                    <select
                      className="tile-filter-select"
                      value={filterMosquee}
                      onChange={(e) => setFilterMosquee(e.target.value)}
                    >
                      <option value="">Toutes les mosquées</option>
                      {uniqueMosquees.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>

                    <select
                      className="tile-filter-select"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                    >
                      <option value="">Toutes les dates</option>
                      {uniqueDates.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>

                    {hasFilter && (
                      <button className="filter-clear" onClick={clearFilters}>
                        Effacer les filtres
                      </button>
                    )}

                    <span className="admin-count" style={{ marginLeft: 'auto' }}>
                      {filteredPrieres.length} prière{filteredPrieres.length !== 1 ? 's' : ''}
                      {hasFilter && ` sur ${sortedPrieres.length}`}
                    </span>
                  </div>
                )}

                {displayLoading && <p className="text-muted">{t('dashboard.loading')}</p>}

                {!displayLoading && sortedPrieres.length === 0 && (
                  <div className="empty-state">
                    <p>{t('dashboard.empty')}</p>
                    <Link to="/tableau-de-bord/declarer" className="btn btn-primary" onClick={handleDeclare}>
                      {t('dashboard.declare_first')}
                    </Link>
                  </div>
                )}

                {!displayLoading && filteredPrieres.length === 0 && hasFilter && (
                  <div className="empty-state">
                    <p>Aucune prière ne correspond aux filtres.</p>
                    <button className="btn btn-outline" onClick={clearFilters}>Effacer les filtres</button>
                  </div>
                )}

                <div className="card-grid">
                  {filteredPrieres.map((p) => {
                    const canAct = isAdmin || p.utilisateurId === resolvedDbId;
                    return (
                      <PriereCard
                        key={p.id}
                        priere={p}
                        onEdit={canAct ? openEdit : undefined}
                        onDelete={canAct ? handleDelete : undefined}
                      />
                    );
                  })}
                </div>
              </>
            }
          />
          <Route path="declarer" element={<DeclarePriereForm />} />
        </Routes>
      </div>

      {editPriere && (
        <EditPriereModal
          priere={editPriere}
          form={priereForm}
          setForm={setPriereForm}
          onClose={() => setEditPriere(null)}
          onSubmit={handleSavePriere}
        />
      )}
    </div>
  );
}
