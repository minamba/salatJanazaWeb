import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { submitContact, resetContact } from '../lib/actions/contactActions';

export default function ContactPage() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { loading, success, error } = useSelector((s) => s.contact);
  const [form, setForm] = useState({ nom: '', email: '', message: '' });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  useEffect(() => {
    if (success) {
      setForm({ nom: '', email: '', message: '' });
      const timer = setTimeout(() => dispatch(resetContact()), 5000);
      return () => clearTimeout(timer);
    }
  }, [success, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(submitContact(form));
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="container">
          <h1>{t('contact.title')}</h1>
          <p>{t('contact.subtitle')}</p>
        </div>
      </div>

      <div className="container form-container">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('contact.name')}</label>
            <input
              type="text"
              value={form.nom}
              onChange={set('nom')}
              placeholder={t('contact.name_placeholder')}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('contact.email')}</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="votre@email.fr"
              required
            />
          </div>
          <div className="form-group">
            <label>{t('contact.message')}</label>
            <textarea
              value={form.message}
              onChange={set('message')}
              placeholder={t('contact.message_placeholder')}
              rows={5}
              required
            />
          </div>

          {success && <div className="alert alert-success">{t('contact.success')}</div>}
          {error && <div className="alert alert-error">✗ {error}</div>}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? t('contact.loading') : t('contact.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
