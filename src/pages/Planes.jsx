import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Wifi, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { planesApi } from '../services/api';

// ─── Estilos inline reutilizables ────────────────────────────
const S = {
  page:    { padding: '24px', maxWidth: 780, margin: '0 auto' },
  header:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title:   { fontSize: 20, fontWeight: 700, color: 'var(--txt)', margin: 0 },
  sub:     { fontSize: 13, color: 'var(--txt-2)', marginTop: 4 },

  card:    {
    background: 'var(--bg-2)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '16px 20px',
    display: 'flex', alignItems: 'center', gap: 16,
    marginBottom: 10,
  },
  badge:   {
    background: '#EFF6FF', color: '#2563EB',
    borderRadius: 8, padding: '6px 12px',
    fontWeight: 700, fontSize: 15, minWidth: 80, textAlign: 'center',
  },
  badgeInactive: {
    background: 'var(--bg-3)', color: 'var(--txt-3)',
    borderRadius: 8, padding: '6px 12px',
    fontWeight: 700, fontSize: 15, minWidth: 80, textAlign: 'center',
  },
  info:    { flex: 1 },
  name:    { fontWeight: 600, fontSize: 14, color: 'var(--txt)' },
  precio:  { fontSize: 13, color: 'var(--txt-2)', marginTop: 2 },
  actions: { display: 'flex', gap: 6 },

  btn: (variant = 'primary') => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: variant === 'icon' ? '7px' : '8px 16px',
    borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
    fontWeight: 500,
    background: variant === 'primary' ? '#2563EB'
              : variant === 'danger'  ? '#FEE2E2'
              : variant === 'ghost'   ? 'transparent'
              : 'var(--bg-3)',
    color: variant === 'primary' ? '#fff'
         : variant === 'danger'  ? '#DC2626'
         : 'var(--txt-2)',
  }),

  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: 'var(--bg)', borderRadius: 14, padding: 28,
    width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  modalTitle: { fontWeight: 700, fontSize: 16, marginBottom: 20, color: 'var(--txt)' },
  label:      { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--txt-2)', marginBottom: 5 },
  input:      {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--bg-2)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '9px 12px', fontSize: 14, color: 'var(--txt)',
    outline: 'none', marginBottom: 14,
  },
  row: { display: 'flex', gap: 12 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  empty: {
    textAlign: 'center', padding: '48px 0', color: 'var(--txt-3)',
    fontSize: 14,
  },
};

const EMPTY_FORM = { nombre: '', mbps: '', precio: '' };

