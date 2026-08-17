import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useShowCountryName } from '../lib/useShowCountryName';
import mosqueeImg    from '../assets/icon3.png';
import invocationImg from '../assets/invocation.png';
import { capitalizeFirst, parseNomDefunt } from '../lib/utils';

// Preposition logic — French only
const PAYS_AU = new Set([
  'afghanistan','bahreïn','bahrain','belize','bénin','benin','botswana','burkina faso',
  'burundi','cambodge','cameroun','canada','chili','congo','costa rica','danemark',
  'djibouti','équateur','gabon','ghana','guatemala','guyana','honduras','iran','iraq',
  'japon','kenya','kirghizistan','koweït','kuwait','laos','lesotho','liban','liberia',
  'liechtenstein','luxembourg','malawi','mali','maroc','mexique','mozambique','myanmar',
  'népal','niger','nigeria','nigeria','oman','pakistan','panama','paraguay','pérou',
  'portugal','qatar','rwanda','salvador','sénégal','sierra leone','soudan','sri lanka',
  'suriname','swaziland','eswatini','tchad','togo','venezuela','viêt nam','vietnam',
  'yémen','zimbabwe','cambodge','koweït','mozambique',
]);
const PAYS_AUX = new Set([
  'états-unis','etats-unis','usa','émirats arabes unis','emirats arabes unis',
  'philippines','pays-bas','maldives','seychelles','fidji','comores','tonga',
  'bahamas','barbade','antigua','îles','iles',
]);

function prepPays(pays) {
  if (!pays) return 'en';
  const norm = pays.toLowerCase().trim();
  if (PAYS_AUX.has(norm) || norm.startsWith('îles') || norm.startsWith('iles')) return 'aux';
  if (PAYS_AU.has(norm)) return 'au';
  return 'en';
}

const LOCALE_MAP = { fr: 'fr-FR', en: 'en-US', ar: 'ar-SA', tr: 'tr-TR', ja: 'ja-JP', ko: 'ko-KR', ms: 'ms-MY', ur: 'ur-PK', id: 'id-ID', bn: 'bn-BD', ru: 'ru-RU', pt: 'pt-BR', de: 'de-DE', it: 'it-IT', es: 'es-ES', bm: 'fr-FR' };

function renderBold(str) {
  if (!str) return null;
  const parts = str.split(/<bold>(.*?)<\/bold>/);
  return parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p);
}

