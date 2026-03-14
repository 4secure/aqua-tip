import { apiClient } from './client';

export function fetchThreatActors({ after, search, motivation, sort, order } = {}) {
  const params = new URLSearchParams();

  if (after) params.set('after', after);
  if (search) params.set('search', search);
  if (motivation) params.set('motivation', motivation);
  if (sort) params.set('sort', sort);
  if (order) params.set('order', order);

  const qs = params.toString();
  return apiClient.get(`/api/threat-actors${qs ? '?' + qs : ''}`);
}
