import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import html2canvas from 'html2canvas';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { fr } from 'date-fns/locale/fr';
import { ar } from 'date-fns/locale/ar';
import { enGB } from 'date-fns/locale/en-GB';
import { createPriere, resetCreatePriere, SHOW_JANAZA_TOAST } from '../../lib/actions/priereJanazaActions';
import { searchMosquees, createMosqueeSuggestion } from '../../lib/api/mosqueeApi';
import AvisDecesCard from '../../components/AvisDecesCard';
import { capitalizeFirst } from '../../lib/utils';
import { apiClient } from '../../lib/api/axiosConfig';
import { computeUtcOffsetMinutes } from '../../lib/timezoneUtils';

registerLocale('fr', fr);
registerLocale('ar', ar);
registerLocale('en', enGB);

// ── Country list ──────────────────────────────────────────────────────────────
const PAYS = [
  'Afghanistan','Afrique du Sud','Albanie','Algérie','Allemagne','Angola','Arabie Saoudite',
  'Argentine','Australie','Autriche','Azerbaïdjan','Bahreïn','Bangladesh','Belgique','Bénin',
  'Birmanie','Bosnie-Herzégovine','Brésil','Bulgarie','Burkina Faso','Burundi','Cambodge',
  'Cameroun','Canada','Centrafrique','Comores','Congo','Côte d\'Ivoire','Danemark','Djibouti',
  'Égypte','Émirats arabes unis','Espagne','Éthiopie','Finlande','France','Gabon','Gambie',
  'Ghana','Grèce','Guinée','Guinée-Bissau','Guinée équatoriale','Hongrie','Inde','Indonésie',
  'Irak','Iran','Irlande','Italie','Jordanie','Kazakhstan','Kenya','Kirghizistan','Koweït',
  'Liban','Libye','Luxembourg','Macédoine du Nord','Madagascar','Malaisie','Mali','Maroc',
  'Mauritanie','Mexique','Moldavie','Mozambique','Namibie','Niger','Nigéria','Norvège',
  'Oman','Ouganda','Ouzbékistan','Pakistan','Palestine','Pays-Bas','Philippines','Pologne',
  'Portugal','Qatar','République démocratique du Congo','Roumanie','Royaume-Uni','Rwanda',
  'Sénégal','Sierra Leone','Singapour','Somalie','Soudan','Suède','Suisse','Syrie',
  'Tadjikistan','Tanzanie','Tchad','Togo','Tunisie','Turquie','Turkménistan','Ukraine',
  'Yémen','Zambie','Zimbabwe',
].sort();

