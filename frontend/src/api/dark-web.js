import { apiClient } from './client';

/**
 * Start a dark web breach search.
 * Returns { task_id, credits }.
 */
export function startDarkWebSearch({ query, type }) {
  return apiClient.post('/api/dark-web/search', { query, type });
}

/**
 * Poll the status of an in-progress dark web search.
 * Returns { status: 'PENDING'|'PROCESSING'|'SUCCESS'|'ERROR', data: { found, results } }.
 */
export function checkDarkWebStatus(taskId) {
  return apiClient.get(`/api/dark-web/status/${encodeURIComponent(taskId)}`);
}

/**
 * Fetch current credit balance.
 */
export function fetchCredits() {
  return apiClient.get('/api/credits');
}
