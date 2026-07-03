// Maps French country names (from the PAYS list) to IANA timezone IDs.
export const PAYS_TZ = {
  'Afghanistan': 'Asia/Kabul', 'Afrique du Sud': 'Africa/Johannesburg',
  'Albanie': 'Europe/Tirane', 'Algérie': 'Africa/Algiers',
  'Allemagne': 'Europe/Berlin', 'Angola': 'Africa/Luanda',
  'Arabie Saoudite': 'Asia/Riyadh', 'Argentine': 'America/Argentina/Buenos_Aires',
  'Australie': 'Australia/Sydney', 'Autriche': 'Europe/Vienna',
  'Azerbaïdjan': 'Asia/Baku', 'Bahreïn': 'Asia/Bahrain',
  'Bangladesh': 'Asia/Dhaka', 'Belgique': 'Europe/Brussels',
  'Bénin': 'Africa/Porto-Novo', 'Birmanie': 'Asia/Rangoon',
  'Bosnie-Herzégovine': 'Europe/Sarajevo', 'Bulgarie': 'Europe/Sofia',
  'Burkina Faso': 'Africa/Ouagadougou', 'Burundi': 'Africa/Bujumbura',
  'Cambodge': 'Asia/Phnom_Penh', 'Cameroun': 'Africa/Douala',
  'Canada': 'America/Toronto', 'Centrafrique': 'Africa/Bangui',
  'Comores': 'Indian/Comoro', 'Congo': 'Africa/Brazzaville',
  "Côte d'Ivoire": 'Africa/Abidjan', 'Danemark': 'Europe/Copenhagen',
  'Djibouti': 'Africa/Djibouti', 'Égypte': 'Africa/Cairo',
  'Émirats arabes unis': 'Asia/Dubai', 'Espagne': 'Europe/Madrid',
  'Éthiopie': 'Africa/Addis_Ababa', 'Finlande': 'Europe/Helsinki',
  'France': 'Europe/Paris', 'Gabon': 'Africa/Libreville',
  'Gambie': 'Africa/Banjul', 'Ghana': 'Africa/Accra',
  'Grèce': 'Europe/Athens', 'Guinée': 'Africa/Conakry',
  'Guinée-Bissau': 'Africa/Bissau', 'Guinée équatoriale': 'Africa/Malabo',
  'Inde': 'Asia/Kolkata', 'Indonésie': 'Asia/Jakarta',
  'Irak': 'Asia/Baghdad', 'Iran': 'Asia/Tehran',
  'Irlande': 'Europe/Dublin', 'Italie': 'Europe/Rome',
  'Jordanie': 'Asia/Amman', 'Kazakhstan': 'Asia/Almaty',
  'Kenya': 'Africa/Nairobi', 'Kirghizistan': 'Asia/Bishkek',
  'Koweït': 'Asia/Kuwait', 'Liban': 'Asia/Beirut',
  'Libye': 'Africa/Tripoli', 'Luxembourg': 'Europe/Luxembourg',
  'Macédoine du Nord': 'Europe/Skopje', 'Madagascar': 'Indian/Antananarivo',
  'Malaisie': 'Asia/Kuala_Lumpur', 'Mali': 'Africa/Bamako',
  'Maroc': 'Africa/Casablanca', 'Mauritanie': 'Africa/Nouakchott',
  'Mexique': 'America/Mexico_City', 'Moldavie': 'Europe/Chisinau',
  'Mozambique': 'Africa/Maputo', 'Namibie': 'Africa/Windhoek',
  'Niger': 'Africa/Niamey', 'Nigéria': 'Africa/Lagos',
  'Norvège': 'Europe/Oslo', 'Oman': 'Asia/Muscat',
  'Ouganda': 'Africa/Kampala', 'Ouzbékistan': 'Asia/Tashkent',
  'Pakistan': 'Asia/Karachi', 'Palestine': 'Asia/Gaza',
  'Pays-Bas': 'Europe/Amsterdam', 'Philippines': 'Asia/Manila',
  'Pologne': 'Europe/Warsaw', 'Portugal': 'Europe/Lisbon',
  'Qatar': 'Asia/Qatar', 'République démocratique du Congo': 'Africa/Kinshasa',
  'Roumanie': 'Europe/Bucharest', 'Royaume-Uni': 'Europe/London',
  'Rwanda': 'Africa/Kigali', 'Sénégal': 'Africa/Dakar',
  'Sierra Leone': 'Africa/Freetown', 'Singapour': 'Asia/Singapore',
  'Somalie': 'Africa/Mogadishu', 'Soudan': 'Africa/Khartoum',
  'Suède': 'Europe/Stockholm', 'Suisse': 'Europe/Zurich',
  'Syrie': 'Asia/Damascus', 'Tadjikistan': 'Asia/Dushanbe',
  'Tanzanie': 'Africa/Dar_es_Salaam', 'Tchad': 'Africa/Ndjamena',
  'Togo': 'Africa/Lome', 'Tunisie': 'Africa/Tunis',
  'Turquie': 'Europe/Istanbul', 'Turkménistan': 'Asia/Ashgabat',
  'Ukraine': 'Europe/Kiev', 'Yémen': 'Asia/Aden',
  'Zambie': 'Africa/Lusaka', 'Zimbabwe': 'Africa/Harare',
};

/**
 * Computes the UTC offset in minutes for a given country name (French) and prayer date.
 * Uses the Intl API for DST-aware computation.
 * Falls back to `fallbackMinutes` (original DB value or longitude approximation) if
 * the country is unknown or the Intl API throws.
 *
 * @param {string|null} pays - French country name from the PAYS list
 * @param {number} fallbackMinutes - offset to use if country lookup fails
 * @param {Date} refDate - reference date for DST resolution (defaults to now)
 * @returns {number} UTC offset in minutes (e.g. 120 for UTC+2)
 */
export function computeUtcOffsetMinutes(pays, fallbackMinutes, refDate) {
  const date = refDate instanceof Date ? refDate : new Date();
  const tz = PAYS_TZ[pays];
  if (tz) {
    try {
      const utcMs = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
      const localMs = new Date(date.toLocaleString('en-US', { timeZone: tz })).getTime();
      return Math.round((localMs - utcMs) / 60000);
    } catch { /* fall through */ }
  }
  return fallbackMinutes ?? 0;
}
