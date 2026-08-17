import { useSelector } from 'react-redux';

export default function InfoBanner() {
  const infoMessage = useSelector(s => s.features?.infoMessage);
  if (!infoMessage?.active || !infoMessage?.message) return null;

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.accent} />
        <div style={styles.body}>
          <div style={styles.labelRow}>
            <span style={styles.icon}>ⓘ</span>
            <span style={styles.label}>INFORMATION</span>
          </div>
          <p style={styles.message}>{infoMessage.message}</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    backgroundColor: '#FFFBEB',
    borderBottom: '1px solid #FDE68A',
    padding: '8px 16px',
  },
  card: {
    display: 'flex',
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(180, 83, 9, 0.10)',
    maxWidth: 900,
    margin: '0 auto',
  },
  accent: {
    width: 4,
    flexShrink: 0,
    backgroundColor: '#F59E0B',
  },
  body: {
    flex: 1,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  labelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  icon: {
    fontSize: 14,
    color: '#B45309',
  },
  label: {
    fontSize: 10,
    fontWeight: 800,
    color: '#B45309',
    letterSpacing: '0.08em',
  },
  message: {
    margin: 0,
    fontSize: 13,
    color: '#78350F',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },
};
