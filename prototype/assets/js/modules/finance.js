/* Plans de traitement, devis, facturation, paiements */
(function () {
  const N = Nacre, D = N.D, A = N.App, H = A.H;
  const { icon, fmt, esc, avatar, badge, toast, modal, formData } = N.ui;

  /* =================== PLANS DE TRAITEMENT =================== */
  const PST = { propose: ['Proposé', 'tone-gray'], accepte: ['Accepté', 'tone-violet'], planifie: ['Planifié', 'st-confirme'], encours: ['En cours', 'st-encours'], termine: ['Terminé', 'st-termine'] };
  const ORDER = ['propose', 'accepte', 'planifie', 'encours', 'termine'];
  const statusBadge = s => badge(PST[s][0], PST[s][1]);
  const totals = pl => { const total = pl.items.reduce((s, i) => s + i.price, 0); const paid = pl.items.reduce((s, i) => s + (i.paid || 0), 0); const done = pl.items.filter(i => i.status === 'termine').length; return { total, paid, due: total - paid, done, n: pl.items.length }; };
  function pipeline(cur, clickable) {
    const ci = ORDER.indexOf(cur);
    return `<div class="pipeline">${ORDER.map((s, i) => `${i ? `<div class="pipe-line ${i <= ci ? 'done' : ''}"></div>` : ''}<div class="pipe ${i < ci ? 'done' : i === ci ? 'cur' : ''}" ${clickable ? `data-pst="${s}" style="cursor:pointer"` : ''}><span class="d">${i < ci ? '✓' : i + 1}</span>${PST[s][0]}</div>`).join('')}</div>`;
  }
  function summary(pl) {
    const t = totals(pl);
    return `<div class="row between small"><span>${t.done}/${t.n} actes réalisés</span><b>${fmt.money(t.total)}</b></div><div class="progress mt-8"><i style="width:${t.n ? t.done / t.n * 100 : 0}%"></i></div><div class="row between xs muted mt-8"><span>Payé ${fmt.money(t.paid)}</span><span>Reste ${fmt.money(t.due)}</span></div>`;
  }
  function editor(pl) {
    const S = N.S; const p = N.patient(pl.patient); const t = totals(pl); const ed = N.can('clinical.edit');
    const payBadge = i => i.paid >= i.price && i.price > 0 ? badge('Payé', 'st-termine') : i.paid > 0 ? badge(fmt.money(i.paid), 'st-attente') : badge('Non payé', 'st-annule');
    return `<div class="card mb-16" data-plan="${pl.id}">
      <div class="card-head" style="flex-wrap:wrap"><div><div class="row gap-6"><h3 style="font-size:16px">${esc(pl.title)}</h3>${statusBadge(pl.status)}</div><div class="sub">Patient : <a href="#/patients/${p.id}">${esc(N.pname(p))}</a> · ${esc(N.name(N.staff(pl.dentist)))} · créé le ${fmt.date(pl.created)}</div></div>
        <div class="row wrap gap-6">${N.can('finance.view') ? `<button class="btn sm" data-quote>${icon('file')}Générer le devis</button>` : ''}${N.can('finance.edit') ? `<button class="btn sm" data-bill>${icon('receipt')}Facturer les actes réalisés</button>` : ''}${N.can('agenda.manage') ? `<button class="btn sm" data-rdv>${icon('calendar')}Planifier</button>` : ''}<button class="btn sm icon" data-print title="Imprimer">${icon('printer')}</button></div></div>
      <div class="card-body">
        <div style="overflow-x:auto;padding:4px 0 14px">${pipeline(pl.status, ed)}</div>
        <div class="table-wrap" style="margin:0 -20px"><table class="table responsive"><thead><tr><th>#</th><th>Traitement</th><th>Dent</th><th class="num">Prix</th><th>Statut</th><th>Date prévue</th><th>Date réalisée</th><th>Paiement</th>${ed ? '<th></th>' : ''}</tr></thead><tbody>
        ${pl.items.map((i, k) => `<tr data-item="${i.id}"><td data-l="#" class="muted">${k + 1}</td><td data-l="Traitement"><b style="font-weight:500">${esc(i.label)}</b></td><td data-l="Dent">${esc(i.tooth)}</td><td data-l="Prix" class="num">${fmt.money(i.price)}</td>
          <td data-l="Statut">${ed ? `<select class="select sm" data-ist style="width:130px">${ORDER.map(s => `<option value="${s}" ${i.status === s ? 'selected' : ''}>${PST[s][0]}</option>`).join('')}</select>` : statusBadge(i.status)}</td>
          <td data-l="Prévue">${ed ? `<input type="date" class="input sm" data-iplan value="${i.planned || ''}" style="width:140px">` : (i.planned ? fmt.date(i.planned) : '—')}</td>
          <td data-l="Réalisée">${i.done ? fmt.date(i.done) : '<span class="faint">—</span>'}</td><td data-l="Paiement">${payBadge(i)}</td>${ed ? `<td><button class="btn xs ghost" data-idel title="Retirer">${icon('trash')}</button></td>` : ''}</tr>`).join('')}
        </tbody>
        <tfoot><tr><td></td><td>Total traitement</td><td></td><td class="num">${fmt.money(t.total)}</td><td colspan="${ed ? 5 : 4}"></td></tr></tfoot></table></div>
        ${ed ? `<div class="row wrap mt-12" style="gap:8px"><select class="select sm" data-newact style="width:260px">${S.acts.map(a => `<option value="${a.code}">${a.label} — ${fmt.money(a.price)}</option>`).join('')}</select><input class="input sm" data-newtooth placeholder="Dent (ex. 36)" style="width:120px"><input class="input sm" type="number" data-newprice placeholder="Prix" style="width:110px"><button class="btn sm" data-add>${icon('plus')}Ajouter l’acte</button></div>` : ''}
        <div class="grid g3 mt-16">
          <div class="card" style="background:var(--surface-2)"><div class="card-body"><div class="xs muted">Total traitement</div><div style="font-size:22px;font-weight:600" class="mono">${fmt.money(t.total)}</div></div></div>
          <div class="card" style="background:var(--success-50);border-color:#CDE9DB"><div class="card-body"><div class="xs muted">Payé</div><div style="font-size:22px;font-weight:600;color:var(--success)" class="mono">${fmt.money(t.paid)}</div></div></div>
          <div class="card" style="background:${t.due > 0 ? 'var(--danger-50)' : 'var(--surface-2)'};border-color:${t.due > 0 ? '#F4D2D8' : 'var(--line)'}"><div class="card-body row between"><div><div class="xs muted">Reste</div><div style="font-size:22px;font-weight:600;color:${t.due > 0 ? 'var(--danger)' : 'inherit'}" class="mono">${fmt.money(t.due)}</div></div>${t.due > 0 && N.can('finance.edit') ? `<button class="btn sm primary" data-act="pay" data-patient="${p.id}">Encaisser</button>` : ''}</div></div>
        </div>
      </div></div>`;
  }
  function bind(root) {
    const S = N.S;
    root.querySelectorAll('[data-plan]').forEach(card => {
      const pl = S.plans.find(x => x.id === card.dataset.plan); const p = N.patient(pl.patient);
      const save = (msg) => { autoStatus(pl); N.save(); A.refresh(); if (msg) toast(msg, 'clipboard'); };
      card.querySelectorAll('[data-pst]').forEach(b => b.onclick = () => { pl.status = b.dataset.pst; N.log('Plan de traitement → ' + PST[pl.status][0], N.pname(p)); N.save(); A.refresh(); toast('Plan : ' + PST[pl.status][0]); });
      card.querySelectorAll('[data-item]').forEach(row => {
        const it = pl.items.find(i => i.id === row.dataset.item);
        const s = row.querySelector('[data-ist]'); if (s) s.onchange = () => { it.status = s.value; if (s.value === 'termine' && !it.done) it.done = D.todayYmd(); if (s.value !== 'termine') it.done = ''; N.log('Acte → ' + PST[it.status][0], N.pname(p) + ' — ' + it.label); save('Acte mis à jour'); };
        const d = row.querySelector('[data-iplan]'); if (d) d.onchange = () => { it.planned = d.value; if (it.status === 'accepte' || it.status === 'propose') it.status = 'planifie'; save('Date prévue enregistrée'); };
        const x = row.querySelector('[data-idel]'); if (x) x.onclick = () => { pl.items = pl.items.filter(i => i !== it); save('Acte retiré'); };
      });
      const act = card.querySelector('[data-newact]');
      if (act) { const pr = card.querySelector('[data-newprice]'); const sync = () => pr.value = S.acts.find(a => a.code === act.value).price; sync(); act.onchange = sync;
        card.querySelector('[data-add]').onclick = () => { const a = S.acts.find(x => x.code === act.value); pl.items.push({ id: N.uid('i'), label: a.label, tooth: card.querySelector('[data-newtooth]').value || '—', price: +pr.value || a.price, status: 'propose', planned: '', done: '', paid: 0 }); save('Acte ajouté au plan'); }; }
      const q = card.querySelector('[data-quote]'); if (q) q.onclick = () => { const qu = quoteFromPlan(pl); location.hash = '#/devis/' + qu.id; };
      const b = card.querySelector('[data-bill]'); if (b) b.onclick = () => billPlan(pl);
      const r = card.querySelector('[data-rdv]'); if (r) r.onclick = () => { const next = pl.items.find(i => i.status !== 'termine'); A.newAppt({ patient: pl.patient, dentist: pl.dentist, date: next && next.planned || D.todayYmd(), note: next ? next.label + (next.tooth !== '—' ? ' ' + next.tooth : '') : '' }); };
      card.querySelector('[data-print]').onclick = () => N.Paper.print(N.Paper.plan(pl));
    });
  }
  function autoStatus(pl) { if (pl.items.length && pl.items.every(i => i.status === 'termine')) pl.status = 'termine'; else if (pl.items.some(i => i.status === 'encours' || i.status === 'termine') && ORDER.indexOf(pl.status) < 3) pl.status = 'encours'; }
  function quoteFromPlan(pl) {
    const S = N.S; const n = ++S.seq.quote;
    const q = { id: N.uid('q'), number: 'DEV-2026-' + String(n).padStart(4, '0'), patient: pl.patient, dentist: pl.dentist, date: D.todayYmd(), valid: D.addYmd(D.todayYmd(), 60), status: 'brouillon', items: pl.items.filter(i => i.status !== 'termine').map(i => ({ label: i.label, tooth: i.tooth, qty: 1, price: i.price, disc: 0 })), discount: 0, conditions: 'Devis valable 60 jours. Acompte de 30 % à l’acceptation. Solde à la fin du traitement.', plan: pl.id };
    S.quotes.unshift(q); N.log('Devis généré depuis le plan', N.pname(pl.patient) + ' — ' + q.number); N.save(); toast('Devis ' + q.number + ' créé', 'file'); return q;
  }
  function billPlan(pl) {
    const S = N.S; const items = pl.items.filter(i => i.status === 'termine' && !i.invoiced && i.paid < i.price);
    if (!items.length) return toast('Aucun acte réalisé à facturer', 'info');
    const n = ++S.seq.invoice; const p = N.patient(pl.patient);
    const inv = { id: N.uid('f'), number: 'FAC-2026-' + String(n).padStart(5, '0'), patient: pl.patient, clinic: p.clinic, dentist: pl.dentist, date: D.todayYmd(), due: D.addYmd(D.todayYmd(), 30), items: items.map(i => ({ label: i.label, tooth: i.tooth, qty: 1, price: i.price - (i.paid || 0) })), discount: 0, plan: pl.id };
    items.forEach(i => i.invoiced = true); S.invoices.push(inv); N.log('Facture générée depuis le plan', N.pname(p) + ' — ' + inv.number); N.save(); location.hash = '#/facturation/' + inv.id; toast('Facture ' + inv.number + ' créée', 'receipt');
  }
  function newPlan(pid) {
    const S = N.S;
    modal({ title: 'Nouveau plan de traitement', body: `<form class="col" style="gap:14px" id="fnp">${pid ? `<input type="hidden" name="patient" value="${pid}">` : `<div class="field"><label>Patient</label><select class="select" name="patient">${H.patientOptions()}</select></div>`}<div class="field"><label>Intitulé</label><input class="input" name="title" placeholder="Ex. : Réhabilitation prothétique"></div><div class="field"><label>Praticien</label><select class="select" name="dentist">${H.dentistOptions(pid ? N.patient(pid).dentist : '', true)}</select></div></form>`, foot: `<button class="btn" data-close>Annuler</button><button class="btn primary" data-save>Créer</button>`,
      onMount: el => el.querySelector('[data-save]').onclick = () => { const d = formData(el.querySelector('#fnp')); const pl = { id: N.uid('tp'), patient: d.patient, dentist: d.dentist, title: d.title || 'Plan de traitement', created: D.todayYmd(), status: 'propose', items: [] }; S.plans.unshift(pl); N.log('Plan de traitement créé', N.pname(d.patient)); N.save(); el.close(); location.hash = '#/plans/' + pl.id; } });
  }

  N.Plans = {
    statusBadge, summary, totals,
    forPatient(pid) { const list = N.S.plans.filter(p => p.patient === pid); return (list.map(editor).join('') || `<div class="card">${H.empty('Aucun plan de traitement pour ce patient', 'clipboard')}</div>`) + (N.can('clinical.edit') ? `<button class="btn mt-12" data-newplan>${icon('plus')}Nouveau plan de traitement</button>` : ''); },
    mountFor(T, pid) { bind(T); const b = T.querySelector('[data-newplan]'); if (b) b.onclick = () => newPlan(pid); }
  };

  const PF = { st: 'actifs' };
  A.view('plans', {
    render(params) {
      const S = N.S;
      if (params[0]) { const pl = S.plans.find(x => x.id === params[0]); if (!pl) return H.empty('Plan introuvable'); return `<div class="crumbs"><a href="#/plans">Plans de traitement</a> › ${esc(N.pname(pl.patient))}</div>${H.head(esc(pl.title), 'Plan de traitement', '')}${editor(pl)}`; }
      const all = S.plans.filter(p => N.inClinic(N.patient(p.patient)));
      const list = PF.st === 'actifs' ? all.filter(p => p.status !== 'termine') : PF.st === 'tous' ? all : all.filter(p => p.status === PF.st);
      const sum = all.reduce((s, p) => s + totals(p).total, 0);
      const acc = all.filter(p => p.status !== 'propose').length;
      return `${H.head('Plans de traitement', 'Proposé → Accepté → Planifié → En cours → Terminé', N.can('clinical.edit') ? `<button class="btn primary" data-np>${icon('plus')}Nouveau plan</button>` : '')}
      <div class="grid g4 mb-16">${H.kpi('Plans actifs', all.filter(p => p.status !== 'termine').length, 'clipboard', 'tone-blue')}${H.kpi('Taux d’acceptation', Math.round(acc / (all.length || 1) * 100) + ' %', 'check', 'tone-green')}${H.kpi('Montant total des plans', fmt.money(sum), 'wallet', 'tone-gold')}${H.kpi('Reste à encaisser', fmt.money(all.reduce((s, p) => s + totals(p).due, 0)), 'receipt', 'tone-red')}</div>
      <div class="chips mb-16">${[['actifs', 'En cours de traitement'], ...ORDER.map(s => [s, PST[s][0]]), ['tous', 'Tous']].map(([k, l]) => `<button class="chip ${PF.st === k ? 'on' : ''}" data-pf="${k}">${l}</button>`).join('')}</div>
      <div class="grid g3">${list.map(pl => { const p = N.patient(pl.patient); return `<a class="card hover" href="#/plans/${pl.id}" style="color:inherit"><div class="card-body"><div class="row between"><div class="row">${avatar(p, 'sm')}<div><b>${esc(N.pname(p))}</b><div class="xs muted">${esc(pl.title)}</div></div></div>${statusBadge(pl.status)}</div><div class="mt-16">${summary(pl)}</div></div></a>`; }).join('') || `<div class="card" style="grid-column:1/-1">${H.empty('Aucun plan', 'clipboard')}</div>`}</div>`;
    },
    mount(el, params) { bind(el); el.querySelectorAll('[data-pf]').forEach(b => b.onclick = () => { PF.st = b.dataset.pf; A.refresh(); }); const n = el.querySelector('[data-np]'); if (n) n.onclick = () => newPlan(); }
  });

  /* =================== DEVIS =================== */
  const QST = { brouillon: ['Brouillon', 'tone-gray'], envoye: ['Envoyé', 'st-confirme'], accepte: ['Accepté', 'st-termine'], refuse: ['Refusé', 'st-noshow'], expire: ['Expiré', 'st-annule'] };
  const qStatus = q => (q.status === 'envoye' && q.valid < D.todayYmd()) ? 'expire' : q.status;
  A.view('devis', {
    render(params) {
      const S = N.S;
      if (params[0]) return quoteEditor(params[0]);
      const list = S.quotes.filter(q => N.inClinic(N.patient(q.patient))).sort((a, b) => b.date.localeCompare(a.date));
      const tot = st => list.filter(q => qStatus(q) === st).reduce((s, q) => s + N.Paper.quoteTotals(q).total, 0);
      return `${H.head('Devis', 'Devis professionnels, envoi PDF et acceptation en ligne', N.can('finance.edit') ? `<button class="btn primary" data-nq>${icon('plus')}Nouveau devis</button>` : '')}
      <div class="grid g4 mb-16">${H.kpi('Devis en attente', list.filter(q => qStatus(q) === 'envoye').length, 'clock', 'tone-amber', `<span>${fmt.money(tot('envoye'))}</span>`)}${H.kpi('Acceptés', list.filter(q => q.status === 'accepte').length, 'check', 'tone-green', `<span>${fmt.money(tot('accepte'))}</span>`)}${H.kpi('Taux de conversion', Math.round(list.filter(q => q.status === 'accepte').length / (list.filter(q => q.status !== 'brouillon').length || 1) * 100) + ' %', 'trend', 'tone-blue')}${H.kpi('Brouillons', list.filter(q => q.status === 'brouillon').length, 'edit', 'tone-gray')}</div>
      <div class="card"><div class="table-wrap"><table class="table responsive"><thead><tr><th>N°</th><th>Patient</th><th>Date</th><th>Validité</th><th class="num">Montant</th><th>Statut</th><th></th></tr></thead><tbody>
      ${list.map(q => { const s = QST[qStatus(q)]; return `<tr class="click" data-href="#/devis/${q.id}"><td data-l="N°"><b style="font-weight:500">${q.number}</b></td><td data-l="Patient">${H.pcell(q.patient)}</td><td data-l="Date">${fmt.date(q.date)}</td><td data-l="Validité">${fmt.date(q.valid)}</td><td data-l="Montant" class="num">${fmt.money(N.Paper.quoteTotals(q).total)}</td><td data-l="Statut">${badge(s[0], s[1])}${q.status === 'accepte' && q.signature ? ' <span class="xs muted">signé en ligne</span>' : ''}</td><td>${icon('chevronRight', 'faint').replace('<svg', '<svg style="width:16px;height:16px"')}</td></tr>`; }).join('')}
      </tbody></table></div></div>`;
    },
    mount(el, params) {
      if (params[0]) return mountQuote(el, params[0]);
      const b = el.querySelector('[data-nq]'); if (b) b.onclick = () => { const S = N.S; const n = ++S.seq.quote; const q = { id: N.uid('q'), number: 'DEV-2026-' + String(n).padStart(4, '0'), patient: S.patients.find(p => N.inClinic(p)).id, dentist: N.dentists()[0].id, date: D.todayYmd(), valid: D.addYmd(D.todayYmd(), 60), status: 'brouillon', items: [{ label: 'Consultation', tooth: '', qty: 1, price: 300, disc: 0 }], discount: 0, conditions: 'Devis valable 60 jours. Acompte de 30 % à l’acceptation.' }; S.quotes.unshift(q); N.save(); location.hash = '#/devis/' + q.id; };
    }
  });
  function quoteEditor(id) {
    const S = N.S; const q = S.quotes.find(x => x.id === id); if (!q) return H.empty('Devis introuvable');
    const ed = N.can('finance.edit') && q.status === 'brouillon'; const s = QST[qStatus(q)];
    return `<div class="crumbs"><a href="#/devis">Devis</a> › ${q.number}</div>
    ${H.head(q.number, `${badge(s[0], s[1])} · ${esc(N.pname(q.patient))}`, `<button class="btn" data-print>${icon('download')}Télécharger PDF</button>${N.can('finance.edit') && q.status === 'brouillon' ? `<button class="btn primary" data-send>${icon('send')}Envoyer au patient</button>` : ''}${N.can('finance.edit') && q.status === 'envoye' ? `<button class="btn success" data-accept>${icon('signature')}Marquer accepté</button><button class="btn danger" data-refuse>Refusé</button>` : ''}${q.status === 'accepte' ? `<button class="btn" data-toplan>${icon('clipboard')}Créer le plan</button><button class="btn primary" data-toinv>${icon('receipt')}Facturer l’acompte</button>` : ''}`)}
    <div class="grid" style="grid-template-columns:minmax(0,380px) minmax(0,1fr);align-items:start" id="qgrid">
      <div class="card"><div class="card-head"><h3>${ed ? 'Édition' : 'Détails'}</h3>${!ed && q.status !== 'brouillon' ? '<span class="xs muted">Envoyé — lecture seule</span>' : ''}</div><div class="card-body col" style="gap:12px">
        <div class="field"><label>Patient</label><select class="select sm" data-f="patient" ${ed ? '' : 'disabled'}>${H.patientOptions(q.patient, false)}</select></div>
        <div class="row"><div class="field grow"><label>Praticien</label><select class="select sm" data-f="dentist" ${ed ? '' : 'disabled'}>${H.dentistOptions(q.dentist, true)}</select></div><div class="field" style="width:140px"><label>Validité</label><input type="date" class="input sm" data-f="valid" value="${q.valid}" ${ed ? '' : 'disabled'}></div></div>
        <div class="xs muted">Actes</div>
        ${q.items.map((i, k) => `<div style="border:1px solid var(--line);border-radius:10px;padding:10px" data-qi="${k}"><div class="row"><input class="input sm grow" data-k="label" value="${esc(i.label)}" ${ed ? '' : 'disabled'}>${ed ? `<button class="btn xs ghost" data-qdel>${icon('trash')}</button>` : ''}</div><div class="row mt-8" style="gap:6px"><input class="input sm" data-k="tooth" placeholder="Dent" value="${esc(i.tooth)}" style="width:70px" ${ed ? '' : 'disabled'}><input class="input sm" type="number" min="1" data-k="qty" value="${i.qty}" style="width:60px" title="Quantité" ${ed ? '' : 'disabled'}><input class="input sm" type="number" data-k="price" value="${i.price}" title="Prix" ${ed ? '' : 'disabled'}><input class="input sm" type="number" data-k="disc" value="${i.disc || 0}" title="Remise (DH)" style="width:80px" ${ed ? '' : 'disabled'}></div></div>`).join('')}
        ${ed ? `<div class="row"><select class="select sm grow" data-addact>${S.acts.map(a => `<option value="${a.code}">${a.label}</option>`).join('')}</select><button class="btn sm" data-qadd>${icon('plus')}Ajouter</button></div>` : ''}
        <div class="field"><label>Remise globale (%)</label><input type="number" min="0" max="50" class="input sm" data-f="discount" value="${q.discount}" ${ed ? '' : 'disabled'}></div>
        <div class="field"><label>Conditions</label><textarea class="textarea" data-f="conditions" ${ed ? '' : 'disabled'} style="min-height:70px">${esc(q.conditions)}</textarea></div>
        <p class="xs muted">${icon('globe').replace('<svg', '<svg style="width:12px;height:12px;display:inline;vertical-align:-2px"')} Une fois envoyé, le patient peut consulter, télécharger et <b>accepter le devis en ligne</b> depuis son espace patient (signature électronique horodatée).</p>
      </div></div>
      <div id="qprev" style="min-width:0">${N.Paper.quote(q)}</div>
    </div><style>@media (max-width:1100px){#qgrid{grid-template-columns:1fr!important}}</style>`;
  }
  function mountQuote(el, id) {
    const S = N.S; const q = S.quotes.find(x => x.id === id); if (!q) return;
    const prev = () => { el.querySelector('#qprev').innerHTML = N.Paper.quote(q); N.save(); };
    el.querySelectorAll('[data-f]').forEach(i => i.oninput = () => { q[i.dataset.f] = i.type === 'number' ? +i.value : i.value; prev(); });
    el.querySelectorAll('[data-qi]').forEach(row => { const it = q.items[+row.dataset.qi]; row.querySelectorAll('[data-k]').forEach(i => i.oninput = () => { it[i.dataset.k] = i.type === 'number' ? +i.value : i.value; prev(); }); const d = row.querySelector('[data-qdel]'); if (d) d.onclick = () => { q.items.splice(+row.dataset.qi, 1); N.save(); A.refresh(); }; });
    const add = el.querySelector('[data-qadd]'); if (add) add.onclick = () => { const a = S.acts.find(x => x.code === el.querySelector('[data-addact]').value); q.items.push({ label: a.label, tooth: '', qty: 1, price: a.price, disc: 0 }); N.save(); A.refresh(); };
    el.querySelector('[data-print]').onclick = () => N.Paper.print(N.Paper.quote(q));
    const snd = el.querySelector('[data-send]'); if (snd) snd.onclick = () => { q.status = 'envoye'; q.sentAt = D.todayYmd(); const p = N.patient(q.patient); H.sendMsg(p.id, `Bonjour ${p.first}, votre devis ${q.number} (${fmt.money(N.Paper.quoteTotals(q).total)}) est disponible en PDF dans votre espace patient. Vous pouvez l’accepter en ligne.`, 'email', true); N.log('Devis envoyé', N.pname(p) + ' — ' + q.number); N.save(); A.refresh(); toast('Devis envoyé par email · disponible sur le portail patient', 'send'); };
    const acc = el.querySelector('[data-accept]'); if (acc) acc.onclick = () => { q.status = 'accepte'; q.acceptedAt = D.todayYmd(); q.signature = N.pname(q.patient); N.log('Devis accepté', q.number); N.save(); A.refresh(); toast('Devis accepté', 'check'); };
    const ref = el.querySelector('[data-refuse]'); if (ref) ref.onclick = () => { q.status = 'refuse'; N.save(); A.refresh(); };
    const tp = el.querySelector('[data-toplan]'); if (tp) tp.onclick = () => { const pl = { id: N.uid('tp'), patient: q.patient, dentist: q.dentist, title: 'Plan — ' + q.number, created: D.todayYmd(), status: 'accepte', items: q.items.map(i => ({ id: N.uid('i'), label: i.label, tooth: i.tooth || '—', price: i.qty * i.price - (i.disc || 0), status: 'accepte', planned: '', done: '', paid: 0 })) }; S.plans.unshift(pl); N.save(); location.hash = '#/plans/' + pl.id; toast('Plan de traitement créé depuis le devis', 'clipboard'); };
    const ti = el.querySelector('[data-toinv]'); if (ti) ti.onclick = () => { const n = ++S.seq.invoice; const p = N.patient(q.patient); const tot = N.Paper.quoteTotals(q).total; const inv = { id: N.uid('f'), number: 'FAC-2026-' + String(n).padStart(5, '0'), patient: q.patient, clinic: p.clinic, dentist: q.dentist, date: D.todayYmd(), due: D.addYmd(D.todayYmd(), 15), items: [{ label: 'Acompte 30 % — devis ' + q.number, tooth: '', qty: 1, price: Math.round(tot * .3 / 10) * 10 }], discount: 0 }; S.invoices.push(inv); N.save(); location.hash = '#/facturation/' + inv.id; toast('Facture d’acompte créée', 'receipt'); };
  }

  /* =================== FACTURATION =================== */
  const FF = { st: 'toutes', q: '' };
  A.view('facturation', {
    render(params) {
      const S = N.S;
      if (params[0] && !['retard', 'impayees'].includes(params[0])) return invoiceView(params[0]);
      if (params[0]) FF.st = params[0] === 'retard' ? 'retard' : 'impayees';
      const t = D.todayYmd(), m0 = t.slice(0, 8) + '01';
      const all = S.invoices.filter(i => N.inClinic(i));
      const withSt = all.map(i => ({ i, s: N.invoiceStatus(i), tot: N.invoiceTotal(i), paid: N.invoicePaid(i) }));
      let list = withSt;
      if (FF.st === 'impayees') list = list.filter(x => x.s !== 'payee'); else if (FF.st === 'retard') list = list.filter(x => x.s.startsWith('retard')); else if (FF.st === 'payees') list = list.filter(x => x.s === 'payee'); else if (FF.st === 'partielles') list = list.filter(x => x.s === 'partielle' || x.s === 'retard_partiel');
      if (FF.q) { const q = FF.q.toLowerCase(); list = list.filter(x => (x.i.number + ' ' + N.pname(x.i.patient)).toLowerCase().includes(q)); }
      list.sort((a, b) => b.i.date.localeCompare(a.i.date));
      const month = withSt.filter(x => x.i.date >= m0);
      const open = withSt.filter(x => x.s !== 'payee');
      return `${H.head('Facturation', 'Factures, acomptes, remises et relances', N.can('finance.edit') ? `<button class="btn" data-act="pay">${icon('card')}Encaisser</button><button class="btn primary" data-ni>${icon('plus')}Nouvelle facture</button>` : '')}
      <div class="grid g4 mb-16">${H.kpi('Facturé ce mois', fmt.money(month.reduce((s, x) => s + x.tot, 0)), 'receipt', 'tone-blue', `<span>${month.length} factures</span>`)}${H.kpi('Encaissé ce mois', fmt.money(S.payments.filter(p => N.inClinic(p) && p.date >= m0).reduce((s, p) => s + p.amount, 0)), 'wallet', 'tone-green')}${H.kpi('Reste à encaisser', fmt.money(open.reduce((s, x) => s + x.tot - x.paid, 0)), 'clock', 'tone-amber', `<span>${open.length} factures ouvertes</span>`)}${H.kpi('En retard', fmt.money(withSt.filter(x => x.s.startsWith('retard')).reduce((s, x) => s + x.tot - x.paid, 0)), 'alert', 'tone-red', `<span>${withSt.filter(x => x.s.startsWith('retard')).length} factures</span>`)}</div>
      <div class="card"><div class="card-body row wrap between"><div class="chips">${[['toutes', 'Toutes'], ['impayees', 'À encaisser'], ['partielles', 'Partielles'], ['retard', 'En retard'], ['payees', 'Payées']].map(([k, l]) => `<button class="chip ${FF.st === k ? 'on' : ''}" data-ff="${k}">${l}</button>`).join('')}</div><div class="search" style="max-width:260px">${icon('search')}<input id="fq" placeholder="N° ou patient…" value="${esc(FF.q)}" style="padding-right:12px"></div></div>
      <div class="table-wrap"><table class="table responsive"><thead><tr><th>N°</th><th>Patient</th><th>Date</th><th>Échéance</th><th class="num">Total</th><th class="num">Payé</th><th class="num">Reste</th><th>Statut</th><th></th></tr></thead><tbody>
      ${list.slice(0, 80).map(({ i, s, tot, paid }) => `<tr class="click" data-href="#/facturation/${i.id}"><td data-l="N°" class="nowrap"><b style="font-weight:500">${i.number}</b></td><td data-l="Patient">${H.pcell(i.patient)}</td><td data-l="Date">${fmt.date(i.date)}</td><td data-l="Échéance">${fmt.date(i.due)}</td><td data-l="Total" class="num">${fmt.money(tot)}</td><td data-l="Payé" class="num">${fmt.money(paid)}</td><td data-l="Reste" class="num" style="${tot - paid > 0 ? 'color:var(--danger);font-weight:600' : ''}">${fmt.money(tot - paid)}</td><td data-l="Statut">${badge(...N.ui.INV_ST[s])}</td><td>${s !== 'payee' && N.can('finance.edit') ? `<button class="btn xs" data-act="pay" data-patient="${i.patient}" data-invoice="${i.id}">Encaisser</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="9">${H.empty('Aucune facture', 'receipt')}</td></tr>`}
      </tbody></table></div>${list.length > 80 ? `<div class="card-body small muted center">80 factures affichées sur ${list.length} — affinez la recherche</div>` : ''}</div>`;
    },
    mount(el, params) {
      if (params[0] && !['retard', 'impayees'].includes(params[0])) return mountInvoice(el, params[0]);
      el.querySelectorAll('[data-ff]').forEach(b => b.onclick = () => { FF.st = b.dataset.ff; if (location.hash !== '#/facturation') location.hash = '#/facturation'; else A.refresh(); });
      el.querySelector('#fq').onchange = e => { FF.q = e.target.value; A.refresh(); };
      const ni = el.querySelector('[data-ni]'); if (ni) ni.onclick = newInvoice;
    }
  });
  function invoiceView(id) {
    const S = N.S; const inv = S.invoices.find(i => i.id === id); if (!inv) return H.empty('Facture introuvable');
    const st = N.invoiceStatus(inv); const due = N.invoiceTotal(inv) - N.invoicePaid(inv);
    return `<div class="crumbs"><a href="#/facturation">Facturation</a> › ${inv.number}</div>
    ${H.head(inv.number, `${badge(...N.ui.INV_ST[st])} · ${esc(N.pname(inv.patient))}`, `<button class="btn" data-print>${icon('download')}PDF</button>${N.can('comm.send') && due > 0 ? `<button class="btn" data-remind>${icon('send')}Rappel de paiement</button>` : ''}${N.can('finance.edit') && due > 0 ? `<button class="btn primary" data-act="pay" data-patient="${inv.patient}" data-invoice="${inv.id}">${icon('card')}Encaisser ${fmt.money(due)}</button>` : ''}`)}
    <div class="grid" style="grid-template-columns:minmax(0,1fr) 320px;align-items:start" id="igrid"><div style="min-width:0">${N.Paper.invoice(inv)}</div>
      <div class="col gap-16"><div class="card"><div class="card-head"><h3>Règlement</h3></div><div class="card-body"><div class="row between"><span class="muted">Total</span><b>${fmt.money(N.invoiceTotal(inv))}</b></div><div class="row between mt-8"><span class="muted">Payé</span><b style="color:var(--success)">${fmt.money(N.invoicePaid(inv))}</b></div><div class="progress sage mt-8"><i style="width:${Math.min(100, N.invoicePaid(inv) / (N.invoiceTotal(inv) || 1) * 100)}%"></i></div><div class="row between mt-12"><span class="muted">Reste à payer</span><b style="font-size:18px;color:${due > 0 ? 'var(--danger)' : 'inherit'}">${fmt.money(due)}</b></div></div></div>
      ${N.can('finance.edit') && due > 0 ? `<div class="card"><div class="card-head"><h3>Remise</h3></div><div class="card-body row"><input type="number" class="input sm" id="idisc" min="0" max="100" value="${inv.discount || 0}" style="width:90px"><span class="small muted">%</span><button class="btn sm" data-disc>Appliquer</button></div></div>` : ''}
      <div class="card"><div class="card-head"><h3>Patient</h3></div><div class="card-body">${H.pcell(inv.patient, N.patient(inv.patient).phone)}<div class="mt-12 small muted">Solde global patient : <b style="color:var(--ink)">${fmt.money(N.patientBalance(inv.patient).due)}</b></div></div></div></div>
    </div><style>@media (max-width:1100px){#igrid{grid-template-columns:1fr!important}}</style>`;
  }
  function mountInvoice(el, id) {
    const S = N.S; const inv = S.invoices.find(i => i.id === id); if (!inv) return;
    el.querySelector('[data-print]').onclick = () => N.Paper.print(N.Paper.invoice(inv));
    const r = el.querySelector('[data-remind]'); if (r) r.onclick = () => { const p = N.patient(inv.patient); H.sendMsg(p.id, H.fill(S.templates[4].text, p, { montant: fmt.money(N.invoiceTotal(inv) - N.invoicePaid(inv)) }), 'sms', false); N.log('Rappel de paiement envoyé', N.pname(p) + ' — ' + inv.number); N.save(); toast('Rappel de paiement envoyé', 'send'); };
    const d = el.querySelector('[data-disc]'); if (d) d.onclick = () => { inv.discount = +el.querySelector('#idisc').value; N.log('Remise appliquée', inv.number + ' — ' + inv.discount + ' %'); N.save(); A.refresh(); toast('Remise appliquée'); };
  }
  function newInvoice() {
    const S = N.S;
    modal({ title: 'Nouvelle facture', size: 'lg', body: `<form class="form-grid" id="fni"><div class="field full"><label>Patient</label><select class="select" name="patient">${H.patientOptions()}</select></div><div class="field"><label>Acte</label><select class="select" name="act">${S.acts.map(a => `<option value="${a.code}">${a.label}</option>`).join('')}</select></div><div class="row"><div class="field" style="width:100px"><label>Dent</label><input class="input" name="tooth"></div><div class="field" style="width:80px"><label>Qté</label><input class="input" type="number" name="qty" value="1" min="1"></div><div class="field grow"><label>Prix</label><input class="input" type="number" name="price"></div></div><div class="field"><label>Échéance</label><input type="date" class="input" name="due" value="${D.addYmd(D.todayYmd(), 30)}"></div><div class="field"><label>Remise (%)</label><input class="input" type="number" name="discount" value="0"></div></form>`, foot: `<button class="btn" data-close>Annuler</button><button class="btn primary" data-save>Créer la facture</button>`,
      onMount: el => { const f = el.querySelector('#fni'); const sync = () => f.price.value = S.acts.find(a => a.code === f.act.value).price; sync(); f.act.onchange = sync;
        el.querySelector('[data-save]').onclick = () => { const d = formData(f); const a = S.acts.find(x => x.code === d.act); const p = N.patient(d.patient); const n = ++S.seq.invoice; const inv = { id: N.uid('f'), number: 'FAC-2026-' + String(n).padStart(5, '0'), patient: p.id, clinic: p.clinic, dentist: p.dentist, date: D.todayYmd(), due: d.due, items: [{ label: a.label, tooth: d.tooth, qty: +d.qty, price: +d.price }], discount: +d.discount }; S.invoices.push(inv); N.log('Facture créée', N.pname(p) + ' — ' + inv.number); N.save(); el.close(); location.hash = '#/facturation/' + inv.id; }; } });
  }

  /* =================== PAIEMENTS =================== */
  const PF2 = { method: 'all', kind: 'all', q: '' };
  A.view('paiements', {
    render() {
      const S = N.S; const t = D.todayYmd(), m0 = t.slice(0, 8) + '01';
      const all = S.payments.filter(p => N.inClinic(p));
      let list = all.slice();
      if (PF2.method !== 'all') list = list.filter(p => p.method === PF2.method);
      if (PF2.kind !== 'all') list = list.filter(p => p.kind === PF2.kind);
      if (PF2.q) list = list.filter(p => N.pname(p.patient).toLowerCase().includes(PF2.q.toLowerCase()));
      list.sort((a, b) => b.date.localeCompare(a.date));
      const month = all.filter(p => p.date >= m0);
      const byMethod = {}; month.filter(p => p.amount > 0).forEach(p => byMethod[p.method] = (byMethod[p.method] || 0) + p.amount);
      const days = Array.from({ length: 14 }, (_, i) => D.addYmd(t, i - 13));
      const pts = N.S.patients.filter(p => N.inClinic(p)).map(p => ({ p, b: N.patientBalance(p.id) })).filter(x => x.b.due > 0).sort((a, b) => b.b.due - a.b.due).slice(0, 6);
      const MC = { especes: '#5E9F8D', carte: '#2C6BCB', virement: '#12264A', en_ligne: '#B89457', cheque: '#9AA5B4' };
      return `${H.head('Paiements', 'Encaissements, acomptes, remboursements et soldes patients', N.can('finance.edit') ? `<button class="btn primary" data-act="pay">${icon('plus')}Enregistrer un paiement</button>` : '')}
      <div class="grid g4 mb-16">${H.kpi('Encaissé aujourd’hui', fmt.money(all.filter(p => p.date === t).reduce((s, p) => s + p.amount, 0)), 'wallet', 'tone-green')}${H.kpi('Encaissé ce mois', fmt.money(month.reduce((s, p) => s + p.amount, 0)), 'trend', 'tone-blue')}${H.kpi('Acomptes du mois', fmt.money(month.filter(p => p.kind === 'acompte').reduce((s, p) => s + p.amount, 0)), 'layers', 'tone-violet')}${H.kpi('Remboursements', fmt.money(Math.abs(month.filter(p => p.kind === 'remboursement').reduce((s, p) => s + p.amount, 0))), 'repeat', 'tone-red')}</div>
      <div class="grid g-3-2 mb-16">
        <div class="card"><div class="card-head"><h3>Encaissements — 14 derniers jours</h3></div><div class="card-body">${N.ui.barChart({ labels: days.map(d => fmt.dayMonth(d)), series: Object.keys(MC).filter(k => k !== 'cheque').map(k => ({ name: N.ui.METHOD[k], color: MC[k], data: days.map(d => all.filter(p => p.date === d && p.method === k && p.amount > 0).reduce((s, p) => s + p.amount, 0)) })), stacked: true, height: 220, fmtV: fmt.money })}<div class="legend mt-8">${Object.keys(MC).filter(k => k !== 'cheque').map(k => `<span><i style="background:${MC[k]}"></i>${N.ui.METHOD[k]}</span>`).join('')}</div></div></div>
        <div class="card"><div class="card-head"><h3>Modes de paiement (mois)</h3></div><div class="card-body">${N.ui.donut({ data: Object.entries(byMethod).map(([k, v]) => ({ label: N.ui.METHOD[k], value: v, color: MC[k] })), center: fmt.k(Object.values(byMethod).reduce((a, b) => a + b, 0)), sub: 'DH', fmtV: fmt.money })}</div></div>
      </div>
      <div class="grid g-2-1">
        <div class="card"><div class="card-body row wrap" style="gap:8px"><div class="search" style="max-width:220px">${icon('search')}<input id="payq" placeholder="Patient…" value="${esc(PF2.q)}" style="padding-right:12px"></div><select class="select sm" id="paym" style="width:170px"><option value="all">Tous les modes</option>${Object.entries(N.ui.METHOD).map(([k, v]) => `<option value="${k}" ${PF2.method === k ? 'selected' : ''}>${v}</option>`).join('')}</select><select class="select sm" id="payk" style="width:170px"><option value="all">Tous les types</option>${[['paiement', 'Paiements'], ['acompte', 'Acomptes'], ['remboursement', 'Remboursements']].map(([k, v]) => `<option value="${k}" ${PF2.kind === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="table-wrap"><table class="table responsive"><thead><tr><th>Date</th><th>Patient</th><th>Facture</th><th>Type</th><th>Mode</th><th class="num">Montant</th></tr></thead><tbody>${list.slice(0, 60).map(p => { const inv = S.invoices.find(i => i.id === p.invoice); return `<tr><td data-l="Date">${fmt.date(p.date)}</td><td data-l="Patient">${H.pcell(p.patient)}</td><td data-l="Facture">${inv ? `<a href="#/facturation/${inv.id}">${inv.number}</a>` : '—'}</td><td data-l="Type">${p.kind === 'acompte' ? badge('Acompte', 'tone-violet', false) : p.kind === 'remboursement' ? badge('Remboursement', 'st-noshow', false) : badge('Paiement', 'st-termine', false)}</td><td data-l="Mode">${N.ui.METHOD[p.method]}</td><td data-l="Montant" class="num" style="font-weight:600;${p.amount < 0 ? 'color:var(--danger)' : ''}">${fmt.money(p.amount)}</td></tr>`; }).join('')}</tbody></table></div></div>
        <div class="card"><div class="card-head"><div><h3>Soldes patients</h3><div class="sub">Plus gros restes à payer</div></div></div><div class="card-body"><div class="list">${pts.map(({ p, b }) => `<div class="li"><div class="grow">${H.pcell(p)}<div class="progress mt-8"><i style="width:${b.paid / b.total * 100}%;background:var(--sage)"></i></div><div class="row between xs muted mt-4"><span>Total ${fmt.money(b.total)}</span><span>Payé ${fmt.money(b.paid)}</span></div></div><div class="right"><b style="color:var(--danger)" class="mono">${fmt.money(b.due)}</b>${N.can('finance.edit') ? `<div class="mt-4"><button class="btn xs" data-act="pay" data-patient="${p.id}">Encaisser</button></div>` : ''}</div></div>`).join('')}</div></div></div>
      </div>`;
    },
    mount(el) {
      el.querySelector('#payq').onchange = e => { PF2.q = e.target.value; A.refresh(); };
      el.querySelector('#paym').onchange = e => { PF2.method = e.target.value; A.refresh(); };
      el.querySelector('#payk').onchange = e => { PF2.kind = e.target.value; A.refresh(); };
    }
  });
})();
