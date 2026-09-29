/* Landing page : icônes, mockups vivants, tarifs, démo */
(function () {
  const N = Nacre; const { icon, fmt, esc, toast, modal, formData } = N.ui;

  // Icônes déclaratives
  document.querySelectorAll('[data-i]').forEach(el => { el.insertAdjacentHTML('afterbegin', icon(el.dataset.i)); const s = el.style; if (s.width) { const svg = el.querySelector('svg'); svg.style.width = s.width; svg.style.height = s.height; } if (!el.classList.contains('ic') && !el.classList.contains('brand-mark')) el.style.display = 'inline-flex'; });

  // Navigation
  const nav = document.getElementById('snav');
  addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 8), { passive: true });

  // Apparition au défilement
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Graphiques
  const months = ['avr.', 'mai', 'juin', 'juil.', 'août', 'sept.'];
  document.getElementById('heroChart').innerHTML = N.ui.barChart({ labels: months, series: [{ name: 'CA', data: [248, 262, 279, 255, 290, 328].map(v => v * 1000), color: '#2C6BCB' }], height: 150, fmtV: fmt.money });
  const days = Array.from({ length: 14 }, (_, i) => String(15 + i));
  const r = (a, b) => days.map((_, i) => Math.round((a + Math.sin(i * 1.7) * b + (i % 7 === 6 ? -a * .8 : 0)) / 50) * 50);
  document.getElementById('payChart').innerHTML = N.ui.barChart({ labels: days, series: [{ name: 'Espèces', color: '#5E9F8D', data: r(3200, 1200) }, { name: 'Carte', color: '#2C6BCB', data: r(5200, 1800) }, { name: 'Virement', color: '#12264A', data: r(2400, 1500) }, { name: 'En ligne', color: '#B89457', data: r(1500, 700) }], stacked: true, height: 220, fmtV: fmt.money });
  document.getElementById('donutMini').innerHTML = N.ui.donut({ data: [['Consultation', 142, '#2C6BCB'], ['Détartrage', 88, '#3AA6A0'], ['Soin carie', 76, '#D08A24'], ['Orthodontie', 64, '#7568D1'], ['Prothèse', 31, '#B89457'], ['Implantologie', 12, '#12264A']].map(([label, value, color]) => ({ label, value, color })), center: '413', sub: 'RDV' });
  N.ui.tipBind(document);

  // Mini agenda
  const cols = [['Dr. Bennani', '#2C6BCB', [[0, 1, 'consultation', 'F. El Amrani'], [1.2, 1, 'detartrage', 'I. Sqalli'], [2.5, .8, 'carie', 'M. Kettani']]], ['Dr. Alaoui', '#12264A', [[0, .6, 'controle', 'Y. Chraibi'], [1.5, 1.5, 'implantologie', 'K. Mernissi']]], ['Dr. Tazi', '#7568D1', [[.3, .6, 'orthodontie', 'A. Filali'], [1, .6, 'orthodontie', 'Y. Skalli'], [2.2, .6, 'orthodontie', 'I. Guessous'], [3, .6, 'consultation', 'A. Hajji']]]];
  document.getElementById('agcols').innerHTML = cols.map(([n, c, items]) => `<div style="position:relative;border-right:1px solid var(--line)"><div style="height:26px;border-bottom:1px solid var(--line);font-weight:600;padding:6px 8px;display:flex;gap:6px;align-items:center"><i style="width:8px;height:8px;border-radius:50%;background:${c}"></i>${n}</div>${items.map(([s, d, t, p]) => { const T = N.S.types[t]; return `<div class="appt" style="top:${26 + s * 54}px;height:${d * 54 - 4}px;left:4px;right:4px;background:${T.color}14;border-left-color:${T.color};cursor:default"><b>${p}</b><div class="at">${T.label}</div></div>`; }).join('')}</div>`).join('');

  // Mini odontogramme
  const teeth = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
  const marks = { '16': 'crown', '14': 'carie', '11': 'obt', '21': 'obt', '26': 'endo', '28': 'abs', '24': 'implant' };
  document.getElementById('odoMini').innerHTML = `<div class="odonto" style="padding:16px 8px"><div style="display:flex;justify-content:center;gap:2px">${teeth.map(n => { const pos = +n[1]; const w = [0, 18, 16, 18, 19, 19, 26, 25, 23][pos]; const m = marks[n]; const sel = n === '26';
    return `<div class="tooth ${sel ? 'sel' : ''}" style="max-width:42px"><span class="num">${n}</span><svg viewBox="0 0 40 70" style="width:100%;max-width:36px;height:auto"><g opacity="${m === 'abs' ? .2 : 1}">${m === 'implant' ? `<rect x="16" y="6" width="8" height="30" rx="2" fill="#12264A"/>${[0, 1, 2, 3, 4].map(i => `<line x1="13" x2="27" y1="${10 + i * 5}" y2="${12 + i * 5}" stroke="#12264A" stroke-width="1.6"/>`).join('')}` : `<path d="M${20 - w / 4},38 C${20 - w / 4},20 18,6 20,6 C22,6 ${20 + w / 4},20 ${20 + w / 4},38Z" fill="#F4F6F9" stroke="#B5C2D1"/>`}<rect x="${20 - w / 2}" y="36" width="${w}" height="26" rx="8" fill="${m === 'crown' ? '#F6EEDC' : '#fff'}" stroke="${m === 'crown' ? '#B89457' : '#9FB0C4'}" stroke-width="${m === 'crown' ? 2.2 : 1.1}" ${m === 'crown' ? 'stroke-dasharray="3 2"' : ''}/></g>${m === 'endo' ? '<line x1="20" y1="42" x2="20" y2="10" stroke="#7568D1" stroke-width="2.6" stroke-linecap="round"/>' : ''}${m === 'carie' ? '<circle cx="20" cy="49" r="4" fill="#CF4759"/>' : ''}${m === 'obt' ? '<circle cx="20" cy="49" r="4" fill="#2C6BCB"/>' : ''}</svg></div>`; }).join('')}</div></div>`;

  // Avant / après
  const ba = document.getElementById('baMini');
  ba.querySelector('[data-smile="0"]').innerHTML = N.ui.smile('#E9D6A8', 4, true);
  ba.querySelector('[data-smile="1"]').innerHTML = N.ui.smile('#FBF8F1', 4, false);
  const after = ba.querySelector('.ba-after'), h = ba.querySelector('.ba-handle');
  const set = x => { const b = ba.getBoundingClientRect(); const p = Math.min(100, Math.max(0, (x - b.left) / b.width * 100)); after.style.clipPath = `inset(0 0 0 ${p}%)`; h.style.left = p + '%'; };
  let on = false; ba.addEventListener('pointerdown', e => { on = true; ba.setPointerCapture(e.pointerId); set(e.clientX); }); ba.addEventListener('pointermove', e => on && set(e.clientX)); ba.addEventListener('pointerup', () => on = false);
  let t = 0; const auto = setInterval(() => { if (on) return clearInterval(auto); t += .03; const b = ba.getBoundingClientRect(); set(b.left + b.width * (.5 + Math.sin(t) * .3)); }, 40);
  ba.addEventListener('pointerdown', () => clearInterval(auto), { once: true });

  // Tarifs
  document.querySelectorAll('[data-bill]').forEach(b => b.onclick = () => { document.querySelectorAll('[data-bill]').forEach(x => x.classList.toggle('on', x === b)); document.querySelectorAll('[data-p]').forEach(p => p.textContent = fmt.num(b.dataset.bill === 'y' ? Math.round(+p.dataset.p * .85 / 10) * 10 : +p.dataset.p)); });

  // Demande de démo
  document.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    modal({ title: 'Demander une démonstration', body: `<p class="muted small mb-16">Un expert Nacre vous rappelle sous 24h ouvrées pour organiser une démonstration personnalisée de 30 minutes.</p><form class="form-grid" id="fd"><div class="field"><label>Nom complet *</label><input class="input" name="name" required></div><div class="field"><label>Cabinet / clinique *</label><input class="input" name="cabinet"></div><div class="field"><label>Ville</label><input class="input" name="city"></div><div class="field"><label>Nombre de praticiens</label><select class="select" name="size"><option>1</option><option>2 à 4</option><option>5 à 10</option><option>Plus de 10 / multi-sites</option></select></div><div class="field"><label>Téléphone *</label><input class="input" name="phone"></div><div class="field"><label>Email</label><input class="input" type="email" name="email"></div><div class="field full"><label>Votre besoin</label><textarea class="textarea" name="msg" placeholder="Logiciel actuel, priorités…"></textarea></div></form>`,
      foot: `<button class="btn" data-close>Annuler</button><button class="btn primary" data-s>Envoyer la demande</button>`,
      onMount: m => m.querySelector('[data-s]').onclick = () => { const d = formData(m.querySelector('#fd')); if (!d.name.trim() || !d.phone.trim()) return toast('Nom et téléphone requis', 'alert'); N.S.demoRequests.push(Object.assign({ at: new Date().toISOString() }, d)); N.save(); m.querySelector('.modal-body').innerHTML = `<div class="center" style="padding:20px 0"><div class="success-mark">${icon('check')}</div><h3 class="serif" style="font-size:22px;color:var(--navy)">Merci ${esc(d.name.split(' ')[0])} !</h3><p class="muted mt-8">Votre demande a bien été enregistrée. Nous vous contactons très vite au ${esc(d.phone)}.</p><a class="btn primary mt-16" href="app.html">Explorer la démo en attendant</a></div>`; m.querySelector('.modal-foot').remove(); } });
  }));
})();
