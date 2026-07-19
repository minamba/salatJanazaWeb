import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { dismissJanazaToast } from '../lib/actions/priereJanazaActions';
import { capitalizeFirst, formatNomDefunt } from '../lib/utils';

const LOCALE_MAP = { fr: 'fr-FR', en: 'en-US', ar: 'ar-SA', tr: 'tr-TR', ja: 'ja-JP', ko: 'ko-KR', ms: 'ms-MY', ur: 'ur-PK', id: 'id-ID', bn: 'bn-BD', ru: 'ru-RU', pt: 'pt-BR', de: 'de-DE', it: 'it-IT', es: 'es-ES' };

function fmtDate(d, lang) {
  const date = new Date(d);
  const locale = LOCALE_MAP[lang] ?? 'fr-FR';
  const h = String(date.getUTCHours()).padStart(2, '0');
  const m = String(date.getUTCMinutes()).padStart(2, '0');
  const dateStr = date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${dateStr} · ${h}h${m}`;
}

function defuntLabel(p, t) {
  const g = p.genre?.toLowerCase() ?? '';
  if (p.estAnonyme) {
    if (g === 'femme')  return t('avis.community_sister');
    if (g === 'enfant') return t('avis.community_child');
    return t('avis.community_brother');
  }
  const civilite = g === 'femme' ? t('card.civility_female') : g === 'homme' ? t('card.civility_male') : '';
  const nom = p.nomDefunt ? formatNomDefunt(p.nomDefunt).toUpperCase() : '';
  return civilite ? `${civilite} ${nom}` : nom;
}

function ToastItem({ toast }) {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissJanazaToast(toast.toastId)), 10000);
    return () => clearTimeout(timer);
  }, [toast.toastId, dispatch]);

  return (
    <div className="janaza-toast" role="alert">
      <button
        className="janaza-toast-close"
        onClick={() => dispatch(dismissJanazaToast(toast.toastId))}
        aria-label={t('mosquee.add_mosque_close')}
      >
        ×
      </button>
      <div className="janaza-toast-label">{t('card.new_janaza')}</div>
      <div className="janaza-toast-name">{defuntLabel(toast, t)}</div>
      {toast.mosqueeNom && (
        <div className="janaza-toast-mosque">{capitalizeFirst(toast.mosqueeNom)}</div>
      )}
      {toast.dateHeurePriere && (
        <div className="janaza-toast-date">{fmtDate(toast.dateHeurePriere, i18n.language)}</div>
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
