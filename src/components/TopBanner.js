import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchPrieresUpcoming } from '../lib/actions/priereJanazaActions';
import { computeStatut, useMinuteTick } from '../lib/statut';

export default function TopBanner() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { list: prieres } = useSelector((s) => s.priereJanaza);
  useMinuteTick();

  useEffect(() => { dispatch(fetchPrieresUpcoming()); }, [dispatch]);

  const enCoursCount = prieres.filter((p) => computeStatut(p) === 'EnCours').length;
  const aVenirCount  = prieres.filter((p) => computeStatut(p) === 'AVenir').length;

  return (
    <div className="top-banner">
      <div className="top-banner-inner">

        {/* Live indicator */}
        <div className="top-banner-live">
          <span className="top-banner-live-dot" />
          <span className="top-banner-live-label">{t('banner.live')}</span>
        </div>

        <span className="top-banner-divider" />

        {/* Stats */}
        <div className="top-banner-stats">
          {enCoursCount === 0 && aVenirCount === 0 ? (
            <div className="top-banner-stat">
              <span className="top-banner-num">0</span>
              <span className="top-banner-desc">{t('banner.none')}</span>
            </div>
          ) : (
            <>
              {enCoursCount > 0 && (
                <div className="top-banner-stat">
                  <span className="top-banner-num">{enCoursCount}</span>
                  <span className="top-banner-desc">{t('banner.en_cours')}</span>
                </div>
              )}

              {enCoursCount > 0 && aVenirCount > 0 && (
                <span className="top-banner-dot-sep">·</span>
              )}

              {aVenirCount > 0 && (
                <div className="top-banner-stat">
                  <span className="top-banner-num">{aVenirCount}</span>
                  <span className="top-banner-desc">
                    {aVenirCount > 1 ? t('banner.a_venir_other') : t('banner.a_venir_one')}
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
