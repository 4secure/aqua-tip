import { apiClient, csrfCookie } from './client';

export async function loginUser({ email, password }) {
  await csrfCookie();
  return apiClient.post('/api/login', { email, password });
}

export async function registerUser({ name, email, password, password_confirmation }) {
  await csrfCookie();
  return apiClient.post('/api/register', { name, email, password, password_confirmation });
}

export async function logoutUser() {
  return apiClient.post('/api/logout');
}

export async function fetchCurrentUser() {
  const response = await apiClient.get('/api/user');
  return response.data;
}

export async function getSocialRedirectUrl(provider) {
  const response = await apiClient.get(`/api/auth/${provider}/redirect`);
  return response.url;
}
