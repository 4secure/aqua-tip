import { apiClient } from './client';

export function searchThreat({ query }) {
  return apiClient.post('/api/threat-search', { query });
}

export { fetchCredits } from './dark-web';
