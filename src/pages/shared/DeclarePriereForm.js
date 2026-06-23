import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { createPriere, resetCreatePriere, SHOW_JANAZA_TOAST } from '../../lib/actions/priereJanazaActions';
import { searchMosquees } from '../../lib/api/mosqueeApi';
import AvisDecesCard from '../../components/AvisDecesCard';
import { capitalizeFirst } from '../../lib/utils';

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
          placeholder="Rechercher un pays…"
          autoComplete="off"
          className="mosque-search-input"
        />
        {query && (
          <button type="button" className="mosque-search-clear" onClick={handleClear} aria-label="Effacer">✕</button>
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

// ── Mosque autocomplete (DB search — same as mobile) ─────────────────────────
function MosqueeSearch({ onSelect, onClear }) {
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
          placeholder="Rechercher une mosquée par nom ou ville…"
          autoComplete="off"
          className="mosque-search-input"
        />
        {loading && <span className="mosque-search-spinner" />}
        {query && (
          <button type="button" className="mosque-search-clear" onClick={handleClear} aria-label="Effacer">✕</button>
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
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Mosquée non trouvée — elle n'est peut-être pas encore répertoriée.
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
  const cardRef   = useRef(null);
  const [busy, setBusy] = useState(false);

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
    const link = document.createElement('a');
    link.download = `avis-deces-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const share = async () => {
    const canvas = await capture();
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'avis-deces.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Avis de décès - Salat al-Janaza' });
      } else {
        // fallback: download
        const link = document.createElement('a');
        link.download = `avis-deces-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    });
  };

  return (
    <div className="preview-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="preview-modal">
        <div className="preview-modal-header">
          <button className="preview-modal-back" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Retour
          </button>
          <span className="preview-modal-title">Aperçu</span>
          <button className="preview-modal-share btn-sm" onClick={share} disabled={busy}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Partager
          </button>
        </div>

        <div className="preview-modal-body">
          <AvisDecesCard ref={cardRef} data={data} />
        </div>

        <div className="preview-modal-footer">
          <button className="btn btn-primary" onClick={download} disabled={busy}>
            {busy ? 'Génération…' : '⬇ Télécharger en PNG'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
export default function DeclarePriereForm() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { createLoading, createSuccess, createError } = useSelector((s) => s.priereJanaza);

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
    villeEnterrement:'',
    relation:        '',
    nomsProches:     '',
  });

  const [selectedMosquee, setSelectedMosquee] = useState(null);
  const [submitError,     setSubmitError]     = useState('');
  const [submitting,      setSubmitting]      = useState(false);
  const [showPreview,     setShowPreview]     = useState(false);

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

  const handleMosqueeSelect = (osmData) => { setSelectedMosquee(osmData); setSubmitError(''); };
  const handleMosqueeClear  = () => { setSelectedMosquee(null); setSubmitError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMosquee) return;
    if (!form.estAnonyme && !form.nomDefunt?.trim()) {
      setSubmitError('Veuillez saisir le nom et prénom du défunt, ou activez "Rester anonyme".');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    const mosqueeId = selectedMosquee.id;
    dispatch(createPriere({
      mosqueeId:        Number(mosqueeId),
      mosqueeNom:       capitalizeFirst(selectedMosquee.nom),
      utilisateurId:    user?.dbId ?? undefined,
      nomDefunt:        form.estAnonyme ? null : form.nomDefunt || null,
      estAnonyme:       form.estAnonyme,
      genre:            form.genre || null,
      dateHeurePriere:  form.dateHeurePriere ? new Date(form.dateHeurePriere).toISOString() : null,
      utcOffsetMinutes: form.dateHeurePriere ? -(new Date(form.dateHeurePriere).getTimezoneOffset()) : 0,
      commentaire:      form.commentaire || null,
      paysEnterrement:  form.paysEnterrement || null,
      villeEnterrement: form.villeEnterrement || null,
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
    paysEnterrement:  form.paysEnterrement,
    villeEnterrement: form.villeEnterrement,
    commentaire:      form.commentaire,
    mosqueeNom:       selectedMosquee?.nom,
    mosqueeAdresse:   selectedMosquee?.adresse,
    dateHeurePriere:  form.dateHeurePriere,
  };

  const canPreview = !!(form.dateHeurePriere && (form.nomDefunt || form.estAnonyme));
  const busy = submitting || createLoading;

  const GENRES = [
    { value: 'homme',  label: 'Homme',  icon: '♂' },
    { value: 'femme',  label: 'Femme',  icon: '♀' },
    { value: 'enfant', label: 'Enfant', icon: '✦' },
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
            <div className="df-card-title">Déclarer une prière janaza</div>
            <div className="df-card-sub">Informez la communauté d'une prière funèbre</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="df-form">

          {/* ── Section : Mosquée ── */}
          <div className="df-section">
            <div className="df-section-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.3 8 13 8 13s8-7.7 8-13a8 8 0 0 0-8-8z"/>
              </svg>
              Mosquée <span className="df-required">*</span>
            </div>
            <MosqueeSearch onSelect={handleMosqueeSelect} onClear={handleMosqueeClear} />
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
              Date et heure <span className="df-required">*</span>
            </div>
            <input className="df-input" type="datetime-local" value={form.dateHeurePriere} onChange={set('dateHeurePriere')} required />
          </div>

          {/* ── Section : Défunt ── */}
          <div className="df-section">
            <div className="df-section-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Défunt(e)
            </div>

            {/* Genre pills */}
            <div className="df-genre-pills">
              {GENRES.map((g) => (
                <label key={g.value} className={`df-genre-pill${form.genre === g.value ? ' active' : ''}`}>
                  <input type="radio" name="genre" value={g.value} checked={form.genre === g.value} onChange={set('genre')} />
                  <span className="df-genre-icon">{g.icon}</span>
                  {g.label}
                </label>
              ))}
            </div>

            {/* Anonyme */}
            <label className="df-checkbox-row">
              <input type="checkbox" checked={form.estAnonyme} onChange={set('estAnonyme')} />
              <span className="df-checkbox-box" />
              <span>Défunt(e) anonyme</span>
            </label>

            {/* Nom */}
            {!form.estAnonyme && (
              <div style={{ marginTop: '0.75rem' }}>
                <label className="df-label">Nom du défunt</label>
                <input className="df-input" type="text" value={form.nomDefunt} onChange={set('nomDefunt')} placeholder="Prénom Nom" />
              </div>
            )}

            {/* Commentaire */}
            <div style={{ marginTop: '0.75rem' }}>
              <label className="df-label">Commentaire <span className="df-opt">(facultatif)</span></label>
              <textarea className="df-input df-textarea" value={form.commentaire} onChange={set('commentaire')} placeholder="Informations supplémentaires…" rows={3} />
            </div>
          </div>

          {/* ── Section : Avis de décès ── */}
          <div className="df-section df-section-avis">
            <div className="df-section-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              Annonce de décès
            </div>

            {/* Toggle années */}
            <div className="toggle-row">
              <div>
                <div className="toggle-label">Années de naissance et de décès</div>
                <div className="toggle-sub">Désactiver si vous n'avez pas cette information</div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={form.showYears} onChange={set('showYears')} />
                <span className="toggle-knob" />
              </label>
            </div>

            {form.showYears && (
              <div className="df-row-2">
                <div>
                  <label className="df-label">Naissance</label>
                  <YearSelect value={form.anneNaissance} onChange={setVal('anneNaissance')} placeholder="Année" />
                </div>
                <div>
                  <label className="df-label">Décès</label>
                  <YearSelect value={form.anneDeces} onChange={setVal('anneDeces')} placeholder="Année" />
                </div>
              </div>
            )}

            <div style={{ marginTop: '0.85rem' }}>
              <label className="df-label">Pays d'enterrement</label>
              <CountrySearch value={form.paysEnterrement} onChange={setVal('paysEnterrement')} />
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <label className="df-label">Ville / lieu <span className="df-opt">(optionnel)</span></label>
              <input className="df-input" type="text" value={form.villeEnterrement} onChange={set('villeEnterrement')} placeholder="Ex : Évry, Aunettes…" />
            </div>

            <button type="button" className="btn-preview-avis" onClick={() => setShowPreview(true)} disabled={!canPreview}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Prévisualiser l'annonce
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
                Déclaration en cours…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
                </svg>
                Déclarer la prière
              </>
            )}
          </button>
        </form>
      </div>

      {showPreview && (
        <PreviewModal data={cardData} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}
