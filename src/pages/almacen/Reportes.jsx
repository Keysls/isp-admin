import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, FileDown, X, Calendar, User, Tag } from 'lucide-react';
import * as XLSX from 'xlsx';
import { stockApi } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Card, Spinner, Btn, Modal as UIModal } from '../../components/ui';
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

  .arep-export-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 14px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg-2);
    color: var(--txt);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background .15s, border-color .15s;
  }
  .arep-export-btn:hover {
    background: var(--bg-3, #e8f0fe);
    border-color: #2563EB;
    color: #2563EB;
  }
  .arep-export-btn.primary {
    background: #2563EB;
    border-color: #2563EB;
    color: #fff;
  }
  .arep-export-btn.primary:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
    color: #fff;
  }

  /* ── Export Modal ── */
  .arep-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0,0,0,.45);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: arep-fadein .15s ease;
  }
  @keyframes arep-fadein { from { opacity: 0 } to { opacity: 1 } }

  .arep-modal {
    background: var(--bg-1, #fff);
    border: 1px solid var(--border);
    border-radius: 14px;
    width: 100%;
    max-width: 480px;
    box-shadow: 0 24px 64px rgba(0,0,0,.22);
    overflow: hidden;
    animation: arep-slideup .18s ease;
  }
  @keyframes arep-slideup { from { transform: translateY(12px); opacity: 0 } to { transform: none; opacity: 1 } }

  .arep-modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 20px 22px 16px;
    border-bottom: 1px solid var(--border);
  }
  .arep-modal-title { font-size: 16px; font-weight: 800; color: var(--txt); letter-spacing: -.02em; }
  .arep-modal-sub   { font-size: 12px; color: var(--txt-3); margin-top: 3px; }
  .arep-modal-close {
    background: var(--bg-2);
    border: 1px solid var(--border);
    color: var(--txt-3);
    width: 28px; height: 28px;
    border-radius: 7px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background .15s;
  }
  .arep-modal-close:hover { background: var(--bg-3); color: var(--txt); }

  .arep-modal-body  { padding: 18px 22px; display: flex; flex-direction: column; gap: 16px; }
  .arep-modal-footer { padding: 14px 22px; border-top: 1px solid var(--border); display: flex; gap: 8px; justify-content: flex-end; }

  .arep-field-label {
    font-size: 11px; font-weight: 700; color: var(--txt-3);
    text-transform: uppercase; letter-spacing: .06em;
    display: flex; align-items: center; gap: 5px;
    margin-bottom: 7px;
  }

  .arep-date-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

  .arep-input {
    width: 100%; height: 36px; padding: 0 11px;
    background: var(--bg-2); border: 1px solid var(--border);
    border-radius: 8px; color: var(--txt); font-size: 13px; outline: none;
    box-sizing: border-box;
  }
  .arep-input:focus { border-color: #2563EB; }

  .arep-tipo-grid { display: flex; flex-wrap: wrap; gap: 6px; }
  .arep-tipo-chip {
    padding: 4px 10px; border-radius: 6px;
    border: 1.5px solid var(--border);
    background: var(--bg-2); color: var(--txt-3);
    font-size: 11px; font-weight: 600; cursor: pointer;
    transition: all .12s; user-select: none;
  }

  .arep-preview-box {
    background: var(--bg-2); border: 1px solid var(--border);
    border-radius: 8px; padding: 10px 14px;
    font-size: 12px; color: var(--txt-3);
    display: flex; align-items: center; gap: 8px;
  }
  .arep-preview-count { color: #2563EB; font-weight: 800; font-size: 16px; }

  .arep-btn {
    height: 36px; padding: 0 16px; border-radius: 8px;
    font-size: 13px; font-weight: 700; cursor: pointer;
    display: inline-flex; align-items: center; gap: 6px;
    transition: background .15s;
  }
  .arep-btn-cancel {
    background: var(--bg-2); border: 1px solid var(--border); color: var(--txt-3);
  }
  .arep-btn-cancel:hover { background: var(--bg-3); color: var(--txt); }
  .arep-btn-confirm {
    background: #2563EB; border: 1px solid #2563EB; color: #fff;
  }
  .arep-btn-confirm:hover { background: #1d4ed8; }
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

function fmtDatetime(d) {
  const date = new Date(d);
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function movimientosToRows(movimientos) {
  return movimientos.map(m => ({
    'Fecha y hora':        fmtDatetime(m.fecha),
    'Producto / Ítem':     m.item || '—',
    'Tipo':                TIPOS[m.tipo]?.label || m.tipo || '—',
    'Cantidad':            m.cantidad ?? '',
    'Técnico':             m.tecnico_nombre || '—',
    'Contrato':            m.contrato || '—',
    'Abonado / Cliente':   m.abonado || '—',
    'N° Servicio':         m.nServicio || '—',
    'Sede origen':         m.sede_origen || '—',
    'Sede destino':        m.sede_destino || '—',
    'Comentario / Motivo': limpiarComentario(m.comentario) || m.motivo || '—',
  }));
}

function exportToExcel(rows, filename) {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 18 }, { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 22 },
    { wch: 14 }, { wch: 24 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 35 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
  XLSX.writeFile(wb, filename);
}

function limpiarComentario(comentario) {
  if (!comentario) return null;
  if (/^Orden:\s*[0-9a-f-]{36}$/i.test(comentario.trim())) return null;
  return comentario;
}

// ─── Export Modal ────────────────────────────────────────────────────────────
function ExportModal({ movimientos, sedeNombre, onClose }) {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [tecnico, setTecnico] = useState('');
  const [tiposSeleccionados, setTiposSeleccionados] = useState(new Set());

  const tecnicos = useMemo(() => {
    const set = new Set();
    movimientos.forEach(m => { if (m.tecnico_nombre) set.add(m.tecnico_nombre); });
    return [...set].sort();
  }, [movimientos]);

  function toggleTipo(tipo) {
    setTiposSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });
  }

  const preview = useMemo(() => {
    return movimientos.filter(m => {
      if (fechaDesde) {
        const d = new Date(m.fecha); d.setHours(0,0,0,0);
        if (d < new Date(fechaDesde + 'T00:00:00')) return false;
      }
      if (fechaHasta) {
        const d = new Date(m.fecha); d.setHours(0,0,0,0);
        if (d > new Date(fechaHasta + 'T00:00:00')) return false;
      }
      if (tecnico && m.tecnico_nombre !== tecnico) return false;
      if (tiposSeleccionados.size > 0 && !tiposSeleccionados.has(m.tipo)) return false;
      return true;
    });
  }, [movimientos, fechaDesde, fechaHasta, tecnico, tiposSeleccionados]);

  function handleExport() {
    if (preview.length === 0) return;
    const rows = movimientosToRows(preview);
    const parts = ['movimientos'];
    if (fechaDesde || fechaHasta) parts.push(`${fechaDesde || ''}a${fechaHasta || ''}`);
    if (tecnico) parts.push(tecnico.split(' ')[0]);
    if (tiposSeleccionados.size > 0) parts.push([...tiposSeleccionados].map(t => TIPOS[t]?.label || t).join('-'));
    parts.push(sedeNombre);
    exportToExcel(rows, parts.join('_').replace(/\s+/g, '-') + '.xlsx');
    onClose();
  }

  return (
    <UIModal open={true} onClose={onClose} title="Exportar a Excel">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Fechas */}
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Rango de fechas
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--txt-3)', marginBottom: 4 }}>Desde</div>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                max={fechaHasta || undefined}
                style={{ width: '100%', height: 36, padding: '0 11px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--txt)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--txt-3)', marginBottom: 4 }}>Hasta</div>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                min={fechaDesde || undefined}
                style={{ width: '100%', height: 36, padding: '0 11px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--txt)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        {/* Técnico */}
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Técnico
          </label>
          <select value={tecnico} onChange={e => setTecnico(e.target.value)}
            style={{ width: '100%', height: 36, padding: '0 11px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--txt)', fontSize: 13, outline: 'none' }}>
            <option value="">Todos los técnicos</option>
            {tecnicos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Tipos */}
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Tipo de movimiento
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button
              onClick={() => setTiposSeleccionados(new Set())}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: '1.5px solid', transition: 'all .12s', userSelect: 'none',
                ...(tiposSeleccionados.size === 0
                  ? { background: '#EFF6FF', borderColor: '#93c5fd', color: '#2563EB' }
                  : { background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--txt-3)' })
              }}>
              Todos
            </button>
            {Object.entries(TIPOS).map(([tipo, meta]) => {
              const active = tiposSeleccionados.has(tipo);
              return (
                <button key={tipo} onClick={() => toggleTipo(tipo)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: '1.5px solid', transition: 'all .12s', userSelect: 'none',
                    ...(active
                      ? { background: meta.bg, borderColor: meta.border, color: meta.color }
                      : { background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--txt-3)' })
                  }}>
                  {active ? '✓ ' : ''}{meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--txt-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#2563EB', fontWeight: 800, fontSize: 16 }}>{preview.length}</span>
          <span>registro{preview.length !== 1 ? 's' : ''} se exportarán con estos filtros</span>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn
            onClick={handleExport}
            disabled={preview.length === 0}
            icon={<FileDown size={15} />}
          >
            Exportar ({preview.length})
          </Btn>
        </div>

      </div>
    </UIModal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminAlmacenReportes() {
  const { sedeId, sedeNombre } = useMiSede();
  const [q, setQ] = useState('');
  const [activeTipo, setActiveTipo] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);

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

  function handleExportTodo() {
    const rows = movimientosToRows(movimientos);
    exportToExcel(rows, `movimientos_todo_${sedeNombre}.xlsx`);
  }

  if (isLoading) return (
    <div style={{ padding: 28, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <Spinner size={28} />
    </div>
  );

  return (
    <div style={{ padding: 28 }} className="animate-fade">
      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          movimientos={movimientos}
          sedeNombre={sedeNombre}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--txt)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Movimientos</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--txt-2)' }}>Auditoría de stock de tu sede</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Botón exportar filtrado → abre modal */}
          <button className="arep-export-btn" onClick={() => setShowExportModal(true)}>
            <Download size={14} />
            Exportar filtrado
          </button>
          {/* Botón exportar todo (sin cambios) */}
          <button className="arep-export-btn primary" onClick={handleExportTodo} title="Exportar todo el historial sin filtros">
            <FileDown size={14} />
            Exportar todo ({movimientos.length})
          </button>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--txt)' }}>
            {sedeNombre}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="arep-stats" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {Object.entries(TIPOS).map(([tipo]) => (
          <StatCard key={tipo} tipo={tipo} count={counts[tipo] || 0}
            active={activeTipo === tipo} onClick={() => setActiveTipo(t => t === tipo ? '' : tipo)} />
        ))}
      </div>

      {/* Filtros */}
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
        {filtered.length !== movimientos.length && (
          <span style={{ marginLeft: 6, color: 'var(--txt-3)' }}>de {movimientos.length} totales</span>
        )}
      </p>

      {/* Lista por día */}
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
                      {m.tipo === 'consumo' && m.contrato && (
                        <span style={{ color: '#6d28d9', fontWeight: 600, background: '#EDE9FE', padding: '1px 7px', borderRadius: 5 }}>
                          📋 {m.contrato}{m.abonado ? ` · ${m.abonado}` : ''}
                        </span>
                      )}
                      {limpiarComentario(m.comentario) || m.motivo || (!m.sede_destino && !m.sede_origen && !m.tecnico_nombre ? '—' : '')}
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
                      {(limpiarComentario(m.comentario) || m.motivo) && (
                        <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>{limpiarComentario(m.comentario) || m.motivo}</div>
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