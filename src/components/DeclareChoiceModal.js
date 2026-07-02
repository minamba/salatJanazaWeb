import { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDeclareModal } from '../context/DeclareModalContext';
import { apiClient } from '../lib/api/axiosConfig';

export default function DeclareChoiceModal() {
  const { open, closeModal } = useDeclareModal();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useSelector(s => s.auth.user);
  const canImport = !!(user?.canImportFlyer || ['admin', 'superadmin'].includes(user?.role?.toLowerCase()));

  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const [view, setView] = useState('choice'); // 'choice' | 'loading' | 'success' | 'error'
  const [loadingMsg, setLoadingMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [timeUnknown, setTimeUnknown] = useState(false);

  if (!open) return null;

  function resetAndClose() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setView('choice');
    setLoadingMsg('');
    setErrorMsg('');
    setTimeUnknown(false);
    closeModal();
  }

  function handleSaisie() {
    resetAndClose();
    navigate('/tableau-de-bord/declarer');
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setErrorMsg(t('declare.import_format_body'));
      setView('error');
      return;
    }
    if (!user?.dbId) {
      setErrorMsg(t('declare.import_login_required'));
      setView('error');
      return;
    }

    setLoadingMsg(t('declare.import_processing_short'));
    setView('loading');

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('utilisateurId', String(user.dbId));

      const uploadResp = await apiClient.post('/api/flyer/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      const { importToken } = uploadResp.data;

      setLoadingMsg(t('declare.import_processing'));

      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const statusResp = await apiClient.get(`/api/flyer/import-status/${importToken}`);
          const { status: s, message, errorCode, timeUnknown: tu } = statusResp.data;
          if (s === 'success') {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setTimeUnknown(!!tu);
            setView('success');
          } else if (s === 'error') {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setErrorMsg(errorCode === 'IMAGE_QUALITY'
              ? t('declare.import_image_quality')
              : (message || t('declare.import_error_generic')));
            setView('error');
          }
        } catch (_) {}
      }, 3000);

      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setErrorMsg(t('declare.import_timeout'));
          setView('error');
        }
      }, 2 * 60 * 1000);

    } catch (err) {
      setErrorMsg(err?.response?.data?.error || t('declare.import_error_generic'));
      setView('error');
    }
  }

  function handleGoToDeclarations() {
    resetAndClose();
    navigate('/tableau-de-bord');
  }

  return (
    <div className="dc-overlay" onClick={view === 'choice' ? resetAndClose : undefined}>
      <div className="dc-card" onClick={e => e.stopPropagation()}>

        {view !== 'loading' && (
          <button className="dc-close" onClick={resetAndClose} aria-label="Fermer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {/* ── Choix ── */}
        {view === 'choice' && (
          <>
            <div className="dc-header">
              <div className="dc-header-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A6B4A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h2 className="dc-title">{t('declare.choose_method_title')}</h2>
            </div>

            <div className="dc-options">
              <button className="dc-option" onClick={handleSaisie}>
                <div className="dc-option-icon dc-option-icon--manual">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A6B4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </div>
                <div className="dc-option-text">
                  <span className="dc-option-title">{t('declare.choose_manual')}</span>
                  <span className="dc-option-sub">{t('declare.choose_manual_sub')}</span>
                </div>
                <svg className="dc-option-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {canImport && (
                <button className="dc-option" onClick={handleImportClick}>
                  <div className="dc-option-icon dc-option-icon--import">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a6fa4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <div className="dc-option-text">
                    <span className="dc-option-title">{t('declare.choose_import')}</span>
                    <span className="dc-option-sub">{t('declare.choose_import_sub')}</span>
                  </div>
                  <svg className="dc-option-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}
            </div>
          </>
        )}

        {/* ── Chargement ── */}
        {view === 'loading' && (
          <div className="dc-status-view">
            <div className="dc-spinner" />
            <p className="dc-status-msg">{loadingMsg}</p>
          </div>
        )}

        {/* ── Succès ── */}
        {view === 'success' && (
          <div className="dc-status-view">
            <div className="dc-success-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3A6B4A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="dc-success-title">{t('declare.import_success')}</h3>

            {timeUnknown && (
              <div className="dc-warn-box">
                {t('declare.import_verify_time_unknown')}
              </div>
            )}

            <div className="dc-info-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <strong>{t('declare.import_verify_title')}</strong>
                {t('declare.import_verify_body').split('\n').map((line, i) => (
                  <p key={i} style={{ margin: '0.3rem 0 0' }}>{line}</p>
                ))}
              </div>
            </div>

            <div className="dc-success-actions">
              <button className="btn btn-primary" onClick={handleGoToDeclarations}>
                {t('dashboard.my_prayers')}
              </button>
              <button className="btn btn-outline" onClick={resetAndClose}>
                {t('declare.import_verify_close')}
              </button>
            </div>
          </div>
        )}

        {/* ── Erreur ── */}
        {view === 'error' && (
          <div className="dc-status-view">
            <div className="dc-error-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <p className="dc-status-msg dc-status-msg--error">{errorMsg}</p>
            <button className="btn btn-outline" style={{ marginTop: '1rem' }} onClick={() => setView('choice')}>
              Réessayer
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          style={{ display: 'none' }}
          onChange={handleFileSelected}
        />
      </div>
    </div>
  );
}