function fmtDate(d, lang) {
  const locale = LOCALE_MAP[lang] ?? 'fr-FR';
  return new Date(d).toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

function fmtHeure(d, lang) {
  const locale = LOCALE_MAP[lang] ?? 'fr-FR';
  return new Date(d).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

function getCountryName(iso, lang) {
  if (!iso) return null;
  try {
    return new Intl.DisplayNames([lang ?? 'fr'], { type: 'region' }).of(iso.toUpperCase());
  } catch {
    return null;
  }
}

const AvisDecesCard = forwardRef(({ data, previewLang, showCommentaire = true, mosqueeIsoCode = null }, ref) => {
  const { t: tGlobal, i18n } = useTranslation();
  const [showCountryName] = useShowCountryName();
  const t = previewLang ? i18n.getFixedT(previewLang) : tGlobal;
  const lang = (previewLang ?? i18n.language)?.split('-')[0] ?? 'fr';
  const isAr = lang === 'ar';

  const {
    genre, nomDefunt, estAnonyme, nomFamille,
    showYears, anneNaissance, anneDeces,
    paysEnterrement, villeEnterrement, commentaire,
    mosqueeNom, mosqueeAdresse,
    dateHeurePriere,
  } = data;

  const g        = genre?.toLowerCase() ?? '';
  const isF      = g === 'femme';
  const hasYears = showYears && anneNaissance && anneDeces;
  const burialStr = [paysEnterrement, villeEnterrement].filter(Boolean).join(', ');

  // ── Name display ─────────────────────────────────────────────────────────────
  let nomDisplay, sousNom;
  if (estAnonyme) {
    if (g === 'femme')  nomDisplay = t('avis.community_sister');
    else if (g === 'enfant') nomDisplay = t('avis.community_child');
    else nomDisplay = t('avis.community_brother');
    sousNom = t('avis.unknown');
  } else {
    const parsed = parseNomDefunt(nomDefunt ?? '');
    const hasLastName = !!parsed.familleNom;
    const civilite = (!isAr && hasLastName) ? (isF ? t('card.civility_female') : g === 'homme' ? t('card.civility_male') : '') : '';
    nomDisplay = civilite ? `${civilite} ${parsed.display.toUpperCase()}` : parsed.display.toUpperCase();
    sousNom = null;
  }

  // ── Family announce sentence ──────────────────────────────────────────────────
  const familyAnnounce = nomFamille
    ? renderBold(t('avis.family_announce', { name: nomFamille.toUpperCase() }))
    : t('avis.community_announce');

  // ── Burial text ───────────────────────────────────────────────────────────────
  const burialNode = burialStr
    ? renderBold(t('avis.burial_in', { prep: prepPays(paysEnterrement), location: burialStr }))
    : null;

  // ── Dua ───────────────────────────────────────────────────────────────────────
  const duaText = isAr
    ? (isF ? 'اللهم اغفر لها وارحمها وعافها واعف عنها' : 'اللهم اغفر له وارحمه وعافه واعف عنه')
    : isF ? t('avis.dua_f') : t('avis.dua');

  return (
    <div ref={ref} className="avis-card" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ── Header ── */}
      <div className="avis-header">
        <img src={mosqueeImg} alt="" className="avis-header-icon" />
        <div style={{ flex: 1 }}>
          <div className="avis-header-title">Salat Janaza</div>
        </div>
        {mosqueeIsoCode && (
          <div className="avis-header-country">
            <img
              src={`https://flagcdn.com/w40/${mosqueeIsoCode.toLowerCase()}.png`}
              alt={mosqueeIsoCode}
              className="avis-header-flag-img"
              crossOrigin="anonymous"
            />
            {showCountryName && <span className="avis-header-country-name">{getCountryName(mosqueeIsoCode, lang)}</span>}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="avis-body">

        <div className="avis-verse-wrap">
          <img src={invocationImg} alt="Inna lillahi wa inna ilayhi raji'un" className="avis-verse-img" />
        </div>
        <div className="avis-sep-line" />

        <p className="avis-family-text">{familyAnnounce}</p>

        <div className="avis-name-block">
          <div className="avis-name">{nomDisplay}</div>
          {sousNom && <div className="avis-sous-nom">{sousNom}</div>}
          {hasYears && <div className="avis-years">{anneNaissance} – {anneDeces}</div>}
          {commentaire && showCommentaire && <p className="avis-commentaire">{commentaire}</p>}
        </div>

        <div className="avis-sep-line" />

        <div className="avis-prayer-block">
          <div className="avis-prayer-label">{t('avis.prayer_label')}</div>
          {dateHeurePriere && (
            <div className="avis-prayer-datetime">
              {fmtDate(dateHeurePriere, lang)} · {fmtHeure(dateHeurePriere, lang)}
            </div>
          )}
          {mosqueeNom && (
            <div className="avis-mosque-row">
              <div className="avis-mosque-accent" />
              <svg className="avis-mosque-pin" width="13" height="13" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <div>
                <span className="avis-mosque-name">{capitalizeFirst(mosqueeNom)}</span>
                {mosqueeAdresse && <span className="avis-mosque-addr">{mosqueeAdresse}</span>}
              </div>
            </div>
          )}
          {burialNode && (
            <div className="avis-burial-row">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span>{burialNode}</span>
            </div>
          )}
        </div>

        <div className="avis-sep-line" />

        <div className="avis-dua-block">
          <div className={isAr ? 'avis-dua-ar' : 'avis-dua-tr'}>{duaText}</div>
        </div>

      </div>

      {/* ── Footer ── */}
      <div className="avis-footer">SALATJANAZA.ORG</div>

    </div>
  );
});

AvisDecesCard.displayName = 'AvisDecesCard';
export default AvisDecesCard;
