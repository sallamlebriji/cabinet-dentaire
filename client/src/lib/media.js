/* Imagerie de démonstration générée en SVG (radiographies, photos, empreintes) — aucune vraie image patient */
function rng(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function toothRow(cx, cy, w, n, up, r, bright = 1) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = cx - w / 2 + (i + .5) * w / n; const k = Math.abs(i - (n - 1) / 2) / (n / 2); const y = cy + (up ? -1 : 1) * k * k * 38;
    const tw = w / n * (k > .55 ? 1.05 : .82); const th = 52 - k * 8; const root = 44 - k * 6;
    const op = (.55 + r() * .25) * bright;
    const cy2 = up ? y - th : y;
    s += `<rect x="${x - tw / 2}" y="${cy2}" width="${tw}" height="${th}" rx="${tw / 3}" fill="rgba(235,240,245,${op})"/>`;
    s += `<path d="M${x - tw / 4},${up ? cy2 : cy2 + th} L${x - tw / 7},${up ? cy2 - root : cy2 + th + root} L${x + tw / 7},${up ? cy2 - root : cy2 + th + root} L${x + tw / 4},${up ? cy2 : cy2 + th} Z" fill="rgba(200,210,222,${op * .6})"/>`;
    if (r() < .12) s += `<rect x="${x - tw / 4}" y="${cy2 + th * .2}" width="${tw / 2}" height="${th / 3}" rx="3" fill="rgba(255,255,255,.95)"/>`;
  }
  return s;
}
function xray(kind = 'pano', seed = 1) {
  const r = rng(seed + 7); const id = 'x' + seed + kind;
  const filt = `<defs><radialGradient id="${id}g" cx="50%" cy="50%" r="65%"><stop offset="0" stop-color="#3A4656"/><stop offset=".6" stop-color="#18202B"/><stop offset="1" stop-color="#070B10"/></radialGradient><filter id="${id}b"><feGaussianBlur stdDeviation="1.6"/></filter></defs>`;
  if (kind === 'pano' || kind === 'cbct') {
    return `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">${filt}<rect width="640" height="360" fill="url(#${id}g)"/><g filter="url(#${id}b)"><path d="M40,210 Q320,380 600,210 L600,250 Q320,420 40,250 Z" fill="rgba(200,210,220,.25)"/><path d="M60,120 Q320,40 580,120 L580,95 Q320,10 60,95 Z" fill="rgba(200,210,220,.2)"/>${toothRow(320, 170, 440, 14, true, r)}${toothRow(320, 190, 420, 14, false, r)}<ellipse cx="80" cy="120" rx="28" ry="40" fill="rgba(210,220,230,.18)"/><ellipse cx="560" cy="120" rx="28" ry="40" fill="rgba(210,220,230,.18)"/></g><text x="16" y="342" fill="rgba(255,255,255,.55)" font-family="Inter,sans-serif" font-size="11">${kind === 'cbct' ? 'CBCT' : 'PANORAMIQUE'} · R</text><text x="624" y="342" fill="rgba(255,255,255,.55)" font-family="Inter,sans-serif" font-size="11" text-anchor="end">L</text></svg>`;
  }
  if (kind === 'ceph') {
    return `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">${filt}<rect width="640" height="360" fill="url(#${id}g)"/><g filter="url(#${id}b)" fill="rgba(210,220,230,.28)"><path d="M250,30 C420,10 520,90 520,170 C520,230 480,250 470,280 C460,320 420,340 380,330 L330,320 C300,300 300,260 280,240 C230,220 190,160 200,100 C205,60 220,40 250,30Z"/><path d="M380,230 L470,240 L460,262 L380,255Z" fill="rgba(240,245,250,.5)"/><path d="M380,262 L455,268 L445,290 L380,285Z" fill="rgba(240,245,250,.45)"/></g><text x="16" y="342" fill="rgba(255,255,255,.55)" font-family="Inter,sans-serif" font-size="11">TÉLÉRADIOGRAPHIE DE PROFIL</text></svg>`;
  }
  // retro / bitewing
  const n = kind === 'bitewing' ? 4 : 3;
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = 120 + i * (400 / (n - 1 || 1)) - (n === 3 ? 0 : 0); const tw = kind === 'bitewing' ? 110 : 120;
    if (kind === 'bitewing') { s += `<rect x="${x - tw / 2}" y="60" width="${tw}" height="100" rx="30" fill="rgba(230,236,242,.6)"/><rect x="${x - tw / 2}" y="200" width="${tw}" height="100" rx="30" fill="rgba(230,236,242,.55)"/>`; if (r() < .4) s += `<rect x="${x - 20}" y="70" width="40" height="30" rx="6" fill="#fff"/>`; }
    else { s += `<rect x="${x - tw / 2}" y="50" width="${tw}" height="120" rx="40" fill="rgba(230,236,242,.6)"/><path d="M${x - 35},170 L${x - 20},330 L${x - 5},170 M${x + 5},170 L${x + 20},330 L${x + 35},170" stroke="rgba(210,220,230,.5)" stroke-width="22" fill="none" stroke-linecap="round"/>`; if (i === 1 && seed % 2) s += `<path d="M${x - 20},175 L${x - 18},320 M${x + 20},175 L${x + 18},320" stroke="#fff" stroke-width="5"/><rect x="${x - 30}" y="80" width="60" height="50" rx="10" fill="rgba(255,255,255,.9)"/>`; }
  }
  return `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">${filt}<rect width="640" height="360" fill="url(#${id}g)"/><g filter="url(#${id}b)"><rect x="0" y="175" width="640" height="190" fill="rgba(160,170,180,.14)"/>${s}</g><text x="16" y="342" fill="rgba(255,255,255,.55)" font-family="Inter,sans-serif" font-size="11">${kind === 'bitewing' ? 'BITEWING' : 'RÉTRO-ALVÉOLAIRE'}</text></svg>`;
}
function smile(shade = '#F4EEDF', seed = 1, crowd = false) {
  const r = rng(seed + 3); const id = 's' + seed + shade.slice(1);
  let teeth = '';
  const widths = [30, 36, 42, 54, 54, 42, 36, 30];
  let x = 320 - widths.reduce((a, b) => a + b, 0) / 2;
  widths.forEach((w, i) => { const dy = crowd ? (r() - .5) * 18 : 0; const rot = crowd ? (r() - .5) * 14 : 0; teeth += `<rect x="${x + 1}" y="${150 + Math.abs(i - 3.5) * 4 + dy}" width="${w - 2}" height="${74 - Math.abs(i - 3.5) * 5}" rx="12" fill="${shade}" stroke="rgba(160,130,90,.25)" transform="rotate(${rot} ${x + w / 2} 190)"/>`; x += w; });
  let low = ''; x = 320 - 170;
  [34, 38, 38, 34, 34, 38, 38, 34].forEach((w, i) => { low += `<rect x="${x + 1}" y="${226 + (crowd ? (r() - .5) * 10 : 0)}" width="${w - 2}" height="46" rx="10" fill="${shade}" opacity=".92" stroke="rgba(160,130,90,.2)"/>`; x += w; });
  return `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="${id}sk" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#C98E73"/><stop offset="1" stop-color="#8E5A45"/></radialGradient><linearGradient id="${id}li" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B8615C"/><stop offset="1" stop-color="#8F3F3E"/></linearGradient></defs><rect width="640" height="360" fill="url(#${id}sk)"/><path d="M120,190 Q320,90 520,190 Q320,330 120,190Z" fill="#3A1616"/><path d="M150,178 Q320,130 490,178 L490,200 Q320,150 150,200Z" fill="#D98B8B"/>${teeth}${low}<path d="M110,190 Q320,70 530,190 Q320,140 110,190Z" fill="url(#${id}li)"/><path d="M110,190 Q320,350 530,190 Q320,300 110,190Z" fill="url(#${id}li)"/></svg>`;
}
function intra(seed = 1) { return smile('#F1E8D2', seed, false); }
function scan3d(seed = 1) {
  const r = rng(seed); let s = '';
  for (let i = 0; i < 14; i++) { const a = Math.PI * (i / 13); const x = 320 - Math.cos(a) * 200; const y = 250 - Math.sin(a) * 150; s += `<ellipse cx="${x}" cy="${y}" rx="${18 + (i > 3 && i < 10 ? 0 : 6)}" ry="22" fill="url(#sc${seed})" stroke="rgba(120,160,200,.6)"/>`; }
  return `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="sc${seed}" cx="35%" cy="30%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#9DB9D6"/></radialGradient><linearGradient id="scb${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0F1E36"/><stop offset="1" stop-color="#1E3F78"/></linearGradient></defs><rect width="640" height="360" fill="url(#scb${seed})"/><path d="M110,260 Q320,20 530,260 Q320,120 110,260Z" fill="rgba(230,150,160,.35)" stroke="rgba(255,255,255,.2)"/>${s}<text x="16" y="342" fill="rgba(255,255,255,.6)" font-family="Inter,sans-serif" font-size="11">EMPREINTE OPTIQUE · STL</text></svg>`;
}
function pdfThumb() {
  return `<svg viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg"><rect width="640" height="480" fill="#EEF1F5"/><rect x="190" y="40" width="260" height="400" rx="8" fill="#fff" stroke="#D8DEE6"/><rect x="215" y="70" width="80" height="12" rx="3" fill="#12264A"/><rect x="215" y="100" width="210" height="6" rx="3" fill="#D8DEE6"/><rect x="215" y="116" width="180" height="6" rx="3" fill="#D8DEE6"/><rect x="215" y="150" width="210" height="6" rx="3" fill="#E7EBF0"/><rect x="215" y="166" width="200" height="6" rx="3" fill="#E7EBF0"/><rect x="215" y="182" width="170" height="6" rx="3" fill="#E7EBF0"/><rect x="215" y="220" width="210" height="60" rx="6" fill="#F6F7F9"/><rect x="330" y="380" width="95" height="30" rx="4" fill="#EEF4FC"/><rect x="380" y="52" width="50" height="22" rx="4" fill="#CF4759"/><text x="405" y="67" fill="#fff" font-family="Inter,sans-serif" font-size="11" text-anchor="middle" font-weight="700">PDF</text></svg>`;
}

export function mediaSvg(doc) {
  switch (doc.kind) {
    case 'intra': return intra(doc.seed);
    case 'scan': return scan3d(doc.seed);
    case 'pdf': return pdfThumb(doc.title);
    default: return xray(doc.kind, doc.seed);
  }
}
export { xray, smile };
