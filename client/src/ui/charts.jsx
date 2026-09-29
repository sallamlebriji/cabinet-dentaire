/* Graphiques SVG légers (sans dépendance) avec infobulles */
import { useId, useState } from 'react';
import { fmt } from '../lib/format';

function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }

function ChartBox({ children, style, height }) {
  const [tip, setTip] = useState(null);
  const move = e => { const t = e.target.closest && e.target.closest('[data-tip]'); if (!t) return setTip(null); const r = e.currentTarget.getBoundingClientRect(); setTip({ x: e.clientX - r.left, y: e.clientY - r.top, html: t.getAttribute('data-tip') }); };
  return <div className="chart" style={style} onMouseMove={move} onMouseLeave={() => setTip(null)}>
    {children}
    <div className="chart-tip" style={{ opacity: tip ? 1 : 0, left: tip ? tip.x : 0, top: tip ? tip.y : 0 }} dangerouslySetInnerHTML={{ __html: tip ? tip.html : '' }} />
  </div>;
}

export function BarChart({ labels, series, height = 220, stacked = false, fmtV = fmt.num }) {
  const W = 640, H = height, pl = 44, pr = 8, pt = 10, pb = 26; const cw = W - pl - pr, chh = H - pt - pb;
  const totals = labels.map((_, i) => (stacked ? series.reduce((s, x) => s + x.data[i], 0) : Math.max(...series.map(x => x.data[i]))));
  const max = niceMax(Math.max(0, ...totals)); const gw = cw / labels.length; const bw = Math.min(28, gw * (stacked ? 0.56 : 0.7 / series.length));
  const grid = [0, 1, 2, 3, 4].map(i => { const y = pt + chh - (chh * i) / 4; return <g key={i}><line className="grid-line" x1={pl} x2={W - pr} y1={y} y2={y} /><text className="axis-label" x={pl - 8} y={y + 3.5} textAnchor="end">{fmt.k((max * i) / 4)}</text></g>; });
  const bars = labels.flatMap((l, i) => {
    const cx = pl + gw * i + gw / 2; let acc = 0;
    const out = series.map((s, si) => {
      const v = s.data[i] || 0; const h = (chh * v) / max; const x = stacked ? cx - bw / 2 : cx - (bw * series.length) / 2 + si * bw + 1;
      const y = pt + chh - h - (stacked ? (chh * acc) / max : 0); const w = stacked ? bw : bw - 2; const r = Math.min(5, bw / 2, h); acc += v;
      if (!h) return null;
      return <path key={si} className="bar" fill={s.color} data-tip={`${l} · ${s.name}<br><b>${fmtV(v)}</b>`} d={`M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`} />;
    });
    if (labels.length <= 14 || i % 2 === 0) out.push(<text key="t" className="axis-label" x={cx} y={H - 8} textAnchor="middle">{l}</text>);
    return <g key={i}>{out}</g>;
  });
  return <ChartBox><svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: H }}>{grid}{bars}</svg></ChartBox>;
}

