/* Page publique « Prendre rendez-vous » — créneaux calculés depuis l'agenda réel */
(function () {
  const N = Nacre, D = N.D, S = N.S; const { icon, fmt, esc, avatar, toast, formData } = N.ui;
  document.getElementById('bm').innerHTML = icon('tooth');
  document.getElementById('bgroup').textContent = S.settings.group;
  const qs = new URLSearchParams(location.search); const pre = N.patient(qs.get('patient') || '');
  const st = { step: 1, clinic: pre ? pre.clinic : 'fes', type: '', dentist: '', date: '', time: '', slotDentist: '', done: null };
  const STEPS = ['Soin', 'Praticien', 'Date', 'Heure', 'Coordonnées'];
  const DESC = { consultation: 'Premier rendez-vous, bilan ou nouvelle douleur', controle: 'Visite de suivi ou contrôle annuel', detartrage: 'Nettoyage professionnel et polissage', urgence: 'Douleur, gonflement, dent cassée', orthodontie: 'Consultation ou suivi orthodontique', carie: 'Soin d’une carie identifiée', extraction: 'Sur indication de votre dentiste', implantologie: 'Consultation implantaire', prothese: 'Couronne, bridge, prothèse', chirurgie: 'Sur indication de votre dentiste' };

  const dentistsFor = () => S.staff.filter(s => s.role === 'dentiste' && s.clinic === st.clinic && (st.type !== 'orthodontie' || /ortho/i.test(s.spec)) && (st.type === 'orthodontie' || !/^Orthodontie$/.test(s.spec) || st.type === 'consultation'));
  function slotsFor(dnId, date) {
    const out = []; const dow = D.parse(date).getDay(); if (dow === 0) return out;
    const dur = S.types[st.type].dur; const end = dow === 6 ? D.min('13:00') : D.min('18:30');
    const minStart = date === D.todayYmd() ? D.nowMin() + S.settings.booking.minNotice * 60 : 0;
    for (let m = D.min('08:30'); m + dur <= end; m += 30) {
      if (m < minStart) continue;
      if (m < D.min('14:00') && m + dur > D.min('12:30')) continue;
      const clash = S.appts.some(a => a.dentist === dnId && a.date === date && !['annule', 'noshow'].includes(a.status) && D.min(a.start) < m + dur && m < D.min(a.start) + a.dur);
      if (!clash) out.push(D.hm(m));
    }
    return out;
  }
  function slots(date) {
    const ds = st.dentist && st.dentist !== 'any' ? [st.dentist] : dentistsFor().map(d => d.id);
    const map = {}; ds.forEach(id => slotsFor(id, date).forEach(t => { if (!map[t]) map[t] = id; }));
    return Object.keys(map).sort().map(t => ({ t, d: map[t] }));
  }

  function stepper() { return `<div class="stepper">${STEPS.map((l, i) => `<div class="step ${i + 1 === st.step ? 'on' : i + 1 < st.step ? 'done' : ''}"><span class="n">${i + 1 < st.step ? '✓' : i + 1}</span>${l}</div>`).join('')}</div>`; }
  function body() {
    if (st.step === 1) return `<div class="card-body" style="padding:22px"><h3 style="font-size:17px">Dans quel cabinet ?</h3><div class="chips mt-12 mb-16">${S.clinics.map(c => `<button class="chip ${st.clinic === c.id ? 'on' : ''}" data-cl="${c.id}">${icon('building').replace('<svg', '<svg style="width:13px;height:13px"')}${c.name}</button>`).join('')}</div>
      <h3 style="font-size:17px">Quel est le motif de votre rendez-vous ?</h3><div class="opt-grid mt-12">${S.settings.booking.types.map(k => { const t = S.types[k]; return `<button class="opt ${st.type === k ? 'on' : ''}" data-type="${k}"><div class="row between"><b>${t.label}</b><i style="width:10px;height:10px;border-radius:50%;background:${t.color}"></i></div><span>${DESC[k] || ''}</span><div class="xs muted mt-8">${icon('clock').replace('<svg', '<svg style="width:12px;height:12px;display:inline;vertical-align:-2px"')} ${t.dur} min${k === 'consultation' ? ' · ' + fmt.money(t.price) : ''}</div></button>`; }).join('')}</div></div>`;
    if (st.step === 2) { const ds = dentistsFor(); return `<div class="card-body" style="padding:22px"><h3 style="font-size:17px">Avec quel praticien ?</h3><div class="opt-grid mt-12">${ds.length > 1 ? `<button class="opt ${st.dentist === 'any' ? 'on' : ''}" data-dn="any"><div class="row"><span class="avatar" style="background:var(--sage-50);color:var(--sage)">${icon('zap').replace('<svg', '<svg style="width:16px"')}</span><div><b>Premier disponible</b><span>Le créneau le plus proche</span></div></div></button>` : ''}${ds.map(d => `<button class="opt ${st.dentist === d.id ? 'on' : ''}" data-dn="${d.id}"><div class="row">${avatar(d)}<div><b>${esc(N.name(d))}</b><span>${esc(d.spec)}</span></div></div></button>`).join('')}</div></div>`; }
    if (st.step === 3) {
      const days = []; let d = D.todayYmd(); while (days.length < 21) { if (D.parse(d).getDay() !== 0) days.push(d); d = D.addYmd(d, 1); }
      return `<div class="card-body" style="padding:22px"><h3 style="font-size:17px">Choisissez une date</h3><div class="days mt-12">${days.map(y => { const n = slots(y).length; return `<div class="day ${st.date === y ? 'on' : ''} ${n ? '' : 'off'}" data-day="${y}"><div class="dw">${fmt.dow(y)}</div><div class="dd">${D.parse(y).getDate()}</div><div class="dc">${n ? n + ' créneaux' : 'Complet'}</div></div>`; }).join('')}</div><p class="xs muted mt-12">${fmt.month(days[0])} — faites défiler pour voir les dates suivantes.</p></div>`;
    }
    if (st.step === 4) { const sl = slots(st.date); const am = sl.filter(x => x.t < '12:30'), pm = sl.filter(x => x.t >= '12:30');
      const grp = (l, arr) => arr.length ? `<div class="xs muted mt-16 mb-8" style="text-transform:uppercase;letter-spacing:.08em;font-weight:600">${l}</div><div class="slots">${arr.map(x => `<button class="slot ${st.time === x.t ? 'on' : ''}" data-t="${x.t}" data-sd="${x.d}">${x.t}</button>`).join('')}</div>` : '';
      return `<div class="card-body" style="padding:22px"><h3 style="font-size:17px">${fmt.dateLong(st.date).replace(/^./, c => c.toUpperCase())}</h3>${grp('Matin', am)}${grp('Après-midi', pm)}${!sl.length ? '<p class="muted mt-12">Plus de créneau disponible ce jour.</p>' : ''}</div>`; }
    if (st.step === 5) return `<div class="card-body" style="padding:22px"><h3 style="font-size:17px">Vos coordonnées</h3><form class="form-grid mt-12" id="bf"><div class="field"><label>Prénom *</label><input class="input" name="first" value="${pre ? esc(pre.first) : ''}"></div><div class="field"><label>Nom *</label><input class="input" name="last" value="${pre ? esc(pre.last) : ''}"></div><div class="field"><label>Téléphone mobile *</label><input class="input" name="phone" placeholder="06 00 00 00 00" value="${pre ? pre.phone : ''}"></div><div class="field"><label>Email</label><input class="input" type="email" name="email" value="${pre ? esc(pre.email) : ''}"></div><div class="field"><label>Date de naissance</label><input class="input" type="date" name="dob" value="${pre ? pre.dob : ''}"></div><div class="field"><label>Première visite au cabinet ?</label><select class="select" name="first_visit"><option value="non" ${pre ? 'selected' : ''}>Non, je suis déjà patient</option><option value="oui" ${pre ? '' : 'selected'}>Oui</option></select></div><div class="field full"><label>Précisions (facultatif)</label><textarea class="textarea" name="note" style="min-height:70px" placeholder="Ex. : douleur en bas à gauche depuis 2 jours"></textarea></div>
      <div class="full col gap-6"><label class="check small"><input type="checkbox" name="remind" checked> Je souhaite recevoir la confirmation et les rappels par SMS / WhatsApp</label><label class="check small"><input type="checkbox" name="consent"> J’accepte que mes données soient traitées par le cabinet pour la gestion de mon rendez-vous *</label></div></form></div>`;
  }
  function side() {
    const c = N.clinic(st.clinic); const t = st.type && S.types[st.type]; const dn = N.staff(st.slotDentist || st.dentist);
    return `<div class="card"><div class="card-head"><h3>Récapitulatif</h3></div><div class="card-body"><dl class="kv" style="grid-template-columns:90px 1fr"><dt>Cabinet</dt><dd>${c.name}<div class="xs muted">${esc(c.address)}</div></dd><dt>Soin</dt><dd>${t ? t.label + ` <span class="muted small">(${t.dur} min)</span>` : '—'}</dd><dt>Praticien</dt><dd>${dn ? esc(N.name(dn)) : st.dentist === 'any' ? 'Premier disponible' : '—'}</dd><dt>Date</dt><dd>${st.date ? fmt.dateLong(st.date) : '—'}</dd><dt>Heure</dt><dd>${st.time || '—'}</dd></dl></div></div>
      <div class="card"><div class="card-body small col" style="gap:10px"><div class="row top">${icon('check').replace('<svg', '<svg style="width:16px;height:16px;color:var(--sage);flex:none"')}<span>Confirmation immédiate par SMS et email</span></div><div class="row top">${icon('check').replace('<svg', '<svg style="width:16px;height:16px;color:var(--sage);flex:none"')}<span>Annulation ou modification gratuite jusqu’à 24h avant, depuis votre espace patient</span></div><div class="row top">${icon('phone').replace('<svg', '<svg style="width:16px;height:16px;color:var(--primary);flex:none"')}<span>Une urgence ? Appelez le ${c.phone}</span></div></div></div>`;
  }
  function nav() {
    const can = (st.step === 1 && st.type) || (st.step === 2 && st.dentist) || (st.step === 3 && st.date) || (st.step === 4 && st.time) || st.step === 5;
    return `<div class="row between" style="padding:14px 22px;border-top:1px solid var(--line);background:var(--surface-2)"><button class="btn" data-back ${st.step === 1 ? 'style="visibility:hidden"' : ''}>${icon('chevronLeft')}Retour</button><button class="btn primary" data-next ${can ? '' : 'disabled'}>${st.step === 5 ? icon('check') + 'Confirmer le rendez-vous' : 'Continuer' + icon('chevronRight')}</button></div>`;
  }
  function done() {
    const a = st.done; const d = N.staff(a.dentist); const c = N.clinic(a.clinic);
    document.getElementById('bookSide').innerHTML = '';
    document.getElementById('bookCard').innerHTML = `<div class="card-body center" style="padding:44px 24px"><div class="success-mark">${icon('check')}</div><h2 class="serif" style="font-size:28px;color:var(--navy);font-weight:500">Rendez-vous confirmé</h2><p class="muted mt-8">Une confirmation vient d’être envoyée par SMS${st.email ? ' et par email' : ''}.</p>
      <div class="card mt-24" style="max-width:420px;margin-left:auto;margin-right:auto;text-align:left"><div class="card-body"><div class="row">${avatar(d, 'lg')}<div><b style="font-size:16px">${fmt.dateLong(a.date).replace(/^./, x => x.toUpperCase())}</b><div style="font-size:22px;font-weight:600;color:var(--primary)">${fmt.hShort(a.start)}</div></div></div><div class="divider"></div><dl class="kv" style="grid-template-columns:90px 1fr"><dt>Soin</dt><dd>${S.types[a.type].label}</dd><dt>Praticien</dt><dd>${esc(N.name(d))}</dd><dt>Adresse</dt><dd>${esc(c.address)}</dd></dl></div></div>
      <div class="row wrap mt-24" style="justify-content:center"><button class="btn" data-ics>${icon('calendar')}Ajouter à mon agenda</button><a class="btn primary" href="portail.html">${icon('user')}Accéder à mon espace patient</a></div>
      <p class="xs muted mt-24">Démo : ce rendez-vous apparaît maintenant dans l’agenda du cabinet (<a href="app.html#/agenda">ouvrir l’espace cabinet</a>).</p></div>`;
    document.querySelector('[data-ics]').onclick = () => {
      const dt = (y, t) => y.replace(/-/g, '') + 'T' + t.replace(':', '') + '00';
      const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Nacre//RDV//FR\r\nBEGIN:VEVENT\r\nUID:${a.id}@nacre\r\nDTSTART:${dt(a.date, a.start)}\r\nDTEND:${dt(a.date, D.hm(D.min(a.start) + a.dur))}\r\nSUMMARY:${S.types[a.type].label} — ${N.name(d)}\r\nLOCATION:${c.address}\r\nEND:VEVENT\r\nEND:VCALENDAR`;
      const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); l.download = 'rendez-vous-dentiste.ics'; l.click();
    };
  }
  function render() {
    if (st.done) return done();
    document.getElementById('bookCard').innerHTML = stepper() + body() + nav();
    document.getElementById('bookSide').innerHTML = side();
    const q = s => document.querySelectorAll(s);
    q('[data-cl]').forEach(b => b.onclick = () => { st.clinic = b.dataset.cl; st.dentist = ''; render(); });
    q('[data-type]').forEach(b => b.onclick = () => { st.type = b.dataset.type; st.dentist = ''; render(); });
    q('[data-dn]').forEach(b => b.onclick = () => { st.dentist = b.dataset.dn; render(); });
    q('[data-day]').forEach(b => b.onclick = () => { st.date = b.dataset.day; st.time = ''; render(); });
    q('[data-t]').forEach(b => b.onclick = () => { st.time = b.dataset.t; st.slotDentist = b.dataset.sd; render(); });
    document.querySelector('[data-back]').onclick = () => { st.step--; render(); };
    document.querySelector('[data-next]').onclick = () => { if (st.step < 5) { st.step++; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); } else confirm(); };
  }
  function confirm() {
    const d = formData(document.getElementById('bf'));
    if (!d.first.trim() || !d.last.trim() || d.phone.replace(/\D/g, '').length < 9) return toast('Merci d’indiquer prénom, nom et un numéro de mobile valide', 'alert');
    if (!d.consent) return toast('Merci d’accepter le traitement de vos données pour réserver', 'alert');
    const dnId = st.slotDentist || st.dentist; const dn = N.staff(dnId);
    if (!slotsFor(dnId, st.date).includes(st.time)) { toast('Ce créneau vient d’être réservé — merci d’en choisir un autre', 'alert'); st.step = 4; st.time = ''; return render(); }
    const digits = s => s.replace(/\D/g, '');
    let p = S.patients.find(x => digits(x.phone) === digits(d.phone));
    if (!p) { p = { id: N.uid('p'), first: d.first.trim(), last: d.last.trim(), sex: 'F', dob: d.dob || '1990-01-01', profession: '', clinic: st.clinic, phone: d.phone, email: d.email, address: '', emergency: { name: '', relation: '', phone: '' }, cover: 'Non renseignée', coverNo: '', fileNo: 'DOS-' + String(1300 + S.patients.length).padStart(5, '0'), history: [], allergies: [], meds: [], smoker: false, dentist: dnId, tags: ['Nouveau', 'Réservation en ligne'], created: D.todayYmd(), avatar: '#3AA6A0', notes: '', noShows: 0, lateCount: 0, reinforced: false, consent: { rgpd: true, sms: d.remind, email: !!d.email, whatsapp: d.remind, photos: false } }; S.patients.push(p); }
    const a = { id: N.uid('a'), patient: p.id, dentist: dnId, clinic: dn.clinic, chair: dn.chair, date: st.date, start: st.time, dur: S.types[st.type].dur, type: st.type, status: 'confirme', note: d.note ? 'En ligne : ' + d.note : 'Réservé en ligne', late: 0, moved: false, source: 'online', created: D.stamp() };
    S.appts.push(a);
    S.messages.push({ id: N.uid('m'), patient: p.id, dir: 'out', channel: 'sms', text: `Bonjour ${p.first}, votre rendez-vous chez ${N.name(dn)} est confirmé le ${fmt.dateLong(a.date)} à ${fmt.hShort(a.start)}. ${S.settings.group} — ${N.clinic(a.clinic).city}.`, at: D.stamp(), auto: true, status: 'envoye' });
    N.notify({ kind: 'booking', title: 'Réservation en ligne', text: `${N.pname(p)} — ${S.types[a.type].label}, ${fmt.dayMonth(a.date)} à ${a.start} avec ${N.name(dn)}.`, link: '#/agenda' });
    S.audit.unshift({ at: D.stamp(), user: 'Réservation en ligne', action: 'Rendez-vous réservé en ligne', target: N.pname(p) + ' — ' + fmt.date(a.date) + ' ' + a.start, ip: 'web' });
    N.save(); st.email = d.email; st.done = a; render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (!S.settings.booking.enabled) { document.getElementById('bookCard').innerHTML = `<div class="card-body center" style="padding:40px">${icon('calendar').replace('<svg', '<svg style="width:36px;height:36px;margin:0 auto 10px;color:var(--faint)"')}<b>La prise de rendez-vous en ligne est momentanément indisponible.</b><p class="muted mt-8">Merci de contacter le cabinet par téléphone.</p></div>`; return; }
  render();
})();
