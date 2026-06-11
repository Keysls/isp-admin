import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, RefreshCw, Package, Recycle } from 'lucide-react';
import toast from 'react-hot-toast';
import { stockApi } from '../services/api';

// ── Estilos ───────────────────────────────────────────────────
const S = {
  page:    { padding: 24, maxWidth: 900, margin: '0 auto' },
  header:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title:   { fontSize: 20, fontWeight: 700, color: 'var(--txt)', margin: 0 },
  tabs:    { display: 'flex', gap: 8, marginBottom: 20 },
  tab:     (active) => ({
    padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', border: '1px solid',
    background:  active ? 'var(--accent)' : 'transparent',
    color:       active ? '#fff' : 'var(--txt-3)',
    borderColor: active ? 'var(--accent)' : 'var(--border-2)',
  }),
  card: {
    background: 'var(--bg-2)', border: '1px solid var(--border)',
    borderRadius: 12, marginBottom: 12, overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', borderBottom: '1px solid var(--border)',
  },
  tecnicoNombre: { fontWeight: 700, fontSize: 14, color: 'var(--txt)' },
  fecha:         { fontSize: 12, color: 'var(--txt-3)' },
  body:          { padding: '12px 16px' },
  itemRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 0', borderBottom: '1px solid var(--border)',
    fontSize: 13,
  },
  recojoRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 10px', borderRadius: 8, marginBottom: 6,
    background: '#F0FDF4', border: '1px solid #BBF7D0',
  },
  recojoNombre: { fontSize: 13, fontWeight: 600, color: '#166534' },
  recojoPon:    { fontSize: 11, color: '#15803D', fontFamily: 'monospace' },
  actions: { display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' },
  btn: (variant) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8,
    cursor: 'pointer', fontSize: 12, fontWeight: 600,
    background: variant === 'green'  ? '#16a34a'
              : variant === 'red'    ? '#dc2626'
              : variant === 'ghost'  ? 'transparent'
              : 'var(--bg-3)',
    color:  variant === 'green' || variant === 'red' ? '#fff' : 'var(--txt-2)',
    border: variant === 'ghost' ? '1px solid var(--border-2)' : 'none',
  }),
  badge: (estado) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
    ...(estado === 'pendiente'  && { background: '#FEF3C7', color: '#92400E' }),
    ...(estado === 'aprobado'   && { background: '#DCFCE7', color: '#166534' }),
    ...(estado === 'rechazado'  && { background: '#FEE2E2', color: '#991B1B' }),
  }),
  empty: { textAlign: 'center', padding: 48, color: 'var(--txt-3)', fontSize: 14 },
  modal: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modalBox: {
    background: 'var(--bg)', borderRadius: 12, padding: 24,
    width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(0,0,0,.18)',
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--bg-2)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '9px 12px', fontSize: 14, color: 'var(--txt)',
    outline: 'none', marginTop: 8, marginBottom: 14,
  },
};

const fmtFecha = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return iso; }
};