export function LineChart({ labels, series, height = 220, fmtV = fmt.num, min0 = true }) {
  const id = useId().replace(/:/g, '');
  const W = 640, H = height, pl = 44, pr = 12, pt = 12, pb = 26; const cw = W - pl - pr, chh = H - pt - pb;
  const all = series.flatMap(s => s.data); const max = niceMax(Math.max(...all) * 1.05); const mn = min0 ? 0 : Math.floor(Math.min(...all) * 0.9);
  const X = i => pl + (labels.length === 1 ? cw / 2 : (cw * i) / (labels.length - 1)); const Y = v => pt + chh - (chh * (v - mn)) / (max - mn || 1);
  return <ChartBox><svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: H }}>
    <defs>{series.map((s, si) => <linearGradient key={si} id={`${id}-${si}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={s.color} stopOpacity=".22" /><stop offset="1" stopColor={s.color} stopOpacity="0" /></linearGradient>)}</defs>
    {[0, 1, 2, 3, 4].map(i => { const v = mn + ((max - mn) * i) / 4; const y = Y(v); return <g key={i}><line className="grid-line" x1={pl} x2={W - pr} y1={y} y2={y} /><text className="axis-label" x={pl - 8} y={y + 3.5} textAnchor="end">{fmt.k(v)}</text></g>; })}
    {series.map((s, si) => {
      const pts = s.data.map((v, i) => [X(i), Y(v)]);
      const d = pts.map((p, i) => { if (!i) return `M${p[0]},${p[1]}`; const q = pts[i - 1]; const mx = (q[0] + p[0]) / 2; return `C${mx},${q[1]} ${mx},${p[1]} ${p[0]},${p[1]}`; }).join(' ');
      return <g key={si}>
        {si === 0 && <path d={`${d} L${pts[pts.length - 1][0]},${pt + chh} L${pts[0][0]},${pt + chh} Z`} fill={`url(#${id}-${si})`} />}
        <path d={d} fill="none" stroke={s.color} strokeWidth="2.2" strokeDasharray={s.dash ? '5 5' : undefined} strokeLinecap="round" />
        {pts.map((p, i) => <g key={i}><circle cx={p[0]} cy={p[1]} r="3.2" fill="#fff" stroke={s.color} strokeWidth="2" /><rect data-tip={`${labels[i]} · ${s.name}<br><b>${fmtV(s.data[i])}</b>`} x={p[0] - cw / labels.length / 2} y={pt} width={cw / labels.length} height={chh} fill="transparent" /></g>)}
      </g>;
    })}
    {labels.map((l, i) => (labels.length <= 12 || i % 2 === 0) && <text key={i} className="axis-label" x={X(i)} y={H - 8} textAnchor="middle">{l}</text>)}
  </svg></ChartBox>;
}

export function Donut({ data, size = 170, thick = 20, center = '', sub = '', fmtV = fmt.num }) {
  const tot = data.reduce((s, d) => s + d.value, 0) || 1; const r = (size - thick) / 2; const c = 2 * Math.PI * r; let off = 0;
  return <div className="donut-wrap">
    <ChartBox style={{ width: size, flex: 'none' }}><svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF1F5" strokeWidth={thick} />
      {data.map((d, i) => { const len = (c * d.value) / tot; const el = <circle key={i} data-tip={`${d.label}<br><b>${fmtV(d.value)}</b> · ${Math.round((d.value / tot) * 100)} %`} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={thick} strokeDasharray={`${Math.max(0, len - (data.length > 1 ? 2 : 0))} ${c}`} strokeDashoffset={-off} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ cursor: 'pointer' }} />; off += len; return el; })}
      <text x="50%" y={size / 2 + (sub ? 0 : 7)} textAnchor="middle" className="donut-center">{center}</text>
      {sub && <text x="50%" y={size / 2 + 18} textAnchor="middle" className="axis-label">{sub}</text>}
    </svg></ChartBox>
    <div className="col gap-6" style={{ flex: 1, minWidth: 150 }}>{data.map((d, i) => <div key={i} className="row between small"><span className="row gap-6"><i style={{ width: 9, height: 9, borderRadius: 3, background: d.color, display: 'inline-block' }} />{d.label}</span><b className="mono">{fmtV(d.value)}</b></div>)}</div>
  </div>;
}

export function Spark({ data, color = '#2C6BCB', w = 84, h = 30 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data); const X = i => (i * w) / (data.length - 1); const Y = v => h - 2 - ((h - 4) * (v - min)) / (max - min || 1);
  const d = data.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ');
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity=".08" /><path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function HBars({ rows, color = 'var(--primary)', fmtV = fmt.num }) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return <div className="col" style={{ gap: 12 }}>{rows.map((r, i) => <div key={i}>
    <div className="row between small" style={{ marginBottom: 5 }}><span className="row gap-6">{r.dot && <i style={{ width: 8, height: 8, borderRadius: '50%', background: r.dot, display: 'inline-block' }} />}{r.label}</span><b className="mono">{fmtV(r.value)}</b></div>
    <div className="progress"><i style={{ width: `${(r.value / max) * 100}%`, background: r.color || color }} /></div>
  </div>)}</div>;
}
