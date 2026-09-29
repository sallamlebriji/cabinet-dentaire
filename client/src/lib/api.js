import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/* Cabinet sélectionné (vue par établissement ou consolidée) — envoyé à chaque requête */
const CLINIC_KEY = 'nacre.clinic';
export const getClinic = () => { try { return localStorage.getItem(CLINIC_KEY) || ''; } catch { return ''; } };
export const setClinic = v => { try { localStorage.setItem(CLINIC_KEY, v); } catch { /* stockage indisponible */ } };

export const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 60000 });
api.interceptors.request.use(cfg => { const c = getClinic(); if (c) cfg.headers['X-Clinic'] = c; return cfg; });
api.interceptors.response.use(r => r, err => {
  const status = err.response && err.response.status;
  const message = (err.response && err.response.data && err.response.data.error) || (status ? `Erreur ${status}` : 'Serveur injoignable');
  const e = new Error(message); e.status = status; e.data = err.response && err.response.data;
  if (status === 401 && !err.config.url.startsWith('/auth') && !err.config.url.startsWith('/portal') && !err.config.url.startsWith('/public')) window.dispatchEvent(new CustomEvent('nacre:unauthorized', { detail: message }));
  return Promise.reject(e);
});

export const get = (url, params) => api.get(url, { params }).then(r => r.data);
export const post = (url, body) => api.post(url, body).then(r => r.data);
export const patch = (url, body) => api.patch(url, body).then(r => r.data);
export const put = (url, body) => api.put(url, body).then(r => r.data);
export const del = url => api.delete(url).then(r => r.data);
export const upload = (url, formData) => api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);

/** Lecture avec cache ; la clé inclut le cabinet sélectionné */
export function useGet(url, params, opts = {}) {
  const { enabled = true, ...rest } = opts;
  return useQuery({ queryKey: [url, params || null, getClinic()], queryFn: () => get(url, params), ...rest, enabled: !!url && !!enabled });
}
/** Exécute une écriture puis rafraîchit les données affichées */
export function useAction() {
  const qc = useQueryClient();
  return useCallback(async (fn, { invalidate = true } = {}) => { const r = await fn(); if (invalidate) await qc.invalidateQueries(); return r; }, [qc]);
}
