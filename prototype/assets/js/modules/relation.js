/* Communication, rappels automatiques, suivis, no-show, avis, orthodontie */
(function () {
  const N = Nacre, D = N.D, A = N.App, H = A.H;
  const { icon, fmt, esc, avatar, badge, toast, modal, formData } = N.ui;
  const CH = { chat: ['Chat sécurisé', 'lock', '#2C6BCB'], sms: ['SMS', 'smartphone', '#5E9F8D'], email: ['Email', 'mail', '#12264A'], whatsapp: ['WhatsApp', 'whatsapp', '#25A366'], notif: ['Notification', 'bell', '#B89457'] };
  const chIcon = c => `<span title="${CH[c][0]}" style="color:${CH[c][2]};display:inline-flex">${icon(CH[c][1]).replace('<svg', '<svg style="width:12px;height:12px"')}</span>`;
  function bubble(m) {
    const cls = m.dir === 'in' ? 'in' : m.auto ? 'auto' : 'out';
    return `<div class="msg ${cls}">${m.auto ? `<div class="xs" style="font-weight:600;margin-bottom:3px;opacity:.8">${icon('zap').replace('<svg', '<svg style="width:11px;height:11px;display:inline;vertical-align:-1px"')} Envoi automatique</div>` : ''}${esc(m.text)}<div class="mt">${m.dir === 'in' ? '' : chIcon(m.channel)}${CH[m.channel][0]} · ${fmt.rel(m.at.slice(0, 10))} ${fmt.time(m.at)}${m.dir === 'out' ? ' · ✓✓' : ''}</div></div>`;
  }
  N.Comm = { bubble, CH };

  /* =================== COMMUNICATION =================== */
  const CS = { tab: 'inbox', channel: 'chat', q: '' };
  A.view('communication', {
    render(params) {
      const S = N.S;
      CS.tab = ['rappels', 'modeles'].includes(params[0]) ? params[0] : 'inbox';
      const tabs = `<div class="tabs mb-16">${[['inbox', 'Messagerie', 'message'], ['rappels', 'Rappels automatiques', 'zap'], ['modeles', 'Modèles de messages', 'file']].map(([k, l, ic]) => `<a href="#/communication${k === 'inbox' ? '' : '/' + k}" class="${CS.tab === k ? 'on' : ''}">${icon(ic).replace('<svg', '<svg style="width:15px;height:15px"')}${l}</a>`).join('')}</div>`;
      const head = H.head('Communication', 'SMS, email, notifications mobiles, WhatsApp et chat sécurisé');
      if (CS.tab === 'rappels') return head + tabs + rules();
      if (CS.tab === 'modeles') return head + tabs + templates();
      const threads = {}; S.messages.forEach(m => { const p = N.patient(m.patient); if (!p || !N.inClinic(p)) return; (threads[m.patient] = threads[m.patient] || []).push(m); });
      let list = Object.entries(threads).map(([pid, ms]) => ({ pid, ms: ms.sort((a, b) => a.at.localeCompare(b.at)), last: ms[ms.length - 1], unread: ms.filter(m => m.dir === 'in' && m.status === 'non_lu').length })).sort((a, b) => b.last.at.localeCompare(a.last.at));
      if (CS.q) list = list.filter(t => N.pname(t.pid).toLowerCase().includes(CS.q.toLowerCase()));
      const sel = params[0] && N.patient(params[0]) ? params[0] : (list[0] && list[0].pid);
      const p = sel && N.patient(sel); const ms = (threads[sel] || []).sort((a, b) => a.at.localeCompare(b.at));
      return head + tabs + `<div class="card inbox">
        <div class="inbox-list"><div style="padding:12px"><div class="search">${icon('search')}<input id="cq" placeholder="Rechercher…" value="${esc(CS.q)}" style="padding-right:12px"></div><button class="btn sm mt-8" style="width:100%" data-newthread>${icon('plus')}Nouveau message</button></div>
          ${list.map(t => { const pp = N.patient(t.pid); return `<a class="thread ${t.pid === sel ? 'on' : ''}" href="#/communication/${t.pid}" style="color:inherit">${avatar(pp, 'sm')}<div class="grow" style="min-width:0"><div class="row between"><b class="truncate" style="font-size:13px">${esc(N.pname(pp))}</b><span class="xs faint nowrap">${fmt.ago(t.last.at)}</span></div><div class="tx">${t.last.dir === 'in' ? '' : 'Vous : '}${esc(t.last.text)}</div></div>${t.unread ? `<span class="badge st-noshow">${t.unread}</span>` : ''}</a>`; }).join('')}</div>
        <div class="chat">${p ? `
          <div class="chat-head">${avatar(p, 'sm')}<div class="grow"><b>${esc(N.pname(p))}</b><div class="xs muted">${p.phone} · ${esc(p.email)}</div></div><div class="row gap-6 hide-sm">${Object.entries(CH).filter(([k]) => k !== 'chat' && k !== 'notif').map(([k, v]) => `<span class="badge ${p.consent[k === 'whatsapp' ? 'whatsapp' : k] ? 'st-termine' : 'st-annule'}">${v[0]}</span>`).join('')}</div><a class="btn sm" href="#/patients/${p.id}">Fiche</a></div>
          <div class="chat-body" id="cbody">${ms.map(bubble).join('') || '<div class="muted small center">Démarrez la conversation</div>'}</div>
          <div class="chat-compose"><div class="row wrap between" style="gap:8px"><div class="chips">${Object.entries(CH).map(([k, v]) => `<button class="chip ${CS.channel === k ? 'on' : ''}" data-ch="${k}">${v[0]}</button>`).join('')}</div><select class="select sm" id="ctpl" style="width:230px"><option value="">Insérer un modèle…</option>${S.templates.map(t => `<option value="${t.id}">${t.cat} — ${t.name}</option>`).join('')}</select></div>
            <div class="row"><textarea class="textarea" id="cmsg" placeholder="Écrire un message à ${esc(p.first)}…" style="min-height:52px;height:52px"></textarea><button class="btn primary" data-send style="height:52px">${icon('send')}Envoyer</button></div>
            <div class="xs faint">${CS.channel === 'chat' ? '🔒 Chat chiffré de bout en bout — visible dans l’espace patient.' : CS.channel === 'whatsapp' ? 'Via l’intégration WhatsApp Business (si activée).' : 'Envoi via la passerelle ' + CH[CS.channel][0] + ' du cabinet.'}</div></div>` : H.empty('Aucune conversation', 'message')}</div></div>`;
    },
    mount(el, params) {
      const S = N.S;
      if (CS.tab === 'rappels') return mountRules(el);
      if (CS.tab === 'modeles') return mountTemplates(el);
      const q = el.querySelector('#cq'); if (q) q.onchange = e => { CS.q = e.target.value; A.refresh(); };
      el.querySelector('[data-newthread]').onclick = () => modal({ title: 'Nouveau message', body: `<div class="field"><label>Patient</label><select class="select" id="ntp">${H.patientOptions()}</select></div>`, foot: `<button class="btn" data-close>Annuler</button><button class="btn primary" data-go>Ouvrir la conversation</button>`, onMount: m => m.querySelector('[data-go]').onclick = () => { m.close(); location.hash = '#/communication/' + m.querySelector('#ntp').value; } });
      const body = el.querySelector('#cbody'); if (!body) return; body.scrollTop = body.scrollHeight;
      const threadPid = (() => { const h = location.hash.split('/')[2]; if (h && N.patient(h)) return h; const a = el.querySelector('.thread.on'); return a ? a.getAttribute('href').split('/')[2] : null; })();
      let changed = false; S.messages.forEach(m => { if (m.patient === threadPid && m.dir === 'in' && m.status === 'non_lu') { m.status = 'lu'; changed = true; } }); if (changed) { N.save(); A.navRender(); }
      el.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { CS.channel = b.dataset.ch; el.querySelectorAll('[data-ch]').forEach(x => x.classList.toggle('on', x === b)); });
      const p = N.patient(threadPid);
      el.querySelector('#ctpl').onchange = e => { const t = S.templates.find(x => x.id === e.target.value); if (t) { const na = H.nextAppt(p.id); el.querySelector('#cmsg').value = H.fill(t.text, p, na ? { date: fmt.date(na.date), heure: fmt.hShort(na.start), quand: fmt.rel(na.date), dentiste: N.name(N.staff(na.dentist)) } : {}); } e.target.value = ''; };
      const send = () => {
        const txt = el.querySelector('#cmsg').value.trim(); if (!txt) return;
        const key = CS.channel === 'whatsapp' ? 'whatsapp' : CS.channel;
        if (['sms', 'whatsapp', 'email'].includes(CS.channel) && !p.consent[key]) return toast(`${esc(p.first)} n’a pas consenti aux messages ${CH[CS.channel][0]}`, 'lock');
        H.sendMsg(p.id, txt, CS.channel, false); N.log('Message envoyé (' + CH[CS.channel][0] + ')', N.pname(p)); N.save(); A.refresh(); toast('Message envoyé via ' + CH[CS.channel][0], 'send');
      };
      el.querySelector('[data-send]').onclick = send;
      el.querySelector('#cmsg').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); });
    }
  });
  function rules() {
    const S = N.S; const sample = N.patient('p1');
    const auto = S.messages.filter(m => m.auto && N.inClinic(N.patient(m.patient))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
    return `<div class="grid g-3-2" style="align-items:start"><div class="col gap-16">${S.rules.map(r => { const t = S.templates.find(x => x.id === r.template); return `<div class="card" data-rule="${r.id}"><div class="card-body"><div class="row between"><div class="row"><span class="avatar sm" style="background:${r.on ? 'var(--primary-50)' : 'var(--bg-2)'};color:${r.on ? 'var(--primary)' : 'var(--faint)'}">${icon('zap').replace('<svg', '<svg style="width:14px"')}</span><div><b>${esc(r.name)}</b><div class="xs muted">${icon('clock').replace('<svg', '<svg style="width:11px;height:11px;display:inline;vertical-align:-1px"')} ${esc(r.when)} · ${fmt.num(r.sent)} envois</div></div></div><label class="switch"><input type="checkbox" data-ron ${r.on ? 'checked' : ''}><span></span></label></div>
      <div class="row wrap mt-12" style="gap:14px">${Object.entries({ sms: 'SMS', email: 'Email', push: 'Notification mobile', whatsapp: 'WhatsApp' }).map(([k, l]) => `<label class="check small"><input type="checkbox" data-rch="${k}" ${r.channels[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div>
      <div class="msg auto mt-12" style="max-width:100%;align-self:auto">${esc(H.fill(t.text, sample, { date: fmt.date(D.addYmd(D.todayYmd(), 1)), heure: '10h30', quand: 'demain', dentiste: 'Dr. Salma Bennani' }))}</div></div></div>`; }).join('')}</div>
      <div class="col gap-16"><div class="card"><div class="card-head"><h3>Performance des rappels</h3></div><div class="card-body">${N.ui.hbars([{ label: 'Taux de confirmation', value: 87, color: 'var(--primary)' }, { label: 'Taux de lecture SMS', value: 96, color: 'var(--sage)' }, { label: 'Taux de lecture WhatsApp', value: 98, color: '#25A366' }, { label: 'Taux d’ouverture email', value: 64, color: 'var(--navy)' }], { fmtV: v => v + ' %' })}<div class="divider"></div><div class="small">No-show évités estimés ce mois : <b>≈ 23 rendez-vous</b> <span class="muted">(${fmt.money(23 * 420)} préservés)</span></div></div></div>
      <div class="card"><div class="card-head"><h3>Journal des envois automatiques</h3></div><div class="card-body"><div class="list">${auto.map(m => `<div class="li"><div class="grow" style="min-width:0"><div class="small"><b>${esc(N.pname(m.patient))}</b> ${chIcon(m.channel)}</div><div class="xs muted truncate">${esc(m.text)}</div></div><span class="xs faint nowrap">${fmt.ago(m.at)}</span></div>`).join('')}</div></div></div></div></div>`;
  }
  function mountRules(el) {
    el.querySelectorAll('[data-rule]').forEach(c => { const r = N.S.rules.find(x => x.id === c.dataset.rule);
      c.querySelector('[data-ron]').onchange = e => { r.on = e.target.checked; N.log('Règle de rappel ' + (r.on ? 'activée' : 'désactivée'), r.name); N.save(); A.refresh(); toast(r.name + (r.on ? ' activé' : ' désactivé'), 'zap'); };
      c.querySelectorAll('[data-rch]').forEach(i => i.onchange = () => { r.channels[i.dataset.rch] = i.checked; N.save(); }); });
  }
  function templates() {
    return `<div class="grid g2">${N.S.templates.map(t => `<div class="card"><div class="card-head"><div><h3>${esc(t.name)}</h3><div class="sub">${esc(t.cat)}</div></div><button class="btn sm" data-tedit="${t.id}">${icon('edit')}Modifier</button></div><div class="card-body"><p class="small" style="color:var(--ink-2)">${esc(t.text).replace(/\{(\w+)\}/g, '<span class="tag" style="height:18px">{$1}</span>')}</p></div></div>`).join('')}</div><p class="xs muted mt-16">Variables : {prenom} {nom} {dentiste} {date} {heure} {quand} {cabinet} {telephone} {montant} {lien}</p>`;
  }
  function mountTemplates(el) {
    el.querySelectorAll('[data-tedit]').forEach(b => b.onclick = () => { const t = N.S.templates.find(x => x.id === b.dataset.tedit); modal({ title: 'Modifier le modèle', body: `<div class="field"><label>Nom</label><input class="input" id="tn" value="${esc(t.name)}"></div><div class="field mt-12"><label>Texte</label><textarea class="textarea" id="tt" style="min-height:140px">${esc(t.text)}</textarea></div>`, foot: `<button class="btn" data-close>Annuler</button><button class="btn primary" data-s>Enregistrer</button>`, onMount: m => m.querySelector('[data-s]').onclick = () => { t.name = m.querySelector('#tn').value; t.text = m.querySelector('#tt').value; N.save(); m.close(); A.refresh(); toast('Modèle enregistré'); } }); });
  }

  /* =================== SUIVIS & NO-SHOW =================== */
  const FU = { tab: 'taches', f: 'ouverts' };
  function generateFollowups() {
    const S = N.S; const t = D.todayYmd(); let n = 0;
    const exists = (pid, type) => S.followups.some(f => f.patient === pid && f.type === type && f.status !== 'fait');
    S.patients.filter(p => N.inClinic(p)).forEach(p => {
      const ap = S.appts.filter(a => a.patient === p.id);
      const future = ap.some(a => a.date >= t && ['confirme', 'attente'].includes(a.status));
      const lastCtrl = ap.filter(a => ['controle', 'detartrage', 'consultation'].includes(a.type) && a.status === 'termine').map(a => a.date).sort().pop();
      if (!future && (!lastCtrl || D.diffDays(lastCtrl, t) > 25) && !exists(p.id, 'Contrôle 6 mois') && !p.tags.includes('Orthodontie')) { S.followups.push({ id: N.uid('fu'), patient: p.id, type: 'Contrôle 6 mois', due: D.addYmd(lastCtrl || t, 180) < t ? t : D.addYmd(lastCtrl || t, 180), note: 'Généré automatiquement — aucun rendez-vous futur', status: 'a_faire', auto: true }); n++; }
      if (p.tags.includes('Orthodontie') && !ap.some(a => a.date >= t && a.date <= D.addYmd(t, 35) && a.type === 'orthodontie') && !exists(p.id, 'Contrôle orthodontique')) { S.followups.push({ id: N.uid('fu'), patient: p.id, type: 'Contrôle orthodontique', due: D.addYmd(t, 7), note: 'Aucun contrôle planifié dans les 5 semaines', status: 'a_faire', auto: true }); n++; }
    });
    S.plans.forEach(pl => { if (pl.items.some(i => ['accepte', 'propose'].includes(i.status) && !i.planned) && !exists(pl.patient, 'Relance plan de traitement') && N.inClinic(N.patient(pl.patient))) { S.followups.push({ id: N.uid('fu'), patient: pl.patient, type: 'Relance plan de traitement', due: t, note: pl.title + ' — étape non planifiée', status: 'a_faire', auto: true }); n++; } });
    N.log('Analyse des suivis', n + ' tâches créées'); N.save(); return n;
  }
  A.view('suivis', {
    render() {
      const S = N.S; const t = D.todayYmd();
      const tabs = `<div class="tabs mb-16"><button class="${FU.tab === 'taches' ? 'on' : ''}" data-fut="taches">Rappels de suivi</button><button class="${FU.tab === 'noshow' ? 'on' : ''}" data-fut="noshow">Absences & no-show</button></div>`;
      if (FU.tab === 'noshow') return H.head('Suivis', 'Rappels intelligents et gestion des absences') + tabs + noShow();
      const all = S.followups.filter(f => N.inClinic(N.patient(f.patient)));
      let list = FU.f === 'ouverts' ? all.filter(f => f.status !== 'fait') : FU.f === 'retard' ? all.filter(f => f.status !== 'fait' && f.due < t) : FU.f === 'auto' ? all.filter(f => f.auto) : all.filter(f => f.status === 'fait');
      list = list.sort((a, b) => a.due.localeCompare(b.due));
      const TC = { 'Contrôle 6 mois': 'tone-blue', 'Détartrage recommandé': 'tone-teal', 'Contrôle orthodontique': 'tone-violet', 'Suivi après traitement': 'tone-sage', 'Relance devis': 'tone-gold', 'Relance paiement': 'tone-red', 'Relance plan de traitement': 'tone-amber' };
      return `${H.head('Suivis', 'Rappels intelligents et gestion des absences', `<button class="btn gold" data-gen>${icon('sparkles')}Analyser & générer les suivis</button>`)}${tabs}
      <div class="grid g4 mb-16">${H.kpi('À faire', all.filter(f => f.status !== 'fait').length, 'repeat', 'tone-blue')}${H.kpi('En retard', all.filter(f => f.status !== 'fait' && f.due < t).length, 'alert', 'tone-red')}${H.kpi('Cette semaine', all.filter(f => f.status !== 'fait' && f.due >= t && f.due <= D.addYmd(t, 7)).length, 'calendar', 'tone-amber')}${H.kpi('Générés automatiquement', all.filter(f => f.auto).length, 'zap', 'tone-gold')}</div>
      <div class="card"><div class="card-body"><div class="chips">${[['ouverts', 'Ouverts'], ['retard', 'En retard'], ['auto', 'Automatiques'], ['faits', 'Terminés']].map(([k, l]) => `<button class="chip ${FU.f === k ? 'on' : ''}" data-ff="${k}">${l}</button>`).join('')}</div></div>
      <div class="table-wrap"><table class="table responsive"><thead><tr><th>Patient</th><th>Suivi</th><th>Échéance</th><th>Note</th><th>Statut</th><th></th></tr></thead><tbody>${list.map(f => `<tr data-fu="${f.id}"><td data-l="Patient">${H.pcell(f.patient, N.patient(f.patient).phone)}</td><td data-l="Suivi">${badge(f.type, TC[f.type] || 'tone-gray', false)}${f.auto ? ` <span title="Généré automatiquement" style="color:var(--gold)">${icon('zap').replace('<svg', '<svg style="width:12px;height:12px;display:inline"')}</span>` : ''}</td><td data-l="Échéance" style="${f.due < t && f.status !== 'fait' ? 'color:var(--danger);font-weight:600' : ''}">${fmt.rel(f.due)}</td><td data-l="Note" class="small muted">${esc(f.note)}</td><td data-l="Statut">${f.status === 'fait' ? badge('Fait', 'st-termine') : f.status === 'relance' ? badge('Relancé', 'st-attente') : badge('À faire', 'st-confirme')}</td><td>${f.status !== 'fait' ? `<div class="row gap-4">${N.can('agenda.manage') ? `<button class="btn xs" data-plan>${icon('calendar')}Planifier</button>` : ''}${N.can('comm.send') ? `<button class="btn xs" data-remind>${icon('send')}Rappel</button>` : ''}<button class="btn xs" data-done>${icon('check')}</button></div>` : ''}</td></tr>`).join('') || `<tr><td colspan="6">${H.empty('Aucun suivi', 'repeat')}</td></tr>`}</tbody></table></div></div>`;
    },
    mount(el) {
      const S = N.S;
      el.querySelectorAll('[data-fut]').forEach(b => b.onclick = () => { FU.tab = b.dataset.fut; A.refresh(); });
      if (FU.tab === 'noshow') return mountNoShow(el);
      el.querySelectorAll('[data-ff]').forEach(b => b.onclick = () => { FU.f = b.dataset.ff; A.refresh(); });
      el.querySelector('[data-gen]').onclick = () => { const n = generateFollowups(); A.refresh(); toast(n ? n + ' nouvelle(s) tâche(s) de suivi créée(s)' : 'Aucun nouveau suivi nécessaire', 'sparkles'); };
      el.querySelectorAll('[data-fu]').forEach(r => { const f = S.followups.find(x => x.id === r.dataset.fu); const p = N.patient(f.patient);
        const pl = r.querySelector('[data-plan]'); if (pl) pl.onclick = () => A.newAppt({ patient: p.id, dentist: p.dentist, type: f.type.includes('ortho') ? 'orthodontie' : f.type.includes('Détartrage') ? 'detartrage' : 'controle', date: f.due < D.todayYmd() ? D.addYmd(D.todayYmd(), 1) : f.due, note: f.type });
        const rm = r.querySelector('[data-remind]'); if (rm) rm.onclick = () => { H.sendMsg(p.id, H.fill(S.templates[6].text, p), p.consent.whatsapp ? 'whatsapp' : 'sms', true); f.status = 'relance'; N.save(); A.refresh(); toast('Rappel de suivi envoyé à ' + esc(p.first), 'send'); };
        const dn = r.querySelector('[data-done]'); if (dn) dn.onclick = () => { f.status = 'fait'; N.save(); A.refresh(); toast('Suivi marqué comme fait'); }; });
    }
  });
  function noShow() {
    const S = N.S; const t = D.todayYmd(); const from = D.addYmd(t, -30);
    const ap = S.appts.filter(a => N.inClinic(a) && a.date >= from && a.date <= t);
    const c = { annule: ap.filter(a => a.status === 'annule').length, moved: ap.filter(a => a.moved).length, noshow: ap.filter(a => a.status === 'noshow').length, late: ap.filter(a => a.late).length };
    const rate = c.noshow / (ap.length || 1) * 100;
    const byDow = [1, 2, 3, 4, 5, 6].map(d => { const x = ap.filter(a => D.parse(a.date).getDay() === d); return x.length ? x.filter(a => a.status === 'noshow').length / x.length * 100 : 0; });
    const risky = S.patients.filter(p => N.inClinic(p) && p.noShows >= 2).sort((a, b) => b.noShows - a.noShows);
    const hist = S.session.clinic === 'all' ? N.sumHist() : S.history[S.session.clinic];
    return `<div class="grid g4 mb-16">${H.kpi('Rendez-vous annulés', c.annule, 'x', 'tone-gray', '<span>30 derniers jours</span>')}${H.kpi('Rendez-vous déplacés', c.moved, 'repeat', 'tone-violet', '<span>30 derniers jours</span>')}${H.kpi('No-show', c.noshow, 'alert', 'tone-red', `<span>taux ${fmt.pct(rate)}</span>`)}${H.kpi('Retards', c.late, 'clock', 'tone-amber', `<span>moy. ${Math.round(ap.filter(a => a.late).reduce((s, a) => s + a.late, 0) / (c.late || 1))} min</span>`)}</div>
    <div class="grid g2 mb-16"><div class="card"><div class="card-head"><h3>Taux de no-show — 12 mois</h3></div><div class="card-body">${N.ui.lineChart({ labels: hist.map(h => fmt.mshort(h.m)), series: [{ name: 'No-show', data: hist.map(h => h.noshow), color: '#CF4759' }], height: 200, fmtV: v => fmt.pct(v), min0: true })}</div></div>
      <div class="card"><div class="card-head"><h3>No-show par jour de la semaine</h3></div><div class="card-body">${N.ui.barChart({ labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'], series: [{ name: 'Taux de no-show', data: byDow.map(v => Math.round(v * 10) / 10), color: '#CF4759' }], height: 200, fmtV: v => fmt.pct(v) })}</div></div></div>
    <div class="card"><div class="card-head"><div><h3>Patients à risque (≥ 2 rendez-vous non honorés)</h3><div class="sub">Le rappel renforcé envoie 3 rappels (48h, 24h, 3h) et exige une confirmation</div></div>${N.can('comm.send') ? `<button class="btn primary sm" data-reinf-all>${icon('zap')}Activer pour tous & envoyer</button>` : ''}</div>
      <div class="table-wrap"><table class="table responsive"><thead><tr><th>Patient</th><th class="num">No-show</th><th class="num">Retards</th><th>Prochain RDV</th><th>Rappel renforcé</th><th></th></tr></thead><tbody>${risky.map(p => { const na = H.nextAppt(p.id); return `<tr data-rp="${p.id}"><td data-l="Patient">${H.pcell(p, p.phone)}</td><td data-l="No-show" class="num"><b style="color:var(--danger)">${p.noShows}</b></td><td data-l="Retards" class="num">${p.lateCount}</td><td data-l="Prochain RDV">${na ? fmt.rel(na.date) + ' · ' + na.start : '<span class="faint">—</span>'}</td><td data-l="Renforcé"><label class="switch"><input type="checkbox" data-reinf ${p.reinforced ? 'checked' : ''}><span></span></label></td><td>${na && N.can('comm.send') ? `<button class="btn xs" data-send>${icon('send')}Envoyer maintenant</button>` : ''}</td></tr>`; }).join('') || `<tr><td colspan="6">${H.empty('Aucun patient à risque', 'check')}</td></tr>`}</tbody></table></div></div>`;
  }
  function mountNoShow(el) {
    const S = N.S;
    const reinforced = (p, na) => H.sendMsg(p.id, `Bonjour ${p.first}, votre rendez-vous du ${fmt.dateLong(na.date)} à ${fmt.hShort(na.start)} est réservé pour vous. Merci de confirmer votre présence en répondant OUI, ou de nous prévenir au ${N.clinic(p.clinic).phone} si vous ne pouvez pas venir.`, p.consent.whatsapp ? 'whatsapp' : 'sms', true);
    el.querySelectorAll('[data-rp]').forEach(r => { const p = N.patient(r.dataset.rp);
      r.querySelector('[data-reinf]').onchange = e => { p.reinforced = e.target.checked; N.log('Rappel renforcé ' + (p.reinforced ? 'activé' : 'désactivé'), N.pname(p)); N.save(); toast('Rappel renforcé ' + (p.reinforced ? 'activé' : 'désactivé') + ' pour ' + esc(p.first)); };
      const s = r.querySelector('[data-send]'); if (s) s.onclick = () => { reinforced(p, H.nextAppt(p.id)); N.save(); toast('Rappel renforcé envoyé', 'send'); }; });
    const all = el.querySelector('[data-reinf-all]'); if (all) all.onclick = () => { let n = 0; S.patients.filter(p => N.inClinic(p) && p.noShows >= 2).forEach(p => { p.reinforced = true; const na = H.nextAppt(p.id); if (na) { reinforced(p, na); n++; } }); N.log('Rappels renforcés envoyés', n + ' patients'); N.save(); A.refresh(); toast(`Rappel renforcé activé · ${n} message(s) envoyé(s)`, 'zap'); };
  }

  /* =================== AVIS & SATISFACTION =================== */
  const AV = { f: 'all' };
  const stars = n => `<span style="color:var(--gold);letter-spacing:1px">${'★'.repeat(n)}<span style="color:var(--line-2)">${'★'.repeat(5 - n)}</span></span>`;
  A.view('avis', {
    render() {
      const S = N.S; const all = S.reviews.filter(r => N.inClinic(r));
      const avg = all.reduce((s, r) => s + r.rating, 0) / (all.length || 1);
      const months = Array.from({ length: 6 }, (_, i) => { const d = D.today(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i)); return D.ymd(d).slice(0, 7); });
      const evo = months.map(m => { const x = all.filter(r => r.date.slice(0, 7) === m); return x.length ? +(x.reduce((s, r) => s + r.rating, 0) / x.length).toFixed(2) : avg; });
      const cnt = months.map(m => all.filter(r => r.date.slice(0, 7) === m).length);
      let list = all.filter(r => r.comment); if (AV.f !== 'all') list = list.filter(r => r.rating === +AV.f);
      const byDent = N.dentists().map(d => { const x = all.filter(r => r.dentist === d.id); return { d, n: x.length, avg: x.reduce((s, r) => s + r.rating, 0) / (x.length || 1) }; }).filter(x => x.n);
      const todayDone = S.appts.filter(a => a.date === D.todayYmd() && a.status === 'termine' && N.inClinic(a));
      return `${H.head('Avis & satisfaction', 'Enquête envoyée automatiquement après chaque consultation', N.can('comm.send') ? `<button class="btn primary" data-ask>${icon('send')}Demander un avis (${todayDone.length} patients du jour)</button>` : '')}
      <div class="grid g4 mb-16"><div class="card kpi premium"><div class="label"><span class="ico tone-gold">${icon('star')}</span>Satisfaction moyenne</div><div class="value">${avg.toFixed(2).replace('.', ',')}<small>/ 5</small></div><div class="foot">${stars(Math.round(avg))}</div></div>${H.kpi('Nombre d’avis', all.length, 'message', 'tone-blue', '<span>6 derniers mois</span>')}${H.kpi('Avis 5 étoiles', Math.round(all.filter(r => r.rating === 5).length / (all.length || 1) * 100) + ' %', 'heart', 'tone-red')}${H.kpi('Taux de réponse', '41 %', 'activity', 'tone-sage', '<span>des demandes envoyées</span>')}</div>
      <div class="grid g-3-2 mb-16"><div class="card"><div class="card-head"><h3>Évolution de la satisfaction</h3></div><div class="card-body">${N.ui.lineChart({ labels: months.map(m => fmt.mshort(m + '-01')), series: [{ name: 'Note moyenne', data: evo, color: '#B89457' }], height: 210, fmtV: v => v.toFixed(2).replace('.', ',') + ' / 5', min0: false })}<div class="row between small muted mt-8">${cnt.map((c, i) => `<span>${fmt.mshort(months[i] + '-01')} : ${c} avis</span>`).join('')}</div></div></div>
        <div class="card"><div class="card-head"><h3>Répartition des notes</h3></div><div class="card-body">${N.ui.hbars([5, 4, 3, 2, 1].map(n => ({ label: n + ' étoile' + (n > 1 ? 's' : ''), value: all.filter(r => r.rating === n).length, color: n >= 4 ? 'var(--gold)' : n === 3 ? 'var(--warning)' : 'var(--danger)' })))}<div class="divider"></div><div class="xs muted mb-8">Par praticien</div>${byDent.map(x => `<div class="row between small" style="padding:4px 0"><span>${esc(N.name(x.d))}</span><span>${stars(Math.round(x.avg))} <b class="mono">${x.avg.toFixed(1).replace('.', ',')}</b> <span class="muted">(${x.n})</span></span></div>`).join('')}</div></div></div>
      <div class="grid g-2-1"><div class="card"><div class="card-head"><h3>Commentaires</h3><div class="chips">${['all', 5, 4, 3].map(k => `<button class="chip ${String(AV.f) === String(k) ? 'on' : ''}" data-af="${k}">${k === 'all' ? 'Tous' : k + '★'}</button>`).join('')}</div></div><div class="card-body"><div class="list">${list.slice(0, 20).map(r => `<div class="li" style="align-items:flex-start">${avatar(N.patient(r.patient), 'sm')}<div class="grow"><div class="row between"><b style="font-size:13px">${esc(N.patient(r.patient).first)} ${esc(N.patient(r.patient).last[0])}.</b><span class="xs muted">${fmt.date(r.date)}</span></div><div>${stars(r.rating)}</div><p class="small mt-4" style="color:var(--ink-2)">${esc(r.comment)}</p><div class="xs muted">${esc(N.name(N.staff(r.dentist)))}</div></div></div>`).join('')}</div></div></div>
        <div class="card"><div class="card-head"><h3>Aperçu de l’enquête</h3></div><div class="card-body"><div style="border:1px solid var(--line);border-radius:16px;padding:20px;text-align:center;background:linear-gradient(180deg,#fff,var(--surface-2))"><div class="brand-mark" style="margin:0 auto 10px">${icon('tooth')}</div><b class="serif" style="font-size:19px;color:var(--navy)">Comment s’est passée votre expérience ?</b><p class="small muted mt-8">Votre avis nous aide à améliorer nos soins.</p><div style="font-size:30px;color:var(--gold);margin:12px 0;letter-spacing:4px">★★★★★</div><div class="input" style="height:60px;text-align:left;padding-top:8px;color:var(--faint)">Un commentaire (facultatif)…</div><button class="btn primary mt-12" style="width:100%">Envoyer mon avis</button></div><p class="xs muted mt-12">Envoyé 2h après le rendez-vous (règle « Message après rendez-vous »).</p></div></div></div>`;
    },
    mount(el) {
      const S = N.S;
      el.querySelectorAll('[data-af]').forEach(b => b.onclick = () => { AV.f = b.dataset.af; A.refresh(); });
      const a = el.querySelector('[data-ask]'); if (a) a.onclick = () => { const done = S.appts.filter(x => x.date === D.todayYmd() && x.status === 'termine' && N.inClinic(x)); new Set(done.map(x => x.patient)).forEach(pid => H.sendMsg(pid, H.fill(S.templates[7].text, N.patient(pid)), 'sms', true)); N.save(); toast(`Demande d’avis envoyée à ${new Set(done.map(x => x.patient)).size} patient(s)`, 'star'); };
    }
  });

  /* =================== ORTHODONTIE =================== */
  A.view('orthodontie', {
    render(params) {
      const S = N.S;
      if (params[0]) return orthoDetail(params[0]);
      const list = S.ortho.filter(o => N.inClinic(N.patient(o.patient)));
      return `${H.head('Orthodontie', 'Suivi mensuel, appareils, évolution photo et paiements', N.can('clinical.edit') ? `<button class="btn primary" data-no>${icon('plus')}Nouveau traitement</button>` : '')}
      <div class="grid g4 mb-16">${H.kpi('Patients en traitement', list.length, 'users', 'tone-violet')}${H.kpi('Contrôles ce mois', S.appts.filter(a => a.type === 'orthodontie' && a.date.slice(0, 7) === D.todayYmd().slice(0, 7) && N.inClinic(a)).length, 'calendar', 'tone-blue')}${H.kpi('Forfaits en cours', fmt.money(list.reduce((s, o) => s + o.fee, 0)), 'wallet', 'tone-gold')}${H.kpi('Reste à encaisser', fmt.money(list.reduce((s, o) => s + o.fee - o.paid, 0)), 'receipt', 'tone-red')}</div>
      <div class="grid g2">${list.map(o => { const p = N.patient(o.patient); const na = S.appts.filter(a => a.patient === p.id && a.date >= D.todayYmd() && a.type === 'orthodontie').sort((a, b) => a.date.localeCompare(b.date))[0]; return `<a class="card hover" href="#/orthodontie/${o.id}" style="color:inherit"><div class="card-body"><div class="row between"><div class="row">${avatar(p)}<div><b>${esc(N.pname(p))}</b><div class="xs muted">${N.age(p.dob)} ans · ${esc(o.appliance)}</div></div></div>${badge(o.stage, 'tone-violet', false)}</div>
        <div class="row between small mt-16"><span>Mois ${o.current} / ${o.months}</span><span class="muted">Fin prévue ${fmt.month(D.addYmd(o.start, o.months * 30))}</span></div><div class="progress mt-8" style="height:8px"><i style="width:${o.current / o.months * 100}%;background:linear-gradient(90deg,var(--violet),var(--primary))"></i></div>
        <div class="row between xs muted mt-12"><span>${na ? 'Prochain contrôle : ' + fmt.rel(na.date) + ' · ' + na.start : 'Aucun contrôle planifié'}</span><span>Payé ${fmt.money(o.paid)} / ${fmt.money(o.fee)}</span></div></div></a>`; }).join('')}</div>`;
    },
    mount(el, params) {
      const S = N.S;
      if (params[0]) return mountOrtho(el, params[0]);
      const n = el.querySelector('[data-no]'); if (n) n.onclick = () => modal({ title: 'Nouveau traitement orthodontique', body: `<form class="col" style="gap:12px" id="fo"><div class="field"><label>Patient</label><select class="select" name="patient">${H.patientOptions()}</select></div><div class="field"><label>Appareil</label><select class="select" name="appliance"><option>Bagues métalliques</option><option>Bagues céramiques</option><option>Aligneurs transparents</option><option>Appareil amovible (plaque)</option><option>Disjoncteur</option></select></div><div class="row"><div class="field grow"><label>Durée (mois)</label><input class="input" type="number" name="months" value="18"></div><div class="field grow"><label>Forfait (DH)</label><input class="input" type="number" name="fee" value="18000"></div></div><div class="field"><label>Date de début</label><input class="input" type="date" name="start" value="${D.todayYmd()}"></div></form>`, foot: `<button class="btn" data-close>Annuler</button><button class="btn primary" data-s>Créer</button>`,
        onMount: m => m.querySelector('[data-s]').onclick = () => { const d = formData(m.querySelector('#fo')); const months = +d.months; const o = { id: N.uid('or'), patient: d.patient, dentist: 'd3', appliance: d.appliance, start: d.start, months, current: 0, fee: +d.fee, paid: 0, stage: 'Début de traitement', steps: Array.from({ length: months + 1 }, (_, i) => ({ month: i, date: D.addYmd(d.start, i * 30), done: i === 0, note: i === 0 ? 'Pose de l’appareil' : '', photo: false })) }; S.ortho.push(o); const p = N.patient(d.patient); if (!p.tags.includes('Orthodontie')) p.tags.push('Orthodontie'); N.save(); m.close(); location.hash = '#/orthodontie/' + o.id; } });
    }
  });
  function orthoDetail(id) {
    const S = N.S; const o = S.ortho.find(x => x.id === id); if (!o) return H.empty('Traitement introuvable');
    const p = N.patient(o.patient);
    const ap = S.appts.filter(a => a.patient === p.id && a.type === 'orthodontie').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    return `<div class="crumbs"><a href="#/orthodontie">Orthodontie</a> › ${esc(N.pname(p))}</div>
      ${H.head(esc(N.pname(p)), `${esc(o.appliance)} · ${esc(N.name(N.staff(o.dentist)))} · début ${fmt.date(o.start)}`, `${N.can('agenda.manage') ? `<button class="btn" data-rdv>${icon('calendar')}Planifier le contrôle</button>` : ''}${N.can('clinical.edit') ? `<button class="btn primary" data-step>${icon('plus')}Suivi du mois ${o.current + 1}</button>` : ''}`)}
      <div class="card mb-16"><div class="card-head"><h3>Timeline du traitement</h3><span class="badge tone-violet">${esc(o.stage)}</span></div><div class="card-body" style="overflow-x:auto"><div style="display:flex;align-items:flex-start;min-width:${Math.max(600, (o.months + 1) * 64)}px;padding:10px 4px 4px">
        ${o.steps.map((s, i) => `<div style="flex:1;text-align:center;position:relative">${i ? `<div style="position:absolute;top:13px;right:50%;width:100%;height:2px;background:${s.done ? 'var(--violet)' : 'var(--line)'}"></div>` : ''}<div style="position:relative;z-index:1;width:28px;height:28px;border-radius:50%;margin:0 auto;display:grid;place-items:center;font-size:11px;font-weight:600;${s.done ? 'background:var(--violet);color:#fff' : i === o.current + 1 ? 'background:#fff;border:2px solid var(--violet);color:var(--violet);box-shadow:0 0 0 4px var(--violet-50)' : 'background:#fff;border:1.5px solid var(--line-2);color:var(--faint)'}">${s.photo ? icon('image').replace('<svg', '<svg style="width:13px;height:13px"') : i === 0 ? '▶' : i === o.months ? '★' : i}</div><div class="xs mt-8" style="font-weight:600;color:${s.done ? 'var(--ink)' : 'var(--faint)'}">${i === 0 ? 'Début' : i === o.months ? 'Fin' : 'M' + i}</div><div class="xs faint">${fmt.mshort(s.date)}</div></div>`).join('')}
      </div></div></div>
      <div class="grid g-3-2"><div class="card"><div class="card-head"><h3>Suivi mensuel</h3></div><div class="card-body"><div class="timeline">${o.steps.filter(s => s.done).reverse().map(s => `<div class="tl-item"><span class="tl-dot" style="border-color:var(--violet)"><i style="background:var(--violet)"></i></span><div class="tl-date">${s.month === 0 ? 'Début' : 'Mois ' + s.month} · ${fmt.date(s.date)}</div><div class="tl-card"><p class="small">${esc(s.note)}</p>${s.photo ? `<div class="row gap-6 mt-8">${[1, 2, 3].map(k => `<div style="width:88px;border-radius:8px;overflow:hidden;aspect-ratio:16/9">${N.ui.smile('#F1E9D6', s.month * 7 + k, s.month < o.months * .6)}</div>`).join('')}</div>` : ''}</div></div>`).join('')}</div></div></div>
        <div class="col gap-16"><div class="card"><div class="card-head"><h3>Évolution</h3></div><div class="card-body"><div class="ba" data-ba style="aspect-ratio:16/10"><div class="ba-img">${N.ui.smile('#F1E9D6', 11, true)}</div><div class="ba-img ba-after">${N.ui.smile('#F4EEDF', 11, o.current < o.months * .5)}</div><div class="ba-handle"></div><span class="ba-lab" style="left:10px">Début</span><span class="ba-lab" style="right:10px">Mois ${o.current}</span></div></div></div>
          <div class="card"><div class="card-head"><h3>Paiements</h3></div><div class="card-body"><div class="row between"><span class="muted">Forfait</span><b>${fmt.money(o.fee)}</b></div><div class="row between mt-8"><span class="muted">Payé</span><b style="color:var(--success)">${fmt.money(o.paid)}</b></div><div class="progress sage mt-8"><i style="width:${o.paid / o.fee * 100}%"></i></div><div class="row between mt-8"><span class="muted">Reste</span><b>${fmt.money(o.fee - o.paid)}</b></div><div class="xs muted mt-8">Échéancier : ${fmt.money(Math.round(o.fee / o.months))} / mois</div>${N.can('finance.edit') ? `<button class="btn sm mt-12" data-opay>${icon('card')}Encaisser une mensualité</button>` : ''}</div></div>
          <div class="card"><div class="card-head"><h3>Rendez-vous</h3></div><div class="card-body"><div class="list">${ap.map(a => `<div class="li click" data-act="appt" data-id="${a.id}"><div class="grow"><div class="t">${fmt.date(a.date)} · ${a.start}</div></div>${N.ui.stBadge(a.status)}</div>`).join('') || '<div class="small muted">—</div>'}</div></div></div></div></div>`;
  }
  function mountOrtho(el, id) {
    const S = N.S; const o = S.ortho.find(x => x.id === id); if (!o) return; const p = N.patient(o.patient);
    N.Imaging.mountBA(el);
    const r = el.querySelector('[data-rdv]'); if (r) r.onclick = () => A.newAppt({ patient: p.id, dentist: o.dentist, type: 'orthodontie', date: o.steps[o.current + 1] ? o.steps[o.current + 1].date : D.todayYmd() });
    const s = el.querySelector('[data-step]'); if (s) s.onclick = () => modal({ title: `Suivi — mois ${o.current + 1}`, body: `<div class="field"><label>Observations & actes</label><textarea class="textarea" id="on" placeholder="Ex. : changement d’arc, élastiques…"></textarea></div><div class="field mt-12"><label>Étape</label><input class="input" id="os" value="${esc(o.stage)}"></div><label class="check mt-12"><input type="checkbox" id="op" checked> Photos de suivi prises</label>`, foot: `<button class="btn" data-close>Annuler</button><button class="btn primary" data-s>Enregistrer</button>`,
      onMount: m => m.querySelector('[data-s]').onclick = () => { o.current = Math.min(o.months, o.current + 1); const st = o.steps[o.current]; st.done = true; st.note = m.querySelector('#on').value || 'Contrôle et activation'; st.photo = m.querySelector('#op').checked; st.date = D.todayYmd(); o.stage = m.querySelector('#os').value; N.log('Suivi orthodontique', N.pname(p) + ' — mois ' + o.current); N.save(); m.close(); A.refresh(); toast('Suivi du mois ' + o.current + ' enregistré', 'activity'); } });
    const op = el.querySelector('[data-opay]'); if (op) op.onclick = () => { const amt = Math.min(o.fee - o.paid, Math.round(o.fee / o.months)); o.paid += amt; S.payments.push({ id: N.uid('pay'), invoice: '', patient: p.id, clinic: p.clinic, date: D.todayYmd(), amount: amt, method: 'carte', kind: 'paiement', ref: 'Mensualité orthodontie' }); N.log('Mensualité orthodontie encaissée', N.pname(p)); N.save(); A.refresh(); toast('Mensualité de ' + fmt.money(amt) + ' encaissée', 'card'); };
  }
})();
