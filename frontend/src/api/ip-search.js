import { apiClient } from './client';

export function searchIpAddress({ query }) {
  return apiClient.post('/api/ip-search', { query });
}

export { fetchCredits } from './dark-web';
