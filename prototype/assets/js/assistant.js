/* AI Dental Practice Assistant — tâches administratives & organisationnelles.
   Démo : génération locale déterministe à partir des données du cabinet.
   En production : appel à un LLM via le backend (données minimisées, pas de diagnostic). */
(function () {
  const N = Nacre, D = N.D; const { icon, fmt, esc, toast } = N.ui;
  let panel, body, ctxPid = null;

  const SUGG = [['summary', 'Résumer l’historique du patient'], ['notes', 'Résumer des notes cliniques'], ['report', 'Préparer un compte rendu'], ['followups', 'Suivis à planifier'], ['agenda', 'Organiser l’agenda de demain'], ['reminder', 'Générer un rappel'], ['template', 'Modèle de communication']];

  function ensure() {
    if (panel) return;
    const fab = document.createElement('button'); fab.className = 'ai-fab'; fab.innerHTML = `<span class="spark">${icon('sparkles')}</span><span class="lbl">Assistant IA</span>`; fab.setAttribute('aria-label', 'Assistant IA');
    fab.onclick = () => panel.classList.contains('hidden') ? show() : panel.classList.add('hidden');
    document.body.appendChild(fab);
    panel = document.createElement('div'); panel.className = 'ai-panel hidden'; panel.setAttribute('role', 'dialog');
    panel.innerHTML = `<div class="ai-head"><span class="brand-mark" style="width:30px;height:30px;background:rgba(255,255,255,.14);box-shadow:none">${icon('sparkles')}</span><div><b>Assistant Nacre</b><div class="xs" style="opacity:.75">Tâches administratives & organisation</div></div><button class="x" aria-label="Fermer">${icon('x').replace('<svg', '<svg style="width:16px;height:16px"')}</button></div>
      <div class="ai-body" id="aib"></div>
      <div class="ai-disclaimer">${icon('shield').replace('<svg', '<svg style="width:11px;height:11px;display:inline;vertical-align:-1px"')} Ne pose aucun diagnostic et ne remplace pas le jugement du praticien. Toute suggestion doit être validée.</div>
      <div class="ai-foot"><input class="input" id="aiq" placeholder="Ex. : résume le dossier d’Ahmed Benali"><button class="btn primary icon" id="ais" aria-label="Envoyer">${icon('send')}</button></div>`;
    document.body.appendChild(panel);
    body = panel.querySelector('#aib');
    panel.querySelector('.x').onclick = () => panel.classList.add('hidden');
    const send = () => { const q = panel.querySelector('#aiq').value.trim(); if (!q) return; panel.querySelector('#aiq').value = ''; ask(q); };
    panel.querySelector('#ais').onclick = send; panel.querySelector('#aiq').onkeydown = e => { if (e.key === 'Enter') send(); };
    welcome();
  }
  function show() { panel.classList.remove('hidden'); const r = location.hash.match(/#\/(patients|odontogramme|communication)\/(p[\w]+)/); if (r) ctxPid = r[2]; }
  function welcome() {
    const me = N.me();
    say(`Bonjour ${me.first}. Je peux vous aider à préparer vos documents administratifs, organiser l’agenda, identifier les suivis et rédiger vos messages patients.`, true);
    chips();
  }
  function chips() { const d = document.createElement('div'); d.className = 'ai-sugg'; d.innerHTML = SUGG.map(([k, l]) => `<button data-k="${k}">${l}</button>`).join(''); d.querySelectorAll('button').forEach(b => b.onclick = () => run(b.dataset.k)); body.appendChild(d); body.scrollTop = body.scrollHeight; }
  function say(text, bot = true, actions = []) {
    const m = document.createElement('div'); m.className = 'ai-msg' + (bot ? '' : ' me'); m.innerHTML = bot ? text : esc(text);
    if (actions.length) { const a = document.createElement('div'); a.className = 'row wrap gap-6 mt-8'; actions.forEach(([l, fn, ic]) => { const b = document.createElement('button'); b.className = 'btn xs'; b.innerHTML = (ic ? icon(ic) : '') + l; b.onclick = fn; a.appendChild(b); }); m.appendChild(a); }
    body.appendChild(m); body.scrollTop = body.scrollHeight; return m;
  }
  function think(fn) { const t = document.createElement('div'); t.className = 'ai-msg typing'; t.innerHTML = '<i></i><i></i><i></i>'; body.appendChild(t); body.scrollTop = body.scrollHeight; setTimeout(() => { t.remove(); fn(); }, 650 + Math.random() * 400); }
  const copyBtn = txt => ['Copier', () => { navigator.clipboard && navigator.clipboard.writeText(txt); toast('Copié dans le presse-papiers'); }, 'file'];
  const plain = h => h.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '');

  function findPatient(q) {
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const n = norm(q); return N.S.patients.find(p => n.includes(norm(p.last)) || n.includes(norm(p.first.split(' ')[0]) + ' ')) || null;
  }
  function pickPatient(then) {
    const m = say(`Pour quel patient ?<div class="mt-8"><select class="select sm" style="width:100%">${N.App.H.patientOptions(ctxPid || 'p1')}</select><button class="btn primary xs mt-8">Continuer</button></div>`);
    m.querySelector('button').onclick = () => { ctxPid = m.querySelector('select').value; then(ctxPid); };
  }

  /* ---------- Tâches ---------- */
  const T = {
    summary(pid) {
      if (!pid) return pickPatient(T.summary);
      if (!N.can('clinical.view')) return say('Votre rôle ne permet pas d’accéder aux données cliniques de ce patient. Je peux en revanche résumer ses informations administratives et rendez-vous.');
      const S = N.S, p = N.patient(pid); const cs = S.consults.filter(c => c.patient === pid).sort((a, b) => a.date.localeCompare(b.date));
      const ap = S.appts.filter(a => a.patient === pid); const plan = S.plans.find(x => x.patient === pid && x.status !== 'termine'); const b = N.patientBalance(pid);
      const na = N.App.H.nextAppt(pid); const lab = S.labCases.filter(l => l.patient === pid && l.status !== 'livre');
      const html = `<b>Synthèse — ${esc(N.pname(p))}</b> (${N.age(p.dob)} ans, ${p.fileNo})<br><br><b>Informations déclarées</b><br>• Antécédents : ${esc(p.history.join(', ') || 'aucun')}<br>• Allergies : ${esc(p.allergies.join(', ') || 'aucune')}${p.meds.length ? '<br>• Traitements : ' + esc(p.meds.join(', ')) : ''}<br><br><b>Parcours (${cs.length} consultations)</b><br>${cs.slice(-5).map(c => `• ${fmt.date(c.date)} — ${esc(c.motif)} : ${esc(c.done)}`).join('<br>') || '• Aucune consultation enregistrée'}${plan ? `<br><br><b>Plan en cours</b> — ${esc(plan.title)} : ${plan.items.filter(i => i.status === 'termine').length}/${plan.items.length} actes réalisés. Prochaines étapes : ${esc(plan.items.filter(i => i.status !== 'termine').map(i => i.label + (i.tooth !== '—' ? ' (' + i.tooth + ')' : '')).join(', ') || '—')}.` : ''}${lab.length ? `<br><b>Laboratoire</b> : ${esc(lab.map(l => l.type + ' — ' + N.LAB_ST[l.status][0].toLowerCase()).join(', '))}.` : ''}<br><br><b>Administratif</b><br>• ${ap.filter(a => a.status === 'termine').length} RDV honorés, ${ap.filter(a => a.status === 'noshow').length} no-show<br>• Prochain RDV : ${na ? fmt.dateLong(na.date) + ' à ' + na.start : 'aucun'}<br>• Solde : ${fmt.money(b.due)} restant sur ${fmt.money(b.total)}${p.notes ? `<br>• Note équipe : ${esc(p.notes)}` : ''}<br><br><span class="xs muted">Synthèse générée à partir des notes saisies par le praticien — à relire.</span>`;
      say(html, true, [copyBtn(plain(html)), ['Ouvrir le dossier', () => location.hash = '#/patients/' + pid + '/dossier', 'user']]);
    },
    notes() {
      const m = say(`Collez vos notes cliniques brutes, je les structure en sections (sans interprétation).<textarea class="textarea mt-8" style="min-height:90px" placeholder="Ex. : pt se plaint sensib froid 26 depuis 2 sem, carie OD visible, composite fait teinte A2, revoir 6 mois…"></textarea><button class="btn primary xs mt-8">Résumer</button>`);
      m.querySelector('button').onclick = () => {
        const txt = m.querySelector('textarea').value.trim(); if (!txt) return;
        say(txt.length > 140 ? txt.slice(0, 140) + '…' : txt, false);
        think(() => {
          const parts = txt.split(/[.;\n]+|,\s(?=[a-zà-ü]{3,}\s)/i).map(s => s.trim()).filter(s => s.length > 2);
          const cat = { 'Motif / plainte': /plain|douleur|sensib|gêne|g[eê]ne|motif|consulte|souhait/i, 'Observations': /visible|observ|examen|constat|gencive|tartre|radio|mobilit|saign/i, 'Actes réalisés': /fait|réalis|posé|pose|composite|détartr|extrac|anesth|obtur|scell/i, 'Suite / à prévoir': /revoir|contrôle|rdv|prochain|prévoir|mois|semaine|suivi/i };
          const out = {}; parts.forEach(s => { const k = Object.keys(cat).find(k => cat[k].test(s)) || 'Autres éléments'; (out[k] = out[k] || []).push(s); });
          const html = `<b>Notes structurées</b><br>${Object.entries(out).map(([k, v]) => `<br><b>${k}</b><br>${v.map(s => '• ' + esc(s.charAt(0).toUpperCase() + s.slice(1))).join('<br>')}`).join('<br>')}<br><br><span class="xs muted">Restructuration du texte fourni, sans ajout d’information clinique.</span>`;
          say(html, true, [copyBtn(plain(html))]);
        });
      };
    },
    report(pid) {
      if (!pid) return pickPatient(T.report);
      const S = N.S, p = N.patient(pid); const c = S.consults.filter(x => x.patient === pid).sort((a, b) => b.date.localeCompare(a.date))[0]; const d = N.staff(p.dentist);
      if (!c) return say('Aucune consultation enregistrée pour ce patient — je ne peux pas préparer de compte rendu.');
      const txt = `Cher confrère, chère consœur,\n\nJe vous adresse le compte rendu de la consultation du ${fmt.dateLong(c.date)} concernant ${p.sex === 'F' ? 'Mme' : 'M.'} ${p.first} ${p.last}, ${N.age(p.dob)} ans.\n\nMotif : ${c.motif}.\nObservations relevées : ${c.observations}\nDiagnostic établi par le praticien : ${c.diagnosis}\nActes réalisés : ${c.done}\nSuite proposée : ${c.proposed}\n\nAntécédents déclarés : ${p.history.join(', ') || 'aucun'}. Allergies déclarées : ${p.allergies.join(', ') || 'aucune'}.\n\nJe reste à votre disposition pour tout complément d’information.\n\nConfraternellement,\n${N.name(d)}`;
      say(`<b>Brouillon de compte rendu</b> — reprend fidèlement le dossier, à relire et signer :<br><br>${esc(txt).replace(/\n/g, '<br>')}`, true, [copyBtn(txt), ['Ouvrir dans Documents', () => { location.hash = '#/documents/new/compte_rendu/' + pid; }, 'file']]);
    },
    followups() {
      const S = N.S, t = D.todayYmd();
      const noNext = S.patients.filter(p => N.inClinic(p) && !N.App.H.nextAppt(p.id));
      const ctrl = noNext.filter(p => { const last = S.appts.filter(a => a.patient === p.id && a.status === 'termine').map(a => a.date).sort().pop(); return last && D.diffDays(last, t) > 20; }).slice(0, 6);
      const plans = S.plans.filter(pl => N.inClinic(N.patient(pl.patient)) && pl.items.some(i => ['accepte', 'propose'].includes(i.status) && !i.planned));
      const ortho = S.ortho.filter(o => !S.appts.some(a => a.patient === o.patient && a.date >= t && a.type === 'orthodontie'));
      const ns = S.patients.filter(p => N.inClinic(p) && p.noShows >= 2 && !p.reinforced);
      const html = `<b>Suivis à planifier</b><br><br><b>Sans prochain rendez-vous (${ctrl.length})</b><br>${ctrl.map(p => `• ${esc(N.pname(p))} — dernière visite ${fmt.rel(S.appts.filter(a => a.patient === p.id && a.status === 'termine').map(a => a.date).sort().pop())}`).join('<br>') || '• —'}<br><br><b>Plans avec étapes non planifiées (${plans.length})</b><br>${plans.map(pl => `• ${esc(N.pname(pl.patient))} — ${esc(pl.title)}`).join('<br>') || '• —'}<br><br><b>Orthodontie sans contrôle prévu (${ortho.length})</b><br>${ortho.map(o => `• ${esc(N.pname(o.patient))} (mois ${o.current}/${o.months})`).join('<br>') || '• —'}<br><br><b>Rappel renforcé suggéré (${ns.length})</b><br>${ns.map(p => `• ${esc(N.pname(p))} — ${p.noShows} no-show`).join('<br>') || '• —'}`;
      say(html, true, [['Créer les tâches de suivi', () => { location.hash = '#/suivis'; setTimeout(() => document.querySelector('[data-gen]') && document.querySelector('[data-gen]').click(), 300); }, 'check'], copyBtn(plain(html))]);
    },
    agenda() {
      const S = N.S; let d = D.addYmd(D.todayYmd(), 1); if (D.parse(d).getDay() === 0) d = D.addYmd(d, 1);
      const ap = S.appts.filter(a => a.date === d && N.inClinic(a) && a.status !== 'annule');
      const pend = ap.filter(a => a.status === 'attente'); const risky = ap.filter(a => N.patient(a.patient).noShows >= 2);
      const long = ap.filter(a => a.dur >= 75);
      const holes = N.dentists().map(dn => ({ dn, free: N.freeSlots(dn.id, d) })).filter(x => x.free.length);
      const allergy = ap.filter(a => N.patient(a.patient).allergies.length);
      const html = `<b>Préparation du ${fmt.dateLong(d)}</b><br>${ap.length} rendez-vous prévus.<br><br><b>À confirmer (${pend.length})</b><br>${pend.slice(0, 6).map(a => `• ${a.start} — ${esc(N.pname(a.patient))} (${S.types[a.type].label})`).join('<br>') || '• Tous confirmés ✓'}<br><br><b>Risque d’absence</b><br>${risky.map(a => `• ${a.start} — ${esc(N.pname(a.patient))} : ${N.patient(a.patient).noShows} no-show → rappel renforcé conseillé`).join('<br>') || '• Aucun'}<br><br><b>Préparation matériel / salle</b><br>${long.map(a => `• ${a.start} — ${S.types[a.type].label} (${a.dur} min) · ${esc(a.chair)}`).join('<br>') || '• Rien de particulier'}${allergy.length ? `<br>• Allergies déclarées à signaler à l’équipe : ${allergy.map(a => esc(N.patient(a.patient).last) + ' (' + esc(N.patient(a.patient).allergies.join(', ')) + ')').join(', ')}` : ''}<br><br><b>Créneaux libres à proposer (liste d’attente / urgences)</b><br>${holes.map(x => `• ${esc(N.name(x.dn))} : ${x.free.slice(0, 5).join(', ')}`).join('<br>') || '• Agenda complet'}`;
      say(html, true, [['Envoyer les demandes de confirmation', () => { pend.forEach(a => { const p = N.patient(a.patient); N.App.H.sendMsg(p.id, `Bonjour ${p.first}, merci de confirmer votre rendez-vous de demain à ${fmt.hShort(a.start)} en répondant OUI.`, p.consent.whatsapp ? 'whatsapp' : 'sms', true); }); N.save(); toast(pend.length + ' demande(s) de confirmation envoyée(s)', 'send'); }, 'send'], ['Ouvrir l’agenda', () => { N.Agenda.st.date = d; N.Agenda.st.view = 'jour'; location.hash = '#/agenda'; N.App.refresh(); }, 'calendar']]);
    },
    reminder(pid) {
      if (!pid) return pickPatient(T.reminder);
      const p = N.patient(pid); const na = N.App.H.nextAppt(pid);
      const txt = na ? `Bonjour ${p.first}, nous vous rappelons votre rendez-vous ${fmt.rel(na.date)} (${fmt.dateLong(na.date)}) à ${fmt.hShort(na.start)} avec ${N.name(N.staff(na.dentist))} au ${N.S.settings.group} — ${N.clinic(na.clinic).city}. Merci d’arriver 10 minutes en avance. Répondez OUI pour confirmer.` : `Bonjour ${p.first}, votre dernier passage au ${N.S.settings.group} remonte à quelques mois. Nous vous recommandons un contrôle : réservez en ligne sur nacre.ma/rdv/atlas ou appelez le ${N.clinic(p.clinic).phone}.`;
      say(`<b>Rappel proposé</b> (${txt.length} caractères — ${Math.ceil(txt.length / 160)} SMS)<br><br>${esc(txt)}`, true, [['Envoyer par ' + (p.consent.whatsapp ? 'WhatsApp' : 'SMS'), () => { N.App.H.sendMsg(pid, txt, p.consent.whatsapp ? 'whatsapp' : 'sms', false); N.log('Rappel envoyé (assistant)', N.pname(p)); N.save(); toast('Rappel envoyé', 'send'); }, 'send'], copyBtn(txt)]);
    },
    template() {
      const m = say(`Quel type de message ?<div class="chips mt-8">${['Instructions avant chirurgie', 'Conseils après détartrage', 'Retard du praticien', 'Fermeture exceptionnelle', 'Relance devis'].map(x => `<button class="chip" data-t="${x}">${x}</button>`).join('')}</div>`);
      const T2 = {
        'Instructions avant chirurgie': 'Bonjour {prenom}, en vue de votre intervention du {date} : prenez un repas léger 2h avant, poursuivez vos traitements habituels sauf avis contraire, venez accompagné(e) et prévoyez 1h30. Pour toute question : {telephone}.',
        'Conseils après détartrage': 'Bonjour {prenom}, suite à votre détartrage, une légère sensibilité peut apparaître 24 à 48h. Utilisez une brosse souple et un dentifrice pour dents sensibles. Prochain contrôle conseillé dans 6 mois.',
        'Retard du praticien': 'Bonjour {prenom}, {dentiste} a environ 20 minutes de retard ce jour. Nous vous prions de nous en excuser. Vous pouvez arriver un peu plus tard ou reporter votre rendez-vous en répondant à ce message.',
        'Fermeture exceptionnelle': 'Bonjour {prenom}, le {cabinet} sera exceptionnellement fermé le {date}. Votre rendez-vous sera reprogrammé : nous vous contacterons sous 24h.',
        'Relance devis': 'Bonjour {prenom}, votre devis est toujours disponible dans votre espace patient. Notre équipe reste à votre disposition pour en discuter ou proposer un paiement échelonné.'
      };
      m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const t = T2[b.dataset.t]; say(`<b>${b.dataset.t}</b><br><br>${esc(t)}`, true, [['Ajouter aux modèles', () => { N.S.templates.push({ id: N.uid('t'), cat: 'Assistant', name: b.dataset.t, text: t }); N.save(); toast('Modèle ajouté à la communication', 'check'); }, 'plus'], copyBtn(t)]); });
    }
  };

  function run(k, pid) { const l = SUGG.find(s => s[0] === k); say(l ? l[1] : k, false); think(() => T[k](pid || (['summary', 'report', 'reminder'].includes(k) ? ctxPid : undefined))); }
  function ask(q) {
    say(q, false);
    const n = q.toLowerCase();
    if (/diagnos|quel traitement|dois-je prescrire|quelle maladie|est-ce grave|posologie|quel antibio|interpr[eè]te.*radio/.test(n)) return think(() => say('Je ne peux pas établir de diagnostic, interpréter des examens ni recommander un traitement : ces décisions relèvent exclusivement du jugement du praticien. Je peux en revanche résumer le dossier, préparer un document ou organiser le suivi.'));
    const p = findPatient(q); if (p) ctxPid = p.id;
    const k = /r[ée]sum|synth|histor/.test(n) ? (/note/.test(n) ? 'notes' : 'summary') : /compte.?rendu|courrier|lettre/.test(n) ? 'report' : /suivi|relanc|contr[oô]le/.test(n) ? 'followups' : /agenda|demain|organis|planning/.test(n) ? 'agenda' : /rappel|sms|whatsapp/.test(n) ? 'reminder' : /mod[eè]le|message|template/.test(n) ? 'template' : /note/.test(n) ? 'notes' : null;
    if (!k) return think(() => { say('Je peux vous aider sur les tâches suivantes :'); chips(); });
    think(() => T[k](['summary', 'report', 'reminder'].includes(k) ? ctxPid : undefined));
  }

  N.Assistant = { open(k, pid) { ensure(); show(); if (pid) ctxPid = pid; run(k, pid); } };
  document.addEventListener('DOMContentLoaded', ensure);
  if (document.readyState !== 'loading') setTimeout(ensure, 0);
})();
