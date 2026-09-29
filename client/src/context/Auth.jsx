import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { get, post, getClinic, setClinic as storeClinic } from '../lib/api';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [state, setState] = useState({ status: 'loading', me: null, meta: null, notice: '' });
  const [clinic, setClinicState] = useState(getClinic());

  const load = useCallback(async () => {
    try {
      const me = await get('/auth/me');
      let c = getClinic();
      if (!c || (c !== 'all' && !me.allowedClinics.includes(c))) { c = me.user.clinicId === 'all' ? me.allowedClinics[0] : me.user.clinicId; storeClinic(c); setClinicState(c); }
      const meta = await get('/meta');
      setState({ status: 'in', me, meta, notice: '' });
    } catch (e) { setState(s => ({ status: 'out', me: null, meta: null, notice: s.notice })); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const h = e => { setState({ status: 'out', me: null, meta: null, notice: e.detail || 'Session expirée' }); qc.clear(); }; window.addEventListener('nacre:unauthorized', h); return () => window.removeEventListener('nacre:unauthorized', h); }, [qc]);

  const value = useMemo(() => {
    const perms = new Set(state.me ? state.me.perms : []);
    const meta = state.meta;
    return {
      ...state, clinic, reload: load,
      can: p => perms.has(p),
      setClinic: c => { storeClinic(c); setClinicState(c); qc.invalidateQueries(); },
      logout: async () => { try { await post('/auth/logout'); } catch { /* déjà déconnecté */ } qc.clear(); setState({ status: 'out', me: null, meta: null, notice: '' }); },
      staff: id => meta && meta.staff.find(s => s.id === id),
      clinicById: id => meta && meta.clinics.find(c => c.id === id),
      types: meta ? meta.types : {},
      dentists: meta ? meta.staff.filter(s => s.role === 'dentiste' && (clinic === 'all' ? state.me.allowedClinics.includes(s.clinicId) : s.clinicId === clinic)) : [],
      allDentists: meta ? meta.staff.filter(s => s.role === 'dentiste') : []
    };
  }, [state, clinic, load, qc]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
