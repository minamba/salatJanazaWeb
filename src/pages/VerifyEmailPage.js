import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyEmail } from '../lib/api/authApi';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    if (!email || !token) {
      setStatus('error');
      setMessage('Lien de vérification invalide.');
      return;
    }

    verifyEmail(email, token)
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message || 'Email vérifié avec succès.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Lien invalide ou expiré.');
      });
  }, [searchParams]);

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Vérification de l'email</h1>

        {status === 'loading' && (
          <p className="text-center text-muted">Vérification en cours...</p>
        )}

        {status === 'success' && (
          <>
            <div className="alert alert-success">✓ {message}</div>
            <p style={{ color: '#555', fontSize: '14px', marginBottom: '1.5rem' }}>
              Votre compte est maintenant actif. Vous pouvez vous connecter et déclarer des prières janaza.
            </p>
            <Link to="/connexion" className="btn btn-primary btn-full">
              Se connecter
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="alert alert-error">✗ {message}</div>
            <p style={{ color: '#555', fontSize: '14px', marginBottom: '1.5rem' }}>
              Le lien de vérification est peut-être expiré ou invalide. Essayez de vous inscrire à nouveau.
            </p>
            <Link to="/inscription" className="btn btn-outline btn-full">
              Retour à l'inscription
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
