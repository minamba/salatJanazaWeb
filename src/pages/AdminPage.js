import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMosquees, deleteMosquee, createMosquee, updateMosquee, fetchPendingMosquees, validerMosquee as validerMosqueeReq, refuserMosquee as refuserMosqueeReq } from '../lib/actions/mosqueeActions';
import { fetchPrieres, deletePriere, updatePriere, fetchPrieresEnAttente } from '../lib/actions/priereJanazaActions';
import {
  fetchUtilisateurs,
  createUtilisateur,
  updateUtilisateur,
  deleteUtilisateur,
} from '../lib/actions/utilisateurActions';
import { apiClient } from '../lib/api/axiosConfig';

// ─── Modal shell ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ─── Search bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="admin-search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button className="admin-search-clear" onClick={() => onChange('')} aria-label="Effacer">✕</button>
      )}
    </div>
  );
}

// ─── Nominatim geocoder ───────────────────────────────────────────────────────
async function geocodeAdresse(adresse) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(adresse)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
  const data = await res.json();
  if (!data.length) throw new Error('Adresse introuvable. Précisez la ville ou le pays.');
  return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
}

function normalize(str) {
  return (str ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ─── Datetime helpers ─────────────────────────────────────────────────────────
function toLocalDatetimeInput(utcStr) {
  return new Date(utcStr).toISOString().substring(0, 16);
}

function toUTCISOString(localStr) {
  return new Date(localStr + 'Z').toISOString();
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const dispatch = useDispatch();
  const { list: mosquees, pendingList: pendingMosquees, loading: mLoading, pendingLoading: mPendingLoading } = useSelector((s) => s.mosquee);
  const { list: prieres, pendingList: prieresEnAttente, pendingLoading: pPendingLoading, loading: pLoading, saving: pSaving } = useSelector((s) => s.priereJanaza);
  const { list: utilisateurs, loading: uLoading, saving: uSaving, saveError: uSaveError } = useSelector((s) => s.utilisateur);

  const [tab, setTab] = useState('prieres');
  const [prieresSubTab, setPrieresSubTab] = useState('toutes');
  const [mosqueeSubTab, setMosqueeSubTab] = useState('enregistrees');
  const [selectedPending, setSelectedPending] = useState(new Set());
  const [importTxtContent, setImportTxtContent] = useState('');
  const [importTxtLoading, setImportTxtLoading] = useState(false);
  const [importTxtResult, setImportTxtResult] = useState(null);

  // ── Toast notification ────────────────────────────────────────────────────────
  const [notif, setNotif] = useState(null);
  const notifTimer = useRef(null);
  const showNotif = useCallback((message, type = 'success') => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setNotif({ message, type });
    notifTimer.current = setTimeout(() => setNotif(null), 4500);
  }, []);

  // ── Search states ────────────────────────────────────────────────────────────
  const [searchPriereText, setSearchPriereText] = useState('');
  const [searchPriereMosquee, setSearchPriereMosquee] = useState('');
  const [searchPriereDate, setSearchPriereDate] = useState('');
  const [searchPriereCreationDate, setSearchPriereCreationDate] = useState('');
  const [searchMosquee, setSearchMosquee] = useState('');
  const [searchUser, setSearchUser] = useState('');

  // ── Mosque form ─────────────────────────────────────────────────────────────
  const [mosqueeForm, setMosqueeForm] = useState({ nom: '', adresse: '' });
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);

  // ── Mosque edit modal ────────────────────────────────────────────────────────
  const [editMosquee, setEditMosquee] = useState(null);
  const [editMosqueeForm, setEditMosqueeForm] = useState({ nom: '', adresse: '', latitude: '', longitude: '' });
  const [editMosqueeGeoLoading, setEditMosqueeGeoLoading] = useState(false);
  const [editMosqueeGeoError, setEditMosqueeGeoError] = useState(null);

  // ── Prayer edit modal ────────────────────────────────────────────────────────
  const [editPriere, setEditPriere] = useState(null);
  const [priereForm, setPriereForm] = useState({});

  // ── User create/edit modals ──────────────────────────────────────────────────
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [createUserForm, setCreateUserForm] = useState({ email: '', password: '', prenom: '', nom: '', role: 'User', telephone: '' });
  const [editUserForm, setEditUserForm] = useState({});

  // ── Import permission states ──────────────────────────────────────────────────
  const [importPermSearch, setImportPermSearch] = useState('');
  const [importPermLoading, setImportPermLoading] = useState(false);
  const [importPermUsers, setImportPermUsers] = useState(null); // null = use redux, array = local override

  // ── Normalisation mosquées sans nom ──────────────────────────────────────────
  const [normLoading, setNormLoading] = useState(false);
  const [normResult, setNormResult] = useState(null);

  // ── Déclarations — sélection multiple + filtre période ───────────────────────
  const [declSelectMode, setDeclSelectMode] = useState(false);
  const [selectedDeclIds, setSelectedDeclIds] = useState(new Set());
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    dispatch(fetchMosquees());
    dispatch(fetchPrieres());
    dispatch(fetchUtilisateurs());
  }, [dispatch]);

  useEffect(() => {
    if (tab === 'mosquees' && mosqueeSubTab === 'enattente') {
      dispatch(fetchPendingMosquees());
      setSelectedPending(new Set());
    }
  }, [tab, mosqueeSubTab, dispatch]);

  useEffect(() => {
    if (tab === 'prieres' && prieresSubTab === 'enattente') {
      dispatch(fetchPrieresEnAttente());
    }
  }, [tab, prieresSubTab, dispatch]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getDeclarantName = useCallback((utilisateurId) => {
    if (!utilisateurId) return '—';
    const u = utilisateurs.find((u) => u.id === utilisateurId);
    if (!u) return `#${utilisateurId}`;
    return `${u.prenom ?? ''} ${u.nom ?? ''}`.trim() || `#${utilisateurId}`;
  }, [utilisateurs]);

  const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }) : '—';
  const fmtDateOnly = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : '—';
  const toLocalISODate = (d) => d.toISOString().slice(0, 10);

  // ── Filtered lists ───────────────────────────────────────────────────────────
  const filteredPrieres = useMemo(() => {
    return prieres.filter((p) => {
      if (searchPriereText) {
        const q = normalize(searchPriereText);
        const defunt = normalize(p.estAnonyme ? 'anonyme' : p.nomDefunt);
        const declarant = normalize(getDeclarantName(p.utilisateurId));
        if (!defunt.includes(q) && !declarant.includes(q)) return false;
      }
      if (searchPriereMosquee) {
        if (!normalize(p.mosqueeNom).includes(normalize(searchPriereMosquee))) return false;
      }
      if (searchPriereDate) {
        const priereDay = p.dateHeurePriere ? toLocalISODate(new Date(p.dateHeurePriere)) : '';
        if (priereDay !== searchPriereDate) return false;
      }
      if (searchPriereCreationDate) {
        const creationDay = p.dateCreation ? toLocalISODate(new Date(p.dateCreation)) : '';
        if (creationDay !== searchPriereCreationDate) return false;
      }
      if (filterDateFrom) {
        const priereDay = p.dateHeurePriere ? toLocalISODate(new Date(p.dateHeurePriere)) : '';
        if (priereDay < filterDateFrom) return false;
      }
      if (filterDateTo) {
        const priereDay = p.dateHeurePriere ? toLocalISODate(new Date(p.dateHeurePriere)) : '';
        if (priereDay > filterDateTo) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation));
  }, [prieres, searchPriereText, searchPriereMosquee, searchPriereDate, searchPriereCreationDate, filterDateFrom, filterDateTo, getDeclarantName]);

  const filteredMosquees = useMemo(() => {
    if (!searchMosquee) return mosquees;
    const q = normalize(searchMosquee);
    return mosquees.filter((m) =>
      normalize(m.nom).includes(q) || normalize(m.adresse).includes(q)
    );
  }, [mosquees, searchMosquee]);

  const filteredUsers = useMemo(() => {
    if (!searchUser) return utilisateurs;
    const q = normalize(searchUser);
    return utilisateurs.filter((u) =>
      normalize(u.prenom).includes(q) ||
      normalize(u.nom).includes(q) ||
      normalize(u.email).includes(q)
    );
  }, [utilisateurs, searchUser]);

  const baseImportUsers = importPermUsers ?? utilisateurs ?? [];
  const filteredImportPermUsers = useMemo(() => {
    const nonAdmins = baseImportUsers.filter((u) => u._role !== 'Admin' && u._role !== 'SuperAdmin');
    if (!importPermSearch) return nonAdmins;
    const q = normalize(importPermSearch);
    return nonAdmins.filter((u) =>
      normalize(u.prenom).includes(q) ||
      normalize(u.nom).includes(q) ||
      normalize(u.email).includes(q)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseImportUsers, importPermSearch]);

  // ── Mosque handlers ──────────────────────────────────────────────────────────
  const handleAddMosquee = async (e) => {
    e.preventDefault();
    setGeoError(null);
    setGeoLoading(true);
    try {
      const { latitude, longitude } = await geocodeAdresse(mosqueeForm.adresse);
      dispatch(createMosquee({ nom: mosqueeForm.nom, adresse: mosqueeForm.adresse, latitude, longitude }));
      setMosqueeForm({ nom: '', adresse: '' });
    } catch (err) {
      setGeoError(err.message);
    } finally {
      setGeoLoading(false);
    }
  };

  // ── Mosque edit handlers ─────────────────────────────────────────────────────
  const openEditMosquee = (m) => {
    setEditMosquee(m);
    setEditMosqueeForm({ nom: m.nom ?? '', adresse: m.adresse ?? '', latitude: String(m.latitude ?? ''), longitude: String(m.longitude ?? '') });
    setEditMosqueeGeoError(null);
  };

  const handleRegeocodeAdresse = async () => {
    setEditMosqueeGeoError(null);
    setEditMosqueeGeoLoading(true);
    try {
      const { latitude, longitude } = await geocodeAdresse(editMosqueeForm.adresse);
      setEditMosqueeForm((f) => ({ ...f, latitude: String(latitude), longitude: String(longitude) }));
    } catch (err) {
      setEditMosqueeGeoError(err.message);
    } finally {
      setEditMosqueeGeoLoading(false);
    }
  };

  const handleSaveMosquee = (e) => {
    e.preventDefault();
    dispatch(updateMosquee(editMosquee.id, {
      nom: editMosqueeForm.nom,
      adresse: editMosqueeForm.adresse || null,
      latitude: parseFloat(editMosqueeForm.latitude),
      longitude: parseFloat(editMosqueeForm.longitude),
    }));
    setEditMosquee(null);
  };

  // ── Prayer handlers ──────────────────────────────────────────────────────────
  const normalizeGenre = (g) => {
    if (!g) return '';
    const lower = g.toLowerCase();
    if (lower === 'homme' || lower === 'femme' || lower === 'enfant') return lower;
    return g;
  };

  const openEditPriere = (p) => {
    setEditPriere(p);
    setPriereForm({
      mosqueeId:        p.mosqueeId ?? '',
      nomDefunt:        p.nomDefunt ?? '',
      estAnonyme:       p.estAnonyme,
      genre:            normalizeGenre(p.genre),
      dateHeurePriere:  p.dateHeurePriere ? toLocalDatetimeInput(p.dateHeurePriere) : '',
      noYearInfo:       !(p.anneeNaissance || p.anneeDeces),
      anneeNaissance:   p.anneeNaissance ?? '',
      anneeDeces:       p.anneeDeces ?? '',
      commentaire:      p.commentaire ?? '',
      paysEnterrement:  p.paysEnterrement ?? '',
      villeEnterrement: p.villeEnterrement ?? '',
    });
  };

  const handleSavePriere = (e) => {
    e.preventDefault();
    dispatch(updatePriere(editPriere.id, {
      mosqueeId:        priereForm.mosqueeId ? parseInt(priereForm.mosqueeId) : editPriere.mosqueeId,
      nomDefunt:        priereForm.estAnonyme ? null : (priereForm.nomDefunt || null),
      estAnonyme:       priereForm.estAnonyme,
      genre:            priereForm.genre || null,
      dateHeurePriere:  priereForm.dateHeurePriere ? toUTCISOString(priereForm.dateHeurePriere) : priereForm.dateHeurePriere,
      anneeNaissance:   (!priereForm.noYearInfo && priereForm.anneeNaissance) ? parseInt(priereForm.anneeNaissance) : null,
      anneeDeces:       (!priereForm.noYearInfo && priereForm.anneeDeces) ? parseInt(priereForm.anneeDeces) : null,
      commentaire:      priereForm.commentaire || null,
      paysEnterrement:  priereForm.paysEnterrement || null,
      villeEnterrement: priereForm.villeEnterrement || null,
    }));
    setEditPriere(null);
  };

  // ── User handlers ─────────────────────────────────────────────────────────────
  const handleCreateUser = (e) => {
    e.preventDefault();
    dispatch(createUtilisateur({
      email: createUserForm.email,
      password: createUserForm.password,
      prenom: createUserForm.prenom,
      nom: createUserForm.nom,
      role: createUserForm.role,
      telephone: createUserForm.telephone || null,
    }));
    setShowCreateUser(false);
    setCreateUserForm({ email: '', password: '', prenom: '', nom: '', role: 'User', telephone: '' });
  };

  const openEditUser = (u) => {
    setEditUser(u);
    setEditUserForm({ prenom: u.prenom ?? '', nom: u.nom ?? '', telephone: u.telephone ?? '' });
  };

  const handleImportTxt = async () => {
    if (!importTxtContent.trim()) return;
    setImportTxtLoading(true);
    setImportTxtResult(null);
    try {
      const API_URL = process.env.REACT_APP_API_URL ?? '';
      const res = await fetch(`${API_URL}/api/admin/textimport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importTxtContent }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Erreur ${res.status}`);
      }
      const data = await res.json();
      setImportTxtResult({ url: data.url, filename: data.filename });
    } catch (err) {
      setImportTxtResult({ error: err.message ?? 'Erreur lors de l\'envoi' });
    } finally {
      setImportTxtLoading(false);
    }
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    dispatch(updateUtilisateur(editUser.id, {
      prenom: editUserForm.prenom || null,
      nom: editUserForm.nom || null,
      telephone: editUserForm.telephone || null,
    }));
    setEditUser(null);
  };

  // ── Pending mosque handlers ───────────────────────────────────────────────────
  const toggleSelectPending = (id) => {
    setSelectedPending((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPending = () => {
    if (selectedPending.size === pendingMosquees.length && pendingMosquees.length > 0) {
      setSelectedPending(new Set());
    } else {
      setSelectedPending(new Set(pendingMosquees.map((m) => m.id)));
    }
  };

  const handleValiderPending = (id) => {
    const m = pendingMosquees.find((x) => x.id === id);
    if (!window.confirm(`Valider la mosquée "${m?.nom ?? 'cette mosquée'}" ?`)) return;
    dispatch(validerMosqueeReq(id));
    showNotif(`✓ La mosquée "${m?.nom ?? id}" a été validée et ajoutée à la liste.`);
  };

  const handleRefuserPending = (id) => {
    const m = pendingMosquees.find((x) => x.id === id);
    if (!window.confirm(`Refuser et supprimer "${m?.nom ?? 'cette mosquée'}" ?`)) return;
    dispatch(refuserMosqueeReq(id));
    showNotif(`La mosquée "${m?.nom ?? id}" a été refusée et supprimée.`, 'error');
  };

  const handleValiderSelection = () => {
    if (!selectedPending.size) return;
    const count = selectedPending.size;
    if (!window.confirm(`Valider ${count} mosquée(s) sélectionnée(s) ?`)) return;
    selectedPending.forEach((id) => dispatch(validerMosqueeReq(id)));
    setSelectedPending(new Set());
    showNotif(`✓ Les ${count} mosquées sélectionnées ont été validées avec succès.`);
  };

  const handleRefuserSelection = () => {
    if (!selectedPending.size) return;
    const count = selectedPending.size;
    if (!window.confirm(`Refuser et supprimer ${count} mosquée(s) sélectionnée(s) ?`)) return;
    selectedPending.forEach((id) => dispatch(refuserMosqueeReq(id)));
    setSelectedPending(new Set());
    showNotif(`Les ${count} mosquées sélectionnées ont été refusées et supprimées.`, 'error');
  };

  const handleValiderTous = () => {
    if (!pendingMosquees.length) return;
    const count = pendingMosquees.length;
    if (!window.confirm(`Valider toutes les ${count} mosquée(s) en attente ?`)) return;
    pendingMosquees.forEach((m) => dispatch(validerMosqueeReq(m.id)));
    setSelectedPending(new Set());
    showNotif(`✓ Toutes les ${count} mosquées en attente ont été validées avec succès.`);
  };

  const handleRefuserTous = () => {
    if (!pendingMosquees.length) return;
    const count = pendingMosquees.length;
    if (!window.confirm(`Refuser et supprimer toutes les ${count} mosquée(s) en attente ?`)) return;
    pendingMosquees.forEach((m) => dispatch(refuserMosqueeReq(m.id)));
    setSelectedPending(new Set());
    showNotif(`Toutes les ${count} mosquées en attente ont été refusées et supprimées.`, 'error');
  };

  // ── Import permission handlers ────────────────────────────────────────────────
  const handleToggleImportPerm = async (userId, newValue) => {
    setImportPermUsers((prev) => {
      const base = prev ?? utilisateurs;
      return base.map((u) => u.id === userId ? { ...u, canImportFlyer: newValue } : u);
    });
    try {
      const res = await apiClient.put(`/api/utilisateur/${userId}/import-flyer`, { canImportFlyer: newValue });
      console.log('[Admin] import-flyer updated →', res.data?.canImportFlyer, 'for user', userId);
      showNotif(newValue ? 'Permission d\'import activée.' : 'Permission d\'import retirée.', 'success');
    } catch (err) {
      console.error('[Admin] import-flyer error:', err?.response?.status, err?.response?.data);
      setImportPermUsers((prev) => {
        const base = prev ?? utilisateurs;
        return base.map((u) => u.id === userId ? { ...u, canImportFlyer: !newValue } : u);
      });
      showNotif(err?.response?.data?.error ?? 'Impossible de modifier la permission.', 'error');
    }
  };

  const handleAutoriserTousImport = async () => {
    if (!window.confirm(`Autoriser tous les utilisateurs à importer des flyers ?`)) return;
    setImportPermLoading(true);
    try {
      await apiClient.put('/api/utilisateur/import-flyer/bulk', { canImportFlyer: true });
      setImportPermUsers((prev) => {
        const base = prev ?? utilisateurs;
        return base.map((u) => u._role === 'Admin' || u._role === 'SuperAdmin' ? u : { ...u, canImportFlyer: true });
      });
      showNotif('✓ Tous les utilisateurs ont été autorisés à importer.');
    } catch {
      showNotif('Impossible de modifier les permissions.', 'error');
    } finally {
      setImportPermLoading(false);
    }
  };

  const handleRefuserTousImport = async () => {
    if (!window.confirm(`Révoquer les droits d'import de tous les utilisateurs ?`)) return;
    setImportPermLoading(true);
    try {
      await apiClient.put('/api/utilisateur/import-flyer/bulk', { canImportFlyer: false });
      setImportPermUsers((prev) => {
        const base = prev ?? utilisateurs;
        return base.map((u) => u._role === 'Admin' || u._role === 'SuperAdmin' ? u : { ...u, canImportFlyer: false });
      });
      showNotif('Les droits d\'import ont été révoqués pour tous les utilisateurs.', 'error');
    } catch {
      showNotif('Impossible de modifier les permissions.', 'error');
    } finally {
      setImportPermLoading(false);
    }
  };

  const toggleDeclWebSelect = (id) => {
    setSelectedDeclIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllDeclWeb = () => {
    if (selectedDeclIds.size === filteredPrieres.length && filteredPrieres.length > 0) {
      setSelectedDeclIds(new Set());
    } else {
      setSelectedDeclIds(new Set(filteredPrieres.map((p) => p.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedDeclIds.size) return;
    const count = selectedDeclIds.size;
    if (!window.confirm(`Supprimer ${count} prière(s) sélectionnée(s) ?`)) return;
    try {
      await Promise.all([...selectedDeclIds].map((id) => dispatch(deletePriere(id))));
      setSelectedDeclIds(new Set());
      setDeclSelectMode(false);
      showNotif(`✓ ${count} prière(s) supprimée(s).`);
    } catch {
      showNotif('Erreur lors de la suppression.', 'error');
    }
  };

  const handleDeleteByDateRange = async () => {
    if (!filteredPrieres.length) return;
    const count = filteredPrieres.length;
    if (!window.confirm(`Supprimer les ${count} prière(s) correspondant aux filtres actuels ?`)) return;
    try {
      await Promise.all(filteredPrieres.map((p) => dispatch(deletePriere(p.id))));
      setFilterDateFrom('');
      setFilterDateTo('');
      showNotif(`✓ ${count} prière(s) supprimée(s).`);
    } catch {
      showNotif('Erreur lors de la suppression.', 'error');
    }
  };

  const handleNormaliserSansNom = async () => {
    if (!window.confirm('Renommer toutes les mosquées avec un nom générique ("Mosquée", "mosquee", etc.) d\'après leur ville, et supprimer celles sans adresse valide ?')) return;
    setNormLoading(true);
    setNormResult(null);
    try {
      const { data } = await apiClient.post('/api/mosquee/normaliser-sans-nom');
      setNormResult(data);
      dispatch(fetchMosquees());
      showNotif(`Normalisé : ${data.renommes?.length ?? 0} renommées, ${data.supprimes?.length ?? 0} supprimées, ${data.ignores?.length ?? 0} ignorées.`);
    } catch {
      showNotif('Erreur lors de la normalisation.', 'error');
    } finally {
      setNormLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="page-header">
        <div className="container">
          <h1>Administration</h1>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1rem' }}>
        {/* Tabs */}
        <div className="tab-buttons">
          <button className={`btn ${tab === 'prieres' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('prieres')}>
            Prières ({prieres.length})
          </button>
          <button className={`btn ${tab === 'mosquees' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('mosquees')}>
            Mosquées ({mosquees.length})
          </button>
          <button className={`btn ${tab === 'utilisateurs' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('utilisateurs')}>
            Utilisateurs ({utilisateurs.length})
          </button>
          <button className={`btn ${tab === 'importation' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('importation')}>
            Importation
          </button>
        </div>

        {/* ── PRIERES ── */}
        {tab === 'prieres' && (
          <div>
            <div className="tab-buttons" style={{ marginBottom: '1.5rem' }}>
              <button
                className={`btn ${prieresSubTab === 'toutes' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setPrieresSubTab('toutes')}
              >
                Toutes ({prieres.length})
              </button>
              <button
                className={`btn ${prieresSubTab === 'enattente' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setPrieresSubTab('enattente')}
              >
                En attente {prieresEnAttente.length > 0 ? `(${prieresEnAttente.length})` : ''}
              </button>
              <button
                className={`btn ${prieresSubTab === 'importtxt' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setPrieresSubTab('importtxt'); setImportTxtResult(null); }}
              >
                ☁ Import TXT
              </button>
            </div>

          {prieresSubTab === 'toutes' && <div className="admin-table-wrap">
            <h2>Gestion des prières</h2>

            <div className="admin-filters">
              <div className="admin-search-bar">
                <SearchBar
                  value={searchPriereText}
                  onChange={setSearchPriereText}
                  placeholder="Nom du défunt ou déclarant…"
                />
                <SearchBar
                  value={searchPriereMosquee}
                  onChange={setSearchPriereMosquee}
                  placeholder="Mosquée…"
                />
              </div>
              <div className="admin-search-bar">
                <label className="admin-date-filter">
                  <span>Date de prière</span>
                  <div className="admin-search admin-search-date">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <input type="date" value={searchPriereDate} onChange={(e) => setSearchPriereDate(e.target.value)} />
                    {searchPriereDate && <button className="admin-search-clear" onClick={() => setSearchPriereDate('')}>✕</button>}
                  </div>
                </label>
                <label className="admin-date-filter">
                  <span>Date de création</span>
                  <div className="admin-search admin-search-date">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <input type="date" value={searchPriereCreationDate} onChange={(e) => setSearchPriereCreationDate(e.target.value)} />
                    {searchPriereCreationDate && <button className="admin-search-clear" onClick={() => setSearchPriereCreationDate('')}>✕</button>}
                  </div>
                </label>
              </div>
              {/* Filtre période + actions bulk */}
              <div className="admin-search-bar" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label className="admin-date-filter">
                  <span>Période — du</span>
                  <div className="admin-search admin-search-date">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
                    {filterDateFrom && <button className="admin-search-clear" onClick={() => setFilterDateFrom('')}>✕</button>}
                  </div>
                </label>
                <label className="admin-date-filter">
                  <span>au</span>
                  <div className="admin-search admin-search-date">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
                    {filterDateTo && <button className="admin-search-clear" onClick={() => setFilterDateTo('')}>✕</button>}
                  </div>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                  <button
                    className={`btn ${declSelectMode ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => { setDeclSelectMode((s) => !s); setSelectedDeclIds(new Set()); }}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {declSelectMode ? '✕ Annuler' : '☑ Sélectionner'}
                  </button>
                  {declSelectMode && selectedDeclIds.size > 0 && (
                    <button className="btn" style={{ background: 'var(--error, #dc2626)', color: '#fff', whiteSpace: 'nowrap' }} onClick={handleDeleteSelected}>
                      🗑 Supprimer ({selectedDeclIds.size})
                    </button>
                  )}
                  {(filterDateFrom || filterDateTo) && filteredPrieres.length > 0 && !declSelectMode && (
                    <button className="btn" style={{ background: 'var(--error, #dc2626)', color: '#fff', whiteSpace: 'nowrap' }} onClick={handleDeleteByDateRange}>
                      🗑 Supprimer les {filteredPrieres.length} filtrée(s)
                    </button>
                  )}
                </div>
              </div>
            </div>

            <p className="admin-count">
              {filteredPrieres.length} résultat{filteredPrieres.length !== 1 ? 's' : ''}
              {filteredPrieres.length !== prieres.length && ` sur ${prieres.length}`}
            </p>

            {pLoading && <p className="text-muted">Chargement...</p>}
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    {declSelectMode && (
                      <th style={{ width: 36 }}>
                        <input
                          type="checkbox"
                          checked={selectedDeclIds.size === filteredPrieres.length && filteredPrieres.length > 0}
                          onChange={toggleSelectAllDeclWeb}
                          title="Tout sélectionner"
                        />
                      </th>
                    )}
                    <th>ID</th>
                    <th>Défunt</th>
                    <th>Genre</th>
                    <th>Mosquée</th>
                    <th>Enterrement</th>
                    <th>Date prière</th>
                    <th>Déclarant</th>
                    <th>Créé le</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrieres.map((p) => (
                    <tr key={p.id} style={selectedDeclIds.has(p.id) ? { background: 'var(--primary-dim, rgba(74,122,78,0.10))' } : undefined}>
                      {declSelectMode && (
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedDeclIds.has(p.id)}
                            onChange={() => toggleDeclWebSelect(p.id)}
                          />
                        </td>
                      )}
                      <td>{p.id}</td>
                      <td>{p.estAnonyme ? <em>Anonyme</em> : (p.nomDefunt ?? '—')}</td>
                      <td>{p.genre ?? '—'}</td>
                      <td>{p.mosqueeNom ?? '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {p.villeEnterrement || p.paysEnterrement
                          ? [p.villeEnterrement, p.paysEnterrement].filter(Boolean).join(', ')
                          : '—'}
                      </td>
                      <td>{fmtDate(p.dateHeurePriere)}</td>
                      <td>{getDeclarantName(p.utilisateurId)}</td>
                      <td>{fmtDateOnly(p.dateCreation)}</td>
                      <td><span className={`badge badge-${p.statut?.toLowerCase()}`}>{p.statut}</span></td>
                      <td className="admin-actions">
                        <button className="btn-icon btn-icon-edit" title="Modifier" onClick={() => openEditPriere(p)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn-icon btn-icon-delete" title="Supprimer" onClick={() => window.confirm('Supprimer cette prière ?') && dispatch(deletePriere(p.id))}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPrieres.length === 0 && (
                    <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>Aucun résultat</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>}

          {prieresSubTab === 'importtxt' && (
            <div className="admin-table-wrap" style={{ maxWidth: 720 }}>
              <h2>Import TXT — Prières funéraires</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Collez le texte des prières funéraires ci-dessous (emojis, texte arabe inclus). Le fichier sera sauvegardé tel quel sur Google Drive.
              </p>
              <textarea
                style={{
                  width: '100%', minHeight: 320, padding: '0.75rem', fontFamily: 'inherit',
                  fontSize: '0.9rem', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface)', color: 'var(--text)', resize: 'vertical',
                  boxSizing: 'border-box', marginBottom: '0.75rem', lineHeight: 1.6,
                }}
                value={importTxtContent}
                onChange={(e) => setImportTxtContent(e.target.value)}
                placeholder={"🥀 PRIÈRES FUNÉRAIRES 🥀\n\n☪ MARDI 07 JUILLET 2026 ☪\n\n..."}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleImportTxt}
                  disabled={!importTxtContent.trim() || importTxtLoading}
                  style={{ opacity: (!importTxtContent.trim() || importTxtLoading) ? 0.6 : 1 }}
                >
                  {importTxtLoading ? 'Envoi en cours...' : '☁ Envoyer sur Drive'}
                </button>
                {importTxtContent.trim() && (
                  <button className="btn btn-outline" onClick={() => { setImportTxtContent(''); setImportTxtResult(null); }}>
                    Effacer
                  </button>
                )}
              </div>
              {importTxtResult && !importTxtResult.error && (
                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(74,122,78,0.10)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--success, #4a7a4e)' }}>Fichier sauvegardé sur Google Drive</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {importTxtResult.filename} —{' '}
                      <a href={importTxtResult.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                        Voir le fichier
                      </a>
                    </div>
                  </div>
                </div>
              )}
              {importTxtResult?.error && (
                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(220,38,38,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>❌</span>
                  <span style={{ color: 'var(--error, #dc2626)', fontWeight: 600 }}>{importTxtResult.error}</span>
                </div>
              )}
            </div>
          )}

          {prieresSubTab === 'enattente' && (
            <div className="admin-table-wrap">
              <h2>Prières en attente de validation du lieu</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                Ces déclarations sont en attente car le lieu de prière associé n'a pas encore été validé. Validez le lieu dans l'onglet <strong>Mosquées → En attente</strong> pour les publier automatiquement.
              </p>
              {pPendingLoading && <p className="text-muted">Chargement...</p>}
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Défunt</th>
                      <th>Genre</th>
                      <th>Lieu (en attente)</th>
                      <th>Date prière</th>
                      <th>Déclarant</th>
                      <th>Créé le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prieresEnAttente.map((p) => (
                      <tr key={p.id}>
                        <td>{p.id}</td>
                        <td>{p.estAnonyme ? <em>Anonyme</em> : (p.nomDefunt ?? '—')}</td>
                        <td>{p.genre ?? '—'}</td>
                        <td>
                          <span style={{ color: 'var(--warning, #b45309)', fontWeight: 500 }}>{p.mosqueeNom ?? '—'}</span>
                        </td>
                        <td>{fmtDate(p.dateHeurePriere)}</td>
                        <td>{getDeclarantName(p.utilisateurId)}</td>
                        <td>{fmtDateOnly(p.dateCreation)}</td>
                      </tr>
                    ))}
                    {!pPendingLoading && prieresEnAttente.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>Aucune prière en attente</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </div>
        )}

        {/* ── MOSQUEES ── */}
        {tab === 'mosquees' && (
          <div>
            {/* Sub-tabs */}
            <div className="tab-buttons" style={{ marginBottom: '1.5rem' }}>
              <button
                className={`btn ${mosqueeSubTab === 'enregistrees' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setMosqueeSubTab('enregistrees')}
              >
                Enregistrées ({mosquees.length})
              </button>
              <button
                className={`btn ${mosqueeSubTab === 'enattente' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setMosqueeSubTab('enattente')}
              >
                En attente {pendingMosquees.length > 0 ? `(${pendingMosquees.length})` : ''}
              </button>
            </div>

            {/* ─ Sous-onglet : Enregistrées ─ */}
            {mosqueeSubTab === 'enregistrees' && (
              <div>
                <h2>Ajouter une mosquée</h2>
                <form onSubmit={handleAddMosquee} className="auth-form" style={{ maxWidth: '500px', marginBottom: '2rem' }}>
                  <div className="form-group">
                    <label>Nom *</label>
                    <input
                      type="text"
                      value={mosqueeForm.nom}
                      onChange={(e) => setMosqueeForm((f) => ({ ...f, nom: e.target.value }))}
                      placeholder="Grande Mosquée de Paris"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Adresse *</label>
                    <input
                      type="text"
                      value={mosqueeForm.adresse}
                      onChange={(e) => setMosqueeForm((f) => ({ ...f, adresse: e.target.value }))}
                      placeholder="2 bis place du Puits de l'Ermite, 75005 Paris"
                      required
                    />
                  </div>
                  {geoError && <div className="alert alert-error">{geoError}</div>}
                  <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: '-0.5rem' }}>
                    Les coordonnées GPS seront calculées automatiquement depuis l'adresse.
                  </p>
                  <button type="submit" className="btn btn-primary" disabled={geoLoading}>
                    {geoLoading ? 'Géocodage en cours...' : 'Ajouter'}
                  </button>
                </form>

                <div style={{ marginBottom: '1rem' }}>
                  <button
                    className="btn btn-outline"
                    onClick={handleNormaliserSansNom}
                    disabled={normLoading}
                    style={{ fontSize: '0.85rem' }}
                  >
                    {normLoading ? 'Normalisation…' : 'Normaliser mosquées sans nom'}
                  </button>
                  {normResult && (
                    <div className="alert alert-success" style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}>
                      <strong>Renommées ({normResult.renommes?.length ?? 0}) :</strong>{' '}
                      {normResult.renommes?.map(r => `${r.ancienNom} → ${r.nouveauNom}`).join(', ') || '—'}
                      {' · '}<strong>Supprimées :</strong> {normResult.supprimes?.length ?? 0}
                      {' · '}<strong>Ignorées (janazas liées) :</strong> {normResult.ignores?.length ?? 0}
                    </div>
                  )}
                </div>

                <div className="admin-search-bar" style={{ marginBottom: '0.75rem' }}>
                  <SearchBar
                    value={searchMosquee}
                    onChange={setSearchMosquee}
                    placeholder="Rechercher par nom ou adresse…"
                  />
                </div>

                <p className="admin-count">
                  {filteredMosquees.length} résultat{filteredMosquees.length !== 1 ? 's' : ''}
                  {filteredMosquees.length !== mosquees.length && ` sur ${mosquees.length}`}
                </p>

                {mLoading && <p className="text-muted">Chargement...</p>}
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nom</th>
                        <th>Adresse</th>
                        <th>Lat</th>
                        <th>Lng</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMosquees.map((m) => (
                        <tr key={m.id}>
                          <td>{m.id}</td>
                          <td>{m.nom}</td>
                          <td>{m.adresse ?? '—'}</td>
                          <td>{m.latitude?.toFixed(4)}</td>
                          <td>{m.longitude?.toFixed(4)}</td>
                          <td className="admin-actions">
                            <button className="btn-icon btn-icon-edit" title="Modifier" onClick={() => openEditMosquee(m)}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button className="btn-icon btn-icon-delete" title="Supprimer" onClick={() => window.confirm('Supprimer cette mosquée ?') && dispatch(deleteMosquee(m.id))}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredMosquees.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>Aucun résultat</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─ Sous-onglet : En attente ─ */}
            {mosqueeSubTab === 'enattente' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <h2 style={{ margin: 0 }}>Demandes en attente de validation</h2>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedPending.size > 0 && (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={handleValiderSelection}>
                          ✓ Valider la sélection ({selectedPending.size})
                        </button>
                        <button className="btn btn-danger-sm" onClick={handleRefuserSelection}>
                          ✕ Refuser la sélection ({selectedPending.size})
                        </button>
                      </>
                    )}
                    <button className="btn btn-outline btn-sm" onClick={handleValiderTous} disabled={!pendingMosquees.length}>
                      Tout accepter
                    </button>
                    <button className="btn btn-danger-sm" onClick={handleRefuserTous} disabled={!pendingMosquees.length}>
                      Tout refuser
                    </button>
                  </div>
                </div>

                <p className="admin-count">
                  {pendingMosquees.length} demande{pendingMosquees.length !== 1 ? 's' : ''} en attente
                </p>

                {mPendingLoading && <p className="text-muted">Chargement...</p>}
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            checked={selectedPending.size === pendingMosquees.length && pendingMosquees.length > 0}
                            onChange={toggleSelectAllPending}
                          />
                        </th>
                        <th>ID</th>
                        <th>Nom</th>
                        <th>Adresse</th>
                        <th>Lat</th>
                        <th>Lng</th>
                        <th>Soumis le</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingMosquees.map((m) => (
                        <tr key={m.id} style={selectedPending.has(m.id) ? { background: 'var(--bg-selected, #e8f4fd)' } : {}}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedPending.has(m.id)}
                              onChange={() => toggleSelectPending(m.id)}
                            />
                          </td>
                          <td>{m.id}</td>
                          <td>{m.nom}</td>
                          <td>{m.adresse ?? '—'}</td>
                          <td>{m.latitude?.toFixed(4) ?? '—'}</td>
                          <td>{m.longitude?.toFixed(4) ?? '—'}</td>
                          <td>{fmtDateOnly(m.dateCreation ?? m.dateSoumission)}</td>
                          <td className="admin-actions">
                            <button className="btn btn-sm btn-primary" onClick={() => handleValiderPending(m.id)}>
                              ✓ Valider
                            </button>
                            <button className="btn btn-danger-sm" onClick={() => handleRefuserPending(m.id)}>
                              ✕ Refuser
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!mPendingLoading && pendingMosquees.length === 0 && (
                        <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>Aucune demande en attente</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── UTILISATEURS ── */}
        {tab === 'utilisateurs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Gestion des utilisateurs</h2>
              <button className="btn btn-primary" onClick={() => setShowCreateUser(true)}>
                + Ajouter un utilisateur
              </button>
            </div>

            <div className="admin-search-bar" style={{ marginBottom: '0.75rem' }}>
              <SearchBar
                value={searchUser}
                onChange={setSearchUser}
                placeholder="Rechercher par prénom, nom ou email…"
              />
            </div>

            <p className="admin-count">
              {filteredUsers.length} résultat{filteredUsers.length !== 1 ? 's' : ''}
              {filteredUsers.length !== utilisateurs.length && ` sur ${utilisateurs.length}`}
            </p>

            {uLoading && <p className="text-muted">Chargement...</p>}
            {uSaveError && <div className="alert alert-error">{uSaveError}</div>}
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Prénom</th>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Téléphone</th>
                    <th>Inscrit le</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>{u.prenom ?? '—'}</td>
                      <td>{u.nom ?? '—'}</td>
                      <td>{u.email}</td>
                      <td>{u.telephone || '—'}</td>
                      <td>{fmtDateOnly(u.dateInscription)}</td>
                      <td className="admin-actions">
                        <button className="btn-icon btn-icon-edit" title="Modifier" onClick={() => openEditUser(u)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn-icon btn-icon-delete" title="Supprimer" onClick={() => window.confirm(`Supprimer ${u.prenom} ${u.nom} ? Cette action est irréversible.`) && dispatch(deleteUtilisateur(u.id))}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>Aucun résultat</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── IMPORTATION ── */}
        {tab === 'importation' && (
          <div>
            <h2>Permissions d'importation de flyers</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.875rem' }}>
              Gérez quels utilisateurs ont accès au bouton "Importer une janaza" sur l'application mobile et le site web.
              Les administrateurs ont toujours accès, indépendamment de ce paramètre.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={handleAutoriserTousImport}
                disabled={importPermLoading}
              >
                {importPermLoading ? '...' : '✓ Autoriser tous'}
              </button>
              <button
                className="btn btn-danger"
                onClick={handleRefuserTousImport}
                disabled={importPermLoading}
              >
                {importPermLoading ? '...' : '✕ Révoquer tous'}
              </button>
            </div>

            <div className="admin-search-bar" style={{ marginBottom: '0.75rem' }}>
              <SearchBar
                value={importPermSearch}
                onChange={setImportPermSearch}
                placeholder="Rechercher par prénom, nom ou email…"
              />
            </div>

            <p className="admin-count">
              {filteredImportPermUsers.length} utilisateur{filteredImportPermUsers.length !== 1 ? 's' : ''}
            </p>

            {uLoading && <p className="text-muted">Chargement...</p>}
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Prénom</th>
                    <th>Nom</th>
                    <th>Email</th>
                    <th style={{ textAlign: 'center' }}>Peut importer</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredImportPermUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.prenom ?? '—'}</td>
                      <td>{u.nom ?? '—'}</td>
                      <td>{u.email}</td>
                      <td style={{ textAlign: 'center' }}>
                        <label className="toggle-switch" style={{ display: 'inline-flex' }}>
                          <input
                            type="checkbox"
                            checked={u.canImportFlyer ?? false}
                            onChange={(e) => handleToggleImportPerm(u.id, e.target.checked)}
                          />
                          <span className="toggle-knob" />
                        </label>
                      </td>
                    </tr>
                  ))}
                  {filteredImportPermUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                        Aucun utilisateur
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: Edit Mosquée ── */}
      {editMosquee && (
        <Modal title={`Modifier la mosquée #${editMosquee.id}`} onClose={() => setEditMosquee(null)}>
          <form className="auth-form" onSubmit={handleSaveMosquee}>
            <div className="form-group">
              <label>Nom *</label>
              <input
                type="text"
                value={editMosqueeForm.nom}
                onChange={(e) => setEditMosqueeForm((f) => ({ ...f, nom: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Adresse</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={editMosqueeForm.adresse}
                  onChange={(e) => setEditMosqueeForm((f) => ({ ...f, adresse: e.target.value }))}
                  placeholder="Laisser vide pour garder les coordonnées actuelles"
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn-outline" onClick={handleRegeocodeAdresse} disabled={editMosqueeGeoLoading || !editMosqueeForm.adresse}>
                  {editMosqueeGeoLoading ? '...' : 'Géocoder'}
                </button>
              </div>
              {editMosqueeGeoError && <div className="alert alert-error" style={{ marginTop: '0.5rem' }}>{editMosqueeGeoError}</div>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Latitude *</label>
                <input
                  type="number"
                  step="any"
                  value={editMosqueeForm.latitude}
                  onChange={(e) => setEditMosqueeForm((f) => ({ ...f, latitude: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Longitude *</label>
                <input
                  type="number"
                  step="any"
                  value={editMosqueeForm.longitude}
                  onChange={(e) => setEditMosqueeForm((f) => ({ ...f, longitude: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setEditMosquee(null)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: Edit Prière ── */}
      {editPriere && (
        <Modal title={`Modifier la prière #${editPriere.id}`} onClose={() => setEditPriere(null)}>
          <form className="auth-form" onSubmit={handleSavePriere}>
            <div className="form-group form-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={priereForm.estAnonyme}
                  onChange={(e) => setPriereForm((f) => ({ ...f, estAnonyme: e.target.checked }))}
                />
                Défunt(e) anonyme
              </label>
            </div>
            {!priereForm.estAnonyme && (
              <div className="form-group">
                <label>Nom du défunt</label>
                <input
                  type="text"
                  value={priereForm.nomDefunt}
                  onChange={(e) => setPriereForm((f) => ({ ...f, nomDefunt: e.target.value }))}
                />
              </div>
            )}
            <div className="form-group">
              <label>Mosquée *</label>
              <select value={priereForm.mosqueeId} onChange={(e) => setPriereForm((f) => ({ ...f, mosqueeId: e.target.value }))}>
                <option value="">— Sélectionner une mosquée —</option>
                {mosquees.map((m) => (
                  <option key={m.id} value={m.id}>{m.nom}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Genre</label>
              <select value={priereForm.genre} onChange={(e) => setPriereForm((f) => ({ ...f, genre: e.target.value }))}>
                <option value="">Non précisé</option>
                <option value="homme">Homme</option>
                <option value="femme">Femme</option>
                <option value="enfant">Enfant</option>
              </select>
            </div>
            <div className="form-group">
              <label>Date et heure *</label>
              <input
                type="datetime-local"
                value={priereForm.dateHeurePriere}
                onChange={(e) => setPriereForm((f) => ({ ...f, dateHeurePriere: e.target.value }))}
                required
              />
            </div>
            <div className="toggle-row" style={{ marginBottom: '0.75rem' }}>
              <div>
                <div className="toggle-label">Années de naissance et de décès</div>
                <div className="toggle-sub">
                  {priereForm.noYearInfo ? 'Aucune information renseignée' : 'Informations disponibles'}
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={!priereForm.noYearInfo}
                  onChange={(e) => setPriereForm((f) => ({
                    ...f,
                    noYearInfo: !e.target.checked,
                    anneeNaissance: !e.target.checked ? '' : f.anneeNaissance,
                    anneeDeces: !e.target.checked ? '' : f.anneeDeces,
                  }))}
                />
                <span className="toggle-knob" />
              </label>
            </div>
            {!priereForm.noYearInfo && (
              <div className="form-row">
                <div className="form-group">
                  <label>Année de naissance</label>
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={priereForm.anneeNaissance}
                    onChange={(e) => setPriereForm((f) => ({ ...f, anneeNaissance: e.target.value }))}
                    placeholder="ex : 1950"
                  />
                </div>
                <div className="form-group">
                  <label>Année de décès</label>
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={priereForm.anneeDeces}
                    onChange={(e) => setPriereForm((f) => ({ ...f, anneeDeces: e.target.value }))}
                    placeholder="ex : 2024"
                  />
                </div>
              </div>
            )}
            <div className="form-group">
              <label>Commentaire</label>
              <textarea
                value={priereForm.commentaire}
                onChange={(e) => setPriereForm((f) => ({ ...f, commentaire: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Pays d'enterrement</label>
                <input
                  type="text"
                  value={priereForm.paysEnterrement}
                  onChange={(e) => setPriereForm((f) => ({ ...f, paysEnterrement: e.target.value }))}
                  placeholder="France"
                />
              </div>
              <div className="form-group">
                <label>Lieu d'enterrement</label>
                <input
                  type="text"
                  value={priereForm.villeEnterrement}
                  onChange={(e) => setPriereForm((f) => ({ ...f, villeEnterrement: e.target.value }))}
                  placeholder="Paris"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setEditPriere(null)}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={pSaving}>
                {pSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: Create Utilisateur ── */}
      {showCreateUser && (
        <Modal title="Nouvel utilisateur" onClose={() => setShowCreateUser(false)}>
          <form className="auth-form" onSubmit={handleCreateUser}>
            <div className="form-row">
              <div className="form-group">
                <label>Prénom *</label>
                <input
                  type="text"
                  value={createUserForm.prenom}
                  onChange={(e) => setCreateUserForm((f) => ({ ...f, prenom: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Nom *</label>
                <input
                  type="text"
                  value={createUserForm.nom}
                  onChange={(e) => setCreateUserForm((f) => ({ ...f, nom: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={createUserForm.email}
                onChange={(e) => setCreateUserForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Mot de passe *</label>
              <input
                type="password"
                value={createUserForm.password}
                onChange={(e) => setCreateUserForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Rôle</label>
                <select value={createUserForm.role} onChange={(e) => setCreateUserForm((f) => ({ ...f, role: e.target.value }))}>
                  <option value="User">Utilisateur</option>
                  <option value="Admin">Administrateur</option>
                </select>
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  value={createUserForm.telephone}
                  onChange={(e) => setCreateUserForm((f) => ({ ...f, telephone: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowCreateUser(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={uSaving}>
                {uSaving ? 'Création...' : 'Créer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: Edit Utilisateur ── */}
      {editUser && (
        <Modal title={`Modifier ${editUser.prenom} ${editUser.nom}`} onClose={() => setEditUser(null)}>
          <form className="auth-form" onSubmit={handleSaveUser}>
            <div className="form-row">
              <div className="form-group">
                <label>Prénom</label>
                <input
                  type="text"
                  value={editUserForm.prenom}
                  onChange={(e) => setEditUserForm((f) => ({ ...f, prenom: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Nom</label>
                <input
                  type="text"
                  value={editUserForm.nom}
                  onChange={(e) => setEditUserForm((f) => ({ ...f, nom: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Téléphone</label>
              <input
                type="tel"
                value={editUserForm.telephone}
                onChange={(e) => setEditUserForm((f) => ({ ...f, telephone: e.target.value }))}
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setEditUser(null)}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={uSaving}>
                {uSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Toast notification ── */}
      {notif && (
        <div className={`admin-toast admin-toast-${notif.type}`}>
          <span>{notif.message}</span>
          <button className="admin-toast-close" onClick={() => setNotif(null)}>✕</button>
        </div>
      )}
    </div>
  );
}
