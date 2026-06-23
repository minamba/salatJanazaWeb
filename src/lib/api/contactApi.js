import { apiClient } from './axiosConfig';

export const sendContact = (data) => apiClient.post('/api/contact', data);
