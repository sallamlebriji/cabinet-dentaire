/* Odontogramme interactif — numérotation FDI, 5 faces, couches initial / prévu / réalisé */
import { useState } from 'react';
import { post, useAction, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { Async, Icon, Segmented, useRun, cx } from '../ui';
import { fmt } from '../lib/format';

export const COND = {
  carie: { label: 'Carie', color: '#CF4759', surf: true, act: true }, obturation: { label: 'Obturation', color: '#2C6BCB', surf: true, act: true },
  couronne: { label: 'Couronne', color: '#B89457', act: true }, implant: { label: 'Implant', color: '#12264A', act: true }, extraction: { label: 'Extraction', color: '#CF4759', act: true },
  absente: { label: 'Dent absente', color: '#9AA5B4' }, endo: { label: 'Traitement endodontique', color: '#7568D1', act: true }, gingival: { label: 'Problème gingival', color: '#D08A24', act: true },
  prothese: { label: 'Prothèse', color: '#3AA6A0', act: true }, autre: { label: 'Autre observation', color: '#6A788D' }
};
const LAYERS = { initial: 'Situation initiale', planned: 'Traitement prévu', done: 'Traitement réalisé' };
const UP = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
const LO = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];
const POS = ['', 'incisive centrale', 'incisive latérale', 'canine', 'première prémolaire', 'deuxième prémolaire', 'première molaire', 'deuxième molaire', 'troisième molaire'];
const QUAD = ['', 'supérieure droite', 'supérieure gauche', 'inférieure gauche', 'inférieure droite'];
export const toothName = n => (POS[+n[1]] + ' ' + QUAD[+n[0]]).replace(/^./, c => c.toUpperCase());

