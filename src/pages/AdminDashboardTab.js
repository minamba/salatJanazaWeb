import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { apiClient } from '../lib/api/axiosConfig';

// ── Constants ──────────────────────────────────────────────────────────────────
const PERIODS = [
  { key: 'jour',    label: 'Jour'    },
  { key: 'semaine', label: 'Semaine' },
  { key: 'mois',    label: 'Mois'    },
  { key: 'annee',   label: 'Année'   },
];

const SHORT_MONTHS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
const LONG_MONTHS  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const DECL_COLOR  = '#10B981';
const USER_COLOR  = '#0284C7';
const GENRE_COLORS = {
  homme:  '#0284C7',
  femme:  '#EC4899',
  enfant: '#F59E0B',
  inconnu:'#9ca3af',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function getDateLabel(period, d) {
  if (period === 'jour') return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}. ${d.getFullYear()}`;
  if (period === 'semaine') {
    const dow   = ((d.getDay() + 6) % 7);
    const start = new Date(d); start.setDate(d.getDate() - dow);
    const end   = new Date(start); end.setDate(start.getDate() + 6);
    if (start.getMonth() === end.getMonth())
      return `${start.getDate()} - ${end.getDate()} ${SHORT_MONTHS[end.getMonth()]}. ${end.getFullYear()}`;
    return `${start.getDate()} ${SHORT_MONTHS[start.getMonth()]} - ${end.getDate()} ${SHORT_MONTHS[end.getMonth()]}. ${end.getFullYear()}`;
  }
  if (period === 'mois') return `${LONG_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return String(d.getFullYear());
}

function isCurrentPeriod(period, d) {
  const now = new Date();
  if (period === 'jour')  return d.toDateString() === now.toDateString();
  if (period === 'mois')  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (period === 'annee') return d.getFullYear() === now.getFullYear();
  const dow = ((d.getDay() + 6) % 7);
  const ws  = new Date(d); ws.setDate(d.getDate() - dow);
  const we  = new Date(ws); we.setDate(ws.getDate() + 6);
  return now >= ws && now <= we;
}

function smoothPath(pts) {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  const t = 0.3;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) * t;
    const cp1y = p1.y + (p2.y - p0.y) * t;
    const cp2x = p2.x - (p3.x - p1.x) * t;
    const cp2y = p2.y - (p3.y - p1.y) * t;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// ── Area chart with hover tooltip ─────────────────────────────────────────────
function AreaChart({ series, color, gradId }) {
  const [tooltip,    setTooltip]    = useState(null);
  const [containerW, setContainerW] = useState(0);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver(entries => {
      setContainerW(entries[0].contentRect.width);
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  const n = series.length;
  if (n === 0) return <p style={{ color: '#9ca3af', fontSize: 13 }}>Aucune donnée</p>;

  const PAD  = { t: 24, r: 16, b: 30, l: 12 };
  const H    = 150;
  const minW = Math.max(containerW || 360, n * 22);
  const cW   = minW - PAD.l - PAD.r;
  const cH   = H - PAD.t - PAD.b;
  const maxV = Math.max(...series.map(s => s.value), 1);

  const pts = series.map((s, i) => ({
    x: PAD.l + (n > 1 ? (i / (n - 1)) * cW : cW / 2),
    y: PAD.t + (1 - s.value / maxV) * cH,
    v: s.value,
    l: s.label,
  }));

  const line = smoothPath(pts);
  const area = pts.length > 1
    ? `${line} L ${pts[n - 1].x.toFixed(1)} ${(H - PAD.b).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(H - PAD.b).toFixed(1)} Z`
    : '';

  const labelStep = n > 20 ? 4 : n > 12 ? 2 : 1;

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = minW / rect.width;
    const svgMouseX = (e.clientX - rect.left) * scaleX;

    let nearest = null;
    let minDist = Infinity;
    pts.forEach(p => {
      const dist = Math.abs(p.x - svgMouseX);
      if (dist < minDist) { minDist = dist; nearest = p; }
    });
    setTooltip(nearest && minDist < 40 ? nearest : null);
  }

  // Tooltip box: flip to left when too close to right edge
  const TW = 78; const TH = 38;
  const tipX = tooltip ? (tooltip.x + 10 + TW > minW - PAD.r ? tooltip.x - 10 - TW : tooltip.x + 10) : 0;
  const tipY = tooltip ? Math.max(PAD.t, Math.min(tooltip.y - TH / 2, H - PAD.b - TH)) : 0;

  return (
    <div ref={wrapperRef} style={{ overflowX: 'auto', marginTop: 8 }}>
      <svg
        width={minW} height={H}
        viewBox={`0 0 ${minW} ${H}`}
        style={{ display: 'block', cursor: 'crosshair', overflow: 'visible' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(v => (
          <line key={v}
            x1={PAD.l} y1={PAD.t + v * cH}
            x2={minW - PAD.r} y2={PAD.t + v * cH}
            stroke="#e5e7eb" strokeWidth="1"
          />
        ))}

        {/* Area + Line */}
        {area && <path d={area} fill={`url(#${gradId})`} />}
        {line && <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}

        {/* Dots */}
        {pts.map((p, i) => {
          const isHovered = tooltip && tooltip.x === p.x;
          return (
            <circle key={i}
              cx={p.x} cy={p.y}
              r={isHovered ? 5 : 3.5}
              fill={color}
              stroke={isHovered ? 'white' : 'none'}
              strokeWidth={isHovered ? 2 : 0}
              opacity={tooltip && !isHovered ? 0.3 : 1}
            />
          );
        })}

        {/* X-axis labels */}
        {pts.map((p, i) => {
          const isHovered = tooltip && tooltip.x === p.x;
          return i % labelStep === 0 ? (
            <text key={i} x={p.x} y={H - 6} textAnchor="middle"
              fontSize="9"
              fill={isHovered ? color : '#9ca3af'}
              fontWeight={isHovered ? '700' : '400'}
            >{p.l}</text>
          ) : null;
        })}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <line
              x1={tooltip.x} y1={PAD.t}
              x2={tooltip.x} y2={H - PAD.b}
              stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.55"
            />
            <rect x={tipX} y={tipY} width={TW} height={TH} rx="6" fill="rgba(15,15,15,0.82)" />
            <text x={tipX + 8} y={tipY + 14} fontSize="10" fill="#9ca3af">{tooltip.l}</text>
            <text x={tipX + 8} y={tipY + 29} fontSize="14" fontWeight="700" fill="white">{tooltip.v}</text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ── Small components ───────────────────────────────────────────────────────────
function StatCard({ label, total, color, children }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
          <div style={{ fontSize: 52, fontWeight: 800, color, lineHeight: 1.1 }}>{total ?? '—'}</div>
        </div>
        <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color, marginTop: 8 }} />
      </div>
      {children}
    </div>
  );
}

function ProgressRow({ label, count, total, color, dot }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        {dot && <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 8, flexShrink: 0 }} />}
        <span style={{ flex: 1, fontSize: 16, color: '#2c2c2c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#2c2c2c', marginLeft: 8 }}>{count}</span>
      </div>
      <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>{title}</div>
      {children}
    </div>
  );
}

