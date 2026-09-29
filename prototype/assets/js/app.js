/* =========================================================
   Nacre — Shell applicatif : routeur, navigation, RBAC,
   recherche globale, notifications, modales partagées
   ========================================================= */
(function () {
  const N = window.Nacre, D = N.D;
  const { icon, fmt, esc, avatar, badge, stBadge, toast, modal, formData, dropdown } = N.ui;
  const views = {}, actions = {};
  let cur = { name: '', params: [] };

  const NAV = [
    ['Pilotage', [['dashboard', 'Dashboard', 'dashboard'], ['analytics', 'Analytics', 'chart', 'analytics.view']]],
    ['Patientèle', [['patients', 'Patients', 'users', 'patients.view'], ['agenda', 'Agenda', 'calendar', 'agenda.view'], ['consultations', 'Consultations', 'stethoscope', 'clinical.view'], ['odontogramme', 'Odontogramme', 'tooth', 'clinical.view'], ['plans', 'Plans de traitement', 'clipboard', 'patients.view'], ['orthodontie', 'Orthodontie', 'activity', 'clinical.view']]],
    ['Finance', [['devis', 'Devis', 'file', 'finance.view'], ['facturation', 'Facturation', 'receipt', 'finance.view'], ['paiements', 'Paiements', 'card', 'finance.view']]],
    ['Dossiers', [['documents', 'Documents', 'folder', 'patients.view'], ['radiographies', 'Radiographies', 'scan', 'clinical.view']]],
    ['Opérations', [['laboratoire', 'Laboratoire', 'flask', 'lab.manage'], ['stock', 'Stock', 'box', 'stock.manage'], ['fournisseurs', 'Fournisseurs', 'truck', 'stock.manage']]],
    ['Relation patient', [['communication', 'Communication', 'message', 'comm.send'], ['suivis', 'Suivis', 'repeat', 'agenda.view'], ['avis', 'Avis & satisfaction', 'star', 'patients.view']]],
    ['Administration', [['personnel', 'Personnel', 'badge', 'staff.manage'], ['parametres', 'Paramètres', 'settings', 'settings.manage']]]
  ];
  const NAV_FLAT = NAV.flatMap(g => g[1]);

  /* ---------- Compteurs de navigation ---------- */
  function counts() {
    const S = N.S, t = D.todayYmd();
    const unread = S.messages.filter(m => m.dir === 'in' && m.status === 'non_lu' && N.inClinic(N.patient(m.patient))).length;
    const stockLow = S.stock.filter(s => N.inClinic(s) && s.qty <= s.min).length;
    const labReady = S.labCases.filter(l => N.inClinic(l) && l.status === 'pret').length;
    const today = S.appts.filter(a => a.date === t && N.inClinic(a) && a.status !== 'annule').length;
    const fu = S.followups.filter(f => f.status !== 'fait' && f.due <= t && N.inClinic(N.patient(f.patient))).length;
    return { agenda: [today], communication: [unread, true], stock: [stockLow, true], laboratoire: [labReady, true], suivis: [fu, true] };
  }

  /* ---------- Shell ---------- */
  function shell() {
    const S = N.S; const me = N.me(); const cl = S.session.clinic;
    const clinicName = cl === 'all' ? 'Tous les cabinets' : N.clinic(cl).name;
    document.getElementById('app').innerHTML = `
    <div class="shell" id="shell">
      <aside class="sidebar" aria-label="Navigation principale">
        <div class="brand"><div class="brand-mark">${icon('tooth')}</div><div><div class="brand-name">Nacre</div><div class="brand-sub">Dental OS</div></div></div>
        <div class="clinic-switch" data-act="clinicMenu" role="button" tabindex="0">
          <div class="clinic-dot">${icon(cl === 'all' ? 'layers' : 'building')}</div>
          <div class="grow"><div class="xs faint">${esc(S.settings.group)}</div><div style="font-weight:600;font-size:13px" class="truncate">${esc(clinicName)}</div></div>
          ${icon('chevronDown', 'faint')}
        </div>
        <nav class="nav" id="nav"></nav>
        <div class="sidebar-foot">
          <div class="upgrade"><div class="row gap-6" style="margin-bottom:4px">${icon('sparkles')}<b>Plan Clinique</b></div><div style="opacity:.8">3 sites · 11 utilisateurs · IA incluse</div></div>
        </div>
      </aside>
      <div class="scrim" data-act="closeNav"></div>
      <div class="main">
        <header class="topbar" id="topbar">
          <button class="icon-btn menu-btn" data-act="openNav" aria-label="Menu">${icon('menu')}</button>
          <div class="search">${icon('search')}<input id="gsearch" placeholder="Rechercher un patient, un dossier, un module…" autocomplete="off" aria-label="Recherche globale"><span class="kbd">Ctrl K</span></div>
          <div class="top-actions">
            ${N.can('agenda.manage') ? `<button class="btn primary hide-sm" data-act="newAppt">${icon('plus')}Nouveau RDV</button>` : ''}
            <button class="icon-btn" data-act="notifs" aria-label="Notifications">${icon('bell')}<span class="dot" id="notif-dot"></span></button>
            <div class="user-chip" data-act="userMenu" role="button" tabindex="0">${avatar(me, 'sm')}<div class="who"><b>${esc(N.name(me))}</b><span>${esc(S.roles[S.session.role])}</span></div>${icon('chevronDown', 'faint hide-md')}</div>
          </div>
        </header>
        <main class="content" id="content"></main>
      </div>
      <nav class="bottom-bar" aria-label="Navigation mobile">
        <a href="#/agenda" data-bb="agenda">${icon('calendar')}Agenda</a>
        <a href="#/patients" data-bb="patients">${icon('users')}Patients</a>
        <a href="javascript:void 0" data-act="newAppt"><span class="plus">${icon('plus')}</span></a>
        <a href="#/paiements" data-bb="paiements">${icon('wallet')}Paiements</a>
        <a href="#/dashboard" data-bb="dashboard">${icon('dashboard')}Accueil</a>
      </nav>
    </div>`;
    navRender(); bindSearch();
    window.addEventListener('scroll', () => document.getElementById('topbar')?.classList.toggle('scrolled', scrollY > 4), { passive: true });
  }
  function navRender() {
    const c = counts();
    document.getElementById('nav').innerHTML = NAV.map(([g, items]) => `<div class="nav-group">${g}</div>` + items.map(([id, label, ic, perm]) => {
      const locked = perm && !N.can(perm); const cnt = c[id];
      return `<a href="#/${id}" data-nav="${id}" class="${cur.name === id ? 'active' : ''} ${locked ? 'locked' : ''}">${icon(ic)}<span>${label}</span>${locked ? `<span class="count">${icon('lock').replace('<svg', '<svg style="width:11px;height:11px"')}</span>` : cnt && cnt[0] ? `<span class="count ${cnt[1] ? 'alert' : ''}">${cnt[0]}</span>` : ''}</a>`;
    }).join('')).join('');
    const dot = document.getElementById('notif-dot'); if (dot) dot.style.display = N.S.notifications.some(n => !n.read) ? '' : 'none';
    document.querySelectorAll('[data-bb]').forEach(a => a.classList.toggle('on', a.dataset.bb === cur.name));
  }

  /* ---------- Routeur ---------- */
  function route() {
    const h = location.hash.replace(/^#\/?/, '') || 'dashboard';
    const [name, ...params] = h.split('/').map(decodeURIComponent);
    const changed = name !== cur.name || params.join('/') !== cur.params.join('/');
    cur = { name: views[name] ? name : 'dashboard', params };
    document.getElementById('shell').classList.remove('nav-open');
    render();
    if (changed) window.scrollTo(0, 0);
  }
  function render() {
    const v = views[cur.name]; const el = document.getElementById('content'); if (!v) return;
    const navItem = NAV_FLAT.find(n => n[0] === cur.name);
    const perm = v.perm || (navItem && navItem[3]);
    if (perm && !N.can(perm)) el.innerHTML = locked(navItem ? navItem[1] : '');
    else { el.innerHTML = v.render(cur.params); v.mount && v.mount(el, cur.params); N.ui.tipBind(el); }
    document.title = (navItem ? navItem[1] : 'Nacre') + ' — Nacre';
    navRender();
  }
  function refresh() { const y = scrollY; render(); window.scrollTo(0, y); }
  function locked(label) {
    const S = N.S;
    return `<div class="locked-view card card-pad"><div class="ico">${icon('lock')}</div><h2 class="serif" style="font-size:22px;color:var(--navy)">Accès restreint</h2><p class="muted mt-8">Le rôle <b>${esc(S.roles[S.session.role])}</b> n’a pas la permission d’accéder au module « ${esc(label)} ». Les permissions sont définies par l’administrateur dans <b>Personnel → Rôles & permissions</b>.</p><div class="row mt-16" style="justify-content:center"><a class="btn" href="#/dashboard">Retour au dashboard</a></div></div>`;
  }

  /* ---------- Recherche globale ---------- */
  function bindSearch() {
    const inp = document.getElementById('gsearch'); let box, idx = 0, items = [];
    const close = () => { box && box.remove(); box = null; };
    const draw = () => {
      const q = inp.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (!q) return close();
      const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const pats = N.S.patients.filter(p => norm(p.first + ' ' + p.last + ' ' + p.phone + ' ' + p.fileNo + ' ' + p.email).includes(q) || norm(p.last + ' ' + p.first).includes(q)).slice(0, 7)
        .map(p => ({ href: '#/patients/' + p.id, html: `${avatar(p, 'sm')}<div class="grow"><div style="font-weight:500">${esc(N.pname(p))}</div><div class="xs muted">${p.fileNo} · ${p.phone} · ${esc(N.clinic(p.clinic).city)}</div></div>${p.allergies.length ? '<span class="tag allergy">Allergie</span>' : ''}` }));
      const mods = NAV_FLAT.filter(n => norm(n[1]).includes(q)).slice(0, 4).map(n => ({ href: '#/' + n[0], html: `<span class="avatar sm" style="background:var(--bg-2);color:var(--muted)">${icon(n[2]).replace('<svg', '<svg style="width:14px;height:14px"')}</span><div class="grow">${n[1]}<div class="xs muted">Module</div></div>` }));
      items = [...pats, ...mods]; idx = 0;
      if (!box) { box = document.createElement('div'); box.className = 'search-results'; inp.parentNode.appendChild(box); }
      box.innerHTML = items.length ? (pats.length ? '<div class="dd-label">Patients</div>' : '') + items.map((it, i) => (i === pats.length && mods.length ? '<div class="dd-label">Modules</div>' : '') + `<div class="sr-item ${i === 0 ? 'focus' : ''}" data-i="${i}">${it.html}</div>`).join('') : '<div class="empty small">Aucun résultat</div>';
      box.querySelectorAll('.sr-item').forEach(el => el.addEventListener('mousedown', e => { e.preventDefault(); location.hash = items[+el.dataset.i].href; inp.value = ''; close(); inp.blur(); }));
    };
    inp.addEventListener('input', draw);
    inp.addEventListener('blur', () => setTimeout(close, 120));
    inp.addEventListener('keydown', e => {
      if (!box || !items.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; box.querySelectorAll('.sr-item').forEach((el, i) => el.classList.toggle('focus', i === idx)); }
      if (e.key === 'Enter') { location.hash = items[idx].href; inp.value = ''; close(); inp.blur(); }
      if (e.key === 'Escape') { inp.value = ''; close(); }
    });
    document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inp.focus(); } });
  }

  /* ---------- Actions globales ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-act]');
    if (a && actions[a.dataset.act]) { e.preventDefault(); actions[a.dataset.act](a, e); return; }
    const r = e.target.closest('[data-href]');
    if (r && !e.target.closest('a,button,input,select,label')) location.hash = r.dataset.href;
  });
  act('openNav', () => document.getElementById('shell').classList.add('nav-open'));
  act('closeNav', () => document.getElementById('shell').classList.remove('nav-open'));
  act('clinicMenu', el => {
    const S = N.S; const cl = S.session.clinic;
    const dd = dropdown(el, `<div class="dd-label">Établissement</div>${S.clinics.map(c => `<div class="dd-item ${cl === c.id ? 'on' : ''}" data-cl="${c.id}">${icon('building')}<div class="grow">${c.name}<div class="xs muted">${S.staff.filter(s => s.clinic === c.id && s.role === 'dentiste').length} praticien(s) · ${c.chairs.length} fauteuils</div></div></div>`).join('')}<div class="dd-sep"></div><div class="dd-item ${cl === 'all' ? 'on' : ''}" data-cl="all">${icon('layers')}<div class="grow">Tous les cabinets<div class="xs muted">Vue direction consolidée</div></div></div>`);
    dd.style.minWidth = el.offsetWidth + 'px';
    dd.querySelectorAll('[data-cl]').forEach(i => i.onclick = () => { S.session.clinic = i.dataset.cl; N.save(); dd.remove(); shell(); render(); toast('Vue : ' + (i.dataset.cl === 'all' ? 'tous les cabinets' : N.clinic(i.dataset.cl).name), 'building'); });
  });
  act('userMenu', el => {
    const S = N.S;
    const dd = dropdown(el, `<div class="dd-label">Simuler un rôle (démo RBAC)</div>${Object.entries(S.roles).map(([k, v]) => `<div class="dd-item ${S.session.role === k ? 'on' : ''}" data-role="${k}">${icon(k === 'admin' ? 'shield' : k === 'dentiste' ? 'tooth' : 'user')}<div class="grow">${v}<div class="xs muted">${esc(N.name(N.staff(S.roleUser[k])))}</div></div></div>`).join('')}
      <div class="dd-sep"></div>
      <a class="dd-item" href="index.html" style="color:inherit">${icon('globe')}Site vitrine</a>
      <a class="dd-item" href="reserver.html" target="_blank" style="color:inherit">${icon('calendar')}Page « Prendre rendez-vous »</a>
      <a class="dd-item" href="portail.html" target="_blank" style="color:inherit">${icon('smartphone')}Portail patient</a>
      <div class="dd-sep"></div>
      <div class="dd-item" data-reset>${icon('refresh')}Réinitialiser les données de démo</div>
      <a class="dd-item" href="index.html" style="color:inherit">${icon('logout')}Se déconnecter</a>`, { align: 'right' });
    dd.querySelectorAll('[data-role]').forEach(i => i.onclick = () => { S.session.role = i.dataset.role; N.save(); dd.remove(); N.log('Changement de rôle (démo)', S.roles[i.dataset.role]); shell(); render(); toast('Connecté en tant que ' + S.roles[i.dataset.role], 'shield'); });
    dd.querySelector('[data-reset]').onclick = async () => { dd.remove(); if (await N.ui.confirmBox('Réinitialiser la démo ?', 'Toutes les modifications locales seront remplacées par le jeu de données initial.', 'Réinitialiser', true)) { N.reset(); shell(); render(); toast('Données de démo réinitialisées'); } };
  });
  const NK = { lab: ['flask', 'tone-gold'], msg: ['message', 'tone-blue'], booking: ['calendar', 'tone-teal'], review: ['star', 'tone-gold'], pay: ['card', 'tone-green'], stock: ['box', 'tone-red'], alert: ['alert', 'tone-amber'] };
  act('notifs', el => {
    const S = N.S;
    const dd = dropdown(el, `<div class="np-head"><b>Notifications</b><button class="btn ghost xs" data-all>Tout marquer comme lu</button></div><div class="np-list">${S.notifications.slice(0, 20).map(n => `<div class="np-item ${n.read ? '' : 'unread'}" data-n="${n.id}"><div class="ico ${(NK[n.kind] || NK.alert)[1]}">${icon((NK[n.kind] || NK.alert)[0])}</div><div class="grow"><div style="font-weight:600;font-size:13px">${esc(n.title)}</div><div class="small muted">${esc(n.text)}</div><div class="xs faint mt-4">${fmt.ago(n.at)}</div></div></div>`).join('') || '<div class="empty">Aucune notification</div>'}</div>`, { align: 'right', cls: 'notif-panel' });
    dd.querySelector('[data-all]').onclick = () => { S.notifications.forEach(n => n.read = true); N.save(); dd.remove(); navRender(); };
    dd.querySelectorAll('[data-n]').forEach(i => i.onclick = () => { const n = S.notifications.find(x => x.id === i.dataset.n); n.read = true; N.save(); dd.remove(); if (n.link) location.hash = n.link.replace('#', ''); navRender(); });
  });
  act('newAppt', () => newAppt());
  act('newPatient', () => newPatient());
  act('appt', el => apptDrawer(el.dataset.id));
  act('pay', el => recordPayment({ patient: el.dataset.patient, invoice: el.dataset.invoice }));

  /* ---------- Helpers communs ---------- */
  const H = {
    head(title, sub = '', actionsHtml = '', crumbs = '') {
      return `<div class="page-head"><div>${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}<h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div><div class="row wrap">${actionsHtml}</div></div>`;
    },
    patientOptions(sel = '', filter = true) {
      return N.S.patients.filter(p => !filter || N.inClinic(p) || p.id === sel).sort((a, b) => a.last.localeCompare(b.last)).map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.last + ' ' + p.first)} · ${p.fileNo}</option>`).join('');
    },
    dentistOptions(sel = '', all = false) {
      return N.S.staff.filter(s => s.role === 'dentiste' && (all || N.inClinic(s))).map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(N.name(s))}</option>`).join('');
    },
    typeOptions(sel = '') { return Object.entries(N.S.types).map(([k, t]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${t.label}</option>`).join(''); },
    typeDot(t) { const x = N.S.types[t]; return `<span class="row gap-6 nowrap"><i style="width:8px;height:8px;border-radius:50%;background:${x.color};display:inline-block"></i>${x.label}</span>`; },
    pcell(p, sub = '') { p = typeof p === 'string' ? N.patient(p) : p; if (!p) return '—'; return `<a href="#/patients/${p.id}" class="row" style="color:inherit;gap:10px">${avatar(p, 'sm')}<div style="min-width:0"><div style="font-weight:500" class="truncate">${esc(N.pname(p))}</div>${sub ? `<div class="xs muted truncate">${sub}</div>` : ''}</div></a>`; },
    kpi(label, value, ic, tone, foot = '', sparkHtml = '') { return `<div class="card kpi">${sparkHtml ? `<div class="spark">${sparkHtml}</div>` : ''}<div class="label"><span class="ico ${tone}">${icon(ic)}</span>${label}</div><div class="value">${value}</div>${foot ? `<div class="foot">${foot}</div>` : ''}</div>`; },
    delta(v, suffix = '%') { const up = v >= 0; return `<span class="delta ${up ? 'up' : 'down'}">${icon(up ? 'arrowUp' : 'arrowDown').replace('<svg', '<svg style="width:12px;height:12px"')}${Math.abs(v).toString().replace('.', ',')}${suffix}</span>`; },
    empty(text, ic = 'folder') { return `<div class="empty">${icon(ic)}<div>${text}</div></div>`; },
    sendMsg(patient, text, channel = 'sms', auto = false) { N.S.messages.push({ id: N.uid('m'), patient, dir: 'out', channel, text, at: D.stamp(), auto, status: 'envoye' }); },
    fill(tpl, p, extra = {}) {
      const cl = N.clinic(p.clinic); const dn = N.staff(p.dentist);
      const map = Object.assign({ prenom: p.first, nom: p.last, dentiste: N.name(dn), cabinet: N.S.settings.group + ' — ' + cl.city, telephone: cl.phone, lien: 'nacre.ma/rdv/atlas', montant: fmt.money(N.patientBalance(p.id).due), date: '', heure: '', quand: '' }, extra);
      return tpl.replace(/\{(\w+)\}/g, (m, k) => map[k] ?? m);
    },
    apptsOf(pid) { return N.S.appts.filter(a => a.patient === pid).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)); },
    nextAppt(pid) { const t = D.todayYmd(), m = D.hm(D.nowMin()); return H.apptsOf(pid).find(a => (a.date > t || (a.date === t && a.start >= m)) && ['confirme', 'attente'].includes(a.status)); },
    readonly(perm) { return !N.can(perm); }
  };

  /* ---------- Modale : nouveau rendez-vous ---------- */
  function freeCheck(a, ignore) {
    return N.S.appts.find(x => x.id !== ignore && x.dentist === a.dentist && x.date === a.date && !['annule', 'noshow'].includes(x.status) && D.min(x.start) < D.min(a.start) + +a.dur && D.min(a.start) < D.min(x.start) + x.dur);
  }
  function newAppt(pre = {}) {
    if (!N.can('agenda.manage')) return toast('Permission requise : gérer les rendez-vous', 'lock');
    const S = N.S; const dn = pre.dentist || (N.me().role === 'dentiste' ? N.me().id : (N.dentists()[0] || S.staff[0]).id);
    const type = pre.type || 'consultation';
    const m = modal({
      title: 'Nouveau rendez-vous', size: 'lg',
      body: `<form class="form-grid" id="fa">
        <div class="field full"><label>Patient</label><div class="row"><select class="select grow" name="patient">${H.patientOptions(pre.patient)}</select><button type="button" class="btn" data-np>${icon('plus')}Nouveau</button></div></div>
        <div class="field"><label>Type de rendez-vous</label><select class="select" name="type">${H.typeOptions(type)}</select></div>
        <div class="field"><label>Praticien</label><select class="select" name="dentist">${H.dentistOptions(dn)}</select></div>
        <div class="field"><label>Date</label><input class="input" type="date" name="date" value="${pre.date || D.todayYmd()}"></div>
        <div class="row" style="gap:10px"><div class="field grow"><label>Heure</label><input class="input" type="time" step="900" name="start" value="${pre.start || '10:00'}"></div><div class="field" style="width:110px"><label>Durée (min)</label><input class="input" type="number" step="5" min="10" name="dur" value="${S.types[type].dur}"></div></div>
        <div class="field"><label>Fauteuil</label><select class="select" name="chair"></select></div>
        <div class="field"><label>Statut</label><select class="select" name="status"><option value="confirme">Confirmé</option><option value="attente" selected>En attente de confirmation</option></select></div>
        <div class="field full"><label>Note</label><input class="input" name="note" placeholder="Ex. : apporter les radiographies, patient anxieux…" value="${esc(pre.note || '')}"></div>
        <div class="full row wrap" style="gap:16px"><label class="check"><input type="checkbox" name="notify" checked> Envoyer la confirmation au patient (SMS + email)</label><span class="xs muted" id="conflict"></span></div>
      </form>`,
      foot: `<button class="btn" data-close>Annuler</button><button class="btn primary" data-save>${icon('check')}Créer le rendez-vous</button>`,
      onMount: el => {
        const f = el.querySelector('#fa');
        const syncChairs = () => { const d = N.staff(f.dentist.value); const c = N.clinic(d.clinic); f.chair.innerHTML = c.chairs.map(ch => `<option ${ch === (pre.chair || d.chair) ? 'selected' : ''}>${ch}</option>`).join(''); };
        const check = () => { const c = freeCheck({ dentist: f.dentist.value, date: f.date.value, start: f.start.value, dur: f.dur.value }); el.querySelector('#conflict').innerHTML = c ? `<span style="color:var(--danger)">⚠ Chevauchement avec ${esc(N.pname(c.patient))} à ${c.start}</span>` : `<span style="color:var(--success)">✓ Créneau disponible</span>`; };
        syncChairs(); check();
        f.type.onchange = () => { f.dur.value = S.types[f.type.value].dur; check(); };
        f.dentist.onchange = () => { syncChairs(); check(); };
        ['date', 'start', 'dur'].forEach(k => f[k].onchange = check);
        el.querySelector('[data-np]').onclick = () => { el.close(); newPatient(p => newAppt(Object.assign({}, pre, { patient: p.id }))); };
        el.querySelector('[data-save]').onclick = () => {
          const d = formData(f); const den = N.staff(d.dentist);
          const a = { id: N.uid('a'), patient: d.patient, dentist: d.dentist, clinic: den.clinic, chair: d.chair, date: d.date, start: d.start, dur: +d.dur, type: d.type, status: d.status, note: d.note, late: 0, moved: false, source: 'cabinet', created: D.stamp() };
          S.appts.push(a);
          if (d.notify) { const p = N.patient(a.patient); H.sendMsg(p.id, H.fill(S.templates[1].text, p, { dentiste: N.name(den), date: fmt.date(a.date), heure: fmt.hShort(a.start) }), 'sms', true); }
          N.log('Rendez-vous créé', N.pname(a.patient) + ' — ' + fmt.date(a.date) + ' ' + a.start);
          N.save(); el.close(); refresh(); toast(`Rendez-vous créé — ${esc(N.pname(a.patient))}, ${fmt.dayMonth(a.date)} à ${fmt.hShort(a.start)}`, 'calendar');
        };
      }
    });
  }

  /* ---------- Tiroir : détail rendez-vous ---------- */
  function apptDrawer(id) {
    const S = N.S; const a = S.appts.find(x => x.id === id); if (!a) return;
    const p = N.patient(a.patient); const d = N.staff(a.dentist); const t = S.types[a.type];
    const canM = N.can('agenda.manage');
    const inv = S.invoices.find(i => i.appt === a.id);
    const body = `
      <div class="row" style="gap:14px">${avatar(p, 'lg')}<div class="grow"><a href="#/patients/${p.id}" data-close style="font-size:18px;font-weight:600;color:var(--navy)">${esc(N.pname(p))}</a><div class="small muted">${N.age(p.dob)} ans · ${p.phone} · ${p.fileNo}</div><div class="row wrap gap-6 mt-8">${stBadge(a.status)}${a.source === 'online' ? badge('Réservé en ligne', 'tone-teal', false) : ''}${a.moved ? badge('Reprogrammé', 'tone-violet', false) : ''}${p.noShows >= 2 ? badge(p.noShows + ' no-show', 'st-noshow', false) : ''}</div></div></div>
      ${p.allergies.length ? `<div class="med-alert mt-16">${icon('alert')}<div><b>Allergies déclarées :</b> ${esc(p.allergies.join(', '))}${p.history.length ? `<br><b>Antécédents :</b> ${esc(p.history.join(', '))}` : ''}</div></div>` : ''}
      <div class="card mt-16" style="border-left:3px solid ${t.color}"><div class="card-body" style="padding:14px 16px">
        <dl class="kv"><dt>Type</dt><dd>${H.typeDot(a.type)}</dd><dt>Date</dt><dd>${fmt.dateLong(a.date)}</dd><dt>Horaire</dt><dd>${a.start} – ${D.hm(D.min(a.start) + a.dur)} (${a.dur} min)</dd><dt>Praticien</dt><dd>${esc(N.name(d))}</dd><dt>Salle</dt><dd>${esc(N.clinic(a.clinic).name)} · ${esc(a.chair)}</dd>${a.late ? `<dt>Retard</dt><dd>${a.late} min</dd>` : ''}${inv ? `<dt>Facture</dt><dd>${inv.number} · ${badge(N.ui.INV_ST[N.invoiceStatus(inv)][0], N.ui.INV_ST[N.invoiceStatus(inv)][1])}</dd>` : ''}</dl>
      </div></div>
      ${canM ? `<div class="mt-16"><div class="small muted mb-8">Changer le statut</div><div class="row wrap gap-6">
        ${[['confirme', 'check', 'Confirmer'], ['encours', 'activity', 'Démarrer'], ['termine', 'check', 'Terminer'], ['noshow', 'x', 'No-show'], ['annule', 'x', 'Annuler']].map(([s, ic, l]) => `<button class="btn sm ${a.status === s ? 'navy' : ''} ${s === 'annule' || s === 'noshow' ? 'danger' : ''}" data-st="${s}">${icon(ic)}${l}</button>`).join('')}
      </div></div>
      <div class="mt-16"><div class="small muted mb-8">Reprogrammer</div><div class="row wrap"><input class="input sm" type="date" id="rd" value="${a.date}" style="width:160px"><input class="input sm" type="time" step="900" id="rt" value="${a.start}" style="width:110px"><button class="btn sm" data-move>${icon('repeat')}Déplacer</button></div></div>` : ''}
      <div class="field mt-16"><label>Note</label><textarea class="textarea" id="rn" ${canM ? '' : 'readonly'} placeholder="Ajouter une note…">${esc(a.note)}</textarea></div>`;
    const m = modal({
      title: 'Rendez-vous', drawer: true, body,
      foot: `<a class="btn" href="#/patients/${p.id}" data-close>${icon('user')}Fiche</a>${N.can('comm.send') ? `<button class="btn" data-remind>${icon('send')}Rappel</button>` : ''}${canM ? `<button class="btn primary" data-savenote>${icon('check')}Enregistrer</button>` : ''}`,
      onMount: el => {
        el.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { setStatus(a, b.dataset.st); el.close(); apptDrawer(a.id); });
        const mv = el.querySelector('[data-move]'); if (mv) mv.onclick = () => {
          const nd = el.querySelector('#rd').value, nt = el.querySelector('#rt').value;
          const c = freeCheck(Object.assign({}, a, { date: nd, start: nt }), a.id);
          if (c) return toast('Créneau occupé : ' + esc(N.pname(c.patient)) + ' à ' + c.start, 'alert');
          a.date = nd; a.start = nt; a.moved = true; if (a.status === 'confirme') a.status = 'attente';
          H.sendMsg(p.id, `Bonjour ${p.first}, votre rendez-vous a été déplacé au ${fmt.dateLong(nd)} à ${fmt.hShort(nt)}. Répondez OUI pour confirmer.`, 'sms', true);
          N.log('Rendez-vous reprogrammé', N.pname(p) + ' → ' + fmt.date(nd) + ' ' + nt); N.save(); el.close(); refresh(); toast('Rendez-vous reprogrammé · patient notifié', 'repeat');
        };
        const sn = el.querySelector('[data-savenote]'); if (sn) sn.onclick = () => { a.note = el.querySelector('#rn').value; N.save(); el.close(); refresh(); toast('Rendez-vous mis à jour'); };
        const rm = el.querySelector('[data-remind]'); if (rm) rm.onclick = () => { H.sendMsg(p.id, H.fill(S.templates[0].text, p, { dentiste: N.name(d), quand: fmt.rel(a.date), heure: fmt.hShort(a.start) }), p.consent.whatsapp ? 'whatsapp' : 'sms', false); N.save(); toast('Rappel envoyé par ' + (p.consent.whatsapp ? 'WhatsApp' : 'SMS'), 'send'); };
      }
    });
  }
  function setStatus(a, s) {
    const S = N.S; const p = N.patient(a.patient); const prev = a.status; a.status = s;
    if (s === 'noshow' && prev !== 'noshow') { p.noShows++; if (p.noShows >= 2 && !p.tags.includes('Risque no-show')) p.tags.push('Risque no-show'); }
    if (s === 'termine' && !S.invoices.some(i => i.appt === a.id)) {
      const price = S.types[a.type].price; const n = ++S.seq.invoice;
      S.invoices.push({ id: N.uid('f'), number: 'FAC-2026-' + String(n).padStart(5, '0'), patient: a.patient, clinic: a.clinic, dentist: a.dentist, date: a.date, due: D.addYmd(a.date, 30), items: [{ label: S.types[a.type].label, tooth: '', qty: 1, price }], discount: 0, total: price, appt: a.id });
      toast('Séance terminée · facture ' + 'FAC-2026-' + String(n).padStart(5, '0') + ' générée', 'receipt');
    } else toast('Statut : ' + S.status[s].label);
    N.log('Statut rendez-vous → ' + S.status[s].label, N.pname(p) + ' — ' + a.start);
    N.save(); refresh();
  }

  /* ---------- Modale : nouveau patient ---------- */
  function newPatient(after) {
    if (!N.can('patients.edit')) return toast('Permission requise : modifier les patients', 'lock');
    const S = N.S; const cl = S.session.clinic === 'all' ? 'fes' : S.session.clinic;
    modal({
      title: 'Nouveau patient', size: 'lg',
      body: `<form class="form-grid" id="fp">
        <div class="field"><label>Prénom *</label><input class="input" name="first" required></div>
        <div class="field"><label>Nom *</label><input class="input" name="last" required></div>
        <div class="field"><label>Date de naissance</label><input class="input" type="date" name="dob" value="1990-01-01"></div>
        <div class="field"><label>Sexe</label><select class="select" name="sex"><option value="F">Femme</option><option value="M">Homme</option></select></div>
        <div class="field"><label>Téléphone *</label><input class="input" name="phone" placeholder="06 00 00 00 00"></div>
        <div class="field"><label>Email</label><input class="input" type="email" name="email"></div>
        <div class="field full"><label>Adresse</label><input class="input" name="address"></div>
        <div class="field"><label>Profession</label><input class="input" name="profession"></div>
        <div class="field"><label>Couverture</label><select class="select" name="cover"><option>CNOPS</option><option>CNSS (AMO)</option><option>Mutuelle privée</option><option>Assurance privée</option><option>Sans couverture</option></select></div>
        <div class="field"><label>Contact d’urgence</label><input class="input" name="emName" placeholder="Nom"></div>
        <div class="field"><label>Téléphone d’urgence</label><input class="input" name="emPhone"></div>
        <div class="field"><label>Cabinet</label><select class="select" name="clinic">${S.clinics.map(c => `<option value="${c.id}" ${c.id === cl ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
        <div class="field"><label>Praticien référent</label><select class="select" name="dentist">${H.dentistOptions('', true)}</select></div>
        <div class="field full"><label>Allergies déclarées</label><input class="input" name="allergies" placeholder="Séparées par des virgules (ex. : Pénicilline, Latex)"></div>
        <div class="field full"><label>Antécédents renseignés</label><input class="input" name="history" placeholder="Séparés par des virgules"></div>
        <div class="field full"><label>Médicaments déclarés</label><input class="input" name="meds" placeholder="Séparés par des virgules"></div>
        <div class="full col gap-6"><label class="check"><input type="checkbox" name="rgpd" checked> Consentement au traitement des données de santé recueilli</label><label class="check"><input type="checkbox" name="sms" checked> Accepte les rappels SMS / WhatsApp</label></div>
      </form>`,
      foot: `<button class="btn" data-close>Annuler</button><button class="btn primary" data-save>${icon('check')}Créer la fiche</button>`,
      onMount: el => el.querySelector('[data-save]').onclick = () => {
        const d = formData(el.querySelector('#fp'));
        if (!d.first.trim() || !d.last.trim() || !d.phone.trim()) return toast('Prénom, nom et téléphone sont requis', 'alert');
        const split = s => s.split(',').map(x => x.trim()).filter(Boolean);
        const p = { id: N.uid('p'), first: d.first.trim(), last: d.last.trim(), sex: d.sex, dob: d.dob, profession: d.profession, clinic: d.clinic, phone: d.phone, email: d.email, address: d.address, emergency: { name: d.emName, relation: '', phone: d.emPhone }, cover: d.cover, coverNo: '', fileNo: 'DOS-' + String(1300 + S.patients.length).padStart(5, '0'), history: split(d.history), allergies: split(d.allergies), meds: split(d.meds), smoker: false, dentist: d.dentist, tags: ['Nouveau'], created: D.todayYmd(), avatar: ['#2C6BCB', '#5E9F8D', '#7568D1', '#B89457', '#3AA6A0'][S.patients.length % 5], notes: '', noShows: 0, lateCount: 0, reinforced: false, consent: { rgpd: d.rgpd, sms: d.sms, email: true, whatsapp: d.sms, photos: false } };
        S.patients.push(p); N.log('Patient créé', N.pname(p)); N.save(); el.close();
        toast('Fiche créée — ' + esc(N.pname(p)), 'user');
        if (after) after(p); else location.hash = '#/patients/' + p.id;
      }
    });
  }

  /* ---------- Modale : encaissement ---------- */
  function recordPayment(pre = {}) {
    if (!N.can('finance.edit')) return toast('Permission requise : encaisser', 'lock');
    const S = N.S;
    modal({
      title: 'Enregistrer un paiement',
      body: `<form class="form-grid" id="fpay">
        <div class="field full"><label>Patient</label><select class="select" name="patient">${H.patientOptions(pre.patient || 'p1')}</select></div>
        <div class="field full"><label>Facture</label><select class="select" name="invoice"></select></div>
        <div class="field"><label>Type</label><select class="select" name="kind"><option value="paiement">Paiement</option><option value="acompte">Acompte</option><option value="remboursement">Remboursement</option></select></div>
        <div class="field"><label>Montant (DH)</label><input class="input" type="number" name="amount" min="0" step="50"></div>
        <div class="field full"><label>Mode de paiement</label><div class="chips" id="methods">${Object.entries(N.ui.METHOD).filter(([k]) => k !== 'cheque').map(([k, v], i) => `<button type="button" class="chip ${i === 0 ? 'on' : ''}" data-m="${k}">${v}</button>`).join('')}</div></div>
        <div class="field full"><label>Référence / note</label><input class="input" name="ref" placeholder="N° de transaction, commentaire…"></div>
        <div class="full card" style="background:var(--surface-2)"><div class="card-body row between" id="paysum" style="padding:12px 16px"></div></div>
      </form>`,
      foot: `<button class="btn" data-close>Annuler</button><button class="btn primary" data-save>${icon('check')}Enregistrer</button>`,
      onMount: el => {
        const f = el.querySelector('#fpay'); let method = 'especes';
        el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { el.querySelectorAll('[data-m]').forEach(x => x.classList.remove('on')); b.classList.add('on'); method = b.dataset.m; });
        const sum = () => { const b = N.patientBalance(f.patient.value); el.querySelector('#paysum').innerHTML = `<div><div class="xs muted">Total facturé</div><b>${fmt.money(b.total)}</b></div><div><div class="xs muted">Payé</div><b style="color:var(--success)">${fmt.money(b.paid)}</b></div><div><div class="xs muted">Reste à payer</div><b style="color:${b.due > 0 ? 'var(--danger)' : 'inherit'}">${fmt.money(b.due)}</b></div>`; };
        const invs = () => {
          const list = S.invoices.filter(i => i.patient === f.patient.value).sort((a, b) => b.date.localeCompare(a.date));
          const open = list.filter(i => N.invoicePaid(i) < N.invoiceTotal(i));
          f.invoice.innerHTML = (open.length ? open : list.slice(0, 5)).map(i => `<option value="${i.id}" ${i.id === pre.invoice ? 'selected' : ''}>${i.number} · ${fmt.date(i.date)} · reste ${fmt.money(N.invoiceTotal(i) - N.invoicePaid(i))}</option>`).join('') || '<option value="">Aucune facture — paiement libre</option>';
          const i = S.invoices.find(x => x.id === f.invoice.value); f.amount.value = i ? Math.max(0, N.invoiceTotal(i) - N.invoicePaid(i)) : ''; sum();
        };
        invs(); f.patient.onchange = invs;
        f.invoice.onchange = () => { const i = S.invoices.find(x => x.id === f.invoice.value); if (i) f.amount.value = N.invoiceTotal(i) - N.invoicePaid(i); };
        el.querySelector('[data-save]').onclick = () => {
          const d = formData(f); let amt = +d.amount; if (!amt) return toast('Montant requis', 'alert');
          if (d.kind === 'remboursement') amt = -Math.abs(amt);
          const p = N.patient(d.patient);
          S.payments.push({ id: N.uid('pay'), invoice: d.invoice, patient: d.patient, clinic: p.clinic, date: D.todayYmd(), amount: amt, method, kind: d.kind, ref: d.ref });
          N.log('Paiement enregistré (' + N.ui.METHOD[method] + ')', N.pname(p) + ' — ' + fmt.money(amt)); N.save(); el.close(); refresh();
          toast(`${d.kind === 'remboursement' ? 'Remboursement' : 'Paiement'} de ${fmt.money(Math.abs(amt))} enregistré`, 'card');
        };
      }
    });
  }

  function act(name, fn) { actions[name] = fn; }
  function view(name, def) { views[name] = def; }
  function start() { shell(); window.addEventListener('hashchange', route); route(); }

  N.App = { start, view, act, refresh, render, route, H, newAppt, newPatient, recordPayment, apptDrawer, setStatus, freeCheck, navRender, get cur() { return cur; } };
})();
