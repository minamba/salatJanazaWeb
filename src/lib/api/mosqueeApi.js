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
