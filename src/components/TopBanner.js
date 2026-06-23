import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPrieresUpcoming } from '../lib/actions/priereJanazaActions';

export default function TopBanner() {
  const dispatch = useDispatch();
  const { list: prieres } = useSelector((s) => s.priereJanaza);

  useEffect(() => { dispatch(fetchPrieresUpcoming()); }, [dispatch]);

  const enCoursCount = prieres.filter((p) => p.statut === 'EnCours').length;
  const aVenirCount  = prieres.filter((p) => p.statut === 'AVenir').length;


  return (
    <div className="top-banner">
      <div className="top-banner-inner">

        {/* Live indicator */}
        <div className="top-banner-live">
          <span className="top-banner-live-dot" />
          <span className="top-banner-live-label">En direct</span>
        </div>

        <span className="top-banner-divider" />

        {/* Stats */}
        <div className="top-banner-stats">
          {enCoursCount === 0 && aVenirCount === 0 ? (
            <div className="top-banner-stat">
              <span className="top-banner-num">0</span>
              <span className="top-banner-desc">prière funéraire de prévu</span>
            </div>
          ) : (
            <>
              {enCoursCount > 0 && (
                <div className="top-banner-stat">
                  <span className="top-banner-num">{enCoursCount}</span>
                  <span className="top-banner-desc">
                    salat janaza <strong>en cours</strong> aujourd'hui
                  </span>
                </div>
              )}

              {enCoursCount > 0 && aVenirCount > 0 && (
                <span className="top-banner-dot-sep">·</span>
              )}

              {aVenirCount > 0 && (
                <div className="top-banner-stat">
                  <span className="top-banner-num">{aVenirCount}</span>
                  <span className="top-banner-desc">
                    {aVenirCount > 1 ? 'prières' : 'prière'} <strong>programmée{aVenirCount > 1 ? 's' : ''}</strong> à venir
                  </span>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
