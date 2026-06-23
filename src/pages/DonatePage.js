import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const PAYPAL_EMAIL = 'minamba.c@gmail.com';
const STRIPE_LINK = 'https://buy.stripe.com/8x2eVfdb52x00up55M0VO00';

const AMOUNTS = [5, 10, 20, 50];

export default function DonatePage() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(10);
  const [custom, setCustom] = useState('');

  const amount = custom !== '' ? Number(custom) : selected;

  const paypalUrl = `https://www.paypal.com/donate/?business=${encodeURIComponent(PAYPAL_EMAIL)}&amount=${amount}&currency_code=EUR&item_name=Don+Salat+Janaza`;

  return (
    <div className="page">
      <div className="page-header">
        <div className="container">
          <h1>{t('donate.title')}</h1>
          <p>{t('donate.subtitle')}</p>
        </div>
      </div>

      <div className="donate-page">
        <div className="donate-why">
          <h2>{t('donate.why_title')}</h2>
          <p>{t('donate.why_desc')}</p>
          <blockquote className="hadith hadith-sm">
            {t('donate.hadith')}
            <cite>— {t('donate.hadith_source')}</cite>
          </blockquote>
        </div>

        <div className="donate-card">
          <h2>{t('donate.choose_amount')}</h2>

          <div className="amount-grid">
            {AMOUNTS.map((a) => (
              <button
                key={a}
                className={`amount-btn${selected === a && custom === '' ? ' amount-btn-active' : ''}`}
                onClick={() => { setSelected(a); setCustom(''); }}
              >
                {a} €
              </button>
            ))}
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>{t('donate.custom_amount')}</label>
            <input
              type="number"
              min="1"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder={t('donate.custom_placeholder')}
            />
          </div>

          {amount > 0 && (
            <p className="donate-summary">
              {t('donate.summary')} <strong>{amount} €</strong>
            </p>
          )}

          <div className="donate-methods">
            <a href={paypalUrl} target="_blank" rel="noopener noreferrer" className="donate-btn donate-btn-paypal">
              <PayPalIcon />
              <span>
                <small>{t('donate.pay_with')}</small>
                PayPal
              </span>
            </a>

          </div>

          <p className="donate-secure">{t('donate.secure')}</p>
        </div>
      </div>

      <section className="section section-light">
        <div className="container">
          <div className="trust-grid">
            <div className="trust-item">
              <span className="trust-icon">🔒</span>
              <h3>{t('donate.trust_1_title')}</h3>
              <p>{t('donate.trust_1_desc')}</p>
            </div>
            <div className="trust-item">
              <span className="trust-icon">🎯</span>
              <h3>{t('donate.trust_2_title')}</h3>
              <p>{t('donate.trust_2_desc')}</p>
            </div>
            <div className="trust-item">
              <span className="trust-icon">🤲</span>
              <h3>{t('donate.trust_3_title')}</h3>
              <p>{t('donate.trust_3_desc')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PayPalIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.828l-1.17 7.416h3.44l.943-5.985h2.07c4.005 0 6.553-1.913 7.35-5.705.27-1.281.15-2.306-.24-3.521z"/>
    </svg>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  );
}
