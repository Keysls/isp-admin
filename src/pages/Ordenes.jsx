import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Upload, Search, RefreshCw, X, CheckCircle2, AlertCircle, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { ordenesApi, tecnicosApi } from '../services/api';
import { Card, EstadoBadge, Table, Tr, Td, Btn, Modal, Input, Select, Spinner, Empty, TimerBadge } from '../components/ui';
import { fmtFecha, TIPO_LABEL, TIPO_COLOR, TIPOS_INTERNET, TIPOS_CABLE, TIPOS_DUO, ESTADO_CONFIG, TIPOS_SOLO_NOC } from '../utils/helpers';

// ── Hook: detectar si es móvil ────────────────────────────────
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

// ── Estilos responsivos globales (inyectados una vez) ─────────
const MOBILE_STYLES = `
  @media (max-width: 639px) {
    .ordenes-header        { flex-direction: column; gap: 12px; }
    .ordenes-header-btns   { display: flex; gap: 6px; width: 100%; }
    .ordenes-header-btns > * { flex: 1; justify-content: center; }
    .ordenes-tabs          { overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 2px; }
    .ordenes-tabs::-webkit-scrollbar { display: none; }
    .ordenes-filter-row    { flex-direction: column; gap: 8px; }
    .ordenes-estado-chips  { display: flex; flex-wrap: nowrap; overflow-x: auto; gap: 5px; padding-bottom: 2px; }
    .ordenes-estado-chips::-webkit-scrollbar { display: none; }
    .ordenes-table-wrap    { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .ordenes-card-list     { display: flex; flex-direction: column; gap: 0; }
    .ordenes-pagination    { flex-direction: column; align-items: stretch; gap: 8px; text-align: center; }
    .ordenes-pagination-btns { display: flex; gap: 6px; }
    .ordenes-pagination-btns > * { flex: 1; justify-content: center; }
  }
`;

function InjectStyles() {
  useEffect(() => {
    const id = 'ordenes-mobile-styles';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id;
      el.textContent = MOBILE_STYLES;
      document.head.appendChild(el);
    }
    return () => {};
  }, []);
  return null;
}

