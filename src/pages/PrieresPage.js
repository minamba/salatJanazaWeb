import { useEffect, useState, useMemo, useCallback, lazy, Suspense, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchPrieresUpcoming, updatePriere, deletePriere } from '../lib/actions/priereJanazaActions';
import { fetchMosquees } from '../lib/actions/mosqueeActions';
import { getUtilisateurByIdentityId } from '../lib/api/utilisateurApi';
import PriereCard from './shared/PriereCard';
import EditPriereModal, { buildInitialForm, buildPayload } from './shared/EditPriereModal';
import { useCountryFlag } from '../lib/countryFlag';

const PriereMap = lazy(() => import('../components/PriereMap'));

const LOCALE_MAP = { fr: 'fr-FR', en: 'en-US', ar: 'ar-SA', tr: 'tr-TR', ja: 'ja-JP', ko: 'ko-KR', ms: 'ms-MY', ur: 'ur-PK', id: 'id-ID', bn: 'bn-BD', ru: 'ru-RU', pt: 'pt-BR', de: 'de-DE', it: 'it-IT', es: 'es-ES' };

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalize(str) {
  return (str ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function IconMap() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  );
}
function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}
function IconPin() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="2.5"/>
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}
function IconAll() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  );
}

const GENRES = [
  { value: 'Homme', key: 'homme' },
  { value: 'Femme', key: 'femme' },
  { value: 'Enfant', key: 'enfant' },
];

function CountryResolver({ prayerId, lat, lon, adresse, onResolve }) {
  const iso = useCountryFlag(lat, lon, adresse);
  useEffect(() => {
    if (iso) onResolve(prayerId, iso);
  }, [iso, prayerId]); // onResolve excluded: stable callback via useCallback
  return null;
}

