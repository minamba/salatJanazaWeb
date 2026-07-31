import { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { computeUtcOffsetMinutes } from '../../lib/timezoneUtils';
import { searchMosquees } from '../../lib/api/mosqueeApi';

export function toLocalDatetimeInput(utcStr) {
  // On affiche l'heure UTC telle quelle dans le champ datetime-local (pas de conversion locale)
  return new Date(utcStr).toISOString().substring(0, 16);
}

export function toUTCISOString(localStr) {
  // L'utilisateur a saisi une heure "murale" → on la traite comme UTC directement
  return new Date(localStr + 'Z').toISOString();
}

export function normalizeGenre(g) {
  if (!g) return '';
  const lower = g.toLowerCase();
  if (['homme', 'femme', 'enfant'].includes(lower)) return lower;
  return g;
}

export function buildInitialForm(priere) {
  return {
    estAnonyme:        priere.estAnonyme ?? false,
    nomDefunt:         priere.nomDefunt ?? '',
    genre:             normalizeGenre(priere.genre),
    mosqueeId:         priere.mosqueeId ?? '',
    dateHeurePriere:   priere.dateHeurePriere ? toLocalDatetimeInput(priere.dateHeurePriere) : '',
    noYearInfo:        !(priere.anneeNaissance || priere.anneeDeces),
    anneeNaissance:    priere.anneeNaissance ?? '',
    anneeDeces:        priere.anneeDeces ?? '',
    commentaire:       priere.commentaire ?? '',
    paysEnterrement:   priere.paysEnterrement ?? '',
    countryKnown:      priere.paysEnterrement != null,
    villeEnterrement:  priere.villeEnterrement ?? '',
    utcOffsetMinutes:  priere.utcOffsetMinutes ?? 0,
  };
}

export function buildPayload(form) {
  const prayerDate = form.dateHeurePriere ? new Date(form.dateHeurePriere + 'Z') : new Date();
  const utcOffsetMinutes = computeUtcOffsetMinutes(
    form.countryKnown ? form.paysEnterrement : '',
    form.utcOffsetMinutes ?? 0,
    prayerDate,
  );
  return {
    nomDefunt:         form.estAnonyme ? null : (form.nomDefunt || null),
    estAnonyme:        form.estAnonyme,
    genre:             form.genre || null,
    mosqueeId:         form.mosqueeId ? parseInt(form.mosqueeId) : null,
    dateHeurePriere:   form.dateHeurePriere ? toUTCISOString(form.dateHeurePriere) : null,
    anneeNaissance:    (!form.noYearInfo && form.anneeNaissance) ? parseInt(form.anneeNaissance) : null,
    anneeDeces:        (!form.noYearInfo && form.anneeDeces) ? parseInt(form.anneeDeces) : null,
    commentaire:       form.commentaire || null,
    paysEnterrement:   form.countryKnown ? (form.paysEnterrement || null) : null,
    villeEnterrement:  form.villeEnterrement || null,
    utcOffsetMinutes,
  };
}

function MosqueeSearchField({ defaultName, onSelect, onClear }) {
  const [query, setQuery]             = useState(defaultName ?? '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [open, setOpen]               = useState(false);
  const timerRef  = useRef(null);
  const latestRef = useRef('');
  const wrapRef   = useRef(null);

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
          setSuggestions(Array.isArray(res.data) ? res.data : []);
          setOpen(true);
        }
      } catch {
        if (latestRef.current === val) setSuggestions([]);
      } finally {
        if (latestRef.current === val) setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (m) => {
    setQuery(m.nom);
    setSuggestions([]);
    setOpen(false);
    onSelect(m);
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
          placeholder="Rechercher par nom, ville ou code postal…"
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
                <span className="mosque-search-name">{s.nom}</span>
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
            Aucune mosquée trouvée
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditPriereModal({ priere, form, setForm, onClose, onSubmit, submitLabel, isSubmitting, externalError }) {
  const { saving, saveError } = useSelector((s) => s.priereJanaza);
  const busy = isSubmitting !== undefined ? isSubmitting : saving;
  const errorMsg = externalError || saveError;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Modifier la prière #{priere.id}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <form className="auth-form" onSubmit={onSubmit}>
            <div className="form-group form-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={form.estAnonyme}
                  onChange={(e) => setForm((f) => ({ ...f, estAnonyme: e.target.checked }))}
                />
                Défunt(e) anonyme
              </label>
            </div>
            {!form.estAnonyme && (
              <div className="form-group">
                <label>Nom du défunt</label>
                <input
                  type="text"
                  value={form.nomDefunt}
                  onChange={(e) => setForm((f) => ({ ...f, nomDefunt: e.target.value }))}
                />
              </div>
            )}
            <div className="form-group">
              <label>Genre</label>
              <select value={form.genre} onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}>
                <option value="">Non précisé</option>
                <option value="homme">Homme</option>
                <option value="femme">Femme</option>
                <option value="enfant">Enfant</option>
              </select>
            </div>
            <div className="form-group">
              <label>Mosquée</label>
              <MosqueeSearchField
                defaultName={priere.mosqueeNom ?? ''}
                onSelect={(m) => setForm((f) => ({ ...f, mosqueeId: m.id }))}
                onClear={() => setForm((f) => ({ ...f, mosqueeId: '' }))}
              />
            </div>
            <div className="form-group">
              <label>Date et heure *</label>
              <input
                type="datetime-local"
                value={form.dateHeurePriere}
                onChange={(e) => setForm((f) => ({ ...f, dateHeurePriere: e.target.value }))}
                required
              />
            </div>
            <div className="toggle-row" style={{ marginBottom: '0.75rem' }}>
              <div>
                <div className="toggle-label">Années de naissance et de décès</div>
                <div className="toggle-sub">
                  {form.noYearInfo ? 'Aucune information renseignée' : 'Informations disponibles'}
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={!form.noYearInfo}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    noYearInfo: !e.target.checked,
                    anneeNaissance: !e.target.checked ? '' : f.anneeNaissance,
                    anneeDeces: !e.target.checked ? '' : f.anneeDeces,
                  }))}
                />
                <span className="toggle-knob" />
              </label>
            </div>
            {!form.noYearInfo && (
              <div className="form-row">
                <div className="form-group">
                  <label>Année de naissance</label>
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={form.anneeNaissance}
                    onChange={(e) => setForm((f) => ({ ...f, anneeNaissance: e.target.value }))}
                    placeholder="ex : 1950"
                  />
                </div>
                <div className="form-group">
                  <label>Année de décès</label>
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={form.anneeDeces}
                    onChange={(e) => setForm((f) => ({ ...f, anneeDeces: e.target.value }))}
                    placeholder="ex : 2024"
                  />
                </div>
              </div>
            )}
            <div className="form-group">
              <label>Commentaire</label>
              <textarea
                value={form.commentaire}
                onChange={(e) => setForm((f) => ({ ...f, commentaire: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="toggle-row">
              <div>
                <div className="toggle-label">Pays d'enterrement</div>
                <div className="toggle-sub">
                  {form.countryKnown ? "Désactiver si le pays n'est pas connu" : "Le pays ne sera pas affiché dans l'annonce"}
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={form.countryKnown}
                  onChange={(e) => setForm((f) => ({ ...f, countryKnown: e.target.checked }))}
                />
                <span className="toggle-knob" />
              </label>
            </div>
            {form.countryKnown && (
              <div className="form-row">
                <div className="form-group">
                  <label>Pays d'enterrement</label>
                  <input
                    type="text"
                    value={form.paysEnterrement}
                    onChange={(e) => setForm((f) => ({ ...f, paysEnterrement: e.target.value }))}
                    placeholder="France"
                  />
                </div>
                <div className="form-group">
                  <label>Lieu d'enterrement</label>
                  <input
                    type="text"
                    value={form.villeEnterrement}
                    onChange={(e) => setForm((f) => ({ ...f, villeEnterrement: e.target.value }))}
                    placeholder="Paris"
                  />
                </div>
              </div>
            )}
            {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Enregistrement...' : (submitLabel || 'Enregistrer')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
