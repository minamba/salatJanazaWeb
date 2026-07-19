import { useState, useEffect } from 'react';

const LS_PREFIX = 'qabr_geo2_';
const _memCache = new Map();

// Purge stale empty-string entries from previous failed lookups
try {
  Object.keys(localStorage)
    .filter(k => k.startsWith(LS_PREFIX) && localStorage.getItem(k) === '')
    .forEach(k => localStorage.removeItem(k));
} catch {}

function getCached(key) {
  if (_memCache.has(key)) return _memCache.get(key);
  try {
    const v = localStorage.getItem(LS_PREFIX + key);
    if (v !== null) { _memCache.set(key, v || null); return v || null; }
  } catch {}
  return undefined;
}

function setCached(key, isoCode) {
  _memCache.set(key, isoCode);
  try { localStorage.setItem(LS_PREFIX + key, isoCode ?? ''); } catch {}
}

// French country name (as it appears at end of French addresses) → ISO 3166-1 alpha-2
const FR_TO_ISO = {
  'Afghanistan': 'AF', 'Afrique du Sud': 'ZA', 'Algérie': 'DZ',
  'Allemagne': 'DE', 'Angola': 'AO', 'Arabie Saoudite': 'SA',
  'Argentine': 'AR', 'Australie': 'AU', 'Autriche': 'AT',
  'Azerbaïdjan': 'AZ', 'Bahreïn': 'BH', 'Bangladesh': 'BD',
  'Belgique': 'BE', 'Bénin': 'BJ', 'Birmanie': 'MM',
  'Bosnie-Herzégovine': 'BA', 'Bulgarie': 'BG', 'Burkina Faso': 'BF',
  'Burundi': 'BI', 'Cambodge': 'KH', 'Cameroun': 'CM', 'Canada': 'CA',
  'Centrafrique': 'CF', 'Comores': 'KM', 'Congo': 'CG', 'RD Congo': 'CD',
  "Côte d'Ivoire": 'CI', 'Danemark': 'DK', 'Djibouti': 'DJ',
  'Égypte': 'EG', 'Émirats arabes unis': 'AE', 'Espagne': 'ES',
  'Éthiopie': 'ET', 'Finlande': 'FI', 'France': 'FR', 'Gabon': 'GA',
  'Gambie': 'GM', 'Ghana': 'GH', 'Grèce': 'GR', 'Guinée': 'GN',
  'Guinée-Bissau': 'GW', 'Guinée équatoriale': 'GQ', 'Inde': 'IN',
  'Indonésie': 'ID', 'Irak': 'IQ', 'Iran': 'IR', 'Irlande': 'IE',
  'Italie': 'IT', 'Jordanie': 'JO', 'Kazakhstan': 'KZ', 'Kenya': 'KE',
  'Kirghizistan': 'KG', 'Koweït': 'KW', 'Liban': 'LB', 'Libye': 'LY',
  'Luxembourg': 'LU', 'Macédoine du Nord': 'MK', 'Madagascar': 'MG',
  'Malaisie': 'MY', 'Mali': 'ML', 'Maroc': 'MA', 'Mauritanie': 'MR',
  'Mexique': 'MX', 'Moldavie': 'MD', 'Mozambique': 'MZ', 'Namibie': 'NA',
  'Niger': 'NE', 'Nigéria': 'NG', 'Norvège': 'NO', 'Oman': 'OM',
  'Ouganda': 'UG', 'Ouzbékistan': 'UZ', 'Pakistan': 'PK',
  'Palestine': 'PS', 'Pays-Bas': 'NL', 'Philippines': 'PH',
  'Pologne': 'PL', 'Portugal': 'PT', 'Qatar': 'QA', 'Roumanie': 'RO',
  'Royaume-Uni': 'GB', 'Rwanda': 'RW', 'Sénégal': 'SN',
  'Sierra Leone': 'SL', 'Singapour': 'SG', 'Somalie': 'SO',
  'Soudan': 'SD', 'Suède': 'SE', 'Suisse': 'CH', 'Syrie': 'SY',
  'Tadjikistan': 'TJ', 'Tanzanie': 'TZ', 'Tchad': 'TD', 'Togo': 'TG',
  'Tunisie': 'TN', 'Turquie': 'TR', 'Turkménistan': 'TM',
  'Ukraine': 'UA', 'États-Unis': 'US', 'Yémen': 'YE', 'Zambie': 'ZM',
  'Zimbabwe': 'ZW', 'Chine': 'CN', 'Japon': 'JP', 'Corée du Sud': 'KR',
  'Thaïlande': 'TH', 'Vietnam': 'VN',
  // Europe
  'Albanie': 'AL', 'Andorre': 'AD', 'Arménie': 'AM', 'Biélorussie': 'BY',
  'Chypre': 'CY', 'Croatie': 'HR', 'République tchèque': 'CZ', 'Estonie': 'EE',
  'Géorgie': 'GE', 'Hongrie': 'HU', 'Islande': 'IS', 'Kosovo': 'XK',
  'Lettonie': 'LV', 'Liechtenstein': 'LI', 'Lituanie': 'LT', 'Malte': 'MT',
  'Monaco': 'MC', 'Monténégro': 'ME', 'Russie': 'RU', 'Saint-Marin': 'SM',
  'Serbie': 'RS', 'Slovaquie': 'SK', 'Slovénie': 'SI', 'Vatican': 'VA',
  // Asie
  'Brunéi': 'BN', 'Bhoutan': 'BT', 'Israël': 'IL', 'Corée du Nord': 'KP',
  'Laos': 'LA', 'Sri Lanka': 'LK', 'Mongolie': 'MN', 'Maldives': 'MV',
  'Népal': 'NP', 'Timor oriental': 'TL', 'Taïwan': 'TW',
  // Afrique
  'Botswana': 'BW', 'Cap-Vert': 'CV', 'Érythrée': 'ER', 'Eswatini': 'SZ',
  'Lesotho': 'LS', 'Libéria': 'LR', 'Malawi': 'MW', 'Maurice': 'MU',
  'Seychelles': 'SC', 'Soudan du Sud': 'SS', 'Sao Tomé-et-Principe': 'ST',
  // Amériques
  'Antigua-et-Barbuda': 'AG', 'Barbade': 'BB', 'Belize': 'BZ', 'Bolivie': 'BO',
  'Brésil': 'BR', 'Bahamas': 'BS', 'Chili': 'CL', 'Colombie': 'CO',
  'Costa Rica': 'CR', 'Cuba': 'CU', 'Dominique': 'DM', 'République dominicaine': 'DO',
  'Équateur': 'EC', 'Grenade': 'GD', 'Guatemala': 'GT', 'Guyana': 'GY',
  'Haïti': 'HT', 'Honduras': 'HN', 'Jamaïque': 'JM',
  'Saint-Kitts-et-Nevis': 'KN', 'Sainte-Lucie': 'LC', 'Nicaragua': 'NI',
  'Panama': 'PA', 'Pérou': 'PE', 'Paraguay': 'PY', 'Suriname': 'SR',
  'Salvador': 'SV', 'Trinité-et-Tobago': 'TT', 'Uruguay': 'UY',
  'Saint-Vincent-et-les-Grenadines': 'VC', 'Venezuela': 'VE',
  // Océanie
  'Fidji': 'FJ', 'Micronésie': 'FM', 'Kiribati': 'KI', 'Îles Marshall': 'MH',
  'Nauru': 'NR', 'Nouvelle-Zélande': 'NZ', 'Papouasie-Nouvelle-Guinée': 'PG',
  'Palaos': 'PW', 'Îles Salomon': 'SB', 'Tonga': 'TO', 'Tuvalu': 'TV',
  'Vanuatu': 'VU', 'Samoa': 'WS',
};

