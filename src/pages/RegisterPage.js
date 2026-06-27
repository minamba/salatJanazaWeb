import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { register, resetAuth } from '../lib/actions/authActions';

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { loading, error, registerSuccess } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  useEffect(() => {
    if (registerSuccess) {
      const timer = setTimeout(() => navigate('/connexion'), 2000);
      return () => clearTimeout(timer);
    }
  }, [registerSuccess, navigate]);

  useEffect(() => () => dispatch(resetAuth()), [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(register(form));
  };

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <h1 className="auth-title">{t('register.title')}</h1>
        <p className="auth-subtitle">{t('register.subtitle')}</p>

        {registerSuccess ? (
          <div className="alert alert-success">{t('register.success')}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>{t('register.firstname')}</label>
                <input
                  type="text"
                  value={form.prenom}
                  onChange={set('prenom')}
                  placeholder="Ahmed"
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('register.lastname')}</label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={set('nom')}
                  placeholder="Martin"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>{t('register.email')}</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="votre@email.fr"
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label>{t('register.password')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder={t('register.password_placeholder')}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#888', display: 'flex', alignItems: 'center' }}
                  tabIndex={-1}
                >
                  {showPassword
                    ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {error && <div className="alert alert-error">✗ {error}</div>}

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? t('register.loading') : t('register.submit')}
            </button>
          </form>
        )}

        <p className="auth-footer">
          {t('register.has_account')} <Link to="/connexion">{t('register.login_link')}</Link>
        </p>
      </div>
    </div>
  );
}
