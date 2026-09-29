/* AI Dental Practice Assistant — tâches administratives et organisationnelles uniquement.
   - Sans clé API : génération locale déterministe à partir des données du cabinet.
   - Avec ANTHROPIC_API_KEY : rédaction par Claude (claude-opus-5) à partir d'un contexte minimisé
     (pas de téléphone, email, adresse ni identifiant de couverture), avec repli local en cas d'erreur. */
const { Op } = require('sequelize');
const cfg = require('../config');
const M = require('../models');
const { patientBalance, nextAppointment, freeSlots } = require('./core');
const { D, money, pname, staffName } = require('../utils/helpers');

let Anthropic = null; let client = null;
try { Anthropic = require('@anthropic-ai/sdk'); Anthropic = Anthropic.default || Anthropic; } catch { Anthropic = null; }
function claude() { if (!cfg.anthropicKey || !Anthropic) return null; if (!client) client = new Anthropic({ apiKey: cfg.anthropicKey }); return client; }
const engine = () => (claude() ? 'claude' : 'local');

const SYSTEM = `Tu es l'assistant administratif d'un cabinet dentaire (logiciel Nacre). Tu aides l'équipe à rédiger, résumer et organiser.
Règles impératives :
- Tu ne poses jamais de diagnostic, n'interprètes pas d'examens et ne recommandes aucun traitement ni posologie : ces décisions relèvent exclusivement du praticien.
- Tu t'appuies uniquement sur les informations fournies ; tu n'inventes aucune donnée clinique. Si une information manque, dis-le.
- Réponds en français, de façon concise et structurée (titres courts en **gras**, puces « • »). Pas de tableau Markdown.`;

