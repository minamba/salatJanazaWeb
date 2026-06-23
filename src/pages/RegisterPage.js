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
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder={t('register.password_placeholder')}
                required
                minLength={6}
                autoComplete="new-password"
              />
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
