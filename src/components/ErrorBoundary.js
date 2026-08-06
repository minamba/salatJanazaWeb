import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <ErrorPage onRetry={() => this.setState({ hasError: false })} />;
  }
}

function ErrorPage({ onRetry }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.icon}>⚠️</div>
        <h1 style={styles.title}>Une erreur est survenue</h1>
        <p style={styles.text}>
          Un problème inattendu s'est produit. Veuillez réessayer ou recharger la page.
        </p>
        <div style={styles.actions}>
          <button style={styles.btnPrimary} onClick={onRetry}>
            Réessayer
          </button>
          <button style={styles.btnSecondary} onClick={() => window.location.href = '/'}>
            Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--cream, #faf7f0)',
    padding: '2rem',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
    padding: '3rem 2.5rem',
    maxWidth: '460px',
    width: '100%',
    textAlign: 'center',
  },
  icon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  title: {
    fontFamily: 'var(--font, Georgia, serif)',
    fontSize: '1.6rem',
    color: 'var(--text, #2c2c2c)',
    marginBottom: '0.75rem',
  },
  text: {
    fontFamily: 'var(--font-ui, sans-serif)',
    fontSize: '0.95rem',
    color: 'var(--text-muted, #7a7060)',
    lineHeight: '1.6',
    marginBottom: '2rem',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    background: 'var(--green, #6b8f5e)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.65rem 1.5rem',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-ui, sans-serif)',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnSecondary: {
    background: 'transparent',
    color: 'var(--green, #6b8f5e)',
    border: '1.5px solid var(--green, #6b8f5e)',
    borderRadius: '8px',
    padding: '0.65rem 1.5rem',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-ui, sans-serif)',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
