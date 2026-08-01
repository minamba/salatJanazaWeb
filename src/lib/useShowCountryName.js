import { useState, useEffect } from 'react';

// Lightweight cross-component preference — localStorage-backed, syncs across instances
const _listeners = new Set();
let _cached = null;

function readStorage() {
  try { return localStorage.getItem('pref_showCountryName') !== 'false'; } catch { return true; }
}

export function useShowCountryName() {
  const [value, setValue] = useState(() => {
    if (_cached !== null) return _cached;
    _cached = readStorage();
    return _cached;
  });

  useEffect(() => {
    _listeners.add(setValue);
    return () => _listeners.delete(setValue);
  }, []);

  function set(newVal) {
    _cached = newVal;
    try { localStorage.setItem('pref_showCountryName', String(newVal)); } catch {}
    _listeners.forEach(fn => fn(newVal));
  }

  return [value, set];
}
