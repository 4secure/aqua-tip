import { apiClient } from './client';

export function fetchThreatActors({ after, search, motivation, sophistication } = {}) {
  const params = new URLSearchParams();

  if (after) params.set('after', after);
  if (search) params.set('search', search);
  if (motivation) params.set('motivation', motivation);
  if (sophistication) params.set('sophistication', sophistication);

  const qs = params.toString();
  return apiClient.get(`/api/threat-actors${qs ? '?' + qs : ''}`);
}