const LABEL = { consultation: 'Consultation', controle: 'Contrôle', detartrage: 'Détartrage', carie: 'Soin carie', extraction: 'Extraction', implantologie: 'Implantologie', orthodontie: 'Orthodontie', prothese: 'Prothèse', chirurgie: 'Chirurgie', urgence: 'Urgence' };
const fmt = s => new Date(String(s).slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const short = s => new Date(String(s).slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

async function askClaude(prompt) {
  const c = claude(); if (!c) return null;
  try {
    const r = await c.beta.messages.create({
      model: 'claude-opus-5', max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
      output_config: { effort: 'medium' },
      system: SYSTEM, messages: [{ role: 'user', content: prompt }]
    });
    if (r.stop_reason === 'refusal') return null;
    const text = r.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    return text || null;
  } catch (e) {
    if (Anthropic && e instanceof Anthropic.RateLimitError) console.warn('[assistant] limite de débit Claude atteinte — repli local');
    else if (Anthropic && e instanceof Anthropic.AuthenticationError) console.warn('[assistant] clé ANTHROPIC_API_KEY invalide — repli local');
    else if (Anthropic && e instanceof Anthropic.APIError) console.warn(`[assistant] erreur API Claude ${e.status} — repli local`);
    else console.warn('[assistant] Claude indisponible — repli local :', e.message);
    return null;
  }
}

/* ---------- Contextes (données minimisées) ---------- */
async function patientContext(pid) {
  const p = await M.Patient.findByPk(pid);
  const [cs, ap, plan, bal, na, lab] = await Promise.all([
    M.Consultation.findAll({ where: { patientId: pid }, order: [['date', 'ASC']] }),
    M.Appointment.findAll({ where: { patientId: pid }, raw: true }),
    M.Plan.findOne({ where: { patientId: pid, status: { [Op.ne]: 'termine' } }, include: [{ model: M.PlanItem, as: 'items' }] }),
    patientBalance(pid), nextAppointment(pid), M.LabCase.findAll({ where: { patientId: pid, status: { [Op.ne]: 'livre' } }, raw: true })
  ]);
  const dn = na ? await M.User.findByPk(na.dentistId) : null;
  return { p, cs, ap, plan, bal, na, dn, lab };
}

const TASKS = {
  async summary({ patientId }, can) {
    if (!can('clinical.view')) return { text: 'Votre rôle ne permet pas d’accéder aux données cliniques de ce patient.' };
    const { p, cs, ap, plan, bal, na, dn, lab } = await patientContext(patientId);
    const local = [
      `**Synthèse — ${pname(p)}** (${D.diff(p.dob, D.today()) / 365.25 | 0} ans, ${p.fileNo})`, '',
      '**Informations déclarées**', `• Antécédents : ${p.history.join(', ') || 'aucun'}`, `• Allergies : ${p.allergies.join(', ') || 'aucune'}`, ...(p.meds.length ? [`• Traitements : ${p.meds.join(', ')}`] : []), '',
      `**Parcours (${cs.length} consultations)**`, ...(cs.slice(-5).map(c => `• ${short(c.date)} — ${c.motif} : ${c.done || '—'}`)), ...(cs.length ? [] : ['• Aucune consultation enregistrée']),
      ...(plan ? ['', `**Plan en cours** — ${plan.title} : ${plan.items.filter(i => i.status === 'termine').length}/${plan.items.length} actes réalisés. Prochaines étapes : ${plan.items.filter(i => i.status !== 'termine').map(i => i.label + (i.tooth && i.tooth !== '—' ? ` (${i.tooth})` : '')).join(', ') || '—'}.`] : []),
      ...(lab.length ? [`**Laboratoire** : ${lab.map(l => `${l.type} (${l.status})`).join(', ')}.`] : []), '',
      '**Administratif**', `• ${ap.filter(a => a.status === 'termine').length} RDV honorés, ${ap.filter(a => a.status === 'noshow').length} no-show`,
      `• Prochain RDV : ${na ? `${fmt(na.date)} à ${na.start} (${staffName(dn)})` : 'aucun'}`, `• Solde : ${money(bal.due)} restant sur ${money(bal.total)}`, ...(p.notes ? [`• Note équipe : ${p.notes}`] : []), '',
      '_Synthèse générée à partir des notes saisies par le praticien — à relire._'
    ].join('\n');
    const ai = await askClaude(`Rédige une synthèse administrative et chronologique du dossier suivant, destinée à l'équipe du cabinet (10 à 15 lignes). N'ajoute aucune interprétation clinique.\n\n${local}`);
    return { text: ai || local, actions: [{ label: 'Ouvrir le dossier', href: `/patients/${p.id}/dossier` }] };
  },

  async notes({ text }) {
    if (!text || text.trim().length < 5) return { text: 'Collez les notes cliniques à structurer.' };
    const ai = await askClaude(`Restructure ces notes brutes saisies par le praticien en sections : Motif / plainte, Observations, Actes réalisés, Suite à prévoir, Autres éléments. Reformule proprement sans rien ajouter ni interpréter.\n\nNotes :\n"""${text.slice(0, 6000)}"""`);
    if (ai) return { text: ai };
    const parts = text.split(/[.;\n]+/).map(s => s.trim()).filter(s => s.length > 2);
    const cat = { 'Motif / plainte': /plain|douleur|sensib|g[eê]ne|motif|consulte|souhait/i, 'Observations': /visible|observ|examen|constat|gencive|tartre|radio|mobilit|saign/i, 'Actes réalisés': /fait|réalis|pos[ée]|composite|détartr|extrac|anesth|obtur|scell/i, 'Suite à prévoir': /revoir|contrôle|rdv|prochain|prévoir|mois|semaine|suivi/i };
    const out = {}; parts.forEach(s => { const k = Object.keys(cat).find(c => cat[c].test(s)) || 'Autres éléments'; (out[k] = out[k] || []).push(s); });
    return { text: ['**Notes structurées**', ...Object.entries(out).flatMap(([k, v]) => ['', `**${k}**`, ...v.map(s => '• ' + s.charAt(0).toUpperCase() + s.slice(1))]), '', '_Restructuration du texte fourni, sans ajout d’information clinique._'].join('\n') };
  },

  async report({ patientId }, can) {
    if (!can('clinical.view')) return { text: 'Votre rôle ne permet pas d’accéder aux données cliniques.' };
    const p = await M.Patient.findByPk(patientId); const c = await M.Consultation.findOne({ where: { patientId }, order: [['date', 'DESC']] }); const d = await M.User.findByPk(p.dentistId);
    if (!c) return { text: 'Aucune consultation enregistrée pour ce patient — impossible de préparer un compte rendu.' };
    const local = `Cher confrère, chère consœur,\n\nJe vous adresse le compte rendu de la consultation du ${fmt(c.date)} concernant ${p.sex === 'F' ? 'Mme' : 'M.'} ${p.first} ${p.last}.\n\nMotif : ${c.motif}.\nObservations relevées : ${c.observations || '—'}\nDiagnostic établi par le praticien : ${c.diagnosis || '—'}\nActes réalisés : ${c.done || '—'}\nSuite proposée : ${c.proposed || '—'}\n\nAntécédents déclarés : ${p.history.join(', ') || 'aucun'}. Allergies déclarées : ${p.allergies.join(', ') || 'aucune'}.\n\nJe reste à votre disposition pour tout complément d’information.\n\nConfraternellement,\n${staffName(d)}`;
    const ai = await askClaude(`Améliore la forme de ce brouillon de courrier à un confrère (ton professionnel, français soigné) en conservant strictement les informations cliniques telles qu'écrites, sans en ajouter. Renvoie uniquement le courrier.\n\n${local}`);
    return { text: ai || local, copy: ai || local, actions: [{ label: 'Ouvrir dans Documents', href: `/documents?type=compte_rendu&patient=${p.id}` }] };
  },

  async followups(_, can, req) {
    const t = D.today(); const pats = await M.Patient.findAll({ where: { clinicId: { [Op.in]: req.clinics } } });
    const ap = await M.Appointment.findAll({ where: { patientId: pats.map(p => p.id) }, attributes: ['patientId', 'date', 'status', 'type'], raw: true });
    const byP = id => ap.filter(a => a.patientId === id);
    const noNext = pats.filter(p => !byP(p.id).some(a => a.date >= t && ['confirme', 'attente'].includes(a.status)));
    const ctrl = noNext.map(p => ({ p, last: byP(p.id).filter(a => a.status === 'termine').map(a => a.date).sort().pop() })).filter(x => x.last && D.diff(x.last, t) > 20).slice(0, 8);
    const plans = await M.Plan.findAll({ where: { patientId: pats.map(p => p.id), status: { [Op.ne]: 'termine' } }, include: [{ model: M.PlanItem, as: 'items' }] });
    const pl = plans.filter(x => x.items.some(i => ['accepte', 'propose'].includes(i.status) && !i.planned));
    const ortho = await M.OrthoCase.findAll({ where: { patientId: pats.map(p => p.id) } });
    const orthoNo = ortho.filter(o => !byP(o.patientId).some(a => a.date >= t && a.type === 'orthodontie'));
    const ns = pats.filter(p => p.noShows >= 2 && !p.reinforced);
    const name = id => pname(pats.find(p => p.id === id));
    return { text: ['**Suivis à planifier**', '', `**Sans prochain rendez-vous (${ctrl.length})**`, ...(ctrl.map(x => `• ${pname(x.p)} — dernière visite le ${short(x.last)}`)), ...(ctrl.length ? [] : ['• —']), '', `**Plans avec étapes non planifiées (${pl.length})**`, ...(pl.map(x => `• ${name(x.patientId)} — ${x.title}`)), ...(pl.length ? [] : ['• —']), '', `**Orthodontie sans contrôle prévu (${orthoNo.length})**`, ...(orthoNo.map(o => `• ${name(o.patientId)} (mois ${o.current}/${o.months})`)), ...(orthoNo.length ? [] : ['• —']), '', `**Rappel renforcé suggéré (${ns.length})**`, ...(ns.slice(0, 8).map(p => `• ${pname(p)} — ${p.noShows} no-show`)), ...(ns.length ? [] : ['• —'])].join('\n'), actions: [{ label: 'Créer les tâches de suivi', action: 'generateFollowups' }, { label: 'Ouvrir les suivis', href: '/suivis' }] };
  },

  async agenda(_, can, req) {
    let d = D.add(D.today(), 1); if (D.parse(d).getDay() === 0) d = D.add(d, 1);
    const ap = await M.Appointment.findAll({ where: { clinicId: { [Op.in]: req.clinics }, date: d, status: { [Op.ne]: 'annule' } }, order: [['start', 'ASC']] });
    const pats = Object.fromEntries((await M.Patient.findAll({ where: { id: ap.map(a => a.patientId) } })).map(p => [p.id, p]));
    const dentists = await M.User.findAll({ where: { role: 'dentiste', clinicId: { [Op.in]: req.clinics } } });
    const pend = ap.filter(a => a.status === 'attente'); const risky = ap.filter(a => pats[a.patientId].noShows >= 2); const long = ap.filter(a => a.dur >= 75); const allergy = ap.filter(a => pats[a.patientId].allergies.length);
    const holes = []; for (const dn of dentists) { const f = await freeSlots(dn.id, d, 30); if (f.length) holes.push(`• ${staffName(dn)} : ${f.slice(0, 5).join(', ')}`); }
    return {
      text: [`**Préparation du ${fmt(d)}**`, `${ap.length} rendez-vous prévus.`, '', `**À confirmer (${pend.length})**`, ...(pend.slice(0, 8).map(a => `• ${a.start} — ${pname(pats[a.patientId])} (${LABEL[a.type]})`)), ...(pend.length ? [] : ['• Tous confirmés ✓']), '', '**Risque d’absence**', ...(risky.map(a => `• ${a.start} — ${pname(pats[a.patientId])} : ${pats[a.patientId].noShows} no-show → rappel renforcé conseillé`)), ...(risky.length ? [] : ['• Aucun']), '', '**Préparation matériel / salle**', ...(long.map(a => `• ${a.start} — ${LABEL[a.type]} (${a.dur} min) · ${a.chair}`)), ...(long.length ? [] : ['• Rien de particulier']), ...(allergy.length ? [`• Allergies déclarées à signaler : ${allergy.map(a => `${pats[a.patientId].last} (${pats[a.patientId].allergies.join(', ')})`).join(', ')}`] : []), '', '**Créneaux libres (liste d’attente / urgences)**', ...(holes.length ? holes : ['• Agenda complet'])].join('\n'),
      actions: [{ label: `Envoyer ${pend.length} demande(s) de confirmation`, action: 'confirmTomorrow', date: d }, { label: 'Ouvrir l’agenda', href: `/agenda?date=${d}` }]
    };
  },

  async reminder({ patientId }) {
    const { p, na, dn } = await patientContext(patientId); const g = (await M.Setting.findByPk('general')).value; const clinic = await M.Clinic.findByPk(p.clinicId);
    const text = na ? `Bonjour ${p.first}, nous vous rappelons votre rendez-vous du ${fmt(na.date)} à ${na.start.replace(':', 'h')} avec ${staffName(dn)} au ${g.group} — ${clinic.city}. Merci d’arriver 10 minutes en avance. Répondez OUI pour confirmer.` : `Bonjour ${p.first}, votre dernier passage au ${g.group} remonte à quelques mois. Nous vous recommandons un contrôle : réservez en ligne ou appelez le ${clinic.phone}.`;
    return { text: `**Rappel proposé** (${text.length} caractères — ${Math.ceil(text.length / 160)} SMS)\n\n${text}`, copy: text, actions: [{ label: `Envoyer par ${p.consent.whatsapp ? 'WhatsApp' : 'SMS'}`, action: 'sendReminder', patientId: p.id, message: text, channel: p.consent.whatsapp ? 'whatsapp' : 'sms' }] };
  },

  async template({ kind = 'Instructions avant chirurgie' }) {
    const base = {
      'Instructions avant chirurgie': 'Bonjour {prenom}, en vue de votre intervention du {date} : prenez un repas léger 2h avant, poursuivez vos traitements habituels sauf avis contraire, venez accompagné(e) et prévoyez 1h30. Pour toute question : {telephone}.',
      'Conseils après détartrage': 'Bonjour {prenom}, suite à votre détartrage, une légère sensibilité peut apparaître 24 à 48h. Utilisez une brosse souple. Prochain contrôle conseillé dans 6 mois.',
      'Retard du praticien': 'Bonjour {prenom}, {dentiste} a environ 20 minutes de retard ce jour. Nous vous prions de nous en excuser. Vous pouvez arriver un peu plus tard ou reporter en répondant à ce message.',
      'Fermeture exceptionnelle': 'Bonjour {prenom}, le {cabinet} sera exceptionnellement fermé le {date}. Votre rendez-vous sera reprogrammé : nous vous contacterons sous 24h.',
      'Relance devis': 'Bonjour {prenom}, votre devis est toujours disponible dans votre espace patient. Notre équipe reste à votre disposition pour en discuter ou proposer un paiement échelonné.'
    };
    let text = base[kind] || null;
    const ai = await askClaude(`Rédige un modèle de message patient (SMS, 300 caractères maximum) pour : « ${kind} ». Utilise les variables {prenom}, {dentiste}, {date}, {heure}, {cabinet}, {telephone} si utile. Aucun conseil médical personnalisé. Renvoie uniquement le texte du message.`);
    if (ai) text = ai.replace(/^["«]|["»]$/g, '');
    if (!text) return { text: 'Type de message inconnu.' };
    return { text: `**${kind}**\n\n${text}`, copy: text, actions: [{ label: 'Ajouter aux modèles', action: 'saveTemplate', name: kind, message: text }] };
  }
};

const FORBIDDEN = /diagnos|quel traitement|dois-je prescrire|quelle maladie|est-ce grave|posologie|quel antibio|interpr[eè]te/i;
async function ask(req, question) {
  if (FORBIDDEN.test(question)) return { text: 'Je ne peux pas établir de diagnostic, interpréter des examens ni recommander un traitement : ces décisions relèvent exclusivement du jugement du praticien. Je peux en revanche résumer un dossier, préparer un document ou organiser le suivi.' };
  const n = question.toLowerCase();
  const pats = await M.Patient.findAll({ where: { clinicId: { [Op.in]: req.clinics } }, attributes: ['id', 'first', 'last'] });
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const p = pats.find(x => norm(question).includes(norm(x.last)) && norm(question).includes(norm(x.first.split(' ')[0]))) || pats.find(x => norm(question).includes(norm(x.last)));
  const k = /r[ée]sum|synth|histor|dossier/.test(n) ? (/note/.test(n) ? 'notes' : 'summary') : /compte.?rendu|courrier|lettre/.test(n) ? 'report' : /suivi|relanc|contr[oô]le/.test(n) ? 'followups' : /agenda|demain|organis|planning/.test(n) ? 'agenda' : /rappel|sms|whatsapp/.test(n) ? 'reminder' : /mod[eè]le|template/.test(n) ? 'template' : null;
  if (k && ['summary', 'report', 'reminder'].includes(k) && !p) return { text: 'De quel patient s’agit-il ? Précisez son nom et son prénom.' };
  if (k) return run(req, k, { patientId: p && p.id, text: question });
  const ai = await askClaude(`Question de l'équipe du cabinet : « ${question.slice(0, 1000)} ». Réponds brièvement si elle concerne l'organisation ou l'administration du cabinet ; sinon explique poliment ce que tu peux faire (synthèses, comptes rendus, rappels, suivis, organisation de l'agenda, modèles de messages).`);
  return { text: ai || 'Je peux vous aider à : résumer l’historique d’un patient, structurer des notes, préparer un compte rendu, identifier les suivis, organiser l’agenda de demain, rédiger un rappel ou un modèle de message.' };
}

async function run(req, task, input = {}) {
  if (!TASKS[task]) throw Object.assign(new Error('Tâche inconnue'), { status: 400 });
  const out = await TASKS[task](input, req.can, req);
  return { ...out, engine: engine() };
}

module.exports = { run, ask, engine };
