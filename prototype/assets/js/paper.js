/* Génération de documents (aperçu papier + impression PDF) — partagé app / portail */
(function () {
  const N = Nacre, D = N.D; const { icon, fmt, esc } = N.ui;

  function head(clinicId, title, number, date, extra = '') {
    const S = N.S; const c = N.clinic(clinicId || 'fes');
    return `<div class="doc-head"><div class="doc-logo"><div class="brand-mark" style="width:46px;height:46px;border-radius:13px">${icon('tooth').replace('<svg', '<svg style="width:24px;height:24px"')}</div><div><div style="font-family:var(--serif);font-size:19px;color:var(--navy);font-weight:500">${esc(S.settings.group)}</div><div style="font-size:11.5px;color:#6A788D;line-height:1.5">${esc(c.name)} · ${esc(c.address)}<br>Tél. ${c.phone} · ICE ${S.settings.ice}</div></div></div>
      <div style="text-align:right"><div class="doc-title">${title}</div>${number ? `<div style="font-weight:600;margin-top:2px">${esc(number)}</div>` : ''}<div style="font-size:12px;color:#6A788D">${esc(c.city)}, le ${fmt.date(date)}</div>${extra}</div></div>`;
  }
  function patientBlock(p, right = '') {
    return `<div style="display:flex;justify-content:space-between;gap:20px;margin-top:22px;flex-wrap:wrap"><div style="background:#F6F7F9;border-radius:10px;padding:12px 16px;min-width:240px"><div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:#9AA5B4;font-weight:600">Patient</div><div style="font-weight:600;font-size:14px;margin-top:2px">${esc(p.first)} ${esc(p.last)}</div><div style="font-size:12px;color:#6A788D">${esc(p.address)}<br>${p.phone} · Dossier ${p.fileNo}${p.cover ? '<br>Couverture : ' + esc(p.cover) : ''}</div></div>${right}</div>`;
  }
  function lines(items, withDisc = false) {
    return `<table><thead><tr><th>Désignation</th><th>Dent</th><th style="text-align:right">Qté</th><th style="text-align:right">Prix unitaire</th>${withDisc ? '<th style="text-align:right">Remise</th>' : ''}<th style="text-align:right">Total</th></tr></thead><tbody>${items.map(i => { const line = withDisc ? i.qty * i.price - (i.disc || 0) : i.qty * i.price; return `<tr><td>${esc(i.label)}</td><td>${esc(i.tooth || '—')}</td><td style="text-align:right">${i.qty}</td><td style="text-align:right">${fmt.money(i.price)}</td>${withDisc ? `<td style="text-align:right">${i.disc ? '− ' + fmt.money(i.disc) : '—'}</td>` : ''}<td style="text-align:right;font-weight:600">${fmt.money(line)}</td></tr>`; }).join('')}</tbody></table>`;
  }
  const foot = () => `<div class="foot">${esc(N.S.settings.legal)} · RC ${N.S.settings.rc} · ICE ${N.S.settings.ice} · Document généré par Nacre — Dental Practice OS</div>`;

  function quoteTotals(q) { const sub = q.items.reduce((s, i) => s + i.qty * i.price, 0); const lineDisc = q.items.reduce((s, i) => s + (i.disc || 0), 0); const after = sub - lineDisc; const glob = Math.round(after * (q.discount || 0) / 100); return { sub, lineDisc, glob, total: after - glob }; }
  function quote(q) {
    const p = N.patient(q.patient); const d = N.staff(q.dentist); const t = quoteTotals(q);
    return `<div class="paper">${head(p.clinic, 'Devis', q.number, q.date, `<div style="font-size:12px;color:#6A788D">Valable jusqu’au ${fmt.date(q.valid)}</div>`)}
      ${patientBlock(p, `<div style="font-size:12px;color:#6A788D;text-align:right">Praticien<br><b style="color:#1b2533;font-size:13px">${esc(N.name(d))}</b><br>${esc(d.spec || '')}</div>`)}
      ${lines(q.items, true)}
      <div class="totals"><div><span>Sous-total</span><span>${fmt.money(t.sub)}</span></div>${t.lineDisc ? `<div><span>Remises sur actes</span><span>− ${fmt.money(t.lineDisc)}</span></div>` : ''}${q.discount ? `<div><span>Remise globale (${q.discount} %)</span><span>− ${fmt.money(t.glob)}</span></div>` : ''}<div class="grand"><span>Total TTC</span><span>${fmt.money(t.total)}</span></div></div>${q.status === 'accepte' ? '<div style="text-align:right"><span class="stamp">Accepté</span></div>' : ''}
      <div style="margin-top:22px;font-size:12px;color:#33445C"><b>Conditions</b><p style="margin-top:4px;color:#6A788D">${esc(q.conditions || '')}</p><p style="margin-top:6px;color:#9AA5B4;font-size:11px">Actes médicaux exonérés de TVA. Le plan de traitement peut être ajusté selon l’évolution clinique, après information du patient.</p></div>
      <div class="sign"><div>Signature du praticien<br><span style="font-family:var(--serif);font-size:18px;color:var(--navy)">${esc(N.name(d))}</span></div><div>Bon pour accord — signature du patient${q.signature ? `<br><span style="font-family:var(--serif);font-size:18px;color:var(--navy)">${esc(q.signature)}</span><br><span style="font-size:11px">Signé électroniquement le ${fmt.date(q.acceptedAt)}</span>` : ''}</div></div>${foot()}</div>`;
  }
  function invoice(inv) {
    const p = N.patient(inv.patient); const paid = N.invoicePaid(inv); const total = N.invoiceTotal(inv); const sub = inv.items.reduce((s, i) => s + i.qty * i.price, 0);
    const pays = N.S.payments.filter(x => x.invoice === inv.id);
    return `<div class="paper">${head(inv.clinic, 'Facture', inv.number, inv.date, `<div style="font-size:12px;color:#6A788D">Échéance : ${fmt.date(inv.due)}</div>`)}
      ${patientBlock(p, `<div style="font-size:12px;color:#6A788D;text-align:right">Praticien<br><b style="color:#1b2533;font-size:13px">${esc(N.name(N.staff(inv.dentist)))}</b><br>INPE ${N.S.settings.inpe}</div>`)}
      ${lines(inv.items)}
      <div class="totals"><div><span>Sous-total</span><span>${fmt.money(sub)}</span></div>${inv.discount ? `<div><span>Remise (${inv.discount} %)</span><span>− ${fmt.money(sub - total)}</span></div>` : ''}<div class="grand"><span>Total</span><span>${fmt.money(total)}</span></div><div><span>Déjà réglé</span><span>${fmt.money(paid)}</span></div><div style="font-weight:700;color:${total - paid > 0 ? '#CF4759' : '#2E9C6E'}"><span>Reste à payer</span><span>${fmt.money(total - paid)}</span></div></div>${paid >= total ? '<div style="text-align:right"><span class="stamp">Acquittée</span></div>' : ''}
      ${pays.length ? `<div style="margin-top:18px;font-size:12px"><b>Règlements</b>${pays.map(x => `<div style="display:flex;justify-content:space-between;color:#6A788D;padding:3px 0;border-bottom:1px dashed #EEF1F5"><span>${fmt.date(x.date)} · ${N.ui.METHOD[x.method]} · ${x.kind}</span><span>${fmt.money(x.amount)}</span></div>`).join('')}</div>` : ''}
      <p style="margin-top:18px;font-size:11px;color:#9AA5B4">Actes médicaux exonérés de TVA (art. 91 CGI). Paiement par espèces, carte, virement ou en ligne depuis l’espace patient.</p>${foot()}</div>`;
  }
  function prescription(rx) {
    const p = N.patient(rx.patient); const d = N.staff(rx.dentist);
    return `<div class="paper">${head(p.clinic, 'Ordonnance', '', rx.date)}
      <div style="margin-top:22px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px"><div><div style="font-size:12px;color:#6A788D">${esc(N.name(d))} — ${esc(d.spec || 'Chirurgien-dentiste')}</div><div style="font-size:12px;color:#6A788D">INPE ${N.S.settings.inpe}</div></div><div style="text-align:right"><b>${p.sex === 'F' ? 'Mme' : 'M.'} ${esc(p.first)} ${esc(p.last)}</b><div style="font-size:12px;color:#6A788D">${N.age(p.dob)} ans</div></div></div>
      <div style="margin-top:28px">${rx.items.map((i, k) => `<div style="padding:12px 0;border-bottom:1px solid #EEF1F5"><div style="font-weight:600;font-size:14px">${k + 1}. ${esc(i.drug)}</div><div style="color:#33445C;margin-top:3px">${esc(i.pos)}</div><div style="color:#6A788D;font-size:12px;margin-top:2px">Durée : ${esc(i.dur)}</div></div>`).join('')}</div>
      ${rx.notes ? `<p style="margin-top:14px;font-size:12px;color:#6A788D">${esc(rx.notes)}</p>` : ''}
      <div class="sign" style="justify-content:flex-end"><div style="max-width:260px">Signature et cachet<br><span style="font-family:var(--serif);font-size:18px;color:var(--navy)">${esc(N.name(d))}</span></div></div>${foot()}</div>`;
  }
  function generic(kind, { patient, dentist, date, title, body }) {
    const p = N.patient(patient); const d = N.staff(dentist);
    return `<div class="paper">${head(p.clinic, title, '', date)}${patientBlock(p)}
      <div style="margin-top:26px;font-size:13.5px;line-height:1.75;color:#1b2533;white-space:pre-wrap">${esc(body)}</div>
      <div class="sign" style="justify-content:flex-end"><div style="max-width:260px">Signature et cachet<br><span style="font-family:var(--serif);font-size:18px;color:var(--navy)">${esc(N.name(d))}</span></div></div>${foot()}</div>`;
  }
  function plan(pl) {
    const p = N.patient(pl.patient); const d = N.staff(pl.dentist); const tot = pl.items.reduce((s, i) => s + i.price, 0); const paid = pl.items.reduce((s, i) => s + (i.paid || 0), 0);
    const ST = { propose: 'Proposé', accepte: 'Accepté', planifie: 'Planifié', encours: 'En cours', termine: 'Terminé' };
    return `<div class="paper">${head(p.clinic, 'Plan de traitement', pl.title, D.todayYmd())}${patientBlock(p, `<div style="font-size:12px;color:#6A788D;text-align:right">Praticien<br><b style="color:#1b2533;font-size:13px">${esc(N.name(d))}</b></div>`)}
      <table><thead><tr><th>#</th><th>Traitement</th><th>Dent</th><th>Statut</th><th>Date prévue</th><th style="text-align:right">Prix</th></tr></thead><tbody>${pl.items.map((i, k) => `<tr><td>${k + 1}</td><td>${esc(i.label)}</td><td>${esc(i.tooth)}</td><td>${ST[i.status]}</td><td>${i.planned ? fmt.date(i.planned) : '—'}</td><td style="text-align:right">${fmt.money(i.price)}</td></tr>`).join('')}</tbody></table>
      <div class="totals"><div class="grand"><span>Total traitement</span><span>${fmt.money(tot)}</span></div><div><span>Payé</span><span>${fmt.money(paid)}</span></div><div style="font-weight:700"><span>Reste</span><span>${fmt.money(tot - paid)}</span></div></div>${foot()}</div>`;
  }

  function print(html) {
    const area = document.createElement('div'); area.className = 'print-area'; area.innerHTML = html; document.body.appendChild(area);
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); area.remove(); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => { window.print(); setTimeout(done, 500); }, 60);
  }

  N.Paper = { quote, invoice, prescription, generic, plan, print, quoteTotals };
})();
