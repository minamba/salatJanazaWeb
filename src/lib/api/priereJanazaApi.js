import { apiClient } from './axiosConfig';

export const getPrieres = () => apiClient.get('/api/prierejanaza');
export const getPrieresUpcoming = () => apiClient.get('/api/prierejanaza/upcoming');
export const getPriereById = (id) => apiClient.get(`/api/prierejanaza/${id}`);
export const getPrieresByMosquee = (mosqueeId) =>
  apiClient.get(`/api/prierejanaza/mosquee/${mosqueeId}`);
export const getPrieresByUtilisateur = (utilisateurId) =>
  apiClient.get(`/api/prierejanaza/utilisateur/${utilisateurId}`);
export const createPriere = (data) => apiClient.post('/api/prierejanaza', data);
export const updatePriere = (id, data) => apiClient.put(`/api/prierejanaza/${id}`, data);
export const deletePriere = (id) => apiClient.delete(`/api/prierejanaza/${id}`);