export default function PrieresPage() {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const locale = LOCALE_MAP[i18n.language] ?? 'fr-FR';
  const { list, loading } = useSelector((s) => s.priereJanaza);
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const [resolvedDbId, setResolvedDbId] = useState(null);
  const [editPriere, setEditPriere]     = useState(null);
  const [priereForm, setPriereForm]     = useState({});

  const isAdmin = user?.role && ['admin', 'superadmin'].includes(user.role.toLowerCase());

  useEffect(() => {
    if (!user?.id) return;
    if (user.dbId) { setResolvedDbId(user.dbId); return; }
    getUtilisateurByIdentityId(user.id)
      .then(res => { if (res.data?.id) setResolvedDbId(res.data.id); })
      .catch(() => {});
  }, [user]);

  const isMobile = window.innerWidth <= 700;
  const [view, setView]       = useState('tile');
  const [mapMode, setMapMode] = useState('country');

  const controlsRef = useRef(null);
  useEffect(() => {
    const pageHeader = document.querySelector('.prieres-page-header');
    if (!pageHeader) return;
    const stickyHeader = document.querySelector('.sticky-header');
    const headerH = stickyHeader ? stickyHeader.offsetHeight : 0;
    window.scrollTo({ top: pageHeader.offsetTop - headerH, behavior: 'instant' });
  }, []);

  const [userPos, setUserPos] = useState(null);
  const [geoError, setGeoError] = useState(false);
  const geoAsked = useRef(false);

  const requestGeo = useCallback(() => {
    if (geoAsked.current || !navigator.geolocation) return;
    geoAsked.current = true;
    setGeoError(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserPos([pos.coords.latitude, pos.coords.longitude]); setGeoError(false); },
      () => { geoAsked.current = false; setGeoError(true); },
      { timeout: 10000 }
    );
  }, []);

  const [filterNom,     setFilterNom]     = useState('');
  const [filterGenre,   setFilterGenre]   = useState('');
  const [filterMosquee, setFilterMosquee] = useState('');
  const [filterDate,    setFilterDate]    = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [sortProximity, setSortProximity] = useState(false);
  const [countryMap, setCountryMap] = useState(() => new Map());

  const handleCountryResolve = useCallback((prayerId, iso) => {
    setCountryMap(prev => {
      if (prev.get(prayerId) === iso) return prev;
      const next = new Map(prev);
      next.set(prayerId, iso);
      return next;
    });
  }, []);

  useEffect(() => { dispatch(fetchPrieresUpcoming()); dispatch(fetchMosquees()); }, [dispatch]);

  const uniqueMosquees = useMemo(() => {
    const seen = new Set();
    return list
      .map((p) => p.mosqueeNom)
      .filter((n) => { if (!n || seen.has(n)) return false; seen.add(n); return true; })
      .sort();
  }, [list]);

  const uniqueDates = useMemo(() => {
    const seen = new Set();
    return list
      .map((p) => {
        const d = new Date(p.dateHeurePriere);
        const value = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
        return { value, label };
      })
      .filter(({ value }) => { if (seen.has(value)) return false; seen.add(value); return true; })
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [list, locale]);

  const uniqueCountries = useMemo(() => {
    const isos = new Set(countryMap.values());
    if (isos.size < 2) return [];
    try {
      const display = new Intl.DisplayNames([i18n.language ?? 'fr'], { type: 'region' });
      return [...isos]
        .map(iso => ({ iso, label: display.of(iso) ?? iso }))
        .sort((a, b) => a.label.localeCompare(b.label));
    } catch {
      return [...isos].map(iso => ({ iso, label: iso })).sort((a, b) => a.iso.localeCompare(b.iso));
    }
  }, [countryMap, i18n.language]);

  const filteredList = useMemo(() => {
    let result = [...list];
    if (filterNom) result = result.filter((p) => normalize(p.nomDefunt).includes(normalize(filterNom)));
    if (filterGenre) result = result.filter((p) => normalize(p.genre) === normalize(filterGenre));
    if (filterMosquee) result = result.filter((p) => p.mosqueeNom === filterMosquee);
    if (filterDate) result = result.filter((p) => new Date(p.dateHeurePriere).toISOString().slice(0, 10) === filterDate);
    if (filterCountry) result = result.filter((p) => countryMap.get(p.id) === filterCountry);
    if (sortProximity && userPos) {
      result.sort((a, b) => {
        const da = a.mosqueeLatitude && a.mosqueeLongitude
          ? haversineKm(userPos[0], userPos[1], a.mosqueeLatitude, a.mosqueeLongitude) : Infinity;
        const db = b.mosqueeLatitude && b.mosqueeLongitude
          ? haversineKm(userPos[0], userPos[1], b.mosqueeLatitude, b.mosqueeLongitude) : Infinity;
        return da - db;
      });
    }
    return result;
  }, [list, filterNom, filterGenre, filterMosquee, filterDate, filterCountry, sortProximity, userPos, countryMap]);

  const hasFilter = filterNom || filterGenre || filterMosquee || filterDate || filterCountry || sortProximity;

  const clearFilters = () => {
    setFilterNom(''); setFilterGenre(''); setFilterMosquee(''); setFilterDate('');
    setFilterCountry(''); setSortProximity(false);
  };

  const handleProximity = () => { requestGeo(); setSortProximity((v) => !v); };

  const switchView = (v) => { setView(v); if (v === 'map') setMapMode('country'); };

  const openEdit = (priere) => { setEditPriere(priere); setPriereForm(buildInitialForm(priere)); };
  const handleSavePriere = (e) => {
    e.preventDefault();
    dispatch(updatePriere(editPriere.id, buildPayload(priereForm)));
    setEditPriere(null);
  };
  const handleDelete = (id) => {
    if (window.confirm('Supprimer cette prière ?')) dispatch(deletePriere(id));
  };

  return (
    <div className="prieres-page">
      <div className="prieres-page-header">
        <div className="container">
          <div className="prieres-page-header-inner">
            <div>
              <h1>{t('prieres.title')}</h1>
              <p>{t('prieres.subtitle')}</p>
            </div>
            {isAuthenticated && (
              <Link to="/tableau-de-bord/declarer" className="btn btn-white">
                {t('prieres.declare')}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="prieres-controls-bar" ref={controlsRef}>
        <div className="container prieres-controls-inner">
          {/* Ligne 1 : toggle vue (+ onglets carte) */}
          <div className="prieres-controls-row">
            <div className="view-toggle">
              <button
                className={`view-toggle-btn${view === 'map' ? ' active' : ''}`}
                onClick={() => switchView('map')}
              >
                <IconMap /> {t('prieres.map')}
              </button>
              <button
                className={`view-toggle-btn${view === 'tile' ? ' active' : ''}`}
                onClick={() => switchView('tile')}
              >
                <IconGrid /> {t('prieres.tiles')}
              </button>
            </div>

            {view === 'map' && (
              <div className="map-mode-tabs" style={{ marginBottom: 0 }}>
                <button
                  className={`map-mode-btn${mapMode === 'proximity' ? ' active' : ''}`}
                  onClick={() => { requestGeo(); setMapMode('proximity'); }}
                >
                  <IconPin /> {t('prieres.proximity')}
                </button>
                <button
                  className={`map-mode-btn${mapMode === 'country' ? ' active' : ''}`}
                  onClick={() => setMapMode('country')}
                >
                  <IconGlobe /> {t('prieres.country')}
                </button>
                <button
                  className={`map-mode-btn${mapMode === 'all' ? ' active' : ''}`}
                  onClick={() => setMapMode('all')}
                >
                  <IconAll /> {t('prieres.all_prayers')}
                </button>
              </div>
            )}
          </div>

          {/* Ligne 2 : tous les filtres (mode tuiles uniquement) */}
          {view === 'tile' && list.length > 0 && (
            <div className="prieres-controls-row prieres-controls-filters">
              <div className="tile-filter-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  value={filterNom}
                  onChange={(e) => setFilterNom(e.target.value)}
                  placeholder={t('prieres.search_name')}
                  className="tile-filter-input"
                />
                {filterNom && (
                  <button className="tile-filter-clear-btn" onClick={() => setFilterNom('')}>✕</button>
                )}
              </div>
              <div className="tile-filter-pills">
                {GENRES.map(({ value, key }) => (
                  <button
                    key={value}
                    className={`filter-pill${filterGenre === value ? ' active' : ''}`}
                    onClick={() => setFilterGenre(filterGenre === value ? '' : value)}
                  >
                    {t(`card.genre.${key}`)}
                  </button>
                ))}
              </div>
              <select
                className="tile-filter-select"
                value={filterMosquee}
                onChange={(e) => setFilterMosquee(e.target.value)}
              >
                <option value="">{t('prieres.all_mosques')}</option>
                {uniqueMosquees.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                className="tile-filter-select"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              >
                <option value="">{t('prieres.all_dates')}</option>
                {uniqueDates.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {uniqueCountries.length > 0 && (
                <select
                  className="tile-filter-select"
                  value={filterCountry}
                  onChange={(e) => setFilterCountry(e.target.value)}
                >
                  <option value="">Tous les pays</option>
                  {uniqueCountries.map(({ iso, label }) => (
                    <option key={iso} value={iso}>{label}</option>
                  ))}
                </select>
              )}
              <button
                className={`filter-pill filter-pill-geo${sortProximity ? ' active' : ''}`}
                onClick={handleProximity}
                title={userPos ? t('prieres.sort_distance') : t('prieres.allow_geo')}
              >
                <IconPin /> {t('prieres.proximity')}
              </button>
              {hasFilter && (
                <button className="filter-clear" onClick={clearFilters}>
                  {t('prieres.reset')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invisible resolvers — populate countryMap as cards render */}
      {list.map(p => (
        <CountryResolver
          key={p.id}
          prayerId={p.id}
          lat={p.mosqueeLatitude}
          lon={p.mosqueeLongitude}
          adresse={p.mosqueeAdresse}
          onResolve={handleCountryResolve}
        />
      ))}

      {view === 'map' ? (
        <div className="prieres-page-map">
          <Suspense fallback={<div className="map-loading">{t('prieres.map_loading')}</div>}>
            <PriereMap prieres={list} mode={mapMode} externalUserPos={userPos} currentUserId={resolvedDbId} currentUserRole={user?.role} />
          </Suspense>
        </div>
      ) : (
        <div className="container prieres-page-content">
          {loading && list.length === 0 && <p className="text-center text-muted" style={{ padding: '3rem 0' }}>{t('prieres.loading')}</p>}

          {!loading && list.length === 0 && (
            <div className="empty-state">
              <p>{t('prieres.no_prayers')}</p>
              {isAuthenticated ? (
                <Link to="/tableau-de-bord/declarer" className="btn btn-primary">
                  {t('prieres.declare_first')}
                </Link>
              ) : (
                <Link to="/connexion" className="btn btn-primary">
                  {t('prieres.login_declare')}
                </Link>
              )}
            </div>
          )}

          {list.length > 0 && (
            <>
              <div className="prieres-count-row">
                <span className="prieres-count">
                  {filteredList.length <= 1 ? t('prieres.count_one', { count: filteredList.length }) : t('prieres.count_other', { count: filteredList.length })}
                  {hasFilter ? t('prieres.matching') : t('prieres.upcoming_suffix')}
                </span>
                {geoError && (
                  <span className="prieres-count-note geo-error-note">
                    {t('prieres.geo_error')}
                  </span>
                )}
              </div>

              {filteredList.length === 0 ? (
                <div className="empty-state">
                  <p>{t('prieres.no_match')}</p>
                  <button className="btn btn-outline" onClick={clearFilters}>
                    {t('prieres.reset_filters')}
                  </button>
                </div>
              ) : (
                <div className="card-grid">
                  {filteredList.map((p) => {
                    const canAct = isAdmin || p.utilisateurId === resolvedDbId;
                    return (
                      <PriereCard
                        key={p.id}
                        priere={p}
                        userPos={userPos}
                        onEdit={canAct ? openEdit : undefined}
                        onDelete={canAct ? handleDelete : undefined}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
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
