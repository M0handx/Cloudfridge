const TOKEN_KEY = 'cloudfridge.token';
const USER_KEY = 'cloudfridge.user';

// Storage can throw in private windows, so reads and writes are guarded.
const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* session lasts until reload */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* nothing to clear */ }
  },
};

let token = storage.get(TOKEN_KEY);

export function loadSavedUser() {
  if (!token) return null;
  try { return JSON.parse(storage.get(USER_KEY)); } catch { return null; }
}

export function saveSession(session) {
  token = session.token;
  storage.set(TOKEN_KEY, session.token);
  storage.set(USER_KEY, JSON.stringify(session.user));
}

export function clearSession() {
  token = null;
  storage.remove(TOKEN_KEY);
  storage.remove(USER_KEY);
}

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const sentToken = token;
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(sentToken ? { Authorization: `Bearer ${sentToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', "Can't reach the server. Check your connection and try again.");
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* a load balancer error page isn't JSON */ }

  if (!res.ok) {
    // An expired session. A failed login also returns 401, but sends no token.
    if (res.status === 401 && sentToken) window.dispatchEvent(new Event('cloudfridge:unauthorized'));
    const message = data?.error?.message || 'Something went wrong. Please try again.';
    throw new ApiError(res.status, data?.error?.code || 'UNKNOWN', message);
  }
  return data;
}

export const api = {
  register: (email, password) => request('/auth/register', { method: 'POST', body: { email, password } }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  listItems: () => request('/items'),
  getItem: (id) => request(`/items/${id}`),
  createItem: (item) => request('/items', { method: 'POST', body: item }),
  updateItem: (id, changes) => request(`/items/${id}`, { method: 'PATCH', body: changes }),
  deleteItem: (id) => request(`/items/${id}`, { method: 'DELETE' }),
  getStats: () => request('/stats'),
};