export default function DevolucionesPage() {
  const qc = useQueryClient();
  const [tabEstado, setTabEstado] = useState('pendiente');
  const [modalRechazo, setModalRechazo]   = useState(null); // { id, tipo: 'devolucion' }
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const { data: devoluciones = [], isLoading, refetch } = useQuery({
    queryKey: ['devoluciones', tabEstado],
    queryFn:  () => stockApi.listarDevoluciones({ estado: tabEstado }).then(r => r.data),
  });

  // ── Mutations ─────────────────────────────────────────────
  const mutAprobar = useMutation({
    mutationFn: (id) => stockApi.aprobarDevolucion(id),
    onSuccess:  () => { toast.success('Devolución aprobada ✅'); qc.invalidateQueries(['devoluciones']); },
    onError:    (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const mutRechazar = useMutation({
    mutationFn: ({ id, motivo }) => stockApi.rechazarDevolucion(id, { motivo }),
    onSuccess:  () => { toast.success('Devolución rechazada'); qc.invalidateQueries(['devoluciones']); setModalRechazo(null); setMotivoRechazo(''); },
    onError:    (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const mutRevisarRecojo = useMutation({
    mutationFn: ({ recojoId, resultado, comentario }) =>
      stockApi.revisarRecojo(recojoId, { resultado, comentario }),
    onSuccess: (_, vars) => {
      toast.success(vars.resultado === 'bueno' ? '✅ Equipo al stock' : '❌ Equipo descartado');
      qc.invalidateQueries(['devoluciones']);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <h1 style={S.title}>Devoluciones de técnicos</h1>
        <button style={S.btn('ghost')} onClick={() => refetch()}>
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {['pendiente', 'aprobado', 'rechazado'].map(e => (
          <button key={e} style={S.tab(tabEstado === e)} onClick={() => setTabEstado(e)}>
            {e === 'pendiente' ? '⏳ Pendientes' : e === 'aprobado' ? '✅ Aprobadas' : '❌ Rechazadas'}
          </button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <p style={S.empty}>Cargando...</p>
      ) : devoluciones.length === 0 ? (
        <div style={S.empty}>
          <Package size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
          <p>No hay devoluciones {tabEstado === 'pendiente' ? 'pendientes' : tabEstado === 'aprobado' ? 'aprobadas' : 'rechazadas'}.</p>
        </div>
      ) : devoluciones.map(dev => (
        <div key={dev.id} style={S.card}>
          {/* Cabecera */}
          <div style={S.cardHeader}>
            <div>
              <div style={S.tecnicoNombre}>
                {dev.tecnico.nombre} {dev.tecnico.apellido}
              </div>
              <div style={S.fecha}>{fmtFecha(dev.fecha)}</div>
            </div>
            <span style={S.badge(dev.estado)}>
              {dev.estado === 'pendiente' ? '⏳ Pendiente' : dev.estado === 'aprobado' ? '✅ Aprobada' : '❌ Rechazada'}
            </span>
          </div>

          <div style={S.body}>
            {/* Material regular */}
            {dev.detalles.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                  <Package size={11} style={{ marginRight: 4 }} />Material
                </div>
                {dev.detalles.map((det, i) => (
                  <div key={i} style={S.itemRow}>
                    <span style={{ fontWeight: 600, color: 'var(--txt)' }}>{det.nombre}</span>
                    <span style={{ color: 'var(--txt-3)', marginLeft: 'auto' }}>
                      {det.cantidad} {det.unidad || 'und'}
                    </span>
                  </div>
                ))}
              </>
            )}

            {/* ONUs devueltas — aparecen como recojos con tipoEquipo ONU */}
              {(dev.recojos || []).filter(r => r.tipoEquipo === 'ONU').length > 0 && (
                <div style={{ marginTop: dev.detalles.length > 0 ? 12 : 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#5B21B6', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                    ◈ ONUs a devolver
                  </div>
                  {(dev.recojos || []).filter(r => r.tipoEquipo === 'ONU').map(o => (

                    <div key={o.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', borderRadius: 8, marginBottom: 6,
                      background: '#F5F3FF', border: '1px solid #DDD6FE',
                    }}>
                      <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#5B21B6' }}>
                            {o.nombreProducto || 'ONU'}
                          </div>
                          {o.codigoPon && (
                            <div style={{ fontSize: 11, color: '#7C3AED', fontFamily: 'monospace' }}>
                              ◈ {o.codigoPon}
                            </div>
                          )}
                        </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#EDE9FE', color: '#6D28D9' }}>
                        Pendiente
                      </span>
                    </div>
                  ))}
                </div>
              )}

            {/* Recojos / equipos reciclados */}
            {dev.recojos.length > 0 && (
              <div style={{ marginTop: dev.detalles.length > 0 ? 12 : 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                  ♻ Equipos reciclados
                </div>
                {dev.recojos.map(r => (
                  <div key={r.id} style={S.recojoRow}>
                    <div>
                      <div style={S.recojoNombre}>{r.tipoEquipo}</div>
                      {r.codigoPon && <div style={S.recojoPon}>◈ {r.codigoPon}</div>}
                    </div>
                    {/* Botones de revisión solo si está en revisión y la devolución está pendiente */}
                    {r.estado === 'en_revision' && dev.estado === 'pendiente' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          style={{ ...S.btn('green'), padding: '5px 10px', fontSize: 11 }}
                          onClick={() => mutRevisarRecojo.mutate({ recojoId: r.id, resultado: 'bueno' })}
                          disabled={mutRevisarRecojo.isPending}
                        >
                          <CheckCircle size={11} /> Bueno
                        </button>
                        <button
                          style={{ ...S.btn('red'), padding: '5px 10px', fontSize: 11 }}
                          onClick={() => mutRevisarRecojo.mutate({ recojoId: r.id, resultado: 'malogrado' })}
                          disabled={mutRevisarRecojo.isPending}
                        >
                          <XCircle size={11} /> Malogrado
                        </button>
                      </div>
                    )}
                    {/* Estado ya procesado */}
                    {r.estado !== 'en_revision' && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                        ...(r.estado === 'entregado' ? { background: '#DCFCE7', color: '#166534' } : { background: '#FEE2E2', color: '#991B1B' }),
                      }}>
                        {r.estado === 'entregado' ? '✅ Al stock' : '❌ Descartado'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Comentario */}
            {dev.comentario && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--txt-2)', fontStyle: 'italic' }}>
                "{dev.comentario}"
              </div>
            )}

            {/* Acciones — solo para pendientes */}
            {dev.estado === 'pendiente' && (
              <div style={S.actions}>
                <button
                  style={S.btn('ghost')}
                  onClick={() => { setModalRechazo({ id: dev.id }); setMotivoRechazo(''); }}
                >
                  <XCircle size={13} /> Rechazar
                </button>
                <button
                  style={S.btn('green')}
                  onClick={() => mutAprobar.mutate(dev.id)}
                  disabled={mutAprobar.isPending}
                >
                  <CheckCircle size={13} />
                  {mutAprobar.isPending ? 'Aprobando...' : 'Aprobar material'}
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Modal rechazo */}
      {modalRechazo && (
        <div style={S.modal} onClick={(e) => e.target === e.currentTarget && setModalRechazo(null)}>
          <div style={S.modalBox}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: 'var(--txt)' }}>Rechazar devolución</p>
            <p style={{ fontSize: 13, color: 'var(--txt-3)', marginBottom: 12 }}>
              El técnico verá este motivo. Los recojos volverán a su inventario.
            </p>
            <label style={{ fontSize: 12, color: 'var(--txt-2)', fontWeight: 600 }}>Motivo (opcional)</label>
            <input
              style={S.input}
              placeholder="Ej: No coincide el inventario"
              value={motivoRechazo}
              onChange={e => setMotivoRechazo(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={S.btn('ghost')} onClick={() => setModalRechazo(null)}>Cancelar</button>
              <button
                style={S.btn('red')}
                onClick={() => mutRechazar.mutate({ id: modalRechazo.id, motivo: motivoRechazo })}
                disabled={mutRechazar.isPending}
              >
                {mutRechazar.isPending ? 'Rechazando...' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}