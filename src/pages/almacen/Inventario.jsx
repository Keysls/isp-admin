import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
// En los imports de lucide-react, agrega FileDown:
import { Check, FileDown, Package, Plus, Search, Send, TrendingDown, Wifi, X } from 'lucide-react';import { onusApi, productosApi, stockApi, tecnicosApi, sedesApi } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Card, Spinner, Btn, Input, Select, Badge, Modal as UIModal } from '../../components/ui';

const CSS = `
  .ainv-btns    { flex-wrap: wrap; }
  .ainv-table   { display: block; }
  .ainv-cards   { display: none; }

  @media (max-width: 1080px) {
    .ainv-btns  { flex-direction: column !important; }
    .ainv-btns > * { width: 100% !important; justify-content: center; }
    .ainv-table { display: none !important; }
    .ainv-cards { display: flex !important; flex-direction: column; gap: 10px; padding: 10px; }
    .ainv-envio-pendiente { flex-direction: column !important; }
    .ainv-envio-pendiente > div:last-child { width: 100%; display: flex; gap: 8px; }
    .ainv-envio-pendiente > div:last-child > * { flex: 1; justify-content: center; }
  }

  .ainv-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ainv-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('ainv-responsive-css')) {
  const s = document.createElement('style');
  s.id = 'ainv-responsive-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

function useMiSede() {
  const usuario = useAuthStore(s => s.usuario);
  return { usuario, sedeId: usuario?.sedeId, sedeNombre: usuario?.sede?.nombre || 'Mi sede', puedeEnviarStock: usuario?.sede?.puedeEnviarStock || false };
}

function isOnuProduct(p) {
  return `${p.categoria || ''} ${p.producto || p.nombre || ''}`.toLowerCase().includes('onu');
}

function Header({ title, subtitle, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--txt)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{title}</h1>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--txt-2)' }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function SedeBadge({ sedeNombre }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--txt)' }}>
      {sedeNombre}
    </div>
  );
}

function StockBar({ stock, minimo }) {
  if (!minimo) return <strong style={{ color: 'var(--txt)' }}>{stock}</strong>;
  const pct = Math.min(100, Math.round((stock / (minimo * 3)) * 100));
  const low = stock <= minimo;
  const warn = stock <= minimo * 1.5;
  const color = low ? 'var(--red)' : warn ? '#D97706' : '#16A34A';
  return (
    <div>
      <div style={{ fontWeight: 800, color, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{stock}</div>
      <div style={{ width: 76, height: 5, background: 'var(--border)', borderRadius: 999, marginTop: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
}

/** Metros disponibles — solo para productos medibles (ej: rollos de fibra) */
function MetrosCell({ p }) {
  if (!p.es_medible || !p.metros_por_unidad) return null;
  const metros = p.cantidad * p.metros_por_unidad;
  const minimoMetros = (p.stock_minimo || 0) * p.metros_por_unidad;
  const low   = minimoMetros > 0 && metros <= minimoMetros;
  const warn  = minimoMetros > 0 && metros <= minimoMetros * 1.5;
  const color = metros === 0 ? 'var(--red)' : low ? 'var(--red)' : warn ? '#D97706' : '#16A34A';
  return (
    <div>
      <span style={{ fontWeight: 700, color, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        {metros.toLocaleString()}
      </span>
      <span style={{ fontSize: 10, color: 'var(--txt-3)', marginLeft: 3 }}>m</span>
      <div style={{ fontSize: 10, color: 'var(--txt-3)' }}>× {p.metros_por_unidad.toLocaleString()} m/u</div>
    </div>
  );
}

function Toolbar({ q, setQ }) {
  return (
    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <Search size={16} color="var(--txt-3)" />
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o código..." style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--txt)' }} />
    </div>
  );
}

function ProductSearch({ label, search, setSearch, products, selected, onAdd }) {
  const selectedIds = selected.map(i => String(i.producto_id));
  const results = search
    ? products.filter(p => !selectedIds.includes(String(p.producto_id)) && `${p.producto} ${p.codigo || ''} ${p.categoria || ''}`.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : [];
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 11px', height: 38, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-2)' }}>
        <Search size={16} color="var(--txt-3)" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre o código..." style={{ border: 0, outline: 0, flex: 1, fontSize: 13, background: 'transparent', color: 'var(--txt)' }} />
      </div>
      {results.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginTop: 6, maxHeight: 220, overflowY: 'auto', background: 'var(--bg-card)' }}>
          {results.map(p => (
            <button key={p.producto_id} type="button" onClick={() => { onAdd(p); setSearch(''); }}
              style={{ width: '100%', border: 0, background: 'transparent', padding: '9px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', borderBottom: '1px solid var(--border)', transition: 'background .12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span><strong>{p.producto}</strong>{p.codigo && <span style={{ marginLeft: 8, color: 'var(--txt-3)', fontSize: 12 }}>{p.codigo}</span>}</span>
              {p.cantidad != null && <span style={{ color: 'var(--txt-3)', fontSize: 12 }}>disp: <strong>{p.cantidad}</strong></span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemsList({ stock, items, setItems, showDisponible = true, sedeId }) {
  const update = (idx, key, value) => setItems(items.map((it, i) => i === idx ? { ...it, [key]: value } : it));
  const remove = idx => setItems(items.filter((_, i) => i !== idx));
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Productos seleccionados ({items.length})</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.length === 0 && <div style={{ color: 'var(--txt-3)', fontSize: 13, padding: '8px 0' }}>Busca y selecciona productos.</div>}
        {items.map((item, idx) => {
          const prod = stock.find(s => String(s.producto_id) === String(item.producto_id));
          const esOnu = isOnuProduct(prod || {});
          return (
            <div key={idx}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 8, alignItems: 'center', padding: 8, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-3)' }}>
                <div>
                  <strong style={{ fontSize: 13 }}>{prod?.producto || 'Producto'}</strong>
                  <div style={{ color: 'var(--txt-3)', fontSize: 11 }}>{prod?.codigo || '—'}{showDisponible && prod?.cantidad != null ? ` · disp. ${prod.cantidad}` : ''}</div>
                </div>
                {esOnu
                  ? <div style={{ height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', background: 'var(--bg-2)', fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)', minWidth: 120 }}>
                      {(item.onu_ids || []).length} ONU{(item.onu_ids || []).length !== 1 ? 's' : ''}
                    </div>
                  : <input style={{ height: 34, border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', background: 'var(--bg-2)', color: 'var(--txt)', fontSize: 13 }} type="number" min="1" max={prod?.cantidad || undefined} placeholder="Cantidad" value={item.cantidad} onChange={e => update(idx, 'cantidad', e.target.value)} />
                }
                <Btn variant="danger" size="sm" onClick={() => remove(idx)}><X size={15} /></Btn>
              </div>
              {esOnu && sedeId && (
                <OnuPanelInline sedeId={sedeId} productoId={item.producto_id} selectedIds={item.onu_ids || []} onChange={ids => update(idx, 'onu_ids', ids)} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OnuPanelInline({ sedeId, productoId, selectedIds, onChange }) {
  const [filter, setFilter] = useState('');
  const onusQ = useQuery({
    queryKey: ['onus-panel-inline', sedeId, productoId],
    enabled: Boolean(sedeId && productoId),
    queryFn: () => onusApi.disponibles({ sedeId, producto_id: productoId }).then(r => r.data),
  });
  const onus = (onusQ.data || []).filter(o => !filter || o.codigo_pon.toLowerCase().includes(filter.toLowerCase()));
  const selected = selectedIds.map(String);
  const toggle = (id) => {
    const s = String(id);
    onChange(selected.includes(s) ? selected.filter(v => v !== s) : [...selected, s]);
  };
  return (
    <div style={{ marginTop: 6, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-2)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
        Seleccionar ONUs ({selected.length} seleccionadas)
      </div>
      <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar por código PON..."
        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-3)', color: 'var(--txt)', fontSize: 12, marginBottom: 8 }} />
      {onusQ.isLoading && <div style={{ fontSize: 12, color: 'var(--txt-3)' }}>Cargando...</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {onus.map(onu => {
          const isSel = selected.includes(String(onu.id));
          return (
            <button key={onu.id} type="button" onClick={() => toggle(onu.id)}
              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', cursor: 'pointer', border: isSel ? 'none' : '1px solid var(--border)', background: isSel ? 'var(--accent)' : 'var(--bg-3)', color: isSel ? '#fff' : 'var(--txt)', transition: 'all 0.12s' }}>
              {onu.codigo_pon}
            </button>
          );
        })}
        {!onusQ.isLoading && onus.length === 0 && <div style={{ fontSize: 12, color: 'var(--txt-3)' }}>Sin ONUs disponibles.</div>}
      </div>
    </div>
  );
}

export default function AdminAlmacenInventario() {
  const qc = useQueryClient();
  const { sedeId, sedeNombre, puedeEnviarStock } = useMiSede();
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);
  const [envioSeleccionado, setEnvioSeleccionado] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [entrada, setEntrada] = useState({ comentario: '', items: [] });
  const [asignacion, setAsignacion] = useState({ tecnico_id: '', comentario: '', items: [], onu_ids: [] });
  const [directa, setDirecta] = useState({ comentario: '', items: [], onu_ids: [] });
  const [onuForm, setOnuForm] = useState({ producto_id: '', codigos_pon: [''] });
  const [entradaSearch, setEntradaSearch] = useState('');
  const [asignacionSearch, setAsignacionSearch] = useState('');
  const [directaSearch, setDirectaSearch] = useState('');
  const [envio, setEnvio] = useState({ sede_destino_id: '', guia: '', comentario: '', items: [] });
  const [envioSearch, setEnvioSearch] = useState('');

  const stockQ = useQuery({ queryKey: ['admin-stock-sede', sedeId, q], enabled: Boolean(sedeId), queryFn: () => stockApi.listar({ q: q || undefined }).then(r => r.data) });
  const productosQ = useQuery({ queryKey: ['admin-productos-visibles'], queryFn: () => productosApi.listar().then(r => r.data) });
  const tecnicosQ = useQuery({ queryKey: ['admin-tecnicos-almacen'], queryFn: () => tecnicosApi.listar().then(r => r.data) });
  const onusExistentesQ = useQuery({ queryKey: ['onus-existentes', sedeId, onuForm.producto_id], enabled: Boolean(sedeId && onuForm.producto_id), queryFn: () => onusApi.listar({ sedeId, producto_id: onuForm.producto_id, solo_disponibles: false }).then(r => r.data) });
  const enviosPendientesQ = useQuery({ queryKey: ['envios-pendientes', sedeId], enabled: Boolean(sedeId), queryFn: () => stockApi.listarEnviosPendientes({ sedeId }).then(r => r.data) });
  const sedesQ = useQuery({ queryKey: ['sedes-para-envio'], queryFn: () => sedesApi.listarParaEnvio().then(r => r.data) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-stock-sede'] });
    qc.invalidateQueries({ queryKey: ['admin-stock-stats'] });
    qc.invalidateQueries({ queryKey: ['admin-stock-auditoria'] });
    qc.invalidateQueries({ queryKey: ['onus-panel-inline'] });
  };

  const entradaItemsValidos = entrada.items.filter(i => i.producto_id && Number(i.cantidad) > 0);

  const entradaM = useMutation({ mutationFn: () => stockApi.entrada({ sedeId, comentario: entrada.comentario, items: entradaItemsValidos }), onSuccess: () => { toast.success('Entrada registrada'); setEntrada({ comentario: '', items: [] }); setEntradaSearch(''); setModal(null); refresh(); }, onError: e => toast.error(e.response?.data?.error || 'No se pudo registrar la entrada') });
  const asignarM = useMutation({
    mutationFn: () => {
      const itemsValidos = asignacion.items.filter(i => { const prod = stock.find(s => String(s.producto_id) === String(i.producto_id)); const esOnu = isOnuProduct(prod || {}); return i.producto_id && (esOnu ? (i.onu_ids || []).length > 0 : Number(i.cantidad) > 0); });
      const onuIds = itemsValidos.flatMap(i => i.onu_ids || []);
      const itemsSoloNormales = itemsValidos.filter(i => !isOnuProduct(stock.find(s => String(s.producto_id) === String(i.producto_id)) || {})).map(({ onu_ids, ...rest }) => rest);
      return stockApi.asignarCompleto({ ...asignacion, items: itemsSoloNormales, onu_ids: onuIds });
    },
    onSuccess: () => { toast.success('Asignación registrada'); setAsignacion({ tecnico_id: '', comentario: '', items: [], onu_ids: [] }); setModal(null); refresh(); },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo registrar la asignación'),
  });
  const directaM = useMutation({
    mutationFn: () => {
      const itemsValidos = directa.items.filter(i => { const prod = stock.find(s => String(s.producto_id) === String(i.producto_id)); const esOnu = isOnuProduct(prod || {}); return i.producto_id && (esOnu ? (i.onu_ids || []).length > 0 : Number(i.cantidad) > 0); });
      const onuIds = itemsValidos.flatMap(i => i.onu_ids || []);
      const itemsSoloNormales = itemsValidos.filter(i => !isOnuProduct(stock.find(s => String(s.producto_id) === String(i.producto_id)) || {})).map(({ onu_ids, ...rest }) => rest);
      return stockApi.salidaDirecta({ ...directa, items: itemsSoloNormales, onu_ids: onuIds });
    },
    onSuccess: () => { toast.success('Salida directa registrada'); setDirecta({ comentario: '', items: [], onu_ids: [] }); setModal(null); refresh(); },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo registrar la salida'),
  });
  const registrarOnuM = useMutation({
    mutationFn: () => Promise.all((onuForm.codigos_pon || []).filter(c => c.trim()).map(codigo_pon => onusApi.crear({ sedeId, producto_id: onuForm.producto_id, codigo_pon }))),
    onSuccess: (results) => { toast.success(`${results.length} ONU${results.length !== 1 ? 's' : ''} registrada${results.length !== 1 ? 's' : ''}`); setOnuForm({ producto_id: '', codigos_pon: [''] }); setModal(null); refresh(); },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo registrar la ONU'),
  });
  const confirmarEnvioM = useMutation({ mutationFn: (id) => stockApi.confirmarEnvio(id), onSuccess: () => { toast.success('Envío confirmado, stock actualizado'); setEnvioSeleccionado(null); setModal(null); refresh(); qc.invalidateQueries({ queryKey: ['envios-pendientes'] }); }, onError: e => toast.error(e.response?.data?.error || 'No se pudo confirmar') });
  const cancelarEnvioM = useMutation({ mutationFn: ({ id, motivo }) => stockApi.cancelarEnvio(id, { motivo }), onSuccess: () => { toast.success('Envío cancelado'); setEnvioSeleccionado(null); setMotivoCancelacion(''); setModal(null); refresh(); qc.invalidateQueries({ queryKey: ['envios-pendientes'] }); }, onError: e => toast.error(e.response?.data?.error || 'No se pudo cancelar') });
  const enviarStockM = useMutation({
    mutationFn: () => stockApi.enviarSede({ sedeId, sedeDestinoId: envio.sede_destino_id, guia: envio.guia, comentario: envio.comentario, items: envio.items.filter(i => i.producto_id && Number(i.cantidad) > 0) }),
    onSuccess: () => { toast.success('Envío registrado correctamente'); setEnvio({ sede_destino_id: '', guia: '', comentario: '', items: [] }); setEnvioSearch(''); setModal(null); refresh(); qc.invalidateQueries({ queryKey: ['envios-pendientes'] }); },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo registrar el envío'),
  });

  const rows = stockQ.data || [];
  const productos = productosQ.data || [];
  const stock = stockQ.data || [];
  const productosOnu = stock.filter(s => s.cantidad > 0 && isOnuProduct(s));
  const hayMedibles = rows.some(p => p.es_medible);

  const exportarExcel = () => {
  const datos = rows.map(p => {
    const metros = p.es_medible && p.metros_por_unidad ? p.cantidad * p.metros_por_unidad : null;
    const low = p.stock_minimo > 0 && p.cantidad <= p.stock_minimo;
    return {
      'Código':             p.codigo || '—',
      'Producto':           p.producto,
      'Categoría':          p.categoria || '—',
      'Unidad':             p.unidad || '—',
      'Stock':              p.cantidad,
      'Metros disponibles': metros !== null ? metros : '—',
      'Estado':             low ? 'Bajo stock' : 'Disponible',
    };
  });

  import('xlsx').then(XLSX => {
    const ws = XLSX.utils.json_to_sheet(datos);

    // Anchos de columna
    ws['!cols'] = [
      { wch: 14 }, // Código
      { wch: 32 }, // Producto
      { wch: 18 }, // Categoría
      { wch: 12 }, // Unidad
      { wch: 10 }, // Stock
      { wch: 18 }, // Metros disponibles
      { wch: 14 }, // Estado
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, `inventario_${sedeNombre.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.xlsx`);
  });
};

  if (stockQ.isLoading) return (
    <div style={{ padding: 28, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <Spinner size={28} />
    </div>
  );

  return (
    <div style={{ padding: 28 }} className="animate-fade">
      <Header title="Inventario" subtitle="Stock local, entradas y entregas a técnicos" right={<SedeBadge sedeNombre={sedeNombre} />} />

      <div className="ainv-btns" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <Btn variant="ghost" disabled={!sedeId} onClick={() => { setEntrada({ comentario: '', items: [] }); setEntradaSearch(''); setModal('entrada'); }} icon={<Plus size={16} />}>Registrar entrada</Btn>
        <Btn variant="danger" onClick={() => { setDirecta({ comentario: '', items: [], onu_ids: [] }); setDirectaSearch(''); setModal('directa'); }} icon={<TrendingDown size={16} />}>Salida directa</Btn>
        <Btn onClick={() => { setAsignacion({ tecnico_id: '', comentario: '', items: [], onu_ids: [] }); setAsignacionSearch(''); setModal('asignar'); }} icon={<Send size={16} />}>Asignar a técnico</Btn>
        {puedeEnviarStock && (
          <Btn variant="blue" onClick={() => setModal('envio')} icon={<Send size={16} />} style={{ border: '2px solid #2563EB', borderRadius: 10, fontWeight: 700, boxShadow: '0 2px 8px rgba(37,99,235,0.18)' }}>Enviar a otra sede</Btn>
        )}
        <Btn variant="ghost" onClick={exportarExcel} disabled={rows.length === 0} icon={<FileDown size={16} />}>
          Exportar Excel
        </Btn>
      </div>

      {(enviosPendientesQ.data || []).length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(enviosPendientesQ.data || []).map(envio => (
            <div key={envio.id} className="ainv-envio-pendiente" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid #D97706', borderRadius: 8, gap: 12 }}>
              <div style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>📦 Envío pendiente</span>
                <span style={{ color: 'var(--txt-3)', marginLeft: 8 }}>Guía: <strong>{envio.guia}</strong></span>
                <span style={{ color: 'var(--txt-3)', marginLeft: 8 }}>desde <strong>{envio.sedeOrigen}</strong></span>
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--txt-3)' }}>{envio.detalles?.map(d => `${d.cantidad}x ${d.producto}`).join(', ')}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="ghost" onClick={() => { setEnvioSeleccionado(envio); setMotivoCancelacion(''); setModal('cancelar-envio'); }}>Cancelar</Btn>
                <Btn onClick={() => { setEnvioSeleccionado(envio); setModal('confirmar-envio'); }}>Confirmar recepción</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      <Card style={{ padding: 0 }}>
        <Toolbar q={q} setQ={setQ} />

        {/* Desktop: tabla */}
        <div className="ainv-table" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
                {['Código', 'Producto', 'Categoría', 'Unidad', 'Stock', ...(hayMedibles ? ['Metros disp.'] : []), 'Estado'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', color: 'var(--txt-3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={hayMedibles ? 7 : 6} style={{ padding: 24, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin stock en tu sede</td></tr>
              ) : rows.map(p => {
                const low = p.stock_minimo > 0 && p.cantidad <= p.stock_minimo;
                return (
                  <tr key={p.producto_id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 12px', color: 'var(--txt)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.codigo || '—'}</td>
                    <td style={{ padding: '11px 12px', color: 'var(--txt)' }}><strong>{p.producto}</strong></td>
                    <td style={{ padding: '11px 12px', color: 'var(--txt-2)' }}>{p.categoria || '—'}</td>
                    <td style={{ padding: '11px 12px', color: 'var(--txt-2)' }}>{p.unidad || '—'}</td>
                    <td style={{ padding: '11px 12px' }}><StockBar stock={p.cantidad} minimo={p.stock_minimo} /></td>
                    {hayMedibles && <td style={{ padding: '11px 12px' }}><MetrosCell p={p} /></td>}
                    <td style={{ padding: '11px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Badge color={low ? 'red' : 'green'}>{low ? 'Bajo stock' : 'Disponible'}</Badge>
                      {isOnuProduct(p) && (
                        <Btn variant="ghost" size="sm" icon={<Wifi size={13} />} onClick={() => { setOnuForm({ producto_id: String(p.producto_id), codigos_pon: [''] }); setModal('onu'); }}>
                          Registrar ONU
                        </Btn>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Móvil: cards */}
        <div className="ainv-cards">
          {rows.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin stock en tu sede</div>
          ) : rows.map(p => {
            const low = p.stock_minimo > 0 && p.cantidad <= p.stock_minimo;
            return (
              <div key={p.producto_id} className="ainv-card">
                <div className="ainv-card-top">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>{p.producto}</div>
                    {p.codigo && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt-3)' }}>{p.codigo}</span>}
                  </div>
                  <Badge color={low ? 'red' : 'green'}>{low ? 'Bajo stock' : 'Disponible'}</Badge>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {p.categoria && <Badge color="blue">{p.categoria}</Badge>}
                  {p.unidad && <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>{p.unidad}</span>}
                  <StockBar stock={p.cantidad} minimo={p.stock_minimo} />
                  {p.es_medible && p.metros_por_unidad && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: p.cantidad * p.metros_por_unidad === 0 ? 'var(--red)' : '#16A34A', fontFamily: 'var(--font-mono)' }}>
                      {(p.cantidad * p.metros_por_unidad).toLocaleString()} m
                    </span>
                  )}
                </div>
                {isOnuProduct(p) && (
                  <Btn variant="ghost" size="sm" icon={<Wifi size={13} />} onClick={() => { setOnuForm({ producto_id: String(p.producto_id), codigos_pon: [''] }); setModal('onu'); }}>
                    Registrar ONU
                  </Btn>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {modal === 'entrada' && (
        <UIModal open={true} onClose={() => setModal(null)} title="Registrar entrada" overlayColor="rgba(255,255,255,0.85)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ProductSearch label="Buscar producto del catálogo" search={entradaSearch} setSearch={setEntradaSearch} products={productos.map(p => ({ producto_id: p.id, producto: p.nombre, codigo: p.codigo, categoria: p.categoria, unidad: p.unidad }))} selected={entrada.items} onAdd={p => setEntrada({ ...entrada, items: [...entrada.items, { producto_id: String(p.producto_id), cantidad: '' }] })} />
            <ItemsList stock={productos.map(p => ({ producto_id: p.id, producto: p.nombre, codigo: p.codigo, cantidad: null }))} items={entrada.items} setItems={items => setEntrada({ ...entrada, items })} showDisponible={false} />
            <Input label="Comentario" value={entrada.comentario} onChange={e => setEntrada({ ...entrada, comentario: e.target.value })} />
            <Btn onClick={() => entradaM.mutate()} disabled={!sedeId || entradaItemsValidos.length === 0 || entradaM.isPending} icon={<Check size={15} />}>Registrar ({entradaItemsValidos.length})</Btn>
          </div>
        </UIModal>
      )}

      {modal === 'onu' && (
        <UIModal open={true} onClose={() => setModal(null)} title="Registrar ONU con PON-SN">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {productosOnu.length === 0 && <div style={{ padding: '10px 12px', border: '1px solid var(--red)', borderRadius: 8, color: 'var(--red)', background: 'var(--red-bg)', fontSize: 13 }}>No hay productos ONU con stock en esta sede.</div>}
            {!onuForm.producto_id && (
              <Select label="Modelo / producto ONU" value={onuForm.producto_id} onChange={e => setOnuForm({ ...onuForm, producto_id: e.target.value, codigos_pon: Array(productosOnu.find(p => String(p.producto_id) === e.target.value)?.cantidad || 1).fill('') })}>
                <option value="">Seleccionar...</option>
                {productosOnu.map(p => <option key={p.producto_id} value={p.producto_id}>{p.codigo || '—'} - {p.producto} (stock {p.cantidad})</option>)}
              </Select>
            )}
            {onuForm.producto_id && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border)', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><strong>{productosOnu.find(p => String(p.producto_id) === String(onuForm.producto_id))?.producto}</strong></span>
                <button onClick={() => setOnuForm({ producto_id: '', codigos_pon: [''] })} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--txt-3)', fontSize: 12 }}>cambiar</button>
              </div>
            )}
            {onuForm.producto_id && (() => {
              const yaRegistradas = (onusExistentesQ.data || []).filter(o => o.codigo_pon && !o.salida_directa && !o.tecnico_id && !o.activacion_id);
              const stockTotal = productosOnu.find(p => String(p.producto_id) === String(onuForm.producto_id))?.cantidad || 0;
              const disponibles = stockTotal - yaRegistradas.length;
              return (
                <div>
                  {yaRegistradas.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ya registradas ({yaRegistradas.length})</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {yaRegistradas.map(o => <span key={o.id} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--txt-2)' }}>{o.codigo_pon}</span>)}
                      </div>
                    </div>
                  )}
                  {disponibles <= 0 ? (
                    <div style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--txt-2)', fontSize: 13, background: 'var(--bg-2)' }}>Todas las ONUs de este producto ya tienen código PON registrado.</div>
                  ) : (
                    <>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nuevos códigos PON-SN ({(onuForm.codigos_pon || []).filter(c => c.trim()).length} de {disponibles} disponibles)</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(onuForm.codigos_pon || ['']).map((cod, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input value={cod} onChange={e => { const next = [...(onuForm.codigos_pon || [''])]; next[idx] = e.target.value.toUpperCase(); setOnuForm({ ...onuForm, codigos_pon: next }); }} placeholder={`PON-SN ${idx + 1}`} style={{ flex: 1, height: 36, border: '1px solid var(--border)', borderRadius: 8, padding: '0 10px', background: 'var(--bg-2)', color: 'var(--txt)', fontSize: 13, fontFamily: 'var(--font-mono)' }} />
                            {(onuForm.codigos_pon?.length || 1) > 1 && <Btn variant="danger" size="sm" onClick={() => setOnuForm({ ...onuForm, codigos_pon: (onuForm.codigos_pon || ['']).filter((_, i) => i !== idx) })}><X size={14} /></Btn>}
                          </div>
                        ))}
                      </div>
                      {(onuForm.codigos_pon || []).length < disponibles && <Btn variant="ghost" size="sm" icon={<Plus size={14} />} style={{ marginTop: 8 }} onClick={() => setOnuForm({ ...onuForm, codigos_pon: [...(onuForm.codigos_pon || ['']), ''] })}>Agregar otro código</Btn>}
                    </>
                  )}
                </div>
              );
            })()}
            <Btn onClick={() => registrarOnuM.mutate()} disabled={!onuForm.producto_id || !(onuForm.codigos_pon || []).some(c => c.trim()) || registrarOnuM.isPending} icon={<Check size={15} />}>
              Registrar {(onuForm.codigos_pon || []).filter(c => c.trim()).length} ONU{(onuForm.codigos_pon || []).filter(c => c.trim()).length !== 1 ? 's' : ''}
            </Btn>
          </div>
        </UIModal>
      )}

      {modal === 'asignar' && (
        <UIModal open={true} onClose={() => setModal(null)} title="Asignar stock a técnico" overlayColor="rgba(255,255,255,0.85)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Select label="Técnico" value={asignacion.tecnico_id} onChange={e => setAsignacion({ ...asignacion, tecnico_id: e.target.value })}>
              <option value="">Seleccionar...</option>
              {(tecnicosQ.data || []).map(t => <option key={t.id} value={t.id}>{`${t.usuario?.nombre || t.nombre} ${t.usuario?.apellido || ''}`.trim()}</option>)}
            </Select>
            <ProductSearch label="Buscar item" search={asignacionSearch} setSearch={setAsignacionSearch} products={stock.filter(s => s.cantidad > 0)} selected={asignacion.items} onAdd={p => setAsignacion({ ...asignacion, items: [...asignacion.items, { producto_id: String(p.producto_id), cantidad: '' }] })} />
            <ItemsList stock={stock} items={asignacion.items} setItems={items => setAsignacion({ ...asignacion, items })} sedeId={sedeId} />
            <Input label="Comentario" value={asignacion.comentario} onChange={e => setAsignacion({ ...asignacion, comentario: e.target.value })} />
            <Btn onClick={() => asignarM.mutate()} disabled={!asignacion.tecnico_id || asignacion.items.length === 0 || asignarM.isPending} icon={<Check size={15} />}>Confirmar asignación</Btn>
          </div>
        </UIModal>
      )}

      {modal === 'directa' && (
        <UIModal open={true} onClose={() => setModal(null)} title="Salida directa de stock" overlayColor="rgba(255,255,255,0.85)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ProductSearch label="Buscar producto" search={directaSearch} setSearch={setDirectaSearch} products={stock.filter(s => s.cantidad > 0)} selected={directa.items} onAdd={p => setDirecta({ ...directa, items: [...directa.items, { producto_id: String(p.producto_id), cantidad: '', onu_ids: [] }] })} />
            <ItemsList stock={stock} items={directa.items} setItems={items => setDirecta({ ...directa, items })} sedeId={sedeId} />
            <Input label="Motivo / comentario" value={directa.comentario} onChange={e => setDirecta({ ...directa, comentario: e.target.value })} />
            <Btn onClick={() => directaM.mutate()} disabled={!directa.comentario || directa.items.length === 0 || directaM.isPending} icon={<Check size={15} />}>Confirmar salida</Btn>
          </div>
        </UIModal>
      )}

      {modal === 'confirmar-envio' && (
        <UIModal open={true} onClose={() => setModal(null)} title="Confirmar recepción">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '10px 12px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
              <div>Guía: <strong>{envioSeleccionado?.guia}</strong></div>
              <div style={{ marginTop: 6, color: 'var(--txt-3)' }}>Productos:</div>
              {envioSeleccionado?.detalles?.map((d, i) => <div key={i} style={{ marginLeft: 8, fontSize: 12, color: 'var(--txt-3)' }}>· {d.cantidad}x {d.producto}</div>)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--txt-2)' }}>Al confirmar, el stock se sumará a tu sede.</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn onClick={() => confirmarEnvioM.mutate(envioSeleccionado.id)} disabled={confirmarEnvioM.isPending} icon={<Check size={15} />}>Confirmar recepción</Btn>
            </div>
          </div>
        </UIModal>
      )}

      {modal === 'cancelar-envio' && (
        <UIModal open={true} onClose={() => setModal(null)} title="Cancelar envío">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '10px 12px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
              <div>Guía: <strong>{envioSeleccionado?.guia}</strong></div>
              {envioSeleccionado?.detalles?.map((d, i) => <div key={i} style={{ marginLeft: 8, fontSize: 12, color: 'var(--txt-3)' }}>· {d.cantidad}x {d.producto}</div>)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--txt-2)' }}>Al cancelar, el stock será devuelto a la sede origen.</div>
            <Input label="Motivo de cancelación (obligatorio)" value={motivoCancelacion} onChange={e => setMotivoCancelacion(e.target.value)} placeholder="Ej: los productos no llegaron..." />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Volver</Btn>
              <Btn variant="danger" onClick={() => cancelarEnvioM.mutate({ id: envioSeleccionado.id, motivo: motivoCancelacion })} disabled={!motivoCancelacion.trim() || cancelarEnvioM.isPending} icon={<X size={15} />}>Confirmar cancelación</Btn>
            </div>
          </div>
        </UIModal>
      )}

      {modal === 'envio' && (
        <UIModal open={true} onClose={() => setModal(null)} title="Enviar stock a otra sede">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ padding: '4px 0 16px', borderBottom: '1px solid var(--border)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Destino</div>
              <Select label="Sede destino" value={envio.sede_destino_id} onChange={e => setEnvio({ ...envio, sede_destino_id: e.target.value })}>
                <option value="">Seleccionar sede...</option>
                {(sedesQ.data || []).filter(s => String(s.id) !== String(sedeId)).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </Select>
              <Input label="Número de guía / tracking" value={envio.guia} onChange={e => setEnvio({ ...envio, guia: e.target.value })} placeholder="Ej: GU-2024-001" />
            </div>
            <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 16, paddingBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Productos a enviar</div>
              <ProductSearch label="Buscar producto" search={envioSearch} setSearch={setEnvioSearch} products={stock.filter(s => s.cantidad > 0)} selected={envio.items} onAdd={p => setEnvio({ ...envio, items: [...envio.items, { producto_id: String(p.producto_id), cantidad: '' }] })} />
              <ItemsList stock={stock} items={envio.items} setItems={items => setEnvio({ ...envio, items })} showDisponible={true} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <Input label="Comentario (opcional)" value={envio.comentario} onChange={e => setEnvio({ ...envio, comentario: e.target.value })} placeholder="Instrucciones, observaciones..." />
            </div>
            {envio.items.filter(i => i.producto_id && Number(i.cantidad) > 0).length > 0 && (
              <div style={{ padding: '10px 14px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Package size={15} style={{ color: '#2563EB', marginTop: 1, flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: 'var(--txt-2)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--txt)', display: 'block', marginBottom: 2 }}>Resumen del envío</strong>
                  {envio.items.filter(i => i.producto_id && Number(i.cantidad) > 0).map((i, idx) => {
                    const prod = stock.find(s => String(s.producto_id) === String(i.producto_id));
                    return <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 10 }}><span style={{ fontWeight: 700, color: '#2563EB', fontFamily: 'var(--font-mono)' }}>{i.cantidad}×</span>{prod?.producto || '?'}</span>;
                  })}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn variant="blue" onClick={() => enviarStockM.mutate()} disabled={!envio.sede_destino_id || !envio.guia.trim() || envio.items.filter(i => i.producto_id && Number(i.cantidad) > 0).length === 0 || enviarStockM.isPending} icon={<Send size={15} />} style={{ fontWeight: 700 }}>
                Confirmar envío ({envio.items.filter(i => i.producto_id && Number(i.cantidad) > 0).length} productos)
              </Btn>
            </div>
          </div>
        </UIModal>
      )}
    </div>
  );
}