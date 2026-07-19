import { useEffect, useState } from 'react';

const EXPIRY_MS = 90 * 60 * 1000;

function parseDateHeure(raw) {
  if (!raw) return null;
  if (raw instanceof Date) return raw;
  return new Date(/Z$|[+-]\d{2}:/.test(raw) ? raw : raw + 'Z');
}

export function computeStatut(p) {
  const dateHeure = parseDateHeure(p.dateHeurePriere);
  if (!dateHeure || isNaN(dateHeure.getTime())) return p.statut ?? 'AVenir';
  const offset = p.utcOffsetMinutes || (-new Date().getTimezoneOffset());
  const trueUtcMs = dateHeure.getTime() - offset * 60_000;
  const now = Date.now();
  if (trueUtcMs > now) return 'AVenir';
  if (trueUtcMs > now - EXPIRY_MS) return 'EnCours';
  return 'Terminee';
}

export function isExpired(p) {
  const dateHeure = parseDateHeure(p.dateHeurePriere);
  if (!dateHeure || isNaN(dateHeure.getTime())) return false;
  const offset = p.utcOffsetMinutes || (-new Date().getTimezoneOffset());
  const trueUtcMs = dateHeure.getTime() - offset * 60_000;
  return Date.now() - trueUtcMs >= EXPIRY_MS;
}

export function useMinuteTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
}