function toothSvg(n, t, upper, mode) {
  const pos = +n[1]; const w = [0, 22, 19, 21, 22, 22, 31, 29, 27][pos]; const cx = 22;
  const layers = mode === 'all' ? ['initial', 'done', 'planned'] : [mode];
  const all = layers.flatMap(l => (t[l] || []).map(m => ({ layer: l, ...m })));
  const has = c => all.find(m => m.c === c);
  const absent = has('absente') || (has('extraction') && has('extraction').layer === 'done');
  const implant = has('implant'); const crownTop = 34, crownH = 24; const rootLen = pos === 3 ? 32 : pos <= 2 ? 27 : pos <= 5 ? 25 : 22;
  const rootsN = pos >= 6 || pos === 4 ? 2 : 1;
  const rp = (x, sp) => `M${x - 4.5},${crownTop + 2} C${x - 4},${crownTop - rootLen * 0.6} ${x - 2 + sp},${crownTop - rootLen} ${x + sp},${crownTop - rootLen} C${x + 2 + sp},${crownTop - rootLen} ${x + 4},${crownTop - rootLen * 0.6} ${x + 4.5},${crownTop + 2}Z`;
  const rootAttr = 'fill="#F4F6F9" stroke="#B5C2D1" stroke-width="1"';
  const roots = implant ? '' : rootsN === 1 ? `<path d="${rp(cx, 0)}" ${rootAttr}/>` : `<path d="${rp(cx - w / 4 + 1, -1.5)}" ${rootAttr}/><path d="${rp(cx + w / 4 - 1, 1.5)}" ${rootAttr}/>`;
  const crownD = `M${cx - w / 2},${crownTop + 4} Q${cx - w / 2},${crownTop} ${cx - w / 2 + 5},${crownTop} L${cx + w / 2 - 5},${crownTop} Q${cx + w / 2},${crownTop} ${cx + w / 2},${crownTop + 4} L${cx + w / 2 - 1},${crownTop + crownH - 6} Q${cx + w / 2 - 2},${crownTop + crownH} ${cx + w / 2 - 8},${crownTop + crownH} L${cx - w / 2 + 8},${crownTop + crownH} Q${cx - w / 2 + 2},${crownTop + crownH} ${cx - w / 2 + 1},${crownTop + crownH - 6}Z`;
  let fill = '#FFFFFF', stroke = '#9FB0C4', sw = 1.1, dashC = '';
  const cr = has('couronne') || has('prothese');
  if (cr) { fill = cr.c === 'couronne' ? '#F6EEDC' : '#E4F4F2'; stroke = COND[cr.c].color; sw = 2.2; if (cr.layer === 'planned') dashC = 'stroke-dasharray="3 2"'; }
  const dash = m => (m.layer === 'planned' ? 'stroke-dasharray="3 2" opacity=".75"' : '');
  let extra = '';
  if (implant) extra += `<g ${dash(implant)}><rect x="${cx - 4}" y="${crownTop - 26}" width="8" height="28" rx="2" fill="${COND.implant.color}" opacity=".9"/>${[0, 1, 2, 3, 4].map(i => `<line x1="${cx - 6}" x2="${cx + 6}" y1="${crownTop - 22 + i * 5}" y2="${crownTop - 20 + i * 5}" stroke="${COND.implant.color}" stroke-width="1.6"/>`).join('')}</g>`;
  const endo = has('endo'); if (endo && !implant) { const xs = rootsN === 1 ? [cx] : [cx - w / 4 + 1, cx + w / 4 - 1]; extra += xs.map((x, i) => `<line x1="${x}" y1="${crownTop + 6}" x2="${x + (rootsN === 1 ? 0 : i ? 1.5 : -1.5)}" y2="${crownTop - rootLen + 4}" stroke="${COND.endo.color}" stroke-width="2.6" stroke-linecap="round" ${dash(endo)}/>`).join(''); }
  const ging = has('gingival'); if (ging) extra += `<path d="M${cx - w / 2 - 2},${crownTop + 1} q3,-4 6,0 t6,0 t6,0 t6,0 t6,0 t6,0" fill="none" stroke="${COND.gingival.color}" stroke-width="1.8" ${dash(ging)}/>`;
  const ext = has('extraction'); if (ext && ext.layer !== 'done') extra += `<g stroke="${COND.extraction.color}" stroke-width="2.6" stroke-linecap="round" ${dash(ext)}><line x1="${cx - 12}" y1="${crownTop - rootLen + 2}" x2="${cx + 12}" y2="${crownTop + crownH - 2}"/><line x1="${cx + 12}" y1="${crownTop - rootLen + 2}" x2="${cx - 12}" y2="${crownTop + crownH - 2}"/></g>`;
  if (has('autre')) extra += `<circle cx="${cx + w / 2 - 3}" cy="${crownTop + 3}" r="3.2" fill="${COND.autre.color}"/>`;
  const sc = all.filter(m => COND[m.c].surf); if (sc.length) { const m = sc[sc.length - 1]; extra += `<circle cx="${cx}" cy="${crownTop + crownH / 2}" r="3.4" fill="${COND[m.c].color}" ${dash(m)}/>`; }
  if (mode === 'all') { if (t.planned && t.planned.length) extra += `<circle cx="${cx - w / 2 + 2}" cy="${crownTop + crownH - 2}" r="3" fill="#CF4759"/>`; if (t.done && t.done.length) extra += `<circle cx="${cx + w / 2 - 2}" cy="${crownTop + crownH - 2}" r="3" fill="#2C6BCB"/>`; }
  const g = `<g opacity="${absent ? 0.18 : 1}">${roots}<path d="${crownD}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${dashC}/></g>${extra}`;
  return `<svg viewBox="0 0 44 64" style="width:100%;max-width:44px;height:auto">${upper ? g : `<g transform="translate(0,64) scale(1,-1)">${g}</g>`}</svg>`;
}
function surfSvg(n, t, upper, mode) {
  const q = +n[0]; const leftIsM = q === 2 || q === 3; const layers = mode === 'all' ? ['initial', 'done', 'planned'] : [mode]; const fills = {};
  layers.forEach(l => (t[l] || []).forEach(m => { if (COND[m.c].surf && m.s) m.s.forEach(s => { fills[s] = { color: COND[m.c].color, planned: l === 'planned' }; }); }));
  const top = upper ? 'V' : 'L', bot = upper ? 'L' : 'V', left = leftIsM ? 'M' : 'D', right = leftIsM ? 'D' : 'M';
  const f = s => (fills[s] ? `fill="${fills[s].color}" ${fills[s].planned ? 'fill-opacity=".45" stroke-dasharray="2 1.5"' : ''}` : '');
  return `<svg viewBox="0 0 34 34" style="width:78%;max-width:34px;height:auto"><path class="surf" ${f(top)} d="M1,1 L33,1 L23,11 L11,11Z"/><path class="surf" ${f(bot)} d="M1,33 L33,33 L23,23 L11,23Z"/><path class="surf" ${f(left)} d="M1,1 L11,11 L11,23 L1,33Z"/><path class="surf" ${f(right)} d="M33,1 L23,11 L23,23 L33,33Z"/><rect class="surf" ${f('O')} x="11" y="11" width="12" height="12"/></svg>`;
}

