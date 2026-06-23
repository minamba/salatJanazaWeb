import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { forgotPassword, resetAuth } from '../lib/actions/authActions';

export default function ForgotPasswordPage() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { loading, error, forgotSuccess } = useSelector((s) => s.auth);
  const [email, setEmail] = useState('');

  useEffect(() => () => dispatch(resetAuth()), [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(forgotPassword(email));
  };

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <h1 className="auth-title">{t('forgot.title')}</h1>
        <p className="auth-subtitle">{t('forgot.subtitle')}</p>

        {forgotSuccess ? (
          <div className="alert alert-success">
            {t('forgot.success')}
            <br />
            <Link to="/reinitialiser-mdp" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
              {t('forgot.enter_code')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('forgot.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.fr"
                required
                autoComplete="email"
              />
            </div>

            {error && <div className="alert alert-error">✗ {error}</div>}

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? t('forgot.loading') : t('forgot.submit')}
            </button>
          </form>
        )}

        <p className="auth-footer">
          <Link to="/connexion">{t('forgot.back')}</Link>
        </p>
      </div>
    </div>
  );
}