// ── Country search ────────────────────────────────────────────────────────────
function CountrySearch({ value, onChange }) {
  const { t } = useTranslation();
  const [query, setQuery]       = useState(value || '');
  const [open, setOpen]         = useState(false);
  const [filtered, setFiltered] = useState([]);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange('');
    if (val.trim().length >= 1) {
      const q = val.toLowerCase();
      setFiltered(PAYS.filter((p) => p.toLowerCase().includes(q)).slice(0, 8));
      setOpen(true);
    } else {
      setFiltered([]);
      setOpen(false);
    }
  };

  const handleSelect = (pays) => {
    setQuery(pays);
    setOpen(false);
    onChange(pays);
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    setOpen(false);
  };

  return (
    <div className="mosque-search-wrap" ref={wrapRef}>
      <div className="mosque-search-input-row">
        <svg className="mosque-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query.length >= 1 && filtered.length > 0 && setOpen(true)}
          placeholder={t('declare.country_placeholder')}
          autoComplete="off"
          className="mosque-search-input"
        />
        {query && (
          <button type="button" className="mosque-search-clear" onClick={handleClear} aria-label={t('declare.clear')}>✕</button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <ul className="mosque-search-list">
          {filtered.map((p) => (
            <li key={p} className="mosque-search-item" onMouseDown={() => handleSelect(p)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span>
                <span className="mosque-search-name">{p}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Mosque name helpers ───────────────────────────────────────────────────────
function normalizeAccents(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function hasValidMosquePrefix(text) {
  const norm = normalizeAccents(text.trim());
  return (
    norm.startsWith('grande mosquee') ||
    norm.startsWith('petite mosquee') ||
    norm.startsWith('mosquee') ||
    norm.startsWith('salle de priere') ||
    norm.startsWith('centre')
  );
}

function formatNomMosquee(text) {
  if (!text) return text;
  const norm = normalizeAccents(text);
  if (norm.startsWith('grande mosquee')) {
    const m = text.match(/^grande\s+mosqu[eéèê]{1,2}/i);
    const rest = m ? text.slice(m[0].length) : text.slice(14);
    return 'Grande Mosquée' + rest;
  }
  if (norm.startsWith('petite mosquee')) {
    const m = text.match(/^petite\s+mosqu[eéèê]{1,2}/i);
    const rest = m ? text.slice(m[0].length) : text.slice(14);
    return 'Petite Mosquée' + rest;
  }
  if (norm.startsWith('mosquee')) {
    const m = text.match(/^mosqu[eéèê]{1,2}/i);
    const rest = m ? text.slice(m[0].length) : text.slice(7);
    return 'Mosquée' + rest;
  }
  if (norm.startsWith('salle de priere')) {
    const m = text.match(/^salle\s+de\s+pri[eèéê]re/i);
    const rest = m ? text.slice(m[0].length) : text.slice(15);
    return 'Salle de prière' + rest;
  }
  if (norm.startsWith('centre')) {
    const m = text.match(/^centr[eé]/i);
    const rest = m ? text.slice(m[0].length) : text.slice(6);
    return 'Centre' + rest;
  }
  return text;
}

// ── Inline add mosque form ────────────────────────────────────────────────────
function AddMosqueeForm({ onClose }) {
  const { t } = useTranslation();
  const { user } = useSelector((s) => s.auth);
  const [nom, setNom]               = useState('');
  const [adresse, setAdresse]       = useState('');
  const [coords, setCoords]         = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [showSugg, setShowSugg]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [nomError, setNomError]     = useState('');
  const [adresseError, setAdresseError] = useState('');
  const timerRef   = useRef(null);
  const addrRef    = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (addrRef.current && !addrRef.current.contains(e.target)) setShowSugg(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAdresseChange = (e) => {
    const val = e.target.value;
    setAdresse(val);
    setCoords(null);
    setAdresseError('');
    clearTimeout(timerRef.current);
    if (val.trim().length < 3) { setSuggestions([]); setShowSugg(false); setLoadingSugg(false); return; }
    setLoadingSugg(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val.trim())}&format=json&limit=5`,
          { headers: { 'Accept-Language': 'fr' } }
        );
        const data = await res.json();
        setSuggestions(data);
        setShowSugg(true);
      } catch { setSuggestions([]); }
      finally { setLoadingSugg(false); }
    }, 400);
  };

  const selectSuggestion = (item) => {
    setAdresse(item.display_name);
    setCoords({ lat: parseFloat(item.lat), lon: parseFloat(item.lon) });
    setSuggestions([]);
    setShowSugg(false);
    setAdresseError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let hasError = false;

    const formatted = formatNomMosquee(nom.trim());
    if (!formatted || !hasValidMosquePrefix(formatted)) {
      setNomError(t('declare.add_mosque_name_error'));
      hasError = true;
    } else {
      setNomError('');
    }

    if (!adresse.trim()) {
      setAdresseError(t('declare.add_mosque_addr_error_empty'));
      hasError = true;
    }

    if (hasError) return;

    setSaving(true);
    try {
      let finalCoords = coords;
      if (!finalCoords) {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(adresse.trim())}&format=json&limit=1`,
          { headers: { 'Accept-Language': 'fr' } }
        );
        const data = await res.json();
        if (!data.length) {
          setAdresseError(t('declare.add_mosque_addr_error_not_found'));
          setSaving(false);
          return;
        }
        finalCoords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      }
      await createMosqueeSuggestion({
        nom: formatted,
        adresse: adresse.trim(),
        latitude: finalCoords.lat,
        longitude: finalCoords.lon,
        utilisateurId: user?.dbId ?? null,
      });
      setSubmitted(true);
    } catch {
      setAdresseError(t('declare.add_mosque_send_error'));
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="add-mosquee-form">
        <div className="add-mosquee-form-header">
          <span>{t('declare.add_mosque_success_title')}</span>
          <button type="button" className="add-mosquee-close" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#444', lineHeight: 1.5, marginBottom: '1rem' }}>
          {t('declare.add_mosque_success_body')}
        </p>
        <button type="button" className="df-submit" onClick={onClose}>{t('declare.add_mosque_close')}</button>
      </div>
    );
  }

  return (
    <div className="add-mosquee-form">
      <div className="add-mosquee-form-header">
        <span>{t('declare.add_mosque_title')}</span>
        <button type="button" className="add-mosquee-close" onClick={onClose}>✕</button>
      </div>

      <div className="add-mosquee-field">
        <label className="add-mosquee-label">{t('declare.add_mosque_name_label')} <span className="df-required">*</span></label>
        <input
          type="text"
          value={nom}
          onChange={(e) => { setNom(e.target.value); setNomError(''); }}
          placeholder={t('declare.add_mosque_name_placeholder')}
          className="df-input"
          autoComplete="off"
        />
        <p className="add-mosquee-hint">{t('declare.add_mosque_name_hint')}</p>
        {nomError && <p className="add-mosquee-error">{nomError}</p>}
      </div>

      <div className="add-mosquee-field">
        <label className="add-mosquee-label">{t('declare.add_mosque_addr_label')} <span className="df-required">*</span></label>
        <p className="add-mosquee-warning">
          {t('mosquee.add_autocomplete_hint')}
        </p>
        <div style={{ position: 'relative' }} ref={addrRef}>
          <input
            type="text"
            value={adresse}
            onChange={handleAdresseChange}
            onFocus={() => suggestions.length > 0 && setShowSugg(true)}
            placeholder={t('declare.add_mosque_addr_placeholder')}
            className="df-input"
            autoComplete="off"
            style={loadingSugg ? { paddingRight: '2.5rem' } : {}}
          />
          {loadingSugg && <span className="mosque-search-spinner" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />}
          {showSugg && suggestions.length > 0 && (
            <ul className="mosque-search-list">
              {suggestions.map((s, i) => (
                <li key={i} className="mosque-search-item" onMouseDown={() => selectSuggestion(s)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.3 8 13 8 13s8-7.7 8-13a8 8 0 0 0-8-8z"/>
                  </svg>
                  <span>
                    <span className="mosque-search-name">{s.display_name}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {coords && <p className="add-mosquee-coords">{t('declare.add_mosque_addr_confirmed')}</p>}
        {adresseError && <p className="add-mosquee-error">{adresseError}</p>}
      </div>

      <button type="button" className="df-submit" onClick={handleSubmit} disabled={saving}>
        {saving ? t('declare.add_mosque_submitting') : t('declare.add_mosque_submit')}
      </button>
    </div>
  );
}

// ── Mosque autocomplete (DB search — same as mobile) ─────────────────────────
function MosqueeSearch({ onSelect, onClear, onAddRequested }) {
  const { t } = useTranslation();
  const [query, setQuery]             = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [open, setOpen]               = useState(false);
  const timerRef  = useRef(null);
  const wrapRef   = useRef(null);
  const latestRef = useRef('');

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    latestRef.current = val;
    onClear();
    clearTimeout(timerRef.current);
    if (val.trim().length < 2) { setSuggestions([]); setOpen(false); setLoading(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await searchMosquees(val.trim());
        if (latestRef.current === val) {
          const list = Array.isArray(res.data) ? res.data : [];
          setSuggestions(list);
          setOpen(true);
        }
      } catch {
        if (latestRef.current === val) setSuggestions([]);
      } finally {
        if (latestRef.current === val) setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (item) => {
    setQuery(capitalizeFirst(item.nom));
    setSuggestions([]);
    setOpen(false);
    onSelect(item);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    onClear();
  };

  return (
    <div className="mosque-search-wrap" ref={wrapRef}>
      <div className="mosque-search-input-row">
        <svg className="mosque-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={t('declare.mosque_placeholder')}
          autoComplete="off"
          className="mosque-search-input"
        />
        {loading && <span className="mosque-search-spinner" />}
        {query && (
          <button type="button" className="mosque-search-clear" onClick={handleClear} aria-label={t('declare.clear')}>✕</button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="mosque-search-list">
          {suggestions.map((s) => (
            <li key={s.id} className="mosque-search-item" onMouseDown={() => handleSelect(s)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.3 8 13 8 13s8-7.7 8-13a8 8 0 0 0-8-8z"/>
              </svg>
              <span>
                <span className="mosque-search-name">{capitalizeFirst(s.nom)}</span>
                {s.adresse && <span className="mosque-search-addr">{s.adresse}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && query.trim().length >= 2 && suggestions.length === 0 && (
        <div className="mosque-search-noresult">
          <div className="mosque-search-noresult-row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            {t('declare.mosque_not_found')}
          </div>
          {onAddRequested && (
            <button
              type="button"
              className="mosque-search-add-btn"
              onMouseDown={(e) => { e.preventDefault(); setOpen(false); onAddRequested(); }}
            >
              {t('declare.mosque_add_btn')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Year select ───────────────────────────────────────────────────────────────
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1899 }, (_, i) => CURRENT_YEAR - i);

function YearSelect({ value, onChange, placeholder }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
    </select>
  );
}

// ── Preview modal ─────────────────────────────────────────────────────────────
function PreviewModal({ data, onClose }) {
  const { t } = useTranslation();
  const cardRef   = useRef(null);
  const [busy, setBusy] = useState(false);
  const [iosImg, setIosImg] = useState(null);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const capture = async () => {
    setBusy(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      return canvas;
    } finally { setBusy(false); }
  };

  const download = async () => {
    const canvas = await capture();
    if (isIOS) {
      setIosImg(canvas.toDataURL('image/png'));
    } else {
      const link = document.createElement('a');
      link.download = `avis-deces-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const share = async () => {
    const canvas = await capture();
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'avis-deces.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Avis de décès - Salat al-Janaza' });
      } else {
        const link = document.createElement('a');
        link.download = `avis-deces-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  return (
    <div className="preview-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !iosImg) onClose(); }}>
      <div className="preview-modal">
        <div className="preview-modal-header">
          <button className="preview-modal-back" onClick={iosImg ? () => setIosImg(null) : onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            {iosImg ? t('declare.preview_back_flyer') : t('declare.preview_back')}
          </button>
          <span className="preview-modal-title">{iosImg ? t('declare.preview_save_title') : t('declare.preview_title')}</span>
          {iosImg ? <span /> : (
            <button className="preview-modal-share btn-sm" onClick={share} disabled={busy}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              {t('declare.preview_share')}
            </button>
          )}
        </div>

        {iosImg ? (
          <div className="preview-modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1rem' }}>
            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#555', margin: 0 }}>
              {t('declare.preview_ios_hint')}
            </p>
            <img src={iosImg} alt="Avis de décès" style={{ maxWidth: '100%', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }} />
          </div>
        ) : (
          <div className="preview-modal-body">
            <AvisDecesCard ref={cardRef} data={data} />
          </div>
        )}

        <div className="preview-modal-footer">
          {!iosImg && (
            <button className="btn btn-primary" onClick={download} disabled={busy}>
              {busy ? t('declare.preview_generating') : t('declare.preview_download')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
function toDatetimeLocal(date) {
  // Converts a JS Date to "YYYY-MM-DDTHH:MM" using LOCAL time values.
  // This mirrors what <input type="datetime-local"> produces natively.
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function DeclarePriereForm() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { createLoading, createSuccess, createError, list: existingPrieres } = useSelector((s) => s.priereJanaza);

  const [form, setForm] = useState({
    nomDefunt:       '',
    estAnonyme:      false,
    genre:           'homme',
    dateHeurePriere: '',
    commentaire:     '',
    // avis de décès fields
    nomFamille:      '',
    showYears:       true,
    anneNaissance:   '',
    anneDeces:       String(new Date().getFullYear()),
    paysEnterrement: '',
    countryKnown:    true,
    villeEnterrement:'',
    relation:        '',
    nomsProches:     '',
  });

  const [selectedMosquee, setSelectedMosquee] = useState(null);
  const [showAddMosquee,  setShowAddMosquee]  = useState(false);
  const [submitError,     setSubmitError]     = useState('');
  const [submitting,      setSubmitting]      = useState(false);
  const [showPreview,     setShowPreview]     = useState(false);
  const [importLoading,     setImportLoading]     = useState(false);
  const [importStatus,      setImportStatus]      = useState(null); // null | 'pending' | 'success' | 'error'
  const [importMessage,     setImportMessage]     = useState('');
  const [showImportVerify,   setShowImportVerify]   = useState(false);
  const [importTimeUnknown,  setImportTimeUnknown]  = useState(false);
  const importFileRef = useRef(null);
  const importPollRef = useRef(null);
  const importFallbackPollRef = useRef(null);
  const importDeclMaxIdRef = useRef(0);

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };
  const setVal = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  useEffect(() => {
    if (createSuccess) {
      dispatch({
        type: SHOW_JANAZA_TOAST,
        payload: {
          id: Date.now(),
          nomDefunt: form.estAnonyme ? null : form.nomDefunt || null,
          estAnonyme: form.estAnonyme,
          genre: form.genre,
          mosqueeNom: selectedMosquee?.nom ?? null,
          dateHeurePriere: form.dateHeurePriere || null,
        },
      });
      const timer = setTimeout(() => {
        dispatch(resetCreatePriere());
        navigate('/tableau-de-bord');
      }, 2000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createSuccess]);

  useEffect(() => () => dispatch(resetCreatePriere()), [dispatch]);

  const handleMosqueeSelect = (osmData) => { setSelectedMosquee(osmData); setShowAddMosquee(false); setSubmitError(''); };
  const handleMosqueeClear  = () => { setSelectedMosquee(null); setShowAddMosquee(false); setSubmitError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMosquee) return;
    if (!form.estAnonyme && !form.nomDefunt?.trim()) {
      setSubmitError(t('declare.error_name_required'));
      return;
    }
    setSubmitting(true);
    setSubmitError('');

    // Duplicate detection
    // dateHeurePriere values are wall-clock UTC: compare via getUTC* methods.
    if (form.dateHeurePriere) {
      const norm = (s) => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
      const proposedDate = new Date(form.dateHeurePriere + 'Z');
      const proposedDay = `${proposedDate.getUTCFullYear()}-${proposedDate.getUTCMonth()}-${proposedDate.getUTCDate()}`;
      const proposedHour = proposedDate.getUTCHours();
      const proposedMinute = proposedDate.getUTCMinutes();
      const proposedMosqueeId = Number(selectedMosquee.id);

      const sameHourConflict = existingPrieres.find((p) => {
        if (!p.dateHeurePriere) return false;
        const d = new Date(p.dateHeurePriere);
        const day = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
        return Number(p.mosqueeId) === proposedMosqueeId && day === proposedDay && d.getUTCHours() === proposedHour && d.getUTCMinutes() === proposedMinute;
      });

      if (sameHourConflict) {
        const isExactDuplicate = !form.estAnonyme && form.nomDefunt?.trim()
          && norm(sameHourConflict.nomDefunt) === norm(form.nomDefunt);
        setSubmitError(
          isExactDuplicate
            ? t('declare.error_exact_duplicate')
            : t('declare.error_time_conflict')
        );
        setSubmitting(false);
        return;
      }
    }

    const mosqueeId = selectedMosquee.id;
    const prayerDate = form.dateHeurePriere ? new Date(form.dateHeurePriere + 'Z') : new Date();
    const utcOffsetMinutes = computeUtcOffsetMinutes(
      form.countryKnown ? form.paysEnterrement : '',
      selectedMosquee.longitude,
      prayerDate,
    );
    dispatch(createPriere({
      mosqueeId:        Number(mosqueeId),
      mosqueeNom:       capitalizeFirst(selectedMosquee.nom),
      utilisateurId:    user?.dbId ?? undefined,
      nomDefunt:        form.estAnonyme ? null : form.nomDefunt || null,
      estAnonyme:       form.estAnonyme,
      genre:            form.genre || null,
      dateHeurePriere:  form.dateHeurePriere ? prayerDate.toISOString() : null,
      commentaire:      form.commentaire || null,
      paysEnterrement:  form.countryKnown ? (form.paysEnterrement || null) : null,
      villeEnterrement: form.villeEnterrement || null,
      utcOffsetMinutes,
    }));
    setSubmitting(false);
  };

  const cardData = {
    genre:            form.genre,
    nomDefunt:        form.nomDefunt,
    estAnonyme:       form.estAnonyme,
    nomFamille:       form.nomFamille,
    showYears:        form.showYears,
    anneNaissance:    form.anneNaissance,
    anneDeces:        form.anneDeces,
    paysEnterrement:  form.countryKnown ? form.paysEnterrement : '',
    villeEnterrement: form.villeEnterrement,
    commentaire:      form.commentaire,
    mosqueeNom:       selectedMosquee?.nom,
    mosqueeAdresse:   selectedMosquee?.adresse,
    dateHeurePriere:  form.dateHeurePriere,
  };

  const canPreview = !!(form.dateHeurePriere && (form.nomDefunt || form.estAnonyme));
  const busy = submitting || createLoading;
  const canImport = !!(user?.canImportFlyer || ['admin', 'superadmin'].includes(user?.role?.toLowerCase()));

  const processImportFile = async (file) => {
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setImportStatus('error');
      setImportMessage(t('declare.import_format_body'));
      return;
    }
    if (!user?.dbId) {
      setImportStatus('error');
      setImportMessage(t('declare.import_login_required'));
      return;
    }

    setImportLoading(true);
    setImportStatus('pending');
    setImportMessage(t('declare.import_processing'));

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('utilisateurId', String(user.dbId));

      const uploadResp = await apiClient.post('/api/flyer/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      const { importToken } = uploadResp.data;

      // Mémorise le max ID avant import pour le polling de secours
      try {
        const snap = await apiClient.get(`/api/prierejanaza/utilisateur/${user.dbId}`);
        importDeclMaxIdRef.current = snap.data?.length > 0 ? Math.max(...snap.data.map(d => d.id)) : 0;
      } catch { importDeclMaxIdRef.current = 0; }

      function applyImportSuccess(timeUnknown) {
        if (importPollRef.current) { clearInterval(importPollRef.current); importPollRef.current = null; }
        if (importFallbackPollRef.current) { clearInterval(importFallbackPollRef.current); importFallbackPollRef.current = null; }
        setImportLoading(false);
        setImportStatus('success');
        setImportMessage(t('declare.import_success'));
        setImportTimeUnknown(!!timeUnknown);
        setShowImportVerify(true);
      }

      if (importPollRef.current) clearInterval(importPollRef.current);
      importPollRef.current = setInterval(async () => {
        try {
          const statusResp = await apiClient.get(`/api/flyer/import-status/${importToken}`);
          const { status: s, message, errorCode, timeUnknown } = statusResp.data;
          if (s === 'success') {
            applyImportSuccess(timeUnknown);
          } else if (s === 'error') {
            if (importPollRef.current) { clearInterval(importPollRef.current); importPollRef.current = null; }
            if (importFallbackPollRef.current) { clearInterval(importFallbackPollRef.current); importFallbackPollRef.current = null; }
            setImportLoading(false);
            setImportStatus('error');
            setImportMessage(errorCode === 'IMAGE_QUALITY' ? t('declare.import_image_quality') : (message || t('declare.import_error_generic')));
          }
        } catch (_) {}
      }, 1500);

      // Polling de secours : vérifie toutes les 8s si une nouvelle déclaration est apparue
      importFallbackPollRef.current = setInterval(async () => {
        if (!importPollRef.current) { clearInterval(importFallbackPollRef.current); importFallbackPollRef.current = null; return; }
        try {
          const res = await apiClient.get(`/api/prierejanaza/utilisateur/${user.dbId}`);
          const maxId = res.data?.length > 0 ? Math.max(...res.data.map(d => d.id)) : 0;
          if (maxId > importDeclMaxIdRef.current) applyImportSuccess(false);
        } catch (_) {}
      }, 8000);

      setTimeout(() => {
        if (importPollRef.current) {
          clearInterval(importPollRef.current);
          importPollRef.current = null;
          if (importFallbackPollRef.current) { clearInterval(importFallbackPollRef.current); importFallbackPollRef.current = null; }
          setImportLoading(false);
          setImportStatus('error');
          setImportMessage(t('declare.import_timeout'));
        }
      }, 2 * 60 * 1000);

    } catch (err) {
      setImportLoading(false);
      setImportStatus('error');
      setImportMessage(err?.response?.data?.error || t('declare.import_error_generic'));
    }
  };

  const handleImportFlyer = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    processImportFile(file);
  };

  const GENRES = [
    { value: 'homme',  label: t('declare.genre_homme'),  icon: '♂' },
    { value: 'femme',  label: t('declare.genre_femme'),  icon: '♀' },
    { value: 'enfant', label: t('declare.genre_enfant'), icon: '✦' },
  ];

  return (
    <div className="df-page">
      <div className="df-card">

        {/* ── En-tête carte ── */}
        <div className="df-card-header">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
          <div>
            <div className="df-card-title">{t('declare.form_title')}</div>
            <div className="df-card-sub">{t('declare.form_subtitle')}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="df-form">

          {/* ── Section : Mosquée ── */}
          <div className="df-section">
            <div className="df-section-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.3 8 13 8 13s8-7.7 8-13a8 8 0 0 0-8-8z"/>
              </svg>
              {t('declare.section_mosque')} <span className="df-required">*</span>
            </div>
            <MosqueeSearch
              onSelect={handleMosqueeSelect}
              onClear={handleMosqueeClear}
              onAddRequested={() => setShowAddMosquee(true)}
            />
            {showAddMosquee && (
              <AddMosqueeForm onClose={() => setShowAddMosquee(false)} />
            )}
            {selectedMosquee && (
              <div className="mosque-selected-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <div>
                  <strong>{capitalizeFirst(selectedMosquee.nom)}</strong>
                  {selectedMosquee.adresse && <span>{selectedMosquee.adresse}</span>}
                </div>
              </div>
            )}
          </div>

          {/* ── Section : Date ── */}
          <div className="df-section">
            <div className="df-section-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {t('declare.section_datetime')} <span className="df-required">*</span>
            </div>
            <div className={`df-datepicker-wrap${i18n.language === 'ar' ? ' df-datepicker-rtl' : ''}`}>
              <DatePicker
                selected={form.dateHeurePriere ? new Date(form.dateHeurePriere) : null}
                onChange={(date) => {
                  if (!date) { setForm(f => ({ ...f, dateHeurePriere: '' })); return; }
                  setForm(f => ({ ...f, dateHeurePriere: toDatetimeLocal(date) }));
                }}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                locale={i18n.language === 'ar' ? 'ar' : i18n.language === 'en' ? 'en' : 'fr'}
                className="df-input"
                placeholderText={t('declare.date_placeholder')}
                popperPlacement="bottom-start"
                autoComplete="off"
              />
            </div>
          </div>

          {/* ── Section : Défunt ── */}
          <div className="df-section">
            <div className="df-section-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              {t('declare.section_defunt')}
            </div>

            {/* Genre pills */}
            <div className="df-genre-pills">
              {GENRES.map((g) => (
                <label key={g.value} className={`df-genre-pill${form.genre === g.value ? ' active' : ''}`}>
                  <input type="radio" name="genre" value={g.value} checked={form.genre === g.value} onChange={set('genre')} />
                  {g.label}
                </label>
              ))}
            </div>

            {/* Anonyme */}
            <label className="df-checkbox-row">
              <input type="checkbox" checked={form.estAnonyme} onChange={set('estAnonyme')} />
              <span className="df-checkbox-box" />
              <span>{t('declare.defunt_anonymous_check')}</span>
            </label>

            {/* Nom */}
            {!form.estAnonyme && (
              <div style={{ marginTop: '0.75rem' }}>
                <label className="df-label">{t('declare.defunt_name_label')}</label>
                <input className="df-input" type="text" value={form.nomDefunt} onChange={set('nomDefunt')} placeholder={t('declare.defunt_name_placeholder')} />
              </div>
            )}

            {/* Commentaire */}
            <div style={{ marginTop: '0.75rem' }}>
              <label className="df-label">{t('declare.comment_label')} <span className="df-opt">({t('declare.comment_optional')})</span></label>
              <textarea className="df-input df-textarea" value={form.commentaire} onChange={set('commentaire')} placeholder={t('declare.comment_placeholder')} rows={3} />
            </div>
          </div>

          {/* ── Section : Avis de décès ── */}
          <div className="df-section df-section-avis">

            {/* Toggle années */}
            <div className="toggle-row">
              <div>
                <div className="toggle-label">{t('declare.years_label')}</div>
                <div className="toggle-sub">{t('declare.years_sub')}</div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={form.showYears} onChange={set('showYears')} />
                <span className="toggle-knob" />
              </label>
            </div>

            {form.showYears && (
              <div className="df-row-2">
                <div>
                  <label className="df-label">{t('declare.year_birth')}</label>
                  <YearSelect value={form.anneNaissance} onChange={setVal('anneNaissance')} placeholder={t('declare.year_placeholder')} />
                </div>
                <div>
                  <label className="df-label">{t('declare.year_death')}</label>
                  <YearSelect value={form.anneDeces} onChange={setVal('anneDeces')} placeholder={t('declare.year_placeholder')} />
                </div>
              </div>
            )}

            <div className="toggle-row" style={{ marginTop: '0.85rem' }}>
              <div>
                <div className="toggle-label">{t('declare.country_label')}</div>
                <div className="toggle-sub">
                  {form.countryKnown ? t('declare.country_sub_on') : t('declare.country_sub_off')}
                </div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={form.countryKnown} onChange={set('countryKnown')} />
                <span className="toggle-knob" />
              </label>
            </div>
            {form.countryKnown && (
              <div style={{ marginTop: '0.5rem' }}>
                <CountrySearch value={form.paysEnterrement} onChange={setVal('paysEnterrement')} />
              </div>
            )}

            <div style={{ marginTop: '0.75rem' }}>
              <label className="df-label">{t('declare.city_label')} <span className="df-opt">({t('declare.city_optional')})</span></label>
              <input className="df-input" type="text" value={form.villeEnterrement} onChange={set('villeEnterrement')} placeholder={t('declare.city_placeholder')} />
            </div>

            <button type="button" className="btn-preview-avis" onClick={() => setShowPreview(true)} disabled={!canPreview}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              {t('declare.btn_preview')}
            </button>
          </div>

          {/* ── Erreurs & submit ── */}
          {(submitError || createError) && (
            <div className="alert alert-error">✗ {submitError || createError}</div>
          )}

          <button type="submit" className="df-submit" disabled={busy || !selectedMosquee}>
            {busy ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="df-spin">
                  <path d="M21 12a9 9 0 1 1-6.22-8.56"/>
                </svg>
                {t('declare.btn_submitting')}
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
                </svg>
                {t('declare.btn_submit')}
              </>
            )}
          </button>

          {canImport && (
            <>
              <input
                ref={importFileRef}
                type="file"
                accept="image/png,image/jpeg"
                style={{ display: 'none' }}
                onChange={handleImportFlyer}
              />
              {importStatus && (
                <div className={`df-import-status df-import-status--${importStatus}`}>
                  {importStatus === 'success' && '✓ '}
                  {importStatus === 'error' && '✕ '}
                  {importStatus === 'pending' && '⏳ '}
                  {importMessage}
                </div>
              )}
            </>
          )}
        </form>
      </div>

      {showPreview && (
        <PreviewModal data={cardData} onClose={() => setShowPreview(false)} />
      )}

      {showImportVerify && (
        <div className="modal-overlay" onClick={() => setShowImportVerify(false)}>
          <div className="modal-box" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>ℹ️ {t('declare.import_verify_title')}</h3>
              <button className="modal-close" onClick={() => setShowImportVerify(false)}>✕</button>
            </div>
            <div className="modal-body">
              {importTimeUnknown && (
                <p style={{ color: '#b45309', fontWeight: '600', marginBottom: '0.75rem' }}>
                  {t('declare.import_verify_time_unknown')}
                </p>
              )}
              {t('declare.import_verify_body').split('\n').map((line, i) => (
                <p key={i} style={{ marginBottom: '0.5rem' }}>{line}</p>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowImportVerify(false)}>
                {t('declare.import_verify_close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
