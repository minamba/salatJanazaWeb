import { forwardRef } from 'react';
import mosqueeImg     from '../assets/icon3.png';
import invocationImg from '../assets/invocation.png';
import { capitalizeFirst } from '../lib/utils';

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MOIS  = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// Pays masculins → "au", pluriels → "aux", reste → "en"
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

function fmtDate(d) {
  const date = new Date(d);
  return `${JOURS[date.getDay()]} ${date.getDate()} ${MOIS[date.getMonth()]} ${date.getFullYear()}`;
}
function fmtHeure(d) {
  const date = new Date(d);
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}h${m}`;
}

function anonymeLabel(genre) {
  const g = genre?.toLowerCase() ?? '';
  if (g === 'femme')  return 'Une sœur de la communauté';
  if (g === 'enfant') return 'Un enfant de la communauté';
  return 'Un frère de la communauté';
}

const AvisDecesCard = forwardRef(({ data }, ref) => {
  const {
    genre, nomDefunt, estAnonyme, nomFamille,
    showYears, anneNaissance, anneDeces,
    paysEnterrement, villeEnterrement, commentaire,
    mosqueeNom, mosqueeAdresse,
    dateHeurePriere,
  } = data;

  const g           = genre?.toLowerCase() ?? '';
  const isF         = g === 'femme';
  const hasYears   = showYears && anneNaissance && anneDeces;
  const burialStr  = [paysEnterrement, villeEnterrement].filter(Boolean).join(', ');

  // Name display
  let nomDisplay, sousNom;
  if (estAnonyme) {
    nomDisplay = anonymeLabel(genre);
    sousNom    = '(Inconnu(e))';
  } else {
    const civilite = isF ? 'Mme.' : g === 'homme' ? 'M.' : '';
    const nom      = nomDefunt || '';
    nomDisplay     = civilite ? `${civilite} ${nom.toUpperCase()}` : nom.toUpperCase();
    sousNom        = null;
  }

  const duaAr = isF
    ? 'اللهم اغفر لها وارحمها وعافها واعف عنها'
    : 'اللهم اغفر له وارحمه وعافه واعف عنه';

  const duaTr = "Qu'Allah lui accorde Sa miséricorde, lui pardonne ses péchés et l'accueille dans Son paradis. Amîn.";

  return (
    <div ref={ref} className="avis-card">

      {/* ── Header ─── */}
      <div className="avis-header">
        <img src={mosqueeImg} alt="" className="avis-header-icon" />
        <div>
          <div className="avis-header-title">Salat al-Janaza</div>
          <div className="avis-header-sub">Annonce de décès</div>
        </div>
      </div>

      {/* ── Body ─── */}
      <div className="avis-body">

        {/* Verset — image calligraphique */}
        <div className="avis-verse-wrap">
          <img src={invocationImg} alt="Inna lillahi wa inna ilayhi raji'un" className="avis-verse-img" />
        </div>
        <div className="avis-sep-line" />

        {/* Annonce famille */}
        <p className="avis-family-text">
          {nomFamille
            ? <>La famille <strong>{nomFamille.toUpperCase()}</strong> est triste de vous annoncer le décès de :</>
            : <>Nous vous annonçons avec tristesse le décès de :</>
          }
        </p>

        {/* Nom + infos complémentaires */}
        <div className="avis-name-block">
          <div className="avis-name">{nomDisplay}</div>

          {sousNom && (
            <div className="avis-sous-nom">{sousNom}</div>
          )}

          {hasYears && (
            <div className="avis-years">{anneNaissance} – {anneDeces}</div>
          )}

          {commentaire && (
            <p className="avis-commentaire">{commentaire}</p>
          )}
        </div>

        <div className="avis-sep-line" />

        {/* Prière */}
        <div className="avis-prayer-block">
          <div className="avis-prayer-label">PRIÈRE</div>
          {dateHeurePriere && (
            <div className="avis-prayer-datetime">
              {fmtDate(dateHeurePriere)} · {fmtHeure(dateHeurePriere)}
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

          {burialStr && (
            <div className="avis-burial-row">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span>Enterrement {prepPays(paysEnterrement)} <strong>{burialStr}</strong></span>
            </div>
          )}
        </div>

        <div className="avis-sep-line" />

        {/* Dua */}
        <div className="avis-dua-block">
          <div className="avis-dua-tr">{duaTr}</div>
        </div>

      </div>

      {/* ── Footer ─── */}
      <div className="avis-footer">SALATJANAZA.ORG</div>

    </div>
  );
});

AvisDecesCard.displayName = 'AvisDecesCard';
export default AvisDecesCard;
