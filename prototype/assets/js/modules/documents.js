/* Documents, ordonnances, radiographies & imagerie, avant / après */
(function () {
  const N = Nacre, D = N.D, A = N.App, H = A.H;
  const { icon, fmt, esc, avatar, badge, toast, modal, formData } = N.ui;

  /* =================== ORDONNANCES =================== */
  const DRUGS = [
    ['Paracétamol 1 g', '1 comprimé toutes les 6 heures si douleur (max. 4/jour)', '3 jours'],
    ['Ibuprofène 400 mg', '1 comprimé 3 fois par jour au cours des repas', '3 jours'],
    ['Amoxicilline 1 g', '1 comprimé matin et soir', '6 jours'],
    ['Clindamycine 300 mg', '2 gélules matin et soir', '7 jours'],
    ['Chlorhexidine 0,12 % bain de bouche', '2 bains de bouche par jour après brossage', '7 jours'],
    ['Gel gingival apaisant', '3 applications par jour', '5 jours']
  ];
  const PENI = /amoxi|p[ée]nicill|augmentin|ampicill/i;
  function rxCard(r) {
    return `<div class="card"><div class="card-head"><div><h3>Ordonnance du ${fmt.date(r.date)}</h3><div class="sub">${esc(N.name(N.staff(r.dentist)))} · ${r.items.length} médicament(s)</div></div><div class="row gap-6"><button class="btn sm" data-rxv="${r.id}">${icon('eye')}Voir</button><button class="btn sm" data-rxp="${r.id}">${icon('printer')}PDF</button></div></div><div class="card-body"><div class="list">${r.items.map(i => `<div class="li"><span class="avatar sm" style="background:var(--violet-50);color:var(--violet)">${icon('pill').replace('<svg', '<svg style="width:14px;height:14px"')}</span><div class="grow"><div class="t">${esc(i.drug)}</div><div class="s">${esc(i.pos)} · ${esc(i.dur)}</div></div></div>`).join('')}</div>${r.notes ? `<p class="xs muted mt-8">${esc(r.notes)}</p>` : ''}</div></div>`;
  }
  function newRx(pid, after) {
    const S = N.S; const p = N.patient(pid); let items = [];
    const m = modal({
      title: 'Nouvelle ordonnance — ' + esc(N.pname(p)), size: 'lg',
      body: `${p.allergies.length ? `<div class="med-alert mb-16">${icon('alert')}<div><b>Allergies déclarées : ${esc(p.allergies.join(', '))}</b>${p.meds.length ? '<br>Traitement en cours : ' + esc(p.meds.join(', ')) : ''}</div></div>` : ''}
        <div class="xs muted mb-8">Ajout rapide (modèles du cabinet)</div><div class="chips mb-16">${DRUGS.map((d, i) => `<button class="chip" data-dq="${i}">${icon('plus').replace('<svg', '<svg style="width:12px;height:12px"')}${d[0]}</button>`).join('')}</div>
        <div id="rxlines" class="col gap-6"></div><button class="btn sm mt-8" data-addline>${icon('plus')}Ligne libre</button>
        <div id="rxwarn" class="mt-12"></div>
        <div class="field mt-16"><label>Notes</label><input class="input" id="rxnotes" placeholder="Ex. : à prendre après le repas"></div>
        <p class="xs faint mt-12">L’alerte allergie est une aide basée sur les déclarations du patient ; la prescription reste sous la responsabilité du praticien.</p>`,
      foot: `<button class="btn" data-close>Annuler</button><button class="btn primary" data-save>${icon('check')}Enregistrer & générer le PDF</button>`,
      onMount: el => {
        const draw = () => {
          el.querySelector('#rxlines').innerHTML = items.map((i, k) => `<div class="row" style="gap:6px;padding:8px;border:1px solid var(--line);border-radius:10px" data-l="${k}"><input class="input sm" data-k="drug" value="${esc(i.drug)}" placeholder="Médicament" style="flex:1.2"><input class="input sm" data-k="pos" value="${esc(i.pos)}" placeholder="Posologie" style="flex:2"><input class="input sm" data-k="dur" value="${esc(i.dur)}" placeholder="Durée" style="width:90px"><button class="btn xs ghost" data-del>${icon('trash')}</button></div>`).join('') || '<div class="small muted">Aucun médicament ajouté.</div>';
          el.querySelectorAll('[data-l]').forEach(row => { const it = items[+row.dataset.l]; row.querySelectorAll('[data-k]').forEach(i => i.oninput = () => { it[i.dataset.k] = i.value; warn(); }); row.querySelector('[data-del]').onclick = () => { items.splice(+row.dataset.l, 1); draw(); }; });
          warn();
        };
        const warn = () => {
          const pa = p.allergies.some(a => /p[ée]nicill/i.test(a)); const hit = items.find(i => pa && PENI.test(i.drug));
          const nsaid = p.allergies.some(a => /aspirine|ains/i.test(a)) && items.find(i => /ibupro|aspirine|kétopro/i.test(i.drug));
          el.querySelector('#rxwarn').innerHTML = hit || nsaid ? `<div class="med-alert">${icon('alert')}<div><b>Attention — interaction avec une allergie déclarée</b><br>« ${esc((hit || nsaid).drug)} » : le patient a déclaré une allergie (${esc(p.allergies.join(', '))}). Vérifiez la prescription.</div></div>` : '';
        };
        el.querySelectorAll('[data-dq]').forEach(b => b.onclick = () => { const d = DRUGS[+b.dataset.dq]; items.push({ drug: d[0], pos: d[1], dur: d[2] }); draw(); });
        el.querySelector('[data-addline]').onclick = () => { items.push({ drug: '', pos: '', dur: '' }); draw(); };
        draw();
        el.querySelector('[data-save]').onclick = () => {
          items = items.filter(i => i.drug.trim()); if (!items.length) return toast('Ajoutez au moins un médicament', 'alert');
          const me = N.me(); const r = { id: N.uid('rx'), patient: pid, dentist: me.role === 'dentiste' ? me.id : p.dentist, date: D.todayYmd(), items, notes: el.querySelector('#rxnotes').value };
          S.rx.unshift(r); N.log('Ordonnance générée', N.pname(p)); N.save(); el.close(); N.Paper.print(N.Paper.prescription(r)); A.refresh(); toast('Ordonnance enregistrée', 'pill'); after && after(r);
        };
      }
    });
  }
  N.Docs = {
    newRx,
    rxFor(pid) { const list = N.S.rx.filter(r => r.patient === pid); return `<div class="row between mb-16"><div class="muted small">${list.length} ordonnance(s)</div>${N.can('clinical.edit') ? `<button class="btn primary sm" data-newrx>${icon('plus')}Nouvelle ordonnance</button>` : ''}</div><div class="grid g2">${list.map(rxCard).join('') || `<div class="card" style="grid-column:1/-1">${H.empty('Aucune ordonnance', 'pill')}</div>`}</div>`; },
    mountRx(T, pid) { const b = T.querySelector('[data-newrx]'); if (b) b.onclick = () => newRx(pid); bindRx(T); }
  };
  function bindRx(T) {
    T.querySelectorAll('[data-rxp]').forEach(b => b.onclick = () => N.Paper.print(N.Paper.prescription(N.S.rx.find(r => r.id === b.dataset.rxp))));
    T.querySelectorAll('[data-rxv]').forEach(b => b.onclick = () => { const r = N.S.rx.find(x => x.id === b.dataset.rxv); modal({ title: 'Ordonnance', size: 'lg', body: N.Paper.prescription(r), foot: `<button class="btn primary" data-p>${icon('printer')}Imprimer / PDF</button>`, onMount: el => el.querySelector('[data-p]').onclick = () => N.Paper.print(N.Paper.prescription(r)) }); });
  }

  /* =================== DOCUMENTS =================== */
  const TYPES = { ordonnance: ['Ordonnance', 'pill'], certificat: ['Certificat', 'badge'], compte_rendu: ['Compte rendu', 'file'], devis: ['Devis', 'file'], facture: ['Facture', 'receipt'], plan: ['Plan de traitement', 'clipboard'] };
  const TPL = {
    certificat: p => `Je soussigné(e), ${N.name(N.staff(p.dentist))}, chirurgien-dentiste, certifie avoir examiné ce jour ${p.sex === 'F' ? 'Mme' : 'M.'} ${p.first} ${p.last}, né${p.sex === 'F' ? 'e' : ''} le ${fmt.date(p.dob)}.\n\nSon état de santé bucco-dentaire nécessite un arrêt de ses activités professionnelles / scolaires pendant 2 jours, à compter du ${fmt.date(D.todayYmd())}.\n\nCertificat établi à la demande de l’intéressé(e) et remis en main propre pour servir et valoir ce que de droit.`,
    compte_rendu: p => { const c = N.S.consults.find(x => x.patient === p.id); return `Compte rendu de consultation — ${fmt.dateLong(c ? c.date : D.todayYmd())}\n\nMotif : ${c ? c.motif : '…'}\n\nObservations : ${c ? c.observations : '…'}\n\nDiagnostic (établi par le praticien) : ${c ? c.diagnosis : '…'}\n\nTraitement réalisé : ${c ? c.done : '…'}\n\nSuite proposée : ${c ? c.proposed : '…'}\n\nConfraternellement.`; }
  };
  const DF = { type: 'certificat', patient: 'p1' };
  A.view('documents', {
    render(params) {
      const S = N.S;
      if (params[0] === 'new') { if (params[1]) DF.type = params[1]; if (params[2]) DF.patient = params[2]; }
      const p = N.patient(DF.patient);
      const recent = [
        ...S.gendocs.map(d => ({ date: d.date, type: d.type, title: d.title, patient: d.patient, ref: d })),
        ...S.rx.map(r => ({ date: r.date, type: 'ordonnance', title: 'Ordonnance — ' + r.items.map(i => i.drug.split(' ')[0]).join(', '), patient: r.patient, rx: r.id })),
        ...S.quotes.map(q => ({ date: q.date, type: 'devis', title: q.number, patient: q.patient, href: '#/devis/' + q.id })),
        ...S.invoices.filter(i => !i.appt).map(i => ({ date: i.date, type: 'facture', title: i.number, patient: i.patient, href: '#/facturation/' + i.id }))
      ].filter(d => N.inClinic(N.patient(d.patient))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 25);
      let form = '';
      if (DF.type === 'certificat' || DF.type === 'compte_rendu') form = `<div class="field"><label>Titre</label><input class="input" id="dtitle" value="${DF.type === 'certificat' ? 'Certificat médical' : 'Compte rendu de consultation'}"></div><div class="field"><label>Contenu</label><textarea class="textarea" id="dbody" style="min-height:260px">${esc(TPL[DF.type](p))}</textarea></div>${N.can('clinical.edit') ? `<button class="btn gold sm" data-aidoc>${icon('sparkles')}Rédiger avec l’assistant</button>` : ''}`;
      else if (DF.type === 'ordonnance') form = `<p class="small muted">Les ordonnances sont générées depuis le dossier patient avec contrôle des allergies déclarées.</p><button class="btn primary mt-12" data-rxnew>${icon('plus')}Rédiger une ordonnance</button>`;
      else if (DF.type === 'devis') form = `<div class="list">${S.quotes.filter(q => q.patient === p.id).map(q => `<a class="li click" href="#/devis/${q.id}" style="color:inherit"><div class="grow"><div class="t">${q.number}</div><div class="s">${fmt.date(q.date)} · ${fmt.money(N.Paper.quoteTotals(q).total)}</div></div>${icon('chevronRight', 'faint').replace('<svg', '<svg style="width:16px"')}</a>`).join('') || '<div class="small muted">Aucun devis pour ce patient.</div>'}</div><a class="btn mt-12" href="#/devis">${icon('plus')}Créer un devis</a>`;
      else if (DF.type === 'facture') form = `<div class="list">${S.invoices.filter(i => i.patient === p.id).slice(-6).reverse().map(i => `<a class="li click" href="#/facturation/${i.id}" style="color:inherit"><div class="grow"><div class="t">${i.number}</div><div class="s">${fmt.date(i.date)} · ${fmt.money(N.invoiceTotal(i))}</div></div>${icon('chevronRight', 'faint').replace('<svg', '<svg style="width:16px"')}</a>`).join('') || '<div class="small muted">Aucune facture.</div>'}</div>`;
      else if (DF.type === 'plan') form = `<div class="list">${S.plans.filter(x => x.patient === p.id).map(x => `<div class="li"><div class="grow"><div class="t">${esc(x.title)}</div><div class="s">${fmt.money(N.Plans.totals(x).total)}</div></div><button class="btn sm" data-pplan="${x.id}">${icon('printer')}PDF</button></div>`).join('') || '<div class="small muted">Aucun plan.</div>'}</div>`;
      const preview = (DF.type === 'certificat' || DF.type === 'compte_rendu') ? N.Paper.generic(DF.type, { patient: p.id, dentist: p.dentist, date: D.todayYmd(), title: DF.type === 'certificat' ? 'Certificat médical' : 'Compte rendu', body: TPL[DF.type](p) }) : '';
      return `${H.head('Documents', 'Génération automatique en PDF avec l’en-tête du cabinet')}
      <div class="grid" style="grid-template-columns:minmax(0,400px) minmax(0,1fr);align-items:start" id="dgrid">
        <div class="col gap-16">
          <div class="card"><div class="card-head"><h3>Générer un document</h3></div><div class="card-body col" style="gap:14px">
            <div class="cond-grid">${Object.entries(TYPES).map(([k, [l, ic]]) => `<button class="cond-btn ${DF.type === k ? 'on' : ''}" data-dt="${k}">${icon(ic).replace('<svg', '<svg style="width:15px;height:15px"')}${l}</button>`).join('')}</div>
            <div class="field"><label>Patient</label><select class="select" id="dpat">${H.patientOptions(DF.patient)}</select></div>
            ${form}
            ${preview ? `<div class="row"><button class="btn primary grow" data-gen>${icon('download')}Générer le PDF</button><button class="btn" data-share title="Partager sur le portail patient">${icon('globe')}Portail</button></div>` : ''}
          </div></div>
          <div class="card"><div class="card-head"><h3>Documents récents</h3></div><div class="card-body"><div class="list">${recent.map(d => `<div class="li ${d.href ? 'click' : ''}" ${d.href ? `data-href="${d.href}"` : ''} ${d.rx ? `data-rxv="${d.rx}" style="cursor:pointer"` : ''}><span class="avatar sm" style="background:var(--bg-2);color:var(--muted)">${icon(TYPES[d.type][1]).replace('<svg', '<svg style="width:14px;height:14px"')}</span><div class="grow" style="min-width:0"><div class="t truncate">${esc(d.title)}</div><div class="s">${TYPES[d.type][0]} · ${esc(N.pname(d.patient))} · ${fmt.date(d.date)}</div></div></div>`).join('')}</div></div></div>
        </div>
        <div id="dprev" style="min-width:0">${preview || `<div class="card">${H.empty('Sélectionnez un document à générer', 'file')}</div>`}</div>
      </div><style>@media (max-width:1100px){#dgrid{grid-template-columns:1fr!important}}</style>`;
    },
    mount(el) {
      const S = N.S;
      el.querySelectorAll('[data-dt]').forEach(b => b.onclick = () => { DF.type = b.dataset.dt; location.hash = '#/documents'; A.refresh(); });
      el.querySelector('#dpat').onchange = e => { DF.patient = e.target.value; A.refresh(); };
      const body = el.querySelector('#dbody'), title = el.querySelector('#dtitle');
      const doc = () => N.Paper.generic(DF.type, { patient: DF.patient, dentist: N.patient(DF.patient).dentist, date: D.todayYmd(), title: title.value, body: body.value });
      if (body) { const up = () => el.querySelector('#dprev').innerHTML = doc(); body.oninput = up; title.oninput = up; }
      const g = el.querySelector('[data-gen]'); if (g) g.onclick = () => { S.gendocs.unshift({ id: N.uid('gd'), type: DF.type, patient: DF.patient, date: D.todayYmd(), title: title.value, dentist: N.patient(DF.patient).dentist, body: body.value }); N.log('Document généré', title.value + ' — ' + N.pname(DF.patient)); N.save(); N.Paper.print(doc()); A.refresh(); };
      const sh = el.querySelector('[data-share]'); if (sh) sh.onclick = () => { S.docs.unshift({ id: N.uid('doc'), patient: DF.patient, kind: 'pdf', title: title.value, date: D.todayYmd(), cat: 'pdf', seed: 1, shared: true }); H.sendMsg(DF.patient, H.fill(S.templates[5].text, N.patient(DF.patient)), 'email', true); N.save(); toast('Document partagé sur le portail patient · patient notifié', 'globe'); };
      const rx = el.querySelector('[data-rxnew]'); if (rx) rx.onclick = () => newRx(DF.patient);
      const ai = el.querySelector('[data-aidoc]'); if (ai) ai.onclick = () => N.Assistant.open('report', DF.patient);
      el.querySelectorAll('[data-pplan]').forEach(b => b.onclick = () => N.Paper.print(N.Paper.plan(S.plans.find(x => x.id === b.dataset.pplan))));
      bindRx(el);
    }
  });

  /* =================== IMAGERIE =================== */
  const CAT = { radio: ['Radiographies', 'scan'], photo: ['Photos intra-orales', 'image'], scanner: ['Scanner / 3D', 'layers'], pdf: ['Documents PDF', 'file'], labo: ['Laboratoire', 'flask'] };
  const IF = { cat: 'all', patient: 'all', group: 'date' };
  function mediaCard(d, withPatient) {
    return `<div class="media" data-doc="${d.id}"><div class="thumb">${N.ui.media(d)}${d.fromPortal ? '<span class="lock">Envoyé par le patient</span>' : d.shared ? `<span class="lock">${icon('globe').replace('<svg', '<svg style="width:11px;height:11px"')}Portail</span>` : ''}</div><div class="meta"><b class="truncate">${esc(d.title)}</b><div class="xs muted truncate">${withPatient ? esc(N.pname(d.patient)) + ' · ' : ''}${fmt.date(d.date)} · ${CAT[d.cat] ? CAT[d.cat][0] : 'Document'}</div></div></div>`;
  }
  function grid(list, withPatient) {
    if (!list.length) return `<div class="card">${H.empty('Aucun document dans cette sélection', 'image')}</div>`;
    const groups = {};
    list.forEach(d => { const k = IF.group === 'type' ? (CAT[d.cat] ? CAT[d.cat][0] : 'Autres') : IF.group === 'consult' ? (d.consult || 'Hors consultation') : fmt.month(d.date); (groups[k] = groups[k] || []).push(d); });
    return Object.entries(groups).map(([k, arr]) => `<div class="mb-16"><div class="row between mb-12"><h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">${esc(k)}</h3><span class="xs muted">${arr.length}</span></div><div class="media-grid">${arr.map(d => mediaCard(d, withPatient)).join('')}</div></div>`).join('');
  }
  function uploadZone() { return N.can('clinical.edit') || N.can('clinical.view') ? `<label class="upload" id="upz">${icon('upload').replace('<svg', '<svg style="width:26px;height:26px;margin:0 auto 6px"')}<b>Déposer des radiographies, photos ou PDF</b><div class="xs">ou cliquez pour parcourir · JPG, PNG, PDF · stockage chiffré</div><input type="file" multiple accept="image/*,application/pdf" hidden></label>` : ''; }
  function bindUpload(root, pidGetter) {
    const z = root.querySelector('#upz'); if (!z) return;
    const inp = z.querySelector('input');
    const handle = files => {
      const pid = pidGetter(); if (!pid) return toast('Choisissez d’abord un patient', 'alert');
      [...files].forEach(f => {
        const isImg = f.type.startsWith('image/');
        const add = src => { N.S.docs.unshift({ id: N.uid('doc'), patient: pid, kind: isImg ? 'upload' : 'pdf', src: isImg ? src : '', title: f.name.replace(/\.[^.]+$/, ''), date: D.todayYmd(), cat: isImg ? (/(radio|pano|rx)/i.test(f.name) ? 'radio' : 'photo') : 'pdf', seed: 1 }); N.log('Document importé', f.name + ' — ' + N.pname(pid)); try { N.save(); } catch (e) { } A.refresh(); toast('« ' + esc(f.name) + ' » ajouté au dossier', 'upload'); };
        if (isImg && f.size < 1.5e6) { const r = new FileReader(); r.onload = () => add(r.result); r.readAsDataURL(f); } else add(isImg ? URL.createObjectURL(f) : '');
      });
    };
    inp.onchange = () => handle(inp.files);
    z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('drag'); });
    z.addEventListener('dragleave', () => z.classList.remove('drag'));
    z.addEventListener('drop', e => { e.preventDefault(); z.classList.remove('drag'); handle(e.dataTransfer.files); });
  }
  function viewer(id) {
    const S = N.S; const d = S.docs.find(x => x.id === id); if (!d) return;
    const sameP = S.docs.filter(x => x.patient === d.patient);
    let z = 1, rot = 0, br = 100, ct = 100, inv = false, tx = 0, ty = 0;
    if (!d.reviewed && d.fromPortal) { d.reviewed = true; N.save(); }
    N.log('Consultation imagerie', d.title + ' — ' + N.pname(d.patient));
    modal({
      title: esc(d.title), size: 'xl',
      body: `<div class="row between wrap mb-12"><div class="row">${H.pcell(d.patient, fmt.dateLong(d.date) + (d.consult ? ' · ' + esc(d.consult) : ''))}</div><div class="row gap-6">${badge(CAT[d.cat] ? CAT[d.cat][0] : 'Document', 'tone-blue', false)}${badge('Chiffré', 'tone-green', false)}</div></div>
        <div class="viewer" id="vw"><div class="stage" id="stg">${N.ui.media(d)}</div></div>
        <div class="viewer-tools"><button class="btn sm icon" data-z="1.25" title="Zoom +">${icon('zoomIn')}</button><button class="btn sm icon" data-z="0.8" title="Zoom −">${icon('zoomOut')}</button><button class="btn sm icon" data-rot title="Rotation">${icon('refresh')}</button><button class="btn sm" data-inv>${icon('contrast')}Inverser</button><button class="btn sm" data-reset>Réinitialiser</button>
          <label class="row small muted gap-6">Luminosité <input type="range" min="40" max="180" value="100" id="vbr"></label><label class="row small muted gap-6">Contraste <input type="range" min="40" max="220" value="100" id="vct"></label></div>
        <div class="row gap-6 mt-16" style="overflow-x:auto;padding-bottom:4px">${sameP.map(x => `<div class="media" data-sw="${x.id}" style="width:120px;flex:none;${x.id === d.id ? 'outline:2px solid var(--primary)' : ''}"><div class="thumb" style="aspect-ratio:4/3">${N.ui.media(x)}</div></div>`).join('')}</div>`,
      foot: `<button class="btn" data-share>${icon('globe')}${d.shared ? 'Retirer du portail' : 'Partager au patient'}</button><button class="btn primary" data-close>Fermer</button>`,
      onMount: el => {
        const stg = el.querySelector('#stg'); const vw = el.querySelector('#vw');
        const apply = () => { stg.style.transform = `translate(${tx}px,${ty}px) scale(${z}) rotate(${rot}deg)`; stg.style.filter = `brightness(${br}%) contrast(${ct}%) ${inv ? 'invert(1)' : ''}`; };
        el.querySelectorAll('[data-z]').forEach(b => b.onclick = () => { z = Math.min(5, Math.max(.5, z * +b.dataset.z)); apply(); });
        el.querySelector('[data-rot]').onclick = () => { rot += 90; apply(); };
        el.querySelector('[data-inv]').onclick = () => { inv = !inv; apply(); };
        el.querySelector('[data-reset]').onclick = () => { z = 1; rot = 0; br = ct = 100; inv = false; tx = ty = 0; el.querySelector('#vbr').value = 100; el.querySelector('#vct').value = 100; apply(); };
        el.querySelector('#vbr').oninput = e => { br = e.target.value; apply(); };
        el.querySelector('#vct').oninput = e => { ct = e.target.value; apply(); };
        vw.addEventListener('wheel', e => { e.preventDefault(); z = Math.min(5, Math.max(.5, z * (e.deltaY < 0 ? 1.1 : .9))); apply(); }, { passive: false });
        let drag = null; vw.addEventListener('pointerdown', e => { drag = [e.clientX - tx, e.clientY - ty]; vw.setPointerCapture(e.pointerId); }); vw.addEventListener('pointermove', e => { if (!drag) return; tx = e.clientX - drag[0]; ty = e.clientY - drag[1]; stg.style.transition = 'none'; apply(); }); vw.addEventListener('pointerup', () => { drag = null; stg.style.transition = ''; });
        el.querySelectorAll('[data-sw]').forEach(x => x.onclick = () => { el.close(); viewer(x.dataset.sw); });
        el.querySelector('[data-share]').onclick = () => { d.shared = !d.shared; N.log(d.shared ? 'Document partagé au patient' : 'Partage retiré', d.title); N.save(); el.close(); A.refresh(); toast(d.shared ? 'Visible dans l’espace patient' : 'Partage retiré', 'globe'); };
      }
    });
  }

  /* ---------- Avant / Après ---------- */
  const VIS = { praticiens: 'Praticiens uniquement', equipe: 'Équipe clinique', patient: 'Partagé avec le patient' };
  function baCard(b, withPatient) {
    return `<div class="card"><div class="card-body"><div class="row between mb-12"><div><b>${esc(b.title)}</b><div class="xs muted">${withPatient ? esc(N.pname(b.patient)) + ' · ' : ''}${esc(b.cat)} · ${fmt.date(b.before)}${b.after ? ' → ' + fmt.date(b.after) : ' → projet'}</div></div><span class="badge tone-gold">${icon('lock').replace('<svg', '<svg style="width:11px;height:11px"')}${VIS[b.visibility]}</span></div>
      <div class="ba" data-ba><div class="ba-img">${N.ui.smile(b.shade[0], +b.id.replace(/\D/g, '') || 3, b.crowd)}</div><div class="ba-img ba-after">${N.ui.smile(b.shade[1], +b.id.replace(/\D/g, '') || 3, false)}</div><div class="ba-handle"></div><span class="ba-lab" style="left:12px">Avant</span><span class="ba-lab" style="right:12px">${b.after ? 'Après' : 'Simulation'}</span></div>
      <div class="row between mt-12 wrap" style="gap:8px"><span class="xs ${b.consent ? 'muted' : ''}" style="${b.consent ? '' : 'color:var(--danger)'}">${b.consent ? '✓ Consentement photo recueilli' : '⚠ Consentement photo manquant — usage interne uniquement'}</span><select class="select sm" data-vis="${b.id}" style="width:210px" ${N.can('images.private') ? '' : 'disabled'}>${Object.entries(VIS).map(([k, v]) => `<option value="${k}" ${b.visibility === k ? 'selected' : ''} ${k === 'patient' && !b.consent ? 'disabled' : ''}>${v}</option>`).join('')}</select></div></div></div>`;
  }
  function bindBA(root) {
    root.querySelectorAll('[data-ba]').forEach(ba => {
      const after = ba.querySelector('.ba-after'), h = ba.querySelector('.ba-handle');
      const set = x => { const r = ba.getBoundingClientRect(); const p = Math.min(100, Math.max(0, (x - r.left) / r.width * 100)); after.style.clipPath = `inset(0 0 0 ${p}%)`; h.style.left = p + '%'; };
      let on = false; ba.addEventListener('pointerdown', e => { on = true; ba.setPointerCapture(e.pointerId); set(e.clientX); }); ba.addEventListener('pointermove', e => on && set(e.clientX)); ba.addEventListener('pointerup', () => on = false);
    });
    root.querySelectorAll('[data-vis]').forEach(s => s.onchange = () => { const b = N.S.ba.find(x => x.id === s.dataset.vis); b.visibility = s.value; N.log('Visibilité avant/après modifiée', b.title + ' → ' + VIS[s.value]); N.save(); toast('Visibilité : ' + VIS[s.value], 'lock'); });
  }
  N.Imaging = {
    viewer,
    gridFor(pid) { const list = N.S.docs.filter(d => d.patient === pid).sort((a, b) => b.date.localeCompare(a.date)); return `<div class="row between wrap mb-16" style="gap:10px"><div class="btn-group">${[['date', 'Par date'], ['type', 'Par type'], ['consult', 'Par consultation']].map(([k, l]) => `<button data-grp="${k}" class="${IF.group === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>${uploadZone()}<div class="mt-16">${grid(list, false)}</div>`; },
    mountGrid(T, pid) { T.querySelectorAll('[data-doc]').forEach(m => m.onclick = () => viewer(m.dataset.doc)); T.querySelectorAll('[data-grp]').forEach(b => b.onclick = () => { IF.group = b.dataset.grp; A.refresh(); }); bindUpload(T, () => pid); },
    baFor(pid) { const list = N.S.ba.filter(b => !pid || b.patient === pid); return `<div class="card mb-16" style="background:var(--gold-50);border-color:#EADFC8"><div class="card-body row small">${icon('shield').replace('<svg', '<svg style="width:18px;height:18px;color:var(--gold);flex:none"')}<span>Les photos avant/après sont <b>privées par défaut</b>, accessibles uniquement selon les permissions définies, et ne peuvent être partagées au patient qu’avec son consentement.</span></div></div><div class="grid g2">${list.map(b => baCard(b, !pid)).join('') || `<div class="card" style="grid-column:1/-1">${H.empty('Aucune comparaison avant / après', 'split')}</div>`}</div>`; },
    mountBA: bindBA
  };

  A.view('radiographies', {
    render(params) {
      const S = N.S; const tab = params[0] === 'avant-apres' ? 'ba' : 'lib';
      let list = S.docs.filter(d => N.inClinic(N.patient(d.patient)));
      if (IF.cat !== 'all') list = list.filter(d => d.cat === IF.cat);
      if (IF.patient !== 'all') list = list.filter(d => d.patient === IF.patient);
      list.sort((a, b) => b.date.localeCompare(a.date));
      return `${H.head('Radiographies & imagerie', 'Bibliothèque documentaire patient · visualiseur intégré')}
      <div class="tabs mb-16"><a href="#/radiographies" class="${tab === 'lib' ? 'on' : ''}">${icon('scan').replace('<svg', '<svg style="width:15px;height:15px"')}Bibliothèque</a><a href="#/radiographies/avant-apres" class="${tab === 'ba' ? 'on' : ''}">${icon('split').replace('<svg', '<svg style="width:15px;height:15px"')}Avant / Après${N.can('images.private') ? '' : ' 🔒'}</a></div>
      ${tab === 'ba' ? (N.can('images.private') ? N.Imaging.baFor(null) : `<div class="card card-pad center muted">${icon('lock').replace('<svg', '<svg style="width:28px;height:28px;margin:0 auto 8px"')}Photos avant/après réservées aux praticiens autorisés.</div>`) : `
      <div class="card mb-16"><div class="card-body row wrap between" style="gap:10px"><div class="chips"><button class="chip ${IF.cat === 'all' ? 'on' : ''}" data-cat="all">Tous</button>${Object.entries(CAT).map(([k, [l]]) => `<button class="chip ${IF.cat === k ? 'on' : ''}" data-cat="${k}">${l}</button>`).join('')}</div>
        <div class="row" style="gap:8px"><select class="select sm" id="ipat" style="width:220px"><option value="all">Tous les patients</option>${H.patientOptions(IF.patient)}</select><div class="btn-group">${[['date', 'Date'], ['type', 'Type'], ['consult', 'Consultation']].map(([k, l]) => `<button data-grp="${k}" class="${IF.group === k ? 'on' : ''}">${l}</button>`).join('')}</div></div></div></div>
      ${uploadZone()}<div class="mt-16">${grid(list, true)}</div>`}`;
    },
    mount(el, params) {
      if (params[0] && params[0] !== 'avant-apres') setTimeout(() => viewer(params[0]), 50);
      el.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { IF.cat = b.dataset.cat; A.refresh(); });
      const ip = el.querySelector('#ipat'); if (ip) ip.onchange = e => { IF.patient = e.target.value; A.refresh(); };
      el.querySelectorAll('[data-grp]').forEach(b => b.onclick = () => { IF.group = b.dataset.grp; A.refresh(); });
      el.querySelectorAll('[data-doc]').forEach(m => m.onclick = () => viewer(m.dataset.doc));
      bindUpload(el, () => IF.patient !== 'all' ? IF.patient : null);
      bindBA(el);
    }
  });
})();
