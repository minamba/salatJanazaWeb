import { authClient } from './axiosConfig';

const TOKEN_HEADERS = { 'Content-Type': 'application/x-www-form-urlencoded' };
const SCOPES = 'openid email profile qabr-api';

export const loginWithPassword = (email, password) => {
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: 'qabr-mobile',
    username: email,
    password,
    scope: SCOPES,
  });
  return authClient.post('/connect/token', params, { headers: TOKEN_HEADERS });
};

export const loginWithGoogle = (accessToken) => {
  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:google',
    client_id: 'qabr-mobile',
    access_token: accessToken,
    scope: SCOPES,
  });
  return authClient.post('/connect/token', params, { headers: TOKEN_HEADERS });
};

export const loginWithApple = (idToken) => {
  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:apple',
    client_id: 'qabr-mobile',
    id_token: idToken,
    scope: SCOPES,
  });
  return authClient.post('/connect/token', params, { headers: TOKEN_HEADERS });
};

export const register = (data) =>
  authClient.post('/api/auth/register', data);

export const forgotPassword = (email) =>
  authClient.post('/api/auth/forgot-password', { email });

export const resetPassword = (data) =>
  authClient.post('/api/auth/reset-password', data);

export const getMe = () =>
  authClient.get('/api/auth/me');
