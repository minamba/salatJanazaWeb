import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import html2canvas from 'html2canvas';
import { capitalizeFirst, parseNomDefunt, formatNomDefunt } from '../lib/utils';
import { useCountryFlag, commentaireVisibleForLang } from '../lib/countryFlag';
import { computeStatut, useMinuteTick } from '../lib/statut';
import { deletePriere } from '../lib/actions/priereJanazaActions';
import AvisDecesCard from './AvisDecesCard';
import 'leaflet/dist/leaflet.css';
import mosqueeImg from '../assets/mosquee.png';
import hommeImg from '../assets/homme.png';
import femmeImg from '../assets/femme.png';
import enfantImg from '../assets/enfant.png';

const GENRE_IMG = { homme: hommeImg, femme: femmeImg, enfant: enfantImg };
const STATUT_LABEL = { AVenir: 'À venir', EnCours: 'En cours', Terminee: 'Terminée' };
const STATUT_CLS   = { AVenir: 'avenir',  EnCours: 'encours',  Terminee: 'terminee' };

const PREVIEW_LANGS = [
  { code: 'fr', flag: 'fr' }, { code: 'en', flag: 'gb' }, { code: 'ar', flag: 'sa' },
  { code: 'bm', flag: 'ml' }, { code: 'nl', flag: 'be' }, { code: 'tr', flag: 'tr' },
  { code: 'de', flag: 'de' }, { code: 'es', flag: 'es' }, { code: 'it', flag: 'it' },
  { code: 'pt', flag: 'pt' }, { code: 'ru', flag: 'ru' }, { code: 'ja', flag: 'jp' },
  { code: 'ko', flag: 'kr' }, { code: 'ms', flag: 'my' }, { code: 'id', flag: 'id' },
  { code: 'ur', flag: 'pk' }, { code: 'bn', flag: 'bd' },
];


// Bounding boxes for common countries (fallback if Nominatim bounds are bad)
const COUNTRY_BOUNDS = {
  fr: [[41.3, -5.5],  [51.2, 9.7]],
  gb: [[49.8, -8.2],  [60.9, 2.0]],
  be: [[49.5, 2.5],   [51.5, 6.4]],
  de: [[47.3, 5.9],   [55.1, 15.0]],
  es: [[36.0, -9.3],  [43.8, 4.3]],
  it: [[36.6, 6.6],   [47.1, 18.5]],
  nl: [[50.7, 3.4],   [53.6, 7.2]],
  ch: [[45.8, 5.9],   [47.8, 10.5]],
  ma: [[27.7, -13.2], [35.9, -1.0]],
  dz: [[18.9, -8.7],  [37.1, 12.0]],
  tn: [[30.2, 7.5],   [37.5, 11.6]],
  tr: [[35.8, 26.0],  [42.1, 44.8]],
  sa: [[16.4, 36.5],  [32.2, 55.7]],
  eg: [[22.0, 24.7],  [31.7, 37.1]],
  sn: [[12.3, -17.5], [16.7, -11.4]],
  ci: [[4.3, -8.6],   [10.7, -2.5]],
  ml: [[10.1, -12.2], [25.0, 4.2]],
  cm: [[1.7, 8.5],    [13.1, 16.2]],
};

// ─── Adaptive pin size based on zoom ─────────────────────────────────────────
function getPinSize(zoom) {
  if (zoom <= 5)  return 26;
  if (zoom <= 7)  return 34;
  if (zoom <= 9)  return 42;
  return 52;
}

