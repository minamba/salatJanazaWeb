import { apiClient } from './axiosConfig';

export const getUtilisateurs = () => apiClient.get('/api/utilisateur');
export const getUtilisateurById = (id) => apiClient.get(`/api/utilisateur/${id}`);
export const getUtilisateurByIdentityId = (identityId) => apiClient.get(`/api/utilisateur/identity/${identityId}`);
export const adminCreateUtilisateur = (data) => apiClient.post('/api/utilisateur/admin/create', data);
export const updateUtilisateur = (id, data) => apiClient.put(`/api/utilisateur/${id}`, data);
export const deleteUtilisateur = (id) => apiClient.delete(`/api/utilisateur/${id}`);
