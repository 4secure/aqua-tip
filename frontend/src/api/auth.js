import { apiClient, csrfCookie } from './client';

export async function loginUser({ email, password }) {
  await csrfCookie();
  return apiClient.post('/api/login', { email, password });
}

export async function registerUser({ email, password }) {
  await csrfCookie();
  return apiClient.post('/api/register', { email, password });
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

export async function verifyEmailCode(code) {
  await csrfCookie();
  return apiClient.post('/api/email/verify-code', { code });
}

export async function resendVerification() {
  return apiClient.post('/api/email/verification-notification', {});
}

export async function forgotPassword(email) {
  await csrfCookie();
  return apiClient.post('/api/forgot-password', { email });
}

export async function resetPassword({ token, email, password, password_confirmation }) {
  await csrfCookie();
  return apiClient.post('/api/reset-password', { token, email, password, password_confirmation });
}

export async function completeOnboarding({ name, phone, timezone, organization, role }) {
  await csrfCookie();
  return apiClient.post('/api/onboarding', { name, phone, timezone, organization, role });
}

export async function updateProfile({ name, phone, timezone, organization, role }) {
  await csrfCookie();
  return apiClient.put('/api/profile', { name, phone, timezone, organization, role });
}