// ── Tarjeta de orden para vista móvil ────────────────────────
function OrdenCard({ o, onAsignar, onNavigate }) {
  return (
    <div
      onClick={() => onNavigate(o.id)}
      style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        background: 'var(--bg)',
        transition: 'background .15s',
        WebkitTapHighlightColor: 'transparent',
      }}
      onTouchStart={e => { e.currentTarget.style.background = 'var(--bg-3)'; }}
      onTouchEnd={e => { e.currentTarget.style.background = 'var(--bg)'; }}
    >
      {/* Fila 1: N° orden + estado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>
          #{o.nServicio}
        </span>
        <EstadoBadge estado={o.estado} />
      </div>

      {/* Fila 2: Abonado */}
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{o.abonado}</div>
      {o.dni && <div style={{ fontSize: 11, color: 'var(--txt-3)', marginBottom: 4 }}>{o.dni}</div>}

      {/* Fila 3: Dirección */}
      <div style={{ fontSize: 12, color: 'var(--txt-2)', marginBottom: o.referencia ? 2 : 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {o.direccion}
      </div>
      {o.referencia && (
        <div style={{ fontSize: 11, color: 'var(--txt-3)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Ref: {o.referencia}
        </div>
      )}

      {/* Fila 4: Servicio + Fecha */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: TIPO_COLOR[o.tipoOrden] }}>
          {TIPO_LABEL[o.tipoOrden] || o.tipoOrden}
        </span>
        <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>·</span>
        <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>{fmtFecha(o.fechaServicio)}</span>
      </div>

      {/* Fila 5: Técnico + botón asignar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: o.tecnico ? 'var(--txt-2)' : 'var(--txt-3)' }}>
          {o.tecnico
            ? `👷 ${o.tecnico.usuario.nombre} ${o.tecnico.usuario.apellido}`
            : 'Sin técnico asignado'}
        </span>
        {!o.tecnico && !TIPOS_SOLO_NOC.includes(o.tipoOrden) && (
          <Btn
            variant="ghost"
            size="sm"
            icon={<UserCheck size={12} />}
            onClick={e => { e.stopPropagation(); onAsignar(o); }}
          >
            Asignar
          </Btn>
        )}
      </div>
    </div>
  );
}

// ── Modal: Subir Excel ────────────────────────────────────────
function ModalSubirExcel({ open, onClose }) {
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [file,      setFile]      = useState(null);
  const [dragging,  setDragging]  = useState(false);
  const [resultado, setResultado] = useState(null);
  const [tecnicoId, setTecnicoId] = useState('');
  const [step,      setStep]      = useState('upload');

  const { data: tecnicos } = useQuery({
    queryKey: ['tecnicos-activos'],
    queryFn:  () => tecnicosApi.listar({ activo: true }).then(r => r.data),
    enabled:  step === 'review',
  });

  const subirMut = useMutation({
    mutationFn: (f) => {
      const fd = new FormData();
      fd.append('excel', f);
      return ordenesApi.subirExcel(fd);
    },
    onSuccess: (res) => { setResultado(res.data); setStep('review'); },
    onError:   (e)   => toast.error(e.response?.data?.error || 'Error al leer el Excel'),
  });

  const confirmarMut = useMutation({
    mutationFn: () => ordenesApi.confirmarExcel({
      ordenes: resultado.ordenes,
      tecnicoId: tecnicoId || undefined,
    }),
    onSuccess: async (res) => {
      toast.success(`✓ ${res.data.creadas} órdenes importadas`);
      if (res.data.asignadas > 0)
        toast.success(`👷 ${res.data.asignadas} asignadas al técnico`);
      if (res.data.duplicadas > 0)
        toast(`⚠ ${res.data.duplicadas} órdenes ya existían y fueron omitidas`, {
          icon: '⚠️',
          style: { background: 'var(--yellow-bg)', color: 'var(--yellow)' },
        });
      if (res.data.errores?.length > 0)
        toast.error(`✗ ${res.data.errores.length} órdenes con error`);
      qc.invalidateQueries(['ordenes']);
      qc.invalidateQueries(['stats']);
      handleClose();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error al confirmar'),
  });

  const handleClose = () => {
    setFile(null); setResultado(null);
    setStep('upload'); setTecnicoId('');
    onClose();
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xls') || f.name.endsWith('.xlsx'))) {
      setFile(f); subirMut.mutate(f);
    } else toast.error('Solo archivos .xls o .xlsx');
  };

  return (
    <Modal open={open} onClose={handleClose} title="Importar órdenes desde Excel" width={isMobile ? '100%' : 680}>

      {/* PASO 1 — Subir archivo */}
      {step === 'upload' && (
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('excel-input').click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-2)'}`,
              borderRadius: 12,
              padding: isMobile ? '28px 16px' : '40px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'var(--accent-glow)' : 'var(--bg-3)',
              transition: 'all .2s',
            }}>
            {subirMut.isPending ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <Spinner size={28} />
                <p style={{ fontSize: 13, color: 'var(--txt-2)' }}>Leyendo Excel...</p>
              </div>
            ) : (
              <>
                <Upload size={28} color="var(--txt-3)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                  {file ? file.name : isMobile ? 'Toca para seleccionar archivo' : 'Arrastra el Excel o haz clic para seleccionar'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--txt-3)' }}>Archivos .xls o .xlsx</p>
              </>
            )}
          </div>
          <input id="excel-input" type="file" accept=".xls,.xlsx"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files[0];
              if (f) { setFile(f); subirMut.mutate(f); }
            }} />
        </div>
      )}

      {/* PASO 2 — Revisar y confirmar */}
      {step === 'review' && resultado && (
        <div>
          {/* Resumen chips */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ padding: '7px 12px', background: 'var(--green-bg)', borderRadius: 8, fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
              ✓ {resultado.total} leídas
            </div>
            {resultado.errores?.length > 0 && (
              <div style={{ padding: '7px 12px', background: 'var(--red-bg)', borderRadius: 8, fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>
                ✗ {resultado.errores.length} con error
              </div>
            )}
            <div style={{ padding: '7px 12px', background: 'var(--accent-glow)', borderRadius: 8, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
              📡 {resultado.ordenes.filter(o => o.esInternet).length} Internet
            </div>
            <div style={{ padding: '7px 12px', background: 'rgba(139,92,246,0.1)', borderRadius: 8, fontSize: 12, color: '#8b5cf6', fontWeight: 600 }}>
              📺 {resultado.ordenes.filter(o => !o.esInternet).length} Cable
            </div>
          </div>

          {/* Errores */}
          {resultado.errores?.length > 0 && (
            <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, marginBottom: 6 }}>Filas con error (se omitirán):</p>
              {resultado.errores.map((e, i) => (
                <p key={i} style={{ fontSize: 11, color: 'var(--red)' }}>Fila {e.fila}: {e.motivo}</p>
              ))}
            </div>
          )}

          {/* Preview tabla — scroll horizontal en móvil */}
          <div style={{ maxHeight: isMobile ? 200 : 240, overflowY: 'auto', overflowX: 'auto', marginBottom: 16, border: '1px solid var(--border)', borderRadius: 8, WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: isMobile ? 480 : 'auto', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg-3)' }}>
                  {['N° Orden','Abonado','Dirección','Servicio','Sector'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--txt-3)', fontWeight: 600, fontSize: 11, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultado.ordenes.map((o, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '7px 12px', color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>{o.nServicio}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--txt)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.abonado}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--txt-2)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.direccion}</td>
                    <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: TIPO_COLOR[o.tipoOrden] }}>
                        {TIPO_LABEL[o.tipoOrden] || o.tipoOrden}
                      </span>
                    </td>
                    <td style={{ padding: '7px 12px', color: 'var(--txt-3)', whiteSpace: 'nowrap' }}>{o.sector}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Asignar técnico */}
          <div style={{ marginBottom: 16 }}>
            <Select label="Asignar técnico a todas (opcional)" value={tecnicoId} onChange={e => setTecnicoId(e.target.value)}>
              <option value="">— Asignar después —</option>
              {(tecnicos || []).map(t => (
                <option key={t.id} value={t.id}>{t.usuario.nombre} {t.usuario.apellido}{t.zonaAsignada ? ` (${t.zonaAsignada})` : ''}</option>
              ))}
            </Select>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Btn variant="ghost" onClick={() => setStep('upload')}>← Volver</Btn>
            <Btn variant="primary" onClick={() => confirmarMut.mutate()} loading={confirmarMut.isPending} style={{ flex: isMobile ? 1 : undefined }}>
              Importar {resultado.total} órdenes
              {resultado.total === 0 && ' (todas duplicadas)'}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Modal: Asignar técnico ────────────────────────────────────
function ModalAsignar({ open, onClose, orden }) {
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [tecnicoId, setTecnicoId] = useState('');
  const { data: tecnicos } = useQuery({
    queryKey: ['tecnicos-activos'],
    queryFn:  () => tecnicosApi.listar({ activo: true }).then(r => r.data),
    enabled:  open,
  });
  const mut = useMutation({
    mutationFn: () => ordenesApi.asignar(orden.id, tecnicoId),
    onSuccess:  () => { toast.success('Técnico asignado'); qc.invalidateQueries(['ordenes']); onClose(); },
    onError:    (e) => toast.error(e.response?.data?.error || 'Error'),
  });
  return (
    <Modal open={open} onClose={onClose} title={`Asignar técnico — #${orden?.nServicio}`} width={isMobile ? '100%' : 400}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
          <div style={{ fontWeight: 600 }}>{orden?.abonado}</div>
          <div style={{ color: 'var(--txt-3)', fontSize: 12 }}>{orden?.direccion}</div>
          {orden?.referencia && <div style={{ color: 'var(--txt-3)', fontSize: 12 }}>Ref: {orden.referencia}</div>}
        </div>
        <Select label="Técnico" value={tecnicoId} onChange={e => setTecnicoId(e.target.value)}>
          <option value="">— Seleccionar —</option>
          {(tecnicos || []).map(t => (
            <option key={t.id} value={t.id}>{t.usuario.nombre} {t.usuario.apellido}{t.zonaAsignada ? ` (${t.zonaAsignada})` : ''}</option>
          ))}
        </Select>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancelar</Btn>
          <Btn variant="primary" onClick={() => mut.mutate()} disabled={!tecnicoId} loading={mut.isPending} style={{ flex: 1, justifyContent: 'center' }}>Asignar</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function OrdenesPage() {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const isMobile        = useIsMobile();
  const [showExcel, setShowExcel]           = useState(false);
  const [ordenAsignar, setOrdenAsignar]     = useState(null);
  const [tab, setTab]                       = useState('todos');
  const [filters, setFilters]               = useState({ estado: searchParams.get('estado') || '', search: '' });
  const [page, setPage]                     = useState(1);
  const [searchOpen, setSearchOpen]         = useState(false); // buscador expandible en móvil

  useEffect(() => {
    const e = searchParams.get('estado');
    if (e) setFilters(p => ({ ...p, estado: e }));
  }, [searchParams]);

  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ordenes', filters, tab, page],
    queryFn:  () => ordenesApi.listar({
      ...filters,
      page, limit: 15,
      ...(tab === 'internet' && { tipos: TIPOS_INTERNET.join(',') }),
      ...(tab === 'cable'    && { tipos: TIPOS_CABLE.join(',') }),
      ...(tab === 'duo'      && { tipos: TIPOS_DUO.join(',') }),
    }).then(r => r.data),
    refetchInterval: 30000,
  });

  const cambiarEstadoMut = useMutation({
    mutationFn: ({ id, estado }) => ordenesApi.cambiarEstado(id, estado),
    onSuccess:  () => { toast.success('Estado actualizado'); qc.invalidateQueries(['ordenes']); qc.invalidateQueries(['stats']); },
  });

  const ordenes = data?.data || [];
  const meta    = data?.meta;

  const ESTADOS_FILTRO = [
    { value: '',                  label: 'Todos' },
    { value: 'PENDIENTE_NOC',     label: 'Esperando NOC' },
    { value: 'PENDIENTE_TECNICO', label: 'Para técnico' },
    { value: 'ACEPTADA',          label: 'Aceptada' },
    { value: 'EN_PROCESO',        label: 'En proceso' },
    { value: 'COMPLETADA',        label: 'Completada' },
    { value: 'CANCELADA',         label: 'Cancelada' },
  ];

  return (
    <div style={{ padding: isMobile ? '16px 12px' : 28 }} className="animate-fade">
      <InjectStyles />

      {/* Header */}
      <div className="ordenes-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 18 : 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Órdenes de Servicio
          </h1>
          <p style={{ color: 'var(--txt-3)', fontSize: 12, marginTop: 3 }}>
            {meta ? `${meta.total} órdenes` : '...'}
          </p>
        </div>
        <div className="ordenes-header-btns" style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={() => { refetch(); qc.invalidateQueries(['stats']); }} icon={<RefreshCw size={13} />}>
            {isMobile ? '' : 'Actualizar'}
          </Btn>
          <Btn variant="primary" size="sm" onClick={() => setShowExcel(true)} icon={<Upload size={13} />}>
            {isMobile ? 'Importar' : 'Importar Excel'}
          </Btn>
        </div>
      </div>

      {/* Tabs */}
      <div className="ordenes-tabs" style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[
          { key: 'todos',    label: 'Todos' },
          { key: 'internet', label: '📡 Internet' },
          { key: 'cable',    label: '📺 Cable' },
          { key: 'duo',      label: '📡📺 Dúo' },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', border: '1px solid', transition: 'all .15s',
              background:  tab === t.key ? 'var(--accent)'  : 'transparent',
              color:       tab === t.key ? '#fff'           : 'var(--txt-2)',
              borderColor: tab === t.key ? 'var(--accent)'  : 'var(--border-2)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <Card style={{ marginBottom: 14, padding: '10px 12px' }}>
        <div className="ordenes-filter-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Buscador — en móvil se expande al tocar */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {searchOpen ? (
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)' }} />
                    <input
                      autoFocus
                      placeholder="Buscar abonado, N° orden..."
                      value={filters.search}
                      onChange={e => { setFilters(p => ({ ...p, search: e.target.value })); setPage(1); }}
                      style={{ width: '100%', padding: '8px 36px 8px 30px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--txt)', fontSize: 13, outline: 'none' }}
                    />
                    <button onClick={() => { setSearchOpen(false); setFilters(p => ({ ...p, search: '' })); setPage(1); }}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-3)', padding: 2 }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setSearchOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, cursor: 'pointer', color: filters.search ? 'var(--accent)' : 'var(--txt-3)', fontSize: 13, fontWeight: 500, flex: 1 }}>
                    <Search size={15} />
                    {filters.search ? `"${filters.search}"` : 'Buscar abonado, N° orden...'}
                  </button>
                )}
              </div>

            </div>
          ) : (
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)' }} />
              <input placeholder="Buscar abonado, N° orden..." value={filters.search}
                onChange={e => { setFilters(p => ({ ...p, search: e.target.value })); setPage(1); }}
                style={{ width: '100%', padding: '7px 10px 7px 30px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--txt)', fontSize: 12, outline: 'none' }} />
            </div>
          )}

          {/* Chips de estado (desktop) / Combobox (móvil) */}
          {isMobile ? (
            <select
              value={filters.estado}
              onChange={e => { setFilters(p => ({ ...p, estado: e.target.value })); setPage(1); }}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-3)',
                border: '1px solid var(--border-2)',
                borderRadius: 8,
                color: filters.estado ? 'var(--accent)' : 'var(--txt-2)',
                fontSize: 13,
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {ESTADOS_FILTRO.map(e => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          ) : (
            <div className="ordenes-estado-chips" style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {ESTADOS_FILTRO.map(e => (
                <button key={e.value} onClick={() => { setFilters(p => ({ ...p, estado: e.value })); setPage(1); }}
                  style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', border: '1px solid', transition: 'all .15s',
                    background:  filters.estado === e.value ? 'var(--accent)'  : 'transparent',
                    color:       filters.estado === e.value ? '#fff'           : 'var(--txt-3)',
                    borderColor: filters.estado === e.value ? 'var(--accent)'  : 'var(--border-2)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                  {e.label}
                </button>
              ))}
            </div>
          )}

          {!isMobile && (filters.estado || filters.search) && (
            <Btn variant="ghost" size="sm" onClick={() => { setFilters({ estado: '', search: '' }); setPage(1); }} icon={<X size={12} />}>Limpiar</Btn>
          )}
        </div>
      </Card>

      {/* Contenido: tabla en desktop, cards en móvil */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {isMobile ? (
          /* ── Vista cards (móvil) ── */
          <div className="ordenes-card-list">
            {isLoading ? (
              <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
                <Spinner size={24} />
              </div>
            ) : ordenes.length === 0 ? (
              <Empty icon="📋" title="Sin órdenes" subtitle="Importa un Excel para comenzar" />
            ) : (
              ordenes.map(o => (
                <OrdenCard
                  key={o.id}
                  o={o}
                  onAsignar={setOrdenAsignar}
                  onNavigate={id => navigate(`/ordenes/${id}`)}
                />
              ))
            )}
          </div>
        ) : (
          /* ── Vista tabla (desktop) ── */
          <Table loading={isLoading} headers={['N°','Abonado','Dirección / Referencia','Servicio','Fecha','Estado','Técnico','']}>
            {ordenes.length === 0 && !isLoading ? (
              <tr><td colSpan={8}><Empty icon="📋" title="Sin órdenes" subtitle="Importa un Excel para comenzar" /></td></tr>
            ) : ordenes.map(o => (
              <Tr key={o.id} onClick={() => navigate(`/ordenes/${o.id}`)}>
                <Td>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--accent)' }}>#{o.nServicio}</span>
                </Td>
                <Td>
                  <div style={{ fontWeight: 500 }}>{o.abonado}</div>
                  {o.dni && <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>{o.dni}</div>}
                </Td>
                <Td style={{ maxWidth: 200 }}>
                  <div className="truncate" style={{ fontSize: 12, color: 'var(--txt-2)' }}>{o.direccion}</div>
                  {o.referencia && <div className="truncate" style={{ fontSize: 11, color: 'var(--txt-3)' }}>Ref: {o.referencia}</div>}
                </Td>
                <Td>
                  <span style={{ fontSize: 11, fontWeight: 600, color: TIPO_COLOR[o.tipoOrden] }}>
                    {TIPO_LABEL[o.tipoOrden] || o.tipoOrden}
                  </span>
                </Td>
                <Td style={{ fontSize: 12, color: 'var(--txt-2)', whiteSpace: 'nowrap' }}>{fmtFecha(o.fechaServicio)}</Td>
                <Td><EstadoBadge estado={o.estado} /></Td>
                <Td style={{ fontSize: 12, color: 'var(--txt-2)' }}>
                  {o.tecnico ? `${o.tecnico.usuario.nombre} ${o.tecnico.usuario.apellido}` : <span style={{ color: 'var(--txt-3)' }}>Sin asignar</span>}
                </Td>
                <Td>
                  {!o.tecnico && !TIPOS_SOLO_NOC.includes(o.tipoOrden) && (
                    <Btn variant="ghost" size="sm" icon={<UserCheck size={12} />}
                      onClick={e => { e.stopPropagation(); setOrdenAsignar(o); }}>
                      Asignar
                    </Btn>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        )}

        {/* Paginación */}
        {meta && meta.pages > 1 && (
          <div className="ordenes-pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>Página {meta.page} de {meta.pages}</span>
            <div className="ordenes-pagination-btns" style={{ display: 'flex', gap: 6 }}>
              <Btn variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Anterior</Btn>
              <Btn variant="ghost" size="sm" disabled={page >= meta.pages} onClick={() => setPage(p => p + 1)}>Siguiente →</Btn>
            </div>
          </div>
        )}
      </Card>

      <ModalSubirExcel open={showExcel} onClose={() => setShowExcel(false)} />
      <ModalAsignar    open={!!ordenAsignar} onClose={() => setOrdenAsignar(null)} orden={ordenAsignar || null} />
    </div>
  );
}