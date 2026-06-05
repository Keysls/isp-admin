import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { stockApi } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Card, Spinner } from '../../components/ui';

const CSS = `
  .arep-stats   { flex-wrap: wrap; }
  .arep-filters { flex-wrap: wrap; }
  .arep-row     { display: grid; grid-template-columns: 2fr 90px 70px 1.5fr; }
  .arep-cards   { display: none; }

  @media (max-width: 1080px) {
    .arep-stats > button { flex: 1 1 calc(50% - 5px) !important; min-width: unset !important; }
    .arep-filters { flex-direction: column !important; }
    .arep-filters > * { width: 100% !important; min-width: unset !important; }
    .arep-row   { display: none !important; }
    .arep-cards { display: flex !important; flex-direction: column; gap: 6px; padding: 8px 12px; }
  }

  .arep-card {
    background: var(--bg-3);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('arep-responsive-css')) {
  const s = document.createElement('style');
  s.id = 'arep-responsive-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

function useMiSede() {
  const usuario = useAuthStore(s => s.usuario);
  return { sedeId: usuario?.sedeId, sedeNombre: usuario?.sede?.nombre || 'Mi sede' };
}

const TIPOS = {
  entrada:        { label: 'Entrada',        color: '#3b6d11', bg: '#eaf3de', border: '#c0dd97' },
  salida:         { label: 'Salida técnico', color: '#a32d2d', bg: '#fcebeb', border: '#f7c1c1' },
  salida_directa: { label: 'Salida directa', color: '#854f0b', bg: '#faeeda', border: '#fac775' },
  envio_salida:   { label: 'Envío salida',   color: '#534ab7', bg: '#eeedfe', border: '#afa9ec' },
  envio_entrada:  { label: 'Recepción',      color: '#0f6e56', bg: '#e1f5ee', border: '#5dcaa5' },
  consumo:        { label: 'Consumo',        color: '#993556', bg: '#fbeaf0', border: '#f4c0d1' },
};

function TipoBadge({ tipo }) {
  const meta = TIPOS[tipo] || { label: tipo, color: '#5f5e5a', bg: '#f1efe8', border: '#d3d1c7' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: meta.bg, color: meta.color, border: `0.5px solid ${meta.border}` }}>
      {meta.label}
    </span>
  );
}

function StatCard({ tipo, count, active, onClick }) {
  const meta = TIPOS[tipo] || { label: tipo, color: '#5f5e5a', bg: '#f1efe8' };
  return (
    <button onClick={onClick} style={{ flex: 1, minWidth: 100, background: active ? meta.bg : 'var(--bg-2)', border: `1.5px solid ${active ? meta.border : 'var(--border)'}`, borderRadius: 8, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: active ? meta.color : 'var(--txt)', lineHeight: 1 }}>{count}</div>
      <div style={{ fontSize: 11, color: active ? meta.color : 'var(--txt-3)', marginTop: 4 }}>{meta.label}</div>
    </button>
  );
}

function fmtDay(d) {
  return new Date(d).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function AdminAlmacenReportes() {
  const { sedeId, sedeNombre } = useMiSede();
  const [q, setQ] = useState('');
  const [activeTipo, setActiveTipo] = useState('');

  const { data: auditoria, isLoading } = useQuery({
    queryKey: ['admin-stock-auditoria', sedeId],
    enabled: Boolean(sedeId),
    queryFn: () => stockApi.auditoria({ sedeId }).then(r => r.data),

    staleTime: 30000,
  });

  const movimientos = auditoria || [];

  const counts = useMemo(() => {
    const c = {};
    movimientos.forEach(m => { c[m.tipo] = (c[m.tipo] || 0) + 1; });
    return c;
  }, [movimientos]);

  const filtered = useMemo(() => {
    const search = q.toLowerCase();
    return movimientos.filter(m => {
      const matchTipo = !activeTipo || m.tipo === activeTipo;
      const matchQ = !search || [m.item, m.comentario, m.motivo, m.tecnico_nombre].some(v => v?.toLowerCase().includes(search));
      return matchTipo && matchQ;
    });
  }, [movimientos, q, activeTipo]);

  const byDay = useMemo(() => {
    const map = {};
    filtered.forEach(m => {
      const day = fmtDay(m.fecha);
      if (!map[day]) map[day] = [];
      map[day].push(m);
    });
    return map;
  }, [filtered]);

  if (isLoading) return (
    <div style={{ padding: 28, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <Spinner size={28} />
    </div>
  );

  return (
    <div style={{ padding: 28 }} className="animate-fade">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--txt)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Movimientos</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--txt-2)' }}>Auditoría de stock de tu sede</p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--txt)' }}>
          {sedeNombre}
        </div>
      </div>

      <div className="arep-stats" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {Object.entries(TIPOS).map(([tipo]) => (
          <StatCard key={tipo} tipo={tipo} count={counts[tipo] || 0}
            active={activeTipo === tipo} onClick={() => setActiveTipo(t => t === tipo ? '' : tipo)} />
        ))}
      </div>

      <div className="arep-filters" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar producto, técnico, comentario..."
            style={{ width: '100%', height: 36, paddingLeft: 32, paddingRight: 12, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--txt)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={activeTipo} onChange={e => setActiveTipo(e.target.value)}
          style={{ height: 36, padding: '0 12px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--txt)', fontSize: 13, outline: 'none', minWidth: 160 }}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <p style={{ fontSize: 13, color: 'var(--txt-3)', marginBottom: 16 }}>
        <strong style={{ color: 'var(--txt)' }}>{filtered.length}</strong> registro{filtered.length !== 1 ? 's' : ''}
      </p>

      {Object.entries(byDay).map(([day, items]) => {
        const porTipo = {};
        items.forEach(m => { if (!porTipo[m.tipo]) porTipo[m.tipo] = []; porTipo[m.tipo].push(m); });
        return (
          <div key={day} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{day}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>{items.length} mov.</span>
            </div>
            {Object.entries(porTipo).map(([tipo, rows]) => (
              <Card key={tipo} style={{ padding: 0, marginBottom: 10, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
                  <TipoBadge tipo={tipo} />
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--txt-3)' }}>{rows.length} ítem{rows.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Desktop */}
                <div className="arep-row" style={{ gap: 12, padding: '7px 16px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  <span>Producto</span><span>Hora</span><span style={{ textAlign: 'right' }}>Cant.</span><span>Detalle / Técnico / Sede</span>
                </div>
                {rows.map((m, i) => (
                  <div key={i} className="arep-row" style={{ gap: 12, padding: '11px 16px', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13, alignItems: 'center' }}>
                    <span style={{ color: 'var(--txt)', fontWeight: 600 }}>{m.item}</span>
                    <span style={{ color: 'var(--txt-3)', fontSize: 12 }}>{new Date(m.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--txt)' }}>{m.cantidad}</span>
                    <span style={{ color: 'var(--txt-3)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {m.tipo === 'envio_salida' && m.sede_destino && (
                        <span style={{ color: '#3b82f6', fontWeight: 600 }}>→ {m.sede_destino}</span>
                      )}
                      {m.tipo === 'envio_entrada' && m.sede_origen && (
                        <span style={{ color: '#0f6e56', fontWeight: 600 }}>← {m.sede_origen}</span>
                      )}
                      {(m.tipo === 'salida' || m.tipo === 'consumo') && m.tecnico_nombre && (
                        <span style={{ color: '#2563EB', fontWeight: 600, background: '#EFF6FF', padding: '1px 7px', borderRadius: 5 }}>
                          👤 {m.tecnico_nombre}
                        </span>
                      )}
                      {m.comentario || m.motivo || (!m.sede_destino && !m.sede_origen && !m.tecnico_nombre ? '—' : '')}
                    </span>
                  </div>
                ))}

                {/* Móvil */}
                <div className="arep-cards">
                  {rows.map((m, i) => (
                    <div key={i} className="arep-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--txt)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.item}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14, color: 'var(--txt)', flexShrink: 0 }}>×{m.cantidad}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>{new Date(m.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</div>
                      {m.tipo === 'envio_salida' && m.sede_destino && (
                        <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>→ {m.sede_destino}</div>
                      )}
                      {m.tipo === 'envio_entrada' && m.sede_origen && (
                        <div style={{ fontSize: 11, color: '#0f6e56', fontWeight: 600 }}>← {m.sede_origen}</div>
                      )}
                      {(m.tipo === 'salida' || m.tipo === 'consumo') && m.tecnico_nombre && (
                        <div style={{ fontSize: 11, color: '#2563EB', fontWeight: 600 }}>👤 {m.tecnico_nombre}</div>
                      )}
                      {(m.comentario || m.motivo) && (
                        <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>{m.comentario || m.motivo}</div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        );
      })}

      {!isLoading && filtered.length === 0 && (
        <Card style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--txt-3)', fontSize: 13 }}>Sin movimientos registrados</p>
        </Card>
      )}
    </div>
  );
}