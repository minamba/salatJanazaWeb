import { Link } from 'react-router-dom';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <div className="nf-container">
      <div className="nf-card">
        <div className="nf-code">404</div>
        <h1 className="nf-title">Page introuvable</h1>
        <p className="nf-text">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <Link to="/" className="nf-btn">Retour à l'accueil</Link>
      </div>
    </div>
  );
}