// Android SVG icon (minimal)
function AndroidIcon({ size = 20, color = '#3DDC84' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48A5.84 5.84 0 0 0 12 1.5c-.71 0-1.39.13-2.03.37L8.48.39c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.3A5.845 5.845 0 0 0 6.1 6.5h11.8c-.34-1.72-1.38-3.18-2.87-4.34zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/>
    </svg>
  );
}

// Apple SVG icon (minimal)
function AppleIcon({ size = 20, color = '#555' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

function GlobalStatsCard({ globalStats }) {
  if (!globalStats) return null;
  const { totalUtilisateurs, android, ios, inconnu } = globalStats;
  const max = Math.max(android, ios, inconnu > 0 ? inconnu : 0, 1);

  return (
    <div style={{ ...card, marginTop: '1rem' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>
        Utilisateurs inscrits
      </div>

      <div style={{ fontSize: 52, fontWeight: 800, color: USER_COLOR, lineHeight: 1.1, marginBottom: 24 }}>
        {totalUtilisateurs}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>

        {/* Android */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AndroidIcon size={22} color="#3DDC84" />
            <span style={{ fontSize: 16, color: '#4b5563', fontWeight: 500 }}>Android</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#3DDC84', marginLeft: 'auto' }}>{android}</span>
          </div>
          <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4 }}>
            <div style={{ height: '100%', width: `${(android / max) * 100}%`, backgroundColor: '#3DDC84', borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* iOS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppleIcon size={22} color="#555" />
            <span style={{ fontSize: 16, color: '#4b5563', fontWeight: 500 }}>iOS</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#555', marginLeft: 'auto' }}>{ios}</span>
          </div>
          <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4 }}>
            <div style={{ height: '100%', width: `${(ios / max) * 100}%`, backgroundColor: '#555', borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Inconnu — only if non-zero */}
        {inconnu > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, border: '1.5px solid #9ca3af', flexShrink: 0 }} />
              <span style={{ fontSize: 16, color: '#4b5563', fontWeight: 500 }}>Inconnu</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#9ca3af', marginLeft: 'auto' }}>{inconnu}</span>
            </div>
            <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4 }}>
              <div style={{ height: '100%', width: `${(inconnu / max) * 100}%`, backgroundColor: '#9ca3af', borderRadius: 4, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const card = {
  background: '#ffffff',
  borderRadius: 14,
  padding: '1.75rem',
  marginBottom: '1rem',
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function AdminDashboardTab() {
  const [period,      setPeriod]      = useState('jour');
  const [refDate,     setRefDate]     = useState(new Date());
  const [genreFilter, setGenreFilter] = useState(null);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(false);

  const prieresCount   = useSelector(s => s.priereJanaza?.list?.length ?? 0);
  const prevPrieresRef = useRef(prieresCount);

  const navigate = useCallback((dir) => {
    setRefDate(prev => {
      const d     = new Date(prev);
      const delta = dir === 'prev' ? -1 : 1;
      if      (period === 'jour')    d.setDate(d.getDate() + delta);
      else if (period === 'semaine') d.setDate(d.getDate() + delta * 7);
      else if (period === 'mois')    d.setMonth(d.getMonth() + delta);
      else                           d.setFullYear(d.getFullYear() + delta);
      return d;
    });
  }, [period]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr          = refDate.toISOString().split('T')[0];
      const utcOffsetMinutes = -new Date().getTimezoneOffset();
      const res = await apiClient.get('/api/Dashboard/stats', {
        params: {
          period,
          date: dateStr,
          utcOffsetMinutes,
          ...(genreFilter ? { genre: genreFilter } : {}),
        },
      });
      setStats(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [period, refDate, genreFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (prevPrieresRef.current !== prieresCount) {
      prevPrieresRef.current = prieresCount;
      fetchStats();
    }
  }, [prieresCount, fetchStats]);

  const decl  = stats?.declarations;
  const users = stats?.utilisateurs;
  const gTotal = decl
    ? decl.byGenre.homme + decl.byGenre.femme + decl.byGenre.enfant + decl.byGenre.inconnu
    : 0;

  return (
    <div>
      {/* Responsive overrides injected once per mount */}
      <style>{`
        .dash-controls {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
        }
        .dash-ctrl-group {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }
        .dash-grid-2 {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .dash-grid-3 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        @media (max-width: 640px) {
          .dash-controls { flex-direction: column; }
          .dash-ctrl-group { width: 100%; }
          .dash-grid-3 { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── Controls bar ──────────────────────────────── */}
      <div className="dash-controls">

        {/* Period buttons */}
        <div className="dash-ctrl-group">
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3, gap: 2 }}>
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => { setPeriod(p.key); setRefDate(new Date()); }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                  background: period === p.key ? 'var(--green)' : 'transparent',
                  color:      period === p.key ? '#fff' : '#6b7280',
                  transition: 'all 0.15s',
                }}
              >{p.label}</button>
            ))}
          </div>
        </div>

        {/* Date navigation */}
        <div className="dash-ctrl-group">
          <button onClick={() => navigate('prev')} style={navBtn}>‹</button>
          <span style={{ fontSize: 15, fontWeight: 600, minWidth: 160, textAlign: 'center' }}>
            {getDateLabel(period, refDate)}
          </span>
          <button onClick={() => navigate('next')} style={navBtn}>›</button>
          {!isCurrentPeriod(period, refDate) && (
            <button onClick={() => setRefDate(new Date())} style={todayBtnStyle}>Aujourd'hui</button>
          )}
        </div>

        {/* Genre filter */}
        <div className="dash-ctrl-group">
          {[
            { key: null,     label: 'Tous'   },
            { key: 'homme',  label: 'Homme'  },
            { key: 'femme',  label: 'Femme'  },
            { key: 'enfant', label: 'Enfant' },
          ].map(g => (
            <button
              key={g.key ?? 'tous'}
              onClick={() => setGenreFilter(g.key)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: `1.5px solid ${genreFilter === g.key ? 'var(--green)' : '#d1d5db'}`,
                background: genreFilter === g.key ? 'var(--green)' : 'transparent',
                color:      genreFilter === g.key ? '#fff' : '#4b5563',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >{g.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Chargement…</div>
      ) : (
        <div>
          {/* ── Charts row ──────────────────────────── */}
          <div className="dash-grid-2">
            <StatCard label="Janazas déclarées" total={decl?.total} color={DECL_COLOR}>
              {decl?.series && <AreaChart series={decl.series} color={DECL_COLOR} gradId="grad-decl" />}
            </StatCard>

            <StatCard label="Nouvelles inscriptions" total={users?.total} color={USER_COLOR}>
              {users?.series && <AreaChart series={users.series} color={USER_COLOR} gradId="grad-users" />}
            </StatCard>
          </div>

          {/* ── Genre + Country + Mosque ────────────── */}
          <div className="dash-grid-3">

            {decl && (
              <SectionCard title="Par genre">
                <ProgressRow label="Homme"         count={decl.byGenre.homme}   total={gTotal} color={GENRE_COLORS.homme}  dot />
                <ProgressRow label="Femme"         count={decl.byGenre.femme}   total={gTotal} color={GENRE_COLORS.femme}  dot />
                <ProgressRow label="Enfant"        count={decl.byGenre.enfant}  total={gTotal} color={GENRE_COLORS.enfant} dot />
                <ProgressRow label="Non renseigné" count={decl.byGenre.inconnu} total={gTotal} color={GENRE_COLORS.inconnu}dot />
              </SectionCard>
            )}

            {decl?.byPays?.length > 0 && (
              <SectionCard title="Par pays">
                {decl.byPays.map((item, i) => (
                  <ProgressRow key={i} label={item.pays} count={item.count}
                    total={decl.byPays[0].count} color={DECL_COLOR} />
                ))}
              </SectionCard>
            )}

            {decl?.byMosquee?.length > 0 && (
              <SectionCard title="Par mosquée">
                {decl.byMosquee.map((item, i) => (
                  <ProgressRow key={i} label={item.nom} count={item.count}
                    total={decl.byMosquee[0].count} color="var(--green)" />
                ))}
              </SectionCard>
            )}
          </div>

          {/* ── Global platform stats ───────────────── */}
          <GlobalStatsCard globalStats={stats?.globalStats} />
        </div>
      )}
    </div>
  );
}

const navBtn = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: '1.5px solid #d1d5db',
  background: '#fff',
  fontSize: 18,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  color: 'var(--green)',
  lineHeight: 1,
};

const todayBtnStyle = {
  padding: '5px 12px',
  borderRadius: 8,
  border: '1.5px solid var(--green)',
  background: 'transparent',
  color: 'var(--green)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};
