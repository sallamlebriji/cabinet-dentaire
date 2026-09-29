/* Test d'intégration de bout en bout contre une API démarrée (npm run dev) — node scripts/smoke.js */
const B = process.env.API || 'http://localhost:4600/api';
const today = new Date(); const ymd = d => d.toISOString().slice(0, 10);
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); if (d.getDay() === 0) d.setDate(d.getDate() + 1); return ymd(d); };

function agent() {
  let cookie = '';
  return async (method, path, body, headers = {}) => {
    const r = await fetch(B + path, { method, headers: { 'Content-Type': 'application/json', 'X-Clinic': 'fes', ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    const set = r.headers.getSetCookie ? r.headers.getSetCookie() : []; if (set.length) cookie = set.map(c => c.split(';')[0]).join('; ');
    let data = null; try { data = await r.json(); } catch { }
    return { status: r.status, data };
  };
}
let fails = 0;
const ok = (cond, label, extra = '') => { console.log(`${cond ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); if (!cond) fails++; };

(async () => {
  const admin = agent();
  ok((await admin('POST', '/auth/login', { email: 's.bennani@atlas-dentaire.ma', password: 'mauvais' })).status === 401, 'Mauvais mot de passe refusé');
  ok((await admin('POST', '/auth/login', { email: 's.bennani@atlas-dentaire.ma', password: 'Nacre2026!' })).status === 200, 'Connexion administrateur');

  // Agenda : création, conflit, déplacement, fin de séance -> facture
  let date, free = [];
  for (let n = 3; n < 20 && free.length < 2; n++) { date = addDays(n); free = (await admin('GET', `/appointments/slots?dentist=d1&date=${date}&dur=30`)).data; }
  const c1 = await admin('POST', '/appointments', { patientId: 'p5', dentistId: 'd1', date, start: free[0], dur: 30, type: 'consultation', status: 'attente' });
  ok(c1.status === 201, 'Création RDV', `${date} ${free[0]}`);
  const c2 = await admin('POST', '/appointments', { patientId: 'p6', dentistId: 'd1', date, start: free[0], dur: 30, type: 'controle' });
  ok(c2.status === 409, 'Conflit détecté (409)');
  const mv = await admin('PATCH', `/appointments/${c1.data.id}`, { start: free[1] });
  ok(mv.status === 200 && mv.data.moved, 'Déplacement RDV');
  const st = await admin('POST', `/appointments/${c1.data.id}/status`, { status: 'termine' });
  ok(st.status === 200 && st.data.invoice && /^FAC-/.test(st.data.invoice.number), 'Fin de séance → facture auto', st.data.invoice && st.data.invoice.number);

  // Paiement
  const before = (await admin('GET', '/patients/p5/balance')).data.due;
  const pay = await admin('POST', '/payments', { patientId: 'p5', invoiceId: st.data.invoice.id, amount: 300, method: 'carte', kind: 'paiement' });
  ok(pay.status === 201 && pay.data.balance.due === before - 300, 'Paiement → solde mis à jour', `${before} → ${pay.data.balance.due}`);

  // Odontogramme
  const od = await admin('POST', '/odontogram/p2/marks', { tooth: '46', layer: 'planned', cond: 'carie', surfaces: ['O', 'D'] });
  ok(od.status === 200 && od.data.teeth['46'].planned[0].c === 'carie', 'Odontogramme : ajout carie 46');
  const tp = await admin('POST', '/odontogram/p2/to-plan', { tooth: '46', cond: 'carie' });
  ok(tp.status === 200, 'Odontogramme → plan de traitement', tp.data.label);

  // Devis
  const q = await admin('POST', '/quotes', { patientId: 'p3' }); ok(q.status === 201, 'Création devis', q.data.number);
  ok((await admin('POST', `/quotes/${q.data.id}/send`)).data.status === 'envoye', 'Envoi devis');
  const inv = await admin('POST', `/quotes/${q.data.id}/deposit`); ok(inv.status === 201, 'Facture d’acompte depuis devis');

  // Stock / commande
  const prods = (await admin('GET', '/products')).data; const p0 = prods.find(p => p.id === 'st6');
  const ord = await admin('POST', '/orders', { supplierId: 'sup1', lines: [{ product: 'st6', qty: 5 }] });
  await admin('POST', `/orders/${ord.data.id}/place`); const rc = await admin('POST', `/orders/${ord.data.id}/receive`);
  const p1 = (await admin('GET', '/products')).data.find(p => p.id === 'st6');
  ok(rc.status === 200 && p1.qty === p0.qty + 5, 'Réception commande → stock', `${p0.qty} → ${p1.qty}`);

  // Laboratoire
  await admin('PATCH', '/lab-cases/lb2', { status: 'fabrication' });
  const lab = await admin('PATCH', '/lab-cases/lb2', { status: 'pret' });
  const notifs = (await admin('GET', '/notifications')).data;
  ok(lab.status === 200 && notifs[0].title.includes('prêt'), 'Labo « prêt » → notification');

  // Suivis, assistant
  ok((await admin('POST', '/followups/generate')).status === 200, 'Génération des suivis');
  const ai = await admin('POST', '/assistant/run', { task: 'summary', patientId: 'p1' });
  ok(ai.status === 200 && ai.data.text.includes('Ahmed Benali'), 'Assistant : synthèse patient', ai.data.engine);
  const guard = await admin('POST', '/assistant/run', { task: 'ask', text: 'Quel antibiotique prescrire ?' });
  ok(/ne peux pas établir de diagnostic/.test(guard.data.text), 'Assistant : refus de diagnostic');

  // 2FA : initialisation
  const tf = await admin('POST', '/auth/2fa/setup'); ok(tf.status === 200 && tf.data.qr.startsWith('data:image/png'), '2FA : QR code généré');

  // RBAC : secrétaire
  const sec = agent(); await sec('POST', '/auth/login', { email: 'accueil.fes@atlas-dentaire.ma', password: 'Nacre2026!' });
  ok((await sec('GET', '/consultations')).status === 403, 'Secrétaire : consultations interdites (403)');
  ok((await sec('GET', '/payments')).status === 200, 'Secrétaire : paiements autorisés');
  const pp = (await sec('GET', '/patients/p1')).data; ok(pp.patient.history === null && pp.patient.allergies.length, 'Secrétaire : antécédents masqués, allergies visibles');
  // Cloisonnement : la secrétaire de Meknès ne voit pas les patients de Fès
  const mk = agent(); await mk('POST', '/auth/login', { email: 'accueil.meknes@atlas-dentaire.ma', password: 'Nacre2026!' });
  ok((await mk('GET', '/patients/p1', null, { 'X-Clinic': 'fes' })).status === 404, 'Isolation : patient d’un autre cabinet inaccessible');

  // Réservation publique
  const pub = agent();
  const days = (await pub('GET', `/public/days?clinic=fes&type=detartrage&dentist=any`)).data; const day = days.find(d => d.count > 0);
  const slots = (await pub('GET', `/public/slots?clinic=fes&type=detartrage&dentist=any&date=${day.date}`)).data;
  const bk = await pub('POST', '/public/book', { clinic: 'fes', type: 'detartrage', dentist: 'any', date: day.date, time: slots[0].time, slotDentist: slots[0].dentistId, first: 'Test', last: 'Smoke', phone: '06 99 88 77 66', consent: true });
  ok(bk.status === 201, 'Réservation en ligne', `${bk.data.date} ${bk.data.start}`);
  const bk2 = await pub('POST', '/public/book', { clinic: 'fes', type: 'detartrage', dentist: 'any', date: day.date, time: slots[0].time, slotDentist: slots[0].dentistId, first: 'Test', last: 'Double', phone: '06 99 88 77 55', consent: true });
  ok(bk2.status === 409, 'Double réservation du même créneau refusée');

  // Portail patient (OTP)
  const pt = agent();
  const otp = await pt('POST', '/portal/otp/request', { phone: '06 99 88 77 66' });
  ok(otp.status === 200 && otp.data.devCode, 'Portail : code SMS émis');
  ok((await pt('POST', '/portal/otp/verify', { phone: '06 99 88 77 66', code: '000000' })).status === 401, 'Portail : mauvais code refusé');
  ok((await pt('POST', '/portal/otp/verify', { phone: '06 99 88 77 66', code: otp.data.devCode })).status === 200, 'Portail : connexion');
  const me = await pt('GET', '/portal/me'); ok(me.status === 200 && me.data.next, 'Portail : prochain RDV visible');
  ok((await pt('GET', '/patients/p1')).status === 401, 'Portail : aucun accès aux routes cabinet');
  const msg = await pt('POST', '/portal/messages', { text: 'Bonjour, test de messagerie.' }); ok(msg.status === 201, 'Portail : message au cabinet');

  // Portail : paiement + devis (patient démo)
  const ah = agent(); await ah('POST', '/portal/demo', { patientId: 'p1' });
  const invs = (await ah('GET', '/portal/invoices')).data; const open = invs.invoices.find(i => i.due > 0);
  const op = await ah('POST', `/portal/invoices/${open.id}/pay`, { amount: 500 }); ok(op.status === 201, 'Portail : paiement en ligne');
  const quotes = (await ah('GET', '/portal/plans')).data.quotes;
  ok(Array.isArray(quotes), 'Portail : devis listés', quotes.length + ' devis');

  console.log(fails ? `\n${fails} échec(s)` : '\nTous les tests passent.'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
