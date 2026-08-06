import { apiClient } from './axiosConfig';

export const getMosquees = () => apiClient.get('/api/mosquee');
export const getMosqueeById = (id) => apiClient.get(`/api/mosquee/${id}`);
export const getMosqueesNearby = (lat, lng, radiusKm = 5) =>
  apiClient.get('/api/mosquee/nearby', { params: { latitude: lat, longitude: lng, radiusKm } });
export const searchMosquees = (q) => apiClient.get('/api/mosquee/search', { params: { q } });
export const createMosquee = (data) => apiClient.post('/api/mosquee', data);
export const createMosqueeSuggestion = (data) => apiClient.post('/api/mosquee/suggestion', data);
export const updateMosquee = (id, data) => apiClient.put(`/api/mosquee/${id}`, data);
export const deleteMosquee = (id) => apiClient.delete(`/api/mosquee/${id}`);
export const getPendingMosquees = () => apiClient.get('/api/mosquee/pending');
export const validerMosquee = (id) => apiClient.put(`/api/mosquee/${id}/valider`);
export const refuserMosquee = (id) => apiClient.put(`/api/mosquee/${id}/refuser`);

// Ville et pays par géocodage inverse des coordonnées.
// Le lot est borné parce que le service de géolocalisation n'accepte qu'une
// requête par seconde : traiter des centaines de mosquées en un seul appel
// dépasserait le délai d'attente du navigateur. L'appelant rappelle tant que
// `restantes` n'est pas nul.
// Le rattrapage tourne EN FOND sur le serveur : cet appel donne le départ et
// rend la main aussitôt. Le suivi passe par `getEtatLieux`, qu'on interroge
// tant que `enCours` est vrai. Fermer l'onglet n'interrompt rien.
export const rattraperLieux = () => apiClient.post('/api/mosquee/lieux/rattrapage');
export const getEtatLieux = () => apiClient.get('/api/mosquee/lieux/etat');