export default function Odontogram({ pid }) {
  const q = useGet(`/odontogram/${pid}`);
  return <Async q={q}>{data => <Chart pid={pid} data={data} />}</Async>;
}

function Chart({ pid, data }) {
  const { can } = useAuth(); const act = useAction(); const run = useRun(); const edit = can('clinical.edit');
  const [mode, setMode] = useState('all'); const [tooth, setTooth] = useState(null); const [layer, setLayer] = useState('planned'); const [cond, setCond] = useState('carie'); const [surf, setSurf] = useState([]); const [note, setNote] = useState('');
  const teeth = data.teeth || {}; const t = tooth ? teeth[tooth] || {} : {};
  const count = l => Object.values(teeth).reduce((s, x) => s + ((x[l] || []).length), 0);
  const col = (n, upper) => { const tt = teeth[n] || {}; const num = <span className="num">{n}</span>;
    return <div key={n} className={cx('tooth', tooth === n && 'sel')} title={toothName(n)} onClick={() => { setTooth(n); setSurf([]); setNote(''); }}>
      {upper && num}{!upper && <span dangerouslySetInnerHTML={{ __html: surfSvg(n, tt, false, mode) }} style={{ display: 'contents' }} />}
      <span dangerouslySetInnerHTML={{ __html: toothSvg(n, tt, upper, mode) }} style={{ display: 'contents' }} />
      {upper && <span dangerouslySetInnerHTML={{ __html: surfSvg(n, tt, true, mode) }} style={{ display: 'contents' }} />}{!upper && num}
    </div>; };
  const half = (arr, up) => <><div className="odonto-half left">{arr.slice(0, 8).map(n => col(n, up))}</div><div className="odonto-half">{arr.slice(8).map(n => col(n, up))}</div></>;
  const apply = () => run(() => act(() => post(`/odontogram/${pid}/marks`, { tooth, layer, cond, surfaces: COND[cond].surf ? surf : undefined, note: note || undefined })), `Dent ${tooth} : ${COND[cond].label} — ${LAYERS[layer].toLowerCase()}`, 'tooth').catch(() => { });
  const list = tooth ? Object.keys(LAYERS).flatMap(l => (t[l] || []).map((m, i) => ({ l, i, m }))) : [];
  const lbl = { fontSize: 11, color: 'var(--faint)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600 };
  return <div className="grid odo-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 330px', alignItems: 'start' }}>
    <div className="col gap-16" style={{ minWidth: 0 }}>
      <div className="card"><div className="card-body">
        <div className="row between wrap mb-16"><Segmented value={mode} onChange={setMode} options={[['all', 'Vue globale'], ['initial', 'Situation initiale'], ['planned', 'Traitement prévu'], ['done', 'Traitement réalisé']]} />
          <div className="row gap-6 small"><span className="badge tone-navy">{count('initial')} initial</span><span className="badge st-noshow">{count('planned')} prévu</span><span className="badge st-confirme">{count('done')} réalisé</span></div></div>
        <div className="odonto">
          <div className="row between" style={{ minWidth: 560, padding: '0 14px 8px', ...lbl }}><span>Droite patient</span><span>Maxillaire</span><span>Gauche patient</span></div>
          <div className="odonto-arch">{half(UP, true)}</div><div className="odonto-sep" /><div className="odonto-arch">{half(LO, false)}</div>
          <div className="row between" style={{ minWidth: 560, padding: '8px 14px 0', ...lbl }}><span /><span>Mandibule</span><span /></div>
        </div>
        <div className="odonto-legend">{Object.values(COND).map(c => <span key={c.label}><i style={{ background: c.color }} />{c.label}</span>)}<span className="faint">· Tracé pointillé = prévu</span></div>
      </div></div>
      <div className="card"><div className="card-head"><div><h3>Historique des modifications</h3><div className="sub">Chaque changement est horodaté et attribué</div></div></div>
        <div className="card-body"><div className="list">{data.history.slice(0, 14).map(h => <div key={h.id} className="li"><span className={cx('badge', h.action === 'retrait' ? 'st-annule' : h.layer === 'planned' ? 'st-noshow' : h.layer === 'done' ? 'st-confirme' : 'tone-navy')} style={{ minWidth: 42, justifyContent: 'center' }}>{h.tooth}</span><div className="grow small"><b>{h.action === 'retrait' ? 'Retrait' : h.action === 'realise' ? 'Réalisé' : 'Ajout'}</b> · {(COND[h.cond] || { label: h.cond }).label} — {LAYERS[h.layer]}</div><div className="xs muted right">{fmt.date(h.date)}<br />{h.user}</div></div>)}{!data.history.length && <div className="small muted">Aucune modification</div>}</div></div></div>
    </div>
    <div className="odo-panel" style={{ position: 'sticky', top: 80 }}>
      {!tooth ? <div className="card"><div className="card-body center" style={{ padding: '40px 20px' }}><Icon name="tooth" size={40} style={{ margin: '0 auto 10px', color: 'var(--line-2)' }} /><b>Sélectionnez une dent</b><p className="small muted mt-4">Cliquez sur une dent pour consulter ou renseigner son état.</p></div></div>
        : <div className="card"><div className="card-head"><div><h3>Dent {tooth}</h3><div className="sub">{toothName(tooth)}</div></div><button className="btn ghost sm icon" onClick={() => setTooth(null)}><Icon name="x" /></button></div>
          <div className="card-body">
            <div className="xs muted mb-8">État enregistré</div>
            <div className="col gap-6">{list.map(({ l, i, m }) => <div key={l + i} className="row" style={{ padding: '7px 10px', border: '1px solid var(--line)', borderRadius: 9 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: COND[m.c].color }} /><div className="grow small"><b>{COND[m.c].label}</b>{m.s && m.s.length ? ' · ' + m.s.join('') : ''}{m.note ? ' · ' + m.note : ''}<div className="xs muted">{LAYERS[l]}</div></div>
              {edit && l === 'planned' && <button className="btn xs" title="Marquer comme réalisé" onClick={() => run(() => act(() => post(`/odontogram/${pid}/complete`, { tooth, index: i })), 'Traitement marqué comme réalisé').catch(() => { })}><Icon name="check" /></button>}
              {edit && <button className="btn xs ghost" title="Retirer" onClick={() => run(() => act(() => post(`/odontogram/${pid}/remove`, { tooth, layer: l, index: i })), 'Élément retiré').catch(() => { })}><Icon name="trash" /></button>}</div>)}
              {!list.length && <div className="small muted">Dent saine — aucun élément renseigné.</div>}</div>
            {edit ? <>
              <div className="divider" /><div className="xs muted mb-8">Couche</div>
              <div className="btn-group layer-tabs" style={{ width: '100%', display: 'flex' }}>{Object.entries(LAYERS).map(([k, v]) => <button key={k} data-layer={k} className={layer === k ? 'on' : ''} style={{ flex: 1, fontSize: 12, padding: '0 6px' }} onClick={() => setLayer(k)}>{v.replace('Traitement ', '').replace('Situation ', '')}</button>)}</div>
              <div className="xs muted mt-12 mb-8">Élément</div>
              <div className="cond-grid">{Object.entries(COND).map(([k, v]) => <button key={k} className={cx('cond-btn', cond === k && 'on')} onClick={() => setCond(k)}><i style={{ background: v.color }} />{v.label}</button>)}</div>
              {COND[cond].surf && <><div className="xs muted mt-12 mb-8">Faces concernées</div><div className="surf-pick">{[['O', 'Occlusale'], ['M', 'Mésiale'], ['D', 'Distale'], ['V', 'Vestibulaire'], ['L', 'Linguale']].map(([k, l]) => <label key={k} title={l}><input type="checkbox" checked={surf.includes(k)} onChange={e => setSurf(s => (e.target.checked ? [...s, k] : s.filter(x => x !== k)))} /><span>{k}</span></label>)}</div></>}
              <div className="field mt-12"><input className="input sm" value={note} onChange={e => setNote(e.target.value)} placeholder="Observation (optionnel)" /></div>
              <div className="row mt-12"><button className="btn primary grow" onClick={apply}><Icon name="check" />Enregistrer</button>{layer === 'planned' && COND[cond].act && <button className="btn" title="Ajouter au plan de traitement" onClick={() => run(() => act(() => post(`/odontogram/${pid}/to-plan`, { tooth, cond })), r => `« ${r.label} » ajouté au plan de traitement`, 'clipboard').catch(() => { })}><Icon name="clipboard" />Au plan</button>}</div>
            </> : <p className="xs muted mt-12"><Icon name="lock" size={12} style={{ display: 'inline' }} /> Lecture seule pour votre rôle.</p>}
          </div></div>}
    </div>
    <style>{'@media (max-width:1100px){.odo-grid{grid-template-columns:1fr!important}.odo-panel{position:static!important}}'}</style>
  </div>;
}
