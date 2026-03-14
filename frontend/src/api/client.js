const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

async function request(method, url, data) {
  const headers = {
    'Accept': 'application/json',
  };

  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  const xsrfToken = getCookie('XSRF-TOKEN');
  if (xsrfToken) {
    headers['X-XSRF-TOKEN'] = xsrfToken;
  }

  const config = {
    method,
    headers,
    credentials: 'include',
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${BASE_URL}${url}`, config);

  if (response.status === 204) {
    return null;
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const error = {
      status: response.status,
      message: body?.message || 'Something went wrong',
      errors: body?.errors || null,
      credits: body?.credits || null,
    };
    throw error;
  }

  return body;
}

export const apiClient = {
  get: (url) => request('GET', url),
  post: (url, data) => request('POST', url, data),
};

export function csrfCookie() {
  return fetch(`${BASE_URL}/sanctum/csrf-cookie`, {
    credentials: 'include',
  });
}