function createMosqueeIcon(count, zoom) {
  const size = getPinSize(zoom);
  const badgeSize = Math.max(16, Math.round(size * 0.38));
  return L.divIcon({
    className: '',
    html: `
      <div class="map-pin-wrap" style="width:${size}px;height:${size}px">
        <img src="${mosqueeImg}" class="map-pin-img" style="width:${size}px;height:${size}px" alt="mosquée" />
        ${count > 0 ? `<span class="map-pin-badge" style="min-width:${badgeSize}px;height:${badgeSize}px;font-size:${Math.max(9, badgeSize - 7)}px">${count}</span>` : ''}
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -(size + 4)],
  });
}

function createUserIcon() {
  return L.divIcon({
    className: '',
    html: `<div class="map-user-dot"><div class="map-user-pulse"></div></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

// ─── Track zoom level to resize pins ─────────────────────────────────────────
function ZoomTracker({ onZoom }) {
  const map = useMap();
  useEffect(() => {
    onZoom(map.getZoom());
    const handler = () => onZoom(map.getZoom());
    map.on('zoomend', handler);
    return () => map.off('zoomend', handler);
  }, [map, onZoom]);
  return null;
}

// Détecte le pays de l'utilisateur à partir des bounding boxes locales — pas de requête réseau.
function detectCountry(lat, lon) {
  for (const [cc, [[s, w], [n, e]]] of Object.entries(COUNTRY_BOUNDS)) {
    if (lat >= s && lat <= n && lon >= w && lon <= e) return cc;
  }
  return null;
}

// Country zoom: compute center + zoom from bounding box size
// so the country fills the screen tightly regardless of map dimensions.
function applyCountryView(map, countryBounds) {
  const [[s, w], [n, e]] = countryBounds;
  const center = [(s + n) / 2, (w + e) / 2];
  // Use the larger span (lat or lon) to pick a zoom level:
  //   ~30° → zoom 5  |  ~15° → zoom 6  |  ~7° → zoom 7  |  ~3° → zoom 8
  const maxSpan = Math.max(n - s, e - w);
  const zoom = Math.max(5, Math.min(8, Math.round(6.9 - Math.log2(maxSpan / 8))));
  map.setView(center, zoom); // pas d'animation sur les grands déplacements
}

// ─── Apply the right view for the current mode ───────────────────────────────
function MapViewController({ mode, userPos, countryBounds, allPoints }) {
  const map = useMap();

  useEffect(() => {
    if (mode === 'proximity') {
      if (userPos) map.setView(userPos, 14, { animate: true });
    } else if (mode === 'country') {
      // Fallback immédiat sur la France si countryBounds pas encore connu
      applyCountryView(map, countryBounds ?? COUNTRY_BOUNDS.fr);
    } else {
      // 'all' — pas d'animation : fitBounds animé sur grande distance est très lent
      if (allPoints.length > 1) {
        map.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40] });
      } else if (allPoints.length === 1) {
        map.setView(allPoints[0], 11);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Quand countryBounds arrive (après géoloc), mettre à jour si on est toujours en mode country
  useEffect(() => {
    if (countryBounds && mode === 'country') applyCountryView(map, countryBounds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryBounds]);

  // Quand userPos arrive (après géoloc), centrer si on est toujours en mode proximity
  useEffect(() => {
    if (userPos && mode === 'proximity') map.setView(userPos, 14, { animate: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPos]);

  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(d) {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function fmtDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
function buildItineraireUrl(userPos, lat, lng) {
  const dest = `${lat},${lng}`;
  if (userPos) {
    return `https://www.google.com/maps/dir/?api=1&origin=${userPos[0]},${userPos[1]}&destination=${dest}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
}
function fmtDateLabel(d) {
  const date = new Date(d);
  const dateUTC = date.toISOString().slice(0, 10);
  const now = new Date();
  const todayUTC = now.toISOString().slice(0, 10);
  const tomorrowUTC = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  if (dateUTC === todayUTC) return "Aujourd'hui";
  if (dateUTC === tomorrowUTC) return 'Demain';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

// ─── Share modal (portal, rendered outside the Leaflet popup) ────────────────
function ShareModal({ priere, onClose }) {
  const { t, i18n } = useTranslation();
  const [previewLang, setPreviewLang] = useState(() => i18n.language?.split('-')[0] ?? 'fr');
  useEffect(() => { setPreviewLang(i18n.language?.split('-')[0] ?? 'fr'); }, [i18n.language]);
  const cardRef = useRef(null);
  const langBarRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const mosqueeIsoCode = useCountryFlag(priere.mosqueeLatitude, priere.mosqueeLongitude);
  const showCommentaire = commentaireVisibleForLang(mosqueeIsoCode, previewLang);

  const rawNom = priere.estAnonyme ? '' : (priere.nomDefunt ?? '');
  const nomFamille = parseNomDefunt(rawNom).familleNom;
  const hasYears = !!(priere.anneeNaissance && priere.anneeDeces);

  const cardData = {
    genre: priere.genre ?? 'homme',
    nomDefunt: priere.nomDefunt ?? '',
    estAnonyme: priere.estAnonyme ?? false,
    nomFamille,
    showYears: hasYears,
    anneNaissance: hasYears ? priere.anneeNaissance : null,
    anneDeces: hasYears ? priere.anneeDeces : null,
    paysEnterrement: priere.paysEnterrement ?? '',
    villeEnterrement: priere.villeEnterrement ?? '',
    commentaire: priere.commentaire ?? '',
    mosqueeNom: priere.mosqueeNom ?? '',
    mosqueeAdresse: priere.mosqueeAdresse ?? '',
    dateHeurePriere: priere.dateHeurePriere,
  };

  async function handleDownload() {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: null });
      const link = document.createElement('a');
      link.download = `janaza-${priere.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.warn('download error', e);
    } finally {
      setSharing(false);
    }
  }

  return createPortal(
    <div className="avis-modal-overlay" onClick={onClose}>
      <div className="avis-modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="avis-modal-topbar">
          <button className="avis-modal-close" onClick={onClose}>✕</button>
          <span className="avis-modal-title">{t('avis.subtitle')}</span>
          <button className="avis-modal-share-btn" onClick={handleDownload} disabled={sharing}>
            {sharing ? '…' : t('declare.preview_download')}
          </button>
        </div>
        <div className="avis-lang-wrap">
          <button className="avis-lang-arrow" onClick={() => langBarRef.current?.scrollBy({ left: -150, behavior: 'smooth' })} aria-label="Previous">‹</button>
          <div className="avis-lang-bar" ref={langBarRef}>
            {PREVIEW_LANGS.map(({ code, flag }) => (
              <button
                key={code}
                className={`avis-lang-btn${previewLang === code ? ' active' : ''}`}
                onClick={() => setPreviewLang(code)}
                title={code}
              >
                <span className={`fi fi-${flag}`} />
              </button>
            ))}
          </div>
          <button className="avis-lang-arrow" onClick={() => langBarRef.current?.scrollBy({ left: 150, behavior: 'smooth' })} aria-label="Next">›</button>
        </div>
        <div className="avis-modal-preview-scroll">
          <AvisDecesCard ref={cardRef} data={cardData} previewLang={previewLang} showCommentaire={showCommentaire} mosqueeIsoCode={mosqueeIsoCode} />
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Popup ────────────────────────────────────────────────────────────────────
const STATUT_I18N = { AVenir: 'avenir', EnCours: 'encours', Terminee: 'terminee' };

function MosqueePopup({ items, userPos, lat, lng, currentUserId, currentUserRole, onDelete }) {
  const { t, i18n } = useTranslation();
  const [shareItem, setShareItem] = useState(null);
  const mosqueeIsoCode = useCountryFlag(lat, lng);
  const showCommentaire = commentaireVisibleForLang(mosqueeIsoCode, i18n.language);
  useMinuteTick();
  const first = items[0];
  const distKm = userPos ? haversineKm(userPos[0], userPos[1], lat, lng) : null;
  const byDate = {};
  items.forEach((p) => {
    const label = fmtDateLabel(p.dateHeurePriere);
    if (!byDate[label]) byDate[label] = [];
    byDate[label].push(p);
  });
  return (
    <>
    <div className="mpp-wrap">
      <div className="mpp-header">
        <div className="mpp-mosque-name">{capitalizeFirst(first.mosqueeNom)}</div>
        {first.mosqueeAdresse && <div className="mpp-mosque-addr">{first.mosqueeAdresse}</div>}
        {distKm !== null && (
          <span className="mpp-distance">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.3 8 13 8 13s8-7.7 8-13a8 8 0 0 0-8-8z"/>
            </svg>
            {fmtDistance(distKm)}
          </span>
        )}
      </div>
      <div className="mpp-body">
        {Object.entries(byDate).map(([dateLabel, prayers]) => (
          <div key={dateLabel} className="mpp-date-group">
            <div className="mpp-date-row">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>{dateLabel} · <strong>{t('prieres.count', { count: prayers.length })}</strong></span>
            </div>
            {prayers.map((p) => {
              const genreKey = (p.genre ?? '').toLowerCase().trim();
              const genreImg = GENRE_IMG[genreKey];
              const genreLabel = p.genre ?? null;
              const canDelete = (currentUserId != null && p.utilisateurId != null && Number(currentUserId) === Number(p.utilisateurId))
                || currentUserRole === 'admin' || currentUserRole === 'superadmin';
              return (
                <div key={p.id} className="mpp-prayer-row">
                  <span className={`mpp-statut mpp-statut-${STATUT_CLS[computeStatut(p)] ?? ''}`}>
                    {t('card.statut.' + (STATUT_I18N[computeStatut(p)] ?? ''), { defaultValue: p.statut })}
                  </span>
                  <div className="mpp-prayer-body">
                    <div className="mpp-time">{fmtTime(p.dateHeurePriere)}</div>
                    <div className="mpp-avatar">
                      {genreImg
                        ? <img src={genreImg} alt={genreLabel} />
                        : <div className="mpp-avatar-placeholder">?</div>}
                    </div>
                    <div className="mpp-info">
                      <span className="mpp-nom">{p.estAnonyme ? t('declare.defunt_anonymous') : (formatNomDefunt(p.nomDefunt) || t('card.unknown'))}</span>
                    </div>
                    <div className="mpp-actions">
                      <button className="mpp-btn-share" title={t('declare.btn_preview')} onClick={() => setShareItem(p)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                      {canDelete && (
                        <button className="mpp-btn-delete" title="Supprimer" onClick={() => onDelete?.(p.id)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  {p.commentaire && showCommentaire && (
                    <div className="mpp-commentaire">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0, marginTop:2}}>
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                      </svg>
                      <span>{p.commentaire}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mpp-popup-footer">
          <a
            href={buildItineraireUrl(userPos, lat, lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="mpp-itineraire-btn"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            {t('card.route_title')}
          </a>
      </div>
    </div>
    {shareItem && <ShareModal priere={shareItem} onClose={() => setShareItem(null)} />}
    </>
  );
}

// ─── Marker with hover-sticky popup (stays open while mouse is over popup) ────
function HoverMarker({ position, icon, children }) {
  const markerRef = useRef(null);
  const timerRef  = useRef(null);

  const open = useCallback(() => {
    clearTimeout(timerRef.current);
    markerRef.current?.openPopup();
  }, []);

  const scheduleClose = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => markerRef.current?.closePopup(), 300);
  }, []);

  const onPopupOpen = useCallback(() => {
    const el = markerRef.current?.getPopup()?.getElement();
    if (!el) return;
    el.addEventListener('mouseenter', open);
    el.addEventListener('mouseleave', scheduleClose);
  }, [open, scheduleClose]);

  const onPopupClose = useCallback(() => {
    const el = markerRef.current?.getPopup()?.getElement();
    if (!el) return;
    el.removeEventListener('mouseenter', open);
    el.removeEventListener('mouseleave', scheduleClose);
  }, [open, scheduleClose]);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
      eventHandlers={{
        mouseover: open,
        mouseout:  scheduleClose,
        popupopen: onPopupOpen,
        popupclose: onPopupClose,
      }}
    >
      {children}
    </Marker>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PriereMap({ prieres, mode, externalUserPos, currentUserId, currentUserRole }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  function handleDelete(id) {
    if (window.confirm(t('card.delete_title') + ' ?')) dispatch(deletePriere(id));
  }
  const [userPos, setUserPos]             = useState(null);
  const [countryBounds, setCountryBounds] = useState(null);
  const [zoom, setZoom]                   = useState(6);

  const handleZoom = useCallback((z) => setZoom(z), []);

  // Quand le parent fournit une position GPS, détecter le pays localement (pas de requête réseau)
  useEffect(() => {
    if (!externalUserPos) return;
    const [lat, lon] = externalUserPos;
    setUserPos(externalUserPos);
    const cc = detectCountry(lat, lon);
    setCountryBounds(cc ? COUNTRY_BOUNDS[cc] : [[lat - 4, lon - 5], [lat + 4, lon + 5]]);
  }, [externalUserPos]);

  const groups = useMemo(() => {
    const g = {};
    prieres.forEach((p) => {
      if (!p.mosqueeLatitude || !p.mosqueeLongitude) return;
      const key = `${p.mosqueeLatitude},${p.mosqueeLongitude}`;
      if (!g[key]) g[key] = { lat: p.mosqueeLatitude, lng: p.mosqueeLongitude, items: [] };
      g[key].items.push(p);
    });
    return Object.values(g);
  }, [prieres]);

  const allPoints = useMemo(() => groups.map((g) => [g.lat, g.lng]), [groups]);

  return (
    <div className="priere-map-wrap">
      <MapContainer
        center={[46.6, 2.3]}
        zoom={6}
        zoomControl={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <ZoomTracker onZoom={handleZoom} />
        <MapViewController
          mode={mode}
          userPos={userPos}
          countryBounds={countryBounds}
          allPoints={allPoints}
        />

        {userPos && (
          <>
            <Circle
              center={userPos}
              radius={500}
              pathOptions={{ color: '#2a6dd9', fillColor: '#2a6dd9', fillOpacity: 0.10, weight: 1 }}
            />
            <Marker position={userPos} icon={createUserIcon()} />
          </>
        )}

        {groups.map((g) => (
          <HoverMarker
            key={`${g.lat},${g.lng}`}
            position={[g.lat, g.lng]}
            icon={createMosqueeIcon(g.items.length, zoom)}
          >
            <Popup minWidth={290} maxWidth={330} autoPan={true} autoPanPadding={[20, 20]} closeButton={false}>
              <MosqueePopup items={g.items} userPos={userPos} lat={g.lat} lng={g.lng} currentUserId={currentUserId} currentUserRole={currentUserRole} onDelete={handleDelete} />
            </Popup>
          </HoverMarker>
        ))}
      </MapContainer>
    </div>
  );
}
