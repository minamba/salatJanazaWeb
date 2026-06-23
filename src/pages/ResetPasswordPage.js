import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { resetPassword, resetAuth } from '../lib/actions/authActions';

export default function ResetPasswordPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { loading, error, resetSuccess } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ email: '', code: '', newPassword: '' });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  useEffect(() => {
    if (resetSuccess) {
      const timer = setTimeout(() => navigate('/connexion'), 2500);
      return () => clearTimeout(timer);
    }
  }, [resetSuccess, navigate]);

  useEffect(() => () => dispatch(resetAuth()), [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(resetPassword(form));
  };

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <h1 className="auth-title">{t('reset.title')}</h1>
        <p className="auth-subtitle">{t('reset.subtitle')}</p>

        {resetSuccess ? (
          <div className="alert alert-success">{t('reset.success')}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('reset.email')}</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="votre@email.fr"
                required
              />
            </div>
            <div className="form-group">
              <label>{t('reset.code')}</label>
              <input
                type="text"
                value={form.code}
                onChange={set('code')}
                placeholder="123456"
                maxLength={6}
                required
                className="code-input"
              />
            </div>
            <div className="form-group">
              <label>{t('reset.new_password')}</label>
              <input
                type="password"
                value={form.newPassword}
                onChange={set('newPassword')}
                placeholder={t('register.password_placeholder')}
                required
                minLength={6}
              />
            </div>

            {error && <div className="alert alert-error">✗ {error}</div>}

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? t('reset.loading') : t('reset.submit')}
            </button>
          </form>
        )}

        <p className="auth-footer">
          <Link to="/mot-de-passe-oublie">{t('reset.resend')}</Link>
        </p>
      </div>
    </div>
  );
}
