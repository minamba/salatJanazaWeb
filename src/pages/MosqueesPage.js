import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMosquees } from '../lib/actions/mosqueeActions';
import { capitalizeFirst } from '../lib/utils';

export default function MosqueesPage() {
  const dispatch = useDispatch();
  const { list, loading, error } = useSelector((s) => s.mosquee);

  useEffect(() => {
    dispatch(fetchMosquees());
  }, [dispatch]);

  return (
    <div className="page">
      <div className="page-header">
        <div className="container">
          <h1>Mosquées</h1>
          <p>Liste des mosquées enregistrées sur Salat Janaza</p>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1rem' }}>
        {loading && <p className="text-center text-muted">Chargement...</p>}
        {error && <p className="text-center text-error">{error}</p>}
        {!loading && list.length === 0 && (
          <p className="text-center text-muted">Aucune mosquée enregistrée.</p>
        )}
        <div className="card-grid">
          {list.map((m) => (
            <div key={m.id} className="card mosquee-card">
              <div className="card-body">
                <h3>{capitalizeFirst(m.nom)}</h3>
                {m.adresse && <p className="text-muted">{m.adresse}</p>}
                {m.distanceKm != null && (
                  <p className="badge badge-avenir">{m.distanceKm} km</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
