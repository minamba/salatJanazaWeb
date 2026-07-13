import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dismissJanazaToast } from '../lib/actions/priereJanazaActions';
import { capitalizeFirst, formatNomDefunt } from '../lib/utils';

const JOURS  = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MOIS   = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];

function fmtDate(d) {
  const date = new Date(d);
  const h = String(date.getUTCHours()).padStart(2, '0');
  const m = String(date.getUTCMinutes()).padStart(2, '0');
  return `${JOURS[date.getUTCDay()]} ${date.getUTCDate()} ${MOIS[date.getUTCMonth()]} · ${h}h${m}`;
}

function defuntLabel(p) {
  const g = p.genre?.toLowerCase() ?? '';
  if (p.estAnonyme) {
    if (g === 'femme')  return 'Une sœur de la communauté';
    if (g === 'enfant') return 'Un enfant de la communauté';
    return 'Un frère de la communauté';
  }
  const civilite = g === 'femme' ? 'Mme.' : g === 'homme' ? 'M.' : '';
  const nom = p.nomDefunt ? formatNomDefunt(p.nomDefunt).toUpperCase() : '';
  return civilite ? `${civilite} ${nom}` : nom;
}

function ToastItem({ toast }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const t = setTimeout(() => dispatch(dismissJanazaToast(toast.toastId)), 10000);
    return () => clearTimeout(t);
  }, [toast.toastId, dispatch]);

  return (
    <div className="janaza-toast" role="alert">
      <button
        className="janaza-toast-close"
        onClick={() => dispatch(dismissJanazaToast(toast.toastId))}
        aria-label="Fermer"
      >
        ×
      </button>
      <div className="janaza-toast-label">Nouvelle prière janaza</div>
      <div className="janaza-toast-name">{defuntLabel(toast)}</div>
      {toast.mosqueeNom && (
        <div className="janaza-toast-mosque">{capitalizeFirst(toast.mosqueeNom)}</div>
      )}
      {toast.dateHeurePriere && (
        <div className="janaza-toast-date">{fmtDate(toast.dateHeurePriere)}</div>
      )}
    </div>
  );
}

export default function JanazaToast() {
  const toasts = useSelector((s) => s.priereJanaza.toasts);
  if (!toasts.length) return null;

  return (
    <div className="janaza-toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.toastId} toast={t} />
      ))}
    </div>
  );
}
