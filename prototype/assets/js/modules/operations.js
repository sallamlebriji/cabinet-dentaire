/* Laboratoire, stock, fournisseurs & commandes */
(function () {
  const N = Nacre, D = N.D, A = N.App, H = A.H;
  const { icon, fmt, esc, avatar, badge, toast, modal, formData } = N.ui;

  /* =================== LABORATOIRE =================== */
  const LORDER = ['a_envoyer', 'envoye', 'fabrication', 'pret', 'recu', 'livre'];
  const LT = { tab: 'suivi' };
  function labCard(l) {
    const S = N.S; const lab = S.labs.find(x => x.id === l.lab); const t = D.todayYmd(); const late = !['recu', 'livre'].includes(l.status) && l.due < t;
    return `<div class="kcard" draggable="${N.can('lab.manage')}" data-lc="${l.id}"><div class="row between"><b style="font-size:13px">${esc(l.type)}</b>${l.shade && l.shade !== '—' ? `<span class="tag">${esc(l.shade)}</span>` : ''}</div>
      <div class="small muted mt-4">${esc(l.teeth)} · ${esc(N.pname(l.patient))}</div>
      <div class="row between mt-12 xs"><span class="muted truncate" style="max-width:130px">${icon('flask').replace('<svg', '<svg style="width:12px;height:12px;display:inline;vertical-align:-2px"')} ${esc(lab.name)}</span><span style="${late ? 'color:var(--danger);font-weight:600' : 'color:var(--muted)'}">${late ? '⚠ ' : ''}${l.status === 'livre' ? 'Livré' : 'Retour ' + fmt.rel(l.due)}</span></div>
      ${l.status === 'fabrication' && N.can('lab.manage') ? `<button class="btn xs mt-8" data-ready="${l.id}" style="width:100%">${icon('bell')}Simuler « prêt » (notif. labo)</button>` : ''}</div>`;
  }
  function labDrawer(id) {
    const S = N.S; const l = S.labCases.find(x => x.id === id); const lab = S.labs.find(x => x.id === l.lab); const p = N.patient(l.patient);
    modal({
      title: esc(l.type) + ' · ' + esc(l.teeth), drawer: true,
      body: `${H.pcell(p, p.phone)}<div class="mt-16" style="overflow-x:auto">${LORDER.map((s, i) => { const ci = LORDER.indexOf(l.status); return `${i ? `<div class="pipe-line ${i <= ci ? 'done' : ''}" style="display:inline-block;width:12px;vertical-align:middle"></div>` : ''}<span class="pipe ${i < ci ? 'done' : i === ci ? 'cur' : ''}" style="display:inline-flex;vertical-align:middle"><span class="d">${i < ci ? '✓' : i + 1}</span></span>`; }).join('')}<div class="small mt-8"><b>${N.LAB_ST[l.status][0]}</b></div></div>
        <div class="card mt-16"><div class="card-body"><dl class="kv" style="grid-template-columns:120px 1fr"><dt>Laboratoire</dt><dd>${esc(lab.name)}<div class="xs muted">${lab.phone} · ${lab.email}</div></dd><dt>Praticien</dt><dd>${esc(N.name(N.staff(l.dentist)))}</dd><dt>Teinte</dt><dd>${esc(l.shade)}</dd><dt>Envoyé le</dt><dd>${l.sent ? fmt.date(l.sent) : '—'}</dd><dt>Retour prévu</dt><dd>${fmt.date(l.due)}</dd><dt>Reçu le</dt><dd>${l.received ? fmt.date(l.received) : '—'}</dd><dt>Coût labo</dt><dd>${fmt.money(l.price)}</dd></dl></div></div>
        <div class="field mt-16"><label>Instructions / notes</label><textarea class="textarea" id="lnote">${esc(l.notes)}</textarea></div>
        ${N.can('lab.manage') ? `<div class="small muted mt-16 mb-8">Changer le statut</div><div class="row wrap gap-6">${LORDER.map(s => `<button class="btn sm ${l.status === s ? 'navy' : ''}" data-ls="${s}">${N.LAB_ST[s][0]}</button>`).join('')}</div>` : ''}`,
      foot: `<a class="btn" href="#/patients/${p.id}" data-close>${icon('user')}Fiche</a>${N.can('lab.manage') ? `<button class="btn primary" data-lsave>Enregistrer</button>` : ''}`,
      onMount: el => {
        el.querySelectorAll('[data-ls]').forEach(b => b.onclick = () => { setLab(l, b.dataset.ls); el.close(); labDrawer(l.id); });
        const s = el.querySelector('[data-lsave]'); if (s) s.onclick = () => { l.notes = el.querySelector('#lnote').value; N.save(); el.close(); A.refresh(); toast('Travail mis à jour'); };
      }
    });
  }
  function setLab(l, s) {
    const t = D.todayYmd(); l.status = s;
    if (s === 'envoye' && !l.sent) l.sent = t; if (s === 'recu') l.received = t;
    if (s === 'pret') N.notify({ kind: 'lab', title: 'Laboratoire : travail prêt', text: `${N.S.labs.find(x => x.id === l.lab).name} signale : ${l.type} (${l.teeth}) de ${N.pname(l.patient)} est prêt.`, link: '#/laboratoire' });
    if (s === 'livre') { const p = N.patient(l.patient); A.H.sendMsg(p.id, `Bonjour ${p.first}, votre ${l.type.toLowerCase()} a été posé(e). N’hésitez pas à nous contacter en cas de gêne.`, 'sms', true); }
    N.log('Laboratoire → ' + N.LAB_ST[s][0], l.type + ' — ' + N.pname(l.patient)); N.save(); A.refresh(); toast(`${esc(l.type)} : ${N.LAB_ST[s][0]}`, 'flask');
  }
  function newLabCase() {
    const S = N.S;
    modal({ title: 'Nouveau travail de laboratoire', size: 'lg', body: `<form class="form-grid" id="fl"><div class="field full"><label>Patient</label><select class="select" name="patient">${H.patientOptions()}</select></div><div class="field"><label>Type de travail</label><select class="select" name="type">${['Couronne zircone', 'Couronne céramo-métallique', 'Bridge 3 éléments', 'Facettes céramiques', 'Inlay-core', 'Prothèse amovible partielle', 'Prothèse complète', 'Appareil orthodontique', 'Aligneurs', 'Gouttière occlusale', 'Gouttière de contention', 'Empreinte / modèle d’étude'].map(x => `<option>${x}</option>`).join('')}</select></div><div class="field"><label>Laboratoire</label><select class="select" name="lab">${S.labs.map(l => `<option value="${l.id}">${l.name} (${l.delay} j)</option>`).join('')}</select></div><div class="field"><label>Dent(s)</label><input class="input" name="teeth" placeholder="Ex. : 36"></div><div class="field"><label>Teinte</label><input class="input" name="shade" placeholder="Ex. : A2"></div><div class="field"><label>Empreinte</label><select class="select" name="imp"><option>Empreinte optique (STL)</option><option>Empreinte physique (silicone)</option><option>Alginate</option></select></div><div class="field"><label>Retour souhaité</label><input class="input" type="date" name="due" value="${D.addYmd(D.todayYmd(), 8)}"></div><div class="field"><label>Coût (DH)</label><input class="input" type="number" name="price" value="1200"></div><div class="field full"><label>Instructions</label><textarea class="textarea" name="notes"></textarea></div><label class="check full"><input type="checkbox" name="send" checked> Envoyer immédiatement au laboratoire</label></form>`,
      foot: `<button class="btn" data-close>Annuler</button><button class="btn primary" data-save>Créer</button>`,
      onMount: el => el.querySelector('[data-save]').onclick = () => { const d = formData(el.querySelector('#fl')); const p = N.patient(d.patient); const l = { id: N.uid('lb'), patient: d.patient, lab: d.lab, type: d.type, teeth: d.teeth || '—', shade: d.shade || '—', sent: d.send ? D.todayYmd() : '', due: d.due, status: d.send ? 'envoye' : 'a_envoyer', price: +d.price, notes: d.imp + (d.notes ? ' — ' + d.notes : ''), received: '', dentist: p.dentist, clinic: p.clinic }; S.labCases.unshift(l); N.log('Travail laboratoire créé', l.type + ' — ' + N.pname(p)); N.save(); el.close(); A.refresh(); toast('Travail créé' + (d.send ? ' et envoyé au laboratoire' : ''), 'flask'); } });
  }
  A.view('laboratoire', {
    render() {
      const S = N.S; const t = D.todayYmd(); const all = S.labCases.filter(l => N.inClinic(l));
      const late = all.filter(l => !['recu', 'livre'].includes(l.status) && l.due < t);
      return `${H.head('Laboratoire dentaire', 'À envoyer → Envoyé → En fabrication → Prêt → Reçu → Livré au patient', N.can('lab.manage') ? `<button class="btn primary" data-nl>${icon('plus')}Nouveau travail</button>` : '')}
      <div class="grid g4 mb-16">${H.kpi('Travaux en cours', all.filter(l => !['livre'].includes(l.status)).length, 'flask', 'tone-gold')}${H.kpi('Prêts au labo', all.filter(l => l.status === 'pret').length, 'bell', 'tone-teal')}${H.kpi('En retard', late.length, 'alert', 'tone-red', late.length ? `<span>${esc(late.map(l => N.pname(l.patient)).join(', '))}</span>` : '')}${H.kpi('Coût labo (30 j)', fmt.money(all.filter(l => l.sent && l.sent >= D.addYmd(t, -30)).reduce((s, l) => s + l.price, 0)), 'wallet', 'tone-navy')}</div>
      <div class="tabs mb-16"><button class="${LT.tab === 'suivi' ? 'on' : ''}" data-lt="suivi">Suivi des travaux</button><button class="${LT.tab === 'labs' ? 'on' : ''}" data-lt="labs">Laboratoires partenaires</button></div>
      ${LT.tab === 'suivi' ? `<div class="kanban">${LORDER.map(s => { const items = all.filter(l => l.status === s); return `<div class="kcol" data-kcol="${s}"><div class="kcol-head"><span class="row gap-6">${N.labBadge(s)}</span><span class="n">${items.length}</span></div>${items.map(labCard).join('')}</div>`; }).join('')}</div>`
        : `<div class="grid g3">${S.labs.map(l => { const cases = S.labCases.filter(c => c.lab === l.id); const onTime = cases.filter(c => c.received && c.received <= c.due).length; const recv = cases.filter(c => c.received).length; return `<div class="card"><div class="card-body"><div class="row"><span class="avatar" style="background:var(--gold-50);color:var(--gold)">${icon('flask').replace('<svg', '<svg style="width:16px"')}</span><div><b>${esc(l.name)}</b><div class="xs muted">${esc(l.city)} · délai moyen ${l.delay} j</div></div></div><div class="chips mt-12">${l.specialties.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div><div class="divider"></div><dl class="kv" style="grid-template-columns:110px 1fr"><dt>Contact</dt><dd>${esc(l.contact)}</dd><dt>Téléphone</dt><dd>${l.phone}</dd><dt>Email</dt><dd class="truncate">${l.email}</dd><dt>Travaux</dt><dd>${cases.length} (${cases.filter(c => !['livre', 'recu'].includes(c.status)).length} en cours)</dd><dt>Ponctualité</dt><dd>${recv ? Math.round(onTime / recv * 100) + ' %' : '—'}</dd></dl></div></div>`; }).join('')}</div>`}`;
    },
    mount(el) {
      el.querySelectorAll('[data-lt]').forEach(b => b.onclick = () => { LT.tab = b.dataset.lt; A.refresh(); });
      const n = el.querySelector('[data-nl]'); if (n) n.onclick = newLabCase;
      el.querySelectorAll('[data-lc]').forEach(c => c.onclick = e => { if (e.target.closest('[data-ready]')) return; labDrawer(c.dataset.lc); });
      el.querySelectorAll('[data-ready]').forEach(b => b.onclick = () => setLab(N.S.labCases.find(l => l.id === b.dataset.ready), 'pret'));
      let drag = null;
      el.querySelectorAll('.kcard[draggable=true]').forEach(c => { c.addEventListener('dragstart', e => { drag = c.dataset.lc; c.classList.add('dragging'); e.dataTransfer.setData('text/plain', drag); }); c.addEventListener('dragend', () => c.classList.remove('dragging')); });
      el.querySelectorAll('[data-kcol]').forEach(col => { col.addEventListener('dragover', e => { if (!drag) return; e.preventDefault(); col.classList.add('drop'); }); col.addEventListener('dragleave', () => col.classList.remove('drop')); col.addEventListener('drop', e => { e.preventDefault(); col.classList.remove('drop'); const l = N.S.labCases.find(x => x.id === drag); drag = null; if (l && l.status !== col.dataset.kcol) setLab(l, col.dataset.kcol); }); });
    }
  });

  /* =================== STOCK =================== */
  const SF = { cat: 'all', q: '', alert: 'all' };
  A.view('stock', {
    render() {
      const S = N.S; const t = D.todayYmd(); const all = S.stock.filter(s => N.inClinic(s));
      const cats = [...new Set(all.map(s => s.cat))];
      let list = all;
      if (SF.cat !== 'all') list = list.filter(s => s.cat === SF.cat);
      if (SF.q) list = list.filter(s => (s.name + ' ' + s.lot).toLowerCase().includes(SF.q.toLowerCase()));
      if (SF.alert === 'low') list = list.filter(s => s.qty <= s.min); if (SF.alert === 'exp') list = list.filter(s => D.diffDays(t, s.exp) <= 60);
      const low = all.filter(s => s.qty <= s.min), exp = all.filter(s => D.diffDays(t, s.exp) <= 60);
      const multi = S.session.clinic === 'all';
      return `${H.head('Stock dentaire', 'Matériel, consommables, seuils et dates d’expiration', N.can('stock.manage') ? `<button class="btn" data-autoorder>${icon('truck')}Commander le stock faible</button><button class="btn primary" data-np>${icon('plus')}Nouveau produit</button>` : '')}
      <div class="grid g4 mb-16">${H.kpi('Références', all.length, 'box', 'tone-blue', `<span>${cats.length} catégories</span>`)}${H.kpi('Stock faible', low.length, 'alert', 'tone-red', `<span>sous le seuil minimum</span>`)}${H.kpi('Bientôt expirés', exp.length, 'clock', 'tone-amber', `<span>≤ 60 jours</span>`)}${H.kpi('Valeur du stock', fmt.money(all.reduce((s, x) => s + x.qty * x.price, 0)), 'wallet', 'tone-gold')}</div>
      <div class="card"><div class="card-body row wrap between" style="gap:10px"><div class="chips"><button class="chip ${SF.cat === 'all' ? 'on' : ''}" data-cat="all">Toutes</button>${cats.map(c => `<button class="chip ${SF.cat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        <div class="row" style="gap:8px"><div class="btn-group"><button data-al="all" class="${SF.alert === 'all' ? 'on' : ''}">Tous</button><button data-al="low" class="${SF.alert === 'low' ? 'on' : ''}">Stock faible</button><button data-al="exp" class="${SF.alert === 'exp' ? 'on' : ''}">Expiration</button></div><div class="search" style="max-width:220px">${icon('search')}<input id="sq" placeholder="Produit, lot…" value="${esc(SF.q)}" style="padding-right:12px"></div></div></div>
      <div class="table-wrap"><table class="table responsive"><thead><tr><th>Produit</th>${multi ? '<th>Site</th>' : ''}<th>Stock</th><th class="num">Seuil</th><th>Fournisseur</th><th class="num">Prix</th><th>Lot</th><th>Expiration</th><th></th></tr></thead><tbody>
      ${list.map(s => { const lowS = s.qty <= s.min; const dd = D.diffDays(t, s.exp); const sup = S.suppliers.find(x => x.id === s.sup); return `<tr><td data-l="Produit"><div style="font-weight:500">${esc(s.name)}</div><div class="xs muted">${esc(s.cat)} · ${esc(s.unit)}</div></td>${multi ? `<td data-l="Site">${esc(N.clinic(s.clinic).city)}</td>` : ''}
        <td data-l="Stock" style="min-width:150px"><div class="row"><b class="mono" style="${lowS ? 'color:var(--danger)' : ''};min-width:24px">${s.qty}</b><div class="progress grow ${lowS ? 'red' : s.qty <= s.min * 1.5 ? 'amber' : 'sage'}" style="max-width:90px"><i style="width:${Math.min(100, s.qty / (s.min * 2.5) * 100)}%"></i></div>${lowS ? '<span class="badge st-noshow">Faible</span>' : ''}</div></td>
        <td data-l="Seuil" class="num">${s.min}</td><td data-l="Fournisseur" class="small">${esc(sup.name)}</td><td data-l="Prix" class="num">${fmt.money(s.price)}</td><td data-l="Lot" class="small mono">${esc(s.lot)}</td>
        <td data-l="Expiration">${dd <= 60 ? badge(dd < 0 ? 'Expiré' : fmt.date(s.exp), dd <= 30 ? 'st-noshow' : 'st-attente') : `<span class="small">${fmt.date(s.exp)}</span>`}</td>
        <td>${N.can('stock.manage') ? `<div class="row gap-4"><button class="btn xs icon" data-dec="${s.id}" title="Sortie de stock">−</button><button class="btn xs icon" data-inc="${s.id}" title="Entrée de stock">+</button></div>` : ''}</td></tr>`; }).join('')}
      </tbody></table></div></div>`;
    },
    mount(el) {
      const S = N.S;
      el.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { SF.cat = b.dataset.cat; A.refresh(); });
      el.querySelectorAll('[data-al]').forEach(b => b.onclick = () => { SF.alert = b.dataset.al; A.refresh(); });
      el.querySelector('#sq').onchange = e => { SF.q = e.target.value; A.refresh(); };
      el.querySelectorAll('[data-inc],[data-dec]').forEach(b => b.onclick = () => { const s = S.stock.find(x => x.id === (b.dataset.inc || b.dataset.dec)); s.qty = Math.max(0, s.qty + (b.dataset.inc ? 1 : -1)); if (s.qty <= s.min && b.dataset.dec) N.notify({ kind: 'stock', title: 'Stock faible', text: s.name + ' : ' + s.qty + ' restant(s) (seuil ' + s.min + ')', link: '#/stock' }); N.log(b.dataset.inc ? 'Entrée de stock' : 'Sortie de stock', s.name + ' → ' + s.qty); N.save(); A.refresh(); });
      const ao = el.querySelector('[data-autoorder]'); if (ao) ao.onclick = () => {
        const low = S.stock.filter(s => N.inClinic(s) && s.qty <= s.min); if (!low.length) return toast('Aucun produit sous le seuil', 'info');
        const bySup = {}; low.forEach(s => (bySup[s.sup] = bySup[s.sup] || []).push(s));
        Object.entries(bySup).forEach(([sup, items]) => { const n = ++S.seq.order; S.orders.unshift({ id: N.uid('po'), number: 'CMD-' + String(n).padStart(4, '0'), supplier: sup, clinic: items[0].clinic, date: D.todayYmd(), status: 'brouillon', lines: items.map(s => ({ product: s.id, qty: Math.max(s.min * 2 - s.qty, 1), price: s.price })) }); });
        N.log('Commandes générées automatiquement', low.length + ' produits'); N.save(); location.hash = '#/fournisseurs'; toast(Object.keys(bySup).length + ' commande(s) brouillon créée(s)', 'truck');
      };
      const np = el.querySelector('[data-np]'); if (np) np.onclick = () => modal({ title: 'Nouveau produit', size: 'lg', body: `<form class="form-grid" id="fs"><div class="field full"><label>Désignation</label><input class="input" name="name"></div><div class="field"><label>Catégorie</label><select class="select" name="cat">${['Gants', 'Masques', 'Compresses', 'Anesthésiques', 'Résines', 'Matériaux dentaires', 'Instruments', 'Produits de désinfection', 'Consommables'].map(c => `<option>${c}</option>`).join('')}</select></div><div class="field"><label>Fournisseur</label><select class="select" name="sup">${S.suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div><div class="field"><label>Quantité</label><input class="input" type="number" name="qty" value="10"></div><div class="field"><label>Seuil minimum</label><input class="input" type="number" name="min" value="5"></div><div class="field"><label>Unité</label><input class="input" name="unit" value="boîte"></div><div class="field"><label>Prix unitaire (DH)</label><input class="input" type="number" name="price" value="100"></div><div class="field"><label>Lot</label><input class="input" name="lot"></div><div class="field"><label>Date d’expiration</label><input class="input" type="date" name="exp" value="${D.addYmd(D.todayYmd(), 365)}"></div></form>`, foot: `<button class="btn" data-close>Annuler</button><button class="btn primary" data-save>Ajouter</button>`,
        onMount: m => m.querySelector('[data-save]').onclick = () => { const d = formData(m.querySelector('#fs')); if (!d.name) return toast('Désignation requise', 'alert'); S.stock.unshift(Object.assign({ id: N.uid('st'), clinic: S.session.clinic === 'all' ? 'fes' : S.session.clinic }, d, { qty: +d.qty, min: +d.min, price: +d.price })); N.log('Produit ajouté', d.name); N.save(); m.close(); A.refresh(); toast('Produit ajouté au stock', 'box'); } });
    }
  });

  /* =================== FOURNISSEURS =================== */
  const OST = { brouillon: ['Brouillon', 'tone-gray'], commandee: ['Commandée', 'st-confirme'], recue: ['Reçue', 'st-termine'] };
  const FT = { tab: 'commandes' };
  const orderTotal = o => o.lines.reduce((s, l) => s + l.qty * l.price, 0);
  function orderModal(id) {
    const S = N.S; const o = S.orders.find(x => x.id === id); const sup = S.suppliers.find(s => s.id === o.supplier);
    modal({ title: 'Commande ' + o.number, size: 'lg',
      body: `<div class="row between wrap mb-16"><div><b>${esc(sup.name)}</b><div class="xs muted">${esc(sup.contact)} · ${sup.phone} · ${sup.email}</div></div><div class="pipeline">${['brouillon', 'commandee', 'recue'].map((s, i) => { const ci = ['brouillon', 'commandee', 'recue'].indexOf(o.status); return `${i ? `<div class="pipe-line ${i <= ci ? 'done' : ''}"></div>` : ''}<div class="pipe ${i < ci ? 'done' : i === ci ? 'cur' : ''}"><span class="d">${i < ci ? '✓' : i + 1}</span>${OST[s][0]}</div>`; }).join('')}</div></div>
        <table class="table"><thead><tr><th>Produit</th><th class="num">Stock actuel</th><th class="num">Quantité</th><th class="num">Prix</th><th class="num">Total</th></tr></thead><tbody>${o.lines.map((l, k) => { const p = S.stock.find(x => x.id === l.product); return `<tr><td>${esc(p ? p.name : '—')}</td><td class="num">${p ? p.qty : '—'}</td><td class="num">${o.status === 'brouillon' ? `<input type="number" class="input sm" data-oq="${k}" value="${l.qty}" style="width:80px;text-align:right">` : l.qty}</td><td class="num">${fmt.money(l.price)}</td><td class="num">${fmt.money(l.qty * l.price)}</td></tr>`; }).join('')}</tbody><tfoot><tr><td colspan="4">Total commande</td><td class="num">${fmt.money(orderTotal(o))}</td></tr></tfoot></table>
        ${o.status === 'recue' ? `<p class="small muted mt-12">Reçue le ${fmt.date(o.received)} · Facture fournisseur ${o.number.replace('CMD', 'FF')} rapprochée · stock mis à jour automatiquement.</p>` : o.status === 'commandee' ? `<p class="small muted mt-12">Commandée le ${fmt.date(o.date)}${o.expected ? ' · livraison prévue ' + fmt.rel(o.expected) : ''}. À la réception, le stock sera mis à jour automatiquement.</p>` : ''}`,
      foot: `${o.status === 'brouillon' ? `<button class="btn danger" data-del>Supprimer</button><button class="btn primary" data-order>${icon('send')}Passer la commande</button>` : o.status === 'commandee' ? `<button class="btn success" data-recv>${icon('check')}Réceptionner</button>` : `<button class="btn" data-close>Fermer</button>`}`,
      onMount: el => {
        el.querySelectorAll('[data-oq]').forEach(i => i.onchange = () => { o.lines[+i.dataset.oq].qty = +i.value; N.save(); });
        const od = el.querySelector('[data-order]'); if (od) od.onclick = () => { o.status = 'commandee'; o.date = D.todayYmd(); o.expected = D.addYmd(D.todayYmd(), sup.delay); N.log('Commande fournisseur passée', o.number + ' — ' + sup.name); N.save(); el.close(); A.refresh(); toast('Commande envoyée à ' + esc(sup.name), 'send'); };
        const rc = el.querySelector('[data-recv]'); if (rc) rc.onclick = () => { o.lines.forEach(l => { const p = S.stock.find(x => x.id === l.product); if (p) p.qty += l.qty; }); o.status = 'recue'; o.received = D.todayYmd(); N.log('Réception commande — stock mis à jour', o.number); N.save(); el.close(); A.refresh(); toast('Commande reçue · stock mis à jour (' + o.lines.length + ' produits)', 'box'); };
        const dl = el.querySelector('[data-del]'); if (dl) dl.onclick = () => { S.orders = S.orders.filter(x => x !== o); N.save(); el.close(); A.refresh(); };
      } });
  }
  function newOrder() {
    const S = N.S; const cl = S.session.clinic === 'all' ? 'fes' : S.session.clinic;
    modal({ title: 'Nouvelle commande fournisseur', size: 'lg', body: `<div class="field"><label>Fournisseur</label><select class="select" id="osup">${S.suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div><div id="olines" class="mt-16"></div>`, foot: `<button class="btn" data-close>Annuler</button><button class="btn primary" data-save>Créer le brouillon</button>`,
      onMount: el => { const draw = () => { const prods = S.stock.filter(p => p.sup === el.querySelector('#osup').value && p.clinic === cl); el.querySelector('#olines').innerHTML = `<table class="table"><thead><tr><th>Produit</th><th class="num">Stock</th><th class="num">Seuil</th><th class="num">Qté à commander</th></tr></thead><tbody>${prods.map(p => `<tr><td>${esc(p.name)}</td><td class="num" style="${p.qty <= p.min ? 'color:var(--danger);font-weight:600' : ''}">${p.qty}</td><td class="num">${p.min}</td><td class="num"><input type="number" class="input sm" min="0" data-pid="${p.id}" value="${p.qty <= p.min ? p.min * 2 - p.qty : 0}" style="width:80px;text-align:right"></td></tr>`).join('')}</tbody></table>`; }; draw(); el.querySelector('#osup').onchange = draw;
        el.querySelector('[data-save]').onclick = () => { const lines = [...el.querySelectorAll('[data-pid]')].filter(i => +i.value > 0).map(i => { const p = S.stock.find(x => x.id === i.dataset.pid); return { product: p.id, qty: +i.value, price: p.price }; }); if (!lines.length) return toast('Ajoutez au moins une quantité', 'alert'); const n = ++S.seq.order; const o = { id: N.uid('po'), number: 'CMD-' + String(n).padStart(4, '0'), supplier: el.querySelector('#osup').value, clinic: cl, date: D.todayYmd(), status: 'brouillon', lines }; S.orders.unshift(o); N.save(); el.close(); A.refresh(); orderModal(o.id); }; } });
  }
  A.view('fournisseurs', {
    render() {
      const S = N.S; const orders = S.orders.filter(o => N.inClinic(o)).sort((a, b) => b.date.localeCompare(a.date));
      return `${H.head('Fournisseurs', 'Commandes : Brouillon → Commandée → Reçue · mise à jour automatique du stock', N.can('stock.manage') ? `<button class="btn primary" data-no>${icon('plus')}Nouvelle commande</button>` : '')}
      <div class="grid g4 mb-16">${H.kpi('Brouillons', orders.filter(o => o.status === 'brouillon').length, 'edit', 'tone-gray')}${H.kpi('En cours de livraison', orders.filter(o => o.status === 'commandee').length, 'truck', 'tone-blue')}${H.kpi('Achats (90 j)', fmt.money(orders.filter(o => o.status === 'recue' && o.received >= D.addYmd(D.todayYmd(), -90)).reduce((s, o) => s + orderTotal(o), 0)), 'wallet', 'tone-gold')}${H.kpi('Fournisseurs actifs', S.suppliers.length, 'building', 'tone-sage')}</div>
      <div class="tabs mb-16"><button class="${FT.tab === 'commandes' ? 'on' : ''}" data-ft="commandes">Commandes</button><button class="${FT.tab === 'fournisseurs' ? 'on' : ''}" data-ft="fournisseurs">Fournisseurs & contacts</button></div>
      ${FT.tab === 'commandes' ? `<div class="card"><div class="table-wrap"><table class="table responsive"><thead><tr><th>N°</th><th>Fournisseur</th><th>Date</th><th class="num">Lignes</th><th class="num">Montant</th><th>Statut</th></tr></thead><tbody>${orders.map(o => `<tr class="click" data-o="${o.id}"><td data-l="N°"><b style="font-weight:500">${o.number}</b></td><td data-l="Fournisseur">${esc(S.suppliers.find(s => s.id === o.supplier).name)}</td><td data-l="Date">${fmt.date(o.date)}</td><td data-l="Lignes" class="num">${o.lines.length}</td><td data-l="Montant" class="num">${fmt.money(orderTotal(o))}</td><td data-l="Statut">${badge(...OST[o.status])}${o.status === 'commandee' && o.expected ? ` <span class="xs muted">livraison ${fmt.rel(o.expected)}</span>` : ''}</td></tr>`).join('')}</tbody></table></div></div>`
        : `<div class="grid g2">${S.suppliers.map(s => { const os = S.orders.filter(o => o.supplier === s.id); return `<div class="card"><div class="card-body"><div class="row between"><div class="row"><span class="avatar" style="background:var(--primary-50);color:var(--primary)">${icon('truck').replace('<svg', '<svg style="width:16px"')}</span><div><b>${esc(s.name)}</b><div class="xs muted">${esc(s.city)} · livraison ${s.delay} j · ★ ${String(s.rating).replace('.', ',')}</div></div></div></div><div class="chips mt-12">${s.cats.map(c => `<span class="tag">${esc(c)}</span>`).join('')}</div><div class="divider"></div><dl class="kv" style="grid-template-columns:120px 1fr"><dt>Contact</dt><dd>${esc(s.contact)}</dd><dt>Téléphone</dt><dd>${s.phone}</dd><dt>Email</dt><dd>${s.email}</dd><dt>Produits</dt><dd>${S.stock.filter(p => p.sup === s.id && N.inClinic(p)).length} références</dd><dt>Historique</dt><dd>${os.length} commandes · ${fmt.money(os.filter(o => o.status === 'recue').reduce((a, o) => a + orderTotal(o), 0))}</dd></dl></div></div>`; }).join('')}</div>`}`;
    },
    mount(el) {
      el.querySelectorAll('[data-ft]').forEach(b => b.onclick = () => { FT.tab = b.dataset.ft; A.refresh(); });
      el.querySelectorAll('[data-o]').forEach(r => r.onclick = () => orderModal(r.dataset.o));
      const n = el.querySelector('[data-no]'); if (n) n.onclick = newOrder;
    }
  });
})();
