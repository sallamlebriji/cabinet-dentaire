/* =========================================================
   Nacre — Boîte à outils UI : icônes, formats, modales,
   toasts, graphiques SVG, imagerie générée
   ========================================================= */
(function () {
  const N = window.Nacre;

  /* ---------- Icônes (traits 1.8, style minimal) ---------- */
  const P = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    stethoscope: '<path d="M5 3v5a5 5 0 0 0 10 0V3"/><path d="M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/>',
    tooth: '<path d="M12 5.5C10.5 4 8.8 3.3 7 3.5 4.3 3.8 3 6.2 3.3 9c.3 2.5 1.6 4.2 2.2 6.6.5 2 .8 5.4 2.6 5.4 1.9 0 1.7-4.3 3.9-4.3s2 4.3 3.9 4.3c1.8 0 2.1-3.4 2.6-5.4.6-2.4 1.9-4.1 2.2-6.6.3-2.8-1-5.2-3.7-5.5-1.8-.2-3.5.5-5 2Z"/>',
    clipboard: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 2.5h6v3H9zM9 11h6M9 15h4"/>',
    file: '<path d="M14 2.5H6.5A2 2 0 0 0 4.5 4.5v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8Z"/><path d="M14 2.5V8h5.5M8.5 13h7M8.5 17h5"/>',
    receipt: '<path d="M5 2.5h14v19l-2.5-1.5-2.5 1.5-2-1.5-2 1.5-2.5-1.5L5 21.5Z"/><path d="M9 7.5h6M9 11.5h6M9 15.5h3"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    scan: '<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M7 12h10"/>',
    flask: '<path d="M9 2.5h6M10 2.5v6.2L4.6 18.2A2.2 2.2 0 0 0 6.5 21.5h11a2.2 2.2 0 0 0 1.9-3.3L14 8.7V2.5"/><path d="M7.5 15h9"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    truck: '<path d="M2.5 6h11v10h-11zM13.5 9.5h4l3 3.5V16h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    message: '<path d="M21 12a8 8 0 0 1-11.8 7L3 21l2-5.6A8 8 0 1 1 21 12Z"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
    bars: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    badge: '<circle cx="12" cy="8" r="5"/><path d="M8.5 12.5 7 21l5-3 5 3-1.5-8.5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    arrowRight: '<path d="M5 12h14M13 5l7 7-7 7"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/>',
    mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 7 9 6 9-6"/>',
    map: '<path d="M12 21s-7-6-7-11.5a7 7 0 0 1 14 0C19 15 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14.5 8.5l2 2"/>',
    sparkles: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/>',
    star: '<path d="m12 2.8 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9Z"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    printer: '<path d="M6 9V2.5h12V9"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7.5H6z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    filter: '<path d="M3 4.5h18l-7 8.5v6l-4 2v-8Z"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    wallet: '<path d="M20 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15v14H5a2 2 0 0 1-2-2V5"/><circle cx="16" cy="14" r="1.3"/>',
    trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    building: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M9 21.5v-4h6v4M8 6.5h.01M12 6.5h.01M16 6.5h.01M8 10.5h.01M12 10.5h.01M16 10.5h.01M8 14.5h.01M12 14.5h.01M16 14.5h.01"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.8"/><path d="m21 15-5-5L5 21"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7Z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z"/>',
    pill: '<path d="M10.5 20.5 3.5 13.5a4.9 4.9 0 0 1 7-7l7 7a4.9 4.9 0 0 1-7 7Z"/><path d="m8.5 8.5 7 7"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9Z"/>',
    smartphone: '<rect x="5.5" y="2" width="13" height="20" rx="2.5"/><path d="M11 18h2"/>',
    whatsapp: '<path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.1Z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.3-1.8-1-.9.8c-1-.4-1.9-1.3-2.3-2.3l.8-.9-1-1.8Z"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
    grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    zoomIn: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
    zoomOut: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6"/>',
    contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18Z" fill="currentColor"/>',
    split: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M12 3v18"/>',
    home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2Z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
    signature: '<path d="M3 17c3-1 4-9 6-9s-1 9 1 9 3-5 5-5 1 3 3 3h3M3 21h18"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    fingerprint: '<path d="M12 11v3a8 8 0 0 1-1.5 4.5M8.5 7.8A5 5 0 0 1 17 11v1.5M5 11a7 7 0 0 1 1.3-4M16.8 16.5c-.3 1.5-.8 2.9-1.5 4M9 13a3 3 0 0 1 6-1.8"/>'
  };
  const icon = (name, cls = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="i ${cls}" aria-hidden="true">${P[name] || P.info}</svg>`;

  /* ---------- Formats ---------- */
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const MSHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const DSHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const nf = new Intl.NumberFormat('fr-FR');
  const fmt = {
    money: n => nf.format(Math.round(n || 0)).replace(/ | /g, ' ') + ' DH',
    num: n => nf.format(Math.round(n || 0)).replace(/ | /g, ' '),
    k: n => n >= 1e6 ? (n / 1e6).toFixed(2).replace('.', ',') + ' M' : n >= 1e3 ? Math.round(n / 1e3) + ' k' : String(Math.round(n)),
    date: s => { if (!s) return '—'; const d = N.D.parse(s.slice(0, 10)); return `${d.getDate()} ${MSHORT[d.getMonth()]} ${d.getFullYear()}`; },
    dateLong: s => { const d = N.D.parse(s.slice(0, 10)); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; },
    dayMonth: s => { const d = N.D.parse(s.slice(0, 10)); return `${d.getDate()} ${MSHORT[d.getMonth()]}`; },
    dow: s => DSHORT[N.D.parse(s).getDay()],
    month: s => { const d = N.D.parse(s.slice(0, 10)); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; },
    mshort: s => MSHORT[N.D.parse(s.slice(0, 10)).getMonth()],
    rel: s => { const n = N.D.diffDays(N.D.todayYmd(), s.slice(0, 10)); if (n === 0) return 'aujourd’hui'; if (n === 1) return 'demain'; if (n === -1) return 'hier'; if (n > 1 && n < 7) return 'dans ' + n + ' j'; if (n < 0 && n > -7) return 'il y a ' + (-n) + ' j'; return fmt.date(s); },
    ago: iso => { const d = new Date(iso); const m = Math.round((Date.now() - d) / 60000); if (m < 1) return 'à l’instant'; if (m < 60) return 'il y a ' + m + ' min'; const h = Math.round(m / 60); if (h < 24) return 'il y a ' + h + ' h'; const j = Math.round(h / 24); return j === 1 ? 'hier' : 'il y a ' + j + ' j'; },
    time: iso => { const d = new Date(iso); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); },
    hShort: t => t.replace(':', 'h'),
    pct: n => (Math.round(n * 10) / 10).toString().replace('.', ',') + ' %',
    MONTHS, DAYS, MSHORT, DSHORT
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = (f, l) => ((f || '')[0] || '') + ((l || '')[0] || '');
  const avatar = (p, size = '') => p ? `<span class="avatar ${size}" style="background:${p.avatar || p.color || '#2C6BCB'}">${esc(initials(p.first, p.last).toUpperCase())}</span>` : '';

  const METHOD = { especes: 'Espèces', carte: 'Carte', virement: 'Virement', en_ligne: 'Paiement en ligne', cheque: 'Chèque' };
  const INV_ST = { payee: ['Payée', 'st-termine'], partielle: ['Partielle', 'st-attente'], impayee: ['À régler', 'st-confirme'], retard: ['En retard', 'st-noshow'], retard_partiel: ['Retard (partiel)', 'st-noshow'] };
  const badge = (label, cls, dot = true) => `<span class="badge ${cls}">${dot ? '<i class="b-dot"></i>' : ''}${esc(label)}</span>`;
  const stBadge = s => { const x = N.S.status[s]; return x ? badge(x.label, x.cls) : ''; };

  /* ---------- Toasts ---------- */
  function toast(msg, ico = 'check') {
    let box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = `<span class="ti">${icon(ico)}</span><span>${msg}</span>`;
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3200);
  }

  /* ---------- Modales ---------- */
  function modal({ title, body, foot = '', size = '', drawer = false, onMount, onClose }) {
    const ov = document.createElement('div');
    ov.className = 'overlay' + (drawer ? ' drawer' : '');
    ov.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h3>${title}</h3><button class="btn ghost icon sm" data-close aria-label="Fermer">${icon('x')}</button></div><div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
    const close = () => { ov.remove(); document.removeEventListener('keydown', esc_); onClose && onClose(); };
    const esc_ = e => { if (e.key === 'Escape') close(); };
    ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
    ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    document.addEventListener('keydown', esc_);
    document.body.appendChild(ov);
    const el = ov.querySelector('.modal');
    el.close = close;
    const first = el.querySelector('input:not([type=hidden]),select,textarea');
    if (first && !drawer) setTimeout(() => first.focus(), 60);
    onMount && onMount(el, close);
    return el;
  }
  function confirmBox(title, text, okLabel = 'Confirmer', danger = false) {
    return new Promise(res => {
      const m = modal({ title, body: `<p class="muted">${text}</p>`, foot: `<button class="btn" data-close>Annuler</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${okLabel}</button>`, onClose: () => res(false) });
      m.querySelector('[data-ok]').onclick = () => { res(true); m.close(); };
    });
  }
  const formData = el => { const o = {}; el.querySelectorAll('[name]').forEach(i => { if (i.type === 'checkbox') o[i.name] = i.checked; else o[i.name] = i.value; }); return o; };

  /* ---------- Dropdown ---------- */
  function dropdown(anchor, html, { align = 'left', cls = '' } = {}) {
    document.querySelectorAll('.dropdown').forEach(d => d.remove());
    const r = anchor.getBoundingClientRect();
    const dd = document.createElement('div'); dd.className = 'dropdown ' + cls; dd.innerHTML = html;
    document.body.appendChild(dd);
    const w = dd.offsetWidth;
    let left = align === 'right' ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    dd.style.left = left + 'px'; dd.style.top = (r.bottom + 6 + window.scrollY) + 'px';
    dd.style.position = 'absolute';
    setTimeout(() => { const off = e => { if (!dd.contains(e.target)) { dd.remove(); document.removeEventListener('mousedown', off); } }; document.addEventListener('mousedown', off); }, 0);
    dd.addEventListener('click', e => { if (e.target.closest('[data-dd-close]')) dd.remove(); });
    return dd;
  }

  /* ---------- Graphiques SVG ---------- */
  let chartId = 0;
  function tipBind(root) {
    root.querySelectorAll('.chart').forEach(ch => {
      const tip = ch.querySelector('.chart-tip'); if (!tip) return;
      ch.querySelectorAll('[data-tip]').forEach(el => {
        el.addEventListener('mouseenter', () => { tip.innerHTML = el.getAttribute('data-tip'); tip.style.opacity = 1; });
        el.addEventListener('mousemove', e => { const r = ch.getBoundingClientRect(); tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; });
        el.addEventListener('mouseleave', () => { tip.style.opacity = 0; });
      });
    });
  }
  function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
  function barChart({ labels, series, height = 220, stacked = false, fmtV = fmt.num, colors }) {
    const W = 640, H = height, pl = 44, pr = 8, pt = 10, pb = 26;
    const cw = W - pl - pr, chh = H - pt - pb;
    const totals = labels.map((_, i) => stacked ? series.reduce((s, x) => s + x.data[i], 0) : Math.max(...series.map(x => x.data[i])));
    const max = niceMax(Math.max(...totals));
    const gw = cw / labels.length; const bw = Math.min(28, gw * (stacked ? .56 : .7 / series.length));
    let g = '';
    for (let i = 0; i <= 4; i++) { const y = pt + chh - chh * i / 4; g += `<line class="grid-line" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text class="axis-label" x="${pl - 8}" y="${y + 3.5}" text-anchor="end">${fmt.k(max * i / 4)}</text>`; }
    labels.forEach((l, i) => {
      const cx = pl + gw * i + gw / 2; let acc = 0;
      series.forEach((s, si) => {
        const v = s.data[i]; const h = chh * v / max;
        const x = stacked ? cx - bw / 2 : cx - (bw * series.length) / 2 + si * bw + 1;
        const y = pt + chh - h - (stacked ? chh * acc / max : 0);
        const r = Math.min(5, bw / 2, h);
        const col = s.color || (colors && colors[si]);
        const tip = `${esc(l)} · ${esc(s.name)}<br><b>${fmtV(v)}</b>`;
        g += `<path class="bar" data-tip="${tip.replace(/"/g, '&quot;')}" fill="${col}" d="M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + (stacked ? bw : bw - 2) - r} Q${x + (stacked ? bw : bw - 2)},${y} ${x + (stacked ? bw : bw - 2)},${y + r} V${y + h} Z"/>`;
        acc += v;
      });
      if (labels.length <= 14 || i % 2 === 0) g += `<text class="axis-label" x="${cx}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>`;
    });
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px">${g}</svg><div class="chart-tip"></div></div>`;
  }
  function lineChart({ labels, series, height = 220, fmtV = fmt.num, area = true, min0 = true }) {
    const W = 640, H = height, pl = 44, pr = 12, pt = 12, pb = 26; const id = 'lg' + (++chartId);
    const cw = W - pl - pr, chh = H - pt - pb;
    const all = series.flatMap(s => s.data); const max = niceMax(Math.max(...all) * 1.05); const mn = min0 ? 0 : Math.floor(Math.min(...all) * .9);
    const X = i => pl + (labels.length === 1 ? cw / 2 : cw * i / (labels.length - 1)); const Y = v => pt + chh - chh * (v - mn) / (max - mn);
    let g = `<defs>${series.map((s, si) => `<linearGradient id="${id}-${si}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".22"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient>`).join('')}</defs>`;
    for (let i = 0; i <= 4; i++) { const v = mn + (max - mn) * i / 4; const y = Y(v); g += `<line class="grid-line" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text class="axis-label" x="${pl - 8}" y="${y + 3.5}" text-anchor="end">${fmt.k(v)}</text>`; }
    series.forEach((s, si) => {
      const pts = s.data.map((v, i) => [X(i), Y(v)]);
      const d = pts.map((p, i) => { if (!i) return `M${p[0]},${p[1]}`; const q = pts[i - 1]; const mx = (q[0] + p[0]) / 2; return `C${mx},${q[1]} ${mx},${p[1]} ${p[0]},${p[1]}`; }).join(' ');
      if (area && si === 0) g += `<path d="${d} L${pts[pts.length - 1][0]},${pt + chh} L${pts[0][0]},${pt + chh} Z" fill="url(#${id}-${si})"/>`;
      g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.2" ${s.dash ? 'stroke-dasharray="5 5"' : ''} stroke-linecap="round"/>`;
      pts.forEach((p, i) => g += `<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="#fff" stroke="${s.color}" stroke-width="2"/><rect data-tip="${esc(labels[i])} · ${esc(s.name)}<br><b>${fmtV(s.data[i])}</b>" x="${p[0] - cw / labels.length / 2}" y="${pt}" width="${cw / labels.length}" height="${chh}" fill="transparent"/>`);
    });
    labels.forEach((l, i) => { if (labels.length <= 12 || i % 2 === 0) g += `<text class="axis-label" x="${X(i)}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>`; });
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px">${g}</svg><div class="chart-tip"></div></div>`;
  }
  function donut({ data, size = 170, thick = 20, center = '', sub = '', fmtV = fmt.num }) {
    const tot = data.reduce((s, d) => s + d.value, 0) || 1; const r = (size - thick) / 2; const c = 2 * Math.PI * r; let off = 0;
    const arcs = data.map(d => { const len = c * d.value / tot; const gap = data.length > 1 ? 2 : 0; const s = `<circle data-tip="${esc(d.label)}<br><b>${fmtV(d.value)}</b> · ${Math.round(d.value / tot * 100)} %" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${d.color}" stroke-width="${thick}" stroke-dasharray="${Math.max(0, len - gap)} ${c}" stroke-dashoffset="${-off}" transform="rotate(-90 ${size / 2} ${size / 2})" style="cursor:pointer"/>`; off += len; return s; }).join('');
    const legend = `<div class="col gap-6" style="flex:1;min-width:150px">${data.map(d => `<div class="row between small"><span class="row gap-6"><i style="width:9px;height:9px;border-radius:3px;background:${d.color};display:inline-block"></i>${esc(d.label)}</span><b class="mono">${fmtV(d.value)}</b></div>`).join('')}</div>`;
    return `<div class="donut-wrap"><div class="chart" style="width:${size}px;flex:none"><svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#EEF1F5" stroke-width="${thick}"/>${arcs}<text x="50%" y="${size / 2 + (sub ? 0 : 7)}" text-anchor="middle" class="donut-center">${center}</text>${sub ? `<text x="50%" y="${size / 2 + 18}" text-anchor="middle" class="axis-label">${sub}</text>` : ''}</svg><div class="chart-tip"></div></div>${legend}</div>`;
  }
  function spark(data, color = '#2C6BCB', w = 84, h = 30) {
    const max = Math.max(...data), min = Math.min(...data); const X = i => i * w / (data.length - 1); const Y = v => h - 2 - (h - 4) * (v - min) / ((max - min) || 1);
    const d = data.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${d} L${w},${h} L0,${h} Z" fill="${color}" opacity=".08"/><path d="${d}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  function hbars(rows, { color = '#2C6BCB', fmtV = fmt.num } = {}) {
    const max = Math.max(...rows.map(r => r.value)) || 1;
    return `<div class="col" style="gap:12px">${rows.map(r => `<div><div class="row between small mb-8" style="margin-bottom:5px"><span class="row gap-6">${r.dot ? `<i style="width:8px;height:8px;border-radius:50%;background:${r.dot};display:inline-block"></i>` : ''}${esc(r.label)}</span><b class="mono">${fmtV(r.value)}</b></div><div class="progress"><i style="width:${r.value / max * 100}%;background:${r.color || color}"></i></div></div>`).join('')}</div>`;
  }

  /* ---------- Imagerie générée (démo, pas de vraies images patient) ---------- */
  function rng(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function toothRow(cx, cy, w, n, up, r, bright = 1) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = cx - w / 2 + (i + .5) * w / n; const k = Math.abs(i - (n - 1) / 2) / (n / 2); const y = cy + (up ? -1 : 1) * k * k * 38;
      const tw = w / n * (k > .55 ? 1.05 : .82); const th = 52 - k * 8; const root = 44 - k * 6;
      const op = (.55 + r() * .25) * bright;
      const cy2 = up ? y - th : y;
      s += `<rect x="${x - tw / 2}" y="${cy2}" width="${tw}" height="${th}" rx="${tw / 3}" fill="rgba(235,240,245,${op})"/>`;
      s += `<path d="M${x - tw / 4},${up ? cy2 : cy2 + th} L${x - tw / 7},${up ? cy2 - root : cy2 + th + root} L${x + tw / 7},${up ? cy2 - root : cy2 + th + root} L${x + tw / 4},${up ? cy2 : cy2 + th} Z" fill="rgba(200,210,222,${op * .6})"/>`;
      if (r() < .12) s += `<rect x="${x - tw / 4}" y="${cy2 + th * .2}" width="${tw / 2}" height="${th / 3}" rx="3" fill="rgba(255,255,255,.95)"/>`;
    }
    return s;
  }
  function xray(kind = 'pano', seed = 1) {
    const r = rng(seed + 7); const id = 'x' + seed + kind;
    const filt = `<defs><radialGradient id="${id}g" cx="50%" cy="50%" r="65%"><stop offset="0" stop-color="#3A4656"/><stop offset=".6" stop-color="#18202B"/><stop offset="1" stop-color="#070B10"/></radialGradient><filter id="${id}b"><feGaussianBlur stdDeviation="1.6"/></filter></defs>`;
    if (kind === 'pano' || kind === 'cbct') {
      return `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">${filt}<rect width="640" height="360" fill="url(#${id}g)"/><g filter="url(#${id}b)"><path d="M40,210 Q320,380 600,210 L600,250 Q320,420 40,250 Z" fill="rgba(200,210,220,.25)"/><path d="M60,120 Q320,40 580,120 L580,95 Q320,10 60,95 Z" fill="rgba(200,210,220,.2)"/>${toothRow(320, 170, 440, 14, true, r)}${toothRow(320, 190, 420, 14, false, r)}<ellipse cx="80" cy="120" rx="28" ry="40" fill="rgba(210,220,230,.18)"/><ellipse cx="560" cy="120" rx="28" ry="40" fill="rgba(210,220,230,.18)"/></g><text x="16" y="342" fill="rgba(255,255,255,.55)" font-family="Inter,sans-serif" font-size="11">${kind === 'cbct' ? 'CBCT' : 'PANORAMIQUE'} · R</text><text x="624" y="342" fill="rgba(255,255,255,.55)" font-family="Inter,sans-serif" font-size="11" text-anchor="end">L</text></svg>`;
    }
    if (kind === 'ceph') {
      return `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">${filt}<rect width="640" height="360" fill="url(#${id}g)"/><g filter="url(#${id}b)" fill="rgba(210,220,230,.28)"><path d="M250,30 C420,10 520,90 520,170 C520,230 480,250 470,280 C460,320 420,340 380,330 L330,320 C300,300 300,260 280,240 C230,220 190,160 200,100 C205,60 220,40 250,30Z"/><path d="M380,230 L470,240 L460,262 L380,255Z" fill="rgba(240,245,250,.5)"/><path d="M380,262 L455,268 L445,290 L380,285Z" fill="rgba(240,245,250,.45)"/></g><text x="16" y="342" fill="rgba(255,255,255,.55)" font-family="Inter,sans-serif" font-size="11">TÉLÉRADIOGRAPHIE DE PROFIL</text></svg>`;
    }
    // retro / bitewing
    const n = kind === 'bitewing' ? 4 : 3;
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = 120 + i * (400 / (n - 1 || 1)) - (n === 3 ? 0 : 0); const tw = kind === 'bitewing' ? 110 : 120;
      if (kind === 'bitewing') { s += `<rect x="${x - tw / 2}" y="60" width="${tw}" height="100" rx="30" fill="rgba(230,236,242,.6)"/><rect x="${x - tw / 2}" y="200" width="${tw}" height="100" rx="30" fill="rgba(230,236,242,.55)"/>`; if (r() < .4) s += `<rect x="${x - 20}" y="70" width="40" height="30" rx="6" fill="#fff"/>`; }
      else { s += `<rect x="${x - tw / 2}" y="50" width="${tw}" height="120" rx="40" fill="rgba(230,236,242,.6)"/><path d="M${x - 35},170 L${x - 20},330 L${x - 5},170 M${x + 5},170 L${x + 20},330 L${x + 35},170" stroke="rgba(210,220,230,.5)" stroke-width="22" fill="none" stroke-linecap="round"/>`; if (i === 1 && seed % 2) s += `<path d="M${x - 20},175 L${x - 18},320 M${x + 20},175 L${x + 18},320" stroke="#fff" stroke-width="5"/><rect x="${x - 30}" y="80" width="60" height="50" rx="10" fill="rgba(255,255,255,.9)"/>`; }
    }
    return `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">${filt}<rect width="640" height="360" fill="url(#${id}g)"/><g filter="url(#${id}b)"><rect x="0" y="175" width="640" height="190" fill="rgba(160,170,180,.14)"/>${s}</g><text x="16" y="342" fill="rgba(255,255,255,.55)" font-family="Inter,sans-serif" font-size="11">${kind === 'bitewing' ? 'BITEWING' : 'RÉTRO-ALVÉOLAIRE'}</text></svg>`;
  }
  function smile(shade = '#F4EEDF', seed = 1, crowd = false) {
    const r = rng(seed + 3); const id = 's' + seed + shade.slice(1);
    let teeth = '';
    const widths = [30, 36, 42, 54, 54, 42, 36, 30];
    let x = 320 - widths.reduce((a, b) => a + b, 0) / 2;
    widths.forEach((w, i) => { const dy = crowd ? (r() - .5) * 18 : 0; const rot = crowd ? (r() - .5) * 14 : 0; teeth += `<rect x="${x + 1}" y="${150 + Math.abs(i - 3.5) * 4 + dy}" width="${w - 2}" height="${74 - Math.abs(i - 3.5) * 5}" rx="12" fill="${shade}" stroke="rgba(160,130,90,.25)" transform="rotate(${rot} ${x + w / 2} 190)"/>`; x += w; });
    let low = ''; x = 320 - 170;
    [34, 38, 38, 34, 34, 38, 38, 34].forEach((w, i) => { low += `<rect x="${x + 1}" y="${226 + (crowd ? (r() - .5) * 10 : 0)}" width="${w - 2}" height="46" rx="10" fill="${shade}" opacity=".92" stroke="rgba(160,130,90,.2)"/>`; x += w; });
    return `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="${id}sk" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#C98E73"/><stop offset="1" stop-color="#8E5A45"/></radialGradient><linearGradient id="${id}li" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B8615C"/><stop offset="1" stop-color="#8F3F3E"/></linearGradient></defs><rect width="640" height="360" fill="url(#${id}sk)"/><path d="M120,190 Q320,90 520,190 Q320,330 120,190Z" fill="#3A1616"/><path d="M150,178 Q320,130 490,178 L490,200 Q320,150 150,200Z" fill="#D98B8B"/>${teeth}${low}<path d="M110,190 Q320,70 530,190 Q320,140 110,190Z" fill="url(#${id}li)"/><path d="M110,190 Q320,350 530,190 Q320,300 110,190Z" fill="url(#${id}li)"/></svg>`;
  }
  function intra(seed = 1) { return smile('#F1E8D2', seed, false); }
  function scan3d(seed = 1) {
    const r = rng(seed); let s = '';
    for (let i = 0; i < 14; i++) { const a = Math.PI * (i / 13); const x = 320 - Math.cos(a) * 200; const y = 250 - Math.sin(a) * 150; s += `<ellipse cx="${x}" cy="${y}" rx="${18 + (i > 3 && i < 10 ? 0 : 6)}" ry="22" fill="url(#sc${seed})" stroke="rgba(120,160,200,.6)"/>`; }
    return `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="sc${seed}" cx="35%" cy="30%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#9DB9D6"/></radialGradient><linearGradient id="scb${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0F1E36"/><stop offset="1" stop-color="#1E3F78"/></linearGradient></defs><rect width="640" height="360" fill="url(#scb${seed})"/><path d="M110,260 Q320,20 530,260 Q320,120 110,260Z" fill="rgba(230,150,160,.35)" stroke="rgba(255,255,255,.2)"/>${s}<text x="16" y="342" fill="rgba(255,255,255,.6)" font-family="Inter,sans-serif" font-size="11">EMPREINTE OPTIQUE · STL</text></svg>`;
  }
  function pdfThumb(title = 'Document') {
    return `<svg viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg"><rect width="640" height="480" fill="#EEF1F5"/><rect x="190" y="40" width="260" height="400" rx="8" fill="#fff" stroke="#D8DEE6"/><rect x="215" y="70" width="80" height="12" rx="3" fill="#12264A"/><rect x="215" y="100" width="210" height="6" rx="3" fill="#D8DEE6"/><rect x="215" y="116" width="180" height="6" rx="3" fill="#D8DEE6"/><rect x="215" y="150" width="210" height="6" rx="3" fill="#E7EBF0"/><rect x="215" y="166" width="200" height="6" rx="3" fill="#E7EBF0"/><rect x="215" y="182" width="170" height="6" rx="3" fill="#E7EBF0"/><rect x="215" y="220" width="210" height="60" rx="6" fill="#F6F7F9"/><rect x="330" y="380" width="95" height="30" rx="4" fill="#EEF4FC"/><rect x="380" y="52" width="50" height="22" rx="4" fill="#CF4759"/><text x="405" y="67" fill="#fff" font-family="Inter,sans-serif" font-size="11" text-anchor="middle" font-weight="700">PDF</text></svg>`;
  }
  function media(doc) {
    if (doc.src) return `<img src="${doc.src}" alt="${esc(doc.title)}">`;
    switch (doc.kind) {
      case 'intra': return intra(doc.seed);
      case 'scan': return scan3d(doc.seed);
      case 'pdf': return pdfThumb(doc.title);
      default: return xray(doc.kind, doc.seed);
    }
  }

  N.ui = { icon, fmt, esc, avatar, initials, badge, stBadge, toast, modal, confirmBox, formData, dropdown, barChart, lineChart, donut, spark, hbars, tipBind, xray, smile, media, METHOD, INV_ST };
})();
