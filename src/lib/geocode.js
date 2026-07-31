// Géocodage en cascade : Nominatim → api-adresse (FR gov) → Photon (Komoot)
// Retourne { latitude, longitude } ou lance une erreur si aucune source ne trouve l'adresse.
export async function geocodeAddress(address) {
  // 1. Nominatim (OpenStreetMap)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'fr' } }
    );
    const data = await res.json();
    if (data?.[0]?.lat) return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
  } catch {}

  // 2. API Adresse (gouvernement français) — meilleure couverture des adresses FR
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await res.json();
    const c = data?.features?.[0]?.geometry?.coordinates;
    if (c) return { latitude: c[1], longitude: c[0] };
  } catch {}

  // 3. Photon (Komoot) — fallback mondial
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await res.json();
    const c = data?.features?.[0]?.geometry?.coordinates;
    if (c) return { latitude: c[1], longitude: c[0] };
  } catch {}

  throw new Error('Adresse introuvable. Précisez la ville ou le pays.');
}
