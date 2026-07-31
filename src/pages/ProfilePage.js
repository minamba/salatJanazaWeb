import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { UPDATE_PROFILE_SUCCESS } from '../lib/actions/authActions';
import { getUtilisateurById, updateUtilisateur } from '../lib/api/utilisateurApi';

async function geocodeAddress(address) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'QabrApp/1.0' } }
    );
    const data = await res.json();
    if (data?.[0]?.lat) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {}
  try {
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`);
    const data = await res.json();
    const c = data?.features?.[0]?.geometry?.coordinates;
    if (c) return { lat: c[1], lon: c[0] };
  } catch {}
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1`);
    const data = await res.json();
    const c = data?.features?.[0]?.geometry?.coordinates;
    if (c) return { lat: c[1], lon: c[0] };
  } catch {}
  return null;
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);

  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const debounceRef = useRef(null);
  const adresseInputRef = useRef(null);

  useEffect(() => {
    if (!user?.dbId) { setLoadingProfile(false); return; }
    getUtilisateurById(user.dbId)
      .then((res) => {
        const d = res.data;
        setPrenom(d.prenom ?? user?.prenom ?? '');
        setNom(d.nom ?? user?.nom ?? '');
        setTelephone(d.telephone ?? '');
        setAdresse(d.adresseDomicile ?? '');
        if (d.latitudeDomicile && d.longitudeDomicile)
          setSelectedCoords({ lat: d.latitudeDomicile, lon: d.longitudeDomicile });
      })
      .catch(() => {
        setPrenom(user?.prenom ?? '');
        setNom(user?.nom ?? '');
      })
      .finally(() => setLoadingProfile(false));
  }, [user?.dbId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (adresse.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(adresse)}&format=json&limit=5`,
          { headers: { 'User-Agent': 'QabrApp/1.0', 'Accept-Language': 'fr' } }
        );
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 400);
  }, [adresse]);

  function handleSelectSuggestion(item) {
    setAdresse(item.display_name);
    setSelectedCoords({ lat: parseFloat(item.lat), lon: parseFloat(item.lon) });
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function handleAdresseChange(e) {
    setAdresse(e.target.value);
    setSelectedCoords(null);
  }

  function handleClearAddress() {
    setAdresse('');
    setSelectedCoords(null);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!user?.dbId) return;
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    let coords = selectedCoords;
    if (adresse.trim() && !coords) {
      coords = await geocodeAddress(adresse.trim());
      if (!coords) {
        setSaveError(t('profile.address_not_found'));
        setSaving(false);
        return;
      }
      setSelectedCoords(coords);
    }

    const payload = {
      prenom: prenom.trim(),
      nom: nom.trim(),
      telephone: telephone.trim(),
      adresseDomicile: adresse.trim() || null,
      latitudeDomicile: coords?.lat ?? null,
      longitudeDomicile: coords?.lon ?? null,
    };

    try {
      await updateUtilisateur(user.dbId, payload);
      dispatch({ type: UPDATE_PROFILE_SUCCESS, payload: { prenom: payload.prenom, nom: payload.nom } });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError(t('profile.save_error'));
    } finally {
      setSaving(false);
    }
  }

  if (loadingProfile) {
    return <p className="text-muted">{t('dashboard.loading')}</p>;
  }

  return (
    <div className="profile-page">
      <h2>{t('profile.title')}</h2>

      <form className="profile-form" onSubmit={handleSave}>
        <section className="profile-section">
          <h3 className="profile-section-title">{t('profile.personal_info')}</h3>

          <div className="profile-field-row">
            <div className="profile-field">
              <label className="profile-label">{t('profile.firstname')}</label>
              <input
                className="profile-input"
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div className="profile-field">
              <label className="profile-label">{t('profile.lastname')}</label>
              <input
                className="profile-input"
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="profile-field">
            <label className="profile-label">
              {t('profile.phone')} <span className="profile-optional">{t('profile.optional')}</span>
            </label>
            <input
              className="profile-input"
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder={t('profile.phone_placeholder')}
              autoComplete="tel"
            />
          </div>

          <div className="profile-field">
            <label className="profile-label">{t('profile.email')}</label>
            <input
              className="profile-input profile-input--readonly"
              type="email"
              value={user?.email ?? ''}
              readOnly
            />
            <span className="profile-hint">{t('profile.email_hint')}</span>
          </div>
        </section>

        <section className="profile-section">
          <h3 className="profile-section-title">{t('profile.home_address')}</h3>
          <p className="profile-hint" style={{ marginBottom: '0.75rem' }}>{t('profile.home_address_hint')}</p>

          <div className="profile-field profile-address-wrap">
            <label className="profile-label">{t('profile.address_label')}</label>
            <div className="profile-address-input-wrap">
              <input
                ref={adresseInputRef}
                className={`profile-input${selectedCoords ? ' profile-input--confirmed' : ''}`}
                type="text"
                value={adresse}
                onChange={handleAdresseChange}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder={t('profile.address_placeholder')}
                autoComplete="off"
              />
              {adresse && (
                <button type="button" className="profile-addr-clear" onClick={handleClearAddress} title={t('profile.address_clear')}>
                  ✕
                </button>
              )}
            </div>
            {selectedCoords && (
              <span className="profile-addr-confirmed">✓ {t('declare.add_mosque_addr_confirmed')}</span>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="profile-suggestions">
                {suggestions.map((item, i) => (
                  <li key={i} onMouseDown={() => handleSelectSuggestion(item)}>
                    {item.display_name}
                  </li>
                ))}
              </ul>
            )}
            <span className="profile-hint">{t('profile.address_autocomplete_hint')}</span>
          </div>
        </section>

        {saveError && <p className="profile-error">{saveError}</p>}
        {saveSuccess && <p className="profile-success">{t('profile.save_success')}</p>}

        <div className="profile-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? t('profile.saving') : t('profile.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
