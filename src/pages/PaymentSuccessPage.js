import { useEffect } from 'react';

export default function PaymentSuccessPage() {
  useEffect(() => {
    window.location.href = 'qabr://payment-success';
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', fontFamily: 'Georgia, serif' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🤲</div>
      <h1 style={{ color: '#3A6B4A', fontSize: 24, marginBottom: 8 }}>Jazakumu Allahu Khayran !</h1>
      <p style={{ color: '#555', fontSize: 16 }}>Votre paiement a bien été reçu.</p>
      <p style={{ color: '#888', fontSize: 14 }}>Retournez à l'application Salat Janaza.</p>
    </div>
  );
}
