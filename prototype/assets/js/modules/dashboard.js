/* Dashboard du cabinet */
(function () {
  const N = Nacre, D = N.D, A = N.App, H = A.H;
  const { icon, fmt, esc, avatar, badge, stBadge } = N.ui;
  let filterDentist = 'all';

  function stats() {
    const S = N.S, t = D.todayYmd(), m0 = t.slice(0, 8) + '01';
    const ap = S.appts.filter(a => N.inClinic(a));
    const today = ap.filter(a => a.date === t && (filterDentist === 'all' || a.dentist === filterDentist)).sort((a, b) => a.start.localeCompare(b.start));
    const pays = S.payments.filter(p => N.inClinic(p));
    const inv = S.invoices.filter(i => N.inClinic(i));
    const unpaid = inv.filter(i => ['impayee', 'retard', 'retard_partiel', 'partielle'].includes(N.invoiceStatus(i)));
    return {
      t, today,
      todayActive: today.filter(a => a.status !== 'annule'),
      patientsToday: new Set(today.filter(a => !['annule', 'noshow'].includes(a.status)).map(a => a.patient)).size,
      newPatients: S.patients.filter(p => N.inClinic(p) && p.created >= m0).length,
      plansActive: S.plans.filter(p => N.inClinic(N.patient(p.patient)) && ['encours', 'planifie', 'accepte'].includes(p.status)).length,
      upcoming: ap.filter(a => a.date > t && a.date <= D.addYmd(t, 7) && ['confirme', 'attente'].includes(a.status)).length,
      payToday: pays.filter(p => p.date === t).reduce((s, p) => s + p.amount, 0),
      unpaidN: unpaid.length, unpaidAmt: unpaid.reduce((s, i) => s + N.invoiceTotal(i) - N.invoicePaid(i), 0),
      revenueMonth: pays.filter(p => p.date >= m0 && p.date <= t).reduce((s, p) => s + p.amount, 0),
      ap, inv
    };
  }

  function alerts() {
    const S = N.S, t = D.todayYmd(); const out = [];
    const toConfirm = S.appts.filter(a => N.inClinic(a) && a.status === 'attente' && a.date >= t && a.date <= D.addYmd(t, 2));
    if (toConfirm.length) out.push(['calendar', 'tone-amber', `${toConfirm.length} rendez-vous à confirmer`, 'Aujourd’hui et les 2 prochains jours', '#/agenda']);
    const late = S.invoices.filter(i => N.inClinic(i) && N.invoiceStatus(i).startsWith('retard'));
    if (late.length) out.push(['card', 'tone-red', `${late.length} paiements en retard`, fmt.money(late.reduce((s, i) => s + N.invoiceTotal(i) - N.invoicePaid(i), 0)) + ' à recouvrer', '#/facturation/retard']);
    const fu = S.followups.filter(f => f.status !== 'fait' && f.due <= t && N.inClinic(N.patient(f.patient)));
    if (fu.length) out.push(['repeat', 'tone-violet', `${fu.length} traitements / suivis à relancer`, fu.slice(0, 2).map(f => N.pname(f.patient)).join(', ') + (fu.length > 2 ? '…' : ''), '#/suivis']);
    const docs = S.labCases.filter(l => N.inClinic(l) && l.status === 'recu');
    const portal = S.docs.filter(d => d.fromPortal && !d.reviewed);
    if (docs.length || portal.length) out.push(['file', 'tone-blue', `${docs.length + portal.length} résultat(s) / document(s) à consulter`, docs.map(l => l.type + ' ' + N.pname(l.patient)).concat(portal.map(d => d.title)).slice(0, 2).join(' · '), docs.length ? '#/laboratoire' : '#/radiographies']);
    const low = S.stock.filter(s => N.inClinic(s) && s.qty <= s.min);
    if (low.length) out.push(['box', 'tone-red', `${low.length} produits en stock faible`, low.slice(0, 2).map(s => s.name).join(', ') + '…', '#/stock']);
    const exp = S.stock.filter(s => N.inClinic(s) && D.diffDays(t, s.exp) <= 60);
    if (exp.length) out.push(['clock', 'tone-amber', `${exp.length} produits bientôt expirés`, 'Dans les 60 prochains jours', '#/stock']);
    const lab = S.labCases.filter(l => N.inClinic(l) && ['envoye', 'fabrication', 'pret'].includes(l.status) && l.due <= D.addYmd(t, 2));
    if (lab.length) out.push(['flask', 'tone-gold', `${lab.length} prothèse(s) en attente du laboratoire`, lab.map(l => l.type + ' — ' + N.pname(l.patient)).slice(0, 2).join(' · '), '#/laboratoire']);
    const unread = S.messages.filter(m => m.dir === 'in' && m.status === 'non_lu');
    if (unread.length) out.push(['message', 'tone-teal', `${unread.length} message(s) patient non lu(s)`, N.pname(unread[0].patient) + ' : « ' + unread[0].text.slice(0, 40) + '… »', '#/communication']);
    return out;
  }

  function schedule(st) {
    const now = D.nowMin(); let nowShown = false;
    const items = st.today.map(a => {
      const p = N.patient(a.patient); const t = N.S.types[a.type]; const s = D.min(a.start), e = s + a.dur;
      let line = '';
      if (!nowShown && s > now) { nowShown = true; line = `<div class="now-line">MAINTENANT · ${D.hm(now)}</div>`; }
      const quick = !N.can('agenda.manage') ? '' : a.status === 'attente' ? `<button class="btn xs" data-q="confirme" data-id="${a.id}">${icon('check')}Confirmer</button>` : a.status === 'confirme' && s - now < 30 ? `<button class="btn xs" data-q="encours" data-id="${a.id}">${icon('activity')}Démarrer</button>` : a.status === 'encours' ? `<button class="btn xs success" data-q="termine" data-id="${a.id}">${icon('check')}Terminer</button>` : '';
      return line + `<div class="sched-item ${a.status === 'encours' ? 'now' : ''} ${e < now && a.status !== 'encours' ? 'past' : ''}" data-act="appt" data-id="${a.id}">
        <div class="time">${a.start}<span>${a.dur} min</span></div><div class="bar" style="background:${t.color}"></div>
        <div style="min-width:0"><div class="row gap-6" style="font-weight:600"><span class="truncate">${t.label}</span><span class="faint" style="font-weight:400">—</span><span class="truncate" style="font-weight:500">${esc(N.pname(p))}</span>${p.allergies.length ? `<span class="tag allergy" title="Allergies : ${esc(p.allergies.join(', '))}">!</span>` : ''}</div><div class="xs muted truncate">${esc(N.name(N.staff(a.dentist)))} · ${esc(a.chair)}${a.note ? ' · ' + esc(a.note) : ''}</div></div>
        <div class="row gap-6">${quick}${stBadge(a.status)}</div></div>`;
    }).join('');
    return items || H.empty('Aucun rendez-vous aujourd’hui', 'calendar');
  }

  A.view('dashboard', {
    render() {
      const S = N.S, st = stats(), me = N.me();
      const cl = S.session.clinic; const hist = cl === 'all' ? sumHist() : S.history[cl];
      const hour = new Date().getHours();
      const greet = (hour < 18 ? 'Bonjour' : 'Bonsoir') + ', ' + (me.title ? me.title + ' ' + me.last : me.first);
      const monthRev = hist.map(h => h.revenue); const prevRev = hist[hist.length - 2].revenue;
      const dentists = N.dentists();
      const typeMix = {}; st.ap.filter(a => a.date.slice(0, 7) === st.t.slice(0, 7) && a.status !== 'annule').forEach(a => typeMix[a.type] = (typeMix[a.type] || 0) + 1);
      const lab = S.labCases.filter(l => N.inClinic(l) && l.status !== 'livre');
      const ALR = alerts();
      return `
      ${H.head(greet, `${fmt.dateLong(st.t).replace(/^./, c => c.toUpperCase())} · ${cl === 'all' ? 'Vue consolidée — 3 cabinets' : esc(N.clinic(cl).name)}`,
        `${N.can('patients.edit') ? `<button class="btn" data-act="newPatient">${icon('user')}Nouveau patient</button>` : ''}${N.can('agenda.manage') ? `<button class="btn primary" data-act="newAppt">${icon('plus')}Nouveau rendez-vous</button>` : ''}`)}

      <div class="grid g4">
        ${H.kpi('Rendez-vous aujourd’hui', st.todayActive.length, 'calendar', 'tone-blue', `<span>${st.todayActive.filter(a => a.status === 'termine').length} terminés · ${st.todayActive.filter(a => a.status === 'attente').length} en attente</span>`)}
        ${H.kpi('Patients du jour', st.patientsToday, 'users', 'tone-sage', `<span>${st.today.filter(a => a.status === 'encours').length} en fauteuil actuellement</span>`)}
        ${H.kpi('Nouveaux patients', st.newPatients, 'user', 'tone-teal', `<span>ce mois-ci</span>${H.delta(12)}`, N.ui.spark(hist.map(h => h.newPatients), '#3AA6A0'))}
        ${H.kpi('Traitements en cours', st.plansActive, 'clipboard', 'tone-violet', `<span>plans actifs</span>`)}
        ${H.kpi('Rendez-vous à venir', st.upcoming, 'clock', 'tone-navy', `<span>7 prochains jours</span>`)}
        ${H.kpi('Paiements du jour', fmt.money(st.payToday).replace(' DH', '<small>DH</small>'), 'wallet', 'tone-green', `<span>encaissés aujourd’hui</span>`)}
        ${H.kpi('Factures impayées', st.unpaidN, 'receipt', 'tone-red', `<span>${fmt.money(st.unpaidAmt)} à encaisser</span>`)}
        <div class="card kpi premium"><div class="spark">${N.ui.spark(monthRev, '#B89457')}</div><div class="label"><span class="ico tone-gold">${icon('trend')}</span>Revenus du mois</div><div class="value">${fmt.num(st.revenueMonth)}<small>DH</small></div><div class="foot"><span>vs ${fmt.k(prevRev)} DH mois dernier</span>${H.delta(Math.round((st.revenueMonth / prevRev - 1) * 1000) / 10)}</div></div>
      </div>

      <div class="grid g-2-1 mt-16">
        <div class="card">
          <div class="card-head"><div><h3>Planning du jour</h3><div class="sub">${st.todayActive.length} rendez-vous · ${st.today.filter(a => a.status === 'noshow').length} no-show · ${st.today.filter(a => a.status === 'annule').length} annulé(s)</div></div><a class="btn sm" href="#/agenda">${icon('calendar')}Agenda</a></div>
          <div class="card-body" style="padding-top:12px">
            ${dentists.length > 1 ? `<div class="chips mb-12"><button class="chip ${filterDentist === 'all' ? 'on' : ''}" data-fd="all">Tous les praticiens</button>${dentists.map(d => `<button class="chip ${filterDentist === d.id ? 'on' : ''}" data-fd="${d.id}"><i class="sw" style="background:${d.color}"></i>${esc(d.title + ' ' + d.last)}</button>`).join('')}</div>` : ''}
            <div class="sched" style="max-height:560px;overflow:auto;margin:0 -8px">${schedule(st)}</div>
          </div>
        </div>
        <div class="col gap-16">
          <div class="card"><div class="card-head"><h3>Alertes</h3><span class="badge tone-red">${ALR.length}</span></div>
            <div class="card-body col" style="gap:8px">${ALR.map(([ic, tone, t, s, href]) => `<a class="alert-item" href="${href}" style="color:inherit"><div class="ico ${tone}">${icon(ic)}</div><div style="min-width:0"><b>${t}</b><span class="truncate" style="display:block">${esc(s)}</span></div></a>`).join('') || H.empty('Aucune alerte', 'check')}</div></div>
          <div class="card"><div class="card-head"><h3>Laboratoire</h3><a class="small" href="#/laboratoire">Tout voir</a></div>
            <div class="card-body"><div class="list">${lab.slice(0, 4).map(l => `<div class="li"><div class="avatar sm" style="background:var(--gold-50);color:var(--gold)">${icon('flask').replace('<svg', '<svg style="width:14px;height:14px"')}</div><div class="grow" style="min-width:0"><div class="t truncate">${esc(l.type)} · ${esc(l.teeth)}</div><div class="s truncate">${esc(N.pname(l.patient))} · retour ${fmt.rel(l.due)}</div></div>${labBadge(l.status)}</div>`).join('')}</div></div></div>
        </div>
      </div>

      <div class="grid g-3-2 mt-16">
        <div class="card"><div class="card-head"><div><h3>Chiffre d’affaires</h3><div class="sub">12 derniers mois · ${cl === 'all' ? 'tous les cabinets' : esc(N.clinic(cl).name)}</div></div><a class="btn sm" href="#/analytics">${icon('chart')}Analytics</a></div>
          <div class="card-body">${N.ui.barChart({ labels: hist.map(h => fmt.mshort(h.m)), series: [{ name: 'Chiffre d’affaires', data: monthRev, color: '#2C6BCB' }], height: 230, fmtV: fmt.money })}</div></div>
        <div class="card"><div class="card-head"><div><h3>Activité du mois par type</h3><div class="sub">${Object.values(typeMix).reduce((a, b) => a + b, 0)} rendez-vous</div></div></div>
          <div class="card-body">${N.ui.donut({ data: Object.entries(typeMix).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => ({ label: S.types[k].label, value: v, color: S.types[k].color })), center: Object.values(typeMix).reduce((a, b) => a + b, 0), sub: 'RDV' })}</div></div>
      </div>
      ${cl === 'all' ? multiSite() : ''}`;
    },
    mount(el) {
      el.querySelectorAll('[data-fd]').forEach(b => b.onclick = () => { filterDentist = b.dataset.fd; A.refresh(); });
      el.querySelectorAll('[data-q]').forEach(b => b.onclick = e => { e.stopPropagation(); A.setStatus(N.S.appts.find(a => a.id === b.dataset.id), b.dataset.q); });
    }
  });

  function sumHist() { const H_ = N.S.history; return H_.fes.map((h, i) => ({ m: h.m, revenue: h.revenue + H_.meknes[i].revenue + H_.rabat[i].revenue, consults: h.consults + H_.meknes[i].consults + H_.rabat[i].consults, newPatients: h.newPatients + H_.meknes[i].newPatients + H_.rabat[i].newPatients, noshow: +((h.noshow + H_.meknes[i].noshow + H_.rabat[i].noshow) / 3).toFixed(1), fill: Math.round((h.fill + H_.meknes[i].fill + H_.rabat[i].fill) / 3), recurrent: h.recurrent + H_.meknes[i].recurrent + H_.rabat[i].recurrent })); }
  N.sumHist = sumHist;

  function multiSite() {
    const S = N.S, t = D.todayYmd();
    const rows = S.clinics.map(c => {
      const h = S.history[c.id]; const last = h[11];
      const rv = S.reviews.filter(r => r.clinic === c.id); const avg = rv.reduce((s, r) => s + r.rating, 0) / (rv.length || 1);
      const today = S.appts.filter(a => a.clinic === c.id && a.date === t && a.status !== 'annule').length;
      const unpaid = S.invoices.filter(i => i.clinic === c.id).reduce((s, i) => s + Math.max(0, N.invoiceTotal(i) - N.invoicePaid(i)), 0);
      return `<tr><td><div class="row"><span class="clinic-dot">${icon('building')}</span><div><b>${c.name}</b><div class="xs muted">${S.staff.filter(s => s.clinic === c.id && s.role === 'dentiste').length} praticien(s) · ${c.chairs.length} fauteuils</div></div></div></td><td class="num">${today}</td><td class="num">${fmt.money(last.revenue)}</td><td style="min-width:140px"><div class="row"><div class="progress grow"><i style="width:${last.fill}%"></i></div><span class="small mono">${last.fill} %</span></div></td><td class="num">${fmt.pct(last.noshow)}</td><td class="num">★ ${avg.toFixed(1).replace('.', ',')}</td><td class="num">${fmt.money(unpaid)}</td></tr>`;
    }).join('');
    return `<div class="card mt-16"><div class="card-head"><div><h3>Vue direction — comparatif des établissements</h3><div class="sub">Données isolées par cabinet, consolidées pour la direction</div></div></div><div class="card-body table-wrap" style="padding:10px 0 0"><table class="table"><thead><tr><th>Établissement</th><th class="num">RDV aujourd’hui</th><th class="num">CA du mois</th><th>Taux de remplissage</th><th class="num">No-show</th><th class="num">Satisfaction</th><th class="num">Encours impayés</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }

  const LAB_ST = { a_envoyer: ['À envoyer', 'tone-gray'], envoye: ['Envoyé', 'st-confirme'], fabrication: ['En fabrication', 'st-attente'], pret: ['Prêt', 'tone-teal'], recu: ['Reçu', 'st-termine'], livre: ['Livré au patient', 'tone-navy'] };
  function labBadge(s) { const x = LAB_ST[s]; return badge(x[0], x[1]); }
  N.LAB_ST = LAB_ST; N.labBadge = labBadge;
})();
