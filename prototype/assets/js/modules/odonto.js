/* Odontogramme interactif — numérotation FDI, 5 faces, 3 couches */
(function () {
  const N = Nacre, D = N.D, A = N.App, H = A.H;
  const { icon, fmt, esc, avatar, badge, toast } = N.ui;

  const COND = {
    carie: { label: 'Carie', color: '#CF4759', surf: true, act: 'Traitement carie (composite)' },
    obturation: { label: 'Obturation', color: '#2C6BCB', surf: true, act: 'Traitement carie (composite)' },
    couronne: { label: 'Couronne', color: '#B89457', act: 'Couronne zircone' },
    implant: { label: 'Implant', color: '#12264A', act: 'Implant (pose)' },
    extraction: { label: 'Extraction', color: '#CF4759', act: 'Extraction simple' },
    absente: { label: 'Dent absente', color: '#9AA5B4' },
    endo: { label: 'Traitement endodontique', color: '#7568D1', act: 'Traitement endodontique' },
    gingival: { label: 'Problème gingival', color: '#D08A24', act: 'Surfaçage radiculaire (quadrant)' },
    prothese: { label: 'Prothèse', color: '#3AA6A0', act: 'Couronne céramo-métallique' },
    autre: { label: 'Autre observation', color: '#6A788D' }
  };
  const LAYERS = { initial: 'Situation initiale', planned: 'Traitement prévu', done: 'Traitement réalisé' };
  const UP = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
  const LO = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];
  const POS = ['', 'incisive centrale', 'incisive latérale', 'canine', 'première prémolaire', 'deuxième prémolaire', 'première molaire', 'deuxième molaire', 'troisième molaire'];
  const QUAD = ['', 'supérieure droite', 'supérieure gauche', 'inférieure gauche', 'inférieure droite'];
  const toothName = n => (POS[+n[1]] + ' ' + QUAD[+n[0]]).replace(/^./, c => c.toUpperCase());

  const st = { tooth: null, layer: 'planned', mode: 'all', cond: 'carie', surf: [] };
  const chart = pid => { const S = N.S; if (!S.odonto[pid]) S.odonto[pid] = { teeth: {}, history: [] }; return S.odonto[pid]; };
  const marksOf = (pid, n) => chart(pid).teeth[n] || {};

  /* ---------- Dessin d'une dent ---------- */
  function toothSvg(n, t, upper) {
    const pos = +n[1]; const w = [0, 22, 19, 21, 22, 22, 31, 29, 27][pos]; const cx = 22;
    const layers = st.mode === 'all' ? ['initial', 'done', 'planned'] : [st.mode];
    const all = layers.flatMap(l => (t[l] || []).map(m => Object.assign({ layer: l }, m)));
    const has = c => all.find(m => m.c === c);
    const absent = has('absente') || (has('extraction') && has('extraction').layer === 'done');
    const implant = has('implant');
    const crownTop = 34, crownH = 24;
    const rootLen = pos === 3 ? 32 : pos <= 2 ? 27 : pos <= 5 ? 25 : 22;
    let roots = '';
    const rootsN = pos >= 6 ? 2 : pos === 4 ? 2 : 1;
    const rp = (x, spread) => `M${x - 4.5},${crownTop + 2} C${x - 4},${crownTop - rootLen * .6} ${x - 2 + spread},${crownTop - rootLen} ${x + spread},${crownTop - rootLen} C${x + 2 + spread},${crownTop - rootLen} ${x + 4},${crownTop - rootLen * .6} ${x + 4.5},${crownTop + 2}Z`;
    if (!implant) { if (rootsN === 1) roots = `<path d="${rp(cx, 0)}" class="root"/>`; else roots = `<path d="${rp(cx - w / 4 + 1, -1.5)}" class="root"/><path d="${rp(cx + w / 4 - 1, 1.5)}" class="root"/>`; }
    const crown = `<path d="M${cx - w / 2},${crownTop + 4} Q${cx - w / 2},${crownTop} ${cx - w / 2 + 5},${crownTop} L${cx + w / 2 - 5},${crownTop} Q${cx + w / 2},${crownTop} ${cx + w / 2},${crownTop + 4} L${cx + w / 2 - 1},${crownTop + crownH - 6} Q${cx + w / 2 - 2},${crownTop + crownH} ${cx + w / 2 - 8},${crownTop + crownH} L${cx - w / 2 + 8},${crownTop + crownH} Q${cx - w / 2 + 2},${crownTop + crownH} ${cx - w / 2 + 1},${crownTop + crownH - 6}Z"`;
    let crownFill = '#FFFFFF', crownStroke = '#9FB0C4', crownSW = 1.1, crownDash = '';
    const cr = has('couronne') || has('prothese');
    if (cr) { const c = COND[cr.c].color; crownFill = cr.c === 'couronne' ? '#F6EEDC' : '#E4F4F2'; crownStroke = c; crownSW = 2.2; if (cr.layer === 'planned') crownDash = 'stroke-dasharray="3 2"'; }
    let extra = '';
    const dash = m => m.layer === 'planned' ? 'stroke-dasharray="3 2" opacity=".75"' : '';
    if (implant) { const c = COND.implant.color; extra += `<g ${dash(implant)}><rect x="${cx - 4}" y="${crownTop - 26}" width="8" height="28" rx="2" fill="${c}" opacity=".9"/>${[0, 1, 2, 3, 4].map(i => `<line x1="${cx - 6}" x2="${cx + 6}" y1="${crownTop - 22 + i * 5}" y2="${crownTop - 20 + i * 5}" stroke="${c}" stroke-width="1.6"/>`).join('')}</g>`; }
    const endo = has('endo'); if (endo && !implant) { const c = COND.endo.color; const xs = rootsN === 1 ? [cx] : [cx - w / 4 + 1, cx + w / 4 - 1]; extra += xs.map((x, i) => `<line x1="${x}" y1="${crownTop + 6}" x2="${x + (rootsN === 1 ? 0 : i ? 1.5 : -1.5)}" y2="${crownTop - rootLen + 4}" stroke="${c}" stroke-width="2.6" stroke-linecap="round" ${dash(endo)}/>`).join(''); }
    const ging = has('gingival'); if (ging) extra += `<path d="M${cx - w / 2 - 2},${crownTop + 1} q3,-4 6,0 t6,0 t6,0 t6,0 t6,0 t6,0" fill="none" stroke="${COND.gingival.color}" stroke-width="1.8" ${dash(ging)}/>`;
    const ext = has('extraction'); if (ext && ext.layer !== 'done') extra += `<g stroke="${COND.extraction.color}" stroke-width="2.6" stroke-linecap="round" ${dash(ext)}><line x1="${cx - 12}" y1="${crownTop - rootLen + 2}" x2="${cx + 12}" y2="${crownTop + crownH - 2}"/><line x1="${cx + 12}" y1="${crownTop - rootLen + 2}" x2="${cx - 12}" y2="${crownTop + crownH - 2}"/></g>`;
    const au = has('autre'); if (au) extra += `<circle cx="${cx + w / 2 - 3}" cy="${crownTop + 3}" r="3.2" fill="${COND.autre.color}"/>`;
    const sc = all.filter(m => COND[m.c].surf); if (sc.length) { const m = sc[sc.length - 1]; extra += `<circle cx="${cx}" cy="${crownTop + crownH / 2}" r="3.4" fill="${COND[m.c].color}" ${dash(m)}/>`; }
    const flag = st.mode === 'all' ? (t.planned && t.planned.length ? `<circle cx="${cx - w / 2 + 2}" cy="${crownTop + crownH - 2}" r="3" fill="#CF4759"/>` : '') + (t.done && t.done.length ? `<circle cx="${cx + w / 2 - 2}" cy="${crownTop + crownH - 2}" r="3" fill="#2C6BCB"/>` : '') : '';
    const g = `<g opacity="${absent ? .18 : 1}">${roots.replace(/class="root"/g, `fill="#F4F6F9" stroke="#B5C2D1" stroke-width="1"`)}${crown} fill="${crownFill}" stroke="${crownStroke}" stroke-width="${crownSW}" ${crownDash}/></g>${extra}${flag}`;
    return `<svg viewBox="0 0 44 64" style="width:100%;max-width:44px;height:auto">${upper ? g : `<g transform="translate(0,64) scale(1,-1)">${g}</g>`}</svg>`;
  }
  function surfSvg(n, t, upper) {
    const q = +n[0]; const leftIsM = q === 2 || q === 3;
    const layers = st.mode === 'all' ? ['initial', 'done', 'planned'] : [st.mode];
    const fills = {};
    layers.forEach(l => (t[l] || []).forEach(m => { if (COND[m.c].surf && m.s) m.s.forEach(s => fills[s] = { color: COND[m.c].color, planned: l === 'planned' }); }));
    const top = upper ? 'V' : 'L', bot = upper ? 'L' : 'V', left = leftIsM ? 'M' : 'D', right = leftIsM ? 'D' : 'M';
    const f = s => fills[s] ? `fill="${fills[s].color}" ${fills[s].planned ? 'fill-opacity=".45" stroke-dasharray="2 1.5"' : ''}` : '';
    return `<svg viewBox="0 0 34 34" style="width:78%;max-width:34px;height:auto"><path class="surf" ${f(top)} d="M1,1 L33,1 L23,11 L11,11Z"/><path class="surf" ${f(bot)} d="M1,33 L33,33 L23,23 L11,23Z"/><path class="surf" ${f(left)} d="M1,1 L11,11 L11,23 L1,33Z"/><path class="surf" ${f(right)} d="M33,1 L23,11 L23,23 L33,33Z"/><rect class="surf" ${f('O')} x="11" y="11" width="12" height="12"/></svg>`;
  }
  function toothCol(pid, n, upper) {
    const t = marksOf(pid, n); const sel = st.tooth === n;
    const num = `<span class="num">${n}</span>`;
    return `<div class="tooth ${sel ? 'sel' : ''}" data-tooth="${n}" title="${toothName(n)}">${upper ? num + toothSvg(n, t, true) + surfSvg(n, t, true) : surfSvg(n, t, false) + toothSvg(n, t, false) + num}</div>`;
  }
  function arch(pid) {
    const half = (arr, up) => `<div class="odonto-half left">${arr.slice(0, 8).map(n => toothCol(pid, n, up)).join('')}</div><div class="odonto-half">${arr.slice(8).map(n => toothCol(pid, n, up)).join('')}</div>`;
    return `<div class="odonto"><div class="row between" style="min-width:560px;padding:0 14px 8px;font-size:11px;color:var(--faint);letter-spacing:.1em;text-transform:uppercase;font-weight:600"><span>Droite patient</span><span>Maxillaire</span><span>Gauche patient</span></div>
      <div class="odonto-arch">${half(UP, true)}</div><div class="odonto-sep"></div><div class="odonto-arch">${half(LO, false)}</div>
      <div class="row between" style="min-width:560px;padding:8px 14px 0;font-size:11px;color:var(--faint);letter-spacing:.1em;text-transform:uppercase;font-weight:600"><span></span><span>Mandibule</span><span></span></div></div>`;
  }

  /* ---------- Panneau latéral ---------- */
  function panel(pid) {
    const edit = N.can('clinical.edit');
    if (!st.tooth) return `<div class="card"><div class="card-body center" style="padding:40px 20px">${icon('tooth').replace('<svg', '<svg style="width:40px;height:40px;margin:0 auto 10px;color:var(--line-2)"')}<b>Sélectionnez une dent</b><p class="small muted mt-4">Cliquez sur une dent pour consulter ou renseigner son état.</p></div></div>`;
    const n = st.tooth; const t = marksOf(pid, n);
    const list = Object.keys(LAYERS).flatMap(l => (t[l] || []).map((m, i) => ({ l, i, m })));
    const c = COND[st.cond];
    return `<div class="card"><div class="card-head"><div><h3>Dent ${n}</h3><div class="sub">${toothName(n)}</div></div><button class="btn ghost sm icon" data-desel>${icon('x')}</button></div>
      <div class="card-body">
        <div class="xs muted mb-8">État enregistré</div>
        <div class="col gap-6">${list.map(({ l, i, m }) => `<div class="row" style="padding:7px 10px;border:1px solid var(--line);border-radius:9px"><i style="width:10px;height:10px;border-radius:3px;background:${COND[m.c].color}"></i><div class="grow small"><b>${COND[m.c].label}</b>${m.s && m.s.length ? ' · ' + m.s.join('') : ''}${m.note ? ' · ' + esc(m.note) : ''}<div class="xs muted">${LAYERS[l]}</div></div>${edit && l === 'planned' ? `<button class="btn xs" data-done="${i}" title="Marquer comme réalisé">${icon('check')}</button>` : ''}${edit ? `<button class="btn xs ghost" data-rm="${l}:${i}" title="Retirer">${icon('trash')}</button>` : ''}</div>`).join('') || '<div class="small muted">Dent saine — aucun élément renseigné.</div>'}</div>
        ${edit ? `<div class="divider"></div>
        <div class="xs muted mb-8">Couche</div>
        <div class="btn-group layer-tabs" style="width:100%;display:flex">${Object.entries(LAYERS).map(([k, v]) => `<button data-layer="${k}" class="${st.layer === k ? 'on' : ''}" style="flex:1;font-size:12px;padding:0 6px">${v.replace('Traitement ', '').replace('Situation ', '')}</button>`).join('')}</div>
        <div class="xs muted mt-12 mb-8">Élément</div>
        <div class="cond-grid">${Object.entries(COND).map(([k, v]) => `<button class="cond-btn ${st.cond === k ? 'on' : ''}" data-cond="${k}"><i style="background:${v.color}"></i>${v.label}</button>`).join('')}</div>
        ${c.surf ? `<div class="xs muted mt-12 mb-8">Faces concernées</div><div class="surf-pick">${[['O', 'Occlusale'], ['M', 'Mésiale'], ['D', 'Distale'], ['V', 'Vestibulaire'], ['L', 'Linguale']].map(([k, l]) => `<label title="${l}"><input type="checkbox" value="${k}" ${st.surf.includes(k) ? 'checked' : ''} data-surf><span>${k}</span></label>`).join('')}</div>` : ''}
        <div class="field mt-12"><input class="input sm" id="onote" placeholder="Observation (optionnel)"></div>
        <div class="row mt-12"><button class="btn primary grow" data-apply>${icon('check')}Enregistrer</button>${st.layer === 'planned' && c.act ? `<button class="btn" data-toplan title="Ajouter au plan de traitement">${icon('clipboard')}Au plan</button>` : ''}</div>` : `<p class="xs muted mt-12">${icon('lock').replace('<svg', '<svg style="width:12px;height:12px;display:inline"')} Lecture seule pour votre rôle.</p>`}
      </div></div>`;
  }

  function render(pid) {
    const o = chart(pid);
    const allMarks = Object.values(o.teeth).flatMap(t => Object.entries(t).flatMap(([l, a]) => a.map(m => ({ l, m }))));
    const cnt = l => allMarks.filter(x => x.l === l).length;
    return `<div class="grid" style="grid-template-columns:minmax(0,1fr) 330px;align-items:start" id="odo-grid">
      <div class="col gap-16" style="min-width:0">
        <div class="card"><div class="card-body">
          <div class="row between wrap mb-16"><div class="btn-group">${[['all', 'Vue globale'], ['initial', 'Situation initiale'], ['planned', 'Traitement prévu'], ['done', 'Traitement réalisé']].map(([k, l]) => `<button data-mode="${k}" class="${st.mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>
          <div class="row gap-6 small"><span class="badge tone-navy">${cnt('initial')} initial</span><span class="badge st-noshow">${cnt('planned')} prévu</span><span class="badge st-confirme">${cnt('done')} réalisé</span></div></div>
          ${arch(pid)}
          <div class="odonto-legend">${Object.values(COND).map(c => `<span><i style="background:${c.color}"></i>${c.label}</span>`).join('')}<span class="faint">· Tracé pointillé = prévu · <i style="background:#CF4759;border-radius:50%;width:8px;height:8px"></i> prévu · <i style="background:#2C6BCB;border-radius:50%;width:8px;height:8px"></i> réalisé</span></div>
        </div></div>
        <div class="card"><div class="card-head"><div><h3>Historique des modifications</h3><div class="sub">Chaque changement est horodaté et attribué</div></div></div><div class="card-body"><div class="list">${o.history.slice(0, 12).map(h => `<div class="li"><span class="badge ${h.action === 'retrait' ? 'st-annule' : h.layer === 'planned' ? 'st-noshow' : h.layer === 'done' ? 'st-confirme' : 'tone-navy'}" style="min-width:42px;justify-content:center">${h.tooth}</span><div class="grow small"><b>${h.action === 'retrait' ? 'Retrait' : h.action === 'realise' ? 'Réalisé' : 'Ajout'}</b> · ${COND[h.c] ? COND[h.c].label : h.c} — ${LAYERS[h.layer]}</div><div class="xs muted right">${fmt.date(h.date)}<br>${esc(h.user)}</div></div>`).join('') || '<div class="small muted">Aucune modification</div>'}</div></div></div>
      </div>
      <div id="odo-panel" style="position:sticky;top:80px">${panel(pid)}</div>
    </div>
    <style>@media (max-width:1100px){#odo-grid{grid-template-columns:1fr!important}#odo-panel{position:static!important}}</style>`;
  }

  function mount(root, pid) {
    const redraw = () => { const y = scrollY; const host = root.querySelector('#odo-grid').parentNode; host.innerHTML = render(pid); mount(host, pid); window.scrollTo(0, y); };
    root.querySelectorAll('[data-tooth]').forEach(el => el.onclick = () => { st.tooth = el.dataset.tooth; st.surf = []; redraw(); });
    root.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { st.mode = b.dataset.mode; redraw(); });
    const P = root.querySelector('#odo-panel');
    const q = s => P.querySelector(s);
    if (q('[data-desel]')) q('[data-desel]').onclick = () => { st.tooth = null; redraw(); };
    P.querySelectorAll('[data-layer]').forEach(b => b.onclick = () => { st.layer = b.dataset.layer; redraw(); });
    P.querySelectorAll('[data-cond]').forEach(b => b.onclick = () => { st.cond = b.dataset.cond; redraw(); });
    P.querySelectorAll('[data-surf]').forEach(b => b.onchange = () => { st.surf = [...P.querySelectorAll('[data-surf]:checked')].map(x => x.value); });
    const o = chart(pid); const me = N.name(N.me());
    const hist = (tooth, layer, c, action) => { o.history.unshift({ date: D.todayYmd(), user: me, tooth, layer, c, action }); N.log('Odontogramme modifié', N.pname(pid) + ' — dent ' + tooth + ' : ' + COND[c].label + ' (' + LAYERS[layer] + ')'); };
    if (q('[data-apply]')) q('[data-apply]').onclick = () => {
      const n = st.tooth; const c = COND[st.cond]; const note = q('#onote').value.trim();
      if (c.surf && !st.surf.length) return toast('Sélectionnez au moins une face', 'alert');
      o.teeth[n] = o.teeth[n] || {}; const arr = o.teeth[n][st.layer] = o.teeth[n][st.layer] || [];
      const m = { c: st.cond }; if (c.surf) m.s = st.surf.slice(); if (note) m.note = note;
      const ex = arr.findIndex(x => x.c === st.cond); if (ex >= 0) arr[ex] = m; else arr.push(m);
      hist(n, st.layer, st.cond, 'ajout'); N.save(); redraw(); toast(`Dent ${n} : ${c.label} — ${LAYERS[st.layer].toLowerCase()}`, 'tooth');
    };
    P.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const [l, i] = b.dataset.rm.split(':'); const arr = o.teeth[st.tooth][l]; const [m] = arr.splice(+i, 1); hist(st.tooth, l, m.c, 'retrait'); N.save(); redraw(); });
    P.querySelectorAll('[data-done]').forEach(b => b.onclick = () => { const t = o.teeth[st.tooth]; const [m] = t.planned.splice(+b.dataset.done, 1); t.done = t.done || []; t.done.push(m); hist(st.tooth, 'done', m.c, 'realise'); N.save(); redraw(); toast('Traitement marqué comme réalisé', 'check'); });
    if (q('[data-toplan]')) q('[data-toplan]').onclick = () => {
      const S = N.S; const act = S.acts.find(a => a.label === COND[st.cond].act) || { label: COND[st.cond].act, price: 0 };
      let plan = S.plans.find(p => p.patient === pid && p.status !== 'termine');
      if (!plan) { plan = { id: N.uid('tp'), patient: pid, dentist: N.patient(pid).dentist, title: 'Plan de traitement', created: D.todayYmd(), status: 'propose', items: [] }; S.plans.push(plan); }
      plan.items.push({ id: N.uid('i'), label: act.label, tooth: st.tooth, price: act.price, status: 'propose', planned: '', done: '', paid: 0 });
      N.log('Acte ajouté au plan', N.pname(pid) + ' — ' + act.label + ' (' + st.tooth + ')'); N.save(); toast(`« ${act.label} » ajouté au plan de traitement`, 'clipboard');
    };
  }

  N.Odonto = { render, mount, COND, toothName };

  /* ---------- Module Odontogramme (sélecteur patient) ---------- */
  let curPid = 'p1';
  A.view('odontogramme', {
    render(params) {
      if (params[0]) curPid = params[0];
      const p = N.patient(curPid);
      return `${H.head('Odontogramme', 'Schéma dentaire interactif · numérotation FDI', `<select class="select" id="opick" style="width:280px">${H.patientOptions(curPid, false)}</select><a class="btn" href="#/patients/${curPid}">${icon('user')}Fiche patient</a>`)}
      <div class="card mb-16"><div class="card-body row wrap" style="gap:14px">${avatar(p)}<div class="grow"><b>${esc(N.pname(p))}</b><div class="xs muted">${N.age(p.dob)} ans · ${p.fileNo} · ${esc(N.name(N.staff(p.dentist)))}</div></div>${p.allergies.length ? `<span class="tag allergy">Allergies : ${esc(p.allergies.join(', '))}</span>` : ''}</div></div>
      <div id="odo-host">${render(curPid)}</div>`;
    },
    mount(el) {
      el.querySelector('#opick').onchange = e => { st.tooth = null; location.hash = '#/odontogramme/' + e.target.value; };
      mount(el.querySelector('#odo-host'), curPid);
    }
  });
})();
