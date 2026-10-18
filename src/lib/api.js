import axios from 'axios';

export const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');
const BASE = `${API_ORIGIN}/api/v1`;

const KEYS = { access: 'foodie_access', refresh: 'foodie_refresh' };
export const tokens = {
  get access() { return localStorage.getItem(KEYS.access); },
  get refresh() { return localStorage.getItem(KEYS.refresh); },
  set({ access, refresh }) {
    if (access) localStorage.setItem(KEYS.access, access);
    if (refresh) localStorage.setItem(KEYS.refresh, refresh);
  },
  clear() {
    localStorage.removeItem(KEYS.access);
    localStorage.removeItem(KEYS.refresh);
  },
};

/** Turn "/uploads/products/x.jpg" into a full URL served by the backend. */
export const imgUrl = (src) => (!src ? '' : /^https?:\/\//.test(src) ? src : `${API_ORIGIN}${src.startsWith('/') ? '' : '/'}${src}`);

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  if (tokens.access) config.headers.Authorization = `Bearer ${tokens.access}`;
  return config;
});

/** Build a consistent error from either an HTTP error or an error envelope. */
function toApiError(status, body, fallback) {
  const err = new Error(body?.message || fallback || 'Something went wrong');
  err.status = status;
  err.details = body?.details || null; // { field: message }
  err.body = body;
  return err;
}

// The backend returns validation / access-denied errors as HTTP 200 with
// { code: 400|401, message, details } in the body, so check the body too.
api.interceptors.response.use(
  (res) => {
    const d = res.data;
    if (d && typeof d === 'object' && typeof d.code === 'number' && d.code >= 400) {
      return Promise.reject(Object.assign(toApiError(d.code, d), { config: res.config }));
    }
    return res;
  },
  (error) => {
    if (error.status) return Promise.reject(error); // already converted above
    const status = error.response?.status;
    const body = error.response?.data;
    const e = toApiError(status, body, error.message === 'Network Error' ? 'Cannot reach the server. Is the Spring Boot API running?' : error.message);
    e.config = error.config;
    return Promise.reject(e);
  }
);

let refreshing = null;
async function refreshTokens() {
  if (!tokens.refresh) throw new Error('No refresh token');
  if (!refreshing) {
    refreshing = axios
      .post(`${BASE}/auth/refresh`, { refresh: tokens.refresh })
      .then((r) => {
        const p = r.data?.payload;
        if (!p?.access) throw new Error('Refresh failed');
        tokens.set(p);
      })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

// Retry once after refreshing the access token on 401.
api.interceptors.response.use(undefined, async (err) => {
  const cfg = err.config;
  const isAuthCall = cfg?.url?.startsWith('/auth/');
  if (err.status === 401 && cfg && !cfg._retry && !isAuthCall && err.message !== 'Access denied') {
    cfg._retry = true;
    try {
      await refreshTokens();
      return api(cfg);
    } catch {
      tokens.clear();
      window.dispatchEvent(new Event('foodie:logout'));
    }
  }
  return Promise.reject(err);
});

/** Pull the useful part out of a response. Some endpoints are wrapped, some are raw. */
export const data = (res) => (res.data && typeof res.data === 'object' && 'payload' in res.data ? res.data.payload : res.data);
export const paged = (res) => res.data; // { payload, page, size, totalElements, totalPages, ... }

export default api;
