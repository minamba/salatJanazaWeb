import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
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

function fmtDate(d, lang) {
  const locale = lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-GB' : 'fr-FR';
  return new Date(d).toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

function fmtHeure(d, lang) {
  const locale = lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-GB' : 'fr-FR';
  return new Date(d).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

const AvisDecesCard = forwardRef(({ data }, ref) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : i18n.language?.startsWith('en') ? 'en' : 'fr';
  const isAr = lang === 'ar';
  const isEn = lang === 'en';

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
    let civilite;
    if (isAr) {
      civilite = '';
    } else if (isEn) {
      civilite = isF ? 'Mrs.' : g === 'homme' ? 'Mr.' : '';
    } else {
      civilite = isF ? 'Mme.' : g === 'homme' ? 'M.' : '';
    }
    const nom = parseNomDefunt(nomDefunt ?? '').display;
    nomDisplay = civilite ? `${civilite} ${nom.toUpperCase()}` : nom.toUpperCase();
    sousNom = null;
  }

  // ── Family announce sentence ──────────────────────────────────────────────────
  let familyAnnounce;
  if (nomFamille) {
    if (isAr) {
      familyAnnounce = <>تُعلن عائلة <strong>{nomFamille.toUpperCase()}</strong> بحزن عن وفاة :</>;
    } else if (isEn) {
      familyAnnounce = <>The <strong>{nomFamille.toUpperCase()}</strong> family sorrowfully announces the passing of:</>;
    } else {
      familyAnnounce = <>La famille <strong>{nomFamille.toUpperCase()}</strong> est triste de vous annoncer le décès de :</>;
    }
  } else {
    familyAnnounce = <>{t('avis.community_announce')}</>;
  }

  // ── Burial text ───────────────────────────────────────────────────────────────
  let burialNode;
  if (burialStr) {
    if (isAr) {
      burialNode = <span>الدفن في <strong>{burialStr}</strong></span>;
    } else if (isEn) {
      burialNode = <span>Burial in <strong>{burialStr}</strong></span>;
    } else {
      burialNode = <span>Enterrement {prepPays(paysEnterrement)} <strong>{burialStr}</strong></span>;
    }
  }

  // ── Dua ───────────────────────────────────────────────────────────────────────
  const duaText = isAr
    ? (isF ? 'اللهم اغفر لها وارحمها وعافها واعف عنها' : 'اللهم اغفر له وارحمه وعافه واعف عنه')
    : isF ? t('avis.dua_f') : t('avis.dua');

  return (
    <div ref={ref} className="avis-card" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ── Header ── */}
      <div className="avis-header">
        <img src={mosqueeImg} alt="" className="avis-header-icon" />
        <div>
          <div className="avis-header-title">Salat al-Janaza</div>
          <div className="avis-header-sub">{t('avis.subtitle')}</div>
        </div>
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
          {commentaire && <p className="avis-commentaire">{commentaire}</p>}
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
