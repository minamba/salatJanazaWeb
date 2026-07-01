import { useSelector } from 'react-redux';

export function toLocalDatetimeInput(utcStr) {
  const d = new Date(utcStr);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().substring(0, 16);
}

export function toUTCISOString(localStr) {
  return new Date(localStr).toISOString();
}

export function normalizeGenre(g) {
  if (!g) return '';
  const lower = g.toLowerCase();
  if (['homme', 'femme', 'enfant'].includes(lower)) return lower;
  return g;
}

export function buildInitialForm(priere) {
  return {
    estAnonyme:       priere.estAnonyme ?? false,
    nomDefunt:        priere.nomDefunt ?? '',
    genre:            normalizeGenre(priere.genre),
    mosqueeId:        priere.mosqueeId ?? '',
    dateHeurePriere:  priere.dateHeurePriere ? toLocalDatetimeInput(priere.dateHeurePriere) : '',
    noYearInfo:       !(priere.anneeNaissance || priere.anneeDeces),
    anneeNaissance:   priere.anneeNaissance ?? '',
    anneeDeces:       priere.anneeDeces ?? '',
    commentaire:      priere.commentaire ?? '',
    paysEnterrement:  priere.paysEnterrement ?? '',
    villeEnterrement: priere.villeEnterrement ?? '',
  };
}

export function buildPayload(form) {
  return {
    nomDefunt:        form.estAnonyme ? null : (form.nomDefunt || null),
    estAnonyme:       form.estAnonyme,
    genre:            form.genre || null,
    mosqueeId:        form.mosqueeId ? parseInt(form.mosqueeId) : null,
    dateHeurePriere:  form.dateHeurePriere ? toUTCISOString(form.dateHeurePriere) : null,
    anneeNaissance:   (!form.noYearInfo && form.anneeNaissance) ? parseInt(form.anneeNaissance) : null,
    anneeDeces:       (!form.noYearInfo && form.anneeDeces) ? parseInt(form.anneeDeces) : null,
    commentaire:      form.commentaire || null,
    paysEnterrement:  form.paysEnterrement || null,
    villeEnterrement: form.villeEnterrement || null,
  };
}

export default function EditPriereModal({ priere, form, setForm, onClose, onSubmit }) {
  const { list: mosquees } = useSelector((s) => s.mosquee);
  const { saving, saveError } = useSelector((s) => s.priereJanaza);

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
              <select value={form.mosqueeId} onChange={(e) => setForm((f) => ({ ...f, mosqueeId: e.target.value }))}>
                <option value="">— Sélectionner une mosquée —</option>
                {mosquees.map((m) => (
                  <option key={m.id} value={m.id}>{m.nom}</option>
                ))}
              </select>
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
            {saveError && <div className="alert alert-error">{saveError}</div>}
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
