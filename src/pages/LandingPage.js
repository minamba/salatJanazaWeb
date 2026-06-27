import { useEffect, useState, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchPrieresUpcoming, updatePriere, deletePriere } from '../lib/actions/priereJanazaActions';
import { fetchMosquees } from '../lib/actions/mosqueeActions';
import { getUtilisateurByIdentityId } from '../lib/api/utilisateurApi';
import PriereCard from './shared/PriereCard';
import EditPriereModal, { buildInitialForm, buildPayload } from './shared/EditPriereModal';
import motifBg from '../assets/motif-islamique.png';
import iphoImg from '../assets/notif.png';
import screen1 from '../assets/test1.png';
import screen2 from '../assets/test2.png';
import sec1Img from '../assets/sec1.png';
import sec2Img from '../assets/sec2.png';

const PriereMap = lazy(() => import('../components/PriereMap'));

const LOCALE_MAP = { fr: 'fr-FR', en: 'en-US', ar: 'ar-SA' };

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalize(str) {
  return (str ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export default function LandingPage() {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const locale = LOCALE_MAP[i18n.language] ?? 'fr-FR';
  const { list: prieres, loading } = useSelector((s) => s.priereJanaza);
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const [resolvedDbId, setResolvedDbId] = useState(null);
  const [editPriere, setEditPriere]     = useState(null);
  const [priereForm, setPriereForm]     = useState({});

  const isAdmin = user?.role && ['admin', 'superadmin'].includes(user.role.toLowerCase());

  const isMobile = window.innerWidth <= 700;
  const [showMap, setShowMap]     = useState(!isMobile);
  const [mapMode, setMapMode]     = useState('country');
  const [userPos, setUserPos]     = useState(null);
  const [filterNom,     setFilterNom]     = useState('');
  const [filterGenre,   setFilterGenre]   = useState('');
  const [filterMosquee, setFilterMosquee] = useState('');
  const [filterDate,    setFilterDate]    = useState('');
  const [sortProximity, setSortProximity] = useState(false);

  useEffect(() => { dispatch(fetchPrieresUpcoming()); dispatch(fetchMosquees()); }, [dispatch]);

  useEffect(() => {
    if (!user?.id) return;
    if (user.dbId) { setResolvedDbId(user.dbId); return; }
    getUtilisateurByIdentityId(user.id)
      .then(res => { if (res.data?.id) setResolvedDbId(res.data.id); })
      .catch(() => {});
  }, [user]);

  const geoAsked = useRef(false);
  const [geoError, setGeoError] = useState(false);
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

  const uniqueMosquees = useMemo(() => {
    const seen = new Set();
    return prieres
      .map((p) => p.mosqueeNom)
      .filter((n) => { if (!n || seen.has(n)) return false; seen.add(n); return true; })
      .sort();
  }, [prieres]);

  const uniqueDates = useMemo(() => {
    const seen = new Set();
    return prieres
      .map((p) => {
        const d = new Date(p.dateHeurePriere);
        const value = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
        return { value, label };
      })
      .filter(({ value }) => { if (seen.has(value)) return false; seen.add(value); return true; })
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [prieres, locale]);

  const filteredPrieres = useMemo(() => {
    let list = [...prieres];
    if (filterNom) list = list.filter((p) => normalize(p.nomDefunt).includes(normalize(filterNom)));
    if (filterGenre) list = list.filter((p) => normalize(p.genre) === normalize(filterGenre));
    if (filterMosquee) list = list.filter((p) => p.mosqueeNom === filterMosquee);
    if (filterDate) list = list.filter((p) => new Date(p.dateHeurePriere).toISOString().slice(0, 10) === filterDate);
    if (sortProximity && userPos) {
      list.sort((a, b) => {
        const da = a.mosqueeLatitude && a.mosqueeLongitude
          ? haversineKm(userPos[0], userPos[1], a.mosqueeLatitude, a.mosqueeLongitude) : Infinity;
        const db = b.mosqueeLatitude && b.mosqueeLongitude
          ? haversineKm(userPos[0], userPos[1], b.mosqueeLatitude, b.mosqueeLongitude) : Infinity;
        return da - db;
      });
    }
    return list;
  }, [prieres, filterNom, filterGenre, filterMosquee, filterDate, sortProximity, userPos]);

  const hasActiveFilter = filterNom || filterGenre || filterMosquee || filterDate || sortProximity;

  const clearFilters = () => {
    setFilterNom(''); setFilterGenre(''); setFilterMosquee(''); setFilterDate(''); setSortProximity(false);
  };

  const handleProximity = () => { requestGeo(); setSortProximity((v) => !v); };

  const openEdit = (priere) => { setEditPriere(priere); setPriereForm(buildInitialForm(priere)); };
  const handleSavePriere = (e) => {
    e.preventDefault();
    dispatch(updatePriere(editPriere.id, buildPayload(priereForm)));
    setEditPriere(null);
  };
  const handleDelete = (id) => {
    if (window.confirm('Supprimer cette prière ?')) dispatch(deletePriere(id));
  };

  const GENRES = [
    { value: 'Homme', key: 'homme' },
    { value: 'Femme', key: 'femme' },
    { value: 'Enfant', key: 'enfant' },
  ];

  return (
    <>
      <div className="landing-motif-bg" style={{ '--motif-url': `url(${motifBg})` }}>
      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-content">
            <p className="hero-eyebrow">{t('landing.hero.eyebrow')}</p>
            <h1 dangerouslySetInnerHTML={{ __html: t('landing.hero.title') }} />
            <p>{t('landing.hero.desc')}</p>
            <div className="hero-actions">
              <Link to={isAuthenticated ? '/tableau-de-bord/declarer' : '/connexion'} className="btn btn-white">{t('landing.hero.cta_declare')}</Link>
              <Link to="/prieres" className="btn btn-outline-white">{t('landing.hero.cta_prayers')}</Link>
            </div>
            <div className="hero-store-row">
              <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer" className="hero-store-badge hero-store-badge-apple">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <span>
                  <small>{t('landing.hero.available_on')}</small>
                  <strong>App Store</strong>
                </span>
              </a>
              <a href="https://play.google.com" target="_blank" rel="noopener noreferrer" className="hero-store-badge hero-store-badge-google">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff" aria-hidden="true">
                  <path d="M3.18 23.76c.3.17.65.19.97.07l11.65-6.73-2.6-2.6-10.02 9.26zm-1.41-20.4C1.46 3.7 1.25 4.1 1.25 4.6v14.8c0 .5.21.9.52 1.24l.07.06 8.29-8.29v-.19L1.77 3.36zm18.48 8.05L17.5 9.3l-2.88 2.88 2.89 2.88 2.76-1.59c.79-.45.79-1.19-.02-1.66zM4.15.24L15.8 6.97l-2.6 2.6L3.18.31A1.1 1.1 0 0 1 4.15.24z"/>
                </svg>
                <span>
                  <small>{t('landing.hero.available_on')}</small>
                  <strong>Google Play</strong>
                </span>
              </a>
            </div>
          </div>
          <div className="hero-phones">
            <div className="iphone iphone-back">
              <div className="iphone-screen"><img src={screen2} alt={t('landing.hero.screen_mosques')} /></div>
            </div>
            <div className="iphone iphone-front">
              <div className="iphone-screen"><img src={screen1} alt={t('landing.hero.screen_feed')} /></div>
            </div>
          </div>
        </div>
      </section>

      {/* Hadith */}
      <section className="section-hadith">
        <blockquote className="hadith">
          <span className="hadith-ornament">❝</span>
          <p className="hadith-text">{t('landing.hadith.text')}</p>
          <div className="hadith-divider"><div className="hadith-divider-dot" /></div>
          <cite>{t('landing.hadith.source')}</cite>
        </blockquote>
      </section>

      {/* Fonctionnalités */}
      <section className="feat-section">
        <div className="feat-bg" style={{ backgroundImage: `url(${sec2Img})` }} />
        <div className="feat-inner">
          <div className="feat-content">
            <span className="feat-eyebrow">{t('landing.features.eyebrow')}</span>
            <h2 dangerouslySetInnerHTML={{ __html: t('landing.features.title') }} />
            <div className="feat-divider"><div className="feat-divider-dot" /></div>
            <p className="feat-desc" dangerouslySetInnerHTML={{ __html: t('landing.features.desc') }} />
            <div className="feat-chips">
              <div className="feat-chip">
                <span className="feat-chip-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    <circle cx="12" cy="9" r="2.5"/>
                  </svg>
                </span>
                {t('landing.features.chip_location')}
              </div>
              <div className="feat-chip">
                <span className="feat-chip-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </span>
                {t('landing.features.chip_notif')}
              </div>
              <div className="feat-chip">
                <span className="feat-chip-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
                  </svg>
                </span>
                {t('landing.features.chip_nearby')}
              </div>
            </div>
            <div className="hero-store-row">
              <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer" className="hero-store-badge hero-store-badge-apple">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <span><small>{t('landing.features.available_on')}</small><strong>App Store</strong></span>
              </a>
              <a href="https://play.google.com" target="_blank" rel="noopener noreferrer" className="hero-store-badge hero-store-badge-google">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff" aria-hidden="true">
                  <path d="M3.18 23.76c.3.17.65.19.97.07l11.65-6.73-2.6-2.6-10.02 9.26zm-1.41-20.4C1.46 3.7 1.25 4.1 1.25 4.6v14.8c0 .5.21.9.52 1.24l.07.06 8.29-8.29v-.19L1.77 3.36zm18.48 8.05L17.5 9.3l-2.88 2.88 2.89 2.88 2.76-1.59c.79-.45.79-1.19-.02-1.66zM4.15.24L15.8 6.97l-2.6 2.6L3.18.31A1.1 1.1 0 0 1 4.15.24z"/>
                </svg>
                <span><small>{t('landing.features.available_on')}</small><strong>Google Play</strong></span>
              </a>
            </div>
          </div>
          <div className="feat-phone">
            <img src={sec1Img} alt={t('landing.features.app_alt')} className="feat-phone-img" />
          </div>
        </div>
      </section>
      </div>

      {/* Prières à venir */}
      <section className="section section-light">
        <div className={showMap ? 'prieres-map-container' : 'container'}>
          <div className="prieres-header">
            <h2 className="section-title" style={{ margin: 0 }}>{t('landing.upcoming.title')}</h2>
            <button
              className={`btn ${showMap ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setShowMap((v) => !v); setMapMode('country'); }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.4rem' }} aria-hidden="true">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
              </svg>
              {showMap ? t('landing.upcoming.show_tiles') : t('landing.upcoming.show_map')}
            </button>
          </div>

          {loading && <p className="text-center text-muted">{t('landing.upcoming.loading')}</p>}

          {showMap ? (
            <>
              <div className="map-mode-tabs">
                <button
                  className={`map-mode-btn${mapMode === 'proximity' ? ' active' : ''}`}
                  onClick={() => { requestGeo(); setMapMode('proximity'); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                  {t('landing.upcoming.proximity')}
                </button>
                <button
                  className={`map-mode-btn${mapMode === 'country' ? ' active' : ''}`}
                  onClick={() => setMapMode('country')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  {t('landing.upcoming.country')}
                </button>
                <button
                  className={`map-mode-btn${mapMode === 'all' ? ' active' : ''}`}
                  onClick={() => setMapMode('all')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
                  {t('landing.upcoming.all_prayers')}
                </button>
              </div>
              <Suspense fallback={<div className="map-loading">{t('landing.upcoming.map_loading')}</div>}>
                <PriereMap prieres={prieres} mode={mapMode} externalUserPos={userPos} />
              </Suspense>
            </>
          ) : (
            <>
              {prieres.length > 0 && (
                <div className="tile-filters">
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
                    <option value="">{t('landing.upcoming.all_mosques')}</option>
                    {uniqueMosquees.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  <select
                    className="tile-filter-select"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                  >
                    <option value="">{t('landing.upcoming.all_dates')}</option>
                    {uniqueDates.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>

                  <button
                    className={`filter-pill filter-pill-geo${sortProximity ? ' active' : ''}`}
                    onClick={handleProximity}
                    title={userPos ? t('prieres.sort_distance') : t('prieres.allow_geo')}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                      <circle cx="12" cy="9" r="2.5"/>
                    </svg>
                    {t('landing.upcoming.proximity')}
                  </button>

                  {hasActiveFilter && (
                    <button className="filter-clear" onClick={clearFilters}>
                      {t('landing.upcoming.reset')}
                    </button>
                  )}
                </div>
              )}
              {geoError && (
                <p className="geo-error-msg">{t('landing.upcoming.geo_error')}</p>
              )}

              {!loading && prieres.length === 0 && (
                <p className="text-center text-muted" style={{ marginTop: '2rem' }}>
                  {t('landing.upcoming.no_prayers')}
                </p>
              )}
              {filteredPrieres.length === 0 && !loading && prieres.length > 0 && (
                <p className="text-center text-muted" style={{ marginTop: '1.5rem' }}>
                  {t('landing.upcoming.no_match')}
                </p>
              )}
              <div className="card-grid">
                {filteredPrieres.slice(0, 12).map((p) => {
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
              {filteredPrieres.length > 0 && (
                <div className="text-center" style={{ marginTop: '2rem' }}>
                  <Link to="/prieres" className="btn btn-primary">{t('landing.upcoming.see_all')}</Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Mobile section */}
      <section className="mobile-section">
        <div className="mobile-section-inner">
          <div className="mobile-text">
            <p className="mobile-eyebrow">{t('landing.mobile.eyebrow')}</p>
            <h2 dangerouslySetInnerHTML={{ __html: t('landing.mobile.title') }} />
            <p className="mobile-desc">{t('landing.mobile.desc')}</p>
            <ul className="mobile-features">
              <li><span className="mobile-check">✓</span>{t('landing.mobile.feat_1')}</li>
              <li><span className="mobile-check">✓</span>{t('landing.mobile.feat_2')}</li>
              <li><span className="mobile-check">✓</span>{t('landing.mobile.feat_3')}</li>
              <li><span className="mobile-check">✓</span>{t('landing.mobile.feat_4')}</li>
            </ul>
            <div className="store-badges">
              <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer" className="store-badge-btn">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <span><small>{t('landing.mobile.download_on')}</small>App Store</span>
              </a>
              <a href="https://play.google.com" target="_blank" rel="noopener noreferrer" className="store-badge-btn store-badge-btn-outline">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
                  <path d="M3.18 23.76c.3.17.65.19.97.07l11.65-6.73-2.6-2.6-10.02 9.26zm-1.41-20.4C1.46 3.7 1.25 4.1 1.25 4.6v14.8c0 .5.21.9.52 1.24l.07.06 8.29-8.29v-.19L1.77 3.36zm18.48 8.05L17.5 9.3l-2.88 2.88 2.89 2.88 2.76-1.59c.79-.45.79-1.19-.02-1.66zM4.15.24L15.8 6.97l-2.6 2.6L3.18.31A1.1 1.1 0 0 1 4.15.24z"/>
                </svg>
                <span><small>{t('landing.mobile.available_on')}</small>Google Play</span>
              </a>
            </div>
          </div>
          <div className="mobile-phones">
            <img src={iphoImg} alt={t('landing.mobile.app_alt')} className="phone-img" />
          </div>
        </div>
      </section>
      {editPriere && (
        <EditPriereModal
          priere={editPriere}
          form={priereForm}
          setForm={setPriereForm}
          onClose={() => setEditPriere(null)}
          onSubmit={handleSavePriere}
        />
      )}
    </>
  );
}