async function nominatimReverse(lat, lon) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
    { headers: { 'User-Agent': 'salatjanaza.org/1.0' } }
  );
  const data = await res.json();
  return data?.address?.country_code?.toUpperCase() ?? null;
}

async function nominatimSearch(address) {
  if (!address) return null;
  // Fast path: last part of address is a known French country name → ISO code directly, no network call
  const parts = address.split(',').map(p => p.trim());
  const last = parts[parts.length - 1];
  const directIso = FR_TO_ISO[last];
  if (directIso) return directIso;
  // Slow path: call Nominatim
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
    { headers: { 'User-Agent': 'salatjanaza.org/1.0' } }
  );
  const data = await res.json();
  const hit = data?.[0];
  if (!hit) return null;
  return nominatimReverse(hit.lat, hit.lon);
}

// Returns ISO 3166-1 alpha-2 code (e.g. "FR", "ID") or null
export function useCountryFlag(lat, lon, adresse) {
  const [isoCode, setIsoCode] = useState(null);

  const hasCoords = lat != null && lon != null
    && !isNaN(Number(lat)) && !isNaN(Number(lon))
    && !(Number(lat) === 0 && Number(lon) === 0);

  const key = hasCoords
    ? `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`
    : (adresse ? `a:${adresse.slice(0, 80)}` : null);

  useEffect(() => {
    if (!key) { setIsoCode(null); return; }

    const cached = getCached(key);
    if (cached !== undefined) { setIsoCode(cached); return; }

    let cancelled = false;
    const lookup = hasCoords ? nominatimReverse(lat, lon) : nominatimSearch(adresse);

    lookup
      .then(iso => {
        if (cancelled) return;
        setCached(key, iso);
        setIsoCode(iso);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [key]);

  return isoCode;
}
