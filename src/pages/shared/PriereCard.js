import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import html2canvas from 'html2canvas';
import { capitalizeFirst } from '../../lib/utils';
import hommeImg from '../../assets/homme.png';
import femmeImg from '../../assets/femme.png';
import enfantImg from '../../assets/enfant.png';
import AvisDecesCard from '../../components/AvisDecesCard';

const STATUT_CLS = {
  AVenir:   'avenir',
  EnCours:  'encours',
  Terminee: 'terminee',
};

const GENRE_IMG = {
  homme: hommeImg, man: hommeImg, m: hommeImg,
  femme: femmeImg, woman: femmeImg, f: femmeImg,
  enfant: enfantImg, child: enfantImg,
};

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

function fmtDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function buildItineraire(priere, userPos) {
  const lat = priere.mosqueeLatitude;
  const lon = priere.mosqueeLongitude;
  const addr = priere.mosqueeAdresse || priere.mosqueeNom;
  if (lat && lon) {
    const dest = `${lat},${lon}`;
    const origin = userPos ? `${userPos[0]},${userPos[1]}` : '';
    return origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
  }
  if (addr) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}&travelmode=driving`;
  }
  return null;
}

function IconLocation() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function IconPin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
    </svg>
  );
}

function IconShare() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function AvisDecesModal({ priere, onClose }) {
  const cardRef = useRef(null);
  const [sharing, setSharing] = useState(false);

  const rawNom = priere.estAnonyme ? '' : (priere.nomDefunt ?? '');
  const nomFamille = rawNom.trim().split(/\s+/)[0] ?? '';
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

  async function handleShare() {
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
          <span className="avis-modal-title">Avis de décès</span>
          <button className="avis-modal-share-btn" onClick={handleShare} disabled={sharing}>
            {sharing ? '…' : <><IconShare /> Télécharger</>}
          </button>
        </div>
        <div className="avis-modal-preview-scroll">
          <AvisDecesCard ref={cardRef} data={cardData} />
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function PriereCard({ priere, onDelete, userPos }) {
  const { t, i18n } = useTranslation();
  const locale = LOCALE_MAP[i18n.language] ?? 'fr-FR';
  const [showShare, setShowShare] = useState(false);

  const date = new Date(priere.dateHeurePriere);
  const dateStr = date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const createdAt = priere.dateCreation
    ? new Date(priere.dateCreation).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const statutCls = STATUT_CLS[priere.statut] ?? '';
  const statutLabel = statutCls ? t(`card.statut.${statutCls}`) : (priere.statut ?? '');

  const genreKey = priere.genre ? priere.genre.toLowerCase().trim() : null;
  const genreImg = genreKey ? (GENRE_IMG[genreKey] ?? null) : null;
  const genreLabel = genreKey ? t(`card.genre.${genreKey}`, { defaultValue: priere.genre }) : null;

  const nom = priere.estAnonyme ? t('card.anonymous') : (priere.nomDefunt ?? t('card.unknown'));

  const distance = (userPos && priere.mosqueeLatitude && priere.mosqueeLongitude)
    ? haversineKm(userPos[0], userPos[1], priere.mosqueeLatitude, priere.mosqueeLongitude)
    : null;

  const itineraireUrl = buildItineraire(priere, userPos);

  return (
    <div className={`priere-card pc-statut-${statutCls}`}>
      <div className="pc-top">
        <span className={`pc-badge pc-badge-${statutCls}`}>{statutLabel}</span>
        {genreLabel && (
          <span className="pc-genre">
            {genreImg && <img src={genreImg} alt={genreLabel} className="pc-genre-img" />}
            {genreLabel}
          </span>
        )}
      </div>

      <div className="pc-body">
        <h3 className={`pc-nom ${priere.estAnonyme ? 'pc-nom-anon' : ''}`}>{nom}</h3>

        <div className="pc-info-row">
          <span className="pc-icon"><IconLocation /></span>
          <div className="pc-location-wrap">
            <span className="pc-mosquee-nom">{capitalizeFirst(priere.mosqueeNom) ?? '—'}</span>
            {priere.mosqueeAdresse && (
              <span className="pc-mosquee-adresse">{priere.mosqueeAdresse}</span>
            )}
            {distance !== null && (
              <span className="pc-distance">{fmtDistance(distance)}</span>
            )}
          </div>
        </div>

        <div className="pc-info-row">
          <span className="pc-icon"><IconClock /></span>
          <span className="pc-date-text">
            <span className="pc-date-day">{dateStr}</span>
            <span className="pc-date-time">{t('card.at')} {timeStr}</span>
          </span>
        </div>

        {priere.commentaire && (
          <p className="pc-comment">"{priere.commentaire}"</p>
        )}
      </div>

      <div className="pc-footer">
        <div className="pc-footer-left">
          {createdAt && <span className="pc-created">{t('card.declared_on')} {createdAt}</span>}
        </div>
        <div className="pc-footer-right">
          {itineraireUrl && (
            <a
              href={itineraireUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pc-itineraire"
              title={t('card.route_title')}
            >
              <IconPin />
            </a>
          )}
          <button
            className="pc-share"
            onClick={() => setShowShare(true)}
            title="Générer l'annonce"
          >
            <IconShare />
          </button>
          {onDelete && (
            <button
              className="pc-delete"
              onClick={() => onDelete(priere.id)}
              title={t('card.delete_title')}
            >
              <IconTrash />
            </button>
          )}
        </div>
      </div>
      {showShare && <AvisDecesModal priere={priere} onClose={() => setShowShare(false)} />}
    </div>
  );
}
