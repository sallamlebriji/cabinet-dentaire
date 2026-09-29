import { useEffect, useState } from 'react';
import { del, get, patch, post, useAction, useGet } from '../lib/api';
import { useAuth } from '../context/Auth';
import { Async, Card, Field, Icon, Kpi, MapBadge, Modal, PageHead, Tabs, useRun, cx } from '../ui';
import { D, fmt } from '../lib/format';

const OST = { brouillon: ['Brouillon', 'tone-gray'], commandee: ['Commandée', 'st-confirme'], recue: ['Reçue', 'st-termine'] };
const ORDER = ['brouillon', 'commandee', 'recue'];

export default function Suppliers() {
  const { can } = useAuth(); const [tab, setTab] = useState('commandes'); const [open, setOpen] = useState(null); const [create, setCreate] = useState(false);
  const orders = useGet('/orders'); const sups = useGet('/suppliers');
  const supName = id => ((sups.data || []).find(s => s.id === id) || {}).name || '—';
  return <>
    <PageHead title="Fournisseurs" sub="Commandes : Brouillon → Commandée → Reçue · mise à jour automatique du stock" actions={can('stock.manage') && <button className="btn primary" onClick={() => setCreate(true)}><Icon name="plus" />Nouvelle commande</button>} />
    <Async q={orders}>{list => <>
      <div className="grid g4 mb-16"><Kpi label="Brouillons" value={list.filter(o => o.status === 'brouillon').length} icon="edit" tone="tone-gray" /><Kpi label="En cours de livraison" value={list.filter(o => o.status === 'commandee').length} icon="truck" tone="tone-blue" /><Kpi label="Achats (90 j)" value={fmt.money(list.filter(o => o.status === 'recue' && o.received >= D.add(D.today(), -90)).reduce((s, o) => s + o.total, 0))} icon="wallet" tone="tone-gold" /><Kpi label="Fournisseurs actifs" value={(sups.data || []).length} icon="building" tone="tone-sage" /></div>
      <div className="mb-16"><Tabs value={tab} onChange={setTab} tabs={[{ key: 'commandes', label: 'Commandes' }, { key: 'fournisseurs', label: 'Fournisseurs & contacts' }]} /></div>
      {tab === 'commandes' ? <div className="card"><div className="table-wrap"><table className="table responsive"><thead><tr><th>N°</th><th>Fournisseur</th><th>Date</th><th className="num">Lignes</th><th className="num">Montant</th><th>Statut</th></tr></thead>
        <tbody>{list.map(o => <tr key={o.id} className="click" onClick={() => setOpen(o)}><td data-l="N°"><b style={{ fontWeight: 500 }}>{o.number}</b></td><td data-l="Fournisseur">{supName(o.supplierId)}</td><td data-l="Date">{fmt.date(o.date)}</td><td data-l="Lignes" className="num">{o.lines.length}</td><td data-l="Montant" className="num">{fmt.money(o.total)}</td><td data-l="Statut"><MapBadge map={OST} value={o.status} />{o.status === 'commandee' && o.expected && <span className="xs muted"> livraison {fmt.rel(o.expected)}</span>}</td></tr>)}</tbody></table></div></div>
        : <div className="grid g2">{(sups.data || []).map(s => <Card key={s.id}><div className="row"><span className="avatar" style={{ background: 'var(--primary-50)', color: 'var(--primary)' }}><Icon name="truck" size={16} /></span><div><b>{s.name}</b><div className="xs muted">{s.city} · livraison {s.delay} j · ★ {fmt.dec(s.rating)}</div></div></div>
          <div className="chips mt-12">{s.cats.map(c => <span key={c} className="tag">{c}</span>)}</div><div className="divider" />
          <dl className="kv" style={{ gridTemplateColumns: '120px 1fr' }}><dt>Contact</dt><dd>{s.contact}</dd><dt>Téléphone</dt><dd>{s.phone}</dd><dt>Email</dt><dd>{s.email}</dd><dt>Produits</dt><dd>{s.products} références</dd><dt>Historique</dt><dd>{s.orders} commandes · {fmt.money(s.spent)}</dd></dl></Card>)}</div>}
    </>}</Async>
    {open && <OrderModal o={open} supplier={(sups.data || []).find(s => s.id === open.supplierId) || {}} onClose={() => setOpen(null)} />}
    {create && <NewOrder sups={sups.data || []} onClose={() => setCreate(false)} onCreated={o => { setCreate(false); setOpen(o); }} />}
  </>;
}

