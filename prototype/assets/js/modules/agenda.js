/* Agenda intelligent : jour, semaine, mois, praticien, fauteuil — drag & drop */
(function () {
  const N = Nacre, D = N.D, A = N.App, H = A.H;
  const { icon, fmt, esc, avatar, badge, stBadge, toast } = N.ui;
  const START = 8 * 60, END = 19 * 60, SLOT = 15, PX = 12;
  const st = { view: 'jour', date: D.todayYmd(), dentist: null, hidden: {}, showCancelled: true };

  const topOf = t => (D.min(t) - START) / SLOT * PX;
  const visible = a => (st.showCancelled || !['annule'].includes(a.status));

  function colsFor() {
    const S = N.S;
    if (st.view === 'fauteuil') {
      const clinics = S.session.clinic === 'all' ? S.clinics : [N.clinic(S.session.clinic)];
      return clinics.flatMap(c => c.chairs.map(ch => ({ key: c.id + '|' + ch, label: ch, sub: c.name, date: st.date, match: a => a.clinic === c.id && a.chair === ch && a.date === st.date })));
    }
    if (st.view === 'semaine' || st.view === 'dentiste') {
      const dn = st.dentist || N.dentists()[0].id;
      if (st.view === 'dentiste') return [{ key: dn, dentist: dn, label: N.name(N.staff(dn)), sub: N.staff(dn).spec, date: st.date, match: a => a.dentist === dn && a.date === st.date }];
      const mon = D.monday(D.parse(st.date));
      return Array.from({ length: 6 }, (_, i) => { const y = D.ymd(D.add(mon, i)); return { key: y, dentist: dn, date: y, label: fmt.dow(y) + ' ' + D.parse(y).getDate(), sub: fmt.MSHORT[D.parse(y).getMonth()], today: y === D.todayYmd(), match: a => a.dentist === dn && a.date === y }; });
    }
    return N.dentists().filter(d => !st.hidden[d.id]).map(d => ({ key: d.id, dentist: d.id, label: N.name(d), sub: d.spec, color: d.color, date: st.date, match: a => a.dentist === d.id && a.date === st.date }));
  }

  function grid() {
    const S = N.S; const cols = colsFor(); const now = D.nowMin();
    const hours = []; for (let m = START; m < END; m += 60) hours.push(m);
    const slots = []; for (let m = START; m < END; m += SLOT) slots.push(m);
    const isOff = (date, m) => { const dow = D.parse(date).getDay(); return (m >= D.min('12:30') && m < D.min('14:00')) || dow === 0 || (dow === 6 && m >= D.min('13:00')) || m < D.min('08:30') || m >= D.min('18:30'); };
    const colW = st.view === 'dentiste' ? 'minmax(300px,1fr)' : 'minmax(150px,1fr)';
    let html = `<div class="agenda" style="grid-template-columns:60px repeat(${cols.length},${colW})">`;
    html += `<div class="ag-head corner"></div>` + cols.map(c => `<div class="ag-head ${c.today ? 'today' : ''}">${c.color ? `<span class="avatar xs" style="background:${c.color}">${esc(c.label.split(' ').slice(-1)[0][0])}</span>` : ''}<div style="min-width:0"><div class="truncate">${esc(c.label)}</div><small class="truncate">${esc(c.sub || '')} · ${S.appts.filter(a => c.match(a) && a.status !== 'annule').length} RDV</small></div></div>`).join('');
    html += `<div class="ag-times">${hours.map(m => `<div class="ag-time">${D.hm(m)}</div>`).join('')}</div>`;
    cols.forEach(c => {
      const ap = S.appts.filter(a => c.match(a) && visible(a)).sort((a, b) => a.start.localeCompare(b.start));
      // gestion des chevauchements : répartition en couloirs
      const lanes = []; ap.forEach(a => { const s = D.min(a.start); let l = lanes.findIndex(end => end <= s); if (l < 0) { l = lanes.length; lanes.push(0); } lanes[l] = s + a.dur; a._lane = l; });
      const nL = Math.max(1, lanes.length);
      html += `<div class="ag-col" data-col="${c.key}" data-date="${c.date}">${slots.map(m => `<div class="ag-slot ${isOff(c.date, m) ? 'off' : ''}" data-t="${D.hm(m)}"></div>`).join('')}`;
      ap.forEach(a => {
        const p = N.patient(a.patient); const t = S.types[a.type]; const h = Math.max(20, a.dur / SLOT * PX - 3);
        const w = 100 / nL;
        html += `<div class="appt ${a.status === 'annule' ? 'st-annule' : ''} ${a.status === 'noshow' ? 'noshow' : ''}" draggable="${N.can('agenda.manage') && !['termine', 'annule'].includes(a.status)}" data-id="${a.id}" style="top:${topOf(a.start) + 1}px;height:${h}px;left:calc(${a._lane * w}% + 3px);right:auto;width:calc(${w}% - 6px);background:${t.color}14;border-left-color:${t.color};color:var(--ink)" title="${esc(N.pname(p))} — ${t.label} ${a.start}">
          <span class="ico-st" style="background:${S.status[a.status].color}"></span>
          <b>${esc(p.first[0] + '. ' + p.last)}${p.allergies.length ? ' <span style="color:var(--danger)">●</span>' : ''}</b>${h > 30 ? `<div class="at">${a.start} · ${t.label}</div>` : ''}${h > 52 && a.note ? `<div class="at truncate">${esc(a.note)}</div>` : ''}</div>`;
      });
      if (c.date === D.todayYmd() && now > START && now < END) html += `<div class="now-indicator" style="top:${(now - START) / SLOT * PX}px"></div>`;
      html += `</div>`;
    });
    return html + '</div>';
  }

  function month() {
    const S = N.S; const d0 = D.parse(st.date); const first = new Date(d0.getFullYear(), d0.getMonth(), 1); const start = D.monday(first);
    const dn = st.dentist;
    let html = '<div class="month">' + ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(x => `<div class="mh">${x}</div>`).join('');
    for (let i = 0; i < 42; i++) {
      const d = D.add(start, i); const y = D.ymd(d);
      const ap = S.appts.filter(a => a.date === y && N.inClinic(a) && (!dn || a.dentist === dn) && a.status !== 'annule').sort((a, b) => a.start.localeCompare(b.start));
      html += `<div class="md ${d.getMonth() !== d0.getMonth() ? 'other' : ''} ${y === D.todayYmd() ? 'today' : ''}" data-day="${y}"><div class="row between"><span class="dn">${d.getDate()}</span>${ap.length ? `<span class="xs muted">${ap.length} RDV</span>` : ''}</div>${ap.slice(0, 3).map(a => `<div class="m-ev" style="background:${S.types[a.type].color}14;border-left-color:${S.types[a.type].color}">${a.start} ${esc(N.patient(a.patient).last)}</div>`).join('')}${ap.length > 3 ? `<div class="xs muted mt-4">+ ${ap.length - 3} autres</div>` : ''}</div>`;
      if (i === 34 && D.add(start, 35).getMonth() !== d0.getMonth()) break;
    }
    return html + '</div>';
  }

  function label() {
    if (st.view === 'mois') return fmt.month(st.date).replace(/^./, c => c.toUpperCase());
    if (st.view === 'semaine') { const m = D.monday(D.parse(st.date)); return `Semaine du ${fmt.dayMonth(D.ymd(m))} au ${fmt.date(D.ymd(D.add(m, 5)))}`; }
    return fmt.dateLong(st.date).replace(/^./, c => c.toUpperCase());
  }
  function sideStats() {
    const S = N.S; const dn = st.dentist || N.dentists()[0].id; const d = N.staff(dn);
    const day = S.appts.filter(a => a.dentist === dn && a.date === st.date);
    const busy = day.filter(a => a.status !== 'annule').reduce((s, a) => s + a.dur, 0);
    const avail = D.parse(st.date).getDay() === 6 ? 270 : 510;
    const rev = day.filter(a => a.status === 'termine').reduce((s, a) => s + S.types[a.type].price, 0);
    const monthAp = S.appts.filter(a => a.dentist === dn && a.date.slice(0, 7) === st.date.slice(0, 7));
    return `<div class="card"><div class="card-body"><div class="row">${avatar(d, 'lg')}<div><b style="font-size:16px">${esc(N.name(d))}</b><div class="small muted">${esc(d.spec)}</div><div class="xs muted">${esc(N.clinic(d.clinic).name)} · ${esc(d.chair)}</div></div></div>
      <div class="grid g2 mt-16" style="gap:10px">${[['RDV du jour', day.filter(a => a.status !== 'annule').length], ['Taux de remplissage', Math.min(100, Math.round(busy / avail * 100)) + ' %'], ['CA réalisé (jour)', fmt.money(rev)], ['RDV du mois', monthAp.length], ['No-show (mois)', monthAp.filter(a => a.status === 'noshow').length], ['Patients suivis', new Set(monthAp.map(a => a.patient)).size]].map(([l, v]) => `<div style="padding:10px 12px;border:1px solid var(--line);border-radius:10px"><div class="xs muted">${l}</div><b class="mono">${v}</b></div>`).join('')}</div>
      <div class="divider"></div><div class="xs muted mb-8">Créneaux libres aujourd’hui</div><div class="chips">${freeSlots(dn, st.date).slice(0, 12).map(t => `<button class="chip" data-free="${t}">${t}</button>`).join('') || '<span class="small muted">Complet</span>'}</div>
    </div></div>`;
  }
  function freeSlots(dn, date) {
    const S = N.S; const out = []; const dow = D.parse(date).getDay(); if (dow === 0) return out;
    const end = dow === 6 ? D.min('13:00') : D.min('18:30');
    for (let m = D.min('08:30'); m + 30 <= end; m += 30) {
      if (m >= D.min('12:30') && m < D.min('14:00')) continue;
      if (date === D.todayYmd() && m < D.nowMin()) continue;
      const clash = S.appts.some(a => a.dentist === dn && a.date === date && !['annule', 'noshow'].includes(a.status) && D.min(a.start) < m + 30 && m < D.min(a.start) + a.dur);
      if (!clash) out.push(D.hm(m));
    }
    return out;
  }
  N.freeSlots = freeSlots;

  A.view('agenda', {
    render() {
      const S = N.S; const dentists = N.dentists();
      if (st.dentist && !dentists.find(d => d.id === st.dentist)) st.dentist = null;
      const views = [['jour', 'Jour'], ['semaine', 'Semaine'], ['mois', 'Mois'], ['dentiste', 'Praticien'], ['fauteuil', 'Fauteuil']];
      const needDentist = ['semaine', 'dentiste', 'mois'].includes(st.view);
      return `${H.head('Agenda', 'Glissez-déposez un rendez-vous pour le déplacer · cliquez sur un créneau libre pour en créer un', N.can('agenda.manage') ? `<button class="btn primary" data-act="newAppt">${icon('plus')}Nouveau rendez-vous</button>` : '')}
      <div class="card mb-16"><div class="card-body row wrap between" style="gap:12px;padding:12px 16px">
        <div class="row"><button class="btn icon sm" data-nav="-1" aria-label="Précédent">${icon('chevronLeft')}</button><button class="btn sm" data-today>Aujourd’hui</button><button class="btn icon sm" data-nav="1" aria-label="Suivant">${icon('chevronRight')}</button><input type="date" class="input sm" id="agdate" value="${st.date}" style="width:150px"><b style="margin-left:6px;font-size:15px">${label()}</b></div>
        <div class="btn-group">${views.map(([k, l]) => `<button data-view="${k}" class="${st.view === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      </div>
      <div class="row wrap between" style="padding:0 16px 12px;gap:10px">
        <div class="chips">${needDentist ? `${st.view === 'mois' ? `<button class="chip ${!st.dentist ? 'on' : ''}" data-dn="">Tous</button>` : ''}${dentists.map(d => `<button class="chip ${(st.dentist || (st.view !== 'mois' && dentists[0].id)) === d.id ? 'on' : ''}" data-dn="${d.id}"><i class="sw" style="background:${d.color}"></i>${esc(d.title + ' ' + d.last)}</button>`).join('')}` : st.view === 'jour' ? dentists.map(d => `<button class="chip ${st.hidden[d.id] ? '' : 'on'}" data-toggle="${d.id}"><i class="sw" style="background:${d.color}"></i>${esc(d.title + ' ' + d.last)}</button>`).join('') : ''}</div>
        <label class="check small"><input type="checkbox" id="showc" ${st.showCancelled ? 'checked' : ''}> Afficher les annulés</label>
      </div></div>
      ${st.view === 'mois' ? month() : st.view === 'dentiste' ? `<div class="grid" style="grid-template-columns:minmax(0,1fr) 340px;align-items:start" id="agd">${grid()}${sideStats()}</div><style>@media (max-width:1000px){#agd{grid-template-columns:1fr!important}}</style>` : grid()}
      <div class="row wrap between mt-16" style="gap:12px"><div class="type-legend">${Object.values(S.types).map(t => `<span><i style="background:${t.color}"></i>${t.label}</span>`).join('')}</div><div class="type-legend">${Object.values(S.status).map(s => `<span><i style="background:${s.color};border-radius:50%"></i>${s.label}</span>`).join('')}</div></div>`;
    },
    mount(el) {
      const step = { jour: 1, fauteuil: 1, dentiste: 1, semaine: 7, mois: 30 };
      el.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => { if (st.view === 'mois') { const d = D.parse(st.date); d.setMonth(d.getMonth() + +b.dataset.nav); st.date = D.ymd(d); } else { let d = D.addYmd(st.date, step[st.view] * +b.dataset.nav); if (st.view !== 'semaine' && D.parse(d).getDay() === 0) d = D.addYmd(d, +b.dataset.nav); st.date = d; } A.refresh(); });
      el.querySelector('[data-today]').onclick = () => { st.date = D.todayYmd(); A.refresh(); };
      el.querySelector('#agdate').onchange = e => { st.date = e.target.value; A.refresh(); };
      el.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { st.view = b.dataset.view; A.refresh(); });
      el.querySelectorAll('[data-dn]').forEach(b => b.onclick = () => { st.dentist = b.dataset.dn || null; A.refresh(); });
      el.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => { st.hidden[b.dataset.toggle] = !st.hidden[b.dataset.toggle]; A.refresh(); });
      el.querySelector('#showc').onchange = e => { st.showCancelled = e.target.checked; A.refresh(); };
      el.querySelectorAll('[data-day]').forEach(d => d.onclick = () => { st.date = d.dataset.day; st.view = 'jour'; A.refresh(); });
      el.querySelectorAll('[data-free]').forEach(b => b.onclick = () => A.newAppt({ date: st.date, start: b.dataset.free, dentist: st.dentist || N.dentists()[0].id }));
      // clic sur rendez-vous / créneau
      el.querySelectorAll('.appt').forEach(a => a.onclick = e => { e.stopPropagation(); A.apptDrawer(a.dataset.id); });
      const colInfo = col => { const k = col.dataset.col; if (st.view === 'fauteuil') { const [clinic, chair] = k.split('|'); const d = N.S.staff.find(s => s.role === 'dentiste' && s.clinic === clinic && s.chair === chair) || N.S.staff.find(s => s.role === 'dentiste' && s.clinic === clinic); return { dentist: d.id, chair, date: col.dataset.date }; } if (st.view === 'semaine') return { dentist: st.dentist || N.dentists()[0].id, date: col.dataset.date }; return { dentist: k, date: col.dataset.date }; };
      el.querySelectorAll('.ag-slot').forEach(s => s.onclick = () => { if (!N.can('agenda.manage') || s.classList.contains('off')) return; const ci = colInfo(s.parentNode); A.newAppt(Object.assign(ci, { start: s.dataset.t })); });
      // drag & drop
      let dragId = null;
      el.querySelectorAll('.appt[draggable=true]').forEach(a => {
        a.addEventListener('dragstart', e => { dragId = a.dataset.id; a.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
        a.addEventListener('dragend', () => { a.classList.remove('dragging'); el.querySelectorAll('.drop').forEach(x => x.classList.remove('drop')); });
      });
      el.querySelectorAll('.ag-slot').forEach(s => {
        s.addEventListener('dragover', e => { if (!dragId) return; e.preventDefault(); el.querySelectorAll('.drop').forEach(x => x.classList.remove('drop')); s.classList.add('drop'); });
        s.addEventListener('drop', e => {
          e.preventDefault(); const S = N.S; const a = S.appts.find(x => x.id === dragId); dragId = null; if (!a) return;
          const ci = colInfo(s.parentNode); const moved = Object.assign({}, a, { date: ci.date, start: s.dataset.t, dentist: ci.dentist || a.dentist });
          if (s.classList.contains('off')) return toast('Créneau hors horaires d’ouverture', 'alert');
          const c = A.freeCheck(moved, a.id); if (c) return toast(`Conflit avec ${esc(N.pname(c.patient))} (${c.start})`, 'alert');
          const before = `${fmt.dayMonth(a.date)} ${a.start}`;
          a.date = moved.date; a.start = moved.start; if (ci.dentist && ci.dentist !== a.dentist) { a.dentist = ci.dentist; const d = N.staff(ci.dentist); a.clinic = d.clinic; a.chair = ci.chair || d.chair; } else if (ci.chair) a.chair = ci.chair;
          a.moved = true;
          const p = N.patient(a.patient);
          H.sendMsg(p.id, `Bonjour ${p.first}, votre rendez-vous a été déplacé au ${fmt.dateLong(a.date)} à ${fmt.hShort(a.start)}. Répondez OUI pour confirmer.`, 'sms', true);
          N.log('Rendez-vous déplacé (glisser-déposer)', `${N.pname(p)} : ${before} → ${fmt.dayMonth(a.date)} ${a.start}`); N.save(); A.refresh();
          toast(`${esc(N.pname(p))} déplacé à ${a.start} · patient notifié`, 'repeat');
        });
      });
      // défiler vers l'heure courante
      const ag = el.querySelector('.agenda'); if (ag) ag.scrollTop = Math.max(0, (Math.min(D.nowMin(), 17 * 60) - START - 60) / SLOT * PX);
    }
  });
  N.Agenda = { st };
})();
