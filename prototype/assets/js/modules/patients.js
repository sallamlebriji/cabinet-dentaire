/* Patients : liste CRM, fiche 360°, dossier dentaire, consultations */
(function () {
  const N = Nacre, D = N.D, A = N.App, H = A.H;
  const { icon, fmt, esc, avatar, badge, stBadge, toast, modal, formData } = N.ui;
  const F = { q: '', dentist: 'all', tag: 'all', sort: 'last' };
  let lastLogged = '';

  /* ---------- Liste ---------- */
  function lastVisit(pid) { const t = D.todayYmd(); const a = N.S.appts.filter(x => x.patient === pid && x.status === 'termine' && x.date <= t).sort((a, b) => b.date.localeCompare(a.date))[0]; return a ? a.date : ''; }
  function rows() {
    const S = N.S; const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const q = norm(F.q);
    let list = S.patients.filter(p => N.inClinic(p));
    if (q) list = list.filter(p => norm(`${p.first} ${p.last} ${p.phone} ${p.fileNo} ${p.email}`).includes(q));
    if (F.dentist !== 'all') list = list.filter(p => p.dentist === F.dentist);
    if (F.tag === 'allergies') list = list.filter(p => p.allergies.length);
    else if (F.tag === 'solde') list = list.filter(p => N.patientBalance(p.id).due > 0);
    else if (F.tag === 'nouveaux') list = list.filter(p => D.diffDays(p.created, D.todayYmd()) <= 30);
    else if (F.tag !== 'all') list = list.filter(p => p.tags.includes(F.tag));
    const enriched = list.map(p => ({ p, last: lastVisit(p.id), next: H.nextAppt(p.id), bal: N.patientBalance(p.id) }));
    if (F.sort === 'last') enriched.sort((a, b) => a.p.last.localeCompare(b.p.last));
    if (F.sort === 'visit') enriched.sort((a, b) => b.last.localeCompare(a.last));
    if (F.sort === 'due') enriched.sort((a, b) => b.bal.due - a.bal.due);
    return enriched;
  }
  function tbody() {
    const r = rows();
    document.getElementById('pcount').textContent = r.length + ' patient' + (r.length > 1 ? 's' : '');
    return r.map(({ p, last, next, bal }) => `<tr class="click" data-href="#/patients/${p.id}">
      <td data-l="Patient"><div class="row">${avatar(p, 'sm')}<div><div style="font-weight:500">${esc(p.last)} ${esc(p.first)}</div><div class="xs muted">${p.fileNo}</div></div></div></td>
      <td data-l="Âge">${N.age(p.dob)} ans</td>
      <td data-l="Téléphone" class="nowrap">${p.phone}</td>
      <td data-l="Praticien" class="nowrap">${esc(N.name(N.staff(p.dentist)))}</td>
      <td data-l="Dernière visite">${last ? fmt.date(last) : '<span class="faint">—</span>'}</td>
      <td data-l="Prochain RDV">${next ? `<span class="nowrap">${fmt.rel(next.date)} · ${next.start}</span>` : '<span class="faint">—</span>'}</td>
      <td data-l="Solde" class="num">${bal.due > 0 ? `<b style="color:var(--danger)">${fmt.money(bal.due)}</b>` : '<span class="faint">0 DH</span>'}</td>
      <td data-l="Tags"><div class="row gap-4 wrap">${p.allergies.length ? '<span class="tag allergy">Allergie</span>' : ''}${p.tags.map(t => `<span class="tag ${t === 'VIP' ? 'gold' : ''}">${esc(t)}</span>`).join('')}</div></td></tr>`).join('') || `<tr><td colspan="8">${H.empty('Aucun patient ne correspond à ces critères', 'users')}</td></tr>`;
  }

  A.view('patients', {
    render(params) {
      if (params[0]) return fiche(params[0], params[1] || 'apercu');
      const S = N.S; const all = S.patients.filter(p => N.inClinic(p));
      const tags = [['all', 'Tous'], ['nouveaux', 'Nouveaux (30 j)'], ['Orthodontie', 'Orthodontie'], ['Implantologie', 'Implantologie'], ['Risque no-show', 'Risque no-show'], ['allergies', 'Allergies déclarées'], ['solde', 'Solde dû']];
      return `${H.head('Patients', `<span id="pcount">${all.length} patients</span> · dossiers médicaux centralisés`, `${N.can('patients.edit') ? `<button class="btn primary" data-act="newPatient">${icon('plus')}Nouveau patient</button>` : ''}`)}
      <div class="card">
        <div class="card-body row wrap between" style="gap:12px">
          <div class="row wrap" style="gap:10px;flex:1">
            <div class="search" style="max-width:320px">${icon('search')}<input id="pq" placeholder="Nom, téléphone, n° de dossier…" value="${esc(F.q)}" style="padding-right:12px"></div>
            <select class="select sm" id="pd" style="width:200px"><option value="all">Tous les praticiens</option>${H.dentistOptions(F.dentist)}</select>
            <select class="select sm" id="ps" style="width:180px"><option value="last" ${F.sort === 'last' ? 'selected' : ''}>Trier : nom</option><option value="visit" ${F.sort === 'visit' ? 'selected' : ''}>Trier : dernière visite</option><option value="due" ${F.sort === 'due' ? 'selected' : ''}>Trier : solde dû</option></select>
          </div>
        </div>
        <div class="chips" style="padding:0 20px 14px">${tags.map(([k, l]) => `<button class="chip ${F.tag === k ? 'on' : ''}" data-tag="${k}">${l}</button>`).join('')}</div>
        <div class="table-wrap"><table class="table responsive"><thead><tr><th>Patient</th><th>Âge</th><th>Téléphone</th><th>Praticien</th><th>Dernière visite</th><th>Prochain RDV</th><th class="num">Solde</th><th>Tags</th></tr></thead><tbody id="ptb"></tbody></table></div>
      </div>`;
    },
    mount(el, params) {
      if (params[0]) return mountFiche(el, params[0], params[1] || 'apercu');
      const tb = el.querySelector('#ptb'); tb.innerHTML = tbody();
      el.querySelector('#pq').oninput = e => { F.q = e.target.value; tb.innerHTML = tbody(); };
      el.querySelector('#pd').onchange = e => { F.dentist = e.target.value; tb.innerHTML = tbody(); };
      el.querySelector('#ps').onchange = e => { F.sort = e.target.value; tb.innerHTML = tbody(); };
      el.querySelectorAll('[data-tag]').forEach(b => b.onclick = () => { F.tag = b.dataset.tag; el.querySelectorAll('[data-tag]').forEach(x => x.classList.toggle('on', x === b)); tb.innerHTML = tbody(); });
    }
  });

  /* ---------- Fiche 360° ---------- */
  const TABS = [['apercu', 'Aperçu', 'user'], ['dossier', 'Dossier dentaire', 'stethoscope', 'clinical.view'], ['odontogramme', 'Odontogramme', 'tooth', 'clinical.view'], ['plan', 'Plan de traitement', 'clipboard'], ['imagerie', 'Radios & documents', 'scan', 'clinical.view'], ['avantapres', 'Avant / Après', 'split', 'images.private'], ['ordonnances', 'Ordonnances', 'pill', 'clinical.view'], ['finances', 'Factures & paiements', 'wallet', 'finance.view'], ['rdv', 'Rendez-vous', 'calendar'], ['communication', 'Communication', 'message', 'comm.send']];

  function fiche(pid, tab) {
    const S = N.S; const p = N.patient(pid);
    if (!p) return H.empty('Patient introuvable', 'users');
    const ap = H.apptsOf(pid); const t = D.todayYmd();
    const visits = ap.filter(a => a.status === 'termine').length; const last = lastVisit(pid); const next = H.nextAppt(pid); const bal = N.patientBalance(pid);
    const tabDef = TABS.find(x => x[0] === tab) || TABS[0];
    const counts = { dossier: S.consults.filter(c => c.patient === pid).length, imagerie: S.docs.filter(d => d.patient === pid).length, ordonnances: S.rx.filter(r => r.patient === pid).length, rdv: ap.length, avantapres: S.ba.filter(b => b.patient === pid).length };
    return `
      <div class="crumbs"><a href="#/patients">Patients</a>${icon('chevronRight').replace('<svg', '<svg style="width:12px;height:12px"')}<span>${esc(N.pname(p))}</span></div>
      <div class="card" style="overflow:hidden">
        <div class="p-hero">
          ${avatar(p, 'xl')}
          <div class="grow" style="min-width:240px">
            <div class="row wrap" style="gap:10px"><h2>${esc(p.first)} ${esc(p.last)}</h2>${p.tags.map(x => `<span class="tag ${x === 'VIP' ? 'gold' : ''}">${esc(x)}</span>`).join('')}</div>
            <div class="p-meta"><span>${icon('user')}${p.sex === 'F' ? 'Femme' : 'Homme'} · ${N.age(p.dob)} ans · né${p.sex === 'F' ? 'e' : ''} le ${fmt.date(p.dob)}</span><span>${icon('phone')}${p.phone}</span><span>${icon('mail')}${esc(p.email)}</span><span>${icon('tooth')}${esc(N.name(N.staff(p.dentist)))}</span><span>${icon('building')}${esc(N.clinic(p.clinic).name)} · ${p.fileNo}</span></div>
          </div>
          <div class="row wrap">
            ${N.can('agenda.manage') ? `<button class="btn primary" data-newappt>${icon('calendar')}Rendez-vous</button>` : ''}
            ${N.can('finance.edit') ? `<button class="btn" data-act="pay" data-patient="${p.id}">${icon('card')}Encaisser</button>` : ''}
            ${N.can('comm.send') ? `<a class="btn" href="#/communication/${p.id}">${icon('message')}Message</a>` : ''}
            <button class="btn icon" data-ai title="Résumer avec l’assistant IA">${icon('sparkles')}</button>
            ${N.can('patients.edit') ? `<button class="btn icon" data-edit title="Modifier">${icon('edit')}</button>` : ''}
          </div>
        </div>
        ${p.allergies.length && (N.can('clinical.view') || N.can('agenda.manage')) ? `<div style="padding:0 24px 16px"><div class="med-alert">${icon('alert')}<div><b>Allergies déclarées : ${esc(p.allergies.join(', '))}</b>${N.can('clinical.view') && p.history.length ? ` · Antécédents : ${esc(p.history.join(', '))}` : ''}${N.can('clinical.view') && p.meds.length ? ` · Traitement en cours : ${esc(p.meds.join(', '))}` : ''}</div></div></div>` : ''}
        <div class="p-stats">
          <div><b>${visits}</b><span>Consultations réalisées</span></div>
          <div><b>${last ? fmt.date(last) : '—'}</b><span>Dernière visite</span></div>
          <div><b>${next ? fmt.dayMonth(next.date) + ' · ' + next.start : '—'}</b><span>Prochain rendez-vous</span></div>
          <div><b style="color:${bal.due > 0 ? 'var(--danger)' : 'var(--success)'}">${N.can('finance.view') ? fmt.money(bal.due) : '•••'}</b><span>Reste à payer</span></div>
        </div>
      </div>
      <div class="tabs mt-16">${TABS.map(([k, l, ic, perm]) => `<a href="#/patients/${pid}/${k}" class="${k === tabDef[0] ? 'on' : ''}" ${perm && !N.can(perm) ? 'style="opacity:.45"' : ''}>${l}${counts[k] ? `<span class="n">${counts[k]}</span>` : ''}${perm && !N.can(perm) ? icon('lock').replace('<svg', '<svg style="width:12px;height:12px"') : ''}</a>`).join('')}</div>
      <div class="mt-16" id="ptab">${tabDef[3] && !N.can(tabDef[3]) ? lockedTab() : tabBody(p, tabDef[0])}</div>`;
  }
  const lockedTab = () => `<div class="card card-pad center"><div class="locked-view" style="margin:20px auto"><div class="ico">${icon('lock')}</div><b>Données protégées</b><p class="muted small mt-8">Votre rôle ne permet pas de consulter cette section du dossier. Chaque tentative d’accès est tracée dans le journal d’audit.</p></div></div>`;

  function tabBody(p, tab) {
    switch (tab) {
      case 'dossier': return dossier(p);
      case 'odontogramme': return N.Odonto.render(p.id);
      case 'plan': return N.Plans.forPatient(p.id);
      case 'imagerie': return N.Imaging.gridFor(p.id);
      case 'avantapres': return N.Imaging.baFor(p.id);
      case 'ordonnances': return N.Docs.rxFor(p.id);
      case 'finances': return finances(p);
      case 'rdv': return rdvTab(p);
      case 'communication': return commTab(p);
      default: return apercu(p);
    }
  }
  function mountFiche(el, pid, tab) {
    const p = N.patient(pid); if (!p) return;
    const b = el.querySelector('[data-newappt]'); if (b) b.onclick = () => A.newAppt({ patient: pid, dentist: p.dentist });
    const e = el.querySelector('[data-edit]'); if (e) e.onclick = () => editPatient(p);
    el.querySelector('[data-ai]').onclick = () => N.Assistant && N.Assistant.open('summary', pid);
    if (lastLogged !== pid + tab) { lastLogged = pid + tab; N.log('Consultation du dossier', N.pname(p) + (tab !== 'apercu' ? ' — ' + tab : '')); N.save(); }
    const T = el.querySelector('#ptab');
    if (tab === 'odontogramme' && N.can('clinical.view')) N.Odonto.mount(T, pid);
    if (tab === 'plan') N.Plans.mountFor(T, pid);
    if (tab === 'imagerie' && N.can('clinical.view')) N.Imaging.mountGrid(T, pid);
    if (tab === 'avantapres' && N.can('images.private')) N.Imaging.mountBA(T);
    if (tab === 'ordonnances' && N.can('clinical.view')) N.Docs.mountRx(T, pid);
    if (tab === 'dossier') mountDossier(T, p);
    if (tab === 'apercu') mountApercu(T, p);
    if (tab === 'communication') mountComm(T, p);
  }

  function apercu(p) {
    const S = N.S; const next = H.apptsOf(p.id).filter(a => a.date >= D.todayYmd() && ['confirme', 'attente'].includes(a.status)).slice(0, 4);
    const plan = S.plans.find(x => x.patient === p.id && x.status !== 'termine');
    const act = S.audit.filter(a => a.target && a.target.includes(N.pname(p))).slice(0, 6);
    const clin = N.can('clinical.view');
    return `<div class="grid g-3-2">
      <div class="col gap-16">
        <div class="card"><div class="card-head"><h3>Identité & coordonnées</h3></div><div class="card-body"><dl class="kv">
          <dt>Nom complet</dt><dd>${esc(p.first)} ${esc(p.last)}</dd><dt>Date de naissance</dt><dd>${fmt.date(p.dob)} (${N.age(p.dob)} ans)</dd><dt>Téléphone</dt><dd>${p.phone}</dd><dt>Email</dt><dd>${esc(p.email)}</dd><dt>Adresse</dt><dd>${esc(p.address)}</dd><dt>Profession</dt><dd>${esc(p.profession || '—')}</dd>
        </dl></div></div>
        <div class="grid g2">
          <div class="card"><div class="card-head"><h3>Informations administratives</h3></div><div class="card-body"><dl class="kv" style="grid-template-columns:110px 1fr"><dt>N° dossier</dt><dd>${p.fileNo}</dd><dt>Couverture</dt><dd>${esc(p.cover)}</dd><dt>N° affiliation</dt><dd>${p.coverNo || '—'}</dd><dt>Créé le</dt><dd>${fmt.date(p.created)}</dd><dt>Cabinet</dt><dd>${esc(N.clinic(p.clinic).name)}</dd></dl></div></div>
          <div class="card"><div class="card-head"><h3>Contact d’urgence</h3></div><div class="card-body"><dl class="kv" style="grid-template-columns:90px 1fr"><dt>Nom</dt><dd>${esc(p.emergency.name || '—')}</dd><dt>Lien</dt><dd>${esc(p.emergency.relation || '—')}</dd><dt>Téléphone</dt><dd>${esc(p.emergency.phone || '—')}</dd></dl>
            <div class="divider"></div><div class="xs muted mb-8">Consentements</div><div class="row wrap gap-6">${[['rgpd', 'Données de santé'], ['sms', 'SMS'], ['email', 'Email'], ['whatsapp', 'WhatsApp'], ['photos', 'Photos']].map(([k, l]) => `<span class="badge ${p.consent[k] ? 'st-termine' : 'st-annule'}">${p.consent[k] ? '✓' : '✕'} ${l}</span>`).join('')}</div></div></div>
        </div>
        <div class="card"><div class="card-head"><h3>Notes du cabinet</h3><span class="xs muted">Visibles par l’équipe</span></div><div class="card-body"><textarea class="textarea" id="pnotes" ${N.can('patients.edit') ? '' : 'readonly'} placeholder="Préférences, informations pratiques…">${esc(p.notes)}</textarea>${N.can('patients.edit') ? `<div class="row mt-8" style="justify-content:flex-end"><button class="btn sm" data-savenotes>${icon('check')}Enregistrer</button></div>` : ''}</div></div>
      </div>
      <div class="col gap-16">
        <div class="card"><div class="card-head"><h3>Informations médicales</h3>${clin && N.can('clinical.edit') ? `<button class="btn sm" data-med>${icon('edit')}Modifier</button>` : ''}</div><div class="card-body">
          ${clin ? `<div class="clin-sec" style="margin-top:0"><h5>Antécédents renseignés</h5><p>${esc(p.history.join(', ') || 'Aucun antécédent déclaré')}</p></div>
          <div class="clin-sec"><h5>Allergies déclarées</h5><div class="row wrap gap-6">${p.allergies.map(a => `<span class="tag allergy">${esc(a)}</span>`).join('') || '<p>Aucune allergie déclarée</p>'}</div></div>
          <div class="clin-sec"><h5>Médicaments déclarés</h5><p>${esc(p.meds.join(', ') || 'Aucun')}</p></div>
          <div class="clin-sec"><h5>Tabac</h5><p>${p.smoker ? 'Fumeur déclaré' : 'Non-fumeur'}</p></div>
          <p class="xs faint mt-12">Informations déclarées par le patient — à vérifier à chaque consultation.</p>` : `<div class="small muted">${icon('lock').replace('<svg', '<svg style="width:14px;height:14px;display:inline"')} Réservé aux praticiens et assistant(e)s.</div>`}
        </div></div>
        <div class="card"><div class="card-head"><h3>Prochains rendez-vous</h3>${N.can('agenda.manage') ? `<button class="btn sm" data-newappt2>${icon('plus')}Ajouter</button>` : ''}</div><div class="card-body"><div class="list">${next.map(a => `<div class="li click" data-act="appt" data-id="${a.id}"><div class="avatar sm" style="background:${S.types[a.type].color}">${fmt.dayMonth(a.date).split(' ')[0]}</div><div class="grow"><div class="t">${S.types[a.type].label}</div><div class="s">${fmt.dateLong(a.date)} · ${a.start}</div></div>${stBadge(a.status)}</div>`).join('') || '<div class="small muted">Aucun rendez-vous planifié</div>'}</div></div></div>
        ${plan ? `<a class="card hover" href="#/patients/${p.id}/plan" style="color:inherit;display:block"><div class="card-head"><h3>Plan de traitement</h3>${N.Plans.statusBadge(plan.status)}</div><div class="card-body">${N.Plans.summary(plan)}</div></a>` : ''}
        <div class="card"><div class="card-head"><h3>Historique des accès</h3><span class="xs muted">Journal d’audit</span></div><div class="card-body"><div class="list">${act.map(a => `<div class="li"><div class="grow"><div class="small"><b>${esc(a.user)}</b> — ${esc(a.action)}</div><div class="xs muted">${fmt.ago(a.at)}</div></div></div>`).join('') || '<div class="small muted">—</div>'}</div></div></div>
      </div></div>`;
  }
  function mountApercu(T, p) {
    const s = T.querySelector('[data-savenotes]'); if (s) s.onclick = () => { p.notes = T.querySelector('#pnotes').value; N.log('Notes patient modifiées', N.pname(p)); N.save(); toast('Notes enregistrées'); };
    const m = T.querySelector('[data-med]'); if (m) m.onclick = () => editMedical(p);
    const n = T.querySelector('[data-newappt2]'); if (n) n.onclick = () => A.newAppt({ patient: p.id, dentist: p.dentist });
  }

  function editPatient(p) {
    modal({
      title: 'Modifier la fiche', size: 'lg',
      body: `<form class="form-grid" id="fe">${[['first', 'Prénom'], ['last', 'Nom'], ['phone', 'Téléphone'], ['email', 'Email'], ['profession', 'Profession'], ['cover', 'Couverture'], ['coverNo', 'N° d’affiliation']].map(([k, l]) => `<div class="field"><label>${l}</label><input class="input" name="${k}" value="${esc(p[k] || '')}"></div>`).join('')}
        <div class="field"><label>Date de naissance</label><input class="input" type="date" name="dob" value="${p.dob}"></div>
        <div class="field full"><label>Adresse</label><input class="input" name="address" value="${esc(p.address)}"></div>
        <div class="field"><label>Contact d’urgence</label><input class="input" name="emName" value="${esc(p.emergency.name)}"></div><div class="field"><label>Téléphone d’urgence</label><input class="input" name="emPhone" value="${esc(p.emergency.phone)}"></div>
        <div class="field"><label>Praticien référent</label><select class="select" name="dentist">${H.dentistOptions(p.dentist, true)}</select></div>
        <div class="field"><label>Tags</label><input class="input" name="tags" value="${esc(p.tags.join(', '))}"></div>
        <div class="full row wrap" style="gap:16px">${[['sms', 'SMS'], ['email', 'Email'], ['whatsapp', 'WhatsApp'], ['photos', 'Photos (usage interne)']].map(([k, l]) => `<label class="check"><input type="checkbox" name="c_${k}" ${p.consent[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div></form>`,
      foot: `<button class="btn" data-close>Annuler</button><button class="btn primary" data-save>${icon('check')}Enregistrer</button>`,
      onMount: el => el.querySelector('[data-save]').onclick = () => {
        const d = formData(el.querySelector('#fe'));
        ['first', 'last', 'phone', 'email', 'profession', 'cover', 'coverNo', 'dob', 'address', 'dentist'].forEach(k => p[k] = d[k]);
        p.emergency.name = d.emName; p.emergency.phone = d.emPhone; p.tags = d.tags.split(',').map(x => x.trim()).filter(Boolean);
        ['sms', 'email', 'whatsapp', 'photos'].forEach(k => p.consent[k] = d['c_' + k]);
        N.log('Fiche administrative modifiée', N.pname(p)); N.save(); el.close(); A.refresh(); toast('Fiche mise à jour');
      }
    });
  }
  function editMedical(p) {
    modal({
      title: 'Informations médicales déclarées',
      body: `<form class="col" style="gap:14px" id="fm"><div class="field"><label>Antécédents renseignés</label><input class="input" name="history" value="${esc(p.history.join(', '))}"></div><div class="field"><label>Allergies déclarées</label><input class="input" name="allergies" value="${esc(p.allergies.join(', '))}"></div><div class="field"><label>Médicaments déclarés</label><input class="input" name="meds" value="${esc(p.meds.join(', '))}"></div><label class="check"><input type="checkbox" name="smoker" ${p.smoker ? 'checked' : ''}> Fumeur</label><p class="xs muted">Chaque modification est horodatée et conservée dans l’historique du dossier.</p></form>`,
      foot: `<button class="btn" data-close>Annuler</button><button class="btn primary" data-save>Enregistrer</button>`,
      onMount: el => el.querySelector('[data-save]').onclick = () => {
        const d = formData(el.querySelector('#fm')); const sp = s => s.split(',').map(x => x.trim()).filter(Boolean);
        p.history = sp(d.history); p.allergies = sp(d.allergies); p.meds = sp(d.meds); p.smoker = d.smoker;
        N.log('Données médicales modifiées', N.pname(p)); N.save(); el.close(); A.refresh(); toast('Informations médicales mises à jour');
      }
    });
  }

  /* ---------- Dossier dentaire ---------- */
  const SECS = [['motif', 'Motif de consultation'], ['anamnese', 'Anamnèse'], ['history', 'Antécédents'], ['allergies', 'Allergies déclarées'], ['observations', 'Observations'], ['diagnosis', 'Diagnostic'], ['proposed', 'Traitement proposé'], ['done', 'Traitement réalisé'], ['notes', 'Notes du praticien']];
  function consultCard(c, withPatient = false) {
    const S = N.S; const docs = S.docs.filter(d => d.patient === c.patient && d.date === c.date); const rx = S.rx.filter(r => r.patient === c.patient && r.date === c.date);
    return `<div class="tl-card">
      <div class="row between wrap"><div><b style="font-size:14.5px">${esc(c.motif)}</b><div class="xs muted">${withPatient ? esc(N.pname(c.patient)) + ' · ' : ''}${esc(N.name(N.staff(c.dentist)))}${c.type ? ' · ' + S.types[c.type].label : ''}</div></div><div class="row gap-6">${docs.length ? badge(docs.length + ' document(s)', 'tone-blue', false) : ''}${rx.length ? badge('Ordonnance', 'tone-violet', false) : ''}</div></div>
      <div class="grid g2" style="gap:4px 24px">${SECS.slice(1).filter(([k]) => c[k]).map(([k, l]) => `<div class="clin-sec"><h5>${l}</h5><p>${esc(c[k])}</p></div>`).join('')}</div>
      ${docs.length ? `<div class="row wrap gap-6 mt-12">${docs.map(d => `<a class="tag" href="#/radiographies/${d.id}">${icon(d.cat === 'radio' ? 'scan' : d.cat === 'photo' ? 'image' : 'file').replace('<svg', '<svg style="width:12px;height:12px;margin-right:4px"')}${esc(d.title)}</a>`).join('')}</div>` : ''}
    </div>`;
  }
  function dossier(p) {
    const list = N.S.consults.filter(c => c.patient === p.id).sort((a, b) => b.date.localeCompare(a.date));
    return `<div class="grid g-3-2" style="align-items:start">
      <div class="card"><div class="card-head"><div><h3>Historique chronologique</h3><div class="sub">${list.length} consultation(s)</div></div>${N.can('clinical.edit') ? `<button class="btn primary sm" data-newc>${icon('plus')}Nouvelle consultation</button>` : ''}</div>
        <div class="card-body"><div class="timeline">${list.map(c => `<div class="tl-item"><span class="tl-dot"><i></i></span><div class="tl-date">${fmt.dateLong(c.date)}</div>${consultCard(c)}</div>`).join('') || H.empty('Aucune consultation enregistrée', 'stethoscope')}</div></div></div>
      <div class="col gap-16">
        <div class="card premium"><div class="card-head"><h3 class="row gap-6">${icon('sparkles').replace('<svg', '<svg style="width:16px;height:16px;color:var(--gold)"')}Synthèse assistée</h3></div><div class="card-body"><p class="small muted">L’assistant peut résumer l’historique à partir des notes saisies par le praticien. Il ne pose aucun diagnostic.</p><button class="btn gold sm mt-12" data-sum>${icon('sparkles')}Résumer l’historique</button></div></div>
        <div class="card"><div class="card-head"><h3>Dernières informations déclarées</h3></div><div class="card-body"><div class="clin-sec" style="margin-top:0"><h5>Antécédents</h5><p>${esc(p.history.join(', ') || '—')}</p></div><div class="clin-sec"><h5>Allergies</h5><p>${esc(p.allergies.join(', ') || '—')}</p></div><div class="clin-sec"><h5>Médicaments</h5><p>${esc(p.meds.join(', ') || '—')}</p></div></div></div>
        <div class="card"><div class="card-head"><h3>Raccourcis</h3></div><div class="card-body col gap-6"><a class="btn" href="#/patients/${p.id}/odontogramme">${icon('tooth')}Odontogramme</a><a class="btn" href="#/patients/${p.id}/imagerie">${icon('scan')}Radiographies & photos</a><a class="btn" href="#/patients/${p.id}/ordonnances">${icon('pill')}Ordonnances</a><a class="btn" href="#/documents/new/compte_rendu/${p.id}">${icon('file')}Compte rendu</a></div></div>
      </div></div>`;
  }
  function mountDossier(T, p) {
    const n = T.querySelector('[data-newc]'); if (n) n.onclick = () => newConsult(p.id);
    const s = T.querySelector('[data-sum]'); if (s) s.onclick = () => N.Assistant.open('summary', p.id);
  }
  function newConsult(pid) {
    const S = N.S;
    modal({
      title: 'Nouvelle consultation', size: 'lg',
      body: `<form class="form-grid" id="fc">
        ${pid ? `<input type="hidden" name="patient" value="${pid}">` : `<div class="field full"><label>Patient</label><select class="select" name="patient">${H.patientOptions()}</select></div>`}
        <div class="field"><label>Date</label><input class="input" type="date" name="date" value="${D.todayYmd()}"></div>
        <div class="field"><label>Type</label><select class="select" name="type">${H.typeOptions('consultation')}</select></div>
        ${SECS.map(([k, l]) => `<div class="field ${['motif', 'history', 'allergies'].includes(k) ? '' : 'full'}"><label>${l}</label>${['motif', 'history', 'allergies'].includes(k) ? `<input class="input" name="${k}">` : `<textarea class="textarea" name="${k}" style="min-height:64px"></textarea>`}</div>`).join('')}
        <div class="full xs muted">${icon('shield').replace('<svg', '<svg style="width:13px;height:13px;display:inline;vertical-align:-2px"')} Enregistrement horodaté, signé par le praticien connecté et versionné (historique des modifications).</div>
      </form>`,
      foot: `<button class="btn" data-close>Annuler</button><button class="btn primary" data-save>${icon('check')}Enregistrer la consultation</button>`,
      onMount: el => {
        const f = el.querySelector('#fc');
        const pre = () => { const p = N.patient(f.patient.value); f.history.value = p.history.join(', '); f.allergies.value = p.allergies.join(', '); };
        pre(); if (f.patient.tagName === 'SELECT') f.patient.onchange = pre;
        el.querySelector('[data-save]').onclick = () => {
          const d = formData(f); if (!d.motif.trim()) return toast('Le motif est requis', 'alert');
          const me = N.me(); const c = Object.assign({ id: N.uid('c'), dentist: me.role === 'dentiste' ? me.id : N.patient(d.patient).dentist }, d);
          S.consults.unshift(c); N.log('Consultation enregistrée', N.pname(d.patient) + ' — ' + d.motif); N.save(); el.close(); A.refresh(); toast('Consultation enregistrée dans le dossier', 'stethoscope');
        };
      }
    });
  }

  /* ---------- Autres onglets ---------- */
  function finances(p) {
    const S = N.S; const inv = S.invoices.filter(i => i.patient === p.id).sort((a, b) => b.date.localeCompare(a.date)); const pays = S.payments.filter(x => x.patient === p.id).sort((a, b) => b.date.localeCompare(a.date)); const b = N.patientBalance(p.id);
    return `<div class="grid g3">
      ${H.kpi('Total traitement', fmt.money(b.total), 'receipt', 'tone-navy')}${H.kpi('Payé', fmt.money(b.paid), 'check', 'tone-green', `<div class="progress sage grow"><i style="width:${b.total ? b.paid / b.total * 100 : 0}%"></i></div>`)}${H.kpi('Reste à payer', fmt.money(b.due), 'wallet', b.due > 0 ? 'tone-red' : 'tone-gray', N.can('finance.edit') && b.due > 0 ? `<button class="btn xs primary" data-act="pay" data-patient="${p.id}">Encaisser</button>` : '')}
    </div>
    <div class="grid g2 mt-16">
      <div class="card"><div class="card-head"><h3>Factures</h3><a class="small" href="#/facturation">Module facturation</a></div><div class="table-wrap"><table class="table"><thead><tr><th>N°</th><th>Date</th><th class="num">Montant</th><th>Statut</th></tr></thead><tbody>${inv.map(i => { const st = N.ui.INV_ST[N.invoiceStatus(i)]; return `<tr class="click" data-href="#/facturation/${i.id}"><td>${i.number}</td><td>${fmt.date(i.date)}</td><td class="num">${fmt.money(N.invoiceTotal(i))}</td><td>${badge(st[0], st[1])}</td></tr>`; }).join('') || `<tr><td colspan="4" class="muted">Aucune facture</td></tr>`}</tbody></table></div></div>
      <div class="card"><div class="card-head"><h3>Paiements</h3></div><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Type</th><th>Mode</th><th class="num">Montant</th></tr></thead><tbody>${pays.map(x => `<tr><td>${fmt.date(x.date)}</td><td>${x.kind === 'acompte' ? badge('Acompte', 'tone-violet', false) : x.kind === 'remboursement' ? badge('Remboursement', 'st-noshow', false) : badge('Paiement', 'st-termine', false)}</td><td>${N.ui.METHOD[x.method]}</td><td class="num" style="${x.amount < 0 ? 'color:var(--danger)' : ''}">${fmt.money(x.amount)}</td></tr>`).join('') || `<tr><td colspan="4" class="muted">Aucun paiement</td></tr>`}</tbody></table></div></div>
    </div>`;
  }
  function rdvTab(p) {
    const S = N.S; const ap = H.apptsOf(p.id).slice().reverse();
    const c = k => ap.filter(a => a.status === k).length;
    return `<div class="grid g4">${H.kpi('Rendez-vous', ap.length, 'calendar', 'tone-blue')}${H.kpi('Honorés', c('termine'), 'check', 'tone-green')}${H.kpi('Annulés', c('annule'), 'x', 'tone-gray')}${H.kpi('No-show', c('noshow'), 'alert', 'tone-red', p.noShows >= 2 ? '<span>Rappel renforcé recommandé</span>' : '')}</div>
    <div class="card mt-16"><div class="table-wrap"><table class="table responsive"><thead><tr><th>Date</th><th>Heure</th><th>Type</th><th>Praticien</th><th>Statut</th><th>Note</th></tr></thead><tbody>${ap.map(a => `<tr class="click" data-act="appt" data-id="${a.id}"><td data-l="Date">${fmt.date(a.date)}</td><td data-l="Heure">${a.start}</td><td data-l="Type">${H.typeDot(a.type)}</td><td data-l="Praticien">${esc(N.name(N.staff(a.dentist)))}</td><td data-l="Statut">${stBadge(a.status)}${a.late ? ` <span class="xs muted">+${a.late} min</span>` : ''}</td><td data-l="Note" class="small muted">${esc(a.note)}</td></tr>`).join('')}</tbody></table></div></div>`;
  }
  function commTab(p) {
    const ms = N.S.messages.filter(m => m.patient === p.id).sort((a, b) => a.at.localeCompare(b.at));
    return `<div class="card"><div class="card-head"><h3>Échanges avec le patient</h3><a class="btn sm" href="#/communication/${p.id}">${icon('message')}Ouvrir la messagerie</a></div><div class="card-body"><div class="chat-body" style="max-height:420px;border-radius:12px">${ms.map(m => N.Comm.bubble(m)).join('') || '<div class="muted small">Aucun échange</div>'}</div></div></div>`;
  }
  function mountComm() { }

  /* ---------- Module Consultations ---------- */
  const CF = { q: '', type: 'all', page: 1 };
  A.view('consultations', {
    render() {
      const S = N.S; const norm = s => (s || '').toLowerCase();
      let list = S.consults.filter(c => N.inClinic(N.patient(c.patient)));
      if (CF.type !== 'all') list = list.filter(c => c.type === CF.type);
      if (CF.q) list = list.filter(c => norm(N.pname(c.patient) + ' ' + c.motif + ' ' + c.diagnosis).includes(norm(CF.q)));
      list.sort((a, b) => b.date.localeCompare(a.date));
      const page = list.slice(0, CF.page * 30);
      const t = D.todayYmd();
      return `${H.head('Consultations', `${list.length} consultations · dossier dentaire structuré`, N.can('clinical.edit') ? `<button class="btn primary" data-newc>${icon('plus')}Nouvelle consultation</button>` : '')}
      <div class="grid g4 mb-16">${H.kpi('Aujourd’hui', list.filter(c => c.date === t).length, 'stethoscope', 'tone-blue')}${H.kpi('7 derniers jours', list.filter(c => c.date > D.addYmd(t, -7)).length, 'calendar', 'tone-sage')}${H.kpi('Ce mois', list.filter(c => c.date.slice(0, 7) === t.slice(0, 7)).length, 'bars', 'tone-violet')}${H.kpi('Patients distincts', new Set(list.map(c => c.patient)).size, 'users', 'tone-gold')}</div>
      <div class="card"><div class="card-body row wrap"><div class="search" style="max-width:320px">${icon('search')}<input id="cq" placeholder="Patient, motif, diagnostic…" value="${esc(CF.q)}" style="padding-right:12px"></div><select class="select sm" id="ct" style="width:200px"><option value="all">Tous les types</option>${H.typeOptions(CF.type)}</select></div>
        <div class="table-wrap"><table class="table responsive"><thead><tr><th>Date</th><th>Patient</th><th>Motif</th><th>Diagnostic</th><th>Traitement réalisé</th><th>Praticien</th></tr></thead><tbody>
        ${page.map(c => `<tr class="click" data-c="${c.id}"><td data-l="Date" class="nowrap">${fmt.date(c.date)}</td><td data-l="Patient">${H.pcell(c.patient)}</td><td data-l="Motif">${esc(c.motif)}</td><td data-l="Diagnostic" class="small">${esc(c.diagnosis)}</td><td data-l="Réalisé" class="small muted">${esc(c.done)}</td><td data-l="Praticien" class="nowrap small">${esc(N.name(N.staff(c.dentist)))}</td></tr>`).join('')}
        </tbody></table></div>
        ${list.length > page.length ? `<div class="card-body center"><button class="btn" data-more>Afficher plus (${list.length - page.length})</button></div>` : ''}</div>`;
    },
    mount(el) {
      const n = el.querySelector('[data-newc]'); if (n) n.onclick = () => newConsult();
      el.querySelector('#cq').onchange = e => { CF.q = e.target.value; CF.page = 1; A.refresh(); };
      el.querySelector('#ct').onchange = e => { CF.type = e.target.value; A.refresh(); };
      const m = el.querySelector('[data-more]'); if (m) m.onclick = () => { CF.page++; A.refresh(); };
      el.querySelectorAll('[data-c]').forEach(r => r.onclick = e => { if (e.target.closest('a')) return; const c = N.S.consults.find(x => x.id === r.dataset.c); modal({ title: 'Consultation du ' + fmt.date(c.date), size: 'lg', body: consultCard(c, true), foot: `<a class="btn" href="#/patients/${c.patient}/dossier" data-close>${icon('user')}Dossier du patient</a>` }); });
    }
  });

  N.Patients = { newConsult, consultCard, lastVisit };
})();
