import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { post, useAction, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { Async, Badge, Chips, Field, Icon, Kpi, Modal, PageHead, Progress, Segmented, useRun } from '../ui';
import { D, fmt } from '../lib/format';

export default function Stock() {
  const { can, clinic, clinicById } = useAuth(); const act = useAction(); const run = useRun(); const nav = useNavigate();
  const [cat, setCat] = useState('all'); const [alert, setAlert] = useState('all'); const [q, setQ] = useState(''); const [open, setOpen] = useState(false);
  const res = useGet('/products'); const t = D.today();
  return <>
    <PageHead title="Stock dentaire" sub="Matériel, consommables, seuils et dates d’expiration" actions={can('stock.manage') && <><button className="btn" onClick={() => run(() => act(() => post('/products/auto-order')), r => `${r.length} commande(s) brouillon créée(s)`, 'truck').then(() => nav('/app/fournisseurs')).catch(() => { })}><Icon name="truck" />Commander le stock faible</button><button className="btn primary" onClick={() => setOpen(true)}><Icon name="plus" />Nouveau produit</button></>} />
    <Async q={res}>{all => { const cats = [...new Set(all.map(s => s.cat))]; let list = all;
      if (cat !== 'all') list = list.filter(s => s.cat === cat); if (q) list = list.filter(s => (s.name + ' ' + s.lot).toLowerCase().includes(q.toLowerCase()));
      if (alert === 'low') list = list.filter(s => s.qty <= s.min); if (alert === 'exp') list = list.filter(s => D.diff(t, s.exp) <= 60);
      return <>
        <div className="grid g4 mb-16"><Kpi label="Références" value={all.length} icon="box" tone="tone-blue" foot={<span>{cats.length} catégories</span>} /><Kpi label="Stock faible" value={all.filter(s => s.qty <= s.min).length} icon="alert" tone="tone-red" foot={<span>sous le seuil minimum</span>} /><Kpi label="Bientôt expirés" value={all.filter(s => D.diff(t, s.exp) <= 60).length} icon="clock" tone="tone-amber" foot={<span>≤ 60 jours</span>} /><Kpi label="Valeur du stock" value={fmt.money(all.reduce((s, x) => s + x.qty * x.price, 0))} icon="wallet" tone="tone-gold" /></div>
        <div className="card"><div className="card-body row wrap between" style={{ gap: 10 }}><Chips value={cat} onChange={setCat} options={[['all', 'Toutes'], ...cats.map(c => [c, c])]} />
          <div className="row" style={{ gap: 8 }}><Segmented value={alert} onChange={setAlert} options={[['all', 'Tous'], ['low', 'Stock faible'], ['exp', 'Expiration']]} /><div className="search" style={{ maxWidth: 220 }}><Icon name="search" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Produit, lot…" style={{ paddingRight: 12 }} /></div></div></div>
          <div className="table-wrap"><table className="table responsive"><thead><tr><th>Produit</th>{clinic === 'all' && <th>Site</th>}<th>Stock</th><th className="num">Seuil</th><th>Fournisseur</th><th className="num">Prix</th><th>Lot</th><th>Expiration</th><th /></tr></thead>
            <tbody>{list.map(s => { const low = s.qty <= s.min; const dd = D.diff(t, s.exp);
              return <tr key={s.id}><td data-l="Produit"><div style={{ fontWeight: 500 }}>{s.name}</div><div className="xs muted">{s.cat} · {s.unit}</div></td>{clinic === 'all' && <td data-l="Site">{clinicById(s.clinicId).city}</td>}
                <td data-l="Stock" style={{ minWidth: 160 }}><div className="row"><b className="mono" style={{ minWidth: 24, color: low ? 'var(--danger)' : undefined }}>{s.qty}</b><div className="grow" style={{ maxWidth: 90 }}><Progress value={(s.qty / (s.min * 2.5)) * 100} tone={low ? 'red' : s.qty <= s.min * 1.5 ? 'amber' : 'sage'} /></div>{low && <Badge label="Faible" cls="st-noshow" />}</div></td>
                <td data-l="Seuil" className="num">{s.min}</td><td data-l="Fournisseur" className="small">{s.supplierName}</td><td data-l="Prix" className="num">{fmt.money(s.price)}</td><td data-l="Lot" className="small mono">{s.lot}</td>
                <td data-l="Expiration">{dd <= 60 ? <Badge label={dd < 0 ? 'Expiré' : fmt.date(s.exp)} cls={dd <= 30 ? 'st-noshow' : 'st-attente'} /> : <span className="small">{fmt.date(s.exp)}</span>}</td>
                <td>{can('stock.manage') && <div className="row gap-4"><button className="btn xs icon" title="Sortie de stock" onClick={() => run(() => act(() => post(`/products/${s.id}/adjust`, { delta: -1 }))).catch(() => { })}>−</button><button className="btn xs icon" title="Entrée de stock" onClick={() => run(() => act(() => post(`/products/${s.id}/adjust`, { delta: 1 }))).catch(() => { })}>+</button></div>}</td></tr>; })}</tbody></table></div></div>
      </>; }}</Async>
    {open && <NewProduct onClose={() => setOpen(false)} />}
  </>;
}
function NewProduct({ onClose }) {
  const act = useAction(); const run = useRun(); const sups = useGet('/suppliers');
  const [f, setF] = useState({ name: '', cat: 'Consommables', supplierId: 'sup2', qty: 10, min: 5, unit: 'boîte', price: 100, lot: '', exp: D.add(D.today(), 365) });
  const b = k => ({ value: f[k], onChange: e => setF(s => ({ ...s, [k]: e.target.value })) });
  return <Modal title="Nouveau produit" size="lg" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" onClick={() => run(() => act(() => post('/products', { ...f, qty: +f.qty, min: +f.min, price: +f.price })), 'Produit ajouté au stock', 'box').then(onClose).catch(() => { })}>Ajouter</button></>}>
    <div className="form-grid"><Field label="Désignation" full><input className="input" autoFocus {...b('name')} /></Field>
      <Field label="Catégorie"><select className="select" {...b('cat')}>{['Gants', 'Masques', 'Compresses', 'Anesthésiques', 'Résines', 'Matériaux dentaires', 'Instruments', 'Produits de désinfection', 'Consommables'].map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Fournisseur"><select className="select" {...b('supplierId')}>{(sups.data || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <Field label="Quantité"><input className="input" type="number" {...b('qty')} /></Field><Field label="Seuil minimum"><input className="input" type="number" {...b('min')} /></Field>
      <Field label="Unité"><input className="input" {...b('unit')} /></Field><Field label="Prix unitaire (DH)"><input className="input" type="number" {...b('price')} /></Field>
      <Field label="Lot"><input className="input" {...b('lot')} /></Field><Field label="Date d’expiration"><input className="input" type="date" {...b('exp')} /></Field></div>
  </Modal>;
}