function OrderModal({ o, supplier, onClose }) {
  const act = useAction(); const run = useRun(); const [lines, setLines] = useState(o.lines); const ci = ORDER.indexOf(o.status);
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const go = (fn, msg, ic) => run(() => act(fn), msg, ic).then(onClose).catch(() => { });
  return <Modal title={`Commande ${o.number}`} size="lg" onClose={onClose} footer={o.status === 'brouillon' ? <><button className="btn danger" onClick={() => go(() => del(`/orders/${o.id}`), 'Brouillon supprimé')}>Supprimer</button><button className="btn primary" onClick={() => go(async () => { await patch(`/orders/${o.id}`, { lines: lines.map(({ product, qty, price }) => ({ product, qty, price })) }); return post(`/orders/${o.id}/place`); }, `Commande envoyée à ${supplier.name}`, 'send')}><Icon name="send" />Passer la commande</button></>
    : o.status === 'commandee' ? <button className="btn success" onClick={() => go(() => post(`/orders/${o.id}/receive`), `Commande reçue · stock mis à jour (${o.lines.length} produits)`, 'box')}><Icon name="check" />Réceptionner</button> : <button className="btn" onClick={onClose}>Fermer</button>}>
    <div className="row between wrap mb-16"><div><b>{supplier.name}</b><div className="xs muted">{supplier.contact} · {supplier.phone} · {supplier.email}</div></div>
      <div className="pipeline">{ORDER.map((s, i) => <span key={s} style={{ display: 'contents' }}>{i > 0 && <div className={cx('pipe-line', i <= ci && 'done')} />}<div className={cx('pipe', i < ci && 'done', i === ci && 'cur')}><span className="d">{i < ci ? '✓' : i + 1}</span>{OST[s][0]}</div></span>)}</div></div>
    <table className="table"><thead><tr><th>Produit</th><th className="num">Stock actuel</th><th className="num">Quantité</th><th className="num">Prix</th><th className="num">Total</th></tr></thead>
      <tbody>{lines.map((l, k) => <tr key={k}><td>{l.name}</td><td className="num">{l.stock}</td><td className="num">{o.status === 'brouillon' ? <input type="number" className="input sm" min="0" value={l.qty} onChange={e => setLines(a => a.map((x, i) => (i === k ? { ...x, qty: +e.target.value } : x)))} style={{ width: 80, textAlign: 'right' }} /> : l.qty}</td><td className="num">{fmt.money(l.price)}</td><td className="num">{fmt.money(l.qty * l.price)}</td></tr>)}</tbody>
      <tfoot><tr><td colSpan={4}>Total commande</td><td className="num">{fmt.money(total)}</td></tr></tfoot></table>
    {o.status === 'recue' ? <p className="small muted mt-12">Reçue le {fmt.date(o.received)} · stock mis à jour automatiquement.</p> : o.status === 'commandee' ? <p className="small muted mt-12">Commandée le {fmt.date(o.date)}{o.expected ? ` · livraison prévue ${fmt.rel(o.expected)}` : ''}. À la réception, le stock sera mis à jour automatiquement.</p> : null}
  </Modal>;
}

function NewOrder({ sups, onClose, onCreated }) {
  const act = useAction(); const run = useRun(); const [sup, setSup] = useState(sups[0] && sups[0].id); const prods = useGet('/products'); const [qty, setQty] = useState({});
  const list = (prods.data || []).filter(p => p.supplierId === sup);
  useEffect(() => { setQty(Object.fromEntries(list.map(p => [p.id, p.qty <= p.min ? p.min * 2 - p.qty : 0]))); }, [sup, prods.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = () => run(() => act(() => post('/orders', { supplierId: sup, lines: Object.entries(qty).filter(([, q]) => q > 0).map(([product, q]) => ({ product, qty: q })) })), 'Brouillon de commande créé', 'truck').then(async o => { const all = await get('/orders'); onCreated(all.find(x => x.id === o.id)); }).catch(() => { });
  return <Modal title="Nouvelle commande fournisseur" size="lg" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" onClick={save}>Créer le brouillon</button></>}>
    <Field label="Fournisseur"><select className="select" value={sup} onChange={e => setSup(e.target.value)}>{sups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
    <table className="table mt-16"><thead><tr><th>Produit</th><th className="num">Stock</th><th className="num">Seuil</th><th className="num">Qté à commander</th></tr></thead>
      <tbody>{list.map(p => <tr key={p.id}><td>{p.name}</td><td className="num" style={p.qty <= p.min ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>{p.qty}</td><td className="num">{p.min}</td><td className="num"><input type="number" className="input sm" min="0" value={qty[p.id] ?? 0} onChange={e => setQty(s => ({ ...s, [p.id]: +e.target.value }))} style={{ width: 80, textAlign: 'right' }} /></td></tr>)}</tbody></table>
  </Modal>;
}
