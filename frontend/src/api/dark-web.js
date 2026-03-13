import { apiClient } from './client';

export function searchDarkWeb({ query, type }) {
  return apiClient.post('/api/dark-web/search', { query, type });
}

export function fetchCredits() {
  return apiClient.get('/api/credits');
}
