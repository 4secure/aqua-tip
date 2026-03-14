import { apiClient } from './client';

export function fetchThreatNews({ after, search, confidence, sort, order } = {}) {
  const params = new URLSearchParams();

  if (after) params.set('after', after);
  if (search) params.set('search', search);
  if (confidence) params.set('confidence', confidence);
  if (sort) params.set('sort', sort);
  if (order) params.set('order', order);

  const qs = params.toString();
  return apiClient.get(`/api/threat-news${qs ? '?' + qs : ''}`);
}