export default function PlanesPage() {
  const qc = useQueryClient();
  const [modal, setModal]   = useState(null);  // null | 'crear' | 'editar'
  const [form, setForm]     = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);

  // ── Queries ───────────────────────────────────────────────────
  const { data: planes = [], isLoading } = useQuery({
    queryKey: ['planes'],
    queryFn:  () => planesApi.listar().then(r => r.data),
  });

  // ── Mutations ─────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ['planes'] });

  const mutCrear = useMutation({
    mutationFn: (data) => planesApi.crear(data),
    onSuccess:  () => { toast.success('Plan creado'); invalidate(); cerrar(); },
    onError:    (e) => toast.error(e.response?.data?.error || 'Error al crear'),
  });

  const mutEditar = useMutation({
    mutationFn: ({ id, data }) => planesApi.actualizar(id, data),
    onSuccess:  () => { toast.success('Plan actualizado'); invalidate(); cerrar(); },
    onError:    (e) => toast.error(e.response?.data?.error || 'Error al actualizar'),
  });

  const mutEliminar = useMutation({
    mutationFn: (id) => planesApi.eliminar(id),
    onSuccess:  () => { toast.success('Plan desactivado'); invalidate(); },
    onError:    (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  // ── Handlers ──────────────────────────────────────────────────
  const abrirCrear = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setModal('crear');
  };

  const abrirEditar = (plan) => {
    setForm({ nombre: plan.nombre, mbps: String(plan.mbps), precio: String(plan.precio) });
    setEditId(plan.id);
    setModal('editar');
  };

  const cerrar = () => { setModal(null); setForm(EMPTY_FORM); setEditId(null); };

  const handleSubmit = () => {
    const { nombre, mbps, precio } = form;
    if (!nombre.trim() || !mbps || !precio)
      return toast.error('Completa todos los campos');
    if (isNaN(Number(mbps)) || isNaN(Number(precio)))
      return toast.error('Mbps y precio deben ser números');

    const data = { nombre: nombre.trim(), mbps: Number(mbps), precio: Number(precio) };
    if (modal === 'crear') mutCrear.mutate(data);
    else mutEditar.mutate({ id: editId, data });
  };

  const handleEliminar = (plan) => {
    if (!window.confirm(`¿Desactivar el plan "${plan.nombre}"?`)) return;
    mutEliminar.mutate(plan.id);
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  // ── Render ────────────────────────────────────────────────────
  const activos   = planes.filter(p => p.activo);
  const inactivos = planes.filter(p => !p.activo);

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Planes de Internet</h1>
          <p style={S.sub}>Los precios se usan para identificar el plan al subir un Excel</p>
        </div>
        <button style={S.btn('primary')} onClick={abrirCrear}>
          <Plus size={15} /> Nuevo plan
        </button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <p style={S.empty}>Cargando...</p>
      ) : activos.length === 0 && inactivos.length === 0 ? (
      <div style={S.empty}>
        <Wifi size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
        <p>No hay planes creados aún.</p>
        <p style={{ fontSize: 12 }}>Crea un plan para que el sistema asigne Mbps automáticamente al subir el Excel.</p>
      </div>
    ) : (
        <>
          {activos.map(plan => (
            <div key={plan.id} style={S.card}>
              <div style={S.badge}>{plan.mbps} Mbps</div>
              <div style={S.info}>
                <div style={S.name}>{plan.nombre}</div>
                <div style={S.precio}>S/ {Number(plan.precio).toFixed(2)} / mes</div>
              </div>
              <div style={S.actions}>
                <button style={S.btn('ghost')} title="Editar" onClick={() => abrirEditar(plan)}>
                  <Pencil size={15} />
                </button>
                <button style={S.btn('danger')} title="Desactivar" onClick={() => handleEliminar(plan)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}

          {inactivos.length > 0 && (
            <>
              <p style={{ fontSize: 12, color: 'var(--txt-3)', marginTop: 20, marginBottom: 8 }}>Inactivos</p>
              {inactivos.map(plan => (
                <div key={plan.id} style={{ ...S.card, opacity: 0.5 }}>
                  <div style={S.badgeInactive}>{plan.mbps} Mbps</div>
                  <div style={S.info}>
                    <div style={S.name}>{plan.nombre}</div>
                    <div style={S.precio}>S/ {Number(plan.precio).toFixed(2)} / mes · <em>inactivo</em></div>
                  </div>
                  <button style={S.btn('ghost')} title="Reactivar" onClick={() => mutEditar.mutate({ id: plan.id, data: { activo: true } })}>
                    <CheckCircle size={15} color="#16a34a" />
                  </button>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && cerrar()}>
          <div style={S.modal}>
            <p style={S.modalTitle}>{modal === 'crear' ? 'Nuevo plan' : 'Editar plan'}</p>

            <label style={S.label}>Nombre del plan</label>
            <input style={S.input} placeholder="Plan 250 Mbps" value={form.nombre} onChange={set('nombre')} />

            <div style={S.row}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Velocidad (Mbps)</label>
                <input style={S.input} type="number" placeholder="250" value={form.mbps} onChange={set('mbps')} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Precio mensual (S/)</label>
                <input style={S.input} type="number" step="0.01" placeholder="60.00" value={form.precio} onChange={set('precio')} />
              </div>
            </div>

            <div style={S.modalActions}>
              <button style={S.btn('ghost')} onClick={cerrar}>Cancelar</button>
              <button
                style={S.btn('primary')}
                onClick={handleSubmit}
                disabled={mutCrear.isPending || mutEditar.isPending}
              >
                {mutCrear.isPending || mutEditar.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}